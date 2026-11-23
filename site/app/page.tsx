import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "./components/Reveal";
import { BandeauMode, Pied } from "./components/Cadre";
import DemoVideo from "./components/DemoVideo";
import HeroTelephone from "./components/HeroTelephone";
import { angles, demonstration, engagements, etapes, faq, images, raisons, SHOW_EXAMPLE_VIDEO, site, temps } from "./config";
import { delaiCourt, delaiTexte, DUREE_TEXTE, enLettres, euros, FORMULE_ESSAI, formules } from "@/lib/formules";
import { chargerMedias } from "@/lib/medias";

// Page servie depuis le cache et renouvelée au plus toutes les 15 minutes (et tout de suite quand le vendeur change un média) :
// rapide pour les visiteurs, et presque aucun calcul facturé par l'hébergeur.
export const revalidate = 900;

const titre = `${site.marque} — Publicités vidéo avec présentateur IA`;
export async function generateMetadata(): Promise<Metadata> {
  const m = await chargerMedias();
  return {
    openGraph: { title: titre, description: site.description, locale: "fr_FR", type: "website", siteName: site.marque, images: [{ url: m.url("partage") ?? images.partage, width: 1200, height: 630, alt: titre }] },
    twitter: { card: "summary_large_image", title: titre, description: site.description, images: [m.url("partage") ?? images.partage] },
  };
}

const defilant = ["Accroche", "Script", "Présentateur IA", "Voix française", "Sous-titres", `Format ${FORMULE_ESSAI.formats[0]}`, delaiTexte(FORMULE_ESSAI)];
// Une pile d'images propre à chaque formule (chemins dans app/config.ts, « images.formules ») : une, trois, puis six, toutes différentes.
const piles: Record<string, string[]> = Object.fromEntries(
  Object.entries(images.formules).map(([id, chemins]) => [id, chemins.map((_, k) => `${id}-${k + 1}`)]),
);

const NB_EXEMPLES = 6;

