# 4. Gérer les clients

De la commande à la résiliation. Les réglages décrits ici sont à faire par toi : ils demandent tes comptes et, pour certains, une dépense soumise à ton accord.

Les prix et les fonctions des services tiers cités viennent de ma connaissance générale et de recherches partielles. Ils sont marqués **[à vérifier]** : contrôle-les sur le site du service avant de t'engager.

## Vue d'ensemble

| Besoin | Outil retenu | Coût | Pourquoi |
|---|---|---|---|
| Paiement et abonnements | Stripe | Environ 1 à 1,20 € par mois et par client **[à vérifier]** | Tu l'utilises déjà ; factures et résiliation en ligne incluses |
| Hébergement des sites | Cloudflare Pages | 0 € **[à vérifier]** | Gratuit, usage commercial autorisé, https automatique |
| Noms de domaine | Un bureau d'enregistrement français (OVH par exemple) | Environ 8 à 12 € par an et par domaine **[à vérifier]** | Permet d'inscrire le client comme titulaire |
| Adresse contact@domaine | Renvoi d'emails de Cloudflare | 0 € **[à vérifier]** | Renvoie vers la boîte actuelle du client |
| Formulaire de devis | Web3Forms (ou Formspree) | 0 € jusqu'à environ 250 messages par mois **[à vérifier]** | Le message arrive directement chez l'artisan |
| Mesure d'audience | Statistiques de Cloudflare | 0 € | Sans cookie, donc sans bandeau |
| Suivi des clients | Un tableur (`docs/modeles/suivi-clients.csv`) | 0 € | Suffisant jusqu'à 80 clients |

Hébergement : Vercel est exclu, car son offre gratuite interdit l'usage commercial.

## Mise en place initiale (une fois, 2 à 3 heures)

### 1. Stripe

Préalable : avoir ton SIRET.

1. Renseigne ton entreprise dans Stripe : nom précédé ou suivi de « EI », adresse, SIRET.
2. Crée deux produits, chacun avec deux tarifs récurrents :
   - Site Pro : 39 € par mois, 390 € par an.
   - Visibilité : 59 € par mois, 590 € par an.
3. Crée un lien de paiement par tarif (4 liens). Colle-les dans `studio/marque.json`, champs `lienPaiementMensuel` et `lienPaiementAnnuel`.
4. Active le portail client, avec la résiliation « à la fin de la période de facturation ». Note le lien de connexion au portail : c'est lui que tu donnes aux clients pour résilier ou changer de carte.
5. Active les relances automatiques des paiements échoués.
6. Dans le modèle de facture, ajoute en pied de page : « TVA non applicable, article 293 B du CGI » et les mentions de retard de paiement (voir `5-juridique.md`).
7. Active le prélèvement SEPA en plus de la carte : les frais sont plus faibles et il n'expire pas.

### 2. Cloudflare

1. Crée un compte gratuit.
2. Crée un projet Pages nommé d'après ta marque, par envoi direct de fichiers : glisse le dossier `studio/dist/vitrine`.
3. Rattache ton nom de domaine à ce projet.
4. À chaque nouvelle démonstration : `npm run build`, puis renvoie le dossier `dist/vitrine`.

Les démonstrations sont alors visibles à l'adresse `https://ton-domaine.fr/demo/IDENTIFIANT/`. Elles portent une interdiction d'indexation à trois niveaux : balise dans la page, fichier `robots.txt`, en-tête du serveur.

Plus tard, pour aller plus vite, la commande `npx wrangler pages deploy dist/vitrine --project-name=NOM` fait le même envoi sans passer par le navigateur. Je n'ai pas pu vérifier que Cloudflare propose toujours cette commande à l'identique pour les nouveaux projets : si son tableau de bord te dirige vers « Workers », dis-le-moi et j'adapte.

### 3. Ton adresse d'envoi

Une adresse à ton nom de domaine (par exemple `prenom@ton-domaine.fr`), réservée à la prospection et aux clients.

