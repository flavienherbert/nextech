"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { adresseClient } from "@/lib/limiteur";
import { essaiAutorise, estAdmin, fermerSession, motDePasseValide, noterEssai, ouvrirSession, ralentir, suiteValide } from "@/lib/auth";
import { emettreFacture } from "@/lib/factures";
import { alerter, notificationDeTest } from "@/lib/alertes";
import { changerStatut, cloturer, demarrerProduction, envoyerLivraison, relancerBrief, type Suite } from "@/lib/commandes";
import { courriels, enEchec } from "@/lib/mail";
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
  retour(id, await demarrerProduction(id), "production");
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
