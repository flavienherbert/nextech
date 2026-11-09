// Petites fonctions utilitaires partagées par tous les gabarits.

const ECHAPPEMENTS = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Rend un texte inoffensif dans du HTML. */
export function echapper(valeur) {
  if (valeur === null || valeur === undefined || valeur === false) return '';
  return String(valeur).replace(/[&<>"']/g, (c) => ECHAPPEMENTS[c]);
}

class Brut {
  constructor(texte) { this.texte = texte; }
  toString() { return this.texte; }
}

/** Marque une chaîne comme du HTML déjà sûr (elle ne sera pas échappée). */
export function brut(texte) {
  return new Brut(texte === null || texte === undefined || texte === false ? '' : String(texte));
}

/**
 * Gabarit HTML : tout ce qui est inséré avec ${...} est échappé,
 * sauf ce qui vient d'un autre html`...` ou de brut(...).
 */
export function html(morceaux, ...valeurs) {
  let sortie = '';
  morceaux.forEach((morceau, i) => {
    sortie += morceau;
    if (i < valeurs.length) sortie += rendre(valeurs[i]);
  });
  return new Brut(sortie);
}

function rendre(valeur) {
  if (Array.isArray(valeur)) return valeur.map(rendre).join('');
  if (valeur instanceof Brut) return valeur.texte;
  return echapper(valeur);
}

/** Remplace {ville}, {nom}… dans un texte par les valeurs fournies. */
export function remplir(texte, valeurs) {
  if (typeof texte !== 'string') return texte;
  return texte.replace(/\{(\w+)\}/g, (tout, cle) => (cle in valeurs ? String(valeurs[cle]) : tout));
}

/** « Maçonnerie Hautbois » -> « maconnerie-hautbois » */
export function slug(texte) {
  return String(texte)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** « 02 61 91 23 45 » -> « +33261912345 » pour les liens tel: */
export function telLien(numero) {
  const chiffres = String(numero || '').replace(/[^\d+]/g, '');
  if (!chiffres) return '';
  if (chiffres.startsWith('+')) return chiffres;
  if (chiffres.startsWith('0')) return '+33' + chiffres.slice(1);
  return chiffres;
}

/** « 2026-06 » -> « juin 2026 » */
export function dateLisible(date) {
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const m = /^(\d{4})-(\d{2})/.exec(String(date || ''));
  if (!m) return String(date || '');
  return `${mois[Number(m[2]) - 1]} ${m[1]}`;
}

/** 4.9 -> « 4,9 » */
export function nombreFr(n) {
  return String(n).replace('.', ',');
}

/** Article devant un nom de département : « le Calvados », « la Manche », « l'Orne ». */
export function dansLeDepartement(nom) {
  const feminins = ['Manche', 'Seine-Maritime', 'Sarthe', 'Mayenne', 'Somme', 'Loire-Atlantique', 'Vendée', 'Gironde', 'Corrèze', 'Creuse', 'Dordogne', 'Drôme', 'Haute-Garonne', 'Loire', 'Lozère', 'Marne', 'Meuse', 'Moselle', 'Nièvre', 'Savoie', 'Haute-Savoie', 'Vienne', 'Haute-Vienne', 'Charente', 'Charente-Maritime', 'Côte-d\'Or', 'Haute-Loire', 'Haute-Marne', 'Haute-Saône', 'Saône-et-Loire', 'Seine-et-Marne', 'Meurthe-et-Moselle', 'Réunion', 'Guadeloupe', 'Martinique', 'Guyane'];
  const pluriels = ['Yvelines', 'Hauts-de-Seine', 'Landes', 'Ardennes', 'Vosges', 'Bouches-du-Rhône', 'Côtes-d\'Armor', 'Deux-Sèvres', 'Alpes-Maritimes', 'Hautes-Alpes', 'Alpes-de-Haute-Provence', 'Pyrénées-Atlantiques', 'Hautes-Pyrénées', 'Pyrénées-Orientales'];
  if (pluriels.includes(nom)) return `dans les ${nom}`;
  if (/^[AEIOUYHÉÈÎ]/i.test(nom)) return `dans l'${nom}`;
  if (feminins.includes(nom)) return `dans la ${nom}`;
  return `dans le ${nom}`;
}

/** Liste « a, b et c » */
export function enumerer(elements) {
  const liste = elements.filter(Boolean);
  if (liste.length <= 1) return liste.join('');
  return `${liste.slice(0, -1).join(', ')} et ${liste[liste.length - 1]}`;
}

/** Générateur pseudo-aléatoire reproductible (même graine = même dessin). */
export function aleatoire(graine) {
  let etat = 0;
  for (const c of String(graine)) etat = (etat * 31 + c.charCodeAt(0)) >>> 0;
  etat = etat || 1;
  return () => {
    etat = (etat * 1664525 + 1013904223) >>> 0;
    return etat / 4294967296;
  };
}
