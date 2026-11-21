"use client";

import { useState } from "react";

// Lecteur d'une vidéo livrée, dans la page : le client regarde avant de valider, y compris sur téléphone.
// Si le navigateur ne sait pas lire ce format, le téléchargement reste disponible juste en dessous.
export default function Lecteur({ src, nom }: { src: string; nom: string }) {
  const [erreur, setErreur] = useState(false);
  return (
    <figure className="lecteur">
      {erreur ? (
        <p className="aide">Cette vidéo ne peut pas être lue ici : téléchargez-la ci-dessous.</p>
      ) : (
        <video src={src} controls playsInline preload="metadata" aria-label={`Lire ${nom}`} onError={() => setErreur(true)} />
      )}
      <figcaption>{nom}</figcaption>
    </figure>
  );
}
