# messages/ : tâche 3

`generate_messages.py` écrit `messages.csv` : un brouillon par prospect (5 lignes max : bonjour, point positif, manque chiffré, question fermée, signature).

- **Rien n'est envoyé.** Statut `A_VALIDER` : tu relis, corriges, envoies toi-même.
- Point positif tiré des données (note, site, horaires, photos). Aucun vérifiable = message vide + alerte `AUCUN_POINT_POSITIF_VERIFIABLE`.
- 3 variantes A/B/C (seule la question finale change), en rotation. `suivi/bilan.py` les compare.
- Reporte `prospect_id` et `variante` dans `suivi/suivi.csv` à chaque envoi.
- Exemple fictif : `messages_FICTIF_exemple.csv`.
