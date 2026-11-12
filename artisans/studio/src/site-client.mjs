// Gabarits des pages d'un site d'artisan.
// Chaque fonction reçoit le "contexte" préparé par build.mjs et renvoie du HTML.
import { html, brut, echapper, remplir, slug, telLien, dateLisible, nombreFr, aleatoire } from './outils.mjs';
import { icone, etoile } from './icones.mjs';

/* ------------------------------------------------------------------ */
/* Briques communes                                                    */
/* ------------------------------------------------------------------ */

function etoiles(note) {
  const pleines = Math.round(Number(note) || 5);
  return html`<span class="etoiles" aria-hidden="true">${Array.from({ length: pleines }, () => etoile())}</span>`;
}

/** Balise image, avec les variantes WebP et JPEG quand elles existent. */
export function image(img, { racine = '', alt = '', tailles = '100vw', prioritaire = false } = {}) {
  if (!img) return brut('');
  const prefixe = `${racine}assets/img/`;
  const chemins = (liste) => liste.split(', ').map((e) => prefixe + e).join(', ');
  const attributs = prioritaire ? brut('fetchpriority="high" decoding="async"') : brut('loading="lazy" decoding="async"');
  const f = img.fichiers;
  if (f.srcsetWebp) {
    return html`<picture><source type="image/webp" srcset="${chemins(f.srcsetWebp)}" sizes="${tailles}"><img src="${prefixe + f.src}" srcset="${chemins(f.srcsetJpg)}" sizes="${tailles}" alt="${alt}" width="${img.largeur}" height="${img.hauteur}" ${attributs}></picture>`;
  }
  return html`<img src="${prefixe + f.src}" alt="${alt}" width="${img.largeur}" height="${img.hauteur}" ${attributs}>`;
}

export function aCompleter(valeur, libelle) {
  if (valeur !== undefined && valeur !== null && String(valeur).trim() !== '') return html`${valeur}`;
  return html`<span class="a-completer">à compléter : ${libelle}</span>`;
}

function tete(ctx, { titre, description, chemin = '', donneesStructurees = null }) {
  const { client, racine, demo } = ctx;
  const canonique = !demo && ctx.urlSite ? `${ctx.urlSite}/${chemin}` : '';
  const imagePartage = !demo && ctx.urlSite && ctx.images.accueil ? `${ctx.urlSite}/assets/img/${ctx.images.accueil.fichiers.src}` : '';
  return html`<!doctype html>
<html lang="fr" data-theme="${ctx.theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titre}</title>
<meta name="description" content="${description}">
${demo ? brut('<meta name="robots" content="noindex, nofollow">') : ''}
${canonique ? html`<link rel="canonical" href="${canonique}">` : ''}
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${titre}">
<meta property="og:description" content="${description}">
${canonique ? html`<meta property="og:url" content="${canonique}">` : ''}
${imagePartage ? html`<meta property="og:image" content="${imagePartage}">` : ''}
<meta name="theme-color" content="#1b2127">
<meta name="format-detection" content="telephone=no">
<link rel="icon" href="${racine}assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="${racine}assets/polices/barlow-condensed-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${racine}assets/polices/barlow-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${racine}${ctx.cssHref}">
<noscript><style>.nav{display:flex!important;flex-wrap:wrap}.bascule-menu{display:none!important}</style></noscript>
${donneesStructurees ? brut(`<script type="application/ld+json">${JSON.stringify(donneesStructurees).replace(/</g, '\\u003c')}</script>`) : ''}
</head>`;
}

function bandeauDemo(ctx) {
  if (!ctx.demo) return '';
  const { client, marque } = ctx;
  const prix = marque.formules[0].prixMensuel;
  const texte = client.contenuFictif
    ? html`<strong>Démonstration.</strong> Entreprise fictive : voici le site que vous pourriez avoir, à votre nom.`
    : html`<strong>Maquette privée</strong> préparée pour ${client.entreprise.nom}. Elle n'est pas visible sur Google.`;
  return html`<div class="bandeau-demo" role="note"><div class="conteneur"><span>${texte}</span><a href="${ctx.urlOffre}">Voir l'offre : ${prix} € par mois, sans engagement</a></div></div>`;
}

