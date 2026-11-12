# Fruit Studio

Génère des vidéos TikTok verticales (1080×1920) : scénario → images → voix → clips → assemblage FFmpeg avec sous-titres incrustés. Univers prison / tribunal / suspense, personnages fruits en animation 3D.

**État : Jalon 2 prêt à lancer, NON TESTÉ contre le vrai fal.ai.** Le mode `--dry-run` (0 €) fonctionne. Sans `--dry-run`, seules les images réelles (fal.ai) sont disponibles ; voix et vidéo réelles arrivent au Jalon 3. Durée visée des vidéos : **65 à 75 s**.

Étude des fournisseurs et coûts : [`docs/JALON0_ETUDE.md`](docs/JALON0_ETUDE.md).

## Installation (Windows 11, PowerShell 7)

```powershell
# 1. Python et FFmpeg (une seule fois) — ferme et rouvre PowerShell ensuite
winget install Python.Python.3.12
winget install Gyan.FFmpeg

# 2. Vérifie
python --version        # 3.10 ou plus
ffmpeg -version         # 5.0 ou plus (6.x recommandé)
ffprobe -version

# 3. Dans le dossier fruit-studio
cd chemin\vers\nextech\fruit-studio
python -m venv .venv
.\.venv\Scripts\Activate.ps1      # si « exécution de scripts désactivée » :
                                  # Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
pip install -r requirements.txt
Copy-Item .env.example .env       # rien à remplir pour le dry-run

# 4. Musique libre de droits (non fournie) : dépose un mp3/wav dans assets\music\
```

## Utilisation

```powershell
python run.py --dry-run                      # pipeline complet sur script_1 -> projects\dry-run\output\dry-run.mp4
python run.py --dry-run --script examples\script_2.json --project demo2
python run.py --dry-run --music C:\musique\piste.mp3
python run.py --dry-run --regen s2_1,s2_3    # régénère uniquement ces plans (image, voix, clip)
python run.py --dry-run --from-step videos   # refait à partir d'une étape (script|images|voices|videos|assemble)
python -m pytest                             # tests automatisés (≈ 3 min)
```

### Test d'Edge-TTS (gratuit, 2 minutes) — à faire sur TA machine

Mon environnement n'a pas accès à Edge-TTS. Lance :

```powershell
python run.py --dry-run --voice-engine edge --script examples\script_1.json --project edge_test
```

`--voice-engine edge` échoue franchement si Edge-TTS ne répond pas (pas de repli silencieux). Envoie-moi la sortie, surtout `duration_s` et `duration_in_target` dans `projects\edge_test\report.json` : ça calibre la durée réelle (cible 65–75 s).

## Jalon 2 — images réelles (5 images, ≈ 0,23 $ marge incluse)

Prérequis : `FAL_KEY` dans `.env` et du crédit sur fal.ai. Le plafond global `MAX_BUDGET_USD=10` est dans `.env` : tous projets confondus, **aucun appel payant ne peut le dépasser** (chaque estimation est majorée de 15 % avant le contrôle).

```powershell
# 1. Estimation GRATUITE : aucun appel réseau
python run.py --script examples\script_1.json --project j2 --only-shots s1_1,s2_1,s3_5 --plan

# 2. Vrais appels : le programme affiche le coût et demande de taper OK
python run.py --script examples\script_1.json --project j2 --only-shots s1_1,s2_1,s3_5
```

