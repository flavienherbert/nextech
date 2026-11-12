"""FFmpeg / ffprobe : exécution et vérification de fichiers média réels."""
from __future__ import annotations

import json
import logging
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from .errors import MediaVerificationError, StudioError

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class MediaInfo:
    path: Path
    size: int
    duration: float
    width: int | None
    height: int | None
    has_video: bool
    has_audio: bool
    video_codec: str | None
    audio_codec: str | None


def run_ffmpeg(ffmpeg: str, args: Sequence[str | Path], cwd: Path | None = None) -> None:
    """Lance ffmpeg sans shell. `cwd` sert à passer des chemins relatifs aux filtres (sous-titres)."""
    cmd = [ffmpeg, "-hide_banner", "-nostdin", "-y", "-loglevel", "error", *map(str, args)]
    log.debug("ffmpeg %s", " ".join(map(str, args)))
    proc = subprocess.run(
        cmd, cwd=str(cwd) if cwd else None, capture_output=True, text=True, encoding="utf-8", errors="replace"
    )
    if proc.returncode != 0:
        tail = "\n".join(proc.stderr.strip().splitlines()[-15:])
        raise StudioError(f"ffmpeg a échoué (code {proc.returncode}):\n{tail}")


def probe(ffprobe: str, path: Path) -> MediaInfo:
    path = Path(path)
    if not path.is_file():
        raise MediaVerificationError(f"fichier absent: {path}")
    size = path.stat().st_size
    if size <= 0:
        raise MediaVerificationError(f"fichier vide (0 octet): {path}")
    proc = subprocess.run(
        [ffprobe, "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    if proc.returncode != 0:
        raise MediaVerificationError(f"ffprobe illisible ({path.name}): {proc.stderr.strip()[-300:]}")
    data = json.loads(proc.stdout or "{}")
    streams = data.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio = next((s for s in streams if s.get("codec_type") == "audio"), None)
    raw_duration = data.get("format", {}).get("duration")
    if raw_duration in (None, "N/A") and video:
        raw_duration = video.get("duration")
    duration = float(raw_duration) if raw_duration not in (None, "N/A") else 0.0
    return MediaInfo(
        path=path, size=size, duration=duration,
        width=video.get("width") if video else None,
        height=video.get("height") if video else None,
        has_video=video is not None, has_audio=audio is not None,
        video_codec=video.get("codec_name") if video else None,
        audio_codec=audio.get("codec_name") if audio else None,
    )


def verify_media(
    ffprobe: str,
    path: Path,
    kind: str,
    *,
    min_duration: float = 0.1,
    expect_size: tuple[int, int] | None = None,
    expect_duration: float | None = None,
    tolerance: float = 0.25,
) -> MediaInfo:
    """Lève MediaVerificationError si le fichier n'est pas un média réel du type attendu.

    kind: "image" | "video" | "audio". Un « succès » sans fichier vérifié n'existe pas.
    """
    info = probe(ffprobe, path)
    if kind in ("image", "video"):
        if not info.has_video:
            raise MediaVerificationError(f"{path.name}: aucun flux vidéo/image")
        if expect_size and (info.width, info.height) != tuple(expect_size):
            raise MediaVerificationError(
                f"{path.name}: dimensions {info.width}x{info.height}, attendu {expect_size[0]}x{expect_size[1]}"
            )
    if kind == "audio" and not info.has_audio:
        raise MediaVerificationError(f"{path.name}: aucun flux audio")
    if kind in ("video", "audio"):
        if info.duration < min_duration:
            raise MediaVerificationError(f"{path.name}: durée {info.duration:.2f}s < {min_duration}s")
        if expect_duration is not None and abs(info.duration - expect_duration) > tolerance:
            raise MediaVerificationError(
                f"{path.name}: durée {info.duration:.2f}s, attendu {expect_duration:.2f}s ±{tolerance}"
            )
    return info
