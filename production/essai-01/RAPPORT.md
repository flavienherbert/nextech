# Essai n°1 — publicité « gourde » (12/11/2026)

Fichier : `gourde_v1.mp4` — 15,4 s, 1080×1920, 30 i/s, 8,3 Mo. Produit fictif sans marque.

## Structure

| Temps | Plan | Source |
|---|---|---|
| 0–3,75 s | Présentatrice IA qui dit l'accroche | Image IA + clip Seedance 2.0, 4 s en 480p, audio natif |
| 3,75–7,45 s | Gourde retournée dans un sac | Image IA + zoom, voix off |
| 7,45–10,8 s | Gourde ouverte avec glaçons | Image IA + zoom, voix off |
| 10,8–15,4 s | Plan produit, prix, appel à l'action | Image IA + zoom, voix off |

Sous-titres animés, pastilles d'argument, mention « Généré par IA » en permanence.

## Coût réel

| Poste | Crédits Alexya |
|---|---|
| Image présentatrice | 25 |
| Clip parlé 4 s, 480p | 180 |
| 3 plans produit | 75 |
| **Total** | **280** (solde : 317 → 37) |

Aucun achat effectué : uniquement des crédits déjà présents sur le compte.
Équivalent : environ 1,25 € au tarif de l'abonnement Starter (9 $ pour 1 900 crédits, source alexya.ai/pricing). Le prix des recharges sans abonnement n'a pas pu être lu (page réservée aux comptes connectés) : à vérifier avant tout achat.
Voix off (Piper, modèle local), montage (FFmpeg) et contrôle (transcription Whisper) : 0 €.
Aucun essai raté sur cette production (1 image + 1 clip du premier coup). Ce taux ne se reproduira pas à chaque fois.

Tarifs relevés : Seedance 5 s en 720p = 500 crédits (100/s) ; 4 s en 480p = 180 crédits (45/s) ; image = 25 crédits.

## Temps

- Rendu des générations : 40 s à 1 min par image, 2 min 30 pour le clip.
- Assemblage : 37 s de calcul.
- Temps total écoulé pour cet essai, écriture de l'outil d'assemblage comprise : environ 40 minutes.
- Estimation pour une commande réelle avec l'outil existant : 50 à 60 minutes pour un Essai (script 15 min, générations 15 min, réglage du montage 15 min, contrôle 10 min).

## Qualité — ce qui tient

- Présentatrice crédible, rendu « selfie » naturel, mains correctes.
- Le geste demandé (lever la gourde sur « gourdes », sourire final) est exécuté.
- Produit identique sur les quatre plans (couleur, forme, bouchon bambou).
- Plans produit de niveau photo commerciale.
- La phrase française est reconnue presque mot pour mot par la transcription automatique.

## Défauts constatés

1. **Deux voix différentes** : la voix générée avec le clip, puis une voix de synthèse locale de qualité moyenne pour la suite. C'est le défaut le plus visible pour un client.
2. **Prononciation à vérifier** : la transcription a entendu « fuchent » au lieu de « fuient ». Je ne peux pas écouter l'audio ; contrôle humain nécessaire.
3. **Plan présentatrice en 496×864**, agrandi en 1080×1920 : net sur téléphone, mou en plein écran.
4. **Aucune musique ni ambiance sonore.**
5. **Trois plans sur quatre sont des images fixes zoomées**, pas de la vidéo.
6. **Détail du produit** : le bouchon a un étrier métallique dans le clip, absent du plan produit final.
7. **Retouche** : un logo de fabricant est apparu sur l'ordinateur du plan 2 ; effacé par retouche locale, il reste une tache sombre lisible comme une ombre.
8. Sous-titres posés sur le produit dans les plans 2 à 4.

## Verdict comme client à 69 €

Pas au niveau. Visuellement proche d'une publicité vendable ; le son la disqualifie (deux voix, pas de musique). En l'état, c'est défendable comme Essai à 25 € après correction de la voix, pas comme Pack Test.

## Corrections nécessaires

| Correction | Effet | Coût estimé |
|---|---|---|
| Une seule voix sur toute la vidéo : voix off de qualité, fournie au clip comme référence audio pour la synchronisation des lèvres | Supprime le défaut n°1 et n°2 | Voix : à chiffrer ; clip inchangé |
| Clip en 720p | Supprime le défaut n°3 | +220 crédits (400 au lieu de 180) |
| Musique libre de droits + légère ambiance | Supprime le défaut n°4 | 0 € (bibliothèque gratuite, licence à vérifier) |
| Un plan produit animé de 4 s à la place d'une image fixe | Atténue le défaut n°5 | +180 à 400 crédits |
| Image de référence unique du produit réutilisée pour tous les plans | Supprime le défaut n°6 | 0 |
| Sous-titres remontés hors du produit | Supprime le défaut n°8 | 0 |

Version corrigée estimée : 700 à 900 crédits, soit environ 3,50 à 4,50 € au tarif Starter.

## Reproduire

```bash
cd production/essai-01
python3 ../pipeline/build_ad.py montage.json sortie.mp4
```

---

# Version 2 — clip Higgsfield généré par le fondateur (13/11/2026)

Fichier : `gourde_v2.mp4` — 13,7 s, 1080×1920. Source : un clip unique de 15 s en 716×1286 (`v2/source_higgsfield.mp4`), quatre plans animés.
Modèle et crédits consommés : non connus de Claude (génération faite par le fondateur sur le site).

## Ce qui a été fait au montage (0 €)

- Coupes : accroche 0–3,7 s, sac 5,25–9,35 s, glaçons 9,4–11,25 s ralenti ×1,5, plan produit 11,9–15 s.
- Texte parasite illisible apparu sur la gourde au dernier plan : effacé par recopie d'une bande saine.
- Voix off des plans 2 à 4 recréée en local à partir de la voix de l'accroche (Chatterbox, licence MIT) : ressemblance mesurée 0,85 à 0,91.
- Musique de fond originale synthétisée, mixée sous la voix. Niveau final : −15 LUFS.
- Sous-titres animés, pastille prix, appel à l'action, mention « Généré par IA ».

## Contrôles

- Transcription de la bande son finale : texte conforme au script, « fuient » correctement prononcé.
- Les quatre plans sont de la vidéo animée, plus aucune image fixe.

## Défauts restants

1. Le bouchon change entre l'accroche (sans anse) et les plans suivants (anse métallique).
2. Décor différent entre l'accroche (cuisine) et les plans 2–3 (bureau) : acceptable, mais ce n'est pas le même lieu.
3. Résolution source 720p, agrandie en 1080p.
4. « Pas une goutte » est dit alors que la gourde est déjà en train d'être ouverte.
5. Glaçons qui tombent sans main visible, puis dépassent du goulot.
6. Sous-titres en partie sur le bas de la gourde dans les plans 1 et 3.
7. Voix off et musique non écoutées par Claude : contrôle humain nécessaire.
