# Lancer les tests en local — les quatre modes de stockage

Aucune dépendance Python n'est stockée dans le dépôt (des fichiers `.whl` y avaient été ajoutés par erreur ; ils ont été retirés le 22 novembre 2026 : le build, les tests et le site n'en dépendent pas).

| Commande | Ce qu'elle vérifie |
|---|---|
| `npx tsc --noEmit` | Le typage de tout le site |
| `npm run test:unitaires` | Les modules (stockage, e-mails, alertes, suivi, secrets…) |
| `npm run test:e2e` | Le parcours complet dans un navigateur (nécessite le site lancé, le simulateur Stripe `scripts/mock-stripe.mjs` et les faux services `scripts/faux-services.mjs` ; variables dans `scripts/env-test.sh`) |
| `npm run test:csp`, `npm run test:affichage` | Politique de sécurité du contenu et affichage réel des sections |
| `npm run test:postgres` | Le pilote PostgreSQL (base de **test** uniquement) |

## Modes de stockage

- **Disque** : par défaut, rien à installer.
- **PostgreSQL** : une base PostgreSQL locale de test, variable `DATABASE_URL`.
- **S3** : un émulateur S3 local, variables `S3_*` (voir `.env.example`). Pour l'émulateur `moto`, installez-le **hors du dépôt**, dans un environnement virtuel :
  `python3 -m venv ~/venv-moto && ~/venv-moto/bin/pip install "moto[server]" && ~/venv-moto/bin/moto_server -p 5555`
- **PostgreSQL + S3** : les deux ensemble (c'est la configuration de la préproduction).

Test complet en ligne (Stripe en mode test) : `npm run e2e:en-ligne` ; procédure dans `TEST-CLIENT.md`.
