"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BibliothequeEnvoi, { deposerFichier, type Infos } from "../BibliothequeEnvoi";
import { adresseAdmin } from "../adresse-bibliotheque";
import Copier from "../Copier";
import { capturerImage, libelleRatio, ratioDuFormat } from "../controles-fichier";
import { enregistrerFiche } from "./actions";
import type { Publicite } from "@/lib/bibliotheque";
import type { Fichier } from "@/lib/store";

// Les listes (catégories, styles, formats, statuts) et les limites viennent du serveur (lib/bibliotheque.ts) : elles sont définies à un seul endroit.
export type Listes = {
  categories: string[];
  styles: string[];
  formats: string[];
  statuts: { id: string; nom: string }[];
  avatars: { id: string; nom: string }[];
  limites: { nom: number; produit: number; script: number; prompt: number };
  dureeMax: number;
  dureeVendue: number;
};

type Props = { pub?: Publicite; listes: Listes };

export default function FormulairePub({ pub, listes }: Props) {
  const router = useRouter();
  const [v, setV] = useState<Record<"nom" | "produit" | "categorie" | "avatarId" | "style" | "dureeSecondes" | "format" | "statut" | "ordre" | "script" | "prompt", string>>({
    nom: pub?.nom ?? "",
    produit: pub?.produit ?? "",
    categorie: pub?.categorie ?? "",
    avatarId: pub?.avatarId ?? "",
    style: pub?.style ?? "",
    dureeSecondes: String(pub?.dureeSecondes ?? 15),
    format: pub?.format ?? "9:16",
    statut: pub?.statut ?? "en_cours",
    ordre: String(pub?.ordre ?? 0),
    script: pub?.script ?? "",
    prompt: pub?.prompt ?? "",
  });
  const champ = (k: keyof typeof v) => ({ name: k, value: v[k], onChange: (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value })) });

  const [video, setVideo] = useState<Fichier | null>(pub?.video ?? null);
  const [miniature, setMiniature] = useState<Fichier | null>(pub?.miniature ?? null);
  const [videoChangee, setVideoChangee] = useState(false);
  const [miniatureChangee, setMiniatureChangee] = useState(false);
  const [infos, setInfos] = useState<Infos | null>(null); // dimensions de la vidéo choisie pendant cette visite
  const [locale, setLocale] = useState<File | null>(null); // la vidéo choisie sur l'ordinateur (sert à capturer la miniature)
  const [occupes, setOccupes] = useState(0);
  const [capture, setCapture] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const ratio = ratioDuFormat(v.format);
  const alerteRatio = infos && ratio && Math.abs(infos.w / infos.h - ratio) / ratio > 0.12
    ? `Cette vidéo est au format ${infos.w} × ${infos.h} (${libelleRatio(infos.w / infos.h)}), alors que le format choisi est ${v.format}. Changez le format de la fiche, ou envoyez une autre vidéo.`
    : "";
  const duree = Number(v.dureeSecondes);
  const alerteDuree = Number.isFinite(duree) && duree > listes.dureeVendue
    ? `Cette durée dépasse les ${listes.dureeVendue} secondes que le site vend : une démonstration plus longue peut être gardée dans la bibliothèque, mais évitez de la publier dans le portfolio.`
    : "";

  const choisirVideo = (f: Fichier | null, i?: Infos, local?: File) => {
    setVideo(f);
    setVideoChangee(true);
    setInfos(i ?? null);
    setLocale(local ?? null);
    if (i?.duree) setV((x) => ({ ...x, dureeSecondes: String(Math.max(1, Math.round(i.duree!))) }));
  };
  const choisirMiniature = (f: Fichier | null) => { setMiniature(f); setMiniatureChangee(true); };

  async function capturer() {
    if (!video) return;
    setCapture("Capture en cours…");
    setOccupes((n) => n + 1);
    try {
      const image = await capturerImage(locale ?? adresseAdmin(video), pub?.id ?? "miniature");
      if (!image) {
        setCapture("Le navigateur ne peut pas capturer cette vidéo depuis le stockage. Rechoisissez le fichier vidéo sur votre ordinateur, puis cliquez de nouveau, ou envoyez une image.");
        return;
      }
      const r = await deposerFichier(image, "image", listes.dureeMax);
      if ("erreur" in r) { setCapture(r.erreur); return; }
      choisirMiniature(r.fichier);
      setCapture("Miniature capturée (image prise dans la vidéo).");
    } finally {
      setOccupes((n) => n - 1);
    }
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setEnvoi(true);
    try {
      const r = await enregistrerFiche(pub?.id ?? null, {
        champs: { ...v, dureeSecondes: duree, ordre: v.ordre.trim() === "" ? 0 : Number(v.ordre) },
        video: pub ? (videoChangee ? video : undefined) : video,
        miniature: pub ? (miniatureChangee ? miniature : undefined) : miniature,
      });
      if ("erreur" in r) { setMessage({ ok: false, texte: r.erreur }); return; }
      if (!pub) { router.push(`/admin/publicites/${r.id}?ok=cree`); return; }
      setVideoChangee(false);
      setMiniatureChangee(false);
      setMessage({ ok: true, texte: "Enregistré." });
      router.refresh();
    } catch {
      setMessage({ ok: false, texte: "Connexion interrompue : rien n'a été enregistré, recommencez." });
    } finally {
      setEnvoi(false);
    }
  }

  const option = (valeur: string, liste: string[], ancienne: string) =>
    ancienne && !liste.includes(ancienne) ? <option value={ancienne}>{ancienne} (ancienne valeur)</option> : null;

  return (
    <form className="formulaire pub-formulaire" onSubmit={enregistrer} noValidate>
      <div className="pub-champs">
        <label className="champ pub-large"><span>Nom de la publicité *</span><input {...champ("nom")} maxLength={listes.limites.nom} required /></label>
        <label className="champ"><span>Produit</span><input {...champ("produit")} maxLength={listes.limites.produit} /></label>
        <label className="champ"><span>Catégorie</span>
          <select {...champ("categorie")}>
            <option value="">— Aucune —</option>
            {listes.categories.map((c) => <option key={c} value={c}>{c}</option>)}
            {option(v.categorie, listes.categories, pub?.categorie ?? "")}
          </select>
        </label>
        <label className="champ"><span>Avatar (présentateur)</span>
          <select {...champ("avatarId")}>
            <option value="">— Aucun (sans présentateur) —</option>
            {listes.avatars.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
          </select>
        </label>
        <label className="champ"><span>Style</span>
          <select {...champ("style")}>
            <option value="">— Aucun —</option>
            {listes.styles.map((c) => <option key={c} value={c}>{c}</option>)}
            {option(v.style, listes.styles, pub?.style ?? "")}
          </select>
        </label>
        <label className="champ"><span>Durée (secondes, 1 à {listes.dureeMax})</span><input type="number" inputMode="numeric" min={1} max={listes.dureeMax} step={1} {...champ("dureeSecondes")} /></label>
        <label className="champ"><span>Format</span>
          <select {...champ("format")}>{listes.formats.map((f) => <option key={f} value={f}>{f}</option>)}</select>
        </label>
        <label className="champ"><span>Statut</span>
          <select {...champ("statut")}>{listes.statuts.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}</select>
        </label>
        <label className="champ"><span>Ordre d&apos;affichage</span><input type="number" inputMode="numeric" step={1} {...champ("ordre")} /><small>Portfolio et accueil : les plus petits nombres d&apos;abord (0 partout = les plus récentes d&apos;abord).</small></label>
      </div>
      {alerteDuree && <p className="avis" role="status">{alerteDuree}</p>}

      <div className="pub-fichiers">
        <div>
          <BibliothequeEnvoi idChamp="envoi-video" genre="video" etiquette="Vidéo" valeur={video} dureeMax={listes.dureeMax} onChange={choisirVideo} onOccupe={(o) => setOccupes((n) => n + (o ? 1 : -1))} />
          {alerteRatio && <p className="avis" role="status">{alerteRatio}</p>}
        </div>
        <div>
          <BibliothequeEnvoi idChamp="envoi-miniature" genre="image" etiquette="Miniature" valeur={miniature} dureeMax={listes.dureeMax} onChange={(f) => choisirMiniature(f)} onOccupe={(o) => setOccupes((n) => n + (o ? 1 : -1))} />
          {video && !miniature && (
            <p className="aide">
              Pas de miniature ?{" "}
              <button type="button" className="bouton bouton-fantome bouton-petit" onClick={capturer} disabled={occupes > 0}>Capturer la miniature</button>{" "}
              <small>(image prise dans la vidéo, dans votre navigateur)</small>
            </p>
          )}
          {capture && <p className="aide" role="status">{capture}</p>}
        </div>
      </div>

      <div className="pub-texte">
        <p className="pub-texte-titre"><strong>Script</strong> <small className="aide">({v.script.length}/{listes.limites.script})</small></p>
        <Copier texte={v.script} libelle="Script" bouton="Copier le script" rows={7} maxLength={listes.limites.script} onChange={(t) => setV((x) => ({ ...x, script: t }))} />
      </div>
      <div className="pub-texte">
        <p className="pub-texte-titre"><strong>Prompt de génération</strong> <small className="aide">({v.prompt.length}/{listes.limites.prompt})</small></p>
        <Copier texte={v.prompt} libelle="Prompt de génération" bouton="Copier le prompt" rows={9} maxLength={listes.limites.prompt} onChange={(t) => setV((x) => ({ ...x, prompt: t }))} />
      </div>

      {message && <p className={`avis ${message.ok ? "avis-ok" : "avis-erreur"}`} role={message.ok ? "status" : "alert"}>{message.texte}</p>}
      <div className="actions">
        <button className="bouton" type="submit" disabled={envoi || occupes > 0}>{envoi ? "Enregistrement…" : occupes > 0 ? "Envoi du fichier en cours…" : pub ? "Enregistrer" : "Créer la publicité"}</button>
      </div>
    </form>
  );
}
