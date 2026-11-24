// Les textes et les réglages du site sont ici.
//
//   • L'OFFRE (noms, prix, nombre de vidéos, durée, délais, retouches, formats) est dans lib/formules.ts : source unique.
//     Tout ce fichier-ci lit ce catalogue : aucun prix ni délai ne s'écrit à la main.
//   • L'adresse de contact, la vidéo d'exemple et les chemins des images sont ci-dessous.
//   • L'identité de l'entreprise (nom, SIRET, adresse, téléphone) se renseigne dans les variables d'environnement NEXT_PUBLIC_LEGAL_*.
//   • Les images et les vidéos peuvent aussi se remplacer dans Administration → Images et vidéos, sans toucher au code.

import {
  capitale,
  delaiCourt,
  delaisTexte,
  DUREE_TEXTE,
  enLettres,
  FORMULE_ACCROCHES,
  FORMULE_ESSAI,
  formules,
  fourchettePrix,
  photosTexte,
} from "@/lib/formules";

const actif = (v: string | undefined) => ["true", "oui", "1"].includes((v ?? "").trim().toLowerCase());

// ——— Vidéo d'exemple ———
// Tant que SHOW_EXAMPLE_VIDEO n'est pas « true », la section « vidéo d'exemple » n'existe pas sur le site (ni dans le menu).
// Pour l'activer : déposer votre MP4 vertical dans site/public/videos/exemple.mp4 (et l'image d'aperçu dans exemple-apercu.jpg),
// puis ajouter la variable SHOW_EXAMPLE_VIDEO = true dans Netlify (Environment variables) et redéployer.
export const SHOW_EXAMPLE_VIDEO = actif(process.env.SHOW_EXAMPLE_VIDEO);

export const site = {
  marque: "Studio Accroche",
  // Adresse de contact publique (pied de page, mentions légales, conditions, confidentialité, e-mails) : à changer ICI, et nulle part ailleurs.
  email: "contactstudioaccroche@gmail.com",
  titre: "Des pubs vidéo avec présentateur IA pour votre boutique.",
  accroche: "Trois secondes pour arrêter un pouce.",
  sousTitre: `Nous écrivons l'accroche et réalisons les vidéos sans caméra : vous recevez des publicités verticales prêtes pour TikTok, Reels et Meta Ads. Première vidéo en ${delaiCourt(FORMULE_ESSAI).replace(" ", "\u00a0")}.`,
  // Texte affiché dans les résultats de recherche et lors du partage du lien.
  description: `Publicités vidéo verticales avec présentateur généré par IA pour boutiques en ligne : accroche, script et sous-titres inclus. ${fourchettePrix()}, sans abonnement.`,
  legal: {
    nom: process.env.NEXT_PUBLIC_LEGAL_NAME ?? "",
    siret: process.env.NEXT_PUBLIC_LEGAL_SIRET ?? "",
    adresse: process.env.NEXT_PUBLIC_LEGAL_ADDRESS ?? "",
    telephone: process.env.NEXT_PUBLIC_LEGAL_PHONE ?? "",
  },
  // Offre réservée aux professionnels (décision du 24 novembre 2026) : textes affichés sous les formules, en bas de page et avant le paiement.
  reservePro: "Offre réservée aux professionnels",
  casePro: "Je commande en tant que professionnel, pour les besoins de mon activité.",
  // Hébergeur du site (mentions légales). Source : conditions d'utilisation du site de Netlify.
  hebergeur: "Netlify, Inc. — 101 2nd Street, San Francisco, CA 94105, États-Unis — netlify.com",
};

// ——— Images d'illustration ———
// Tous les chemins des images du site, au même endroit. Pour en remplacer une (par exemple par une capture d'une de vos vidéos) :
// déposez le fichier dans site/public/media/photos/ et changez le chemin ci-dessous, ou envoyez-la depuis
// Administration → Images et vidéos (aucun déploiement). Format conseillé : vertical 9:16 (720 × 1280 px), WebP ou JPG.
export const images = {
  // « Anatomie d'une publicité » : les quatre temps, dans l'ordre.
  temps: [
    "/media/photos/temps-01-accroche.webp",
    "/media/photos/temps-02-preuve.webp",
    "/media/photos/temps-03-benefice.webp",
    "/media/photos/temps-04-offre.webp",
  ],
  // Pile d'images de la carte de chaque formule (clé = identifiant interne de la formule) : une, trois, puis six images.
  formules: {
    essai: ["/media/photos/essai-1.webp"],
    test: ["/media/photos/test-1.webp", "/media/photos/test-2.webp", "/media/photos/test-3.webp"],
    campagne: [
      "/media/photos/campagne-1.webp",
      "/media/photos/campagne-2.webp",
      "/media/photos/campagne-3.webp",
      "/media/photos/campagne-4.webp",
      "/media/photos/campagne-5.webp",
      "/media/photos/campagne-6.webp",
    ],
  } as Record<string, string[]>,
  // Fond de la dernière section (flouté et assombri).
  cloture: "/media/photos/cloture.webp",
  // Vignette affichée quand le lien du site est partagé (1200 × 630 px).
  partage: "/media/og-studio-accroche.jpg",
};

