"""Interfaces Provider (images, vidéo, voix).

Chaque `generate_*` public appelle `_generate_*` puis VÉRIFIE le fichier produit :
aucun fournisseur ne peut renvoyer « succès » sans média réel (règle 2).
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path

from ..errors import ProviderError
from ..media import MediaInfo, verify_media


@dataclass
class ImageRequest:
    prompt: str
    width: int
    height: int
    label: str
    reference_images: list[Path] = field(default_factory=list)
    characters: list[dict] = field(default_factory=list)  # {"name","ui_color","fruit"} pour les placeholders
    seed: int | None = None


@dataclass
class VideoRequest:
    image: Path
    prompt: str
    duration: float       # durée voulue (s)
    width: int
    height: int
    fps: int
    label: str


@dataclass
class VoiceRequest:
    text: str
    emotion: str
    voice: "object"       # VoiceSpec
    label: str
    language: str = "fr"


@dataclass
class ProviderResult:
    path: Path
    info: MediaInfo
    cost_usd: float
    engine: str           # moteur réellement utilisé (ex. "edge-tts" ou "babble")
    meta: dict = field(default_factory=dict)


FREEZE_TOLERANCE = 1.0  # s : un clip peut être plus court que le plan, la dernière image est alors figée


def pick_supported_duration(supported: tuple[float, ...] | list[float], wanted: float,
                            tolerance: float = FREEZE_TOLERANCE) -> float:
    """Plus petite durée supportée qui couvre `wanted` à `tolerance` près, sinon la plus longue."""
    if not supported:
        return wanted
    for d in sorted(supported):
        if d + tolerance >= wanted - 1e-6:
            return d
    return max(supported)


class Provider(ABC):
    name: str = "provider"
    paid: bool = False

    def __init__(self, ffprobe: str = "ffprobe", ffmpeg: str = "ffmpeg"):
        self.ffprobe = ffprobe
        self.ffmpeg = ffmpeg

    @staticmethod
    def _ensure_dir(out: Path) -> None:
        out.parent.mkdir(parents=True, exist_ok=True)


class ImageProvider(Provider):
    @abstractmethod
    def estimate_cost(self, req: ImageRequest) -> float: ...

    @abstractmethod
    def _generate_image(self, req: ImageRequest, out: Path) -> dict: ...

    def generate_image(self, req: ImageRequest, out: Path) -> ProviderResult:
        self._ensure_dir(out)
        meta = self._generate_image(req, out) or {}
        info = verify_media(self.ffprobe, out, "image")
        return ProviderResult(out, info, meta.pop("cost_usd", self.estimate_cost(req)), meta.pop("engine", self.name), meta)


class VideoProvider(Provider):
    supported_durations: tuple[float, ...] = ()  # vide = durée libre

    def pick_duration(self, wanted: float) -> float:
        return pick_supported_duration(self.supported_durations, wanted)

    @abstractmethod
    def estimate_cost(self, req: VideoRequest) -> float: ...

    @abstractmethod
    def _generate_clip(self, req: VideoRequest, out: Path, duration: float) -> dict: ...

    def generate_clip(self, req: VideoRequest, out: Path) -> ProviderResult:
        self._ensure_dir(out)
        duration = self.pick_duration(req.duration)
        meta = self._generate_clip(req, out, duration) or {}
        info = verify_media(self.ffprobe, out, "video", min_duration=min(duration, 1.0) * 0.5)
        if not info.has_video:
            raise ProviderError(f"{self.name}: le clip produit n'a pas de flux vidéo")
        return ProviderResult(out, info, meta.pop("cost_usd", self.estimate_cost(req)), meta.pop("engine", self.name), meta)


class VoiceProvider(Provider):
    @abstractmethod
    def estimate_cost(self, req: VoiceRequest) -> float: ...

    @abstractmethod
    def _synthesize(self, req: VoiceRequest, out: Path) -> dict: ...

    def synthesize(self, req: VoiceRequest, out: Path) -> ProviderResult:
        self._ensure_dir(out)
        meta = self._synthesize(req, out) or {}
        info = verify_media(self.ffprobe, out, "audio", min_duration=0.2)
        return ProviderResult(out, info, meta.pop("cost_usd", self.estimate_cost(req)), meta.pop("engine", self.name), meta)
