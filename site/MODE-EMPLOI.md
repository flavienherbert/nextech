# Mode d'emploi du vendeur — Studio Accroche

Ce document est le seul dont vous avez besoin au quotidien. Une version courte est aussi dans l'administration : bouton **Mode d'emploi** (page `/admin/aide`).

> **Je reçois une commande ici. Je la traite ici. Je livre les vidéos ici.**

---

## 1. Je reçois une commande ici

Dès qu'un client **a payé** (jamais avant), vous êtes prévenu de deux façons indépendantes :

| Où | Ce que vous voyez |
|---|---|
| **Sur votre téléphone** (application gratuite ntfy) | « Nouvelle commande payée » + numéro, offre, montant. Un appui ouvre directement la commande. Aucun nom ni e-mail de client n'y figure. |
| **Dans votre boîte contactstudioaccroche@gmail.com** | E-mail « Nouvelle commande payée » : numéro de commande, nom du client, e-mail du client, offre, montant payé, date, délai promis, et un bouton **Ouvrir la commande**. |

- Un client qui commence à payer puis abandonne ne déclenche **rien** : ce n'est pas une vente.
- Si le téléphone **et** l'e-mail tombent en panne en même temps, rien ne vous prévient : ouvrez l'administration une fois par jour (voir « Ma routine quotidienne »).

### Mise en place (une seule fois, 10 minutes)

1. **Téléphone** : installez l'application **ntfy** (gratuite, Android et iPhone), appuyez sur **+**, saisissez le sujet affiché dans **Administration → Mode d'emploi** (rubrique « Mon sujet de notification »). Autorisez les notifications.
2. **E-mails** : voir `MISE-EN-LIGNE.md`, « E-mails du vendeur ». Il faut créer un « mot de passe d'application » Google et le saisir dans Netlify (variable `SMTP_PASSWORD`).
3. **Contrôle** : Administration → **Diagnostic** → bouton **Envoyer une notification de test**. Vous devez recevoir un message sur le téléphone et un e-mail. Si une ligne du diagnostic est rouge, son explication dit quoi faire.

---

## 2. Je la traite ici

Adresse : `<adresse du site>/admin` (mot de passe administrateur). Ouvrez la page **Commandes**.

### Le tableau de bord

En haut, des cases cliquables avec un nombre :

| Case | Signification | Action attendue |
|---|---|---|
| **À faire maintenant** | tout ce qui attend quelque chose de vous | commencez par là |
| **Nouvelles** | payées, jamais ouvertes | ouvrir la commande |
| **À traiter** | le client a envoyé son brief | démarrer la production |
| **Corrections demandées** | le client demande une retouche | corriger puis renvoyer |
| **En production** | vous travaillez dessus | — |
| **En attente du client** | payée, brief pas encore envoyé | rien (relance automatique après 48 h) |
| **Livrées** | livraison envoyée, le client doit répondre | rien |
| **Terminées** | validées ou clôturées | rien |

Sous les cases :
- **Recherche** : numéro, nom, e-mail, marque ou produit. Fonctionne sur **toutes** les commandes, même vieilles de plusieurs mois (elles ne sont jamais supprimées ; seuls les gros fichiers vidéo le sont, 90 jours après la livraison).
- **Toutes les commandes payées** et **Non payées / annulées** (ce ne sont pas des ventes).
- Les pastilles **Nouvelle**, **Correction**, **En retard** repèrent l'urgent. La colonne « À livrer pour le » donne l'échéance promise au client.

### Ouvrir une commande

Cliquez sur son numéro. En haut, le panneau **Prochaine étape** vous dit quoi faire et propose le bon bouton :

