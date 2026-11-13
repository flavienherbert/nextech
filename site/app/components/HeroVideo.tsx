"use client";

import { useEffect, useRef, useState } from "react";

// Film d'accueil : version large en trois volets sur ordinateur,
// version verticale sur mobile. Muet, en boucle, sans son.
export default function HeroVideo() {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [src, setSrc] = useState<{ video: string; poster: string } | null>(null);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const base = mobile ? "/media/accueil-vertical" : "/media/accueil-large";
    setSrc({ video: calme ? "" : `${base}.mp4`, poster: `${base}.jpg` });
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (v && src?.video) v.play().catch(() => {});
  }, [src]);

  return (
    <div className="hero-media" aria-hidden="true">
      {src && (
        <video
          ref={ref}
          key={src.video || src.poster}
          src={src.video || undefined}
          poster={src.poster}
          muted
          loop
          playsInline
          autoPlay={Boolean(src.video)}
          preload="auto"
        />
      )}
    </div>
  );
}
