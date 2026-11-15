"use client";

import { useEffect } from "react";

// Erreur inattendue dans une page : message clair, aucune information technique affichée.
export default function Erreur({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[page]", error.digest || error.message);
  }, [error]);
  return (
    <main className="page">
      <div className="conteneur conteneur-etroit">
        <p className="surtitre">Un incident est survenu</p>
        <h1 className="titre-page">
          Cette page n&apos;a pas pu <em>s&apos;afficher.</em>
        </h1>
        <p className="intro">
          Rien n&apos;est perdu : vos données et votre paiement ne sont pas affectés. Réessayez dans un instant. Si le problème persiste, écrivez-nous en indiquant la référence ci-dessous.
        </p>
        {error.digest && <p className="mention">Référence : {error.digest}</p>}
        <div className="hero-actions">
          <button className="bouton" onClick={() => reset()}>
            Réessayer
          </button>
          <a className="bouton bouton-fantome" href="/">
            Retour à l&apos;accueil
          </a>
        </div>
      </div>
    </main>
  );
}
