import type { Metadata } from "next";
import Link from "next/link";
import { exigerAdmin } from "@/lib/auth";
import { enEchec, envoiReel } from "@/lib/mail";
import { renvoyerCourriel } from "../actions";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "E-mails — Administration", robots: { index: false, follow: false } };

export default async function Courriels({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await exigerAdmin();
  const q = await searchParams;
  const liste = await store.courriels();
  const reel = envoiReel();
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
        {q.erreur === "renvoi" && <p className="avis avis-erreur" role="alert">Le renvoi a échoué : le service d&apos;envoi ne répond pas ou refuse l&apos;e-mail.</p>}
        {liste.length === 0 && <p className="aide">Aucun e-mail pour l&apos;instant.</p>}
        {liste.map((m) => (
          <details key={m.id} className="courriel">
            <summary>
              <span>{m.objet}</span>
              <small>{new Date(m.date).toLocaleString("fr-FR")} · à {m.a || "—"} · {m.resultat}</small>
            </summary>
            <pre>{m.texte}</pre>
            {enEchec(m) && reel && (
              <form action={renvoyerCourriel}>
                <input type="hidden" name="id" value={m.id} />
                <button className="bouton bouton-petit">Renvoyer cet e-mail</button>
              </form>
            )}
          </details>
        ))}
      </div>
    </main>
  );
}
