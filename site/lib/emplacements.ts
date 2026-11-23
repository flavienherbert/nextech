// Catalogue des emplacements d'images et de vidéos du site : ce que le vendeur peut remplacer depuis
// Administration → Médias, sans toucher au code. Données pures (aucun accès au stockage), partagées par
// la page d'accueil, l'administration et le contrôle des envois.
//
// Pour ajouter un emplacement : une ligne ici, puis l'afficher dans la page voulue. Rien d'autre.

import { images } from "@/app/config";

export type Genre = "image" | "video";

export type Emplacement = {
  id: string;
  groupe: string;
  nom: string;
  genre: Genre;
  // Où l'image apparaît, en une phrase.
  role: string;
  // Format conseillé, affiché dans l'administration.
  conseil: string;
  // Rapport largeur / hauteur attendu (sert à prévenir quand le fichier choisi sera recadré).
  ratio: number;
  // Largeur maximale utile en pixels (au-delà, l'image est réduite avant l'envoi).
  largeurMax?: number;
  maxMo: number;
  // Fichier fourni d'origine (dans public/), utilisé tant que rien n'a été envoyé.
  defaut?: string;
};

export const GROUPES = [
  { id: "demo", nom: "Vidéo de démonstration", aide: "Le téléphone de la section « vidéo d'exemple » de la page d'accueil. C'est l'élément le plus important pour convaincre : une vraie vidéo faite par vous. La section n'est visible que si le réglage SHOW_EXAMPLE_VIDEO vaut true (voir MEDIAS.md)." },
  { id: "exemples", nom: "Exemples de vidéos du studio", aide: "Jusqu'à six vidéos. La section « Exemples » n'apparaît sur le site qu'à partir du moment où une vidéo est envoyée." },
  { id: "temps", nom: "Les quatre temps d'une publicité", aide: "Quatre images verticales qui illustrent l'accroche, la preuve, le bénéfice et l'offre." },
  { id: "formules", nom: "Visuels des trois formules", aide: "Les piles d'images au-dessus de chaque formule : une pour l'essai, trois pour le Pack Accroches, six pour le Pack Campagne." },
  { id: "divers", nom: "Fond du bas de page et partage", aide: "L'image de fond de la dernière section et la vignette affichée quand le lien du site est partagé." },
] as const;

const vertical = (id: string, groupe: string, nom: string, role: string, defaut?: string): Emplacement => ({
  id, groupe, nom, role, defaut, genre: "image", conseil: "Image verticale 9:16, par exemple 720 × 1280 px. JPG, PNG ou WebP.", ratio: 9 / 16, largeurMax: 1080, maxMo: 8,
});

const exemples: Emplacement[] = Array.from({ length: 6 }, (_, i) => i + 1).flatMap((n) => [
  { id: `exemple-${n}`, groupe: "exemples", nom: `Exemple ${n} : vidéo`, genre: "video" as const, role: `Vidéo n° ${n} de la section « Exemples ».`, conseil: "Vidéo verticale 9:16 (1080 × 1920 px), MP4 (H.264 + AAC) ou WebM, 15 secondes maximum (la durée que vous vendez), 15 Mo au plus de préférence.", ratio: 9 / 16, maxMo: 40 },
  { id: `exemple-${n}-affiche`, groupe: "exemples", nom: `Exemple ${n} : image d'attente (facultatif)`, genre: "image" as const, role: "Image affichée avant la lecture. Sans elle, la première image de la vidéo est utilisée.", conseil: "Image verticale 9:16, par exemple 720 × 1280 px.", ratio: 9 / 16, largeurMax: 1080, maxMo: 8 },
]);

