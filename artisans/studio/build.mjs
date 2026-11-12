#!/usr/bin/env node
// =============================================================================
// GÉNÉRATEUR DE SITES D'ARTISANS
//
//   node build.mjs                 génère tout : page d'offre, démonstrations, sites clients
//   node build.mjs dupont-caen     génère seulement ce client (nom du fichier dans clients/)
//   node build.mjs --apercu        produit aussi un fichier unique par site, facile à envoyer ou à ouvrir
//
// Entrées : marque.json, metiers/*.json, clients/*.json, photos/
// Sortie  : dist/vitrine (ta page d'offre + les démonstrations) et dist/clients/<identifiant>
// =============================================================================
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { remplir, slug, dansLeDepartement } from './src/outils.mjs';
import { preparerImage, SHARP_DISPONIBLE } from './src/images.mjs';
import { validerClient } from './src/validation.mjs';
import * as gabaritClassique from './src/site-client.mjs';
import * as gabaritSignature from './src/signature/pages.mjs';
import { cheminPageLocale } from './src/site-client.mjs';
import { pageOffre, pageMentionsOffre, pageConditions } from './src/site-offre.mjs';
import { pageQuestionnaire } from './src/questionnaire.mjs';

const STUDIO = dirname(fileURLToPath(import.meta.url));
// Les deux variables d'environnement ci-dessous ne servent qu'aux tests automatiques.
const DIST = process.env.STUDIO_DIST || join(STUDIO, 'dist');
const DOSSIER_CLIENTS = process.env.STUDIO_CLIENTS || join(STUDIO, 'clients');
const THEMES = ['foret', 'pierre', 'ardoise', 'eau', 'encre'];

/* ---------- Petites fonctions de fichiers ---------- */

function lireJson(chemin) {
  try {
    return JSON.parse(readFileSync(chemin, 'utf8'));
  } catch (erreur) {
    throw new Error(`Le fichier ${chemin} n'est pas un JSON valide : ${erreur.message}`);
  }
}

function ecrire(chemin, contenu) {
  mkdirSync(dirname(chemin), { recursive: true });
  writeFileSync(chemin, contenu);
}

function empreinte(texte) {
  return createHash('sha1').update(texte).digest('hex').slice(0, 8);
}

/* ---------- Chargement des données ---------- */

export function chargerMetiers() {
  const metiers = {};
  for (const fichier of readdirSync(join(STUDIO, 'metiers')).filter((f) => f.endsWith('.json'))) {
    const m = lireJson(join(STUDIO, 'metiers', fichier));
    metiers[m.id] = m;
  }
  return metiers;
}

export function chargerClients(filtre = []) {
  const dossier = DOSSIER_CLIENTS;
  return readdirSync(dossier)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .filter((f) => filtre.length === 0 || filtre.includes(f.replace(/\.json$/, '')))
    .map((f) => ({ fichier: f, client: lireJson(join(dossier, f)) }));
}

/* ---------- Les gabarits ---------- */
// Un gabarit = des pages, une feuille de style, un script, des polices.
//   classique : le premier modèle, sobre, avec des icônes. Conservé tel quel.
//   signature : le modèle éditorial, avec grandes photos et animations.

function fichiersDe(dossier, extension) {
  return readdirSync(dossier).filter((f) => f.endsWith(extension)).map((f) => join(dossier, f));
}

function definirGabarit({ pages, dossierSource, dossierPolices, vendor = [] }) {
  const css = readFileSync(join(dossierSource, 'site.css'), 'utf8');
  const js = readFileSync(join(dossierSource, 'site.js'), 'utf8');
  return {
    pages, css, js, vendor,
    polices: fichiersDe(dossierPolices, '.woff2'),
    cssHref: `assets/site.css?v=${empreinte(css)}`,
    jsHref: `assets/site.js?v=${empreinte(js)}`,
  };
}

