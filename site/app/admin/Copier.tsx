"use client";

import { useState } from "react";

// Texte prêt à copier d'un clic (fiche de production).
export default function Copier({ texte }: { texte: string }) {
  const [etat, setEtat] = useState("");
  return (
    <div className="formulaire">
      <textarea readOnly rows={Math.min(24, texte.split("\n").length + 1)} value={texte} aria-label="Fiche de production" onFocus={(e) => e.currentTarget.select()} style={{ width: "100%", font: "13px/1.5 ui-monospace, monospace" }} />
      <button
        type="button"
        className="bouton bouton-petit bouton-fantome"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(texte);
            setEtat("Copié.");
          } catch {
            setEtat("Sélectionnez le texte et copiez-le (Ctrl+C).");
          }
        }}
      >
        Copier la fiche
      </button>
      <span className="aide" role="status"> {etat}</span>
    </div>
  );
}