// ——— Vidéo d'exemple (voir SHOW_EXAMPLE_VIDEO plus haut) ———
// La vidéo envoyée dans Administration → Images et vidéos est prioritaire sur ces fichiers locaux.
//   video  : MP4 vertical 9:16 (H.264 + AAC), jusqu'à 15 secondes, 15 Mo au plus conseillés. Elle est lue SANS SON au départ :
//            les sous-titres doivent donc être incrustés dans l'image (comme dans les vidéos livrées aux clients).
//   poster : image d'aperçu (JPG ou WebP, 720 × 1280 px), affichée avant la lecture.
//   soustitres : fichier WebVTT facultatif (par exemple "/videos/exemple.vtt") ; laissez vide si les sous-titres sont incrustés.
export const demonstration = {
  video: "/videos/exemple.mp4",
  poster: "/videos/exemple-apercu.jpg",
  soustitres: "",
  legende: "Exemple réalisé par Studio Accroche. Présentateur généré par intelligence artificielle.",
  // Ce que montre la vidéo et ce que contient chaque livraison.
  contenu: [
    { titre: "Une accroche écrite pour votre produit", texte: "Les trois premières secondes, rédigées à partir de votre brief." },
    { titre: "Un présentateur généré par IA", texte: "Il montre votre produit à l'écran et parle en français." },
    { titre: "Des sous-titres animés", texte: "Lisibles sans le son, comme la plupart des publicités sont regardées." },
    { titre: "Un fichier prêt à diffuser", texte: `MP4 vertical ${FORMULE_ESSAI.formats[0]} pour TikTok, Reels et Meta Ads, avec les droits d'exploitation publicitaire.` },
  ],
};

// Pourquoi commander ici : uniquement des faits vérifiables dans les formules et les conditions.
export const raisons = [
  { chiffre: "0", titre: "Tournage, colis, comédien", texte: `Des photos nettes de votre produit suffisent. Vous n'envoyez rien et vous ne filmez rien.` },
  { chiffre: delaiCourt(FORMULE_ESSAI), titre: "Pour une première vidéo", texte: `Délais : ${delaisTexte()}, à compter de votre brief.` },
  {
    chiffre: String(FORMULE_ACCROCHES.accroches),
    titre: "Accroches à comparer",
    texte: `Le ${FORMULE_ACCROCHES.nom} livre ${enLettres(FORMULE_ACCROCHES.accroches)} débuts différents : vous diffusez, vous gardez celui qui retient.`,
  },
  { chiffre: "1", titre: "Prix, payé une fois", texte: `${fourchettePrix()} selon la formule. Pas d'abonnement, script et tours de retouches inclus.` },
];

