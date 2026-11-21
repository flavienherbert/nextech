"use client";

import { useRef, useState } from "react";

// Lecteur de la vidéo de démonstration : cadre vertical 9:16, lecture au clic, avec le son.
export default function DemoVideo({ video, poster, libelle = "Lire la vidéo de démonstration, avec le son" }: { video: string; poster?: string; libelle?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [lance, setLance] = useState(false);

  return (
    <>
      <video
        ref={ref}
        src={video}
        poster={poster || undefined}
        playsInline
        preload={poster ? "none" : "metadata"}
        controls={lance}
        onEnded={() => setLance(false)}
      />
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
    </>
  );
}
