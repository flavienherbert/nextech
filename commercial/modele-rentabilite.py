#!/usr/bin/env python3
"""Modèle de rentabilité de Studio Accroche (production avec Seedance 2.0 via Higgsfield).

Usage :  python3 commercial/modele-rentabilite.py            # imprime les tableaux de commercial/RENTABILITE.md
Aucune dépendance. Modifiez les hypothèses dans SCEN, PLANS, GRILLES, puis relancez.

Légende des sources :
  VÉRIFIÉ   devis Higgsfield en lecture seule (21/11/2026), page tarifs Stripe France (21/11/2026),
            service-public.gouv.fr « vérifié le 01/01/2026 » (cotisations, franchise de TVA)
  SOURCE TIERCE  prix des abonnements Higgsfield : blog Higgsfield « verified October 2026 » (la page de tarifs officielle
            est vide sans JavaScript) ; d'autres sites donnent Starter 19 $ et Plus 59 $ : À REVÉRIFIER AVANT TOUT ABONNEMENT
  HYPOTHÈSE tout le reste (essais ratés, temps de travail, retouches, cartes, TVA sur l'abonnement, change). Rien n'est mesuré
            tant que des commandes réelles n'ont pas été produites : remplacez ces valeurs par vos mesures.
"""
import sys

CR = {"fast720": 37.5, "std720": 67.5, "std1080": 180.0}   # VÉRIFIÉ : crédits d'un clip de 15 s, 9:16, avec son (Seedance 2.0)
PLANS = {"Starter": (15, 200), "Plus": (49, 1000), "Ultra": (129, 3000)}   # SOURCE TIERCE : ($/mois, crédits/mois), crédits non reportés
STRIPE_FIXE = 0.25                                          # VÉRIFIÉ : 1,5 % + 0,25 € (cartes EEE standard), 2,8 % + 0,25 € (premium)

SCEN = {
  # essais = tentatives par clip utilisable ; tva = TVA ajoutée à l'abonnement (non récupérable en franchise) ; fx = $ → € ;
  # stripe = taux moyen ; cotis = cotisations sur le chiffre d'affaires ; temps en minutes ; q = probabilité du tour de retouches n° 1,2,3,4+ ;
  # phi = part des vidéos touchées par un tour ; t_ret = minutes par vidéo retouchée ; eps = part des retouches qui exigent une régénération.
  "optimiste": dict(essais=1.5, tva=0.0, fx=0.92, stripe=0.015, cotis=0.212, brief=5,  script=10, admin=15, prep=3, revue=4, montage=8,  qc=5,  q=[0.40, 0.10, 0.03, 0.01], phi=0.3, t_ret=10, eps=0.10),
  "central":   dict(essais=2.5, tva=0.2, fx=0.92, stripe=0.021, cotis=0.256, brief=10, script=15, admin=25, prep=5, revue=6, montage=12, qc=7,  q=[0.60, 0.25, 0.10, 0.04], phi=0.5, t_ret=20, eps=0.25),
  "prudent":   dict(essais=4.0, tva=0.2, fx=0.92, stripe=0.028, cotis=0.256, brief=15, script=25, admin=35, prep=8, revue=8, montage=20, qc=10, q=[0.90, 0.50, 0.25, 0.10], phi=0.8, t_ret=40, eps=0.50),
}
NV = {"essai": 1, "test": 3, "campagne": 6}        # vidéos livrées
NS = {"essai": 1, "test": 3, "campagne": 3}        # scripts à écrire
SUR = {"essai": 5, "test": 5, "campagne": 8}       # crédits annexes (images de départ, voix) par commande
NOM = {"essai": "Essai", "test": "Pack Test", "campagne": "Pack Campagne"}

GRILLES = {
  "actuelle":    dict(prix=dict(essai=25, test=69, campagne=129),  mode="fast720", cap=dict(essai=1, test=3, campagne=12), extra=dict(),                             plus=0.0),
  "économique":  dict(prix=dict(essai=25, test=69, campagne=129),  mode="fast720", cap=dict(essai=1, test=2, campagne=2),  extra=dict(),                             plus=0.0),
  "recommandée": dict(prix=dict(essai=35, test=89, campagne=169),  mode="fast720", cap=dict(essai=1, test=2, campagne=2),  extra=dict(),                             plus=0.0),
  "premium":     dict(prix=dict(essai=49, test=129, campagne=249), mode="fast720", cap=dict(essai=2, test=3, campagne=3),  extra=dict(essai=10, test=20, campagne=40), plus=0.5),
}
MIX = {"démarrage (4 cmd/mois)": dict(essai=2, test=2, campagne=0), "croissance (12 cmd/mois)": dict(essai=5, test=5, campagne=2)}

