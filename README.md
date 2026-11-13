# Studio Accroche

Service de publicités vidéo avec présentateur IA pour e-commerçants francophones, vendu sur ComeUp, Fiverr et en direct.

Objectif : une première vente réelle sous 30 jours après la mise en ligne des fiches.

## Où trouver quoi

| Fichier | Contenu |
|---|---|
| `LANCEMENT.md` | État réel : ce qui fonctionne, ce qui reste, ce qui dépend du fondateur |
| `RESEARCH.md` | Étude de marché : 12 opportunités comparées, mesures et sources |
| `BUSINESS.md` | Offre, prix, marges, objectifs |
| `MARKETING.md` | Canaux d'acquisition, scripts vidéo, arguments |
| `ROADMAP.md` | Étapes |
| `PROGRESS.md` | Avancement réel et journal des décisions |
| `TODO.md` | Prochaines actions, dont celles qui attendent une autorisation |
| `listings/` | Textes des fiches ComeUp et Fiverr, prêts à coller |
| `production/PROCESS.md` | Méthode du brief à la livraison, contrôle qualité |
| `production/pipeline/build_ad.py` | Outil d'assemblage vidéo (sous-titres, incrustations, voix off) |
| `production/essai-01/` | Première publicité test et son rapport |
| `commercial/PROSPECTS.md` | 25 clients potentiels, avec observation et accroche pour chacun |
| `commercial/PLAN.md` | Méthode de présentation, messages types, plan jusqu'au premier client |
| `production/pipeline/make_site_media.sh` | Fabrique les vidéos du site à partir d'une publicité |
| `publicite-studio/CONCEPT.md` | Concept, storyboard, script et prompts de la publicité du studio |
| `publicite-studio/studio-accroche-pub-v0.mp4` | Version sans génération de la publicité (22 s) ; `animation/` contient de quoi la reconstruire |
| `commercial/VERIFICATION.md` | Vérification visuelle des prospects |
| `commercial/ACCROCHES.md` | Trois accroches pour chacun des 8 prospects prioritaires |
| `commercial/MESSAGES.md` | Huit messages personnalisés prêts à envoyer |
| `ADMIN.md` | Vérification du nom, dossier micro-entreprise, e-mail |
| `site/` | Site de vente et de gestion des commandes (voir `site/README.md`) |
| `archive/` | Anciens projets (ebooks nextech, Fruit Studio), conservés pour référence |

## Tester le site

```bash
cd site
npm install
npm run demo      # http://localhost:3000 — administration : /admin, mot de passe « demonstration »
```

Le paiement est simulé, rien n'est débité. Détails et mise en service dans `site/README.md`.

## Règles

- Aucun mot de passe ni clé dans le dépôt : uniquement des variables d'environnement.
- Aucun faux avis, faux client ou chiffre inventé.
- Toute dépense, publication ou message à un tiers demande l'accord du fondateur.
