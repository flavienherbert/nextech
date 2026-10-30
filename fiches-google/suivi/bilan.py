#!/usr/bin/env python3
"""Tâche 7 : bilan hebdo à partir du tableau de suivi (CSV).

Usage :
    python3 bilan.py                                  # suivi.csv, semaine en cours (lundi-dimanche)
    python3 bilan.py --csv suivi.csv --semaine 2026-11-03   # semaine contenant cette date

Colonnes lues (voir suivi_modele.csv) : prospect_id, nom, variante, canal, date_contact,
repondu, date_reponse, audit_envoye, date_audit, vendu, date_vente, montant_eur,
remboursement_eur, date_remboursement. Dates au format AAAA-MM-JJ, oui/non en minuscules.

Règle n°2 : aucun montant n'est supposé (190 € n'est PAS utilisé par défaut) ; une vente
sans montant, ou un événement sans date, est signalé en alerte et exclu du calcul.

"Meilleur message" : une variante n'est désignée que si elle a au moins --min-envois
envois (défaut 10), sinon "échantillon insuffisant" : avec 15 prospects au total, un écart
de 1-2 réponses entre variantes est du bruit, pas un résultat.
"""
import argparse
import csv
import os
from collections import defaultdict
from datetime import date, timedelta


def parse_date(value):
    try:
        return date.fromisoformat((value or "").strip())
    except ValueError:
        return None


def is_yes(value):
    return (value or "").strip().lower() in {"oui", "o", "1", "true", "x"}


def to_amount(value):
    try:
        return float((value or "").strip().replace(",", ".").replace("€", ""))
    except ValueError:
        return None


def pct(num, den):
    return f"{100 * num / den:.0f} %" if den else "n.d."


def eur(x):
    return f"{x:,.2f} €".replace(",", " ").replace(".", ",")


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--csv", default=os.path.join(here, "suivi.csv"))
    ap.add_argument("--semaine", help="une date AAAA-MM-JJ de la semaine voulue (défaut : aujourd'hui)")
    ap.add_argument("--min-envois", type=int, default=10)
    args = ap.parse_args()

    ref = parse_date(args.semaine) if args.semaine else date.today()
    if ref is None:
        raise SystemExit("--semaine doit être au format AAAA-MM-JJ")
    start = ref - timedelta(days=ref.weekday())
    end = start + timedelta(days=6)
    in_week = lambda d: d is not None and start <= d <= end

    with open(args.csv, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    warnings = []
    contactes = reponses = audits = ventes = 0
    ca = remb = 0.0
    for r in rows:
        who = r.get("nom") or r.get("prospect_id") or "?"
        if in_week(parse_date(r["date_contact"])):
            contactes += 1
        for flag, col, label in (("repondu", "date_reponse", "réponse"), ("audit_envoye", "date_audit", "audit"),
                                 ("vendu", "date_vente", "vente")):
            if is_yes(r[flag]) and parse_date(r[col]) is None:
                warnings.append(f"{who} : {label} cochée sans date valide, ignorée")
        if is_yes(r["repondu"]) and in_week(parse_date(r["date_reponse"])):
            reponses += 1
        if is_yes(r["audit_envoye"]) and in_week(parse_date(r["date_audit"])):
            audits += 1
        if is_yes(r["vendu"]) and in_week(parse_date(r["date_vente"])):
            amount = to_amount(r["montant_eur"])
            if amount is None:
                warnings.append(f"{who} : vente sans montant, exclue du CA")
            else:
                ventes += 1
                ca += amount
        if in_week(parse_date(r.get("date_remboursement", ""))):
            amount = to_amount(r.get("remboursement_eur", ""))
            if amount is None:
                warnings.append(f"{who} : remboursement sans montant, ignoré")
            else:
                remb += amount

    # Meilleur message : cohorte par variante, tous envois confondus (pas seulement la semaine).
    stats = defaultdict(lambda: [0, 0, 0])  # envois, réponses, ventes
    for r in rows:
        if parse_date(r["date_contact"]) is None:
            continue
        s = stats[r["variante"] or "?"]
        s[0] += 1
        s[1] += is_yes(r["repondu"])
        s[2] += is_yes(r["vendu"])

    print(f"=== Bilan semaine du {start:%d/%m/%Y} au {end:%d/%m/%Y} ===")
    print(f"Contactés : {contactes}")
    print(f"Réponses reçues : {reponses}")
    print(f"Audits envoyés : {audits}")
    print(f"Ventes : {ventes}")
    print(f"CA : {eur(ca)}" + (f"  (remboursements : {eur(remb)}, net : {eur(ca - remb)})" if remb else ""))
    print()
    print("Variantes de message (cumul depuis le début) :")
    for v in sorted(stats):
        e, rep, ven = stats[v]
        print(f"  {v} : {e} envois, {rep} réponses ({pct(rep, e)}), {ven} ventes")
    eligible = {v: s for v, s in stats.items() if s[0] >= args.min_envois}
    if not eligible:
        print(f"Meilleur message : échantillon insuffisant (< {args.min_envois} envois par variante).")
    else:
        best = max(eligible, key=lambda v: (eligible[v][1] / eligible[v][0], eligible[v][2]))
        print(f"Meilleur message : variante {best} ({pct(eligible[best][1], eligible[best][0])} de réponses, "
              f"{eligible[best][0]} envois). Écart à confirmer avec plus d'envois.")
    if warnings:
        print("\nALERTES :")
        for w in warnings:
            print(f"  - {w}")


if __name__ == "__main__":
    main()
