// Catalogue des formules : source unique pour le site, le paiement et l'administration.
export type FormuleId = "essai" | "test" | "campagne";

export type Formule = {
  id: FormuleId;
  nom: string;
  prixCents: number;
  resume: string;
  videos: number;
  duree: string;
  delaiJours: number;
  retouches: number; // par vidéo
  points: string[];
  misEnAvant?: boolean;
};

export const formules: Formule[] = [
  {
    id: "essai",
    nom: "Essai",
    prixCents: 2500,
    resume: "Pour juger le rendu sur votre produit.",
    videos: 1,
    duree: "10 à 15 secondes",
    delaiJours: 2,
    retouches: 1,
    points: [
      "1 vidéo de 10 à 15 secondes",
      "1 accroche, script inclus",
      "Sous-titres animés, format 9:16",
      "1 retouche",
    ],
  },
  {
    id: "test",
    nom: "Pack Test",
    prixCents: 6900,
    resume: "Pour trouver l'accroche qui marche.",
    videos: 3,
    duree: "15 à 20 secondes",
    delaiJours: 3,
    retouches: 1,
    points: [
      "3 vidéos de 15 à 20 secondes",
      "3 accroches sur 3 angles différents",
      "Sous-titres animés, format 9:16",
      "1 retouche par vidéo",
    ],
    misEnAvant: true,
  },
  {
    id: "campagne",
    nom: "Pack Campagne",
    prixCents: 12900,
    resume: "Pour alimenter une campagne complète.",
    videos: 6,
    duree: "15 à 20 secondes",
    delaiJours: 5,
    retouches: 2,
    points: [
      "6 vidéos de 15 à 20 secondes",
      "3 accroches × 2 présentateurs",
      "Formats 9:16 et 1:1",
      "2 retouches par vidéo",
    ],
  },
];

export const formuleParId = (id: string): Formule | undefined =>
  formules.find((f) => f.id === id);

export const euros = (cents: number): string =>
  (cents / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }) + " €";

export const delaiTexte = (f: Formule): string =>
  f.delaiJours === 2 ? "Livré en 48 h" : `Livré en ${f.delaiJours} jours`;
