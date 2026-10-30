#!/usr/bin/env python3
"""Tâche 3 : prépare un message personnalisé par prospect dans messages.csv.

Usage :
    python3 generate_messages.py --expediteur "Prénom" [--top 15]
    python3 generate_messages.py --csv ../prospects/demo/prospects_FICTIF.csv \
        --expediteur "Prénom" --out messages_FICTIF_exemple.csv

IMPORTANT (règle n°1) : ce script ne contacte personne. Il écrit des brouillons avec
statut A_VALIDER ; tu relis, tu corriges et tu envoies toi-même.

Chaque message (5 lignes max) contient : un vrai point positif tiré des données,
un manque précis chiffré, une question fermée. Pas de promesse de résultat.
Pas de point positif vérifiable -> message vide + alerte (on n'invente rien).
Les 3 variantes (A/B/C) ne diffèrent que par la question finale : c'est ce que
`suivi/bilan.py` compare pour désigner le "meilleur message".
"""
import argparse
import csv
import os
import sys
from datetime import date

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from fg_common import compute_gaps, positive_point, read_prospects  # noqa: E402

QUESTIONS = {
    "A": "Souhaitez-vous recevoir gratuitement un audit d'une page de votre fiche, oui ou non ?",
    "B": "Ce manque est-il un sujet sur lequel vous avez déjà travaillé ?",
    "C": "Les appels qui viennent de Google comptent-ils pour votre activité ?",
}
COLUMNS = ["prospect_id", "nom", "telephone", "variante", "message", "nb_lignes",
           "alertes", "statut", "source", "date_preparation"]
MAX_LINES = 5


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--csv", default=os.path.join(here, "..", "prospects", "prospects.csv"))
    ap.add_argument("--top", type=int, default=15)
    ap.add_argument("--expediteur", default="", help="ton prénom, pour la signature")
    ap.add_argument("--out", default=os.path.join(here, "messages.csv"))
    args = ap.parse_args()

    n1, prospects = read_prospects(args.csv)
    sender = args.expediteur or "[TON PRÉNOM]"
    out = []
    for i, p in enumerate(prospects[: args.top]):
        variante = "ABC"[i % 3]  # rotation : ~5 envois par variante sur 15 prospects
        alertes = ["FICTIF_NE_PAS_ENVOYER"] if p["source"] == "FICTIF" else []
        if not args.expediteur:
            alertes.append("EXPEDITEUR_A_COMPLETER")
        positif = positive_point(p)
        manque = next((g for g in compute_gaps(p, n1) if g.mesure), None)
        if positif is None or manque is None:
            alertes.append("AUCUN_POINT_POSITIF_VERIFIABLE" if positif is None else "AUCUN_MANQUE_MESURE")
            message = ""
        else:
            message = "\n".join([
                "Bonjour,",
                f"J'ai regardé votre fiche Google : {positif}.",
                f"En revanche, {manque.phrase}.",
                QUESTIONS[variante],
                sender,
            ])
        nb = len(message.splitlines()) if message else 0
        assert nb <= MAX_LINES, "message de plus de 5 lignes"
        out.append({
            "prospect_id": p["place_id"], "nom": p["nom"], "telephone": p["telephone"],
            "variante": variante, "message": message, "nb_lignes": nb,
            "alertes": ";".join(alertes), "statut": "A_VALIDER", "source": p["source"],
            "date_preparation": date.today().isoformat(),
        })

    with open(args.out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(out)
    vides = sum(1 for r in out if not r["message"])
    print(f"{len(out)} brouillons ({vides} vide(s) avec alerte) -> {args.out}")
    print("Rien n'a été envoyé : relis chaque message, puis envoie toi-même.")


if __name__ == "__main__":
    main()
