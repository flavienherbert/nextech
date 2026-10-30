#!/usr/bin/env python3
"""Tâche 1 : interroge l'API Google Places (New) et sort un CSV classé par écart d'avis.

Usage :
    export GOOGLE_PLACES_API_KEY=...
    python3 fetch_places.py --metier plombier --ville "Ma Ville"

    # Rejouer une réponse déjà sauvegardée (ou le jeu FICTIF) sans appeler l'API :
    python3 fetch_places.py --from-json demo/demo_places_FICTIF.json --source FICTIF \
        --metier plombier --ville "Ville-Exemple" --out demo/prospects_FICTIF.csv

Règles du brief appliquées ici :
- API officielle uniquement (aucun scraping).
- Donnée absente = champ vide + code d'alerte dans la colonne `alertes` (jamais de valeur inventée).
"""
import argparse
import csv
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import date

ENDPOINT = "https://places.googleapis.com/v1/places:searchText"
FIELD_MASK = ",".join([
    "places.id", "places.displayName", "places.formattedAddress",
    "places.nationalPhoneNumber", "places.rating", "places.userRatingCount",
    "places.photos", "places.regularOpeningHours", "places.websiteUri",
    "places.editorialSummary", "places.googleMapsUri", "places.businessStatus",
    "nextPageToken",
])
PHOTOS_CAP = 10   # l'API ne renvoie jamais plus de 10 photos par lieu
MAX_PAGES = 3     # Text Search : 20 résultats par page, 60 maximum au total

COLUMNS = [
    "role", "rang", "eligible", "place_id", "nom", "adresse", "telephone",
    "note", "nb_avis", "ecart_avis_vs_n1", "nb_photos", "photos_plafonne",
    "resume_google_present", "description_proprietaire", "horaires_presents",
    "site_web", "statut_activite", "url_maps", "metier", "ville", "source",
    "date_recuperation", "alertes",
]


def search_places(api_key, metier, ville):
    """Appelle Text Search sur 3 pages max et retourne la liste brute des lieux."""
    places, token = [], None
    for _ in range(MAX_PAGES):
        body = {"textQuery": f"{metier} à {ville}", "languageCode": "fr",
                "regionCode": "FR", "pageSize": 20}
        if token:
            body["pageToken"] = token
        req = urllib.request.Request(
            ENDPOINT, data=json.dumps(body).encode(), method="POST",
            headers={"Content-Type": "application/json",
                     "X-Goog-Api-Key": api_key, "X-Goog-FieldMask": FIELD_MASK})
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.load(resp)
        except urllib.error.HTTPError as e:
            sys.exit(f"Erreur API Places {e.code} : {e.read().decode(errors='replace')[:500]}")
        places += data.get("places", [])
        token = data.get("nextPageToken")
        if not token:
            break
        time.sleep(2)  # le jeton de page met un instant à devenir valide
    return places


def to_row(place, metier, ville, source, today):
    """Aplatit un lieu de l'API en ligne CSV ; les données absentes restent vides + alerte."""
    alertes = ["DESCRIPTION_NON_VERIFIABLE"]  # l'API ne donne pas la description du propriétaire
    note = place.get("rating")
    avis = place.get("userRatingCount")
    if note is None:
        alertes.append("NOTE_ABSENTE")
    if avis is None:
        alertes.append("AVIS_ABSENTS")  # 0 avis ou donnée manquante : on ne tranche pas
    nb_photos = len(place.get("photos", []))
    plafonne = nb_photos >= PHOTOS_CAP
    if plafonne:
        alertes.append("PHOTOS_PLAFONNEES")
    if not place.get("nationalPhoneNumber"):
        alertes.append("TEL_ABSENT")
    return {
        "role": "", "rang": "", "eligible": "", "place_id": place.get("id", ""),
        "nom": place.get("displayName", {}).get("text", ""),
        "adresse": place.get("formattedAddress", ""),
        "telephone": place.get("nationalPhoneNumber", ""),
        "note": "" if note is None else note,
        "nb_avis": "" if avis is None else avis,
        "ecart_avis_vs_n1": "",
        "nb_photos": nb_photos,
        "photos_plafonne": "oui" if plafonne else "non",
        "resume_google_present": "oui" if place.get("editorialSummary") else "non",
        "description_proprietaire": "",  # volontairement vide : non disponible via l'API
        "horaires_presents": "oui" if place.get("regularOpeningHours") else "non",
        "site_web": place.get("websiteUri", ""),
        "statut_activite": place.get("businessStatus", ""),
        "url_maps": place.get("googleMapsUri", ""),
        "metier": metier, "ville": ville, "source": source, "date_recuperation": today,
        "alertes": ";".join(alertes),
    }


