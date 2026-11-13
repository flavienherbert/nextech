"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Validation({ token, restantes }: { token: string; restantes: number }) {
  const router = useRouter();
  const [mode, setMode] = useState<"choix" | "retouche">("choix");
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const [occupe, setOccupe] = useState(false);

  async function envoyer(action: "valider" | "retouche") {
    setOccupe(true);
    setErreur("");
    const r = await fetch(`/api/commande/${token}/validation`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, message }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErreur(d.erreur || "Action impossible.");
      setOccupe(false);
      return;
    }
    router.refresh();
  }

  if (mode === "retouche")
    return (
      <div className="validation">
        <label className="champ champ-large">
          <span>Que faut-il modifier ?</span>
          <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Soyez précis : quelle vidéo, quel moment, quel changement." />
        </label>
        {erreur && <p className="avis avis-erreur" role="alert">{erreur}</p>}
        <div className="actions">
          <button className="bouton" onClick={() => envoyer("retouche")} disabled={occupe}>
            Envoyer la demande
          </button>
          <button className="bouton bouton-fantome" onClick={() => setMode("choix")} disabled={occupe}>
            Retour
          </button>
        </div>
      </div>
    );

  return (
    <div className="validation">
      {erreur && <p className="avis avis-erreur" role="alert">{erreur}</p>}
      <div className="actions">
        <button className="bouton" onClick={() => envoyer("valider")} disabled={occupe}>
          Je valide la livraison
        </button>
        {restantes > 0 && (
          <button className="bouton bouton-fantome" onClick={() => setMode("retouche")} disabled={occupe}>
            Demander une retouche
          </button>
        )}
      </div>
      <p className="petit">
        {restantes > 0 ? `Retouches incluses restantes : ${restantes}.` : "Les retouches incluses dans votre formule ont été utilisées."}
      </p>
    </div>
  );
}
