# Jalon 0 — Étude fournisseurs (2026-10-29)

## Limite de cette étude (à lire d'abord)

Le conteneur où j'ai travaillé n'a **pas accès** aux sites officiels (fal.ai, Runway, Google AI, ElevenLabs, OpenAI : DNS bloqué). Je n'ai pu lire que des **extraits de pages officielles renvoyés par un moteur de recherche** (Runway docs, Kling dev pricing, MiniMax docs, pages modèles fal.ai, page modèle OpenAI), plus PyPI (lu en direct).

Conséquence : **aucun prix ci-dessous n'est confirmé en direct**. Plusieurs sources se contredisent, je le signale. Avant tout paiement, ouvre la page officielle de chaque ligne retenue (colonne « Source »). Les prix sont aussi dans `config/pricing.json` avec `"verified": false`.

Légende « API officielle » : *oui* = l'éditeur du modèle vend l'API ; *revendeur* = accessible via fal.ai / Replicate (API officielle de l'hébergeur, pas de l'éditeur).

## Images (image de référence + image-to-image par scène)

| Fournisseur / modèle | API officielle | Prix unitaire (USD) | Limites / remarques | Accès |
|---|---|---|---|---|
| FLUX.1 Kontext [pro] via fal.ai | revendeur (éditeur : Black Forest Labs, qui affiche aussi 0,04 $) | **≈ 0,04 / image** (max : 0,08 chez BFL ; 0,042–0,10 selon sources sur fal) | Édition à partir d'une image : fait exactement ce qu'il faut pour la cohérence. | Immédiat (carte + prépaiement) |
| OpenAI gpt-image-1 (endpoint *edit*) | oui | 1024² : 0,011 / 0,042 / 0,167 (low/med/high) ; 1024×1536 : 0,016 / 0,063 / 0,25 ; + tokens d'image en entrée (~10 $/M) | Une vérification d'organisation OpenAI peut être exigée *(de mémoire, non vérifié ici)*. Rendu 3D « Pixar » correct, texte dans l'image bon. | Immédiat si compte vérifié |
| Replicate (Kontext pro, SDXL…) | revendeur | Kontext pro ≈ 0,04 (agrégateurs, non confirmé) | Même modèle que fal ; pas de raison d'avoir deux revendeurs en V1. | Immédiat |
| Kling Image 3.0 (API Kling) | oui | 8 unités/image × 0,0035 $ ≈ 0,028 | Voir pack minimum Kling ci-dessous : inutilisable à petit budget. | Pack ≥ 350 $ |
| Stable Diffusion / SDXL local | — | 0 $ | Ton GPU est inconnu. La cohérence de personnage demande IP-Adapter ou LoRA : plusieurs jours de mise au point. **Déconseillé en V1.** | — |

## Vidéo image-to-video

| Fournisseur / modèle | API officielle | Prix unitaire (USD) | Limites / remarques | Accès |
|---|---|---|---|---|
| Kling 2.5 Turbo Pro via fal.ai | revendeur | **0,35 pour 5 s, puis 0,07 /s** (les sources fal se contredisent entre « 0,35 les 5 premières secondes » et « 0,07/s ») | Sans audio. Bon suivi de l'image de départ. | Immédiat |
| Kling 2.6 Pro via fal.ai | revendeur | 0,07 /s sans audio ; 0,14 /s avec audio | L'audio natif double le prix et impose des voix non contrôlables. | Immédiat |
| Kling 3.0 Pro via fal.ai | revendeur | 0,112 /s sans audio ; 0,168 /s avec ; ×2 si « elements » (personnages) | Plus cher, qualité probablement supérieure. Non testé. | Immédiat |
| **Kling API officielle** | oui | 2.5 Turbo : 0,042 /s (720p) ou 0,07 /s (1080p) ; 3.0 : 0,084 /s (720p) ou 0,112 /s (1080p) | **Pack prépayé minimum 700 $ (5 000 unités, validité 180 jours, sans report).** Hors budget. Statut de Kling 4.0 contradictoire entre deux pages Kling. | Achat du pack |
| Runway gen4_turbo | oui | **5 crédits/s, crédit = 0,01 $ → 0,05 /s**, minimum 10 crédits par génération ; durée 2–10 s | gen4.5 : 12 crédits/s = 0,12 /s. Recharge minimale de 10 $ citée par un guide tiers (non confirmée). | Immédiat |
| MiniMax Hailuo-02 Standard | oui | MiniMax : **0,28 pour 6 s en 768p** (0,56 pour 10 s ; 0,49 pour 6 s en 1080p) ; fal : 0,045 /s soit 0,27 pour 6 s | Durées 6 ou 10 s en 768p. | Immédiat |
| Luma Ray2 / Ray Flash 2 | oui | Facturé au mégapixel (≈ 0,0064 et 0,0022 $/Mpx selon Luma) ; estimations par clip de 0,60 à 1,05 $ selon un guide tiers | Sources trop dispersées. **Non retenu**. | — |
| Google Veo 3.1 (Gemini API) | oui | Fast avec audio : 0,10 /s en 720p, 0,12 /s en 1080p (agrégateurs) ; la page Gemini consultée n'affichait pas de section Veo | La version « Veo 3.1 Fast Preview » est annoncée **retirée le 2026-10-22** (soit avant aujourd'hui). Catalogue instable. **Non retenu V1.** | — |

## Voix française

