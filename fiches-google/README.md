# Remise à niveau de fiches Google : outils

Offre : 190 €, livrée en 7 jours, remboursée si pas plus d'appels sous 45 jours. Cible : plombiers, ville à renseigner (`--ville`).

## Chaîne de travail
| Étape | Dossier | Commande |
|---|---|---|
| 1. Prospects (API Places) | `prospects/` | `python3 prospects/fetch_places.py --metier plombier --ville "VILLE"` |
| 2. Audits PDF (15 premiers) | `audits/` | `python3 audits/generate_audits.py` |
| 3. Brouillons de messages | `messages/` | `python3 messages/generate_messages.py --expediteur "Prénom"` |
| 4. Page de vente | `site/` | ouvrir `site/index.html` |
| 5. Livrables client | `templates/` | voir `templates/README.md` |
| 6. Scripts Reels | `contenu/` | `contenu/reels_scripts.md` |
| 7. Bilan hebdo | `suivi/` | `python3 suivi/bilan.py` |

Installation : `pip install -r requirements.txt` (reportlab ; Pillow optionnel pour le PNG du QR).

## Règles du brief et où elles sont appliquées
1. **Aucun contact automatique** : les scripts n'envoient rien (pas de code d'envoi). `messages.csv` = brouillons `A_VALIDER`.
2. **Aucun chiffre inventé** : donnée absente = champ vide + code dans `alertes`. Messages vides + alerte si aucun point positif vérifiable.
3. **API Places officielle uniquement**.
4. **Aucune promesse chiffrée** dans les textes client.
5. **Noms anonymisés** : le n°1 n'est jamais nommé dans les audits ; `--public` dans l'avant/après.
6. **Confirmation avant action irréversible** : rien de tel n'est automatisé ici.

## Données FICTIVES
Les fichiers `*_FICTIF*` et `demo/` sont 100 % inventés pour tester la chaîne. Les PDF d'exemple portent un filigrane « EXEMPLE FICTIF ». Ne jamais les envoyer.
Les sorties réelles (`prospects.csv`, `audits/*.pdf`, `messages.csv`, `suivi.csv`) sont dans `.gitignore`.

## Limites à connaître
- **Photos** : l'API ne renvoie que 10 photos max par lieu. `nb_photos = 10` signifie « 10 ou plus » (`PHOTOS_PLAFONNEES`).
- **Description** : la description saisie par le propriétaire n'est pas disponible via l'API. Colonne vide + alerte `DESCRIPTION_NON_VERIFIABLE`, à vérifier à la main. `resume_google_present` est le résumé généré par Google, pas celui du propriétaire.
- **Avis** : une fiche sans `userRatingCount` reste vide (`AVIS_ABSENTS`) : 0 avis et donnée manquante ne sont pas distingués.
- **Conservation des données Places** : les conditions de Google Maps Platform limitent la mise en cache du contenu Places (seul le `place_id` est librement conservable). Traite `prospects.csv` comme un fichier de travail jetable et relance l'API plutôt que de l'archiver ; relis les conditions en vigueur.
- **Garantie 45 jours** : mesurable seulement via les statistiques d'appels de la fiche du client (captures datées avant/après). Voir `site/README.md`.
- **Prospection** : un message à un artisan reste de la prospection commerciale (RGPD / droit d'opposition, règles SMS et e-mail). Prévois une mention de désinscription ; ce dépôt ne remplace pas un avis juridique.

## Légende des alertes (`alertes`)
`DESCRIPTION_NON_VERIFIABLE` · `NOTE_ABSENTE` · `AVIS_ABSENTS` · `PHOTOS_PLAFONNEES` · `TEL_ABSENT` · `N1_EGALITE` · `NON_OPERATIONNEL` · `SOUS_MIN_AVIS` · `FICTIF_NE_PAS_ENVOYER` · `EXPEDITEUR_A_COMPLETER` · `AUCUN_POINT_POSITIF_VERIFIABLE` · `AUCUN_MANQUE_MESURE`