| Situation | Bouton proposé |
|---|---|
| Payée, brief non reçu | **Relancer le client maintenant** |
| Brief reçu | **Démarrer la production** (le client est prévenu) |
| En production | **Envoyer la livraison au client** (actif dès qu'un livrable est ajouté) |
| Correction demandée | message du client cité, puis **Envoyer la version corrigée au client** |
| Livraison envoyée | **Renvoyer l'e-mail de livraison**, ou **Clôturer** (considérer comme validée) |

Sur la page : le **brief complet**, les **fichiers du client** (bouton Télécharger), les **retouches demandées**, l'**historique** daté (paiement, brief, statuts, livraisons) et les **e-mails envoyés** avec leur résultat. Après chaque bouton, un bandeau confirme ou signale que l'e-mail n'est pas parti.

---

## 3. Je livre les vidéos ici

1. Sur la commande, colonne de droite, **Livrables** : **Ajouter** vos vidéos (mp4, mov, webm) et PDF. Jusqu'à 50 Mo par fichier. Le client reçoit par e-mail un lien privé par fichier, plus le lien de son espace.
2. Panneau **Prochaine étape** : **Envoyer la livraison au client**.
3. Le client reçoit un e-mail avec son lien privé. Il télécharge, puis **valide** ou **demande une retouche**.
4. Validation → la commande passe en **Terminées** et la facture est émise. Retouche → vous êtes prévenu, la commande apparaît dans **Corrections demandées** ; vous corrigez, vous remplacez le fichier (« Retirer » puis ajoutez le nouveau), puis **Envoyer la version corrigée**.
5. Le client n'a pas répondu ? **Clôturer** considère la livraison comme validée.

Les fichiers du client et les livrables sont supprimés **90 jours** après la livraison ; dites-le au client (il le lit dans l'e-mail de livraison).

---

## 4. Ce que veulent dire les alertes

| Alerte (téléphone, et e-mail quand utile) | Que faire |
|---|---|
| **Nouvelle commande payée** | Ouvrir la commande. |
| **Paiement échoué** | Rien, sauf si le client vous écrit. La commande n'est pas une vente. |
| **Correction demandée** | Ouvrir la commande : le message du client est cité en haut. |
| **E-mail non envoyé** | Administration → **E-mails** → **Renvoyer cet e-mail**. Si cela se répète, **Diagnostic**. |
| **Problème technique sur le site** | Administration → **Diagnostic**. Une ligne rouge explique la cause. |
| **Paiement à vérifier : erreur de traitement** | Stripe réessaie automatiquement. Si l'alerte se répète, **Diagnostic**. |
| **Facture non émise** | Ouvrir la commande : la raison est affichée (souvent une information légale manquante). |
| **Récap du jour** (e-mail, chaque matin, seulement s'il y a quelque chose) | Liste de ce qui attend. |

Anti-avalanche : une même alerte n'est pas répétée plus d'une fois dans sa fenêtre (30 minutes à 6 heures), et au plus 8 alertes d'erreur par heure.

---

## 5. Ma routine quotidienne (5 minutes)

1. Ouvrir **Commandes**. Lire la case **À faire maintenant**.
2. Traiter dans l'ordre : corrections, nouvelles commandes, démarrages, retards.
3. Si un bandeau rouge parle d'e-mails non envoyés : **E-mails** → **Renvoyer**.
4. Une fois par semaine : **Diagnostic** → tout doit être vert ; **Envoyer une notification de test**.

Vous n'avez **jamais** à ouvrir le site pour savoir si une commande est arrivée : le téléphone et l'e-mail vous le disent.

## 5 bis. Les e-mails ne partent pas ?

Administration, **Réglages e-mail** : l'état du service d'envoi, et le champ où coller le mot de passe d'application Gmail (testé avant d'être enregistré, actif tout de suite). Puis **E-mails** : la liste de ce qui n'est pas parti, avec un bouton **Renvoyer ces e-mails maintenant** qui ne renvoie que ce qui est encore utile (jamais de doublon, jamais un message périmé à un client).

## 6. Accéder à l'administration

Depuis n'importe quel appareil : `https://studio-accroche-preprod.netlify.app/admin`. Une fois connecté, vous restez connecté 7 jours sur cet appareil. Un lien de notification (« Ouvrir la commande ») vous ramène directement sur la commande après connexion. Le mot de passe est la variable `ADMIN_PASSWORD` de Netlify (*Site configuration*, *Environment variables*).

## 7. Ce que le système fait seul

- **Chaque matin (≈ 7 h–8 h, heure de Paris)** : récapitulatif par e-mail s'il y a quelque chose en attente ; relance du client dont le **brief manque depuis 48 h** (une seule fois) ; suppression des données arrivées à échéance (fichiers 90 jours après livraison, commandes jamais payées après 30 jours).
- **Si un e-mail ne peut pas partir** : il est conservé (rien n'est perdu), vous êtes prévenu sur le téléphone, vous le renvoyez d'un clic.
- **Si Gmail refuse un envoi** : le message part par Brevo (voie de secours). Si les deux échouent, il est conservé, vous êtes prévenu sur le téléphone et vous le renvoyez d'un clic.

## 8. Ce qu'il ne faut pas faire

- Ne communiquez jamais un mot de passe ou une clé dans une conversation ou un e-mail.
- Ne changez le statut à la main (formulaire « Statut ») que pour un cas particulier ; les boutons de « Prochaine étape » suffisent.
- Ne partagez le lien privé d'un client qu'avec lui.
