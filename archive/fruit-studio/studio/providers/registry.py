"""Choix des providers selon le mode. Voix et vidéo réelles arrivent au Jalon 3."""
from __future__ import annotations

import os
from dataclasses import dataclass

from ..config import Settings
from ..costs import load_pricing
from ..errors import ProviderNotAvailable
from .base import ImageProvider, VideoProvider, VoiceProvider
from .placeholder import PlaceholderImageProvider, PlaceholderVideoProvider, PlaceholderVoiceProvider


@dataclass
class ProviderSet:
    image: ImageProvider | None
    video: VideoProvider | None
    voice: VoiceProvider | None
    stack: str


def build_providers(settings: Settings, dry_run: bool, voice_engine: str = "auto") -> ProviderSet:
    kw = {"ffprobe": settings.ffprobe, "ffmpeg": settings.ffmpeg}
    if dry_run:
        return ProviderSet(
            image=PlaceholderImageProvider(**kw),
            video=PlaceholderVideoProvider(**kw),
            voice=PlaceholderVoiceProvider(engine=voice_engine, **kw),
            stack="dry-run",
        )
    from .fal import FalClient, FalImageProvider  # import tardif : `requests` inutile en dry-run

    key = os.environ.get("FAL_KEY", "")
    if not key:
        raise ProviderNotAvailable("FAL_KEY absente de .env : impossible de générer des images réelles.")
    cfg = load_pricing(settings.pricing_file)["image"]["fal-flux-kontext-pro"]
    client = FalClient(key, settings.fal_queue_base)
    return ProviderSet(
        image=FalImageProvider(client, cfg["usd_per_image"], cfg["endpoints"], **kw),
        video=None,   # Jalon 3
        voice=None,   # Jalon 3
        stack="real-j2",
    )
