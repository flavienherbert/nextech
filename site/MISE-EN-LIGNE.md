# Mise en ligne en préproduction privée — marche à suivre

> **Mise à jour du 15 novembre 2026 : Supabase remplace Cloudflare R2.** Le stockage des fichiers et la base de données sont désormais décrits dans `SUPABASE.md` (changements en attente de validation). Les étapes « Cloudflare R2 » ci-dessous sont conservées pour mémoire jusqu'à cette validation ; R2 n'a jamais été activé, rien n'y a été créé.

## Ce qu'il vous reste à faire — 3 blocs, environ 20 minutes (16 novembre)

Tout le reste est fait et vérifié (voir `LANCEMENT.md`). Ces trois blocs demandent un compte ou un secret que vous seul pouvez fournir. Les secrets se saisissent **uniquement dans Netlify** (*Site configuration*, *Environment variables*, **Add a variable**, cocher **Contains secret values**), jamais dans la conversation. Après chaque bloc, dites-le-moi : je redéploie et je vérifie en ligne.

**Bloc A — E-mails réels (Gmail du studio)**
1. Connecté à contactstudioaccroche@gmail.com : https://myaccount.google.com/security, activer la **Validation en 2 étapes** si ce n'est pas fait.
2. https://myaccount.google.com/apppasswords : nom « Studio Accroche », **Créer**, copier les 16 caractères (affichés une seule fois).
3. Netlify : variable `SMTP_PASSWORD` = ces 16 caractères, sans espaces.
*Alternative sans mot de passe* : Brevo, menu du compte, *Security*, **Authorized IPs**, désactiver la restriction. Moins fiable (e-mails envoyés au nom d'une adresse Gmail depuis d'autres serveurs).

**Bloc B — Base de données et fichiers (Supabase)**
1. Supabase, votre projet, bouton **Connect**, onglet **Transaction pooler** : copier l'URI. Remplacer `[YOUR-PASSWORD]` par le mot de passe de la base (oublié : *Project Settings*, *Database*, **Reset database password**) ; encoder `@` en `%40`, `#` en `%23`.
2. Supabase, *Storage*, *S3 Connection*, **New access key** : copier l'*Access key ID* et la *Secret access key* (affichée une seule fois).
3. Netlify : variables `DATABASE_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`. La table se crée toute seule ; le reste est déduit.

**Bloc C — Paiement en mode test (Stripe)**
1. Stripe, bandeau orange **Mode test** actif, *Développeurs*, *Clés API* : copier la **clé secrète** `sk_test_…`.
2. Netlify : variable `STRIPE_SECRET_KEY` = cette clé. Le secret du webhook (`STRIPE_WEBHOOK_SECRET`) peut être créé par Claude, sans que vous ayez à ouvrir Stripe, si vous saisissez aussi la clé dans le formulaire sécurisé qu'il affiche (la clé n'apparaît jamais dans la conversation). Sinon : `npm run stripe:webhook` (voir plus bas).

Quand A, B et C sont faits : `ADMIN_PASSWORD=… NTFY_TOPIC=… npm run e2e:en-ligne` (ou « lancez le parcours complet » à Claude) passe une vraie commande de test Stripe de bout en bout sur le site en ligne : paiement par carte de test, notifications, brief, production, livraison, correction, validation.

## Accès au site : consultation libre depuis le 16 novembre

À la demande du fondateur, la protection par identifiant et mot de passe de la préproduction a été **retirée** (variable `PREPROD_PASSWORD` supprimée dans Netlify). Le site se consulte directement, sur téléphone et ordinateur : https://studio-accroche-preprod.netlify.app

Ce qui reste fermé :
- **L'administration** (`/admin` et toutes les routes `/api/admin/…`) : mot de passe administrateur (`ADMIN_PASSWORD`), 5 essais par quart d'heure puis blocage avec alerte sur le téléphone, session de 7 jours en cookie signé, aucun contenu sans session.
- **Les ventes réelles** : une clé Stripe réelle est refusée tant que `VENTES_REELLES` n'est pas « oui » et que les mentions légales (nom, SIRET, adresse) sont incomplètes. Ces trois verrous sont absents : seul le mode test peut fonctionner. Tant qu'aucune clé Stripe de test n'est saisie, le paiement est fermé.
- **Les moteurs de recherche** : le site entier est en `noindex` et `robots.txt` interdit l'exploration. Rien n'est lié depuis un site public.
- La tâche quotidienne, la route de test d'erreur et les fichiers de configuration répondent 404 ; le webhook Stripe exige une signature.

Pour remettre la protection : ajouter la variable `PREPROD_PASSWORD` (mot de passe de votre choix) dans Netlify, puis redéployer. `npm run verifier:en-ligne` s'adapte aux deux cas.

## Liste définitive des variables à saisir dans Netlify (15 novembre)

Où : Netlify, projet `studio-accroche-preprod`, « Site configuration », « Environment variables », « Add a variable ». Cochez « Contains secret values » pour chacune. Rien ne passe par la conversation.

