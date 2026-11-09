// Icônes dessinées à la main, au trait, sur une grille de 24 x 24.
// Aucune dépendance, aucun fichier externe : elles sont insérées directement dans la page.
import { brut } from './outils.mjs';

const TRACES = {
  mur: '<path d="M3 5h18v14H3z"/><path d="M3 9.7h18M3 14.3h18M9 5v4.7M15 5v4.7M6 9.7v4.6M12 9.7v4.6M18 9.7v4.6M9 14.3V19M15 14.3V19"/>',
  maison: '<path d="M3 11.5 9.5 5l6.5 6.5"/><path d="M5 10v9h9v-9"/><path d="M14 13h7v6h-7"/><path d="M8 19v-4h3v4"/>',
  pierre: '<path d="M3 9.5 6 5h6l2 4.5-3 3H5z"/><path d="M14 9.5 16 6h4l1 4-2 3h-4z"/><path d="M5 12.5 3.5 16 6 19h6l2-3-3-3.5"/><path d="M15 13l-1 3 2 3h4l1-4-2-2"/>',
  ouverture: '<path d="M3 20V4h18v16"/><path d="M8 20V9h8v11"/><path d="M8 9h8"/><path d="M3 20h18"/><path d="M12 9v11"/>',
  terrasse: '<path d="M3 15 12 10l9 5-9 5z"/><path d="M7.5 12.5 16.5 17.5M16.5 12.5 7.5 17.5"/><path d="M12 4v3M8 5.5 9.5 7.5M16 5.5 14.5 7.5"/>',
  cloture: '<path d="M4 20V7l2-2 2 2v13"/><path d="M16 20V7l2-2 2 2v13"/><path d="M8 10h8M8 16h8"/><path d="M3 20h18"/>',
  truelle: '<path d="M3 21l5.5-5.5"/><path d="M8.5 15.5 6 13l9-9 5 5-9 9z"/><path d="M12.5 6.5l5 5"/>',
  goutte: '<path d="M12 3.5c3.2 4 5.5 6.9 5.5 10a5.5 5.5 0 0 1-11 0c0-3.1 2.300-6 5.5-10z"/><path d="M9.500 14a2.500 2.500 0 0 0 2.500 2.500"/>',
  toit: '<path d="M2.500 12 12 4l9.500 8"/><path d="M5 10.500V20h14v-9.500"/><path d="M7 8.500l5-4 5 4"/>',
  bouclier: '<path d="M12 3l7.500 3v5.500c0 4.500-3 8-7.500 9.500C7.500 19.500 4.500 16 4.500 11.500V6z"/><path d="M8.500 12l2.500 2.500 4.500-5"/>',
  document: '<path d="M6 3h8.500L19 7.500V21H6z"/><path d="M14 3v5h5"/><path d="M9 12.500h7M9 16h7M9 9h2"/>',
  horloge: '<circle cx="12" cy="12" r="8.500"/><path d="M12 7v5.200l3.300 2"/>',
  balai: '<path d="M19.500 3.500 11 12"/><path d="M11.500 9 15 12.500 9.500 20.500H3.500v-6z"/><path d="M6.500 17.500 5 20.500M9.500 15 8 17"/>',
  telephone: '<path d="M5 4h4l1.500 4.500L8 10a12 12 0 0 0 6 6l1.500-2.500L20 15v4a1.500 1.500 0 0 1-1.500 1.500A15.500 15.500 0 0 1 3.500 5.500 1.500 1.500 0 0 1 5 4z"/>',
  mail: '<path d="M3.500 6h17v12h-17z"/><path d="M3.500 6.500 12 13l8.500-6.500"/>',
  pin: '<path d="M12 21c4-4.500 6.500-7.800 6.500-11a6.500 6.500 0 0 0-13 0c0 3.200 2.500 6.500 6.500 11z"/><circle cx="12" cy="10" r="2.300"/>',
  check: '<path d="M4.500 12.500 10 18 19.500 7"/>',
  fleche: '<path d="M4 12h15"/><path d="M13.500 6.500 19 12l-5.500 5.500"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  fermer: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  calendrier: '<path d="M4 6h16v14H4z"/><path d="M4 10h16M8 3.500V7M16 3.500V7"/>',
  cle: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8.500-8.500M16.500 6.500l2.500 2.500M14 9l2 2"/>',
  carte: '<path d="M3.500 6.500h17v11h-17z"/><path d="M3.500 10h17M7 14.500h4"/>',
  eclair: '<path d="M13 3 5 13.500h6L10 21l8.500-11h-6z"/>',
  flamme: '<path d="M12 21a6 6 0 0 0 6-6c0-3-2-5-3-8-1.500 1.500-2 3-2 4.500C11.500 9.500 10 7 10.500 3 7.500 5.500 6 9 6 15a6 6 0 0 0 6 6z"/>',
  facebook: '<path d="M14 21v-7.500h2.500L17 10.500h-3V8.700c0-1 .400-1.700 1.800-1.700H17V4.200C16.500 4.100 15.700 4 14.700 4 12.500 4 11 5.300 11 7.900v2.600H8.500v3H11V21"/>',
  instagram: '<rect x="4" y="4" width="16" height="16" rx="4.500"/><circle cx="12" cy="12" r="3.600"/><circle cx="16.700" cy="7.300" r=".600" fill="currentColor"/>',
};

/** Renvoie une icône SVG prête à insérer. Icône inconnue : un simple rond, pour ne jamais casser la page. */
export function icone(nom, { taille = 24, classe = 'icone' } = {}) {
  const trace = TRACES[nom] || '<circle cx="12" cy="12" r="8"/>';
  return brut(
    `<svg class="${classe}" width="${taille}" height="${taille}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${trace}</svg>`
  );
}

/** Étoile pleine, pour les notes. */
export function etoile({ taille = 18 } = {}) {
  return brut(
    `<svg class="etoile" width="${taille}" height="${taille}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M12 2.800l2.900 5.900 6.500.900-4.700 4.600 1.100 6.500L12 17.600l-5.800 3.100 1.100-6.500L2.600 9.600l6.500-.900z"/></svg>`
  );
}

export const NOMS_ICONES = Object.keys(TRACES);
