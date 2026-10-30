#!/usr/bin/env python3
"""Tâche 2 : un audit PDF d'une page par prospect (sa fiche vs le n°1).

Usage :
    python3 generate_audits.py                       # prospects/prospects.csv, 15 premiers
    python3 generate_audits.py --csv ../prospects/demo/prospects_FICTIF.csv \
        --out-dir exemples_FICTIF --top 15

Contenu : tableau comparatif, 3 manques précis, 3 actions correctives.
- Le n°1 est anonymisé ("leader local") : un audit peut être transmis ou montré (règle n°5).
- Aucun chiffre promis ; tout chiffre affiché vient du CSV (règles n°2 et n°4).
- Source FICTIF : filigrane "EXEMPLE FICTIF" sur chaque page, nom de fichier préfixé.
"""
import argparse
import os
import re
import sys
import unicodedata
from datetime import date

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from fg_common import compute_gaps, fr, photos_label, read_prospects, to_float  # noqa: E402

from reportlab.lib import colors  # noqa: E402
from reportlab.lib.pagesizes import A4  # noqa: E402
from reportlab.lib.styles import ParagraphStyle  # noqa: E402
from reportlab.lib.units import mm  # noqa: E402
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle  # noqa: E402

NAVY, GREY, RED = colors.HexColor("#1F3A5F"), colors.HexColor("#5A6472"), colors.HexColor("#B23A2E")
H1 = ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=18, leading=22, textColor=NAVY)
SUB = ParagraphStyle("sub", fontName="Helvetica", fontSize=9.5, leading=12, textColor=GREY)
H2 = ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=NAVY, spaceBefore=10, spaceAfter=4)
BODY = ParagraphStyle("body", fontName="Helvetica", fontSize=10, leading=13.5)
CELL = ParagraphStyle("cell", parent=BODY, fontSize=9.5, leading=12)
CELLB = ParagraphStyle("cellb", parent=CELL, fontName="Helvetica-Bold")
FOOT = ParagraphStyle("foot", fontName="Helvetica", fontSize=7.5, leading=10, textColor=GREY)


def slug(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower() or "prospect"


def yes_no(row, col):
    return "oui" if (row[col] == "oui" if col == "horaires_presents" else bool(row[col])) else "non"


def build_pdf(path, p, n1, fictif):
    pages = {"n": 0}

    def on_page(canvas, doc):
        pages["n"] += 1
        if fictif:  # filigrane : impossible d'envoyer ce PDF par erreur
            canvas.saveState()
            canvas.setFont("Helvetica-Bold", 64)
            canvas.setFillColor(colors.Color(0.85, 0.2, 0.2, alpha=0.18))
            canvas.translate(A4[0] / 2, A4[1] / 2)
            canvas.rotate(45)
            canvas.drawCentredString(0, 0, "EXEMPLE FICTIF")
            canvas.restoreState()

    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm,
                            topMargin=14 * mm, bottomMargin=12 * mm,
                            title=f"Audit fiche Google - {p['nom']}", author="")
    today = date.today().strftime("%d/%m/%Y")
    note = lambda r: f"{fr(to_float(r['note']))}/5" if to_float(r["note"]) is not None else "n.d."
    cmp_rows = [
        [Paragraph("Critère", CELLB), Paragraph("Votre fiche", CELLB), Paragraph("Leader local (n°1)", CELLB)],
        [Paragraph("Note Google", CELL), Paragraph(note(p), CELL), Paragraph(note(n1), CELL)],
        [Paragraph("Nombre d'avis", CELL), Paragraph(p["nb_avis"] or "n.d.", CELL), Paragraph(n1["nb_avis"] or "n.d.", CELL)],
        [Paragraph("Photos publiques (mesure plafonnée à 10)", CELL),
         Paragraph(photos_label(p) or "n.d.", CELL), Paragraph(photos_label(n1) or "n.d.", CELL)],
        [Paragraph("Horaires renseignés", CELL), Paragraph(yes_no(p, "horaires_presents"), CELL),
         Paragraph(yes_no(n1, "horaires_presents"), CELL)],
        [Paragraph("Site web renseigné", CELL), Paragraph(yes_no(p, "site_web"), CELL), Paragraph(yes_no(n1, "site_web"), CELL)],
        [Paragraph("Description", CELL), Paragraph("à vérifier ensemble", CELL), Paragraph("non mesurable", CELL)],
    ]
    table = Table(cmp_rows, colWidths=[78 * mm, 50 * mm, 46 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E8EDF4")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#C5CCD6")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))

    gaps = compute_gaps(p, n1)[:3]
    story = [
        Paragraph("Audit de votre fiche Google", H1),
        Paragraph(f"{p['nom']} &nbsp;|&nbsp; {p['metier']} à {p['ville']} &nbsp;|&nbsp; {today}", SUB),
        Spacer(1, 6),
        Paragraph("Votre fiche comparée au leader local", H2),
        Paragraph("Le leader est la fiche qui cumule le plus d'avis Google pour cette recherche "
                  "dans votre zone. Son nom n'est volontairement pas cité.", SUB),
        Spacer(1, 4), table,
        Paragraph("3 manques précis", H2),
    ]
    for i, g in enumerate(gaps, 1):
        tag = "" if g.mesure else " <font color='#B23A2E'>(à vérifier)</font>"
        story.append(Paragraph(f"<b>{i}.</b> {g.constat}{tag}", BODY))
        story.append(Spacer(1, 3))
    story.append(Paragraph("3 actions correctives", H2))
    for i, g in enumerate(gaps, 1):
        story.append(Paragraph(f"<b>{i}.</b> {g.action}", BODY))
        story.append(Spacer(1, 3))
    story += [
        Spacer(1, 10),
        Paragraph(
            f"Constats établis à partir des données publiques Google (API Places) au {today}. "
            "Les points marqués « à vérifier » ne sont pas mesurables depuis l'extérieur. "
            "Ce document est un état des lieux : il ne constitue pas une promesse de résultat.", FOOT),
    ]
    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    return pages["n"], sum(g.mesure for g in gaps)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--csv", default=os.path.join(here, "..", "prospects", "prospects.csv"))
    ap.add_argument("--top", type=int, default=15)
    ap.add_argument("--out-dir", default=here)
    args = ap.parse_args()

    n1, prospects = read_prospects(args.csv)
    os.makedirs(args.out_dir, exist_ok=True)
    for p in prospects[: args.top]:
        fictif = p["source"] == "FICTIF"
        name = f"{'FICTIF_' if fictif else ''}{int(p['rang']):02d}_{slug(p['nom'])}.pdf"
        pages, mesures = build_pdf(os.path.join(args.out_dir, name), p, n1, fictif)
        alerts = []
        if pages != 1:
            alerts.append(f"{pages} pages (attendu : 1)")
        if mesures < 3:
            alerts.append(f"seulement {mesures} écart(s) mesuré(s), le reste est « à vérifier »")
        print(f"{name}" + (f"  ALERTE : {' ; '.join(alerts)}" if alerts else ""))
    print(f"{min(args.top, len(prospects))} audit(s) -> {args.out_dir}")


if __name__ == "__main__":
    main()
