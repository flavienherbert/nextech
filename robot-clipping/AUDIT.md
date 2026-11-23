# Robot de clipping Content Rewards : audit technique

Audit du 23 novembre 2026. **Rien n'a été créé, déployé, souscrit ni dépensé. Aucun fichier existant n'a été modifié.** Ce document est le seul ajout au dépôt.

Légende : **[vérifié]** = constaté pendant l'audit (requête, lecture, mesure) · **[à tester]** = plausible, à démontrer en phase 1 · **[estimation]** = calcul sur hypothèses écrites.

---

## 0. Verdict

1. **Le système est réalisable pour environ 0 € par mois d'infrastructure**, plus un coût d'IA de **0,10 à 5 $ par campagne** selon le modèle choisi (détail au § 9).
2. **Une limite empêche le « je colle seulement le lien »** **[vérifié]**. Sur Content Rewards, sans connexion, une campagne affiche le titre, la rémunération et le budget, mais **les règles (« Content requirements ») et les fichiers (« Reference materials », donc les liens Drive) sont marqués « Visible once you join »**. Il faut un compte connecté et inscrit à la campagne. Les conditions de Whop interdisent l'accès automatisé sans accord écrit. Je recommande donc un **favori « Envoyer au robot »** : vous le touchez sur la page de la campagne, ouverte et connectée dans votre navigateur. Cela fait **un geste de plus** que coller un lien, et aucun robot ne se connecte à votre compte.
3. **Netlify ne convient pas au robot.** Les crédits gratuits sont épuisés et partagés avec Studio Accroche, et les fonctions ne sont pas faites pour des traitements vidéo de plusieurs minutes. **Supabase convient pour l'historique, pas pour les vidéos** (50 Mo par fichier, 1 Go au total).
4. **Le calcul vidéo peut tourner sur GitHub Actions, gratuitement, dans un nouveau dépôt privé.** Le dépôt `nextech` est public : les journaux d'exécution y seraient visibles par tous.
5. **L'IA ne peut pas garantir à 100 % le respect des règles visuelles.** Votre cas réel le montre : dans le dossier de clips prédécoupés de la campagne Koba LaD, un clip a un titre qui mentionne l'accident, alors que les images de l'accident sont interdites. Le robot signale et classe à part ; **vous validez avant de publier**.
6. **Votre ancien Clipper n'a pas pu être examiné.** Votre ordinateur est hors ligne depuis environ 57 jours et le code n'est dans aucun dépôt accessible. Il me faut son code (§ 6 et questions).

---

## 1. Ce qui a été examiné

| Élément | Méthode | Résultat |
|---|---|---|
| Dépôt `nextech` (6 branches) | Lecture git | **Public.** Studio Accroche sur `claude/autonomous-profitable-business-5u6yv9` (`site/`, Next.js 15). Aussi `fruit-studio`, `fiches-google`, `artisans`. |
| Netlify | API, lecture seule | Une équipe « Free » et un seul projet, `studio-accroche-preprod`. Le déploiement est manuel (le dépôt n'est pas relié, d'après `site/MISE-EN-LIGNE.md`). Les crédits du mois sont épuisés depuis le 16 novembre (`LANCEMENT.md`). |
| Supabase | Documentation du dépôt (`site/SUPABASE.md`) | Offre gratuite, Francfort. Aucun accès direct depuis cette session. |
| Content Rewards | Requêtes HTTP sur les pages publiques, lecture des CGU | Voir § 3. |
| Google Drive | Connecteur Drive, lecture seule | Campagne Koba : un dossier de **43 clips MP4 de 7,7 à 27,7 Mo (0,9 Go, moyenne 20,8 Mo)**, dont **2 paires de doublons probables** (même nom et même taille). Une **archive ZIP de 11,7 Go**. Les deux sont partagés en « tout utilisateur disposant du lien ». |
| GitHub | API de recherche | Aucun code « clipper » dans `nextech`. Deux dépôts privés ne sont pas accessibles depuis cette session. |
| Desktop Commander | Liste des appareils | Un PC, **hors ligne depuis 1 374 h**. |
| Cloudflare | API | Connecteur présent, mais l'authentification a été refusée depuis cette session : **non vérifié**. |
| ffmpeg (test local, vidéo synthétique 1080p de 60 s, 4 cœurs) | Mesure | Recadrage 9:16 avec fond flou : **54 s**. Extraction de 30 images clés (une par plan et une toutes les 2 s) : **4 s**. Une image en 512×288 vaut **≈ 197 jetons** pour Claude. |

