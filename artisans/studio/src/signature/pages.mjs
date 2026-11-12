// Gabarit « signature » : pages d'un site d'artisan, direction éditoriale.
// Règle de fond : rien n'est affiché qui ne vienne de la fiche client ou du fichier métier.
// Pas d'avis, d'ancienneté, d'assurance ni de gratuité du devis sans la donnée correspondante.
import { html, brut, echapper, remplir, telLien, dateLisible, nombreFr } from '../outils.mjs';
import { icone } from '../icones.mjs';
import { image, corpsMentions, corpsConfidentialite, donneesStructurees } from '../site-client.mjs';

/* ------------------------------------------------------------------ */
/* Briques communes                                                    */
/* ------------------------------------------------------------------ */

/** Découpe un titre en mots, chacun dans un masque, pour l'animation d'apparition. */
function decoupeur() {
  let i = 0;
  return (texte, { italique = false } = {}) => brut(
    String(texte).split(/\s+/).filter(Boolean)
      .map((mot) => `<span class="mot"><span class="mot-i" style="--i:${i++}">${italique ? `<em>${echapper(mot)}</em>` : echapper(mot)}</span></span>`)
      .join(' ')
  );
}

/** Titre de section : les mots montent quand le titre entre à l'écran. */
function titre(niveau, texte, attributs = '') {
  const mots = decoupeur();
  return brut(`<${niveau} data-titre${attributs ? ` ${attributs}` : ''}>${mots(texte)}</${niveau}>`);
}

/** Photo dans son cadre, avec la mention « illustration » quand ce n'est pas une photo de l'entreprise. */
function cadre(img, { racine, alt, tailles, classe = '', illustration = false, prioritaire = false, parallaxe = false } = {}) {
  if (!img) return '';
  const mention = img.remplacement ? 'Votre photo ici' : (illustration ? 'Photo d\'illustration' : '');
  return html`<div class="cadre ${classe}"${brut(parallaxe ? ' data-parallaxe' : '')}><div class="cadre-interieur">${image(img, { racine, alt, tailles, prioritaire })}</div>${mention ? html`<span class="mention-illustration">${mention}</span>` : ''}</div>`;
}

function fleche(taille = 18) {
  return icone('fleche', { taille });
}

function libelleDevis(ctx) {
  return ctx.client.devisGratuit ? 'Devis gratuit' : 'Devis personnalisé';
}