const VERSION_GSAP = '3.15.1';
const GABARITS = {
  classique: definirGabarit({ pages: gabaritClassique, dossierSource: join(STUDIO, 'src'), dossierPolices: join(STUDIO, 'polices') }),
  signature: definirGabarit({
    pages: gabaritSignature,
    dossierSource: join(STUDIO, 'src', 'signature'),
    dossierPolices: join(STUDIO, 'polices', 'signature'),
    vendor: ['gsap.min.js', 'ScrollTrigger.min.js'],
  }),
};
export const NOMS_GABARITS = Object.keys(GABARITS);
const COULEURS_FAVICON = { foret: '#2f4a3a', pierre: '#9c4a26', ardoise: '#2e4356', eau: '#1d5a73', encre: '#1b1a17' };

// Compatibilité : la page d'offre utilise le gabarit classique.
const CSS_HREF = GABARITS.classique.cssHref;
const JS_HREF = GABARITS.classique.jsHref;

function favicon(lettre, couleur = '#b4491b') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${couleur}"/><text x="32" y="45" text-anchor="middle" font-family="Arial Narrow, Arial, sans-serif" font-weight="700" font-size="38" fill="#fff">${lettre}</text></svg>`;
}

function ecrireCommuns(dossierSite, lettre, nomGabarit = 'classique', couleur = undefined) {
  const g = GABARITS[nomGabarit];
  ecrire(join(dossierSite, 'assets', 'site.css'), g.css);
  ecrire(join(dossierSite, 'assets', 'site.js'), g.js);
  ecrire(join(dossierSite, 'assets', 'favicon.svg'), favicon(lettre, couleur));
  mkdirSync(join(dossierSite, 'assets', 'polices'), { recursive: true });
  for (const police of g.polices) copyFileSync(police, join(dossierSite, 'assets', 'polices', basename(police)));
  for (const fichier of g.vendor) copyFileSync(join(STUDIO, 'src', nomGabarit, 'vendor', fichier), join(dossierSite, 'assets', fichier));
}

const ENTETES_SECURITE = `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
/assets/polices/*
  Cache-Control: public, max-age=31536000, immutable
/assets/img/*
  Cache-Control: public, max-age=31536000, immutable
`;

/** Même réglage, au format attendu par Vercel (fichier vercel.json à la racine du site déployé). */
function configVercel({ demo = false } = {}) {
  const securite = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  ];
  const cache = [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }];
  const headers = [
    { source: '/(.*)', headers: demo ? [...securite, { key: 'X-Robots-Tag', value: 'noindex, nofollow' }] : securite },
    { source: '/assets/polices/(.*)', headers: cache },
    { source: '/assets/img/(.*)', headers: cache },
  ];
  return `${JSON.stringify({ trailingSlash: true, headers }, null, 2)}\n`;
}

/* ---------- Construction d'un site d'artisan ---------- */

