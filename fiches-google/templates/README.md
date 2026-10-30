# templates/ : tâche 5 (livrables client)

| Fichier | Rôle |
|---|---|
| `modele_description.md` | Modèle de description (750 caractères max) + règles Google |
| `sms_avis.md` | 2 SMS d'avis (1 segment chacun) + règles anti-« review gating » |
| `generer_avant_apres.py` | PDF avant/après : `--vierge` (gabarit), `--json client.json`, `--public` (anonymise) |
| `gabarit_avant_apres_vierge.pdf` | Gabarit vide à remplir à la main |
| `avant_apres_exemple_FICTIF.json` | Structure du JSON (données fictives) |
| `generer_qr.py` | QR code d'avis (SVG, PNG, carte A6 PDF) depuis un `place_id` ou un lien court |

Sorties dans `templates/sortie/` (ignoré par git). Teste toujours le QR avec un téléphone avant impression.
