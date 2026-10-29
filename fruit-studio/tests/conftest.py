import shutil
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from studio.config import load_settings  # noqa: E402
from studio.models import load_characters, load_script  # noqa: E402

pytestmark_ffmpeg = pytest.mark.skipif(
    not (shutil.which("ffmpeg") and shutil.which("ffprobe")), reason="ffmpeg/ffprobe absents du PATH"
)


@pytest.fixture(scope="session")
def settings():
    return load_settings(ROOT).with_size(270, 480)  # petit format : tests rapides


@pytest.fixture(scope="session")
def characters(settings):
    return load_characters(settings.characters_dir)


@pytest.fixture()
def script(settings):
    return load_script(settings.root / "examples" / "sample_script.json")
