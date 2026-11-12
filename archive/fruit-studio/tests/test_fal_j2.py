"""Jalon 2 : fournisseur fal, plafond global, mode plan, restriction aux plans.

ATTENTION : le fournisseur est testé contre un FAUX serveur fal qui suit le protocole que j'ai supposé
(file d'attente + téléchargement). Ces tests ne prouvent pas que le vrai fal.ai répond ainsi.
"""
import io
import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest
from PIL import Image

from studio.costs import CostLedger
from studio.errors import BudgetNotApproved, ProviderError
from studio.pipeline import Pipeline
from studio.providers.base import ImageRequest
from studio.providers.fal import FalClient, FalImageProvider, closest_aspect
from studio.providers.registry import ProviderSet

from conftest import pytestmark_ffmpeg

pytestmark = pytestmark_ffmpeg

ENDPOINTS = {"text": "fal-ai/t2i", "single": "fal-ai/edit", "multi": "fal-ai/multi"}


def _png() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (90, 160), (200, 120, 30)).save(buf, "PNG")
    return buf.getvalue()


class FakeFal:
    """Faux serveur de file d'attente fal. `mode` : ok | auth | empty_download | no_image | failed."""

    def __init__(self, mode="ok"):
        self.mode, self.requests, self.polls = mode, [], 0
        outer = self

        class H(BaseHTTPRequestHandler):
            def log_message(self, *a): pass

            def _json(self, code, obj):
                body = json.dumps(obj).encode()
                self.send_response(code); self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body)

            def do_POST(self):
                data = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
                outer.requests.append({"path": self.path, "auth": self.headers.get("Authorization"), "body": data})
                if outer.mode == "auth":
                    return self._json(401, {"detail": "Invalid key"})
                base = f"http://127.0.0.1:{outer.port}"
                self._json(200, {"request_id": "r1", "status_url": f"{base}/status", "response_url": f"{base}/result"})

            def do_GET(self):
                if self.path == "/status":
                    outer.polls += 1
                    if outer.mode == "failed":
                        return self._json(200, {"status": "FAILED"})
                    return self._json(200, {"status": "IN_QUEUE" if outer.polls == 1 else "COMPLETED"})
                if self.path == "/result":
                    if outer.mode == "no_image":
                        return self._json(200, {"images": []})
                    return self._json(200, {"images": [{"url": f"http://127.0.0.1:{outer.port}/img.png"}]})
                if self.path == "/img.png":
                    body = b"" if outer.mode == "empty_download" else _png()
                    self.send_response(200); self.send_header("Content-Length", str(len(body))); self.end_headers()
                    self.wfile.write(body)
                    return
                self.send_response(404); self.end_headers()

        self.server = HTTPServer(("127.0.0.1", 0), H)
        self.port = self.server.server_address[1]
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def stop(self):
        self.server.shutdown()


@pytest.fixture()
def fake():
    f = FakeFal()
    yield f
    f.stop()


def _provider(fake, settings, usd=0.04):
    client = FalClient("test-key-123456789", f"http://127.0.0.1:{fake.port}", poll_interval=0.01, timeout=5)
    return FalImageProvider(client, usd, ENDPOINTS, ffprobe=settings.ffprobe, ffmpeg=settings.ffmpeg)


def test_closest_aspect():
    assert closest_aspect(1080, 1920) == "9:16" and closest_aspect(1000, 1000) == "1:1"


def test_text_to_image_uses_text_endpoint_and_returns_a_verified_png(fake, settings, tmp_path):
    res = _provider(fake, settings).generate_image(ImageRequest("a lemon", 270, 480, "ref"), tmp_path / "a.png")
    assert res.info.has_video and res.info.size > 0
    assert fake.requests[0]["path"] == "/fal-ai/t2i" and "image_url" not in fake.requests[0]["body"]
    assert fake.requests[0]["auth"] == "Key test-key-123456789"
    assert fake.requests[0]["body"]["aspect_ratio"] == "9:16"


def test_one_reference_uses_edit_endpoint_with_data_uri(fake, settings, tmp_path):
    ref = tmp_path / "ref.png"; ref.write_bytes(_png())
    _provider(fake, settings).generate_image(ImageRequest("p", 270, 480, "x", reference_images=[ref]), tmp_path / "a.png")
    body = fake.requests[0]["body"]
    assert fake.requests[0]["path"] == "/fal-ai/edit" and body["image_url"].startswith("data:image/png;base64,")


def test_two_references_use_multi_endpoint_and_name_each_image(fake, settings, tmp_path):
    r1, r2 = tmp_path / "1.png", tmp_path / "2.png"; r1.write_bytes(_png()); r2.write_bytes(_png())
    req = ImageRequest("scene", 270, 480, "x", reference_images=[r1, r2],
                       characters=[{"name": "Citron"}, {"name": "Juge Pastèque"}])
    _provider(fake, settings).generate_image(req, tmp_path / "a.png")
    body = fake.requests[0]["body"]
    assert fake.requests[0]["path"] == "/fal-ai/multi" and len(body["image_urls"]) == 2
    assert body["prompt"].startswith("Image 1 is the character Citron. Image 2 is the character Juge Pastèque.")


@pytest.mark.parametrize("mode,fragment", [("auth", "401"), ("no_image", "pas d'image"), ("failed", "échec")])
def test_fal_failures_raise_instead_of_faking_success(settings, tmp_path, mode, fragment):
    f = FakeFal(mode)
    try:
        with pytest.raises(ProviderError, match=fragment):
            _provider(f, settings).generate_image(ImageRequest("p", 270, 480, "x"), tmp_path / "a.png")
        assert not (tmp_path / "a.png").exists()
    finally:
        f.stop()


