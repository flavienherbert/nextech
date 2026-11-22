# Lancer les tests en local — les quatre modes de stockage

Aucune dépendance Python n'est stockée dans le dépôt (des fichiers `.whl` y avaient été ajoutés par erreur ; ils ont été retirés le 22 novembre 2026 : le build, les tests et le site n'en dépendent pas).

| Commande | Ce qu'elle vérifie |
|---|---|
| `npx tsc --noEmit` | Le typage de tout le site |
| `npm run test:unitaires` | Les modules (stockage, e-mails, alertes, suivi, secrets…) |
| `npm run test:e2e` | Le parcours complet dans un navigateur (nécessite le site lancé, le simulateur Stripe `scripts/mock-stripe.mjs` et les faux services `scripts/faux-services.mjs` ; variables dans `scripts/env-test.sh`) |
| `node scripts/e2e-medias.mjs` | Images et vidéos du site : envoi, contrôles, route publique, lecture par plages, cache, section Exemples, retour à l'origine (site lancé ; **ffmpeg** requis pour fabriquer les fichiers de test) |
| `npm run test:csp`, `npm run test:affichage` | Politique de sécurité du contenu et affichage réel des sections |
| `npm run test:postgres` | Le pilote PostgreSQL (base de **test** uniquement) |

## Résultats du 22 novembre 2026 (code livré dans cette version)

| Vérification | Disque | PostgreSQL + disque | PostgreSQL + S3 | S3 seul |
|---|---|---|---|---|
| Tests ciblés (`npm run test:unitaires`) | 239/239 | 239/239 | 239/239 | 239/239 |
| Parcours complet dans le navigateur (`npm run test:e2e`) | 210/210 | 210/210 | 209/209 | — |
| Images et vidéos du site (`scripts/e2e-medias.mjs`) | 33/33 | 33/33 | 33/33 | — |

Aussi : pilote PostgreSQL (`npm run test:postgres`) réussi ; politique de sécurité et affichage réel (`npm run test:csp`) 31/31 ; affichage de la version compilée (`scripts/test-affichage.mjs`) 57/57 dans chaque mode ; `npx tsc --noEmit` sans erreur ; `npm audit` : 0 vulnérabilité.

Rien de tout cela ne prouve le comportement **en ligne** (hébergeur, vrai Stripe, vrai stockage Supabase pour les médias, e-mails réels) : voir `TEST-CLIENT.md`.

## Délai de 14 jours (22 novembre 2026)

Règle : le délai court de chaque mise à disposition réelle (première version ou version corrigée ; renvoyer l'e-mail ne le relance pas), en jours civils, heure de Paris. Il expire à 23 h 59 min 59 s, heure de Paris, le 14e jour qui suit la livraison. Une demande de retouche reçue ensuite est refusée (409) sans être décomptée, la commande est clôturée automatiquement, le client est prévenu par e-mail ; si l'e-mail ne part pas, la commande est clôturée quand même et la tentative reste archivée (« NON ENVOYÉ » dans l'historique, renvoi possible).

`scripts/tests-unitaires.mts` (bloc « Délai de 14 jours ») : 11 calculs d'échéance (hiver, été, passages à l'heure d'hiver du 25 octobre 2026 et à l'heure d'été du 28 mars 2027, livraisons juste avant et juste après minuit de Paris, fin d'année), précision à la milliseconde, indépendance vis-à-vis du fuseau du serveur (UTC, Los Angeles, Tokyo, Auckland, Paris), 13 / 14 / 15 jours, refus de la retouche tardive par la route du client, aucun tour décompté, seconde tentative tracée, quatre exécutions simultanées sans doublon, tâche quotidienne et ouverture de l'administration, e-mail impossible (échec tracé et rattrapable), anciennes commandes sans date de livraison enregistrée. `scripts/e2e.mjs` : échéance affichée dans l'e-mail de livraison, sur la page du client et sur la commande ; aucune clôture avant l'échéance.

## Contrat de prix et de retouches (22 novembre 2026)

`lib/formules.ts` est la source unique des prix (35 / 89 / 169 €), des durées (15 secondes maximum) et des tours de retouches (1 / 2 / 2). Les tests gardent ce contrat : `scripts/tests-unitaires.mts` (« Cohérence du catalogue » : aucun prix, aucune durée ni nombre de retouches écrits à la main dans `app/` et `lib/`), `scripts/e2e.mjs` (constantes `PRIX` : montants Stripe, pages, conditions de vente), `scripts/test-affichage.mjs`. Pour changer un prix : modifier `lib/formules.ts` **et** les constantes `PRIX` de ces scripts (le test échoue sinon, volontairement).

## Modes de stockage

- **Disque** : par défaut, rien à installer.
- **PostgreSQL** : une base PostgreSQL locale de test, variable `DATABASE_URL`.
- **S3** : un émulateur S3 local, variables `S3_*` (voir `.env.example`). Pour l'émulateur `moto`, installez-le **hors du dépôt**, dans un environnement virtuel :
  `python3 -m venv ~/venv-moto && ~/venv-moto/bin/pip install "moto[server]" && ~/venv-moto/bin/moto_server -p 5555`
- **PostgreSQL + S3** : les deux ensemble (c'est la configuration de la préproduction).

Test complet en ligne (Stripe en mode test) : `npm run e2e:en-ligne` ; procédure dans `TEST-CLIENT.md`.