export default async function Accueil() {
  const m = await chargerMedias();

  // Vidéo d'exemple : la section n'existe QUE si SHOW_EXAMPLE_VIDEO vaut true (app/config.ts). Sinon, aucun texte de remplacement.
  // La vidéo envoyée dans Administration → Images et vidéos est prioritaire sur le fichier public/videos/exemple.mp4.
  const videoDemo = m.envoye("demo-video") ? m.url("demo-video")! : demonstration.video;
  const afficheDemo = m.envoye("demo-affiche") ? m.url("demo-affiche")! : demonstration.poster;
  const demoVisible = SHOW_EXAMPLE_VIDEO && Boolean(videoDemo);

  // Exemples de vidéos livrées : la section n'existe que si au moins une vidéo a été envoyée.
  const exemples = Array.from({ length: NB_EXEMPLES }, (_, i) => i + 1)
    .filter((n) => m.envoye(`exemple-${n}`))
    .map((n) => ({ n, video: m.url(`exemple-${n}`)!, affiche: m.envoye(`exemple-${n}-affiche`) ? m.url(`exemple-${n}-affiche`)! : undefined, texte: m.texte(`exemple-${n}`) }));

  return (
    <>
      <BandeauMode />
      <header className="entete">
        <div className="conteneur entete-ligne">
          <a className="marque" href="#haut">
            Studio <em>Accroche</em>
          </a>
          <nav className="navigation" aria-label="Navigation principale">
            {demoVisible && <a href="#demonstration">Exemple</a>}
            {exemples.length > 0 && <a href="#exemples">Exemples</a>}
            <a href="#anatomie">La méthode</a>
            <a href="#formules">Formules</a>
            <a href="#questions">Questions</a>
          </nav>
          <a className="bouton bouton-petit" href="#formules">
            Commander
          </a>
        </div>
      </header>

      <main id="haut">
        {/* ——— Ouverture ——— */}
        <section className="hero">
          <div className="hero-fond" aria-hidden="true" />
          <div className="grain" aria-hidden="true" />
          <div className="conteneur hero-grille">
            <div className="hero-contenu">
              <p className="surtitre monte" style={{ animationDelay: "0.2s" }}>
                Studio de publicité vidéo
              </p>
              <h1>
                <span className="ligne">
                  <span style={{ animationDelay: "0.3s" }}>Des pubs vidéo</span>
                </span>
                <span className="ligne">
                  <span style={{ animationDelay: "0.42s" }}>
                    avec <em>présentateur IA</em>
                  </span>
                </span>
                <span className="ligne">
                  <span style={{ animationDelay: "0.54s" }}>pour votre boutique.</span>
                </span>
              </h1>
              <p className="hero-accroche monte" style={{ animationDelay: "0.75s" }}>
                {site.accroche}
              </p>
              <p className="chapeau monte" style={{ animationDelay: "0.9s" }}>
                {site.sousTitre}
              </p>
              <div className="hero-actions monte" style={{ animationDelay: "1.05s" }}>
                <a className="bouton" href="#formules">
                  Voir les formules
                </a>
                <Link className="bouton bouton-fantome" href={`/commander/${FORMULE_ESSAI.adresse}`}>
                  Essayer pour {euros(FORMULE_ESSAI.prixCents)}
                </Link>
              </div>
            </div>
            <HeroTelephone />
          </div>
        </section>

        <div className="defilant" aria-hidden="true">
          <div className="defilant-piste">
            {[...defilant, ...defilant, ...defilant, ...defilant].map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>
        </div>

        {/* ——— Vidéo d'exemple (visible seulement si SHOW_EXAMPLE_VIDEO vaut true) ——— */}
        {demoVisible && (
          <section className="section section-demo" id="demonstration">
            <div className="conteneur demo-grille">
              <Reveal className="tete-section demo-tete">
                <p className="surtitre">Le résultat</p>
                <h2>
                  Voici ce que vous <em>recevez.</em>
                </h2>
                <p className="intro">
                  Une publicité verticale, {DUREE_TEXTE} : un présentateur généré par intelligence artificielle présente votre
                  produit, face caméra, comme dans une vidéo tournée au téléphone.
                </p>
              </Reveal>
              <Reveal className="demo-colonne">
                <figure className="demo-figure">
                  <div className="demo-cadre">
                    <DemoVideo video={videoDemo} poster={afficheDemo || undefined} soustitres={demonstration.soustitres || undefined} />
                    <span className="etiquette etiquette-realisation">Exemple</span>
                  </div>
                  <figcaption>{demonstration.legende}</figcaption>
                </figure>
              </Reveal>

              <div className="demo-detail">
                <ul className="demo-contenu">
                  {demonstration.contenu.map((c, i) => (
                    <Reveal as="li" key={c.titre} delay={i * 80}>
                      <h3>{c.titre}</h3>
                      <p>{c.texte}</p>
                    </Reveal>
                  ))}
                </ul>
                <Reveal>
                  <a className="bouton" href="#formules">
                    Voir les formules
                  </a>
                </Reveal>
              </div>
            </div>
          </section>
        )}

        {/* ——— Exemples de vidéos livrées (visible dès qu'une vidéo est envoyée dans Administration → Médias) ——— */}
        {exemples.length > 0 && (
          <section className="section section-bord" id="exemples">
            <div className="conteneur">
              <Reveal className="tete-section">
                <p className="surtitre">Exemples</p>
                <h2>
                  Des vidéos <em>réalisées par le studio.</em>
                </h2>
                <p className="intro">
                  Exemples réalisés par Studio Accroche, avec un présentateur généré par intelligence artificielle.
                </p>
              </Reveal>
              <div className="exemples-grille">
                {exemples.map((x, i) => (
                  <Reveal key={x.n} delay={i * 80}>
                    <figure className="exemple">
                      <div className="demo-cadre">
                        <DemoVideo video={x.video} poster={x.affiche} libelle={`Lire l'exemple ${x.n}${x.texte.titre ? ` : ${x.texte.titre}` : ""}`} />
                        <span className="etiquette etiquette-realisation">Exemple</span>
                      </div>
                      {(x.texte.titre || x.texte.legende) && (
                        <figcaption>
                          {x.texte.titre && <strong>{x.texte.titre}</strong>}
                          {x.texte.legende}
                        </figcaption>
                      )}
                    </figure>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ——— Anatomie ——— */}
        <section className="section" id="anatomie">
          <div className="conteneur">
            <Reveal className="tete-section">
              <p className="surtitre">Anatomie d&apos;une publicité</p>
              <h2>
                Une publicité, <em>{enLettres(temps.length)} temps.</em>
              </h2>
              <p className="intro">
                Chaque vidéo que nous livrons ({DUREE_TEXTE}) suit la même construction, plan par plan.
              </p>
            </Reveal>
            <div className="temps">
              {temps.map((t, i) => (
                <Reveal as="article" key={t.numero} delay={i * 110} className="temps-carte">
                  <div className="temps-cadre">
                    <img src={m.url(`temps-${i + 1}`) ?? ""} alt="" width={720} height={1280} loading="lazy" decoding="async" />
                    <span className="plan-numero">{t.numero}</span>
                  </div>
                  <h3>{t.titre}</h3>
                  <p>{t.texte}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ——— Les accroches ——— */}
        <section className="section section-manifeste">
          <div className="conteneur">
            <Reveal>
              <p className="manifeste">
                Une publicité ne rate pas à la dixième seconde. <em>Elle rate à la troisième.</em>
              </p>
            </Reveal>
            <div className="angles">
              {angles.map((a, i) => (
                <Reveal key={a.lettre} delay={i * 110} className="angle">
                  <span className="angle-lettre">{a.lettre}</span>
                  <p className="angle-nom">{a.nom}</p>
                  <p className="angle-phrase">{a.phrase}</p>
                </Reveal>
              ))}
            </div>
            <Reveal delay={150}>
              <p className="intro centre-bloc">
                Exemple fictif : même produit, même argumentaire, {enLettres(angles.length)} débuts. Vous les diffusez en
                parallèle et vous gardez celui qui retient.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ——— Pourquoi Studio Accroche ——— */}
        <section className="section section-bord" id="pourquoi">
          <div className="conteneur">
            <Reveal className="tete-section">
              <p className="surtitre">Pourquoi Studio Accroche</p>
              <h2>
                Une publicité vidéo, <em>sans la production.</em>
              </h2>
            </Reveal>
            <div className="raisons">
              {raisons.map((r, i) => (
                <Reveal key={r.titre} delay={i * 90} className="raison">
                  <span className="raison-chiffre">{r.chiffre}</span>
                  <h3>{r.titre}</h3>
                  <p>{r.texte}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ——— Parcours ——— */}
        <section className="section" id="methode">
          <div className="conteneur">
            <Reveal className="tete-section">
              <p className="surtitre">De la commande à la livraison</p>
              <h2>
                Sans tournage. <em>Sans colis.</em>
              </h2>
            </Reveal>
            <ol className="etapes etapes-4">
              {etapes.map((e, i) => (
                <Reveal as="li" key={e.titre} delay={i * 90}>
                  <span className="numero">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{e.titre}</h3>
                  <p>{e.texte}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ——— Formules ——— */}
        <section className="section" id="formules">
          <div className="conteneur">
            <Reveal className="tete-section">
              <p className="surtitre">Formules</p>
              <h2>
                Un prix par livraison. <em>Pas d&apos;abonnement.</em>
              </h2>
              <p className="intro">
                Script, présentateur, voix et sous-titres sont inclus. Paiement unique par carte.
              </p>
            </Reveal>
            <div className="formules">
              {formules.map((f, i) => (
                <Reveal as="article" key={f.id} delay={i * 110} className={`formule${f.badge ? " formule-avant" : ""}`}>
                  <div className={`pile pile-${f.videos}`} aria-hidden="true">
                    {(piles[f.id] ?? []).map((v, k) => (
                      <img key={k} src={m.url(v) ?? ""} alt="" width={360} height={640} loading="lazy" decoding="async" />
                    ))}
                  </div>
                  {f.badge && <span className="badge">{f.badge}</span>}
                  <h3>{f.nom}</h3>
                  <p className="resume">{f.resume}</p>
                  <p className="prix">{euros(f.prixCents)}</p>
                  <dl className="faits">
                    <div>
                      <dt>Vidéos</dt>
                      <dd>{f.videos}</dd>
                    </div>
                    <div>
                      <dt>Durée</dt>
                      <dd>{f.duree}</dd>
                    </div>
                    <div>
                      <dt>Délai</dt>
                      <dd>{delaiCourt(f)}</dd>
                    </div>
                  </dl>
                  <p className="recoit">Vous recevez</p>
                  <ul>
                    {f.points.slice(1).map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                  <Link className={`bouton bouton-large${f.badge ? "" : " bouton-fantome"}`} href={`/commander/${f.adresse}`}>
                    Commander — {euros(f.prixCents)}
                  </Link>
                </Reveal>
              ))}
            </div>
            <p className="mention">
              Chaque vidéo est livrée en fichier MP4, avec les droits d&apos;exploitation
              publicitaire. Le délai court à partir de la réception de votre brief. TVA non
              applicable, article 293 B du CGI.
            </p>
          </div>
        </section>

        {/* ——— Engagements ——— */}
        <section className="section section-bord" id="engagements">
          <div className="conteneur">
            <Reveal className="tete-section">
              <p className="surtitre">Engagements</p>
              <h2>
                Trois règles, <em>sans exception.</em>
              </h2>
            </Reveal>
            <div className="engagements">
              {engagements.map((e, i) => (
                <Reveal key={e.titre} delay={i * 110}>
                  <h3>{e.titre}</h3>
                  <p>{e.texte}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ——— Questions ——— */}
        <section className="section" id="questions">
          <div className="conteneur conteneur-etroit">
            <Reveal className="tete-section">
              <p className="surtitre">Questions</p>
              <h2>Avant de commander</h2>
            </Reveal>
            {faq.map((item) => (
              <details key={item.q} name="faq">
                <summary>{item.q}</summary>
                <p>{item.r}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ——— Clôture ——— */}
        <section className="cloture" id="contact">
          <div className="cloture-fond" aria-hidden="true" style={{ ["--fond-cloture" as string]: `url("${m.url("cloture")}")` }} />
          <div className="grain" aria-hidden="true" />
          <div className="conteneur cloture-contenu">
            <Reveal>
              <h2>
                Votre produit, <em>dans ce cadre.</em>
              </h2>
              <p className="chapeau">
                Commencez par un essai : {FORMULE_ESSAI.points[0]}, script inclus, {delaiTexte(FORMULE_ESSAI).toLowerCase()}.
              </p>
              <div className="hero-actions">
                <Link className="bouton" href={`/commander/${FORMULE_ESSAI.adresse}`}>
                  Commander l&apos;{FORMULE_ESSAI.nom.toLowerCase()} — {euros(FORMULE_ESSAI.prixCents)}
                </Link>
                <a className="bouton bouton-fantome" href={`mailto:${site.email}`}>
                  Poser une question
                </a>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Pied illustrations />
    </>
  );
}
