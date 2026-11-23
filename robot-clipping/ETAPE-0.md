# Étape 0 : préparer les accès

Mis à jour le 23 novembre 2026, pour l'architecture à trois agents et un orchestrateur (voir `PLAN.md`).

**Rien n'a été créé, déployé ni payé.** Toutes les actions ci-dessous sont **les vôtres** : je ne crée aucun compte et ne touche à aucune infrastructure à votre place.

**Règle d'or : aucun secret dans la conversation.** Clés, mots de passe et jetons vont dans votre gestionnaire de mots de passe, puis dans les « Secrets » de GitHub. Je n'ai jamais besoin de les voir.

---

## 1. Vos décisions (23/11/2026)

| Sujet | Décision |
|---|---|
| Livraison | Les **10 meilleures vidéos** par campagne, plus d'autres si leur potentiel est excellent et qu'elles respectent toutes les règles. Un classement complet, avec une note et une justification pour chaque vidéo. |
| Conservation | **Aucune suppression automatique.** La fonction sera préparée, désactivée, jusqu'à ce qu'une politique conforme aux licences soit validée. |
| IA | Haiku pour le premier tri. Opus pour l'analyse approfondie, les consignes et les descriptions. **Plafond strict de 5 $ par campagne de test.** |
| Ordinateur | Un PC Windows est disponible. Les blocs A, B et C se font dessus. |
| Ancien Clipper | Étude reportée : la première version n'en dépend pas. |
| Mention publicitaire | Vérifiée à chaque campagne, selon ses consignes et les obligations applicables. **Jamais considérée comme inutile.** |
| Raccourci iPhone | Il transmet le lien, le texte complet et tous les liens. Toute information manquante est signalée, **jamais inventée**. Testé hors ligne, voir `RACCOURCI-IPHONE.md`. |
| Infrastructure | Un dépôt GitHub privé séparé et un second projet Supabase gratuit. Studio Accroche n'est pas touché. |

## 2. Vérifications déjà faites

**Conditions de Content Rewards** (conditions créateurs du 17/11/2026, politique de copyright du 24/09/2026) :

| Sujet | Ce que disent les conditions | Conséquence pour le robot |
|---|---|---|
| Accès automatisé | Rien sur ce sujet. Les CGU de Whop l'interdisent sans accord écrit. | **Aucune récupération automatique sur Content Rewards.** Le Raccourci est lancé par vous, sur la page affichée. |
| IA | Aucune clause. | Rien à adapter. |
| Rushes fournis | Licence limitée et révocable, « only to create and post the Campaign's Clip » (§ 17.1). | Les rushes ne servent qu'aux clips de la campagne. |
| Faux engagement | Exclusion définitive (§ 12.2 et § 13.2). | Le robot ne touche ni à TikTok ni aux vues. |
| Mention publicitaire | Votre responsabilité ; pour une vidéo, en début de vidéo (§ 12.9). | Signalée à chaque campagne. |

**Modèles Claude** (tarifs officiels relevés le 23/11/2026) :

| Modèle | Identifiant | Entrée | Sortie | Remarque |
|---|---|---|---|---|
| Haiku 5.5 | `claude-haiku-5-5` | 0,10 $ / M jetons | 0,50 $ / M jetons | Cinq fois plus cher au-delà de 100 000 jetons par requête. Le robot en envoie environ 4 000. |
| Opus 5.5 | `claude-opus-5-5` | 4 $ / M jetons | 20 $ / M jetons | — |

---

## 3. Ce qu'il faut, et pour quand

| Bloc | Pour la phase | Durée |
|---|---|---|
| A. Dépôt GitHub privé | **1** | 10 min |
| B. Google Cloud (accès à votre Drive) | **1** | 25 min |
| C. Secrets Google dans GitHub | **1** | 5 min |
| D. Raccourci iPhone, version de test | **1** | 10 min |
| E. Campagne Koba | **1** | 2 min |
| F. Anthropic (clé et crédit, **sur votre autorisation**) | 2 | 10 min |
| G. Supabase, jeton de lancement, ntfy | 3 | 20 min |
| H. Ancien Clipper | 4 ou plus tard | — |

**Seuls les blocs A à E sont nécessaires pour lancer la phase 1.**

---

## 4. Actions pour la phase 1

### A. GitHub : dépôt privé (PC, 10 min)

1. Ouvrez https://github.com/new et remplissez :
   - Owner : `flavienherbert` ;
   - nom : `robot-clipping` ;
   - **Private** ;
   - cochez « Add a README file ».

   Puis « Create repository ».
2. Ouvrez https://github.com/settings/billing (*Billing and licensing*). Vérifiez qu'**aucun dépassement ne peut être facturé** :
   - soit aucun moyen de paiement n'est enregistré ;
   - soit, dans *Budgets and alerts*, un budget Actions à 0 $ arrête l'usage à la limite.
3. Ouvrez https://github.com/settings/installations, puis l'application **Claude**, « Configure ». Dans *Repository access*, ajoutez **uniquement** `robot-clipping`, puis « Save ».

### B. Google Cloud : accès à votre Drive (PC, 25 min)

Connectez-vous avec **votre compte Google habituel**, celui qui reçoit les partages des campagnes.

1. Ouvrez https://console.cloud.google.com, puis « Nouveau projet ». Nom : `robot-clipping`, sans organisation.
   - **N'activez pas la facturation et ne cliquez pas sur l'essai gratuit** : il demande une carte.
