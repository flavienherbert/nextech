import json
import subprocess

import pytest

from studio import assemble
from studio.media import probe, run_ffmpeg
from studio.pipeline import Pipeline
from studio.providers.registry import build_providers
from studio.timeline import build_timeline

from conftest import pytestmark_ffmpeg

pytestmark = pytestmark_ffmpeg


def _music(settings, path, seconds=8):
    run_ffmpeg(settings.ffmpeg, ["-f", "lavfi", "-i", f"sine=frequency=220:duration={seconds}", "-ar", 48000, path])
    return path


def _make_pipeline(settings, characters, script, project_dir, **kw):
    providers = build_providers(settings, dry_run=True, voice_engine="babble")
    return Pipeline(settings, project_dir, providers, script, characters, **kw)


def _short_script(script):
    """2 plans seulement, pour garder le test d'assemblage rapide."""
    s = script.model_copy(deep=True)
    s.scenes = s.scenes[:1]
    s.scenes[0].shots = s.scenes[0].shots[:2]
    return s


def test_full_dry_run_produces_a_valid_vertical_mp4(settings, characters, script, tmp_path):
    music = _music(settings, tmp_path / "m.wav")
    pipe = _make_pipeline(settings, characters, script, tmp_path / "p", music=music)
    rep = pipe.run()
    final = pipe.dir / "output" / "p.mp4"
    info = probe(settings.ffprobe, final)
    assert info.has_video and info.has_audio and info.size > 0
    assert (info.width, info.height) == (settings.width, settings.height)
    assert info.duration == pytest.approx(pipe.timeline().total, abs=0.3)
    assert rep["shots"] == len(script.shots()) == 8
    assert len({s.scene_id for s in pipe.timeline().shots}) == 3  # 3 scènes
    assert rep["cost_usd_real_this_project"] == 0.0
    state = json.loads((pipe.dir / "state.json").read_text(encoding="utf-8"))
    assert all(s["status"] == "done" for s in state["steps"].values())


def test_dry_run_has_two_distinct_voices_in_state(settings, characters, script, tmp_path):
    pipe = _make_pipeline(settings, characters, script, tmp_path / "p", music=_music(settings, tmp_path / "m.wav"))
    pipe.run()
    voices = {}
    for _, sh in script.shots():
        for i, ln in enumerate(sh.lines):
            voices.setdefault(ln.speaker, set()).add((pipe.dir / pipe.state.artifact(f"voice:{sh.id}:{i}")["path"]).read_bytes()[:2000])
    assert {"citron", "pasteque"} <= set(voices)
    assert voices["citron"].isdisjoint(voices["pasteque"])


def test_rerun_resumes_without_regenerating_anything(settings, characters, script, tmp_path):
    short = _short_script(script)
    music = _music(settings, tmp_path / "m.wav")
    p1 = _make_pipeline(settings, characters, short, tmp_path / "p", music=music)
    p1.run()
    assert p1.stats["generated"] > 0
    p2 = _make_pipeline(settings, characters, short, tmp_path / "p", music=music)
    p2.run()
    assert p2.stats["generated"] == 0 and p2.stats["reused"] == p1.stats["generated"]


def test_resume_regenerates_only_the_deleted_artifact(settings, characters, script, tmp_path):
    short = _short_script(script)
    music = _music(settings, tmp_path / "m.wav")
    p1 = _make_pipeline(settings, characters, short, tmp_path / "p", music=music)
    p1.run()
    victim = p1.state.artifact_path("clip:s1_2")
    victim.write_bytes(b"")  # fichier corrompu : doit être détecté et refait
    p2 = _make_pipeline(settings, characters, short, tmp_path / "p", music=music)
    p2.run()
    assert p2.stats["generated"] == 1
    assert probe(settings.ffprobe, victim).has_video


