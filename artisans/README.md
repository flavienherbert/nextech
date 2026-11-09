# Sites pour artisans — tableau de bord

Abonnement « visibilité locale » pour artisans du bâtiment, en commençant par les maçons du Calvados. Ce dossier contient l'offre, l'outil qui fabrique les sites, la prospection, la gestion des clients et le cadre juridique.

## Par où commencer

| Tu veux… | Ouvre |
|---|---|
| Voir la démonstration | `apercus/demo-macon-calvados.html` (double-clic) ou les images de `apercus/` |
| Connaître l'offre et les prix | `docs/1-offre.md` |
| Fabriquer un site ou une démonstration | `docs/2-production.md` |
| Trouver des artisans et leur écrire | `docs/3-prospection.md` |
| Encaisser, mettre en ligne, résilier | `docs/4-gestion-clients.md` |
| Savoir ce qui est permis | `docs/5-juridique.md` |
| Relire l'étude de marché | `../docs/etude-opportunites-2026-11.md` |

## Où en est-on

| Étape | État | Reste à faire |
|---|---|---|
| 1. Offre commerciale | Terminée | Valider le nom de la marque |
| 2. Démonstration maçon du Calvados | Terminée, avec 8 photos d'illustration libres de droits, contrôlée sur ordinateur et téléphone | La mettre en ligne sur ton nom de domaine |
| 3. Système de production | Terminé, 16 tests automatiques au vert | Écrire d'autres métiers quand il le faudra |
| 4. Prospection | Méthode, messages, objections et suivi rédigés | Essayer le script de liste chez toi ; aucun message envoyé |
| 5. Gestion des clients | Procédures et modèles rédigés | Régler Stripe et Cloudflare (tes comptes) |
| 6. Juridique | Règles vérifiées par recherche, modèles rédigés | Trois points à faire valider (fin de `docs/5-juridique.md`) |

## Ce qui dépend de toi avant le premier message

1. Relire ton contrat de travail.
2. Créer la micro-entreprise et obtenir le SIRET.
3. Choisir le nom de la marque et acheter le nom de domaine (environ 10 €).
4. Remplir `studio/marque.json` : prénom, email, rubrique `editeur`.
5. Mettre la page d'offre en ligne (`docs/4-gestion-clients.md`, « Mise en place initiale »).

## Les commandes

Depuis `studio/` :

```powershell
npm install
npm run demo -- "Maçonnerie Dupont" "Bayeux" "02 31 00 00 00"
npm run build
npm run prospects
npm test
```

## Organisation des fichiers

```
artisans/
  README.md                 ce tableau de bord
  docs/                     les cinq guides et les modèles de suivi
  apercus/                  captures et aperçu de la démonstration
  studio/
    marque.json             ta marque, tes prix, tes liens de paiement
    metiers/                un fichier par métier (textes, prestations, questions)
    clients/                une fiche par client ou par démonstration
    photos/                 photos d'illustration par métier
    contenus/               conditions générales
    donnees/                communes du Calvados
    src/                    gabarits des pages, style, script
    outils/prospects.mjs    liste de prospects depuis l'annuaire des entreprises
    build.mjs               le générateur
    nouveau.mjs             création d'une démonstration en une commande
    tests/                  tests automatiques
    dist/                   résultat généré (non enregistré dans GitHub)
```
