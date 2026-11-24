"use server";

import { redirect } from "next/navigation";
import { estAdmin } from "@/lib/auth";
import { creerPublicite, definirALaUne, definirPublication, dupliquerPublicite, enregistrerPublicite, estErreur, ID_PUB, supprimerPublicite, type ChampsPub } from "@/lib/bibliotheque";
import type { Fichier } from "@/lib/store";

const exiger = async () => { if (!(await estAdmin())) redirect("/admin/connexion"); };
const idDe = (form: FormData) => {
  const id = String(form.get("id") || "");
  if (!ID_PUB.test(id)) redirect("/admin/publicites");
  return id;
};
const fiche = (id: string, requete: string) => `/admin/publicites/${id}?${requete}`;

// Enregistrement du formulaire (création si `id` est null). `video` / `miniature` : absent = inchangé, null = retiré, sinon le fichier envoyé.
export async function enregistrerFiche(id: string | null, saisie: { champs: ChampsPub; video?: Fichier | null; miniature?: Fichier | null }): Promise<{ erreur: string } | { id: string }> {
  await exiger();
  if (!saisie || typeof saisie !== "object") return { erreur: "Données invalides." };
  const r = id
    ? await enregistrerPublicite(id, saisie.champs ?? {}, { video: saisie.video, miniature: saisie.miniature })
    : await creerPublicite(saisie.champs ?? {}, { video: saisie.video ?? undefined, miniature: saisie.miniature ?? undefined });
  return estErreur(r) ? { erreur: r.erreur } : { id: r.publicite.id };
}

export async function basculerPublication(form: FormData) {
  await exiger();
  const id = idDe(form);
  const publier = form.get("publier") === "1";
  const r = await definirPublication(id, publier);
  redirect(fiche(id, estErreur(r) ? "erreur=publication" : `ok=${publier ? "publiee" : "depubliee"}`));
}

export async function basculerALaUne(form: FormData) {
  await exiger();
  const id = idDe(form);
  const mettre = form.get("une") === "1";
  const r = await definirALaUne(id, mettre);
  redirect(fiche(id, estErreur(r) ? `erreur=${/au maximum/.test(r.erreur) ? "une-max" : "une-privee"}` : `ok=${mettre ? "une" : "pasune"}`));
}

export async function dupliquer(form: FormData) {
  await exiger();
  const id = idDe(form);
  const r = await dupliquerPublicite(id);
  redirect(estErreur(r) ? fiche(id, "erreur=introuvable") : fiche(r.publicite.id, "ok=duplique"));
}

// Suppression : l'identifiant doit être retapé (aucune fenêtre du navigateur). Les fichiers sont effacés par le nettoyage après 24 heures.
export async function supprimer(form: FormData) {
  await exiger();
  const id = idDe(form);
  if (String(form.get("confirmation") || "").trim().toUpperCase() !== id) redirect(fiche(id, "erreur=confirmation"));
  await supprimerPublicite(id);
  redirect(`/admin/publicites?ok=supprimee&id=${id}`);
}
