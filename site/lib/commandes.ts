// Règles métier des commandes : création, confirmation de paiement, brief, validation.
import type Stripe from "stripe";
import { env, modePaiement } from "./env";
import { stripe } from "./stripe";
import { alerter } from "./alertes";
import { courriels, enEchec } from "./mail";
import { emettreFacture } from "./factures";
import { DUREE_TEXTE, euros, formuleParId, type FormuleId } from "./formules";
import { correctionOuverte } from "./suivi";
import type { ClientPro } from "./professionnel";
import { DELAI_RETOUCHE_JOURS, dateEcheanceTexte, echeanceRetouche, miseADisposition } from "./delais";
import { store, journal, maintenant, nouveauNumero, nouveauToken, type Brief, type Commande, type Courriel, type Statut } from "./store";

export async function creerCommandeEtSession(formuleId: FormuleId, client?: ClientPro): Promise<{ url: string; commande: Commande }> {
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
      price_data: { currency: "eur", unit_amount: f.prixCents, product_data: { name: `Studio Accroche — ${f.nom}`, description: `${f.videos} vidéo${f.videos > 1 ? "s" : ""} publicitaire${f.videos > 1 ? "s" : ""} verticale${f.videos > 1 ? "s" : ""}, ${DUREE_TEXTE}${f.videos > 1 ? " chacune" : ""}, script et sous-titres inclus` } },
    }],
    success_url: `${base}/commande/${token}?retour=paiement`,
    cancel_url: `${base}/commander/${f.adresse}?annule=1`,
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
  if (client?.entreprise) {
    // Offre réservée aux professionnels : la déclaration et les informations de l'entreprise sont conservées avec la commande.
    commande.entreprise = client.entreprise;
    if (client.siret) commande.siret = client.siret;
    commande.professionnelDeclareLe = maintenant();
    commande.historique.push({ date: maintenant(), evenement: `Client déclaré professionnel, pour les besoins de son activité : ${client.entreprise}${client.siret ? ` (SIRET ${client.siret})` : " (SIRET non renseigné)"}.` });
  }
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
  // Le site est facultatif (tous les clients n'en ont pas). S'il est renseigné, « exemple.fr » est complété en « https://exemple.fr ».
  if (b.lien) {
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(b.lien)) b.lien = `https://${b.lien}`;
    try {
      const u = new URL(b.lien);
      if (!/^https?:$/.test(u.protocol) || !/\.[a-z]{2,}$/i.test(u.hostname)) throw new Error();
    } catch {
      e.lien = "Ce lien n'a pas l'air valide (exemple : https://monsite.fr). Laissez vide si vous n'avez pas de site.";
    }
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
    if (statut === "attente_validation") cmd.derniereLivraisonLe = maintenant();
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

// Envoie le script au client pour validation (conditions de vente : aucune vidéo n'est produite avant son accord).
export async function envoyerScript(id: string, texte: string): Promise<Suite> {
  const c0 = await store.commande(id);
  if (!c0) return suite(null, undefined, "Commande introuvable.");
  if (c0.statut !== "payee") return suite(c0, undefined, "Le script s'envoie une fois le brief reçu et avant le démarrage de la production.");
  const t = texte.replace(/\r\n/g, "\n").trim();
  if (t.length < 20) return suite(c0, undefined, "Le script est trop court : écrivez le texte que dira le présentateur.");
  if (t.length > 5000) return suite(c0, undefined, "Le script est trop long (5 000 caractères au plus).");
  const c = await store.modifier(id, (cmd) => {
    cmd.scriptEnvoyeLe = maintenant();
    journal(cmd, "Script envoyé au client pour validation.");
  });
  return suite(c, c ? await courriels.script(c, t) : undefined);
}

