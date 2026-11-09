// Script minimal du site : menu sur téléphone et envoi du formulaire.
// Le site reste entièrement lisible et utilisable si ce script ne se charge pas.
(function () {
  'use strict';

  // --- Menu sur téléphone ---
  var entete = document.querySelector('.entete');
  var bascule = document.querySelector('.bascule-menu');
  if (entete && bascule) {
    bascule.addEventListener('click', function () {
      var ouvert = entete.classList.toggle('menu-ouvert');
      bascule.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
    });
    entete.querySelectorAll('.nav a').forEach(function (lien) {
      lien.addEventListener('click', function () {
        entete.classList.remove('menu-ouvert');
        bascule.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // --- Formulaire de demande de devis ---
  var formulaire = document.querySelector('form[data-formulaire]');
  if (!formulaire) return;
  var message = formulaire.querySelector('.message-formulaire');
  var bouton = formulaire.querySelector('button[type="submit"]');
  var mode = formulaire.getAttribute('data-formulaire');

  function afficher(texte) {
    if (!message) return;
    message.textContent = texte;
    message.hidden = false;
    message.focus();
  }

  formulaire.addEventListener('submit', function (evenement) {
    // Démonstration : rien n'est envoyé.
    if (mode === 'demo') {
      evenement.preventDefault();
      afficher('Ceci est une démonstration : aucun message n\'a été envoyé. Sur le site en ligne, la demande arrive directement dans la boîte email de l\'entreprise.');
      return;
    }
    // Sans fetch (très vieux navigateur), on laisse le formulaire s'envoyer normalement.
    if (!window.fetch || !window.FormData) return;

    evenement.preventDefault();
    var donnees = new FormData(formulaire);
    if (donnees.get('site_web')) return; // champ piège rempli par un robot
    if (bouton) { bouton.disabled = true; bouton.textContent = 'Envoi en cours…'; }

    fetch(formulaire.action, { method: 'POST', body: donnees, headers: { Accept: 'application/json' } })
      .then(function (reponse) {
        if (!reponse.ok) throw new Error('refus');
        formulaire.reset();
        afficher('Merci, votre demande est bien partie. Nous vous rappelons sous 24 heures ouvrées.');
      })
      .catch(function () {
        afficher('L\'envoi n\'a pas fonctionné. Vous pouvez nous appeler directement, nous vous répondrons tout de suite.');
      })
      .then(function () {
        if (bouton) { bouton.disabled = false; bouton.textContent = 'Envoyer ma demande'; }
      });
  });
})();
