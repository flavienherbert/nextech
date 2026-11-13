# Configurer Stripe en mode test, sans exposer la clé

La clé ne doit apparaître ni dans une conversation, ni dans un e-mail, ni dans le dépôt Git. Elle se saisit à deux endroits seulement : un fichier local sur ton ordinateur, puis les réglages de l'hébergeur.

## 1. Récupérer une clé de test

1. Ouvre https://dashboard.stripe.com et connecte-toi.
2. Active l'environnement de test (interrupteur « Mode test » ou « Environnement de test / bac à sable », selon la version du tableau de bord). Le bandeau du haut doit l'indiquer.
3. Va dans **Développeurs → Clés API**.
4. De préférence, crée une **clé restreinte** : « Créer une clé restreinte », nom « Studio Accroche site », autorisation **Checkout Sessions : écriture**, tout le reste sur « Aucune ». Elle commence par `rk_test_`.
   À défaut, la clé secrète standard `sk_test_…` fonctionne aussi.

Une clé de test ne peut débiter personne. Une clé commençant par `sk_live_` ou `rk_live_` est une clé réelle : ne l'utilise pas à ce stade. Le site la refuserait de toute façon tant que l'ouverture n'est pas activée.

## 2. La ranger sur ton ordinateur

Dans le dossier `site`, copie `.env.example` en `.env.local`, puis renseigne dans `.env.local` :

```
STRIPE_SECRET_KEY=rk_test_…
ADMIN_PASSWORD=un-mot-de-passe-de-12-caracteres-ou-plus
SESSION_SECRET=une-longue-chaine-aleatoire-d-au-moins-32-caracteres
ADMIN_EMAIL=ton-adresse-de-notification
```

`.env.local` est ignoré par Git : il ne quittera pas ton ordinateur. Laisse `STRIPE_API_HOST` vide.

## 3. Recevoir les confirmations de paiement en local

Stripe ne peut pas joindre `localhost`. L'outil officiel Stripe CLI fait le relais.

1. Installe Stripe CLI : https://docs.stripe.com/stripe-cli
2. `stripe login` (ouvre le navigateur pour autoriser).
3. Dans un terminal, laisse tourner :
   ```
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
4. La commande affiche un secret `whsec_…`. Copie-le dans `.env.local` :
   ```
   STRIPE_WEBHOOK_SECRET=whsec_…
   ```

## 4. Vérifier

```
cd site
npm run verifier:stripe
```

Le script n'affiche jamais la clé. Il confirme qu'elle est bien une clé de test, crée une session de paiement de 25 €, la relit et la referme. Ce script a été écrit sans pouvoir être essayé contre le vrai Stripe : si un message d'erreur apparaît, copie-le tel quel dans la conversation (il ne contient pas la clé).

## 5. Faire un paiement de test

1. Premier terminal : `stripe listen …` (étape 3).
2. Second terminal : `npm run dev`.
3. Sur http://localhost:3000, commande une formule.
4. Sur la page Stripe, carte `4242 4242 4242 4242`, date future quelconque, code à 3 chiffres quelconque.
5. Tu reviens sur le site : le formulaire de brief doit s'afficher en quelques secondes.

Autres cartes utiles : `4000 0000 0000 0002` (refusée), `4000 0025 0000 3155` (authentification 3-D Secure).

À contrôler : le bandeau du site indique « Stripe en mode test », la commande apparaît dans `/admin` avec le mode « test », et le paiement figure dans le tableau de bord Stripe, côté test.

## 6. Plus tard, chez l'hébergeur

1. Dans Stripe (toujours en test) : **Développeurs → Webhooks → Ajouter un point de terminaison**.
   - Adresse : `https://<ton-site>/api/stripe/webhook`
   - Événements : `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`
2. Copie le secret de signature `whsec_…` de ce point de terminaison.
3. Dans les réglages de l'hébergeur, section « variables d'environnement », saisis `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET`, marquées comme secrètes.

## 7. Le jour de l'ouverture

Mêmes étapes avec les clés réelles et un point de terminaison créé en mode réel, plus `VENTES_REELLES=oui` et les mentions légales complètes. Sans ces deux conditions, le site garde les paiements fermés.

## Si la clé a été exposée

Dans Stripe, **Développeurs → Clés API**, « Révoquer » la clé, puis crée-en une nouvelle. Une clé de test exposée ne permet aucun débit, mais se remplace en une minute.

## Si tu préfères que Claude fasse le test

Claude peut ouvrir un formulaire sécurisé pour saisir la clé : elle est alors injectée dans les appels à Stripe sans jamais apparaître dans la conversation ni dans les fichiers. À demander explicitement.