| Variable | Où trouver la valeur | Secrète |
|---|---|---|
| `DATABASE_URL` | Supabase, bouton **Connect**, onglet **Transaction pooler**, copier l'URI ; remplacer `[YOUR-PASSWORD]` par le mot de passe de la base (si vous l'avez oublié : Supabase, *Database*, *Settings*, *Reset database password*) ; encoder les caractères spéciaux du mot de passe (`@` devient `%40`) | oui |
| `S3_ACCESS_KEY_ID` | Supabase, *Storage*, *Settings*, *S3 Connection*, **New access key** (la clé secrète ne s'affiche qu'une fois) | oui |
| `S3_SECRET_ACCESS_KEY` | même écran | oui |
| `STRIPE_SECRET_KEY` | Stripe **en mode test** (bandeau « Test mode » orange), *Développeurs*, *Clés API*, clé secrète `sk_test_…` | oui |
| `STRIPE_WEBHOOK_SECRET` | affiché par `npm run stripe:webhook` (voir ci-dessous) | oui |

La table SQL est **créée automatiquement** à la première connexion (aucun script à exécuter). Tout le reste est **déduit automatiquement** de `DATABASE_URL` : adresse du stockage, région, nom du bucket (`studio-accroche`), origine autorisée pour l'envoi de fichiers. Variables déjà en place : `SITE_URL`, `PREPROD_PASSWORD`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `ADMIN_EMAIL`, `MAIL_FROM`, `NEXT_PUBLIC_CONTACT_EMAIL`, `BREVO_API_KEY`.

**Webhook Stripe en mode test** (une commande, dans PowerShell, dossier `site`) :
```powershell
$env:STRIPE_SECRET_KEY = [System.Net.NetworkCredential]::new("", (Read-Host "Cle secrete Stripe de TEST (sk_test_...)" -AsSecureString)).Password
npm run stripe:webhook
Remove-Item Env:STRIPE_SECRET_KEY
```
Le script refuse toute clé qui n'est pas une clé de test, crée le webhook pour la préproduction avec les 4 événements utiles, et affiche le secret `whsec_…` dans votre terminal : copiez-le dans Netlify.

## E-mails du vendeur et notifications (16 novembre)

Objectif : être prévenu à chaque commande payée, sans jamais surveiller le site. Mode d'emploi du quotidien : `MODE-EMPLOI.md`.

**Déjà saisi dans Netlify** (par Claude, non secret) : `ADMIN_EMAIL` et `MAIL_FROM` (contactstudioaccroche@gmail.com), `SMTP_USER` (la même adresse), `NTFY_TOPIC` (sujet de notification aléatoire, affiché dans Administration → Mode d'emploi), `TACHES_SECRET` (tâche quotidienne).

**Ce qu'il reste à faire, une seule fois :**

1. **Mot de passe d'application Gmail** (voie d'envoi qui contourne le blocage de Brevo). Compte Google du studio → *Sécurité* → activer la *Validation en 2 étapes* (si ce n'est pas fait) → *Mots de passe des applications* → nom « Studio Accroche » → **Créer** → copier les 16 caractères. Dans Netlify : *Environment variables* → **Add a variable** → `SMTP_PASSWORD`, cocher **Contains secret values**, coller, enregistrer. (Ne l'envoyez pas dans la conversation.) Puis « Deploys » → « Trigger deploy » → « Deploy site » (ou dites-le-moi, je redéploie).
2. **Application ntfy** sur le téléphone : installer ntfy (gratuit), **+**, saisir le sujet affiché dans Administration → Mode d'emploi.
3. **Vérification** : Administration → Diagnostic → **Envoyer une notification de test**.

Ordre d'envoi (depuis le 16 novembre) : **Gmail d'abord**, puis Brevo en secours. Raison : l'expéditeur est une adresse Gmail ; seul Gmail peut signer un e-mail envoyé à son nom, les autres services risquent le classement en indésirables ou le refus. Tant que `SMTP_PASSWORD` n'est pas saisi, Brevo reste seul en lice, et il refuse l'adresse du serveur (« unrecognised IP address »). Pour réactiver Brevo : dans Brevo, menu du compte, *Security*, **Authorized IPs**, désactiver la restriction (les adresses de Netlify changent à chaque appel, une liste d'adresses est inutilisable). Les deux ensemble donnent une double sécurité ; l'un des deux suffit.

Limites de Gmail en envoi par mot de passe d'application : environ 500 messages par jour, largement suffisant. Les e-mails partent de l'adresse Gmail du studio (pas d'un nom de domaine) : à remplacer par une adresse sur domaine propre avant l'ouverture, avec authentification SPF/DKIM.

Après saisie, dites-moi « variables saisies » : je redéploie la préproduction et je lance `npm run verifier:en-ligne` (rien n'est public, diagnostic complet). Puis `TEST-CLIENT.md`.

**Tâche quotidienne** (activée le 16 novembre par la variable `TACHES_SECRET`, à 6 h UTC soit 7 h ou 8 h à Paris) : récapitulatif des commandes en attente, relance unique des briefs manquants depuis 48 h, purge des données arrivées à échéance, lecture de la base (ce qui évite aussi la mise en pause d'un projet Supabase gratuit). Pour la désactiver : supprimer la variable `TACHES_SECRET`.

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
