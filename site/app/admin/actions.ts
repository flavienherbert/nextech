"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { adresseClient } from "@/lib/limiteur";
import { essaiAutorise, estAdmin, fermerSession, motDePasseValide, noterEssai, ouvrirSession, ralentir, suiteValide } from "@/lib/auth";
import { emettreFacture } from "@/lib/factures";
import { alerter, notificationDeTest } from "@/lib/alertes";
import { changerStatut, cloturer, demarrerProduction, envoyerLivraison, envoyerScript, relancerBrief, type Suite } from "@/lib/commandes";
import { courriels, enEchec, verifierSmtp } from "@/lib/mail";
import { basculerManuel } from "@/lib/lancement";
import { definirTexte, retirerMedia } from "@/lib/medias";
import { enregistrerMotDePasseSmtp, oublierMotDePasseSmtp } from "@/lib/reglages";
import { trierEchecs } from "@/lib/rattrapage";
import { store, journal, STATUTS, type Statut } from "@/lib/store";

export async function connexion(form: FormData) {
  const ip = adresseClient(await headers());
  const suite = suiteValide(form.get("suite"));
  const vers = (erreur: string) => `/admin/connexion?erreur=${erreur}${suite !== "/admin" ? `&suite=${encodeURIComponent(suite)}` : ""}`;
  if (!(await essaiAutorise(ip))) {
    // Le site est public : un blocage de connexion est le signe d'une tentative d'intrusion. Une alerte par heure au plus.
    await alerter({ cle: "connexion-bloquee", titre: "Tentatives de connexion à l'administration bloquées", message: "Plusieurs mots de passe incorrects de suite ont été saisis sur /admin. Si ce n'était pas vous, rien à faire : l'accès est bloqué 15 minutes.", email: false, urgence: "haute", fenetreMs: 3600_000 });
    redirect(vers("essais"));
  }
  const valide = motDePasseValide(String(form.get("motdepasse") || ""));
  await noterEssai(ip, valide);
  if (!valide) {
    await ralentir();
    redirect(vers("refus"));
  }
  await ouvrirSession();
  redirect(suite);
}

// Renvoie un e-mail resté en échec (service d'envoi indisponible, délai dépassé…).
export async function renvoyerCourriel(form: FormData) {
  if (!(await estAdmin())) redirect("/admin/connexion");
  const id = String(form.get("id") || "");
  const m = (await store.courriels()).find((x) => x.id === id);
  if (!m || !enEchec(m)) redirect("/admin/courriels?erreur=renvoi");
  const r = await courriels.renvoyer(m);
  redirect(`/admin/courriels?${enEchec(r) ? "erreur" : "ok"}=renvoi`);
}

// Renvoie d'un clic tous les e-mails en échec qui sont encore utiles. Idempotent : un e-mail déjà renvoyé avec succès,
// un doublon ou un message périmé n'est jamais renvoyé (aucun doublon pour les clients).
export async function renvoyerUtiles() {
  if (!(await estAdmin())) redirect("/admin/connexion");
  const decisions = trierEchecs(await store.courriels(), await store.commandes()).filter((d) => d.action === "renvoyer");
  let ok = 0, ko = 0;
  for (const d of decisions) {
    const r = await courriels.renvoyer(d.courriel);
    if (enEchec(r)) ko++; else ok++;
  }
  redirect(`/admin/courriels?lot=${ok}-${ko}`);
}

