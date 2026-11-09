// Dessins de remplacement, générés par le code, utilisés tant qu'une vraie photo n'est pas fournie.
// Ils évitent d'avoir une page cassée et ne dépendent d'aucune banque d'images.
import { aleatoire } from './outils.mjs';

const PALETTES = {
  pierre: { joint: '#b9ab8d', tons: ['#ece2cb', '#e2d5b8', '#d8c9a8', '#e7dcc2', '#cfc09d', '#ddd0b3'] },
  brique: { joint: '#d9cfc4', tons: ['#b5583c', '#a94e35', '#c06648', '#9d4630', '#b96044', '#ad5239'] },
  dalle: { joint: '#8f9399', tons: ['#c9ccd0', '#c2c5c9', '#d0d3d6', '#bdc0c5'] },
  ardoise: { joint: '#1f2933', tons: ['#3d4a57', '#465463', '#374350', '#4d5b6a', '#414e5c'] },
  bois: { joint: '#6b4a2f', tons: ['#b98a5e', '#c2946a', '#ad7f55', '#c99d72'] },
};

function pierres(l, h, rnd, p) {
  const formes = [];
  let y = 0;
  let rang = 0;
  while (y < h) {
    const hauteur = 58 + Math.floor(rnd() * 56);
    let x = -Math.floor(rnd() * 120);
    while (x < l) {
      const largeur = 90 + Math.floor(rnd() * 170);
      const ton = p.tons[Math.floor(rnd() * p.tons.length)];
      formes.push(`<rect x="${x + 4}" y="${y + 4}" width="${largeur - 8}" height="${hauteur - 8}" rx="${5 + Math.floor(rnd() * 7)}" fill="${ton}"/>`);
      if (rnd() > 0.55) {
        formes.push(`<rect x="${x + 4}" y="${y + hauteur - 16}" width="${largeur - 8}" height="12" rx="6" fill="#000" opacity=".05"/>`);
      }
      x += largeur;
    }
    y += hauteur;
    rang += 1;
  }
  return formes.join('');
}

function briques(l, h, rnd, p) {
  const formes = [];
  const bl = 132;
  const bh = 50;
  let rang = 0;
  for (let y = 0; y < h; y += bh) {
    const decalage = rang % 2 === 0 ? 0 : -bl / 2;
    for (let x = decalage; x < l; x += bl) {
      const ton = p.tons[Math.floor(rnd() * p.tons.length)];
      formes.push(`<rect x="${x + 4}" y="${y + 4}" width="${bl - 8}" height="${bh - 8}" rx="2" fill="${ton}"/>`);
    }
    rang += 1;
  }
  return formes.join('');
}

function dalles(l, h, rnd, p) {
  const formes = [];
  const pas = 320;
  for (let y = 0; y < h; y += pas) {
    for (let x = 0; x < l; x += pas) {
      const ton = p.tons[Math.floor(rnd() * p.tons.length)];
      formes.push(`<rect x="${x + 3}" y="${y + 3}" width="${pas - 6}" height="${pas - 6}" fill="${ton}"/>`);
    }
  }
  for (let i = 0; i < 260; i += 1) {
    const x = Math.floor(rnd() * l);
    const y = Math.floor(rnd() * h);
    const r = 1 + rnd() * 2.4;
    formes.push(`<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="#000" opacity="${(0.05 + rnd() * 0.1).toFixed(2)}"/>`);
  }
  return formes.join('');
}

function lames(l, h, rnd, p) {
  const formes = [];
  const pas = 96;
  for (let y = 0; y < h; y += pas) {
    let x = -Math.floor(rnd() * 300);
    while (x < l) {
      const longueur = 380 + Math.floor(rnd() * 420);
      const ton = p.tons[Math.floor(rnd() * p.tons.length)];
      formes.push(`<rect x="${x + 2}" y="${y + 2}" width="${longueur - 4}" height="${pas - 4}" fill="${ton}"/>`);
      x += longueur;
    }
  }
  return formes.join('');
}

/**
 * Fabrique un dessin SVG.
 * @param {string} type  pierre | brique | dalle | ardoise | bois
 * @param {string} graine  texte quelconque : la même graine donne toujours le même dessin
 */
export function motif(type, graine, { largeur = 1600, hauteur = 1000 } = {}) {
  const p = PALETTES[type] || PALETTES.pierre;
  const rnd = aleatoire(`${type}-${graine}`);
  let contenu;
  if (type === 'brique') contenu = briques(largeur, hauteur, rnd, p);
  else if (type === 'dalle') contenu = dalles(largeur, hauteur, rnd, p);
  else if (type === 'bois') contenu = lames(largeur, hauteur, rnd, p);
  else contenu = pierres(largeur, hauteur, rnd, p);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largeur} ${hauteur}" width="${largeur}" height="${hauteur}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustration">
<defs><linearGradient id="o" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient></defs>
<rect width="${largeur}" height="${hauteur}" fill="${p.joint}"/>
${contenu}
<rect width="${largeur}" height="${hauteur}" fill="url(#o)"/>
</svg>`;
}

export const TYPES_MOTIFS = Object.keys(PALETTES);
