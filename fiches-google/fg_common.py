"""Fonctions partagées par les scripts (audits, messages).

Règle n°2 du brief : aucune valeur n'est inventée. Une donnée absente reste
vide dans le CSV et déclenche une alerte. Ici on ne fait que lire et comparer.
"""
import csv
from dataclasses import dataclass

# L'API Places (New) ne renvoie jamais plus de 10 photos par lieu : 10 = "10 ou plus".
PHOTOS_CAP = 10


def to_int(value):
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


def to_float(value):
    try:
        return float(str(value).strip().replace(",", "."))
    except (TypeError, ValueError):
        return None


def fr(x, decimals=1):
    """4.8 -> '4,8'."""
    return f"{x:.{decimals}f}".replace(".", ",")


def read_prospects(path):
    """Retourne (n1, prospects) : n1 = ligne role=N1, prospects = lignes éligibles triées par rang."""
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    n1 = next((r for r in rows if r["role"] == "N1"), None)
    if n1 is None:
        raise SystemExit(f"Aucune ligne role=N1 dans {path}")
    prospects = [r for r in rows if r["role"] == "PROSPECT" and r["eligible"] == "oui"]
    prospects.sort(key=lambda r: int(r["rang"]))
    return n1, prospects


def photos_label(row, long=False):
    """'7', '10+' (court) ou 'au moins 10' (long) ; None si inconnu."""
    n = to_int(row["nb_photos"])
    if n is None:
        return None
    if row["photos_plafonne"] == "oui":
        return f"au moins {n}" if long else f"{n}+"
    return str(n)


@dataclass
class Gap:
    code: str
    constat: str          # phrase pour l'audit PDF
    action: str           # action corrective associée
    phrase: str           # formulation courte pour le message (vide si non mesuré)
    mesure: bool = True   # False = point à vérifier ensemble, pas un écart mesuré


def compute_gaps(p, n1):
    """Manques du prospect vs n°1, du plus important au moins important.

    Les écarts mesurés viennent d'abord ; les points "à vérifier" (non mesurables
    via l'API) ne servent qu'à compléter jusqu'à 3 et sont signalés comme tels.
    """
    gaps = []
    avis, n1_avis = to_int(p["nb_avis"]), to_int(n1["nb_avis"])
    if avis is not None and n1_avis is not None and n1_avis > avis:
        gaps.append(Gap(
            "avis",
            f"Avis : {avis} contre {n1_avis} pour le leader, soit {n1_avis - avis} avis d'écart.",
            "Demander un avis à tous vos clients après chaque intervention (lien direct et "
            "QR code fournis), sans contrepartie et sans trier les clients.",
            f"vous avez {avis} avis Google alors que le leader de votre zone en compte {n1_avis}",
        ))

    ph, n1_ph = to_int(p["nb_photos"]), to_int(n1["nb_photos"])
    if ph is not None and n1_ph is not None and ph < n1_ph:
        gaps.append(Gap(
            "photos",
            f"Photos : {photos_label(p)} photos publiques contre {photos_label(n1)} pour le leader "
            f"(comptage plafonné à {PHOTOS_CAP}).",
            "Ajouter des photos réelles : interventions, véhicule, équipe, avant/après "
            "(avec l'accord du client).",
            f"votre fiche affiche {photos_label(p, long=True)} photos contre {photos_label(n1, long=True)} chez le leader",
        ))

    if not p["site_web"] and n1["site_web"]:
        gaps.append(Gap(
            "site",
            "Site web : aucun site renseigné sur la fiche (renseigné chez le leader).",
            "Renseigner l'adresse de votre site ou, à défaut, une page de contact simple.",
            "aucun site web n'est renseigné sur votre fiche",
        ))

    if p["horaires_presents"] == "non" and n1["horaires_presents"] == "oui":
        gaps.append(Gap(
            "horaires",
            "Horaires : non renseignés (renseignés chez le leader).",
            "Renseigner les horaires d'ouverture, jours fériés et astreinte inclus si vous la proposez.",
            "vos horaires ne sont pas renseignés sur la fiche",
        ))

    note, n1_note = to_float(p["note"]), to_float(n1["note"])
    if note is not None and n1_note is not None and note < n1_note:
        gaps.append(Gap(
            "note",
            f"Note : {fr(note)}/5 contre {fr(n1_note)}/5 pour le leader.",
            "Répondre aux avis négatifs de façon factuelle et courtoise, sans polémique.",
            f"votre note est de {fr(note)}/5 contre {fr(n1_note)}/5 chez le leader",
        ))

    # Points non mesurables par l'API : "à vérifier", jamais présentés comme un constat.
    gaps.append(Gap(
        "description",
        "Description : non mesurable depuis l'extérieur, à vérifier ensemble "
        "(750 caractères maximum, sans lien ni numéro de téléphone).",
        "Rédiger une description claire : services, zone d'intervention, atouts réels "
        "(modèle fourni), sans lien ni téléphone.",
        "", mesure=False,
    ))
    gaps.append(Gap(
        "reponses",
        "Réponses aux avis : non mesurable depuis l'extérieur, à vérifier ensemble.",
        "Mettre en place une routine : répondre à chaque nouvel avis, positif ou négatif.",
        "", mesure=False,
    ))
    return gaps


def positive_point(p):
    """Premier point positif VÉRIFIABLE dans les données, sinon None (jamais inventé)."""
    note, avis, ph = to_float(p["note"]), to_int(p["nb_avis"]), to_int(p["nb_photos"])
    if note is not None and avis is not None and note >= 4.5 and avis >= 10:
        return f"vos clients vous notent {fr(note)}/5 sur {avis} avis"
    if note is not None and avis is not None and note >= 4.0:
        return f"votre note de {fr(note)}/5 est bonne"
    if p["site_web"]:
        return "votre site web est bien renseigné sur la fiche"
    if p["horaires_presents"] == "oui":
        return "vos horaires sont bien renseignés"
    if ph is not None and ph >= 5:
        return f"votre fiche affiche déjà {photos_label(p, long=True)} photos"
    return None
