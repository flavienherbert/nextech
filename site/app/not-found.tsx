import Link from "next/link";
import type { Metadata } from "next";
import { EnteteSimple, Pied } from "./components/Cadre";

export const metadata: Metadata = { title: "Page introuvable — Studio Accroche", robots: { index: false, follow: false } };

export default function NonTrouvee() {
  return (
    <>
      <EnteteSimple />
      <main className="page">
        <div className="conteneur conteneur-etroit">
          <p className="surtitre">Erreur 404</p>
          <h1 className="titre-page">
            Cette page <em>n&apos;existe pas.</em>
          </h1>
          <p className="intro">
            Le lien est peut-être incomplet ou périmé. Si vous cherchez votre commande, utilisez le lien privé reçu par e-mail.
          </p>
          <div className="hero-actions">
            <Link className="bouton" href="/">
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </main>
      <Pied />
    </>
  );
}
