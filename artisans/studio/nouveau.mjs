#!/usr/bin/env node
// =============================================================================
// CRÉER UNE DÉMONSTRATION EN UNE COMMANDE
//
//   node nouveau.mjs "Maçonnerie Dupont" "Bayeux" "02 31 00 00 00"
//   node nouveau.mjs "Dupont Couverture" "Caen" "06 12 34 56 78" --metier couvreur
//
// Crée la fiche dans clients/, propose les communes voisines, puis génère le site.
// Tout le reste (prestations, textes, photos d'illustration) vient des valeurs par défaut du métier.
// =============================================================================
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { slug } from './src/outils.mjs';

const STUDIO = dirname(fileURLToPath(import.meta.url));

function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLon = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** Communes du fichier de données situées dans le rayon, de la plus proche à la plus lointaine. */
export function communesProches(ville, rayonKm, communes, maximum = 12) {
  const centre = communes[ville];
  if (!centre) return [ville];
  return Object.entries(communes)
    .map(([nom, position]) => [nom, distanceKm(centre, position)])
    .filter(([, d]) => d <= rayonKm)
    .sort((x, y) => x[1] - y[1])
    .slice(0, maximum)
    .map(([nom]) => nom);
}

export function nouvelleFiche({ nom, ville, telephone, metier = 'macon', email = '', rayonKm = 30, suffixe = '' }) {
  const communes = JSON.parse(readFileSync(join(STUDIO, 'donnees', 'communes-14.json'), 'utf8')).communes;
  const portable = /^(\+33\s?|0)[67]/.test(telephone.trim());
  return {
    identifiant: [slug(`${nom} ${ville}`), suffixe].filter(Boolean).join('-'),
    mode: 'demo',
    contenuFictif: false,
    formule: 'site-pro',
    metier,
    theme: '',
    domaine: '',
    entreprise: {
      nom,
      dirigeant: '',
      statut: '',
      siret: '',
      immatriculation: '',
      adresse: { rue: '', codePostal: '', ville },
      telephone: portable ? '' : telephone,
      mobile: portable ? telephone : '',
      email,
      horaires: 'Du lundi au vendredi, de 8 h à 18 h',
    },
    zone: { ville, departement: 'Calvados', codeDepartement: '14', rayonKm, communes: communesProches(ville, rayonKm, communes), pagesLocales: [] },
    textes: {},
    services: [],
    photos: { accueil: '', aPropos: '', illustration: true },
    realisations: [],
    avis: { note: null, nombre: null, lienGoogle: '', extraits: [] },
    garanties: { decennale: { assureur: '', numeroContrat: '', zone: 'France métropolitaine' }, labels: [] },
    mediateur: { nom: '', site: '' },
    reseaux: { facebook: '', instagram: '' },
    formulaire: { service: 'aucun', cle: '' },
  };
}

function principal() {
  const args = process.argv.slice(2);
  const positionnels = [];
  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    if (args[i].startsWith('--')) { options[args[i].slice(2)] = args[i + 1]; i += 1; } else positionnels.push(args[i]);
  }
  const [nom, ville, telephone] = positionnels;
  if (!nom || !ville || !telephone) {
    console.error('\nUsage : node nouveau.mjs "Nom de l\'entreprise" "Ville" "Téléphone" [--metier macon] [--email adresse]\n');
    process.exit(1);
  }
  const metier = options.metier || 'macon';
  const metiers = readdirSync(join(STUDIO, 'metiers')).map((f) => f.replace(/\.json$/, ''));
  if (!metiers.includes(metier)) {
    console.error(`\nMétier inconnu : ${metier}. Disponibles : ${metiers.join(', ')}\n`);
    process.exit(1);
  }
  // Un suffixe aléatoire rend l'adresse de la maquette impossible à deviner.
  const fiche = nouvelleFiche({ nom, ville, telephone, metier, email: options.email || '', suffixe: randomBytes(2).toString('hex') });
  const chemin = join(STUDIO, 'clients', `${fiche.identifiant}.json`);
  if (existsSync(chemin)) {
    console.error(`\nLa fiche ${chemin} existe déjà.\n`);
    process.exit(1);
  }
  writeFileSync(chemin, `${JSON.stringify(fiche, null, 2)}\n`);
  console.log(`\nFiche créée : clients/${fiche.identifiant}.json`);
  console.log(`Communes proposées (à relire) : ${fiche.zone.communes.join(', ')}`);
  const resultat = spawnSync(process.execPath, [join(STUDIO, 'build.mjs'), fiche.identifiant, '--apercu'], { stdio: 'inherit' });
  if (resultat.status === 0) console.log(`Adresse de la maquette une fois en ligne : /demo/${fiche.identifiant}/\n`);
  process.exit(resultat.status || 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) principal();