def rank(rows, min_avis):
    """Désigne le n°1 (plus d'avis) puis classe les autres par écart d'avis décroissant."""
    ok = [r for r in rows if r["statut_activite"] in ("OPERATIONAL", "") and r["nb_avis"] != ""]
    if not ok:
        sys.exit("Aucun lieu exploitable (statut actif + nombre d'avis connu).")
    ok.sort(key=lambda r: (-int(r["nb_avis"]), -(float(r["note"]) if r["note"] != "" else 0)))
    n1 = ok[0]
    if len(ok) > 1 and ok[1]["nb_avis"] == n1["nb_avis"]:
        n1["alertes"] += ";N1_EGALITE"  # deux lieux à égalité d'avis : départage par la note
    n1.update(role="N1", rang=1, eligible="non", ecart_avis_vs_n1=0)

    prospects = []
    for r in rows:
        if r is n1:
            continue
        r["role"] = "PROSPECT"
        if r["statut_activite"] not in ("OPERATIONAL", ""):
            r["eligible"] = "non"; r["alertes"] += ";NON_OPERATIONNEL"
        elif r["nb_avis"] == "":
            r["eligible"] = "non"
        elif int(r["nb_avis"]) < min_avis:
            r["eligible"] = "non"; r["alertes"] += ";SOUS_MIN_AVIS"
        else:
            r["eligible"] = "oui"
            r["ecart_avis_vs_n1"] = int(n1["nb_avis"]) - int(r["nb_avis"])
            prospects.append(r)
    prospects.sort(key=lambda r: (-r["ecart_avis_vs_n1"], r["nom"]))
    for i, r in enumerate(prospects, 1):
        r["rang"] = i
    # ordre du fichier : n°1, prospects classés, puis non éligibles
    others = [r for r in rows if r is not n1 and r["eligible"] == "non"]
    return [n1] + prospects + others


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--metier", required=True)
    ap.add_argument("--ville", required=True)
    ap.add_argument("--min-avis", type=int, default=5,
                    help="en dessous, le lieu est écarté des prospects (fiche probablement inactive)")
    ap.add_argument("--from-json", help="réponse API déjà enregistrée (liste 'places'), sans appel réseau")
    ap.add_argument("--source", default="google_places_api")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "prospects.csv"))
    args = ap.parse_args()

    if args.from_json:
        with open(args.from_json, encoding="utf-8") as f:
            places = json.load(f)["places"]
    else:
        key = os.environ.get("GOOGLE_PLACES_API_KEY")
        if not key:
            sys.exit("GOOGLE_PLACES_API_KEY absente. Voir README.md (clé Places API (New), facturation activée).")
        places = search_places(key, args.metier, args.ville)

    today = date.today().isoformat()
    rows = rank([to_row(p, args.metier, args.ville, args.source, today) for p in places], args.min_avis)

    with open(args.out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(rows)

    eligibles = sum(1 for r in rows if r["eligible"] == "oui")
    print(f"{len(rows)} lieux, n°1 = {rows[0]['nom']!r} ({rows[0]['nb_avis']} avis), "
          f"{eligibles} prospects éligibles -> {args.out}")
    if eligibles < 15:
        print(f"ALERTE : seulement {eligibles} prospects éligibles (< 15). "
              f"Baisser --min-avis ou élargir la zone.")
    if args.source == "FICTIF":
        print("ATTENTION : données FICTIVES, ne rien envoyer à partir de ce fichier.")


if __name__ == "__main__":
    main()