---

## 2. L'existant : ce qui sert et ce qui ne sert pas

| Outil | Pour le robot ? | Pourquoi |
|---|---|---|
| Netlify (offre gratuite) | **Non** | Les 300 crédits par mois sont communs à tout le compte, et un déploiement en coûte 15 : héberger le robot ici concurrencerait Studio Accroche. Les fonctions sont trop courtes pour la vidéo et n'ont pas ffmpeg. |
| Supabase Postgres | **Oui** | Historique, progression, file d'attente. Le volume se compte en Ko par campagne. |
| Supabase Storage | **Non** | 50 Mo par fichier, 1 Go au total, 5 Go de sortie par mois. Un seul épisode dépasse ces limites. |
| Code de Studio Accroche | Idées seulement | Je reprends le principe des notifications ntfy. Le robot ne touche à rien du site. |
| Code de `fruit-studio` | **Oui** | `media.py` (vérification ffprobe), `costs.py` (plafond de dépense global qui refuse tout appel au-delà) et `state.py` (reprise par empreintes) se transposent directement. |
| Connecteur Google Drive de Claude | Non pour le robot | Il sert pendant nos sessions, pas pour un traitement qui tourne seul la nuit. |
| ntfy | **Oui** | Notification gratuite sur le téléphone quand une campagne est prête. |

---

## 3. Accéder à Content Rewards

**Faits [vérifié, 23/11/2026, sans connexion]**
- Les adresses de campagne ont la forme `contentrewards.com/c/campaigns/<identifiant>`.
- **Visible sans connexion** : titre, description, rémunération par plateforme (par 1 000 vues, minimum, maximum) et budget consommé.
- **Invisible sans connexion** : « Reference materials : 1 file, Visible once you join » et « Content requirements : 1 rule, Visible once you join ».
- Je n'ai trouvé aucune API officielle pour les créateurs.
- Les CGU de Whop (§ 5) interdisent « accessing or monitoring any material […] using any automated means, including robots, spiders, or scrapers » et « scraping our services without our written consent ».
- Les conditions créateurs de Content Rewards (version du 17/11/2026) : je n'y ai trouvé aucune clause sur l'accès automatisé, mais ma lecture n'est pas exhaustive. La licence sur les rushes sert « only to create and post the Campaign's Clip » (§ 17.1), ce qui est compatible avec l'usage du robot.

| Option | Gestes pour vous | Conforme | Fiabilité | Avis |
|---|---|---|---|---|
| **A. Favori « Envoyer au robot »** : un petit script que **vous** lancez sur la page ouverte et connectée. Il envoie au robot le texte de la page et tous ses liens. | 1 | Oui : c'est votre navigateur, à votre demande | Bonne : il capture tout, et l'IA structure les règles en citant la phrase source | **Recommandée** |
| B. Copier-coller des règles et des liens dans l'interface | 2 ou 3 | Oui | Les liens se perdent parfois au copier | Solution de secours, toujours disponible |
| C. Robot connecté avec votre cookie de session | 0 (lien seul) | **Contraire aux CGU de Whop**, zone grise sur Content Rewards | Le cookie expire, il y a une protection anti-robot, et **le compte peut être suspendu, avec perte des gains** | Déconseillée sans accord écrit |
| D. Demander à Content Rewards une autorisation ou une API | — | Oui | — | À faire en parallèle (gratuit) |

