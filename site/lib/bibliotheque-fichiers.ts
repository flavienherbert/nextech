// Clés de stockage des fichiers de la bibliothèque de publicités (vidéos, miniatures, photos d'avatar).
// Dossier « bibliotheque/ », distinct de « medias/ » : le nettoyage de medias/ supprime tout fichier absent du registre
// des emplacements du site, il détruirait donc ceux de la bibliothèque (voir lib/purge.ts).
// Module sans accès au stockage, importable par lib/fichiers.ts sans cycle.
import { VERSION_MEDIA } from "./emplacements";

// Même forme qu'un média du site : 32 caractères hexadécimaux, un point, l'extension (jpg, png, webp, mp4, webm).
export const VERSION_BIBLIOTHEQUE = VERSION_MEDIA;

export const cleBibliotheque = (version: string) => {
  if (!VERSION_BIBLIOTHEQUE.test(version)) throw new Error("Fichier de bibliothèque invalide.");
  return `bibliotheque/${version}`;
};
