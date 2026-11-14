# LANCEMENT — état réel au 14 novembre 2026

Aucune vente réelle, aucun encaissement, rien de publié, personne contacté, 0 € dépensé.

## Bilan en trois catégories

### TERMINÉ (testé en local)

- Site : accueil, démonstration (emplacement prêt), formules 25 / 69 / 129 €, pages légales, affichage ordinateur et mobile sans débordement.
- Parcours client complet : commande, paiement simulé, brief et dépôt de fichiers, validation du script, livraison, retouche ou validation, facture spécimen. 88 vérifications de bout en bout réussies le 14 novembre.
- Administration protégée : commandes, statuts, livrables, notes, e-mails archivés.
- Photographies libres de droits, sources et licences dans `site/IMAGES.md`.
- Contact affiché dans le pied de toutes les pages dès que l'adresse du studio est renseignée.
- Prospection préparée : `commercial/DEMARRAGE.md` (client idéal, arguments, présentation, méthode), 25 prospects, 8 messages.
- Démonstration : vidéo du studio désactivée (jugée insuffisante). Exemple externe provisoire prêt mais inactif, en attente de l'accord écrit du créateur (`site/DEMO-CANDIDATS.md`). Ne pas publier le site tant que l'accueil affiche « Emplacement réservé ».

### À FAIRE PAR CLAUDE (dès que les décisions sont prises)

1. (Fait) Vidéo de démonstration activée.
2. Vérifier le site contre les vrais services : Stripe en mode test, stockage, e-mails, hébergeur en préproduction privée.
3. Compléter mentions légales, conditions de vente et factures avec les informations réelles.
4. Factures d'avoir en cas de remboursement, sauvegarde du stockage.

### À FAIRE PAR LE FONDATEUR

1. (Fait) Vidéo de démonstration choisie.
2. Micro-entreprise : en cours (déclaré par le fondateur le 14 novembre). Rien ne peut être encaissé avant le SIRET.
3. Créer l'adresse e-mail du studio.
4. Créer les comptes gratuits (hébergeur, stockage, e-mails) et saisir lui-même les clés.
5. Acheter le nom de domaine (7 à 12 € par an), seule dépense prévue.
6. Décider : vente aux professionnels uniquement, ou aussi aux particuliers (médiateur de la consommation obligatoire dans le second cas).
7. Faire relire les conditions de vente ; envoyer lui-même les messages aux prospects.

### Recherche d'une vidéo de démonstration externe (14 novembre)

Aucune vidéo gratuite ne réunit présentateur IA, produit, voix française, montage publicitaire et droit de réutilisation commerciale.
- Exemples des éditeurs d'outils (Creatify, HeyGen, Arcads…) : contenus réservés, reproduction interdite sans accord écrit (conditions de Creatify, § 7.2 et 7.4).
- Banques gratuites (Pexels, Pixabay, Coverr, Mixkit) : usage commercial autorisé, mais ce sont des plans muets de vraies personnes, sans voix ni montage, et leurs licences interdisent de suggérer une recommandation par la personne filmée ou de s'attribuer le contenu.
- Prestataires sur ComeUp ou Fiverr : leurs exemples leur appartiennent.
Conclusion : la seule démonstration honnête et gratuite est une vidéo produite par le studio.

---

Le détail ci-dessous date du 13 novembre et reste valable.

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

| Stockage durable (stockage objet), survie au redémarrage | 86 tests sur émulateur local |
| Envoi direct des fichiers au stockage, jusqu'à 300 Mo par vidéo | Test automatique |
| Factures PDF numérotées, archivées, bloquées sans informations légales | Tests automatiques et ciblés |
| Suppression des fichiers après 90 jours | Test ciblé |
| Sécurité de l'administration et des fichiers | Revue et tests, voir `site/SECURITE.md` |

88 vérifications de bout en bout sur disque, 86 sur stockage objet, 24 tests ciblés sur chacun. Rejouables (`site/README.md`).

## 2. Écrit mais pas encore vérifié en conditions réelles

| Élément | Ce qui manque pour le vérifier |
|---|---|
| Connexion au vrai Stripe (mode test) | Ta clé de test, saisie chez toi (`site/STRIPE.md`) |
| Stockage sur un vrai service (Cloudflare R2) | La création du bucket |
| Envoi réel des e-mails (Brevo ou Resend) | Un compte et un nom de domaine vérifié |
| Fonctionnement chez un hébergeur | Le choix de l'hébergeur et un déploiement de préproduction |
| Facture réelle | Les informations administratives ; seuls des spécimens ont été produits |

## 3. Préparé, non mis en service

- Fiches ComeUp et Fiverr (`listings/`).
- 25 prospects vérifiés, 8 messages personnalisés prêts (`commercial/`).
- Publicité du studio, version 0 (`publicite-studio/`), en pause.
- Dossier micro-entreprise (`ADMIN.md`).

## 4. Reste à faire côté technique

1. Vérifications en conditions réelles du § 2, dans cet ordre : Stripe test, stockage, e-mails, hébergeur.
2. Factures d'avoir en cas de remboursement, facture d'acompte : non gérées.
3. Sauvegarde du stockage.
4. Seconde démonstration dans une autre catégorie de produit (bougie ou soin), à produire plus tard.

## 5. Ce qui nécessite ton intervention

| Action | Pourquoi |
|---|---|
| Tester toi-même une commande (`npm run demo`) | Valider le parcours avant d'aller plus loin |
| Configurer ta clé Stripe de test | `site/STRIPE.md`, sans la communiquer |
| Créer la micro-entreprise | SIRET obligatoire pour encaisser |
| Créer une adresse e-mail dédiée | Contact, notifications, mentions légales |
| Choisir un médiateur de la consommation | Mention obligatoire pour vendre à des particuliers |
| Valider les choix techniques | `site/CHOIX-TECHNIQUES.md` |
| Interroger un comptable sur la facturation | Date d'émission de la facture quand le paiement précède la livraison |
| Faire relire les conditions de vente | Rédigées avec soin, non relues par un juriste |
| Vérifier les marques INPI « accroche » | Non lisible automatiquement |
| Envoyer les messages aux prospects | Seulement après mise en ligne et SIRET |

## 6. Ce qui nécessitera une dépense

Comparatif complet dans `site/CHOIX-TECHNIQUES.md`.

| Poste | Choix proposé | Coût |
|---|---|---|
| Hébergement | Netlify, offre gratuite (repli : Render ou Fly.io, 3 à 8 $/mois) | 0 € |
| Stockage | Cloudflare R2 | 0 € jusqu'à 10 Go |
| E-mails | Brevo, offre gratuite | 0 € |
| Nom de domaine | .fr ou .com | ~7 à 12 € par an |
| Médiateur de la consommation | À choisir | Variable |
| Stripe | Commission par paiement | Aucun abonnement |

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
