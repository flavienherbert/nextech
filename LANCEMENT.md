# LANCEMENT — état réel au 22 novembre 2026

Aucune vente réelle, aucun encaissement, aucune publication commerciale, personne contacté, **0 € dépensé**. Stripe est en mode test. Le site en ligne (https://studio-accroche-preprod.netlify.app) est une préproduction : il n'est pas référencé par les moteurs de recherche.

Ce document est la seule page à lire pour savoir où on en est. Le détail technique est dans `site/` ; le suivi des commandes au quotidien dans `site/MODE-EMPLOI.md` ; la production des vidéos dans `production/HIGGSFIELD.md`.

---

## A. Ce qui est terminé

**Le site**
- Accueil, formules à 35 / 89 / 169 € (décidées le 22 novembre 2026 ; prix ComeUp et Fiverr : `commercial/GRILLES-ET-PLATEFORMES.md`), FAQ, pages légales, affichage ordinateur et mobile, bandeau de préproduction tant que les paiements réels sont fermés.
- Accueil et pages légales servies depuis un cache (renouvelé toutes les 15 minutes) : plus rapide pour les visiteurs, presque aucun calcul facturé par Netlify.
- **Images et vidéos remplaçables sans toucher au code** : Administration → *Images et vidéos*. 30 emplacements (couverture, vidéo de démonstration, six exemples, quatre temps, visuels des formules, fond, vignette de partage). Chaque envoi est contrôlé (type réel, signature, poids), les images lourdes sont réduites automatiquement, un retour à l'image d'origine est possible. Guide : `site/MEDIAS.md`.

**Le parcours client, de la commande à la clôture**
- Commande → paiement Stripe → confirmation signée par le webhook → brief (site internet facultatif) et photos → **script envoyé au client pour accord** (promis par les conditions de vente, désormais outillé : bouton dans la commande, accord exigé avant de démarrer) → production → livraison par liens privés → correction ou validation (14 jours pour répondre, puis clôture automatique et refus des retouches tardives) → facture PDF numérotée → clôture.
- Onze e-mails automatiques au client et à vous, plus le script (`site/EMAILS.md`). Un e-mail qui ne part pas est conservé, signalé sur le téléphone et renvoyé d'un clic, sans doublon.

**L'administration** (`/admin`)
- Tableau de bord par catégories, recherche, panneau « Prochaine étape », **fiche de production** à copier, livrables, corrections, e-mails, réglages e-mail, diagnostic, **liste de lancement** automatique, images et vidéos.
- Notification de chaque commande payée sur le téléphone (ntfy, sans donnée personnelle) et par e-mail ; récapitulatif et relance quotidiens.

**La production vidéo** : procédure Higgsfield complète, formats, coûts relevés, contrôle qualité, modèles de messages. **Rien n'est automatisé entre le site et Higgsfield** : vous générez, vous contrôlez, vous déposez (`production/HIGGSFIELD.md`, section 0).

**Sécurité et qualité** : 0 vulnérabilité (`npm audit`), secrets séparés par usage, politique de contenu stricte, limiteur de connexion partagé, fichiers privés, médias publics isolés des fichiers des clients, aucun secret dans le dépôt. **Tests du 22 novembre** : 172/172 tests ciblés dans chaque mode de stockage, parcours complet dans le navigateur 185/185 (disque), 185/185 (PostgreSQL + disque), 184/184 (PostgreSQL + S3), médias 33/33 dans les trois, politique de sécurité 31/31 (détail : `site/TESTS.md`). Ces tests sont **locaux** : ils ne prouvent pas le comportement en ligne.

## B. Ce qui reste bloqué (Netlify, Google, vos accès)

| Blocage | Conséquence | Qui peut le lever |
|---|---|---|
| **Netlify : crédits de l'offre gratuite épuisés** (300 par mois, 15 par déploiement) | **Rien n'est publié depuis le 16 novembre.** Tout le travail récent (réglages e-mail, tri des e-mails, médias, script, liste de lancement, procédure) est prêt et poussé sur la branche, mais le site en ligne affiche encore l'ancienne version. | Vous : attendre la remise à zéro (gratuit), acheter des crédits, ou changer d'hébergeur. Je ne lance aucun déploiement avant votre accord **et** la fin de ce blocage. |
| **Google : « 535 BadCredentials »** sur le Gmail du studio | Aucun e-mail réel ne part (clients ni vous). Le site les conserve et les renverra. | Vous : recréer le mot de passe d'application avec le bon compte (`site/MISE-EN-LIGNE.md`, bloc A). Après le déploiement, il se saisit dans *Administration → Réglages e-mail*, sans redéploiement. |
| **Brevo : restriction d'adresses IP** | La voie de secours Brevo est refusée depuis Netlify. | Vous (réglage Brevo « Authorized IPs »), **non touché à votre demande**. Gmail suffit. |
| **Paiement Stripe depuis mon environnement** | Je ne peux pas passer moi-même un paiement de test en ligne. | Vous payez une commande de test avec une carte de test (`site/TEST-CLIENT.md`). |
| **Higgsfield : le compte relié à Claude a 0 crédit (offre gratuite)** | Aucune génération possible tant que vous n'avez pas d'abonnement. Rien n'est souscrit à votre place. | Vous. |

## C. Les seules actions qui restent pour vous, dans l'ordre

0. **Tarifs, tours de retouches et durée : décidés le 22 novembre 2026** (35 / 89 / 169 €, tours 1 / 2 / 2, 15 secondes maximum par vidéo). Le correctif est prêt et testé ; il n'est appliqué au site qu'après votre validation (`RAPPORT-MODIFICATIONS.md`). L'audit de la vente et de la livraison est dans `site/AUDIT-VENTE-LIVRAISON.md`.
1. **Décider pour Netlify** (attendre la remise à zéro, acheter des crédits, ou autre) : c'est ce qui permet de publier tout le reste. Une seule publication suffira.
2. **Remplacer les trois secrets exposés** (mot de passe administrateur, `SESSION_SECRET`, `TACHES_SECRET`) : `site/ROTATION-SECRETS.md`, une dizaine de minutes. Fait avant l'ouverture, pas après.
3. **Recréer le mot de passe d'application Gmail** et le saisir dans *Administration → Réglages e-mail* (après la publication).
4. **Prendre votre abonnement Higgsfield** (lire les droits d'usage commercial) et suivre `production/HIGGSFIELD.md` § 1 : une commande à blanc complète avant la première vraie.
5. **Ajouter votre vidéo d'exemple** : déposez-la dans `site/public/videos/exemple.mp4` (avec `exemple-apercu.jpg`), puis `SHOW_EXAMPLE_VIDEO=true` dans Netlify. Tant que ce n'est pas fait, la section est masquée (plus d'exemple d'un autre studio). Vous pouvez aussi remplacer les images et ajouter trois exemples dans *Administration → Images et vidéos*.
6. **Passer un test complet de commande** : `site/TEST-CLIENT.md` (carte de test Stripe).
7. **Compte Stripe réel** : activation (identité, IBAN), clé réelle et webhook réel dans Netlify.
8. **Informations légales** : SIRET, adresse, médiateur si vous vendez à des particuliers, relecture des conditions de vente (`site/MISE-EN-LIGNE.md`).
9. **Donner le feu vert** : `VENTES_REELLES=oui`, puis `SITE_ENV=production` (ouvre l'indexation et retire le bandeau de préproduction). Votre page *Administration → Lancement* dit, case par case, ce qui reste.

Tant que ces points ne sont pas faits, le site refuse d'encaisser de vrais paiements : c'est voulu.

---

## Ce qui est vérifiable à tout moment

| Où | Quoi |
|---|---|
| `/admin/lancement` | Ce qui bloque l'ouverture, contrôlé automatiquement, et vos vérifications à cocher |
| `/admin/diagnostic` | Base, stockage, e-mails, factures, notification de test |
| `site/TESTS.md` | Lancer les tests en local |

## Ce qui n'a jamais été fait (honnêteté)

- Aucun paiement réel, aucune facture réelle (seulement des spécimens), aucun client réel.
- L'envoi d'e-mails réels n'a **jamais** abouti en ligne (Google, Brevo).
- Les conditions de vente et les mentions légales n'ont pas été relues par un juriste.
- La rentabilité de la production dépend du prix réel de votre crédit Higgsfield et du temps passé : `production/HIGGSFIELD.md` § 2 donne la méthode, pas la réponse.
- Le premier acheteur est à trouver : `commercial/` contient 25 prospects et 8 messages, rien n'a été envoyé.
- L'historique Git contient encore d'anciens fichiers volumineux (`.whl`) : sans effet sur le site, purge possible sur votre demande (elle réécrit l'historique).
