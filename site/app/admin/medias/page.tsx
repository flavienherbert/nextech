import type { Metadata } from "next";
import Link from "next/link";
import { majTexteMedia, remettreMedia } from "../actions";
import MediaEnvoi from "../MediaEnvoi";
import { exigerAdmin } from "@/lib/auth";
import { EMPLACEMENTS, GROUPES } from "@/lib/emplacements";
import { chargerMedias } from "@/lib/medias";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Médias — Administration", robots: { index: false, follow: false } };

const mo = (n: number) => `${(n / 1048576).toFixed(1).replace(".", ",")} Mo`;
const jour = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Paris" });

export default async function PageMedias({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await exigerAdmin("/admin/medias");
  const q = await searchParams;
  const m = await chargerMedias();
  const personnalises = EMPLACEMENTS.filter((e) => m.envoye(e.id)).length;

  return (
    <main className="page admin">
      <div className="conteneur">
        <p className="retour"><Link href="/admin">← Commandes</Link></p>
        <div className="admin-tete">
          <div>
            <p className="surtitre">Administration</p>
            <h1 className="titre-page">Images et vidéos du site</h1>
          </div>
          <div className="actions">
            <Link className="bouton bouton-fantome bouton-petit" href="/" target="_blank" rel="noopener">Voir le site</Link>
            <Link className="bouton bouton-fantome bouton-petit" href="/admin/lancement">Liste de lancement</Link>
          </div>
        </div>

        {q.ok === "retire" && <p className="avis avis-ok" role="status">Image d&apos;origine remise. Le site est mis à jour.</p>}
        {q.ok === "texte" && <p className="avis avis-ok" role="status">Texte enregistré. Le site est mis à jour.</p>}
        {q.erreur && <p className="avis avis-erreur" role="alert">Action impossible : emplacement inconnu.</p>}

        <div className="avis">
          <p><strong>{personnalises} emplacement{personnalises > 1 ? "s" : ""} sur {EMPLACEMENTS.length} personnalisé{personnalises > 1 ? "s" : ""}.</strong> Tant qu&apos;un emplacement est vide, le site affiche l&apos;image d&apos;exemple fournie (des photographies d&apos;illustration, indiquées comme telles sur le site).</p>
          <ol className="aide-etapes">
            <li>Choisissez un fichier pour l&apos;emplacement voulu : il est contrôlé puis publié, sans redéploiement. Les images trop lourdes sont réduites automatiquement.</li>
            <li>Cliquez sur « Voir le site » pour vérifier. Le changement est visible tout de suite ; si le navigateur affiche encore l&apos;ancien, rechargez la page.</li>
            <li>Pour revenir en arrière : « Remettre l&apos;image d&apos;origine ».</li>
          </ol>
          <p className="aide">
            N&apos;envoyez que des contenus dont vous détenez les droits (vos créations, ou des visuels sous licence). Une vidéo générée par IA doit rester présentée comme telle : la mention est déjà affichée sur le site sous la vidéo de démonstration.
            Ne montrez pas de client réel sans son accord écrit.
          </p>
        </div>

        {GROUPES.map((g) => (
          <section key={g.id} className="medias-groupe" aria-labelledby={`g-${g.id}`}>
            <h2 id={`g-${g.id}`} className="titre-vue">{g.nom}</h2>
            <p className="aide">{g.aide}</p>
            <div className="medias-grille">
              {EMPLACEMENTS.filter((e) => e.groupe === g.id).map((e) => {
                const envoye = m.envoye(e.id);
                const url = m.url(e.id);
                const texte = m.texte(e.id);
                return (
                  <article key={e.id} id={e.id} className="media-carte">
                    <div className={`media-apercu${e.ratio < 1 ? " media-apercu-vertical" : ""}`} style={{ aspectRatio: String(e.ratio) }}>
                      {e.genre === "image" && url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={url} alt="" loading="lazy" />}
                      {e.genre === "video" && envoye && url && <video src={url} controls playsInline preload="metadata" muted />}
                      {!url && <span>{e.genre === "video" ? "Aucune vidéo" : "Aucune image"}</span>}
                    </div>
                    <div className="media-corps">
                      <h3>{e.nom}</h3>
                      <p className={`media-etat${envoye ? " media-etat-perso" : ""}`}>
                        {envoye ? `Votre ${e.genre === "video" ? "vidéo" : "image"} · ${envoye.nom} · ${mo(envoye.taille)} · ${jour(envoye.ajouteLe)}` : url ? "Image d'exemple fournie" : "Vide"}
                      </p>
                      <p className="aide">{e.role}</p>
                      <p className="aide"><em>{e.conseil}</em></p>
                      <MediaEnvoi slot={e.id} genre={e.genre} ratio={e.ratio} largeurMax={e.largeurMax} maxMo={e.maxMo} remplace={Boolean(envoye)} />
                      {envoye && (
                        <form action={remettreMedia} className="media-retrait">
                          <input type="hidden" name="slot" value={e.id} />
                          <button className="bouton bouton-fantome bouton-petit" type="submit">{e.genre === "video" ? "Retirer la vidéo" : "Remettre l'image d'origine"}</button>
                        </form>
                      )}
                      {e.id.startsWith("exemple-") && e.genre === "video" && (
                        <form action={majTexteMedia} className="formulaire media-texte">
                          <input type="hidden" name="slot" value={e.id} />
                          <label className="champ"><span>Titre (facultatif)</span><input name="titre" defaultValue={texte.titre} maxLength={60} placeholder="ex. Gourde isotherme : l'accroche « problème »" /></label>
                          <label className="champ"><span>Légende (facultatif)</span><input name="legende" defaultValue={texte.legende} maxLength={160} placeholder="ex. Exemple réalisé par Studio Accroche, produit fictif." /></label>
                          <button className="bouton bouton-fantome bouton-petit" type="submit">Enregistrer le texte</button>
                        </form>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
