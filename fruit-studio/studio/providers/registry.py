"""Choix des providers selon le mode. Les fournisseurs réels arrivent aux jalons 2 et 3."""
from __future__ import annotations

from dataclasses import dataclass

from ..config import Settings
from ..errors import ProviderNotAvailable
from .base import ImageProvider, VideoProvider, VoiceProvider
from .placeholder import PlaceholderImageProvider, PlaceholderVideoProvider, PlaceholderVoiceProvider


@dataclass
class ProviderSet:
    image: ImageProvider
    video: VideoProvider
    voice: VoiceProvider
    stack: str


def build_providers(settings: Settings, dry_run: bool, voice_engine: str = "auto") -> ProviderSet:
    if not dry_run:
        raise ProviderNotAvailable(
            "Providers réels non implémentés au Jalon 1 (images: Jalon 2, vidéo + voix: Jalon 3). "
            "Utilise --dry-run."
        )
    kw = {"ffprobe": settings.ffprobe, "ffmpeg": settings.ffmpeg}
    return ProviderSet(
        image=PlaceholderImageProvider(**kw),
        video=PlaceholderVideoProvider(**kw),
        voice=PlaceholderVoiceProvider(engine=voice_engine, **kw),
        stack="dry-run",
    )