function entete(ctx) {
  const { client, metier, racine } = ctx;
  const e = client.entreprise;
  const numero = e.telephone || e.mobile;
  const liens = [
    ['prestations', 'Prestations'],
    ['realisations', 'Réalisations'],
    ['entreprise', 'L\'entreprise'],
    ...(ctx.avis ? [['avis', 'Avis']] : []),
    ['zone', 'Zone'],
    ['contact', 'Contact'],
  ];
  return html`<header class="entete">
<div class="conteneur">
<a class="marque" href="${racine || './'}" aria-label="${e.nom}, retour à l'accueil"><span class="marque-nom">${e.nom}</span><span class="marque-metier">${metier.titre} à ${ctx.v.ville}</span></a>
<nav class="nav" id="menu" aria-label="Menu principal">${liens.map(([ancre, libelle]) => html`<a href="${racine}#${ancre}">${libelle}</a>`)}</nav>
<a class="bouton bouton-plein bouton-petit entete-tel" href="tel:${telLien(numero)}" aria-label="Appeler le ${numero}">${icone('telephone', { taille: 20 })}<span>${numero}</span></a>
<button class="bascule-menu" type="button" aria-controls="menu" aria-expanded="false" aria-label="Ouvrir le menu">${icone('menu')}</button>
</div>
</header>`;
}

function pied(ctx) {
  const { client, metier, marque, racine } = ctx;
  const e = client.entreprise;
  const a = e.adresse || {};
  const numero = e.telephone || e.mobile;
  const d = (client.garanties && client.garanties.decennale) || {};
  const r = client.reseaux || {};
  const annee = ctx.annee;
  const credit = marque.adresseSite
    ? html`Site réalisé par <a href="${marque.adresseSite}" rel="noopener">${marque.nom}</a>`
    : html`Site réalisé par ${marque.nom}`;
  return html`<footer class="pied">
<div class="conteneur">
<div>
<h3>${e.nom}</h3>
<p>${metier.titre} à ${ctx.v.ville} et ${ctx.v.dansDepartement}. Devis gratuit, travaux assurés.</p>
${r.facebook || r.instagram ? html`<div class="reseaux">${r.facebook ? html`<a href="${r.facebook}" rel="noopener" aria-label="Page Facebook de ${e.nom}">${icone('facebook', { taille: 20 })}</a>` : ''}${r.instagram ? html`<a href="${r.instagram}" rel="noopener" aria-label="Compte Instagram de ${e.nom}">${icone('instagram', { taille: 20 })}</a>` : ''}</div>` : ''}
</div>
<div>
<h3>Contact</h3>
<ul>
<li><a href="tel:${telLien(numero)}">${numero}</a></li>
${e.mobile && e.telephone ? html`<li><a href="tel:${telLien(e.mobile)}">${e.mobile}</a></li>` : ''}
${e.email ? html`<li><a href="mailto:${e.email}">${e.email}</a></li>` : ''}
<li>${a.codePostal} ${a.ville}</li>
</ul>
</div>
<div>
<h3>Informations</h3>
<ul>
<li><a href="${racine}mentions-legales/">Mentions légales</a></li>
<li><a href="${racine}confidentialite/">Confidentialité</a></li>
${ctx.pagesLocales.map((p) => html`<li><a href="${racine}${p.chemin}">${p.titre}</a></li>`)}
</ul>
</div>
<div class="pied-bas">
<span>© ${annee} ${e.nom}${e.siret ? html` · SIRET ${e.siret}` : ''}${d.assureur ? html` · Assurance décennale ${d.assureur}` : ''}</span>
<span>${credit}</span>
</div>
</div>
</footer>`;
}

function barreMobile(ctx) {
  const e = ctx.client.entreprise;
  const numero = e.mobile || e.telephone;
  return html`<div class="barre-mobile">
<a class="bouton bouton-plein" href="tel:${telLien(numero)}">${icone('telephone', { taille: 20 })} Appeler</a>
<a class="bouton bouton-contour" href="${ctx.racine}#contact">Devis gratuit</a>
</div>`;
}

function appelDemo(ctx) {
  if (!ctx.demo) return '';
  const { marque } = ctx;
  const f = marque.formules[0];
  return html`<section class="appel-demo section-serree" aria-label="Offre">
<div class="conteneur">
<div>
<h2>Ce site peut être le vôtre dans ${marque.delaiMiseEnLigneJours} jours</h2>
<p>${f.prixMensuel} € par mois, sans engagement, sans frais de création. Votre nom de domaine est enregistré à votre nom.</p>
</div>
<a class="bouton bouton-clair" href="${ctx.urlOffre}">Voir l'offre ${icone('fleche', { taille: 20 })}</a>
</div>
</section>`;
}

