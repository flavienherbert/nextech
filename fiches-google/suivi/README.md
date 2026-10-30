# suivi/ : tâche 7

`bilan.py` lit `suivi.csv` (copie de `suivi_modele.csv`) et affiche : contactés, réponses, audits, ventes, CA (net des remboursements), meilleur message.

- `python3 bilan.py [--csv suivi.csv] [--semaine AAAA-MM-JJ] [--min-envois 10]`
- Semaine = lundi à dimanche. Dates `AAAA-MM-JJ`, cases `oui`/`non`.
- Le CA n'utilise que `montant_eur` renseigné (190 € n'est jamais supposé) ; vente sans montant = alerte.
- « Meilleur message » : seulement si une variante a au moins `--min-envois` envois, sinon « échantillon insuffisant ». Il se base sur le taux de réponse, pas sur les ventes (trop rares à ce volume).
- Test : `python3 bilan.py --csv suivi_exemple_FICTIF.csv --semaine 2026-11-04`.