async function construireClient(client, { metiers, marque }) {
  const metier = metiers[client.metier];
  const demo = client.mode === 'demo';
  const nomGabarit = client.gabarit || marque.gabaritParDefaut || 'signature';
  const gabarit = GABARITS[nomGabarit];
  const signature = nomGabarit === 'signature';
  const pages = gabarit.pages;
  const dossierSite = demo ? join(DIST, 'vitrine', 'demo', client.identifiant) : join(DIST, 'clients', client.identifiant);
  rmSync(dossierSite, { recursive: true, force: true });

  const e = client.entreprise;
  const z = client.zone;
  const annee = new Date().getFullYear();
  const v = {
    nom: e.nom,
    ville: z.ville,
    departement: z.departement,
    dansDepartement: dansLeDepartement(z.departement),
    rayon: z.rayonKm || '',
    annees: e.anneeCreation ? annee - Number(e.anneeCreation) : '',
    base: (e.adresse && e.adresse.ville) || z.ville,
  };

  const dossierImages = join(dossierSite, 'assets', 'img');
  const photos = client.photos || {};
  const defaut = metier.photosParDefaut || {};
  const motifs = metier.motifs || ['pierre'];
  const preparees = [];
  const preparer = async (source, nom, options = {}) => {
    const img = await preparerImage({ source, dossierStudio: STUDIO, dossierSortie: dossierImages, nom, motifType: motifs[preparees.length % motifs.length], graine: `${client.identifiant}-${nom}`, ...options });
    preparees.push(img);
    return img;
  };

  // Prestations : celles choisies dans la fiche, sinon celles par défaut du métier.
  const choix = client.services && client.services.length ? client.services : metier.servicesParDefaut;
  const photosPrestations = client.photosPrestations || {};
  const services = [];
  for (const brute of choix) {
    const duMetier = typeof brute === 'string';
    const s = duMetier ? metier.services.find((x) => x.id === brute) : brute;
    if (!s) continue;
    const service = { ...s, titre: remplir(s.titre, v), texte: remplir(s.texte, v), image: null, illustration: false, page: null };
    if (signature) {
      // Photo de la prestation : celle du client si elle existe, sinon celle du métier, signalée comme illustration.
      const photoClient = s.id ? photosPrestations[s.id] : '';
      const source = photoClient || s.photo || '';
      if (source) {
        service.image = await preparer(source, `prestation-${slug(service.titre).slice(0, 40)}`);
        service.illustration = duMetier && !photoClient;
      }
      // Page dédiée : seulement si elle est demandée et si le métier fournit de quoi la remplir.
      if (client.pagesPrestations && s.id && (s.paragraphes || []).length) {
        service.page = { chemin: `prestations/${s.id}/`, titre: service.titre };
      }
    }
    services.push(service);
  }

  // Photos générales : celles du client, sinon celles par défaut du métier (étiquetées « illustration »).
  let images;
  if (signature) {
    const hero = await preparer(photos.accueil || defaut.hero || defaut.accueil, 'accueil', { largeurs: [800, 1600, 2400] });
    const sourceDetail = photos.detail || (photos.accueil ? '' : defaut.detail);
    const sourceBande = photos.bande || (photos.accueil ? '' : defaut.bande);
    images = {
      hero,
      accueil: hero,
      portrait: await preparer(photos.aPropos || defaut.aPropos, 'entreprise'),
      detail: sourceDetail ? await preparer(sourceDetail, 'detail') : null,
      bande: sourceBande ? await preparer(sourceBande, 'bande') : null,
    };
  } else {
    images = {
      accueil: await preparer(photos.accueil || defaut.accueil, 'accueil'),
      aPropos: await preparer(photos.aPropos || defaut.aPropos, 'entreprise'),
    };
  }
  const listeRealisations = client.realisations && client.realisations.length
    ? client.realisations
    : (metier.realisationsParDefaut || []).map((r) => ({ ...r, illustration: true }));
  const realisations = [];
  for (const [i, r] of listeRealisations.slice(0, 12).entries()) {
    realisations.push({ ...r, image: await preparer(r.photo, `realisation-${i + 1}-${slug(r.titre).slice(0, 40)}`) });
  }

  // Un site en ligne ne part jamais avec un dessin de remplacement à la place d'une photo.
  const manquantes = preparees.filter((i) => i.remplacement).length;
  if (!demo && manquantes > 0) {
    rmSync(dossierSite, { recursive: true, force: true });
    throw new Error(`${manquantes} photo(s) introuvable(s). Un site en production doit avoir toutes ses photos : vérifie les chemins dans la fiche et le dossier photos/${metier.id}/.`);
  }

  // Logo facultatif : copié tel quel.
  let logo = '';
  if (e.logo && existsSync(join(STUDIO, e.logo))) {
    logo = `logo${extname(e.logo).toLowerCase()}`;
    mkdirSync(dossierImages, { recursive: true });
    copyFileSync(join(STUDIO, e.logo), join(dossierImages, logo));
  }

  const communes = z.communes || [];
  const pagesLocales = client.formule === 'visibilite'
    ? (z.pagesLocales || []).slice(0, 12).map((commune) => ({ commune, chemin: cheminPageLocale(metier, commune), titre: remplir(metier.pageLocale.titre, { ...v, commune }) }))
    : [];
  const pagesPrestations = services.filter((s) => s.page).map((s) => s.page);
  const avisClient = client.avis || {};
  const avis = avisClient.note && avisClient.nombre ? avisClient : null;
  const avisAffiches = Boolean(avis || (avisClient.extraits || []).length);
  const urlSite = !demo && client.domaine ? `https://${client.domaine.replace(/^https?:\/\//, '').replace(/\/$/, '')}` : '';
  const theme = client.theme || (signature ? 'foret' : metier.themeParDefaut) || 'pierre';

  const base = {
    client, metier, marque, demo, annee, v, services, images, realisations, communes, pagesLocales, pagesPrestations,
    avis, avisAffiches, urlSite, logo, theme,
    // Les photos générales sont des illustrations si la fiche le dit, ou si le client n'en a fourni aucune.
    photosIllustration: photos.illustration === true || !photos.accueil,
    cssHref: gabarit.cssHref,
    jsHref: gabarit.jsHref,
    vendor: { gsap: `assets/gsap.min.js?v=${VERSION_GSAP}`, scrollTrigger: `assets/ScrollTrigger.min.js?v=${VERSION_GSAP}` },
  };
  // "racine" : chemin pour remonter à la racine du site depuis la page (vide pour l'accueil, "../" pour une sous-page).
  const contexte = (racine) => ({
    ...base,
    racine,
    urlOffre: marque.adresseSite || (racine === '/' ? '/' : `${racine}../../`),
  });

  const lettre = (e.nom.trim().split(/\s+/).pop() || 'A').charAt(0).toUpperCase();
  ecrireCommuns(dossierSite, lettre, nomGabarit, signature ? COULEURS_FAVICON[theme] : undefined);

  // Abonnement suspendu ("suspendu": true dans la fiche) : une seule page, avec le téléphone de l'artisan.
  if (client.suspendu) {
    rmSync(dossierImages, { recursive: true, force: true });
    ecrire(join(dossierSite, 'index.html'), pages.pageSuspendue(contexte('')));
    ecrire(join(dossierSite, '404.html'), pages.pageSuspendue(contexte('/')));
    ecrire(join(dossierSite, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
    return { dossierSite, preparees, pagesLocales: [], suspendu: true, nomGabarit };
  }

  ecrire(join(dossierSite, 'index.html'), pages.pageAccueil(contexte('')));
  ecrire(join(dossierSite, 'mentions-legales', 'index.html'), pages.pageMentions(contexte('../')));
  ecrire(join(dossierSite, 'confidentialite', 'index.html'), pages.pageConfidentialite(contexte('../')));
  for (const page of pagesLocales) {
    ecrire(join(dossierSite, page.chemin, 'index.html'), pages.pageLocale(contexte('../'), page));
  }
  for (const service of services.filter((s) => s.page)) {
    ecrire(join(dossierSite, service.page.chemin, 'index.html'), pages.pagePrestation(contexte('../../'), service));
  }

  if (!demo) {
    // Un site en production est servi à la racine de son nom de domaine.
    ecrire(join(dossierSite, '404.html'), pages.page404(contexte('/')));
    ecrire(join(dossierSite, '_headers'), ENTETES_SECURITE);
    ecrire(join(dossierSite, 'vercel.json'), configVercel());
    ecrire(join(dossierSite, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${urlSite}/sitemap.xml\n`);
    const chemins = ['', ...pagesPrestations.map((p) => p.chemin), ...pagesLocales.map((p) => p.chemin), 'mentions-legales/', 'confidentialite/'];
    const jour = new Date().toISOString().slice(0, 10);
    ecrire(join(dossierSite, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${chemins.map((c) => `  <url><loc>${urlSite}/${c}</loc><lastmod>${jour}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  }

  return { dossierSite, preparees, pagesLocales, pagesPrestations, nomGabarit };
}

/* ---------- Construction de la page d'offre ---------- */

async function construireVitrine({ marque, clientsDemo }) {
  const dossier = join(DIST, 'vitrine');
  ecrireCommuns(dossier, marque.nom.charAt(0).toUpperCase());
  const annee = new Date().getFullYear();

  // Capture d'écran de la démonstration, affichée en haut de la page d'offre (facultative).
  let capture = '';
  const source = 'photos/offre/demo.jpg';
  if (existsSync(join(STUDIO, source))) {
    const img = await preparerImage({ source, dossierStudio: STUDIO, dossierSortie: join(dossier, 'assets', 'img'), nom: 'exemple-site' });
    capture = img.fichiers.src;
  }
  const premiere = clientsDemo.find((c) => c.contenuFictif) || clientsDemo[0];
  const base = { marque, annee, cssHref: CSS_HREF, jsHref: JS_HREF, capture, cheminDemo: premiere ? `demo/${premiere.identifiant}/` : '' };

  ecrire(join(dossier, 'index.html'), pageOffre({ ...base, racine: '' }));
  ecrire(join(dossier, 'mentions-legales', 'index.html'), pageMentionsOffre({ ...base, racine: '../' }));

  const ed = marque.editeur;
  const manque = (valeur, libelle) => (valeur && String(valeur).trim() ? valeur : `[À COMPLÉTER : ${libelle}]`);
  const conditions = remplir(readFileSync(join(STUDIO, 'contenus', 'conditions-generales.md'), 'utf8').replace(/\{\{(\w+)\}\}/g, '{$1}'), {
    marque: marque.nom,
    editeur: manque(ed.nomComplet, 'prénom et nom'),
    statut: ed.statut,
    siret: manque(ed.siret, 'SIRET'),
    adresse: manque(ed.adresse, 'adresse'),
    email: manque(marque.emailContact, 'email'),
    delai: marque.delaiMiseEnLigneJours,
    date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
  });
  ecrire(join(dossier, 'conditions-generales', 'index.html'), pageConditions({ ...base, racine: '../' }, conditions));

  // Les démonstrations ne doivent jamais apparaître sur Google.
  ecrire(join(dossier, 'robots.txt'), `User-agent: *\nDisallow: /demo/\n${marque.adresseSite ? '' : 'Disallow: /\n'}`);
  ecrire(join(dossier, '_headers'), `${ENTETES_SECURITE}/demo/*\n  X-Robots-Tag: noindex, nofollow\n`);
  return dossier;
}

/* ---------- Aperçu en un seul fichier ---------- */

const TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

function enDonnees(chemin) {
  const type = TYPES[extname(chemin).toLowerCase()] || 'application/octet-stream';
  return `data:${type};base64,${readFileSync(chemin).toString('base64')}`;
}

/** Fabrique un fichier HTML autonome (styles, polices et images incorporés) à partir de la page d'accueil d'un site. */
export function fabriquerApercu(dossierSite) {
  let page = readFileSync(join(dossierSite, 'index.html'), 'utf8');
  let css = readFileSync(join(dossierSite, 'assets', 'site.css'), 'utf8');
  css = css.replace(/url\("polices\/([^"]+)"\)/g, (tout, f) => `url("${enDonnees(join(dossierSite, 'assets', 'polices', f))}")`);
  page = page
    .replace(/<link rel="preload"[^>]*>\n?/g, '')
    .replace(/<link rel="icon"[^>]*>\n?/g, '')
    .replace(/<link rel="stylesheet"[^>]*>/, () => `<style>${css}</style>`)
    .replace(/<script src="assets\/site\.js[^"]*"[^>]*><\/script>/, () => `<script>${readFileSync(join(dossierSite, 'assets', 'site.js'), 'utf8')}</script>`)
    .replace(/ data-grand="[^"]*"/g, '')
    .replace(/<source [^>]*>/g, '')
    .replace(/ srcset="[^"]*"/g, '')
    .replace(/ sizes="[^"]*"/g, '')
    .replace(/src="assets\/img\/([^"]+)"/g, (tout, f) => `src="${enDonnees(join(dossierSite, 'assets', 'img', f))}"`);
  return page;
}

/* ---------- Programme principal ---------- */

async function principal() {
  const arguments_ = process.argv.slice(2);
  const options = arguments_.filter((a) => a.startsWith('--'));
  const filtre = arguments_.filter((a) => !a.startsWith('--'));
  const avecApercu = options.includes('--apercu');

  const marque = lireJson(join(STUDIO, 'marque.json'));
  const metiers = chargerMetiers();
  const entrees = chargerClients(filtre);
  if (filtre.length && entrees.length === 0) {
    console.error(`Aucune fiche trouvée dans clients/ pour : ${filtre.join(', ')}`);
    process.exit(1);
  }
  if (filtre.length === 0) rmSync(DIST, { recursive: true, force: true });

  console.log(`\nMétiers disponibles : ${Object.keys(metiers).join(', ')}`);
  console.log(SHARP_DISPONIBLE ? 'Photos : compression active (sharp).' : 'Photos : copiées sans compression (lance "npm install" pour activer la compression).');

  let echecs = 0;
  const construits = [];
  for (const { fichier, client } of entrees) {
    const { erreurs, avertissements } = validerClient(client, { metiers: Object.keys(metiers), themes: THEMES, gabarits: NOMS_GABARITS });
    console.log(`\n— ${fichier}`);
    avertissements.forEach((a) => console.log(`  attention : ${a}`));
    if (erreurs.length) {
      erreurs.forEach((x) => console.log(`  ERREUR : ${x}`));
      console.log('  Site non généré : corrige la fiche puis relance.');
      echecs += 1;
      continue;
    }
    let resultat;
    try {
      resultat = await construireClient(client, { metiers, marque });
    } catch (erreur) {
      console.log(`  ERREUR : ${erreur.message}`);
      console.log('  Site non généré.');
      echecs += 1;
      continue;
    }
    const manquantes = resultat.preparees.filter((i) => i.remplacement).length;
    if (manquantes) console.log(`  attention : ${manquantes} photo(s) introuvable(s), remplacée(s) par un dessin.`);
    console.log(`  OK (${resultat.suspendu ? 'SUSPENDU' : client.mode}, gabarit ${resultat.nomGabarit}) : ${resultat.dossierSite.replace(STUDIO, '.')}`);
    construits.push({ client, ...resultat });
    if (avecApercu) {
      const chemin = join(DIST, 'apercus', `${client.identifiant}.html`);
      ecrire(chemin, fabriquerApercu(resultat.dossierSite));
      console.log(`  aperçu en un fichier : ${chemin.replace(STUDIO, '.')}`);
    }
  }

  // La page d'offre et le questionnaire sont régénérés à chaque fois.
  const tousLesClients = chargerClients().map((x) => x.client);
  const vitrine = await construireVitrine({ marque, clientsDemo: tousLesClients.filter((c) => c.mode === 'demo') });
  ecrire(join(DIST, 'outils', 'questionnaire.html'), pageQuestionnaire({ metiers, themes: THEMES, gabarits: NOMS_GABARITS, marque }));
  console.log(`\nPage d'offre : ${vitrine.replace(STUDIO, '.')}`);
  console.log(`Questionnaire : ./dist/outils/questionnaire.html`);
  console.log(`\n${construits.length} site(s) généré(s)${echecs ? `, ${echecs} en erreur` : ''}.\n`);
  if (echecs) process.exit(1);
}

// Le programme ne se lance que si ce fichier est exécuté directement (pas quand les tests l'importent).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  principal().catch((erreur) => {
    console.error(`\nÉchec : ${erreur.message}\n`);
    process.exit(1);
  });
}