function fin(ctx) {
  return html`${appelDemo(ctx)}
${pied(ctx)}
${barreMobile(ctx)}
<script src="${ctx.racine}${ctx.jsHref}" defer></script>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* Sections de la page d'accueil                                       */
/* ------------------------------------------------------------------ */

function sectionHero(ctx) {
  const { client, metier, v } = ctx;
  const e = client.entreprise;
  const numero = e.telephone || e.mobile;
  const textes = client.textes || {};
  // La ville est mise en valeur dans le titre.
  const modele = textes.accroche || metier.accroche;
  const titre = brut(echapper(modele).replace('{ville}', `<em>${echapper(v.ville)}</em>`).replace(/\{(\w+)\}/g, (t, c) => (c in v ? echapper(v[c]) : t)));
  const sousTitre = remplir(textes.sousTitre || metier.sousTitre, v);
  const surTitre = e.anneeCreation ? `Entreprise de ${metier.activite} · depuis ${e.anneeCreation}` : `Entreprise de ${metier.activite}`;
  return html`<section class="hero" aria-labelledby="titre-accueil">
<div class="hero-image">${image(ctx.images.accueil, { racine: ctx.racine, alt: '', tailles: '100vw', prioritaire: true })}</div>
<div class="conteneur">
<div class="hero-texte">
<p class="sur-titre">${surTitre}</p>
<h1 id="titre-accueil">${titre}</h1>
<p class="hero-sous">${sousTitre}</p>
<div class="hero-actions">
<a class="bouton bouton-plein" href="#contact">Demander un devis gratuit ${icone('fleche', { taille: 20 })}</a>
<a class="bouton bouton-contour" href="tel:${telLien(numero)}">${icone('telephone', { taille: 20 })} ${numero}</a>
</div>
${ctx.avis ? html`<p class="hero-note">${etoiles(ctx.avis.note)}<span><strong>${nombreFr(ctx.avis.note)} sur 5</strong> · ${ctx.avis.nombre} avis Google</span></p>` : ''}
</div>
</div>
</section>`;
}

function sectionConfiance(ctx) {
  const { client, v } = ctx;
  const e = client.entreprise;
  const elements = [
    ['bouclier', 'Garantie décennale', 'Attestation remise avec le devis'],
    ['document', 'Devis gratuit', 'Détaillé, sous 48 heures'],
    e.anneeCreation
      ? ['calendrier', `${v.annees} ans d'expérience`, `Entreprise créée en ${e.anneeCreation}`]
      : ['check', 'Artisan local', 'Un interlocuteur unique'],
    ['pin', `${v.ville} et alentours`, v.rayon ? `Dans un rayon de ${v.rayon} km` : v.departement],
  ];
  return html`<div class="confiance"><div class="conteneur"><ul>${elements.map(([ic, fort, petit]) => html`<li>${icone(ic, { taille: 30 })}<div><strong>${fort}</strong><span>${petit}</span></div></li>`)}</ul></div></div>`;
}

function sectionPrestations(ctx) {
  const { metier, v } = ctx;
  return html`<section class="section" id="prestations" aria-labelledby="titre-prestations">
<div class="conteneur">
<div class="tete-section">
<p class="sur-titre">Prestations</p>
<h2 id="titre-prestations">Nos travaux de ${metier.activite}</h2>
<p class="chapeau">En neuf comme en rénovation, pour les particuliers et les professionnels de ${v.ville} et des environs.</p>
</div>
<div class="grille-prestations">${ctx.services.map((s) => html`<article class="prestation"><div class="prestation-icone">${icone(s.icone, { taille: 28 })}</div><h3>${s.titre}</h3><p>${s.texte}</p></article>`)}</div>
</div>
</section>`;
}

function etiquettePhoto(r) {
  if (r.image.remplacement) return html`<span class="etiquette-illustration">Votre photo ici</span>`;
  if (r.illustration) return html`<span class="etiquette-illustration">Photo d'illustration</span>`;
  return '';
}

function sectionRealisations(ctx, { titre = 'Quelques chantiers récents', liste = ctx.realisations } = {}) {
  if (!liste.length) return '';
  const aDesIllustrations = liste.some((r) => r.illustration || r.image.remplacement);
  return html`<section class="section sombre" id="realisations" aria-labelledby="titre-realisations">
<div class="conteneur">
<div class="tete-section">
<p class="sur-titre">Réalisations</p>
<h2 id="titre-realisations">${titre}</h2>
</div>
<div class="grille-realisations">${liste.map((r) => html`<figure class="realisation">${etiquettePhoto(r)}${image(r.image, { racine: ctx.racine, alt: `${r.titre}${r.lieu ? `, ${r.lieu}` : ''}`, tailles: '(max-width: 760px) 100vw, (max-width: 1020px) 50vw, 380px' })}<figcaption><strong>${r.titre}</strong><span>${[r.lieu, r.annee].filter(Boolean).join(' · ')}</span></figcaption></figure>`)}</div>
${aDesIllustrations ? html`<p class="note-illustration">${ctx.demo ? 'Les photos d\'illustration seront remplacées par celles de vos propres chantiers.' : 'Photos d\'illustration, non contractuelles.'}</p>` : ''}
</div>
</section>`;
}

