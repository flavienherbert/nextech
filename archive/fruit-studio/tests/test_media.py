import wave

import pytest

from studio.errors import MediaVerificationError
from studio.media import probe, verify_media

from conftest import pytestmark_ffmpeg

pytestmark = pytestmark_ffmpeg


def _wav(path, seconds=0.5):
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(8000)
        wf.writeframes(b"\x00\x00" * int(8000 * seconds))


def test_missing_file_is_rejected(settings, tmp_path):
    with pytest.raises(MediaVerificationError, match="absent"):
        verify_media(settings.ffprobe, tmp_path / "nope.mp4", "video")


def test_empty_file_is_rejected(settings, tmp_path):
    f = tmp_path / "vide.mp3"
    f.write_bytes(b"")
    with pytest.raises(MediaVerificationError, match="vide"):
        verify_media(settings.ffprobe, f, "audio")


def test_garbage_file_is_rejected(settings, tmp_path):
    f = tmp_path / "faux.mp4"
    f.write_bytes(b"ceci n'est pas une video" * 100)
    with pytest.raises(MediaVerificationError):
        verify_media(settings.ffprobe, f, "video")


def test_valid_audio_passes_and_duration_is_read(settings, tmp_path):
    f = tmp_path / "ok.wav"
    _wav(f, 0.5)
    info = verify_media(settings.ffprobe, f, "audio", expect_duration=0.5)
    assert info.has_audio and not info.has_video and info.size > 0
    assert probe(settings.ffprobe, f).duration == pytest.approx(0.5, abs=0.05)


def test_audio_file_is_not_a_video(settings, tmp_path):
    f = tmp_path / "ok.wav"
    _wav(f)
    with pytest.raises(MediaVerificationError, match="vidéo"):
        verify_media(settings.ffprobe, f, "video")


def test_wrong_duration_is_rejected(settings, tmp_path):
    f = tmp_path / "ok.wav"
    _wav(f, 0.5)
    with pytest.raises(MediaVerificationError, match="attendu"):
        verify_media(settings.ffprobe, f, "audio", expect_duration=3.0)