export const etapes = [
  {
    titre: "Vous commandez",
    texte: "Vous choisissez une formule et payez par carte sur la page sécurisée de Stripe.",
  },
  {
    titre: "Vous remplissez le brief",
    texte: "Votre produit, photos, client type, arguments (un site internet est facultatif). Quelques minutes, depuis votre lien privé.",
  },
  {
    titre: "Vous validez le script",
    texte: "Vous recevez les accroches et le texte. Rien n'est produit avant votre accord.",
  },
  {
    titre: "Vous recevez vos vidéos",
    texte: "Fichiers MP4 à télécharger depuis votre espace, avec les droits d'exploitation publicitaire.",
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

// Questions fréquentes : les chiffres (délais, retouches, durée, photos) viennent du catalogue (lib/formules.ts).
export const faq = [
  {
    q: "Quels produits acceptez-vous ?",
    r: "Des produits physiques que l'on peut photographier nettement. Nous refusons les allégations de santé, de minceur ou de gains financiers non prouvées.",
  },
  {
    q: "Je suis un particulier, puis-je commander ?",
    r: "Non. L'offre est réservée aux professionnels (entreprises, auto-entrepreneurs, associations) qui commandent pour les besoins de leur activité. Une case à cocher le rappelle avant le paiement.",
  },
  {
    q: "Combien de photos faut-il envoyer ?",
    r: `${capitale(photosTexte)} du produit, sur fond neutre, avec l'étiquette lisible. Plus les photos sont nettes, plus le rendu est fidèle.`,
  },
  {
    q: "Dois-je envoyer mon produit ?",
    r: "Non. Des photos nettes sur fond simple suffisent pour que le présentateur le montre à l'écran.",
  },
  {
    q: "En combien de temps je reçois mes vidéos ?",
    r: `${delaisTexte()}. Le délai court à compter de la réception de votre brief complet ; le temps que vous prenez pour valider le script ou la livraison n'est pas décompté.`,
  },
  {
    q: "Et si le rendu ne me plaît pas ?",
    r: `Chaque formule inclut des tours de retouches (${formules.map((f) => `${f.tours} pour ${f.nom}`).join(", ")}), à demander depuis votre espace de commande. Un tour est une seule demande qui regroupe toutes vos remarques sur l'ensemble des vidéos. Un changement de produit, de brief, d'angle ou de script validé n'est pas une retouche. Si votre produit ne peut pas être reproduit fidèlement, vous êtes prévenu avant le début du travail et remboursé.`,
  },
  {
    q: "Pourquoi plusieurs accroches ?",
    r: "Les trois premières secondes décident si une publicité est regardée. Comparer plusieurs débuts coûte moins cher que parier sur un seul.",
  },
  {
    q: "Puis-je utiliser les vidéos en publicité payante ?",
    r: "Oui : les droits d'exploitation publicitaire sont inclus. Pensez à activer la mention de contenu généré par IA sur la plateforme de diffusion.",
  },
  {
    q: "Pourquoi la mention « générée par IA » ?",
    r: "Parce que la réglementation européenne impose de signaler les contenus générés par intelligence artificielle. Chaque vidéo est livrée avec la mention prévue : il vous suffit de la conserver à la diffusion.",
  },
  {
    q: "Puis-je avoir des vidéos plus longues ?",
    r: `Pas pour le moment : chaque vidéo dure ${DUREE_TEXTE}, le format le plus efficace en publicité courte. Une durée supérieure n'est pas proposée à ce jour.`,
  },
  {
    q: "Y a-t-il un droit de rétractation ?",
    r: "L'offre étant réservée aux professionnels, le droit de rétractation prévu pour les consommateurs ne s'applique pas. En revanche, avant la validation du script, vous pouvez annuler et être remboursé intégralement : la prestation est réalisée sur mesure et démarre à votre demande une fois le script validé.",
  },
];

export const brief = [
  "Lien du site ou du produit, si vous en avez un",
  `${capitale(photosTexte)} sur fond simple`,
  "Qui achète ? (âge, situation, moment d'usage)",
  "La promesse principale, en une phrase",
  "Le ton souhaité : direct, complice, haut de gamme, drôle",
  "Ce qu'il ne faut pas dire",
];

// Exemples d'accroches pour un même produit fictif (une gourde) : les trois angles livrés dans le Pack Accroches.
export const angles = [
  { lettre: "A", nom: "Le problème", phrase: "« Arrête d'acheter des gourdes qui fuient dans ton sac. »" },
  { lettre: "B", nom: "Le résultat", phrase: "« Avec elle, ton eau est encore fraîche à 18 heures. »" },
  { lettre: "C", nom: "La curiosité", phrase: "« Cette gourde remplace toutes tes bouteilles en plastique. »" },
];

// Les quatre temps d'une publicité, illustrés par des images fixes (chemins dans « images.temps »).
export const temps = [
  { numero: "01", titre: "L'accroche", texte: "Un problème, dit face caméra, en trois secondes." },
  { numero: "02", titre: "La preuve", texte: "Le geste qui montre le bénéfice avant de le dire." },
  { numero: "03", titre: "Le bénéfice", texte: "Un gros plan, une seule promesse." },
  { numero: "04", titre: "L'offre", texte: "Le produit seul, le prix, où cliquer." },
];