def test_changing_a_line_only_regenerates_what_depends_on_it(settings, characters, script, tmp_path):
    short = _short_script(script)
    music = _music(settings, tmp_path / "m.wav")
    _make_pipeline(settings, characters, short, tmp_path / "p", music=music).run()
    changed = short.model_copy(deep=True)
    changed.scenes[0].shots[0].lines[0].text = "Une toute autre réplique pour ce plan."
    p2 = _make_pipeline(settings, characters, changed, tmp_path / "p", music=music)
    p2.run()
    # 1 voix modifiée + le clip du plan 1 dont la durée a changé ; images inchangées
    assert 1 <= p2.stats["generated"] <= 3


def test_regen_targets_one_shot(settings, characters, script, tmp_path):
    short = _short_script(script)
    music = _music(settings, tmp_path / "m.wav")
    _make_pipeline(settings, characters, short, tmp_path / "p", music=music).run()
    p2 = _make_pipeline(settings, characters, short, tmp_path / "p", music=music)
    p2.regen(["s1_2"])
    p2.run()
    # image + voix (2 répliques) + clip du plan s1_2 uniquement
    assert p2.stats["generated"] == 1 + len(short.scenes[0].shots[1].lines) + 1


def test_unknown_shot_in_regen_is_an_error(settings, characters, script, tmp_path):
    from studio.errors import StudioError
    p = _make_pipeline(settings, characters, _short_script(script), tmp_path / "p")
    with pytest.raises(StudioError, match="inconnu"):
        p.regen(["nope"])


def test_subtitles_are_really_burned_in(settings, characters, script, tmp_path):
    """Même assemblage avec et sans .ass : l'image au moment d'une réplique doit différer."""
    short = _short_script(script)
    music = _music(settings, tmp_path / "m.wav")
    pipe = _make_pipeline(settings, characters, short, tmp_path / "p", music=music)
    pipe.run()
    work = pipe.dir / "work"
    tl = pipe.timeline()
    shots = [work / f"shot_{sh.id}.mp4" for _, sh in short.shots()]
    voice = work / "voice_track.wav"
    plain = tmp_path / "plain.mp4"
    assemble.assemble_final(settings, shots, tl, voice, None, None, plain, work)
    withsubs = pipe.dir / "output" / "p.mp4"
    t = tl.all_lines()[0].start + tl.all_lines()[0].duration * 0.3
    frames = []
    for name, src in (("a", plain), ("b", withsubs)):
        out = tmp_path / f"{name}.rgb"
        run_ffmpeg(settings.ffmpeg, ["-ss", f"{t:.2f}", "-i", src, "-frames:v", 1, "-f", "rawvideo", "-pix_fmt", "rgb24", out])
        frames.append(out.read_bytes())
    assert len(frames[0]) == len(frames[1]) > 0
    diff = sum(1 for x, y in zip(frames[0], frames[1]) if abs(x - y) > 40)
    assert diff > 200, "aucune différence visible : les sous-titres ne sont pas incrustés"


def test_assembly_without_music_still_works_and_has_audio(settings, characters, script, tmp_path, monkeypatch):
    empty = tmp_path / "nomusic"
    empty.mkdir()
    monkeypatch.setattr(assemble, "find_music", lambda d: None)
    pipe = _make_pipeline(settings, characters, _short_script(script), tmp_path / "p")
    pipe.run()
    info = probe(settings.ffprobe, pipe.dir / "output" / "p.mp4")
    assert info.has_audio and info.duration > 3


def test_cli_dry_run_end_to_end(tmp_path):
    """Lance réellement `python run.py --dry-run` dans un sous-processus."""
    import sys
    from pathlib import Path
    root = Path(__file__).resolve().parent.parent
    music = _music(__import__("studio.config", fromlist=["x"]).load_settings(root), tmp_path / "m.wav")
    proc = subprocess.run(
        [sys.executable, "run.py", "--dry-run", "--voice-engine", "babble", "--size", "270x480",
         "--project", "pytest_cli", "--music", str(music)],
        cwd=root, capture_output=True, text=True, encoding="utf-8",
    )
    assert proc.returncode == 0, proc.stderr[-800:]
    assert '"duration_s"' in proc.stdout
    import shutil
    shutil.rmtree(root / "projects" / "pytest_cli", ignore_errors=True)