2. Dans *API et services*, puis *Bibliothèque*, activez **Google Drive API**, **Google Sheets API** et **Google Docs API**.
3. Ouvrez *Google Auth Platform*, puis « Commencer » :
   - nom : `Robot Clipping` ;
   - e-mail : le vôtre ;
   - audience : **Externe**.

   Puis « Créer ».
4. Dans *Accès aux données*, ajoutez **uniquement** `https://www.googleapis.com/auth/drive.file`, puis « Enregistrer ».
   - Le robot ne voit que les fichiers qu'il crée lui-même. Il ne voit ni votre Gmail ni le reste de votre Drive.
5. Dans *Audience*, cliquez sur « Publier l'application ». Le statut doit indiquer **« En production »**.
   - En mode « Test », Google coupe l'accès au bout de 7 jours.
   - Si Google exige une vérification, **arrêtez-vous et dites-le-moi**.
6. Dans *Clients*, cliquez sur « Créer un client » :
   - type : **Application Web** ;
   - nom : `robot-clipping` ;
   - URI de redirection : `https://developers.google.com/oauthplayground`

   Copiez l'**ID client** et le **code secret** dans votre gestionnaire de mots de passe.
7. Dans *Identifiants*, cliquez sur « Créer des identifiants », puis « Clé API » :
   - « Restreindre la clé » à Drive, Sheets et Docs ;
   - aucune restriction d'application.

   Copiez la clé dans votre gestionnaire.
8. **Jeton d'accès durable :**
   1. Ouvrez https://developers.google.com/oauthplayground, puis l'engrenage.
   2. Cochez « Use your own OAuth credentials » et collez l'ID client et le code secret. *Access type* : **Offline**.
   3. Dans « Input your own scopes », tapez `https://www.googleapis.com/auth/drive.file`, puis « Authorize APIs ».
   4. Choisissez votre compte habituel, puis « Autoriser ».
   5. Cliquez sur « Exchange authorization code for tokens » et copiez le **Refresh token** dans votre gestionnaire.
   - Si l'écran « application non validée » apparaît : « Paramètres avancés », puis « Accéder à Robot Clipping ». C'est votre propre application.
   - Accès révocable à tout moment : https://myaccount.google.com/permissions

### C. Secrets Google dans GitHub (PC, 5 min)

Dans le dépôt `robot-clipping`, ouvrez *Settings*, *Secrets and variables*, *Actions*. Pour chaque ligne, cliquez sur « New repository secret » :

| Nom exact | Valeur |
|---|---|
| `GOOGLE_CLIENT_ID` | B6 |
| `GOOGLE_CLIENT_SECRET` | B6 |
| `GOOGLE_REFRESH_TOKEN` | B8 |
| `GOOGLE_API_KEY` | B7 |

Envoyez-moi **seulement la liste des noms créés**.

### D. Raccourci iPhone, version de test (iPhone, 10 min)

Suivez `RACCOURCI-IPHONE.md`, § 5. Le Raccourci enregistre la capture dans un dossier Drive `CAPTURES ROBOT` que vous créez vous-même. **Ne l'essayez pas encore** : l'essai sur Koba est la première action de la phase 1, avec moi.

### E. Campagne Koba (2 min)

Vérifiez dans Safari que la campagne est **toujours ouverte** et que vous y êtes **inscrit** : les consignes et les fichiers doivent être lisibles.

### Quand A à E sont faits

Envoyez-moi : « Étape 0 terminée », la **liste des noms de secrets**, et tout point bloqué. **La phase 1 ne démarre qu'après votre accord explicite** (voir `PLAN.md`).

---

## 5. Pour les phases suivantes (ne rien faire maintenant)

### F. Anthropic, avant la phase 2

1. Sur https://platform.claude.com, créez le compte avec votre adresse habituelle. **N'ajoutez aucun crédit sans en avoir parlé avec moi.**
2. Au démarrage de la phase 2, après votre accord :
   - achetez le crédit au montant minimal proposé par la Console ;
   - réglez une **limite de dépense** dans la Console (seconde sécurité, en plus du plafond de 5 $ appliqué dans le code) ;
   - créez une clé et ajoutez-la dans GitHub sous le nom `ANTHROPIC_API_KEY`.

### G. Envoi direct sans passer par Drive, avant la phase 3

1. Second projet Supabase gratuit `robot-clipping`, région **Central EU (Frankfurt)**, plan **Free**. Copiez l'URL du projet et une clé secrète `robot-worker`.
2. **Jeton GitHub limité** pour le lancement :
   - https://github.com/settings/personal-access-tokens/new ;
   - accès : **uniquement** `robot-clipping` ;
   - permission : **Actions** en lecture et écriture, rien d'autre.

   Il sera enregistré côté Supabase, jamais dans le Raccourci.
3. Un **code secret** pour le Raccourci (généré par votre gestionnaire de mots de passe).
4. L'application **ntfy** sur l'iPhone (gratuite, sans compte), pour les notifications.
5. Le déploiement de la boîte de réception Supabase sera **soumis à votre autorisation**.

### H. Ancien Clipper (plus tard)

Copie nettoyée (sans `.env`, sans clé Deepgram, sans `venv` ni vidéos), envoyée dans `robot-clipping/reference/clipper-ancien/` par « Add file », puis « Upload files ».

---

## 6. Points à surveiller pendant l'étape 0

- **Si Google demande une carte, une vérification ou une facturation** à n'importe quelle étape : arrêtez-vous, rien de tout cela n'est nécessaire.
- **Si GitHub affiche un moyen de paiement** : vérifiez le budget Actions à 0 $ (A2).
- Le dépôt `nextech` est **public**. Ces documents n'y contiennent aucun secret ni identifiant, et le code du robot ira dans le dépôt **privé**.
