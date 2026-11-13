# Publicité de Studio Accroche — concept, storyboard, script, prompts

Préparé le 13 novembre 2026. Aucune génération lancée, rien de publié.

## 1. L'idée : « Trois secondes »

La publicité applique à elle-même la promesse du studio. Elle s'ouvre sur un pouce qui fait défiler des photos de produits toutes semblables, et qui s'arrête net sur l'une de nos vidéos. Tout le film tient ensuite dans le temps qu'il annonce à l'écran : un compteur discret, en haut, égrène les secondes.

- Format principal : vertical 9:16, 22 secondes.
- Déclinaisons sans coût : version 15 s (plans 1, 2, 5, 6, 7), version carrée 1:1, boucle muette de 6 s pour l'en-tête du site.
- Identité : celle du site. Fond noir chaud `#0b0a09`, texte `#f3efe8`, accent orange `#ff5a2b`, titres en Instrument Serif avec un mot en italique orange, grain léger, ouverture en rideau.
- Mention « Images générées par IA » présente à l'écran pendant tout le film.

## 2. À quoi servira ce film (à lire avant de valider le budget)

Nous n'avons ni audience ni budget de diffusion. Ce film ne trouvera donc pas de clients tout seul. Ses usages réels :

1. Lien joint aux messages personnalisés envoyés aux prospects.
2. Vidéo de présentation des fiches ComeUp et Fiverr.
3. Publication épinglée du compte de démonstration.
4. Remplacement possible du film d'accueil du site.

Conséquence : inutile de viser une superproduction. Un film net de 22 secondes, produit pour quelques dizaines de crédits, remplit ces quatre usages.

## 3. Ce que nous avons déjà, et ce qui manque

| Élément | Source | Coût |
|---|---|---|
| Présentatrice qui dit l'accroche « gourde » | `site/public/media/plan-A.mp4` | 0 |
| Gourde sortie du sac, glaçons, plan produit | `plan-B`, `plan-C`, `plan-D` | 0 |
| Triptyque d'accueil, lecteur à chapitres, cartes de formules | Capture d'écran animée du site, faite en local | 0 |
| Titres animés, compteur, transitions, grain | Montage local (FFmpeg) | 0 |
| Voix off unique | Voix déjà recréée en local, ou la voix de ton choix | 0 |
| Musique | Composition locale existante, à remplacer si tu as mieux | 0 |
| **Pouce qui fait défiler un téléphone** | À générer | payant |
| **Créatrice de marque débordée** | À générer | payant |
| **Deux autres « publicités » sur d'autres produits** | À générer | payant |

Le manque principal est le troisième : avec un seul produit, « des exemples de publicités » se réduit à une gourde vue quatre fois. Deux produits fictifs supplémentaires (une bougie, un savon solide) suffisent à montrer une gamme. Ils serviront aussi de démonstrations sur le site.

## 4. Storyboard

| # | Temps | Image | Texte à l'écran | Voix off | Source |
|---|---|---|---|---|---|
| 1 | 0,0–2,5 | Plan serré sur une main : le pouce fait défiler un téléphone, vite, sans s'arrêter. Lumière du soir, écran flou. | « Vos clients font défiler. » | — (son : glissements, musique étouffée) | G1 |
| 2 | 2,5–4,5 | Coupe sèche plein écran sur la présentatrice gourde, son direct. Le compteur démarre : 0:01, 0:02, 0:03. | « Sauf ici. » | Présentatrice : « Arrête d'acheter des gourdes qui fuient… » (coupée net) | Existant (plan A) |
| 3 | 4,5–8,0 | Créatrice de marque à son bureau, entourée de colis, anneau lumineux, téléphone sur trépied, elle recommence une prise. | « Une pub s'use vite. » puis « Il en faut d'autres. Tout le temps. » | « Une publicité s'use vite. Il en faut de nouvelles, tout le temps. » | G2 |
| 4 | 8,0–9,0 | Écran noir, le nom apparaît lettre par lettre, rideau qui s'ouvre. | « Studio *Accroche* » | « Studio Accroche. » | Montage |
| 5 | 9,0–14,0 | Triptyque qui change toutes les 0,8 s : gourde, bougie, savon, face caméra et gros plans. Léger zoom continu, musique pleine. | « Nous écrivons l'accroche. » puis « Nous produisons la vidéo. » | « Nous écrivons vos accroches et nous produisons vos vidéos. Sans tournage, sans colis. » | Existant + G3, G4, G5, G6 |
| 6 | 14,0–18,0 | Trois téléphones côte à côte, même produit, trois débuts différents surlignés A, B, C. Celui du milieu s'agrandit. | « Un lien. Trois photos. 48 h. » | « Un lien, trois photos, quarante-huit heures. » | Capture du site + montage |
| 7 | 18,0–22,0 | Fond noir, prix qui monte en grand, puis adresse du site et bouton. Dernière image fixe 1 s. | « Dès 25 € » puis « [adresse du site] — Commander » | « À partir de vingt-cinq euros. » | Montage |

