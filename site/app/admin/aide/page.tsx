import type { Metadata } from "next";
import Link from "next/link";
import { exigerAdmin } from "@/lib/auth";
import { pushConfigure } from "@/lib/alertes";
import { env } from "@/lib/env";
import { toursInclusTexte } from "@/lib/formules";

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
          <h2>Mon sujet de notification (téléphone)</h2>
          {pushConfigure() ? (
            <>
              <p>Installez l&apos;application gratuite <strong>ntfy</strong> (Android, iPhone), appuyez sur <strong>+</strong>, saisissez exactement :</p>
              <p className="code">{process.env.NTFY_TOPIC}</p>
              <p className="aide">Ce sujet est votre « adresse » de notification : ne le partagez pas. Aucun nom ni e-mail de client n&apos;y transite. Pour vérifier : <Link href="/admin/diagnostic">Diagnostic</Link>, bouton « Envoyer une notification de test ».</p>
            </>
          ) : (
            <p className="avis avis-erreur">Les notifications sur le téléphone ne sont pas activées (variable NTFY_TOPIC absente de Netlify). Vous ne recevez alors que les e-mails.</p>
          )}
        </section>

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
            <li>Rédigez le script à partir de la <strong>fiche de production</strong> (sous le brief), puis cliquez sur <strong>« Envoyer le script au client »</strong>. Aucune vidéo n&apos;est produite avant son accord.</li>
            <li>Il répond « OK » par e-mail : cochez « Le client a validé le script ».</li>
            <li>Téléchargez les fichiers du client (colonne de gauche), puis cliquez sur <strong>« Démarrer la production »</strong> : le client est prévenu par e-mail.</li>
            <li>Réalisez la vidéo (procédure : <code>production/HIGGSFIELD.md</code> dans le dépôt).</li>
          </ol>
          <p className="aide">Le client n&apos;a pas envoyé son brief ? Il est relancé automatiquement après 48 h ; vous pouvez aussi le relancer d&apos;un clic.</p>
        </section>

        <section className="bloc">
          <h2>Je livre les vidéos ici</h2>
          <ol className="aide-etapes">
            <li>Sur la commande, colonne de droite, « Livrables » : ajoutez vos vidéos et PDF terminés.</li>
            <li>Cliquez sur <strong>« Envoyer la livraison au client »</strong> (en haut de la page). Le client reçoit un e-mail avec son lien privé pour valider ou demander une retouche.</li>
            <li>S&apos;il valide, la commande passe en « Livrée » toute seule et la facture est émise.</li>
            <li>S&apos;il demande un tour de retouches (une seule demande qui regroupe toutes ses remarques ; chaque formule inclut {toursInclusTexte()}), vous êtes prévenu (téléphone + e-mail) : la commande apparaît dans « Corrections demandées ». Modifiez la vidéo, remplacez le fichier, puis cliquez sur « Envoyer la version corrigée ».</li>
            <li>Si la demande change le produit, le brief, le script validé, le présentateur, l&apos;angle ou la durée, <strong>ce n&apos;est pas une retouche</strong> : cliquez sur « Refuser : hors périmètre » et expliquez-le. Le client est prévenu, son tour n&apos;est pas décompté ; proposez-lui une nouvelle commande.</li>
          </ol>
        </section>

        <section className="bloc">
          <h2>Remplacer les images et vidéos du site</h2>
          <p>Ouvrez <Link href="/admin/medias">Images et vidéos</Link> : choisissez un fichier pour l&apos;emplacement voulu, il est publié tout de suite, sans redéploiement. Commencez par la <strong>vidéo de démonstration</strong>, puis trois <strong>exemples</strong>. « Remettre l&apos;image d&apos;origine » annule un changement.</p>
        </section>

        <section className="bloc">
          <h2>Bibliothèque de publicités et portfolio</h2>
          <ol className="aide-etapes">
            <li>Ouvrez <Link href="/admin/publicites">Publicités</Link> puis « Nouvelle publicité » : nom, produit, catégorie, avatar, style, durée, format, script, prompt, vidéo (60 secondes et 40 Mo au plus) et miniature. Sans miniature, « Capturer la miniature » prend une image de la vidéo.</li>
            <li>Passez le statut à <strong>« Validée »</strong> et enregistrez : seule une publicité validée qui a une vidéo peut être publiée. Elle est <strong>privée par défaut</strong>.</li>
            <li><strong>« Publier »</strong> l&apos;ajoute à la page « Réalisations » ; <strong>« Mettre à la une »</strong> l&apos;affiche aussi sur l&apos;accueil (six au plus). Si le statut change ou si la vidéo est retirée, elle est dépubliée toute seule.</li>
            <li>Les présentateurs sont dans <Link href="/admin/avatars">Avatars</Link> : un avatar lié à une publicité ne peut pas être supprimé.</li>
          </ol>
          <p className="aide">Le public ne voit jamais le prompt, le script, l&apos;avatar ni le statut. Chaque vidéo porte la mention « Création de démonstration réalisée avec l&apos;IA — marque et produit fictifs. ». Détail : <code>BIBLIOTHEQUE.md</code> dans le dépôt.</p>
        </section>

        <section className="bloc">
          <h2>Où en est mon lancement ?</h2>
          <p><Link href="/admin/lancement">Lancement</Link> liste ce qui bloque encore l&apos;ouverture à la vente, contrôlé automatiquement, plus des vérifications à cocher vous-même.</p>
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
