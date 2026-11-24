"use client";

import { useRef, useState } from "react";
import { envoyerFichier } from "../components/envoi";
import { adresseAdmin } from "./adresse-bibliotheque";
import { lireImage, lireVideo, optimiser } from "./controles-fichier";
import type { Fichier } from "@/lib/store";

// Envoi d'une vidéo, d'une miniature ou d'une photo d'avatar de la bibliothèque (dossier « bibliotheque/ »).
// Mêmes contrôles dans le navigateur que les médias du site (lecture, dimensions, durée, poids), puis envoi en trois temps.
// Les alertes (format, durée) ne bloquent pas : elles s'affichent dans la fiche, le vendeur décide.

const MAX_MO = 40;

export type Infos = { w: number; h: number; duree?: number };
export type Resultat = { fichier: Fichier; infos?: Infos; local: File } | { erreur: string };

// Contrôle puis envoie un fichier. `dureeMax` : durée maximale d'une vidéo, en secondes (refus au-delà).
export async function deposerFichier(f0: File, genre: "image" | "video", dureeMax: number, largeurMax = 1080): Promise<Resultat> {
  let f = f0;
  let infos: Infos | undefined;
  if (f.size > MAX_MO * 1048576) return { erreur: `Fichier trop volumineux (${MAX_MO} Mo maximum).` };
  if (genre === "image") {
    const d = await lireImage(f);
    if (!d) return { erreur: "Ce fichier n'est pas une image lisible." };
    infos = d;
    f = await optimiser(f, largeurMax);
  } else {
    const d = await lireVideo(f);
    if (!d) return { erreur: "Ce fichier n'est pas une vidéo lisible par le navigateur (utilisez un MP4 H.264 ou un WebM)." };
    if (d.duree > dureeMax + 0.5) return { erreur: `Cette vidéo dure ${Math.round(d.duree)} secondes : la bibliothèque accepte ${dureeMax} secondes au plus.` };
    infos = d;
  }
  const r = await envoyerFichier("/api/admin/bibliotheque", f);
  if (r.erreur || !r.id || !r.type) return { erreur: r.erreur || "Envoi refusé." };
  return { fichier: { id: r.id, nom: r.nom || f.name, taille: r.taille || f.size, type: r.type, ajouteLe: r.ajouteLe || "" }, infos, local: f };
}

type Props = {
  genre: "image" | "video";
  etiquette: string;
  valeur: Fichier | null;
  dureeMax: number;
  onChange: (f: Fichier | null, infos?: Infos, local?: File) => void;
  aide?: string;
  // Identifiant du champ de fichier (sert aux libellés et aux tests automatiques).
  idChamp: string;
  // Prévient la fiche qu'un envoi est en cours (le bouton Enregistrer attend).
  onOccupe?: (occupe: boolean) => void;
};

export default function BibliothequeEnvoi({ genre, etiquette, valeur, dureeMax, onChange, aide, onOccupe, idChamp }: Props) {
  const champ = useRef<HTMLInputElement | null>(null);
  const [etat, setEtat] = useState("");
  const [erreur, setErreur] = useState("");
  const id = idChamp;

  async function choisir(liste: FileList | null) {
    const f = liste?.[0];
    if (!f) return;
    setErreur("");
    setEtat(genre === "image" ? "Préparation et envoi de l'image…" : `Envoi de ${f.name}…`);
    onOccupe?.(true);
    const r = await deposerFichier(f, genre, dureeMax);
    setEtat("");
    onOccupe?.(false);
    if (champ.current) champ.current.value = "";
    if ("erreur" in r) { setErreur(r.erreur); return; }
    onChange(r.fichier, r.infos, genre === "video" ? f : undefined);
  }

  return (
    <div className="pub-envoi">
      <p className="pub-envoi-titre"><strong>{etiquette}</strong></p>
      {valeur && (
        <div className="pub-envoi-apercu">
          {genre === "image"
            ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={adresseAdmin(valeur)} alt="" />
            : <video src={adresseAdmin(valeur)} controls playsInline preload="metadata" />}
          <p className="aide">{valeur.nom} · {(valeur.taille / 1048576).toFixed(1).replace(".", ",")} Mo</p>
        </div>
      )}
      <div className="media-envoi">
        <input ref={champ} id={id} className="depot-natif" type="file" accept={genre === "image" ? ".jpg,.jpeg,.png,.webp" : ".mp4,.webm"} onChange={(e) => choisir(e.target.files)} disabled={Boolean(etat)} />
        <label htmlFor={id} className={`bouton bouton-petit${etat ? " depot-off" : ""}`}>
          {etat || (valeur ? "Remplacer" : genre === "image" ? "Choisir une image" : "Choisir une vidéo")}
        </label>
        {valeur && !etat && <button type="button" className="bouton bouton-fantome bouton-petit" onClick={() => onChange(null)}>Retirer</button>}
        {erreur && <p className="avis avis-erreur" role="alert">{erreur}</p>}
        <small className="aide">{aide ?? (genre === "image" ? `JPG, PNG ou WebP, jusqu'à ${MAX_MO} Mo.` : `MP4 (H.264) ou WebM, ${dureeMax} secondes et ${MAX_MO} Mo au plus.`)}</small>
      </div>
    </div>
  );
}
