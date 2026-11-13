import type { Metadata } from "next";
import { infosLegales, PageLegale } from "../components/Legal";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mentions légales — Studio Accroche" };

export default function MentionsLegales() {
  const i = infosLegales();
  return (
    <PageLegale titre="Mentions légales" maj="13 novembre 2026">
      <h2>Éditeur du site</h2>
      <p>
        Studio Accroche est le nom commercial de {i.nom}, entrepreneur individuel (micro-entreprise).
        <br />SIRET : {i.siret}
        <br />Adresse : {i.adresse}
        <br />Contact : {i.email}
        <br />Directeur de la publication : {i.nom}
        <br />TVA non applicable, article 293 B du CGI.
      </p>
      <h2>Hébergeur</h2>
      <p>{i.hebergeur}</p>
      <h2>Activité</h2>
      <p>
        Réalisation de vidéos publicitaires sur mesure, générées à l&apos;aide d&apos;outils d&apos;intelligence
        artificielle, pour des entreprises et des marques.
      </p>
      <h2>Propriété intellectuelle</h2>
      <p>
        Les textes, la mise en page et les visuels de ce site sont la propriété de l&apos;éditeur. Les images de
        démonstration représentent un produit et une marque fictifs ; les personnes qui y apparaissent sont
        générées par intelligence artificielle et ne représentent aucune personne réelle.
      </p>
      <h2>Médiation de la consommation</h2>
      <p>
        Conformément à l&apos;article L612-1 du Code de la consommation, le client consommateur peut recourir
        gratuitement au médiateur suivant : {i.mediateur}
      </p>
    </PageLegale>
  );
}