Utilisation du favori : sur iPhone, le plus pratique est un Raccourci (« Partager », puis « Envoyer au robot »). Sur Android avec Chrome, on tape le nom du favori dans la barre d'adresse.

---

## 4. Google Drive, Docs et Sheets

- **Lire les dossiers de campagne.** L'API Drive avec une **clé API gratuite** suffit pour les fichiers partagés par lien, ce qui est le cas des éléments Koba **[vérifié]**. Certains liens contiennent un `resourcekey`, que le robot gère.
- **Doublons, sans rien télécharger.** L'API renvoie l'empreinte md5, la taille, la durée et les dimensions (`videoMediaMetadata`). Le robot dédoublonne et filtre par durée ou format instantanément. Une table des empreintes déjà vues évite aussi les doublons entre campagnes.
- **Télécharger.** Le robot utilise `files.get?alt=media`. Limite connue : Google peut bloquer 24 h un fichier très téléchargé (« download quota exceeded »), ce qui est probable sur une campagne partagée à des milliers de clippeurs. Parade : copier le fichier dans votre Drive, puis télécharger la copie **[à tester]**.
- **Archive ZIP de 11,7 Go.** Une fois décompressée, elle ne tient pas sur le disque du serveur gratuit (14 Go). Deux parades **[à tester, risque technique n° 1]** :
  - lire l'archive à distance par plages d'octets et n'extraire que l'épisode utile ;
  - décompresser en flux, épisode par épisode, en supprimant chaque épisode après traitement.
- **Google Docs** : export en texte par l'API Drive. **Google Sheets** : API Sheets (`values.get`) ou export CSV. Un fichier public se lit avec la clé API. Un fichier restreint n'est pas lisible avec l'autorisation minimale : vous l'ouvrez vous-même, ou vous accordez une lecture de tout votre Drive, ce que je déconseille.
- **Écrire dans votre Drive.** Le robot utilise l'autorisation OAuth `drive.file` : il ne voit que ce qu'il a créé. **Piège** : tant que l'application Google est en mode « Test », l'autorisation expire au bout de 7 jours. Il faut la passer « En production ». `drive.file` est un périmètre non sensible, donc la vérification par Google ne devrait pas être exigée **[à confirmer à la création]**. Un compte de service ne peut pas écrire dans un Drive personnel gratuit (Google répond « Service Accounts do not have storage quota »).
- **Espace.** Le Drive gratuit offre 15 Go, partagés avec Gmail et Photos. Avec 200 à 400 Mo par campagne **[estimation]**, il est plein après 35 à 70 campagnes. Le robot purgera automatiquement les vidéos marquées « publiée » ou vieilles de plus de N jours. Les descriptions et rapports sont conservés.

---

## 5. Sélectionner les meilleurs clips

**Méthode, dans l'ordre**
1. **Filtres gratuits** : doublons (md5), durée hors cible, format, fichiers déjà utilisés (historique), titres qui contiennent des mots des interdictions.
2. **Analyse de chaque clip** :
   - transcription mot à mot avec faster-whisper, gratuit, sur le serveur ;
   - une image par plan et une toutes les 2 s (environ 30 images par minute) ;
   - mesures techniques avec ffprobe : résolution, niveau sonore, durée.
3. **Note sur 100 par critère** : accroche de 0 à 3 s, compréhension sans contexte, rétention, potentiel de partage et de commentaires, qualité image et son, durée adaptée.
4. **Contrôle des règles, séparé de la note.** Chaque clip reçoit le verdict « conforme », « risque » ou « interdit », avec la règle en cause et l'horodatage. Un clip « risque » est rangé à part et n'est jamais présenté comme sûr.
5. **Classement final** avec une justification de 2 lignes par clip. Les clips prédécoupés passent en priorité.

**Modèle.** Claude ne lit pas une vidéo directement : il reçoit les images et la transcription, comme décrit ci-dessus. Prix officiels Anthropic (relevé du 03/11/2026, en $ par million de jetons, entrée / sortie) :

