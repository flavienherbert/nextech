"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { envoyerFichier } from "../components/envoi";
import { lireImage, lireVideo, libelleRatio, optimiser } from "./controles-fichier";
import { DUREE_MAX_SECONDES } from "@/lib/formules";

type Props = { slot: string; genre: "image" | "video"; ratio: number; largeurMax?: number; maxMo: number; remplace: boolean };

export default function MediaEnvoi({ slot, genre, ratio, largeurMax, maxMo, remplace }: Props) {
  const router = useRouter();
  const champ = useRef<HTMLInputElement | null>(null);
  const [etat, setEtat] = useState("");
  const [erreur, setErreur] = useState("");
  const [ok, setOk] = useState("");

  async function deposer(liste: FileList | null) {
    const f0 = liste?.[0];
    if (!f0) return;
    setErreur("");
    setOk("");
    let f = f0;
    // Contrôles avant l'envoi : un fichier qui ne convient pas est signalé, et c'est le vendeur qui décide.
    if (genre === "image") {
      const d = await lireImage(f);
      if (!d) { setErreur("Ce fichier n'est pas une image lisible."); if (champ.current) champ.current.value = ""; return; }
      if (Math.abs(d.w / d.h - ratio) / ratio > 0.12 && !window.confirm(`Cette image est au format ${d.w} × ${d.h}, alors que cet emplacement attend un format ${libelleRatio(ratio)}. Elle sera recadrée sur le site. Continuer ?`)) {
        if (champ.current) champ.current.value = "";
        return;
      }
      if (largeurMax) {
        setEtat("Préparation de l'image…");
        f = await optimiser(f, largeurMax);
      }
    } else {
      const d = await lireVideo(f);
      if (!d) { setErreur("Ce fichier n'est pas une vidéo lisible par le navigateur (utilisez un MP4 H.264 ou un WebM)."); if (champ.current) champ.current.value = ""; return; }
      const alertes: string[] = [];
      if (Math.abs(d.w / d.h - ratio) / ratio > 0.12) alertes.push(`Cette vidéo est au format ${d.w} × ${d.h}, le format attendu est vertical 9:16 (1080 × 1920). Elle sera recadrée dans le téléphone.`);
      if (d.duree > DUREE_MAX_SECONDES + 1) alertes.push(`Cette vidéo dure ${Math.round(d.duree)} secondes : le site vend des vidéos de ${DUREE_MAX_SECONDES} secondes maximum. Un exemple plus long montrerait un format que vous ne livrez pas.`);
      if (f.size > 15 * 1048576) alertes.push(`Ce fichier pèse ${(f.size / 1048576).toFixed(0)} Mo : la lecture sera lente sur un téléphone en 4G. 15 Mo ou moins est conseillé.`);
      if (alertes.length && !window.confirm(`${alertes.join("\n\n")}\n\nEnvoyer quand même ?`)) {
        if (champ.current) champ.current.value = "";
        return;
      }
    }
    setEtat(`Envoi de ${f.name}…`);
    const r = await envoyerFichier(`/api/admin/medias/${slot}`, f);
    setEtat("");
    if (champ.current) champ.current.value = "";
    if (r.erreur) { setErreur(r.erreur); return; }
    setOk("Enregistré. Le site est mis à jour.");
    router.refresh();
  }

  const accept = genre === "image" ? ".jpg,.jpeg,.png,.webp" : ".mp4,.webm";
  const id = `envoi-${slot}`;
  return (
    <div className="media-envoi">
      <input ref={champ} id={id} className="depot-natif" type="file" accept={accept} onChange={(e) => deposer(e.target.files)} disabled={Boolean(etat)} />
      <label htmlFor={id} className={`bouton bouton-petit${etat ? " depot-off" : ""}`}>
        {etat || (remplace ? (genre === "image" ? "Remplacer l'image" : "Remplacer la vidéo") : genre === "image" ? "Choisir une image" : "Choisir une vidéo")}
      </label>
      <span className="aide" role="status">{ok}</span>
      {erreur && <p className="avis avis-erreur" role="alert">{erreur}</p>}
      <small className="aide">Jusqu'à {maxMo} Mo.</small>
    </div>
  );
}
