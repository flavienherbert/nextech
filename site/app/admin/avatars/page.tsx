import type { Metadata } from "next";
import Link from "next/link";
import FormulaireAvatar from "./FormulaireAvatar";
import { supprimerAvatarAction } from "./actions";
import { adresseAdmin } from "../adresse-bibliotheque";
import { exigerAdmin } from "@/lib/auth";
import { DUREE_MAX_PUB, GENRES_AVATAR, LIMITES, listerAvatars, listerPublicites, publicitesLiees } from "@/lib/bibliotheque";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Avatars — Administration", robots: { index: false, follow: false } };

export default async function PageAvatars({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string; avatar?: string }> }) {
  await exigerAdmin("/admin/avatars");
  const q = await searchParams;
  const [avatars, publicites] = await Promise.all([listerAvatars(), listerPublicites()]);
  const genres = GENRES_AVATAR.map((g) => ({ id: g.id, nom: g.nom }));
  const limites = { description: LIMITES.description, reference: LIMITES.reference, notes: LIMITES.notes };
  const nomGenre = (id: string) => GENRES_AVATAR.find((g) => g.id === id)?.nom ?? id;
  // Refus de suppression : la liste des publicités concernées est affichée.
  const liees = q.erreur === "lie" && q.avatar ? await publicitesLiees(q.avatar) : [];

  return (
    <main className="page admin">
      <div className="conteneur">
        <p className="retour"><Link href="/admin/publicites">← Publicités</Link></p>
        <div className="admin-tete">
          <div>
            <p className="surtitre">Administration</p>
            <h1 className="titre-page">Avatars</h1>
            <p className="aide">Les présentateurs générés par IA, reliés aux publicités. Leurs photos et références ne sont jamais visibles du public.</p>
          </div>
        </div>
        {q.ok === "supprime" && <p className="avis avis-ok" role="status">Avatar supprimé.</p>}
        {q.erreur === "lie" && (
          <p className="avis avis-erreur" role="alert">
            Cet avatar est utilisé par {liees.length} publicité{liees.length > 1 ? "s" : ""} et ne peut pas être supprimé : {liees.map((p, i) => <span key={p.id}>{i > 0 && ", "}<Link href={`/admin/publicites/${p.id}`}>{p.id}</Link></span>)}. Changez leur avatar d&apos;abord.
          </p>
        )}
        {q.erreur === "introuvable" && <p className="avis avis-erreur" role="alert">Avatar introuvable.</p>}

        <div className="avatars-grille">
          {avatars.map((a) => {
            const liees = publicites.filter((p) => p.avatarId === a.id);
            return (
              <article key={a.id} id={a.id} className="avatar-carte">
                <div className="avatar-photo">
                  {a.photo ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={adresseAdmin(a.photo)} alt="" loading="lazy" /> : <span>{a.nom.slice(0, 2)}</span>}
                </div>
                <div className="avatar-corps">
                  <h2>{a.nom} <small className="aide">{nomGenre(a.genre)} · {a.id}</small></h2>
                  {a.description && <p>{a.description}</p>}
                  {a.reference && <p className="aide">Référence : {a.reference}</p>}
                  <p className="aide">
                    {liees.length ? <Link href={`/admin/publicites?avatar=${a.id}`}>{liees.length} publicité{liees.length > 1 ? "s" : ""} liée{liees.length > 1 ? "s" : ""}</Link> : "Aucune publicité liée"}
                    {liees.length > 0 && <> ({liees.map((p) => p.id).join(", ")})</>}
                  </p>
                  <details className="avatar-edition">
                    <summary>Modifier</summary>
                    <FormulaireAvatar avatar={a} genres={genres} limites={limites} dureeMax={DUREE_MAX_PUB} />
                  </details>
                  <form action={supprimerAvatarAction} className="media-retrait">
                    <input type="hidden" name="id" value={a.id} />
                    <button className="bouton bouton-fantome bouton-petit" type="submit" disabled={liees.length > 0} title={liees.length ? "Avatar utilisé par des publicités" : undefined}>Supprimer</button>
                    {liees.length > 0 && <small className="aide"> Suppression impossible tant qu&apos;une publicité l&apos;utilise.</small>}
                  </form>
                </div>
              </article>
            );
          })}
        </div>

        <section className="bloc" aria-labelledby="ajout-avatar">
          <h2 id="ajout-avatar" className="titre-vue">Ajouter un avatar</h2>
          <FormulaireAvatar genres={genres} limites={limites} dureeMax={DUREE_MAX_PUB} />
        </section>
      </div>
    </main>
  );
}
