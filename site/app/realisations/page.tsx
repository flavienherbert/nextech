import type { Metadata } from "next";
import Link from "next/link";
import Galerie from "./Galerie";
import { BandeauMode, EnteteSimple, Pied } from "../components/Cadre";
import { MENTION_IA, site } from "../config";
import { chargerPortfolio, type Portfolio } from "@/lib/bibliotheque";

// Page servie depuis le cache, renouvelée au plus toutes les 15 minutes (et tout de suite quand le vendeur publie ou dépublie).
export const revalidate = 900;
export const metadata: Metadata = {
  title: `Réalisations — ${site.marque}`,
  description: `Créations de démonstration réalisées par ${site.marque} avec un présentateur généré par intelligence artificielle.`,
};

export default async function Realisations() {
  let p: Portfolio = { publiees: [], categories: [], styles: [] };
  try {
    p = await chargerPortfolio();
  } catch (e) {
    console.error("[bibliotheque] portfolio illisible :", (e as Error).message);
  }
  return (
    <>
      <BandeauMode />
      <EnteteSimple />
      <main className="page">
        <div className="conteneur">
          <p className="surtitre">Réalisations</p>
          <h1 className="titre-page">Des publicités <em>réalisées par le studio.</em></h1>
          <p className="intro">Des créations de démonstration, avec un présentateur généré par intelligence artificielle. {MENTION_IA}</p>
          {p.publiees.length === 0 ? (
            <p className="avis vide">Aucune réalisation n&apos;est présentée pour le moment. <Link href="/#formules">Voir les formules</Link>.</p>
          ) : (
            <Galerie items={p.publiees} categories={p.categories} styles={p.styles} />
          )}
        </div>
      </main>
      <Pied />
    </>
  );
}
