"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { envoyerFichier } from "../components/envoi";

// Dépôt d'un livrable : envoi direct au stockage, sans limite liée au serveur.
export default function Livrable({ commande }: { commande: string }) {
  const router = useRouter();
  const champ = useRef<HTMLInputElement | null>(null);
  const [etat, setEtat] = useState("");
  const [erreur, setErreur] = useState("");

  async function deposer(liste: FileList | null) {
    if (!liste?.length) return;
    setErreur("");
    for (const f of Array.from(liste)) {
      setEtat(`Envoi de ${f.name}…`);
      const r = await envoyerFichier(`/api/admin/commande/${commande}/livrable`, f);
      if (r.erreur) {
        setErreur(`${f.name} : ${r.erreur}`);
        break;
      }
    }
    setEtat("");
    if (champ.current) champ.current.value = "";
    router.refresh();
  }

  return (
    <div className="formulaire">
      <input ref={champ} id="livrable" className="depot-natif" type="file" multiple accept=".mp4,.mov,.webm,.jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => deposer(e.target.files)} disabled={Boolean(etat)} />
      <label htmlFor="livrable" className={`depot${etat ? " depot-off" : ""}`}>
        {etat || "Ajouter une vidéo ou un fichier (300 Mo max.)"}
      </label>
      {erreur && <p className="avis avis-erreur" role="alert">{erreur}</p>}
    </div>
  );
}
