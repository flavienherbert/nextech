# Sécurité — revue du 13 novembre 2026

Revue faite par lecture du code et par tests automatisés. Ce n'est pas un audit indépendant ni un test d'intrusion.

## Ce qui est protégé, et comment c'est vérifié

| Sujet | Mesure | Vérification |
|---|---|---|
| Accès à l'administration | Mot de passe d'au moins 12 caractères, session signée de 12 heures, cookie inaccessible aux scripts | Tests : accès refusé sans session, mauvais mot de passe refusé, cookie modifié refusé |
| Recherche du mot de passe par essais | 5 échecs par quart d'heure et par adresse, 1 seconde de délai par échec | Lecture du code ; limite constatée pendant les essais |
| Actions déclenchées depuis un autre site | Vérification de l'origine sur les dépôts de fichiers ; protection intégrée du cadre pour les formulaires | Test : requête d'une autre origine refusée |
| Fichiers des clients | Lisibles uniquement par l'administrateur connecté | Test : 401 sans session |
| Vidéos livrées | Téléchargeables uniquement avec le lien secret, et seulement une fois la commande en validation ou livrée | Tests : 404 avant, 404 avec un autre lien |
| Factures | Administrateur uniquement ; un spécimen n'est jamais remis au client | Tests |
| Lien secret de commande | 48 caractères aléatoires, comparaison à temps constant, jamais transmis à un autre site | Tests : lien inconnu refusé, en-tête de non-divulgation présent |
| Dépôt de fichiers | Autorisation signée par fichier ; types limités ; taille annoncée contrôlée ; **contenu comparé au type annoncé** | Tests : fichier déguisé refusé, autorisation falsifiée refusée, envoi plus gros qu'annoncé refusé |
| Fichiers servis | Toujours en téléchargement, jamais affichés par le site | Test |
| Noms de fichiers et chemins | Identifiants aléatoires ; clés de stockage filtrées | Test : chemins remontants refusés |
| Paiement | Webhook signé, anti-rejeu, relecture de la session, montant et rattachement contrôlés, traitement unique | 12 tests de fraude |
| Opérations simultanées | Écritures conditionnelles : pas d'écrasement, pas de double numéro de facture | Tests à 20, 25 et 30 opérations simultanées, sur un et trois processus |
| Contenu saisi par les clients | Échappé à l'affichage et dans les e-mails | Test avec du code injecté dans le brief |
| Navigateur | Politique de contenu, interdiction d'affichage dans un cadre, HTTPS imposé, pas d'en-tête révélant la technologie | Test |
| Moteurs de recherche | Administration, commandes et API exclues | Test |
| Création de commandes en rafale | 8 par adresse et par quart d'heure | Lecture du code (désactivé pendant les tests) |
| Dépendances | Aucune vulnérabilité connue après correction d'une dépendance | `npm audit` : 0 |
| Durée de conservation | Fichiers supprimés 90 jours après livraison, commandes impayées après 30 jours | Test |
| Paiements réels | Fermés sans autorisation explicite et mentions légales complètes | Test dans 3 configurations |

## Défauts trouvés et corrigés pendant cette revue

1. Les fichiers n'étaient contrôlés que sur leur nom et leur type annoncé : un programme renommé en image passait. Le contenu est maintenant vérifié.
2. Le lien secret d'une commande pouvait être transmis à un site tiers par le navigateur. Bloqué.
3. Le compteur de numéros de facture pouvait donner deux fois le même numéro si plusieurs processus partageaient le même disque. Corrigé par un verrou, vérifié avec trois processus.
4. Sous forte concurrence, ce même compteur abandonnait. Corrigé.
5. La limite d'essais de connexion comptait aussi les connexions réussies. Corrigé.
6. Aucun en-tête de sécurité n'était envoyé. Ajoutés.
7. Une dépendance de compilation avait une vulnérabilité connue. Version corrigée imposée.

## Risques qui restent, à connaître

| Risque | Gravité | Ce qu'il faudrait pour le réduire |
|---|---|---|
| Un seul mot de passe administrateur, sans double authentification | Moyenne | Mot de passe long, unique, dans un gestionnaire de mots de passe. Double authentification à développer si l'activité grandit. |
| La limite d'essais vit dans la mémoire du serveur : elle repart de zéro à chaque redémarrage et ne se partage pas entre plusieurs instances | Faible avec un mot de passe long | Compteur partagé dans le stockage |
| Une session volée reste valable jusqu'à 12 heures | Faible | Changer `SESSION_SECRET` déconnecte tout le monde immédiatement |
| Le lien de commande vaut mot de passe : quiconque l'obtient voit la commande et télécharge les vidéos | Moyenne, inhérente au principe | Ne jamais le transférer. Il figure dans les e-mails du client et, chez l'hébergeur, dans les journaux d'accès. |
| Aucune analyse antivirus des fichiers reçus | Faible | Types limités aux images, vidéos et PDF, contenu vérifié. Ouvrir les fichiers des clients avec les précautions habituelles. |
| La politique de contenu autorise les scripts intégrés à la page | Faible | Exigence du cadre technique sans réglage plus poussé |
| Aucune sauvegarde du stockage | Moyenne | Activer la conservation des versions sur le bucket, ou une copie périodique |
| Suppression accidentelle par l'administrateur | Faible | Seuls les livrables peuvent être retirés ; les commandes et factures ne sont jamais supprimables depuis l'interface |

## Ce qui n'a pas pu être vérifié

- Le comportement sur un vrai hébergeur (journaux, adresse du visiteur, HTTPS).
- Le vrai Stripe, le vrai stockage objet, l'envoi réel d'e-mails.
- La résistance à une attaque menée par un spécialiste.

## Bonnes pratiques côté fondateur

- Mot de passe administrateur et `SESSION_SECRET` générés par un gestionnaire de mots de passe, jamais réutilisés.
- Clés Stripe, clés de stockage et clé d'e-mail saisies uniquement chez l'hébergeur et dans `.env.local`.
- Double authentification activée sur Stripe, l'hébergeur, le stockage et le registraire du domaine : ces comptes protègent tout le reste.
