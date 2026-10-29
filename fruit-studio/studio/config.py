from __future__ import annotations

import os
from dataclasses import dataclass, replace
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Settings:
    root: Path
    projects_dir: Path
    characters_dir: Path
    music_dir: Path
    logs_dir: Path
    pricing_file: Path
    ffmpeg: str = "ffmpeg"
    ffprobe: str = "ffprobe"
    width: int = 1080
    height: int = 1920
    fps: int = 30
    subtitle_font: str = "Arial"
    # Taux indicatif USD -> EUR, à ajuster dans .env (USD_TO_EUR).
    usd_to_eur: float = 0.90
    openai_script_model: str = "gpt-4.1-mini"

    def with_size(self, width: int, height: int) -> "Settings":
        return replace(self, width=width, height=height)


def load_settings(root: Path | None = None) -> Settings:
    root = Path(root) if root else ROOT
    load_dotenv(root / ".env", override=False)
    env = os.environ
    return Settings(
        root=root,
        projects_dir=root / "projects",
        characters_dir=root / "characters",
        music_dir=root / "assets" / "music",
        logs_dir=root / "logs",
        pricing_file=root / "config" / "pricing.json",
        ffmpeg=env.get("FFMPEG_BIN", "ffmpeg"),
        ffprobe=env.get("FFPROBE_BIN", "ffprobe"),
        subtitle_font=env.get("SUBTITLE_FONT", "Arial"),
        usd_to_eur=float(env.get("USD_TO_EUR", "0.90")),
        openai_script_model=env.get("OPENAI_SCRIPT_MODEL", "gpt-4.1-mini"),
    )
