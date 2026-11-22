# Produire une commande avec Higgsfield — procédure du studio

À lire avant la première commande. Une page, des chiffres, aucune promesse d'automatisation.

## 0. Ce qui est automatique, ce qui ne l'est pas

| Étape | Qui |
|---|---|
| Paiement, brief du client, dépôt de ses photos, notification sur votre téléphone et par e-mail | **Le site** |
| Fiche de production (brief remis en forme) | **Le site** (page de la commande, « Fiche de production ») |
| Envoi du script au client, e-mail de livraison, retouches, clôture, facture | **Le site**, sur un clic de votre part |
| **Écrire le script** | **Vous** (ou Claude, qui propose, vous relisez) |
| **Générer les vidéos dans Higgsfield** | **Vous**, sur higgsfield.ai, ou Claude avec le connecteur Higgsfield **après votre accord sur le devis de chaque génération** |
| **Montage, sous-titres, voix unique, export 1080 × 1920** | **Vous** (outil du dépôt `production/pipeline/build_ad.py`, ou CapCut/Premiere), ou Claude en session de développement |
| **Écoute et contrôle qualité** | **Vous, obligatoirement.** Claude ne peut pas écouter l'audio. |
| **Dépôt des MP4 sur la commande** | **Vous**, dans l'administration (Claude n'a pas votre mot de passe) |

Le site n'appelle jamais Higgsfield. Aucune génération n'est déclenchée par une commande. Vous gardez la main sur chaque dépense.

## 1. Avant la première commande réelle