| Modèle | Entrée | Sortie | Coût d'un clip de 60 s **[estimation]** | 43 clips Koba |
|---|---|---|---|---|
| Claude Opus 5.5 | 4 | 20 | 0,063 $ | 2,71 $ |
| Claude Sonnet 5.5 | 2 | 10 | 0,032 $ | 1,35 $ |
| Claude Haiku 5.5 | 0,10 | 0,50 | 0,0016 $ | 0,07 $ |

Hypothèse : 30 images × 200 jetons, plus la transcription et les consignes, soit ≈ 8 250 jetons en entrée et ≈ 1 500 en sortie (réflexion comprise). Le traitement par lots (« Batch ») coûte **50 % de moins**, avec un résultat sous 24 h.

**Mon avis.** Haiku suffit pour les filtres et un premier tri sur la transcription. Pour juger une accroche en français familier ou repérer une image interdite, je m'attends à ce qu'Opus ou Sonnet soient nettement meilleurs. C'est une hypothèse : la phase 2 la mesure sur Koba, en comparant les choix du robot aux vôtres (vous notez 20 clips). Réglage proposé au départ : Opus 5.5 avec un plafond de dépense. Vous décidez ensuite, chiffres en main, de passer une étape à Sonnet ou à Haiku. Option économique : Haiku trie les 43 clips, puis Opus n'examine que les 15 meilleurs, pour **≈ 1,35 $** la campagne.

**Alternative.** Gemini (Google) lit nativement la vidéo et le son. Les prix publiés que j'ai trouvés se contredisent, donc je ne le retiens pas tant qu'ils ne sont pas vérifiés. Le code isolera le fournisseur d'IA pour permettre ce changement.

**Limite honnête.** Aucun modèle ne prédit de façon fiable la viralité sur TikTok : la note est une aide au tri. En V2, vous saisissez les vues obtenues, et le robot compare ses notes aux résultats réels pour s'ajuster.

---

## 6. Vidéos longues et ancien Clipper

- **Déclenchement** : seulement si moins de N clips prédécoupés atteignent le seuil (par exemple 5 clips à 70/100 ; les deux valeurs sont réglables).
- **Méthode** :
  1. transcription horodatée au mot ;
  2. l'IA propose des passages qui commencent et finissent sur des fins de phrase, **jamais réordonnés, sans aucun texte ajouté** ;
  3. vérification visuelle des passages retenus ;
  4. découpe ;
  5. passage au format 9:16.
- **Format 9:16, deux modes** :
  - fond flou : tout le plan 16:9 reste visible, rien n'est coupé (mesuré à 54 s pour 60 s de vidéo, optimisable) ;
  - recadrage qui suit le visage : plus proche du style TikTok, mais peut couper un interlocuteur.
- **Sous-titres incrustés** : uniquement le texte exact de la transcription, désactivés par défaut.
- **Ancien Clipper** : non examiné. Pour tourner dans le cloud, il doit remplir cinq conditions :
  - fonctionner sous Linux, sans écran ;
  - ne pas exiger de carte graphique ;
  - ne dépendre d'aucun logiciel Windows ;
  - s'appeler en ligne de commande (vidéo, début et fin en entrée, MP4 9:16 en sortie) ;
  - ne pas dépendre d'un service payant.

  Si une condition manque, je reprends ses réglages (format, sous-titres, style) dans un module ffmpeg neuf, pour 1 à 2 jours de charge **[estimation]**.

---

## 7. Faire tourner les traitements dans le cloud

