# audits/ : tâche 2

`generate_audits.py` produit un PDF A4 d'une page par prospect : tableau comparatif (prospect vs leader local), 3 manques, 3 actions.

- Manques mesurés d'abord (avis, photos, site, horaires, note). Si moins de 3 sont mesurables, le reste est marqué « à vérifier » (description, réponses aux avis) et le script affiche une ALERTE.
- Le n°1 est anonymisé. Aucune promesse de résultat.
- Source `FICTIF` : filigrane + préfixe `FICTIF_`. Exemples : `exemples_FICTIF/`.
- Sorties réelles : `audits/*.pdf` (ignorées par git).
