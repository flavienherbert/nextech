# Test client de bout en bout en préproduction — procédure

Rédigé le 15 novembre 2026. À faire quand `npm run verifier:en-ligne` ne signale plus aucun échec (base, stockage, e-mails, Stripe test). Aucun paiement réel : Stripe reste en mode test, la carte `4242 4242 4242 4242` ne débite rien.

## Prérequis (tout doit être au vert dans « Diagnostic » de l'administration)

| Élément | Vérifié par le diagnostic |
|---|---|
| Base PostgreSQL | connexion chiffrée, table, sécurité, écritures atomiques |
| Stockage Supabase | envoi, lecture, liens temporaires, accès privé, suppression |
| E-mails Brevo | clé valide, expéditeur validé |
| Stripe test | clé de test, webhook enregistré avec les bons événements |
| Factures | génération d'un PDF sur le serveur |

## Déroulé (vous jouez le client, environ 20 minutes)

1. **Commande.** Ouvrez la préproduction (mot de passe du site), choisissez l'Essai, cochez les deux cases, payez avec `4242 4242 4242 4242`, date future, code à 3 chiffres quelconque.
   - Attendu : retour sur la page de suivi, statut « paiement confirmé » en quelques secondes, e-mail de confirmation reçu.
2. **Brief.** Remplissez le brief avec une vraie adresse e-mail (la vôtre) et déposez 2 photos JPG/PNG, puis un fichier MP4 de 20 à 40 Mo.
   - Attendu : chaque fichier s'envoie, la liste affiche leur taille ; e-mail « brief bien reçu ».
3. **Côté studio** (`/admin`). La commande apparaît avec le brief et les fichiers téléchargeables. Passez-la « En production » (le client reçoit un e-mail), déposez une vidéo de 20 à 50 Mo comme livrable, passez « En attente de validation », puis « Livrée ».
   - Attendu : e-mails correspondants ; une facture **spécimen** est émise à la livraison (jamais une vraie facture hors ventes réelles).
4. **Côté client.** Rouvrez le lien privé de suivi, téléchargez la vidéo et la facture (téléchargement direct, lien temporaire de 5 minutes), demandez une retouche, puis validez.
5. **Persistance.** Je redéploie la préproduction ; la commande, les fichiers et la facture doivent toujours être là.

## Ce que je vérifie ensuite, sans rien vous demander

- statuts, journal et facture de la commande, dans l'administration ;
- présence des e-mails archivés et de leur résultat d'envoi (« envoyé » ou échec détaillé) ;
- objets présents dans le stockage, taille conforme ;
- aucune ligne de test résiduelle ; diagnostic toujours entièrement vert ;
- puis `npm run sauvegarde` / `npm run restauration` sur ces données.

## Si quelque chose échoue

Notez l'étape et le message affiché (capture d'écran). Les e-mails en échec se renvoient depuis `/admin/courriels`. Rien de ce test n'est public ni réel.
