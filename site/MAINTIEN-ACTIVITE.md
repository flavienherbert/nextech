# Éviter la mise en pause du projet Supabase gratuit — étude

Rédigé le 15 novembre 2026. **Étude seulement : rien n'est mis en place**, et aucune de ces solutions n'est garantie.

> **Mise à jour du 16 novembre 2026 : l'option 3 est activée**, comme conséquence de votre demande de ne plus avoir à surveiller le site. La tâche quotidienne (6 h UTC, soit 7 h ou 8 h à Paris) envoie le récapitulatif des commandes en attente, relance une fois les clients dont le brief manque depuis 48 h, purge les données arrivées à échéance et lit la table des commandes. Elle est activée par la variable `TACHES_SECRET` dans Netlify ; **pour la désactiver, supprimez cette variable**. Elle ne prouve toujours pas qu'elle empêche la pause de Supabase (voir ci-dessous) ; les options 1, 2 et 4 restent à valider.

## Ce que dit la documentation officielle de Supabase

- Un projet gratuit est mis en pause s'il ne reçoit pas « suffisamment d'activité utilisateur sur la base de données au cours de la semaine passée ».
- « Typiquement, quelques requêtes par jour vers la base sur la semaine précédente suffisent ».
- Deux moyens d'activité cités : visiter le projet dans le tableau de bord ; faire des appels à l'API du projet ou envoyer des requêtes par une application connectée.
- La documentation **ne définit pas de seuil exact** et ne dit pas si une simple requête de test (`select 1`) compte comme activité.
- Un e-mail d'avertissement est envoyé environ une semaine avant la pause, un autre après.
- Un projet en pause peut être repris depuis le tableau de bord pendant 1 an, avec ses données.
- Seule une offre payante supprime la pause (exclue ici).

Ce qu'une pause change pour nous : tant qu'elle dure, le site ne peut ni lire ni écrire une commande. Un client qui paierait pendant ce temps verrait son paiement confirmé par Stripe sans que le site puisse l'enregistrer.

## Les options

| # | Solution | Coût | Avantages | Limites |
|---|---|---|---|---|
| 1 | Ne rien faire, répondre à l'e-mail d'avertissement | 0 € | Aucun code | Dépend de votre réactivité ; une pause entre l'e-mail et votre réponse coupe le site |
| 2 | Ouvrir le tableau de bord Supabase chaque semaine | 0 € | Activité explicitement reconnue par la documentation | Dépend de vous : oubli, vacances |
| 3 | Tâche planifiée Netlify, une fois par jour, qui lit la table | 0 € (quelques invocations par mois sur 300 crédits) | Automatique ; requête réelle sur la base ; disponible sur toutes les offres Netlify | Ne s'exécute que sur le déploiement publié ; compatibilité avec l'adaptateur Next.js non confirmée par la documentation ; **rien ne prouve qu'elle compte comme « activité utilisateur »** |
| 4 | Surveillance externe gratuite appelant une page de santé du site qui lit la base | 0 € | Alerte aussi en cas de panne, utile avant même la pause | Un compte tiers de plus ; une page de santé à ajouter (sans aucune donnée visible) |
| 5 | Offre Pro de Supabase | environ 25 $/mois | Pas de pause, sauvegardes quotidiennes | **Exclue** : aucun abonnement |

## Ma recommandation, sans garantie

1. **Tant que la vente est fermée** : options 1 et 2. Une pause ne coûte alors rien.
2. **À l'ouverture** : options 3 et 4 ensemble, puis observation. La seule preuve possible est empirique : si le projet n'est pas mis en pause après 2 à 3 semaines sans commande, la solution fonctionne ; une alerte de pause arrive sinon une semaine avant.
3. **Dans tous les cas**, la sauvegarde manuelle (`npm run sauvegarde`, voir `SUPABASE.md`) reste indispensable : elle protège aussi d'une pause qui tournerait mal.

Si les ventes deviennent régulières (plusieurs commandes par semaine), les commandes elles-mêmes créent l'activité et le problème disparaît.

## Ce que je ne ferai pas sans votre validation

Ajouter la fonction planifiée, la page de santé, ou créer un compte de surveillance. Si vous validez 3 et 4, la mise en place représente un petit fichier de fonction planifiée et une route de santé protégée, testés en local avant tout déploiement.
