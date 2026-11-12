import type { Metadata } from "next";
import Link from "next/link";
import { brief, site } from "../config";

export const metadata: Metadata = {
  title: `Commande reçue — ${site.marque}`,
  robots: { index: false },
};

export default function Merci() {
  const corps = brief.map((q, i) => `${i + 1}. ${q} :`).join("\n\n");
  const lienBrief = site.email
    ? `mailto:${site.email}?subject=${encodeURIComponent("Brief de ma commande")}&body=${encodeURIComponent(corps)}`
    : "";

  return (
    <main className="section">
      <div className="conteneur conteneur-etroit">
        <p className="surtitre">Paiement confirmé</p>
        <h1 className="titre-page">Merci, il ne manque que votre brief</h1>
        <p className="chapeau">
          Répondez à ces six points. Vous recevez le script sous 24 h, puis les
          vidéos après votre validation.
        </p>
        <ol className="liste-brief">
          {brief.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
        {lienBrief ? (
          <a className="bouton" href={lienBrief}>
            Envoyer mon brief par e-mail
          </a>
        ) : (
          <p>
            Vous allez recevoir un e-mail avec l&apos;adresse à laquelle envoyer
            ces éléments.
          </p>
        )}
        <p className="retour">
          <Link href="/">Retour à l&apos;accueil</Link>
        </p>
      </div>
    </main>
  );
}
