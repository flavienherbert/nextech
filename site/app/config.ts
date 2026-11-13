// Tout le contenu modifiable du site est ici.
// Les liens Stripe, l'e-mail et les mentions légales viennent des variables
// d'environnement (voir .env.example) : rien de sensible dans le code.

export type Formule = {
  id: "essai" | "test" | "campagne";
  nom: string;
  prix: string;
  resume: string;
  points: string[];
  delai: string;
  lien: string;
  misEnAvant?: boolean;
};

export type Chapitre = { debut: number; titre: string; texte: string };
export type Plan = { fichier: string; titre: string; texte: string };

export type Exemple = {
  src: string; // fichier MP4 dans /public/exemples
  poster?: string;
  titre: string;
  angle: string;
};

const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";

function lienCommande(stripe: string | undefined, formule: string): string {
  if (stripe) return stripe;
  if (email) {
    return `mailto:${email}?subject=${encodeURIComponent(`Commande ${formule}`)}`;
  }
  return "#contact";
}

export const site = {
  marque: "Studio Accroche",
  titre: "Trois secondes pour arrêter un pouce.",
  sousTitre:
    "Nous écrivons l'accroche, nous tournons sans caméra, vous recevez des publicités verticales prêtes pour TikTok, Reels et Meta Ads. En 48 heures.",
  email,
  legal: {
    nom: process.env.NEXT_PUBLIC_LEGAL_NAME ?? "",
    siret: process.env.NEXT_PUBLIC_LEGAL_SIRET ?? "",
    adresse: process.env.NEXT_PUBLIC_LEGAL_ADDRESS ?? "",
  },
};

export const formules: Formule[] = [
  {
    id: "essai",
    nom: "Essai",
    prix: "25 €",
    resume: "Pour juger le rendu sur votre produit.",
    points: [
      "1 vidéo de 10 à 15 secondes",
      "1 accroche, script inclus",
      "Sous-titres animés, format 9:16",
      "1 retouche",
    ],
    delai: "Livré en 48 h",
    lien: lienCommande(process.env.NEXT_PUBLIC_STRIPE_LINK_ESSAI, "Essai"),
  },
  {
    id: "test",
    nom: "Pack Test",
    prix: "69 €",
    resume: "Pour trouver l'accroche qui marche.",
    points: [
      "3 vidéos de 15 à 20 secondes",
      "3 accroches sur 3 angles différents",
      "Sous-titres animés, format 9:16",
      "1 retouche par vidéo",
    ],
    delai: "Livré en 3 jours",
    lien: lienCommande(process.env.NEXT_PUBLIC_STRIPE_LINK_TEST, "Pack Test"),
    misEnAvant: true,
  },
  {
    id: "campagne",
    nom: "Pack Campagne",
    prix: "129 €",
    resume: "Pour alimenter une campagne complète.",
    points: [
      "6 vidéos de 15 à 20 secondes",
      "3 accroches × 2 présentateurs",
      "Formats 9:16 et 1:1",
      "2 retouches par vidéo",
    ],
    delai: "Livré en 5 jours",
    lien: lienCommande(
      process.env.NEXT_PUBLIC_STRIPE_LINK_CAMPAGNE,
      "Pack Campagne",
    ),
  },
];

// Ajouter ici les vidéos d'exemple une fois produites.
// La section « Exemples » reste masquée tant que cette liste est vide.
export const exemples: Exemple[] = [];

export const etapes = [
  {
    titre: "Vous envoyez le brief",
    texte:
      "Lien du produit, trois photos, votre client type et la promesse à mettre en avant.",
  },
  {
    titre: "Vous validez le script",
    texte:
      "Sous 24 h, vous recevez les accroches et le texte. Rien n'est généré avant votre accord.",
  },
  {
    titre: "Vous recevez les vidéos",
    texte:
      "Fichiers MP4 en 1080p, sous-titrés, avec tous les droits d'exploitation publicitaire.",
  },
];

