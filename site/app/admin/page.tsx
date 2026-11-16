import type { Metadata } from "next";
import Link from "next/link";
import { deconnexion } from "./actions";
import { pushConfigure } from "@/lib/alertes";
import { exigerAdmin } from "@/lib/auth";
import { env, modePaiement } from "@/lib/env";
import { euros, formuleParId } from "@/lib/formules";
import { envoiReel } from "@/lib/mail";
import { echecsUtiles } from "@/lib/rattrapage";
import { depot } from "@/lib/depot";
import { purger } from "@/lib/purge";
import { nomStatut, store } from "@/lib/store";
import { compterVues, correctionOuverte, correspond, dansVue, echeance, enRetard, payee, TAILLE_PAGE, trier, VUES, type Vue } from "@/lib/suivi";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Commandes — Administration", robots: { index: false, follow: false } };

const date = (iso?: string) => (iso ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }) : "—");
const jour = (ms: number) => new Date(ms).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" });
// Les compteurs qui demandent une action sont mis en avant ; les autres sont informatifs.
const URGENTS: Vue[] = ["afaire", "nouvelles", "traiter", "corrections"];

export default async function Admin({ searchParams }: { searchParams: Promise<{ vue?: string; q?: string; page?: string }> }) {
  await exigerAdmin();
  const p = await searchParams;
  const vue: Vue = VUES.some((v) => v.id === p.vue) ? (p.vue as Vue) : "afaire";
  const recherche = (p.q || "").slice(0, 80);
  await purger().catch((e) => console.error("[purge]", (e as Error).message));
  const toutes = await store.commandes();
  const maintenant = Date.now();
  const nombres = compterVues(toutes, maintenant);
  const payees = toutes.filter(payee);
  const total = payees.reduce((s, c) => s + c.montantCents, 0);
  const { mode } = modePaiement();

  // Une recherche porte sur toutes les commandes payées, quelle que soit la vue : retrouver une commande ancienne doit toujours être possible.
  const base = recherche ? toutes.filter((c) => (vue === "nonpayees" ? !payee(c) || c.statut === "annulee" : payee(c)) && correspond(c, recherche)) : toutes.filter((c) => dansVue(c, vue, maintenant));
  const liste = trier(base, recherche ? "toutes" : vue);
  const pages = Math.max(1, Math.ceil(liste.length / TAILLE_PAGE));
  const page = Math.min(pages, Math.max(1, Number(p.page) || 1));
  const affichees = liste.slice((page - 1) * TAILLE_PAGE, page * TAILLE_PAGE);
  const lien = (v: Vue, n = 1) => `/admin?vue=${v}${recherche ? `&q=${encodeURIComponent(recherche)}` : ""}${n > 1 ? `&page=${n}` : ""}`;

  const reel = envoiReel();
  const echecs = reel ? echecsUtiles(await store.courriels(), toutes, maintenant).length : 0;
  const alertesActives = pushConfigure();
  const aide = VUES.find((v) => v.id === vue)!;

  return (
    <main className="page admin">
      <div className="conteneur">
        <div className="admin-tete">
          <div>
            <p className="surtitre">Administration · paiements : {mode} · stockage : {depot().nom} · e-mails : {reel ?? "non envoyés"} · alertes téléphone : {alertesActives ? "actives" : "non activées"}</p>
            <h1 className="titre-page">Commandes</h1>
          </div>
          <div className="actions">
            <Link className="bouton bouton-fantome bouton-petit" href="/admin/aide">Mode d&apos;emploi</Link>
            <Link className="bouton bouton-fantome bouton-petit" href="/admin/reglages">Réglages e-mail</Link>
            <Link className="bouton bouton-fantome bouton-petit" href="/admin/courriels">E-mails</Link>
            <Link className="bouton bouton-fantome bouton-petit" href="/admin/diagnostic">Diagnostic</Link>
            <form action={deconnexion}><button className="bouton bouton-fantome bouton-petit">Déconnexion</button></form>
          </div>
        </div>

        {!env.adminEmail() && (
          <p className="avis avis-erreur" role="alert">⚠ Aucune adresse n&apos;est configurée pour vos notifications de commande (variable ADMIN_EMAIL). Voir « Diagnostic ».</p>
        )}
        {echecs > 0 && (
          <p className="avis avis-erreur" role="alert">
            ⚠ {echecs} e-mail{echecs > 1 ? "s" : ""} non envoyé{echecs > 1 ? "s" : ""} ces 14 derniers jours : <Link href="/admin/courriels">voir et renvoyer</Link>.
          </p>
        )}

        <div className="compteurs compteurs-vues" role="navigation" aria-label="Catégories de commandes">
          {VUES.filter((v) => v.id !== "toutes" && v.id !== "nonpayees").map((v) => (
            <Link key={v.id} href={lien(v.id)} className={`${vue === v.id ? "actif" : ""} ${URGENTS.includes(v.id) && nombres[v.id] > 0 ? "urgent" : ""}`} aria-current={vue === v.id ? "page" : undefined}>
              <strong>{nombres[v.id]}</strong><span>{v.nom}</span>
            </Link>
          ))}
        </div>

        <p className="aide resume-ventes">
          {payees.length} commande{payees.length > 1 ? "s" : ""} payée{payees.length > 1 ? "s" : ""} au total · {euros(total)} encaissés{mode !== "reel" ? " (fictifs : mode test)" : ""}
        </p>

        <form className="recherche" action="/admin" method="get" role="search">
          <input type="hidden" name="vue" value={vue} />
          <label className="champ champ-large">
            <span>Retrouver une commande (numéro, nom, e-mail, marque, produit)</span>
            <input type="search" name="q" defaultValue={recherche} maxLength={80} placeholder="ex. SA-2611… ou dupont@…" />
          </label>
          <button className="bouton bouton-petit" type="submit">Rechercher</button>
          {recherche && <Link className="bouton bouton-fantome bouton-petit" href={`/admin?vue=${vue}`}>Effacer</Link>}
        </form>

        <nav className="filtres" aria-label="Autres vues">
          <Link href={lien("toutes")} className={vue === "toutes" ? "actif" : ""}>Toutes les commandes payées ({nombres.toutes})</Link>
          <Link href={lien("nonpayees")} className={vue === "nonpayees" ? "actif" : ""}>Non payées / annulées ({nombres.nonpayees})</Link>
        </nav>

        <h2 className="titre-vue">{recherche ? `Résultats pour « ${recherche} »` : aide.nom} <small>({liste.length})</small></h2>
        {!recherche && <p className="aide">{aide.aide}</p>}

        {liste.length === 0 ? (
          <p className="aide vide">{recherche ? "Aucune commande ne correspond à cette recherche." : vue === "afaire" ? "Rien à faire pour l'instant. 🎉 Vous serez prévenu dès qu'une commande arrive." : "Aucune commande dans cette catégorie."}</p>
        ) : (
          <div className="tableau-cadre">
            <table className="tableau">
              <thead>
                <tr><th>Numéro</th><th>Payée le</th><th>Client</th><th>Offre</th><th>Montant</th><th>Statut</th><th>À livrer pour le</th></tr>
              </thead>
              <tbody>
                {affichees.map((c) => {
                  const e = echeance(c);
                  const retard = enRetard(c, maintenant);
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/admin/commande/${c.id}`}>{c.id}</Link>
                        {payee(c) && !c.vueLe && <span className="pastille pastille-nouveau">Nouvelle</span>}
                        {correctionOuverte(c) && <span className="pastille pastille-correction">Correction</span>}
                        {retard && <span className="pastille pastille-retard">En retard</span>}
                      </td>
                      <td>{date(c.paiement.payeLe || c.creeLe)}</td>
                      <td>{c.brief ? `${c.brief.nom} — ${c.brief.marque}` : c.paiement.nomStripe || c.paiement.emailStripe || "—"}</td>
                      <td>{formuleParId(c.formule)?.nom}</td>
                      <td>{euros(c.montantCents)}</td>
                      <td><span className={`etat etat-${c.statut}`}>{nomStatut(c.statut)}</span></td>
                      <td>{payee(c) && ["payee", "en_production", "attente_validation"].includes(c.statut) ? (e ? jour(e) : "dès réception du brief") : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <nav className="pagination" aria-label="Pages">
            {page > 1 && <Link href={lien(vue, page - 1)}>← Précédentes</Link>}
            <span>Page {page} / {pages}</span>
            {page < pages && <Link href={lien(vue, page + 1)}>Suivantes →</Link>}
          </nav>
        )}
      </div>
    </main>
  );
}
