# Production — du brief à la livraison

Objectif : 45 minutes pour un Essai, 1 h 15 pour un Pack Test.

## 1. Brief client (6 questions)

1. Lien du produit
2. Trois photos nettes sur fond simple
3. Qui achète ? (âge, situation, moment d'usage)
4. La promesse principale, en une phrase
5. Ton : direct, complice, haut de gamme, drôle
6. Ce qu'il ne faut pas dire (allégations, concurrents)

Vérifier avant d'accepter : pas de faux témoignage demandé, pas d'allégation santé ou financière, produit sans texte fin impossible à reproduire.

## 2. Script (15 minutes)

Structure d'une vidéo de 15–20 secondes :

| Temps | Rôle | Longueur |
|---|---|---|
| 0–3 s | Accroche | 8 à 12 mots |
| 3–10 s | Problème puis produit | 20 mots |
| 10–16 s | Bénéfice concret, une preuve vérifiable | 18 mots |
| 16–20 s | Appel à l'action | 6 à 8 mots |

Trois angles d'accroche pour un Pack Test :
- **Problème** : « Arrête de [geste pénible]. »
- **Résultat** : « Depuis que j'utilise ça, [changement mesurable]. » — formulé comme une présentation, jamais comme un avis client fictif. Préférer « Avec ça, tu… » à « J'ai testé pendant 3 semaines… ».
- **Curiosité** : « Ce truc à [prix] remplace [habitude]. »

Débit : 2,5 mots par seconde. Un script de 20 secondes fait 50 mots au maximum.

Envoyer le script au client pour validation avant toute génération : une retouche de texte coûte 0 €, une retouche de vidéo coûte une régénération.

## 3. Génération

Outil à choisir au moment de la première dépense, après vérification des tarifs du jour (voir RESEARCH.md § 3.4). Critères : français naturel avec synchronisation des lèvres, droit d'usage commercial, paiement à l'usage.

Méthode :
1. Générer l'image de départ : présentateur tenant ou montrant le produit, à partir des photos du client.
2. Animer par segments de 5 à 8 secondes, un segment par ligne du script.
3. Pour un Pack Test : ne régénérer que le segment d'accroche, réutiliser le corps.
4. Assembler, ajouter les sous-titres, exporter en 1080×1920.

Le pipeline `archive/fruit-studio` (assemblage FFmpeg, sous-titres incrustés, plafond de dépense global) est réutilisable pour l'étape 4.

Plafond : 8 € de génération par vidéo livrée. Au-delà, simplifier le plan plutôt que relancer.

## 4. Contrôle qualité avant livraison

- [ ] Mains et doigts corrects sur tous les plans
- [ ] Lèvres synchronisées, pas de mot avalé
- [ ] Produit reconnaissable, logo non déformé
- [ ] Sous-titres sans faute, lisibles sur mobile
- [ ] Aucune promesse absente du brief
- [ ] Aucune formulation de faux témoignage
- [ ] Durée conforme à la formule
- [ ] Fichier MP4 1080×1920 lisible sur téléphone

Un seul point raté = on ne livre pas.

## 5. Livraison

- Fichier MP4 + script en texte.
- Rappel au client : activer la mention « contenu généré par IA » sur la plateforme de diffusion.
- Demande d'avis, proposition du pack supérieur.

## 6. Suivi

Noter pour chaque commande dans PROGRESS.md : formule, prix, coût de génération réel, temps passé, retouche demandée ou non.
