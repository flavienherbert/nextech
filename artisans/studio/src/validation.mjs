// Contrôle d'une fiche client avant génération.
// Une "erreur" bloque la génération. Un "avertissement" laisse passer mais doit être lu.

const MODES = ['demo', 'production'];
const FORMULES = ['site-pro', 'visibilite'];
const FORMULAIRES = ['aucun', 'web3forms', 'formspree'];

function vide(v) {
  return v === undefined || v === null || String(v).trim() === '';
}

export function validerClient(client, { metiers, themes }) {
  const erreurs = [];
  const avertissements = [];
  const e = client.entreprise || {};
  const z = client.zone || {};

  if (vide(client.identifiant)) erreurs.push('« identifiant » est vide (exemple : maconnerie-dupont-caen).');
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(client.identifiant)) erreurs.push('« identifiant » ne doit contenir que des minuscules, des chiffres et des tirets.');

  if (!MODES.includes(client.mode)) erreurs.push('« mode » doit valoir "demo" ou "production".');
  if (!FORMULES.includes(client.formule)) erreurs.push('« formule » doit valoir "site-pro" ou "visibilite".');
  if (vide(client.metier)) erreurs.push('« metier » est vide.');
  else if (!metiers.includes(client.metier)) erreurs.push(`Le métier « ${client.metier} » n'existe pas dans le dossier metiers/ (disponibles : ${metiers.join(', ')}).`);
  if (client.theme && !themes.includes(client.theme)) erreurs.push(`Le thème « ${client.theme} » n'existe pas (disponibles : ${themes.join(', ')}).`);

  if (vide(e.nom)) erreurs.push('« entreprise.nom » est vide.');
  if (vide(e.telephone) && vide(e.mobile)) erreurs.push('Il faut au moins un numéro : « entreprise.telephone » ou « entreprise.mobile ».');
  if (vide(z.ville)) erreurs.push('« zone.ville » est vide (la ville principale d\'intervention).');
  if (vide(z.departement)) erreurs.push('« zone.departement » est vide.');
  if (!Array.isArray(z.communes) || z.communes.length === 0) avertissements.push('« zone.communes » est vide : la liste des communes ne sera pas affichée.');

  const service = (client.formulaire && client.formulaire.service) || 'aucun';
  if (!FORMULAIRES.includes(service)) erreurs.push(`« formulaire.service » doit valoir ${FORMULAIRES.map((f) => `"${f}"`).join(', ')}.`);

  const pagesLocales = (z.pagesLocales || []).length;
  if (pagesLocales > 0 && client.formule !== 'visibilite') avertissements.push('Des pages locales sont demandées mais la formule est « site-pro » : elles ne seront pas générées.');
  if (pagesLocales > 5) avertissements.push('Plus de 5 pages locales : au-delà, elles sont en option payante.');
  if ((client.realisations || []).length > 12) avertissements.push('Plus de 12 réalisations : l\'offre en prévoit 12 au maximum.');

  if (client.mode === 'production') {
    if (client.contenuFictif) erreurs.push('« contenuFictif » doit être false pour un site en production.');
    if (vide(client.domaine)) erreurs.push('« domaine » est vide (exemple : maconnerie-dupont.fr).');
    if (vide(e.dirigeant)) erreurs.push('« entreprise.dirigeant » est obligatoire dans les mentions légales.');
    if (vide(e.statut)) erreurs.push('« entreprise.statut » est vide (EI, EURL, SARL, SAS…).');
    if (vide(e.siret)) erreurs.push('« entreprise.siret » est obligatoire dans les mentions légales.');
    else if (String(e.siret).replace(/\s/g, '').length !== 14) erreurs.push('« entreprise.siret » doit comporter 14 chiffres.');
    const a = e.adresse || {};
    if (vide(a.rue) || vide(a.codePostal) || vide(a.ville)) erreurs.push('« entreprise.adresse » doit être complète (rue, codePostal, ville).');
    if (vide(e.email)) erreurs.push('« entreprise.email » est vide.');
    if (service === 'aucun') avertissements.push('Aucun service de formulaire : le site affichera seulement le téléphone et l\'email.');
    else if (vide(client.formulaire.cle)) erreurs.push('« formulaire.cle » est vide alors qu\'un service de formulaire est choisi.');

    const d = (client.garanties && client.garanties.decennale) || {};
    if (vide(d.assureur)) avertissements.push('Assurance décennale non renseignée : à demander au client (mention attendue pour un artisan du bâtiment).');
    if (vide(client.mediateur && client.mediateur.nom)) avertissements.push('Médiateur de la consommation non renseigné : obligatoire si l\'artisan travaille pour des particuliers.');

    const avis = client.avis || {};
    if ((avis.extraits || []).length > 0) {
      if (vide(avis.lienGoogle)) erreurs.push('Des avis sont cités sans « avis.lienGoogle » : la source des avis doit être vérifiable.');
      if (avis.extraits.some((x) => vide(x.date))) erreurs.push('Chaque avis cité doit avoir une « date ».');
    }
    const illustrations = (client.realisations || []).filter((r) => r.illustration).length + (client.photos && client.photos.illustration ? 1 : 0);
    if (illustrations > 0) avertissements.push(`${illustrations} photo(s) d'illustration encore présentes : elles sont étiquetées comme telles. À remplacer par les photos du client.`);
  }

  return { erreurs, avertissements };
}
