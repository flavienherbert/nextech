"""Modèles de données : fiches personnages et scénario (validés par pydantic)."""
from __future__ import annotations

import json
from pathlib import Path

from pydantic import BaseModel, Field, field_validator, model_validator

from .errors import ScriptError

NARRATOR_ID = "narrateur"


class VoiceSpec(BaseModel):
    """Voix d'un personnage, par fournisseur. Les champs inutilisés restent None."""

    edge: str | None = None
    elevenlabs: str | None = None
    openai: str | None = None
    rate: str = "+0%"      # Edge-TTS
    pitch: str = "+0Hz"    # Edge-TTS
    babble_f0: float = 180.0  # hauteur de la voix de repli hors-ligne (Hz)


class Character(BaseModel):
    id: str
    name: str
    fruit: str
    color: str
    face: str
    clothing: str
    morphology: str
    personality: str
    ui_color: str = "#FFFFFF"  # couleur des sous-titres de ce personnage
    voice: VoiceSpec = Field(default_factory=VoiceSpec)
    reference_image: str | None = None  # chemin relatif à la racine de l'app

    def canonical_description(self) -> str:
        """Description canonique, à recopier MOT POUR MOT dans chaque prompt d'image."""
        return (
            f"{self.name}, a 3D-animated anthropomorphic {self.fruit}, {self.color}; "
            f"face: {self.face}; clothing: {self.clothing}; body: {self.morphology}; "
            f"personality: {self.personality}"
        )


def narrator() -> Character:
    return Character(
        id=NARRATOR_ID, name="Narrateur", fruit="none", color="none", face="-", clothing="-",
        morphology="-", personality="neutral narrator", ui_color="#FFFFFF",
        voice=VoiceSpec(edge="fr-FR-RemyMultilingualNeural", babble_f0=130.0),
    )


def load_characters(characters_dir: Path) -> dict[str, Character]:
    chars: dict[str, Character] = {}
    for path in sorted(Path(characters_dir).glob("*.json")):
        char = Character.model_validate_json(path.read_text(encoding="utf-8"))
        if char.id in chars:
            raise ScriptError(f"personnage en double: {char.id}")
        chars[char.id] = char
    chars.setdefault(NARRATOR_ID, narrator())
    return chars


class Line(BaseModel):
    speaker: str
    text: str
    emotion: str = "neutre"

    @field_validator("text")
    @classmethod
    def _non_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("réplique vide")
        return v


class Shot(BaseModel):
    id: str
    visual: str                      # ce que montre l'image
    motion: str = "slow push-in"     # mouvement de caméra / action pour la vidéo
    characters: list[str] = Field(default_factory=list)
    lines: list[Line] = Field(default_factory=list)


class Scene(BaseModel):
    id: str
    title: str
    location: str
    shots: list[Shot]

    @field_validator("shots")
    @classmethod
    def _has_shots(cls, v: list[Shot]) -> list[Shot]:
        if not v:
            raise ValueError("une scène doit avoir au moins un plan")
        return v


class Script(BaseModel):
    title: str
    language: str = "fr"
    style: str = "3D animated Pixar-like film, cinematic lighting, vertical 9:16"
    scenes: list[Scene]

    @model_validator(mode="after")
    def _unique_ids(self) -> "Script":
        ids = [s.id for sc in self.scenes for s in sc.shots]
        dupes = {i for i in ids if ids.count(i) > 1}
        if dupes:
            raise ValueError(f"identifiants de plans en double: {sorted(dupes)}")
        if not self.scenes:
            raise ValueError("scénario sans scène")
        return self

    def shots(self) -> list[tuple[Scene, Shot]]:
        return [(sc, sh) for sc in self.scenes for sh in sc.shots]

    def validate_against(self, characters: dict[str, Character]) -> None:
        for sc, sh in self.shots():
            for cid in sh.characters + [ln.speaker for ln in sh.lines]:
                if cid not in characters:
                    raise ScriptError(f"plan {sh.id}: personnage inconnu '{cid}' (dispo: {sorted(characters)})")


def load_script(path: Path) -> Script:
    try:
        return Script.model_validate_json(Path(path).read_text(encoding="utf-8"))
    except ValueError as exc:
        raise ScriptError(f"scénario invalide ({path}): {exc}") from exc


def dump_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)
