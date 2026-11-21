import type { Metadata } from "next";
import Link from "next/link";
import { exigerAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { envoiReel, servicesEnvoi, utilisateurSmtp } from "@/lib/mail";
import { motDePasseSmtpEnregistreLe, motDePasseSmtpIllisible } from "@/lib/reglages";
import { enregistrerGmail, oublierGmail } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Réglages e-mail — Administration", robots: { index: false, follow: false } };

export default async function Reglages({ searchParams }: { searchParams: Promise<{ ok?: string; mail?: string; push?: string; renvoyes?: string; erreur?: string; supprime?: string }> }) {
  await exigerAdmin();
  const q = await searchParams;
  const enregistre = motDePasseSmtpEnregistreLe();
  const services = servicesEnvoi();
  return (
    <main className="page admin">
      <div className="conteneur conteneur-etroit">
        <p className="retour"><Link href="/admin">← Commandes</Link></p>
        <p className="surtitre">Administration</p>
        <h1 className="titre-page">Réglages e-mail</h1>

        {q.ok && (
          <p className={`avis ${q.mail === "oui" ? "avis-ok" : "avis-erreur"}`} role="status">
            {q.mail === "oui"
              ? `✓ Gmail fonctionne. Un e-mail de test a été envoyé à ${env.adminEmail()}${q.push === "oui" ? " et une notification de test sur votre téléphone" : ""}. ${Number(q.renvoyes) > 0 ? `${q.renvoyes} e-mail${Number(q.renvoyes) > 1 ? "s" : ""} resté${Number(q.renvoyes) > 1 ? "s" : ""} en attente ${Number(q.renvoyes) > 1 ? "ont été renvoyés" : "a été renvoyé"} (aucun doublon).` : "Aucun e-mail n'était en attente de renvoi."}`
              : "Le mot de passe est enregistré mais l'e-mail de test n'est pas parti : consultez le Diagnostic."}
          </p>
        )}
        {q.supprime && <p className="avis avis-ok" role="status">Mot de passe enregistré ici supprimé. La variable Netlify SMTP_PASSWORD (si elle existe) reprend la main.</p>}
        {q.erreur && <p className="avis avis-erreur" role="alert">{q.erreur}</p>}
        {motDePasseSmtpIllisible() && <p className="avis avis-erreur" role="alert">⚠ Un mot de passe est enregistré ici mais il est illisible (la clé SESSION_SECRET a changé depuis). Ressaisissez-le ci-dessous : il sera de nouveau testé et enregistré.</p>}

        <section className="bloc">
          <h2>État actuel</h2>
          <dl className="recap-liste">
            <div><dt>Service d&apos;envoi</dt><dd>{envoiReel() ? services.join(" puis ") : "aucun : les e-mails sont archivés mais pas expédiés"}</dd></div>
            <div><dt>Expéditeur et compte Gmail</dt><dd>{utilisateurSmtp() || "—"}</dd></div>
            <div><dt>Notifications de commande envoyées à</dt><dd>{env.adminEmail() || "— (variable ADMIN_EMAIL absente)"}</dd></div>
            <div><dt>Mot de passe enregistré ici</dt><dd>{enregistre ? `oui (depuis le ${new Date(enregistre).toLocaleString("fr-FR")})` : "non (la variable Netlify SMTP_PASSWORD est utilisée, si elle existe)"}</dd></div>
          </dl>
        </section>

        <section className="bloc">
          <h2>Mot de passe d&apos;application Gmail</h2>
          <ol className="aide-etapes">
            <li>Connecté à <strong>{utilisateurSmtp() || "contactstudioaccroche@gmail.com"}</strong> (vérifiez l&apos;adresse en haut à droite de la page Google) : ouvrez <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer">myaccount.google.com/apppasswords</a>. Si Google dit que ce réglage est indisponible, activez d&apos;abord la validation en 2 étapes.</li>
            <li>Nom « Studio Accroche », <strong>Créer</strong>, copiez les 16 lettres.</li>
            <li>Collez-les ci-dessous : le mot de passe est testé auprès de Google <strong>avant</strong> d&apos;être enregistré, puis actif immédiatement (sans redéploiement).</li>
          </ol>
          <form action={enregistrerGmail} className="formulaire">
            <label className="champ">
              <span>Mot de passe d&apos;application (16 lettres, espaces acceptés)</span>
              <input type="password" name="mdp" autoComplete="off" required placeholder="abcd efgh ijkl mnop" />
            </label>
            <button className="bouton" type="submit">Enregistrer et tester</button>
          </form>
          <p className="aide">Le mot de passe est conservé chiffré dans la base de données, n&apos;est jamais affiché ni envoyé par e-mail, et n&apos;est lisible que par le site. Après l&apos;enregistrement, un e-mail de test part vers {env.adminEmail() || "votre adresse"} et les e-mails restés en échec qui sont encore utiles sont renvoyés une seule fois.</p>
          {enregistre && (
            <form action={oublierGmail}><button className="lien-bouton" type="submit">Supprimer le mot de passe enregistré ici</button></form>
          )}
        </section>
      </div>
    </main>
  );
}
