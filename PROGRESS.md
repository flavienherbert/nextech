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

- **13/11** — Stockage : pilote compatible S3 ajouté à côté du disque ; fichiers envoyés directement du navigateur au stockage. Choix proposé : Cloudflare R2, non souscrit.
- **13/11** — Factures PDF : émises à la livraison, numérotation continue, spécimens hors série en préproduction, blocage sans informations légales.
- **13/11** — E-mails : pilotes Brevo et Resend, testés contre un faux serveur. Choix proposé : Brevo.
- **13/11** — Revue de sécurité : 7 défauts corrigés, risques restants listés dans `site/SECURITE.md`.
- **13/11** — Hébergement : proposition Netlify gratuit + R2, repli Render ou Fly.io. Aucun déploiement.

- **14/11** — Défaut signalé par le fondateur : sections vides avec `npm run demo`. Cause : politique de contenu sans `'unsafe-eval'`, incompatible avec le mode développement, jamais testé. Corrigé ; apparition des blocs rendue indépendante de l'application ; test d'affichage ajouté pour les deux modes.

## Journal récent

- **15/11** — Préproduction déployée sur Netlify (protégée par mot de passe). Stockage : Supabase remplace Cloudflare R2 ; pilote PostgreSQL pour les documents, test de conformité du stockage, sauvegarde et restauration, limite de vidéo ramenée à 50 Mo, politique de confidentialité mise à jour. Tout testé en local ; rien connecté à Supabase (en attente de validation).

- **15/11** — Test réel du bucket Supabase : fichiers conformes (14 réussites, 1 avertissement, 0 échec) ; écritures conditionnelles non fiables (2/6, écrasement silencieux). Corrections : documents et numéros de facture exclusivement en base, écritures conditionnelles refusées sur les fichiers, contrôle des marques MP4/MOV/HEIC et du type enregistré, origine du stockage déduite pour la CSP.

- **15/11 (soir)** — Audit complet et durcissement : limiteur partagé, purge (orphelins, anciens e-mails), diagnostic administrateur, pages d'erreur, délais Stripe/Brevo. Diagnostic réel sur Netlify : factures PDF cassées (polices absentes du déploiement), corrigé ; clé Brevo refusée par la restriction d'adresses IP de Brevo (action du fondateur). Préproduction redéployée, protection par mot de passe vérifiée (29 adresses).

- **16/11** — Organisation côté vendeur : e-mail immédiat à chaque commande payée (numéro, client, e-mail, offre, montant, lien direct) et notification sur le téléphone sans donnée personnelle ; chaîne d'envoi Brevo → Resend → Gmail (SMTP) contre le blocage de Brevo ; tableau de bord par catégories avec recherche ; panneau « Prochaine étape » et boutons guidés (production, livraison, correction, clôture, relance) ; alertes (paiement échoué, erreur serveur, e-mail non envoyé, correction demandée) ; tâche quotidienne (récap, relance du brief à 48 h). Testé : 154/154 en navigateur (disque), tests ciblés dans les quatre modes de stockage. Mode d'emploi : `site/MODE-EMPLOI.md`.

- **16/11 (soir)** — Test de commande en ligne (paiement Stripe en mode test passé par le fondateur). Cause des erreurs 401 d'e-mail établie : Brevo (api.brevo.com) refuse les adresses IP de Netlify (réglage « Authorized IPs » du compte Brevo) ; clé et variables correctes. Message désormais explicite dans l'administration. Gmail (SMTP) en première voie dès que `SMTP_PASSWORD` est saisi. Brief : site internet facultatif. E-mails de livraison : un lien privé par fichier. Parcours livraison, correction, clôture vérifié en ligne sur Supabase (commande de test SA-261116-QKMKC).

## Relevé hebdomadaire

| Semaine | Vues fiches | Messages | Commandes | Chiffre d'affaires | Coût génération | Heures |
|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — |
