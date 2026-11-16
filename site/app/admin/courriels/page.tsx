import type { Metadata } from "next";
import Link from "next/link";
import { exigerAdmin } from "@/lib/auth";
import { enEchec, envoiReel } from "@/lib/mail";
import { trierEchecs, type Action } from "@/lib/rattrapage";
import { renvoyerCourriel, renvoyerUtiles } from "../actions";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "E-mails — Administration", robots: { index: false, follow: false } };

const ETIQUETTE: Record<Action, string> = { renvoyer: "À renvoyer", deja_envoye: "Déjà renvoyé", doublon: "Doublon", obsolete: "Périmé" };

export default async function Courriels({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string; lot?: string }> }) {
  await exigerAdmin();
  const q = await searchParams;
  const [liste, commandes] = await Promise.all([store.courriels(), store.commandes()]);
  const reel = envoiReel();
  const decisions = new Map(trierEchecs(liste, commandes).map((d) => [d.courriel.id, d]));
  const aRenvoyer = [...decisions.values()].filter((d) => d.action === "renvoyer");
  const perimes = [...decisions.values()].filter((d) => d.action === "obsolete" || d.action === "doublon").length;
  const [lotOk, lotKo] = (q.lot || "").split("-").map(Number);
  return (
    <main className="page admin">
      <div className="conteneur conteneur-etroit">
        <p className="retour"><Link href="/admin">← Commandes</Link></p>
        <p className="surtitre">Administration</p>
        <h1 className="titre-page">E-mails</h1>
        <p className="avis">
          {reel ? `Envoi réel activé (${reel}).` : "Aucun service d'envoi configuré : les e-mails ci-dessous ont été rédigés et archivés, mais pas expédiés."}
        </p>
        {q.ok === "renvoi" && <p className="avis avis-ok" role="status">E-mail renvoyé.</p>}
        {q.erreur === "renvoi" && <p className="avis avis-erreur" role="alert">Le renvoi a échoué : le service d&apos;envoi ne répond pas ou refuse l&apos;e-mail. Consultez le Diagnostic.</p>}
        {q.lot && <p className={`avis ${lotKo ? "avis-erreur" : "avis-ok"}`} role="status">{lotOk} e-mail{lotOk > 1 ? "s" : ""} renvoyé{lotOk > 1 ? "s" : ""}{lotKo ? `, ${lotKo} encore en échec (voir le Diagnostic)` : ""}.</p>}

        {reel && aRenvoyer.length > 0 && (
          <section className="bloc">
            <h2>{aRenvoyer.length} e-mail{aRenvoyer.length > 1 ? "s" : ""} non envoyé{aRenvoyer.length > 1 ? "s" : ""} encore utile{aRenvoyer.length > 1 ? "s" : ""}</h2>
            <ul className="historique">
              {aRenvoyer.map((d) => (<li key={d.courriel.id}>à {d.courriel.a || "—"} — {d.courriel.objet} <em>({d.raison})</em></li>))}
            </ul>
            <form action={renvoyerUtiles}>
              <button className="bouton" type="submit">Renvoyer ces e-mails maintenant</button>
            </form>
            <p className="aide">Aucun doublon : un e-mail déjà renvoyé avec succès, ou devenu inutile (la commande a avancé depuis), n&apos;est jamais renvoyé.{perimes ? ` ${perimes} autre${perimes > 1 ? "s sont" : " est"} périmé${perimes > 1 ? "s" : ""} ou en double : ignoré${perimes > 1 ? "s" : ""}.` : ""}</p>
          </section>
        )}
        {reel && aRenvoyer.length === 0 && [...decisions.values()].length > 0 && (
          <p className="avis avis-ok">✓ Aucun e-mail utile en attente de renvoi.{perimes ? ` ${perimes} ancien${perimes > 1 ? "s e-mails en échec sont périmés" : " e-mail en échec est périmé"} (la commande a avancé depuis, ou l'alerte est déjà passée sur le téléphone) : inutile de les renvoyer.` : ""}</p>
        )}

        {liste.length === 0 && <p className="aide">Aucun e-mail pour l&apos;instant.</p>}
        {liste.map((m) => {
          const d = decisions.get(m.id);
          return (
            <details key={m.id} className="courriel">
              <summary>
                <span>{m.objet}{d && <small> — {ETIQUETTE[d.action]}</small>}</span>
                <small>{new Date(m.date).toLocaleString("fr-FR")} · à {m.a || "—"} · {m.resultat}</small>
              </summary>
              {d && <p className="aide">{d.raison}</p>}
              <pre>{m.texte}</pre>
              {enEchec(m) && reel && (
                <form action={renvoyerCourriel}>
                  <input type="hidden" name="id" value={m.id} />
                  <button className="bouton bouton-petit">Renvoyer cet e-mail</button>
                </form>
              )}
            </details>
          );
        })}
      </div>
    </main>
  );
}
