# Supabase à la place de Cloudflare R2 — changements à valider

Rédigé le 15 novembre 2026. **Rien n'a été connecté.** Aucune table n'a été créée, aucune variable Netlify modifiée, aucun fichier envoyé dans votre bucket. Le code est prêt et testé en local ; ce document décrit ce qui sera fait, dans l'ordre, une fois chaque étape validée.

Votre projet : région Francfort (UE), offre gratuite, bucket `studio-accroche`.

## 1. Répartition des données

| Donnée | Où | Pourquoi |
|---|---|---|
| Photos des clients, vidéos livrées, factures PDF | **Supabase Storage** (bucket privé) | Ce sont des fichiers |
| Commandes, jetons d'accès, compteur de factures, événements Stripe déjà traités, e-mails archivés | **Supabase PostgreSQL** (table `studio.documents`) | Ces données exigent des écritures atomiques |

Pourquoi deux endroits : la documentation de Supabase ne confirme pas les écritures conditionnelles sur Storage (« créer seulement si absent », « modifier seulement si inchangé »). Sans elles, deux paiements simultanés pourraient s'écraser, un rejeu de Stripe pourrait traiter deux fois la même commande, et deux factures pourraient recevoir le même numéro. PostgreSQL garantit ces écritures. Le test `npm run verifier:stockage` vérifie quand même ce point sur votre vrai bucket, mais le code ne s'en sert plus : il range les documents en base.

Garde-fou dans le code : si le site détecte Supabase Storage **sans** `DATABASE_URL`, il refuse de démarrer le dépôt de données (message explicite) plutôt que de ranger les commandes dans un stockage non vérifié.

## 2. Changements soumis à votre validation

### Bloc 1 — Création de la table SQL

- **Quoi** : exécuter une fois `site/sql/001-documents.sql` dans Supabase, « SQL Editor » puis « New query », coller, « Run ».
- **Ce que le script crée** : un schéma `studio` et une table `studio.documents` (clé, contenu JSON, numéro de version, dates).
- **Ce qu'il ne fait pas** : il ne touche à aucun autre schéma, ne supprime ni n'écrase rien, et peut être relancé sans danger (testé : deuxième exécution sans erreur).
- **Sécurité intégrée** : la sécurité au niveau des lignes est activée sans aucune règle, les droits sont retirés aux rôles publics `anon` et `authenticated`, et le schéma n'est pas exposé par l'API publique de Supabase. Vérifié en local : ces deux rôles reçoivent « permission denied ».
- **Retour en arrière** : `drop schema studio cascade;` supprime la table et son contenu. À n'utiliser que sur une base de test.

### Bloc 2 — Variables d'environnement Netlify

> **Simplifié le 15 novembre** : seules `DATABASE_URL`, `S3_ACCESS_KEY_ID` et `S3_SECRET_ACCESS_KEY` sont à saisir. L'adresse du stockage, la région, le nom du bucket (`studio-accroche`), le style d'adresses et l'origine autorisée sont déduits de `DATABASE_URL` (adresse du « pooler » Supabase). Liste complète et procédure : `MISE-EN-LIGNE.md`. Le tableau ci-dessous reste valable pour forcer une valeur différente.


À saisir par vous dans Netlify, projet `studio-accroche-preprod`, « Site configuration » puis « Environment variables ». Je ne les saisis pas moi-même et vous ne me les communiquez pas.

| Variable | Valeur | Secrète |
|---|---|---|
| `DATABASE_URL` | Supabase, bouton « Connect », onglet « Transaction pooler », copier l'URI. Remplacer `[YOUR-PASSWORD]` par le mot de passe de la base et encoder ses caractères spéciaux (`@` devient `%40`, `#` devient `%23`). Forme attendue : `postgresql://postgres.<réf>:<mot de passe>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres` (l'hôte exact est celui affiché par Supabase) | **Oui** |
| `S3_ENDPOINT` | `https://<réf>.storage.supabase.co/storage/v1/s3` | Non |
| `S3_REGION` | la région exacte affichée sur la page « S3 Connection » de Storage (probablement `eu-central-1`) | Non |
| `S3_BUCKET` | `studio-accroche` | Non |
| `S3_PATH_STYLE` | `oui` | Non |
| `S3_ACCESS_KEY_ID` | généré dans Storage, « S3 Connection », « New access key » | **Oui** |
| `S3_SECRET_ACCESS_KEY` | même écran, affichée une seule fois | **Oui** |
| `S3_PUBLIC_ORIGIN` | `https://<réf>.storage.supabase.co` | Non |
| `DATABASE_CA` (facultatif) | contenu du certificat racine, téléchargeable dans « Database settings » de Supabase ; avec lui la connexion vérifie l'identité du serveur, sans lui elle est chiffrée mais le serveur n'est pas authentifié | Non |

