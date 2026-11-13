# Choix techniques et coûts — à décider avant la mise en ligne

Relevé du 13 novembre 2026. Rien n'a été souscrit, rien n'est déployé.
Légende : **[vérifié]** = lu ce jour sur la page du fournisseur ou dans sa documentation · **[à revérifier]** = lu sur des comparatifs tiers, à confirmer sur le site du fournisseur avant de s'engager.

## Ce que le site sait déjà faire, quel que soit le choix

Le code ne dépend d'aucun hébergeur :
- deux pilotes de stockage interchangeables, **disque** et **stockage objet compatible S3**, choisis par simple configuration ;
- envoi des fichiers directement du navigateur vers le stockage (pas de limite liée au serveur) ;
- deux pilotes d'e-mail, **Brevo** et **Resend**.

Les deux stockages ont passé la même batterie de tests (88 vérifications sur disque, 86 sur stockage objet avec un émulateur local), dont la survie à un redémarrage sur un serveur au disque vide.

## 1. Stockage des commandes, briefs, vidéos et factures

Volume estimé : 10 commandes par mois × ~100 Mo, fichiers supprimés 90 jours après la livraison → environ 3 Go en régime établi.

| Solution | Coût mensuel | Durable après redéploiement | Remarques |
|---|---|---|---|
| Disque de l'hébergeur « sans serveur » (Vercel, Netlify) | — | **Non** | Le disque est effacé à chaque déploiement : inutilisable. |
| Disque persistant d'un hébergeur à conteneur | inclus dans l'offre payante | Oui | Simple. Un seul point de défaillance : il faut prévoir une sauvegarde. |
| **Cloudflare R2** (stockage objet) | **0 €** jusqu'à 10 Go | Oui | 10 Go, 1 million d'écritures et 10 millions de lectures gratuits par mois ; téléchargements gratuits **[vérifié]**. Écritures conditionnelles annoncées dans la documentation **[à confirmer au premier test réel]**. Carte bancaire probablement demandée à l'activation **[non vérifié]**. |
| Autre stockage S3 (Scaleway, Backblaze, AWS) | quelques centimes à ~1 €/mois | Oui | Fonctionne avec le même pilote. Non chiffré en détail. |
| Base de données hébergée + stockage objet | 0 à ~20 €/mois | Oui | Plus puissant, inutile à ce volume : deux services à gérer au lieu d'un. |

**Choix proposé : Cloudflare R2.** Un seul service pour tout (commandes, fichiers, factures), gratuit à notre volume, indépendant de l'hébergeur. Si l'on change d'hébergeur, les données ne bougent pas.

Point d'attention : le pilote s'appuie sur les « écritures conditionnelles » pour éviter qu'une facture reçoive deux fois le même numéro. Tous les fournisseurs S3 ne les proposent pas. C'est le premier contrôle à faire sur le vrai service (`npm run test:unitaires`).

## 2. Hébergement du site

| Hébergeur | Coût mensuel | Usage commercial | Convient à notre site |
|---|---|---|---|
| Vercel Hobby | 0 € | **Interdit** **[vérifié]** | Non |
| Vercel Pro | 20 $ par utilisateur **[à revérifier]** | Oui | Oui, mais c'est l'abonnement que tu veux éviter |
| **Netlify, offre gratuite** | **0 €** | Autorisé **[à revérifier]** | Oui en principe. 300 crédits par mois ; site mis en pause si le quota est dépassé **[à revérifier]**. Requêtes limitées à 6 Mo **[vérifié]**, sans effet pour nous grâce à l'envoi direct des fichiers. **Non testé** avec notre site. |
| Render, Starter | ~7 $ + disque **[à revérifier]** | Oui | Oui. Prix prévisible, disque persistant possible. |
| Fly.io | ~2 à 5 $ + volume à 0,15 $/Go **[à revérifier]** | Oui | Oui. Le moins cher des payants, facture moins prévisible. |
| Railway, Hobby | ~5 $ **[à revérifier]** | Oui | Oui. Carte bancaire obligatoire. |
| Petit serveur loué | ~4 à 6 € **[non relevé ce jour]** | Oui | Déconseillé : mises à jour, certificats et sécurité à ta charge. |

**Choix proposé : Netlify gratuit + Cloudflare R2**, soit 0 €/mois.
**Solution de repli : Render ou Fly.io + Cloudflare R2**, soit 3 à 8 $/mois, si l'essai sur Netlify révèle une incompatibilité.

Dans les deux cas le stockage reste R2 : l'hébergeur n'a alors besoin d'aucun disque et peut être remplacé sans migration de données.

Ce qui reste à vérifier avant d'arrêter ce choix : un déploiement d'essai en préproduction (ta décision), et la lecture des conditions d'usage commercial sur le site de Netlify.

## 3. E-mails

Besoin : 6 à 8 e-mails par commande. Même à 30 commandes par mois, moins de 300 e-mails.

| Service | Offre gratuite | Remarques |
|---|---|---|
| **Brevo** | 300 e-mails par jour **[à revérifier]** | Entreprise française, données en Europe. |
| Resend | 3 000 par mois, 100 par jour **[à revérifier]** | Très simple. Les sources divergent sur le nombre de domaines inclus. |
| Boîte personnelle (Gmail, Proton) en envoi automatique | 0 € | Déconseillé : messages souvent classés en indésirables, risque de blocage du compte. |

**Choix proposé : Brevo.** Les deux pilotes sont écrits et testés contre un faux serveur (forme des requêtes, panne, service injoignable). **Aucun e-mail réel n'a encore été envoyé.**

Condition commune aux deux : un **nom de domaine** vérifié chez le service, pour que les e-mails partent d'une adresse du type `commandes@tondomaine.fr`. Sans domaine, pas d'envoi fiable. C'est la seule dépense réellement nécessaire.

## 4. Récapitulatif des coûts

| Poste | Choix proposé | Coût |
|---|---|---|
| Hébergement | Netlify gratuit | 0 € |
| Stockage | Cloudflare R2 | 0 € |
| E-mails | Brevo gratuit | 0 € |
| Nom de domaine | .fr ou .com | ~7 à 12 € **par an** |
| Stripe | Commission par paiement | Aucun abonnement |
| **Total récurrent** | | **~1 €/mois** |

Repli si Netlify ne convient pas : + 3 à 8 $/mois.

## 5. Ce que chaque décision déclenche

| Tu décides | Je fais ensuite |
|---|---|
| Nom de domaine | Rien à développer ; tu l'achètes, je te guide pour les réglages. |
| Cloudflare R2 | Tu crées le bucket et les clés ; je fournis les réglages (accès privé, règle d'envoi depuis le site) et je lance les tests sur le vrai service. |
| Brevo | Tu crées le compte et vérifies le domaine ; un e-mail de contrôle part vers ta propre adresse. |
| Hébergeur | Déploiement de préproduction, tests complets en ligne, Stripe en mode test. |