1. **Abonnement Higgsfield** : choisissez-le vous-même sur higgsfield.ai (rien n'est souscrit à votre place). Au moment de l'écriture, le compte relié à Claude est en offre gratuite avec **0 crédit** : aucune génération n'y est possible.
   - Le modèle Seedance 2.0 en mode **standard** (1080p) exige un abonnement Plus ou supérieur ; le mode **fast** (480p/720p) est ouvert dès les abonnements d'entrée. Vérifiez sur la page des tarifs avant de payer.
   - **Droits d'usage commercial** : lisez les conditions de votre abonnement. Les clients reçoivent des droits d'exploitation publicitaire : vous devez avoir ceux de l'outil.
2. **Calculez le prix de votre crédit** : prix mensuel ÷ crédits inclus. Il décide si l'Essai à 35 € est rentable (§ 2).
3. **Faites une commande à blanc** : une vidéo complète avec un faux produit, de la génération à l'export, chronomètre en main. Les trois premières vraies commandes prendront 2 à 3 heures chacune.
4. Installez FFmpeg si vous utilisez `build_ad.py` (`production/essai-01/RAPPORT.md` explique le montage).

## 2. Combien ça coûte (devis Higgsfield du jour, 9:16, 15 secondes, avec son)

| Modèle et réglage | Crédits pour une vidéo de 15 s |
|---|---|
| Seedance 2.0, mode **fast**, 720p *(testé par le fondateur, voir `production/essai-01/higgsfield/PROMPTS.md`)* | **37,5** |
| Seedance 2.0, mode standard, 1080p | 180 |
| Marketing Studio (avatar + produit, format publicitaire), 720p | 75 |

Une génération n'est jamais réussie du premier coup à coup sûr : comptez **deux à trois essais** pour l'accroche. Pour savoir le prix exact avant toute dépense, Claude peut demander un devis (aucun crédit débité).

| Formule | Prix | Vidéos | Crédits (1 essai) | Crédits (2 essais) | Crédit maximal pour garder 80 % de marge sur la génération |
|---|---|---|---|---|---|
| Essai | 35 € | 1 | ≈ 38 | ≈ 112 (3 essais) | 0,062 € |
| Pack Test | 89 € | 3 | ≈ 113 | ≈ 225 | 0,079 € |
| Pack Campagne | 169 € | 6 | ≈ 225 | ≈ 450 | 0,075 € |

**Lecture :** si votre crédit coûte plus de ≈ 6 centimes, l'Essai devient peu rentable dès le troisième essai. Ajoutez les frais Stripe (environ 1,5 % + 0,25 € pour une carte européenne standard : 0,78 € sur 35 €, à vérifier sur stripe.com) et les cotisations de votre statut.

**Votre temps compte aussi** : un Essai en 1 h, c'est 35 € de chiffre d'affaires pour 1 h : pour atteindre 25 €/h, il doit tenir **en moins de 47 minutes** (35 minutes abonnement compris), brief, script et livraison inclus (`commercial/GRILLES-ET-PLATEFORMES.md`). L'Essai est un produit d'appel (il mène au Pack Test). Le Pack Test (89 €) doit tenir en moins de 1 h 55 ; le Pack Campagne (169 €) en moins de 3 h 34.

Relevez à chaque commande le coût réel et le temps passé (§ 8) : après dix commandes, vous saurez si les prix tiennent.

## 3. Formats de livraison (non négociables)

| | |
|---|---|
| Fichier | **MP4**, H.264 + AAC |
| Dimensions | **1080 × 1920** (9:16). Pack Campagne : aussi un export **1080 × 1080** (1:1) |
| Cadence | 30 images/s |
| Durée | **15 secondes maximum par vidéo**, toutes formules (une durée supérieure n'est pas proposée pour le moment) |
| Poids | **50 Mo maximum par fichier** (limite du stockage) ; viser 8 à 15 Mo |
| Son | une seule voix du début à la fin, niveau ≈ −15 LUFS, musique discrète sous la voix |
| Sous-titres | français, animés, incrustés, lisibles sans le son, hors du produit |
| Mention | « Généré par IA » visible en permanence |
| Nom du fichier | `SA-AAMMJJ-XXXXX_marque_angle-A_v1.mp4` (numéro de commande, marque, angle, version) |

La source Higgsfield sort en 720p (716 × 1286 constaté) : l'agrandissement à 1080 × 1920 est net sur téléphone, mou en plein écran. C'est un défaut connu. Pour le réduire : mode standard 1080p (180 crédits, voir § 2) ou l'agrandissement d'une vidéo par Higgsfield (coût à chiffrer par un devis avant usage).

## 4. Le brief : ce que le client donne, ce qu'il faut en faire

Le formulaire du site demande : marque, produit, lien (facultatif), client type, promesse et arguments, ton, ce qu'il ne faut pas dire, complément, **jusqu'à six photos**. Tout est regroupé dans la **Fiche de production** de la commande (bouton « Copier la fiche »).

**Avant d'accepter la commande, vérifiez (5 minutes) :**

- [ ] Pas de faux témoignage demandé (« j'ai testé 3 semaines… »).
- [ ] Pas d'allégation santé, minceur, gain d'argent.
- [ ] Produit reproductible : forme simple, **pas de texte fin** ni de logo détaillé à reproduire fidèlement.
- [ ] Photos nettes, produit visible sous deux angles.
- [ ] Le client a le droit d'utiliser les photos et la marque.

Si une case n'est pas cochée : écrivez au client (modèle dans `MODELES-MESSAGES.md`). S'il ne peut pas être livré fidèlement : annulation et **remboursement intégral** depuis le tableau de bord Stripe (les conditions de vente le prévoient avant le début du travail).

## 5. Le script (15 minutes) : avant toute génération

1. Écrivez le script avec la structure de `PROCESS.md` (accroche 0–3 s, produit 3–8 s, bénéfice 8–12 s, appel 12–15 s ; 2,5 mots/s ; **37 mots maximum pour 15 s**).
2. Pack Test : trois accroches, trois angles : **A problème · B résultat · C curiosité**. Formulez le « résultat » comme une présentation (« Avec ça, tu… »), jamais comme un avis fictif.
3. Dans la commande, panneau « Prochaine étape » : collez le script, **Envoyer le script au client**. Il reçoit un e-mail et répond « OK » (à la boîte du studio).
4. Quand il répond OK : cochez « Le client a validé le script » puis **Démarrer la production**. Le client est prévenu.

Les conditions de vente promettent qu'**aucune vidéo n'est produite avant l'accord du client** sur le script, et que le délai est suspendu pendant qu'il répond. Une modification de texte ne coûte rien ; une régénération coûte des crédits.

## 6. Produire dans Higgsfield (la méthode testée)

Modèle éprouvé : **Seedance 2.0, mode fast, 720p, 9:16, audio activé**. Les prompts exacts de l'essai « gourde » sont dans `production/essai-01/higgsfield/PROMPTS.md` : copiez-les et remplacez le produit.

1. **Image de départ** (présentatrice qui montre le produit) : Higgsfield génération d'image, avec une photo du client en référence. Une seule image de référence du produit, réutilisée pour tous les plans (c'est ce qui évite que le bouchon change entre les plans).
2. **Voix** : une seule voix pour toute la vidéo. Enregistrez ou générez la phrase d'accroche, passez-la en **référence audio** du clip pour que les lèvres suivent. Contrôlez la prononciation à l'oreille (un « fuient » a été entendu « fuchent »).
3. **Clip** : un clip de 15 s en plusieurs plans (accroche parlée, preuve, bénéfice, produit) plutôt que quatre générations séparées : décor et lumière restent cohérents. Prompt type :
   > Handheld smartphone selfie video, authentic UGC creator style. The [woman/man] speaks directly to the camera in natural, fluent French: « [ACCROCHE] ». [Geste]. Accurate lip sync. The [produit] keeps its exact shape, colour and details, no logo. Clean voice only, no music, no subtitles, no on-screen text.
4. **Devis avant chaque génération** : notez le coût. Au-dessus de **2 essais ratés** sur le même plan, simplifiez le plan plutôt que de relancer.
5. **Plafond** : 8 € de génération par vidéo livrée (réévaluez avec le vrai prix du crédit, § 2).
6. Pack Test : ne régénérez que le **plan d'accroche** pour les angles B et C et réutilisez le corps de la vidéo (c'est ce qui rend le pack rentable).
7. Pack Campagne : « 2 présentateurs » : changez d'image de départ, gardez le script et le produit.

Autres modèles proposés par Higgsfield (Marketing Studio, Intone pour une tête parlante à partir d'un enregistrement vocal, Kling 3.0) : **non testés pour le studio**. Essayez-les sur une commande à blanc, jamais sur la première commande d'un client.

## 7. Montage, contrôle qualité, livraison

**Montage** (0 € avec `production/pipeline/build_ad.py` + FFmpeg, ou CapCut) : coupes, voix unique, musique libre de droits (**vérifier la licence**), sous-titres animés hors du produit, mention « Généré par IA », export 1080 × 1920.

**Contrôle qualité : un seul point raté = on ne livre pas.**

- [ ] Mains et doigts corrects sur tous les plans
- [ ] Lèvres synchronisées, aucun mot avalé, **prononciation écoutée**
- [ ] Une seule voix du début à la fin
- [ ] Produit identique sur tous les plans (couleur, forme, bouchon, étiquette), logo non déformé
- [ ] Aucun texte parasite ni logo de tiers apparu dans l'image
- [ ] Sous-titres sans faute, lisibles sur téléphone, hors du produit
- [ ] Aucune promesse absente du brief, aucune formulation de faux témoignage
- [ ] Mention « Généré par IA » présente
- [ ] Durée conforme à la formule, MP4 1080 × 1920, moins de 50 Mo
- [ ] Lu sur un vrai téléphone, **avec le son**

**Livraison** dans la commande :

1. Colonne de droite « Livrables » → **Ajouter** les MP4 (et le script en PDF ou texte si vous voulez).
2. **Envoyer la livraison au client** : il reçoit un lien privé par fichier.
3. Il valide ou demande un **tour de retouches**. Un tour = **une seule demande qui regroupe toutes ses remarques sur l'ensemble des vidéos** (1 tour pour l'Essai, 2 pour les packs). Vous êtes prévenu, vous corrigez, « Retirer » l'ancien fichier, ajoutez le nouveau, **Envoyer la version corrigée**.
   - Si la demande change le produit, le brief, le script validé, le présentateur, l'angle ou la durée, **ce n'est pas une retouche** : bouton **« Refuser : hors périmètre »** (explication au client, tour non décompté), puis proposez une nouvelle commande (modèle de message 7).
4. Sans réponse du client : **Clôturer**. La facture est émise à la validation.

Les fichiers sont supprimés 90 jours après la livraison. Rappel au client (déjà dans l'e-mail de livraison) : activer la mention « contenu généré par IA » sur la plateforme de diffusion.

## 8. Suivi à chaque commande

Notez dans `PROGRESS.md` (ou une feuille) : numéro, formule, prix, **crédits réellement consommés**, **temps passé**, nombre d'essais, retouche demandée oui/non. Après dix commandes, recalculez la rentabilité du § 2 avec vos vrais chiffres.

## 9. Ce que Claude peut faire pour vous, honnêtement

Dans une session avec le connecteur Higgsfield branché sur **votre** compte :

- ✔ Estimer le coût d'une génération (aucune dépense).
- ✔ Écrire le script et les prompts à partir de la fiche de production.
- ✔ Lancer une génération **seulement après votre accord sur le devis**, et lire le résultat.
- ✔ Monter la vidéo avec FFmpeg dans la session, si les fichiers y sont.
- ✘ Écouter le son : l'écoute est la vôtre.
- ✘ Déposer les fichiers dans l'administration : il n'a pas votre mot de passe et ne doit jamais l'avoir.
- ✘ Garantir la qualité : un contrôle humain reste obligatoire avant chaque livraison.
