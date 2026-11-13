# LANCEMENT — état réel au 13 novembre 2026

Aucune vente réelle, aucun encaissement, rien de publié, personne contacté, 0 € dépensé.

## 1. Terminé et vérifié (fonctionne réellement, en local)

| Élément | Preuve |
|---|---|
| Page d'accueil cinématique, visuels fixes | Contrôlée sur ordinateur (1440 px) et mobile (390 px), aucun débordement |
| Trois formules avec prix, vidéos livrées, durée, délai | Test automatique |
| Page de commande avec récapitulatif et cases obligatoires | Test automatique |
| Création de commande avec numéro unique | Test automatique |
| Confirmation du paiement par webhook signé | 12 tests de fraude réussis |
| Formulaire de brief et dépôt de fichiers privés | Test automatique |
| Notifications : confirmation client, paiement, brief, production, validation, livraison | Rédigées et archivées à chaque étape |
| Espace administrateur protégé : liste, détail, statuts, livrables, notes | Test automatique |
| Livraison par lien privé, validation ou retouche par le client | Test automatique |
| Paiement annulé ou expiré | Test automatique |
| Paiements fermés sans autorisation explicite | Vérifié dans 3 configurations |
| Pages légales : mentions, conditions de vente, confidentialité | Affichées, liens vérifiés |

63 vérifications automatiques sur 63, rejouables (`site/README.md`).

## 2. Écrit mais pas encore vérifié en conditions réelles

| Élément | Ce qui manque pour le vérifier |
|---|---|
| Connexion au vrai Stripe (mode test) | Une clé de test du fondateur. Tous les tests ont tourné contre un simulateur local qui signe comme Stripe. |
| Envoi réel des e-mails | Un compte de service d'envoi et un nom de domaine vérifié |
| Fonctionnement chez un hébergeur | Le choix de l'hébergeur |

## 3. Préparé, non mis en service

- Fiches ComeUp et Fiverr (`listings/`).
- 25 prospects vérifiés, 8 messages personnalisés prêts (`commercial/`).
- Publicité du studio, version 0 (`publicite-studio/`), en pause.
- Dossier micro-entreprise (`ADMIN.md`).

## 4. Reste à faire côté technique

1. Vérifier le parcours contre Stripe en mode test.
2. Choisir l'hébergeur, puis adapter le stockage si son disque n'est pas persistant.
3. Brancher l'envoi réel des e-mails.
4. Facturation : aujourd'hui aucune facture n'est produite.
5. Suppression automatique des fichiers après 90 jours, annoncée dans la politique de confidentialité et non encore programmée.
6. Vidéo de démonstration de qualité à remettre sur l'accueil quand elle existera.

## 5. Ce qui nécessite ton intervention

| Action | Pourquoi |
|---|---|
| Tester toi-même une commande (`npm run demo`) | Valider le parcours avant d'aller plus loin |
| Fournir une clé Stripe de test | Vérification contre le vrai Stripe |
| Créer la micro-entreprise | SIRET obligatoire pour encaisser |
| Créer une adresse e-mail dédiée | Contact, notifications, mentions légales |
| Choisir un médiateur de la consommation | Mention obligatoire pour vendre à des particuliers |
| Choisir l'hébergeur | Voir § 6 |
| Faire relire les conditions de vente | Rédigées avec soin, non relues par un juriste |
| Vérifier les marques INPI « accroche » | Non lisible automatiquement |
| Envoyer les messages aux prospects | Seulement après mise en ligne et SIRET |

## 6. Ce qui nécessitera une dépense

| Poste | Coût | Remarque |
|---|---|---|
| Hébergement | 0 à ~20 €/mois | L'offre gratuite de Vercel interdit l'usage commercial. Il faut soit une offre payante, soit un hébergeur dont l'offre gratuite l'autorise, soit un petit serveur. À chiffrer au moment du choix. |
| Nom de domaine | ~7 à 12 €/an | Nécessaire pour envoyer des e-mails fiables et pour l'adresse du site |
| Médiateur de la consommation | Variable | Certains demandent une adhésion annuelle |
| Envoi d'e-mails | 0 € au départ | Offres gratuites suffisantes pour ce volume, à vérifier |
| Stripe | Commission par paiement | Aucun abonnement |
| Crédits de génération vidéo | Par commande | Voir BUSINESS.md |

Rien de tout cela n'a été souscrit.

## 7. Informations légales manquantes

À renseigner dans la configuration (voir `site/.env.example`), aucune n'est inventée sur le site :
nom du titulaire, SIRET, adresse, e-mail de contact, hébergeur, médiateur.

Tant que nom, SIRET, adresse et e-mail sont vides, le site affiche un bandeau « préproduction », les pages légales signalent qu'elles sont incomplètes, et une clé Stripe réelle est refusée.

## 8. Ordre conseillé jusqu'à l'ouverture

1. Tu testes le parcours en local.
2. Tu lances la micro-entreprise et crées l'adresse e-mail (délai : 1 à 2 semaines).
3. Pendant ce délai : test contre Stripe en mode test, choix de l'hébergeur, mise en ligne en préproduction, e-mails réels.
4. SIRET reçu : mentions légales complétées, relecture des conditions, médiateur.
5. Ouverture : `VENTES_REELLES=oui`, clé Stripe réelle, une commande réelle de contrôle à 25 € que tu te rembourses.
6. Fiches marketplace et premiers messages aux prospects.
