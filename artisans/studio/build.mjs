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
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { remplir, slug, dansLeDepartement } from './src/outils.mjs';
import { preparerImage, SHARP_DISPONIBLE } from './src/images.mjs';
import { validerClient } from './src/validation.mjs';
import { pageAccueil, pageLocale, pageMentions, pageConfidentialite, page404, pageSuspendue, cheminPageLocale } from './src/site-client.mjs';
import { pageOffre, pageMentionsOffre, pageConditions } from './src/site-offre.mjs';
import { pageQuestionnaire } from './src/questionnaire.mjs';

const STUDIO = dirname(fileURLToPath(import.meta.url));
// Les deux variables d'environnement ci-dessous ne servent qu'aux tests automatiques.
const DIST = process.env.STUDIO_DIST || join(STUDIO, 'dist');
const DOSSIER_CLIENTS = process.env.STUDIO_CLIENTS || join(STUDIO, 'clients');
const THEMES = ['pierre', 'ardoise', 'eau', 'encre'];
const POLICES = readdirSync(join(STUDIO, 'polices')).filter((f) => f.endsWith('.woff2'));

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

/* ---------- Fichiers communs à tous les sites ---------- */

const CSS = readFileSync(join(STUDIO, 'src', 'site.css'), 'utf8');
const JS = readFileSync(join(STUDIO, 'src', 'site.js'), 'utf8');
const CSS_HREF = `assets/site.css?v=${empreinte(CSS)}`;
const JS_HREF = `assets/site.js?v=${empreinte(JS)}`;

function favicon(lettre, couleur = '#b4491b') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${couleur}"/><text x="32" y="45" text-anchor="middle" font-family="Arial Narrow, Arial, sans-serif" font-weight="700" font-size="38" fill="#fff">${lettre}</text></svg>`;
}

