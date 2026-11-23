# Étape 0 : préparer les accès

Rédigé le 23 novembre 2026. **Rien n'a été créé, déployé ni payé.** Toutes les actions ci-dessous sont **les vôtres** : je ne les exécute pas à votre place.

**Règle d'or : aucun secret dans la conversation.** Mots de passe, clés et jetons vont uniquement dans votre gestionnaire de mots de passe (Trousseau iCloud ou app « Mots de passe »), puis dans les « Secrets » de GitHub (bloc E). Je n'ai jamais besoin de les voir.

---

## 1. Vos décisions (23/11/2026)

| Sujet | Décision |
|---|---|
| Ancien Clipper | À étudier (`C:\Users\pc\clipper\clipper`, Python, Deepgram). La V1 n'en dépend pas : la transcription se fait avec faster-whisper, gratuit, sur le serveur. |
| Content Rewards | Raccourci iPhone « Envoyer au robot ». Aucune automatisation qui se connecte à votre compte. |
| IA | Haiku trie, Opus analyse les 15 meilleurs. Plafond strict de 5 $ pour le premier essai. Aucun achat de crédit sans votre accord. |
| Volume | Aucune limite fixée dans le code (une file d'attente, une exécution par campagne). La seule limite est la ressource de calcul gratuite : 2 000 min par mois sur GitHub. Le robot prévient quand elle approche, et le même programme pourra tourner ailleurs sans réécriture. |
| Google Drive | Votre compte habituel, celui qui reçoit les partages des campagnes. Un dossier dédié `ROBOT CLIPPING`. |
| Format | 9:16, sans couper de visage ni d'élément important. Si les visages ne tiennent pas dans un recadrage, le robot passe au fond flou. Sous-titres seulement si la campagne les autorise et si le clip n'en a pas déjà. |
| Infrastructure | Un dépôt GitHub privé séparé et un second projet Supabase gratuit. |
| Priorité | Une première campagne complète : clips prédécoupés, meilleures sélections, descriptions prêtes à poster. |

---

## 2. Vérifications faites avant l'étape 0

### Conditions de Content Rewards

Documents lus : conditions créateurs du 17/11/2026, politique de copyright du 24/09/2026.

| Question | Ce que disent les textes | Conséquence pour le robot |
|---|---|---|
| Accès automatisé (scripts, robots, extensions) | Les conditions créateurs **n'en parlent pas**. Les CGU de Whop l'interdisent sans accord écrit. | **Aucune récupération automatique sur Content Rewards en V1.** Le Raccourci est lancé par vous, sur la page que vous voyez : c'est l'équivalent d'un copier-coller. |
| Usage de l'IA pour choisir ou monter | Aucune clause. Pas d'exigence d'originalité. | Autorisé, en l'état des textes. |
| Rushes et clips fournis | § 17.1 : licence « limited, revocable », « only to create and post the Campaign's Clip ». § 17.6 : la marque possède le clip final. | Le robot n'utilise les fichiers que pour vos clips de la campagne, puis **purge les vidéos après la fin de la campagne** (la licence est révocable). |
| Faux engagement | § 12.2 et § 13.2 : acheter ou générer des vues mène au « permanent ban ». | Le robot ne touche jamais à TikTok, ni aux vues, ni aux comptes. |
| Comptes multiples | § 13.3 : « one account only ». § 9.4 : les comptes liés sont surveillés. | Le robot n'utilise aucun compte Content Rewards. |
| Mentions publicitaires | § 12.9 : vous êtes responsable des règles de publicité, et pour une vidéo la mention « must appear at the beginning of the video ». | Le robot recopie toute mention exigée par la campagne. Voir la question 3 au § 5. |

Non lus :
- les anciennes « Clippers Terms » de l'époque Whop, à demander à legal@contentrewards.com si une campagne a été rejointe sur Whop ;
- la page FTC de Content Rewards.

### Modèles et tarifs Claude

Relevés le 23/11/2026 sur `platform.claude.com/docs/en/about-claude/pricing` et `…/models/overview`.

| Rôle | Nom | Identifiant API exact | Entrée | Sortie | Lots (−50 %) |
|---|---|---|---|---|---|
| Tri | Claude Haiku 5.5 | `claude-haiku-5-5` | 0,10 $ / M jetons | 0,50 $ / M | 0,05 / 0,25 $ |
| Analyse des 15 meilleurs | Claude Opus 5.5 | `claude-opus-5-5` | 4 $ / M | 20 $ / M | 2 / 10 $ |

**Piège** : Haiku 5.5 coûte 5 fois plus cher (0,50 / 2,50 $) au-delà de 100 000 jetons par requête. Le robot envoie un clip par requête, soit environ 8 000 jetons, très en dessous du seuil.

**Estimation pour Koba (43 clips)** : 1,35 $ au total, sous le plafond de 5 $. Le plafond est appliqué dans le code : toute requête qui ferait dépasser 5 $ est refusée avant l'envoi.

---

## 3. Liste des actions

Durée totale : environ 1 h. Les blocs B et G sont plus confortables sur un ordinateur, mais Safari sur iPhone en mode « site pour ordinateur » suffit.

### A. GitHub : dépôt privé (10 min, indispensable)

1. Ouvrez https://github.com/new. Remplissez :
   - Owner : `flavienherbert`
   - Repository name : `robot-clipping`
   - **Private**
   - cocher « Add a README file » ; pas de .gitignore ni de licence

   Puis « Create repository ».
2. **Vérifiez qu'aucun dépassement n'est possible.** Ouvrez https://github.com/settings/billing (*Billing and licensing*) :
   - si aucun moyen de paiement n'est enregistré, rien ne peut être facturé ;
   - sinon, dans *Budgets and alerts*, vérifiez qu'Actions a un budget de 0 $ et que l'usage s'arrête à la limite.
3. **Donnez-moi accès à ce dépôt seulement.** Ouvrez https://github.com/settings/installations, puis l'application **Claude** et « Configure ». Dans *Repository access*, ajoutez `robot-clipping`, puis « Save ».
4. Dites-moi « dépôt prêt ». Je le rattacherai à notre session, mais seulement quand vous aurez validé la phase 1.

### B. Google Cloud : accès à votre Drive (25 min, indispensable)

Connectez-vous avec **votre compte Google habituel**, celui qui reçoit les partages des campagnes.

1. Ouvrez https://console.cloud.google.com. Acceptez les conditions, puis « Sélectionner un projet », « Nouveau projet ». Nom : `robot-clipping`, sans organisation, puis « Créer ».
   - **N'activez pas la facturation et ne cliquez pas sur l'essai gratuit** : il demande une carte. Rien de ce qui suit n'en a besoin.
2. Dans *API et services*, puis *Bibliothèque*, activez :
   - **Google Drive API** (indispensable) ;
   - **Google Sheets API** et **Google Docs API** (gratuites, pour lire les documents de consignes).
3. Ouvrez *Google Auth Platform* (anciennement « Écran de consentement OAuth ») et cliquez sur « Commencer ». Remplissez :
   - nom de l'application : `Robot Clipping` ;
   - e-mail d'assistance : votre adresse ;
   - audience : **Externe** ;
   - e-mail de contact : votre adresse.

   Acceptez la politique, puis « Créer ».
4. Dans *Accès aux données*, cliquez sur « Ajouter ou supprimer des niveaux d'accès ». Ajoutez **uniquement** `https://www.googleapis.com/auth/drive.file`, puis « Enregistrer ».
   - Ce niveau d'accès ne donne au robot accès qu'aux fichiers qu'il crée lui-même. Il ne voit ni votre Gmail ni le reste de votre Drive.
5. Dans *Audience*, cliquez sur « Publier l'application » et confirmez. Le statut doit indiquer **« En production »**.
   - Pourquoi : en mode « Test », Google coupe l'accès au bout de 7 jours.
   - Si Google exige une **vérification**, arrêtez-vous et dites-le-moi. Ce n'est normalement pas le cas pour ce niveau d'accès.
6. Dans *Clients*, cliquez sur « Créer un client » :
   - type : **Application Web** ;
   - nom : `robot-clipping` ;
   - URI de redirection autorisé : `https://developers.google.com/oauthplayground`

   Puis « Créer ». Copiez l'**ID client** et le **code secret du client** dans votre gestionnaire de mots de passe.
7. Dans *API et services*, puis *Identifiants*, cliquez sur « Créer des identifiants », puis « Clé API ».
   - Ouvrez la clé et cochez « Restreindre la clé » : Google Drive API, Google Sheets API, Google Docs API.
   - Restriction d'application : aucune, car les serveurs de GitHub changent d'adresse.
   - « Enregistrer », puis copiez la clé dans votre gestionnaire.
8. **Jeton d'accès durable** :
   1. Ouvrez https://developers.google.com/oauthplayground et cliquez sur l'engrenage en haut à droite.
   2. Cochez « Use your own OAuth credentials », collez l'ID client et le code secret. Vérifiez que *Access type* est sur **Offline**.
   3. À gauche, dans « Input your own scopes », tapez `https://www.googleapis.com/auth/drive.file`, puis « Authorize APIs ».
   4. Choisissez votre compte habituel et cliquez sur « Autoriser ». Si l'écran « application non validée » apparaît : « Paramètres avancés », puis « Accéder à Robot Clipping ». C'est votre propre application.
   5. Cliquez sur « Exchange authorization code for tokens » et copiez le **Refresh token** dans votre gestionnaire.
   - Vous pourrez révoquer cet accès à tout moment sur https://myaccount.google.com/permissions.

### C. Supabase : second projet gratuit (10 min, facultatif maintenant)

L'historique ne sert qu'à partir de la phase 3. **Un projet gratuit sans activité se met en pause après 7 jours** (réactivation gratuite, en un clic). Vous pouvez donc le créer maintenant ou plus tard.

1. Ouvrez https://supabase.com/dashboard, puis « New project ». Remplissez :
   - organisation : la même que Studio Accroche ;
   - nom : `robot-clipping` ;
   - mot de passe de la base : « Generate », puis copiez-le dans votre gestionnaire ;
   - région : **Central EU (Frankfurt)** ;
   - plan : **Free**.

   Puis « Create ».
   - Si Supabase demande une carte ou propose un plan payant comme seule option, arrêtez-vous et dites-le-moi.
2. Dans *Project Settings*, puis *API Keys* :
   - copiez l'**URL du projet** ;
   - créez une **clé secrète** nommée `robot-worker` (ou utilisez `service_role` si c'est l'ancien affichage) et copiez-la dans votre gestionnaire.
3. Ne créez aucune table : je fournirai le script SQL, à relire avant exécution.

### D. Anthropic : compte API sans paiement (5 min)

1. Ouvrez https://platform.claude.com et connectez-vous avec votre adresse habituelle. Créez l'organisation si on vous le demande.
2. **N'ajoutez aucun crédit et ne créez pas encore de clé.** Repérez seulement les pages de facturation et de limites de dépense.
3. L'achat de crédit et la clé viendront à la phase 2, après votre accord explicite. Votre abonnement Claude (claude.ai) est séparé et ne paie pas l'API.

### E. Secrets dans GitHub (5 min, après A et B, et C si fait)

Dans le dépôt `robot-clipping`, ouvrez *Settings*, *Secrets and variables*, *Actions*. Pour chaque ligne, cliquez sur « New repository secret » :

| Nom exact | Valeur (depuis votre gestionnaire) |
|---|---|
| `GOOGLE_CLIENT_ID` | B6 |
| `GOOGLE_CLIENT_SECRET` | B6 |
| `GOOGLE_REFRESH_TOKEN` | B8 |
| `GOOGLE_API_KEY` | B7 |
| `SUPABASE_URL` | C2 (si fait) |
| `SUPABASE_SECRET_KEY` | C2 (si fait) |

GitHub masque ces valeurs dans les journaux, et je ne peux pas les lire. Envoyez-moi seulement **la liste des noms créés**.

### F. iPhone (5 min)

1. Ouvrez *Réglages*, *Apps*, *Raccourcis*, *Avancé* et activez **« Autoriser l'exécution de scripts »**. Le Raccourci « Envoyer au robot » en aura besoin ; je le fournirai à la phase 2.
2. Dans Safari, connecté à Content Rewards, ouvrez la campagne Koba. Vérifiez que « Content requirements » et « Reference materials » sont lisibles, et non plus « Visible once you join ».

### G. Ancien Clipper (pour l'étude, non bloquant)

Choisissez **une** des deux méthodes.

**1. Recommandée : envoi d'une copie nettoyée.**
1. Sur l'ancien PC, copiez `C:\Users\pc\clipper\clipper` vers un nouveau dossier.
2. Dans la copie, **supprimez** :
   - `.env` et tout fichier contenant une clé (par exemple `config` ou `settings` avec « deepgram ») ;
   - `venv`, `.venv` et `__pycache__` ;
   - toutes les vidéos et tous les fichiers produits.
3. Sur github.com, dans `robot-clipping`, cliquez sur « Add file », puis « Upload files ». Glissez le dossier nettoyé dans `reference/clipper-ancien/`, puis « Commit ».

**2. Lecture à distance.** Allumez l'ancien PC et lancez Desktop Commander. Je lis le code en lecture seule, sans ouvrir `.env`, et seulement après votre accord.

Si une clé Deepgram a pu se glisser dans un fichier envoyé ou partagé, **régénérez-la** dans la console Deepgram.

### H. Campagne Koba, pour le premier essai

1. Confirmez que la campagne est toujours ouverte et que vous y êtes inscrit.
2. Au démarrage de la phase 1, collez-moi le **texte exact** de « Content requirements » : la description officielle, les hashtags et mentions imposés, les interdictions, la durée. Ce texte n'est pas secret. Collez aussi les liens « Reference materials ».
3. Facultatif, mais utile pour mesurer l'IA : notez vous-même 20 clips du dossier, en gardant / en écartant avec une raison courte. Je comparerai vos choix à ceux du robot.

### Reporté à plus tard (inutile pour la première campagne)

- Cloudflare Pages (interface web) : phase 5.
- ntfy (notifications) : phase 5.
- Achat de crédit Anthropic : phase 2, avec votre accord.
- Espace Google One : seulement si les 15 Go gratuits ne suffisent pas.

---

## 4. Ensuite (pour information, rien ne démarre sans votre accord)

**Phase 1, sans IA payante.** Je propose ceci :
- un programme dans `robot-clipping` ;
- un premier contrôle en lecture seule : présence des secrets, accès au dossier Drive Koba, création de `ROBOT CLIPPING/CAMPAGNES/Koba LaD…` ;
- l'inventaire des 43 clips : doublons par empreinte md5, durée, format, transcription, images clés.

Le déclenchement se fera à la main depuis Safari (github.com) ou l'application GitHub, avant que l'interface existe.

**Phase 2, avec le plafond de 5 $** : tri par Haiku, analyse des 15 meilleurs par Opus, conversion 9:16 si nécessaire, puis dépôt des vidéos, descriptions, consignes et rapport. **C'est la première campagne complète.**

---

## 5. Questions ouvertes

1. Avez-vous un **ordinateur en service**, en plus de l'iPhone ? Il est plus pratique pour les blocs B et G.
2. Pour l'ancien Clipper : **méthode 1 ou 2** ?
3. La campagne Koba exige-t-elle une **mention publicitaire** (« Publicité », « Collaboration commerciale », #ad) ? En France, la loi de 2023 sur l'influence commerciale impose une mention quand il y a une contrepartie. Je ne sais pas si elle s'applique au clipping rémunéré à la vue : c'est à vérifier, ce n'est pas un avis juridique. Le robot appliquera ce que la campagne exige.
