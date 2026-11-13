"use client";

import { useEffect, useRef } from "react";
import type { Plan } from "../config";

// Bande d'extraits : chaque plan joue en boucle, muet, quand il est visible.
export default function PlanReel({ plans }: { plans: Plan[] }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const videos = Array.from(root.querySelectorAll("video"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const v = e.target as HTMLVideoElement;
          if (e.isIntersecting) v.play().catch(() => {});
          else v.pause();
        }
      },
      { threshold: 0.35 },
    );
    videos.forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, []);

  return (
    <div className="bande" ref={ref}>
      {plans.map((p, i) => (
        <figure className="plan" key={p.fichier}>
          <div className="plan-cadre">
            <video
              src={`/media/${p.fichier}.mp4`}
              poster={`/media/${p.fichier}.jpg`}
              muted
              loop
              playsInline
              preload="none"
            />
            <span className="plan-numero">{String(i + 1).padStart(2, "0")}</span>
          </div>
          <figcaption>
            <strong>{p.titre}</strong>
            <span>{p.texte}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
