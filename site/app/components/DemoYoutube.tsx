"use client";

import { useState } from "react";

// Exemple externe : lecteur officiel YouTube (mode sans cookie), chargé seulement au clic.
// Rien n'est téléchargé ni modifié ; aucune requête ne part vers YouTube avant le clic.
export default function DemoYoutube({ id, chaine }: { id: string; chaine: string }) {
  const [lance, setLance] = useState(false);

  if (lance) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0`}
        title={`Exemple externe de publicité générée par IA, par ${chaine}`}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }
  return (
    <div className="demo-reserve">
      <button type="button" className="demo-lecture demo-lecture-bloc" aria-label="Lire l'exemple externe sur le lecteur YouTube" onClick={() => setLance(true)}>
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
          <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
        </svg>
      </button>
      <span className="demo-reserve-titre">Voir l&apos;exemple</span>
      <span>Vidéo de {chaine}</span>
      <span className="demo-reserve-format">Lecteur YouTube · chargé au clic</span>
    </div>
  );
}