// `scriptValide` : l'administrateur confirme avoir l'accord du client sur le script (le geste du bouton l'exige).
export async function demarrerProduction(id: string, scriptValide = true): Promise<Suite> {
  const c0 = await store.commande(id);
  if (!c0) return suite(null, undefined, "Commande introuvable.");
  if (c0.statut !== "payee") return suite(c0, undefined, "Cette commande n'est pas prête à démarrer (le brief doit d'abord être reçu).");
  if (!scriptValide) return suite(c0, undefined, "Confirmez que le client a validé le script : aucune vidéo n'est produite avant son accord.");
  await store.modifier(id, (cmd) => { journal(cmd, "Accord du client sur le script confirmé par l'administrateur."); });
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
    if (cmd.statut === "en_production") {
      cmd.statut = "attente_validation";
      cmd.derniereLivraisonLe = maintenant(); // le délai de 14 jours court de là ; un simple renvoi de l'e-mail ne le relance pas
    }
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

// Livraison réputée acceptée : le délai de 14 jours (conditions de vente, article 7) est écoulé sans validation ni retouche.
// La commande est clôturée, la facture émise, le client informé par e-mail ; le résultat de l'envoi est tracé dans l'historique de la
// commande (un e-mail qui échoue est archivé, signalé sur le téléphone et renvoyable). `demandeTardive` : texte d'une demande de retouche
// reçue après l'échéance, refusée et non décomptée. Sans effet si la commande n'est pas en attente de validation ou si le délai court encore.
export async function cloturerParExpiration(id: string, opts: { demandeTardive?: string; maintenantMs?: number } = {}): Promise<Suite> {
  const c0 = await store.commande(id);
  if (!c0) return suite(null, undefined, "Commande introuvable.");
  if (c0.statut !== "attente_validation") return suite(c0, undefined, "Cette commande n'est pas en attente de validation.");
  const mise = miseADisposition(c0);
  if ((opts.maintenantMs ?? Date.now()) <= echeanceRetouche(mise)) return suite(c0, undefined, `Le délai de ${DELAI_RETOUCHE_JOURS} jours court jusqu'au ${dateEcheanceTexte(mise)}.`);
  const tardive = (opts.demandeTardive || "").trim().slice(0, 2000);
  let ferme = false;
  const c = await store.modifier(id, (cmd) => {
    if (cmd.statut !== "attente_validation") return false; // une autre exécution (ou le client) a déjà tranché : aucun doublon
    ferme = true;
    const t = maintenant();
    cmd.statut = "livree";
    cmd.livreeLe = t;
    cmd.clotureAutoLe = t;
    for (const r of cmd.retouchesDemandees) if (!r.traiteeLe) r.traiteeLe = t;
    if (tardive) {
      cmd.retouchesDemandees.push({ date: t, message: tardive, traiteeLe: t, tardive: true });
      journal(cmd, `Demande de retouche reçue après le délai de ${DELAI_RETOUCHE_JOURS} jours : refusée, non décomptée.`);
    }
    journal(cmd, `Livraison réputée acceptée : aucun retour du client dans le délai de ${DELAI_RETOUCHE_JOURS} jours (échéance : ${dateEcheanceTexte(mise)}). Commande clôturée automatiquement.`);
  });
  if (!c || !ferme) return suite(c, undefined, c ? undefined : "Commande introuvable.");
  await facturerSiPossible(id);
  const m = await courriels.livraisonAcceptee((await store.commande(id)) || c, Boolean(tardive));
  await store.modifier(id, (cmd) => {
    journal(cmd, enEchec(m) ? "E-mail « livraison réputée acceptée » NON ENVOYÉ au client : tentative archivée (Administration → E-mails), renvoi possible." : "E-mail « livraison réputée acceptée » envoyé au client.");
  });
  return suite((await store.commande(id)) || c, m);
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

// Refuse la dernière demande du client parce qu'elle sort du périmètre d'une retouche (changement de produit, de brief, de script validé,
// d'angle…) : elle n'est pas exécutée, elle n'est pas décomptée, le client est informé et la commande revient en attente de validation.
export async function refuserRetouche(id: string, explication: string): Promise<Suite> {
  const c0 = await store.commande(id);
  if (!c0) return suite(null, undefined, "Commande introuvable.");
  if (!correctionOuverte(c0)) return suite(c0, undefined, "Aucune demande de retouche en attente à refuser.");
  const t = explication.replace(/\r\n/g, "\n").trim();
  if (t.length < 10) return suite(c0, undefined, "Expliquez au client pourquoi sa demande sort du périmètre d'une retouche (10 caractères minimum).");
  if (t.length > 2000) return suite(c0, undefined, "L'explication est trop longue (2 000 caractères au plus).");
  const c = await store.modifier(id, (cmd) => {
    const r = cmd.retouchesDemandees.at(-1);
    if (!r || r.traiteeLe || cmd.statut !== "en_production") return false;
    r.traiteeLe = maintenant();
    r.horsPerimetre = t;
    cmd.statut = "attente_validation";
    journal(cmd, "Demande de retouche refusée (hors périmètre) : le tour n'est pas décompté.");
  });
  return suite(c, c ? await courriels.retoucheRefusee(c, t) : undefined);
}
