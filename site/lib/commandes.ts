// Règles métier des commandes : création, confirmation de paiement, brief, validation.
import type Stripe from "stripe";
import { env, modePaiement } from "./env";
import { stripe } from "./stripe";
import { courriels } from "./mail";
import { emettreFacture } from "./factures";
import { formuleParId, type FormuleId } from "./formules";
import { store, journal, maintenant, nouveauNumero, nouveauToken, type Brief, type Commande, type Statut } from "./store";

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
    cmd.statut = cmd.brief ? "payee" : "attente_infos";
    journal(cmd, "Paiement confirmé par Stripe (webhook signé, session revérifiée).");
  });
  if (c && premiere) {
    await courriels.confirmationCommande(c);
    await courriels.adminPaiement(c);
  }
  return { ok: true };
}

export async function marquerPaiementInabouti(sessionId: string, commandeId: string, etat: "expire" | "echoue") {
  await store.modifier(commandeId, (c) => {
    if (c.paiement.sessionId !== sessionId || c.paiement.etat === "paye") return false;
    c.paiement.etat = etat;
    c.statut = "annulee";
    journal(c, etat === "expire" ? "Session de paiement expirée sans paiement." : "Paiement échoué.");
  });
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

export async function changerStatut(id: string, statut: Statut, prevenirClient: boolean): Promise<Commande | null> {
  let change = false;
  const c = await store.modifier(id, (cmd) => {
    if (cmd.statut === statut) return false;
    change = true;
    cmd.statut = statut;
    if (statut === "livree") cmd.livreeLe = maintenant();
    journal(cmd, `Statut passé à « ${statut} » par l'administrateur.`);
  });
  if (c && change && statut === "livree") await facturerSiPossible(id);
  if (c && change && prevenirClient) {
    if (statut === "en_production") await courriels.enProduction(c);
    if (statut === "attente_validation") await courriels.aValider(c);
    if (statut === "livree") await courriels.livree(c);
  }
  return c;
}

// À la livraison, la facture est émise si toutes les informations sont réunies.
// Une facture impossible ne bloque jamais la livraison : elle reste à émettre depuis l'administration.
export async function facturerSiPossible(id: string) {
  try {
    await emettreFacture(id);
  } catch (e) {
    console.error("[facture]", id, (e as Error).message);
  }
}

export const retouchesMax = (c: Commande) => {
  const f = formuleParId(c.formule)!;
  return f.retouches * f.videos;
};
