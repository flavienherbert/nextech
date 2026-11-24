"use server";

import { redirect } from "next/navigation";
import { estAdmin } from "@/lib/auth";
import { creerAvatar, estErreur, ID_AVATAR, modifierAvatar, supprimerAvatar, type ChampsAvatar } from "@/lib/bibliotheque";
import type { Fichier } from "@/lib/store";

const exiger = async () => { if (!(await estAdmin())) redirect("/admin/connexion"); };

// Création (si `id` est null) ou modification d'un avatar. `photo` : absent = inchangée, null = retirée, sinon le fichier envoyé.
export async function enregistrerAvatarAction(id: string | null, saisie: { champs: ChampsAvatar; photo?: Fichier | null }): Promise<{ erreur: string } | { id: string }> {
  await exiger();
  if (!saisie || typeof saisie !== "object") return { erreur: "Données invalides." };
  if (id) {
    const r = await modifierAvatar(id, saisie.champs ?? {}, saisie.photo);
    return estErreur(r) ? { erreur: r.erreur } : { id: r.avatar.id };
  }
  const r = await creerAvatar(saisie.champs ?? {}, saisie.photo ?? undefined);
  return estErreur(r) ? { erreur: r.erreur } : { id: r.avatar.id };
}

// Un avatar lié à une publicité n'est pas supprimé : la page affiche alors la liste des publicités concernées.
export async function supprimerAvatarAction(form: FormData) {
  await exiger();
  const id = String(form.get("id") || "");
  if (!ID_AVATAR.test(id)) redirect("/admin/avatars");
  const r = await supprimerAvatar(id);
  redirect("ok" in r ? "/admin/avatars?ok=supprime" : `/admin/avatars?erreur=${r.liees ? "lie" : "introuvable"}&avatar=${id}`);
}
