"""Orchestration reprenable : script -> images -> voix -> vidéos -> assemblage."""
from __future__ import annotations

import logging
from pathlib import Path

from . import assemble
from .config import Settings
from .costs import CostGuard, CostLedger, estimate_script_cost, load_pricing
from .errors import MediaVerificationError, ProviderNotAvailable, StudioError
from .media import probe, verify_media
from .models import Character, Script, dump_json
from .providers.base import ImageRequest, VideoRequest, VoiceRequest
from .providers.registry import ProviderSet
from .state import STEPS, ProjectState, file_hash, input_hash, now_iso
from .subtitles import build_ass
from .timeline import Timeline, TimelineConfig, build_timeline

log = logging.getLogger(__name__)

TARGET_MIN, TARGET_MAX = 65.0, 75.0  # durée visée : marge au-dessus de 60 s


class Pipeline:
    def __init__(self, settings: Settings, project_dir: Path, providers: ProviderSet, script: Script,
                 characters: dict[str, Character], music: Path | None = None,
                 timeline_cfg: TimelineConfig = TimelineConfig(), only_shots: set[str] | None = None,
                 global_ledger: CostLedger | None = None):
        self.s = settings
        self.providers = providers
        self.script = script
        self.characters = characters
        self.music = music
        self.cfg = timeline_cfg
        self.only_shots = only_shots
        self.real = providers.stack != "dry-run"
        self.state = ProjectState.load_or_create(project_dir, mode=providers.stack)
        self.dir = self.state.dir
        self.ledger = CostLedger(self.dir / "costs.jsonl")
        self.global_ledger = global_ledger
        # Budget de cette exécution : 0 tant que l'utilisateur n'a pas validé (set_run_budget).
        self.guard = CostGuard(self.ledger, self.ledger.total_usd(), global_ledger,
                               settings.max_budget_usd if global_ledger else None)
        self.stats = {"generated": 0, "reused": 0}
        self.planning = False
        self.plan_items: list[dict] = []
        # Références de personnages : partagées entre projets en mode réel (/characters/refs).
        self.ref_dir = (settings.characters_dir / "refs") if self.real else (self.dir / "refs")

    # --- budget -------------------------------------------------------------
    def set_run_budget(self, usd: float) -> None:
        """Valide `usd` de dépense supplémentaire pour cette exécution (jamais persisté : règle 1)."""
        self.guard.approved_usd = self.ledger.total_usd() + usd
        self.state.data["approval"] = {"last_run_usd": usd, "at": now_iso()}
        self.state.save()

    # --- utilitaires --------------------------------------------------------
    def _reusable(self, key: str, in_hash: str, kind: str, **verify) -> bool:
        art = self.state.artifact(key)
        if not art or art["input_hash"] != in_hash:
            return False
        try:
            verify_media(self.s.ffprobe, self.dir / art["path"], kind, **verify)
            return True
        except MediaVerificationError as exc:
            log.warning("artefact %s invalide (%s) -> régénération", key, exc)
            return False

    def _charge(self, provider, kind: str, label: str, result) -> None:
        detail = f"{label} [{result.engine}]"
        self.ledger.add(provider.name, kind, result.cost_usd, detail, estimated=True)
        if self.global_ledger is not None and result.cost_usd > 0:
            self.global_ledger.add(provider.name, kind, result.cost_usd, f"{self.dir.name}: {detail}", estimated=True)

    def _wanted(self, shot_id: str) -> bool:
        return self.only_shots is None or shot_id in self.only_shots

    def _needs_call(self, prov, kind: str, label: str, estimate: float) -> bool:
        """En mode plan : enregistre l'appel prévu et renvoie False (on ne génère rien)."""
        if self.planning:
            self.plan_items.append({"kind": kind, "label": label, "provider": prov.name, "usd": estimate if prov.paid else 0.0})
            return False
        self.guard.check(prov.name, prov.paid, estimate)
        return True

    def _require(self, prov, what: str):
        if prov is None:
            raise ProviderNotAvailable(f"fournisseur « {what} » réel non implémenté avant le Jalon 3 (stack {self.providers.stack}).")
        return prov

    def _chars_of(self, shot) -> list[Character]:
        ids = list(dict.fromkeys(shot.characters + [ln.speaker for ln in shot.lines]))
        return [self.characters[i] for i in ids if i in self.characters and i != "narrateur"]

    def regen(self, shot_ids: list[str]) -> None:
        """Invalide image, voix et clip des plans donnés (bouton « régénérer cette scène »)."""
        known = {sh.id for _, sh in self.script.shots()}
        unknown = set(shot_ids) - known
        if unknown:
            raise StudioError(f"plan(s) inconnu(s): {sorted(unknown)} (existants: {sorted(known)})")
        for key in list(self.state.data["artifacts"]):
            kind, _, rest = key.partition(":")
            if kind in ("image", "clip") and rest in shot_ids or kind == "voice" and rest.split(":")[0] in shot_ids:
                del self.state.data["artifacts"][key]
        self.state.reset_from("images")

    def _done(self, step: str, **extra) -> None:
        if not self.planning:
            self.state.set_step(step, "done", **extra)

    # --- étapes -------------------------------------------------------------
    def step_script(self) -> None:
        if not self.planning:
            dump_json(self.dir / "script.json", self.script.model_dump())
        self._done("script", shots=len(self.script.shots()))

    def _shots_in_scope(self):
        return [(sc, sh) for sc, sh in self.script.shots() if self._wanted(sh.id)]

    def step_images(self) -> None:
        prov = self._require(self.providers.image, "image")
        scope = self._shots_in_scope()
        used = {c.id: c for _, sh in scope for c in self._chars_of(sh)}
        refs: dict[str, Path] = {}
        # 1) image de référence de chaque personnage, générée UNE fois
        for cid, ch in used.items():
            out = self.ref_dir / f"{cid}.png"
            prompt = (f"Character reference sheet, single character, full body, neutral pose, plain light background, "
                      f"{self.script.style}. {ch.canonical_description()}")
            req = ImageRequest(prompt, self.s.width, self.s.height, f"Référence {ch.name}",
                               characters=[{"name": ch.name, "ui_color": ch.ui_color, "fruit": ch.fruit}])
            refs[cid] = out
            if self.real:
                # Mode réel : une référence existante et valide (générée avant, ou fournie à la main) est conservée.
                try:
                    verify_media(self.s.ffprobe, out, "image")
                    self.stats["reused"] += 1
                    continue
                except MediaVerificationError:
                    pass
            else:
                h = input_hash(prompt, prov.name, self.s.width, self.s.height)
                if self._reusable(f"ref:{cid}", h, "image"):
                    self.stats["reused"] += 1
                    continue
            if not self._needs_call(prov, "image", req.label, prov.estimate_cost(req)):
                continue
            res = prov.generate_image(req, out)
            self._charge(prov, "image", req.label, res)
            if not self.real:
                self.state.record_artifact(f"ref:{cid}", out, h, engine=res.engine)
            self.stats["generated"] += 1
        # 2) une image par plan : références + description canonique recopiée mot pour mot
        for scene, shot in scope:
            chars = self._chars_of(shot)
            canon = " ".join(c.canonical_description() + "." for c in chars)
            prompt = f"{self.script.style}. Location: {scene.location}. {canon} {shot.visual}"
            ref_paths = [refs[c.id] for c in chars]
            req = ImageRequest(prompt, self.s.width, self.s.height, f"{scene.title} / {shot.id}",
                               reference_images=ref_paths,
                               characters=[{"name": c.name, "ui_color": c.ui_color, "fruit": c.fruit} for c in chars])
            out = self.dir / "images" / f"{shot.id}.png"
            h = input_hash(prompt, [file_hash(p) if p.exists() else "pending" for p in ref_paths], prov.name,
                           self.s.width, self.s.height)
            if self._reusable(f"image:{shot.id}", h, "image"):
                self.stats["reused"] += 1
                continue
            if not self._needs_call(prov, "image", req.label, prov.estimate_cost(req)):
                continue
            res = prov.generate_image(req, out)
            self._charge(prov, "image", req.label, res)
            self.state.record_artifact(f"image:{shot.id}", out, h, engine=res.engine)
            self.stats["generated"] += 1
        self._done("images")

    def step_voices(self) -> None:
        prov = self._require(self.providers.voice, "voix")
        for _, shot in self._shots_in_scope():
            for i, ln in enumerate(shot.lines):
                voice = self.characters[ln.speaker].voice
                req = VoiceRequest(ln.text, ln.emotion, voice, f"{shot.id}#{i}", self.script.language)
                out = self.dir / "voices" / f"{shot.id}_{i}.wav"
                h = input_hash(ln.text, ln.emotion, voice.model_dump(), prov.name, getattr(prov, "engine", ""))
                key = f"voice:{shot.id}:{i}"
                art = self.state.artifact(key)
                # Une voix de repli hors-ligne est retentée en mode auto (le réseau est peut-être revenu).
                stale_fallback = bool(art and art.get("engine") == "babble" and getattr(prov, "engine", "") == "auto")
                if not stale_fallback and self._reusable(key, h, "audio", min_duration=0.2):
                    self.stats["reused"] += 1
                    continue
                if not self._needs_call(prov, "voice", f"{req.label} ({len(ln.text)} car.)", prov.estimate_cost(req)):
                    continue
                res = prov.synthesize(req, out)
                self._charge(prov, "voice", f"{req.label} ({len(ln.text)} car.)", res)
                self.state.record_artifact(key, out, h, engine=res.engine, duration=round(res.info.duration, 3))
                self.stats["generated"] += 1
        self._done("voices")

    def timeline(self) -> Timeline:
        durations = {}
        for _, shot in self.script.shots():
            for i in range(len(shot.lines)):
                durations[(shot.id, i)] = float(self.state.artifact(f"voice:{shot.id}:{i}")["duration"])
        return build_timeline(self.script, durations, self.cfg)

    def step_videos(self) -> None:
        prov = self._require(self.providers.video, "vidéo")
        tl = self.timeline()
        for idx, (scene, shot) in enumerate(self.script.shots()):
            wanted = tl.video_length(idx)
            image = self.state.artifact_path(f"image:{shot.id}")
            req = VideoRequest(image, shot.motion, wanted, self.s.width, self.s.height, self.s.fps,
                               f"{scene.title} / {shot.id}")
            picked = prov.pick_duration(wanted)
            out = self.dir / "clips" / f"{shot.id}.mp4"
            h = input_hash(file_hash(image), shot.motion, round(picked, 2), prov.name, self.s.width, self.s.height)
            key = f"clip:{shot.id}"
            if self._reusable(key, h, "video", min_duration=0.5):
                self.stats["reused"] += 1
                continue
            if not self._needs_call(prov, "video", f"{req.label} ({picked:.1f}s)", prov.estimate_cost(req)):
                continue
            res = prov.generate_clip(req, out)
            self._charge(prov, "video", f"{req.label} ({picked:.1f}s)", res)
            self.state.record_artifact(key, out, h, engine=res.engine, duration=round(res.info.duration, 3))
            self.stats["generated"] += 1
        self._done("videos")

    def step_assemble(self) -> Path:
        tl = self.timeline()
        work = self.dir / "work"
        work.mkdir(exist_ok=True)
        shots = self.script.shots()

        normalized = []
        for idx, (_, shot) in enumerate(shots):
            clip = self.state.artifact_path(f"clip:{shot.id}").resolve()
            out = (work / f"shot_{shot.id}.mp4").resolve()
            assemble.normalize_shot(self.s, clip, out, tl.video_length(idx))
            verify_media(self.s.ffprobe, out, "video", expect_size=(self.s.width, self.s.height),
                         expect_duration=tl.video_length(idx), tolerance=0.2)
            normalized.append(out)

        line_audio = {(sh.id, i): self.state.artifact_path(f"voice:{sh.id}:{i}").resolve()
                      for _, sh in shots for i in range(len(sh.lines))}
        voice_track = (work / "voice_track.wav").resolve()
        assemble.build_voice_track(self.s, tl, line_audio, voice_track)
        verify_media(self.s.ffprobe, voice_track, "audio", expect_duration=tl.total, tolerance=0.2)

        ass = work / "subtitles.ass"
        ass.write_text(build_ass(tl, self.characters, self.s.width, self.s.height, self.s.subtitle_font),
                       encoding="utf-8")

        out_dir = self.dir / "output"
        out_dir.mkdir(exist_ok=True)
        final = (out_dir / f"{self.dir.name}.mp4").resolve()
        music = self.music or assemble.find_music(self.s.music_dir)
        if music is None:
            log.warning("Aucune musique dans %s : vidéo sans musique (ajoute un fichier mp3/wav).", self.s.music_dir)
        assemble.assemble_final(self.s, normalized, tl, voice_track, ass.resolve(),
                                Path(music).resolve() if music else None, final, work.resolve())
        info = verify_media(self.s.ffprobe, final, "video", expect_size=(self.s.width, self.s.height),
                            expect_duration=tl.total, tolerance=0.3)
        if not info.has_audio:
            raise MediaVerificationError(f"{final.name}: aucune piste audio")
        self.state.record_artifact("final", final, input_hash(tl.total, len(shots)), duration=round(info.duration, 3),
                                   music=str(music) if music else None)
        self.state.set_step("assemble", "done", duration=round(info.duration, 3))
        return final

    # --- exécution ----------------------------------------------------------
    def _steps(self):
        return [("script", self.step_script), ("images", self.step_images), ("voices", self.step_voices),
                ("videos", self.step_videos), ("assemble", self.step_assemble)]

    def plan(self, until: str = "images") -> dict:
        """Estimation GRATUITE : liste les appels qui seraient faits, sans rien générer."""
        if until not in ("script", "images", "voices"):
            raise StudioError("le plan des étapes vidéo/assemblage sera disponible au Jalon 3")
        self.planning, self.plan_items = True, []
        try:
            for name, fn in self._steps():
                fn()
                if name == until:
                    break
        finally:
            self.planning = False
        total = round(sum(i["usd"] for i in self.plan_items), 4)
        g = self.global_ledger.total_usd() if self.global_ledger else 0.0
        return {"items": self.plan_items, "total_usd": total, "total_with_margin_usd": round(total * CostGuard.SAFETY, 4),
                "spent_global_usd": g, "cap_usd": self.s.max_budget_usd,
                "remaining_after_usd": round(self.s.max_budget_usd - g - total * CostGuard.SAFETY, 4)}

    def run(self, from_step: str | None = None, until: str | None = None) -> dict:
        if until and until not in STEPS:
            raise StudioError(f"étape inconnue: {until}")
        if self.only_shots and until not in ("script", "images"):
            raise StudioError("--only-shots n'est utilisable que jusqu'à l'étape images (--until images)")
        if from_step:
            self.state.reset_from(from_step)
        final: Path | None = None
        for n, (name, fn) in enumerate(self._steps(), 1):
            before = dict(self.stats)
            print(f"[{n}/5] {name}...")
            try:
                result = fn()
            except StudioError:
                self.state.set_step(name, "failed")
                raise
            if name == "assemble":
                final = result
            gen = self.stats["generated"] - before["generated"]
            reu = self.stats["reused"] - before["reused"]
            if name not in ("script", "assemble"):
                print(f"      {gen} généré(s), {reu} repris de l'état précédent")
            if until == name:
                break
        return self.report(final) if final else self.partial_report(until)

    def partial_report(self, until: str) -> dict:
        images = {k.split(":", 1)[1]: str(self.state.artifact_path(k)) for k in self.state.data["artifacts"]
                  if k.startswith("image:")}
        refs = sorted(str(p) for p in self.ref_dir.glob("*.png")) if self.ref_dir.exists() else []
        rep = {
            "project": self.dir.name, "mode": self.providers.stack, "stopped_after": until,
            "references": refs, "images": images,
            "cost_usd_this_project": self.ledger.total_usd(),
            "cost_usd_global": self.global_ledger.total_usd() if self.global_ledger else None,
            "cap_usd": self.s.max_budget_usd,
            "note": "coûts = estimations issues de config/pricing.json ; vérifie le tableau de bord du fournisseur",
        }
        dump_json(self.dir / "report.json", rep)
        return rep

    def report(self, final: Path) -> dict:
        info = probe(self.s.ffprobe, final)
        tl = self.timeline()
        rep = {
            "project": self.dir.name,
            "mode": self.providers.stack,
            "output": str(final),
            "duration_s": round(info.duration, 2),
            "size_bytes": info.size,
            "resolution": f"{info.width}x{info.height}",
            "video_codec": info.video_codec,
            "audio_codec": info.audio_codec,
            "shots": len(tl.shots),
            "duration_in_target": TARGET_MIN <= info.duration <= TARGET_MAX,
            "target_s": [TARGET_MIN, TARGET_MAX],
            "voices": sorted({self.state.artifact(k).get("engine") for k in self.state.data["artifacts"]
                              if k.startswith("voice:")}),
            "cost_usd_real_this_project": self.ledger.total_usd(),
            "cost_eur_real_this_project": round(self.ledger.total_usd() * self.s.usd_to_eur, 4),
        }
        pricing = load_pricing(self.s.pricing_file)
        n_refs = len({c.id for _, sh in self.script.shots() for c in self._chars_of(sh)})
        wanted = [tl.video_length(i) for i in range(len(tl.shots))]
        rep["estimate_real_run_usd"] = {
            st: estimate_script_cost(self.script, pricing, st, n_refs, wanted)
            for st in pricing["stacks"] if st != "dry-run"
        }
        dump_json(self.dir / "report.json", rep)
        return rep
