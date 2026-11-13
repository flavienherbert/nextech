import Link from "next/link";
import FilmPlayer from "./components/FilmPlayer";
import HeroVideo from "./components/HeroVideo";
import PlanReel from "./components/PlanReel";
import Reveal from "./components/Reveal";
import {
  angles,
  chapitres,
  engagements,
  etapes,
  faq,
  formules,
  plans,
  site,
} from "./config";

const defilant = [
  "Accroche",
  "Script",
  "Présentateur IA",
  "Voix française",
  "Sous-titres",
  "Format 9:16",
  "Livré en 48 h",
];

const vignettes: Record<string, string[]> = {
  essai: ["plan-A"],
  test: ["plan-A", "plan-B", "plan-C"],
  campagne: ["plan-A", "plan-B", "plan-C", "plan-D", "plan-A", "plan-C"],
};

export default function Accueil() {
  return (
    <>
      <header className="entete">
        <div className="conteneur entete-ligne">
          <a className="marque" href="#haut">
            Studio <em>Accroche</em>
          </a>
          <nav className="navigation" aria-label="Navigation principale">
            <a href="#film">Le film</a>
            <a href="#plans">Les plans</a>
            <a href="#formules">Formules</a>
          </nav>
          <a className="bouton bouton-petit" href="#formules">
            Commander
          </a>
        </div>
      </header>

      <main id="haut">
        {/* ——— Ouverture ——— */}
        <section className="hero">
          <HeroVideo />
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
              <a className="bouton" href="#film">
                Voir le film
              </a>
              <a className="bouton bouton-fantome" href="#formules">
                Commander dès 25 €
              </a>
            </div>
          </div>

          <div className="conteneur hero-pied">
            <span>Démonstration · images générées par IA</span>
            <a href="#film" className="defiler">
              Défiler
            </a>
          </div>
        </section>

        {/* ——— Bandeau défilant ——— */}
        <div className="defilant" aria-hidden="true">
          <div className="defilant-piste">
            {[...defilant, ...defilant, ...defilant, ...defilant].map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>
        </div>

        {/* ——— Le film ——— */}
        <section className="section" id="film">
          <div className="conteneur">
            <Reveal className="tete-section">
              <p className="surtitre">Le film</p>
              <h2>
                Quatorze secondes, <em>quatre temps.</em>
              </h2>
              <p className="intro">
                Voici une publicité complète, telle que vous la recevez. Lancez-la
                avec le son, puis cliquez sur un chapitre pour voir comment elle
                est construite.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <FilmPlayer chapitres={chapitres} />
            </Reveal>
            <p className="mention">
              Produit et marque fictifs, créés pour cette démonstration.
              Présentatrice, plans et voix générés par intelligence artificielle.
            </p>
          </div>
        </section>

        {/* ——— Plan par plan ——— */}
        <section className="section section-bord" id="plans">
          <div className="conteneur">
            <Reveal className="tete-section">
              <p className="surtitre">Plan par plan</p>
              <h2>
                De vrais plans, <em>pas un diaporama.</em>
              </h2>
              <p className="intro">
                Chaque publicité alterne quatre types de plans. Ce sont eux qui
                donnent le rythme d&apos;une vidéo de créateur.
              </p>
            </Reveal>
          </div>
          <Reveal delay={100}>
            <PlanReel plans={plans} />
          </Reveal>
        </section>

        {/* ——— Les accroches ——— */}
        <section className="section section-manifeste">
          <div className="conteneur">
            <Reveal>
              <p className="manifeste">
                Une publicité ne rate pas à la dixième seconde.{" "}
                <em>Elle rate à la troisième.</em>
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
                Même produit, même argumentaire, trois débuts. Vous les diffusez en
                parallèle et vous gardez celui qui retient.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ——— Méthode ——— */}
        <section className="section section-bord" id="methode">
          <div className="conteneur">
            <Reveal className="tete-section">
              <p className="surtitre">La méthode</p>
              <h2>
                Sans tournage. <em>Sans colis.</em>
              </h2>
            </Reveal>
            <ol className="etapes">
              {etapes.map((e, i) => (
                <Reveal as="li" key={e.titre} delay={i * 110}>
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
                Script, présentateur, voix et sous-titres sont inclus dans chaque
                formule.
              </p>
            </Reveal>
            <div className="formules">
              {formules.map((f, i) => (
                <Reveal
                  as="article"
                  key={f.id}
                  delay={i * 110}
                  className={`formule${f.misEnAvant ? " formule-avant" : ""}`}
                >
                  <div
                    className={`pile pile-${vignettes[f.id].length}`}
                    aria-hidden="true"
                  >
                    {vignettes[f.id].map((v, k) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={k} src={`/media/${v}.jpg`} alt="" loading="lazy" />
                    ))}
                  </div>
                  {f.misEnAvant && <span className="badge">Le plus utile pour tester</span>}
                  <h3>{f.nom}</h3>
                  <p className="resume">{f.resume}</p>
                  <p className="prix">{f.prix}</p>
                  <ul>
                    {f.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                  <p className="delai">{f.delai}</p>
                  <a
                    className={`bouton bouton-large${f.misEnAvant ? "" : " bouton-fantome"}`}
                    href={f.lien}
                  >
                    Commander
                  </a>
                </Reveal>
              ))}
            </div>
            <p className="mention">
              Options : livraison en 24 h (+15 €), version anglaise (+15 €), script
              supplémentaire (+10 €).
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
          <div className="cloture-fond" aria-hidden="true" />
          <div className="grain" aria-hidden="true" />
          <div className="conteneur cloture-contenu">
            <Reveal>
              <h2>
                Votre produit, <em>dans ce cadre.</em>
              </h2>
              <p className="chapeau">
                Envoyez un lien et trois photos. Le script arrive sous 24 heures,
                rien n&apos;est produit avant votre accord.
              </p>
              <div className="hero-actions">
                <a className="bouton" href="#formules">
                  Choisir une formule
                </a>
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

      <footer className="pied">
        <div className="conteneur pied-ligne">
          <span>
            © {new Date().getFullYear()} {site.marque}
          </span>
          <Link href="/mentions-legales">Mentions légales et conditions</Link>
        </div>
      </footer>
    </>
  );
}
