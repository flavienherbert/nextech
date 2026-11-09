# 5. Le cadre juridique

**À lire d'abord.** Je ne suis pas avocat et ce document ne remplace pas un conseil juridique. Il résume les règles telles qu'elles ressortent de sources consultées le 9 novembre 2026. Les sites officiels (cnil.fr, legifrance, capeb.fr) n'étaient pas accessibles depuis ma session : je me suis appuyé sur des extraits de moteur de recherche. Chaque point porte une étiquette :

- **[officiel]** : extrait d'une source officielle.
- **[secondaire]** : cabinet d'avocats, éditeur ou guide spécialisé, non recoupé sur le texte officiel.
- **[général]** : règle connue de longue date, que je n'ai pas revérifiée ce jour.

Trois points méritent l'avis d'un professionnel avant de dépasser quelques clients. Ils sont listés en fin de document.

## 1. Ton statut

### Ce qu'il faut faire, dans l'ordre

| # | Action | Coût | Remarque |
|---|---|---|---|
| 1 | Relire ton contrat de travail | 0 € | Clause d'exclusivité, de non-concurrence, obligation d'informer l'employeur |
| 2 | Créer la micro-entreprise sur le guichet unique (formalites.entreprises.gouv.fr) | 0 € | Activité à déclarer : « Création et hébergement de sites internet » |
| 3 | Demander l'ACRE à la création | 0 € | Cotisations réduites la première année, conditions modifiées en 2026 **[secondaire, sources contradictoires]** |
| 4 | Ouvrir un compte bancaire séparé | 0 à 10 € par mois | Obligatoire seulement au-delà de 10 000 € de chiffre d'affaires deux années de suite **[général]**, mais plus simple dès le début |
| 5 | Choisir une plateforme pour recevoir tes factures électroniques | Souvent 0 € | Voir section 2 |
| 6 | Désactiver les liens Stripe des ebooks jusqu'au SIRET | 0 € | Tu ne peux pas encaisser sans statut |

### Cumul avec ton emploi

- Le devoir de loyauté s'applique même sans clause : pas d'activité concurrente de ton employeur, pas d'usage de son temps, de son matériel ou de son fichier clients **[officiel, service-public]**.
- Une clause d'exclusivité serait inopposable pendant un an après la création de l'entreprise (article L1222-5 du Code du travail) **[secondaire]**. Les sources divergent sur un renouvellement possible.
- Aucune obligation légale d'informer l'employeur si le contrat ne le prévoit pas, mais plusieurs juristes le recommandent par écrit **[secondaire]**.
- Un arrêt de la Cour de cassation du 14 janvier 2026 rappelle qu'une activité indépendante concurrente peut justifier un licenciement pour faute grave **[secondaire, arrêt non lu]**.

Question à trancher par toi : ton employeur vend-il des sites, de la communication ou des services numériques aux artisans ? Si oui, parle-lui avant de commencer.

### Chiffres du régime en 2026

| Sujet | Valeur | Fiabilité |
|---|---|---|
| Cotisations, prestations de services commerciales ou artisanales (BIC) | 21,2 % du chiffre d'affaires encaissé | **[officiel, via economie.gouv.fr]** |
| Cotisations, prestations libérales (BNC) | 25,6 % | **[officiel, via economie.gouv.fr]** |
| Catégorie de ton activité | Non tranchée par mes sources. La création de sites est souvent classée en libéral (BNC). | **À vérifier sur ton attestation URSSAF** |
| Franchise de TVA, services | 37 500 € (41 250 € en seuil majoré) | **[secondaire, concordant]** |
| Plafond de chiffre d'affaires du régime, services | 83 600 € le plus souvent cité, 77 700 € ailleurs | **[secondaire, contradictoire]** |
| Déclaration du chiffre d'affaires | Chaque mois ou chaque trimestre, même à 0 € | **[général]** |
| Cotisation foncière des entreprises | Exonérée l'année de création | **[général]** |

Dans mes calculs de rentabilité, je retiens le taux le plus élevé (25,6 %) par prudence.

## 2. La facturation

### Mentions à faire figurer sur chaque facture **[général, à contrôler sur entreprendre.service-public.gouv.fr]**

- Date et numéro unique, dans une suite continue.
- Ton nom précédé ou suivi de « Entrepreneur individuel » ou « EI », ton adresse, ton SIRET.
- Le nom, l'adresse et le numéro SIREN du client.
- La désignation de la prestation, la période, le prix.
- La date d'échéance et les conditions de règlement.
- Le taux des pénalités de retard et l'indemnité forfaitaire de recouvrement de 40 €.
- « TVA non applicable, article 293 B du CGI ».

