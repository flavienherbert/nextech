# Grilles tarifaires : site direct, ComeUp, Fiverr (décisions du 22 novembre 2026)

Modèle reproductible : `python3 commercial/modele-rentabilite.py decision`. Hypothèses et sources : `commercial/RENTABILITE.md`.

## 1. Décisions

| | Essai | Pack Accroches | Pack Campagne |
|---|---|---|---|
| **Prix du site direct** (inchangé par les commissions externes) | **35 €** | **89 €** | **169 €** |
| Vidéos | 1 | 3 | 6 |
| Durée par vidéo | 15 secondes maximum | 15 secondes maximum | 15 secondes maximum |
| **Tours de retouches** | **1** | **2** | **2** |

**Durée.** Aucune formule ne promet plus de 15 secondes. **Décision du 22 novembre 2026 : les vidéos de plus de 15 secondes ne sont pas proposées pour le moment** (ni sur le site, ni sur les plateformes). Pour mémoire, le calcul d'une éventuelle option (second clip de 5 s : 31 crédits Higgsfield avec 2,5 essais, 31 minutes de travail) donnait environ 20 € par vidéo et par tranche de 5 s pour 25 €/h ; la technique (raccord de voix et de présentateur) n'est pas éprouvée.

**Un tour de retouches** est **une seule demande, qui regroupe toutes les remarques sur l'ensemble des vidéos livrées** (et non une demande par vidéo). Il porte sur le texte à l'écran, les sous-titres, le rythme, le remplacement d'un plan, à script constant. Un changement de produit, de brief, de script validé, de présentateur, d'angle ou de durée **n'est pas une retouche** : c'est une nouvelle commande. Une demande hors périmètre n'est pas exécutée et **n'est pas décomptée** ; le client reçoit l'explication. Ce libellé est repris mot pour mot par la page du client, les e-mails et les conditions de vente (`lib/formules.ts`).

## 2. Commissions des plateformes (vérifiées le 22 novembre 2026)

