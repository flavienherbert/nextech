// Veille quotidienne : prévient l'administrateur de ce qui attend, relance les clients qui n'ont pas envoyé leur brief.
// Appelée par la tâche quotidienne. N'envoie rien s'il n'y a rien à signaler.
import { alerter } from "./alertes";
import { env } from "./env";
import { euros, formuleParId } from "./formules";
import { courriels, enEchec } from "./mail";
import { echecsUtiles } from "./rattrapage";
import { correctionOuverte, echeance, enRetard, payee } from "./suivi";
import { journal, maintenant, store, type Commande } from "./store";

const H = 3_600_000;
const jour = (ms: number) => new Date(ms).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" });
const quand = (iso?: string) => (iso ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }) : "—");
const qui = (c: Commande) => c.brief?.nom || c.paiement.nomStripe || c.paiement.emailStripe || "client";
const offre = (c: Commande) => `${formuleParId(c.formule)?.nom ?? c.formule} ${euros(c.montantCents)}`;

export type BilanVeille = { points: number; relances: number; resume: "envoye" | "echec" | "rien" };

export async function veille(maintenantMs = Date.now()): Promise<BilanVeille> {
  const toutes = await store.commandes();
  const payees = toutes.filter(payee);
  const age = (iso?: string) => (iso ? maintenantMs - new Date(iso).getTime() : 0);
  let relances = 0;

  // Relance automatique, une seule fois : paiement confirmé depuis plus de 48 h, toujours pas de brief.
  for (const c of payees.filter((x) => x.statut === "attente_infos" && !x.relanceBriefLe && age(x.paiement.payeLe) > 48 * H)) {
    let envoyee = false;
    const maj = await store.modifier(c.id, (cmd) => {
      if (cmd.relanceBriefLe || cmd.statut !== "attente_infos") return false;
      cmd.relanceBriefLe = maintenant();
      envoyee = true;
      journal(cmd, "Relance automatique envoyée au client : brief manquant depuis plus de 48 h.");
    });
    if (maj && envoyee) { await courriels.relanceBrief(maj); relances++; }
  }

  const rubriques: { titre: string; elements: string[] }[] = [
    { titre: "Nouvelles commandes jamais ouvertes", elements: payees.filter((c) => !c.vueLe && age(c.paiement.payeLe) > H).map((c) => `${c.id} — ${offre(c)} — payée le ${quand(c.paiement.payeLe)}`) },
    { titre: "À démarrer (brief reçu)", elements: payees.filter((c) => c.statut === "payee").map((c) => `${c.id} — ${qui(c)} — ${offre(c)} — brief reçu le ${quand(c.brief?.recuLe)}`) },
    { titre: "Corrections demandées par les clients", elements: payees.filter(correctionOuverte).map((c) => `${c.id} — ${qui(c)} — demandée le ${quand(c.retouchesDemandees.at(-1)?.date)}`) },
    { titre: "En retard sur le délai promis", elements: payees.filter((c) => enRetard(c, maintenantMs)).map((c) => `${c.id} — ${qui(c)} — à livrer avant le ${jour(echeance(c)!)}`) },
    { titre: "Brief manquant depuis plus de 48 h", elements: payees.filter((c) => c.statut === "attente_infos" && age(c.paiement.payeLe) > 48 * H).map((c) => `${c.id} — ${c.paiement.emailStripe || qui(c)} — payée le ${quand(c.paiement.payeLe)}${c.relanceBriefLe ? " (client relancé)" : ""}`) },
    { titre: "Livraisons clôturées automatiquement (14 jours sans réponse du client)", elements: payees.filter((c) => c.clotureAutoLe && age(c.clotureAutoLe) < 36 * H).map((c) => `${c.id} — ${qui(c)} — facture ${c.facture ? c.facture.numero : "non émise (voir la commande)"}`) },
    { titre: "Livraisons sans réponse depuis plus de 7 jours (clôture automatique à 14 jours)", elements: payees.filter((c) => c.statut === "attente_validation" && age(c.historique.filter((h) => /livraison envoyée|version corrigée|passé à « attente_validation/i.test(h.evenement)).at(-1)?.date || c.paiement.payeLe) > 7 * 24 * H).map((c) => `${c.id} — ${qui(c)}`) },
  ];
  const echecs = echecsUtiles(await store.courriels(), toutes, maintenantMs).map((d) => d.courriel); // seulement ceux qui sont encore utiles
  rubriques.push({ titre: "E-mails non envoyés (14 derniers jours)", elements: echecs.map((m) => `${m.objet} — à ${m.a || "—"} — ${quand(m.date)}`) });

  const actives = rubriques.filter((r) => r.elements.length > 0);
  const points = actives.reduce((n, r) => n + r.elements.length, 0);
  if (points === 0) return { points: 0, relances, resume: "rien" };

  const lien = `${env.baseUrl()}/admin`;
  const m = await courriels.adminResume(actives, lien);
  await alerter({
    cle: `recap-${new Date(maintenantMs).toISOString().slice(0, 10)}`,
    titre: "Récap du jour",
    message: `${points} point${points > 1 ? "s" : ""} à traiter dans l'administration.`,
    lien, email: false, fenetreMs: 20 * H,
  });
  return { points, relances, resume: enEchec(m) ? "echec" : "envoye" };
}
