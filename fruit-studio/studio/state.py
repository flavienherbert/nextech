"""État d'un projet sauvegardé en JSON : un re-lancement reprend où ça s'est arrêté."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from .models import dump_json

STEPS = ("script", "images", "voices", "videos", "assemble")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def input_hash(*parts) -> str:
    """Empreinte stable des entrées d'un artefact : si elle change, l'artefact est régénéré."""
    blob = json.dumps(parts, ensure_ascii=False, sort_keys=True, default=str)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()[:16]


def file_hash(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


class ProjectState:
    def __init__(self, project_dir: Path):
        self.dir = Path(project_dir)
        self.path = self.dir / "state.json"
        self.data: dict = {}

    @classmethod
    def load_or_create(cls, project_dir: Path, mode: str) -> "ProjectState":
        st = cls(project_dir)
        st.dir.mkdir(parents=True, exist_ok=True)
        if st.path.exists():
            st.data = json.loads(st.path.read_text(encoding="utf-8"))
        else:
            st.data = {
                "version": 1,
                "project_id": st.dir.name,
                "created_at": now_iso(),
                "mode": mode,
                "steps": {s: {"status": "pending"} for s in STEPS},
                "artifacts": {},
                "approval": {"max_usd": 0.0},
            }
            st.save()
        return st

    def save(self) -> None:
        self.data["updated_at"] = now_iso()
        dump_json(self.path, self.data)

    # --- étapes -------------------------------------------------------------
    def step_status(self, step: str) -> str:
        return self.data["steps"][step]["status"]

    def set_step(self, step: str, status: str, **extra) -> None:
        self.data["steps"][step] = {"status": status, "at": now_iso(), **extra}
        self.save()

    def reset_from(self, step: str) -> None:
        for s in STEPS[STEPS.index(step):]:
            self.data["steps"][s] = {"status": "pending"}
        self.save()

    # --- artefacts ----------------------------------------------------------
    def artifact(self, key: str) -> dict | None:
        return self.data["artifacts"].get(key)

    def record_artifact(self, key: str, path: Path, in_hash: str, **meta) -> None:
        rel = Path(path).resolve().relative_to(self.dir.resolve()).as_posix()
        self.data["artifacts"][key] = {"path": rel, "input_hash": in_hash, "at": now_iso(), **meta}
        self.save()

    def artifact_path(self, key: str) -> Path:
        return self.dir / self.data["artifacts"][key]["path"]
