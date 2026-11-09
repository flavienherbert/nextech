// Test de bout en bout : on génère de vrais sites dans un dossier temporaire et on vérifie le résultat.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const STUDIO = join(dirname(fileURLToPath(import.meta.url)), '..');
let temp;
let clients;
let dist;

const PRODUCTION = {
  identifiant: 'essai-production',
  mode: 'production',
  contenuFictif: false,
  formule: 'visibilite',
  metier: 'macon',
  theme: 'pierre',
  domaine: 'exemple-maconnerie.fr',
  entreprise: {
    nom: 'Maçonnerie Essai & Fils', dirigeant: 'Paul Essai', statut: 'SARL', siret: '123 456 789 00012', immatriculation: 'RCS Caen 123 456 789',
    anneeCreation: 2015, adresse: { rue: '3 rue du Test', codePostal: '14400', ville: 'Bayeux' },
    telephone: '02 61 91 00 01', mobile: '', email: 'contact@exemple-maconnerie.fr', horaires: 'Du lundi au vendredi',
  },
  zone: { ville: 'Bayeux', departement: 'Calvados', codeDepartement: '14', rayonKm: 25, communes: ['Bayeux', 'Creully'], pagesLocales: ['Creully'] },
  textes: {},
  services: ['gros-oeuvre', 'pierre', { icone: 'truelle', titre: 'Prestation <spéciale>', texte: 'Texte libre à {ville}.' }],
  photos: { accueil: 'PHOTO', aPropos: 'PHOTO', illustration: false },
  realisations: [{ photo: 'PHOTO', titre: 'Mur de clôture', lieu: 'Creully', annee: 2026 }, { photo: 'PHOTO', titre: 'Dalle de garage', lieu: 'Bayeux', annee: 2025, illustration: true }],
  avis: { note: 4.7, nombre: 12, lienGoogle: 'https://example.com/avis', extraits: [{ auteur: 'A. B.', lieu: 'Bayeux', date: '2026-03', texte: 'Très bien.' }] },
  garanties: { decennale: { assureur: 'Assureur Test, Paris', numeroContrat: 'D-1', zone: 'France métropolitaine' }, labels: [] },
  mediateur: { nom: 'Médiateur Test', site: 'https://example.com/mediateur' },
  reseaux: { facebook: '', instagram: '' },
  formulaire: { service: 'web3forms', cle: 'CLE-DE-TEST' },
};

function construire(args = []) {
  return spawnSync(process.execPath, [join(STUDIO, 'build.mjs'), ...args], {
    encoding: 'utf8',
    env: { ...process.env, STUDIO_CLIENTS: clients, STUDIO_DIST: dist },
  });
}

function fichiersHtml(dossier) {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiersHtml(chemin);
    return nom.endsWith('.html') ? [chemin] : [];
  });
}

let production;

before(async () => {
  temp = mkdtempSync(join(tmpdir(), 'studio-'));
  clients = join(temp, 'clients');
  dist = join(temp, 'dist');
  mkdirSync(clients);
  // Une vraie photo de 2400 x 1600, fabriquée pour le test.
  const photo = join(temp, 'chantier.jpg');
  const sharp = (await import('sharp')).default;
  await sharp({ create: { width: 2400, height: 1600, channels: 3, background: { r: 180, g: 160, b: 130 } } }).jpeg().toFile(photo);
  production = JSON.parse(JSON.stringify(PRODUCTION).replaceAll('"PHOTO"', JSON.stringify(photo)));
  copyFileSync(join(STUDIO, 'clients', 'demo-macon-calvados.json'), join(clients, 'demo-macon-calvados.json'));
  writeFileSync(join(clients, 'essai-production.json'), JSON.stringify(production));
});

after(() => rmSync(temp, { recursive: true, force: true }));

test('le build complet réussit et produit les deux types de sites', () => {
  const r = construire(['--apercu']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /2 site\(s\) généré\(s\)/);
  assert.ok(existsSync(join(dist, 'vitrine', 'demo', 'demo-macon-calvados', 'index.html')));
  assert.ok(existsSync(join(dist, 'clients', 'essai-production', 'index.html')));
  assert.ok(existsSync(join(dist, 'outils', 'questionnaire.html')));
});