function sectionEntreprise(ctx) {
  const { client, metier, v } = ctx;
  const e = client.entreprise;
  const paragraphes = (client.textes && client.textes.aPropos && client.textes.aPropos.length)
    ? client.textes.aPropos
    : [`${e.nom} intervient à ${v.ville} et ${v.dansDepartement} pour tous vos travaux de ${metier.activite}.`, 'Chaque projet commence par une visite sur place et un devis gratuit, détaillé poste par poste.'];
  const photoEtiquette = ctx.images.aPropos.remplacement ? 'Votre photo ici' : (client.photos && client.photos.illustration ? 'Photo d\'illustration' : '');
  return html`<section class="section" id="entreprise" aria-labelledby="titre-entreprise">
<div class="conteneur duo">
<div class="portrait">
<div class="portrait-image">${photoEtiquette ? html`<span class="etiquette-illustration">${photoEtiquette}</span>` : ''}${image(ctx.images.aPropos, { racine: ctx.racine, alt: `L'équipe de ${e.nom} sur un chantier`, tailles: '(max-width: 760px) 100vw, 480px' })}</div>
${e.anneeCreation ? html`<div class="portrait-chiffre"><strong>${v.annees} ans</strong><span>d'expérience</span></div>` : ''}
</div>
<div class="duo-texte">
<p class="sur-titre">L'entreprise</p>
<h2 id="titre-entreprise">Un ${metier.nomMetier} de confiance, près de chez vous</h2>
<div style="margin-top:20px">${paragraphes.map((p) => html`<p>${p}</p>`)}</div>
<ul class="atouts">${metier.atouts.map((a) => html`<li>${icone(a.icone)}<div><strong>${a.titre}</strong><span>${a.texte}</span></div></li>`)}</ul>
</div>
</div>
</section>`;
}

function sectionEtapes(ctx) {
  const { metier } = ctx;
  return html`<section class="section teinte" aria-labelledby="titre-etapes">
<div class="conteneur">
<div class="tete-section">
<p class="sur-titre">Déroulement</p>
<h2 id="titre-etapes">Votre chantier en quatre étapes</h2>
</div>
<ol class="etapes" style="list-style:none;padding:0;margin:0">${metier.etapes.map((s) => html`<li><h3>${s.titre}</h3><p>${s.texte}</p></li>`)}</ol>
</div>
</section>`;
}

function sectionAvis(ctx) {
  const { client } = ctx;
  const avis = ctx.avis;
  if (!avis) return '';
  const extraits = avis.extraits || [];
  const mention = client.contenuFictif
    ? 'Avis fictifs, affichés uniquement pour la démonstration.'
    : 'Avis publiés par des clients sur Google et repris tels quels, avec leur date. Nous n\'effectuons pas de contrôle sur ces avis.';
  return html`<section class="section" id="avis" aria-labelledby="titre-avis">
<div class="conteneur">
<div class="tete-section">
<p class="sur-titre">Avis clients</p>
<h2 id="titre-avis">Ce que disent nos clients</h2>
</div>
<div class="avis">
<div class="avis-note">
<strong>${nombreFr(avis.note)}</strong>
${etoiles(avis.note)}
<p>Note moyenne sur ${avis.nombre} avis Google</p>
${avis.lienGoogle ? html`<a href="${avis.lienGoogle}" rel="noopener">Lire tous les avis</a>` : ''}
</div>
<div class="avis-liste">
${extraits.map((x) => html`<figure class="avis-carte">${etoiles(5)}<blockquote>« ${x.texte} »</blockquote><figcaption><strong>${x.auteur}</strong>${[x.lieu, dateLisible(x.date)].filter(Boolean).join(' · ')}</figcaption></figure>`)}
${extraits.length ? html`<p class="avis-mention">${mention}</p>` : ''}
</div>
</div>
</div>
</section>`;
}

function dessinRayon(ctx) {
  const { v } = ctx;
  const rnd = aleatoire(ctx.client.identifiant);
  const points = Array.from({ length: Math.min(9, Math.max(0, ctx.communes.length - 1)) }, () => {
    const angle = rnd() * Math.PI * 2;
    const distance = 55 + rnd() * 110;
    return [200 + Math.cos(angle) * distance, 200 + Math.sin(angle) * distance];
  });
  return brut(`<svg class="rayon" viewBox="0 0 400 400" role="img" aria-label="Zone d'intervention autour de ${echapper(v.ville)}">
<circle cx="200" cy="200" r="186" fill="currentColor" opacity=".07"/>
<circle cx="200" cy="200" r="186" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 7" opacity=".7"/>
<circle cx="200" cy="200" r="124" fill="currentColor" opacity=".08"/>
<circle cx="200" cy="200" r="62" fill="currentColor" opacity=".12"/>
${points.map(([x, y]) => `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="4.500" fill="currentColor" opacity=".55"/>`).join('')}
<circle cx="200" cy="200" r="13" fill="#fff"/><circle cx="200" cy="200" r="8" fill="currentColor"/>
<text x="200" y="236" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="26" fill="#1c2227" style="text-transform:uppercase">${echapper(v.ville)}</text>
${v.rayon ? `<g transform="translate(318 74)"><rect x="-38" y="-17" width="76" height="34" rx="17" fill="currentColor"/><text x="0" y="6" text-anchor="middle" font-family="Barlow, Arial, sans-serif" font-weight="600" font-size="16" fill="#fff">${echapper(v.rayon)} km</text></g>` : ''}
</svg>`);
}

function sectionZone(ctx) {
  const { metier, v } = ctx;
  const liensLocaux = new Map(ctx.pagesLocales.map((p) => [p.commune, p.chemin]));
  return html`<section class="section teinte" id="zone" aria-labelledby="titre-zone">
<div class="conteneur duo">
<div>
<p class="sur-titre">Zone d'intervention</p>
<h2 id="titre-zone">${metier.titre} à ${v.ville} et ${v.dansDepartement}</h2>
<p class="chapeau">Nous nous déplaçons gratuitement pour la visite et le devis${v.rayon ? html` dans un rayon d'environ ${v.rayon} km autour de ${v.ville}` : ''}.</p>
${ctx.communes.length ? html`<ul class="communes">${ctx.communes.map((c) => (liensLocaux.has(c) ? html`<li><a href="${ctx.racine}${liensLocaux.get(c)}">${c}</a></li>` : html`<li>${c}</li>`))}</ul>` : ''}
</div>
<div>${dessinRayon(ctx)}</div>
</div>
</section>`;
}

function sectionFaq(ctx) {
  const { metier, v } = ctx;
  return html`<section class="section" aria-labelledby="titre-faq">
<div class="conteneur">
<div class="tete-section">
<p class="sur-titre">Questions fréquentes</p>
<h2 id="titre-faq">Avant de nous appeler</h2>
</div>
<div class="faq">${metier.faq.map((f) => html`<details><summary>${remplir(f.q, v)} ${icone('plus')}</summary><p>${remplir(f.r, v)}</p></details>`)}</div>
</div>
</section>`;
}

function blocFormulaire(ctx) {
  const { client, metier } = ctx;
  const f = client.formulaire || { service: 'aucun' };
  const e = client.entreprise;
  let action = '';
  let champCache = '';
  if (f.service === 'web3forms') {
    action = 'https://api.web3forms.com/submit';
    champCache = html`<input type="hidden" name="access_key" value="${f.cle}"><input type="hidden" name="subject" value="Nouvelle demande de devis depuis le site"><input type="hidden" name="from_name" value="Site ${e.nom}">`;
  } else if (f.service === 'formspree') {
    action = `https://formspree.io/f/${f.cle}`;
    champCache = html`<input type="hidden" name="_subject" value="Nouvelle demande de devis depuis le site">`;
  }
  // Démonstration : le formulaire est montré mais n'envoie rien.
  // Production sans service de formulaire : on n'affiche pas de formulaire qui ne marcherait pas.
  if (!ctx.demo && f.service === 'aucun') {
    return html`<div class="formulaire">
<h3>Un projet ? Appelez-nous</h3>
<p>Le plus simple est de nous joindre directement : nous répondons du lundi au vendredi et rappelons tous les messages.</p>
<a class="bouton bouton-plein bouton-large" href="tel:${telLien(e.telephone || e.mobile)}">${icone('telephone', { taille: 20 })} ${e.telephone || e.mobile}</a>
${e.email ? html`<a class="bouton bouton-contour bouton-large clair" style="margin-top:12px" href="mailto:${e.email}?subject=Demande%20de%20devis">${icone('mail', { taille: 20 })} Écrire un email</a>` : ''}
</div>`;
  }
  return html`<form class="formulaire" method="post" action="${action || '#contact'}" data-formulaire="${ctx.demo ? 'demo' : f.service}">
<h3>Demande de devis gratuit</h3>
<p>Décrivez votre projet en quelques mots. Nous vous rappelons sous 24 heures ouvrées.</p>
${champCache}
<div class="champs">
<div class="champ"><label for="f-nom">Votre nom</label><input id="f-nom" name="nom" type="text" autocomplete="name" required></div>
<div class="champ"><label for="f-tel">Téléphone</label><input id="f-tel" name="telephone" type="tel" autocomplete="tel" inputmode="tel" required></div>
<div class="champ"><label for="f-email">Email (facultatif)</label><input id="f-email" name="email" type="email" autocomplete="email"></div>
<div class="champ"><label for="f-commune">Commune du chantier</label><input id="f-commune" name="commune" type="text" autocomplete="address-level2"></div>
<div class="champ champ-large"><label for="f-type">Type de travaux</label><select id="f-type" name="travaux">${(metier.typesDeDemande || []).map((t) => html`<option>${t}</option>`)}</select></div>
<div class="champ champ-large"><label for="f-message">Votre projet</label><textarea id="f-message" name="message" required></textarea></div>
</div>
<div class="piege" aria-hidden="true"><label for="f-site">Ne pas remplir</label><input id="f-site" name="site_web" type="text" tabindex="-1" autocomplete="off"></div>
<button class="bouton bouton-plein bouton-large" type="submit">Envoyer ma demande</button>
<p class="message-formulaire" role="status" tabindex="-1" hidden></p>
<small>Les informations saisies servent uniquement à répondre à votre demande. <a href="${ctx.racine}confidentialite/">En savoir plus</a>.</small>
</form>`;
}

