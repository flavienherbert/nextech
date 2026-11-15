import type { Metadata } from "next";
import Link from "next/link";
import { exigerAdmin } from "@/lib/auth";
import { executerDiagnostic, type Etat } from "@/lib/diagnostic";

export const dynamic = "force-dynamic";
export const maxDuration = 26;
export const metadata: Metadata = { title: "Diagnostic — Administration", robots: { index: false, follow: false } };

const SYMBOLE: Record<Etat, string> = { ok: "✓", ko: "✗", avert: "⚠", info: "•" };
const COULEUR: Record<Etat, string> = { ok: "#7bd88f", ko: "#ff7b6b", avert: "#f2c14e", info: "#a8a094" };

export default async function Diagnostic() {
  await exigerAdmin();
  const r = await executerDiagnostic();
  return (
    <main className="page admin">
      <div className="conteneur conteneur-etroit">
        <p className="retour"><Link href="/admin">← Commandes</Link></p>
        <p className="surtitre">Administration</p>
        <h1 className="titre-page">Diagnostic</h1>
        <p className="avis">
          Exécuté sur le serveur ({r.plateforme}) le {new Date(r.date).toLocaleString("fr-FR")}. Aucune clé n&apos;est affichée ; les fichiers et lignes de test sont supprimés à la fin.
        </p>
        <p className="aide">
          <strong style={{ color: COULEUR.ok }}>{r.synthese.ok} réussies</strong> · <strong style={{ color: COULEUR.ko }}>{r.synthese.ko} échec{r.synthese.ko > 1 ? "s" : ""}</strong> · <strong style={{ color: COULEUR.avert }}>{r.synthese.avert} avertissement{r.synthese.avert > 1 ? "s" : ""}</strong> · {r.synthese.info} information{r.synthese.info > 1 ? "s" : ""}
        </p>
        {r.sections.map((s) => (
          <section key={s.titre} style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 22 }}>{s.titre}</h2>
            <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0" }}>
              {s.lignes.map((x, i) => (
                <li key={i} style={{ padding: "7px 0", borderTop: "1px solid var(--trait)", display: "grid", gridTemplateColumns: "22px 1fr", gap: 8 }}>
                  <span style={{ color: COULEUR[x.etat], fontWeight: 700 }}>{SYMBOLE[x.etat]}</span>
                  <span>
                    {x.nom}
                    {x.detail && <small style={{ display: "block", color: "var(--encre-douce)" }}>{x.detail}</small>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
