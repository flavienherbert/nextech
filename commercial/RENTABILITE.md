# Étude de rentabilité — Seedance 2.0 via Higgsfield (21 novembre 2026)

> **Mise à jour du 24 novembre 2026 : nouveaux prix du site (49 / 139 / 259 €) et 1 tour de retouches pour chaque formule.** Les chiffres de ce document (prix, bénéfices, temps maximal pour 25 €/h, prix ComeUp et Fiverr) ont été calculés sur l'ancienne base 35 / 89 / 169 € et 1 / 2 / 2 tours : **ils ne sont pas recalculés ici.**

> **Mise à jour du 22 novembre 2026 : les décisions commerciales sont prises** (site direct 35 / 89 / 169 €, tours de retouches 1 / 2 / 2, 15 secondes maximum, vente aussi sur ComeUp et Fiverr). Les grilles Économique et Premium ci-dessous restent des repères ; la grille Recommandée est devenue la grille décidée. Prix des plateformes, commissions vérifiées et temps maximal pour 25 €/h : **`commercial/GRILLES-ET-PLATEFORMES.md`**.

Le site a été mis à jour le 22 novembre 2026 (35 / 89 / 169 €, tours 1 / 2 / 2, 15 secondes maximum). Les sections 4 et 5 décrivent l'**ancienne** grille (25 / 69 / 129 €, retouches 1 / 3 / 12) : elles servent de point de comparaison. Aucune génération lancée, aucun abonnement souscrit, aucun crédit dépensé (les coûts viennent de devis Higgsfield en lecture seule).

Modèle reproductible : `python3 commercial/modele-rentabilite.py` (aucune dépendance ; chaque hypothèse est une valeur modifiable en tête du fichier).

## En bref

