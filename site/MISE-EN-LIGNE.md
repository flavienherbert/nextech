# Mise en ligne en préproduction privée — marche à suivre

> **Mise à jour du 15 novembre 2026 : Supabase remplace Cloudflare R2.** Le stockage des fichiers et la base de données sont désormais décrits dans `SUPABASE.md` (changements en attente de validation). Les étapes « Cloudflare R2 » ci-dessous sont conservées pour mémoire jusqu'à cette validation ; R2 n'a jamais été activé, rien n'y a été créé.

Rédigé le 15 novembre 2026. Rien n'a été créé ni déployé. Objectif : un site en ligne, protégé par mot de passe, avec Stripe en mode test, pour vérifier une commande complète en conditions réelles avant l'ouverture.

Coût : 0 €. Aucun nom de domaine n'est nécessaire à ce stade (adresse fournie par Netlify).

Règle : les clés et mots de passe se saisissent uniquement dans les interfaces des services. Ne les copiez jamais dans la conversation ni dans un fichier du projet.

## État au 15 novembre 2026

Préproduction en ligne : https://studio-accroche-preprod.netlify.app (protégée par mot de passe ; les mots de passe sont dans les variables d'environnement du projet Netlify, pas dans ce dépôt).

| Élément | État |
|---|---|
| Site déployé sur Netlify (offre gratuite), adaptateur Next.js | Vérifié en ligne : pages, images, formules, sans erreur, ordinateur et mobile |
| Accès protégé par mot de passe, webhook Stripe exempté | Vérifié en ligne : 401 sans mot de passe, 200 avec |
| En-têtes de sécurité (CSP stricte, HSTS, X-Frame-Options) | Vérifiés en ligne |
| Administration | Connexion vérifiée en ligne |
| Stockage durable | NON : le site écrit dans un dossier temporaire, les données ne sont pas conservées. Remplacement prévu par Supabase (`SUPABASE.md`), code prêt et testé en local, rien de connecté |
| E-mails | NON envoyés : la clé Brevo n'est pas saisie dans Netlify. Expéditeur déjà validé chez Brevo |
| Paiement | Fermé : aucune clé Stripe. Le connecteur Stripe ne donne accès qu'à un compte en mode réel, non utilisé |

