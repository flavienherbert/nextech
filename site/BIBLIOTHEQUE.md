# Bibliothèque de publicités, avatars et portfolio

Où : **Administration → Publicités** (`/admin/publicites`) et **Avatars** (`/admin/avatars`). Côté visiteurs : la page **Réalisations** (`/realisations`) et la section « Exemples » de l'accueil.

Ce que c'est : un classeur de vos publicités (PUB-001, PUB-002…) avec leur vidéo, leur script, leur prompt de génération et le présentateur utilisé, et un portfolio public où **vous choisissez, une par une, ce qui est visible**. Rien n'est public par défaut.

## En cinq gestes

1. **Nouvelle publicité** : nom, produit, catégorie, avatar, style, durée, format, script, prompt ; vidéo et miniature (facultatives tant que la fiche est « En cours »). Le numéro est attribué à l'enregistrement.
2. **Vidéo** : MP4 (H.264) ou WebM, 60 secondes et 40 Mo au plus. Le navigateur contrôle le fichier avant l'envoi et vous prévient si le format de la vidéo ne correspond pas au format de la fiche. Sans miniature, « Capturer la miniature » prend une image de la vidéo, dans votre navigateur.
3. **Statut** : En cours → Terminée → **Validée** (ou Refusée). Seule une publicité *Validée* qui a une vidéo peut être publiée.
4. **Publier / Dépublier** : la publicité entre dans (ou sort de) la page Réalisations. **Mettre à la une** l'affiche aussi sur l'accueil (six au plus).
5. **Dupliquer** pour décliner une publicité (nouvelle fiche, sans fichiers, privée) ; **Supprimer** en retapant son numéro.

## Règles de publication

- Publiée = statut « Validée » **et** une vidéo. Si le statut change, ou si la vidéo est retirée, la publicité est **dépubliée automatiquement** (et retirée de la une).
- « À la une » exige « Publiée » ; six publicités à la une au plus (message clair au-delà).
- Les enregistrements des boutons Publier / À la une / Dupliquer / Supprimer portent sur la fiche **enregistrée** : enregistrez d'abord vos modifications.
- Portfolio et accueil : tri par **ordre** croissant (champ « Ordre d'affichage », 0 partout = les plus récentes d'abord), puis par date.
- Une démonstration de plus de 15 secondes peut être gardée dans la bibliothèque (jusqu'à 60 s) ; la fiche vous prévient qu'elle dépasse la durée vendue par le site. À vous de ne pas la publier : le portfolio affiche la durée de chaque vidéo.

## Ce qui est public, ce qui ne l'est jamais

| Public (publicités publiées seulement) | Jamais public |
|---|---|
| nom, catégorie, style, durée, vidéo, miniature, mention « Création de démonstration réalisée avec l'IA — marque et produit fictifs. » | prompt, script, produit, avatar (nom, photo, référence), statut, notes, fiches privées, fichiers des avatars |

Les fichiers publics sont servis par `/b/<fichier>?p=<publicité>` : le fichier doit appartenir à cette publicité **et** elle doit être publiée, sinon 404 (même réponse dans tous les cas). Aucun chemin libre n'est accepté. Lecture par plages (nécessaire sur iPhone).

## Ajouter une catégorie, un style, un format, un statut

Tout est dans `site/lib/bibliotheque.ts`, en haut du fichier :

| Liste | Constante | Pour en ajouter un |
|---|---|---|
| Catégories | `CATEGORIES` | une ligne : `"Auto"` |
| Styles | `STYLES` | une ligne |
| Formats | `FORMATS` | une ligne (`"3:4"`) |
| Statuts | `STATUTS_PUB` | une ligne `{ id, nom }` |

Les formulaires, les filtres et les contrôles suivent. **Retirer** une valeur ne casse rien : une fiche qui l'utilise reste lisible et modifiable, et la valeur reste proposée aux filtres tant qu'une fiche la porte.

## Avatars

Les quatre avatars de base (Femme 01, Femme 02, Homme 01, Homme 02) sont créés au premier usage, sans jamais écraser un avatar existant ; un avatar de base que vous supprimez n'est pas recréé. Vous en ajoutez librement (identifiant en minuscules, chiffres et tirets). **Un avatar lié à au moins une publicité ne peut pas être supprimé** : la liste des publicités concernées s'affiche.

## Où sont rangées les données

- Fiches : `publicites/PUB-001.json` ; avatars : `avatars/femme-01.json` ; compteur : `compteurs/publicites.json` (écriture conditionnelle : aucun doublon, même en cas de clics simultanés ; **un numéro supprimé n'est jamais réattribué**). Ce sont des documents JSON, rangés en base comme les commandes. Aucune table à créer.
- Fichiers : dossier **`bibliotheque/`** du stockage, **distinct de `medias/`**. Le nettoyage quotidien de `medias/` supprime tout ce qui n'est pas dans le registre des emplacements du site : ne rangez jamais de fichier de la bibliothèque dans `medias/`.
- Nettoyage quotidien de `bibliotheque/` (`lib/purge.ts`) : un fichier qu'aucune fiche (publicité ou avatar) ne référence, vieux de plus de 24 heures, est supprimé (fiche supprimée, vidéo remplacée, envoi abandonné). Si une seule fiche est illisible, **rien n'est supprimé**.
- Sauvegarde (`npm run sauvegarde`) : les fiches et avatars sont dans `documents.json`. **Les vidéos et photos ne sont pas sauvegardées** (comme les médias du site) : gardez vos originaux.

## Limites connues

- **Au-delà d'environ 300 fiches**, il faudra ajouter un document d'index : les pages relisent toutes les fiches (`lireTous("publicites")`).
- **Cache court des fichiers publics (1 heure)** : contrairement aux médias du site (cache d'un an), une publicité peut être dépubliée ; un fichier gardé un an dans un navigateur ou sur le réseau de diffusion resterait visible. Avec un stockage objet, le lien signé déjà délivré à un visiteur reste valable jusqu'à 1 heure ; la page, elle, n'y renvoie plus aussitôt.
- **« Capturer la miniature »** fonctionne à partir du fichier que vous venez de choisir. Pour une vidéo déjà enregistrée sur un stockage objet, le navigateur interdit parfois de lire ses pixels : rechoisissez le fichier, ou envoyez une image.
- La limite de six publicités à la une est vérifiée au moment du clic ; deux clics simultanés (deux onglets) pourraient la dépasser d'une unité.
- Le portfolio relit les fiches au plus toutes les 15 minutes, et **tout de suite** quand vous publiez, dépubliez, modifiez ou supprimez.

## Vérifier

- `npx tsx scripts/tests-unitaires.mts` : numérotation sans doublon, règles de publication, six à la une, avatar lié, nettoyage des textes, fichiers, nettoyage de `bibliotheque/` et de `medias/` (chacun ignore l'autre).
- `BASE=http://localhost:3300 node scripts/e2e-bibliotheque.mjs` (site lancé, **ffmpeg** requis) : création, envoi, fichier inaccessible tant que la fiche est privée, accessible après publication, de nouveau inaccessible après dépublication, filtres, avatars, duplication, suppression.