function sectionContact(ctx) {
  const { client } = ctx;
  const e = client.entreprise;
  const a = e.adresse || {};
  const numero = e.telephone || e.mobile;
  return html`<section class="section sombre" id="contact" aria-labelledby="titre-contact">
<div class="conteneur contact">
<div>
<p class="sur-titre">Contact</p>
<h2 id="titre-contact">Parlons de votre projet</h2>
<p class="chapeau">La visite et le devis sont gratuits et sans engagement.</p>
<a class="contact-tel" href="tel:${telLien(numero)}">${numero}</a>
<ul class="coordonnees">
${e.mobile && e.telephone ? html`<li>${icone('telephone')}<span><a href="tel:${telLien(e.mobile)}">${e.mobile}</a> (portable)</span></li>` : ''}
${e.email ? html`<li>${icone('mail')}<a href="mailto:${e.email}">${e.email}</a></li>` : ''}
<li>${icone('pin')}<span>${a.rue ? html`${a.rue}, ` : ''}${a.codePostal} ${a.ville}</span></li>
${e.horaires ? html`<li>${icone('horloge')}<span>${e.horaires}</span></li>` : ''}
</ul>
</div>
${blocFormulaire(ctx)}
</div>
</section>`;
}

/* ------------------------------------------------------------------ */
/* Données structurées (pour Google)                                   */
/* ------------------------------------------------------------------ */

