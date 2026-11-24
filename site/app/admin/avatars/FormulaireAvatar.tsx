"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BibliothequeEnvoi from "../BibliothequeEnvoi";
import { enregistrerAvatarAction } from "./actions";
import type { Avatar } from "@/lib/bibliotheque";
import type { Fichier } from "@/lib/store";

type Props = { avatar?: Avatar; genres: { id: string; nom: string }[]; limites: { description: number; reference: number; notes: number }; dureeMax: number };

// Ajout ou modification d'un avatar (présentateur). La photo est facultative ; elle n'est jamais affichée au public.
export default function FormulaireAvatar({ avatar, genres, limites, dureeMax }: Props) {
  const router = useRouter();
  const [v, setV] = useState({ id: "", nom: avatar?.nom ?? "", genre: avatar?.genre ?? "femme", description: avatar?.description ?? "", reference: avatar?.reference ?? "", notes: avatar?.notes ?? "" });
  const champ = (k: keyof typeof v) => ({ name: k, value: v[k] as string, onChange: (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value })) });
  const [photo, setPhoto] = useState<Fichier | null>(avatar?.photo ?? null);
  const [changee, setChangee] = useState(false);
  const [occupe, setOccupe] = useState(0);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setEnvoi(true);
    try {
      const r = await enregistrerAvatarAction(avatar?.id ?? null, { champs: v, photo: avatar ? (changee ? photo : undefined) : photo });
      if ("erreur" in r) { setMessage({ ok: false, texte: r.erreur }); return; }
      setChangee(false);
      if (!avatar) {
        setV({ id: "", nom: "", genre: "femme", description: "", reference: "", notes: "" });
        setPhoto(null);
      }
      setMessage({ ok: true, texte: avatar ? "Enregistré." : `Avatar « ${r.id} » ajouté.` });
      router.refresh();
    } catch {
      setMessage({ ok: false, texte: "Connexion interrompue : rien n'a été enregistré, recommencez." });
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <form className="formulaire pub-formulaire" onSubmit={enregistrer} noValidate>
      <div className="pub-champs">
        <label className="champ"><span>Nom *</span><input {...champ("nom")} maxLength={60} required placeholder="Femme 03" /></label>
        {!avatar && <label className="champ"><span>Identifiant (facultatif)</span><input {...champ("id")} maxLength={40} placeholder="femme-03" pattern="[a-z0-9\-]*" /><small>Minuscules, chiffres et tirets. Sans identifiant, il est déduit du nom.</small></label>}
        <label className="champ"><span>Genre</span>
          <select {...champ("genre")}>{genres.map((g) => <option key={g.id} value={g.id}>{g.nom}</option>)}</select>
        </label>
        <label className="champ"><span>Référence (outil de génération)</span><input {...champ("reference")} maxLength={limites.reference} placeholder="Higgsfield · Soul ID …" /></label>
      </div>
      <label className="champ"><span>Description (apparence, ton)</span><textarea rows={3} {...champ("description")} maxLength={limites.description} /></label>
      <label className="champ"><span>Notes</span><textarea rows={2} {...champ("notes")} maxLength={limites.notes} /></label>
      <BibliothequeEnvoi idChamp={`envoi-photo-${avatar?.id ?? "nouveau"}`} genre="image" etiquette={`Photo${avatar ? ` (${avatar.nom})` : ""}`} valeur={photo} dureeMax={dureeMax} onChange={(f) => { setPhoto(f); setChangee(true); }} onOccupe={(o) => setOccupe((n) => n + (o ? 1 : -1))} aide="Facultative. JPG, PNG ou WebP. Jamais affichée au public." />
      {message && <p className={`avis ${message.ok ? "avis-ok" : "avis-erreur"}`} role={message.ok ? "status" : "alert"}>{message.texte}</p>}
      <div className="actions">
        <button className="bouton bouton-petit" type="submit" disabled={envoi || occupe > 0}>{envoi ? "Enregistrement…" : avatar ? "Enregistrer" : "Ajouter l'avatar"}</button>
      </div>
    </form>
  );
}
