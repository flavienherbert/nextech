import type { Metadata } from "next";
import Link from "next/link";
import { infosLegales, PageLegale } from "../components/Legal";
import { delaiTexte, euros, formules } from "@/lib/formules";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Conditions générales de vente — Studio Accroche" };

export default function CGV() {
  const i = infosLegales();
  return (
    <PageLegale titre="Conditions générales de vente" maj="13 novembre 2026">
      <h2>1. Objet</h2>
      <p>
        Les présentes conditions régissent la vente de prestations de réalisation de vidéos publicitaires par
        Studio Accroche, nom commercial de {i.nom} (SIRET {i.siret}, {i.adresse}), ci-après « le studio », à
        tout client professionnel ou consommateur, ci-après « le client ». Toute commande implique leur
        acceptation.
      </p>

      <h2>2. Prestations et prix</h2>
      <p>Le studio réalise des vidéos publicitaires verticales à partir des éléments fournis par le client. Les formules en vigueur sont :</p>
      <ul>
        {formules.map((f) => (
          <li key={f.id}>
            <strong>{f.nom} — {euros(f.prixCents)}</strong> : {f.videos} vidéo{f.videos > 1 ? "s" : ""} de {f.duree}, {f.retouches} retouche{f.retouches > 1 ? "s" : ""} par vidéo, {delaiTexte(f).toLowerCase()}.
          </li>
        ))}
      </ul>
      <p>
        Les prix sont exprimés en euros. TVA non applicable, article 293 B du CGI. Le prix applicable est celui
        affiché au moment de la commande.
      </p>

      <h2>3. Commande et paiement</h2>
      <p>
        La commande est passée en ligne. Le paiement est exigible en totalité à la commande, par carte bancaire,
        via le prestataire de paiement Stripe. La commande n&apos;est définitive qu&apos;après confirmation du paiement
        par Stripe. Le client reçoit alors un numéro de commande et un lien privé de suivi. Une facture est
        adressée au client sur demande ou, pour les clients professionnels, systématiquement.
      </p>

      <h2>4. Brief et obligations du client</h2>
      <p>
        Après le paiement, le client transmet un brief : lien du produit, photos, arguments et toute information
        utile. Il garantit détenir les droits sur les éléments transmis (marque, images, textes) et l&apos;exactitude
        des informations sur son produit. Le client reste seul responsable des allégations commerciales qu&apos;il
        demande d&apos;intégrer.
      </p>

      <h2>5. Déroulement et délais</h2>
      <p>
        Le délai de la formule court à compter de la réception du brief complet. Le studio soumet d&apos;abord un
        script au client ; aucune vidéo n&apos;est produite avant sa validation. Le temps pris par le client pour
        valider le script ou la livraison suspend le délai. En cas de dépassement du délai de plus de sept jours
        de son fait, le studio rembourse intégralement le client qui le demande.
      </p>

      <h2>6. Livraison</h2>
      <p>
        Les vidéos sont livrées au format MP4 par téléchargement depuis le lien privé de la commande. Le client
        est prévenu par e-mail. Les fichiers restent disponibles 90 jours après la livraison ; il appartient au
        client de les conserver.
      </p>

      <h2>7. Modifications et retouches</h2>
      <p>
        Chaque formule inclut le nombre de retouches indiqué à l&apos;article 2. Une retouche est un ajustement de la
        vidéo livrée à script constant : texte à l&apos;écran, sous-titres, rythme, remplacement d&apos;un plan. Un
        changement de produit, de script validé ou d&apos;angle constitue une nouvelle commande. Les retouches se
        demandent depuis le lien privé, dans les 14 jours suivant la mise à disposition. Sans réponse du client
        dans ce délai, la livraison est réputée acceptée.
      </p>

      <h2>8. Annulation, rétractation et remboursement</h2>
      <p>
        <strong>Avant la validation du script</strong>, le client peut annuler sa commande et obtenir un
        remboursement intégral, sans motif.
      </p>
      <p>
        <strong>Après la validation du script</strong>, la production est lancée à la demande expresse du client.
        La prestation étant confectionnée selon ses spécifications, le client consommateur ne bénéficie plus du
        droit de rétractation (article L221-28, 1° et 3°, du Code de la consommation). Le client professionnel ne
        bénéficie d&apos;aucun droit de rétractation.
      </p>
      <p>
        Le studio rembourse intégralement le client lorsqu&apos;il constate, avant production, que le produit ne peut
        pas être reproduit fidèlement, ou lorsqu&apos;il refuse la commande en application de l&apos;article 10. Les
        remboursements sont effectués sur le moyen de paiement utilisé, dans un délai de 14 jours.
      </p>

      <h2>9. Droits d&apos;utilisation</h2>
      <p>
        Après complet paiement, le client peut exploiter les vidéos livrées à des fins commerciales et
        publicitaires, sur tous supports, sans limite de durée ni de territoire. Le client est informé qu&apos;un
        contenu généré par intelligence artificielle peut ne pas bénéficier de la protection du droit d&apos;auteur ;
        le studio ne garantit donc pas d&apos;exclusivité juridique sur les images produites. Le studio peut présenter
        les vidéos comme exemples de réalisation, sauf opposition du client exprimée par écrit.
      </p>

      <h2>10. Contenus générés par intelligence artificielle</h2>
      <p>
        Les vidéos sont générées à l&apos;aide d&apos;outils d&apos;intelligence artificielle : personnes, voix et décors sont
        synthétiques. Elles sont livrées comme telles. Il appartient au client, qui les diffuse, de signaler ce
        caractère au public conformément à l&apos;article 50 du règlement (UE) 2024/1689 et aux règles des plateformes
        de diffusion.
      </p>
      <p>Le studio refuse, et rembourse le cas échéant, toute commande visant à :</p>
      <ul>
        <li>simuler le témoignage d&apos;un client ou un avis de consommateur ;</li>
        <li>imiter une personne réelle ou une marque tierce ;</li>
        <li>diffuser des allégations de santé, d&apos;amaigrissement ou de gains financiers non établies ;</li>
        <li>promouvoir un produit illicite ou réglementé (tabac, alcool, médicaments, jeux d&apos;argent).</li>
      </ul>

      <h2>11. Responsabilité</h2>
      <p>
        Le studio est tenu d&apos;une obligation de moyens. Il ne garantit aucun résultat commercial ou publicitaire.
        Sa responsabilité est limitée, pour les clients professionnels, au montant payé pour la commande
        concernée. Rien dans les présentes ne limite les droits que la loi reconnaît aux consommateurs.
      </p>

      <h2>12. Données personnelles</h2>
      <p>
        Les données du client sont traitées pour exécuter la commande, dans les conditions décrites dans la{" "}
        <Link href="/confidentialite">politique de confidentialité</Link>.
      </p>

      <h2>13. Réclamations, médiation et droit applicable</h2>
      <p>
        Toute réclamation est adressée à {i.email}. Le client consommateur peut, après une réclamation écrite
        restée sans solution, saisir gratuitement le médiateur de la consommation : {i.mediateur}. Les présentes
        sont soumises au droit français.
      </p>
    </PageLegale>
  );
}
