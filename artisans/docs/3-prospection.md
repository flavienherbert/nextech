# 3. La prospection

Aucun message ne part sans ton accord. Ce document prépare tout ce qu'il faut pour le pilote de 30 contacts, puis l'extension à 100.

## Qui viser

Maçons du Calvados, 0 à 5 salariés. Trois segments, par ordre de priorité.

| Segment | Comment le reconnaître | Pourquoi il achète | Canal |
|---|---|---|---|
| **A. Fiche Google active, pas de site** | Fiche avec des avis, bouton « Site web » absent | Il a déjà la preuve (avis) mais rien à montrer | Email public ou messagerie de sa page professionnelle |
| **B. Site ancien ou chez un prestataire historique** | Site non adapté au téléphone, « site réalisé par… » en bas de page | Il paie déjà, souvent plus cher et sous engagement | Email du site |
| **C. Ni fiche ni site** | Introuvable sur Google | Le plus à gagner, mais le moins sensible au sujet | À garder pour plus tard |

Point d'attention : la maçonnerie recule de 2 % sur un an d'après la déclinaison régionale de la note CAPEB. Ces artisans cherchent des chantiers, mais surveillent leurs dépenses. L'argument est donc double : être trouvé, et payer moins.

## Trouver les artisans

### Étape 1 — La liste de départ (10 minutes)

```powershell
npm run prospects                                  # maçons du Calvados
npm run prospects -- --naf 43.22A --departement 14 # plombiers, pour plus tard
```

Le script interroge l'annuaire des entreprises de l'État et crée un fichier dans `studio/prospection/`. Il donne le nom, la commune, la date de création, l'effectif et le dirigeant. Il ne donne ni téléphone, ni email, ni site.

Ce script n'a pas pu être essayé depuis ma session, où l'adresse de l'annuaire est bloquée. Si l'appel échoue chez toi, envoie-moi le message d'erreur.

Solution de repli sans script : sur annuaire-entreprises.data.gouv.fr, recherche « maçonnerie » filtrée sur le Calvados.

### Étape 2 — La qualification à la main (3 minutes par artisan)

Pour chaque ligne, cherche « nom + commune » sur Google et remplis les colonnes :

| Colonne | Quoi noter |
|---|---|
| `site_web` | `aucun`, l'adresse du site, ou `prestataire` s'il est signé par un prestataire en pied de page |
| `fiche_google` | `oui` ou `non` |
| `note_google`, `nb_avis` | Relevés à la main, à la date du jour |
| `email_public` | Uniquement une adresse affichée sur sa fiche, son site, sa page professionnelle ou un annuaire |
| `segment` | A, B ou C |
| `priorite` | 1 si segment A avec au moins 5 avis ; 2 si segment B ; 3 sinon |

Règles à ne pas enfreindre :

- Pas d'extraction automatique de Google Maps : c'est contraire à ses conditions d'utilisation.
- Pas d'adresse email devinée ni achetée.
- Le fichier reste sur ton ordinateur. Il est exclu de GitHub.

### Étape 3 — D'abord ceux que tu connais

Les trois premiers clients viendront plus sûrement d'artisans qui te connaissent. Liste-les avant toute prospection à froid et écris-leur toi-même, sans modèle.

## La séquence

| Jour | Action |
|---|---|
| J | Message 1 avec le lien vers sa maquette |
| J+3 | Relance 1, deux lignes |
| J+7 | Relance 2, dernière |
| Ensuite | Plus aucun message, sauf s'il répond |

Volume : 10 à 15 messages par jour au maximum, envoyés à la main, depuis une adresse à ton nom de domaine.

## Les messages

Remplace ce qui est entre crochets. Garde les messages courts : un artisan lit sur son téléphone, entre deux tâches.

### Message 1 — Segment A (pas de site)

