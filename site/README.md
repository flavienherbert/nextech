# Site Studio Accroche

Site de vente et de gestion des commandes : vitrine, paiement Stripe, brief client, espace administrateur, livraison.

## Tester une commande complète sur son ordinateur (aucun compte nécessaire)

Prérequis : Node.js 20 ou plus.

```bash
cd site
npm install
npm run demo
```

- Site : http://localhost:3000
- Administration : http://localhost:3000/admin — mot de passe `demonstration`
- Le paiement est **simulé** : une fausse page de paiement remplace Stripe, rien n'est débité.
- Les e-mails ne partent pas : ils sont lisibles dans Administration → E-mails.

Parcours à suivre :
1. Accueil → choisir une formule → cocher les deux cases → Payer.
2. Sur la page de paiement simulée : Payer.
3. Remplir le brief, déposer une ou deux images, envoyer.
4. Ouvrir /admin : la commande apparaît avec le brief et les fichiers.
5. Passer la commande « En production », ajouter une vidéo comme livrable, puis « En attente de validation ».
6. Revenir sur la page du client (lien privé affiché dans l'administration) : télécharger, demander une retouche ou valider.

Pour repartir de zéro : supprimer le dossier `site/data`.

## Tests automatiques

```bash
npm run demo:prod          # dans un premier terminal
npm run test:e2e           # dans un second
```

63 vérifications : parcours complet, administration, livraison, et tentatives de fraude (retour sans paiement, webhook sans signature, signature fausse, rejeu, corps modifié, montant falsifié, paiement d'une autre commande, doublon).

## Brancher le vrai Stripe en mode test

1. Dans le tableau de bord Stripe, activer le **mode test** et copier la clé secrète `sk_test_…`.
2. Créer un point de terminaison de webhook vers `<adresse du site>/api/stripe/webhook`, événements `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`. Copier son secret `whsec_…`.
3. Renseigner `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` (voir `.env.example`), laisser `STRIPE_API_HOST` vide.
4. Payer avec la carte de test `4242 4242 4242 4242`, date future, code quelconque.

En local, Stripe ne peut pas joindre `localhost` : utiliser la commande `stripe listen --forward-to localhost:3000/api/stripe/webhook` de l'outil Stripe CLI, qui affiche le secret à utiliser.

## Sécurité du paiement

- Une commande n'est marquée payée que par le webhook, jamais par l'arrivée sur la page de retour.
- La signature Stripe est vérifiée sur le corps brut ; un événement de plus de 5 minutes est refusé.
- Avant de valider, le site relit la session auprès de Stripe : état payé, montant, devise, rattachement à la commande.
- Chaque événement n'est traité qu'une fois.
- Une clé réelle est refusée tant que `VENTES_REELLES=oui` n'est pas défini et que les mentions légales sont incomplètes.

## Organisation du code

| Dossier | Rôle |
|---|---|
| `lib/formules.ts` | Formules et prix (source unique) |
| `lib/commandes.ts` | Règles : création, confirmation de paiement, brief, statuts |
| `lib/store.ts` | Stockage sur disque des commandes, fichiers, e-mails |
| `lib/mail.ts` | Modèles et envoi des e-mails |
| `lib/auth.ts` | Session de l'espace administrateur |
| `app/api/` | Paiement, webhook, brief, fichiers, validation |
| `app/commander/`, `app/commande/` | Parcours du client |
| `app/admin/` | Espace administrateur |
| `scripts/` | Simulateur Stripe, lanceur de démonstration, tests |

## Limites connues

- Le stockage est un dossier sur disque : il faut un hébergeur avec disque persistant, ou écrire un pilote de stockage objet avant la mise en ligne.
- Les fichiers passent par le serveur (40 Mo maximum par fichier) : sur un hébergement « sans serveur », cette limite tombe à quelques mégaoctets.
- L'envoi réel des e-mails (Resend) est écrit mais n'a pas été testé.
- Aucune facture n'est générée automatiquement.