## Parcours d'un nouveau client

| Étape | Qui | Durée | Détail |
|---|---|---|---|
| 1. Paiement | Client | 2 min | Lien Stripe. Tu reçois une notification. |
| 2. Collecte | Toi | 10 min | Message « Bienvenue » ci-dessous. |
| 3. Nom de domaine | Toi | 15 min | Achat au nom du client, après son paiement. |
| 4. Fiche et photos | Toi | 30 min | Questionnaire en mode « Site en ligne ». |
| 5. Formulaire | Toi | 5 min | Une clé par client, liée à son email. |
| 6. Génération | Toi | 2 min | `npm run build -- IDENTIFIANT` |
| 7. Validation | Client | — | Envoi du lien provisoire. Une série de corrections incluse. |
| 8. Mise en ligne | Toi | 15 min | Projet Pages dédié + domaine + renvoi d'email. |
| 9. Contrôle | Toi | 10 min | Liste ci-dessous. |
| 10. Suivi | Toi | 2 min | Ligne ajoutée dans `suivi-clients.csv`. |

Total : environ 1 h 30 par client, 2 h 30 en formule Visibilité.

### Nom de domaine au nom du client

1. Vérifie avec lui le nom voulu, en `.fr`.
2. Achète-le depuis ton compte, en indiquant le client comme **titulaire** (nom ou raison sociale, adresse, SIRET, son email). Tu es contact technique.
3. Confie la gestion des adresses du domaine à Cloudflare, puis rattache le domaine au projet Pages du client.
4. Note la date de renouvellement dans le suivi.

C'est ce point qui te distingue des prestataires historiques. Ne le contourne jamais.

### Contrôle avant d'annoncer la mise en ligne

- Le site s'ouvre en `https://` avec et sans `www`.
- Le numéro de téléphone est le bon et se compose d'un clic sur téléphone.
- Un message de test envoyé par le formulaire arrive bien chez l'artisan.
- L'adresse `contact@domaine` renvoie bien vers sa boîte.
- Les mentions légales ne contiennent aucun « à compléter ».
- Aucune photo n'est étiquetée « illustration » par erreur.
- La page s'affiche correctement sur un téléphone.

### Formule Visibilité : en plus

1. Fiche Google : l'artisan t'ajoute comme gestionnaire de sa fiche (il reste propriétaire). S'il n'en a pas, il la crée et la valide lui-même, tu le guides.
2. Tu complètes : catégorie principale, prestations, zone desservie, horaires, lien vers le site, 10 photos.
3. Kit avis : lien direct vers le formulaire d'avis, QR code à imprimer, message type à envoyer après chaque chantier.
4. Pages locales : jusqu'à 5 communes dans la fiche, champ `pagesLocales`.
5. Bilan trimestriel : rappel dans ton agenda.

## Messages types

### Bienvenue (après le paiement)

> Bonjour [Monsieur Nom], merci pour votre confiance. Pour mettre votre site en ligne sous 5 jours ouvrés, il me faut :
> 1. Votre numéro SIRET et votre forme juridique.
> 2. L'adresse de votre entreprise et l'email où recevoir les demandes de devis.
> 3. Le nom et l'adresse de votre assureur décennale.
> 4. Le nom de votre médiateur de la consommation, si vous travaillez pour des particuliers.
> 5. Entre 6 et 12 photos de vos chantiers, avec la commune et l'année si vous les avez.
> 6. Le nom de domaine souhaité, par exemple [proposition].fr.
> Vous pouvez tout envoyer en plusieurs messages, depuis votre téléphone.

### Mise en ligne

> Votre site est en ligne : [adresse]. Deux choses utiles :
> - Pour toute modification, répondez simplement à ce message.
> - Pour gérer votre abonnement, changer de carte ou arrêter : [lien du portail].
> Vous êtes couvert par la garantie « satisfait ou remboursé » jusqu'au [date, J+30].

### Paiement échoué (J+3, en complément du message automatique de Stripe)

