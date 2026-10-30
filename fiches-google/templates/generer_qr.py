#!/usr/bin/env python3
"""Générateur de QR code d'avis Google (SVG, PNG si Pillow est installé, et carte A6 imprimable en PDF).

Usage :
    python3 generer_qr.py --place-id ChIJ... --nom "Plomberie Exemple"
    python3 generer_qr.py --url https://g.page/r/XXXX/review --nom "Plomberie Exemple"

--place-id construit le lien officiel https://search.google.com/local/writereview?placeid=...
--url prend le lien court copié depuis la fiche (Demander des avis), plus court donc scannable
plus facilement une fois imprimé petit.
Dépendance : reportlab ; Pillow est optionnel (uniquement pour le PNG).
"""
import argparse
import os
import re

from reportlab.graphics import renderPDF, renderSVG
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.pagesizes import A6
from reportlab.pdfgen import canvas

REVIEW_URL = "https://search.google.com/local/writereview?placeid={}"


def qr_drawing(url, size):
    """QR code carré avec marge blanche (zone de silence) ; correction d'erreur Q."""
    widget = QrCodeWidget(url, barLevel="Q")
    x0, y0, x1, y1 = widget.getBounds()
    d = Drawing(size, size, transform=[size / (x1 - x0), 0, 0, size / (y1 - y0), 0, 0])
    d.add(widget)
    return d


def write_png(url, path, box=10, border=4):
    """PNG via Pillow (optionnel : le rendu PNG de reportlab exige des paquets C en plus)."""
    try:
        from PIL import Image
    except ImportError:
        return False
    qr = QrCodeWidget(url, barLevel="Q").qr
    n = qr.getModuleCount()
    img = Image.new("1", ((n + 2 * border) * box,) * 2, 1)
    px = img.load()
    for r in range(n):
        for c in range(n):
            if qr.isDark(r, c):
                for dy in range(box):
                    for dx in range(box):
                        px[(c + border) * box + dx, (r + border) * box + dy] = 0
    img.save(path)
    return True


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--place-id")
    g.add_argument("--url")
    ap.add_argument("--nom", required=True, help="nom de l'entreprise affiché sur la carte")
    ap.add_argument("--out-dir", default=os.path.join(here, "sortie"))
    args = ap.parse_args()

    url = args.url or REVIEW_URL.format(args.place_id)
    base = re.sub(r"[^a-z0-9]+", "-", args.nom.lower()).strip("-") or "client"
    os.makedirs(args.out_dir, exist_ok=True)
    prefix = os.path.join(args.out_dir, f"qr_avis_{base}")

    d = qr_drawing(url, 400)
    renderSVG.drawToFile(d, prefix + ".svg")
    png = write_png(url, prefix + ".png")

    # Carte A6 à imprimer / plastifier. Texte neutre : pas d'incitation, pas de tri des clients.
    c = canvas.Canvas(prefix + "_carte_A6.pdf", pagesize=A6)
    w, h = A6
    c.setFillColor(colors.HexColor("#1F3A5F"))
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(w / 2, h - 40, args.nom[:34])
    c.setFont("Helvetica", 11)
    c.setFillColor(colors.black)
    c.drawCentredString(w / 2, h - 62, "Votre avis sur Google nous aide.")
    c.drawCentredString(w / 2, h - 77, "Scannez ce code avec votre téléphone.")
    side = 170
    renderPDF.draw(qr_drawing(url, side), c, (w - side) / 2, 60)
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#5A6472"))
    c.drawCentredString(w / 2, 40, "Merci pour votre confiance.")
    c.save()
    print(f"URL encodée : {url}")
    print(f"-> {prefix}.svg, {prefix}_carte_A6.pdf" + (f", {prefix}.png" if png else " (PNG ignoré : pip install pillow)"))
    print("Teste le QR avec ton téléphone avant d'imprimer.")


if __name__ == "__main__":
    main()
