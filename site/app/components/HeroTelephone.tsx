// Maquette décorative du hero : un téléphone qui affiche une publicité verticale, dessinée en CSS et en SVG.
// Aucune image, aucune vidéo, aucun nom de marque : c'est une illustration du format, pas un exemple de réalisation.
export default function HeroTelephone() {
  return (
    <div className="maquette" aria-hidden="true">
      <div className="maquette-tel">
        <div className="maquette-ecran">
          <div className="maquette-progres">
            <span />
          </div>
          <span className="maquette-puce maquette-ia">Généré par IA</span>
          <span className="maquette-puce maquette-temps">0:03</span>
          <svg className="maquette-scene" viewBox="0 0 200 300" preserveAspectRatio="xMidYMax slice">
            <defs>
              <radialGradient id="lueur" cx="50%" cy="42%" r="55%">
                <stop offset="0%" stopColor="#ff5a2b" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#ff5a2b" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="peau" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f0cfae" />
                <stop offset="100%" stopColor="#c99872" />
              </linearGradient>
              <linearGradient id="pull" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f3efe8" />
                <stop offset="100%" stopColor="#b9b1a4" />
              </linearGradient>
              <linearGradient id="bouteille" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6f9a85" />
                <stop offset="100%" stopColor="#4d7a65" />
              </linearGradient>
            </defs>
            <circle cx="100" cy="120" r="96" fill="url(#lueur)" />
            <path d="M24 300 C24 214 58 178 100 178 C142 178 176 214 176 300 Z" fill="url(#pull)" />
            <rect x="88" y="150" width="24" height="34" rx="10" fill="url(#peau)" />
            <ellipse cx="100" cy="118" rx="33" ry="38" fill="url(#peau)" />
            <path d="M66 112 C64 78 84 70 102 70 C124 70 138 86 134 112 C128 96 118 90 100 90 C84 90 72 98 66 112 Z" fill="#3b2a20" />
            <rect x="132" y="196" width="28" height="92" rx="11" fill="url(#bouteille)" />
            <rect x="136" y="184" width="20" height="16" rx="5" fill="#d9d2c3" />
          </svg>
          <p className="maquette-sous">
            Arrête de <mark>défiler.</mark>
          </p>
          <span className="maquette-cta">Découvrir</span>
        </div>
      </div>
    </div>
  );
}
