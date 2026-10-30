#!/usr/bin/env python3
"""Gabarit PDF "avant / après" (1 page) livré au client.

Usage :
    python3 generer_avant_apres.py --vierge                      # gabarit à remplir à la main
    python3 generer_avant_apres.py --json client.json            # rempli depuis un JSON
    python3 generer_avant_apres.py --json client.json --public   # nom du client anonymisé

Structure du JSON : voir avant_apres_exemple_FICTIF.json. Une valeur absente/null reste
affichée "n.d." : rien n'est complété ni estimé (règle n°2). Le document affiche les
chiffres fournis et leur différence, sans pourcentage ni promesse (règle n°4).
--public : le nom du client est remplacé par "[métier] à [ville]" (règle n°5), à utiliser
pour tout ce qui est publié (réseaux, page de vente).
"""
import argparse
import json
import os

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

NAVY, GREY = colors.HexColor("#1F3A5F"), colors.HexColor("#5A6472")
H1 = ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=18, leading=22, textColor=NAVY)
SUB = ParagraphStyle("sub", fontName="Helvetica", fontSize=9.5, leading=12, textColor=GREY)
H2 = ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=NAVY, spaceBefore=10, spaceAfter=4)
BODY = ParagraphStyle("body", fontName="Helvetica", fontSize=10, leading=13.5)
CELL = ParagraphStyle("cell", parent=BODY, fontSize=9.5, leading=12)
CELLB = ParagraphStyle("cellb", parent=CELL, fontName="Helvetica-Bold")
FOOT = ParagraphStyle("foot", fontName="Helvetica", fontSize=7.5, leading=10, textColor=GREY)

CRITERES = [
    ("note", "Note Google (/5)"),
    ("nb_avis", "Nombre d'avis"),
    ("nb_photos", "Nombre de photos"),
    ("description", "Description renseignée"),
    ("horaires", "Horaires renseignés"),
    ("site_web", "Site web renseigné"),
    ("appels_45j", "Appels sur 45 jours (stats de la fiche)"),
]
BLANK = "&nbsp;"  # case vide du gabarit à remplir à la main


def show(value, vierge):
    if vierge:
        return BLANK
    return "n.d." if value in (None, "") else str(value).replace(".", ",") if isinstance(value, float) else str(value)


def delta(avant, apres, vierge):
    """Différence brute si les deux valeurs sont des nombres ; sinon n.d. (jamais de %)."""
    if vierge:
        return BLANK
    if isinstance(avant, (int, float)) and isinstance(apres, (int, float)) and not isinstance(avant, bool):
        d = apres - avant
        txt = f"{d:+.1f}" if isinstance(d, float) and not d.is_integer() else f"{int(d):+d}"
        return txt.replace(".", ",")
    return "n.d."


def build(path, data, vierge, public):
    nom = data.get("nom_client", "")
    if public:
        nom = f"{data.get('metier', 'Artisan')} à {data.get('ville', '')}".strip()
    avant, apres = data.get("avant", {}), data.get("apres", {})
    rows = [[Paragraph(h, CELLB) for h in ("Critère", "Avant", "Après", "Différence")]]
    for key, label in CRITERES:
        a, b = avant.get(key), apres.get(key)
        rows.append([Paragraph(label, CELL), Paragraph(show(a, vierge), CELL),
                     Paragraph(show(b, vierge), CELL), Paragraph(delta(a, b, vierge), CELL)])
    table = Table(rows, colWidths=[76 * mm, 32 * mm, 32 * mm, 34 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E8EDF4")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#C5CCD6")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6 if vierge else 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6 if vierge else 4),
    ]))

    modifs = data.get("modifications", []) if not vierge else []
    story = [
        Paragraph("Votre fiche Google : avant / après", H1),
        Paragraph(f"{nom or '____________________'} &nbsp;|&nbsp; "
                  f"Livraison : {data.get('date_livraison') or '__ / __ / ____'}", SUB),
        Spacer(1, 8), table,
        Paragraph("Ce qui a été modifié", H2),
    ]
    if modifs:
        story += [Paragraph(f"&bull; {m}", BODY) for m in modifs]
    else:
        story += [Paragraph("&bull; " + "_" * 78, BODY), Spacer(1, 6)] * 4
    story += [
        Paragraph("Captures d'écran", H2),
        Paragraph("Avant : joindre la capture de la fiche et des statistiques d'appels (période de 45 jours "
                  "précédant la livraison).<br/>Après : même captures, période de 45 jours suivant la livraison.", BODY),
        Spacer(1, 14),
        Paragraph("Les chiffres ci-dessus sont ceux affichés par Google à la date des captures. "
                  "Ils ne constituent pas une promesse de résultat : le nombre d'appels varie aussi avec la saison "
                  "et la demande.", FOOT),
    ]
    SimpleDocTemplate(path, pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm,
                      topMargin=14 * mm, bottomMargin=12 * mm, title="Avant / après fiche Google").build(story)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--json", help="données du client")
    ap.add_argument("--vierge", action="store_true", help="gabarit vide à remplir à la main")
    ap.add_argument("--public", action="store_true", help="anonymise le nom du client")
    ap.add_argument("--out", help="PDF de sortie")
    args = ap.parse_args()
    if not args.json and not args.vierge:
        ap.error("donne --json ou --vierge")
    data = {}
    if args.json:
        with open(args.json, encoding="utf-8") as f:
            data = json.load(f)
    out = args.out or os.path.join(here, "gabarit_avant_apres_vierge.pdf" if args.vierge else "sortie/avant_apres.pdf")
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    build(out, data, args.vierge, args.public)
    print(f"PDF -> {out}")


if __name__ == "__main__":
    main()
