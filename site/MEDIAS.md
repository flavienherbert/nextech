# Remplacer les images et vidéos du site — sans toucher au code

Où : **Administration → Images et vidéos** (`/admin/medias`). Aucune compétence technique, aucun redéploiement : le changement est visible sur le site en quelques secondes.

## En trois gestes

1. Repérez l'emplacement (chaque carte dit **où** l'image apparaît et **quel format** envoyer).
2. **Choisir une image / une vidéo** : le fichier est contrôlé puis publié. Un avertissement vous prévient si le format sera recadré ; vous décidez.
3. **Voir le site** (bouton en haut) pour vérifier. Pour revenir en arrière : **Remettre l'image d'origine**.

## Les emplacements

| Groupe | Emplacements | Format conseillé |
|---|---|---|
| **Vidéo d'exemple** | Vidéo + image d'attente (facultative) | MP4 1080 × 1920, jusqu'à 15 s, ≤ 15 Mo conseillés (40 Mo max) |
| **Exemples de vidéos du studio** | Jusqu'à 6 vidéos, titre et légende facultatifs | MP4 1080 × 1920, 15 secondes maximum (la durée vendue) |
| Les quatre temps d'une publicité | 4 images verticales | 720 × 1280 |
| Visuels des formules | 1 (Essai) + 3 (Pack Accroches) + 6 (Pack Campagne) | 720 × 1280 |
| Fond du bas de page, vignette de partage | 2 images | 1200 × 800 ; 1200 × 630 |

- La section **« Exemples » n'apparaît sur le site qu'à partir de la première vidéo envoyée.**
- **Vidéo d'exemple de l'accueil (réglage `SHOW_EXAMPLE_VIDEO`).** Tant que ce réglage n'est pas `true`, la section est **entièrement masquée** (ni titre, ni texte de remplacement, ni lien dans le menu). Pour l'activer : déposez votre MP4 vertical dans `site/public/videos/exemple.mp4` (et l'image d'aperçu dans `site/public/videos/exemple-apercu.jpg`), puis ajoutez la variable `SHOW_EXAMPLE_VIDEO` = `true` dans Netlify et redéployez. Une vidéo envoyée depuis *Administration → Images et vidéos* est prioritaire sur le fichier local, mais la section ne s'affiche que si le réglage vaut `true`.
- La vidéo est lue **au clic, sans le son** (un bouton « Activer le son » apparaît). Comme elle démarre muette, **ses sous-titres doivent être incrustés dans l'image**, comme dans vos livraisons ; un fichier WebVTT facultatif peut s'y ajouter (`soustitres` dans `app/config.ts`).
- **Chemins des images d'illustration** (les quatre temps, les visuels des formules, le fond du bas de page, l'image de partage) : tous regroupés dans `site/app/config.ts` (`images`). Une seule mention discrète, « Photographies d'illustration. », figure en bas de la page d'accueil ; si vous les remplacez par des captures de vos vidéos, retirez-la (`illustrations` dans `app/page.tsx`).
- Les images d'origine sont des photographies d'illustration, étiquetées « Illustration » sur le site. Si vous les remplacez par des visuels de vos vidéos, pensez à ce que l'étiquette reste vraie.

## Formats acceptés

Images : JPG, PNG, WebP (jusqu'à 8 Mo ; 5 Mo pour la vignette de partage). Vidéos : MP4 (H.264 + AAC) ou WebM, jusqu'à 40 Mo. Pas de SVG, pas de HEIC, pas de MOV : le contenu est vérifié, pas seulement l'extension.

Les images de plus de 1,2 Mo ou plus larges que nécessaire sont **réduites automatiquement** dans le navigateur avant l'envoi (WebP, ou JPEG sur les navigateurs qui ne savent pas écrire du WebP). L'original n'est pas modifié sur votre ordinateur.

## Règles à respecter

- N'envoyez que des contenus dont vous détenez les droits (vos créations, ou des visuels sous licence).
- Une vidéo générée par IA reste présentée comme telle : la mention figure déjà sous la vidéo d'exemple et sur le site.
- Ne montrez pas un vrai client sans son accord écrit. N'inventez pas de résultat ni d'avis.

## Ce qui se passe derrière (pour mémoire)

- Les fichiers sont rangés dans le stockage (dossier `medias/`), séparés des fichiers privés des clients. Le registre « emplacement → fichier » est un petit document de la base.
- Chaque fichier a une adresse unique (`/m/<emplacement>?v=<version>`) qui ne change jamais : navigateur et réseau de diffusion le gardent un an. Remplacer un média crée une nouvelle adresse ; l'ancien fichier est supprimé automatiquement au bout de 24 heures.
- Les vidéos sont lues par plages (obligatoire sur iPhone) : lien signé du stockage objet en ligne, lecture directe par le serveur en local.
- Pour ajouter un emplacement : une ligne dans `site/lib/emplacements.ts`, puis l'afficher dans la page voulue.
- Test automatique : `node scripts/e2e-medias.mjs` (voir `TESTS.md`).
