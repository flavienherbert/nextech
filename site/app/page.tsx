import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "./components/Reveal";
import { BandeauMode, Pied } from "./components/Cadre";
import DemoVideo from "./components/DemoVideo";
import DemoYoutube from "./components/DemoYoutube";
import { angles, demonstration, engagements, etapes, faq, raisons, site, temps } from "./config";
import { delaiTexte, euros, formuleParId, formules } from "@/lib/formules";
import { chargerMedias } from "@/lib/medias";

// Page servie depuis le cache et renouvelée au plus toutes les 15 minutes (et tout de suite quand le vendeur change un média) :
// rapide pour les visiteurs, et presque aucun calcul facturé par l'hébergeur.
export const revalidate = 900;

const titre = `${site.marque} — Publicités vidéo avec présentateur IA`;
export async function generateMetadata(): Promise<Metadata> {
  const m = await chargerMedias();
  return {
    openGraph: { title: titre, description: site.sousTitre, locale: "fr_FR", type: "website", images: [m.url("partage") ?? "/media/photos/couverture-partage.jpg"] },
  };
}

const defilant = ["Accroche", "Script", "Présentateur IA", "Voix française", "Sous-titres", "Format 9:16", "Livré en 48 h"];
// Une pile de photographies propre à chaque formule : une, trois, puis six, toutes différentes.
const piles: Record<string, string[]> = {
  essai: ["essai-1"],
  test: ["test-1", "test-2", "test-3"],
  campagne: ["campagne-1", "campagne-2", "campagne-3", "campagne-4", "campagne-5", "campagne-6"],
};

const NB_EXEMPLES = 6;

