#!/usr/bin/env python3
"""Génère un jeu de données 100 % FICTIF, au format de réponse de l'API Places (New).

Sert uniquement à tester la chaîne (CSV -> audits -> messages -> bilan) sans clé API.
Aucun de ces plombiers n'existe : noms génériques, numéros 00 00 00 00 XX.
Ne JAMAIS utiliser ces sorties pour contacter quelqu'un.
"""
import json
import os
import random

rng = random.Random(42)  # graine fixe : le jeu est reproductible
places = []
for i in range(1, 26):
    p = {
        "id": f"FICTIF_{i:03d}",
        "displayName": {"text": f"Plomberie Démo {i:02d}"},
        "formattedAddress": f"{i} rue de l'Exemple, Ville-Exemple",
        "nationalPhoneNumber": f"00 00 00 00 {i:02d}",
        "googleMapsUri": f"https://example.invalid/fictif/{i}",
        "businessStatus": "OPERATIONAL",
    }
    if i == 1:  # le "n°1" : fiche complète, beaucoup d'avis
        p.update(rating=4.8, userRatingCount=212, photos=[{}] * 10,
                 regularOpeningHours={"periods": []}, websiteUri="https://example.invalid/leader",
                 editorialSummary={"text": "fictif"})
    else:
        p["userRatingCount"] = rng.choice([2, 4, 6, 8, 11, 15, 19, 27, 34, 48, 63, 90])
        p["rating"] = round(rng.uniform(3.6, 4.9), 1)
        p["photos"] = [{}] * rng.choice([0, 1, 2, 4, 6, 9, 10])
        if rng.random() < 0.6:
            p["regularOpeningHours"] = {"periods": []}
        if rng.random() < 0.5:
            p["websiteUri"] = f"https://example.invalid/demo-{i:02d}"
    places.append(p)

# cas limites pour tester les alertes
places[5].pop("rating"); places[5].pop("userRatingCount")      # note et avis absents
places[7]["businessStatus"] = "CLOSED_TEMPORARILY"             # fiche non opérationnelle
places[9].pop("nationalPhoneNumber")                           # téléphone absent

out = os.path.join(os.path.dirname(__file__), "demo", "demo_places_FICTIF.json")
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w", encoding="utf-8") as f:
    json.dump({"places": places}, f, ensure_ascii=False, indent=1)
print(f"{len(places)} lieux FICTIFS -> {out}")
