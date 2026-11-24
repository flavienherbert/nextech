import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import FormulairePub from "../FormulairePub";
import { listesPourFormulaire } from "../listes";
import { basculerALaUne, basculerPublication, dupliquer, supprimer } from "../actions";
import { adresseAdmin } from "../../adresse-bibliotheque";
import { exigerAdmin } from "@/lib/auth";
import { ID_PUB, listerAvatars, lirePublicite, MAX_A_LA_UNE, nomStatutPub } from "@/lib/bibliotheque";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Publicité — Administration", robots: { index: false, follow: false } };

const OK: Record<string, string> = {
  cree: "Publicité créée. Elle est privée tant que vous ne l'avez pas publiée.",
  publiee: "Publicité publiée : elle apparaît dans le portfolio « Réalisations ».",
  depubliee: "Publicité retirée du portfolio : elle est de nouveau privée.",
  une: "Publicité mise à la une : elle apparaît sur la page d'accueil.",
  pasune: "Publicité retirée de la une.",
  duplique: "Copie créée (sans les fichiers, privée, « En cours »). Complétez-la ci-dessous.",
};
const ERREUR: Record<string, string> = {
  publication: "Seule une publicité « Validée » qui a une vidéo peut être publiée. Passez son statut à « Validée » et ajoutez une vidéo, puis enregistrez.",
  "une-max": `${MAX_A_LA_UNE} publicités à la une au maximum : retirez-en une de la une avant d'en ajouter une autre.`,
  "une-privee": "Seule une publicité publiée peut être mise à la une : publiez-la d'abord.",
  confirmation: "Suppression non confirmée : retapez exactement le numéro de la publicité.",
  introuvable: "Publicité introuvable.",
};

export default async function FichePublicite({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const { id } = await params;
  await exigerAdmin(`/admin/publicites/${id}`);
  if (!ID_PUB.test(id)) notFound();
  const [pub, avatars, q] = await Promise.all([lirePublicite(id), listerAvatars(), searchParams]);
  if (!pub) notFound();
  const avatar = avatars.find((a) => a.id === pub.avatarId);
  const publiable = pub.statut === "validee" && Boolean(pub.video);
  return (
    <main className="page admin">
      <div className="conteneur">
        <p className="retour"><Link href="/admin/publicites">← Publicités</Link></p>
        <div className="admin-tete">
          <div>
            <p className="surtitre">Administration · {pub.id}</p>
            <h1 className="titre-page">{pub.nom || pub.id}</h1>
            <p className="aide">
              <span className={`pastille pastille-statut pastille-statut-${pub.statut}`}>{nomStatutPub(pub.statut)}</span>
              {pub.publiee && <span className="pastille pastille-publiee">Publiée</span>}
              {pub.aLaUne && <span className="pastille pastille-une">À la une</span>}
              {!pub.publiee && <span className="pastille">Privée</span>}
            </p>
          </div>
          <div className="actions">
            {pub.publiee && <Link className="bouton bouton-fantome bouton-petit" href="/realisations" target="_blank" rel="noopener">Voir le portfolio</Link>}
          </div>
        </div>

        {q.ok && OK[q.ok] && <p className="avis avis-ok" role="status">{OK[q.ok]}</p>}
        {q.erreur && ERREUR[q.erreur] && <p className="avis avis-erreur" role="alert">{ERREUR[q.erreur]}</p>}

        <div className="pub-fiche">
          <div className="pub-apercu-colonne">
            <div className="pub-apercu" style={{ aspectRatio: pub.format.replace(":", " / ") }}>
              {pub.video
                ? <video src={adresseAdmin(pub.video)} poster={pub.miniature ? adresseAdmin(pub.miniature) : undefined} controls playsInline preload="metadata" />
                : pub.miniature
                  ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={adresseAdmin(pub.miniature)} alt="" />
                  : <span>Aucune vidéo pour le moment</span>}
            </div>
            <ul className="pub-infos">
              <li><strong>Avatar</strong> {avatar ? <Link href={`/admin/publicites?avatar=${avatar.id}`}>{avatar.nom}</Link> : pub.avatarId ? `${pub.avatarId} (supprimé)` : "aucun"}</li>
              <li><strong>Format</strong> {pub.format} · {pub.dureeSecondes} s</li>
              <li><strong>Créée</strong> {pub.creeLe.slice(0, 10)} · <strong>modifiée</strong> {pub.modifieLe.slice(0, 10)}</li>
            </ul>

            <div className="pub-actions">
              <form action={basculerPublication}>
                <input type="hidden" name="id" value={pub.id} />
                <input type="hidden" name="publier" value={pub.publiee ? "0" : "1"} />
                <button className={`bouton bouton-petit${pub.publiee ? " bouton-fantome" : ""}`} type="submit" disabled={!pub.publiee && !publiable}>{pub.publiee ? "Dépublier" : "Publier"}</button>
              </form>
              <form action={basculerALaUne}>
                <input type="hidden" name="id" value={pub.id} />
                <input type="hidden" name="une" value={pub.aLaUne ? "0" : "1"} />
                <button className="bouton bouton-fantome bouton-petit" type="submit" disabled={!pub.publiee}>{pub.aLaUne ? "Retirer de la une" : "Mettre à la une"}</button>
              </form>
              <form action={dupliquer}>
                <input type="hidden" name="id" value={pub.id} />
                <button className="bouton bouton-fantome bouton-petit" type="submit">Dupliquer</button>
              </form>
            </div>
            {!pub.publiee && !publiable && <p className="aide">Pour publier : statut « Validée » et une vidéo (puis « Enregistrer »).</p>}
            {pub.publiee && !pub.aLaUne && <p className="aide">« Mettre à la une » l&apos;affiche aussi sur la page d&apos;accueil ({MAX_A_LA_UNE} au plus).</p>}
            <p className="aide">Les boutons agissent sur la fiche enregistrée : enregistrez vos modifications avant de publier.</p>

            <details className="pub-suppression">
              <summary>Supprimer cette publicité</summary>
              <form action={supprimer} className="formulaire">
                <p className="aide">La fiche est supprimée définitivement et son numéro n&apos;est jamais réutilisé. Ses fichiers sont effacés du stockage au nettoyage suivant, au bout de 24 heures.</p>
                <input type="hidden" name="id" value={pub.id} />
                <label className="champ"><span>Pour confirmer, tapez <strong>{pub.id}</strong></span><input name="confirmation" autoComplete="off" placeholder={pub.id} required /></label>
                <button className="bouton bouton-petit bouton-danger" type="submit">Supprimer définitivement</button>
              </form>
            </details>
          </div>

          <div className="pub-formulaire-colonne">
            <FormulairePub pub={pub} listes={listesPourFormulaire(avatars)} />
          </div>
        </div>
      </div>
    </main>
  );
}