1. **Aux prix actuels, avec des hypothèses centrales, le bénéfice net est faible : 12 € (Essai), 33 € (Pack Accroches), 59 € (Pack Campagne) par commande**, avant abonnement Higgsfield et avant impôt sur le revenu, pour 1,6 h / 3,6 h / 6,1 h de travail. Soit **7 à 10 € de l'heure**. Dans le scénario optimiste (rodé, peu d'essais ratés) : 18 à 28 €/h. Dans le scénario prudent : 1,5 à 3 €/h.
2. **Ce qui pèse le plus, c'est votre temps, pas les crédits ni Stripe.** Pour le Pack Accroches : le temps de travail fait varier le résultat de 15 à 6 €/h ; les essais ratés de 11 à 7 €/h ; les cotisations (21,2 % ou 25,6 %), la TVA sur l'abonnement et Stripe de moins de 1 €/h chacun.
3. **Les retouches sont aujourd'hui trop larges** : le site accepte 1 / 3 / **12** tours de retouches (Essai / Test / Campagne). Un client peut en faire jusqu'à 12 sur un Pack Campagne : 24 heures de travail gratuit dans le pire cas. À plafonner en « tours » : 1 / 2 / 2.
4. **Les formules « 15 à 20 s » ne sont pas faisables avec un seul clip Seedance 2.0** (maximum 15 s). À 20 s, il faut un second clip ou Seedance 2.5 (140 crédits, soit 3,7 fois le prix d'un clip de 15 s). À ramener à « jusqu'à 15 s ».
5. **L'abonnement Higgsfield est un coût fixe** (Plus ≈ 49 $/mois, soit ≈ 54 € TTC si la TVA est facturée, hypothèse) et **les crédits non utilisés sont perdus** à chaque renouvellement. À 4 commandes par mois, il ampute le bénéfice de moitié.
6. **Recommandation de départ : 35 / 89 / 169 €, retouches en tours (1 / 2 / 2), durée jusqu'à 15 s**, vente directe. Détail section 9.

## 1. Ce qui est vérifié, ce qui est sourcé, ce qui est supposé

| Donnée | Valeur | Statut |
|---|---|---|
| Crédits Higgsfield par clip de 15 s, 9:16, avec son (Seedance 2.0) | fast 720p : **37,5** · standard 720p : 67,5 · standard 1080p : 180 | **Vérifié** le 21/11 (devis en lecture seule sur le compte du fondateur) |
| Image de départ | 0,75 crédit | **Vérifié** (devis) |
| Voix off / audio | 0,75 à 1,8 crédit par ligne | **Vérifié** (historique de transactions du compte) |
| Frais Stripe, carte EEE standard | 1,5 % + 0,25 € | **Vérifié** ([stripe.com/fr/pricing](https://stripe.com/fr/pricing), lu le 21/11) |
| Frais Stripe, carte EEE premium / britannique / internationale | 2,8 % / 2,5 % / 3,15 % + 0,25 € | **Vérifié** (même page) |
| Cotisations micro-entrepreneur, prestations de services BIC | 21,2 % du chiffre d'affaires | **Vérifié** ([service-public.gouv.fr F36232](https://entreprendre.service-public.gouv.fr/vosdroits/F36232), « vérifié le 01/01/2026 ») |
| Cotisations, activité libérale non réglementée (BNC) | 25,6 % | **Vérifié** (même page) |
| Franchise de TVA, services, 2026 | 37 500 € (seuil de base), 41 250 € (majoré) | **Vérifié** ([F21746](https://entreprendre.service-public.gouv.fr/vosdroits/F21746)) |
| Quelle catégorie (BIC ou BNC) pour la production de vidéos publicitaires | — | **Non établi** : aucune des pages officielles lues ne le dit. À faire confirmer (guichet unique, URSSAF) |
| Prix des abonnements Higgsfield | Starter 15 $ / 200 crédits · Plus 49 $ / 1 000 · Ultra 129 $ / 3 000 | **Source tierce** : [blog Higgsfield](https://higgsfield.ai/blog/higgsfield-pricing-explained), « prices verified October 2026 ». La page de tarifs officielle est vide sans JavaScript. [Krea](https://www.krea.ai/blog/higgsfield-pricing-explained-2026-unlimited-credits-and-real-monthly-costs) et HeyGen donnent Starter 19 $ et Plus 59 $. **À revérifier dans l'application avant de payer** |
| Prix des recharges de crédits | — | **Non trouvé** (elles ne s'achètent qu'avec un abonnement actif, et expirent 90 jours après) |
| TVA ajoutée à l'abonnement | 20 % | **Hypothèse** prudente (Krea : « prices exclude VAT… added at checkout ») : en franchise de TVA, elle n'est pas récupérable |
| Taux de change | 1 $ = 0,92 € | **Hypothèse** |
| Générations ratées (essais par clip utilisable) | 1,5 / 2,5 / 4 | **Hypothèse**. Aucune mesure : l'essai du 12/11 a réussi du premier coup, ce que le rapport lui-même dit ne pas être représentatif |
| Temps de travail | voir section 3 | **Hypothèse**. Seule donnée : l'estimation de 50 à 60 minutes pour un Essai (`production/essai-01/RAPPORT.md`, essai réussi du premier coup, outil déjà écrit) |
| Taux de retouches | voir section 3 | **Hypothèse** |
| Mix de cartes (standard / premium) | 1,5 % / 2,1 % / 2,8 % en moyenne | **Hypothèse** : des gérants de boutique paient souvent avec des cartes professionnelles |

## 2. Coûts unitaires

### 2.1 Crédits Higgsfield par vidéo (devis, 9:16, avec son)

| Clip | Crédits |
|---|---|
| Seedance 2.0 fast 480p, 15 s | 15 |
| Seedance 2.0 fast 720p, 5 s / 10 s / **15 s** | 12,5 / 25 / **37,5** (2,5 crédits par seconde) |
| Seedance 2.0 standard 720p, 15 s | 67,5 (4,5 par seconde) |
| Seedance 2.0 standard 1080p, 15 s | 180 (12 par seconde) |
| Seedance 2.5, 720p, 20 s | 140 (7 par seconde) |

Un clip Seedance 2.0 dure **15 secondes au maximum**. Le mode standard exige un abonnement Plus ou supérieur ; le mode fast est ouvert dès les abonnements d'entrée (descriptif de l'outil). Les générations « illimitées » promises par Higgsfield ne couvrent **pas** Seedance 2.0 pour Starter, Plus et Ultra (blog Higgsfield) : ne comptez pas dessus.

Les crédits d'une génération échouée techniquement sont généralement rendus (« usually », blog ; l'historique du compte montre un remboursement de 110 crédits le 3 septembre). **Une génération réussie mais inutilisable n'est jamais remboursée** : c'est le coût des « essais ratés ».

### 2.2 Prix du crédit

| Abonnement (source tierce) | $/mois | Crédits | $ par crédit | € par crédit avec 20 % de TVA (hypothèse) |
|---|---|---|---|---|
| Starter | 15 | 200 | 0,075 | 0,083 |
| Plus | 49 | 1 000 | 0,049 | **0,054** |
| Ultra | 129 | 3 000 | 0,043 | 0,048 |

Les crédits d'abonnement **ne sont pas reportés** : à 1 000 crédits par mois, un mois à 300 crédits utilisés coûte 3,3 fois le prix du crédit affiché. Le compte du fondateur montre un abonnement annulé le 30 octobre (l'historique ne donne pas son prix) : **le montant réellement payé est la meilleure donnée disponible ; merci de le communiquer.**

### 2.3 Stripe, cotisations, TVA

Stripe n'a ni abonnement ni frais mensuels ; les frais de transaction ne sont **pas** remboursés en cas de remboursement du client ; un litige coûte 20 € de frais. Les cotisations se calculent sur le chiffre d'affaires **encaissé**, frais Stripe compris (ils ne se déduisent pas en micro-entreprise). Aucune TVA facturée tant que le chiffre d'affaires reste sous 37 500 € (mention « TVA non applicable, art. 293 B du CGI » déjà sur les factures). Non inclus : impôt sur le revenu (ou versement libératoire, en option : +1,7 point en BIC services, +2,2 points en BNC non réglementée, d'après la même page), cotisation foncière des entreprises à partir de la deuxième année, assurance.

## 3. Le modèle

Une commande = crédits de génération + frais annexes + temps. Hypothèses par scénario :

| | Optimiste (rodé) | **Central** | Prudent (premières commandes) |
|---|---|---|---|
| Essais par clip utilisable | 1,5 | **2,5** | 4 |
| Cotisations | 21,2 % | **25,6 %** | 25,6 % |
| Frais Stripe moyens | 1,5 % | **2,1 %** | 2,8 % |
| TVA sur l'abonnement | 0 % | **20 %** | 20 % |
| Lecture du brief (min) | 5 | **10** | 15 |
| Écrire un script (min) | 10 | **15** | 25 |
| Échanges client, dépôt, livraison (min) | 15 | **25** | 35 |
| Préparer une vidéo (images de départ, prompt) (min) | 3 | **5** | 8 |
| Regarder une tentative (min) | 4 | **6** | 8 |
| Montage, sous-titres, export (min par vidéo) | 8 | **12** | 20 |
| Contrôle qualité avec écoute (min par vidéo) | 5 | **7** | 10 |
| Probabilité d'un 1er / 2e / 3e / 4e tour de retouches | 40 / 10 / 3 / 1 % | **60 / 25 / 10 / 4 %** | 90 / 50 / 25 / 10 % |
| Part des vidéos touchées par un tour | 30 % | **50 %** | 80 % |
| Minutes par vidéo retouchée | 10 | **20** | 40 |
| Retouches qui exigent une régénération | 10 % | **25 %** | 50 % |

Règles : une vidéo = un clip de 15 s en mode fast 720p (37,5 crédits) × essais ; 5 à 8 crédits annexes par commande (images, voix) ; les vidéos suivantes d'un même pack demandent 50 % de préparation et 80 % de montage en moins ; Pack Accroches et Pack Campagne = 3 scripts. Le coût d'un crédit est celui du plan Plus rempli ; l'abonnement est compté à part, par mois.

## 4. Tarifs actuels (25 / 69 / 129 €), retouches 1 / 3 / 12

Bénéfice net par commande, avant abonnement et avant impôt sur le revenu :

| Formule | Prix | Bénéfice : central (optimiste – prudent) | Temps : central (optimiste – prudent) | €/h : central (optimiste – prudent) |
|---|---|---|---|---|
| Essai | 25 € | **12,3 €** (16,3 – 8,2) | 1,6 h (0,9 – 2,9) | **7,7** (18,4 – 2,8) |
| Pack Accroches | 69 € | **33,1 €** (45,1 – 18,5) | 3,6 h (1,9 – 8,0) | **9,2** (23,6 – 2,3) |
| Pack Campagne | 129 € | **59,2 €** (83,6 – 24,4) | 6,1 h (3,0 – 16,6) | **9,6** (28,2 – 1,5) |

Décomposition du Pack Accroches, scénario central : 69,00 € − 1,70 € Stripe − 17,66 € cotisations − 16,57 € crédits (306 crédits) = **33,1 €**, pour 3,6 h. Les crédits ne pèsent que 24 % du prix, les cotisations 26 %.

## 5. Ce qui pèse le plus (Pack Accroches à 69 €, scénario central, un paramètre à la fois)

| Paramètre | Plage | Bénéfice | €/h |
|---|---|---|---|
| **Temps de travail** (script, revue, montage, contrôle) | −40 % à +60 % | inchangé | **15,0 → 6,4** |
| **Essais ratés** | 1,5 → 4 par clip | 36,5 → 27,1 € | **11,1 → 6,7** |
| Retouches | peu → beaucoup | 35,5 → 34,4 € | 10,5 → 8,7 |
| Cotisations | 21,2 → 25,6 % | 38,1 → 35,1 € | 10,6 → 9,8 |
| TVA sur l'abonnement | 0 → 20 % | 37,5 → 35,1 € | 10,4 → 9,8 |
| Stripe | 1,5 → 2,8 % | 35,5 → 34,6 € | 9,9 → 9,6 |

**Le levier est le temps par vidéo et le taux de réussite des générations.** Un gabarit de prompts, un montage automatisé (`production/pipeline/build_ad.py`), un script type par angle, un même présentateur réutilisé pour tout le pack : voilà ce qui paie, pas un taux de cotisation.

## 6. Trois grilles tarifaires

Contenu commun : sous-titres animés, mention « Généré par IA », MP4 1080 × 1920 (9:16), script validé avant production, voix française, liens privés valables 90 jours.

| | **Économique** | **Recommandée** | **Premium** |
|---|---|---|---|
| Essai | 25 € | **35 €** | 49 € |
| Pack Accroches | 69 € | **89 €** | 129 € |
| Pack Campagne | 129 € | **169 €** | 249 € |
| Durée par vidéo | jusqu'à 15 s | jusqu'à 15 s | jusqu'à 15 s (20 s en option : non retenu) |
| Tours de retouches (Essai / Test / Campagne) | 1 / 2 / 2 | 1 / 2 / 2 | 2 / 3 / 3 |
| Délais | 2 j / 3 j / 5 j | 2 j / 3 j / 5 j | 24 h / 48 h / 3 j |
| Contenu en plus | — | Pack Campagne : export 1:1 inclus | 2 variantes d'accroche au choix, meilleure de plusieurs prises, 9:16 + 1:1 partout |
| Public | premiers clients, avis | démarrage normal | après ≥ 5 avis et une qualité éprouvée |

### 6.1 Bénéfice par commande (avant abonnement et impôt sur le revenu) et temps

| Grille | Formule | Prix | Bénéfice : central (optimiste – prudent) | Temps : central (optimiste – prudent) | €/h : central (optimiste – prudent) |
|---|---|---|---|---|---|
| **Économique** | Essai | 25 € | 12,3 € (16,3 – 8,2) | 1,6 h (0,9 – 2,9) | 7,7 (18,4 – 2,8) |
| | Pack Accroches | 69 € | 33,2 € (45,1 – 19,4) | 3,5 h (1,9 – 7,6) | 9,4 (23,7 – 2,6) |
| | Pack Campagne | 129 € | 60,2 € (83,7 – 32,8) | 5,7 h (2,9 – 12,9) | 10,6 (28,6 – 2,5) |
| **Recommandée** | Essai | 35 € | 19,5 € (24,0 – 15,3) | 1,6 h (0,9 – 2,9) | 12,3 (27,1 – 5,3) |
| | Pack Accroches | 89 € | 47,6 € (60,6 – 33,7) | 3,5 h (1,9 – 7,6) | 13,4 (31,8 – 4,5) |
| | Pack Campagne | 169 € | 89,1 € (114,6 – 61,4) | 5,7 h (2,9 – 12,9) | 15,7 (39,2 – 4,8) |
| **Premium** | Essai | 49 € | 28,5 € (34,0 – 23,7) | 1,8 h (1,1 – 3,4) | 15,5 (31,1 – 7,0) |
| | Pack Accroches | 129 € | 73,4 € (89,0 – 58,4) | 4,1 h (2,3 – 8,5) | 18,0 (38,0 – 6,9) |
| | Pack Campagne | 249 € | 140,7 € (171,3 – 110,8) | 6,7 h (3,8 – 14,8) | 20,9 (45,1 – 7,5) |

Le passage de l'Économique à la Recommandée ne change **ni le temps ni les crédits** : le surplus (+7,2 / +14,4 / +28,9 € par commande) est du bénéfice net.

Prix qui donneraient 15, 20 et 25 €/h au scénario central (retouches 1 / 3 / 12, autres formules inchangées) : Essai 41 / 52 / 63 € ; Pack Accroches 98 / 123 / 148 € ; Pack Campagne 174 / 217 / 259 €. **Aucune grille raisonnable n'atteint 20 €/h dans le scénario central** : il faut aussi baisser le temps par commande, ce qui est le scénario optimiste (rodé).

### 6.2 Un mois type, abonnement compris

Mois de démarrage : 4 commandes (2 Essai + 2 Pack Accroches). Mois de croissance : 12 commandes (5 Essai + 5 Pack Accroches + 2 Pack Campagne). Abonnement choisi selon les crédits nécessaires (un seul compte, une seule offre ; au-delà de 3 000 crédits : Ultra + recharges au prix du crédit Ultra, **hypothèse**).

| Grille | Mois | Scénario | Abonnement | Bénéfice du mois (après abonnement) | Temps | €/h |
|---|---|---|---|---|---|---|
| Économique | démarrage | central | Plus 54 € | **37 €** | 10,3 h | 3,6 |
| | | optimiste / prudent | | 78 € / −87 € | 5,6 / 20,9 h | 13,9 / −4,2 |
| | croissance | central | Ultra + recharges 154 € | **193 €** | 37,0 h | 5,2 |
| | | optimiste / prudent | | 356 € / −73 € | 19,8 / 78,1 h | 18,0 / −0,9 |
| Recommandée | démarrage | central | Plus 54 € | **80 €** | 10,3 h | 7,8 |
| | | optimiste / prudent | | 124 € / −44 € | 5,6 / 20,9 h | 22,2 / −2,1 |
| | croissance | central | Ultra + recharges 154 € | **360 €** | 37,0 h | 9,7 |
| | | optimiste / prudent | | 534 € / 92 € | 19,8 / 78,1 h | 26,9 / 1,2 |
| Premium | démarrage | central | Plus 54 € | **150 €** | 11,8 h | 12,6 |
| | | optimiste / prudent | | 201 € / 22 € | 6,9 / 23,8 h | 29,2 / 0,9 |
| | croissance | central | Ultra + recharges 184 € | **607 €** | 43,1 h | 14,1 |
| | | optimiste / prudent | | 839 € / 318 € | 24,8 / 89,0 h | 33,9 / 3,6 |

Le scénario prudent (4 essais par clip, retouches fréquentes, premiers temps de travail) **fait perdre de l'argent** au démarrage aux tarifs actuels : c'est pourquoi les trois premières commandes servent à mesurer, pas à gagner.

**Abonnement :** à la grille Recommandée, un Plus à 54 € est couvert par environ **un Pack Accroches et un Essai** (47,6 + 19,5 € de bénéfice avant abonnement). Un Starter (≈ 17 €) est couvert par un seul Essai. Comme les crédits ne sont pas reportés, prenez l'offre du mois **selon les commandes déjà payées**, pas à l'avance.

## 7. Canal de vente

Ces chiffres supposent la **vente directe** sur le site (Stripe). Sur ComeUp, la commission est de 20 % du montant HT (`RESEARCH.md`, § 3.2) : à la grille Recommandée, le Pack Accroches passe de 13,4 à 8,4 €/h, l'Essai de 12,3 à 7,9 €/h et le Pack Campagne de 15,7 à 9,8 €/h ; aux tarifs actuels, l'Essai tombe à 4,6 €/h. Les repères relevés sur ComeUp (`RESEARCH.md`) : services « UGC » à partir de 18 $, vendeur IA établi à 23,99 $ de base avec des packs jusqu'à +258 $. **Les nouveaux vendeurs IA créés en 2026 y ont 0 vente observée** : les prix du site seront comparés à ces repères, d'où l'intérêt du prix de départ de la section suivante, mais le canal d'acquisition reste à construire.

## 8. Les formules : points à corriger quel que soit le tarif

| Point | Constat (mesuré) | Correction proposée |
|---|---|---|
| Retouches | Le site accepte **1 / 3 / 12** retouches (Essai / Test / Campagne) : un tour = une demande, quel que soit le nombre de vidéos concernées. Exposition maximale du Pack Campagne : 12 tours × 6 vidéos × 20 min = **24 h** | Compter en **tours** : 1 / 2 / 2, et vendre un tour supplémentaire (10 à 15 €) |
| Durée | « 15 à 20 secondes » promis pour Test et Campagne ; un clip Seedance 2.0 s'arrête à 15 s | « Jusqu'à 15 secondes » ; 20 s en option (second clip de 5 s : +12,5 crédits par essai, raccord et voix à vérifier) — **option non retenue le 22 novembre 2026 : 15 secondes maximum, aucune vidéo plus longue proposée pour le moment** |
| Prix écrits en dur | 3 occurrences hors `lib/formules.ts` (`app/page.tsx` ×2, `app/config.ts` ×1) ; les conditions de vente se mettent à jour toutes seules | À modifier en même temps que les prix |
| Formats | « Formats 9:16 et 1:1 » dans le Pack Campagne | Le 1:1 demande un recadrage ou un export dédié (temps) : le garder inclus seulement au tarif Recommandé ou Premium |

## 9. Recommandation finale

**Pour commencer : la grille Recommandée (35 / 89 / 169 €).**

| | Essai 35 € | Pack Accroches 89 € | Pack Campagne 169 € |
|---|---|---|---|
| Vidéos | 1 | 3 | 6 |
| Durée | jusqu'à 15 s | jusqu'à 15 s | jusqu'à 15 s |
| Accroches | 1 | 3 (A problème, B résultat, C curiosité) | 3 × 2 présentateurs |
| Inclus | script, présentateur IA, voix française, sous-titres animés, MP4 9:16, mention « Généré par IA » | idem | idem + export 1:1 |
| **Tours de retouches** | **1** | **2** | **2** |
| Délai | 2 jours | 3 jours | 5 jours |
| Tour supplémentaire | 10 € | 15 € | 20 € |

**Pourquoi pas l'Économique :** à 25 / 69 / 129 € le bénéfice est de 7 à 10 €/h dans le scénario central et négatif au démarrage dans le scénario prudent. Le gain d'un prix bas est un taux de conversion, que personne n'a mesuré ; la perte est certaine.
**Pourquoi pas le Premium au départ :** la qualité supérieure n'est pas démontrée (les défauts connus de la source 720p sont décrits dans `production/essai-01/RAPPORT.md`), et un prix de 49 / 129 / 249 € demande des avis clients que vous n'avez pas. Gardez-le pour après 5 commandes validées.
**Ce que le prix ne règle pas :** même à 35 / 89 / 169 €, le scénario central donne 12 à 16 €/h et le mois de démarrage 80 € de bénéfice pour 10 heures. Le résultat dépend d'abord de votre temps par commande : l'objectif est de passer du scénario central au scénario optimiste (1 h pour un Essai, 2 h pour un Pack Accroches), qui donne 27 à 39 €/h.

**Corrections autorisées : 1 tour pour l'Essai, 2 pour les packs** (la définition des retouches des conditions de vente, à script constant, reste la bonne : texte à l'écran, sous-titres, rythme, remplacement d'un plan). Un tour peut concerner toutes les vidéos du pack. Un changement de script, de produit ou d'angle est une nouvelle commande. Au-delà : tour supplémentaire payant.

**Options à ajouter plus tard** (non chiffrées dans le modèle) : livraison 24 h (+15 €), version anglaise (+15 €, voix et sous-titres à régénérer), script supplémentaire (+10 €), format 1:1 (+15 €).

## 10. Ce qu'il faut mesurer sur les 5 premières commandes, et quand décider

Notez pour chaque commande : minutes par étape (brief, script, génération, montage, contrôle, retouches, livraison), crédits consommés (l'historique de transactions Higgsfield les donne), nombre d'essais par clip, retouches demandées, frais Stripe réels.

| Constat après 5 commandes | Décision |
|---|---|
| Temps réel > 1,5 h (Essai) ou > 3,5 h (Test) | Ne pas augmenter les prix : réduire le périmètre (gabarits, un seul présentateur, une seule voix) |
| Plus de 3 essais par clip | Changer de méthode de génération (prompts, image de départ, mode standard pour l'accroche seule) avant de vendre plus |
| Temps ≤ scénario optimiste et ≥ 3 avis positifs | Passer à la grille Premium sur les packs |
| Ventes ≥ 6 par mois | Plan Ultra ; revérifier le prix des recharges |
| Un tour de retouches utilisé par plus de 80 % des clients | Le premier brouillon est insuffisant : agir sur le script avant de monter |

## 11. Limites de l'étude

- Les **temps et le taux d'essais ratés sont des hypothèses** : elles dominent le résultat. Aucune commande réelle n'a été produite.
- Le **prix des abonnements** vient d'une source tierce et d'un blog, pas de la page officielle (vide hors JavaScript). Les sources divergent de 4 à 10 $.
- La **catégorie d'activité** (cotisations de 21,2 % ou 25,6 %) n'est pas établie ; la différence vaut de 1,5 € (Essai à 35 €) à 7,4 € (Pack Campagne à 169 €) par commande.
- La **TVA sur l'abonnement** et le **taux de change** sont supposés.
- Le **prix des recharges** est inconnu : le modèle suppose qu'elles coûtent le prix du crédit Ultra au-delà de 3 000 crédits.
- Ne sont pas inclus : l'impôt sur le revenu, la cotisation foncière, le temps de prospection, les remboursements et litiges, les éventuels frais d'hébergement si le quota gratuit de Netlify ne suffit plus, un nom de domaine (≈ 10 €/an).
- Les durées et les prix ne tiennent pas compte de la concurrence réelle de votre cible : à tester avec les premiers prospects (`commercial/`).
