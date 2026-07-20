// ============================================================================
// CONTENU DU SITE — modifie uniquement ce fichier pour changer les textes,
// les prix, les liens Stripe ou l'ordre des livres. Aucun autre fichier
// n'a besoin d'être touché pour ça.
//
// Pour changer les COULEURS : ouvre tailwind.config.ts (section theme.colors)
// - navy-950 / navy-800 : dégradé de fond
// - orange / blue       : couleurs d'accent
// - ink                 : couleur du texte principal
// ============================================================================

export type Livre = {
  label: string;
  title: string;
  desc: string;
  points: string[];
  tags: string[];
  price: string;
  link: string;
};

export const siteConfig = {
  brand: "nextech",

  heroTitle: "Construis avec l'IA, ce soir.",
  accentWord: "ce soir.",
  subtitle:
    "3 guides PDF pour créer, lancer et vendre — sans savoir coder.",

  promesse: [
    "PDF téléchargeable immédiatement",
    "Pas de formation, pas d'abonnement",
    "Un livre, tu le lis ce soir, tu construis demain",
  ],

  livres: [
    {
      label: "LIVRE 1 · WEB",
      title: "Créer un site internet professionnel avec Claude Code",
      desc: "De la page blanche au site en ligne en 14 jours. Sans savoir coder.",
      points: [
        "Publier un vrai site (vitrine, multi-pages ou landing) en 14 jours, sans écrire une ligne de code",
        "Écrire des prompts précis qui donnent VOTRE site, pas un site générique",
        "Corriger vous-même bugs, design et référencement, garder le site à jour sans agence",
      ],
      tags: ["128 pages", "60 prompts", "PDF"],
      price: "19,99 €",
      link: "https://buy.stripe.com/28EcN6g0R2cednK1BE6Ri0f",
    },
    {
      label: "LIVRE 2 · PRODUIT",
      title: "Créer et lancer son SaaS de A à Z",
      desc: "De l'idée validée au premier client payant. Pour quelqu'un qui n'a jamais créé de logiciel.",
      points: [
        "Valider une idée AVANT de coder, via 20 entretiens ciblés",
        "Construire un logiciel fonctionnel (comptes, abonnements, paiements) en pilotant une IA, sans savoir coder",
        "Trouver ses 10 premiers clients payants, fixer le bon prix, itérer sur de vrais retours",
      ],
      tags: ["PDF", "Modèles", "Prompts"],
      price: "19,99 €",
      link: "https://buy.stripe.com/28E3cwcOF8AC5Vi4NQ6Ri0e",
    },
    {
      label: "LIVRE 3 · AUDIENCE",
      title: "Réussir sur TikTok et développer son activité",
      desc: "L'algorithme, la niche, les hooks, le montage. 100 idées de vidéos incluses.",
      points: [
        "Choisir une niche assez précise pour être trouvé par les bonnes personnes",
        "Écrire des hooks de 3 secondes et raconter des histoires qui retiennent",
        "Transformer l'audience en clients : quoi vendre, quel appel à l'action, quelles stats regarder",
      ],
      tags: ["PDF", "100 idées", "50 hooks"],
      price: "15,99 €",
      link: "https://buy.stripe.com/7sY6oIaGxbMOaby0xA6Ri0g",
    },
  ] as Livre[],

  ctaTitle: "Commence ce soir",
  ctaButton: "Voir les guides",
  ctaLink: "https://ebookclaude.vercel.app",
  handle: "@nextech",
};
