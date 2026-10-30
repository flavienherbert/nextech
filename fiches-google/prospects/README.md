# prospects/ : tâche 1

`fetch_places.py` interroge Places API (New), Text Search (`"{métier} à {ville}"`, 3 pages max = 60 résultats).

- Clé : `export GOOGLE_PLACES_API_KEY=...` (Places API (New) activée, facturation active). Les champs demandés (note, avis, photos, horaires) relèvent de la tranche payante « Enterprise » : vérifie le tarif en vigueur.
- **n°1** = fiche opérationnelle avec le plus d'avis. Les autres sont classés par écart d'avis décroissant avec lui (`ecart_avis_vs_n1`).
- `--min-avis` (défaut 5) écarte les fiches quasi vides (`eligible=non`). **Attention : le plus gros écart n'est pas forcément le meilleur prospect** : une fiche à 5 avis peut être une activité à l'arrêt. Regarde les 15 avant d'investir du temps.
- Colonnes : voir l'en-tête du CSV. `description_proprietaire` est toujours vide (non fournie par l'API).
- Test sans clé : `python3 make_demo_data.py` puis `fetch_places.py --from-json demo/demo_places_FICTIF.json --source FICTIF ...`.
