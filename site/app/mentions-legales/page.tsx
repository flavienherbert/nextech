import type { Metadata } from "next";
import Link from "next/link";
import { site } from "../config";

export const metadata: Metadata = {
  title: `Mentions légales et conditions — ${site.marque}`,
};

const aCompleter = "à compléter avant mise en ligne";

export default function MentionsLegales() {
  const { nom, siret, adresse } = site.legal;
  return (
    <main className="section">
      <div className="conteneur conteneur-etroit texte-legal">
        <p className="retour">
          <Link href="/">← Retour à l&apos;accueil</Link>
        </p>
        <h1 className="titre-page">Mentions légales et conditions de vente</h1>

        <h2>Éditeur</h2>
        <p>
          {site.marque} est exploité par {nom || aCompleter}, entrepreneur
          individuel.
          <br />
          SIRET : {siret || aCompleter}
          <br />
          Adresse : {adresse || aCompleter}
          <br />
          Contact : {site.email || aCompleter}
          <br />
          TVA non applicable, article 293 B du CGI.
        </p>

        <h2>Hébergeur</h2>
        <p>Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.</p>

        <h2>Prestation</h2>
        <p>
          {site.marque} réalise des vidéos publicitaires sur mesure, générées à
          l&apos;aide d&apos;outils d&apos;intelligence artificielle, à partir
          des éléments fournis par le client. Les prix sont indiqués en euros,
          toutes taxes comprises. Le paiement est exigible à la commande.
        </p>

        <h2>Déroulement et délais</h2>
        <p>
          Le délai indiqué pour chaque formule court à partir de la réception du
          brief complet. Le script est soumis au client pour validation avant
          toute génération de vidéo.
        </p>

        <h2>Annulation et rétractation</h2>
        <p>
          Avant la validation du script, le client peut annuler sa commande et
          être remboursé intégralement. La prestation étant confectionnée selon
          les spécifications du client, le droit de rétractation ne
          s&apos;applique plus une fois la production lancée à sa demande
          (article L221-28 du Code de la consommation).
        </p>

        <h2>Retouches et remboursement</h2>
        <p>
          Chaque formule comprend le nombre de retouches indiqué. Si le produit
          ne peut pas être reproduit fidèlement, le client en est informé avant
          le début du travail et remboursé.
        </p>

        <h2>Droits d&apos;utilisation</h2>
        <p>
          Après paiement, le client dispose du droit d&apos;exploiter les vidéos
          livrées à des fins commerciales et publicitaires, sans limite de durée
          ni de territoire. Le client garantit détenir les droits sur les
          éléments qu&apos;il fournit (photos, marque, textes).
        </p>

        <h2>Contenu généré par IA</h2>
        <p>
          Les vidéos sont générées par intelligence artificielle et livrées
          comme telles. Il appartient au client, en tant que diffuseur, de
          signaler ce caractère lors de la publication, conformément à
          l&apos;article 50 du règlement (UE) 2024/1689. {site.marque} ne
          réalise ni faux témoignages clients, ni imitation de personnes
          réelles.
        </p>

        <h2>Données personnelles</h2>
        <p>
          Les informations transmises (adresse e-mail, éléments du brief)
          servent uniquement à réaliser la commande. Le paiement est traité par
          Stripe. Ce site n&apos;utilise aucun traceur publicitaire. Vous pouvez
          demander l&apos;accès à vos données ou leur suppression à
          l&apos;adresse de contact.
        </p>

        <h2>Litiges</h2>
        <p>
          Le droit français s&apos;applique. En cas de litige, le client
          consommateur peut recourir gratuitement à un médiateur de la
          consommation, dont les coordonnées seront communiquées sur demande.
        </p>
      </div>
    </main>
  );
}
