import type { Metadata } from "next";
import Link from "next/link";
import { exigerAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "E-mails — Administration", robots: { index: false, follow: false } };

export default async function Courriels() {
  await exigerAdmin();
  const liste = await store.courriels();
  const reel = Boolean(env.resendKey() && env.mailFrom());
  return (
    <main className="page admin">
      <div className="conteneur conteneur-etroit">
        <p className="retour"><Link href="/admin">← Commandes</Link></p>
        <p className="surtitre">Administration</p>
        <h1 className="titre-page">E-mails</h1>
        <p className="avis">
          {reel ? "Envoi réel activé." : "Aucun service d'envoi configuré : les e-mails ci-dessous ont été rédigés et archivés, mais pas expédiés."}
        </p>
        {liste.length === 0 && <p className="aide">Aucun e-mail pour l&apos;instant.</p>}
        {liste.map((m) => (
          <details key={m.id} className="courriel">
            <summary>
              <span>{m.objet}</span>
              <small>{new Date(m.date).toLocaleString("fr-FR")} · à {m.a || "—"} · {m.resultat}</small>
            </summary>
            <pre>{m.texte}</pre>
          </details>
        ))}
      </div>
    </main>
  );
}