| Option | Coût | Puissance | Limites | Verdict |
|---|---|---|---|---|
| **GitHub Actions, nouveau dépôt privé** | 0 € : 2 000 min par mois incluses, et le plafond de dépense par défaut à 0 $ bloque tout dépassement | 2 cœurs, 8 Go de RAM, 14 Go de disque, 6 h maximum par tâche | Les CGU prévoient Actions pour le logiciel du dépôt. Un usage personnel de traitement de données reste une **zone grise** (risque : tâches arrêtées) | **Recommandé pour la V1** |
| GitHub Actions dans `nextech` (public) | 0 €, minutes illimitées | 4 cœurs, 16 Go | **Code et journaux publics** : noms de campagnes, liens et justifications visibles par tous | Déconseillé |
| Netlify | Crédits épuisés | Fonctions courtes, pas de ffmpeg | Met Studio Accroche en danger | Non |
| Google Cloud Run Jobs | ≈ 0 € dans l'offre gratuite, **carte bancaire obligatoire** | Jusqu'à 8 cœurs et 32 Go | Mise en place plus lourde, facturation possible au-delà de l'offre gratuite | Repli si GitHub pose problème |
| Petit serveur loué | 4 à 6 € par mois (abonnement) | Stable | Entretien à votre charge | Seulement si le volume devient élevé |
| Claude Code (cette interface) comme robot | Inclus dans votre abonnement | — | Consomme votre quota d'usage, pas d'interface dédiée, peu fiable sans surveillance | Utile pour des essais manuels, pas comme robot |

**Durée par campagne, sur 2 cœurs [estimation, à mesurer en phase 1]** :
- clips prédécoupés seuls : 20 à 40 min ;
- avec environ 6 h de vidéos longues : 2 à 4 h, à cause de la transcription sur processeur.

Avec 2 000 min par mois, cela fait environ 50 campagnes « clips seuls », ou environ 10 avec vidéos longues.

---

## 8. Interface sur téléphone

- **Page web installable** sur l'écran d'accueil :
  - un champ pour la capture ou le lien, et un bouton « Lancer » ;
  - la liste des campagnes avec le nombre de vidéos analysées et sélectionnées, et la progression en direct ;
  - un lien vers le dossier Drive, et les descriptions avec un bouton « Copier » ;
  - l'historique et les erreurs.
- **Connexion** par lien magique envoyé par e-mail (Supabase Auth), avec un seul compte autorisé.
- **Hébergement** sur Cloudflare Pages (gratuit), **pas sur Netlify**.
- **Lancement** : une fonction Supabase déclenche GitHub Actions. Le jeton GitHub est limité au dépôt du robot et reste côté serveur, jamais dans la page.
- **Notification** ntfy quand c'est prêt, par exemple : « Koba LaD : 8 clips prêts ».

Exemple de fichier de description, un par vidéo :

```
CAMPAGNE              Koba LaD – Demain j'arrête
FICHIER               03_je-vais-vous-dire-toute-la-verite_916.mp4
PLATEFORME CONSEILLÉE TikTok
DESCRIPTION OFFICIELLE (copiée mot pour mot) : … | « Aucune description officielle fournie »
PROPOSITION DE LÉGENDE (IA, à relire) : …
HASHTAGS OBLIGATOIRES : …          MENTIONS OBLIGATOIRES : …
NOTE 82/100 : accroche 9/10, sans contexte 8/10, rétention 8/10, partage 7/10, qualité 9/10
POURQUOI : …
RÈGLES : conforme. Vérifié : pas de caméra de surveillance, pas d'accident, pas d'épisode 6 (confiance : moyenne)
```

---

## 9. Coût réel par campagne

| Poste | Coût |
|---|---|
| Hébergement, calcul, base de données, interface, notifications | **0 €** |
| IA, clips prédécoupés seuls (≈ 40 clips) | Opus ≈ 3,05 $ · Sonnet ≈ 1,52 $ · Haiku ≈ 0,08 $ · mixte Haiku + Opus ≈ 1,35 $ |
| IA, avec environ 6 h de vidéos longues | Supplément : Opus ≈ 1,68 $ · Sonnet ≈ 0,84 $ · Haiku ≈ 0,04 $ |
| Traitement par lots | −50 % sur l'IA, si vous acceptez jusqu'à 24 h d'attente |
| Stockage Drive | 0 € tant que vous restez sous 15 Go (purge automatique) |

