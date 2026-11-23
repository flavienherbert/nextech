# Robot de clipping : architecture et plan de développement

Version du 23 novembre 2026. Ce document remplace le plan du § 13 de `AUDIT.md`. Le reste de l'audit (constats, limites, sources) reste valable.

**Objectif.** Vous transmettez une campagne Content Rewards par une action autorisée. Le robot analyse tout, sélectionne les meilleures vidéos et dépose dans votre Google Drive les MP4 avec leurs descriptions prêtes à poster. **Vous validez et publiez vous-même** : le robot ne publie jamais sur TikTok.

---

## 1. Architecture

```
iPhone · Safari connecté à Content Rewards
  Partager → « Envoyer au robot »         (action unique, lancée par vous)
          │ capture : lien + texte complet + liens
          ▼
Boîte de réception                        (phases 1-2 : Drive ; phase 3 : Supabase)
          │ déclenche
          ▼
GitHub Actions, dépôt privé : ORCHESTRATEUR (code)
  ├─ Agent 1  Campagne   → fiche des règles
  ├─ Agent 2  Vidéos     → inventaire, notes, classement
  ├─ Agent 3  Textes     → une publication par vidéo
  └─ Contrôle final + budget
          ▼
Google Drive : ROBOT CLIPPING/<campagne>/…   + notification
```

**Choix structurants**
- **L'orchestrateur est du code, pas une IA.** L'ordre des étapes est fixe, ce qui le rend prévisible, reproductible et gratuit.
- **Chaque agent est un module spécialisé.** Il reçoit une fiche JSON et en rend une autre. Le code valide chaque fiche (schéma et contrôles) avant de passer à l'agent suivant.
- **L'IA n'intervient qu'aux trois endroits où il faut du jugement** : lire les règles, noter les clips, rédiger les textes. Tout le reste est du code : Drive, empreintes, durées, images, découpe, vérifications.
- **Modèles** : `claude-haiku-5-5` pour le tri, `claude-opus-5-5` pour les règles, l'analyse approfondie et les descriptions. Les noms et tarifs ont été vérifiés le 23/11/2026, et seront revérifiés au début de la phase 2.

---

## 2. Les fiches échangées

| Fiche | Produite par | Contenu |
|---|---|---|
| `capture.json` | Raccourci | Lien, texte visible, texte complet (sections repliées comprises), tous les liens, résumé. Voir `RACCOURCI-IPHONE.md` |
| `controle_capture.json` | Orchestrateur | Verdict COMPLET / À VÉRIFIER / INCOMPLET, avec un point par élément attendu |
| `regles.json` | Agent 1 | Chaque règle avec sa **citation exacte** et sa source : nom, rémunérations, conditions de validation, consignes, interdictions, hashtags, mentions, description officielle, mention publicitaire, durées, dates, liens classés |
| `inventaire.json` | Agent 2 | Un enregistrement par fichier : empreinte md5, taille, durée, dimensions, orientation, son, doublon, déjà utilisé, transcription, images clés |
| `selection.json` | Agent 2 | Classement complet : notes par critère, verdict par règle avec l'horodatage, justification, destination (VIDEOS, À VÉRIFIER ou exclu) |
| `publications.json` | Agent 3 | Pour chaque vidéo : nom du fichier, plateforme, texte complet, résultat des contrôles |
| `etat.json` | Orchestrateur | Étape en cours, tentatives, erreurs, dépense d'IA par appel |

---

## 3. Les trois agents

### Agent 1 : analyse de la campagne

1. Il reçoit la capture **contrôlée**. Si le verdict est INCOMPLET, l'orchestrateur s'arrête et vous dit ce qui manque.
2. Il lit les Google Docs et Sheets liés par l'API Google, s'ils sont partagés par lien. Sinon, ils sont marqués « accès requis ».
3. **Opus** produit `regles.json`, avec une sortie structurée contrôlée par un schéma.
4. **Contrôle anti-invention, en code** : chaque citation doit figurer mot pour mot dans la capture ou dans un document lié. Une règle sans citation trouvée est marquée **« À CONFIRMER »** et n'est jamais présentée comme officielle.
5. **Contrôle de complétude** : le nombre de règles extraites est comparé au nombre annoncé par la page (« N rules »). Un écart est signalé.
6. **Mention publicitaire** : elle est toujours présente dans la fiche, avec l'un des trois statuts suivants :
   - « exigée : <citation> » ;
   - « indice : <citation>, à confirmer » ;
   - « non trouvée dans les consignes : à vérifier par vous selon les obligations applicables ».

   **Jamais « inutile ».**
