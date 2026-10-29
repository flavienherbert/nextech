"""Suivi des coûts, garde-fou de budget (règle 1) et estimation par scénario."""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from .errors import BudgetNotApproved
from .models import Script
from .providers.base import pick_supported_duration

log = logging.getLogger(__name__)


def load_pricing(path: Path) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


class CostLedger:
    """Journal JSONL des appels : un enregistrement par appel, total par projet."""

    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def entries(self) -> list[dict]:
        if not self.path.exists():
            return []
        return [json.loads(line) for line in self.path.read_text(encoding="utf-8").splitlines() if line.strip()]

    def total_usd(self) -> float:
        return round(sum(e["usd"] for e in self.entries()), 6)

    def add(self, provider: str, kind: str, usd: float, detail: str, estimated: bool = True) -> None:
        entry = {
            "at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "provider": provider, "kind": kind, "usd": round(usd, 6),
            "estimated": estimated, "detail": detail,
        }
        with open(self.path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
        log.debug("coût +%.4f$ (%s/%s) total=%.4f$", usd, provider, kind, self.total_usd())


class CostGuard:
    """Bloque tout appel payant qui dépasserait le budget validé explicitement."""

    def __init__(self, ledger: CostLedger, approved_usd: float):
        self.ledger = ledger
        self.approved_usd = approved_usd

    def check(self, provider: str, paid: bool, estimated_usd: float) -> None:
        if not paid:
            return
        projected = self.ledger.total_usd() + estimated_usd
        if projected > self.approved_usd + 1e-9:
            raise BudgetNotApproved(
                f"{provider}: appel estimé {estimated_usd:.3f}$ -> total {projected:.3f}$ "
                f"> budget validé {self.approved_usd:.3f}$. Valide un budget avec --approve-usd."
            )


def estimate_script_cost(script: Script, pricing: dict, stack: str, characters_without_ref: int = 0,
                         shot_durations: list[float] | None = None) -> dict:
    """Estimation du coût réel d'un scénario pour une pile donnée (indicative, voir pricing.json).

    `shot_durations` : durée vidéo voulue de chaque plan. Sans elle, on suppose la plus petite durée
    supportée par plan, ce qui SOUS-ESTIME le coût dès qu'un plan est plus long.
    """
    st = pricing["stacks"][stack]
    shots = script.shots()
    chars = sum(len(ln.text) for _, sh in shots for ln in sh.lines)
    img = pricing["image"][st["image"]]["usd_per_image"] * (len(shots) + characters_without_ref)
    vcfg = pricing["video"][st["video"]]
    durations = vcfg.get("durations") or [5]
    wanted = shot_durations or [min(durations)] * len(shots)
    billed = [pick_supported_duration(durations, w) for w in wanted]
    vid = sum(max(vcfg["usd_per_second"] * d, vcfg.get("min_usd", 0.0)) for d in billed)
    voice = pricing["voice"][st["voice"]].get("usd_per_1k_chars", 0.0) * chars / 1000
    llm = pricing["llm"][st["llm"]]["usd_per_script"]
    return {
        "stack": stack, "video_model": st["video"], "shots": len(shots), "dialogue_chars": chars,
        "video_seconds_billed": round(sum(billed), 1),
        "image_usd": round(img, 3), "video_usd": round(vid, 3), "voice_usd": round(voice, 3),
        "llm_usd": round(llm, 3), "total_usd": round(img + vid + voice + llm, 3),
        "verified": False,
    }
