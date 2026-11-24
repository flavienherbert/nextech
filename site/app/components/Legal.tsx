import type { ReactNode } from "react";
import Link from "next/link";
import { BandeauMode, EnteteSimple, Pied } from "./Cadre";
import { env } from "@/lib/env";
import { site } from "../config";

// Champ visible tant qu'une information n'est pas renseignée : rien n'est inventé, rien n'est caché.
export const MANQUE = {
  nom: "[Nom et prénom de l'éditeur]",
  siret: "[SIRET]",
  adresse: "[ADRESSE]",
  telephone: "[TÉLÉPHONE]",
};

export function infosLegales() {
  const l = env.legal();
  return {
    nom: l.nom || MANQUE.nom,
    siret: l.siret || MANQUE.siret,
    adresse: l.adresse || MANQUE.adresse,
    email: l.email, // toujours renseigné : app/config.ts
    telephone: l.telephone || MANQUE.telephone,
    hebergeur: process.env.NEXT_PUBLIC_LEGAL_HEBERGEUR || site.hebergeur,
    complet: Boolean(l.nom && l.siret && l.adresse && l.telephone && l.email),
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
