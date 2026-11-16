// Tout le contenu modifiable du site est ici.
// Les formules et leurs prix sont dans lib/formules.ts.
// L'e-mail et les mentions légales viennent des variables d'environnement.

export type Chapitre = { debut: number; titre: string; texte: string };
export type Plan = { fichier: string; titre: string; texte: string };

export type Exemple = {
  src: string; // fichier MP4 dans /public/exemples
  poster?: string;
  titre: string;
  angle: string;
};

const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";

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

// Vidéo de démonstration de la page d'accueil.
// Tant que « video » est vide, la page affiche un emplacement réservé, clairement indiqué comme tel.
// Pour l'activer : déposer les fichiers dans public/media/demo/ puis renseigner les deux chemins.
//   video  : MP4 (H.264 + AAC), 1080 × 1920, environ 15 secondes, 4 Mo au plus
//   poster : JPG ou WebP, 720 × 1280 (image affichée avant la lecture)
export const demonstration = {
  video: "", // vidéo du studio : "/media/demo/demonstration.mp4" (désactivée le 14 novembre 2026, jugée insuffisante)
  poster: "", // "/media/demo/demonstration.jpg"
  // Solution PROVISOIRE : exemple d'un autre créateur, montré par le lecteur officiel YouTube.
  // « autorisee » ne passe à true qu'après accord ÉCRIT du créateur (voir DEMO-CANDIDATS.md).
  // À remplacer par une vidéo du studio dès qu'il en existe une : renseigner « video » ci-dessus.
  externe: {
    autorisee: true, // accord obtenu par le fondateur (hors e-mail), déclaré le 15 novembre 2026
    youtubeId: "c4yaPVdYr4U",
    chaine: "Slow Machine Studio",
    lien: "https://www.youtube.com/shorts/c4yaPVdYr4U",
  },
  duree: "15 secondes",
  // Ce que montre la vidéo et ce que contient chaque livraison.
  contenu: [
    { titre: "Une accroche écrite pour votre produit", texte: "Les trois premières secondes, rédigées à partir de votre brief." },
    { titre: "Un présentateur généré par IA", texte: "Il montre votre produit à l'écran et parle en français." },
    { titre: "Des sous-titres animés", texte: "Lisibles sans le son, comme la plupart des publicités sont regardées." },
    { titre: "Un fichier prêt à diffuser", texte: "MP4 vertical 9:16 pour TikTok, Reels et Meta Ads, avec les droits d'exploitation publicitaire." },
  ],
};

// Pourquoi commander ici : uniquement des faits vérifiables dans les formules et les conditions.
export const raisons = [
  { chiffre: "0", titre: "Tournage, colis, comédien", texte: "Des photos nettes de votre produit suffisent. Vous n'envoyez rien et vous ne filmez rien." },
  { chiffre: "48 h", titre: "Pour une première vidéo", texte: "Deux jours pour l'essai, trois pour le Pack Test, cinq pour le Pack Campagne, à compter de votre brief." },
  { chiffre: "3", titre: "Accroches à comparer", texte: "Le Pack Test livre trois débuts différents : vous diffusez, vous gardez celui qui retient." },
  { chiffre: "1", titre: "Prix, payé une fois", texte: "De 25 € à 129 € selon la formule. Pas d'abonnement, script et retouches inclus." },
];

// Ajouter ici les vidéos d'exemple une fois produites.
// La section « Exemples » reste masquée tant que cette liste est vide.
export const exemples: Exemple[] = [];

export const etapes = [
  {
    titre: "Vous commandez",
    texte: "Vous choisissez une formule et payez par carte sur la page sécurisée de Stripe.",
  },
  {
    titre: "Vous remplissez le brief",
    texte: "Votre produit, photos, client type, arguments (un site internet est facultatif). Cinq minutes, depuis votre lien privé.",
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
    r: "Chaque formule inclut des retouches, à demander depuis votre espace de commande. Si votre produit ne peut pas être reproduit fidèlement, vous êtes prévenu avant le début du travail et remboursé.",
  },
  {
    q: "Y a-t-il un droit de rétractation ?",
    r: "La prestation est réalisée sur mesure et démarre à votre demande dès la validation du script. Avant cette validation, vous pouvez annuler et être remboursé intégralement.",
  },
];

export const brief = [
  "Lien du site ou du produit, si vous en avez un",
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

// Les quatre temps d'une publicité, illustrés par des images fixes.
export const temps = [
  { image: "temps-01-accroche", numero: "01", titre: "L'accroche", texte: "Un problème, dit face caméra, en trois secondes." },
  { image: "temps-02-preuve", numero: "02", titre: "La preuve", texte: "Le geste qui montre le bénéfice avant de le dire." },
  { image: "temps-03-benefice", numero: "03", titre: "Le bénéfice", texte: "Un gros plan, une seule promesse." },
  { image: "temps-04-offre", numero: "04", titre: "L'offre", texte: "Le produit seul, le prix, où cliquer." },
];
