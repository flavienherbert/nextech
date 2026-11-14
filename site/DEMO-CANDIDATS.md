# Vidéo de démonstration externe — candidats et conditions

Relevé du 14 novembre 2026. Rien n'a été téléchargé.

**Décision du fondateur (14 novembre)** : exemple externe accepté à titre provisoire, sous réserve d'un accord écrit du créateur. Candidat retenu : n° 1, Slow Machine Studio (contact public sur sa chaîne : andrii@slowmachinestudio.com, site slowmachinestudio.com). Repli : n° 2.

**État** : intégration prête mais inactive (`app/config.ts`, `demonstration.externe.autorisee: false`). La vidéo du studio est désactivée ; l'accueil affiche « Emplacement réservé ». Pour activer après accord écrit : passer `autorisee` à `true`, et conserver l'e-mail d'accord. À retirer dès qu'une vidéo du studio existe (renseigner `demonstration.video`, qui est prioritaire).

**Non vérifié** : dans l'environnement de test, le lecteur YouTube s'est chargé mais a affiché « Video unavailable », sans doute parce que YouTube bloque la lecture automatisée. À contrôler sur un vrai navigateur avant activation.

## Limites de ce relevé

- Jugement fait sur trois images extraites par vidéo (miniatures officielles YouTube). Les vidéos n'ont été ni visionnées ni écoutées : durée, voix et montage restent à vérifier en les regardant.
- L'intégration est déclarée possible par YouTube pour les cinq (réponse du service officiel oEmbed).
- Aucune page de contact trouvée hors YouTube : la demande passe par l'onglet « À propos » de la chaîne ou par un commentaire.

## Candidats, classés par intérêt commercial

| # | Lien | Chaîne | Contenu | Présentateur | Sous-titres | Marque |
|---|---|---|---|---|---|---|
| 1 | https://www.youtube.com/shorts/c4yaPVdYr4U | Slow Machine Studio | Rouge à lèvres, rue de type parisien | Femme, face caméra, très réaliste | Oui (anglais) | Non identifiée |
| 2 | https://www.youtube.com/shorts/FlKOa0ZkEcU | The 3D Zone | Lait pour le corps, chambre | Femme, face caméra | Oui (anglais) | Fictive, indiquée à l'écran avec « AI-generated performer » |
| 3 | https://www.youtube.com/shorts/7nkq5p_o638 | Duvora Group | Biscuits salés, cuisine | Femme, face caméra | Non visibles | « Sagegrain », non vérifiée |
| 4 | https://www.youtube.com/shorts/BebD_M-qOjA | Créa Revenus (chaîne française) | Boisson, piscine, plan produit | Femme, produit tendu vers la caméra | Non visibles | « Zestora », non vérifiée |
| 5 | https://www.youtube.com/shorts/XQEYdJtTrVk | Arcos Vision Studio | Sèche-cheveux, ambiance haut de gamme | Femme, plan d'ambiance | Non visibles | Non identifiée |

Écartés : deux vidéos de la chaîne Intellio Online (marques réelles Jones Road et Crunchi visibles), tutoriels, vidéos montrant l'interface d'un outil.

## Droits

- **Ce que YouTube autorise** : ses conditions prévoient que l'on peut « montrer des vidéos YouTube via le lecteur intégrable », et que l'auteur accorde aux autres utilisateurs une licence d'accès « par une fonctionnalité du service (lecture ou intégration) ». L'intégration par le lecteur officiel est donc couverte, sans téléchargement.
- **Ce que cela ne couvre pas** : l'usage d'une vidéo comme argument de vente d'un service concurrent. En droit français, le risque est le parasitisme (profiter du travail d'autrui) et la pratique commerciale trompeuse si le visiteur croit voir notre niveau de qualité. Une autorisation écrite de l'auteur lève le premier risque, la mention lève en partie le second.
- **Aucune des cinq n'a de licence ouverte connue.** Demande d'autorisation écrite nécessaire avant toute intégration.

## Inconvénients propres à l'intégration

1. Le lecteur affiche le nom de la chaîne et un lien vers YouTube : chaque candidat est un concurrent direct, on lui envoie nos visiteurs.
2. L'auteur peut supprimer la vidéo ou couper l'intégration à tout moment.
3. Le lecteur YouTube dépose des traceurs : il faut le mode « sans cookie » et un chargement au clic, plus une ligne dans la politique de confidentialité et dans la politique de contenu du site.

## Demande d'autorisation (à envoyer par le fondateur)

> Subject: Permission to feature your AI UGC ad on our website
>
> Hello,
>
> I run Studio Accroche, a small French studio producing AI-presenter video ads for online shops. I would like to feature your Short "[title]" ([link]) on our homepage as an example of what AI-generated advertising can look like.
>
> It would be embedded with the official YouTube player (no download, no edit), with the visible notice: "External example of an AI-generated ad — not made by Studio Accroche", and a credit to your channel.
>
> Could you confirm in writing that you agree, and that the people, music and brand shown raise no third-party rights issue? I will remove it immediately on request.
>
> Thank you,
> [first name] — Studio Accroche

## Intégration prévue une fois l'accord reçu

Même cadre vertical 9:16, lecteur YouTube sans cookie chargé au clic, étiquette « Exemple externe » à la place de « Exemple de vidéo livrée », mention sous le cadre : « Exemple externe de publicité générée par IA — non réalisée par Studio Accroche », crédit de la chaîne. Le titre de section « Voici ce que vous recevez » devra changer : il ne peut pas désigner le travail d'un autre.
