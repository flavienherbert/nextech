import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cloturerCommande, creerFacture, lancerProduction, livrerAuClient, majNotes, majStatut, proposerScript, refuserHorsPerimetre, relancerClient, retirerLivrable } from "../../actions";
import Copier from "../../Copier";
import { ficheProduction } from "@/lib/fiche";
import Livrable from "../../Livrable";
import { LIVRABLE_MAX_MO } from "@/lib/fichiers";
import { obstaclesFacture } from "@/lib/factures";
import { exigerAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { delaiTexte, euros, formuleParId } from "@/lib/formules";
import { marquerVue } from "@/lib/commandes";
import { enEchec } from "@/lib/mail";
import { nomStatut, store, STATUTS } from "@/lib/store";
import { toursMax, toursUtilises } from "@/lib/tours";
import { DELAI_RETOUCHE_JOURS, dateEcheanceTexte, miseADisposition } from "@/lib/delais";
import { correctionOuverte, echeance, enRetard, payee } from "@/lib/suivi";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Commande — Administration", robots: { index: false, follow: false } };

const quand = (iso?: string) => (iso ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
const MESSAGES: Record<string, string> = {
  production: "Production lancée.",
  script: "Script envoyé au client.",
  refus: "Demande refusée : le client est informé, son tour de retouches n'est pas décompté.",
  livraison: "Livraison envoyée au client.",
  cloture: "Commande clôturée.",
  relance: "Client relancé.",
  statut: "Statut enregistré.",
  notes: "Notes enregistrées.",
  retire: "Livrable retiré.",
  facture: "Facture émise.",
};
const mo = (n: number) => `${(n / 1048576).toFixed(1)} Mo`;

export default async function Detail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erreur?: string; mail?: string }> }) {
  const { id } = await params;
  await exigerAdmin(`/admin/commande/${id}`);
  const q = await searchParams;
  const c = await store.commande(id);
  if (!c) notFound();
  // Ouvrir la commande la marque comme vue : elle n'est plus « Nouvelle » dans le tableau de bord.
  if (payee(c) && !c.vueLe) await marquerVue(c.id).catch((e) => console.error("[vue]", (e as Error).message));
  const f = formuleParId(c.formule)!;
  const correction = correctionOuverte(c);
  const retard = enRetard(c);
  const limite = echeance(c);
  const dernierRetour = c.retouchesDemandees.at(-1);
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
        {q.ok && <p className="avis avis-ok" role="status">{MESSAGES[q.ok] || "Modification enregistrée."}</p>}
        {q.mail === "non" && <p className="avis avis-erreur" role="alert">⚠ L&apos;e-mail au client n&apos;a pas pu être envoyé. Rien n&apos;est perdu : il est archivé ci-dessous, vous pourrez le renvoyer depuis « Notifications et e-mails », ou transmettre le lien privé au client.</p>}
        {q.mail === "oui" && <p className="avis avis-ok" role="status">✓ E-mail envoyé au client.</p>}
        {q.erreur && <p className="avis avis-erreur" role="alert">{q.erreur}</p>}

        {payee(c) && (
          <section className="bloc etape" aria-label="Prochaine étape">
            <h2>Prochaine étape</h2>
            {c.statut === "attente_infos" && (
              <>
                <p>Le client a payé mais n&apos;a pas encore envoyé son brief. Rien à produire tant qu&apos;il n&apos;est pas arrivé.</p>
                <p className="aide">{c.relanceBriefLe ? `Il a déjà été relancé le ${quand(c.relanceBriefLe)}.` : "Une relance automatique part après 48 h sans brief."}</p>
                <form action={relancerClient}><input type="hidden" name="id" value={c.id} /><button className="bouton bouton-fantome" type="submit">Relancer le client maintenant</button></form>
              </>
            )}
            {c.statut === "payee" && (
              <>
                <p><strong>1.</strong> Rédigez le script à partir de la fiche de production (colonne de gauche, « Brief ») et envoyez-le au client ci-dessous. <strong>2.</strong> Attendez son « OK » : il répond à l&apos;e-mail, dans la boîte du studio. <strong>3.</strong> Téléchargez ses fichiers, puis démarrez la production : le client en est prévenu. Les conditions de vente promettent qu&apos;aucune vidéo n&apos;est produite avant son accord.</p>
                {c.scriptEnvoyeLe && <p className="aide">Script envoyé au client le {quand(c.scriptEnvoyeLe)}. Vous pouvez en renvoyer une version corrigée.</p>}
                <form action={proposerScript} className="formulaire">
                  <input type="hidden" name="id" value={c.id} />
                  <label className="champ champ-large"><span>Script à envoyer au client</span><textarea name="script" rows={7} required minLength={20} maxLength={5000} placeholder={"0–3 s  ACCROCHE : « … »\n3–8 s  PRODUIT : « … »\n8–12 s  BÉNÉFICE : « … »\n12–15 s  APPEL À L'ACTION : « … »\n(15 secondes maximum par vidéo : environ 37 mots)"} /></label>
                  <button className="bouton bouton-fantome" type="submit">{c.scriptEnvoyeLe ? "Renvoyer le script au client" : "Envoyer le script au client"}</button>
                </form>
                <form action={lancerProduction} className="formulaire">
                  <input type="hidden" name="id" value={c.id} />
                  <label className="case"><input type="checkbox" name="scriptValide" value="oui" required /> <span>Le client a validé le script (réponse reçue par e-mail)</span></label>
                  <button className="bouton" type="submit">Démarrer la production</button>
                </form>
              </>
            )}
            {c.statut === "en_production" && (
              <>
                {correction ? (
                  <>
                    <p><strong>Le client demande une correction</strong> ({quand(dernierRetour?.date)}) :</p>
                    <p className="citation">{dernierRetour?.message}</p>
                    <p>Faites la modification, ajoutez la nouvelle version dans « Livrables » (retirez l&apos;ancienne si besoin), puis renvoyez-la au client.</p>
                    <p className="aide">Tour de retouches {toursUtilises(c)} sur {toursMax(c)}. Il reste dans le périmètre s&apos;il porte sur le texte à l&apos;écran, les sous-titres, le rythme ou le remplacement d&apos;un plan, à script constant.</p>
                    <form action={refuserHorsPerimetre} className="formulaire">
                      <input type="hidden" name="id" value={c.id} />
                      <label className="champ champ-large"><span>La demande change le produit, le brief, le script validé, l&apos;angle ou la durée ? Expliquez-le au client : il n&apos;est pas décompté d&apos;un tour.</span><textarea name="explication" rows={3} required minLength={10} maxLength={2000} /></label>
                      <button className="bouton bouton-fantome" type="submit">Refuser : hors périmètre</button>
                    </form>
                  </>
                ) : (
                  <p>Réalisez la vidéo, ajoutez les fichiers terminés dans « Livrables » (colonne de droite), puis envoyez la livraison au client.</p>
                )}
                {limite && <p className="aide">À livrer avant le {quand(new Date(limite).toISOString())}{retard ? " — en retard" : ""}.</p>}
                {c.livrables.length === 0 ? (
                  <p className="aide">Ajoutez d&apos;abord au moins un fichier dans « Livrables » : le bouton d&apos;envoi s&apos;activera.</p>
                ) : (
                  <form action={livrerAuClient}><input type="hidden" name="id" value={c.id} /><button className="bouton" type="submit">{correction ? "Envoyer la version corrigée au client" : "Envoyer la livraison au client"}</button></form>
                )}
              </>
            )}
            {c.statut === "attente_validation" && (
              <>
                <p>La livraison est chez le client. Il peut la valider ou demander une retouche depuis son lien privé : vous serez prévenu dans les deux cas.</p>
                <p className="aide">Délai de {DELAI_RETOUCHE_JOURS} jours : jusqu&apos;au {dateEcheanceTexte(miseADisposition(c))} inclus (heure de Paris). Sans réponse, la commande est <strong>clôturée automatiquement</strong> (livraison réputée acceptée, facture émise, client prévenu par e-mail) ; une demande de retouche tardive est refusée automatiquement.</p>
                <div className="actions">
                  <form action={livrerAuClient}><input type="hidden" name="id" value={c.id} /><button className="bouton bouton-fantome" type="submit">Renvoyer l&apos;e-mail de livraison</button></form>
                  <form action={cloturerCommande}><input type="hidden" name="id" value={c.id} /><button className="bouton bouton-fantome" type="submit">Clôturer : considérer comme validée</button></form>
                </div>
              </>
            )}
            {c.statut === "livree" && <p>✓ Commande terminée{c.livreeLe ? ` (livrée le ${quand(c.livreeLe)})` : ""}{c.clotureAutoLe ? ` — clôturée automatiquement : aucun retour du client dans le délai de ${DELAI_RETOUCHE_JOURS} jours` : ""}. Les fichiers restent téléchargeables par le client pendant 90 jours, puis sont supprimés automatiquement.</p>}
          </section>
        )}
        {!payee(c) && <p className="avis">Cette commande n&apos;est pas payée : ce n&apos;est pas une vente. Rien à faire.</p>}

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
                  {ligne("À facturer à", b.nomFacture)}
                  {ligne("Adresse de facturation", b.adresseFacture)}
                  {ligne("SIREN / SIRET", b.sirenClient)}
                </dl>
              )}
              {b && (
                <details className="fiche-production">
                  <summary>Fiche de production (à copier dans Higgsfield)</summary>
                  <Copier texte={ficheProduction(c)} />
                </details>
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
                <h2>Retouches demandées ({toursUtilises(c)} tour{toursUtilises(c) > 1 ? "s" : ""} utilisé{toursUtilises(c) > 1 ? "s" : ""} sur {toursMax(c)})</h2>
                {c.retouchesDemandees.map((r) => (
                  <p key={r.date} className="citation"><small>{quand(r.date)} — {r.tardive ? `refusée : reçue après le délai de ${DELAI_RETOUCHE_JOURS} jours (non décomptée)` : r.horsPerimetre ? "refusée : hors périmètre (non décomptée)" : r.traiteeLe ? `traitée le ${quand(r.traiteeLe)}` : "à traiter"}</small><br />{r.message}{r.horsPerimetre && <><br /><em>Réponse au client : {r.horsPerimetre}</em></>}</p>
                ))}
              </section>
            )}

            <section className="bloc">
              <h2>Historique</h2>
              <ul className="historique">
                {c.historique.map((h, i) => (<li key={i}><small>{quand(h.date)}</small> {h.evenement}</li>))}
              </ul>
              <h3>Notifications et e-mails ({courriels.length})</h3>
              {courriels.some(enEchec) && <p className="avis avis-erreur">⚠ Un ou plusieurs e-mails ne sont pas partis. <Link href="/admin/courriels">Voir et renvoyer</Link>.</p>}
              <ul className="historique">
                {courriels.map((m) => (<li key={m.id} className={enEchec(m) ? "echec" : ""}><small>{quand(m.date)}</small> à {m.a || "—"} — {m.objet} <em>({m.resultat}{m.pilote ? `, via ${m.pilote}` : ""})</em></li>))}
              </ul>
            </section>
          </div>

          <aside>
            <section className="bloc">
              <h2>Statut</h2>
              <p className="aide">Les boutons « Prochaine étape » suffisent au quotidien. Ce formulaire sert aux cas particuliers (retour en arrière, annulation).</p>
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
              <Livrable commande={c.id} maxMo={LIVRABLE_MAX_MO} />
              <p className="aide">Ajoutez ici les vidéos et PDF terminés (jusqu&apos;à {LIVRABLE_MAX_MO} Mo par fichier), puis utilisez le bouton « Envoyer la livraison au client » en haut de page.</p>
            </section>

            <section className="bloc">
              <h2>Facture</h2>
              {c.facture ? (
                <>
                  <dl className="recap-liste">
                    <div><dt>Numéro</dt><dd>{c.facture.numero}</dd></div>
                    <div><dt>Émise le</dt><dd>{quand(c.facture.date)}</dd></div>
                  </dl>
                  {c.facture.specimen && <p className="aide">Spécimen de préproduction, sans valeur. Le client ne peut pas le télécharger.</p>}
                  <p className="actions"><a className="bouton bouton-fantome bouton-petit" href={`/api/admin/facture/${c.id}`}>Télécharger le PDF</a></p>
                </>
              ) : obstaclesFacture(c).length ? (
                <>
                  <p className="aide">La facture ne peut pas encore être émise :</p>
                  <ul className="historique">{obstaclesFacture(c).map((o) => (<li key={o}>{o}</li>))}</ul>
                </>
              ) : (
                <form action={creerFacture} className="formulaire">
                  <input type="hidden" name="id" value={c.id} />
                  <p className="aide">Elle est émise automatiquement à la livraison. Vous pouvez l&apos;émettre dès maintenant ; un numéro attribué ne peut plus être repris.</p>
                  <button className="bouton bouton-fantome bouton-large" type="submit">Émettre la facture</button>
                </form>
              )}
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
