// Catalogue des emplacements d'images et de vidéos du site : ce que le vendeur peut remplacer depuis
// Administration → Médias, sans toucher au code. Données pures (aucun accès au stockage), partagées par
// la page d'accueil, l'administration et le contrôle des envois.
//
// Pour ajouter un emplacement : une ligne ici, puis l'afficher dans la page voulue. Rien d'autre.

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
  { id: "ouverture", nom: "Ouverture de la page d'accueil", aide: "La grande photographie tout en haut du site." },
  { id: "demo", nom: "Vidéo de démonstration", aide: "Le téléphone au centre de la page d'accueil. C'est l'élément le plus important pour convaincre : une vraie vidéo faite par vous." },
  { id: "exemples", nom: "Exemples de vidéos du studio", aide: "Jusqu'à six vidéos. La section « Exemples » n'apparaît sur le site qu'à partir du moment où une vidéo est envoyée." },
  { id: "temps", nom: "Les quatre temps d'une publicité", aide: "Quatre images verticales qui illustrent l'accroche, la preuve, le bénéfice et l'offre." },
  { id: "formules", nom: "Visuels des trois formules", aide: "Les piles d'images au-dessus de chaque formule : une pour l'essai, trois pour le Pack Test, six pour le Pack Campagne." },
  { id: "divers", nom: "Fond du bas de page et partage", aide: "L'image de fond de la dernière section et la vignette affichée quand le lien du site est partagé." },
] as const;

const vertical = (id: string, groupe: string, nom: string, role: string, defaut?: string): Emplacement => ({
  id, groupe, nom, role, defaut, genre: "image", conseil: "Image verticale 9:16, par exemple 720 × 1280 px. JPG, PNG ou WebP.", ratio: 9 / 16, largeurMax: 1080, maxMo: 8,
});

const exemples: Emplacement[] = Array.from({ length: 6 }, (_, i) => i + 1).flatMap((n) => [
  { id: `exemple-${n}`, groupe: "exemples", nom: `Exemple ${n} : vidéo`, genre: "video" as const, role: `Vidéo n° ${n} de la section « Exemples ».`, conseil: "Vidéo verticale 9:16 (1080 × 1920 px), MP4 (H.264 + AAC) ou WebM, 15 à 30 secondes, 15 Mo au plus de préférence.", ratio: 9 / 16, maxMo: 40 },
  { id: `exemple-${n}-affiche`, groupe: "exemples", nom: `Exemple ${n} : image d'attente (facultatif)`, genre: "image" as const, role: "Image affichée avant la lecture. Sans elle, la première image de la vidéo est utilisée.", conseil: "Image verticale 9:16, par exemple 720 × 1280 px.", ratio: 9 / 16, largeurMax: 1080, maxMo: 8 },
]);

export const EMPLACEMENTS: Emplacement[] = [
  { id: "couverture", groupe: "ouverture", nom: "Photographie d'ouverture (ordinateur)", genre: "image", role: "Fond du haut de la page, sur ordinateur et tablette. Sur téléphone, elle sert aussi si vous n'envoyez pas la version verticale.", conseil: "Image horizontale 3:2, par exemple 1920 × 1280 px. JPG, PNG ou WebP. Le texte s'affiche à gauche : laissez cette zone calme.", ratio: 3 / 2, largeurMax: 2200, maxMo: 8, defaut: "/media/photos/couverture-1920.webp" },
  { id: "couverture-mobile", groupe: "ouverture", nom: "Photographie d'ouverture (téléphone)", genre: "image", role: "Fond du haut de la page sur téléphone. Facultatif.", conseil: "Image verticale 9:16, par exemple 900 × 1600 px.", ratio: 9 / 16, largeurMax: 1080, maxMo: 8, defaut: "/media/photos/couverture-mobile.webp" },

  { id: "demo-video", groupe: "demo", nom: "Vidéo de démonstration", genre: "video", role: "Lue dans le cadre de téléphone de la page d'accueil, avec le son, au clic. Tant qu'elle est vide, le site affiche un exemple d'un autre studio, clairement indiqué comme externe.", conseil: "Vidéo verticale 9:16 (1080 × 1920 px), MP4 (H.264 + AAC) ou WebM, environ 15 secondes, 15 Mo au plus de préférence.", ratio: 9 / 16, maxMo: 40 },
  { id: "demo-affiche", groupe: "demo", nom: "Image d'attente de la démonstration (facultatif)", genre: "image", role: "Affichée avant la lecture de la vidéo.", conseil: "Image verticale 9:16, par exemple 720 × 1280 px.", ratio: 9 / 16, largeurMax: 1080, maxMo: 8 },

  ...exemples,

  vertical("temps-1", "temps", "Temps 1 — L'accroche", "Première illustration de « Quinze secondes, quatre temps ».", "/media/photos/temps-01-accroche.webp"),
  vertical("temps-2", "temps", "Temps 2 — La preuve", "Deuxième illustration.", "/media/photos/temps-02-preuve.webp"),
  vertical("temps-3", "temps", "Temps 3 — Le bénéfice", "Troisième illustration.", "/media/photos/temps-03-benefice.webp"),
  vertical("temps-4", "temps", "Temps 4 — L'offre", "Quatrième illustration.", "/media/photos/temps-04-offre.webp"),

  vertical("essai-1", "formules", "Essai — image", "Unique image de la carte « Essai ».", "/media/photos/essai-1.webp"),
  ...[1, 2, 3].map((n) => vertical(`test-${n}`, "formules", `Pack Test — image ${n}`, `Image ${n} sur 3 de la carte « Pack Test ».`, `/media/photos/test-${n}.webp`)),
  ...[1, 2, 3, 4, 5, 6].map((n) => vertical(`campagne-${n}`, "formules", `Pack Campagne — image ${n}`, `Image ${n} sur 6 de la carte « Pack Campagne ».`, `/media/photos/campagne-${n}.webp`)),

  { id: "cloture", groupe: "divers", nom: "Fond de la dernière section", genre: "image", role: "Image floutée derrière « Votre produit, dans ce cadre ».", conseil: "Image horizontale 3:2, par exemple 1200 × 800 px. Elle est floutée et assombrie : un visuel simple suffit.", ratio: 3 / 2, largeurMax: 1600, maxMo: 8, defaut: "/media/photos/cloture.webp" },
  { id: "partage", groupe: "divers", nom: "Vignette de partage (réseaux sociaux, messageries)", genre: "image", role: "Image affichée quand le lien du site est partagé sur WhatsApp, Facebook, LinkedIn…", conseil: "Image horizontale 1,91:1, 1200 × 630 px, JPG ou PNG (WebP mal pris en charge par certains réseaux).", ratio: 1200 / 630, largeurMax: 1600, maxMo: 5, defaut: "/media/photos/couverture-partage.jpg" },
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