Transitions : coupes sèches calées sur la musique pour les plans 1 à 3, rideau pour le plan 4, fondu enchaîné très court (4 images) dans le triptyque, glissement vertical entre 6 et 7.

Son : la musique est étouffée (filtre passe-bas) pendant le plan 1 et s'ouvre d'un coup à la coupe du plan 2. C'est l'effet le plus efficace du film et il ne coûte rien.

## 5. Script voix off

54 mots, environ 19 secondes de parole, une seule voix.

> *(plan 2, son direct de la présentatrice)* Arrête d'acheter des gourdes qui fuient…
>
> Une publicité s'use vite. Il en faut de nouvelles, tout le temps.
>
> Studio Accroche.
>
> Nous écrivons vos accroches et nous produisons vos vidéos. Sans tournage, sans colis.
>
> Un lien, trois photos, quarante-huit heures.
>
> À partir de vingt-cinq euros.

Ce que le script ne dit pas, volontairement : aucun chiffre de performance, aucun « nos clients », aucune comparaison de prix avec des créateurs. Nous n'avons encore ni client ni mesure.

## 6. Prompts de génération

Réglages communs : format 9:16, 720p au minimum, pas de texte ni de logo dans l'image, pas de musique générée. Pour les plans parlés, fournir l'image de départ et une référence audio de la voix choisie.

### G1 — Le pouce (3 s, muet)

```
Extreme close-up, vertical, handheld. A hand holds a smartphone in a dim living room at dusk; the thumb swipes up quickly again and again, scrolling a feed. The screen is bright but out of focus and overexposed, nothing on it is readable, no logos, no interface details. Cool light from the screen on the thumb, warm blurred lamp in the background, shallow depth of field, cinematic film grain. Fast, bored, repetitive motion. No text, no speech, no music.
```

### G2 — La créatrice débordée (4 s, muet)

```
Vertical handheld shot, natural light, small home office. A woman in her thirties, casual clothes, stands at a desk covered with plain cardboard boxes and unbranded products, a ring light and a phone on a tripod in front of her. She looks at the phone, sighs, resets a product on the desk and starts the take again, tired but determined. Realistic documentary feel, slight camera movement. No readable text on boxes, no logos, no speech, no music, room tone only.
```

### G3 — Publicité « bougie », plan parlé (5 s)

Image de départ à générer d'abord :

```
Vertical smartphone selfie-style photo. A man around 30, short dark hair, grey crewneck, sits on a sofa in a cosy living room in the evening, warm lamp light. He holds a lit candle in a plain amber glass jar with a kraft-coloured blank label at chest height, clearly visible, no text, no logo. He looks straight at the camera, slightly amused, lips parted as if about to speak. Realistic skin, natural hands, authentic UGC look.
```

Clip :

```
Handheld selfie video, authentic UGC creator style. The man speaks directly to the camera in natural, fluent metropolitan French, relaxed and slightly teasing. He says exactly: "Si ta bougie ne sent plus rien au bout d'une heure, change de bougie." On "change de bougie" he lifts the amber candle jar toward the camera and smiles. Accurate lip sync, natural blinking, the flame flickers gently. The jar keeps its exact shape and blank label. Clean voice only, quiet room tone, no music, no subtitles, no on-screen text.
```

