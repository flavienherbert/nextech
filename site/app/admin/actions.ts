"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { essaiAutorise, estAdmin, fermerSession, motDePasseValide, noterEssai, ouvrirSession } from "@/lib/auth";
import { changerStatut } from "@/lib/commandes";
import { store, journal, STATUTS, type Statut } from "@/lib/store";

export async function connexion(form: FormData) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!essaiAutorise(ip)) redirect("/admin/connexion?erreur=essais");
  const valide = motDePasseValide(String(form.get("motdepasse") || ""));
  noterEssai(ip, valide);
  if (!valide) redirect("/admin/connexion?erreur=refus");
  await ouvrirSession();
  redirect("/admin");
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
