"""Providers du mode --dry-run : vrais fichiers, 0 €.

- images : Pillow (dégradé + texte + fruits stylisés)
- vidéo  : FFmpeg (zoom lent sur l'image)
- voix   : Edge-TTS (gratuit, non officiel) avec repli hors-ligne « babillage » synthétique
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import math
import re
import wave
from array import array
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from ..errors import ProviderError
from ..media import run_ffmpeg
from .base import (ImageProvider, ImageRequest, VideoProvider, VideoRequest, VoiceProvider, VoiceRequest)

log = logging.getLogger(__name__)

_FONT_CANDIDATES = ["arialbd.ttf", "DejaVuSans-Bold.ttf", "LiberationSans-Bold.ttf", "Helvetica.ttc"]


def _font(size: int) -> ImageFont.ImageFont:
    for name in _FONT_CANDIDATES:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default(size=size)


def _wrap(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> list[str]:
    lines, cur = [], ""
    for word in text.split():
        trial = f"{cur} {word}".strip()
        if cur and draw.textlength(trial, font=font) > max_width:
            lines.append(cur)
            cur = word
        else:
            cur = trial
    if cur:
        lines.append(cur)
    return lines


def _hash_color(label: str, salt: int) -> tuple[int, int, int]:
    h = hashlib.sha256(f"{label}:{salt}".encode()).digest()
    return (40 + h[0] % 110, 40 + h[1] % 110, 60 + h[2] % 120)


def _hex_rgb(value: str) -> tuple[int, int, int]:
    v = value.lstrip("#")
    try:
        return int(v[0:2], 16), int(v[2:4], 16), int(v[4:6], 16)
    except (ValueError, IndexError):
        return (255, 200, 0)


class PlaceholderImageProvider(ImageProvider):
    name = "placeholder-image"

    def estimate_cost(self, req: ImageRequest) -> float:
        return 0.0

    def _generate_image(self, req: ImageRequest, out: Path) -> dict:
        w, h = req.width, req.height
        top, bottom = _hash_color(req.label, 1), _hash_color(req.label, 2)
        img = Image.new("RGB", (w, h))
        px = ImageDraw.Draw(img)
        for y in range(h):
            t = y / max(h - 1, 1)
            px.line([(0, y), (w, y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
        d = ImageDraw.Draw(img)

        # Fruits stylisés : un disque coloré + yeux, un par personnage présent.
        chars = req.characters or []
        n = len(chars)
        radius = int(min(w / (n + 1.2) / 2, w * 0.26)) if n else 0
        for i, ch in enumerate(chars):
            cx = int(w * (i + 1) / (n + 1))
            cy = int(h * 0.52)
            d.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=_hex_rgb(ch.get("ui_color", "#FFC800")),
                      outline=(20, 20, 20), width=max(4, w // 200))
            eye = radius // 7
            for dx in (-radius // 3, radius // 3):
                d.ellipse([cx + dx - eye, cy - radius // 5 - eye, cx + dx + eye, cy - radius // 5 + eye], fill="white",
                          outline=(20, 20, 20), width=2)
                d.ellipse([cx + dx - eye // 2, cy - radius // 5 - eye // 2, cx + dx + eye // 2, cy - radius // 5 + eye // 2], fill=(20, 20, 20))
            d.arc([cx - radius // 3, cy, cx + radius // 3, cy + radius // 2], 20, 160, fill=(20, 20, 20), width=max(3, w // 250))
            name_font = _font(max(18, w // 22))
            tw = d.textlength(ch.get("name", ""), font=name_font)
            d.text((cx - tw / 2, cy + radius + h * 0.015), ch.get("name", ""), font=name_font, fill="white",
                   stroke_width=2, stroke_fill=(0, 0, 0))

        title_font = _font(max(22, w // 12))
        y = int(h * 0.07)
        for line in _wrap(d, req.label.upper(), title_font, int(w * 0.88)):
            d.text((w * 0.06, y), line, font=title_font, fill="white", stroke_width=3, stroke_fill=(0, 0, 0))
            y += int(title_font.size * 1.15)

        body_font = _font(max(14, w // 32))
        y = int(h * 0.20)
        for line in _wrap(d, req.prompt, body_font, int(w * 0.88))[:7]:
            d.text((w * 0.06, y), line, font=body_font, fill=(235, 235, 235), stroke_width=1, stroke_fill=(0, 0, 0))
            y += int(body_font.size * 1.3)
        d.text((w * 0.06, h * 0.96), "PLACEHOLDER - DRY RUN", font=_font(max(12, w // 45)), fill=(255, 220, 0))
        img.save(out, "PNG")
        return {"engine": "pillow"}


class PlaceholderVideoProvider(VideoProvider):
    name = "placeholder-video"

    def estimate_cost(self, req: VideoRequest) -> float:
        return 0.0

    def _generate_clip(self, req: VideoRequest, out: Path, duration: float) -> dict:
        frames = max(int(round(duration * req.fps)), 2)
        zoom_out = bool(re.search(r"pull|out|recul", req.prompt, re.I))
        step = 0.15 / frames
        z = f"max(1.15-{step:.6f}*on,1.0)" if zoom_out else f"min(1.0+{step:.6f}*on,1.15)"
        # Sur-échantillonnage x1.5 avant zoompan pour éviter les saccades d'arrondi.
        vf = (
            f"scale={int(req.width * 1.5)}:{int(req.height * 1.5)},"
            f"zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={req.width}x{req.height}:fps={req.fps},"
            "format=yuv420p"
        )
        run_ffmpeg(self.ffmpeg, ["-i", req.image, "-vf", vf, "-frames:v", frames, "-an",
                                 "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", out])
        return {"engine": "ffmpeg-zoompan", "duration": duration}


# --- voix ------------------------------------------------------------------

_EMOTIONS = {  # émotion -> (delta vitesse %, delta hauteur Hz)
    "colère": (8, 6), "colere": (8, 6), "peur": (10, 12), "panique": (14, 14), "tristesse": (-12, -6),
    "joie": (6, 8), "surprise": (4, 14), "sarcasme": (-4, -2), "menace": (-10, -10), "calme": (-4, 0),
    "suspense": (-8, -4), "neutre": (0, 0),
}


def _shift(base: str, delta: int, unit: str) -> str:
    m = re.fullmatch(r"([+-]?\d+)\s*(%|Hz)", base.strip())
    value = int(m.group(1)) if m else 0
    return f"{value + delta:+d}{unit}"


def _emotion_delta(emotion: str) -> tuple[int, int]:
    return _EMOTIONS.get(emotion.strip().lower(), (0, 0))


class PlaceholderVoiceProvider(VoiceProvider):
    """Edge-TTS si possible ; sinon voix synthétique hors-ligne (clairement un placeholder)."""

    name = "placeholder-voice"

    def __init__(self, ffprobe="ffprobe", ffmpeg="ffmpeg", engine: str = "auto", timeout: float = 30.0):
        super().__init__(ffprobe, ffmpeg)
        if engine not in ("auto", "edge", "babble"):
            raise ValueError(f"moteur de voix inconnu: {engine}")
        self.engine = engine
        self.timeout = timeout
        self._edge_down = False  # évite de retenter le réseau à chaque réplique une fois constaté KO

    def estimate_cost(self, req: VoiceRequest) -> float:
        return 0.0

    def _synthesize(self, req: VoiceRequest, out: Path) -> dict:
        if self.engine in ("auto", "edge") and not self._edge_down:
            tmp_mp3 = out.with_name(out.stem + ".edge.mp3")
            try:
                self._edge(req, tmp_mp3)
                if not tmp_mp3.exists() or tmp_mp3.stat().st_size == 0:
                    raise ProviderError("Edge-TTS a produit un fichier vide")
                run_ffmpeg(self.ffmpeg, ["-i", tmp_mp3, "-ar", 48000, "-ac", 1, out])
                tmp_mp3.unlink(missing_ok=True)
                return {"engine": "edge-tts"}
            except Exception as exc:  # réseau, service, voix inconnue...
                tmp_mp3.unlink(missing_ok=True)
                if self.engine == "edge":
                    raise ProviderError(f"Edge-TTS a échoué: {exc}") from exc
                self._edge_down = True
                log.warning("Edge-TTS indisponible (%s) -> repli sur la voix synthétique hors-ligne (PLACEHOLDER).",
                            str(exc)[:120])
        self._babble(req, out)
        return {"engine": "babble"}

    def _edge(self, req: VoiceRequest, out: Path) -> None:
        import edge_tts  # import tardif : dépendance du mode dry-run uniquement

        voice = req.voice
        if not voice.edge:
            raise ProviderError("aucune voix Edge définie pour ce personnage")
        d_rate, d_pitch = _emotion_delta(req.emotion)
        comm = edge_tts.Communicate(req.text, voice.edge, rate=_shift(voice.rate, d_rate, "%"),
                                    pitch=_shift(voice.pitch, d_pitch, "Hz"))

        async def run():
            await asyncio.wait_for(comm.save(str(out)), timeout=self.timeout)

        asyncio.run(run())

    def _babble(self, req: VoiceRequest, out: Path) -> None:
        """Voix de repli : rafale de notes par lettre, hauteur propre à chaque personnage."""
        sr = 24000
        d_rate, d_pitch = _emotion_delta(req.emotion)
        f0 = float(req.voice.babble_f0) * (1 + d_pitch / 100)
        speed = 1 + d_rate / 100
        samples = array("h")
        for idx, ch in enumerate(req.text):
            if ch.isspace():
                n = int(sr * 0.055 / speed)
                samples.extend([0] * n)
                continue
            if not ch.isalnum():
                samples.extend([0] * int(sr * 0.13 / speed))
                continue
            vowel = ch.lower() in "aeiouyàâéèêëîïôùûœ"
            n = int(sr * (0.078 if vowel else 0.045) / speed)
            f = f0 * (1 + 0.28 * math.sin(ord(ch.lower()) * 1.7 + idx * 0.35))
            for i in range(n):
                env = min(i / (sr * 0.008), 1.0, (n - i) / (sr * 0.012))
                v = math.sin(2 * math.pi * f * i / sr) + 0.4 * math.sin(4 * math.pi * f * i / sr)
                samples.append(int(max(-1, min(1, 0.32 * env * v)) * 32767))
        samples.extend([0] * int(sr * 0.1))
        with wave.open(str(out), "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sr)
            wf.writeframes(samples.tobytes())
