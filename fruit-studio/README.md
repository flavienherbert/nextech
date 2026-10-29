# Fruit Studio

Génère des vidéos TikTok verticales (1080×1920) : scénario → images → voix → clips → assemblage FFmpeg avec sous-titres incrustés. Univers prison / tribunal / suspense, personnages fruits en animation 3D.

**État : Jalon 1.** Seul le mode `--dry-run` (0 €, fichiers placeholder) fonctionne. Les fournisseurs payants arrivent aux Jalons 2 et 3 ; lancer sans `--dry-run` est refusé volontairement.

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
python run.py --dry-run                      # pipeline complet -> projects\dry-run\output\dry-run.mp4
python run.py --dry-run --project demo       # autre projet (dossier projects\demo)
python run.py --dry-run --music C:\musique\piste.mp3
python run.py --dry-run --regen s2_1,s2_3    # régénère uniquement ces plans (image, voix, clip)
python run.py --dry-run --from-step videos   # refait à partir d'une étape (script|images|voices|videos|assemble)
python -m pytest                             # tests automatisés (≈ 2 min)
```

**Reprise.** Chaque fichier produit est enregistré dans `projects\<nom>\state.json` avec l'empreinte de ses entrées. Relancer la même commande ne régénère que ce qui manque, est corrompu ou dont les entrées ont changé (réplique modifiée, plan réécrit…). Chaque fichier repris est revérifié avec ffprobe.

**Où sont mes fichiers.** `projects\<nom>\` contient `script.json`, `images\`, `voices\`, `clips\`, `work\` (plans normalisés, piste voix, `subtitles.ass`), `output\<nom>.mp4`, `costs.jsonl` (un enregistrement par appel), `report.json`. Les journaux sont dans `logs\`.

**Scénario.** Par défaut `examples\sample_script.json`. Passe `--script mon_scenario.json` pour un autre. `--llm "idée"` demande à OpenAI d'écrire le scénario : appel payant, coût affiché, il faut taper `OK`. **Cette fonction est NON TESTÉE** (aucune clé OpenAI pendant le développement).

**Personnages.** Une fiche JSON par personnage dans `characters\` (fruit, couleur, visage, vêtements, morphologie, personnalité, voix, couleur de sous-titres). Écris les champs descriptifs **en anglais** : `canonical_description()` les recopie mot pour mot dans chaque prompt d'image. Pour un personnage qui n'est pas dans la liste, utilise `narrateur`.

## Clés API (Jalons 2 et 3 — pas encore utilisées)

Les clés se mettent **uniquement** dans `.env`, qui est ignoré par git. Les chemins de menus ci-dessous sont indicatifs : je n'ai pas pu ouvrir ces sites pendant l'étude, vérifie-les.

| Service | Pour | Où créer la clé | Variable |
|---|---|---|---|
| fal.ai | images (FLUX Kontext), vidéo alternative | tableau de bord fal.ai → Keys → Add key ; ajouter du crédit | `FAL_KEY` |
| Runway | vidéo (gen4_turbo) | portail développeur Runway → créer une organisation → API keys ; acheter des crédits | `RUNWAYML_API_SECRET` |
| ElevenLabs | voix | profil → API keys ; prévoir un plan payant pour l'usage commercial | `ELEVENLABS_API_KEY` |
| OpenAI | scénario par LLM (optionnel) | platform.openai.com → API keys ; **fixe une limite mensuelle de dépense** | `OPENAI_API_KEY` |

Garde-fou : tout appel payant est refusé tant que `--approve-usd X` n'a pas défini un budget pour le projet, et chaque appel est comptabilisé dans `costs.jsonl`.

## Ce qui est testé, ce qui ne l'est pas

| Élément | Statut |
|---|---|
| Assemblage FFmpeg (1080×1920, fondus, sous-titres, voix, musique avec ducking) | testé (Linux, FFmpeg 6.1) |
| Dry-run complet, reprise, régénération d'un plan, garde-fou de coût | testé (Linux) |
| Tout sous **Windows** | **NON TESTÉ** : développé sur Linux. Points à surveiller : police `Arial` des sous-titres, chemin de ffmpeg |
| Voix **Edge-TTS** (vraie voix) | **NON TESTÉ** : service injoignable depuis mon environnement. Sans réseau, repli sur une voix synthétique « babillage » (placeholder, 2 hauteurs distinctes) |
| Durée 45–60 s avec Edge-TTS | **NON VÉRIFIÉ** : mesurée avec la voix de repli (≈ 15 car./s). Edge-TTS peut parler plus vite ou plus lentement ; `report.json` indique `duration_in_target` |
| Scénario par LLM (`--llm`) | **NON TESTÉ** |
| Fournisseurs payants (images, vidéo, voix) | **non implémentés** (Jalons 2 et 3) |
| Prix de `config\pricing.json` | **non vérifiés** sur les pages officielles |
