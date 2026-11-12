// Script du gabarit « signature ».
// 1. Fonctions utiles : en-tête, menu, visionneuse de photos, formulaire. Elles marchent sans bibliothèque.
// 2. Animations : GSAP + ScrollTrigger sur grand écran, simples apparitions sur téléphone,
//    rien du tout si la personne a demandé moins de mouvement dans ses réglages.
// Sans ce script, le site reste entièrement lisible.
(function () {
  'use strict';

  var script = document.currentScript;
  var racine = document.documentElement;
  var reduit = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- En-tête : fond au défilement, masquage en descendant ---------- */
  var entete = document.querySelector('[data-entete]');
  var bandeau = document.querySelector('.bandeau-demo');
  var barre = document.querySelector('[data-barre]');
  var dernier = window.scrollY;
  var enAttente = false;

  function majDefilement() {
    enAttente = false;
    var y = window.scrollY;
    var seuil = (bandeau ? bandeau.offsetHeight : 0) + 40;
    if (entete) {
      entete.classList.toggle('est-solide', y > seuil);
      var descend = y > dernier && y > 700;
      var occupe = racine.classList.contains('menu-ouvert') || entete.contains(document.activeElement);
      entete.classList.toggle('est-masquee', descend && !occupe);
    }
    if (barre) {
      var visible = y > window.innerHeight * 0.6;
      barre.classList.toggle('est-visible', visible);
      document.body.classList.toggle('avec-barre', visible);
    }
    dernier = y;
  }
  window.addEventListener('scroll', function () {
    if (!enAttente) { enAttente = true; window.requestAnimationFrame(majDefilement); }
  }, { passive: true });
  majDefilement();

  /* ---------- Menu plein écran ---------- */
  var bascule = document.querySelector('.bascule-menu');
  var menu = document.querySelector('[data-menu]');
  function ouvrirMenu(ouvert) {
    racine.classList.toggle('menu-ouvert', ouvert);
    bascule.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
    if (ouvert) {
      var premier = menu.querySelector('a, button');
      if (premier) premier.focus();
    } else {
      bascule.focus();
    }
  }
  if (bascule && menu) {
    bascule.addEventListener('click', function () { ouvrirMenu(true); });
    menu.querySelector('[data-menu-fermer]').addEventListener('click', function () { ouvrirMenu(false); });
    menu.querySelectorAll('a').forEach(function (lien) {
      lien.addEventListener('click', function () { racine.classList.remove('menu-ouvert'); bascule.setAttribute('aria-expanded', 'false'); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && racine.classList.contains('menu-ouvert')) ouvrirMenu(false);
    });
  }

  /* ---------- Visionneuse de photos ---------- */
  var visionneuse = document.querySelector('[data-visionneuse]');
  var photos = Array.prototype.slice.call(document.querySelectorAll('[data-photo]'));
  if (visionneuse && photos.length && typeof visionneuse.showModal === 'function') {
    var grande = visionneuse.querySelector('[data-visionneuse-image]');
    var vTitre = visionneuse.querySelector('[data-visionneuse-titre]');
    var vTexte = visionneuse.querySelector('[data-visionneuse-texte]');
    var compteur = visionneuse.querySelector('[data-visionneuse-compteur]');
    var courant = 0;

    var montrer = function (i) {
      courant = (i + photos.length) % photos.length;
      var p = photos[courant];
      var miniature = p.querySelector('img');
      grande.src = p.getAttribute('data-grand') || (miniature ? (miniature.currentSrc || miniature.src) : '');
      grande.alt = p.getAttribute('data-titre');
      vTitre.textContent = p.getAttribute('data-titre');
      vTexte.textContent = [p.getAttribute('data-legende'), p.getAttribute('data-description')].filter(Boolean).join(' — ');
      compteur.textContent = (courant + 1) + ' / ' + photos.length;
    };
    photos.forEach(function (p, i) {
      p.addEventListener('click', function () { montrer(i); visionneuse.showModal(); });
    });
    visionneuse.querySelector('[data-visionneuse-fermer]').addEventListener('click', function () { visionneuse.close(); });
    visionneuse.querySelector('[data-visionneuse-precedent]').addEventListener('click', function () { montrer(courant - 1); });
    visionneuse.querySelector('[data-visionneuse-suivant]').addEventListener('click', function () { montrer(courant + 1); });
    visionneuse.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') montrer(courant - 1);
      if (e.key === 'ArrowRight') montrer(courant + 1);
    });
    // Un clic en dehors de la photo et des boutons referme la visionneuse.
    visionneuse.addEventListener('click', function (e) {
      if (e.target === visionneuse || e.target.classList.contains('visionneuse-image') || e.target.classList.contains('visionneuse-corps')) visionneuse.close();
    });
  } else {
    // Navigateur trop ancien pour la visionneuse : la photo s'ouvre simplement dans un nouvel onglet.
    photos.forEach(function (p) {
      p.addEventListener('click', function () { if (p.getAttribute('data-grand')) window.open(p.getAttribute('data-grand'), '_blank', 'noopener'); });
    });
  }

  /* ---------- Formulaire de demande de devis ---------- */
  var formulaire = document.querySelector('form[data-formulaire]');
  if (formulaire) {
    var message = formulaire.querySelector('.message-formulaire');
    var bouton = formulaire.querySelector('button[type="submit"]');
    var libelle = bouton ? bouton.innerHTML : '';
    var mode = formulaire.getAttribute('data-formulaire');
    var afficher = function (texte) {
      message.textContent = texte;
      message.hidden = false;
      message.focus();
    };
    formulaire.addEventListener('submit', function (evenement) {
      // Démonstration : rien n'est envoyé, et on le dit.
      if (mode === 'demo') {
        evenement.preventDefault();
        afficher('Ceci est une démonstration : aucun message n\'a été envoyé. Sur le site en ligne, la demande arrive directement dans la boîte e-mail de l\'entreprise.');
        return;
      }
      if (!window.fetch || !window.FormData) return; // envoi classique du navigateur
      evenement.preventDefault();
      var donnees = new FormData(formulaire);
      if (donnees.get('site_web')) return; // champ piège rempli par un robot
      bouton.disabled = true;
      bouton.textContent = 'Envoi en cours…';
      fetch(formulaire.action, { method: 'POST', body: donnees, headers: { Accept: 'application/json' } })
        .then(function (reponse) {
          if (!reponse.ok) throw new Error('refus');
          formulaire.reset();
          afficher('Merci, votre demande est bien partie. Nous reviendrons vers vous pour échanger sur votre projet.');
        })
        .catch(function () {
          afficher('L\'envoi n\'a pas fonctionné. Vous pouvez nous appeler directement, nous vous répondrons.');
        })
        .then(function () { bouton.disabled = false; bouton.innerHTML = libelle; });
    });
  }

  /* ---------- Animations ---------- */
  function terminer(classe) {
    racine.classList.remove('anim-attente', 'anim-simple');
    if (classe) racine.classList.add(classe);
    window.__animPret = true;
  }

  // Téléphone, ou secours si GSAP ne se charge pas : simples apparitions.
  function animerSimplement() {
    if (!('IntersectionObserver' in window)) { terminer(''); return; }
    terminer('anim-simple');
    var observateur = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (entree) {
        if (entree.isIntersecting) { entree.target.classList.add('est-visible'); observateur.unobserve(entree.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    document.querySelectorAll('[data-revele]').forEach(function (el) { observateur.observe(el); });
  }

  function charger(src) {
    return new Promise(function (resoudre, rejeter) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resoudre;
      s.onerror = rejeter;
      document.head.appendChild(s);
    });
  }

  function animerAvecGsap() {
    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ ease: 'power3.out' });

    // Titres : les mots montent l'un après l'autre.
    gsap.utils.toArray('[data-titre]').forEach(function (titre) {
      var mots = titre.querySelectorAll('.mot-i');
      gsap.set(mots, { yPercent: 112 });
      ScrollTrigger.create({
        trigger: titre, start: 'top 90%', once: true,
        onEnter: function () { gsap.to(mots, { yPercent: 0, duration: 1.15, ease: 'power4.out', stagger: 0.05 }); }
      });
    });

    // Blocs de texte et cartes : apparition groupée, légèrement décalée.
    var blocs = gsap.utils.toArray('[data-revele]:not([data-revele="image"])');
    gsap.set(blocs, { autoAlpha: 0, y: 36 });
    ScrollTrigger.batch(blocs, {
      start: 'top 92%', once: true,
      onEnter: function (lot) { gsap.to(lot, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.09, overwrite: true }); }
    });

    // Photos : le cadre se découvre de bas en haut pendant que l'image se pose.
    gsap.utils.toArray('[data-revele="image"]').forEach(function (bloc) {
      var cadre = bloc.querySelector('.cadre') || bloc;
      var interieur = bloc.querySelector('.cadre-interieur');
      var repos = cadre.hasAttribute('data-parallaxe') ? 1.16 : 1;
      gsap.set(cadre, { clipPath: 'inset(100% 0% 0% 0%)' });
      if (interieur) gsap.set(interieur, { scale: repos + 0.2 });
      ScrollTrigger.create({
        trigger: bloc, start: 'top 90%', once: true,
        onEnter: function () {
          gsap.to(cadre, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'power4.out' });
          if (interieur) gsap.to(interieur, { scale: repos, duration: 1.8 });
        }
      });
    });

    // Déplacement lent des photos pendant le défilement.
    gsap.utils.toArray('[data-parallaxe]').forEach(function (cadre) {
      var interieur = cadre.querySelector('.cadre-interieur');
      if (!interieur) return;
      if (!cadre.closest('[data-revele="image"]')) gsap.set(interieur, { scale: 1.16 });
      gsap.fromTo(interieur, { yPercent: -6 }, {
        yPercent: 6, ease: 'none',
        scrollTrigger: { trigger: cadre, start: 'top bottom', end: 'bottom top', scrub: 0.6 }
      });
    });

    // Grande photo du haut de page : elle recule doucement, le texte s'efface.
    gsap.utils.toArray('[data-hero-media]').forEach(function (media) {
      gsap.to(media, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: media.parentElement, start: 'top top', end: 'bottom top', scrub: true } });
    });
    var contenuHero = document.querySelector('[data-hero-contenu]');
    if (contenuHero) {
      gsap.to(contenuHero, { autoAlpha: 0, y: -70, ease: 'none', scrollTrigger: { trigger: contenuHero.parentElement, start: '18% top', end: '78% top', scrub: true } });
    }

    // Méthode : le trait d'avancement se remplit au fil des étapes.
    var etapes = document.querySelector('[data-etapes]');
    var progression = document.querySelector('[data-etapes-progression]');
    if (etapes && progression) {
      gsap.fromTo(progression, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: etapes, start: 'top 72%', end: 'bottom 62%', scrub: 0.5 } });
    }

    terminer('anim-gsap');
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }

  if (reduit) { terminer(''); return; }
  var grandEcran = window.matchMedia('(min-width: 900px)').matches;
  if (grandEcran && script && script.getAttribute('data-gsap')) {
    charger(script.getAttribute('data-gsap'))
      .then(function () { return charger(script.getAttribute('data-defilement')); })
      .then(animerAvecGsap)
      .catch(animerSimplement);
  } else {
    animerSimplement();
  }
})();
