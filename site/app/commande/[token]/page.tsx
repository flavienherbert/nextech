import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BandeauMode, EnteteSimple, Pied } from "../../components/Cadre";
import Attente from "./Attente";
import Brief from "./Brief";
import Validation from "./Validation";
import { store } from "@/lib/store";
import { retouchesMax } from "@/lib/commandes";
import { delaiTexte, euros, formuleParId } from "@/lib/formules";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Votre commande — Studio Accroche", robots: { index: false, follow: false } };

const jalons = [
  { id: "attente_infos", nom: "Paiement confirmé" },
  { id: "payee", nom: "Brief reçu" },
  { id: "en_production", nom: "En production" },
  { id: "attente_validation", nom: "À valider" },
  { id: "livree", nom: "Livrée" },
];

const date = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "");

export default async function PageCommande({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const c = await store.commandeParToken(token);
  if (!c) notFound();
  const f = formuleParId(c.formule)!;
  const rang = jalons.findIndex((j) => j.id === c.statut);

  return (
    <>
      <BandeauMode />
      <EnteteSimple />
      <main className="page">
        <div className="conteneur conteneur-etroit">
          <p className="surtitre">Commande {c.id}</p>

          {c.paiement.etat === "en_attente" && (
            <>
              <h1 className="titre-page">Paiement en cours de <em>confirmation</em></h1>
              <Attente token={token} />
            </>
          )}

          {(c.paiement.etat === "expire" || c.paiement.etat === "echoue") && (
            <>
              <h1 className="titre-page">Paiement <em>non abouti</em></h1>
              <p className="chapeau">Aucune somme n&apos;a été débitée pour cette commande.</p>
              <p className="actions">
                <Link className="bouton" href={`/commander/${f.id}`}>
                  Reprendre la commande
                </Link>
              </p>
            </>
          )}

          {c.paiement.etat === "paye" && (
            <>
              {!c.brief && (
                <>
                  <h1 className="titre-page">Merci. Il nous manque <em>votre brief.</em></h1>
                  <p className="chapeau">
                    Paiement de {euros(c.montantCents)} confirmé pour la formule {f.nom}. Répondez à ces questions
                    pour lancer la production.
                  </p>
                  <Brief token={token} emailConnu={c.paiement.emailStripe || ""} fichiers={c.fichiersClient.map(({ id, nom, taille }) => ({ id, nom, taille }))} />
                </>
              )}

              {c.brief && (
                <>
                  <h1 className="titre-page">
                    {c.statut === "livree" ? <>Votre commande est <em>livrée.</em></> : c.statut === "attente_validation" ? <>C&apos;est prêt, <em>à vous de valider.</em></> : <>Votre commande est <em>en cours.</em></>}
                  </h1>

                  <ol className="jalons">
                    {jalons.map((j, i) => (
                      <li key={j.id} className={i < rang ? "fait" : i === rang ? "courant" : ""}>
                        <span>{j.nom}</span>
                      </li>
                    ))}
                  </ol>

                  {c.statut === "payee" && <p className="chapeau">Brief bien reçu le {date(c.brief.recuLe)}. Vous recevrez le script par e-mail avant toute production.</p>}
                  {c.statut === "en_production" && <p className="chapeau">La production est lancée. Vous recevrez un e-mail dès que le résultat sera prêt à être validé.</p>}

                  {(c.statut === "attente_validation" || c.statut === "livree") && (
                    <section className="bloc">
                      <h2>{c.statut === "livree" ? "Vos fichiers" : "Votre livraison"}</h2>
                      {c.fichiersPurgesLe ? (
                        <p className="aide">Les fichiers de cette commande ont été supprimés à l&apos;issue des 90 jours de conservation.</p>
                      ) : c.livrables.length === 0 ? (
                        <p className="aide">Les fichiers arrivent.</p>
                      ) : (
                        <ul className="telechargements">
                          {c.livrables.map((l) => (
                            <li key={l.id}>
                              <span>{l.nom}</span>
                              <small>{(l.taille / 1048576).toFixed(1)} Mo</small>
                              <a className="bouton bouton-petit" href={`/api/commande/${token}/fichier/${l.id}`}>
                                Télécharger
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                      {c.statut === "attente_validation" && <Validation token={token} restantes={Math.max(0, retouchesMax(c) - c.retouchesDemandees.length)} />}
                      {c.statut === "livree" && (
                        <p className="aide">
                          Ces vidéos sont générées par intelligence artificielle. Lors de leur diffusion, activez la
                          mention « contenu généré par IA » proposée par la plateforme.
                        </p>
                      )}
                    </section>
                  )}

                  <section className="bloc">
                    <h2>Récapitulatif</h2>
                    <dl className="recap-liste">
                      <div><dt>Formule</dt><dd>{f.nom} — {f.videos} vidéo{f.videos > 1 ? "s" : ""}</dd></div>
                      <div><dt>Montant payé</dt><dd>{euros(c.montantCents)}</dd></div>
                      <div><dt>Délai</dt><dd>{delaiTexte(f)} après réception du brief</dd></div>
                      <div><dt>Marque</dt><dd>{c.brief.marque}</dd></div>
                      <div><dt>Produit</dt><dd>{c.brief.produit}</dd></div>
                      <div><dt>Fichiers transmis</dt><dd>{c.fichiersPurgesLe ? "supprimés" : c.fichiersClient.length}</dd></div>
                      {c.facture && !c.facture.specimen && (
                        <div><dt>Facture</dt><dd><a href={`/api/commande/${token}/facture`}>Télécharger la facture n° {c.facture.numero}</a></dd></div>
                      )}
                    </dl>
                    <p className="aide">Conservez l&apos;adresse de cette page : c&apos;est votre lien privé de suivi et de téléchargement.</p>
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </main>
      <Pied />
    </>
  );
}
