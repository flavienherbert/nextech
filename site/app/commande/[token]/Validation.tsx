"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TOUR_DEFINITION, TOUR_HORS_PERIMETRE, TOUR_PERIMETRE } from "@/lib/formules";

export default function Validation({ token, restantes, total, echeance, expire, jours }: { token: string; restantes: number; total: number; echeance: string; expire: boolean; jours: number }) {
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
        <p className="petit"><strong>{TOUR_DEFINITION}</strong> {TOUR_PERIMETRE} {TOUR_HORS_PERIMETRE}</p>
        <label className="champ champ-large">
          <span>Toutes vos remarques, en une seule demande</span>
          <textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Pour chaque vidéo : quel moment, quel changement. Regroupez tout ici : une fois envoyée, cette demande utilise un tour de retouches." />
        </label>
        <p className="petit">Il vous reste {restantes} tour{restantes > 1 ? "s" : ""} de retouches sur {total}. Cette demande en utilisera un.</p>
        {erreur && <p className="avis avis-erreur" role="alert">{erreur}</p>}
        <div className="actions">
          <button className="bouton" onClick={() => envoyer("retouche")} disabled={occupe}>
            Envoyer ma demande (1 tour)
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
        {restantes > 0 && !expire && (
          <button className="bouton bouton-fantome" onClick={() => setMode("retouche")} disabled={occupe}>
            Demander un tour de retouches
          </button>
        )}
      </div>
      <p className="petit">
        {expire
          ? `Le délai de ${jours} jours est écoulé (échéance : ${echeance}) : vous pouvez encore valider la livraison ; à défaut, elle sera réputée acceptée.`
          : `Vous avez jusqu'au ${echeance} inclus (heure de Paris), soit ${jours} jours après la livraison, pour valider ou demander un tour de retouches ; passé ce délai, la livraison est réputée acceptée.`}
      </p>
      <p className="petit">
        {restantes > 0 ? `Tours de retouches restants : ${restantes} sur ${total}. Un tour = une seule demande qui regroupe toutes vos remarques sur l'ensemble des vidéos.` : "Les tours de retouches inclus dans votre formule ont été utilisés."}
      </p>
    </div>
  );
}
