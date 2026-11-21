# Test final de commande et d'e-mails en préproduction — procédure

Mise à jour du 21 novembre 2026. Aucun paiement réel : Stripe reste en **mode test**, la carte `4242 4242 4242 4242` ne débite rien. Le site n'est pas ouvert commercialement.

## Avant le test (rien à faire si tout est vert)

`npm run verifier:en-ligne` (ou Administration, Diagnostic) doit afficher **zéro échec** : base, stockage, Stripe test et webhook, **e-mails** (Gmail ou Brevo valide), notifications. Tant que la ligne « Messagerie SMTP » ou « Clé Brevo » est rouge, les e-mails ne partent pas : le test s'arrête là. Voir `MISE-EN-LIGNE.md`, « Bloc A ».

## Ce que vous faites (5 minutes)

1. Ouvrez https://studio-accroche-preprod.netlify.app/commander/test, cochez les deux cases, payez avec `4242 4242 4242 4242`, une date future, `123`, un nom, et **une adresse e-mail à vous** (contactstudioaccroche+client@gmail.com arrive dans la même boîte).
2. Sur la page qui s'affiche, **ne remplissez pas le site internet** (c'est le point à tester) ; remplissez le reste du brief, déposez une image, envoyez.
3. Dites-moi « commande passée ».

## Ce que je fais ensuite, seul

`ADMIN_PASSWORD=… NTFY_TOPIC=… COMMANDE_PAYEE=1 npm run e2e:en-ligne` :

- reprise sur votre commande payée, brief reçu sans site ;
- production, dépôt d'une vidéo et d'un PDF, livraison ;
- le « client » télécharge par les liens de l'e-mail, demande une correction, reçoit la version corrigée, valide ;
- clôture, facture ;
- **inventaire strict des onze e-mails** (`EMAILS.md`) : chacun existe, est réellement parti, une seule fois, au bon destinataire ;
- notifications téléphone (nouvelle commande, correction).

Je confirme ensuite la réception réelle : les e-mails clients dans la boîte que mon outil Gmail peut lire (flavienherbert5@gmail.com, si vous l'utilisez comme adresse client), et les événements « delivered » côté Brevo si Brevo a servi.

## Si quelque chose échoue

La ligne ✗ du script dit laquelle. Les e-mails en échec se renvoient depuis Administration, E-mails, sans doublon. Rien de ce test n'est public ni réel.
