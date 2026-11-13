import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { majNotes, majStatut, retirerLivrable } from "../../actions";
import { exigerAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { delaiTexte, euros, formuleParId } from "@/lib/formules";
import { nomStatut, store, STATUTS } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Commande — Administration", robots: { index: false, follow: false } };

const quand = (iso?: string) => (iso ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
const mo = (n: number) => `${(n / 1048576).toFixed(1)} Mo`;

export default async function Detail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await exigerAdmin();
  const { id } = await params;
  const q = await searchParams;
  const c = await store.commande(id);
  if (!c) notFound();
  const f = formuleParId(c.formule)!;
  const b = c.brief;
  const courriels = await store.courriels(c.id);
  const lienClient = `${env.baseUrl()}/commande/${c.token}`;
  const ligne = (k: string, v?: string) => (v ? <div><dt>{k}</dt><dd>{v}</dd></div> : null);

  return (
    <main className="page admin">
      <div className="conteneur">
        <p className="retour"><Link href="/admin">← Toutes les commandes</Link></p>
        <div className="admin-tete">
          <div>
            <p className="surtitre">Commande</p>
            <h1 className="titre-page">{c.id}</h1>
          </div>
          <span className={`etat etat-${c.statut}`}>{nomStatut(c.statut)}</span>
        </div>
        {q.ok && <p className="avis">Modification enregistrée.</p>}
        {q.erreur && <p className="avis avis-erreur">{q.erreur}</p>}

        <div className="admin-grille">
          <div>
            <section className="bloc">
              <h2>Paiement</h2>
              <dl className="recap-liste">
                {ligne("Formule", `${f.nom} — ${f.videos} vidéo${f.videos > 1 ? "s" : ""} — ${delaiTexte(f)}`)}
                {ligne("Montant", euros(c.montantCents))}
                {ligne("État", c.paiement.etat === "paye" ? `Payé le ${quand(c.paiement.payeLe)}` : c.paiement.etat)}
                {ligne("Mode", c.paiement.mode)}
                {ligne("E-mail (Stripe)", c.paiement.emailStripe)}
                {ligne("Session Stripe", c.paiement.sessionId)}
                {ligne("Paiement Stripe", c.paiement.intentId)}
              </dl>
            </section>

            <section className="bloc">
              <h2>Brief</h2>
              {!b ? (
                <p className="aide">Le client n&apos;a pas encore transmis son brief.</p>
              ) : (
                <dl className="recap-liste">
                  {ligne("Reçu le", quand(b.recuLe))}
                  {ligne("Nom", b.nom)}
                  {ligne("E-mail", b.email)}
                  {ligne("Téléphone", b.telephone)}
                  {ligne("Marque", b.marque)}
                  {ligne("Lien", b.lien)}
                  {ligne("Produit", b.produit)}
                  {ligne("Style", b.style)}
                  {ligne("Client type", b.cible)}
                  {ligne("Arguments", b.arguments)}
                  {ligne("À éviter", b.aEviter)}
                  {ligne("Complément", b.complement)}
                </dl>
              )}
              <h3>Fichiers du client ({c.fichiersClient.length})</h3>
              {c.fichiersClient.length === 0 ? <p className="aide">Aucun fichier.</p> : (
                <ul className="telechargements">
                  {c.fichiersClient.map((x) => (
                    <li key={x.id}><span>{x.nom}</span><small>{mo(x.taille)}</small><a className="bouton bouton-petit bouton-fantome" href={`/api/admin/fichier/${c.id}/${x.id}`}>Télécharger</a></li>
                  ))}
                </ul>
              )}
            </section>

            {c.retouchesDemandees.length > 0 && (
              <section className="bloc">
                <h2>Retouches demandées</h2>
                {c.retouchesDemandees.map((r) => (
                  <p key={r.date} className="citation"><small>{quand(r.date)}</small><br />{r.message}</p>
                ))}
              </section>
            )}

            <section className="bloc">
              <h2>Historique</h2>
              <ul className="historique">
                {c.historique.map((h, i) => (<li key={i}><small>{quand(h.date)}</small> {h.evenement}</li>))}
              </ul>
              <h3>E-mails ({courriels.length})</h3>
              <ul className="historique">
                {courriels.map((m) => (<li key={m.id}><small>{quand(m.date)}</small> à {m.a || "—"} — {m.objet} <em>({m.resultat})</em></li>))}
              </ul>
            </section>
          </div>

          <aside>
            <section className="bloc">
              <h2>Statut</h2>
              <form action={majStatut} className="formulaire">
                <input type="hidden" name="id" value={c.id} />
                <label className="champ">
                  <span>Passer la commande à</span>
                  <select name="statut" defaultValue={c.statut}>
                    {STATUTS.map((s) => (<option key={s.id} value={s.id}>{s.nom}</option>))}
                  </select>
                </label>
                <label className="case">
                  <input type="checkbox" name="prevenir" value="oui" defaultChecked />
                  <span>Prévenir le client par e-mail (production, validation, livraison)</span>
                </label>
                <button className="bouton bouton-large" type="submit">Enregistrer le statut</button>
              </form>
            </section>

            <section className="bloc">
              <h2>Livrables ({c.livrables.length})</h2>
              {c.livrables.length > 0 && (
                <ul className="telechargements">
                  {c.livrables.map((x) => (
                    <li key={x.id}>
                      <span>{x.nom}</span><small>{mo(x.taille)}</small>
                      <a className="bouton bouton-petit bouton-fantome" href={`/api/admin/fichier/${c.id}/${x.id}`}>Voir</a>
                      <form action={retirerLivrable}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="fichier" value={x.id} /><button className="lien-bouton" type="submit">Retirer</button></form>
                    </li>
                  ))}
                </ul>
              )}
              <form method="post" action={`/api/admin/commande/${c.id}/livrable`} encType="multipart/form-data" className="formulaire">
                <label className="champ">
                  <span>Ajouter une vidéo ou un fichier (40 Mo max.)</span>
                  <input type="file" name="fichier" accept=".mp4,.mov,.webm,.jpg,.jpeg,.png,.webp,.pdf" required />
                </label>
                <button className="bouton bouton-fantome bouton-large" type="submit">Ajouter le livrable</button>
              </form>
              <p className="aide">Pour livrer : ajoutez les fichiers, puis passez le statut à « En attente de validation » (le client valide ou demande une retouche) ou directement à « Livrée ».</p>
            </section>

            <section className="bloc">
              <h2>Lien privé du client</h2>
              <p className="code">{lienClient}</p>
              <p className="aide">C&apos;est la page de suivi et de téléchargement du client. Ne le partagez qu&apos;avec lui.</p>
            </section>

            <section className="bloc">
              <h2>Notes internes</h2>
              <form action={majNotes} className="formulaire">
                <input type="hidden" name="id" value={c.id} />
                <label className="champ champ-large"><textarea name="notes" rows={5} defaultValue={c.notes} aria-label="Notes internes" /></label>
                <button className="bouton bouton-fantome bouton-large" type="submit">Enregistrer les notes</button>
              </form>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
