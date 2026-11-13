# PROGRESS — Avancement réel

## État au 12/11/2026

| Élément | État |
|---|---|
| Étude de marché | Faite |
| Choix du business | Fait : Studio Accroche |
| Fiches ComeUp et Fiverr | Rédigées, non publiées |
| Méthode de production | Testée sur 1 vidéo (essai-01), verdict : pas encore vendable à 69 € |
| Site | Système de commande complet, 63 tests réussis en local contre un simulateur Stripe ; non mis en ligne, non testé contre le vrai Stripe |
| Vidéos d'exemple | 1 essai, non publiable en l'état (son) |
| SIRET | Non créé |
| Ventes | 0 |
| Dépenses | 0 € d'achat ; 280 crédits Alexya déjà détenus consommés (solde 37) |

## Vérifications effectuées sur le site

- Compilation Next.js sans erreur, 3 pages statiques.
- Rendu contrôlé en 390 px et 1280 px : aucun débordement horizontal, aucune erreur console.
- Boutons de commande : lien Stripe si la variable est renseignée, sinon e-mail, sinon ancre de contact (testé avec des liens factices).
- Non testé : paiement Stripe réel, redirection après paiement.

## Journal des décisions

- **12/11** — Repartir de zéro. Ebooks nextech et Fruit Studio déplacés dans `archive/`.
- **12/11** — Vidéo anonyme écartée comme canal principal : 0 vente avec moins de 1 000 vues par vidéo sur l'essai précédent.
- **12/11** — Apify écarté : 4 % des outils de moins de 30 jours atteignent 5 utilisateurs.
- **12/11** — DUERP écarté : 6 concurrents, prix jusqu'à 5 €.
- **12/11** — Retenu : vidéos publicitaires avec présentateur IA sur marketplaces de services.
- **12/11** — Refus des faux témoignages clients et mention IA systématique.
- **12/11** — Constat : Higgsfield à 0 crédit, Alexya à 317 crédits (≈ 5 s de vidéo). La production demande un budget outil, non engagé.

- **12/11** — Essai n°1 produit : 280 crédits, ~40 min. Image convaincante, son insuffisant (deux voix, pas de musique). Détail dans `production/essai-01/RAPPORT.md`.
- **12/11** — Format retenu : accroche parlée courte + plans produit + voix off. Un présentateur parlant 15 s en 720p coûterait 1 500 crédits.
- **12/11** — Nom vérifié (domaines libres, pas d'homonyme dans le secteur), marques INPI à contrôler à la main. Voir ADMIN.md.

- **13/11** — Version 2 de la publicité montée à partir d'un clip Higgsfield généré par le fondateur : « fuient » correct, quatre plans animés, voix unique recréée en local, musique originale.
- **13/11** — Refonte de la page de vente : film d'accueil en trois volets, lecteur à chapitres, bande d'extraits, formules illustrées. Aucun faux client ni faux avis ; tout est présenté comme démonstration.
- **13/11** — 25 prospects identifiés (15 vérifiés, 10 partiels), aucun contacté. Méthode retenue : cinq messages personnalisés par semaine, avec trois accroches offertes.
- **13/11** — Constat : sans SIRET, aucun encaissement possible. C'est le point bloquant du premier client.

- **13/11** — Publicité du studio mise en pause par le fondateur. Priorité au système commercial.
- **13/11** — Paiement : sessions Stripe créées par le site et confirmées par webhook signé, à la place de simples liens de paiement. Une clé réelle est refusée sans autorisation explicite et mentions légales complètes.
- **13/11** — Accueil : visuels fixes à la place des vidéos, à la demande du fondateur. Les fichiers vidéo restent dans le dépôt, non affichés.
- **13/11** — Stockage sur disque local, indépendant de l'hébergeur. L'offre gratuite de Vercel interdisant l'usage commercial, le choix de l'hébergement reste ouvert.
- **13/11** — Prospects revérifiés visuellement : OCNI Factory retirée (déjà très équipée en vidéo), remplacée par La Fille des Carnets ; trois accroches corrigées.

## Relevé hebdomadaire

| Semaine | Vues fiches | Messages | Commandes | Chiffre d'affaires | Coût génération | Heures |
|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — |
