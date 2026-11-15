// Règles métier des commandes : création, confirmation de paiement, brief, validation.
import type Stripe from "stripe";
import { env, modePaiement } from "./env";
import { stripe } from "./stripe";
import { alerter } from "./alertes";
import { courriels, enEchec } from "./mail";
import { emettreFacture } from "./factures";
import { euros, formuleParId, type FormuleId } from "./formules";
import { correctionOuverte } from "./suivi";
import { store, journal, maintenant, nouveauNumero, nouveauToken, type Brief, type Commande, type Courriel, type Statut } from "./store";

export async function creerCommandeEtSession(formuleId: FormuleId): Promise<{ url: string; commande: Commande }> {
  const f = formuleParId(formuleId);
  if (!f) throw new Error("Formule inconnue.");
  const s = stripe();
  const id = nouveauNumero();
  const token = nouveauToken();
  const base = env.baseUrl();
  const session = await s.checkout.sessions.create({
    mode: "payment",
    locale: "fr",
    client_reference_id: id,
    metadata: { commande: id, formule: f.id },
    payment_intent_data: { metadata: { commande: id }, description: `Studio Accroche — ${f.nom} — ${id}` },
    line_items: [{
      quantity: 1,
      price_data: { currency: "eur", unit_amount: f.prixCents, product_data: { name: `Studio Accroche — ${f.nom}`, description: `${f.videos} vidéo${f.videos > 1 ? "s" : ""} publicitaire${f.videos > 1 ? "s" : ""} verticale${f.videos > 1 ? "s" : ""}, script et sous-titres inclus` } },
    }],
    success_url: `${base}/commande/${token}?retour=paiement`,
    cancel_url: `${base}/commander/${f.id}?annule=1`,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  });
  if (!session.url) throw new Error("Stripe n'a pas renvoyé d'adresse de paiement.");
  const commande: Commande = {
    id, token, formule: f.id, montantCents: f.prixCents, devise: "eur", creeLe: maintenant(),
    statut: "attente_paiement",
    paiement: { etat: "en_attente", sessionId: session.id, mode: modePaiement().mode },
    fichiersClient: [], livrables: [], retouchesDemandees: [], notes: "",
    historique: [{ date: maintenant(), evenement: "Commande créée, client envoyé vers le paiement." }],
  };
  await store.creerCommande(commande);
  return { url: session.url, commande };
}

// Appelé uniquement depuis le webhook, après vérification de la signature.
// Revérifie la session auprès de Stripe : montant, devise, état du paiement, rattachement.
export async function confirmerPaiement(sessionEvenement: Stripe.Checkout.Session): Promise<{ ok: boolean; motif?: string }> {
  const id = sessionEvenement.metadata?.commande || sessionEvenement.client_reference_id || "";
  const avant = await store.commande(id);
  if (!avant) return { ok: false, motif: "commande inconnue" };
  if (avant.paiement.sessionId !== sessionEvenement.id) return { ok: false, motif: "session différente de celle de la commande" };
  if (avant.paiement.etat === "paye") return { ok: true, motif: "déjà confirmée" };

  const session = await stripe().checkout.sessions.retrieve(sessionEvenement.id);
  if (session.payment_status !== "paid") return { ok: false, motif: `paiement non abouti (${session.payment_status})` };
  if (session.amount_total !== avant.montantCents || session.currency !== "eur") return { ok: false, motif: "montant ou devise inattendus" };
  if ((session.metadata?.commande || "") !== id) return { ok: false, motif: "rattachement incohérent" };

  let premiere = false;
  const c = await store.modifier(id, (cmd) => {
    if (cmd.paiement.etat === "paye") return false;
    premiere = true;
    cmd.paiement.etat = "paye";
    cmd.paiement.payeLe = maintenant();
    cmd.paiement.intentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    cmd.paiement.emailStripe = session.customer_details?.email || undefined;
    cmd.paiement.nomStripe = session.customer_details?.name || undefined;
    cmd.statut = cmd.brief ? "payee" : "attente_infos";
    journal(cmd, "Paiement confirmé par Stripe (webhook signé, session revérifiée).");
  });
  if (c && premiere) {
    // Notification immédiate de l'administrateur : e-mail détaillé + message sur le téléphone (sans donnée personnelle).
    await courriels.adminPaiement(c);
    await alerter({
      cle: `paiement-${c.id}`,
      titre: "Nouvelle commande payée",
      message: `${c.id} · ${formuleParId(c.formule)?.nom ?? c.formule} · ${euros(c.montantCents)}`,
      lien: `${env.baseUrl()}/admin/commande/${c.id}`,
      email: false, fenetreMs: 30 * 86_400_000,
    });
    await courriels.confirmationCommande(c);
  }
  return { ok: true };
}

export async function marquerPaiementInabouti(sessionId: string, commandeId: string, etat: "expire" | "echoue") {
  let change = false;
  await store.modifier(commandeId, (c) => {
    if (c.paiement.sessionId !== sessionId || c.paiement.etat === "paye") return false;
    change = true;
    c.paiement.etat = etat;
    c.statut = "annulee";
    journal(c, etat === "expire" ? "Session de paiement expirée sans paiement." : "Paiement échoué.");
  });
  // Un abandon (session expirée) n'est pas une alerte ; un paiement refusé par la banque l'est.
  if (change && etat === "echoue") {
    await alerter({
      cle: `paiement-echoue-${commandeId}`,
      titre: "Paiement échoué",
      message: `La commande ${commandeId} n'a pas été payée : paiement refusé.`,
      lien: `${env.baseUrl()}/admin/commande/${commandeId}`,
      urgence: "haute", fenetreMs: 30 * 86_400_000,
    });
  }
}

const propre = (v: unknown, max: number) => String(v ?? "").replace(/\u0000/g, "").trim().slice(0, max);

export function validerBrief(d: Record<string, unknown>): { brief?: Brief; erreurs: Record<string, string> } {
  const b: Brief = {
    nom: propre(d.nom, 120), email: propre(d.email, 160).toLowerCase(), telephone: propre(d.telephone, 40),
    marque: propre(d.marque, 120), lien: propre(d.lien, 500), produit: propre(d.produit, 300),
    style: propre(d.style, 60), cible: propre(d.cible, 600), arguments: propre(d.arguments, 3000),
    aEviter: propre(d.aEviter, 1500), complement: propre(d.complement, 3000),
    nomFacture: propre(d.nomFacture, 160), adresseFacture: propre(d.adresseFacture, 400), sirenClient: propre(d.sirenClient, 20).replace(/\s/g, ""),
    recuLe: maintenant(),
  };
  const e: Record<string, string> = {};
  if (b.nom.length < 2) e.nom = "Indiquez votre nom.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(b.email)) e.email = "Adresse e-mail invalide.";
  if (b.marque.length < 2) e.marque = "Indiquez le nom de votre marque.";
  try {
    const u = new URL(b.lien);
    if (!/^https?:$/.test(u.protocol)) throw new Error();
  } catch {
    e.lien = "Indiquez un lien complet commençant par https://";
  }
  if (b.produit.length < 2) e.produit = "Indiquez le produit à mettre en avant.";
  if (!b.style) e.style = "Choisissez un style.";
  if (b.nomFacture.length < 2) e.nomFacture = "Indiquez le nom à facturer.";
  if (b.adresseFacture.length < 8) e.adresseFacture = "Indiquez l'adresse de facturation complète.";
  if (b.sirenClient && !/^(\d{9}|\d{14})$/.test(b.sirenClient)) e.sirenClient = "9 chiffres (SIREN) ou 14 chiffres (SIRET).";
  return Object.keys(e).length ? { erreurs: e } : { brief: b, erreurs: {} };
}

export async function enregistrerBrief(c: Commande, brief: Brief): Promise<Commande | null> {
  const maj = await store.modifier(c.id, (cmd) => {
    if (cmd.paiement.etat !== "paye" || cmd.brief) return false;
    cmd.brief = brief;
    cmd.statut = "payee";
    journal(cmd, "Brief reçu du client.");
  });
  if (maj?.brief?.recuLe === brief.recuLe) {
    await courriels.briefRecu(maj);
    await courriels.adminBrief(maj);
  }
  return maj;
}

export async function changerStatutAvecCourriel(id: string, statut: Statut, prevenirClient: boolean): Promise<{ commande: Commande | null; courriel?: Courriel }> {
  let change = false;
  const c = await store.modifier(id, (cmd) => {
    if (cmd.statut === statut) return false;
    change = true;
    cmd.statut = statut;
    if (statut === "livree") cmd.livreeLe = maintenant();
    // Les retouches demandées sont traitées dès que le client reçoit une nouvelle version ou que la commande est close.
    if (statut === "attente_validation" || statut === "livree") for (const r of cmd.retouchesDemandees) if (!r.traiteeLe) r.traiteeLe = maintenant();
    journal(cmd, `Statut passé à « ${statut} » par l'administrateur.`);
  });
  let courriel: Courriel | undefined;
  if (c && change && statut === "livree") await facturerSiPossible(id);
  if (c && change && prevenirClient) {
    if (statut === "en_production") courriel = await courriels.enProduction(c);
    if (statut === "attente_validation") courriel = await courriels.aValider(c);
    if (statut === "livree") courriel = await courriels.livree((await store.commande(id)) || c);
  }
  return { commande: c, courriel };
}

export async function changerStatut(id: string, statut: Statut, prevenirClient: boolean): Promise<Commande | null> {
  return (await changerStatutAvecCourriel(id, statut, prevenirClient)).commande;
}

// ───── Gestes quotidiens de l'administrateur (boutons guidés de la page d'une commande) ─────
export type Suite = { commande: Commande | null; courrielOk: boolean | null; erreur?: string };
const suite = (commande: Commande | null, m?: Courriel, erreur?: string): Suite => ({ commande, courrielOk: m ? !enEchec(m) : null, erreur });

// Marque la commande comme vue : elle n'est plus « Nouvelle » dans le tableau de bord.
export async function marquerVue(id: string) {
  await store.modifier(id, (c) => {
    if (c.vueLe) return false;
    c.vueLe = maintenant();
  });
}

export async function demarrerProduction(id: string): Promise<Suite> {
  const c0 = await store.commande(id);
  if (!c0) return suite(null, undefined, "Commande introuvable.");
  if (c0.statut !== "payee") return suite(c0, undefined, "Cette commande n'est pas prête à démarrer (le brief doit d'abord être reçu).");
  const { commande, courriel } = await changerStatutAvecCourriel(id, "en_production", true);
  return suite(commande, courriel);
}

// Envoie (ou renvoie) la livraison au client : fichiers prêts, statut « en attente de validation », e-mail avec le lien.
export async function envoyerLivraison(id: string): Promise<Suite> {
  const c0 = await store.commande(id);
  if (!c0) return suite(null, undefined, "Commande introuvable.");
  if (c0.livrables.length === 0) return suite(c0, undefined, "Ajoutez au moins un fichier livrable avant d'envoyer la livraison.");
  if (!["en_production", "attente_validation"].includes(c0.statut)) return suite(c0, undefined, "Cette commande n'est pas en production : rien à livrer.");
  const correction = correctionOuverte(c0);
  const renvoi = c0.statut === "attente_validation";
  const c = await store.modifier(id, (cmd) => {
    for (const r of cmd.retouchesDemandees) if (!r.traiteeLe) r.traiteeLe = maintenant();
    if (cmd.statut === "en_production") cmd.statut = "attente_validation";
    journal(cmd, renvoi ? "E-mail de livraison renvoyé au client." : correction ? "Version corrigée envoyée au client." : "Livraison envoyée au client.");
  });
  const m = c ? await courriels.aValider(c, correction) : undefined;
  return suite(c, m);
}

// Clôture une commande en attente de validation (validation reçue hors du site, ou délai écoulé).
export async function cloturer(id: string): Promise<Suite> {
  const c0 = await store.commande(id);
  if (!c0) return suite(null, undefined, "Commande introuvable.");
  if (c0.statut !== "attente_validation") return suite(c0, undefined, "Seule une livraison en attente de validation peut être clôturée.");
  const { commande, courriel } = await changerStatutAvecCourriel(id, "livree", true);
  return suite(commande, courriel);
}

// Relance manuelle d'un client qui n'a pas envoyé son brief.
export async function relancerBrief(id: string): Promise<Suite> {
  const c0 = await store.commande(id);
  if (!c0) return suite(null, undefined, "Commande introuvable.");
  if (c0.statut !== "attente_infos") return suite(c0, undefined, "Le client a déjà envoyé son brief.");
  const c = await store.modifier(id, (cmd) => {
    cmd.relanceBriefLe = maintenant();
    journal(cmd, "Relance du brief envoyée au client par l'administrateur.");
  });
  return suite(c, c ? await courriels.relanceBrief(c) : undefined);
}

// À la livraison, la facture est émise si toutes les informations sont réunies.
// Une facture impossible ne bloque jamais la livraison : elle reste à émettre depuis l'administration.
export async function facturerSiPossible(id: string) {
  try {
    const r = await emettreFacture(id);
    // Hors ventes réelles, une facture impossible est normale (identité du vendeur non renseignée) ; en vente réelle, c'est une alerte.
    if (r.obstacles && modePaiement().mode === "reel") {
      await alerter({ cle: `facture-${id}`, titre: "Facture non émise", message: `La facture de la commande ${id} n'a pas pu être émise.`, details: r.obstacles.join(" ; "), lien: `${env.baseUrl()}/admin/commande/${id}`, urgence: "haute", fenetreMs: 86_400_000 });
    }
  } catch (e) {
    console.error("[facture]", id, (e as Error).message);
    await alerter({ cle: `facture-${id}`, titre: "Facture non émise", message: `La facture de la commande ${id} a échoué techniquement.`, details: (e as Error).message, lien: `${env.baseUrl()}/admin/commande/${id}`, urgence: "haute", fenetreMs: 86_400_000 });
  }
}

export const retouchesMax = (c: Commande) => {
  const f = formuleParId(c.formule)!;
  return f.retouches * f.videos;
};
