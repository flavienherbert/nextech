# E-mails automatiques — un par étape (état du 21 novembre 2026)

Chaque e-mail est **archivé** avant l'envoi (Administration, E-mails), même s'il ne part pas. Ordre d'envoi : Gmail (SMTP) d'abord, Brevo en secours. Les réponses des clients arrivent sur contactstudioaccroche@gmail.com (champ « Répondre à »).

| # | Étape | Déclencheur | Destinataire | Objet | À retenir |
|---|---|---|---|---|---|
| 1 | Paiement confirmé | Webhook Stripe signé (jamais avant) | **Vous** | `[Studio Accroche] Nouvelle commande payée — N° — offre — montant` | Numéro, client, **entreprise et SIRET**, e-mail, offre, montant, date, délai, bouton « Ouvrir la commande ». Doublée d'une notification téléphone (sans donnée personnelle). |
| 2 | Paiement confirmé | idem | Client | `Commande N° confirmée — il nous manque votre brief` | Récapitulatif + bouton vers son lien privé pour remplir le brief. |
| 3 | Brief manquant depuis 48 h | Tâche quotidienne, une seule fois | Client | `Commande N° — il nous manque encore votre brief` | Relance automatique ; relançable à la main depuis la commande. |
| 4 | Brief reçu | Envoi du brief par le client | **Vous** | `[Studio Accroche] Brief reçu — N° — marque` | Brief complet, liste des fichiers, lien vers la commande. |
| 5 | Brief reçu | idem | Client | `Commande N° — brief bien reçu` | Accusé de réception, lien de suivi. |
| 5 bis | Script à valider | Bouton « Envoyer le script au client » (vous le déclenchez, après le brief) | Client | `Commande N° — votre script à valider` | Le texte du script ; le client valide en répondant « OK » (réponse reçue dans la boîte du studio). Date et envoi tracés dans l'historique. *(ajout du 22 novembre)* |
| 5 ter | Demande hors périmètre | Bouton « Refuser : hors périmètre » (changement de produit, de brief, de script validé, d'angle ou de durée) | Client | `Commande N° — votre demande de retouche est hors périmètre` | L'explication de l'administrateur, la définition d'un tour de retouches, **le tour n'est pas décompté**. *(ajout du 22 novembre)* |
| 6 | Production lancée | Bouton « Démarrer la production » (exige la case « le client a validé le script ») | Client | `Commande N° — production lancée` | Lien de suivi. |
| 7 | Livraison | Bouton « Envoyer la livraison au client » | Client | `Commande N° — à valider` | **Un lien privé par fichier** (vidéo, PDF) + lien de son espace pour valider ou demander une retouche, **avec la date limite** (14 jours, jusqu'à minuit heure de Paris). |
| 8 | Retouche demandée | Le client demande une correction | **Vous** | `[Studio Accroche] Retouche demandée — N°` | Message du client cité. Doublée d'une notification téléphone. |
| 9 | Retouche demandée | idem | Client | `Commande N° — votre demande de retouche est bien reçue` | Sa demande citée, nombre de **tours** de retouches restants (1 tour pour chaque formule ; un tour = une seule demande consolidée). *(ajout du 21 novembre)* |
| 10 | Version corrigée | Bouton « Envoyer la version corrigée au client » | Client | `Commande N° — version corrigée à valider` | Liens privés par fichier. |
| 11 | Validation (ou clôture) | Le client valide, ou vous cliquez sur « Clôturer » | Client | `Commande N° — vos fichiers sont disponibles` | Liens privés par fichier, disponibles 90 jours, numéro de facture. |
| 11 bis | Livraison réputée acceptée | Tâche quotidienne (≈ 7 h–8 h) 14 jours après la livraison sans réponse, ou demande de retouche reçue après l'échéance | Client | `Commande N° — livraison réputée acceptée (délai de 14 jours écoulé)` | La date d'échéance, la mention de la demande tardive refusée le cas échéant, le lien vers sa commande et la marche à suivre (nouvelle commande pour toute autre demande). **Si l'envoi échoue, la commande est quand même clôturée** : la tentative est archivée (Administration → E-mails), l'historique de la commande porte « NON ENVOYÉ » et l'e-mail se renvoie d'un clic. *(ajout du 22 novembre)* |
| 12 | Validation | Le client valide | **Vous** | `[Studio Accroche] Commande validée — N°` | Information. |
| 13 | Alertes | Paiement refusé, erreur technique, e-mail non envoyé… | **Vous** | `[Studio Accroche] ⚠ …` | Toujours doublées d'une notification téléphone. |
| 14 | Récap du jour | Tâche quotidienne (≈ 7 h–8 h) | **Vous** | `[Studio Accroche] Récap du jour — N points à traiter` | Seulement s'il y a quelque chose à traiter. Mentionne aussi les commandes clôturées automatiquement dans les dernières 36 heures, avec le numéro de facture. |

## Garanties

- **Jamais de notification de vente avant le paiement confirmé** (testé : commande créée mais non payée = aucun e-mail, aucune alerte).
- **Un e-mail qui ne part pas n'est pas perdu** : archivé, signalé sur le téléphone, renvoyable.
- **Renvoi sans doublon** : « Renvoyer ces e-mails maintenant » (page E-mails) ne renvoie que ce qui est encore utile. Un e-mail déjà renvoyé avec succès, un doublon ou un message devenu inutile (la commande a avancé) n'est jamais renvoyé.
- **Les liens de téléchargement** contiennent le jeton secret de la commande ; sans lui, ou avec un autre, la réponse est 404. Ils ne fonctionnent qu'une fois la livraison envoyée.

## Comment c'est vérifié

- Tests automatiques (`npm run test:unitaires`, `npm run test:e2e`) : chaque ligne du tableau, avec contenu, destinataire, absence de doublon et gestion des pannes.
- Parcours complet en ligne (`npm run e2e:en-ligne`) : à la fin, **inventaire strict** des onze e-mails d'une commande — chacun doit exister, être réellement parti (et non seulement archivé), une seule fois, au bon destinataire.