**Exemple à 10 campagnes par mois** : Opus 30 à 47 $, Sonnet 15 à 24 $, mixte 14 à 30 $, Haiku 1 à 2 $.

Un plafond mensuel stoppe tout appel au-delà, comme dans `fruit-studio`. L'API Anthropic se paie par crédit prépayé, sans abonnement (montant minimal d'achat à vérifier).

---

## 10. Limites techniques

1. **Content Rewards** : un geste manuel (le favori) est nécessaire, sauf autorisation écrite de Content Rewards.
2. **Règles visuelles** : l'IA examine une image par plan et une toutes les 2 s. Un insert très court peut lui échapper. La validation humaine reste nécessaire, et votre publication manuelle la garantit.
3. **« Sauf l'épisode 6 »** : si les clips ne sont pas étiquetés par épisode, le robot ne peut pas savoir à coup sûr d'où vient un clip. Il le classe « risque » dès qu'il le soupçonne.
4. **Viralité** : c'est une estimation, pas une prévision.
5. **Quotas Google** : un fichier très téléchargé peut être bloqué 24 h, et votre Drive est limité à 15 Go.
6. **GitHub Actions** : zone grise des CGU, 14 Go de disque, 6 h maximum par tâche.
7. **Autorisation Google** : l'application doit être « En production », sinon l'accès expire tous les 7 jours. Les documents restreints restent illisibles.
8. **Supabase gratuit** : le projet est mis en pause après 7 jours d'inactivité. Une tâche hebdomadaire le maintient éveillé (≈ 1 min par semaine).
9. **Doublons** : les doublons exacts sont détectés (md5). Les copies réencodées demandent une empreinte visuelle (V2).
10. **Audience** : les critères « 70 % de spectateurs en France » et « 1 % d'engagement » dépendent de votre compte TikTok, pas du clip. Le robot les rappelle dans CONSIGNES ; il ne peut pas les garantir.

---

## 11. Accès et autorisations nécessaires

| # | Quoi | Qui | Coût |
|---|---|---|---|
| 1 | Créer un dépôt **privé** `robot-clipping` | Vous (je ne peux pas créer de dépôt) | 0 € |
| 2 | Projet Google Cloud **sans facturation** : activer les API Drive, Sheets et Docs ; écran de consentement « Externe » publié « En production » ; identifiant OAuth ; clé API restreinte. Je fournis la procédure pas à pas | Vous, environ 20 min | 0 € |
| 3 | Autoriser une fois le robot sur votre Drive (`drive.file`) | Vous, 2 min | 0 € |
| 4 | Second projet Supabase gratuit, isolé de Studio Accroche | Vous | 0 € |
| 5 | Compte API Anthropic, crédit prépayé et plafond de dépense | Vous, **après accord sur le coût** | Selon le § 9 |
| 6 | Saisir les secrets dans GitHub et Supabase, jamais dans la conversation | Vous | 0 € |
| 7 | Cloudflare Pages pour l'interface | Vous, ou moi via le connecteur après votre accord | 0 € |
| 8 | Application ntfy et sujet secret | Vous | 0 € |
| 9 | Installer le favori « Envoyer au robot » ; facultatif : écrire à Content Rewards | Vous | 0 € |
| 10 | Le code de l'ancien Clipper | Vous | — |

---

## 12. Fichiers à créer ou à modifier

**Dans `nextech`** : uniquement ce fichier, `robot-clipping/AUDIT.md`, sur la branche `claude/clipping-robot-audit-xeqfb2`. Studio Accroche, `fruit-studio` et les autres dossiers restent intacts. Aucune modification n'est prévue.

**Dans le nouveau dépôt privé `robot-clipping`** (proposition) :