export function donneesStructurees(ctx) {
  const { client, metier, v } = ctx;
  const e = client.entreprise;
  const a = e.adresse || {};
  const d = {
    '@context': 'https://schema.org',
    '@type': metier.typeSchema || 'LocalBusiness',
    name: e.nom,
    description: remplir(metier.descriptionSeo, v),
    telephone: telLien(e.telephone || e.mobile),
    address: {
      '@type': 'PostalAddress',
      streetAddress: a.rue || undefined,
      postalCode: a.codePostal || undefined,
      addressLocality: a.ville || undefined,
      addressCountry: 'FR',
    },
    areaServed: ctx.communes.map((c) => ({ '@type': 'City', name: c })),
  };
  if (e.email) d.email = e.email;
  if (e.anneeCreation) d.foundingDate = String(e.anneeCreation);
  if (ctx.urlSite) {
    d.url = `${ctx.urlSite}/`;
    d.image = `${ctx.urlSite}/assets/img/${ctx.images.accueil.fichiers.src}`;
  }
  const r = client.reseaux || {};
  const memes = [r.facebook, r.instagram, client.avis && client.avis.lienGoogle].filter(Boolean);
  if (memes.length) d.sameAs = memes;
  return d;
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

export function pageAccueil(ctx) {
  const { metier, v } = ctx;
  return html`${tete(ctx, { titre: remplir(metier.titreSeo, v), description: remplir(metier.descriptionSeo, v), chemin: '', donneesStructurees: donneesStructurees(ctx) })}
<body>
${bandeauDemo(ctx)}
${entete(ctx)}
<main>
${sectionHero(ctx)}
${sectionConfiance(ctx)}
${sectionPrestations(ctx)}
${sectionRealisations(ctx)}
${sectionEntreprise(ctx)}
${sectionEtapes(ctx)}
${sectionAvis(ctx)}
${sectionZone(ctx)}
${sectionFaq(ctx)}
${sectionContact(ctx)}
</main>
${fin(ctx)}`.toString();
}

export function pageLocale(ctx, page) {
  const { metier, client } = ctx;
  const e = client.entreprise;
  const v = { ...ctx.v, commune: page.commune, base: (e.adresse && e.adresse.ville) || ctx.v.ville };
  const modele = metier.pageLocale;
  const surPlace = ctx.realisations.filter((r) => r.lieu === page.commune);
  const liste = surPlace.length ? surPlace : ctx.realisations.slice(0, 3);
  const titreRealisations = surPlace.length ? `Nos chantiers à ${page.commune}` : 'Quelques chantiers récents';
  const numero = e.telephone || e.mobile;
  return html`${tete(ctx, { titre: remplir(modele.titreSeo, v), description: remplir(modele.descriptionSeo, v), chemin: page.chemin })}
<body>
${bandeauDemo(ctx)}
${entete(ctx)}
<main>
<div class="page-titre"><div class="conteneur">
<p class="sur-titre">${e.nom}</p>
<h1>${remplir(modele.titre, v)}</h1>
<p>${remplir(modele.intro, v)}</p>
<div class="hero-actions" style="margin-top:26px">
<a class="bouton bouton-plein" href="${ctx.racine}#contact">Demander un devis gratuit ${icone('fleche', { taille: 20 })}</a>
<a class="bouton bouton-contour" href="tel:${telLien(numero)}">${icone('telephone', { taille: 20 })} ${numero}</a>
</div>
</div></div>
<section class="section"><div class="conteneur">
<div class="prose">${modele.paragraphes.map((p) => html`<p>${remplir(p, v)}</p>`)}</div>
<div class="tete-section" style="margin-top:48px"><p class="sur-titre">Prestations</p><h2>Nos travaux à ${page.commune}</h2></div>
<div class="grille-prestations">${ctx.services.map((s) => html`<article class="prestation"><div class="prestation-icone">${icone(s.icone, { taille: 28 })}</div><h3>${s.titre}</h3><p>${s.texte}</p></article>`)}</div>
</div></section>
${sectionRealisations(ctx, { titre: titreRealisations, liste })}
${sectionFaq({ ...ctx, v })}
</main>
${fin(ctx)}`.toString();
}

/** Texte des mentions légales, commun aux deux gabarits. */
export function corpsMentions(ctx) {
  const { client, marque } = ctx;
  const e = client.entreprise;
  const a = e.adresse || {};
  const d = (client.garanties && client.garanties.decennale) || {};
  const m = client.mediateur || {};
  const adresse = [a.rue, `${a.codePostal || ''} ${a.ville || ''}`.trim()].filter(Boolean).join(', ');
  return html`<h2>Éditeur du site</h2>
<p><strong>${e.nom}</strong> — ${aCompleter(e.statut, 'forme juridique')}<br>
Adresse : ${aCompleter(a.rue ? adresse : '', 'adresse complète')}<br>
Téléphone : ${e.telephone || e.mobile}<br>
Email : ${aCompleter(e.email, 'email')}<br>
SIRET : ${aCompleter(e.siret, 'numéro SIRET')}<br>
Immatriculation : ${aCompleter(e.immatriculation, 'registre et ville d\'immatriculation (RNE, RCS)')}${e.tvaIntracom ? html`<br>TVA intracommunautaire : ${e.tvaIntracom}` : ''}</p>
<p>Directeur de la publication : ${aCompleter(e.dirigeant, 'nom du dirigeant')}.</p>
<h2>Assurance professionnelle</h2>
<p>Assurance de responsabilité décennale souscrite auprès de ${aCompleter(d.assureur, 'nom et adresse de l\'assureur')}${d.numeroContrat ? html`, contrat n° ${d.numeroContrat}` : ''}. Couverture géographique : ${d.zone || 'France métropolitaine'}.</p>
<h2>Médiation de la consommation</h2>
<p>Conformément au Code de la consommation, tout client particulier peut recourir gratuitement à un médiateur en cas de litige non résolu avec l'entreprise : ${aCompleter(m.nom, 'nom du médiateur')}${m.site ? html`, <a href="${m.site}" rel="noopener">${m.site}</a>` : ''}.</p>
<h2>Hébergement</h2>
<p>${marque.editeur.hebergeur}</p>
<h2>Conception du site</h2>
<p>${marque.nom}${marque.adresseSite ? html` — <a href="${marque.adresseSite}" rel="noopener">${marque.adresseSite}</a>` : ''}.</p>
<h2>Propriété des contenus</h2>
<p>Les textes et les photographies de ce site appartiennent à ${e.nom} ou sont utilisés avec l'accord de leurs auteurs. Toute reproduction sans autorisation est interdite.</p>`;
}

export function pageMentions(ctx) {
  const e = ctx.client.entreprise;
  return html`${tete(ctx, { titre: `Mentions légales — ${e.nom}`, description: `Mentions légales du site de ${e.nom}.`, chemin: 'mentions-legales/' })}
<body>
${bandeauDemo(ctx)}
${entete(ctx)}
<main>
<div class="page-titre"><div class="conteneur"><h1>Mentions légales</h1></div></div>
<section class="section"><div class="conteneur"><div class="prose">
${corpsMentions(ctx)}
</div></div></section>
</main>
${fin(ctx)}`.toString();
}

/** Texte de la page de confidentialité, commun aux deux gabarits. */
export function corpsConfidentialite(ctx) {
  const { client, marque } = ctx;
  const e = client.entreprise;
  const service = (client.formulaire && client.formulaire.service) || 'aucun';
  const nomService = { web3forms: 'Web3Forms', formspree: 'Formspree' }[service];
  return html`<h2>Qui est responsable de vos données ?</h2>
<p>${e.nom}, ${aCompleter(e.adresse && e.adresse.rue ? `${e.adresse.rue}, ${e.adresse.codePostal} ${e.adresse.ville}` : '', 'adresse')}. Contact : ${aCompleter(e.email, 'email')}.</p>
<h2>Quelles données, et pour quoi faire ?</h2>
<p>Lorsque vous utilisez le formulaire de contact ou que vous nous écrivez, nous recevons votre nom, vos coordonnées et la description de votre projet. Ces informations servent uniquement à vous répondre et à établir un devis. Elles ne sont ni vendues ni transmises à des tiers à des fins commerciales.</p>
<p>Base légale : les démarches précontractuelles effectuées à votre demande.</p>
<h2>Combien de temps sont-elles conservées ?</h2>
<p>Trois ans au plus après notre dernier échange si aucun chantier n'est réalisé. Les documents liés à un chantier (devis, factures) sont conservés pendant les durées imposées par la loi.</p>
<h2>Qui y a accès ?</h2>
<ul>
<li>${e.nom}, pour traiter votre demande.</li>
<li>${marque.nom}, qui assure la maintenance technique du site.</li>
<li>L'hébergeur du site : ${marque.editeur.hebergeur}</li>
${nomService ? html`<li>Le service qui achemine les messages du formulaire : ${nomService}.</li>` : ''}
</ul>
<p>Certains de ces prestataires sont établis hors de l'Union européenne. Les transferts sont encadrés par les mécanismes prévus par le RGPD (décision d'adéquation ou clauses contractuelles types).</p>
<h2>Cookies et mesure d'audience</h2>
<p>Ce site n'utilise aucun cookie de publicité ni de suivi. Si une mesure d'audience est activée, elle est anonyme et fonctionne sans cookie.</p>
<h2>Vos droits</h2>
<p>Vous pouvez demander l'accès à vos données, leur rectification ou leur effacement, et vous opposer à leur utilisation, en écrivant à ${aCompleter(e.email, 'email')}. Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL (<a href="https://www.cnil.fr" rel="noopener">cnil.fr</a>).</p>`;
}

export function pageConfidentialite(ctx) {
  const e = ctx.client.entreprise;
  return html`${tete(ctx, { titre: `Confidentialité — ${e.nom}`, description: `Utilisation des données personnelles sur le site de ${e.nom}.`, chemin: 'confidentialite/' })}
<body>
${bandeauDemo(ctx)}
${entete(ctx)}
<main>
<div class="page-titre"><div class="conteneur"><h1>Confidentialité</h1><p>Ce site ne dépose aucun cookie publicitaire et ne suit pas votre navigation.</p></div></div>
<section class="section"><div class="conteneur"><div class="prose">
${corpsConfidentialite(ctx)}
</div></div></section>
</main>
${fin(ctx)}`.toString();
}

export function page404(ctx) {
  const e = ctx.client.entreprise;
  return html`${tete(ctx, { titre: `Page introuvable — ${e.nom}`, description: 'Cette page n\'existe pas.', chemin: '404.html' })}
<body>
${entete(ctx)}
<main>
<div class="page-titre"><div class="conteneur"><h1>Page introuvable</h1><p>Cette page n'existe pas ou a été déplacée.</p><div class="hero-actions" style="margin-top:26px"><a class="bouton bouton-plein" href="${ctx.racine || './'}">Retour à l'accueil</a></div></div></div>
</main>
${pied(ctx)}
</body>
</html>`.toString();
}

/** Page unique affichée quand un abonnement est suspendu pour impayé. Elle garde le téléphone de l'artisan. */
export function pageSuspendue(ctx) {
  const e = ctx.client.entreprise;
  const numero = e.telephone || e.mobile;
  return html`<!doctype html>
<html lang="fr" data-theme="${ctx.theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e.nom}</title>
<meta name="robots" content="noindex">
<link rel="stylesheet" href="${ctx.racine}${ctx.cssHref}">
</head>
<body class="sans-barre">
<main>
<div class="page-titre" style="min-height:100vh;display:flex;align-items:center"><div class="conteneur">
<p class="sur-titre">${e.nom}</p>
<h1>Site momentanément indisponible</h1>
<p>Vous pouvez joindre l'entreprise directement par téléphone.</p>
<div class="hero-actions" style="margin-top:26px"><a class="bouton bouton-plein" href="tel:${telLien(numero)}">${icone('telephone', { taille: 20 })} ${numero}</a></div>
</div></div>
</main>
</body>
</html>`.toString();
}

export function cheminPageLocale(metier, commune) {
  return `${metier.id}-${slug(commune)}/`;
}
