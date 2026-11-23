import Link from "next/link";
import { site } from "../config";
import { env, modePaiement } from "@/lib/env";

// Bandeau de préproduction : affiché UNIQUEMENT si la variable d'environnement SITE_ENV vaut « preprod » (jamais en production).
export function BandeauMode() {
  if (!env.enPreproduction()) return null;
  const { mode } = modePaiement();
  if (mode === "reel") return null;
  const texte =
    mode === "ferme"
      ? "Préproduction — les commandes ne sont pas encore ouvertes."
      : mode === "simulation"
        ? "Préproduction — paiement simulé, aucune somme n'est débitée."
        : "Préproduction — Stripe en mode test, aucune somme n'est débitée.";
  return <div className="bandeau-mode">{texte}</div>;
}

export function EnteteSimple() {
  return (
    <header className="entete entete-simple">
      <div className="conteneur entete-ligne">
        <Link className="marque" href="/">
          Studio <em>Accroche</em>
        </Link>
        <Link className="lien-discret" href="/#formules">
          Formules
        </Link>
      </div>
    </header>
  );
}

export function Pied({ illustrations = false }: { illustrations?: boolean }) {
  return (
    <footer className="pied">
      <div className="conteneur pied-ligne">
        <span>
          © {new Date().getFullYear()} {site.marque} · Vidéos générées par intelligence artificielle
        </span>
        <nav className="pied-liens" aria-label="Informations légales">
          <a href={`mailto:${site.email}`}>Contact : {site.email}</a>
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/cgv">Conditions de vente</Link>
          <Link href="/confidentialite">Confidentialité</Link>
        </nav>
      </div>
      {illustrations && (
        <div className="conteneur">
          <p className="pied-note">Photographies d&apos;illustration.</p>
        </div>
      )}
    </footer>
  );
}
