import Link from "next/link";
import Reveal from "./components/Reveal";
import { BandeauMode, Pied } from "./components/Cadre";
import { angles, engagements, etapes, faq, site, temps } from "./config";
import { delaiTexte, euros, formules } from "@/lib/formules";

const defilant = ["Accroche", "Script", "Présentateur IA", "Voix française", "Sous-titres", "Format 9:16", "Livré en 48 h"];
const pile = ["presentatrice", "sac", "glacons", "produit", "presentatrice", "glacons"];

export default function Accueil() {
  return (
    <>
      <BandeauMode />
      <header className="entete">
        <div className="conteneur entete-ligne">
          <a className="marque" href="#haut">
            Studio <em>Accroche</em>
          </a>
          <nav className="navigation" aria-label="Navigation principale">
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
          <div className="hero-media hero-images" aria-hidden="true">
            {/* eslint-disable @next/next/no-img-element */}
            <img src="/media/img/sac.jpg" alt="" />
            <img src="/media/img/presentatrice.jpg" alt="" />
            <img src="/media/img/glacons.jpg" alt="" />
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
                Essayer pour 25 €
              </Link>
            </div>
          </div>

          <div className="conteneur hero-pied">
            <span>Images de démonstration générées par IA</span>
            <a href="#anatomie" className="defiler">
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

        {/* ——— Anatomie ——— */}
        <section className="section" id="anatomie">
          <div className="conteneur">
            <Reveal className="tete-section">
              <p className="surtitre">Anatomie d&apos;une publicité</p>
              <h2>
                Quinze secondes, <em>quatre temps.</em>
              </h2>
              <p className="intro">
                Chaque vidéo que nous livrons suit la même construction. Voici celle de notre
                produit de démonstration, plan par plan.
              </p>
            </Reveal>
            <div className="temps">
              {temps.map((t, i) => (
                <Reveal as="article" key={t.numero} delay={i * 110} className="temps-carte">
                  <div className="temps-cadre">
                    <img src={`/media/img/${t.image}.jpg`} alt="" loading="lazy" />
                    <span className="plan-numero">{t.numero}</span>
                  </div>
                  <h3>{t.titre}</h3>
                  <p>{t.texte}</p>
                </Reveal>
              ))}
            </div>
            <p className="mention">
              Produit et marque fictifs, créés pour cette démonstration. Présentatrice et décors
              générés par intelligence artificielle.
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

        {/* ——— Parcours ——— */}
        <section className="section section-bord" id="methode">
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
                    {pile.slice(0, f.videos).map((v, k) => (
                      <img key={k} src={`/media/img/${v}-p.jpg`} alt="" loading="lazy" />
                    ))}
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
              Le délai court à partir de la réception de votre brief. TVA non applicable, article
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
          <div className="cloture-fond" aria-hidden="true" />
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
                  Commander un essai — 25 €
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
