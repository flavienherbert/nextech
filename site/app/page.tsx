import Link from "next/link";
import { engagements, etapes, exemples, faq, formules, site } from "./config";

export default function Accueil() {
  return (
    <>
      <header className="entete">
        <div className="conteneur entete-ligne">
          <span className="marque">{site.marque}</span>
          <a className="bouton bouton-petit" href="#formules">
            Voir les formules
          </a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="conteneur hero-grille">
            <div>
              <p className="surtitre">Publicité vidéo pour e-commerce</p>
              <h1>{site.titre}</h1>
              <p className="chapeau">{site.sousTitre}</p>
              <div className="hero-actions">
                <a className="bouton" href="#formules">
                  Commander dès 25 €
                </a>
                <a className="lien" href="#fonctionnement">
                  Comment ça marche
                </a>
              </div>
              <ul className="hero-points">
                <li>Sans tournage</li>
                <li>Sans envoyer le produit</li>
                <li>Script inclus</li>
              </ul>
            </div>

            <div className="telephone" aria-hidden="true">
              <div className="telephone-ecran">
                <span className="etiquette-ia">Généré par IA</span>
                <div className="accroches">
                  <p className="accroche accroche-a">
                    « Arrête d&apos;acheter des gourdes qui fuient. »
                  </p>
                  <p className="accroche accroche-b">
                    « Je bois deux fois plus depuis que j&apos;ai ça. »
                  </p>
                  <p className="accroche accroche-c">
                    « Ce truc à 19 € a remplacé mes bouteilles. »
                  </p>
                </div>
                <p className="telephone-legende">
                  Un produit, trois débuts à comparer
                </p>
              </div>
            </div>
          </div>
        </section>

        {exemples.length > 0 && (
          <section className="section" id="exemples">
            <div className="conteneur">
              <h2>Exemples</h2>
              <p className="intro">
                Ces vidéos sont représentatives de ce que vous recevez.
              </p>
              <div className="grille-exemples">
                {exemples.map((e) => (
                  <figure className="exemple" key={e.src}>
                    <video
                      src={e.src}
                      poster={e.poster}
                      controls
                      playsInline
                      preload="none"
                    />
                    <figcaption>
                      <strong>{e.titre}</strong>
                      <span>{e.angle}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="section" id="fonctionnement">
          <div className="conteneur">
            <h2>Comment ça marche</h2>
            <ol className="etapes">
              {etapes.map((e, i) => (
                <li key={e.titre}>
                  <span className="numero">{i + 1}</span>
                  <h3>{e.titre}</h3>
                  <p>{e.texte}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section section-teintee" id="formules">
          <div className="conteneur">
            <h2>Formules</h2>
            <p className="intro">
              Paiement unique, sans abonnement. Script et sous-titres toujours
              inclus.
            </p>
            <div className="formules">
              {formules.map((f) => (
                <article
                  className={`formule${f.misEnAvant ? " formule-avant" : ""}`}
                  key={f.id}
                >
                  {f.misEnAvant && (
                    <span className="badge">Le plus utile pour tester</span>
                  )}
                  <h3>{f.nom}</h3>
                  <p className="prix">{f.prix}</p>
                  <p className="resume">{f.resume}</p>
                  <ul>
                    {f.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                  <p className="delai">{f.delai}</p>
                  <a className="bouton bouton-large" href={f.lien}>
                    Commander
                  </a>
                </article>
              ))}
            </div>
            <p className="note">
              Options : livraison en 24 h (+15 €), version anglaise (+15 €),
              script supplémentaire (+10 €).
            </p>
          </div>
        </section>

        <section className="section" id="engagements">
          <div className="conteneur">
            <h2>Ce à quoi je m&apos;engage</h2>
            <div className="engagements">
              {engagements.map((e) => (
                <div key={e.titre}>
                  <h3>{e.titre}</h3>
                  <p>{e.texte}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-teintee" id="questions">
          <div className="conteneur conteneur-etroit">
            <h2>Questions fréquentes</h2>
            {faq.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.r}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="section" id="contact">
          <div className="conteneur conteneur-etroit centre">
            <h2>Une question avant de commander ?</h2>
            {site.email ? (
              <p>
                Écrivez à <a href={`mailto:${site.email}`}>{site.email}</a> avec
                le lien de votre produit. Réponse sous 24 h avec l&apos;angle
                proposé.
              </p>
            ) : (
              <p>Le contact direct sera disponible très prochainement.</p>
            )}
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
