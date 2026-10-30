# 2 SMS de demande d'avis

Variables : `{prenom}` prénom du client, `{entreprise}` nom de l'artisan, `{lien}` lien court d'avis Google
(fiche Google > « Demander des avis » > copier le lien court `g.page/r/.../review`, ou utiliser `generer_qr.py`).

## SMS 1 : juste après l'intervention (à envoyer à TOUS les clients)
```
Bonjour {prenom}, merci pour votre confiance. Votre avis Google nous aide : {lien} - {entreprise}
```

## SMS 2 : relance unique, 3 à 5 jours plus tard, seulement si pas d'avis
```
Bonjour {prenom}, rappel : votre avis Google nous est utile, quel que soit votre ressenti : {lien} - {entreprise}
```

## Règles Google à respecter (risque de suppression des avis ou de sanction de la fiche)
- **Demander à tous les clients, pas seulement aux contents.** Trier ("on ne demande qu'à ceux qui sont satisfaits") est interdit par Google (review gating).
- **Aucune contrepartie** (remise, cadeau, tirage au sort) en échange d'un avis.
- Un seul rappel maximum : pas d'insistance.
- Pas d'avis écrit à la place du client, pas d'avis posté depuis la boîte (même wifi / même appareil).
- Respecte le RGPD : n'envoie le SMS qu'à un client avec qui l'intervention vient d'avoir lieu.

## Longueur
Mesuré avec un prénom de 9 caractères, un lien court de 38 caractères (`https://g.page/r/XXXXXXXXXXXXXXXX/review`) et un nom d'entreprise de 16 caractères : SMS 1 = 136 caractères, SMS 2 = 152 caractères, soit 1 segment chacun (limite 160). Au-delà, le SMS est facturé en 2 segments. Le texte est volontairement sans accent ni caractère spécial : un seul caractère hors alphabet SMS standard (ex. « œ », « ’ », « … ») fait passer le segment à 70 caractères.
