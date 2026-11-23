# Prépare les photographies du site à partir des originaux téléchargés (voir IMAGES.md).
# Usage : python3 scripts/preparer-photos.py <dossier des originaux nommés <identifiant Unsplash>.jpg>
import sys, os
from PIL import Image, ImageEnhance

SRC = sys.argv[1]
DEST = os.path.join(os.path.dirname(__file__), "..", "public", "media", "photos")

def cadrer(im, ratio, fx, fy):
    w, h = im.size
    if w / h > ratio:
        nw = int(h * ratio); x = int((w - nw) * fx); return im.crop((x, 0, x + nw, h))
    nh = int(w / ratio); y = int((h - nh) * fy); return im.crop((0, y, w, y + nh))

def sortir(ident, nom, taille, fx=0.5, fy=0.5, q=78, fmt="webp", lum=1.0):
    im = Image.open(os.path.join(SRC, ident + ".jpg")).convert("RGB")
    im = cadrer(im, taille[0] / taille[1], fx, fy).resize(taille, Image.LANCZOS)
    if lum != 1.0: im = ImageEnhance.Brightness(im).enhance(lum)  # fond clair assombri pour rester dans le ton du site
    f = os.path.join(DEST, f"{nom}.{fmt}")
    if fmt == "webp": im.save(f, "WEBP", quality=q, method=6)
    else: im.save(f, "JPEG", quality=q, optimize=True, progressive=True)
    print(f"{nom}.{fmt:5} {taille[0]}x{taille[1]}  {os.path.getsize(f)//1024} ko")

V, P = (720, 1280), (360, 640)
# Couverture
# Clôture (affichée floutée : petite taille suffisante)
sortir("nue6Esmpk3M", "cloture", (1200, 800), fy=0.6, q=60)
# Anatomie d'une publicité
sortir("YhMFYJZgMA0", "temps-01-accroche", V, 0.5, 0.3)
sortir("o6fSMrsqHOk", "temps-02-preuve", V, 0.4, 0.5)
sortir("4uzfoyPI6DI", "temps-03-benefice", V, 0.5, 0.5)
sortir("reEySFadyJQ", "temps-04-offre", V, 0.5, 0.5, lum=0.62)
# Formules
sortir("CGKYNN3uuVo", "essai-1", P, 0.5, 0.3)
sortir("uC6p1W98Kv0", "test-1", P, 0.5, 0.5)
sortir("DAJ3l3hXWsA", "test-2", P, 0.5, 0.4)
sortir("N1bYCseTzgI", "test-3", P, 0.6, 0.5)
sortir("bL5mIaa_-pI", "campagne-1", P, 0.5, 0.3)
sortir("7sjdrgZP6w8", "campagne-2", P, 0.4, 0.5)
sortir("93BsHRWB1yQ", "campagne-3", P, 0.45, 0.5)
sortir("nNX1udK-xPk", "campagne-4", P, 0.5, 0.5)
sortir("lkHNDf-oXTk", "campagne-5", P, 0.6, 0.5)
sortir("5ZZckvnxnjM", "campagne-6", P, 0.4, 0.5)