Rien d'existant n'est supprimé : aucune variable `S3_*` n'était définie, R2 n'ayant jamais été activé.

**Pourquoi `DATABASE_URL` passe par le « pooler »** : la connexion directe de Supabase n'est joignable qu'en IPv6 sur l'offre gratuite ; le pooler fonctionne en IPv4 et convient aux fonctions serverless comme celles de Netlify (documentation officielle).

**Clés S3 et sécurité** : une clé S3 de Supabase ouvre tous les buckets du projet et ignore les règles d'accès. Elle ne doit exister que dans Netlify (et dans votre terminal le temps du test). Ne la placez jamais dans une variable commençant par `NEXT_PUBLIC_`, dans un fichier du dépôt, ni dans la conversation.

### Bloc 3 — Connexion effective au stockage

**3a. Test sur votre vrai bucket, avant de connecter le site** (vous le lancez, je ne reçois que le résultat).

Ce qu'il fait : il travaille uniquement dans le dossier temporaire `__test__/<identifiant>/` de votre bucket, n'affiche jamais de clé ni de lien complet, puis supprime ce dossier et vérifie qu'il est vide. Il ne lit, ne modifie et ne supprime aucun autre objet.

Depuis le dossier `site`, dans PowerShell. Une commande à la fois (chaque `Read-Host` attend votre réponse) ; les variables disparaissent quand la fenêtre est fermée.

```powershell
git fetch origin
git checkout claude/autonomous-profitable-business-5u6yv9
git pull
npm install
```
```powershell
$ref = Read-Host "Reference ID du projet Supabase"
$env:S3_REGION = Read-Host "Region (Storage > Settings > S3 Connection)"
$env:S3_ACCESS_KEY_ID = Read-Host "Access key ID"
$env:S3_SECRET_ACCESS_KEY = [System.Net.NetworkCredential]::new("", (Read-Host "Secret access key" -AsSecureString)).Password
$env:S3_ENDPOINT = "https://$ref.storage.supabase.co/storage/v1/s3"; $env:S3_BUCKET = "studio-accroche"; $env:S3_PATH_STYLE = "oui"
npm run verifier:stockage -- --origine=https://studio-accroche-preprod.netlify.app --limite
Remove-Item Env:S3_ACCESS_KEY_ID, Env:S3_SECRET_ACCESS_KEY
```

`--limite` envoie un fichier de 51 Mo (supprimé ensuite) pour vérifier que le plafond de 50 Mo est bien appliqué. Il consomme brièvement 51 Mo de votre 1 Go.

Collez-moi uniquement le bloc « RÉSULTAT » et les lignes marquées ✗ ou ⚠. Il ne contient aucune clé.

**Lecture du résultat**
- « FICHIERS : CONFORME » : le stockage convient pour les photos, vidéos et PDF.
- « ÉCRITURES CONDITIONNELLES : DÉMONTRÉES » seulement si les 6 vérifications passent. Sinon (cas probable), ne rien faire : le code n'en a pas besoin.
- « Nettoyage : dossier temporaire supprimé, vérifié » : preuve que rien ne reste dans votre bucket.

**3b. Connexion du site** : seulement si 3a est conforme et après votre accord. Je redéploie la préproduction (protégée par mot de passe), puis je rejoue un parcours complet : dépôt d'une photo depuis le navigateur, livraison d'une vidéo, téléchargement par lien temporaire, facture.

## 3. Réglages du bucket à faire dans Supabase

