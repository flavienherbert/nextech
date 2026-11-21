import type { Metadata } from "next";
import Link from "next/link";
import { basculerLancement } from "../actions";
import { exigerAdmin } from "@/lib/auth";
import { A_FAIRE_SOI_MEME, controlerLancement, lireManuel, type EtatControle } from "@/lib/lancement";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Lancement — Administration", robots: { index: false, follow: false } };

const SYMBOLE: Record<EtatControle, string> = { ok: "✓", bloquant: "✗", conseil: "⚠", info: "•" };
const COULEUR: Record<EtatControle, string> = { ok: "#7bd88f", bloquant: "#ff7b6b", conseil: "#f2c14e", info: "#a8a094" };
const LIBELLE: Record<EtatControle, string> = { ok: "Prêt", bloquant: "À faire avant d'ouvrir", conseil: "Conseillé", info: "Pour information" };

export default async function PageLancement() {
  await exigerAdmin("/admin/lancement");
  const [r, faits] = await Promise.all([controlerLancement(), lireManuel()]);
  const restants = A_FAIRE_SOI_MEME.filter((x) => !faits.has(x.id)).length;
  const pret = r.bloquants === 0 && restants === 0;

  return (
    <main className="page admin">
      <div className="conteneur conteneur-etroit">
        <p className="retour"><Link href="/admin">← Commandes</Link></p>
        <p className="surtitre">Administration</p>
        <h1 className="titre-page">Liste de lancement</h1>
        <p className={`avis ${pret ? "avis-ok" : r.bloquants ? "avis-erreur" : ""}`} role="status">
          {pret
            ? "Tout est prêt. Le lancement est votre décision : ouvrez les paiements réels (VENTES_REELLES=oui) puis le référencement (INDEXATION=oui) dans Netlify."
            : `${r.bloquants} point${r.bloquants > 1 ? "s" : ""} automatique${r.bloquants > 1 ? "s" : ""} à régler avant d'ouvrir · ${restants} vérification${restants > 1 ? "s" : ""} à confirmer vous-même · ${r.conseils} conseil${r.conseils > 1 ? "s" : ""}.`}
        </p>
        <p className="aide">Cette page se met à jour toute seule d&apos;après la configuration réelle du site. Elle ne contacte aucun service extérieur et ne modifie rien. Pour un contrôle en profondeur (base de données, stockage, e-mails réellement envoyés) : <Link href="/admin/diagnostic">Diagnostic</Link>.</p>

        {r.groupes.map((g) => (
          <section key={g.titre} style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 22 }}>{g.titre}</h2>
            <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0" }}>
              {g.controles.map((x) => (
                <li key={x.id} style={{ padding: "9px 0", borderTop: "1px solid var(--trait)", display: "grid", gridTemplateColumns: "22px 1fr", gap: 8 }}>
                  <span style={{ color: COULEUR[x.etat], fontWeight: 700 }} aria-label={LIBELLE[x.etat]}>{SYMBOLE[x.etat]}</span>
                  <span>
                    {x.nom}
                    <small style={{ display: "block", color: "var(--encre-douce)" }}>{x.detail}</small>
                    {x.ou && x.etat !== "ok" && (
                      <small style={{ display: "block", color: "var(--encre-douce)" }}>
                        Où : {x.lien ? <Link href={x.lien}>{x.ou}</Link> : x.ou}
                      </small>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section style={{ marginTop: 34 }}>
          <h2 style={{ fontSize: 22 }}>À confirmer vous-même</h2>
          <p className="aide">Ce qu&apos;aucun contrôle automatique ne peut constater. Cochez quand c&apos;est fait ; la case est mémorisée.</p>
          <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0" }}>
            {A_FAIRE_SOI_MEME.map((x) => {
              const fait = faits.has(x.id);
              return (
                <li key={x.id} style={{ padding: "10px 0", borderTop: "1px solid var(--trait)" }}>
                  <form action={basculerLancement} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, alignItems: "start" }}>
                    <input type="hidden" name="id" value={x.id} />
                    <button type="submit" className="bouton bouton-fantome bouton-petit" aria-pressed={fait} aria-label={fait ? "Marquer comme non fait" : "Marquer comme fait"} style={{ minWidth: 44 }}>{fait ? "✓" : "☐"}</button>
                    <span style={{ opacity: fait ? 0.6 : 1 }}>
                      {x.nom}
                      <small style={{ display: "block", color: "var(--encre-douce)" }}>{x.detail}</small>
                    </span>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
}
