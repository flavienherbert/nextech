"""Assemblage FFmpeg : plans 9:16, fondus enchaînés, piste voix, musique, sous-titres incrustés."""
from __future__ import annotations

import logging
from pathlib import Path

from .config import Settings
from .media import run_ffmpeg
from .timeline import Timeline

log = logging.getLogger(__name__)

AUDIO_EXTS = {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac"}
MUSIC_VOLUME = 0.30


def find_music(music_dir: Path) -> Path | None:
    """Première piste (ordre alphabétique) du dossier, ou None."""
    if not Path(music_dir).is_dir():
        return None
    tracks = sorted(p for p in Path(music_dir).iterdir() if p.suffix.lower() in AUDIO_EXTS)
    return tracks[0] if tracks else None


def normalize_shot(settings: Settings, clip: Path, out: Path, duration: float) -> None:
    """Un plan -> 1080x1920, 30 fps, durée exacte (image figée si le clip est trop court)."""
    w, h, fps = settings.width, settings.height, settings.fps
    vf = (
        f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},setsar=1,fps={fps},"
        f"tpad=stop_mode=clone:stop_duration={duration:.3f},trim=duration={duration:.3f},"
        "setpts=PTS-STARTPTS,format=yuv420p"
    )
    run_ffmpeg(settings.ffmpeg, ["-i", clip, "-vf", vf, "-an", "-c:v", "libx264", "-preset", "veryfast",
                                 "-crf", "18", "-r", fps, out])


def build_voice_track(settings: Settings, timeline: Timeline, line_audio: dict[tuple[str, int], Path],
                      out: Path) -> None:
    """Piste voix unique : chaque réplique posée à son instant absolu (adelay + amix)."""
    lines = timeline.all_lines()
    if not lines:
        run_ffmpeg(settings.ffmpeg, ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", f"{timeline.total:.3f}", out])
        return
    inputs: list[str | Path] = []
    chains = []
    for i, ln in enumerate(lines):
        inputs += ["-i", line_audio[(ln.shot_id, ln.index)]]
        ms = int(round(ln.start * 1000))
        chains.append(f"[{i}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={ms}|{ms}[l{i}]")
    mix = "".join(f"[l{i}]" for i in range(len(lines)))
    chains.append(f"{mix}amix=inputs={len(lines)}:normalize=0:dropout_transition=0,"
                  f"apad=whole_dur={timeline.total:.3f},atrim=duration={timeline.total:.3f}[a]")
    run_ffmpeg(settings.ffmpeg, [*inputs, "-filter_complex", ";".join(chains), "-map", "[a]", "-ar", 48000, out])


def assemble_final(settings: Settings, shot_files: list[Path], timeline: Timeline, voice_track: Path,
                   ass_file: Path | None, music: Path | None, out: Path, workdir: Path) -> None:
    """Fondus + sous-titres incrustés + voix (+ musique avec ducking) -> MP4 final."""
    n = len(shot_files)
    inputs: list[str | Path] = []
    for f in shot_files:
        inputs += ["-i", f]
    inputs += ["-i", voice_track]
    voice_idx = n
    if music:
        inputs += ["-stream_loop", "-1", "-i", music]
    music_idx = n + 1

    chains = []
    last = "0:v"
    t = timeline.transition
    for i, offset in enumerate(timeline.xfade_offsets()):
        label = f"x{i}"
        chains.append(f"[{last}][{i + 1}:v]xfade=transition=fade:duration={t:.3f}:offset={offset:.3f}[{label}]")
        last = label
    vf_tail = "format=yuv420p"
    if ass_file:
        # Chemin RELATIF + cwd=workdir : évite l'enfer d'échappement des lecteurs Windows (C\:/...).
        vf_tail = f"ass={ass_file.name},format=yuv420p"
    chains.append(f"[{last}]{vf_tail}[v]")

    total = timeline.total
    if music:
        chains.append(f"[{voice_idx}:a]aformat=channel_layouts=stereo,asplit=2[vm][vs]")
        chains.append(
            f"[{music_idx}:a]aresample=48000,aformat=channel_layouts=stereo,volume={MUSIC_VOLUME},"
            f"afade=t=in:d=1,afade=t=out:st={max(total - 2.0, 0):.3f}:d=2[mus]"
        )
        chains.append("[mus][vs]sidechaincompress=threshold=0.03:ratio=10:attack=15:release=400[duck]")
        chains.append("[vm][duck]amix=inputs=2:duration=first:normalize=0[a]")
    else:
        chains.append(f"[{voice_idx}:a]aformat=channel_layouts=stereo[a]")

    args = [*inputs, "-filter_complex", ";".join(chains), "-map", "[v]", "-map", "[a]",
            "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", settings.fps,
            "-c:a", "aac", "-b:a", "192k", "-ar", 48000, "-t", f"{total:.3f}",
            "-movflags", "+faststart", out]
    run_ffmpeg(settings.ffmpeg, args, cwd=workdir)