| Réglage | Valeur | Où |
|---|---|---|
| Bucket public | **Désactivé** (privé) | Storage, bucket `studio-accroche` |
| Limite de taille par fichier | **50 Mo** (plafond de l'offre gratuite) | Storage, réglages du bucket |
| Types autorisés | `image/jpeg, image/png, image/webp, image/heic, video/mp4, video/quicktime, video/webm, application/pdf` | Storage, réglages du bucket |
| Connexion via le protocole S3 | **Activée** | Storage, « S3 Connection » |
| Règles d'accès (policies) sur Storage | **Aucune** | Le site n'utilise que des clés serveur et des liens signés |

## 4. Liens temporaires

- **Dépôt** : le site délivre au navigateur un lien signé valable 15 minutes, limité à un seul fichier et à son type. À la confirmation, le serveur revérifie la taille réelle et les premiers octets du fichier, et supprime tout fichier non conforme.
- **Récupération par le client** : à chaque clic sur « Télécharger » de sa page privée, le site crée un lien signé de 5 minutes, en pièce jointe, sans mise en cache ni en-tête de provenance. Le courriel de livraison contient le lien de la page privée, jamais un lien de fichier : un lien expiré ne casse donc rien.
- Le test `verifier:stockage` contrôle sur votre bucket : lecture sans signature refusée, adresse publique refusée, lien détourné vers un autre fichier refusé, lien expiré refusé.

## 5. Limites et risques à connaître

| Sujet | Fait (source : documentation officielle de Supabase, 15 novembre 2026) | Conséquence |
|---|---|---|
| Taille par fichier | 50 Mo au maximum sur l'offre gratuite | Limite des vidéos livrées abaissée de 300 à 50 Mo (variable `LIVRABLE_MAX_MO` pour la relever plus tard) |
| Capacité | 1 Go de stockage, 5 Go de sorties par mois | Environ 40 à 60 commandes stockées (estimation : 15 à 25 Mo par commande), purge des fichiers à 90 jours déjà en place |
| **Pause automatique** | Les projets gratuits sont mis en pause après une semaine sans activité suffisante | Voir `MAINTIEN-ACTIVITE.md`. Pendant la pause, le site ne peut ni lire ni écrire de commande |
| **Aucune sauvegarde** | Pas de sauvegarde automatique sur l'offre gratuite ; les sauvegardes payantes n'incluent pas les fichiers | `npm run sauvegarde` à lancer vous-même régulièrement (voir ci-dessous) |
| Données personnelles | Supabase Pte. Ltd. (Singapour) agit comme sous-traitant ; son accord de traitement intègre les clauses contractuelles types de l'UE. Données hébergées à Francfort | Mentionné dans la politique de confidentialité. **À vérifier** : que l'accord s'applique bien à l'offre gratuite (la page ne le précise pas) |

### Sauvegarde et restauration (testées en local)

```bash
npm run sauvegarde                                # crée sauvegardes/AAAAMMJJ-HHMM/ (documents + factures PDF)
npm run restauration -- sauvegardes/AAAAMMJJ-HHMM # dans une base vide ; refuse d'écraser quoi que ce soit
```

Le dossier `sauvegardes/` est exclu de Git. Il contient des données personnelles de clients : ne le publiez pas, ne l'envoyez pas par e-mail. Les factures doivent être conservées 10 ans : copiez ce dossier sur un disque que vous maîtrisez, idéalement chiffré.

## 6. Ce qui a été testé réellement

| Test | Résultat |
|---|---|
| Tests du pilote PostgreSQL (30 écritures simultanées, versions, compteur, injection, routage, sécurité) sur PostgreSQL 16 local | 29 / 29 |
| Tests ciblés (concurrence, factures, purge, e-mails), disque, S3 émulé, PostgreSQL + disque, PostgreSQL + S3 émulé | tous réussis |
| Parcours client complet dans un navigateur, PostgreSQL + S3 émulé | 86 / 86 |
| Script SQL deux fois de suite | aucune erreur |
| Sauvegarde puis restauration d'une base de 43 documents | empreinte identique |
| `verifier:stockage` sur deux émulateurs, aux comportements opposés | le test réussit et échoue là où il le doit (détecte un stockage qui écrase en silence) |

**Non testé** : tout ce qui concerne le vrai Supabase (réseau, pooler, signatures, CORS, limite de 50 Mo, présence ou non des écritures conditionnelles). Les émulateurs ne reproduisent pas les réponses exactes du service : seul le test 3a sur votre bucket peut le démontrer.

## 7. Résultat du test réel de votre bucket (15 novembre) et contrôles de sécurité

| Test sur le vrai bucket | Résultat (rapporté par le fondateur) |
|---|---|
| Fichiers : envois, lectures, liens temporaires, accès privé, limite de 51 Mo, suppression, nettoyage | 14 réussites, 1 avertissement, 0 échec |
| Écritures conditionnelles | 2 vérifications sur 6 réussies : **Supabase Storage écrase en silence un objet existant**, y compris sur une version périmée ou une création simultanée |

Conséquence : le choix de PostgreSQL pour les données critiques est confirmé. Il est maintenant **imposé par le code** :
- les documents `.json` (commandes, jetons, compteur de factures, événements Stripe, e-mails, réservation des numéros de facture) vont uniquement en base ;
- le dépôt mixte **refuse** toute écriture conditionnelle sur un fichier (PDF, photo, vidéo) ;
- le numéro de facture est réservé en base (`factures/<numéro>.json`, création atomique) avant l'envoi du PDF, qui part sans condition ;
- un test d'inventaire (`npm run test:postgres`) échoue si une écriture conditionnelle vise autre chose qu'un document JSON, ou si le SDK S3 est utilisé hors du dépôt.

**Contrôle des types de fichiers** (tous côté serveur, indépendants du comportement de Supabase) :
1. à la demande d'envoi : extension et type annoncé doivent correspondre à la liste autorisée (JPG, PNG, WebP, HEIC, MP4, MOV, WebM, PDF) ;
2. à la confirmation : taille réelle égale à la taille annoncée, plafond respecté, premiers octets conformes au type (pour MP4, MOV et HEIC : en-tête `ftyp` avec une marque connue, taille d'en-tête plausible) ;
3. à la confirmation : le type enregistré par le stockage doit être celui annoncé (un navigateur qui enverrait `text/html` est refusé) ;
4. tout fichier refusé est supprimé immédiatement ;
5. au téléchargement : toujours en pièce jointe, jamais affiché par le site.

À ajouter dans Supabase (défense en plus, à faire **après** le test) : Storage, bucket `studio-accroche`, réglages, « Restrict file types » : `image/jpeg, image/png, image/webp, image/heic, video/mp4, video/quicktime, video/webm, application/pdf`.

**CORS** : la documentation de Supabase ne décrit aucun réglage de CORS pour Storage (non confirmé). Le test a vérifié que l'envoi depuis l'adresse de la préproduction est autorisé. Sans effet sur la sécurité : un lien signé est un secret à usage unique de 15 minutes, limité à un fichier ; un site tiers sans ce lien ne peut rien envoyer. Côté site, la politique de sécurité n'autorise l'envoi direct que vers l'origine du stockage, désormais déduite automatiquement de `S3_ENDPOINT` si `S3_PUBLIC_ORIGIN` manque (variable lue à la compilation : redéployer après l'avoir saisie).

**Limite de 50 Mo** : le serveur refuse tout fichier au-delà de 50 Mo binaires (52 428 800 octets) dès la demande ; Supabase a refusé 51 Mo au test. Reste à vérifier si Supabase compte 50 Mo en décimal ou en binaire : `npm run verifier:stockage -- --limite-exacte` envoie 50 000 000 puis 52 428 800 octets (supprimés ensuite). Si le second est refusé, définir `LIVRABLE_MAX_MO=47` dans Netlify. En cas de refus du stockage, le client voit un message explicite (« Fichier trop volumineux pour le stockage ») au lieu de « Envoi interrompu ».

## 8. Retour en arrière

Supprimer `DATABASE_URL` et les variables `S3_*` de Netlify ramène le site à l'écriture dans un dossier temporaire (non conservé). Les données déjà en base restent dans Supabase. Cloudflare R2 n'a jamais été activé : rien à nettoyer chez Cloudflare.
