import type { ReactNode } from "react";
import Link from "next/link";
import { BandeauMode, EnteteSimple, Pied } from "./Cadre";
import { env } from "@/lib/env";

export const AC = "[à compléter avant mise en ligne]";

export function infosLegales() {
  const l = env.legal();
  return {
    nom: l.nom || AC,
    siret: l.siret || AC,
    adresse: l.adresse || AC,
    email: l.email || AC,
    mediateur: l.mediateur || AC,
    hebergeur: process.env.NEXT_PUBLIC_LEGAL_HEBERGEUR || AC,
    complet: Boolean(l.nom && l.siret && l.adresse && l.email),
  };
}

export function PageLegale({ titre, maj, children }: { titre: string; maj: string; children: ReactNode }) {
  const i = infosLegales();
  return (
    <>
      <BandeauMode />
      <EnteteSimple />
      <main className="page">
        <div className="conteneur conteneur-etroit texte-legal">
          <p className="surtitre">Informations légales</p>
          <h1 className="titre-page">{titre}</h1>
          <p className="petit">Version du {maj}.</p>
          {!i.complet && (
            <p className="avis avis-erreur">
              Document de préproduction : les informations d&apos;identification de l&apos;entreprise ne sont pas
              encore renseignées. Ce site n&apos;accepte aucune commande réelle.
            </p>
          )}
          {children}
          <p className="retour">
            <Link href="/">← Retour à l&apos;accueil</Link>
          </p>
        </div>
      </main>
      <Pied />
    </>
  );
}
