"use client";

import { useRef, useState } from "react";
import type { Chapitre } from "../config";

function horodatage(s: number) {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

// Lecteur du film de démonstration, avec chapitres cliquables.
export default function FilmPlayer({ chapitres }: { chapitres: Chapitre[] }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [lecture, setLecture] = useState(false);
  const [temps, setTemps] = useState(0);
  const [duree, setDuree] = useState(0);

  const actif = chapitres.reduce((acc, c, i) => (temps >= c.debut ? i : acc), 0);

  const basculer = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const aller = (t: number) => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = t + 0.01;
    v.play().catch(() => {});
  };

  return (
    <div className="film-grille">
      <div className="film-ecran">
        <div className="telephone">
          <video
            ref={ref}
            src="/media/film.mp4"
            poster="/media/film.jpg"
            playsInline
            preload="metadata"
            onPlay={() => setLecture(true)}
            onPause={() => setLecture(false)}
            onEnded={() => setLecture(false)}
            onTimeUpdate={(e) => setTemps(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuree(e.currentTarget.duration)}
            onClick={basculer}
          />
          {!lecture && (
            <button
              type="button"
              className="film-lecture"
              onClick={basculer}
              aria-label="Lire le film avec le son"
            >
              <span aria-hidden="true" />
            </button>
          )}
          <div className="film-barre" aria-hidden="true">
            <i style={{ width: duree ? `${(temps / duree) * 100}%` : "0%" }} />
          </div>
        </div>
        <p className="film-note">Avec le son · 14 secondes</p>
      </div>

      <ol className="chapitres">
        {chapitres.map((c, i) => (
          <li key={c.titre} className={i === actif && (lecture || temps > 0) ? "actif" : ""}>
            <button type="button" onClick={() => aller(c.debut)}>
              <span className="chapitre-temps">{horodatage(c.debut)}</span>
              <span className="chapitre-corps">
                <strong>{c.titre}</strong>
                <span>{c.texte}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
