// Fabrique la page du questionnaire en y incorporant la liste des métiers et des communes.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));

export function pageQuestionnaire({ metiers, themes }) {
  const leger = {};
  for (const [id, m] of Object.entries(metiers)) {
    leger[id] = {
      titre: m.titre,
      themeParDefaut: m.themeParDefaut,
      servicesParDefaut: m.servicesParDefaut,
      services: m.services.map((s) => ({ id: s.id, titre: s.titre })),
    };
  }
  const fichierCommunes = join(ICI, '..', 'donnees', 'communes-14.json');
  const communes = existsSync(fichierCommunes) ? JSON.parse(readFileSync(fichierCommunes, 'utf8')).communes : {};
  const donnees = `var DONNEES = ${JSON.stringify({ metiers: leger, themes, communes }).replace(/</g, '\\u003c')};`;
  return readFileSync(join(ICI, 'questionnaire.html'), 'utf8').replace('/*__DONNEES__*/', donnees);
}
