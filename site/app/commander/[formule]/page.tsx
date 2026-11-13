import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BandeauMode, EnteteSimple, Pied } from "../../components/Cadre";
import { delaiTexte, euros, formuleParId, formules } from "@/lib/formules";
import { modePaiement } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Commander — Studio Accroche", robots: { index: false } };

const messages: Record<string, string> = {
  conditions: "Cochez les deux cases pour continuer.",
  ferme: "Les commandes ne sont pas encore ouvertes.",
  rythme: "Trop de tentatives. Réessayez dans quelques minutes.",
  paiement: "Le paiement n'a pas pu être préparé. Réessayez dans un instant.",
};

export default async function Commander({
  params,
  searchParams,
}: {
  params: Promise<{ formule: string }>;
  searchParams: Promise<{ erreur?: string; annule?: string }>;
}) {
  const f = formuleParId((await params).formule);
  if (!f) notFound();
  const q = await searchParams;
  const { mode } = modePaiement();
  const ouvert = mode !== "ferme";

  return (
    <>
      <BandeauMode />
      <EnteteSimple />
      <main className="page">
        <div className="conteneur commander">
          <div>
            <p className="surtitre">Votre commande</p>
            <h1 className="titre-page">
              {f.nom} — <em>{euros(f.prixCents)}</em>
            </h1>
            <p className="chapeau">{f.resume}</p>

            {q.annule && <p className="avis">Paiement annulé : rien n&apos;a été débité. Vous pouvez reprendre quand vous voulez.</p>}
            {q.erreur && <p className="avis avis-erreur">{messages[q.erreur] || "Une erreur est survenue."}</p>}

            <ol className="suite">
              <li>
                <strong>Paiement sécurisé</strong>
                <span>Par carte, sur la page de Stripe. Nous ne voyons jamais votre numéro de carte.</span>
              </li>
              <li>
                <strong>Brief</strong>
                <span>Juste après le paiement : lien du produit, photos, arguments. Cinq minutes.</span>
              </li>
              <li>
                <strong>Script, puis vidéos</strong>
                <span>{delaiTexte(f)} après réception du brief, à télécharger depuis votre lien privé.</span>
              </li>
            </ol>

            <p className="autres">
              Autre formule :{" "}
              {formules.filter((x) => x.id !== f.id).map((x, i) => (
                <span key={x.id}>
                  {i > 0 && " · "}
                  <Link href={`/commander/${x.id}`}>
                    {x.nom} ({euros(x.prixCents)})
                  </Link>
                </span>
              ))}
            </p>
          </div>

          <form className="recap" method="post" action="/api/checkout">
            <input type="hidden" name="formule" value={f.id} />
            <h2>Récapitulatif</h2>
            <ul>
              {f.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
              <li>{delaiTexte(f)}</li>
            </ul>
            <div className="total">
              <span>Total</span>
              <strong>{euros(f.prixCents)}</strong>
            </div>
            <p className="petit">TVA non applicable, article 293 B du CGI.</p>

            <label className="case">
              <input type="checkbox" name="cgv" value="oui" required />
              <span>
                J&apos;ai lu et j&apos;accepte les <Link href="/cgv" target="_blank">conditions générales de vente</Link>.
                Je demande que la prestation commence dès la validation du script.
              </span>
            </label>
            <label className="case">
              <input type="checkbox" name="ia" value="oui" required />
              <span>
                J&apos;ai compris que les vidéos sont générées par intelligence artificielle et devront
                être signalées comme telles lors de leur diffusion.
              </span>
            </label>

            <button className="bouton bouton-large" type="submit" disabled={!ouvert}>
              {ouvert ? `Payer ${euros(f.prixCents)} par carte` : "Commandes bientôt ouvertes"}
            </button>
            <p className="petit centre">Paiement traité par Stripe.</p>
          </form>
        </div>
      </main>
      <Pied />
    </>
  );
}
