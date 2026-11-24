# TODO

L'état et l'ordre sont dans `LANCEMENT.md` (sections B et C). La page `/admin/lancement` du site vérifie ce qui peut l'être automatiquement.

## Vos actions (dans l'ordre)

1. Décider pour Netlify (crédits épuisés) : attendre, acheter des crédits ou changer d'hébergeur.
2. Remplacer les trois secrets exposés : `site/ROTATION-SECRETS.md`.
3. Recréer le mot de passe d'application Gmail, le saisir dans Administration → Réglages e-mail.
4. Prendre l'abonnement Higgsfield, faire une commande à blanc : `production/HIGGSFIELD.md`.
5. Remplacer les images et vidéos de démonstration : Administration → Images et vidéos (`site/MEDIAS.md`).
6. Passer un test complet de commande : `site/TEST-CLIENT.md`.
7. Activer le compte Stripe, ajouter la clé réelle et le webhook réel dans Netlify.
8. Renseigner SIRET, adresse et téléphone (offre réservée aux professionnels : pas de médiateur) ; faire relire les conditions de vente.
9. Poser la question de la date de facturation à un comptable.
10. Feu vert : `VENTES_REELLES=oui`, puis `SITE_ENV=production`.

## Possible sur demande (code)

- [ ] Factures d'avoir en cas de remboursement (non gérées : remboursement depuis Stripe, avoir à la main)
- [ ] Sauvegarde périodique du stockage
- [ ] Purge de l'historique Git (fichiers `.whl` anciens ; réécrit l'historique)
- [ ] Mise à niveau de Next.js 15 → 16 (changement majeur ; rien d'urgent, aucune faille connue)

## Commercial (après mise en ligne et SIRET)

- [ ] Ouvrir à la main les comptes Instagram des 8 prospects prioritaires
- [ ] Revérifier le fait daté de chaque message (Zeste en premier, il expire)
- [ ] Envoyer les messages de `commercial/MESSAGES.md`, un par un
- [ ] Publier les fiches ComeUp et Fiverr