export default async function Accueil() {
  const m = await chargerMedias();

  // Ce que montre le cadre de démonstration : la vidéo du studio (envoyée dans Administration → Médias, ou déclarée
  // dans app/config.ts) en priorité, sinon un exemple externe autorisé par écrit, sinon un emplacement réservé.
  const videoDemo = m.envoye("demo-video") ? m.url("demo-video")! : demonstration.video;
  const afficheDemo = m.envoye("demo-affiche") ? m.url("demo-affiche")! : demonstration.poster;
  const demo: "studio" | "externe" | "vide" = videoDemo
    ? "studio"
    : demonstration.externe.autorisee && demonstration.externe.youtubeId
      ? "externe"
      : "vide";

  // Couverture : si seule la version ordinateur est personnalisée, elle sert aussi sur téléphone (jamais un mélange avec l'image d'origine).
  const couvertureBureau = m.envoye("couverture") ? m.url("couverture")! : null;
  const couvertureMobile = m.envoye("couverture-mobile") ? m.url("couverture-mobile")! : couvertureBureau;
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
            <a href="#demonstration">Démonstration</a>
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
          <div className="hero-media hero-photo" aria-hidden="true">
            {/* eslint-disable @next/next/no-img-element */}
            <picture>
              <source media="(max-width: 819px)" srcSet={couvertureMobile ?? m.url("couverture-mobile")!} />
              {couvertureBureau ? (
                <img src={couvertureBureau} alt="" fetchPriority="high" />
              ) : (
                <img
                  src="/media/photos/couverture-1920.webp"
                  srcSet="/media/photos/couverture-1280.webp 1280w, /media/photos/couverture-1920.webp 1920w"
                  sizes="100vw"
                  alt=""
                  fetchPriority="high"
                />
              )}
            </picture>
          </div>
          <div className="hero-voile" aria-hidden="true" />
          <div className="grain" aria-hidden="true" />
          <div className="bande-cine bande-haut" aria-hidden="true" />
          <div className="bande-cine bande-bas" aria-hidden="true" />

          <div className="conteneur hero-contenu">
            <p className="surtitre monte" style={{ animationDelay: "0.5s" }}>
              Studio de publicité vidéo
            </p>
            <h1>
              <span className="ligne">
                <span style={{ animationDelay: "0.65s" }}>Trois secondes</span>
              </span>
              <span className="ligne">
                <span style={{ animationDelay: "0.8s" }}>
                  pour arrêter <em>un pouce.</em>
                </span>
              </span>
            </h1>
            <p className="chapeau monte" style={{ animationDelay: "1.05s" }}>
              {site.sousTitre}
            </p>
            <div className="hero-actions monte" style={{ animationDelay: "1.2s" }}>
              <a className="bouton" href="#formules">
                Voir les formules
              </a>
              <Link className="bouton bouton-fantome" href="/commander/essai">
                Essayer pour {euros(formuleParId("essai")!.prixCents)}
              </Link>
            </div>
          </div>

          <div className="conteneur hero-pied">
            <span>Photographie d&apos;illustration</span>
            <a href="#demonstration" className="defiler">
              Défiler
            </a>
          </div>
        </section>

        <div className="defilant" aria-hidden="true">
          <div className="defilant-piste">
            {[...defilant, ...defilant, ...defilant, ...defilant].map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>
        </div>

        {/* ——— Démonstration : le résultat livré ——— */}
        <section className="section section-demo" id="demonstration">
          <div className="conteneur demo-grille">
            <Reveal className="tete-section demo-tete">
                <p className="surtitre">{demo === "externe" ? "Le format" : "Le résultat"}</p>
                {demo === "externe" ? (
                  <h2>
                    Une publicité générée par IA, <em>en exemple.</em>
                  </h2>
                ) : (
                  <h2>
                    Voici ce que vous <em>recevez.</em>
                  </h2>
                )}
                <p className="intro">
                  Une publicité verticale de {demonstration.duree} : un présentateur généré par
                  intelligence artificielle présente votre produit, face caméra, comme dans une
                  vidéo tournée au téléphone.
                  {demo === "externe" &&
                    " L'exemple ci-contre a été créé par un autre studio : il illustre le format, pas notre travail."}
                </p>
            </Reveal>
            <Reveal className="demo-colonne">
              <figure className="demo-figure">
                <div className={`demo-cadre${demo === "studio" ? "" : " demo-vide"}`}>
                  {demo === "studio" && <DemoVideo video={videoDemo} poster={afficheDemo} />}
                  {demo === "externe" && (
                    <DemoYoutube id={demonstration.externe.youtubeId} chaine={demonstration.externe.chaine} />
                  )}
                  {demo === "vide" && (
                    <div className="demo-reserve">
                      <span className="demo-reserve-titre">Vidéo de démonstration</span>
                      <span>en cours de production</span>
                      <span className="demo-reserve-format">{demonstration.duree} · format 9:16</span>
                    </div>
                  )}
                  <span className={`etiquette ${demo === "externe" ? "etiquette-externe" : "etiquette-realisation"}`}>
                    {demo === "studio" ? "Exemple de vidéo livrée" : demo === "externe" ? "Exemple externe" : "Emplacement réservé"}
                  </span>
                </div>
                <figcaption>
                  {demo === "studio" &&
                    "Vidéo réalisée par Studio Accroche. Présentateur généré par intelligence artificielle, produit et marque fictifs."}
                  {demo === "externe" && (
                    <>
                      Exemple externe de publicité générée par IA — non réalisée par Studio Accroche. Vidéo de{" "}
                      <a href={demonstration.externe.lien} target="_blank" rel="noopener noreferrer">
                        {demonstration.externe.chaine}
                      </a>
                      , diffusée par le lecteur YouTube.
                    </>
                  )}
                  {demo === "vide" && "La démonstration sera affichée ici. Aucune vidéo d'exemple n'est encore publiée."}
                </figcaption>
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
                Quinze secondes, <em>quatre temps.</em>
              </h2>
              <p className="intro">
                Chaque vidéo que nous livrons suit la même construction, plan par plan.
              </p>
            </Reveal>
            <div className="temps">
              {temps.map((t, i) => (
                <Reveal as="article" key={t.numero} delay={i * 110} className="temps-carte">
                  <div className="temps-cadre">
                    <img src={m.url(`temps-${i + 1}`) ?? ""} alt="" loading="lazy" />
                    <span className="plan-numero">{t.numero}</span>
                    <span className="etiquette etiquette-illustration">Illustration</span>
                  </div>
                  <h3>{t.titre}</h3>
                  <p>{t.texte}</p>
                </Reveal>
              ))}
            </div>
            <p className="mention">
              Ces photographies illustrent la construction d&apos;une publicité : ce ne sont pas
              des extraits de nos vidéos. Les vidéos livrées sont réalisées avec un présentateur
              généré par intelligence artificielle.
            </p>
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
                Même produit, même argumentaire, trois débuts. Vous les diffusez en parallèle et
                vous gardez celui qui retient.
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
                <Reveal as="article" key={f.id} delay={i * 110} className={`formule${f.misEnAvant ? " formule-avant" : ""}`}>
                  <div className={`pile pile-${f.videos}`} aria-hidden="true">
                    {(piles[f.id] ?? []).map((v, k) => (
                      <img key={k} src={m.url(v) ?? ""} alt="" loading="lazy" />
                    ))}
                    <span className="etiquette etiquette-illustration">Illustration</span>
                  </div>
                  {f.misEnAvant && <span className="badge">Le plus utile pour tester</span>}
                  <h3>{f.nom}</h3>
                  <p className="resume">{f.resume}</p>
                  <p className="prix">{euros(f.prixCents)}</p>
                  <dl className="faits">
                    <div>
                      <dt>Vidéos livrées</dt>
                      <dd>{f.videos}</dd>
                    </div>
                    <div>
                      <dt>Durée</dt>
                      <dd>{f.duree}</dd>
                    </div>
                    <div>
                      <dt>Délai</dt>
                      <dd>{delaiTexte(f).replace("Livré en ", "")}</dd>
                    </div>
                  </dl>
                  <p className="recoit">Vous recevez</p>
                  <ul>
                    {f.points.slice(1).map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                  <Link className={`bouton bouton-large${f.misEnAvant ? "" : " bouton-fantome"}`} href={`/commander/${f.id}`}>
                    Commander — {euros(f.prixCents)}
                  </Link>
                </Reveal>
              ))}
            </div>
            <p className="mention">
              Chaque vidéo est livrée en fichier MP4, avec les droits d&apos;exploitation
              publicitaire. Le délai court à partir de la réception de votre brief. Les visuels
              des formules sont des photographies d&apos;illustration. TVA non applicable, article
              293 B du CGI.
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
              <details key={item.q}>
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
                Commencez par un essai : une vidéo, un script, 48 heures.
              </p>
              <div className="hero-actions">
                <Link className="bouton" href="/commander/essai">
                  Commander un essai — {euros(formuleParId("essai")!.prixCents)}
                </Link>
                {site.email && (
                  <a className="bouton bouton-fantome" href={`mailto:${site.email}`}>
                    Poser une question
                  </a>
                )}
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Pied />
    </>
  );
}
