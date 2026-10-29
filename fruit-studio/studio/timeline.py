"""Calcul pur (sans FFmpeg) de la durée de chaque plan et du placement des répliques.

Le fondu enchaîné se fait en prolongeant chaque plan (sauf le dernier) de `transition`
secondes de « queue » : la piste audio, elle, n'est jamais décalée par les transitions.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from .models import Script


@dataclass(frozen=True)
class TimelineConfig:
    lead: float = 0.20          # silence avant la première réplique d'un plan
    gap: float = 0.30           # silence entre deux répliques
    tail: float = 0.40          # silence après la dernière réplique
    min_shot: float = 2.5       # durée minimale d'un plan
    silent_shot: float = 3.0    # durée d'un plan sans dialogue
    transition: float = 0.35    # fondu enchaîné entre deux plans


@dataclass
class LinePlacement:
    shot_id: str
    index: int
    speaker: str
    text: str
    emotion: str
    start: float      # absolu dans la vidéo finale
    duration: float


@dataclass
class ShotPlacement:
    shot_id: str
    scene_id: str
    start: float
    duration: float   # durée « audio » du plan (sans queue de transition)
    lines: list[LinePlacement] = field(default_factory=list)


@dataclass
class Timeline:
    shots: list[ShotPlacement]
    total: float
    transition: float

    def video_length(self, i: int) -> float:
        """Durée de la séquence vidéo du plan i, queue de transition incluse (sauf dernier plan)."""
        last = i == len(self.shots) - 1
        return self.shots[i].duration + (0.0 if last else self.transition)

    def xfade_offsets(self) -> list[float]:
        """Offset de chaque xfade i -> i+1 : le plan i+1 commence exactement à shots[i+1].start."""
        return [round(s.start + s.duration, 3) for s in self.shots[:-1]]

    def all_lines(self) -> list[LinePlacement]:
        return [ln for sh in self.shots for ln in sh.lines]


def build_timeline(script: Script, line_durations: dict[tuple[str, int], float],
                   cfg: TimelineConfig = TimelineConfig()) -> Timeline:
    shots: list[ShotPlacement] = []
    cursor = 0.0
    for scene, shot in script.shots():
        placed: list[LinePlacement] = []
        if shot.lines:
            t = cfg.lead
            for i, ln in enumerate(shot.lines):
                dur = line_durations[(shot.id, i)]
                placed.append(LinePlacement(shot.id, i, ln.speaker, ln.text, ln.emotion, cursor + t, dur))
                t += dur + (cfg.gap if i < len(shot.lines) - 1 else 0.0)
            duration = max(cfg.min_shot, t + cfg.tail)
        else:
            duration = cfg.silent_shot
        shots.append(ShotPlacement(shot.id, scene.id, round(cursor, 3), round(duration, 3), placed))
        cursor += duration
    return Timeline(shots=shots, total=round(cursor, 3), transition=cfg.transition)
