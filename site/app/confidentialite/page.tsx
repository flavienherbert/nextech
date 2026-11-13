import type { Metadata } from "next";
import { infosLegales, PageLegale } from "../components/Legal";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Politique de confidentialité — Studio Accroche" };

export default function Confidentialite() {
  const i = infosLegales();
  return (
    <PageLegale titre="Politique de confidentialité" maj="13 novembre 2026">
      <h2>Responsable du traitement</h2>
      <p>{i.nom}, exploitant Studio Accroche — {i.adresse} — {i.email}.</p>

      <h2>Données collectées</h2>
      <ul>
        <li><strong>À la commande</strong> : adresse e-mail saisie sur la page de paiement, montant et référence du paiement. Le studio ne reçoit ni ne conserve aucun numéro de carte.</li>
        <li><strong>Dans le brief</strong> : nom, e-mail, téléphone (facultatif), nom de la marque, lien du produit, informations sur le produit et fichiers transmis.</li>
        <li><strong>Pendant le suivi</strong> : demandes de retouche et échanges liés à la commande.</li>
      </ul>
      <p>Le site ne collecte aucune donnée de navigation à des fins statistiques ou publicitaires.</p>

      <h2>Finalités et bases légales</h2>
      <ul>
        <li>Exécution de la commande et suivi (exécution du contrat).</li>
        <li>Facturation et comptabilité (obligation légale).</li>
        <li>Réponse aux réclamations (intérêt légitime).</li>
      </ul>
      <p>Aucune donnée n&apos;est utilisée pour de la prospection sans votre accord.</p>

      <h2>Destinataires</h2>
      <ul>
        <li><strong>Stripe</strong> : traitement du paiement.</li>
        <li><strong>Hébergeur du site</strong> : {i.hebergeur}</li>
        <li><strong>Service d&apos;envoi d&apos;e-mails</strong> : notifications de commande.</li>
        <li><strong>Outils de génération par intelligence artificielle</strong> : pour produire les vidéos, les photos du produit et les textes du brief sont transmis à des services de génération d&apos;images, de vidéos et de voix. N&apos;envoyez pas de fichier contenant des données personnelles de tiers.</li>
      </ul>
      <p>
        Certains de ces prestataires sont établis hors de l&apos;Union européenne. Les transferts sont alors encadrés
        par les clauses contractuelles types de la Commission européenne ou un mécanisme équivalent.
      </p>

      <h2>Durées de conservation</h2>
      <ul>
        <li>Fichiers transmis et vidéos livrées : 90 jours après la livraison, puis suppression.</li>
        <li>Données de commande et factures : 10 ans, durée légale de conservation des pièces comptables.</li>
        <li>Commandes non payées : 30 jours.</li>
      </ul>

      <h2>Vos droits</h2>
      <p>
        Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de limitation, d&apos;opposition et de
        portabilité. Pour l&apos;exercer, écrivez à {i.email}. Vous pouvez introduire une réclamation auprès de la
        CNIL (cnil.fr).
      </p>

      <h2>Cookies</h2>
      <p>
        Ce site n&apos;utilise aucun cookie de mesure d&apos;audience ni de publicité, et n&apos;affiche donc pas de bandeau de
        consentement. Le seul cookie déposé est strictement nécessaire : il maintient la session de l&apos;espace
        d&apos;administration et ne concerne pas les visiteurs. La page de paiement est hébergée par Stripe, qui
        applique sa propre politique.
      </p>

      <h2>Sécurité</h2>
      <p>
        L&apos;accès à votre commande se fait par un lien privé, à ne pas partager. Les fichiers ne sont accessibles
        qu&apos;au studio et, pour les livrables, au détenteur du lien.
      </p>
    </PageLegale>
  );
}