| Fournisseur / modèle | API officielle | Prix unitaire (USD) | Limites / remarques | Accès |
|---|---|---|---|---|
| ElevenLabs Multilingual v2/v3 | oui | **≈ 0,10 / 1 000 caractères** (Flash/Turbo : ≈ 0,05). Quelques sources divergent (0,048–0,17) | Meilleure émotion. Le plan gratuit n'autorise probablement pas l'usage commercial *(non vérifié)* : prévoir un plan payant. | Immédiat |
| OpenAI gpt-4o-mini-tts | oui | ≈ 0,015 /min d'audio (0,60 $/M tokens texte + 10–12 $/M tokens audio) | Émotion pilotable par instruction textuelle. Voix pensées d'abord pour l'anglais. | Immédiat |
| Azure Neural TTS | oui | non vérifié (hors recherche) | Voix fr-FR correctes ; SSML complexe. | — |
| Edge-TTS 7.3.1 (PyPI, 13/10/2026) | **non** (point d'accès non officiel du lecteur d'Edge) | 0 | Pas de SLA, SSML personnalisé retiré → émotion limitée à vitesse/hauteur. Voix FR : Henri, Denise, Eloise, Remy, Vivienne. **OK pour le dry-run, déconseillé en production monétisée.** Injoignable depuis mon conteneur. | Aucun |
| Kokoro (local) | n/a | 0 | **Une seule** voix FR (`ff_siwis`, note B-). Pas de 2e voix distincte. | Install locale |
| Piper `fr_FR-siwis-medium` (local) | n/a | 0 | Voix unique, rendu robotique. Plan B hors-ligne. | Install locale |

## Lip-sync

Décision : **pas de lip-sync en V1.** Kling 2.6/3.0 savent générer l'audio, mais à +50 % / +100 % du prix, avec des voix non reproductibles d'un clip à l'autre ; un endpoint « Kling LipSync » séparé existe, ce que ta règle exclut. Le personnage est un fruit : narration en voix off + sous-titres + plans où la bouche n'est pas le sujet. Si la bouche animée devient indispensable, ce sera un chantier à part.

## Stack V1 retenue (mise à jour après tes réponses : fal + ElevenLabs, scénarios écrits à la main, vidéos de 65 à 75 s)

| Brique | Choix | Alternative interchangeable |
|---|---|---|
| Scénario | écrit à la main (`examples/script_*.json`), pas d'OpenAI | `--llm` (NON TESTÉ) |
| Images | **FLUX.1 Kontext [pro] sur fal.ai**, ≈ 0,04 $ | gpt-image-1 (medium, 0,063 $) |
| Vidéo | **Hailuo-02 Standard sur fal** par défaut ; **Kling 2.5 Turbo Pro sur fal** pour le comparatif | Runway gen4_turbo, seulement si tu veux le tester |
| Voix | **ElevenLabs Multilingual**, ≈ 0,10 $ pour 1 000 caractères | OpenAI TTS (≈ 0,015 $/min) |

**Pourquoi Hailuo par défaut : le prix, pas la qualité.** Kling ne génère que des clips de 5 s ou 10 s : un plan de 6 à 7 s est facturé 10 s. Hailuo propose 6 s ou 10 s, et nos plans (≤ 6,2 s de durée voulue) tiennent dans 6 s. Je n'ai **aucune preuve** que Hailuo anime mieux ou plus mal des fruits 3D : le comparatif Kling / Hailuo au Jalon 3 sur un seul plan chacun (≈ 0,6 $) tranchera.

## Coût d'une vidéo de ≈ 70 s (USD) — calculé par le code sur `script_1` (15 plans)

Calcul : `estimate_script_cost` sur les **vraies durées de plans** du dry-run. Inclus : 15 images de plans + 2 références (0,68 $), voix ElevenLabs (≈ 0,09 $). Le LLM n'est plus compté.

| Pile vidéo | Secondes facturées | Total sans relance | Avec 35 % de relances (images + vidéo) |
|---|---|---|---|
| Runway gen4_turbo (optionnel) | 68 | **4,17** | ≈ 5,6 |
| **Hailuo-02 Standard (6/10 s)** | 90 | **4,82** | ≈ 6,5 |
| Kling 2.5 Turbo Pro (5/10 s) | 90 | **7,07** | ≈ 9,5 |

**Conséquence sur ton plafond de 10 $.** Jalon 2 ≈ 0,23 $ (5 images, marge incluse) + comparatif d'un plan ≈ 0,7 $ + **une** vidéo complète. Avec Hailuo, le total reste ≈ 7,5 $ avec relances. Avec Kling, une seule vidéo complète consomme presque tout le plafond et ne laisse aucune relance. Les scénarios 2 et 3 ne pourront pas tous être rendus en vidéo dans ce budget.

Leviers d'économie : (1) plans ≤ 6 s pour rester dans la première tranche de durée ; (2) plans fixes animés par FFmpeg (gratuit) pour les moments sans action ; (3) valider les images avant de payer les clips (Jalon 2).

## Points qui contredisent ton cahier des charges

1. **« 3 clips » au Jalon 3 ne font pas 60 s.** Un clip image-to-video dure 5–10 s : 3 clips = 15–30 s. Je modélise donc *scène = plusieurs plans* (`script_1` : 3 scènes, 15 plans, ≈ 70 s), un clip par plan.
2. **Coût réel.** Le coût dépend surtout du taux de relance. Fixe un plafond par vidéo, pas seulement global.
3. **Risque produit, hors technique (à vérifier côté TikTok).** Les contenus générés par IA doivent être étiquetés comme tels, et la production en série de contenu peu original est typiquement exclue de la monétisation. Si la monétisation est l'objectif, ces deux points pèsent plus que le choix du fournisseur vidéo. TikTok exige aussi souvent plus de 60 s pour le programme de rémunération : la cible est donc passée à 65–75 s.