export const EMPLACEMENTS: Emplacement[] = [
  { id: "demo-video", groupe: "demo", nom: "Vidéo de démonstration", genre: "video", role: "Lue dans le cadre de téléphone de la page d'accueil, au clic, sans le son au départ (les sous-titres doivent être incrustés). Prioritaire sur le fichier public/videos/exemple.mp4. Visible seulement si SHOW_EXAMPLE_VIDEO vaut true.", conseil: "Vidéo verticale 9:16 (1080 × 1920 px), MP4 (H.264 + AAC) ou WebM, environ 15 secondes, 15 Mo au plus de préférence.", ratio: 9 / 16, maxMo: 40 },
  { id: "demo-affiche", groupe: "demo", nom: "Image d'attente de la démonstration (facultatif)", genre: "image", role: "Affichée avant la lecture de la vidéo.", conseil: "Image verticale 9:16, par exemple 720 × 1280 px.", ratio: 9 / 16, largeurMax: 1080, maxMo: 8 },

  ...exemples,

  vertical("temps-1", "temps", "Temps 1 — L'accroche", "Première illustration de « Anatomie d'une publicité ».", images.temps[0]),
  vertical("temps-2", "temps", "Temps 2 — La preuve", "Deuxième illustration.", images.temps[1]),
  vertical("temps-3", "temps", "Temps 3 — Le bénéfice", "Troisième illustration.", images.temps[2]),
  vertical("temps-4", "temps", "Temps 4 — L'offre", "Quatrième illustration.", images.temps[3]),

  vertical("essai-1", "formules", "Essai — image", "Unique image de la carte « Essai ».", images.formules.essai[0]),
  ...images.formules.test.map((chemin, i) => vertical(`test-${i + 1}`, "formules", `Pack Accroches — image ${i + 1}`, `Image ${i + 1} sur ${images.formules.test.length} de la carte « Pack Accroches ».`, chemin)),
  ...images.formules.campagne.map((chemin, i) => vertical(`campagne-${i + 1}`, "formules", `Pack Campagne — image ${i + 1}`, `Image ${i + 1} sur ${images.formules.campagne.length} de la carte « Pack Campagne ».`, chemin)),

  { id: "cloture", groupe: "divers", nom: "Fond de la dernière section", genre: "image", role: "Image floutée derrière « Votre produit, dans ce cadre ».", conseil: "Image horizontale 3:2, par exemple 1200 × 800 px. Elle est floutée et assombrie : un visuel simple suffit.", ratio: 3 / 2, largeurMax: 1600, maxMo: 8, defaut: images.cloture },
  { id: "partage", groupe: "divers", nom: "Vignette de partage (réseaux sociaux, messageries)", genre: "image", role: "Image affichée quand le lien du site est partagé sur WhatsApp, Facebook, LinkedIn…", conseil: "Image horizontale 1,91:1, 1200 × 630 px, JPG ou PNG (WebP mal pris en charge par certains réseaux).", ratio: 1200 / 630, largeurMax: 1600, maxMo: 5, defaut: images.partage },
];

const parId = new Map(EMPLACEMENTS.map((e) => [e.id, e]));
export const emplacement = (id: string): Emplacement | undefined => parId.get(id);

// Types acceptés et extension de stockage (l'extension porte le type : aucune table à consulter pour servir le fichier).
export const TYPES_MEDIA: Record<string, { ext: string; genre: Genre }> = {
  "image/jpeg": { ext: "jpg", genre: "image" },
  "image/png": { ext: "png", genre: "image" },
  "image/webp": { ext: "webp", genre: "image" },
  "video/mp4": { ext: "mp4", genre: "video" },
  "video/webm": { ext: "webm", genre: "video" },
};
export const TYPE_PAR_EXTENSION: Record<string, string> = Object.fromEntries(Object.entries(TYPES_MEDIA).map(([type, v]) => [v.ext, type]));

export const typeAccepteSurEmplacement = (e: Emplacement, type: string): boolean => TYPES_MEDIA[type]?.genre === e.genre;

// Identifiant de version d'un média envoyé : 32 caractères hexadécimaux, un point, l'extension.
export const VERSION_MEDIA = /^[0-9a-f]{32}\.(jpg|png|webp|mp4|webm)$/;
export const cleMedia = (version: string) => {
  if (!VERSION_MEDIA.test(version)) throw new Error("Version de média invalide.");
  return `medias/${version}`;
};
