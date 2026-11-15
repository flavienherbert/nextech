// Règles de suivi des commandes pour l'administration : catégories du tableau de bord, échéances, recherche.
// Pur calcul, sans accès au stockage : testable seul, utilisé par le tableau de bord et par la veille quotidienne.
import { formuleParId } from "./formules";
import type { Commande } from "./store";

export type Vue = "afaire" | "nouvelles" | "traiter" | "corrections" | "production" | "attente" | "livrees" | "terminees" | "toutes" | "nonpayees";

export const VUES: { id: Vue; nom: string; aide: string }[] = [
  { id: "afaire", nom: "À faire maintenant", aide: "Ce qui attend une action de votre part : nouvelles commandes, commandes à démarrer, corrections demandées, retards." },
  { id: "nouvelles", nom: "Nouvelles", aide: "Payées et jamais ouvertes. Ouvrez-les pour les marquer comme vues." },
  { id: "traiter", nom: "À traiter", aide: "Le client a envoyé son brief : la production peut démarrer." },
  { id: "corrections", nom: "Corrections demandées", aide: "Le client demande une retouche : modifiez la vidéo, puis renvoyez-la." },
  { id: "production", nom: "En production", aide: "Vous travaillez dessus." },
  { id: "attente", nom: "En attente du client", aide: "Le client a payé mais n'a pas encore envoyé son brief." },
  { id: "livrees", nom: "Livrées", aide: "La livraison est envoyée : le client doit la valider ou demander une retouche." },
  { id: "terminees", nom: "Terminées", aide: "Livraison validée ou clôturée." },
  { id: "toutes", nom: "Toutes (archives)", aide: "Toutes les commandes payées, anciennes comprises." },
  { id: "nonpayees", nom: "Non payées ou annulées", aide: "Paiement jamais confirmé, abandonné ou expiré. Ce ne sont pas des ventes." },
];

const JOUR = 86_400_000;
export const payee = (c: Commande) => c.paiement.etat === "paye";

// Une correction est ouverte tant que la dernière retouche demandée n'a pas reçu de nouvelle version.
export const correctionOuverte = (c: Commande) =>
  c.statut === "en_production" && c.retouchesDemandees.length > 0 && !c.retouchesDemandees[c.retouchesDemandees.length - 1].traiteeLe;

// Date limite de livraison : délai de la formule à compter de la réception du brief.
export function echeance(c: Commande): number | null {
  if (!c.brief?.recuLe) return null;
  const f = formuleParId(c.formule);
  return f ? new Date(c.brief.recuLe).getTime() + f.delaiJours * JOUR : null;
}

export function enRetard(c: Commande, maintenant = Date.now()): boolean {
  if (!payee(c) || !["payee", "en_production"].includes(c.statut) || correctionOuverte(c)) return false;
  const e = echeance(c);
  return e !== null && maintenant > e;
}

export function dansVue(c: Commande, v: Vue, maintenant = Date.now()): boolean {
  if (v === "nonpayees") return !payee(c) || c.statut === "annulee";
  if (!payee(c)) return false;
  switch (v) {
    case "nouvelles": return !c.vueLe;
    case "traiter": return c.statut === "payee";
    case "corrections": return correctionOuverte(c);
    case "production": return c.statut === "en_production" && !correctionOuverte(c);
    case "attente": return c.statut === "attente_infos";
    case "livrees": return c.statut === "attente_validation";
    case "terminees": return c.statut === "livree";
    case "afaire": return !c.vueLe || c.statut === "payee" || correctionOuverte(c) || enRetard(c, maintenant);
    case "toutes": return true;
  }
}

export function compterVues(commandes: Commande[], maintenant = Date.now()): Record<Vue, number> {
  const n = Object.fromEntries(VUES.map((v) => [v.id, 0])) as Record<Vue, number>;
  for (const c of commandes) for (const v of VUES) if (dansVue(c, v.id, maintenant)) n[v.id]++;
  return n;
}

// Recherche libre : numéro, nom, e-mail, marque, produit.
export function correspond(c: Commande, q: string): boolean {
  const t = q.trim().toLowerCase();
  if (!t) return true;
  return [c.id, c.brief?.nom, c.brief?.email, c.brief?.marque, c.brief?.produit, c.paiement.emailStripe, c.paiement.nomStripe]
    .some((x) => (x || "").toLowerCase().includes(t));
}

// Ordre d'affichage : le plus ancien d'abord pour ce qu'il faut traiter, le plus récent d'abord pour les archives.
export function trier(commandes: Commande[], v: Vue): Commande[] {
  const date = (c: Commande) => new Date(c.paiement.payeLe || c.creeLe).getTime();
  return [...commandes].sort((a, b) => (["afaire", "nouvelles", "traiter", "corrections", "production", "attente", "livrees"].includes(v) ? date(a) - date(b) : date(b) - date(a)));
}

export const TAILLE_PAGE = 30;
