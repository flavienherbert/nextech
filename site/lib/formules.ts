// Catalogue des formules : SOURCE UNIQUE de l'offre (noms, prix, nombre de vidéos, durée, délai, tours de retouches, formats).
// La page d'accueil, la page de commande, le paiement Stripe, la facture, les e-mails, les conditions de vente, la FAQ, la fiche de
// production et l'administration lisent tous ce fichier. Aucun prix, aucune durée, aucun délai et aucun nombre de tours ou de vidéos
// ne doit être écrit ailleurs (un test automatique le vérifie : scripts/tests-unitaires.mts, « Cohérence du catalogue »).
//
// Pour changer l'offre : modifier ICI, et nulle part ailleurs. Les textes du site, les e-mails et les factures suivent.
export type FormuleId = "essai" | "test" | "campagne";

// Durée maximale d'une vidéo, pour toutes les formules. Une durée supérieure n'est pas proposée à ce jour (décision du 22 novembre 2026).
export const DUREE_MAX_SECONDES = 15;
export const DUREE_TEXTE = `jusqu'à ${DUREE_MAX_SECONDES} secondes`;

// Photos à envoyer avec le brief.
export const PHOTOS = { min: 3, max: 5 };
export const photosTexte = `${PHOTOS.min} à ${PHOTOS.max} photos nettes`;

// Définition d'un « tour de retouches » (reprise mot pour mot par la page du client, les e-mails et les conditions de vente, article 7).
export const TOUR_DEFINITION = "Un tour de retouches est une seule demande, qui regroupe toutes vos remarques sur l'ensemble des vidéos livrées.";
export const TOUR_PERIMETRE = "Une retouche ajuste les vidéos livrées à script constant : texte à l'écran, sous-titres, rythme, remplacement d'un plan.";
export const TOUR_HORS_PERIMETRE = "Un changement de produit, de brief, de script validé, de présentateur, d'angle ou de durée n'est pas une retouche : c'est une nouvelle commande.";

export type Formule = {
  // Identifiant interne : il est enregistré dans les commandes et dans Stripe. Il ne change jamais.
  id: FormuleId;
  // Fin d'adresse publique de la page de commande (/commander/<adresse>). L'identifiant reste accepté (anciens liens).
  adresse: string;
  nom: string;
  prixCents: number;
  resume: string;
  videos: number;
  accroches: number;
  presentateurs: number;
  duree: string;
  delaiJours: number;
  // Nombre de TOURS de retouches inclus pour toute la commande (et non par vidéo).
  tours: number;
  formats: string[];
  // Libellé affiché au-dessus de la carte de la formule (recommandation éditoriale, jamais un chiffre de vente).
  badge?: string;
  points: string[];
};

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

const NOMBRES = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze"];
export const enLettres = (n: number): string => NOMBRES[n] ?? String(n);
export const capitale = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

// « 1 vidéo, jusqu'à 15 secondes » · « 3 vidéos, jusqu'à 15 secondes chacune »
export const videosTexte = (n: number): string => (n > 1 ? `${n} vidéos, ${DUREE_TEXTE} chacune` : `${n} vidéo, ${DUREE_TEXTE}`);

export const formatsTexte = (formats: string[]): string => `${formats.length > 1 ? "formats" : "format"} ${formats.join(" et ")}`;

type Saisie = Omit<Formule, "duree" | "points">;

// Les points affichés sont construits à partir des champs : un nombre ne s'écrit qu'une fois.
function formule(f: Saisie): Formule {
  const accroches =
    f.presentateurs > 1
      ? `${f.accroches} accroches × ${f.presentateurs} présentateurs`
      : f.accroches > 1
        ? `${f.accroches} accroches sur ${f.accroches} angles différents`
        : `${pluriel(f.accroches, "accroche")}, script inclus`;
  return {
    ...f,
    duree: DUREE_TEXTE,
    points: [videosTexte(f.videos), accroches, `Sous-titres animés, ${formatsTexte(f.formats)}`, `${pluriel(f.tours, "tour")} de retouches`],
  };
}

export const formules: Formule[] = [
  formule({
    id: "essai",
    adresse: "essai",
    nom: "Essai",
    prixCents: 4900,
    resume: "Pour juger le rendu sur votre produit.",
    videos: 1,
    accroches: 1,
    presentateurs: 1,
    delaiJours: 2,
    tours: 1,
    formats: ["9:16"],
  }),
  formule({
    id: "test",
    adresse: "accroches",
    nom: "Pack Accroches",
    prixCents: 13900,
    // « Trois accroches pour trouver celle qui vend. » : le nombre vient du catalogue.
    resume: `${capitale(enLettres(3))} accroches pour trouver celle qui vend.`,
    videos: 3,
    accroches: 3,
    presentateurs: 1,
    delaiJours: 3,
    tours: 1,
    formats: ["9:16"],
    badge: "Recommandé",
  }),
  formule({
    id: "campagne",
    adresse: "campagne",
    nom: "Pack Campagne",
    prixCents: 25900,
    resume: "Pour alimenter une campagne complète.",
    videos: 6,
    accroches: 3,
    presentateurs: 2,
    delaiJours: 5,
    tours: 1,
    formats: ["9:16", "1:1"],
  }),
];

export const formuleParId = (id: string): Formule | undefined =>
  formules.find((f) => f.id === id);

// Retrouve une formule par son adresse publique (« accroches ») ou par son identifiant interne (« test », anciens liens).
export const formuleParCle = (cle: string): Formule | undefined =>
  formules.find((f) => f.adresse === cle) ?? formuleParId(cle);

export const euros = (cents: number): string =>
  (cents / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }) + " €";

// « 48 h » · « 3 jours »
export const delaiCourt = (f: Formule): string => (f.delaiJours === 2 ? "48 h" : `${f.delaiJours} jours`);
export const delaiTexte = (f: Formule): string => `Livré en ${delaiCourt(f)}`;

export const toursTexte = (f: Formule): string => `${pluriel(f.tours, "tour")} de retouches`;

// « 1 tour de retouches » quand toutes les formules en incluent autant ; sinon le détail par formule.
export const toursInclusTexte = (): string =>
  formules.every((f) => f.tours === formules[0].tours)
    ? toursTexte(formules[0])
    : `des tours de retouches (${formules.map((f) => `${f.tours} pour ${f.nom}`).join(", ")})`;

// Phrases dérivées du catalogue, pour les textes commerciaux (jamais de prix ni de délai recopié à la main).
export const fourchettePrix = (): string => `De ${euros(Math.min(...formules.map((f) => f.prixCents)))} à ${euros(Math.max(...formules.map((f) => f.prixCents)))}`;
export const delaisTexte = (): string => formules.map((f) => `${f.nom} ${delaiCourt(f)}`).join(", ");

// Formule d'entrée (la première vidéo) et formule recommandée : les textes qui les citent ne recopient ni leur nom ni leur prix.
export const FORMULE_ESSAI = formules[0];
export const FORMULE_ACCROCHES = formuleParId("test")!;
