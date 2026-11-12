# Prompts Higgsfield — publicité « gourde »

Réglages communs : modèle **Seedance 2.0**, mode **Fast**, **720p**, format **9:16**, audio activé.
Coût relevé : 12,5 crédits pour 5 s, soit environ 42,5 crédits pour les 4 plans.

## Plan 1 — accroche parlée (5 s)

Image de départ : `1_presentatrice.jpg` · Référence audio : `voix_accroche.mp3`

```
Handheld smartphone selfie video, authentic UGC creator style. The woman speaks directly to the camera in natural, fluent metropolitan French, warm and slightly amused. She says exactly, with the same voice and pronunciation as the reference audio: "Arrête d'acheter des gourdes qui fuient dans ton sac." On the word "gourdes" she lifts the sage-green bottle slightly toward the camera, then gives a small confident smile and stays still. Accurate lip sync, natural blinking, small head movements, subtle handheld shake. The bottle keeps its exact shape, colour and bamboo lid, no logo. Clean voice only, quiet room tone, no music, no subtitles, no on-screen text.
```

Sans référence audio, remplacer « qui fuient » par « qui coulent » : le premier essai a mal prononcé « fuient ».

## Plan 2 — zéro fuite (4 s)

Image de départ : `2_sac.jpg`

```
Top-down handheld smartphone shot. A woman's hand in a beige sweater sleeve reaches into the canvas tote bag, picks up the sage-green bottle that was lying upside down, lifts it out and tilts it lid-down for a moment above the laptop: not a single drop falls, everything stays perfectly dry. Smooth natural motion, realistic hand with five fingers, soft daylight. The bottle keeps its exact shape, colour and bamboo lid, no logo. No speech, no music, quiet room tone only, no text.
```

## Plan 3 — frais 24 h (4 s)

Image de départ : `3_glacons.jpg`

```
Close-up handheld smartphone shot. A woman's hand drops two ice cubes into the open sage-green bottle, then cold water is poured in from a glass carafe, light condensation appears on the steel rim, sunlight flickers on the desk. Slow gentle push-in. Realistic water and ice physics, realistic hand. The bottle keeps its exact shape and colour, the bamboo lid stays on the desk, no logo. No speech, no music, soft clinking of ice only, no text.
```

## Plan 4 — plan produit final (4 s)

Image de départ : `4_produit.jpg`

```
Clean product shot on a seamless cream background. The sage-green bottle stands upright and rotates very slowly a quarter turn on itself while the camera makes a slow, smooth push-in. Soft studio light glides across the brushed steel collar and bamboo lid. The bottle keeps its exact shape and colour, no logo, nothing else enters the frame. No speech, no music, no text.
```

## Après génération

Déposer les 4 fichiers MP4 dans `production/essai-01/higgsfield/` (ou les envoyer dans la conversation). Montage, voix off unique, musique, sous-titres et contrôle qualité sont faits ensuite avec `production/pipeline/build_ad.py`.