7. **Aucune réutilisation** d'une campagne à l'autre : chaque fiche est construite uniquement à partir de la capture de cette campagne.

### Agent 2 : analyse et sélection des vidéos

1. **Inventaire, en code et gratuit.**
   - Il liste les liens Drive par l'API sans rien télécharger : empreinte md5, taille, durée, dimensions.
   - Il retire les doublons de la campagne et, à partir de la phase 3, ceux des autres campagnes.
   - Il classe les fichiers : clips prêts (≤ 3 min) ou vidéos longues.
   - Pour une archive ZIP, il en lit la liste des fichiers à distance, sans la télécharger en entier.
2. **Contrôle technique, en code et gratuit.**
   - Il télécharge les clips prêts sur le serveur temporaire (effacé à la fin de chaque traitement).
   - Il vérifie la lecture (ffprobe), la durée, la résolution, l'orientation, le volume sonore, les images noires ou figées, et repère les sous-titres déjà incrustés.
3. **Transcription mot à mot, gratuite**, avec faster-whisper sur le serveur. Puis **images clés** : une par plan et une toutes les 2 s.
4. **Tri par Haiku** : tous les clips sont notés sur la transcription et 8 images. Les signaux d'interdiction sont relevés.
5. **Analyse approfondie par Opus** des 15 meilleurs selon Haiku, avec 30 images et la transcription :
   - une note sur 10 pour chacun des six critères : accroche, rétention potentielle, intérêt du passage, compréhension immédiate, qualité audio et vidéo, conformité ;
   - un **verdict pour chaque règle** : conforme, risque ou interdit, avec le moment en cause ;
   - une justification de 2 à 3 lignes.

   Si la dernière tranche analysée contient encore des clips excellents, Opus analyse **5 clips de plus**, tant que le budget le permet.
6. **Classement et destination**
   - **VIDEOS** : les 10 meilleurs clips conformes, **plus tous les autres clips conformes notés au moins 85/100**. Ce seuil est réglable.
   - **VIDEOS/À VÉRIFIER** : tout clip avec un verdict « risque » ou une règle « À CONFIRMER », avec la raison et l'horodatage. **Jamais présentés comme sûrs.**
   - **Exclus** : verdict « interdit », doublons, défauts techniques. Ils figurent tout de même dans le rapport, avec la raison.
   - **Le classement complet couvre toutes les vidéos** : note détaillée pour les clips analysés par Opus, note de tri marquée « Haiku » pour les autres.
7. **Format 9:16** : un clip déjà vertical est gardé tel quel. Sinon, le recadrage suit les visages s'ils tiennent tous dans le cadre ; à défaut, le plan est placé entier sur un fond flou. **Aucun visage ni élément important coupé.**
8. **Sous-titres** : ajoutés seulement si la campagne les autorise et si le clip n'en a pas déjà. Le texte est exactement celui de la transcription.
9. **Vidéos longues** (phase 4) : seulement si moins de 10 clips prêts sont conformes. Passages coupés sur des fins de phrase, jamais réordonnés, puis mêmes étapes 4 à 8.

### Agent 3 : préparation des publications

Un fichier `.txt` par vidéo, au même numéro et au même nom (`03_titre.mp4` va avec `03_titre.txt`) :

```
CAMPAGNE              <nom exact>
FICHIER               03_<titre>.mp4
RANG ET NOTE          3e · 86/100 (accroche 9 · rétention 8 · intérêt 9 · compréhension 8 · qualité 9 · conformité 10)
POURQUOI              <2-3 lignes>
PLATEFORME CONSEILLÉE TikTok
──────────────── À COPIER ────────────────
<description officielle copiée mot pour mot, ou proposition de l'IA marquée comme telle>
<mentions obligatoires> <hashtags obligatoires> <hashtags autorisés>
───────────────────────────────────────────
DESCRIPTION OFFICIELLE  fournie par la campagne (citée) | aucune fournie
MENTION PUBLICITAIRE    exigée : <citation> | non trouvée dans les consignes : À VÉRIFIER par vous
RÈGLES                  conforme à N/N règles (détail dans RAPPORT)
```