export const engagements = [
  {
    titre: "Signalé comme généré par IA",
    texte:
      "Chaque vidéo est livrée avec la mention prévue par la réglementation européenne en vigueur depuis août 2026.",
  },
  {
    titre: "Pas de faux témoignages",
    texte:
      "Le présentateur montre votre produit. Il ne se fait pas passer pour un client qui l'a utilisé.",
  },
  {
    titre: "Pas de promesses invérifiables",
    texte:
      "Les allégations santé, minceur ou de gains financiers non prouvées sont refusées.",
  },
];

export const faq = [
  {
    q: "Dois-je envoyer mon produit ?",
    r: "Non. Des photos nettes sur fond simple suffisent pour que le présentateur le montre à l'écran.",
  },
  {
    q: "Pourquoi plusieurs accroches ?",
    r: "Les trois premières secondes décident si une publicité est regardée. Comparer trois débuts coûte moins cher que parier sur un seul.",
  },
  {
    q: "Puis-je diffuser les vidéos en publicité payante ?",
    r: "Oui. Vous disposez de tous les droits d'exploitation commerciale. Pensez à activer la mention de contenu généré par IA sur la plateforme de diffusion.",
  },
  {
    q: "Que se passe-t-il si le rendu ne me convient pas ?",
    r: "Une retouche est incluse dans chaque formule. Si votre produit ne peut pas être reproduit fidèlement, vous êtes prévenu avant le début du travail et remboursé.",
  },
  {
    q: "Y a-t-il un droit de rétractation ?",
    r: "La prestation est réalisée sur mesure et démarre à votre demande dès la validation du script. Avant cette validation, vous pouvez annuler et être remboursé intégralement.",
  },
];

export const brief = [
  "Lien du produit",
  "Trois photos nettes sur fond simple",
  "Qui achète ? (âge, situation, moment d'usage)",
  "La promesse principale, en une phrase",
  "Le ton souhaité : direct, complice, haut de gamme, drôle",
  "Ce qu'il ne faut pas dire",
];

// Chapitres du film de démonstration (temps en secondes dans /media/film.mp4).
export const chapitres: Chapitre[] = [
  {
    debut: 0,
    titre: "L'accroche",
    texte: "« Arrête d'acheter des gourdes qui fuient dans ton sac. » Un problème, dit face caméra, en trois secondes.",
  },
  {
    debut: 3.7,
    titre: "La preuve",
    texte: "Le produit sort du sac, retourné. Le bénéfice se voit avant d'être dit.",
  },
  {
    debut: 7.8,
    titre: "Le bénéfice",
    texte: "Gros plan, glaçons, ralenti. Une seule promesse, une seule image.",
  },
  {
    debut: 10.55,
    titre: "L'offre",
    texte: "Le produit seul, le prix, où cliquer. Rien d'autre.",
  },
];

// Extraits présentés dans la bande « plan par plan ».
export const plans: Plan[] = [
  {
    fichier: "plan-A",
    titre: "Face caméra",
    texte: "Une présentatrice qui parle français, cadrée comme un selfie.",
  },
  {
    fichier: "plan-B",
    titre: "Démonstration en main",
    texte: "Le geste qui prouve l'argument, filmé comme au quotidien.",
  },
  {
    fichier: "plan-C",
    titre: "Gros plan matière",
    texte: "Le détail qui donne envie : texture, fraîcheur, finition.",
  },
  {
    fichier: "plan-D",
    titre: "Plan produit",
    texte: "Le produit seul, propre, prêt à recevoir le prix.",
  },
];

// Les trois angles d'accroche livrés dans un Pack Test.
export const angles = [
  { lettre: "A", nom: "Le problème", phrase: "« Arrête d'acheter des gourdes qui fuient dans ton sac. »" },
  { lettre: "B", nom: "Le résultat", phrase: "« Avec elle, ton eau est encore fraîche à 18 heures. »" },
  { lettre: "C", nom: "La curiosité", phrase: "« Cette gourde à 19 € remplace toutes tes bouteilles en plastique. »" },
];