def test_empty_download_is_rejected(settings, tmp_path):
    f = FakeFal("empty_download")
    try:
        with pytest.raises(ProviderError, match="0 octets"):
            _provider(f, settings).generate_image(ImageRequest("p", 270, 480, "x"), tmp_path / "a.png")
    finally:
        f.stop()


def test_missing_key_is_refused():
    with pytest.raises(ProviderError, match="FAL_KEY"):
        FalClient("")


# ---------------- pipeline en mode « réel » (faux serveur) ----------------

def _real_pipeline(fake, settings, characters, script1, tmp_path, cap, only=None, usd=0.04):
    s = settings.__class__(**{**settings.__dict__, "max_budget_usd": cap, "characters_dir": tmp_path / "chars"})
    (tmp_path / "chars").mkdir(exist_ok=True)
    prov = _provider(fake, settings, usd)
    providers = ProviderSet(image=prov, video=None, voice=None, stack="real-j2")
    pipe = Pipeline(s, tmp_path / "proj", providers, script1, characters, only_shots=only,
                    global_ledger=CostLedger(tmp_path / "_budget.jsonl"))
    return pipe


def test_plan_is_free_and_lists_refs_plus_selected_shots(fake, settings, characters, script1, tmp_path):
    pipe = _real_pipeline(fake, settings, characters, script1, tmp_path, cap=10, only={"s1_1", "s2_1", "s3_5"})
    plan = pipe.plan("images")
    assert fake.requests == []                       # aucun appel réseau
    assert len(plan["items"]) == 2 + 3               # 2 références + 3 plans
    assert plan["total_usd"] == pytest.approx(0.20)
    assert plan["remaining_after_usd"] == pytest.approx(10 - 0.20 * 1.15)


def test_paid_calls_are_refused_until_a_budget_is_validated(fake, settings, characters, script1, tmp_path):
    pipe = _real_pipeline(fake, settings, characters, script1, tmp_path, cap=10, only={"s1_1"})
    with pytest.raises(BudgetNotApproved):
        pipe.run(until="images")
    assert fake.requests == []


def test_j2_real_run_generates_refs_once_and_costs_are_logged(fake, settings, characters, script1, tmp_path):
    only = {"s1_1", "s2_1", "s3_5"}
    pipe = _real_pipeline(fake, settings, characters, script1, tmp_path, cap=10, only=only)
    pipe.set_run_budget(0.30)
    rep = pipe.run(until="images")
    assert len(fake.requests) == 5                    # 2 refs + 3 plans
    assert (tmp_path / "chars" / "refs" / "citron.png").is_file() and (tmp_path / "chars" / "refs" / "pasteque.png").is_file()
    assert set(rep["images"]) == only
    assert rep["cost_usd_this_project"] == pytest.approx(0.20) and rep["cost_usd_global"] == pytest.approx(0.20)
    paths = [r["path"] for r in fake.requests]
    assert paths.count("/fal-ai/t2i") == 2 and paths.count("/fal-ai/edit") == 2 and paths.count("/fal-ai/multi") == 1
    # rejouer ne dépense rien : références et images sont reprises
    n = len(fake.requests)
    pipe2 = _real_pipeline(fake, settings, characters, script1, tmp_path, cap=10, only=only)
    pipe2.run(until="images")
    assert len(fake.requests) == n


def test_global_cap_stops_before_exceeding(fake, settings, characters, script1, tmp_path):
    # plafond 0,15 $ : 3 appels à 0,04 (+15 %) passent (0,138), le 4e dépasserait -> arrêt, pas d'appel
    pipe = _real_pipeline(fake, settings, characters, script1, tmp_path, cap=0.15, only={"s1_1", "s2_1", "s3_5"})
    pipe.set_run_budget(5.0)
    with pytest.raises(BudgetNotApproved, match="PLAFOND GLOBAL"):
        pipe.run(until="images")
    assert len(fake.requests) == 3
    assert pipe.global_ledger.total_usd() <= 0.15


def test_global_cap_counts_spending_from_other_projects(fake, settings, characters, script1, tmp_path):
    (tmp_path / "_budget.jsonl").write_text(
        json.dumps({"usd": 9.99, "provider": "x", "kind": "video", "detail": "avant", "estimated": True, "at": "t"}) + "\n")
    pipe = _real_pipeline(fake, settings, characters, script1, tmp_path, cap=10, only={"s1_1"})
    pipe.set_run_budget(5.0)
    with pytest.raises(BudgetNotApproved, match="PLAFOND GLOBAL"):
        pipe.run(until="images")
    assert fake.requests == []


def test_only_shots_beyond_images_is_rejected(fake, settings, characters, script1, tmp_path):
    from studio.errors import StudioError
    pipe = _real_pipeline(fake, settings, characters, script1, tmp_path, cap=10, only={"s1_1"})
    with pytest.raises(StudioError, match="only-shots"):
        pipe.run(until="videos")


def test_real_providers_for_voice_and_video_are_not_available_yet(fake, settings, characters, script1, tmp_path):
    from studio.errors import ProviderNotAvailable
    pipe = _real_pipeline(fake, settings, characters, script1, tmp_path, cap=10)
    with pytest.raises(ProviderNotAvailable):
        pipe.step_voices()