Résultat : 2 images de référence dans `characters\refs\` (générées une seule fois, réutilisées ensuite ; tu peux aussi y déposer tes propres PNG `citron.png` / `pasteque.png`), et 3 images de scène dans `projects\j2\images\` (une par scène : Citron seul, le Juge seul, les deux ensemble). Les dépenses sont dans `projects\j2\costs.jsonl` et `projects\_budget.jsonl`. Ce sont des **estimations** : compare avec le tableau de bord fal.ai.

Si une image est mauvaise : supprime-la ou lance `--regen s1_1` ; seule cette image est refaite (et facturée).

**Reprise.** Chaque fichier produit est enregistré dans `projects\<nom>\state.json` avec l'empreinte de ses entrées. Relancer la même commande ne régénère que ce qui manque, est corrompu ou dont les entrées ont changé (réplique modifiée, plan réécrit…). Chaque fichier repris est revérifié avec ffprobe.

**Où sont mes fichiers.** `projects\<nom>\` contient `script.json`, `images\`, `voices\`, `clips\`, `work\` (plans normalisés, piste voix, `subtitles.ass`), `output\<nom>.mp4`, `costs.jsonl` (un enregistrement par appel), `report.json`. Les journaux sont dans `logs\`.

**Scénario.** Trois scénarios écrits à la main : `examples\script_1.json` (par défaut), `script_2.json`, `script_3.json` (15 à 17 plans, 65–75 s). `sample_script.json` (8 plans, 51 s) sert aux tests. Passe `--script mon_scenario.json` pour un autre. Garde chaque plan sous ≈ 6 s de durée voulue : au-delà, Kling et Hailuo facturent la tranche de 10 s. `--llm "idée"` demande à OpenAI d'écrire le scénario : appel payant, coût affiché, il faut taper `OK`. **Cette fonction est NON TESTÉE** (aucune clé OpenAI pendant le développement).

**Personnages.** Une fiche JSON par personnage dans `characters\` (fruit, couleur, visage, vêtements, morphologie, personnalité, voix, couleur de sous-titres). Écris les champs descriptifs **en anglais** : `canonical_description()` les recopie mot pour mot dans chaque prompt d'image. Pour un personnage qui n'est pas dans la liste, utilise `narrateur`.

## Clés API

Les clés se mettent **uniquement** dans `.env`, qui est ignoré par git. Les chemins de menus ci-dessous sont indicatifs : je n'ai pas pu ouvrir ces sites pendant l'étude, vérifie-les.

| Service | Pour | Où créer la clé | Variable |
|---|---|---|---|
| fal.ai | images (Jalon 2), clips Kling et Hailuo (Jalon 3) | tableau de bord fal.ai → Keys → Add key ; ajouter du crédit | `FAL_KEY` |
| ElevenLabs | voix (Jalon 3) | profil → API keys ; prévoir un plan payant pour l'usage commercial | `ELEVENLABS_API_KEY` |
| Runway | optionnel, seulement pour le tester | portail développeur Runway → API keys ; acheter des crédits | `RUNWAYML_API_SECRET` |
| OpenAI | inutile : les scénarios sont écrits à la main | — | — |

Garde-fous : tout appel payant est refusé tant qu'un budget n'a pas été validé pour l'exécution (réponse `OK` ou `--approve-usd`), et le plafond global `MAX_BUDGET_USD` s'applique en plus.

## Ce qui est testé, ce qui ne l'est pas

| Élément | Statut |
|---|---|
| Assemblage FFmpeg (1080×1920, fondus, sous-titres, voix, musique avec ducking) | testé (Linux, FFmpeg 6.1) |
| Dry-run complet, reprise, régénération d'un plan, plan de coût, plafond global | testé (Linux) |
| Fournisseur fal (images) | testé **uniquement contre un faux serveur** qui suit le protocole que j'ai supposé. **NON TESTÉ contre le vrai fal.ai** : noms d'endpoints (`config\pricing.json`) et paramètres à confirmer ; le premier vrai appel (≈ 0,04 $) est le test |
| Tout sous **Windows** | **NON TESTÉ** : développé sur Linux. Points à surveiller : police `Arial` des sous-titres, chemin de ffmpeg |
| Voix **Edge-TTS** (vraie voix) | **NON TESTÉ** : service injoignable depuis mon environnement. Sans réseau, repli sur une voix synthétique « babillage » (placeholder, 2 hauteurs distinctes) |
| Durée 65–75 s avec Edge-TTS | **NON VÉRIFIÉ** : 68–70 s mesurées avec la voix de repli (≈ 15 car./s). `report.json` indique `duration_in_target` |
| Scénario par LLM (`--llm`) | **NON TESTÉ** (inutile pour l'instant) |
| Voix et vidéo réelles (ElevenLabs, Kling, Hailuo) | **non implémentées** (Jalon 3) |
| Prix de `config\pricing.json` | **non vérifiés** sur les pages officielles |
