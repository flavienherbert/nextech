#!/usr/bin/env node
// =============================================================================
// LISTE DE PROSPECTS À PARTIR DES DONNÉES PUBLIQUES DE L'ÉTAT
//
//   node outils/prospects.mjs                      maçons du Calvados (code NAF 43.99C, département 14)
//   node outils/prospects.mjs --naf 43.22A --departement 14 --max 150
//
// Source : API « Recherche d'entreprises » (annuaire-entreprises.data.gouv.fr), gratuite et sans clé.
// Elle ne donne NI téléphone, NI email, NI site web : ces colonnes se remplissent à la main (voir docs/3-prospection.md).
// Les entreprises qui ont demandé une diffusion partielle de leurs données sont écartées.
//
// ATTENTION : ce script n'a pas pu être essayé depuis la session où il a été écrit (hôte bloqué).
// Seule la conversion en CSV est couverte par les tests. Essaie-le chez toi avant de compter dessus.
// =============================================================================
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const STUDIO = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://recherche-entreprises.api.gouv.fr/search';

const EFFECTIFS = { NN: 'non employeur', '00': '0 salarié', '01': '1 à 2', '02': '3 à 5', '03': '6 à 9', 11: '10 à 19', 12: '20 à 49', 21: '50 à 99' };

export const COLONNES = [
  'siren', 'nom', 'commune', 'code_postal', 'adresse', 'date_creation', 'effectif', 'dirigeant',
  // Colonnes à remplir à la main pendant la qualification :
  'site_web', 'email_public', 'fiche_google', 'note_google', 'nb_avis', 'segment', 'priorite',
  'statut', 'date_contact', 'canal', 'reponse', 'notes',
];

/** Transforme la réponse de l'API en lignes simples. Les entreprises fermées ou en diffusion partielle sont écartées. */
export function versLignes(resultats) {
  return (resultats || [])
    .filter((r) => (r.etat_administratif || 'A') === 'A')
    .filter((r) => (r.statut_diffusion || 'O') === 'O')
    .map((r) => {
      const siege = r.siege || {};
      const d = (r.dirigeants || []).find((x) => x.nom) || {};
      return {
        siren: r.siren || '',
        nom: r.nom_complet || r.nom_raison_sociale || '',
        commune: siege.libelle_commune || '',
        code_postal: siege.code_postal || '',
        adresse: siege.adresse || '',
        date_creation: r.date_creation || siege.date_creation || '',
        effectif: EFFECTIFS[r.tranche_effectif_salarie] || r.tranche_effectif_salarie || '',
        dirigeant: [d.prenoms, d.nom].filter(Boolean).join(' '),
      };
    });
}

function cellule(valeur) {
  const texte = String(valeur === undefined || valeur === null ? '' : valeur);
  return /[";\n\r]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
}

/** CSV au format Excel français : séparateur point-virgule, encodage UTF-8 avec marque d'ordre des octets. */
export function versCsv(lignes) {
  const corps = lignes.map((l) => COLONNES.map((c) => cellule(l[c])).join(';'));
  return `﻿${[COLONNES.join(';'), ...corps].join('\r\n')}\r\n`;
}

async function telecharger({ naf, departement, max }) {
  const lignes = [];
  let page = 1;
  let pages = 1;
  while (page <= pages && lignes.length < max) {
    const url = `${API}?activite_principale=${encodeURIComponent(naf)}&departement=${encodeURIComponent(departement)}&etat_administratif=A&per_page=25&page=${page}`;
    const reponse = await fetch(url, { headers: { Accept: 'application/json' } });
    if (reponse.status === 429) { await new Promise((r) => setTimeout(r, 2000)); continue; }
    if (!reponse.ok) throw new Error(`L'API a répondu ${reponse.status} pour ${url}`);
    const donnees = await reponse.json();
    pages = donnees.total_pages || 1;
    lignes.push(...versLignes(donnees.results));
    console.log(`  page ${page}/${pages} — ${lignes.length} entreprises retenues`);
    page += 1;
    await new Promise((r) => setTimeout(r, 250)); // on reste très en dessous de la limite de l'API
  }
  return lignes.slice(0, max);
}

async function principal() {
  const args = process.argv.slice(2);
  const option = (nom, defaut) => { const i = args.indexOf(`--${nom}`); return i === -1 ? defaut : args[i + 1]; };
  const naf = option('naf', '43.99C');
  const departement = option('departement', '14');
  const max = Number(option('max', '200'));
  console.log(`\nRecherche : code NAF ${naf}, département ${departement}, ${max} entreprises au plus.`);
  const lignes = await telecharger({ naf, departement, max });
  const dossier = join(STUDIO, 'prospection');
  mkdirSync(dossier, { recursive: true });
  const fichier = join(dossier, `prospects-${naf.replace('.', '')}-${departement}-${new Date().toISOString().slice(0, 10)}.csv`);
  writeFileSync(fichier, versCsv(lignes));
  console.log(`\n${lignes.length} entreprises enregistrées dans ${fichier}`);
  console.log('Ce fichier contient des données personnelles : il reste sur ton ordinateur (il est exclu de GitHub).\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  principal().catch((erreur) => { console.error(`\nÉchec : ${erreur.message}\n`); process.exit(1); });
}