> Bonjour [Monsieur Nom], le prélèvement de ce mois n'est pas passé, sans doute une carte expirée. Vous pouvez la mettre à jour ici : [lien du portail]. Votre site reste en ligne.

### Résiliation

> Votre demande est bien prise en compte. Votre site reste en ligne jusqu'au [date de fin de période]. Souhaitez-vous récupérer votre nom de domaine ? Si oui, je vous envoie sous 7 jours le code de transfert, gratuitement.

## Modifications et maintenance

**Modifications.** Demande par email, traitée sous 3 jours ouvrés. Tu notes la date dans le suivi pour compter le quota du mois. Au-delà du quota : 19 € l'unité, après accord écrit.

**Chaque mois (30 minutes pour l'ensemble des clients).**

- Ouvrir chaque site, vérifier qu'il s'affiche.
- Regarder dans Stripe les paiements échoués.
- Regarder les noms de domaine qui expirent dans 60 jours.

**Chaque trimestre.**

- Envoyer un message de test par chaque formulaire.
- Bilans de la formule Visibilité.
- Sauvegarde : le dépôt GitHub contient toutes les fiches. Les photos des clients sont dans `studio/clients/`, à sauvegarder aussi.

## Impayés

| Jour | Action |
|---|---|
| J | Échec du prélèvement. Stripe réessaie et prévient le client. |
| J+3 | Ton message personnel. |
| J+10 | Deuxième message, avec la date de suspension. |
| J+15 | Suspension : ajoute `"suspendu": true` dans sa fiche, régénère et remets en ligne. Le site n'affiche plus qu'une page « momentanément indisponible » avec son téléphone. |
| J+30 | Mise hors ligne et résiliation. Le nom de domaine reste au client. |

## Résiliation

1. Le client résilie par le portail ou par email.
2. Le site reste en ligne jusqu'à la fin de la période payée.
3. À cette date : retrait du domaine du projet, suppression du projet Pages.
4. S'il le demande : envoi du code de transfert du domaine sous 7 jours, gratuitement.
5. S'il rachète le site (149 €) : envoi du dossier `dist/clients/IDENTIFIANT` compressé.
6. Passer la fiche en archive (préfixer le fichier d'un `_` : il n'est plus généré).
7. Supprimer ses données qui ne sont plus nécessaires. Les factures se conservent 10 ans.

## Suivi des abonnements

Le fichier `docs/modeles/suivi-clients.csv` contient une ligne par client. Stripe reste la référence pour les montants ; le tableur sert à voir d'un coup d'œil les échéances.

Indicateurs du mois :

| Indicateur | Calcul |
|---|---|
| Revenu mensuel récurrent | Somme des abonnements actifs (un abonnement annuel compte pour un douzième) |
| Nouveaux clients | Lignes créées dans le mois |
| Départs | Résiliations du mois ; taux = départs ÷ clients en début de mois |
| Heures passées | Pour vérifier que l'activité tient dans 5 à 10 h par semaine |

## Capacité

| Clients | Entretien mensuel estimé | Reste pour vendre, sur 30 h par mois |
|---|---|---|
| 13 (500 € par mois) | 3 h | 27 h |
| 26 (1 000 € par mois) | 6 h | 24 h |
| 77 (3 000 € par mois) | 15 à 20 h | 10 à 15 h |

Ces durées sont des hypothèses. À 77 clients, l'entretien prend la moitié de ton temps : c'est le moment d'augmenter les prix des nouveaux clients ou d'automatiser les mises en ligne.

## Dépenses à prévoir, toutes soumises à ton accord

| Poste | Montant | Quand |
|---|---|---|
| Nom de domaine de la marque | Environ 10 € par an | Avant le pilote |
| Adresse email professionnelle | 0 à 7 € par mois | Avant le pilote |
| Nom de domaine d'un client | Environ 10 € par an | Après son premier paiement |
| Assurance responsabilité civile professionnelle | À chiffrer | Recommandée dès le premier client |