Stripe produit une facture par échéance. À toi de régler le modèle pour que ces mentions y figurent, et de demander son SIREN à chaque client dans le message de bienvenue.

### Facturation électronique

| Obligation | Date | Fiabilité |
|---|---|---|
| Pouvoir **recevoir** des factures électroniques | Depuis le 1ᵉʳ septembre 2026, micro-entreprises comprises | **[secondaire, concordant]** |
| **Émettre** tes factures aux professionnels par une plateforme agréée | 1ᵉʳ septembre 2027 | **[secondaire, concordant]** |

Conséquences :

- Dès que tu as ton SIRET, tu dois avoir un moyen de recevoir tes factures fournisseurs au format électronique. Les sources se contredisent sur le canal (plateforme agréée obligatoire, ou portail public gratuit). À vérifier sur impots.gouv.fr.
- Avant septembre 2027, les factures de Stripe ne suffiront probablement plus seules. Il faudra un outil de facturation relié à une plateforme agréée. À traiter au premier trimestre 2027, pas avant.

## 3. La prospection

### La règle

Entre professionnels, un message commercial par voie électronique est possible **sans consentement préalable**, à trois conditions **[secondaire, d'après la CNIL]** :

1. L'objet du message a un rapport avec la profession du destinataire.
2. Il est informé de l'usage de ses coordonnées.
3. Il peut s'y opposer simplement, dans chaque message.

Un site internet pour un artisan remplit la première condition. Les deux autres sont dans les modèles de `3-prospection.md` et dans les mentions légales de ta page d'offre.

### Ce que chaque message doit contenir

- Ton identité réelle : prénom, nom, marque, SIRET.
- L'origine des coordonnées : « les coordonnées de votre entreprise sont publiques ».
- Le moyen de s'opposer : « répondez stop ».
- Un objet qui ne trompe pas sur le caractère commercial.

### Ce que tu fais et ne fais pas

| Autorisé | Interdit ou à éviter |
|---|---|
| Écrire à une adresse affichée par l'artisan sur sa fiche, son site ou sa page professionnelle | Deviner ou reconstituer une adresse (la CNIL a publié le 16 octobre 2026 des conditions restrictives **[secondaire]**) |
| Écrire par la messagerie de sa page professionnelle, à faible volume | Envoyer en masse par un outil automatique |
| Relancer deux fois, puis arrêter | Relancer quelqu'un qui a dit stop |
| Utiliser l'annuaire des entreprises de l'État | Utiliser les entreprises en « diffusion partielle » : elles ont demandé à ne pas être réutilisées **[officiel, data.gouv.fr]**. Le script les écarte. |
| Relever une note Google à la main | Extraire Google Maps par un robot : interdit par ses conditions **[officiel, conditions Google]** |
| Prospecter des professionnels | Prospecter des particuliers : consentement préalable obligatoire |

### Zones grises

- **Entrepreneurs individuels.** Beaucoup de maçons le sont, parfois avec une adresse personnelle. Certains guides recommandent de les traiter comme des particuliers pour le SMS **[secondaire]**. Je préconise donc de ne pas utiliser le SMS, et de s'en tenir aux adresses affichées à titre professionnel.
- **Conservation.** Trois ans au plus après le dernier contact est la durée de référence pour des prospects **[général]**. Je recommande de supprimer bien avant : à la fin de chaque campagne, ne garde que les clients et la liste d'opposition.

## 4. Les données personnelles (RGPD)

Tu as trois rôles différents.

| Rôle | Données | Base légale | Durée | Ce que tu dois faire |
|---|---|---|---|---|
| Responsable, pour ta prospection | Nom du dirigeant, coordonnées professionnelles, notes de suivi | Intérêt légitime | 3 ans au plus après le dernier contact | Informer dans chaque message, tenir la liste d'opposition, garder le fichier hors de GitHub |
| Responsable, pour tes clients | Coordonnées, factures, échanges | Contrat et obligation légale | Durée du contrat, puis 10 ans pour les factures | Rien de plus que la gestion normale |
| Sous-traitant, pour les sites de tes clients | Demandes de devis des visiteurs | Sur instruction du client | Tu ne les conserves pas | Clause dans les conditions générales (article 14), sous-traitants listés dans la page « Confidentialité » de chaque site |

Ce tableau fait office de registre des traitements. Mets-le à jour si tu ajoutes un outil.

Tes propres sous-traitants : Stripe (paiement), Cloudflare (hébergement, États-Unis), le service de formulaire, ta messagerie. Pour ceux établis hors de l'Union européenne, le transfert repose sur une décision d'adéquation ou des clauses types : c'est mentionné dans la page « Confidentialité » générée.

Mesure d'audience : les statistiques de Cloudflare fonctionnent sans cookie. La CNIL publie une liste d'outils dispensés de consentement ; je n'ai pas pu vérifier que celui-ci y figure. Risque faible, à contrôler si tu l'actives.

## 5. Le contrat avec tes clients

Les conditions générales sont dans `studio/contenus/conditions-generales.md` et publiées sur ta page d'offre, rubrique « Conditions générales ». C'est un modèle rédigé sans relecture d'un avocat.

| Clause | Pourquoi elle est là |
|---|---|
| Sans durée minimale, résiliation à tout moment | C'est ta promesse commerciale ; elle doit être dans le contrat |
| Remboursement pendant 30 jours | Promesse commerciale, et elle couvre largement le cas ci-dessous |
| Nom de domaine au nom du client | Promesse commerciale centrale |
| Le client garantit ses droits sur les photos et avis fournis | Reporte sur lui le risque de droits d'auteur |
| Aucune garantie de position ni de chiffre d'affaires | Évite toute promesse de résultat |
| Responsabilité limitée à 12 mois d'abonnement | Plafonne ton risque |
| Pénalités de retard et indemnité de 40 € | Mentions obligatoires entre professionnels **[général]** |
| Sous-traitance des données | Obligation du RGPD |

### Le droit de rétractation entre professionnels

Un professionnel de cinq salariés au plus peut bénéficier d'un délai de rétractation de 14 jours, quand le contrat est conclu hors établissement et n'entre pas dans son activité principale (article L221-3 du Code de la consommation, confirmé par la Cour de cassation le 30 avril 2025) **[secondaire]**.

- C'est exactement la situation d'un maçon qui achète un site.
- Une commande passée en ligne à son initiative n'est en principe pas « hors établissement ». La jurisprudence l'étend toutefois aux contrats conclus à distance juste après un démarchage personnel **[secondaire]**.
- Si l'information sur ce droit manque, le délai peut être prolongé de 12 mois.

Ma réponse : la garantie de 30 jours, écrite dans les conditions, va plus loin que les 14 jours. L'article 16 mentionne le droit de rétractation. Le risque est ainsi neutralisé, quel que soit le cas.

### Preuve de l'acceptation

Dans chaque lien de paiement Stripe, active l'option qui oblige le client à accepter les conditions générales avant de payer, avec le lien vers ta page. Sans cela, tu ne pourras pas prouver qu'il les a acceptées.

### Litiges

Une clause désignant un tribunal précis n'est valable qu'entre commerçants **[général]**, ce que tous les artisans ne sont pas. Le modèle renvoie donc aux règles de droit commun.

## 6. Fiches Google, photos et avis

| Élément | Dans une maquette pour un prospect | Sur le site d'un client |
|---|---|---|
| Nom, téléphone, commune de l'entreprise | Oui : ce sont ses propres informations, et la maquette n'est montrée qu'à lui | Oui |
| Note et nombre d'avis | Oui, relevés à la main et exacts à la date du jour | Oui, avec un lien vers la fiche |
| Texte d'un avis | **Non** | Oui si le client le demande et le confirme par écrit : repris tel quel, avec le prénom, la date et la source. Retrait sur demande de l'auteur. |
| Photos de sa fiche Google | **Non** : elles appartiennent à leur auteur (l'artisan ou un client) | Oui, si c'est l'artisan qui te les envoie |
| Photos d'un autre site ou d'un concurrent | Non | Non |
| Photos de banque d'images ou générées | Oui, étiquetées « Photo d'illustration » | Oui, étiquetées, jamais présentées comme un chantier du client |
| Avis inventés | Uniquement sur la démonstration fictive, avec la mention « Avis fictifs » | **Jamais** : c'est une pratique commerciale trompeuse |

Règles sur les avis affichés sur un site **[secondaire, d'après la DGCCRF et la FFB]** : quiconque diffuse des avis de consommateurs doit indiquer s'ils font l'objet d'un contrôle et afficher leur date (articles L111-7-2 et D111-16 à D111-19 du Code de la consommation). Le générateur affiche donc la date de chaque avis, la mention « Nous n'effectuons pas de contrôle sur ces avis », et refuse de générer un site en production qui cite des avis sans lien vers la fiche Google.

Gestion d'une fiche Google pour un client : la fiche lui appartient, il t'ajoute comme gestionnaire et peut te retirer à tout moment. Ne te présente jamais comme travaillant pour Google.

Maquettes pour des prospects : adresse impossible à deviner, non indexée, supprimée à J+14 sans réponse ou immédiatement sur demande. Ne publie jamais la maquette d'une entreprise réelle comme exemple sans son accord écrit.

## 7. Les sites que tu livres

Ce que le générateur met en place, et ce qu'il te reste à obtenir du client.

| Obligation | Géré par le générateur | À obtenir du client |
|---|---|---|
| Mentions légales : identité, adresse, SIRET, immatriculation, directeur de la publication, hébergeur **[officiel, service-public F37351]** | Page générée ; build refusé si SIRET, dirigeant ou adresse manquent | Ses informations exactes |
| Assurance décennale : obligatoire sur les devis et factures ; attendue sur le site **[secondaire]** | Affichée dans les mentions et le pied de page ; avertissement si absente | Assureur, numéro de contrat, zone couverte |
| Médiateur de la consommation, s'il travaille pour des particuliers **[secondaire]** | Affiché dans les mentions ; avertissement si absent | Nom et site de son médiateur |
| Cookies | Aucun cookie déposé, donc pas de bandeau | — |
| Confidentialité | Page générée | — |
| Exactitude des contenus | — | Il en est responsable (conditions générales, article 10) |

Accessibilité : les sites générés suivent les bonnes pratiques de base (structure, contrastes, navigation au clavier). Je n'ai pas vérifié si une obligation légale s'applique au site vitrine d'une très petite entreprise.

## 8. Listes de contrôle

**Avant le premier message de prospection**

- [ ] Contrat de travail relu.
- [ ] Micro-entreprise créée, SIRET obtenu.
- [ ] Mentions légales de ta page d'offre complétées (`marque.json`, rubrique `editeur`).
- [ ] Adresse d'envoi à ton nom de domaine.
- [ ] Fichier `opposition.csv` créé.

**Avant le premier euro encaissé**

- [ ] Stripe au nom de l'entreprise, avec SIRET.
- [ ] Modèle de facture avec toutes les mentions.
- [ ] Acceptation des conditions générales activée sur les liens de paiement.
- [ ] Conditions générales en ligne, sans « à compléter ».

**Avant chaque mise en ligne**

- [ ] Accord écrit du client sur les photos et les avis utilisés.
- [ ] Mentions légales complètes.
- [ ] Nom de domaine enregistré à son nom.

## 9. Les trois points à faire valider par un professionnel

| Point | Pourquoi | Quand |
|---|---|---|
| Les conditions générales | Modèle non relu ; c'est ton seul bouclier en cas de litige | Avant 10 clients |
| La catégorie fiscale et sociale de l'activité (BIC ou BNC) | Elle change tes cotisations de 4,4 points | À la création, auprès de l'URSSAF (gratuit) |
| La compatibilité avec ton contrat de travail | Risque de licenciement en cas de concurrence | Avant de commencer, si ton employeur vend aux artisans |

## 10. Sources

- Cumul salarié et micro-entrepreneur : https://entreprendre.service-public.gouv.fr/vosdroits/R17542
- Cotisations sociales 2026 : https://www.economie.gouv.fr/entreprises/micro-entreprise-auto-entreprise-charges-sociales
- Franchise de TVA : https://portail-micro-entreprise.com/fiches/franchise-tva/
- Facturation électronique des micro-entrepreneurs : https://www.sage.com/fr-fr/dematerialisation/facture-electronique/micro-entrepreneur/ et https://www.pennylane.com/fr/fiches-pratiques/facture-electronique/obligation-pour-les-auto-entrepreneurs
- Prospection par courrier électronique (CNIL) : https://cnil.fr/fr/node/892
- Adresses professionnelles reconstituées (CNIL) : https://cnil.fr/fr/node/169047
- Règles de prospection en 2026 : https://www.donneespersonnelles.fr/prospection-commerciale-rgpd
- Droit de rétractation entre professionnels : https://www.lecoindesentrepreneurs.fr/droit-de-retraction-entre-professionnels/ et https://www.eurojuris.fr/articles/creation-site-web-professionnel-et-retractation-37762.htm
- Avis en ligne : https://www.ffbatiment.fr/actualites-batiment/actualite/avis-en-ligne-vers-plus-de-transparence et https://www.economie.gouv.fr/particuliers/mes-droits-conso/bien-consommer/peut-faire-confiance-aux-avis-en-ligne
- Conditions d'utilisation de Google Maps : https://www.google.com/intl/fr/help/terms_maps/
- Données de l'annuaire des entreprises : https://www.data.gouv.fr/dataservices/api-recherche-dentreprises et https://www.data.gouv.fr/datasets/base-sirene-des-entreprises-et-de-leurs-etablissements-siren-siret
- Mentions obligatoires d'un site : https://entreprendre.service-public.gouv.fr/vosdroits/F37351
- Hébergement et usage commercial : https://hostfleet.pages.dev/cf-pages-vs-vercel-vs-netlify-2026/
