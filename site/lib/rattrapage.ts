// Tri des e-mails restés en échec : lesquels sont encore utiles, lesquels sont périmés, lesquels ont déjà été renvoyés.
// Objectif : tout renvoyer d'un clic SANS jamais envoyer de doublon ni de message périmé à un client
// (par exemple « il nous manque votre brief » à quelqu'un dont la commande est déjà livrée).
import { enEchec } from "./mail";
import type { Commande, Courriel, Statut } from "./store";

export type Action = "renvoyer" | "deja_envoye" | "doublon" | "obsolete";
export type Decision = { courriel: Courriel; action: Action; raison: string };

const JOUR = 86_400_000;
const FENETRE = 14 * JOUR;

// Statuts dans lesquels un e-mail reste d'actualité, d'après son objet.
const REGLES: { motif: RegExp; statuts: Statut[]; nom: string }[] = [
  { motif: /il nous manque (encore )?votre brief/i, statuts: ["attente_infos"], nom: "demande du brief" },
  { motif: /brief bien reçu/i, statuts: ["payee", "en_production"], nom: "accusé de réception du brief" },
  { motif: /demande de retouche est bien reçue/i, statuts: ["en_production"], nom: "accusé de réception de la retouche" },
  { motif: /production lancée/i, statuts: ["en_production"], nom: "production lancée" },
  { motif: /votre script à valider/i, statuts: ["payee"], nom: "script à valider" },
  { motif: /(version corrigée )?à valider/i, statuts: ["attente_validation"], nom: "livraison à valider" },
  { motif: /vos fichiers sont disponibles/i, statuts: ["livree"], nom: "livraison finale" },
  { motif: /Nouvelle commande payée/i, statuts: ["attente_infos", "payee", "en_production", "attente_validation"], nom: "notification de nouvelle commande" },
  { motif: /Brief reçu/i, statuts: ["payee", "en_production"], nom: "notification de brief reçu" },
  { motif: /Retouche demandée/i, statuts: ["en_production"], nom: "notification de retouche" },
];

export function trierEchecs(courriels: Courriel[], commandes: Commande[], maintenant = Date.now()): Decision[] {
  const parId = new Map(commandes.map((c) => [c.id, c]));
  const ok = courriels.filter((m) => !enEchec(m));
  const echecs = courriels.filter(enEchec).sort((a, b) => b.date.localeCompare(a.date)); // du plus récent au plus ancien
  const vus = new Set<string>();
  return echecs.map((m): Decision => {
    const cle = `${m.a}|${m.objet}`;
    if (ok.some((x) => x.a === m.a && x.objet === m.objet && x.date > m.date)) return { courriel: m, action: "deja_envoye", raison: "déjà renvoyé avec succès" };
    if (vus.has(cle)) return { courriel: m, action: "doublon", raison: "un échec plus récent identique existe" };
    vus.add(cle);
    if (maintenant - new Date(m.date).getTime() > FENETRE) return { courriel: m, action: "obsolete", raison: "plus de 14 jours" };
    if (!m.a) return { courriel: m, action: "obsolete", raison: "aucun destinataire" };
    // Alertes techniques à l'administrateur : le téléphone les a déjà signalées, sauf un paiement non rattaché à une commande.
    if (/⚠|Test de notification|Problème technique|E-mail non envoyé|Paiement échoué|Récap/i.test(m.objet) && !/Paiement reçu mais non appliqué/i.test(m.objet))
      return { courriel: m, action: "obsolete", raison: "alerte déjà signalée sur le téléphone" };
    if (/Paiement reçu mais non appliqué/i.test(m.objet)) return { courriel: m, action: "renvoyer", raison: "paiement à vérifier" };
    const c = m.commande ? parId.get(m.commande) : undefined;
    if (!c) return { courriel: m, action: "obsolete", raison: "commande introuvable ou supprimée" };
    const regle = REGLES.find((r) => r.motif.test(m.objet));
    if (!regle) return { courriel: m, action: "obsolete", raison: "message sans suite à donner" };
    return regle.statuts.includes(c.statut)
      ? { courriel: m, action: "renvoyer", raison: `${regle.nom} : encore d'actualité` }
      : { courriel: m, action: "obsolete", raison: `${regle.nom} : la commande a avancé depuis` };
  });
}

// E-mails à renvoyer réellement (encore utiles).
export const echecsUtiles = (courriels: Courriel[], commandes: Commande[], maintenant = Date.now()) =>
  trierEchecs(courriels, commandes, maintenant).filter((d) => d.action === "renvoyer");
