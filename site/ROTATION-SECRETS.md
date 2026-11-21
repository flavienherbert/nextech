# Remplacer les secrets exposés — procédure

Préparée le 22 novembre 2026. **Rien n'est à faire tant que vous n'avez pas donné le feu vert** : aucun déploiement n'est lancé, rien n'est modifié dans Netlify par l'assistant.

## Pourquoi

Les variables `ADMIN_PASSWORD`, `SESSION_SECRET` et `TACHES_SECRET` ont été créées dans Netlify comme **non secrètes** : leurs valeurs sont lisibles dans l'interface et par l'API Netlify, disponibles pendant la compilation, et ont été **affichées dans les sorties de l'assistant les 15 et 16 novembre**. Un mot de passe ou une clé qui a été affiché doit être remplacé.

Gravité si on ne fait rien : avec les trois valeurs, quelqu'un qui aurait lu ces sorties pourrait se connecter à `/admin` (mot de passe), déclencher la tâche quotidienne (`TACHES_SECRET`). Depuis la mise à jour de sécurité (non encore en ligne), `SESSION_SECRET` seul ne suffit plus à fabriquer une session.

Recommandé aussi : le **sujet ntfy** (`NTFY_TOPIC`) a été affiché de la même façon. Celui qui le connaît peut lire vos notifications (sans donnée personnelle) ou en envoyer de fausses. Même procédure (voir « Bonus » en bas).

## Ce qui change quand c'est fait

| Variable | Conséquence |
|---|---|
| `ADMIN_PASSWORD` | Vous vous connectez avec le nouveau mot de passe. L'ancien est refusé. |
| `SESSION_SECRET` | Toutes les sessions sont fermées (reconnexion). Un mot de passe d'application Gmail enregistré dans Administration, Réglages e-mail devra être **ressaisi** (la page vous le signale). |
| `TACHES_SECRET` | La tâche quotidienne (récap du matin, relance du brief) utilise la nouvelle valeur dès le déploiement. |

Les nouvelles valeurs ne s'appliquent **qu'au prochain déploiement** : le site actuellement en ligne continue de fonctionner avec les anciennes jusque-là. Prévoyez donc de remplacer les secrets **juste avant** la publication prévue (une publication consomme 15 crédits Netlify ; ne la multipliez pas).

## Étape 1 — Préparer les nouvelles valeurs (5 minutes, sur votre ordinateur)

Ne les écrivez dans aucun e-mail, aucune conversation, aucun fichier du projet. Gardez-les dans votre **gestionnaire de mots de passe**.

| Variable | Valeur à préparer | Minimum exigé par le site |
|---|---|---|
| `ADMIN_PASSWORD` | Un mot de passe **que vous choisissez**, unique, d'au moins 16 caractères (20 ou plus recommandé) | 12 |
| `SESSION_SECRET` | 64 caractères aléatoires | 32 |
| `TACHES_SECRET` | 48 caractères aléatoires | 24 |

Pour générer les deux valeurs aléatoires : soit le générateur de votre gestionnaire de mots de passe (longueur 64 puis 48, lettres et chiffres seulement), soit, dans PowerShell, cette commande **une fois par valeur** (elle affiche 64 caractères ; remplacez `32` par `24` pour la valeur de 48) :

```powershell
$o = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($o); -join ($o | ForEach-Object { $_.ToString('x2') })
```

## Étape 2 — Les remplacer dans Netlify (10 minutes)

Netlify, projet `studio-accroche-preprod`, *Site configuration*, *Environment variables*. Pour **chacune des trois variables** :

1. Ouvrez-la et **supprimez-la** (l'ancienne valeur disparaît).
2. **Add a variable**, même nom exactement.
3. Collez la nouvelle valeur.
4. Cochez **« Contains secret values »** (c'est le point essentiel : la valeur ne sera plus jamais affichée, même à vous).
5. Portées : **Builds, Functions, Runtime** (décochez « Post processing » si elle est proposée). Contextes : tous (valeur identique partout).
6. Enregistrez.

Si Netlify refuse l'enregistrement (message de limite de crédits), notez le message et dites-le moi : ne contournez pas.

## Étape 3 — Me prévenir, sans me donner les valeurs

Écrivez-moi « secrets remplacés ». Je fais alors **la seule publication** (après votre feu vert explicite et si le quota est rétabli).

## Étape 4 — Après la publication

1. Reconnectez-vous à `/admin` avec le **nouveau** mot de passe. L'ancien doit être refusé.
2. Administration, Diagnostic : « ADMIN_PASSWORD », « SESSION_SECRET » en vert ; la ligne « Tâche quotidienne » indique « secret configuré ».
3. Administration, Réglages e-mail : si un message dit que le mot de passe enregistré est illisible, ressaisissez le mot de passe d'application Gmail.

## Mes tests en ligne après le remplacement

Mes scripts de vérification se connectent à `/admin` avec le mot de passe administrateur. Après le remplacement, je ne le connais plus (et ne dois pas le connaître). Deux possibilités :

- **A — Le plus simple, sans rien partager.** Vous faites vous-même les gestes d'administration du test final (démarrer la production, déposer la vidéo, envoyer la livraison : 3 minutes, `MODE-EMPLOI.md`) et je vérifie tout ce qui ne demande pas de connexion (pages publiques, liens de téléchargement, notifications téléphone, boîte e-mail de test).
- **B — Test entièrement automatique.** Vous mettez un mot de passe **temporaire** dans `ADMIN_PASSWORD` pour la publication, vous me le communiquez, je lance tout le test, puis vous le remplacez par votre mot de passe définitif (**une seconde publication, 15 crédits**). Seul le mot de passe temporaire est exposé ; le définitif ne l'est jamais.

## Si quelque chose ne va pas

- « Espace non configuré » à la connexion : une valeur est trop courte (voir le tableau de l'étape 1). Corrigez-la dans Netlify, puis nouvelle publication.
- Vous n'arrivez plus à vous connecter : la valeur collée contient probablement un espace ou un retour à la ligne en trop. Vérifiez dans votre gestionnaire, recollez, nouvelle publication.
- Rien n'est irréversible : les commandes, fichiers et e-mails sont dans Supabase et ne dépendent d'aucun de ces trois secrets.

## Bonus : le sujet ntfy

1. Choisissez un nouveau sujet (ex. `sa-` suivi de 20 lettres et chiffres aléatoires, à garder privé).
2. Remplacez la variable `NTFY_TOPIC` dans Netlify (cette fois **sans** cocher « secret » si vous voulez pouvoir la relire ; le sujet s'affiche dans Administration, Mode d'emploi, après connexion).
3. Après la publication, dans l'application ntfy du téléphone : supprimez l'ancien abonnement et abonnez-vous au nouveau sujet.
