"use client";

import { useState } from "react";

// Texte prêt à copier d'un clic (fiche de production d'une commande ; script et prompt d'une publicité).
// Sans `onChange` : texte en lecture seule. Avec `onChange` : champ modifiable ; la copie prend alors le texte courant.
export default function Copier({
  texte,
  libelle = "Fiche de production",
  bouton = "Copier la fiche",
  rows,
  maxLength,
  onChange,
}: {
  texte: string;
  libelle?: string;
  bouton?: string;
  rows?: number;
  maxLength?: number;
  onChange?: (valeur: string) => void;
}) {
  const [etat, setEtat] = useState("");
  return (
    <div className="formulaire">
      <textarea
        readOnly={!onChange}
        rows={rows ?? Math.min(24, texte.split("\n").length + 1)}
        value={texte}
        maxLength={maxLength}
        aria-label={libelle}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        onFocus={onChange ? undefined : (e) => e.currentTarget.select()}
        style={{ width: "100%", font: "13px/1.5 ui-monospace, monospace" }}
      />
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
        {bouton}
      </button>
      <span className="aide" role="status"> {etat}</span>
    </div>
  );
}
