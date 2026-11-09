// Gabarits de TA page d'offre (le site de ta marque) : accueil, mentions légales, conditions générales.
import { html, brut, echapper } from './outils.mjs';
import { icone } from './icones.mjs';

function tete(ctx, { titre, description, indexable = true }) {
  return html`<!doctype html>
<html lang="fr" data-theme="encre">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titre}</title>
<meta name="description" content="${description}">
${indexable && ctx.marque.adresseSite ? '' : brut('<meta name="robots" content="noindex, nofollow">')}
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${titre}">
<meta property="og:description" content="${description}">
<meta name="theme-color" content="#17191c">
<link rel="icon" href="${ctx.racine}assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="${ctx.racine}assets/polices/barlow-condensed-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${ctx.racine}${ctx.cssHref}">
<noscript><style>.nav{display:flex!important;flex-wrap:wrap}.bascule-menu{display:none!important}</style></noscript>
</head>`;
}

function entete(ctx) {
  const { marque, racine } = ctx;
  return html`<header class="entete">
<div class="conteneur">
<a class="marque" href="${racine || './'}"><span class="marque-nom">${marque.nom}</span><span class="marque-metier">${marque.slogan}</span></a>
<nav class="nav" id="menu" aria-label="Menu principal">
<a href="${racine}#fonctionnement">Fonctionnement</a>
<a href="${racine}#tarifs">Tarifs</a>
<a href="${racine}#garanties">Garanties</a>
<a href="${racine}#questions">Questions</a>
</nav>
${ctx.cheminDemo ? html`<a class="bouton bouton-plein bouton-petit" href="${racine}${ctx.cheminDemo}">Voir un exemple</a>` : ''}
<button class="bascule-menu" type="button" aria-controls="menu" aria-expanded="false" aria-label="Ouvrir le menu">${icone('menu')}</button>
</div>
</header>`;
}

function pied(ctx) {
  const { marque, racine } = ctx;
  return html`<footer class="pied">
<div class="conteneur">
<div><h3>${marque.nom}</h3><p>${marque.slogan}. Des sites simples, à votre nom, sans engagement.</p></div>
<div><h3>Contact</h3><ul>
${marque.emailContact ? html`<li><a href="mailto:${marque.emailContact}">${marque.emailContact}</a></li>` : html`<li><span class="a-completer">à compléter : email</span></li>`}
${marque.telephone ? html`<li>${marque.telephone}</li>` : ''}
<li>${marque.zone}</li>
</ul></div>
<div><h3>Informations</h3><ul>
<li><a href="${racine}mentions-legales/">Mentions légales</a></li>
<li><a href="${racine}conditions-generales/">Conditions générales</a></li>
</ul></div>
<div class="pied-bas"><span>© ${ctx.annee} ${marque.nom}</span><span>${marque.mentionTva}</span></div>
</div>
</footer>
<script src="${racine}${ctx.jsHref}" defer></script>
</body>
</html>`;
}

function lienAchat(ctx, formule) {
  const { marque } = ctx;
  if (formule.lienPaiementMensuel) return formule.lienPaiementMensuel;
  if (marque.emailContact) return `mailto:${marque.emailContact}?subject=${encodeURIComponent(`Je lance mon site (${formule.nom})`)}`;
  return '#contact';
}