### G4 — Bougie, gros plan (3 s, muet)

```
Vertical macro shot. A match lights the wick of a candle in a plain amber glass jar with a blank kraft label; the flame catches, the wax surface glistens, a thin curl of smoke drifts up. Dark warm background, shallow depth of field, slow push-in. Same jar as the reference image, no text, no logo. No speech, no music.
```

### G5 — Publicité « savon solide », plan parlé (5 s)

Image de départ à générer d'abord :

```
Vertical smartphone selfie-style photo. A woman around 35, hair tied back, white t-shirt, stands in a bright bathroom with white tiles and a plant. She holds a plain cream-coloured solid soap bar on a small wooden dish in her open palm, clearly visible, no text, no logo, no packaging. She looks straight at the camera, friendly and direct. Natural daylight, realistic skin, natural hands, authentic UGC look.
```

Clip :

```
Handheld selfie video, authentic UGC creator style. The woman speaks directly to the camera in natural, fluent metropolitan French, bright and matter-of-fact. She says exactly: "Un seul savon, et plus un flacon en plastique dans ta douche." On "un seul savon" she raises the soap bar on its wooden dish toward the camera. Accurate lip sync, natural blinking, small head movements. The soap keeps its exact shape and colour. Clean voice only, quiet room tone, no music, no subtitles, no on-screen text.
```

### G6 — Savon, gros plan (3 s, muet)

```
Vertical close-up. Wet hands rub a plain cream-coloured solid soap bar under a thin stream of water; a dense white lather forms and slides between the fingers. Bright bathroom light, white tiles blurred behind, slow motion feel. Same soap as the reference image, no packaging, no text, no logo. Water sound only, no speech, no music.
```

Règle de cohérence, tirée de l'essai de la gourde : fournir la même image de référence du produit à chaque plan d'un même produit. C'est ce qui a manqué au bouchon de la gourde.

## 7. Budget en crédits Higgsfield

Tarifs relevés le 12/11 sur ton compte, par simple devis :
- Seedance 2.0, mode rapide, 720p : 12,5 crédits pour 5 s, soit 2,5 crédits par seconde.
- Seedance 2.0, mode standard, 1080p : 60 crédits pour 5 s, soit 12 crédits par seconde.

Total à générer : 6 clips, 23 secondes, plus 2 images de départ.

| Option | Calcul | Total estimé |
|---|---|---|
| A. 720p, une prise par plan | 23 s × 2,5 | ~58 crédits |
| B. 720p, une reprise par plan | 46 s × 2,5 | ~115 crédits |
| C. 1080p, une prise par plan | 23 s × 12 | ~276 crédits |

Non chiffré : les 2 images de départ (une image t'avait coûté 0,25 crédit en octobre, à revérifier), et l'accès aux modes selon ton offre.

Version à 0 crédit, faisable aujourd'hui : même film sans les plans G1 à G6. Le plan 1 devient un défilement de cartes produit dessiné au montage, le plan 3 devient du texte animé seul, et le triptyque ne montre que la gourde. Elle est correcte, mais elle ne montre qu'un produit.

Recommandation : option A, en commençant par G3 et G5 (les deux plans parlés, les plus risqués). Si l'un des deux est raté, on s'arrête avant de dépenser le reste.

## 8. Ce que je fais au montage, sans frais

- Capture animée du site (triptyque, lecteur, formules).
- Titres, compteur, rideau, transitions, grain, mention IA.
- Voix off unique et contrôle de la prononciation par transcription.
- Mixage : musique étouffée puis ouverte, niveau final −15 LUFS.
- Exports : 9:16 en 22 s et 15 s, 1:1, boucle muette de 6 s.

## 9. À valider avant toute production

1. Le concept « Trois secondes » et le script.
2. Les deux produits fictifs : bougie et savon solide.
3. Le budget : option A, B, C, ou la version à 0 crédit.
4. La voix : celle recréée en local, ou une autre.
5. L'adresse à afficher au dernier plan. Aucun nom de domaine n'est réservé et le site n'est pas en ligne : sans adresse, le plan final ne peut pas être terminé.
