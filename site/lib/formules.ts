// Catalogue des formules : SOURCE UNIQUE des prix, des durées et des tours de retouches.
// La page d'accueil, la page de commande, le paiement Stripe, la facture, les e-mails, les conditions de vente, la fiche de
// production et l'administration lisent tous ce fichier. Aucun prix, aucune durée et aucun nombre de tours ne doit être écrit ailleurs
// (un test automatique le vérifie : scripts/tests-unitaires.mts, « Cohérence du catalogue »).
export type FormuleId = "essai" | "test" | "campagne";

// Durée maximale d'une vidéo, pour toutes les formules. Une durée supérieure n'est pas proposée à ce jour (décision du 22 novembre 2026).
export const DUREE_MAX_SECONDES = 15;
export const DUREE_TEXTE = `${DUREE_MAX_SECONDES} secondes maximum`;

// Définition d'un « tour de retouches » (reprise mot pour mot par la page du client, les e-mails et les conditions de vente, article 7).
export const TOUR_DEFINITION = "Un tour de retouches est une seule demande, qui regroupe toutes vos remarques sur l'ensemble des vidéos livrées.";
export const TOUR_PERIMETRE = "Une retouche ajuste les vidéos livrées à script constant : texte à l'écran, sous-titres, rythme, remplacement d'un plan.";
export const TOUR_HORS_PERIMETRE = "Un changement de produit, de brief, de script validé, de présentateur, d'angle ou de durée n'est pas une retouche : c'est une nouvelle commande.";

export type Formule = {
  id: FormuleId;
  nom: string;
  prixCents: number;
  resume: string;
  videos: number;
  duree: string;
  delaiJours: number;
  // Nombre de TOURS de retouches inclus pour toute la commande (et non par vidéo).
  tours: number;
  points: string[];
  misEnAvant?: boolean;
};

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

// Les points affichés sont construits à partir des champs : un nombre ne s'écrit qu'une fois.
function formule(f: Omit<Formule, "duree" | "points"> & { details: string[] }): Formule {
  const { details, ...reste } = f;
  return {
    ...reste,
    duree: DUREE_TEXTE,
    points: [`${pluriel(f.videos, "vidéo")} de ${DUREE_TEXTE}`, ...details, `${pluriel(f.tours, "tour")} de retouches`],
  };
}

export const formules: Formule[] = [
  formule({
    id: "essai",
    nom: "Essai",
    prixCents: 3500,
    resume: "Pour juger le rendu sur votre produit.",
    videos: 1,
    delaiJours: 2,
    tours: 1,
    details: ["1 accroche, script inclus", "Sous-titres animés, format 9:16"],
  }),
  formule({
    id: "test",
    nom: "Pack Test",
    prixCents: 8900,
    resume: "Pour trouver l'accroche qui marche.",
    videos: 3,
    delaiJours: 3,
    tours: 2,
    details: ["3 accroches sur 3 angles différents", "Sous-titres animés, format 9:16"],
    misEnAvant: true,
  }),
  formule({
    id: "campagne",
    nom: "Pack Campagne",
    prixCents: 16900,
    resume: "Pour alimenter une campagne complète.",
    videos: 6,
    delaiJours: 5,
    tours: 2,
    details: ["3 accroches × 2 présentateurs", "Formats 9:16 et 1:1"],
  }),
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

export const toursTexte = (f: Formule): string => `${pluriel(f.tours, "tour")} de retouches`;

// Phrases dérivées du catalogue, pour les textes commerciaux (jamais de prix ni de délai recopié à la main).
export const fourchettePrix = (): string => `De ${euros(Math.min(...formules.map((f) => f.prixCents)))} à ${euros(Math.max(...formules.map((f) => f.prixCents)))}`;
export const delaisTexte = (): string => formules.map((f) => `${f.nom} ${f.delaiJours === 2 ? "48 h" : `${f.delaiJours} jours`}`).join(", ");
