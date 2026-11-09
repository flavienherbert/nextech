# 2. Produire un site : mode d'emploi

Principe : **une fiche client + un métier = un site complet.** On ne repart jamais de zéro. Tout se passe dans le dossier `artisans/studio/`.

| Ce que tu fournis | Où | Ce que le système ajoute tout seul |
|---|---|---|
| Nom, téléphone, ville | `clients/IDENTIFIANT.json` | Prestations, textes, questions fréquentes du métier |
| Photos (facultatif) | `clients/IDENTIFIANT/` | Photos d'illustration du métier, étiquetées comme telles |
| Informations légales (pour la mise en ligne) | la même fiche | Mentions légales, page de confidentialité, plan du site |

## Installation, une seule fois (Windows, PowerShell)

```powershell
winget install OpenJS.NodeJS.LTS     # puis ferme et rouvre PowerShell
cd chemin\vers\nextech\artisans\studio
npm install                          # installe la compression des photos
npm test                             # doit afficher : pass 16, fail 0
```

## Les cinq commandes

| Commande | Effet |
|---|---|
| `npm run demo -- "Maçonnerie Dupont" "Bayeux" "02 31 00 00 00"` | Crée la fiche et génère la démonstration en une fois |
| `npm run build` | Régénère tout : page d'offre, démonstrations, sites clients |
| `npm run build -- dupont-bayeux-4f70` | Régénère un seul site |
| `npm run apercu` | Produit en plus un fichier unique par site dans `dist/apercus/` |
| `npm test` | Vérifie que rien n'est cassé |

Le résultat est dans `dist/` :

- `dist/vitrine/` : ta page d'offre, avec toutes les démonstrations dans `dist/vitrine/demo/`.
- `dist/clients/IDENTIFIANT/` : un dossier par site en production.
- `dist/outils/questionnaire.html` : le questionnaire, à ouvrir d'un double-clic.

## Faire une démonstration pour un prospect (5 minutes)

1. `npm run demo -- "Nom de l'entreprise" "Ville" "Téléphone"`.
2. Ouvre `dist/apercus/IDENTIFIANT.html` pour vérifier.
3. Relis la liste de communes proposée dans la fiche (les distances sont approximatives).
4. Pour aller plus loin, ouvre le questionnaire, clique « Ouvrir une fiche », complète, télécharge, remplace le fichier dans `clients/`, relance le build.

Ce que la démonstration contient et ne contient pas :

- Le nom, le téléphone, la ville et les communes du prospect : oui.
- Sa note Google et son nombre d'avis, si tu les as relevés à la main : oui.
- Ses photos et le texte de ses avis : **non**, tant qu'il ne te les a pas confiés (voir `5-juridique.md`).
- Un bandeau « Maquette privée » et une adresse impossible à deviner : toujours.

## Passer un client en production

Dans sa fiche, à faire avec le questionnaire :

1. Type : « Site en ligne ».
2. Nom de domaine, SIRET, dirigeant, adresse complète, email.
3. Assureur décennale et médiateur de la consommation.
4. Ses photos, déposées dans `clients/IDENTIFIANT/`.
5. Service de formulaire et sa clé.

Le build refuse de générer un site en production s'il manque une information obligatoire ou une photo, et dit laquelle. La mise en ligne est décrite dans `4-gestion-clients.md`.

## Modifier un site existant

1. Ouvre le questionnaire, charge la fiche, change ce qu'il faut, télécharge.
2. Remplace le fichier dans `clients/`.
3. `npm run build -- IDENTIFIANT`, puis remets en ligne le dossier.

Une modification courante (texte, horaire, photo) prend 5 à 10 minutes.

## Ajouter un métier

1. Copie `metiers/macon.json` en `metiers/couvreur.json`.
2. Change `id`, `titre`, `activite`, `nomMetier`, les prestations, les questions fréquentes, les étapes.
3. Choisis un thème de couleurs : `pierre`, `ardoise`, `eau` ou `encre`.
4. Dépose 8 photos d'illustration dans `photos/couvreur/`.
5. `npm run build`. Le nouveau métier apparaît dans le questionnaire.

Comptes 1 à 2 heures par métier, surtout pour écrire des textes justes.

## Changer ton offre ou ta marque

Tout est dans `marque.json` : nom, prix, formules, options, garanties, liens de paiement Stripe. La page d'offre et le bandeau des démonstrations suivent au prochain build.

## Ce que le site généré contient

- Une page d'accueil : présentation, prestations, réalisations, entreprise, étapes, avis, zone, questions, contact.
- Des pages locales (formule Visibilité), les mentions légales, la confidentialité.
- Des données structurées pour Google, un plan du site, les balises de partage.
- Aucun cookie, aucune police ni script chargé depuis un autre site.
- Poids de la page d'accueil hors photos : environ 150 Ko.

## Limites connues

| Limite | Conséquence | Contournement |
|---|---|---|
| Un seul métier livré (maçon) | Les autres métiers sont à écrire | Voir « Ajouter un métier » |
| Photos d'illustration fournies pour le seul métier de maçon | Un nouveau métier sans photos affiche des dessins | Voir `studio/photos/LISEZ-MOI.md` |
| Liste de communes limitée au Calvados | Hors Calvados, saisir les communes à la main | Créer un fichier de données par département |
| Pas d'espace client | Les modifications passent par toi | Voulu : c'est le service vendu |
| Formulaire dépendant d'un service tiers | Voir `4-gestion-clients.md` | Site sans formulaire possible (téléphone et email) |