const QUESTIONS = [
  ['Je n\'ai pas le temps de m\'en occuper.', 'C\'est prévu pour. Vous répondez à quelques questions par écrit et vous envoyez vos photos depuis votre téléphone : comptez dix minutes. Nous faisons tout le reste, y compris les mises à jour.'],
  ['Je travaille déjà au bouche-à-oreille.', 'Tant mieux, et le site ne le remplace pas. Mais la personne à qui on vous recommande tape votre nom sur Google avant d\'appeler. Si elle ne trouve rien, ou une fiche vide, une partie de ces appels n\'arrive jamais.'],
  ['J\'ai déjà un site chez un autre prestataire.', 'Regardez la date de fin de votre engagement et le délai de préavis sur votre contrat. Nous reprenons gratuitement vos textes et vos photos et nous calons la mise en ligne sur cette date, pour que vous ne payiez jamais deux fois.'],
  ['Est-ce que le site va m\'apporter des chantiers ?', 'Personne ne peut le garantir honnêtement, et nous ne le faisons pas. Ce que le site fait : vous êtes trouvable, vos réalisations et vos assurances rassurent, et la demande de devis tient en un bouton. Ce qui compte le plus ensuite, ce sont votre fiche Google et vos avis : c\'est l\'objet de la formule Visibilité.'],
  ['À qui appartient le nom de domaine ?', 'À vous. Il est enregistré à votre nom et vous le gardez si vous arrêtez. C\'est écrit dans les conditions générales.'],
  ['Que se passe-t-il si j\'arrête ?', 'Vous arrêtez en ligne, sans frais et sans justification. Le site reste visible jusqu\'à la fin du mois payé, puis votre nom de domaine vous est transféré gratuitement si vous le demandez.'],
  ['Comment se passe le paiement ?', 'Par carte bancaire ou prélèvement, chaque mois, via Stripe. Vous recevez une facture à chaque échéance. Si le site ne vous convient pas dans les 30 jours après sa mise en ligne, vous êtes remboursé.'],
  ['Puis-je modifier mon site ?', 'Oui. Vous nous envoyez la modification par email (un texte, un horaire, des photos) et elle est faite sous trois jours ouvrés. Une modification par mois est incluse en Site Pro, trois en Visibilité.'],
];

