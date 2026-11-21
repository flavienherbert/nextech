"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { envoyerFichier } from "../components/envoi";

type Props = { slot: string; genre: "image" | "video"; ratio: number; largeurMax?: number; maxMo: number; remplace: boolean };

const SEUIL_LOURD = 1_200_000; // au-delà, une image est réduite avant l'envoi (la page d'accueil doit rester rapide)

// Dimensions d'une image, lues dans le navigateur sans adresse temporaire (la politique de sécurité n'autorise pas « blob: » pour les images).
async function lireImage(f: File): Promise<{ w: number; h: number } | null> {
  try {
    const b = await createImageBitmap(f);
    const d = { w: b.width, h: b.height };
    b.close();
    return d;
  } catch {
    return null;
  }
}

function lireVideo(f: File): Promise<{ w: number; h: number; duree: number } | null> {
  return new Promise((ok) => {
    const u = URL.createObjectURL(f);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { URL.revokeObjectURL(u); ok({ w: v.videoWidth, h: v.videoHeight, duree: v.duration }); };
    v.onerror = () => { URL.revokeObjectURL(u); ok(null); };
    v.src = u;
  });
}

// Réduit et recompresse une image trop grande ou trop lourde (WebP si le navigateur sait l'écrire, sinon JPEG).
// L'original est conservé si le résultat n'est pas plus léger ou si le navigateur ne sait pas faire.
async function optimiser(f: File, largeurMax: number): Promise<File> {
  try {
    const bmp = await createImageBitmap(f);
    const echelle = Math.min(1, largeurMax / bmp.width);
    if (echelle === 1 && f.size <= SEUIL_LOURD) { bmp.close(); return f; }
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * echelle);
    c.height = Math.round(bmp.height * echelle);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    for (const type of ["image/webp", "image/jpeg"]) {
      const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, type, 0.86));
      if (blob && blob.type === type) {
        if (blob.size >= f.size) return f;
        return new File([blob], f.name.replace(/\.[^.]+$/, "") + (type === "image/webp" ? ".webp" : ".jpg"), { type });
      }
    }
  } catch {
    /* navigateur trop ancien : on envoie le fichier tel quel */
  }
  return f;
}

const libelleRatio = (r: number) => (Math.abs(r - 9 / 16) < 0.02 ? "vertical 9:16" : Math.abs(r - 3 / 2) < 0.02 ? "horizontal 3:2" : r > 1 ? "horizontal" : "vertical");

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
      if (d.duree > 60) alertes.push(`Cette vidéo dure ${Math.round(d.duree)} secondes : au-delà d'une minute, peu de visiteurs la regarderont jusqu'au bout.`);
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