def rounds(cap, s):
    return sum(s["q"][min(k, 4) - 1] for k in range(1, cap + 1))

def credits(f, s, g):
    v, clip = NV[f], CR[g["mode"]]
    return v * clip * (s["essais"] + g["plus"]) + SUR[f] + rounds(g["cap"][f], s) * s["phi"] * v * s["eps"] * clip * 1.5

def minutes(f, s, g):
    v = NV[f]
    prep = s["prep"] * (1 + 0.5 * (v - 1)); montage = s["montage"] * (1 + 0.8 * (v - 1))   # vidéos suivantes d'un pack : même produit, même présentateur
    revue = s["revue"] * (s["essais"] + g["plus"]) * v; qc = s["qc"] * v
    ret = rounds(g["cap"][f], s) * s["phi"] * v * s["t_ret"]
    return s["brief"] + s["script"] * NS[f] + s["admin"] + prep + montage + revue + qc + ret + g["extra"].get(f, 0)

def prix_credit(s, plan="Plus"):
    usd, cr = PLANS[plan]
    return usd * s["fx"] * (1 + s["tva"]) / cr

def abonnement(besoin, s):
    """Un compte = une offre par mois ; au-delà de 3 000 crédits : Ultra + recharges (HYPOTHÈSE : recharges au prix du crédit Ultra)."""
    for nom in ("Starter", "Plus", "Ultra"):
        usd, cr = PLANS[nom]
        if cr >= besoin: return nom, usd * s["fx"] * (1 + s["tva"])
    usd, cr = PLANS["Ultra"]
    return "Ultra + recharges", (usd + (besoin - cr) * usd / cr) * s["fx"] * (1 + s["tva"])

def formule(g, scen, f, canal=0.0):
    """Résultat d'une commande, AVANT abonnement (le crédit est valorisé au prix du plan Plus rempli)."""
    s = SCEN[scen]; p = g["prix"][f]
    cr = credits(f, s, g); ia = cr * prix_credit(s); st = p * s["stripe"] + STRIPE_FIXE; co = p * s["cotis"]; ca = p * canal
    mn = minutes(f, s, g); net = p - st - co - ia - ca
    return dict(prix=p, stripe=st, cotis=co, credits=cr, ia=ia, canal=ca, net=net, h=mn / 60, eurh=net / (mn / 60))

def mois(g, scen, mix):
    s = SCEN[scen]; m = MIX[mix]
    besoin = sum(m[f] * credits(f, s, g) for f in m)
    plan, abo = abonnement(besoin, s)
    brut = sum(m[f] * formule(g, scen, f)["net"] for f in m); h = sum(m[f] * formule(g, scen, f)["h"] for f in m)
    return dict(plan=plan, abo=abo, besoin=besoin, net=brut - abo, h=h, eurh=(brut - abo) / h)

def prix_pour(g, scen, f, cible):
    lo, hi = 1.0, 1000.0
    for _ in range(60):
        mid = (lo + hi) / 2; gg = dict(g); gg["prix"] = dict(g["prix"]); gg["prix"][f] = mid
        if formule(gg, scen, f)["eurh"] < cible: lo = mid
        else: hi = mid
    return hi

def md(titre, lignes):
    print(f"\n#### {titre}\n"); print(lignes)

if __name__ == "__main__":
    for gnom in sys.argv[1:] or ["actuelle", "économique", "recommandée", "premium"]:
        g = GRILLES[gnom]
        print(f"\n### Grille {gnom} ({g['prix']['essai']} / {g['prix']['test']} / {g['prix']['campagne']} €)")
        print("\n| Formule | Prix | Scénario | Stripe | Cotisations | Crédits (€) | **Bénéfice avant abonnement** | Temps | €/h net |\n|---|---|---|---|---|---|---|---|---|")
        for f in NV:
            for scen in SCEN:
                r = formule(g, scen, f)
                print(f"| {NOM[f]} | {r['prix']} € | {scen} | {r['stripe']:.2f} € | {r['cotis']:.2f} € | {r['ia']:.2f} € ({r['credits']:.0f} cr) | **{r['net']:.1f} €** | {r['h']:.1f} h | {r['eurh']:.1f} € |")
        print("\n| Mois | Scénario | Abonnement | Bénéfice du mois (après abonnement) | Temps | €/h net |\n|---|---|---|---|---|---|")
        for mix in MIX:
            for scen in SCEN:
                r = mois(g, scen, mix)
                print(f"| {mix} | {scen} | {r['plan']} {r['abo']:.0f} € | {r['net']:.0f} € | {r['h']:.1f} h | {r['eurh']:.1f} € |")
