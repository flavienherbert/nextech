from __future__ import annotations

import logging
import os
import re
from datetime import datetime
from pathlib import Path

_SECRET_NAME = re.compile(r"(KEY|TOKEN|SECRET|PASSWORD)", re.I)
_MIN_SECRET_LEN = 8


class SecretRedactor(logging.Filter):
    """Masque la valeur de toute variable d'environnement qui ressemble à un secret."""

    def _secrets(self) -> list[str]:
        values = [
            v for k, v in os.environ.items() if _SECRET_NAME.search(k) and len(v) >= _MIN_SECRET_LEN
        ]
        return sorted(values, key=len, reverse=True)

    def filter(self, record: logging.LogRecord) -> bool:
        msg = record.getMessage()
        for secret in self._secrets():
            msg = msg.replace(secret, "***")
        record.msg, record.args = msg, ()
        return True


def setup_logging(logs_dir: Path, verbose: bool = False) -> Path:
    logs_dir.mkdir(parents=True, exist_ok=True)
    log_file = logs_dir / f"run_{datetime.now():%Y%m%d}.log"
    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(logging.DEBUG)
    redactor = SecretRedactor()

    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)-7s %(name)s: %(message)s"))
    file_handler.addFilter(redactor)

    console = logging.StreamHandler()
    console.setLevel(logging.DEBUG if verbose else logging.INFO)
    console.setFormatter(logging.Formatter("%(levelname)-7s %(message)s"))
    console.addFilter(redactor)

    root.addHandler(file_handler)
    root.addHandler(console)
    return log_file
