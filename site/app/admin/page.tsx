import type { Metadata } from "next";
import Link from "next/link";
import { deconnexion } from "./actions";
import { exigerAdmin } from "@/lib/auth";
import { modePaiement } from "@/lib/env";
import { euros, formuleParId } from "@/lib/formules";
import { nomStatut, store, STATUTS } from "@/lib/store";
import { purger } from "@/lib/purge";
import { depot } from "@/lib/depot";
import { envoiReel } from "@/lib/mail";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Commandes — Administration", robots: { index: false, follow: false } };

const jour = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function Admin({ searchParams }: { searchParams: Promise<{ statut?: string; tout?: string }> }) {
  await exigerAdmin();
  const q = await searchParams;
  await purger().catch((e) => console.error("[purge]", (e as Error).message));
  const toutes = await store.commandes();
  // Par défaut, les commandes jamais payées sont masquées : ce ne sont pas des ventes.
  const visibles = toutes.filter((c) => (q.statut ? c.statut === q.statut : q.tout ? true : c.paiement.etat === "paye"));
  const payees = toutes.filter((c) => c.paiement.etat === "paye");
  const total = payees.reduce((s, c) => s + c.montantCents, 0);
  const { mode } = modePaiement();

  return (
    <main className="page admin">
      <div className="conteneur">
        <div className="admin-tete">
          <div>
            <p className="surtitre">Administration · paiements : {mode} · stockage : {depot().nom} · e-mails : {envoiReel() ?? "non envoyés"}</p>
            <h1 className="titre-page">Commandes</h1>
          </div>
          <div className="actions">
            <Link className="bouton bouton-fantome bouton-petit" href="/admin/courriels">E-mails</Link>
            <form action={deconnexion}><button className="bouton bouton-fantome bouton-petit">Déconnexion</button></form>
          </div>
        </div>

        <div className="compteurs">
          <div><strong>{payees.length}</strong><span>commandes payées</span></div>
          <div><strong>{euros(total)}</strong><span>encaissés{mode !== "reel" ? " (fictifs)" : ""}</span></div>
          <div><strong>{payees.filter((c) => !["livree", "annulee"].includes(c.statut)).length}</strong><span>en cours</span></div>
        </div>

        <nav className="filtres" aria-label="Filtrer par statut">
          <Link href="/admin" className={!q.statut && !q.tout ? "actif" : ""}>Payées</Link>
          {STATUTS.map((s) => (
            <Link key={s.id} href={`/admin?statut=${s.id}`} className={q.statut === s.id ? "actif" : ""}>
              {s.nom} ({toutes.filter((c) => c.statut === s.id).length})
            </Link>
          ))}
          <Link href="/admin?tout=1" className={q.tout ? "actif" : ""}>Toutes</Link>
        </nav>

        {visibles.length === 0 ? (
          <p className="aide">Aucune commande dans cette vue.</p>
        ) : (
          <div className="tableau-cadre">
            <table className="tableau">
              <thead>
                <tr><th>Numéro</th><th>Date</th><th>Client</th><th>Formule</th><th>Montant</th><th>Statut</th></tr>
              </thead>
              <tbody>
                {visibles.map((c) => (
                  <tr key={c.id}>
                    <td><Link href={`/admin/commande/${c.id}`}>{c.id}</Link></td>
                    <td>{jour(c.creeLe)}</td>
                    <td>{c.brief ? `${c.brief.nom} — ${c.brief.marque}` : c.paiement.emailStripe || "—"}</td>
                    <td>{formuleParId(c.formule)?.nom}</td>
                    <td>{euros(c.montantCents)}</td>
                    <td><span className={`etat etat-${c.statut}`}>{nomStatut(c.statut)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