| Plateforme | Commission vendeur | Source | Statut |
|---|---|---|---|
| **ComeUp, offre gratuite** | **20 % du prix hors taxes** de la commande | [support ComeUp, article 1490](https://support-en.comeup.com/article/1490-what-commission-do-you-take-from-the-value-of-the-order), « last updated March 26, 2025 » | **Vérifié, page officielle** |
| **ComeUp Plus** | **1 € fixe par commande** (« Fixed €1 commission per order »), uniquement pour les commandes passées après l'abonnement | articles 1490 et 1493, même site | **Vérifié, page officielle** |
| Abonnement ComeUp Plus | Standard **12 € HT/mois**, Premium 40 € HT/mois. Essai gratuit affiché « jusqu'au 22 déc. 2026 » | [comeup.com/plus](https://comeup.com/plus) (non datée ; la même page propose un sélecteur en dollars, et un autre site cite 13 $ et 45 $) | Page officielle, **à confirmer dans votre espace vendeur** |
| ComeUp, frais payés par l'acheteur | « Frais bancaires et de sécurité » ajoutés au prix, **non déduits** des gains du vendeur ; aucun taux publié | articles 1474 et 1479 | Officiel, **montant non trouvé** |
| ComeUp, prix minimum | 15 € de prix de départ (depuis le 27 novembre 2024) | article 1509 | Officiel |
| ComeUp, retrait des gains (Hyperwallet), émission de la facture, base du chiffre d'affaires à déclarer | — | — | **Non trouvé** : « tous les revenus doivent être déclarés » (article 1485) |
| **Fiverr** | **20 %** | Deux blogs tiers (Wise, août 2025 ; VaultLeap, juillet 2026) | **Non vérifié** : les pages officielles de Fiverr refusent la lecture automatique (403). **À vérifier dans votre espace vendeur** |
| Fiverr, frais de l'acheteur | 5,5 % + petite commande (3,50 $ sous 100 $ selon l'un, 2,50 $ sous 50 $ selon l'autre : **contradiction**) | mêmes blogs | Non vérifié |
| Fiverr, retrait et conversion | versé en dollars ; retrait 0 à 3 $ selon le mode ; conversion de 1 à 4 % ; gains disponibles 14 jours après la livraison | mêmes blogs (chiffres divergents) | Non vérifié |

## 3. Tarifs conseillés par canal

Principe : **le prix du site ne change pas**. Sur une plateforme, le prix est relevé pour que le bénéfice par commande soit le même que sur le site (scénario central, cotisations calculées sur le prix payé par l'acheteur, par prudence).

| | Essai | Pack Accroches | Pack Campagne |
|---|---|---|---|
| **Site direct** | 35 € | 89 € | 169 € |
| **ComeUp, offre gratuite** (20 %) | **47 €** | **119 €** | **229 €** |
| *ComeUp Plus (1 €/commande, 12 € HT/mois) : différé, voir ci-dessous* | *36 €* | *90 €* | *170 €* |
| **Fiverr** (20 %, en dollars) | **54 $** | **135 $** | **255 $** |

Prix de parité calculés (avant arrondi) : ComeUp gratuit 46,1 / 117,8 / 224,1 € ; ComeUp Plus 35,0 / 87,5 / 165,2 € ; Fiverr 47,8 / 122,3 / 232,7 € (soit 52 / 133 / 253 $ à 0,92 €/$). Les prix retenus sont arrondis au-dessus (ComeUp gratuit : +2 %, Fiverr : +4 %) pour absorber l'incertitude sur les frais de retrait et de conversion.

**Sur ComeUp : offre gratuite, prix 47 / 119 / 229 €, sans coût fixe. Décision du 22 novembre 2026 : ComeUp Plus attend les premières ventes.** Pour mémoire, à prix égal l'offre Plus ferait gagner 8,4 € (Essai), 22,8 € (Pack Accroches) ou 44,8 € (Pack Campagne) par commande, soit un abonnement rentable dès 2 Essais ou 1 Pack Accroches par mois sur la plateforme ; la grille serait alors 36 / 90 / 170 €. À réévaluer après les premières ventes.

**Ce que paie l'acheteur** : Fiverr ajoute 5,5 % et des frais de petite commande (≈ 60 $ pour un Essai à 54 $, d'après les blogs) ; ComeUp ajoute des frais bancaires. Un acheteur compare ce total aux autres vendeurs, pas le prix du site : c'est le risque de conversion de cette grille.

**Si les prix du site étaient repris tels quels sur une plateforme** (central) : ComeUp gratuit 8,5 / 9,0 / 10,4 €/h ; Fiverr 8,1 / 8,5 / 9,8 €/h ; ComeUp Plus 12,3 / 13,8 / 16,2 €/h. C'est ce qui justifie des prix distincts.

### Services « à partir de » et options

- **ComeUp** : un service « Essai » à 47 €, et des options « Pack Accroches » (+72 €) et « Pack Campagne » (+182 €) pour atteindre 119 € et 229 € ; ou trois services séparés.
- **Fiverr** : un gig à trois packages Basic 54 $ / Standard 135 $ / Premium 255 $, avec 1 / 2 / 2 révisions.
- Dans chaque fiche : « 15 secondes maximum par vidéo » et la définition d'un tour de retouches (pas d'option de durée supérieure).
- Les commandes de plateforme se livrent **dans la plateforme** (fichiers, messagerie, révisions). Ne redirigez pas les acheteurs vers le site : c'est interdit par la plupart des plateformes (à vérifier dans leurs conditions).

## 4. Résultat des calculs (hypothèses de `RENTABILITE.md`, bénéfice avant abonnement et impôt sur le revenu)

### Vente directe

