import type { Metadata } from "next";
import Link from "next/link";
import { adresseAdmin } from "../adresse-bibliotheque";
import { exigerAdmin } from "@/lib/auth";
import { CATEGORIES, compterPublicites, filtrerPublicites, listerAvatars, listerPublicites, nomStatutPub, STATUTS_PUB, STYLES, type Filtres } from "@/lib/bibliotheque";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Publicités — Administration", robots: { index: false, follow: false } };

type Q = { q?: string; categorie?: string; avatar?: string; style?: string; statut?: string; publiee?: string; ok?: string; id?: string };

export default async function Galerie({ searchParams }: { searchParams: Promise<Q> }) {
  await exigerAdmin("/admin/publicites");
  const q = await searchParams;
  const [toutes, avatars] = await Promise.all([listerPublicites(), listerAvatars()]);
  const filtres: Filtres = { q: q.q, categorie: q.categorie, avatar: q.avatar, style: q.style, statut: q.statut, publiee: q.publiee };
  const liste = filtrerPublicites(toutes, filtres);
  const n = compterPublicites(toutes);
  const nomAvatar = (id: string) => (id ? avatars.find((a) => a.id === id)?.nom ?? id : "Sans avatar");
  const filtre = Object.values(filtres).some(Boolean);
  // Catégories et styles présents dans les fiches mais retirés de la liste : toujours proposés au filtre.
  const categories = [...new Set([...CATEGORIES, ...toutes.map((p) => p.categorie).filter(Boolean)])];
  const styles = [...new Set([...STYLES, ...toutes.map((p) => p.style).filter(Boolean)])];

  return (
    <main className="page admin">
      <div className="conteneur">
        <p className="retour"><Link href="/admin">← Commandes</Link></p>
        <div className="admin-tete">
          <div>
            <p className="surtitre">Administration</p>
            <h1 className="titre-page">Bibliothèque de publicités</h1>
          </div>
          <div className="actions">
            <Link className="bouton bouton-petit" href="/admin/publicites/nouvelle">Nouvelle publicité</Link>
            <Link className="bouton bouton-fantome bouton-petit" href="/admin/avatars">Avatars</Link>
            <Link className="bouton bouton-fantome bouton-petit" href="/realisations" target="_blank" rel="noopener">Voir le portfolio</Link>
          </div>
        </div>

        {q.ok === "supprimee" && <p className="avis avis-ok" role="status">{q.id ? `${q.id} supprimée.` : "Publicité supprimée."} Son numéro n&apos;est jamais réutilisé ; ses fichiers seront effacés au nettoyage suivant (24 heures).</p>}

        <div className="compteurs" aria-label="Compteurs">
          <div><strong>{n.total}</strong><span>publicité{n.total > 1 ? "s" : ""}</span></div>
          {STATUTS_PUB.map((s) => <div key={s.id}><strong>{n.parStatut[s.id]}</strong><span>{s.nom}</span></div>)}
          <div><strong>{n.publiees}</strong><span>publiée{n.publiees > 1 ? "s" : ""} (dont {n.aLaUne} à la une)</span></div>
        </div>

        <form className="recherche pub-filtres" action="/admin/publicites" method="get" role="search">
          <label className="champ"><span>Recherche</span><input type="search" name="q" defaultValue={q.q || ""} placeholder="Numéro, nom, produit, script" /></label>
          <label className="champ"><span>Catégorie</span>
            <select name="categorie" defaultValue={q.categorie || ""}><option value="">Toutes</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </label>
          <label className="champ"><span>Avatar</span>
            <select name="avatar" defaultValue={q.avatar || ""}><option value="">Tous</option><option value="aucun">Sans avatar</option>{avatars.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}</select>
          </label>
          <label className="champ"><span>Style</span>
            <select name="style" defaultValue={q.style || ""}><option value="">Tous</option>{styles.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </label>
          <label className="champ"><span>Statut</span>
            <select name="statut" defaultValue={q.statut || ""}><option value="">Tous</option>{STATUTS_PUB.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}</select>
          </label>
          <label className="champ"><span>Publiée</span>
            <select name="publiee" defaultValue={q.publiee || ""}><option value="">Toutes</option><option value="oui">Oui</option><option value="non">Non</option></select>
          </label>
          <button className="bouton bouton-petit" type="submit">Filtrer</button>
          {filtre && <Link className="bouton bouton-fantome bouton-petit" href="/admin/publicites">Effacer</Link>}
        </form>
        <p className="aide" role="status">{filtre ? `${liste.length} résultat${liste.length > 1 ? "s" : ""} sur ${toutes.length}. L'adresse de cette page garde vos filtres : vous pouvez la copier ou revenir en arrière.` : "Les plus récentes d'abord."}</p>

        {liste.length === 0 ? (
          <p className="avis vide">{toutes.length === 0 ? "Aucune publicité pour le moment. Cliquez sur « Nouvelle publicité »." : "Aucune publicité ne correspond à ces filtres."}</p>
        ) : (
          <div className="pub-grille">
            {liste.map((p) => (
              <article key={p.id} className="pub-carte">
                <Link href={`/admin/publicites/${p.id}`} className="pub-vignette" style={{ aspectRatio: p.format.replace(":", " / ") }} aria-label={`Ouvrir ${p.id}`}>
                  {p.miniature
                    ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={adresseAdmin(p.miniature)} alt="" loading="lazy" />
                    : p.video
                      ? <video src={`${adresseAdmin(p.video)}#t=0.1`} preload="metadata" muted playsInline />
                      : <span>Pas de vidéo</span>}
                </Link>
                <div className="pub-carte-corps">
                  <p className="pub-carte-id">
                    <Link href={`/admin/publicites/${p.id}`}><strong>{p.id}</strong></Link>
                    <span className={`pastille pastille-statut pastille-statut-${p.statut}`}>{nomStatutPub(p.statut)}</span>
                  </p>
                  <h2>{p.nom || "(sans nom)"}</h2>
                  <p className="aide">{[p.produit, p.categorie, p.style].filter(Boolean).join(" · ") || "—"}</p>
                  <p className="aide">{nomAvatar(p.avatarId)} · {p.format} · {p.dureeSecondes} s</p>
                  <p className="pub-carte-etat">
                    {p.publiee ? <span className="pastille pastille-publiee">Publiée</span> : <span className="pastille">Privée</span>}
                    {p.aLaUne && <span className="pastille pastille-une">À la une</span>}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
