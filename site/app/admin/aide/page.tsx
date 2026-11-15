import type { Metadata } from "next";
import Link from "next/link";
import { exigerAdmin } from "@/lib/auth";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mode d'emploi — Administration", robots: { index: false, follow: false } };

export default async function Aide() {
  await exigerAdmin();
  return (
    <main className="page admin">
      <div className="conteneur conteneur-etroit">
        <p className="retour"><Link href="/admin">← Commandes</Link></p>
        <p className="surtitre">Administration</p>
        <h1 className="titre-page">Mode d&apos;emploi</h1>

        <section className="bloc">
          <h2>Je reçois une commande ici</h2>
          <ul>
            <li><strong>Sur votre téléphone</strong> : une notification « Nouvelle commande payée » (application gratuite ntfy).</li>
            <li><strong>Dans votre boîte {env.adminEmail() || "e-mail"}</strong> : un e-mail « Nouvelle commande payée » avec le numéro, le client, l&apos;offre, le montant et le bouton « Ouvrir la commande ».</li>
            <li><strong>Ici</strong> : ouvrez <Link href="/admin">Commandes</Link>. La catégorie « À faire maintenant » vous dit tout ce qui attend une action de votre part.</li>
          </ul>
          <p className="aide">Vous n&apos;êtes jamais prévenu pour une commande non payée : ce n&apos;est pas une vente.</p>
        </section>

        <section className="bloc">
          <h2>Je traite une commande ici</h2>
          <ol className="aide-etapes">
            <li>Ouvrez la commande (clic sur son numéro). Le panneau <strong>« Prochaine étape »</strong> en haut vous dit quoi faire.</li>
            <li>Téléchargez les fichiers du client (colonne de gauche).</li>
            <li>Cliquez sur <strong>« Démarrer la production »</strong> : le client est prévenu par e-mail.</li>
            <li>Réalisez la vidéo avec vos outils habituels.</li>
          </ol>
          <p className="aide">Le client n&apos;a pas envoyé son brief ? Il est relancé automatiquement après 48 h ; vous pouvez aussi le relancer d&apos;un clic.</p>
        </section>

        <section className="bloc">
          <h2>Je livre les vidéos ici</h2>
          <ol className="aide-etapes">
            <li>Sur la commande, colonne de droite, « Livrables » : ajoutez vos vidéos et PDF terminés.</li>
            <li>Cliquez sur <strong>« Envoyer la livraison au client »</strong> (en haut de la page). Le client reçoit un e-mail avec son lien privé pour valider ou demander une retouche.</li>
            <li>S&apos;il valide, la commande passe en « Livrée » toute seule et la facture est émise.</li>
            <li>S&apos;il demande une correction, vous êtes prévenu (téléphone + e-mail) : la commande apparaît dans « Corrections demandées ». Modifiez la vidéo, remplacez le fichier, puis cliquez sur « Envoyer la version corrigée ».</li>
          </ol>
        </section>

        <section className="bloc">
          <h2>Que veulent dire les alertes ?</h2>
          <ul>
            <li><strong>Nouvelle commande payée</strong> : un client a payé. Ouvrez la commande.</li>
            <li><strong>Paiement échoué</strong> : la banque a refusé. Aucune action, sauf si le client vous contacte.</li>
            <li><strong>Correction demandée</strong> : un client demande une retouche.</li>
            <li><strong>E-mail non envoyé</strong> : un message n&apos;est pas parti. Ouvrez <Link href="/admin/courriels">E-mails</Link> et cliquez sur « Renvoyer ».</li>
            <li><strong>Problème technique</strong> : une erreur sur le site. Ouvrez <Link href="/admin/diagnostic">Diagnostic</Link> ; si une ligne est en rouge, suivez son explication.</li>
            <li><strong>Récap du jour</strong> : chaque matin, la liste de ce qui attend (uniquement s&apos;il y a quelque chose).</li>
          </ul>
        </section>

        <section className="bloc">
          <h2>Retrouver une ancienne commande</h2>
          <p>Sur <Link href="/admin">Commandes</Link>, tapez dans la recherche le numéro, le nom, l&apos;e-mail, la marque ou le produit. Les commandes sont conservées sans limite de durée ; seuls les fichiers vidéo du client sont supprimés 90 jours après la livraison.</p>
        </section>
      </div>
    </main>
  );
}