export function pageOffre(ctx) {
  const { marque, racine } = ctx;
  const base = marque.formules[0];
  return html`${tete(ctx, { titre: `${marque.nom} — Sites internet pour artisans, ${base.prixMensuel} € par mois sans engagement`, description: `Votre site d'artisan en ligne en ${marque.delaiMiseEnLigneJours} jours, à votre nom, pour ${base.prixMensuel} € par mois. Sans engagement, sans frais de création, nom de domaine à votre nom.` })}
<body class="sans-barre">
${entete(ctx)}
<main>
<section class="offre-hero" aria-labelledby="titre-offre">
<div class="conteneur offre-hero-grille">
<div>
<p class="sur-titre">Sites internet pour artisans · ${marque.zone}</p>
<h1 id="titre-offre">Votre site d'artisan est <em>déjà prêt</em></h1>
<p class="hero-sous">En ligne en ${marque.delaiMiseEnLigneJours} jours, à votre nom, pour ${base.prixMensuel} € par mois. Sans engagement et sans frais de création.</p>
<div class="hero-actions">
${ctx.cheminDemo ? html`<a class="bouton bouton-plein" href="${racine}${ctx.cheminDemo}">Voir un exemple de site ${icone('fleche', { taille: 20 })}</a>` : ''}
<a class="bouton bouton-contour" href="#tarifs">Voir les tarifs</a>
</div>
</div>
${ctx.capture ? html`<div class="fenetre"><div class="fenetre-barre" aria-hidden="true"><span></span><span></span><span></span></div><img src="${racine}assets/img/${ctx.capture}" alt="Exemple de site réalisé pour une entreprise de maçonnerie" width="1280" height="900"></div>` : ''}
</div>
</section>

<section class="section" id="fonctionnement" aria-labelledby="titre-fonctionnement">
<div class="conteneur">
<div class="tete-section"><p class="sur-titre">Fonctionnement</p><h2 id="titre-fonctionnement">Trois étapes, dix minutes de votre temps</h2></div>
<div class="trois">
<div class="carte"><div class="carte-numero">01</div><h3>Vous regardez votre démonstration</h3><p>Nous préparons une maquette de site à votre nom, avec votre métier et votre secteur. Vous la consultez tranquillement, sur votre téléphone.</p></div>
<div class="carte"><div class="carte-numero">02</div><h3>Vous validez</h3><p>Vous réglez le premier mois en ligne, puis vous nous envoyez vos photos et vos informations par simple message.</p></div>
<div class="carte"><div class="carte-numero">03</div><h3>Votre site est en ligne</h3><p>Sous ${marque.delaiMiseEnLigneJours} jours ouvrés, sur un nom de domaine à votre nom. Nous nous occupons ensuite des mises à jour.</p></div>
</div>
</div>
</section>

<section class="section teinte" id="tarifs" aria-labelledby="titre-tarifs">
<div class="conteneur">
<div class="tete-section"><p class="sur-titre">Tarifs</p><h2 id="titre-tarifs">Deux formules, aucun frais caché</h2><p class="chapeau">Pas de frais de création, pas de durée minimale. Vous arrêtez quand vous voulez.</p></div>
<div class="tarifs">
${marque.formules.map((f, i) => html`<div class="tarif${i === 0 ? ' tarif-vedette' : ''}">
${i === 0 ? html`<span class="tarif-badge">Le plus choisi</span>` : ''}
<h3>${f.nom}</h3>
<p class="tarif-resume">${f.resume}</p>
<div class="tarif-prix">${f.prixMensuel} € <small>par mois</small></div>
<p class="tarif-annuel">ou ${f.prixAnnuel} € par an (2 mois offerts)</p>
<ul>${f.inclus.map((x) => html`<li>${icone('check', { taille: 20 })}<span>${x}</span></li>`)}</ul>
<a class="bouton ${i === 0 ? 'bouton-plein' : 'bouton-contour clair'} bouton-large" href="${lienAchat(ctx, f)}">Choisir ${f.nom}</a>
</div>`)}
</div>
<table class="tableau-options">
<caption>Options, si vous en avez besoin</caption>
<tbody>${marque.options.map((o) => html`<tr><td>${o.nom}</td><td>${o.prix}</td></tr>`)}</tbody>
</table>
<p class="mention-prix">${marque.mentionTva} Boutique en ligne, publicité et gestion des réseaux sociaux ne sont pas proposées.</p>
</div>
</section>

<section class="section sombre" id="garanties" aria-labelledby="titre-garanties">
<div class="conteneur">
<div class="tete-section"><p class="sur-titre">Garanties</p><h2 id="titre-garanties">Vous restez libre, du premier au dernier jour</h2></div>
<div class="garanties">${marque.garanties.map((g) => html`<div class="garantie"><h3>${g.titre}</h3><p>${g.texte}</p></div>`)}</div>
</div>
</section>

<section class="section" id="questions" aria-labelledby="titre-questions">
<div class="conteneur">
<div class="tete-section"><p class="sur-titre">Questions fréquentes</p><h2 id="titre-questions">Ce qu'on nous demande le plus souvent</h2></div>
<div class="faq">${QUESTIONS.map(([q, r]) => html`<details><summary>${q} ${icone('plus')}</summary><p>${r}</p></details>`)}</div>
</div>
</section>

<section class="appel-demo section-serree" id="contact" aria-labelledby="titre-contact">
<div class="conteneur">
<div><h2 id="titre-contact">Recevez votre démonstration gratuite</h2><p>Envoyez-nous le nom de votre entreprise et votre commune. Vous recevez un lien vers votre maquette, sans engagement.</p></div>
${marque.emailContact ? html`<a class="bouton bouton-clair" href="mailto:${marque.emailContact}?subject=${encodeURIComponent('Ma démonstration gratuite')}">${icone('mail', { taille: 20 })} ${marque.emailContact}</a>` : html`<span class="a-completer">à compléter : email de contact dans marque.json</span>`}
</div>
</section>
</main>
${pied(ctx)}`.toString();
}

function ouACompleter(valeur, libelle) {
  if (valeur && String(valeur).trim()) return html`${valeur}`;
  return html`<span class="a-completer">à compléter : ${libelle}</span>`;
}

export function pageMentionsOffre(ctx) {
  const { marque } = ctx;
  const ed = marque.editeur;
  return html`${tete(ctx, { titre: `Mentions légales — ${marque.nom}`, description: `Mentions légales de ${marque.nom}.`, indexable: false })}
<body class="sans-barre">
${entete(ctx)}
<main>
<div class="page-titre"><div class="conteneur"><h1>Mentions légales</h1></div></div>
<section class="section"><div class="conteneur"><div class="prose">
<h2>Éditeur du site</h2>
<p><strong>${marque.nom}</strong> est une activité exploitée par ${ouACompleter(ed.nomComplet, 'prénom et nom')}, ${ed.statut}.<br>
Adresse : ${ouACompleter(ed.adresse, 'adresse de l\'entreprise')}<br>
SIRET : ${ouACompleter(ed.siret, 'numéro SIRET')}<br>
Email : ${ouACompleter(marque.emailContact, 'email')}<br>
Directeur de la publication : ${ouACompleter(ed.nomComplet, 'prénom et nom')}.</p>
<p>${marque.mentionTva}</p>
<h2>Hébergement</h2>
<p>${ed.hebergeur}</p>
<h2>Données personnelles</h2>
<p>Ce site ne dépose aucun cookie publicitaire. Les messages que vous nous envoyez servent uniquement à vous répondre et sont conservés trois ans au plus après le dernier échange. Vous pouvez demander l'accès à vos données, leur rectification ou leur suppression, et vous opposer à tout message de notre part, en écrivant à ${ouACompleter(marque.emailContact, 'email')}. Vous pouvez adresser une réclamation à la CNIL (<a href="https://www.cnil.fr" rel="noopener">cnil.fr</a>).</p>
<h2>Vous avez reçu un message de notre part</h2>
<p>Nous écrivons uniquement à des professionnels, au sujet de leur activité. Vos coordonnées professionnelles proviennent de sources publiques : l'annuaire des entreprises de l'État, votre site internet ou votre fiche d'établissement. Elles sont utilisées pour vous présenter notre offre, sur la base de notre intérêt légitime, et conservées trois ans au plus après notre dernier échange. Elles ne sont transmises à personne. Pour ne plus rien recevoir, répondez simplement « stop » : votre demande est prise en compte immédiatement et définitivement.</p>
<h2>Démonstrations</h2>
<p>Les maquettes présentées dans la rubrique « démonstration » ne sont pas référencées par les moteurs de recherche. Une maquette préparée pour une entreprise est retirée sur simple demande de celle-ci.</p>
</div></div></section>
</main>
${pied(ctx)}`.toString();
}

/** Mini-convertisseur Markdown, suffisant pour les conditions générales : titres, paragraphes, listes, gras. */
export function markdownSimple(texte) {
  const gras = (ligne) => echapper(ligne).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\[À COMPLÉTER[^\]]*\]/g, (m) => `<span class="a-completer">${m.slice(1, -1).toLowerCase()}</span>`);
  const blocs = texte.replace(/\r/g, '').split(/\n{2,}/);
  const sortie = [];
  for (const bloc of blocs) {
    const b = bloc.trim();
    if (!b || b.startsWith('<!--')) continue;
    if (b.startsWith('# ')) continue; // le titre principal est déjà affiché dans l'en-tête de page
    if (b.startsWith('## ')) { sortie.push(`<h2>${gras(b.slice(3))}</h2>`); continue; }
    const lignes = b.split('\n');
    if (lignes.every((l) => /^[-*] /.test(l.trim()))) {
      sortie.push(`<ul>${lignes.map((l) => `<li>${gras(l.trim().slice(2))}</li>`).join('')}</ul>`);
      continue;
    }
    sortie.push(`<p>${lignes.map(gras).join('<br>')}</p>`);
  }
  return sortie.join('\n');
}

export function pageConditions(ctx, texteMarkdown) {
  const { marque } = ctx;
  return html`${tete(ctx, { titre: `Conditions générales — ${marque.nom}`, description: `Conditions générales de vente de ${marque.nom}.`, indexable: false })}
<body class="sans-barre">
${entete(ctx)}
<main>
<div class="page-titre"><div class="conteneur"><h1>Conditions générales</h1><p>Abonnement de création et d'hébergement de site internet pour les professionnels.</p></div></div>
<section class="section"><div class="conteneur"><div class="prose">${brut(markdownSimple(texteMarkdown))}</div></div></section>
</main>
${pied(ctx)}`.toString();
}
