# Studio Accroche

Service de publicités vidéo avec présentateur IA pour e-commerçants francophones, vendu sur ComeUp, Fiverr et en direct.

Objectif : une première vente réelle sous 30 jours après la mise en ligne des fiches.

## Où trouver quoi

| Fichier | Contenu |
|---|---|
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
| `ADMIN.md` | Vérification du nom, dossier micro-entreprise, e-mail |
| `site/` | Site vitrine (Next.js) |
| `archive/` | Anciens projets (ebooks nextech, Fruit Studio), conservés pour référence |

## Lancer le site en local

```bash
cd site
npm install
cp .env.example .env.local   # puis remplir les valeurs
npm run dev                  # http://localhost:3000
```

## Mettre en ligne (Vercel)

1. Importer le dépôt dans Vercel et choisir `site` comme dossier racine.
2. Renseigner les variables d'environnement listées dans `site/.env.example`.
3. Dans chaque lien de paiement Stripe, régler la redirection après paiement sur `https://<domaine>/merci`.

Ne pas mettre en ligne avant d'avoir : le SIRET, les mentions légales complètes, une adresse e-mail dédiée et au moins 3 vidéos d'exemple.

## Ajouter des vidéos d'exemple

Déposer les fichiers MP4 dans `site/public/exemples/` et les déclarer dans la liste `exemples` de `site/app/config.ts`. La section apparaît automatiquement.

## Règles

- Aucun mot de passe ni clé dans le dépôt : uniquement des variables d'environnement.
- Aucun faux avis, faux client ou chiffre inventé.
- Toute dépense, publication ou message à un tiers demande l'accord du fondateur.