function tete(ctx, { titre: titrePage, description, chemin = '', donnees = [], imagePrioritaire = null }) {
  const { racine, demo } = ctx;
  const canonique = !demo && ctx.urlSite ? `${ctx.urlSite}/${chemin}` : '';
  const partage = !demo && ctx.urlSite && ctx.images.hero ? `${ctx.urlSite}/assets/img/${ctx.images.hero.fichiers.src}` : '';
  const f = imagePrioritaire && imagePrioritaire.fichiers;
  const prechargement = f && f.srcsetWebp
    ? html`<link rel="preload" as="image" type="image/webp" imagesrcset="${f.srcsetWebp.split(', ').map((x) => `${racine}assets/img/${x}`).join(', ')}" imagesizes="100vw" fetchpriority="high">`
    : '';
  return html`<!doctype html>
<html lang="fr" data-theme="${ctx.theme}" class="sans-script"${brut(demo ? ' data-demo' : '')}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titrePage}</title>
<meta name="description" content="${description}">
${demo ? brut('<meta name="robots" content="noindex, nofollow">') : ''}
${canonique ? html`<link rel="canonical" href="${canonique}">` : ''}
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${titrePage}">
<meta property="og:description" content="${description}">
${canonique ? html`<meta property="og:url" content="${canonique}">` : ''}
${partage ? html`<meta property="og:image" content="${partage}">` : ''}
<meta name="theme-color" content="#1b1a17">
<meta name="format-detection" content="telephone=no">
<script>(function(d,m){var c='js';if(m&&!m('(prefers-reduced-motion: reduce)').matches){c+=m('(min-width: 900px)').matches?' anim-attente':' anim-simple'}d.className=c;setTimeout(function(){if(!window.__animPret)d.className='js'},4000)})(document.documentElement,window.matchMedia)</script>
<link rel="icon" href="${racine}assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="${racine}assets/polices/fraunces-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${racine}assets/polices/dm-sans-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
${prechargement}
<link rel="stylesheet" href="${racine}${ctx.cssHref}">
${donnees.filter(Boolean).map((d) => brut(`<script type="application/ld+json">${JSON.stringify(d).replace(/</g, '\\u003c')}</script>`))}
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

function liensMenu(ctx) {
  return [
    ['entreprise', 'L\'entreprise'],
    ['prestations', 'Prestations'],
    ['realisations', 'Réalisations'],
    ['methode', 'Méthode'],
    ...(ctx.avisAffiches ? [['avis', 'Avis']] : []),
    ['zone', 'Zone d\'intervention'],
  ];
}

function marque(ctx) {
  const { client, metier, racine } = ctx;
  const e = client.entreprise;
  const contenu = ctx.logo
    ? html`<img src="${racine}assets/img/${ctx.logo}" alt="${e.nom}">`
    : html`<span class="marque-nom">${e.nom}</span><span class="marque-metier">${metier.titre} · ${ctx.v.ville}</span>`;
  return html`<a class="marque" href="${racine || './'}" aria-label="${e.nom}, retour à l'accueil">${contenu}</a>`;
}

function entete(ctx, { claire = false } = {}) {
  const { client, racine } = ctx;
  const e = client.entreprise;
  const numero = e.mobile || e.telephone;
  const liens = liensMenu(ctx);
  return html`<a class="evitement" href="#contenu">Aller au contenu</a>
${bandeauDemo(ctx)}
<header class="entete${claire ? ' entete-claire' : ''}" data-entete>
<div class="conteneur">
${marque(ctx)}
<nav class="nav" aria-label="Menu principal">${liens.map(([ancre, libelle]) => html`<a href="${racine}#${ancre}">${libelle}</a>`)}</nav>
<a class="bouton bouton-petit" href="${racine}#contact">Demander un devis</a>
<button class="bascule-menu" type="button" aria-controls="menu-plein" aria-expanded="false"><span>Menu</span><span class="bascule-traits" aria-hidden="true"></span></button>
</div>
</header>
<div class="menu-plein" id="menu-plein" role="dialog" aria-modal="true" aria-label="Menu" data-menu>
<div class="menu-tete"><span class="marque-nom">${e.nom}</span><button class="menu-fermer" type="button" data-menu-fermer>Fermer ${icone('fermer', { taille: 20 })}</button></div>
<nav class="menu-liens" aria-label="Menu principal">
${liens.map(([ancre, libelle], i) => html`<a href="${racine}#${ancre}"><span>0${i + 1}</span>${libelle}</a>`)}
<a href="${racine}#contact"><span>0${liens.length + 1}</span>Contact</a>
</nav>
<div class="menu-pied">
<a class="bouton bouton-clair" href="${racine}#contact">Demander un devis ${fleche()}</a>
<a class="bouton bouton-ligne" href="tel:${telLien(numero)}">${icone('telephone', { taille: 18 })} ${numero}</a>
</div>
</div>`;
}

function pied(ctx) {
  const { client, metier, marque: m, racine } = ctx;
  const e = client.entreprise;
  const a = e.adresse || {};
  const r = client.reseaux || {};
  const d = (client.garanties && client.garanties.decennale) || {};
  const credit = m.adresseSite ? html`Site réalisé par <a href="${m.adresseSite}" rel="noopener">${m.nom}</a>` : html`Site réalisé par ${m.nom}`;
  const adresse = [a.rue, [a.codePostal, a.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return html`<footer class="pied">
<div class="conteneur">
<div class="pied-haut">
<div>
<p class="pied-nom">${e.nom}</p>
<p>${metier.titre} à ${ctx.v.ville} et ${ctx.v.dansDepartement}.${ctx.communes.length > 1 ? html` Interventions à ${ctx.communes.slice(0, 4).join(', ')} et dans les communes voisines.` : ''}</p>
${r.facebook || r.instagram ? html`<div class="reseaux">${r.facebook ? html`<a href="${r.facebook}" rel="noopener" aria-label="Page Facebook de ${e.nom}">${icone('facebook', { taille: 20 })}</a>` : ''}${r.instagram ? html`<a href="${r.instagram}" rel="noopener" aria-label="Compte Instagram de ${e.nom}">${icone('instagram', { taille: 20 })}</a>` : ''}</div>` : ''}
</div>
<div>
<h3>Contact</h3>
<ul>
${e.telephone ? html`<li><a href="tel:${telLien(e.telephone)}">${e.telephone}</a></li>` : ''}
${e.mobile ? html`<li><a href="tel:${telLien(e.mobile)}">${e.mobile}</a></li>` : ''}
${e.email ? html`<li><a href="mailto:${e.email}">${e.email}</a></li>` : ''}
${adresse ? html`<li>${adresse}</li>` : ''}
${e.horaires ? html`<li>${e.horaires}</li>` : ''}
</ul>
</div>
<div>
<h3>Navigation</h3>
<ul>
${liensMenu(ctx).map(([ancre, libelle]) => html`<li><a href="${racine}#${ancre}">${libelle}</a></li>`)}
<li><a href="${racine}#contact">Demander un devis</a></li>
</ul>
</div>
${ctx.pagesPrestations.length ? html`<div>
<h3>Prestations</h3>
<ul>${ctx.pagesPrestations.map((p) => html`<li><a href="${racine}${p.chemin}">${p.titre}</a></li>`)}</ul>
</div>` : ''}
${ctx.pagesLocales.length ? html`<div>
<h3>Zone d'intervention</h3>
<ul>${ctx.pagesLocales.map((p) => html`<li><a href="${racine}${p.chemin}">${p.titre}</a></li>`)}</ul>
</div>` : ''}
</div>
<div class="pied-bas">
<span>© ${ctx.annee} ${e.nom}${e.siret ? html` · SIRET ${e.siret}` : ''}${d.assureur ? html` · Assurance décennale ${d.assureur}` : ''}</span>
<ul><li><a href="${racine}mentions-legales/">Mentions légales</a></li><li><a href="${racine}confidentialite/">Politique de confidentialité</a></li><li>${credit}</li></ul>
</div>
</div>
</footer>`;
}

function appelDemo(ctx) {
  if (!ctx.demo) return '';
  const { marque: m } = ctx;
  const f = m.formules[0];
  return html`<section class="appel-demo" aria-label="Offre ${m.nom}">
<div class="conteneur">
<div>
<h2>Ce site peut être le vôtre dans ${m.delaiMiseEnLigneJours} jours</h2>
<p>${f.prixMensuel} € par mois, sans engagement, sans frais de création. Votre nom de domaine est enregistré à votre nom.</p>
</div>
<a class="bouton bouton-clair" href="${ctx.urlOffre}">Voir l'offre ${fleche()}</a>
</div>
</section>`;
}

function barreMobile(ctx) {
  const e = ctx.client.entreprise;
  const numero = e.mobile || e.telephone;
  return html`<div class="barre-mobile" data-barre>
<a class="bouton bouton-ligne" href="tel:${telLien(numero)}">${icone('telephone', { taille: 18 })} Appeler</a>
<a class="bouton bouton-plein" href="${ctx.racine}#contact">Demander un devis</a>
</div>`;
}

function fin(ctx, { visionneuse = false } = {}) {
  return html`${appelDemo(ctx)}
${pied(ctx)}
${barreMobile(ctx)}
${visionneuse ? brut(`<dialog class="visionneuse" data-visionneuse aria-label="Photo en grand">
<div class="visionneuse-corps">
<div class="visionneuse-barre"><span data-visionneuse-compteur></span><button class="rond" type="button" data-visionneuse-fermer aria-label="Fermer">${icone('fermer', { taille: 20 })}</button></div>
<div class="visionneuse-image"><img data-visionneuse-image alt=""></div>
<div class="visionneuse-legende">
<div><strong data-visionneuse-titre></strong><p data-visionneuse-texte></p></div>
<div class="visionneuse-fleches"><button class="rond rond-retour" type="button" data-visionneuse-precedent aria-label="Photo précédente">${icone('fleche', { taille: 20 })}</button><button class="rond" type="button" data-visionneuse-suivant aria-label="Photo suivante">${icone('fleche', { taille: 20 })}</button></div>
</div>
</div>
</dialog>`) : ''}
<script src="${ctx.racine}${ctx.jsHref}" defer data-gsap="${ctx.racine}${ctx.vendor.gsap}" data-defilement="${ctx.racine}${ctx.vendor.scrollTrigger}"></script>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* Sections de l'accueil                                               */
/* ------------------------------------------------------------------ */

function sectionHero(ctx) {
  const { client, metier, v } = ctx;
  const e = client.entreprise;
  const numero = e.telephone || e.mobile;
  const textes = client.textes || {};
  const mots = decoupeur();
  // Titre : le métier et la zone. La ville est mise en italique.
  const modele = textes.accroche || metier.accroche;
  const [avant, apres = ''] = modele.split('{ville}');
  const h1 = html`${avant.trim() ? mots(remplir(avant, v)) : ''} ${modele.includes('{ville}') ? mots(v.ville, { italique: true }) : ''} ${apres.trim() ? mots(remplir(apres, v)) : ''}`;
  const phrase = remplir(textes.sousTitre || metier.signature.phrase, v);
  const illustration = ctx.photosIllustration && !ctx.images.hero.remplacement;
  return html`<section class="hero" aria-labelledby="titre-accueil" data-hero>
<div class="hero-media" data-hero-media>${image(ctx.images.hero, { racine: ctx.racine, alt: '', tailles: '100vw', prioritaire: true })}</div>
<div class="hero-voile"></div>
<div class="conteneur hero-contenu" data-hero-contenu>
<p class="etiquette">${e.nom} · Entreprise de ${metier.activite}</p>
<h1 class="hero-titre" id="titre-accueil">${h1}</h1>
<p class="hero-phrase">${phrase}</p>
<div class="hero-actions">
<a class="bouton bouton-clair" href="#contact">Demander un devis ${fleche()}</a>
<a class="bouton bouton-ligne" href="#realisations">Découvrir nos réalisations</a>
</div>
</div>
<div class="hero-pied">
<div class="conteneur">
<ul>
<li>${icone('pin', { taille: 18 })} ${v.ville} et ${v.dansDepartement}</li>
<li>${icone('telephone', { taille: 18 })} <a href="tel:${telLien(numero)}">${numero}</a></li>
<li>${icone('document', { taille: 18 })} ${libelleDevis(ctx)}</li>
</ul>
${illustration ? html`<span class="mention-illustration">Photo d'illustration</span>` : ''}
</div>
</div>
</section>`;
}

function sectionPresentation(ctx) {
  const { client, metier, v } = ctx;
  const e = client.entreprise;
  const textes = client.textes || {};
  const paragraphes = (textes.aPropos && textes.aPropos.length ? textes.aPropos : metier.signature.presentation).map((p) => remplir(p, v));
  const reperes = [
    e.anneeCreation ? ['Depuis', String(e.anneeCreation)] : null,
    v.rayon ? ['Rayon d\'intervention', `${v.rayon} km`] : null,
    ctx.communes.length > 1 ? ['Communes desservies', String(ctx.communes.length)] : null,
  ].filter(Boolean);
  const illustration = ctx.photosIllustration;
  return html`<section class="section" id="entreprise" aria-labelledby="titre-entreprise">
<div class="conteneur presentation-grille">
<div class="presentation-tete">
<p class="etiquette" data-revele>L'entreprise</p>
${titre('h2', textes.presentationTitre || metier.signature.presentationTitre, 'id="titre-entreprise"')}
</div>
<figure class="presentation-photo-1" data-revele="image">${cadre(ctx.images.portrait, { racine: ctx.racine, alt: `Le travail de ${e.nom}`, tailles: '(max-width: 760px) 100vw, 42vw', illustration, parallaxe: true })}</figure>
<div class="presentation-texte">
<p class="chapo" data-revele>${paragraphes[0]}</p>
${paragraphes.slice(1).map((p) => html`<p data-revele>${p}</p>`)}
${e.dirigeant ? html`<p class="signature" data-revele>${e.dirigeant}</p>` : ''}
${reperes.length ? html`<dl class="reperes" data-revele>${reperes.map(([dt, dd]) => html`<div><dt>${dt}</dt><dd>${dd}</dd></div>`)}</dl>` : ''}
</div>
${ctx.images.detail ? html`<figure class="presentation-photo-2" data-revele="image">${cadre(ctx.images.detail, { racine: ctx.racine, alt: `Détail d'un ouvrage de ${metier.activite}`, tailles: '(max-width: 760px) 100vw, 32vw', illustration, parallaxe: true })}</figure>` : ''}
</div>
</section>`;
}

function cartePrestation(ctx, s, i) {
  const numero = String(i + 1).padStart(2, '0');
  const visuel = s.image
    ? cadre(s.image, { racine: ctx.racine, alt: s.titre, tailles: '(max-width: 760px) 100vw, (max-width: 1080px) 50vw, 31vw', classe: 'carte-image', illustration: s.illustration })
    : html`<div class="carte-sans-image"></div>`;
  const corps = html`${visuel}<span class="carte-numero">${numero}</span><h3>${s.titre}</h3><p>${s.texte}</p>`;
  return html`<li class="carte-prestation" data-revele style="--rang:${i % 3}">${s.page
    ? html`<a class="carte-lien" href="${ctx.racine}${s.page.chemin}">${corps}<span class="lien-fleche carte-plus">En savoir plus ${fleche(16)}</span></a>`
    : html`<div class="carte-lien">${corps}</div>`}</li>`;
}

function sectionPrestations(ctx) {
  const { metier, v } = ctx;
  return html`<section class="section" id="prestations" aria-labelledby="titre-prestations">
<div class="conteneur">
<div class="tete">
<div><p class="etiquette" data-revele>Prestations</p>${titre('h2', remplir(metier.signature.prestationsTitre, v), 'id="titre-prestations"')}</div>
<p class="intro" data-revele>${remplir(metier.signature.prestationsIntro, v)}</p>
</div>
<ul class="cartes-prestations">${ctx.services.map((s, i) => cartePrestation(ctx, s, i))}</ul>
</div>
</section>`;
}

/** Répartit les réalisations en rangs de 2 puis 3 photos, pour une grille asymétrique. */
export function rangsGalerie(liste) {
  const rangs = [];
  let i = 0;
  let tour = 0;
  while (i < liste.length) {
    const taille = tour % 2 === 0 ? 2 : 3;
    const elements = liste.slice(i, i + taille);
    const classe = elements.length === 1 ? 'rang-1' : elements.length === 3 ? 'rang-3' : (Math.floor(tour / 2) % 2 === 0 ? 'rang-2a' : 'rang-2b');
    rangs.push({ classe, elements });
    i += taille;
    tour += 1;
  }
  return rangs;
}

function legende(r) {
  return [r.type, r.lieu, r.annee].filter(Boolean).join(' · ');
}

function tuileRealisation(ctx, r, index, tailles) {
  const illustration = r.illustration || r.image.remplacement;
  const mention = r.image.remplacement ? 'Votre photo ici' : (r.illustration ? 'Photo d\'illustration' : '');
  const description = [r.description, mention && !r.image.remplacement ? 'Photo d\'illustration, non contractuelle.' : ''].filter(Boolean).join(' ');
  return html`<figure class="realisation" data-revele="image">
<button class="realisation-ouvrir" type="button" data-photo="${index}" data-grand="${ctx.racine}assets/img/${r.image.fichiers.src}" data-titre="${r.titre}" data-legende="${legende(r)}" data-description="${description}" aria-label="Agrandir la photo : ${r.titre}">
<span class="cadre"><span class="cadre-interieur">${image(r.image, { racine: ctx.racine, alt: `${r.titre}${r.lieu ? `, ${r.lieu}` : ''}${illustration ? ' (photo d\'illustration)' : ''}`, tailles })}</span></span>
<span class="realisation-loupe" aria-hidden="true">${icone('plus', { taille: 20 })}</span>
</button>
${mention ? html`<span class="mention-illustration">${mention}</span>` : ''}
<figcaption><strong>${r.titre}</strong>${legende(r) ? html`<span>${legende(r)}</span>` : ''}</figcaption>
</figure>`;
}

function sectionRealisations(ctx, { liste = ctx.realisations, titreSection = ctx.metier.signature.realisationsTitre, id = 'realisations' } = {}) {
  if (!liste.length) return '';
  const illustrations = liste.filter((r) => r.illustration || r.image.remplacement).length;
  let index = 0;
  const note = illustrations === 0 ? '' : ctx.demo
    ? 'Photos d\'illustration : cette galerie présentera vos propres chantiers.'
    : 'Certaines photos sont des illustrations, non contractuelles. Elles sont signalées comme telles.';
  return html`<section class="section sombre" id="${id}" aria-labelledby="titre-${id}">
<div class="conteneur">
<div class="tete">
<div><p class="etiquette" data-revele>Réalisations</p>${titre('h2', titreSection, `id="titre-${id}"`)}</div>
<p class="intro" data-revele>Cliquez sur une photo pour l'agrandir.</p>
</div>
<div class="galerie" data-galerie>
${rangsGalerie(liste).map((rang) => html`<div class="galerie-rang ${rang.classe}">${rang.elements.map((r) => tuileRealisation(ctx, r, index++, rang.classe === 'rang-3' ? '(max-width: 760px) 100vw, 33vw' : rang.classe === 'rang-1' ? '100vw' : '(max-width: 760px) 100vw, 58vw'))}</div>`)}
</div>
${note ? html`<p class="note-illustration">${note}</p>` : ''}
</div>
</section>`;
}

function sectionMethode(ctx) {
  const { metier, v } = ctx;
  return html`<section class="section teinte" id="methode" aria-labelledby="titre-methode">
<div class="conteneur methode-grille">
<div class="methode-tete">
<p class="etiquette" data-revele>Notre méthode de travail</p>
${titre('h2', remplir(metier.signature.methodeTitre, v), 'id="titre-methode"')}
<p class="intro" data-revele>${remplir(metier.signature.methodeIntro, v)}</p>
<a class="bouton bouton-plein" href="#contact" data-revele>Demander un devis ${fleche()}</a>
</div>
<div class="etapes" data-etapes>
<span class="etapes-progression" data-etapes-progression aria-hidden="true"></span>
<ol>${metier.methode.map((etape) => html`<li class="etape" data-revele><span class="etape-numero" aria-hidden="true"></span><h3>${etape.titre}</h3><p>${remplir(etape.texte, v)}</p></li>`)}</ol>
</div>
</div>
</section>`;
}

/** Assurances et qualifications : uniquement celles renseignées dans la fiche. */
function garantiesRenseignees(ctx) {
  const g = ctx.client.garanties || {};
  const d = g.decennale || {};
  const elements = [];
  if (d.assureur) elements.push(['bouclier', 'Assurance décennale', `Souscrite auprès de ${d.assureur}.`]);
  for (const label of g.labels || []) {
    if (typeof label === 'string' && label.trim()) elements.push(['check', label, '']);
    else if (label && label.nom) elements.push(['check', label.nom, label.detail || '']);
  }
  return elements;
}

function sectionRaisons(ctx) {
  const { metier, v } = ctx;
  const garanties = garantiesRenseignees(ctx);
  return html`<section class="section" id="engagements" aria-labelledby="titre-engagements" style="padding-top:0">
${ctx.images.bande ? cadre(ctx.images.bande, { racine: ctx.racine, alt: '', tailles: '100vw', classe: 'bande-photo', illustration: ctx.photosIllustration, parallaxe: true }) : brut('<div style="height:var(--espace)"></div>')}
<div class="conteneur raisons-grille">
<div>
<p class="etiquette" data-revele>Pourquoi nous choisir</p>
${titre('h2', remplir(metier.signature.raisonsTitre, v), 'id="titre-engagements"')}
</div>
<ul class="raisons">${metier.raisons.map((r, i) => html`<li class="raison" data-revele style="--rang:${i % 2}"><h3>${r.titre}</h3><p>${remplir(r.texte, v)}</p></li>`)}</ul>
${garanties.length ? html`<div class="garanties" data-revele>
<h3>Assurances et qualifications</h3>
<ul>${garanties.map(([ic, nom, detail]) => html`<li>${icone(ic)}<div><strong>${nom}</strong>${detail ? html`<span>${detail}</span>` : ''}</div></li>`)}</ul>
</div>` : ''}
</div>
</section>`;
}

function sectionAvis(ctx) {
  const avis = ctx.client.avis || {};
  const extraits = (avis.extraits || []).slice(0, 3);
  if (!ctx.avisAffiches) {
    // Aucun avis réel : rien en production ; en démonstration, un emplacement clairement identifié.
    if (!ctx.demo) return '';
    return html`<section class="section-courte teinte" aria-label="Avis clients">
<div class="conteneur">
<div class="emplacement" data-revele>
<p class="etiquette">Emplacement à compléter</p>
<strong>Vos avis clients s'afficheront ici.</strong>
<p>Nous reprenons uniquement de vrais avis, tels qu'ils ont été publiés, avec leur date et un lien vers votre fiche Google. Aucun témoignage n'est inventé pour cette démonstration.</p>
</div>
</div>
</section>`;
  }
  return html`<section class="section teinte" id="avis" aria-labelledby="titre-avis">
<div class="conteneur">
<div class="tete"><div><p class="etiquette" data-revele>Avis clients</p>${titre('h2', 'Ce que disent nos clients', 'id="titre-avis"')}</div></div>
${extraits.length ? html`<div class="avis-liste">${extraits.map((x, i) => html`<figure class="avis-carte" data-revele style="--rang:${i}"><blockquote>« ${x.texte} »</blockquote><figcaption><strong>${x.auteur}</strong>${[x.lieu, dateLisible(x.date)].filter(Boolean).join(' · ')}</figcaption></figure>`)}</div>` : ''}
<div class="avis-pied" data-revele>
${avis.note && avis.nombre ? html`<span><span class="avis-note">${nombreFr(avis.note)} sur 5</span> · ${avis.nombre} avis sur Google</span>` : brut('<span></span>')}
${avis.lienGoogle ? html`<a class="lien-fleche" href="${avis.lienGoogle}" rel="noopener">Lire tous les avis ${fleche(16)}</a>` : ''}
</div>
${extraits.length ? html`<p class="note-illustration">Avis publiés par des clients sur Google et repris tels quels, avec leur date. Nous n'effectuons pas de contrôle sur ces avis.</p>` : ''}
</div>
</section>`;
}

function sectionZone(ctx) {
  const { metier, v } = ctx;
  const liensLocaux = new Map(ctx.pagesLocales.map((p) => [p.commune, p.chemin]));
  const groupe = (cache) => html`<div class="defile-groupe"${brut(cache ? ' aria-hidden="true"' : '')}>${ctx.communes.map((c) => html`<span>${c}</span>`)}</div>`;
  return html`<section class="section" id="zone" aria-labelledby="titre-zone" style="padding-top:0">
${ctx.communes.length >= 4 ? html`<div class="defile" aria-hidden="true"><div class="defile-piste">${groupe(false)}${groupe(true)}</div></div>` : brut('<div style="height:var(--espace)"></div>')}
<div class="conteneur zone-grille">
<div>
<p class="etiquette" data-revele>Zone d'intervention</p>
${titre('h2', remplir(metier.signature.zoneTitre, v), 'id="titre-zone"')}
${v.rayon ? html`<p class="intro" data-revele>Nous nous déplaçons dans un rayon d'environ ${v.rayon} km autour de ${v.ville}.</p>` : ''}
</div>
${ctx.communes.length ? html`<ul class="communes" data-revele>${ctx.communes.map((c) => (liensLocaux.has(c)
    ? html`<li><a href="${ctx.racine}${liensLocaux.get(c)}">${c} ${fleche(16)}</a></li>`
    : html`<li>${c}</li>`))}</ul>` : ''}
</div>
</section>`;
}

function blocFormulaire(ctx) {
  const { client } = ctx;
  const f = client.formulaire || { service: 'aucun' };
  const e = client.entreprise;
  let action = '';
  let caches = '';
  if (f.service === 'web3forms') {
    action = 'https://api.web3forms.com/submit';
    caches = html`<input type="hidden" name="access_key" value="${f.cle}"><input type="hidden" name="subject" value="Nouvelle demande de devis depuis le site"><input type="hidden" name="from_name" value="Site ${e.nom}">`;
  } else if (f.service === 'formspree') {
    action = `https://formspree.io/f/${f.cle}`;
    caches = html`<input type="hidden" name="_subject" value="Nouvelle demande de devis depuis le site">`;
  }
  // En production, sans service d'envoi, on n'affiche pas un formulaire qui ne partirait nulle part.
  if (!ctx.demo && f.service === 'aucun') {
    return html`<div class="formulaire">
<h3>Contactez-nous directement</h3>
<p>Le plus simple est de nous appeler ou de nous écrire : nous échangerons sur votre projet.</p>
<a class="bouton bouton-plein bouton-large" href="tel:${telLien(e.telephone || e.mobile)}">${icone('telephone', { taille: 18 })} ${e.telephone || e.mobile}</a>
${e.email ? html`<a class="bouton bouton-ligne sur-clair bouton-large" style="margin-top:12px" href="mailto:${e.email}?subject=Demande%20de%20devis">${icone('mail', { taille: 18 })} Écrire un email</a>` : ''}
</div>`;
  }
  const joindre = Boolean(f.piecesJointes) && f.service !== 'aucun';
  return html`<form class="formulaire" method="post" action="${action || '#contact'}"${brut(joindre ? ' enctype="multipart/form-data"' : '')} data-formulaire="${ctx.demo ? 'demo' : f.service}">
<h3>Votre demande de devis</h3>
<p>Les champs marqués d'un astérisque sont nécessaires pour vous répondre.</p>
${caches}
<div class="champs">
<div class="champ"><label for="f-prenom">Prénom *</label><input id="f-prenom" name="prenom" type="text" autocomplete="given-name" required></div>
<div class="champ"><label for="f-nom">Nom *</label><input id="f-nom" name="nom" type="text" autocomplete="family-name" required></div>
<div class="champ"><label for="f-tel">Téléphone *</label><input id="f-tel" name="telephone" type="tel" autocomplete="tel" inputmode="tel" required></div>
<div class="champ"><label for="f-email">Adresse e-mail</label><input id="f-email" name="email" type="email" autocomplete="email"></div>
<div class="champ"><label for="f-type">Type de travaux</label><select id="f-type" name="travaux">${ctx.services.map((s) => html`<option>${s.titre}</option>`)}<option>Autre projet</option></select></div>
<div class="champ"><label for="f-commune">Commune du chantier</label><input id="f-commune" name="commune" type="text" autocomplete="address-level2"></div>
<div class="champ champ-large"><label for="f-message">Description du projet *</label><textarea id="f-message" name="message" required></textarea></div>
${joindre ? html`<div class="champ champ-large"><label for="f-photos">Photos (facultatif)</label><input id="f-photos" name="attachment" type="file" accept="image/*" multiple></div>` : ''}
</div>
<div class="piege" aria-hidden="true"><label for="f-site">Ne pas remplir</label><input id="f-site" name="site_web" type="text" tabindex="-1" autocomplete="off"></div>
<button class="bouton bouton-plein bouton-large" type="submit">Envoyer ma demande ${fleche()}</button>
<p class="message-formulaire" role="status" tabindex="-1" hidden></p>
${ctx.demo ? html`<p class="note-demo">Site de démonstration : ce formulaire n'est relié à aucune boîte de réception. Rien n'est envoyé.</p>` : ''}
<small>Les informations saisies servent uniquement à répondre à votre demande. <a href="${ctx.racine}confidentialite/">Politique de confidentialité</a>.</small>
</form>`;
}

function sectionContact(ctx) {
  const { client } = ctx;
  const e = client.entreprise;
  const a = e.adresse || {};
  const numero = e.telephone || e.mobile;
  const adresse = [a.rue, [a.codePostal, a.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return html`<section class="section contact" id="contact" aria-labelledby="titre-contact">
<div class="conteneur contact-grille">
<div>
<p class="etiquette" data-revele>Contact et demande de devis</p>
${titre('h2', 'Parlons de votre projet.', 'id="titre-contact"')}
<p class="intro" data-revele>Décrivez-nous vos travaux. Nous reviendrons vers vous pour échanger sur votre besoin.</p>
<a class="contact-tel" href="tel:${telLien(numero)}" data-revele>${numero}</a>
<ul class="coordonnees" data-revele>
${e.mobile && e.telephone ? html`<li>${icone('telephone', { taille: 20 })}<span><a href="tel:${telLien(e.mobile)}">${e.mobile}</a> (portable)</span></li>` : ''}
${e.email ? html`<li>${icone('mail', { taille: 20 })}<a href="mailto:${e.email}">${e.email}</a></li>` : ''}
${adresse ? html`<li>${icone('pin', { taille: 20 })}<span>${adresse}</span></li>` : ''}
${e.horaires ? html`<li>${icone('horloge', { taille: 20 })}<span>${e.horaires}</span></li>` : ''}
</ul>
</div>
<div data-revele>${blocFormulaire(ctx)}</div>
</div>
</section>`;
}

/* ------------------------------------------------------------------ */
/* Données structurées                                                 */
/* ------------------------------------------------------------------ */

function donneesEntreprise(ctx) {
  const d = donneesStructurees({ ...ctx, images: { accueil: ctx.images.hero } });
  d.description = remplir(ctx.metier.signature.descriptionSeo, ctx.v);
  return d;
}

function filAriane(ctx, elements) {
  if (!ctx.urlSite) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: elements.map(([nom, chemin], i) => ({ '@type': 'ListItem', position: i + 1, name: nom, item: `${ctx.urlSite}/${chemin}` })),
  };
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

export function pageAccueil(ctx) {
  const { metier, v } = ctx;
  return html`${tete(ctx, { titre: remplir(metier.signature.titreSeo, v), description: remplir(metier.signature.descriptionSeo, v), chemin: '', donnees: [donneesEntreprise(ctx)], imagePrioritaire: ctx.images.hero })}
<body>
${entete(ctx)}
<main id="contenu">
${sectionHero(ctx)}
${sectionPresentation(ctx)}
${sectionPrestations(ctx)}
${sectionRealisations(ctx)}
${sectionMethode(ctx)}
${sectionRaisons(ctx)}
${sectionAvis(ctx)}
${sectionZone(ctx)}
${sectionContact(ctx)}
</main>
${fin(ctx, { visionneuse: ctx.realisations.length > 0 })}`.toString();
}

function encartContact(ctx) {
  const e = ctx.client.entreprise;
  const numero = e.telephone || e.mobile;
  return html`<aside class="encart" data-revele>
<h2>Un projet de ce type ?</h2>
<p>Décrivez-nous vos travaux. Nous reviendrons vers vous pour échanger sur votre besoin.</p>
<a class="bouton bouton-plein" href="${ctx.racine}#contact">Demander un devis ${fleche()}</a>
<a class="contact-tel" href="tel:${telLien(numero)}">${numero}</a>
</aside>`;
}

function enTetePage(ctx, { fil, etiquette, h1, accroche = '', img = null, illustration = false, actions = true }) {
  const e = ctx.client.entreprise;
  const numero = e.telephone || e.mobile;
  const mots = decoupeur();
  return html`<div class="page-tete${img ? '' : ' page-tete-simple'}">
${img ? html`<div class="page-tete-media" data-hero-media>${image(img, { racine: ctx.racine, alt: '', tailles: '100vw', prioritaire: true })}</div>` : ''}
<div class="conteneur">
<ol class="fil" aria-label="Fil d'Ariane">${fil.map(([nom, lien]) => (lien === null ? html`<li aria-current="page">${nom}</li>` : html`<li><a href="${lien}">${nom}</a></li>`))}</ol>
${etiquette ? html`<p class="etiquette">${etiquette}</p>` : ''}
<h1>${mots(h1)}</h1>
${accroche ? html`<p class="accroche">${accroche}</p>` : ''}
${actions ? html`<div class="hero-actions"><a class="bouton ${img ? 'bouton-clair' : 'bouton-plein'}" href="${ctx.racine}#contact">Demander un devis ${fleche()}</a><a class="bouton bouton-ligne${img ? '' : ' sur-clair'}" href="tel:${telLien(numero)}">${icone('telephone', { taille: 18 })} ${numero}</a></div>` : ''}
</div>
${img && illustration && !img.remplacement ? html`<span class="mention-illustration">Photo d'illustration</span>` : ''}
</div>`;
}

function autresPrestations(ctx, sauf = '') {
  const autres = ctx.services.filter((s) => s.page && s.id !== sauf);
  if (!autres.length) return '';
  return html`<section class="section teinte" aria-labelledby="titre-autres">
<div class="conteneur">
<div class="tete"><div><p class="etiquette" data-revele>Prestations</p>${titre('h2', sauf ? 'Nos autres prestations' : 'Nos prestations', 'id="titre-autres"')}</div></div>
<div class="autres" data-revele>${autres.map((s) => html`<a href="${ctx.racine}${s.page.chemin}">${s.titre} ${fleche()}</a>`)}</div>
</div>
</section>`;
}

export function pagePrestation(ctx, service) {
  const { metier, v, client } = ctx;
  const e = client.entreprise;
  const chemin = service.page.chemin;
  const liees = ctx.realisations.filter((r) => r.prestation === service.id);
  const description = `${service.titre} à ${v.ville} et ${v.dansDepartement} : ${service.texte}`.slice(0, 158);
  const donnees = ctx.urlSite ? {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.titre,
    description: service.texte,
    areaServed: ctx.communes.map((c) => ({ '@type': 'City', name: c })),
    provider: { '@type': metier.typeSchema || 'LocalBusiness', name: e.nom, url: `${ctx.urlSite}/` },
  } : null;
  return html`${tete(ctx, { titre: `${service.titre} à ${v.ville} — ${e.nom}`, description, chemin, donnees: [donnees, filAriane(ctx, [['Accueil', ''], [service.titre, chemin]])], imagePrioritaire: service.image })}
<body>
${entete(ctx, { claire: !service.image })}
<main id="contenu">
${enTetePage(ctx, { fil: [['Accueil', ctx.racine || './'], ['Prestations', `${ctx.racine}#prestations`], [service.titre, null]], etiquette: `${metier.titre} à ${v.ville} et ${v.dansDepartement}`, h1: service.titre, accroche: service.accroche || '', img: service.image, illustration: service.illustration })}
<section class="section">
<div class="conteneur deux-colonnes">
<div class="prose">
<p class="chapo" data-revele>${service.texte}</p>
${(service.paragraphes || []).map((p) => html`<p data-revele>${remplir(p, v)}</p>`)}
${(service.points || []).length ? html`<h2 data-revele>Ce que comprend cette prestation</h2>
<ul class="liste-points" style="list-style:none;padding:0" data-revele>${service.points.map((p) => html`<li>${icone('check', { taille: 20 })}<span>${p}</span></li>`)}</ul>` : ''}
</div>
${encartContact(ctx)}
</div>
</section>
${sectionRealisations(ctx, { liste: liees, titreSection: 'Chantiers de ce type', id: 'realisations' })}
${autresPrestations(ctx, service.id)}
</main>
${fin(ctx, { visionneuse: liees.length > 0 })}`.toString();
}

export function pageLocale(ctx, page) {
  const { metier, client } = ctx;
  const e = client.entreprise;
  const v = { ...ctx.v, commune: page.commune };
  const modele = metier.pageLocale;
  const surPlace = ctx.realisations.filter((r) => r.lieu === page.commune);
  const paragraphes = modele.signature || [];
  const description = `${metier.titre} à ${page.commune} : ${e.nom} intervient pour vos travaux de ${metier.activite}. Demandez votre devis.`;
  return html`${tete(ctx, { titre: `${metier.titre} à ${page.commune} — ${e.nom}`, description, chemin: page.chemin, donnees: [filAriane(ctx, [['Accueil', ''], [page.titre, page.chemin]])] })}
<body>
${entete(ctx, { claire: true })}
<main id="contenu">
${enTetePage(ctx, { fil: [['Accueil', ctx.racine || './'], ['Zone d\'intervention', `${ctx.racine}#zone`], [page.commune, null]], etiquette: e.nom, h1: remplir(modele.titre, v), accroche: remplir(modele.intro, v) })}
<section class="section">
<div class="conteneur deux-colonnes">
<div class="prose">
${paragraphes.map((p, i) => html`<p${brut(i === 0 ? ' class="chapo"' : '')} data-revele>${remplir(p, v)}</p>`)}
<h2 data-revele>Nos prestations à ${page.commune}</h2>
<ul class="liste-points" style="list-style:none;padding:0" data-revele>${ctx.services.map((s) => html`<li>${icone('check', { taille: 20 })}<span>${s.page ? html`<a href="${ctx.racine}${s.page.chemin}">${s.titre}</a>` : s.titre}</span></li>`)}</ul>
</div>
${encartContact(ctx)}
</div>
</section>
${sectionRealisations(ctx, { liste: surPlace, titreSection: `Nos chantiers à ${page.commune}`, id: 'realisations' })}
</main>
${fin(ctx, { visionneuse: surPlace.length > 0 })}`.toString();
}

function pageTexte(ctx, { titrePage, h1, chemin, accroche = '', corps }) {
  const e = ctx.client.entreprise;
  return html`${tete(ctx, { titre: `${titrePage} — ${e.nom}`, description: `${titrePage} du site de ${e.nom}.`, chemin })}
<body>
${entete(ctx, { claire: true })}
<main id="contenu">
${enTetePage(ctx, { fil: [['Accueil', ctx.racine || './'], [h1, null]], etiquette: e.nom, h1, accroche, actions: false })}
<section class="section"><div class="conteneur"><div class="prose">
${corps}
</div></div></section>
</main>
${fin(ctx)}`.toString();
}

export function pageMentions(ctx) {
  return pageTexte(ctx, { titrePage: 'Mentions légales', h1: 'Mentions légales', chemin: 'mentions-legales/', corps: corpsMentions(ctx) });
}

export function pageConfidentialite(ctx) {
  return pageTexte(ctx, { titrePage: 'Politique de confidentialité', h1: 'Politique de confidentialité', chemin: 'confidentialite/', accroche: 'Ce site ne dépose aucun cookie publicitaire et ne suit pas votre navigation.', corps: corpsConfidentialite(ctx) });
}

export function page404(ctx) {
  const e = ctx.client.entreprise;
  return html`${tete(ctx, { titre: `Page introuvable — ${e.nom}`, description: 'Cette page n\'existe pas.', chemin: '404.html' })}
<body>
${entete(ctx, { claire: true })}
<main id="contenu">
<div class="page-tete page-tete-simple" style="min-height:70vh"><div class="conteneur">
<p class="etiquette">Erreur 404</p>
<h1>Page introuvable</h1>
<p class="accroche" style="color:var(--pierre)">Cette page n'existe pas ou a été déplacée.</p>
<div class="hero-actions"><a class="bouton bouton-plein" href="${ctx.racine || './'}">Retour à l'accueil ${fleche()}</a></div>
</div></div>
</main>
${pied(ctx)}
<script src="${ctx.racine}${ctx.jsHref}" defer></script>
</body>
</html>`.toString();
}

/** Page unique affichée quand un abonnement est suspendu. Elle garde le téléphone de l'artisan. */
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
<body>
<main>
<div class="page-tete page-tete-simple" style="min-height:100vh;display:flex;align-items:center"><div class="conteneur" style="padding-top:60px">
<p class="etiquette">${e.nom}</p>
<h1>Site momentanément indisponible</h1>
<p class="accroche" style="color:var(--pierre)">Vous pouvez joindre l'entreprise directement par téléphone.</p>
<div class="hero-actions"><a class="bouton bouton-plein" href="tel:${telLien(numero)}">${icone('telephone', { taille: 18 })} ${numero}</a></div>
</div></div>
</main>
</body>
</html>`.toString();
}