| Formule | Prix | Bénéfice central (optimiste – prudent) | Temps central (optimiste – prudent) | €/h central (optimiste – prudent) |
|---|---|---|---|---|
| Essai | 35 € | 19,5 € (24,0 – 15,3) | 1,6 h (0,9 – 2,9) | 12,3 (27,1 – 5,3) |
| Pack Accroches | 89 € | 47,6 € (60,6 – 33,7) | 3,5 h (1,9 – 7,6) | 13,4 (31,8 – 4,5) |
| Pack Campagne | 169 € | 89,1 € (114,6 – 61,4) | 5,7 h (2,9 – 12,9) | 15,7 (39,2 – 4,8) |

### Plateformes, aux prix retenus (€/h : central ; optimiste – prudent)

| | Essai | Pack Accroches | Pack Campagne |
|---|---|---|---|
| ComeUp gratuit (47 / 119 / 229 €) | 12,6 (28,0 – 5,6) | 13,6 (32,6 – 4,6) | 16,2 (40,6 – 5,1) |
| ComeUp Plus (36 / 90 / 170 €) | 12,8 (27,7 – 5,6) | 14,0 (32,5 – 4,8) | 16,3 (40,1 – 5,1) |
| Fiverr (54 / 135 / 255 $) | 12,9 (28,7 – 5,7) | 13,7 (32,9 – 4,7) | 15,9 (40,2 – 4,9) |

Le bénéfice par heure est le même sur les trois canaux : c'est le but de la compensation.

### Temps maximal pour atteindre 25 €/h

Temps total par commande (brief, script, échanges, génération, montage, contrôle, retouches, livraison) :

| Formule | Temps maximal avant abonnement | Temps maximal après abonnement (12 commandes/mois) | Temps estimé : optimiste / central / prudent |
|---|---|---|---|
| Essai | **0 h 47** | **0 h 35** | 0,9 h / 1,6 h / 2,9 h |
| Pack Accroches | **1 h 55** | **1 h 20** | 1,9 h / 3,5 h / 7,6 h |
| Pack Campagne | **3 h 34** | **2 h 25** | 2,9 h / 5,7 h / 12,9 h |

Mois complet, abonnement Higgsfield compris :

| Mois | Scénario | Bénéfice du mois | Temps réel | €/h | Temps admissible pour 25 €/h |
|---|---|---|---|---|---|
| 4 commandes (2 Essai + 2 Pack Accroches) | optimiste | 124 € | 5,6 h | 22,2 | 5,0 h |
| | central | 80 € | 10,3 h | 7,8 | 3,2 h |
| 12 commandes (5 Essai + 5 Pack Accroches + 2 Pack Campagne) | optimiste | 534 € | 19,8 h | **26,9** | 21,3 h |
| | central | 360 € | 37,0 h | 9,7 | 14,4 h |

**Lecture honnête.** 25 €/h n'est atteint, avec ces prix, que dans le scénario optimiste (rodé, peu d'essais ratés) **et** à partir d'environ 12 commandes par mois (l'abonnement est alors dilué). Dans le scénario central, il faut diviser le temps par commande par **1,6 à 2,7** selon la formule et le volume : un Essai en 35 à 47 minutes, un Pack Accroches en 1 h 20 à 1 h 55, un Pack Campagne en 2 h 25 à 3 h 35. Ce n'est pas impossible (c'est l'ordre de grandeur de l'estimation de 50 à 60 minutes du rapport d'essai pour un Essai réussi du premier coup), mais **aucune commande réelle ne l'a encore prouvé** : mesurez les cinq premières.

L'Essai est le produit le plus tendu : 35 € pour moins de 47 minutes, abonnement non compris. Le brief, le script et les échanges (15 à 30 minutes) laissent 15 à 30 minutes pour générer, monter et contrôler.

## 5. Ce que contient le correctif préparé

Voir `RAPPORT-MODIFICATIONS.md` (hors dépôt) : prix, durées et tours lus dans `lib/formules.ts` partout, tours de retouches consolidés, refus « hors périmètre » sans décompte, conditions de vente et textes commerciaux alignés, tests automatiques.