> **Objet : [Nom de l'entreprise] — votre site est prêt, regardez**
>
> Bonjour [Monsieur Nom],
>
> Je m'appelle [Prénom], je suis du Calvados et je travaille dans le bâtiment.
>
> En cherchant un maçon à [Ville], j'ai vu que vous aviez [nombre] avis sur Google, mais pas de site pour montrer vos chantiers. Je vous en ai préparé un, à votre nom :
>
> [lien vers la maquette]
>
> C'est une maquette privée, personne d'autre ne la voit. Si elle vous plaît, elle peut être en ligne dans 5 jours avec vos photos : 39 € par mois, sans engagement, et le nom de domaine est à votre nom. Si elle ne vous plaît pas, je la supprime.
>
> Bonne journée,
> [Prénom Nom] — [Marque]
> [SIRET]
>
> Vous recevez ce message parce que les coordonnées de votre entreprise sont publiques. Répondez « stop » et je ne vous écrirai plus.

### Message 1 — Segment B (site existant)

> **Objet : [Nom de l'entreprise] — une autre version de votre site**
>
> Bonjour [Monsieur Nom],
>
> Je m'appelle [Prénom], je suis du Calvados et je travaille dans le bâtiment.
>
> J'ai regardé votre site depuis un téléphone : [un constat précis et vérifiable, par exemple « le numéro n'est pas cliquable » ou « les photos datent de 2018 »]. Je vous ai préparé une autre version, à votre nom :
>
> [lien vers la maquette]
>
> Elle coûte 39 € par mois, sans engagement, et le nom de domaine reste à vous. Si vous êtes engagé avec votre prestataire actuel, je cale la mise en ligne sur votre date de fin de contrat et je reprends vos textes et photos gratuitement.
>
> Bonne journée,
> [Prénom Nom] — [Marque]
> [SIRET]
>
> Vous recevez ce message parce que les coordonnées de votre entreprise sont publiques. Répondez « stop » et je ne vous écrirai plus.

### Version courte, pour la messagerie d'une page professionnelle

> Bonjour, je suis [Prénom], du Calvados. Je vous ai préparé une maquette de site à votre nom, gratuite et privée : [lien]. Si elle vous plaît, elle peut être en ligne en 5 jours pour 39 € par mois sans engagement. Sinon je la supprime. Dites « stop » et je ne vous écris plus.

### Relance 1 (J+3)

> Bonjour [Monsieur Nom], avez-vous pu regarder la maquette ? [lien]
> Si un détail ne va pas (prestations, communes, couleurs), dites-le-moi : je corrige dans la journée.

### Relance 2 (J+7)

> Bonjour [Monsieur Nom], dernier message de ma part. Je laisse la maquette en ligne jusqu'au [date, J+14], puis je la supprime. Bonne continuation.

### Quand il dit oui

> Parfait. Voici la marche à suivre, cela prend 10 minutes :
> 1. Le premier mois se règle ici : [lien de paiement]. Vous pouvez arrêter quand vous voulez, et vous êtes remboursé si le site ne vous convient pas dans les 30 jours.
> 2. Envoyez-moi par retour de message : votre numéro SIRET, le nom de votre assureur décennale, et 6 à 12 photos de chantiers.
> 3. Votre site est en ligne sous 5 jours ouvrés. Je vous envoie le lien pour validation avant.

## Les objections

Réponses courtes, par écrit. Ne jamais insister après un refus net.

| Il dit | Tu réponds |
|---|---|
| « Je n'ai pas le temps. » | Dix minutes suffisent : votre SIRET, votre assureur, quelques photos envoyées du téléphone. Je fais le reste et les mises à jour. |
| « J'ai assez de travail. » | Tant mieux. Le site sert surtout quand un chantier se décale ou qu'un client hésite entre deux devis. À 39 € par mois sans engagement, vous l'arrêtez le jour où il ne sert plus. |
| « Je fonctionne au bouche-à-oreille. » | Le site ne le remplace pas. La personne à qui on vous recommande tape votre nom sur Google avant d'appeler : aujourd'hui elle trouve [ce qu'elle trouve réellement]. |
| « J'ai déjà un site. » | Regardez la date de fin de votre contrat et le préavis. Je cale la mise en ligne dessus pour que vous ne payiez pas deux fois, et je reprends vos contenus gratuitement. |
| « C'est encore une arnaque. » | Je comprends la méfiance. Trois faits : pas d'engagement, remboursement pendant 30 jours, et le nom de domaine est enregistré à votre nom, pas au mien. Tout est écrit dans les conditions : [lien]. |
| « Combien ça coûte vraiment ? » | 39 € par mois, tout compris, 0 € de création. Les seules options payantes sont une page en plus (49 €), un logo (79 €) et une modification urgente (19 €). |
| « Ça va m'apporter des chantiers ? » | Je ne peux pas le garantir, et je me méfierais de quelqu'un qui le promet. Ce que je garantis : vous êtes trouvable, vos réalisations sont visibles, et on peut vous demander un devis en un clic. |
| « Je peux le faire moi-même. » | Oui, des outils existent autour de 12 € par mois. Il faut compter une à deux journées pour le monter, puis le tenir à jour. Mon offre, c'est que vous n'y passiez pas ce temps. |
| « Pouvez-vous m'appeler ? » | À décider : voir « Décisions » ci-dessous. |
| « Stop » ou « pas intéressé » | Bien noté, je ne vous écrirai plus. Bonne continuation. Puis : ligne passée en `refus`, adresse ajoutée à la liste d'opposition. |

## Le suivi

Un seul fichier : celui produit par `npm run prospects` (modèle dans `studio/prospection/modele-suivi.csv`), ouvert dans un tableur.

Valeurs de la colonne `statut` : `à qualifier`, `à contacter`, `démo envoyée`, `relance 1`, `relance 2`, `réponse positive`, `client`, `refus`, `stop`.

Chiffres à relever chaque semaine :

| Indicateur | Seuil du pilote (30 contacts) | Seuil de l'extension (100 contacts) |
|---|---|---|
| Réponses | 3 ou plus | 8 ou plus |
| Réponses positives | 1 ou plus | 4 ou plus |
| Paiements | 1 engagement écrit ou paiement | 2 paiements |
| Temps par démonstration | moins de 10 minutes | moins de 6 minutes |

En dessous de ces seuils après 200 contacts sur deux segments, on arrête et on passe au plan B de l'étude.

## Semaine type (6 heures)

| Bloc | Durée | Contenu |
|---|---|---|
| Qualification | 1 h 30 | 30 artisans qualifiés |
| Démonstrations | 2 h | 15 à 20 maquettes |
| Envois et relances | 1 h | 10 à 15 messages par jour, sur 3 jours |
| Réponses et mises en ligne | 1 h 30 | Priorité absolue aux réponses positives |

## Liste d'opposition

Un fichier `studio/prospection/opposition.csv` (exclu de GitHub) avec l'adresse et la date de chaque « stop ». Avant chaque envoi, vérifie que le destinataire n'y figure pas. Cette liste ne se vide jamais.

## Décisions à prendre

| # | Décision | Ma recommandation |
|---|---|---|
| 1 | Accepter les appels entrants de prospects intéressés | Oui. Refuser fera perdre des ventes, dans une proportion que seul le test dira. |
| 2 | Signer de ton nom ou d'une marque | Ton prénom et ton nom en premier, la marque en second : un voisin inspire plus confiance qu'une enseigne. |
| 3 | Segment du pilote | 20 contacts du segment A, 10 du segment B. |
| 4 | Adresse d'envoi | Une adresse à ton nom de domaine, jamais une adresse gratuite. |
