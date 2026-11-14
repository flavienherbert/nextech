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
npm run test:e2e           # dans un second : parcours complet, fraude, factures, sécurité
npm run test:unitaires     # concurrence, factures, purge, e-mails
```

Test d'affichage, à lancer aussi contre `npm run demo` (mode développement) :

```bash
MODE=dev  BASE=http://localhost:3000 npm run test:affichage   # avec « npm run demo »
MODE=prod BASE=http://localhost:3000 npm run test:affichage   # avec « npm run demo:prod »
```

Il vérifie que toutes les sections sont réellement visibles sur ordinateur et sur mobile, qu'aucune erreur n'apparaît dans la console, et que `'unsafe-eval'` n'est autorisé qu'en développement.

88 vérifications de bout en bout sur disque, 86 sur stockage objet (émulateur local), et 24 tests ciblés sur chaque stockage. Variables de test : `scripts/env-test.sh`.

## Documents

- `STRIPE.md` : configurer la clé de test sans l'exposer.
- `CHOIX-TECHNIQUES.md` : hébergement, stockage, e-mails, coûts.
- `SECURITE.md` : revue de sécurité et risques restants.

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
| `lib/depot.ts` | Stockage : pilotes disque et stockage objet |
| `lib/store.ts` | Commandes, compteurs, e-mails archivés |
| `lib/fichiers.ts` | Dépôt et téléchargement des fichiers privés |
| `lib/factures.ts` | Factures PDF |
| `lib/purge.ts` | Suppression des fichiers après 90 jours |
| `lib/mail.ts` | Modèles et envoi des e-mails (Brevo, Resend) |
| `lib/auth.ts` | Session de l'espace administrateur |
| `app/api/` | Paiement, webhook, brief, fichiers, validation |
| `app/commander/`, `app/commande/` | Parcours du client |
| `app/admin/` | Espace administrateur |
| `scripts/` | Simulateur Stripe, lanceur de démonstration, tests |

## Factures

- Émises automatiquement à la livraison, ou à la main depuis la fiche de commande.
- Numérotation continue par année (`F-2026-0001`), sans trou ni doublon, archivage en PDF.
- Bloquées tant que le nom, le SIRET, l'adresse et l'e-mail du vendeur ne sont pas renseignés, ou que le client n'a pas donné son nom et son adresse de facturation.
- Hors ventes réelles, le document est un **spécimen** filigrané, numéroté à part (`SPECIMEN-…`), invisible pour le client.
- Non géré : les factures d'avoir (remboursement) et la facture d'acompte.

## Limites connues

- Aucun test contre le vrai Stripe, un vrai stockage objet, un vrai service d'e-mail ni un vrai hébergeur.
- Passage à la version majeure suivante du cadre technique (Next.js 16) non fait.
- Liste des commandes relue en entier à chaque affichage : suffisant jusqu'à quelques centaines de commandes.