```
robot-clipping/
├── README.md, docs/INSTALLATION.md       procédures Google Cloud, Supabase, secrets
├── .github/workflows/
│   ├── traiter-campagne.yml             déclenché par l'interface
│   └── maintien.yml                     maintient Supabase éveillé (hebdomadaire)
├── robot/                               Python 3.12
│   ├── pipeline.py                      orchestration, reprise après erreur
│   ├── campagne.py                      capture Content Rewards → consignes structurées (citations sources)
│   ├── drive.py                         lister, md5, télécharger, ZIP à distance, créer l'arborescence
│   ├── analyse.py                       ffprobe, plans, images clés, transcription
│   ├── selection.py                     notes IA, contrôle des règles, classement
│   ├── ia.py                            fournisseur d'IA isolé, plafond de dépense (repris de fruit-studio)
│   ├── decoupe.py                       vidéos longues → passages ; adaptateur Clipper
│   ├── format916.py                     fond flou ou suivi du visage
│   ├── publication.py                   descriptions, hashtags, CONSIGNES, RAPPORT
│   ├── historique.py                    Supabase : campagnes, fichiers vus, utilisés, erreurs
│   └── notifier.py                      ntfy
├── tests/                               pytest, vidéos synthétiques générées par ffmpeg
├── supabase/migrations/001_clipping.sql
├── supabase/functions/lancer/           déclenche GitHub Actions
├── interface/                           page web installable
└── favori/envoyer-au-robot.js
```

Arborescence créée dans votre Drive : `ROBOT CLIPPING / CAMPAGNES / <nom> / VIDEOS, DESCRIPTIONS, CONSIGNES, RAPPORT`.

---

## 13. Plan de développement

Chaque phase se termine par une démonstration, et la suivante attend votre accord.

| Phase | Contenu | Critère de fin | Charge [estimation] |
|---|---|---|---|
| 0. Accès | Points 1 à 10 du § 11 | Liste cochée | Environ 1 h de votre côté |
| 1. Preuve technique sur Koba, **sans IA payante** | Lister le Drive (md5, métadonnées), télécharger, tester le ZIP à distance, transcrire, extraire les images clés, passer en 9:16, sur GitHub Actions | Rapport des 43 clips avec les doublons détectés ; temps et minutes réels mesurés | 2 à 3 jours |
| 2. Consignes et sélection par l'IA | Favori, extraction des règles avec citations, notes, contrôle des règles. Essai réel sur Koba **avec un plafond de 5 $** | Comparaison avec vos 20 notes ; coût réel relevé | 2 à 3 jours |
| 3. Drive, descriptions, historique | Arborescence, un fichier de description par vidéo, CONSIGNES, RAPPORT, base Supabase, anti-doublons entre campagnes | Une campagne complète déposée dans votre Drive | 2 jours |
| 4. Vidéos longues et Clipper | Passages, découpe, 9:16, adaptateur Clipper | Des extraits fidèles, coupés sur des fins de phrase | 2 à 4 jours |
| 5. Interface téléphone et notifications | Page web, lancement, progression, ntfy | Lancement et suivi depuis le téléphone | 2 jours |
| 6. Robustesse | Reprises, quotas, purge Drive, journal d'erreurs, maintien de Supabase | 3 campagnes d'affilée sans intervention | 1 à 2 jours |

---

## Sources

- Content Rewards : https://contentrewards.com/c/discover · https://contentrewards.com/terms · https://contentrewards.com/about
- Whop : https://whop.com/tos/ · https://docs.whop.com/memberships-and-access/third-party-apps/content-rewards
- GitHub Actions : https://docs.github.com/en/actions/reference/runners/github-hosted-runners · https://docs.github.com/en/billing/concepts/product-billing/github-actions
- Google OAuth (expiration à 7 jours en mode Test) : https://support.google.com/cloud/answer/15549945
- Prix Claude : tableau officiel Anthropic, relevé du 03/11/2026
- Supabase et Netlify : documents du dépôt (`site/SUPABASE.md`, `site/CHOIX-TECHNIQUES.md`, `site/MISE-EN-LIGNE.md`, `LANCEMENT.md`)