// Enregistre le mot de passe d'application Gmail saisi dans l'administration : testé avant d'être enregistré, actif tout de suite
// (aucun redéploiement), puis envoi d'un e-mail de test et renvoi des e-mails encore utiles.
export async function enregistrerGmail(form: FormData) {
  if (!(await estAdmin())) redirect("/admin/connexion");
  const mdp = String(form.get("mdp") || "").replace(/[\s\u00a0\u200b"']/g, "");
  const echec = (m: string): never => redirect(`/admin/reglages?erreur=${encodeURIComponent(m)}`);
  if (!/^[a-z]{16}$/.test(mdp)) echec("Un mot de passe d'application Google fait exactement 16 lettres minuscules (les espaces sont ignorés). Ce n'est pas le mot de passe habituel du compte Google.");
  const v = await verifierSmtp(mdp);
  if (!v.ok) echec(v.erreur);
  await enregistrerMotDePasseSmtp(mdp);
  const test = await notificationDeTest();
  const decisions = trierEchecs(await store.courriels(), await store.commandes()).filter((d) => d.action === "renvoyer");
  let renvoyes = 0;
  for (const d of decisions) if (!enEchec(await courriels.renvoyer(d.courriel))) renvoyes++;
  redirect(`/admin/reglages?ok=1&mail=${test.email === "envoye" ? "oui" : "non"}&push=${test.push === "envoye" ? "oui" : "non"}&renvoyes=${renvoyes}`);
}

export async function oublierGmail() {
  if (!(await estAdmin())) redirect("/admin/connexion");
  await oublierMotDePasseSmtp();
  redirect("/admin/reglages?supprime=1");
}

export async function deconnexion() {
  await fermerSession();
  redirect("/admin/connexion");
}

export async function majStatut(form: FormData) {
  if (!(await estAdmin())) redirect("/admin/connexion");
  const id = String(form.get("id") || "");
  const statut = String(form.get("statut") || "") as Statut;
  if (!STATUTS.some((s) => s.id === statut)) redirect(`/admin/commande/${id}?erreur=statut`);
  const c = await store.commande(id);
  if (!c) redirect("/admin");
  if ((statut === "attente_validation" || statut === "livree") && c.livrables.length === 0)
    redirect(`/admin/commande/${id}?erreur=${encodeURIComponent("Ajoutez au moins un livrable avant de livrer.")}`);
  await changerStatut(id, statut, form.get("prevenir") === "oui");
  redirect(`/admin/commande/${id}?ok=statut`);
}

export async function majNotes(form: FormData) {
  if (!(await estAdmin())) redirect("/admin/connexion");
  const id = String(form.get("id") || "");
  await store.modifier(id, (c) => {
    c.notes = String(form.get("notes") || "").slice(0, 5000);
  });
  redirect(`/admin/commande/${id}?ok=notes`);
}

export async function retirerLivrable(form: FormData) {
  if (!(await estAdmin())) redirect("/admin/connexion");
  const id = String(form.get("id") || "");
  const fichier = String(form.get("fichier") || "");
  let retire = false;
  await store.modifier(id, (c) => {
    const avant = c.livrables.length;
    c.livrables = c.livrables.filter((l) => l.id !== fichier);
    retire = c.livrables.length < avant;
    if (!retire) return false;
    journal(c, "Livrable retiré par l'administrateur.");
  });
  if (retire) await store.supprimerFichier(fichier);
  redirect(`/admin/commande/${id}?ok=retire`);
}

// ───── Médias du site (Administration → Médias) ─────
// Retour à l'image d'origine pour un emplacement.
export async function remettreMedia(form: FormData) {
  if (!(await estAdmin())) redirect("/admin/connexion");
  const slot = String(form.get("slot") || "");
  if (!(await retirerMedia(slot))) redirect("/admin/medias?erreur=emplacement");
  redirect(`/admin/medias?ok=retire#${slot}`);
}

export async function majTexteMedia(form: FormData) {
  if (!(await estAdmin())) redirect("/admin/connexion");
  const slot = String(form.get("slot") || "");
  if (!(await definirTexte(slot, form.get("titre"), form.get("legende")))) redirect("/admin/medias?erreur=emplacement");
  redirect(`/admin/medias?ok=texte#${slot}`);
}

// Case à cocher de la liste de lancement (vérifications que seul le vendeur peut confirmer).
export async function basculerLancement(form: FormData) {
  if (!(await estAdmin())) redirect("/admin/connexion");
  await basculerManuel(String(form.get("id") || ""));
  redirect("/admin/lancement");
}

export async function creerFacture(form: FormData) {
  if (!(await estAdmin())) redirect("/admin/connexion");
  const id = String(form.get("id") || "");
  const r = await emettreFacture(id);
  if (r.obstacles) redirect(`/admin/commande/${id}?erreur=${encodeURIComponent("Facture impossible : " + r.obstacles.join(" ; "))}`);
  redirect(`/admin/commande/${id}?ok=facture`);
}

// ───── Gestes guidés de la page d'une commande ─────
const retour = (id: string, r: Suite, ok: string): never => {
  if (r.erreur) redirect(`/admin/commande/${id}?erreur=${encodeURIComponent(r.erreur)}`);
  // « mail=non » : le changement est fait mais l'e-mail au client n'est pas parti (visible et renvoyable depuis la page).
  redirect(`/admin/commande/${id}?ok=${ok}${r.courrielOk === false ? "&mail=non" : r.courrielOk ? "&mail=oui" : ""}`);
};

export async function lancerProduction(form: FormData) {
  if (!(await estAdmin())) redirect("/admin/connexion");
  const id = String(form.get("id") || "");
  retour(id, await demarrerProduction(id, form.get("scriptValide") === "oui"), "production");
}

export async function proposerScript(form: FormData) {
  if (!(await estAdmin())) redirect("/admin/connexion");
  const id = String(form.get("id") || "");
  retour(id, await envoyerScript(id, String(form.get("script") || "")), "script");
}

export async function livrerAuClient(form: FormData) {
  if (!(await estAdmin())) redirect("/admin/connexion");
  const id = String(form.get("id") || "");
  retour(id, await envoyerLivraison(id), "livraison");
}

export async function cloturerCommande(form: FormData) {
  if (!(await estAdmin())) redirect("/admin/connexion");
  const id = String(form.get("id") || "");
  retour(id, await cloturer(id), "cloture");
}

export async function relancerClient(form: FormData) {
  if (!(await estAdmin())) redirect("/admin/connexion");
  const id = String(form.get("id") || "");
  retour(id, await relancerBrief(id), "relance");
}

// Envoie une alerte de test (téléphone + e-mail) pour vérifier que les notifications arrivent bien.
export async function testerNotification() {
  if (!(await estAdmin())) redirect("/admin/connexion");
  const r = await notificationDeTest();
  const etat = (e: string) => (e === "envoye" ? "ok" : e === "echec" ? "ko" : "non");
  redirect(`/admin/diagnostic?test=${etat(r.push)}-${etat(r.email)}`);
}
