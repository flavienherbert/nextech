# Prompt Claude Code — Landing parallaxe nextech + 3 ebooks (liens inclus)

## ⚠️ À vérifier avant : l'ordre des liens
J'ai placé tes liens Stripe dans l'ordre où tu me les as envoyés :
- Livre 1 (site web) → 28EcN6g0R2cednK1BE6Ri0f
- Livre 2 (SaaS) → 28E3cwcOF8AC5Vi4NQ6Ri0e
- Livre 3 (TikTok) → 7sY6oIaGxbMOaby0xA6Ri0g
Ouvre chaque lien une fois pour confirmer qu'il mène au bon livre. Si c'est inversé, permute les `link` dans le prompt.

## Sur ton nouvel ordi (une fois)
1. PowerShell : `irm https://claude.ai/install.ps1 | iex` → ferme/rouvre PowerShell → `claude --version`
2. `mkdir nextech-parallax` puis `cd nextech-parallax` puis `claude`
3. Connecte-toi, colle le bloc PROMPT ci-dessous.

---

## PROMPT (à copier tel quel)

Tu es un développeur front-end expert en animations au scroll. Construis une landing page one-page, MOBILE-FIRST (portrait 9:16, pensée pour être filmée en screen-recording iPhone), avec un effet parallaxe fluide et premium façon site Adidas qui scrolle. Elle sert de vitrine pour vendre 3 ebooks.

STACK (tout gratuit, déployable sur Vercel) :
- Next.js 14 (App Router, TypeScript)
- Tailwind CSS
- Lenis (smooth scroll global)
- Framer Motion + GSAP/ScrollTrigger pour les reveals et les sections "pin"

DESIGN (sombre, premium — identique à ma boutique) :
- Fond bleu nuit dégradé (#0A0F1A → #0D1830)
- Accents : orange #F77828 et bleu #4F9DFF ; texte #EEF3FA
- Titres : sans-serif bold serré (Inter ou Poppins), très gros
- Libellés/petits textes : monospace (JetBrains Mono)
- IMPORTANT : le titre de l'onglet (balise <title> dans layout.tsx) doit être "nextech — Guides Claude".

SECTIONS (dans l'ordre, chacune plein écran, scroll vertical) :
1. HERO — titre géant qui se révèle (un mot en orange), sous-titre, indicateur "scroll ↓". Fond en 2-3 couches parallaxe : dégradé + halos flous + un mot fantôme géant qui défile PLUS LENTEMENT que le texte.
2. PROMESSE (section pin) — le bloc reste épinglé pendant qu'on scrolle ; 3 arguments (01/02/03) se révèlent un par un en fade + slide.
3. LES 3 LIVRES — section clé. 3 cartes empilées, une par livre, style premium (bordure gauche orange, grand numéro fantôme 01/02/03 en fond). Chaque carte : l'étiquette (ex "LIVRE 1 · WEB"), le titre, la phrase de description, 3 bénéfices avec une coche orange, une ligne de tags, le prix, et un bouton "OBTENIR →" qui ouvre le lien. Chaque carte se révèle au scroll (fade + slide + léger scale).
4. PARALLAXE VISUEL — un visuel central qui scale et bouge en parallaxe, avec une accroche qui glisse.
5. CTA final (plein écran) — grand titre "Commence ce soir", un GROS bouton orange "Voir les guides →", @nextech en mono.

COMPORTEMENTS SCROLL OBLIGATOIRES :
- Smooth scroll global (Lenis)
- Parallaxe : couches de fond à 0,4–0,6× la vitesse du premier plan
- Reveals au scroll (whileInView / ScrollTrigger)
- Barre de progression fine en haut (orange)
- 60 fps : animer UNIQUEMENT transform/opacity, will-change ; aucune animation de layout ; masquer la scrollbar

CONTENU — centralise TOUT dans config.ts. Voici mes vraies données :

brand: "nextech"
heroTitle: "Construis avec l'IA, ce soir."
accentWord: "ce soir."
subtitle: "3 guides PDF pour créer, lancer et vendre — sans savoir coder."
promesse: ["PDF téléchargeable immédiatement", "Pas de formation, pas d'abonnement", "Un livre, tu le lis ce soir, tu construis demain"]

livres: [
  {
    label: "LIVRE 1 · WEB",
    title: "Créer un site internet professionnel avec Claude Code",
    desc: "De la page blanche au site en ligne en 14 jours. Sans savoir coder.",
    points: [
      "Publier un vrai site (vitrine, multi-pages ou landing) en 14 jours, sans écrire une ligne de code",
      "Écrire des prompts précis qui donnent VOTRE site, pas un site générique",
      "Corriger vous-même bugs, design et référencement, garder le site à jour sans agence"
    ],
    tags: ["128 pages", "60 prompts", "PDF"],
    price: "19,99 €",
    link: "https://buy.stripe.com/28EcN6g0R2cednK1BE6Ri0f"
  },
  {
    label: "LIVRE 2 · PRODUIT",
    title: "Créer et lancer son SaaS de A à Z",
    desc: "De l'idée validée au premier client payant. Pour quelqu'un qui n'a jamais créé de logiciel.",
    points: [
      "Valider une idée AVANT de coder, via 20 entretiens ciblés",
      "Construire un logiciel fonctionnel (comptes, abonnements, paiements) en pilotant une IA, sans savoir coder",
      "Trouver ses 10 premiers clients payants, fixer le bon prix, itérer sur de vrais retours"
    ],
    tags: ["PDF", "Modèles", "Prompts"],
    price: "19,99 €",
    link: "https://buy.stripe.com/28E3cwcOF8AC5Vi4NQ6Ri0e"
  },
  {
    label: "LIVRE 3 · AUDIENCE",
    title: "Réussir sur TikTok et développer son activité",
    desc: "L'algorithme, la niche, les hooks, le montage. 100 idées de vidéos incluses.",
    points: [
      "Choisir une niche assez précise pour être trouvé par les bonnes personnes",
      "Écrire des hooks de 3 secondes et raconter des histoires qui retiennent",
      "Transformer l'audience en clients : quoi vendre, quel appel à l'action, quelles stats regarder"
    ],
    tags: ["PDF", "100 idées", "50 hooks"],
    price: "15,99 €",
    link: "https://buy.stripe.com/7sY6oIaGxbMOaby0xA6Ri0g"
  }
]

ctaTitle: "Commence ce soir"
ctaButton: "Voir les guides"
ctaLink: "https://ebookclaude.vercel.app"
handle: "@nextech"

Chaque bouton OBTENIR et le bouton CTA ouvrent leur `link` dans un nouvel onglet (target="_blank", rel="noopener").

CONTRAINTES :
- Mobile-first, parfait et lisible en 390px de large et en 9:16
- Un seul projet propre, prêt pour Vercel
- Commentaire en haut du code expliquant comment changer le contenu (config.ts) et les couleurs

LIVRABLE : montre-moi d'abord l'arborescence, crée tous les fichiers, puis donne-moi les commandes exactes (PowerShell) pour lancer en local (npm install puis npm run dev) et pour déployer sur Vercel.
