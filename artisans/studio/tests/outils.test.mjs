import { test } from 'node:test';
import assert from 'node:assert/strict';
import { html, brut, echapper, remplir, slug, telLien, dateLisible, dansLeDepartement, enumerer } from '../src/outils.mjs';
import { markdownSimple } from '../src/site-offre.mjs';
import { versLignes, versCsv, COLONNES } from '../outils/prospects.mjs';
import { communesProches, nouvelleFiche } from '../nouveau.mjs';

test('le texte inséré dans une page est échappé', () => {
  const nom = '<script>alert(1)</script> & "Fils"';
  assert.equal(html`<p>${nom}</p>`.toString(), '<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;Fils&quot;</p>');
  assert.equal(html`<p>${brut('<b>ok</b>')}</p>`.toString(), '<p><b>ok</b></p>');
  assert.equal(html`<ul>${['a', 'b'].map((x) => html`<li>${x}</li>`)}</ul>`.toString(), '<ul><li>a</li><li>b</li></ul>');
  assert.equal(echapper(null), '');
});

test('les identifiants et numéros sont normalisés', () => {
  assert.equal(slug('Maçonnerie Hautbois & Fils — Caen'), 'maconnerie-hautbois-fils-caen');
  assert.equal(telLien('02 61 91 23 45'), '+33261912345');
  assert.equal(telLien('+33 6 39 98 12 34'), '+33639981234');
  assert.equal(telLien(''), '');
  assert.equal(dateLisible('2026-06'), 'juin 2026');
});

test('les textes à trous sont remplis, les trous inconnus sont laissés visibles', () => {
  assert.equal(remplir('Maçon à {ville} et {dansDepartement}', { ville: 'Caen', dansDepartement: 'dans le Calvados' }), 'Maçon à Caen et dans le Calvados');
  assert.equal(remplir('{inconnu}', {}), '{inconnu}');
});

test('l\'article du département est correct', () => {
  assert.equal(dansLeDepartement('Calvados'), 'dans le Calvados');
  assert.equal(dansLeDepartement('Manche'), 'dans la Manche');
  assert.equal(dansLeDepartement('Orne'), 'dans l\'Orne');
  assert.equal(dansLeDepartement('Yvelines'), 'dans les Yvelines');
  assert.equal(enumerer(['a', 'b', 'c']), 'a, b et c');
});

test('les conditions générales sont converties sans laisser passer de HTML', () => {
  const sortie = markdownSimple('# Titre\n\n## 1. Objet\n\nUn **mot** fort <b>.\n\n- un\n- deux\n\n<!-- note -->');
  assert.equal(sortie, '<h2>1. Objet</h2>\n<p>Un <strong>mot</strong> fort &lt;b&gt;.</p>\n<ul><li>un</li><li>deux</li></ul>');
});

test('la liste de prospects écarte les entreprises fermées ou en diffusion partielle', () => {
  const reponse = [
    { siren: '111', nom_complet: 'DUPONT MACONNERIE', etat_administratif: 'A', statut_diffusion: 'O', tranche_effectif_salarie: '01', date_creation: '2012-03-01', siege: { libelle_commune: 'BAYEUX', code_postal: '14400', adresse: '1 RUE X; BAT "A"' }, dirigeants: [{ prenoms: 'Jean', nom: 'DUPONT' }] },
    { siren: '222', nom_complet: 'FERMEE', etat_administratif: 'C', statut_diffusion: 'O' },
    { siren: '333', nom_complet: 'PARTIELLE', etat_administratif: 'A', statut_diffusion: 'P' },
  ];
  const lignes = versLignes(reponse);
  assert.equal(lignes.length, 1);
  assert.deepEqual(lignes[0], { siren: '111', nom: 'DUPONT MACONNERIE', commune: 'BAYEUX', code_postal: '14400', adresse: '1 RUE X; BAT "A"', date_creation: '2012-03-01', effectif: '1 à 2', dirigeant: 'Jean DUPONT' });
  const csv = versCsv(lignes).split('\r\n');
  assert.equal(csv[0], `﻿${COLONNES.join(';')}`);
  assert.ok(csv[1].startsWith('111;DUPONT MACONNERIE;BAYEUX;14400;"1 RUE X; BAT ""A""";2012-03-01;1 à 2;Jean DUPONT;'));
  assert.equal(csv[1].split(';').length, COLONNES.length + 1); // +1 : le point-virgule contenu dans l'adresse entre guillemets
});

test('une nouvelle démonstration propose les communes voisines', () => {
  const communes = { Caen: [49.183, -0.371], Ifs: [49.139, -0.349], Bayeux: [49.277, -0.703], Honfleur: [49.419, 0.233] };
  assert.deepEqual(communesProches('Caen', 30, communes), ['Caen', 'Ifs', 'Bayeux']);
  assert.deepEqual(communesProches('Ville inconnue', 30, communes), ['Ville inconnue']);
  const fiche = nouvelleFiche({ nom: 'Maçonnerie Dupont', ville: 'Bayeux', telephone: '06 39 98 00 00', suffixe: 'ab12' });
  assert.equal(fiche.identifiant, 'maconnerie-dupont-bayeux-ab12');
  assert.equal(fiche.entreprise.mobile, '06 39 98 00 00');
  assert.equal(fiche.entreprise.telephone, '');
  assert.equal(fiche.zone.communes[0], 'Bayeux');
});