function ecrireCommuns(dossierSite, lettre) {
  ecrire(join(dossierSite, 'assets', 'site.css'), CSS);
  ecrire(join(dossierSite, 'assets', 'site.js'), JS);
  ecrire(join(dossierSite, 'assets', 'favicon.svg'), favicon(lettre));
  for (const police of POLICES) {
    mkdirSync(join(dossierSite, 'assets', 'polices'), { recursive: true });
    copyFileSync(join(STUDIO, 'polices', police), join(dossierSite, 'assets', 'polices', police));
  }
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

/* ---------- Construction d'un site d'artisan ---------- */

async function construireClient(client, { metiers, marque }) {
  const metier = metiers[client.metier];
  const demo = client.mode === 'demo';
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

  // Prestations : celles choisies dans la fiche, sinon celles par défaut du métier.
  const choix = client.services && client.services.length ? client.services : metier.servicesParDefaut;
  const services = choix
    .map((s) => (typeof s === 'string' ? metier.services.find((x) => x.id === s) : s))
    .filter(Boolean)
    .map((s) => ({ ...s, titre: remplir(s.titre, v), texte: remplir(s.texte, v) }));

  // Photos : celles du client, sinon celles par défaut du métier (étiquetées « illustration »).
  const dossierImages = join(dossierSite, 'assets', 'img');
  const photos = client.photos || {};
  const defaut = metier.photosParDefaut || {};
  const motifs = metier.motifs || ['pierre'];
  const images = {
    accueil: await preparerImage({ source: photos.accueil || defaut.accueil, dossierStudio: STUDIO, dossierSortie: dossierImages, nom: 'accueil', motifType: motifs[0], graine: `${client.identifiant}-accueil` }),
    aPropos: await preparerImage({ source: photos.aPropos || defaut.aPropos, dossierStudio: STUDIO, dossierSortie: dossierImages, nom: 'entreprise', motifType: motifs[1 % motifs.length], graine: `${client.identifiant}-entreprise` }),
  };
  const listeRealisations = client.realisations && client.realisations.length
    ? client.realisations
    : (metier.realisationsParDefaut || []).map((r) => ({ ...r, illustration: true }));
  const realisations = [];
  for (const [i, r] of listeRealisations.slice(0, 12).entries()) {
    realisations.push({
      ...r,
      image: await preparerImage({ source: r.photo, dossierStudio: STUDIO, dossierSortie: dossierImages, nom: `realisation-${i + 1}-${slug(r.titre).slice(0, 40)}`, motifType: motifs[i % motifs.length], graine: `${client.identifiant}-${i}` }),
    });
  }

  // Un site en ligne ne part jamais avec un dessin de remplacement à la place d'une photo.
  const manquantes = [images.accueil, images.aPropos, ...realisations.map((r) => r.image)].filter((i) => i.remplacement).length;
  if (!demo && manquantes > 0) {
    rmSync(dossierSite, { recursive: true, force: true });
    throw new Error(`${manquantes} photo(s) introuvable(s). Un site en production doit avoir toutes ses photos : vérifie les chemins dans la fiche et le dossier photos/${metier.id}/.`);
  }

  const communes = z.communes || [];
  const pagesLocales = client.formule === 'visibilite'
    ? (z.pagesLocales || []).slice(0, 12).map((commune) => ({ commune, chemin: cheminPageLocale(metier, commune), titre: remplir(metier.pageLocale.titre, { ...v, commune }) }))
    : [];
  const avis = client.avis && client.avis.note && client.avis.nombre ? client.avis : null;
  const urlSite = !demo && client.domaine ? `https://${client.domaine.replace(/^https?:\/\//, '').replace(/\/$/, '')}` : '';

  const base = {
    client, metier, marque, demo, annee, v, services, images, realisations, communes, pagesLocales, avis, urlSite,
    theme: client.theme || metier.themeParDefaut || 'pierre',
    cssHref: CSS_HREF,
    jsHref: JS_HREF,
  };
  // "racine" : chemin pour remonter à la racine du site depuis la page (vide pour l'accueil, "../" pour une sous-page).
  const contexte = (racine) => ({
    ...base,
    racine,
    urlOffre: marque.adresseSite || `${racine}../../`,
  });

  const lettre = (e.nom.trim().split(/\s+/).pop() || 'A').charAt(0).toUpperCase();
  ecrireCommuns(dossierSite, lettre);

  // Abonnement suspendu ("suspendu": true dans la fiche) : une seule page, avec le téléphone de l'artisan.
  if (client.suspendu) {
    rmSync(dossierImages, { recursive: true, force: true });
    ecrire(join(dossierSite, 'index.html'), pageSuspendue(contexte('')));
    ecrire(join(dossierSite, '404.html'), pageSuspendue(contexte('/')));
    ecrire(join(dossierSite, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
    return { dossierSite, images, realisations: [], pagesLocales: [], suspendu: true };
  }

  ecrire(join(dossierSite, 'index.html'), pageAccueil(contexte('')));
  ecrire(join(dossierSite, 'mentions-legales', 'index.html'), pageMentions(contexte('../')));
  ecrire(join(dossierSite, 'confidentialite', 'index.html'), pageConfidentialite(contexte('../')));
  for (const page of pagesLocales) {
    ecrire(join(dossierSite, page.chemin, 'index.html'), pageLocale(contexte('../'), page));
  }

  if (!demo) {
    // Un site en production est servi à la racine de son nom de domaine.
    ecrire(join(dossierSite, '404.html'), page404(contexte('/')));
    ecrire(join(dossierSite, '_headers'), ENTETES_SECURITE);
    ecrire(join(dossierSite, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${urlSite}/sitemap.xml\n`);
    const pages = ['', ...pagesLocales.map((p) => p.chemin), 'mentions-legales/', 'confidentialite/'];
    const jour = new Date().toISOString().slice(0, 10);
    ecrire(join(dossierSite, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${urlSite}/${p}</loc><lastmod>${jour}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  }

  return { dossierSite, images, realisations, pagesLocales };
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
    .replace(/<script src="assets\/site\.js[^"]*" defer><\/script>/, () => `<script>${readFileSync(join(dossierSite, 'assets', 'site.js'), 'utf8')}</script>`)
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
    const { erreurs, avertissements } = validerClient(client, { metiers: Object.keys(metiers), themes: THEMES });
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
    const manquantes = [resultat.images.accueil, resultat.images.aPropos, ...resultat.realisations.map((r) => r.image)].filter((i) => i.remplacement).length;
    if (manquantes) console.log(`  attention : ${manquantes} photo(s) introuvable(s), remplacée(s) par un dessin.`);
    console.log(`  OK (${resultat.suspendu ? 'SUSPENDU' : client.mode}) : ${resultat.dossierSite.replace(STUDIO, '.')}`);
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
  ecrire(join(DIST, 'outils', 'questionnaire.html'), pageQuestionnaire({ metiers, themes: THEMES, marque }));
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