test('aucune page générée ne contient de trou ou de valeur cassée', () => {
  for (const fichier of fichiersHtml(dist)) {
    if (fichier.endsWith('questionnaire.html')) continue; // contient du JavaScript, où ces mots sont légitimes
    const page = readFileSync(fichier, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    for (const interdit of ['undefined', '[object Object]', 'NaN', '{ville}', '{nom}', '{commune}', '{dansDepartement}', '{{']) {
      assert.ok(!page.includes(interdit), `${fichier} contient « ${interdit} »`);
    }
  }
});

test('une démonstration est invisible pour Google et renvoie vers l\'offre', () => {
  const dossier = join(dist, 'vitrine', 'demo', 'demo-macon-calvados');
  const accueil = readFileSync(join(dossier, 'index.html'), 'utf8');
  assert.match(accueil, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(accueil, /class="bandeau-demo"/);
  assert.match(accueil, /Entreprise fictive/);
  assert.match(accueil, /href="\.\.\/\.\.\/"/); // lien vers la page d'offre depuis /demo/<identifiant>/
  assert.match(accueil, /data-formulaire="demo"/);
  assert.ok(!accueil.includes('rel="canonical"'));
  assert.ok(!existsSync(join(dossier, 'sitemap.xml')));
  const locale = readFileSync(join(dossier, 'macon-bayeux', 'index.html'), 'utf8');
  assert.match(locale, /<h1>Maçon à Bayeux<\/h1>/);
  assert.match(locale, /href="\.\.\/\.\.\/\.\.\/"/);
  assert.match(locale, /href="\.\.\/assets\/site\.css/);
  assert.match(readFileSync(join(dist, 'vitrine', 'robots.txt'), 'utf8'), /Disallow: \/demo\//);
  assert.match(readFileSync(join(dist, 'vitrine', '_headers'), 'utf8'), /\/demo\/\*\n  X-Robots-Tag: noindex/);
});

test('un site en production est complet, référençable et sans mention de démonstration', () => {
  const dossier = join(dist, 'clients', 'essai-production');
  const accueil = readFileSync(join(dossier, 'index.html'), 'utf8');
  assert.ok(!accueil.includes('noindex'));
  assert.ok(!accueil.includes('bandeau-demo'));
  assert.ok(!accueil.includes('appel-demo'));
  assert.match(accueil, /<link rel="canonical" href="https:\/\/exemple-maconnerie\.fr\/">/);
  assert.match(accueil, /action="https:\/\/api\.web3forms\.com\/submit"/);
  assert.match(accueil, /name="access_key" value="CLE-DE-TEST"/);
  assert.match(accueil, /Maçonnerie Essai &amp; Fils/);
  assert.match(accueil, /Prestation &lt;spéciale&gt;/); // une prestation libre est échappée
  assert.match(accueil, /Texte libre à Bayeux\./);
  assert.ok(!accueil.includes('Votre photo ici'));
  assert.equal((accueil.match(/>Photo d'illustration</g) || []).length, 1); // seule la photo déclarée comme illustration est étiquetée
  assert.match(accueil, /Photos d&#39;illustration, non contractuelles\./);
  // Les photos sont redimensionnées en deux tailles, en WebP et en JPEG.
  assert.match(accueil, /<source type="image\/webp" srcset="assets\/img\/accueil-[0-9a-f]{8}-800\.webp 800w, assets\/img\/accueil-[0-9a-f]{8}-1600\.webp 1600w"/);
  const images = readdirSync(join(dossier, 'assets', 'img'));
  assert.equal(images.filter((f) => f.startsWith('accueil-')).length, 4);
  assert.ok(statSync(join(dossier, 'assets', 'img', images.find((f) => /^accueil-.*-1600\.jpg$/.test(f)))).size < 200000);
  assert.match(accueil, /Nous n&#39;effectuons pas de contrôle sur ces avis/);

  const donnees = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(accueil)[1]);
  assert.equal(donnees['@type'], 'GeneralContractor');
  assert.equal(donnees.name, 'Maçonnerie Essai & Fils');
  assert.equal(donnees.telephone, '+33261910001');
  assert.equal(donnees.url, 'https://exemple-maconnerie.fr/');
  assert.equal(donnees.aggregateRating, undefined); // Google interdit d'afficher sa propre note dans ces données

  const mentions = readFileSync(join(dossier, 'mentions-legales', 'index.html'), 'utf8');
  assert.ok(!mentions.includes('à compléter'));
  assert.match(mentions, /123 456 789 00012/);
  assert.match(mentions, /Assureur Test, Paris/);
  assert.match(mentions, /Médiateur Test/);
  assert.match(readFileSync(join(dossier, 'confidentialite', 'index.html'), 'utf8'), /Web3Forms/);

  const plan = readFileSync(join(dossier, 'sitemap.xml'), 'utf8');
  assert.match(plan, /<loc>https:\/\/exemple-maconnerie\.fr\/<\/loc>/);
  assert.match(plan, /<loc>https:\/\/exemple-maconnerie\.fr\/macon-creully\/<\/loc>/);
  assert.match(readFileSync(join(dossier, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/exemple-maconnerie\.fr\/sitemap\.xml/);
  assert.match(readFileSync(join(dossier, '404.html'), 'utf8'), /href="\/assets\/site\.css/);
  assert.ok(existsSync(join(dossier, '_headers')));
  const locale = readFileSync(join(dossier, 'macon-creully', 'index.html'), 'utf8');
  assert.match(locale, /Nos chantiers à Creully/);
});

test('la page d\'offre reprend les prix de marque.json', () => {
  const marque = JSON.parse(readFileSync(join(STUDIO, 'marque.json'), 'utf8'));
  const offre = readFileSync(join(dist, 'vitrine', 'index.html'), 'utf8');
  for (const f of marque.formules) {
    assert.ok(offre.includes(`${f.prixMensuel} € <small>par mois</small>`), `prix mensuel ${f.nom}`);
    assert.ok(offre.includes(`ou ${f.prixAnnuel} € par an`), `prix annuel ${f.nom}`);
  }
  assert.match(offre, /href="demo\/demo-macon-calvados\/"/);
  const conditions = readFileSync(join(dist, 'vitrine', 'conditions-generales', 'index.html'), 'utf8');
  assert.match(conditions, /<h2>7\. Garantie « satisfait ou remboursé »<\/h2>/);
  assert.match(conditions, /40 euros/);
});

test('l\'aperçu en un seul fichier ne dépend d\'aucun autre fichier', () => {
  const apercu = readFileSync(join(dist, 'apercus', 'demo-macon-calvados.html'), 'utf8');
  assert.ok(!/(src|href)="assets\//.test(apercu));
  assert.ok(!apercu.includes('<link rel="stylesheet"'));
  assert.match(apercu, /src="data:image\//);
  assert.match(apercu, /url\("data:font\/woff2;base64,/);
});

test('une fiche incomplète pour la production est refusée avec un message clair', () => {
  const incomplete = { ...production, identifiant: 'essai-incomplet', entreprise: { ...production.entreprise, siret: '', dirigeant: '' }, domaine: '' };
  writeFileSync(join(clients, 'essai-incomplet.json'), JSON.stringify(incomplete));
  const r = construire(['essai-incomplet']);
  rmSync(join(clients, 'essai-incomplet.json'));
  assert.equal(r.status, 1);
  assert.match(r.stdout, /ERREUR : « domaine » est vide/);
  assert.match(r.stdout, /ERREUR : « entreprise\.siret » est obligatoire/);
  assert.match(r.stdout, /ERREUR : « entreprise\.dirigeant » est obligatoire/);
  assert.ok(!existsSync(join(dist, 'clients', 'essai-incomplet')));
});

test('un site en production n\'est pas généré s\'il lui manque une photo', () => {
  const sansPhoto = { ...production, identifiant: 'essai-sans-photo', realisations: [{ photo: 'clients/essai-sans-photo/absente.jpg', titre: 'Mur' }] };
  writeFileSync(join(clients, 'essai-sans-photo.json'), JSON.stringify(sansPhoto));
  const r = construire(['essai-sans-photo']);
  rmSync(join(clients, 'essai-sans-photo.json'));
  assert.equal(r.status, 1);
  assert.match(r.stdout, /ERREUR : 1 photo\(s\) introuvable\(s\)/);
  assert.ok(!existsSync(join(dist, 'clients', 'essai-sans-photo')));
});

test('un abonnement suspendu ne laisse en ligne qu\'une page avec le téléphone', () => {
  writeFileSync(join(clients, 'essai-suspendu.json'), JSON.stringify({ ...production, identifiant: 'essai-suspendu', suspendu: true }));
  const r = construire(['essai-suspendu']);
  rmSync(join(clients, 'essai-suspendu.json'));
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const dossier = join(dist, 'clients', 'essai-suspendu');
  const page = readFileSync(join(dossier, 'index.html'), 'utf8');
  assert.match(page, /Site momentanément indisponible/);
  assert.match(page, /href="tel:\+33261910001"/);
  assert.ok(!page.includes('id="prestations"'));
  assert.ok(!existsSync(join(dossier, 'mentions-legales')));
  assert.ok(!existsSync(join(dossier, 'assets', 'img')));
  assert.match(readFileSync(join(dossier, 'robots.txt'), 'utf8'), /Disallow: \//);
});
