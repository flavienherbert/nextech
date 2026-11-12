// Préparation des photos : redimensionnement et compression si le module "sharp" est installé,
// simple copie sinon. Une photo absente est remplacée par un dessin généré.
import { existsSync, mkdirSync, copyFileSync, writeFileSync, readFileSync } from 'node:fs';
import { join, extname, basename, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import { motif } from './motifs.mjs';
import { slug } from './outils.mjs';

let sharp = null;
try {
  sharp = (await import('sharp')).default;
} catch {
  sharp = null;
}

export const SHARP_DISPONIBLE = Boolean(sharp);

const LARGEURS = [800, 1600];

/**
 * Prépare une image et renvoie ce qu'il faut pour l'afficher.
 * @param {object} o
 * @param {string} o.source      chemin de la photo, relatif au dossier "studio" (peut être vide)
 * @param {string} o.dossierStudio
 * @param {string} o.dossierSortie  dossier "assets/img" du site généré
 * @param {string} o.nom          nom de base du fichier produit
 * @param {string} o.motifType    dessin de secours si la photo manque
 * @param {string} o.graine       graine du dessin de secours
 * @returns {Promise<{fichiers: {src:string, srcsetWebp?:string, srcsetJpg?:string}, largeur:number, hauteur:number, remplacement:boolean}>}
 */
export async function preparerImage({ source, dossierStudio, dossierSortie, nom, motifType = 'pierre', graine = nom, largeurs = LARGEURS }) {
  mkdirSync(dossierSortie, { recursive: true });
  const chemin = source ? (isAbsolute(source) ? source : join(dossierStudio, source)) : '';
  const base = slug(nom);

  if (!chemin || !existsSync(chemin)) {
    const fichier = `${base}.svg`;
    writeFileSync(join(dossierSortie, fichier), motif(motifType, graine));
    return { fichiers: { src: fichier }, largeur: 1600, hauteur: 1000, remplacement: true };
  }

  const empreinte = createHash('sha1').update(readFileSync(chemin)).digest('hex').slice(0, 8);

  if (!sharp) {
    const fichier = `${base}-${empreinte}${extname(chemin).toLowerCase() || '.jpg'}`;
    copyFileSync(chemin, join(dossierSortie, fichier));
    return { fichiers: { src: fichier }, largeur: 1600, hauteur: 1200, remplacement: false };
  }

  // rotate() sans argument applique l'orientation enregistrée par le téléphone.
  const meta = await sharp(chemin).metadata();
  const largeurOrigine = meta.width || 1600;
  const hauteurOrigine = meta.height || 1200;
  const webp = [];
  const jpg = [];
  for (const largeur of largeurs) {
    const cible = Math.min(largeur, largeurOrigine);
    const nomWebp = `${base}-${empreinte}-${largeur}.webp`;
    const nomJpg = `${base}-${empreinte}-${largeur}.jpg`;
    await sharp(chemin).rotate().resize({ width: cible, withoutEnlargement: true }).webp({ quality: 74 }).toFile(join(dossierSortie, nomWebp));
    await sharp(chemin).rotate().resize({ width: cible, withoutEnlargement: true }).jpeg({ quality: 76, mozjpeg: true }).toFile(join(dossierSortie, nomJpg));
    webp.push(`${nomWebp} ${cible}w`);
    jpg.push(`${nomJpg} ${cible}w`);
    if (cible < largeur) break; // inutile de produire une taille plus grande que l'original
  }
  const dernierJpg = jpg[jpg.length - 1].split(' ')[0];
  return {
    fichiers: { src: dernierJpg, srcsetWebp: webp.join(', '), srcsetJpg: jpg.join(', ') },
    largeur: largeurOrigine,
    hauteur: hauteurOrigine,
    remplacement: false,
  };
}

/** Nom de fichier sans extension, pour fabriquer un nom lisible. */
export function nomDeBase(chemin) {
  return basename(chemin || 'image', extname(chemin || ''));
}