Déploiement : manuel, depuis le dossier `site` (le dépôt GitHub n'est pas relié à Netlify).

## Ce qui est déjà prêt dans le code

| Élément | État |
|---|---|
| Réglages Netlify (`netlify.toml`) | Écrit, non testé chez Netlify |
| Protection par mot de passe de tout le site (`PREPROD_PASSWORD`) | Testé en local : 401 sans mot de passe, 200 avec |
| Stockage compatible S3, écritures conditionnelles | Testé sur émulateur local, pas encore sur R2 |
| Réglage des sommes de contrôle pour R2 | Écrit, à vérifier sur R2 |
| E-mails par Brevo | Écrit, jamais envoyé réellement |
| Stripe par clé de test et webhook signé | Testé sur simulateur, pas encore sur Stripe |

## Étape 1 — Stockage : Cloudflare R2 (15 min)

1. Créer un compte sur cloudflare.com, puis ouvrir « R2 ». Cloudflare peut demander un moyen de paiement pour activer R2 ; l'offre gratuite couvre 10 Go. Si un paiement est exigé et que vous ne voulez pas le fournir, arrêtez-vous et dites-le-moi.
2. Créer un bucket nommé `studio-accroche-preprod`, emplacement Europe.
3. Dans les réglages du bucket, « CORS policy », coller :
   ```json
   [{"AllowedOrigins": ["https://ADRESSE-NETLIFY"], "AllowedMethods": ["PUT", "GET"], "AllowedHeaders": ["Content-Type"], "ExposeHeaders": ["ETag"], "MaxAgeSeconds": 3600}]
   ```
   (l'adresse Netlify sera connue à l'étape 3 ; revenir la remplacer).
4. « Manage R2 API Tokens » → créer un jeton « Object Read & Write » limité à ce bucket. Noter pour l'étape 3 : Access Key ID, Secret Access Key, et l'adresse `https://<ID-DE-COMPTE>.r2.cloudflarestorage.com`.

## Étape 2 — E-mails : Brevo (10 min)

1. Créer un compte gratuit sur brevo.com (300 e-mails par jour).
2. « Expéditeurs » : ajouter l'adresse e-mail du studio et la valider par le lien reçu.
3. « SMTP & API » → « Clés API » : créer une clé. La noter pour l'étape 3.

Limite connue : sans nom de domaine authentifié, les e-mails peuvent arriver en indésirables. Suffisant pour la préproduction, à corriger avec le nom de domaine avant l'ouverture.

## Étape 3 — Hébergement : Netlify (20 min)

1. Créer un compte gratuit sur netlify.com avec votre compte GitHub.
2. « Add new project » → « Import an existing project » → dépôt `nextech`, branche `claude/autonomous-profitable-business-5u6yv9`. Les réglages de construction sont lus dans `netlify.toml`.
3. Avant de lancer, ouvrir « Environment variables » et saisir :

| Variable | Valeur |
|---|---|
| `SITE_URL` | l'adresse du site Netlify, sans barre finale |
| `PREPROD_PASSWORD` | un mot de passe de votre choix (accès au site) |
| `ADMIN_PASSWORD` | un autre mot de passe, long (accès à l'administration) |
| `SESSION_SECRET` | 64 caractères aléatoires |
| `ADMIN_EMAIL` | l'adresse du studio |
| `NEXT_PUBLIC_CONTACT_EMAIL` | l'adresse du studio |
| `S3_BUCKET` | `studio-accroche-preprod` |
| `S3_ENDPOINT` et `S3_PUBLIC_ORIGIN` | l'adresse R2 de l'étape 1 |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | les deux clés R2 |
| `S3_REGION` | `auto` |
| `BREVO_API_KEY` | la clé Brevo |
| `MAIL_FROM` | l'adresse du studio validée chez Brevo |

4. Lancer le déploiement. Ne renseignez ni SIRET ni nom : le site reste en mode « préproduction », commandes fermées, tant que Stripe n'est pas configuré.
5. Ouvrir l'adresse : le navigateur demande un identifiant (libre) et le mot de passe `PREPROD_PASSWORD`.
6. Retourner dans R2 remplacer `ADRESSE-NETLIFY` dans la règle CORS.

## Étape 4 — Paiement : Stripe en mode test (15 min)

Suivre `STRIPE.md`. En résumé : dans Stripe, activer le mode test, copier la clé secrète de test (`sk_test_…`) dans la variable `STRIPE_SECRET_KEY` de Netlify, créer un webhook vers `https://ADRESSE-NETLIFY/api/stripe/webhook` pour les événements indiqués, copier son secret (`whsec_…`) dans `STRIPE_WEBHOOK_SECRET`, puis redéployer. Une clé réelle (`sk_live_…`) est refusée par le site.

## Étape 5 — Vérification (30 min, avec moi)

1. Commander l'Essai avec la carte de test `4242 4242 4242 4242`.
2. Vérifier : e-mail de confirmation reçu, commande visible dans `/admin`, brief et dépôt d'une image, fichier présent dans le bucket R2.
3. Dans `/admin` : passer en production, déposer une vidéo, livrer. Vérifier l'e-mail de livraison et le téléchargement côté client.
4. Demander une retouche, puis valider.
5. Redéployer le site et vérifier que la commande existe toujours.
6. Me transmettre ce qui échoue (message affiché, étape) : je corrige.

## Ensuite, pour ouvrir réellement

SIRET reçu → mentions légales et factures réelles ; nom de domaine (7 à 12 € par an) et authentification des e-mails ; retrait de `PREPROD_PASSWORD` ; clé Stripe réelle et `VENTES_REELLES=oui` ; une commande réelle de contrôle à 25 €, remboursée.
