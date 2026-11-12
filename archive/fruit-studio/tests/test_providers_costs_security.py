import logging

import pytest

from studio.costs import CostGuard, CostLedger, estimate_script_cost, load_pricing
from studio.errors import BudgetNotApproved, ProviderError, ProviderNotAvailable
from studio.logging_setup import SecretRedactor
from studio.models import VoiceSpec
from studio.providers.base import ImageRequest, VideoRequest, VoiceRequest, pick_supported_duration
from studio.providers.placeholder import (PlaceholderImageProvider, PlaceholderVideoProvider,
                                          PlaceholderVoiceProvider)
from studio.providers.registry import build_providers

from conftest import pytestmark_ffmpeg

needs_ffmpeg = pytestmark_ffmpeg


@needs_ffmpeg
def test_placeholder_image_has_expected_size(settings, tmp_path):
    prov = PlaceholderImageProvider(ffprobe=settings.ffprobe, ffmpeg=settings.ffmpeg)
    req = ImageRequest("a prompt", 270, 480, "Test", characters=[{"name": "Citron", "ui_color": "#FFE14D"}])
    res = prov.generate_image(req, tmp_path / "a.png")
    assert (res.info.width, res.info.height) == (270, 480) and res.cost_usd == 0 and res.info.size > 0


@needs_ffmpeg
def test_placeholder_video_has_requested_duration(settings, tmp_path):
    img = PlaceholderImageProvider(ffprobe=settings.ffprobe, ffmpeg=settings.ffmpeg)
    i = img.generate_image(ImageRequest("p", 270, 480, "T"), tmp_path / "a.png")
    vid = PlaceholderVideoProvider(ffprobe=settings.ffprobe, ffmpeg=settings.ffmpeg)
    res = vid.generate_clip(VideoRequest(i.path, "slow push-in", 2.0, 270, 480, 30, "T"), tmp_path / "c.mp4")
    assert res.info.duration == pytest.approx(2.0, abs=0.1) and (res.info.width, res.info.height) == (270, 480)


@needs_ffmpeg
def test_two_characters_get_distinct_offline_voices(settings, characters, tmp_path):
    vp = PlaceholderVoiceProvider(ffprobe=settings.ffprobe, ffmpeg=settings.ffmpeg, engine="babble")
    a = vp.synthesize(VoiceRequest("Bonjour le tribunal", "neutre", characters["citron"].voice, "a"), tmp_path / "a.wav")
    b = vp.synthesize(VoiceRequest("Bonjour le tribunal", "neutre", characters["pasteque"].voice, "b"), tmp_path / "b.wav")
    assert a.engine == b.engine == "babble"
    assert (tmp_path / "a.wav").read_bytes() != (tmp_path / "b.wav").read_bytes()
    assert characters["citron"].voice.babble_f0 != characters["pasteque"].voice.babble_f0


@needs_ffmpeg
def test_failed_edge_tts_never_leaves_an_empty_file_and_falls_back(settings, tmp_path, monkeypatch):
    vp = PlaceholderVoiceProvider(ffprobe=settings.ffprobe, ffmpeg=settings.ffmpeg, engine="auto")

    def boom(self, req, out):
        out.write_bytes(b"")  # reproduit le fichier de 0 octet laissé par edge-tts hors-ligne
        raise OSError("réseau coupé")

    monkeypatch.setattr(PlaceholderVoiceProvider, "_edge", boom)
    res = vp.synthesize(VoiceRequest("Bonjour", "neutre", VoiceSpec(edge="fr-FR-HenriNeural"), "x"), tmp_path / "x.wav")
    assert res.engine == "babble" and res.info.size > 0
    assert not list(tmp_path.glob("*.mp3"))


@needs_ffmpeg
def test_forced_edge_failure_is_an_error_not_a_fake_success(settings, tmp_path, monkeypatch):
    vp = PlaceholderVoiceProvider(ffprobe=settings.ffprobe, ffmpeg=settings.ffmpeg, engine="edge")
    monkeypatch.setattr(PlaceholderVoiceProvider, "_edge", lambda self, req, out: (_ for _ in ()).throw(OSError("KO")))
    with pytest.raises(ProviderError):
        vp.synthesize(VoiceRequest("Bonjour", "neutre", VoiceSpec(edge="fr-FR-HenriNeural"), "x"), tmp_path / "x.wav")


def test_real_providers_are_refused_at_jalon_1(settings):
    with pytest.raises(ProviderNotAvailable):
        build_providers(settings, dry_run=False)


def test_cost_guard_blocks_unapproved_paid_calls(tmp_path):
    ledger = CostLedger(tmp_path / "c.jsonl")
    guard = CostGuard(ledger, approved_usd=0.0)
    guard.check("placeholder", paid=False, estimated_usd=0.0)  # gratuit : toujours OK
    with pytest.raises(BudgetNotApproved):
        guard.check("fal", paid=True, estimated_usd=0.35)


def test_cost_guard_counts_what_is_already_spent(tmp_path):
    ledger = CostLedger(tmp_path / "c.jsonl")
    guard = CostGuard(ledger, approved_usd=1.0)
    guard.check("fal", True, 0.35)
    ledger.add("fal", "video", 0.35, "plan 1")
    ledger.add("fal", "video", 0.35, "plan 2")
    assert ledger.total_usd() == pytest.approx(0.70)
    with pytest.raises(BudgetNotApproved):
        guard.check("fal", True, 0.35)


def test_pick_supported_duration_rule():
    assert pick_supported_duration([5, 10], 4.0) == 5
    assert pick_supported_duration([5, 10], 5.9) == 5    # 5 s + 0,9 s de gel : toléré
    assert pick_supported_duration([5, 10], 6.5) == 10
    assert pick_supported_duration([5, 10], 12.0) == 10  # plus long que le max : on prend le max
    assert pick_supported_duration([], 3.3) == 3.3


def test_estimate_without_durations_is_the_optimistic_floor(settings, script):
    pricing = load_pricing(settings.pricing_file)
    est = estimate_script_cost(script, pricing, "v1-kling", characters_without_ref=2)
    shots = len(script.shots())
    assert est["image_usd"] == pytest.approx(0.04 * (shots + 2))
    assert est["video_usd"] == pytest.approx(0.35 * shots)  # 5 s × 0,07 $, un clip par plan
    assert est["verified"] is False


def test_estimate_with_real_durations_costs_more_on_kling_than_runway(settings, script):
    pricing = load_pricing(settings.pricing_file)
    wanted = [7.85, 7.28, 6.02, 8.9, 5.05, 7.55, 4.38, 9.13]
    kling = estimate_script_cost(script, pricing, "v1-kling", 2, wanted)
    runway = estimate_script_cost(script, pricing, "v1-runway", 2, wanted)
    # 6 plans passent à 10 s (5 s + 1 s de gel ne suffit pas), 2 plans restent à 5 s : 70 s × 0,07 = 4,90 $
    assert kling["video_usd"] == pytest.approx(0.07 * (6 * 10 + 2 * 5))
    assert runway["video_usd"] < kling["video_usd"]


def test_log_redactor_masks_secret_values(monkeypatch):
    monkeypatch.setenv("FAL_KEY", "sk-super-secret-12345")
    rec = logging.LogRecord("x", logging.INFO, __file__, 1, "appel avec %s", ("sk-super-secret-12345",), None)
    assert SecretRedactor().filter(rec)
    assert "sk-super-secret-12345" not in rec.getMessage() and "***" in rec.getMessage()
