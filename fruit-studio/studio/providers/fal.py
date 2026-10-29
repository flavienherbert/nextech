"""Fournisseur fal.ai (images FLUX Kontext). **NON TESTÉ contre le vrai service.**

Le protocole implémenté (file d'attente) est celui que je connais de mémoire :
  POST {base}/{endpoint}  -> {request_id, status_url, response_url}
  GET  status_url         -> {status: IN_QUEUE | IN_PROGRESS | COMPLETED}
  GET  response_url       -> résultat, avec {"images": [{"url": ...}]}
Les tests (tests/test_fal.py) tournent contre un FAUX serveur qui suit cette hypothèse : ils prouvent que
mon code est cohérent, pas que fal répond ainsi. Le premier vrai appel (≈ 0,04 $) est le vrai test.
Le coût réel n'est pas renvoyé par l'API : le journal contient une ESTIMATION issue de config/pricing.json.
Réconcilie avec le tableau de bord fal.ai.
"""
from __future__ import annotations

import base64
import logging
import time
from pathlib import Path

import requests

from ..errors import ProviderError
from .base import ImageProvider, ImageRequest

log = logging.getLogger(__name__)

_ASPECTS = {"9:16": 9 / 16, "2:3": 2 / 3, "3:4": 3 / 4, "1:1": 1.0, "4:3": 4 / 3, "3:2": 3 / 2, "16:9": 16 / 9}


def closest_aspect(width: int, height: int) -> str:
    ratio = width / height
    return min(_ASPECTS, key=lambda k: abs(_ASPECTS[k] - ratio))


class FalClient:
    def __init__(self, key: str, queue_base: str = "https://queue.fal.run", poll_interval: float = 2.0,
                 timeout: float = 300.0, session: requests.Session | None = None):
        if not key:
            raise ProviderError("FAL_KEY absente : renseigne-la dans .env")
        self._key = key
        self.base = queue_base.rstrip("/")
        self.poll_interval = poll_interval
        self.timeout = timeout
        self.http = session or requests.Session()

    @property
    def _headers(self) -> dict:
        return {"Authorization": f"Key {self._key}", "Content-Type": "application/json"}

    def _check(self, resp: requests.Response, what: str) -> dict:
        if resp.status_code >= 400:
            raise ProviderError(f"fal {what}: HTTP {resp.status_code} — {resp.text[:300]}")
        try:
            return resp.json()
        except ValueError as exc:
            raise ProviderError(f"fal {what}: réponse non JSON ({resp.text[:120]!r})") from exc

    def run(self, endpoint: str, payload: dict) -> dict:
        try:
            sub = self._check(self.http.post(f"{self.base}/{endpoint}", json=payload, headers=self._headers,
                                             timeout=60), f"soumission {endpoint}")
            status_url, response_url = sub["status_url"], sub["response_url"]
            deadline = time.monotonic() + self.timeout
            while True:
                st = self._check(self.http.get(status_url, headers=self._headers, timeout=30), "statut")
                state = str(st.get("status", "")).upper()
                if state == "COMPLETED":
                    break
                if state in ("FAILED", "ERROR", "CANCELLED"):
                    raise ProviderError(f"fal: génération en échec ({st})")
                if time.monotonic() > deadline:
                    raise ProviderError(f"fal: délai dépassé ({self.timeout:.0f}s) sur {endpoint}")
                time.sleep(self.poll_interval)
            return self._check(self.http.get(response_url, headers=self._headers, timeout=60), "résultat")
        except KeyError as exc:
            raise ProviderError(f"fal: réponse inattendue, champ manquant {exc}") from exc
        except requests.RequestException as exc:
            raise ProviderError(f"fal: erreur réseau — {exc}") from exc

    def download(self, url: str, out: Path) -> None:
        try:
            resp = self.http.get(url, timeout=120)  # URL de stockage public : pas d'en-tête d'authentification
        except requests.RequestException as exc:
            raise ProviderError(f"fal: téléchargement impossible — {exc}") from exc
        if resp.status_code >= 400 or not resp.content:
            raise ProviderError(f"fal: téléchargement HTTP {resp.status_code}, {len(resp.content)} octets")
        out.write_bytes(resp.content)


def _data_uri(path: Path) -> str:
    mime = "image/jpeg" if path.suffix.lower() in (".jpg", ".jpeg") else "image/png"
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode("ascii")


class FalImageProvider(ImageProvider):
    """0 référence : texte -> image. 1 référence : édition Kontext. 2+ : Kontext multi-images."""

    name = "fal-flux-kontext-pro"
    paid = True

    def __init__(self, client: FalClient, usd_per_image: float, endpoints: dict, **kw):
        super().__init__(**kw)
        self.client = client
        self.usd_per_image = usd_per_image
        self.endpoints = endpoints

    def estimate_cost(self, req: ImageRequest) -> float:
        return self.usd_per_image

    def _generate_image(self, req: ImageRequest, out: Path) -> dict:
        refs = list(req.reference_images)
        payload = {"prompt": req.prompt, "aspect_ratio": closest_aspect(req.width, req.height),
                   "output_format": "png", "num_images": 1}
        if not refs:
            endpoint = self.endpoints["text"]
        elif len(refs) == 1:
            endpoint = self.endpoints["single"]
            payload["image_url"] = _data_uri(refs[0])
        else:
            endpoint = self.endpoints["multi"]
            payload["image_urls"] = [_data_uri(r) for r in refs]
            names = [c.get("name", f"character {i + 1}") for i, c in enumerate(req.characters)]
            if len(names) == len(refs):
                hint = " ".join(f"Image {i + 1} is the character {n}." for i, n in enumerate(names))
                payload["prompt"] = f"{hint} {req.prompt}"
        log.info("fal: %s (%d référence(s)) — %s", endpoint, len(refs), req.label)
        result = self.client.run(endpoint, payload)
        try:
            url = result["images"][0]["url"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ProviderError(f"fal: pas d'image dans la réponse ({str(result)[:200]})") from exc
        self.client.download(url, out)
        return {"engine": endpoint}
