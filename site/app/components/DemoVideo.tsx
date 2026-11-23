"use client";

import { useRef, useState } from "react";

// Lecteur de la vidéo d'exemple : cadre vertical 9:16, lecture au clic, SANS SON au départ.
// Les sous-titres sont incrustés dans la vidéo (comme dans les vidéos livrées) ; un fichier WebVTT peut s'y ajouter (« soustitres »).
// Un bouton permet d'activer ou de couper le son.
export default function DemoVideo({
  video,
  poster,
  soustitres,
  libelle = "Lire la vidéo d'exemple (sans le son)",
}: {
  video: string;
  poster?: string;
  soustitres?: string;
  libelle?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [lance, setLance] = useState(false);
  const [muet, setMuet] = useState(true);

  return (
    <>
      <video
        ref={ref}
        src={video}
        poster={poster || undefined}
        muted={muet}
        playsInline
        preload={poster ? "none" : "metadata"}
        controls={lance}
        onVolumeChange={(e) => setMuet(e.currentTarget.muted)}
        onEnded={() => setLance(false)}
      >
        {soustitres && <track kind="captions" src={soustitres} srcLang="fr" label="Français" default />}
      </video>
      {!lance && (
        <button
          type="button"
          className="demo-lecture"
          aria-label={libelle}
          onClick={() => {
            setLance(true);
            void ref.current?.play();
          }}
        >
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
          </svg>
        </button>
      )}
      {lance && (
        <button
          type="button"
          className="demo-son"
          onClick={() => {
            if (ref.current) ref.current.muted = !ref.current.muted;
            setMuet(ref.current?.muted ?? true);
          }}
        >
          {muet ? "Activer le son" : "Couper le son"}
        </button>
      )}
    </>
  );
}