**Contrôles en code avant validation de chaque texte**
- La partie officielle est identique à la citation, au caractère près.
- Toutes les mentions et tous les hashtags obligatoires sont présents.
- Aucun hashtag ni mot interdit.
- La longueur est correcte.
- La section « mention publicitaire » est présente.

En cas d'échec, Opus réécrit une fois. Si l'échec persiste, le texte est marqué **À VÉRIFIER**. **Aucune consigne officielle n'est jamais inventée.**

---

## 4. L'orchestrateur

| Fonction | Fonctionnement |
|---|---|
| Étapes | REÇUE → CAPTURE CONTRÔLÉE → RÈGLES → INVENTAIRE → SÉLECTION → PUBLICATIONS → CONTRÔLE FINAL → LIVRÉE. Autres états : EN ATTENTE DE VOUS (avec ce qu'il faut faire) et EN ÉCHEC (avec la raison). |
| Reprise | Chaque étape est enregistrée avec l'empreinte de ses données d'entrée. Une relance reprend à la dernière étape réussie, sans refaire ni repayer. |
| Anti-doublons | Un seul traitement à la fois par campagne. Une capture déjà reçue est ignorée. Les fichiers identiques sont repérés par leur empreinte md5. |
| Budget | Avant **chaque** appel à l'IA, le coût maximal possible est calculé (jetons comptés et taille de réponse maximale). L'appel est **refusé** s'il pouvait faire dépasser le plafond (5 $ par campagne de test). Chaque dépense est inscrite au journal. |
| Erreurs | Nouvel essai automatique pour les erreurs temporaires (réseau, quotas). Une erreur définitive donne l'état EN ÉCHEC et un message clair. Rien n'est livré à moitié sans être signalé. |
| Contrôle final | Chaque MP4 a son `.txt` et se lit correctement. Aucun clip « interdit » n'est présent. Le rapport est complet et le budget respecté. **Ensuite seulement**, la livraison a lieu. |
| Volume | Aucune limite de campagnes dans le code. La file d'attente est gérée par Supabase en phase 3. La seule limite est le temps de calcul gratuit (2 000 min par mois) : le robot prévient quand il approche. |

---

## 5. Livraison dans Google Drive

```
ROBOT CLIPPING/
  <Nom de la campagne>/
    VIDEOS/            01_….mp4 … 10_….mp4 (+ clips excellents en plus)
      À VÉRIFIER/      clips à risque, avec la raison
    DESCRIPTIONS/      01_….txt … (un par vidéo, même numéro)
    CONSIGNES/         règles citées, liens, mention publicitaire, points à confirmer
    RAPPORT/           classement complet, notes, exclusions, contrôles, dépense d'IA, durée
  HISTORIQUE           feuille Google : une ligne par campagne (phase 3)
```

- **Télécharger sur iPhone** : application Google Drive, la vidéo, « Envoyer une copie », puis « Enregistrer la vidéo ». Elle arrive dans Photos, où TikTok la trouve.
- **Conservation** : **aucune suppression automatique.** Une fonction de suppression à la fin de la licence de chaque campagne sera préparée, mais **désactivée**, jusqu'à votre validation d'une politique de conservation. Les fichiers sources ne sont jamais gardés en dehors du serveur temporaire.

---

## 6. Coûts

| Poste | Coût |
|---|---|
| Infrastructure : GitHub Actions, Google Cloud sans facturation, Supabase gratuit, ntfy | **0 € par mois** |
| IA par campagne de clips prêts (cas de Koba, 43 clips) : Opus règles ≈ 0,10 $ · Haiku tri ≈ 0,03 $ · Opus 15 clips ≈ 0,95 $ · Opus descriptions ≈ 0,24 $ | **≈ 1,30 $** |
| Avec des vidéos longues (environ 6 h, phase 4) | ≈ 3 $ |
| Plafond strict, par campagne de test | **5 $** |
| Temps de calcul, clips prêts | 20 à 40 min, soit 50 à 100 campagnes par mois dans le quota gratuit |

Les montants d'IA sont des estimations. Le coût réel de chaque appel sera mesuré et inscrit dans le RAPPORT.

---

## 7. Plan par phases

Chaque phase commence **après votre accord explicite** et finit par une démonstration.

### Phase 1 : socle et inventaire de Koba, **sans IA payante**

| # | Action | Critère de réussite |
|---|---|---|
| 1 | Socle du dépôt privé : orchestrateur (étapes, reprise, journal de budget plafonné à **0 $ dans cette phase**), tests automatiques | Les tests passent |
| 2 | Lancement « diagnostic » à la main depuis GitHub : présence des secrets, accès Google, création de `ROBOT CLIPPING/` et d'un fichier test (écriture puis relecture) | Rapport de diagnostic dans votre Drive |
| 3 | **Vérification d'accès réel** aux liens Drive de Koba : liste du dossier de clips, métadonnées, liste à distance de l'archive ZIP de 11,7 Go | Fichiers listés, ou erreurs nommées (accès, quota) |
| 4 | **Inventaire des clips de Koba** : téléchargement, empreintes md5, doublons, contrôle technique, transcription, images clés | 43 clips traités ; doublons confirmés ou infirmés par empreinte ; rapport d'inventaire dans `RAPPORT/` |
| 5 | **Essai du Raccourci** sur la vraie page Koba : vous le lancez, la capture arrive dans `CAPTURES ROBOT`, je la contrôle avec vous | Verdict de capture, et liste exacte de ce qui manque, s'il manque quelque chose |
| 6 | Mesures | Minutes consommées, durée de chaque étape, et **0 $ dépensé** |

### Phase 2 : première campagne complète avec l'IA (plafond 5 $)

| # | Action | Critère de réussite |
|---|---|---|
| 1 | Vérifier de nouveau les noms et tarifs des modèles ; votre accord pour la clé et le crédit (bloc F) | Feu vert écrit |
| 2 | Agent 1 sur la capture de Koba | `CONSIGNES/` : toutes les règles citées, points « À CONFIRMER » listés |
| 3 | Agent 2 : tri par Haiku, analyse des 15 meilleurs par Opus, 9:16 si nécessaire | Classement complet, verdict par règle, dossier À VÉRIFIER |
| 4 | Agent 3 et contrôle final | Un `.txt` par MP4, contrôles réussis |
| 5 | Livraison et revue par vous | 10 vidéos prêtes ou plus (ou moins, avec l'explication) ; **dépense réelle ≤ 5 $** ; vos remarques consignées |

### Phase 3 : l'action unique

Raccourci en envoi direct, boîte de réception Supabase (**déploiement à autoriser**), file d'attente, doublons entre campagnes, notification ntfy, feuille HISTORIQUE.

### Phase 4 : vidéos longues

Extraction des épisodes depuis l'archive ZIP, recherche de passages, découpe, recadrage selon les visages. Étude de l'ancien Clipper.

### Phase 5 : fiabilité

Quotas Drive (repli par copie), surveillance des minutes, journal des erreurs, fonction de conservation (préparée, désactivée).

---

## 8. Risques connus et parades

| Risque | Parade |
|---|---|
| La page d'une campagne rejointe ne charge certaines sections qu'après un toucher | Détecté par la comparaison avec les nombres annoncés ; vous ouvrez la section et relancez |
| Fichiers Drive restreints (pas de partage par lien) | Signalés. L'accès en lecture plus large sera **proposé, pas activé** |
| Quota de téléchargement Google sur les fichiers très demandés | Nouvel essai plus tard, puis repli à étudier en phase 5 |
| L'IA rate une image interdite brève | Verdict par plan, dossier À VÉRIFIER, et votre validation avant publication |
| Campagne sans consigne publicitaire | Toujours signalée « à vérifier par vous » |
| Dépôt `nextech` public | Les documents n'y contiennent ni secret ni identifiant. Le code et les journaux vont dans le dépôt privé |
