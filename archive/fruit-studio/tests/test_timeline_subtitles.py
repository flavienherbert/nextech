import re

import pytest

from studio.subtitles import build_ass, split_chunks
from studio.timeline import TimelineConfig, build_timeline


def _durations(script, d=2.0):
    return {(sh.id, i): d for _, sh in script.shots() for i in range(len(sh.lines))}


def test_timeline_is_contiguous_and_consistent(script):
    cfg = TimelineConfig()
    tl = build_timeline(script, _durations(script), cfg)
    assert len(tl.shots) == len(script.shots())
    for a, b in zip(tl.shots, tl.shots[1:]):
        assert b.start == pytest.approx(a.start + a.duration, abs=1e-3)
    assert tl.total == pytest.approx(sum(s.duration for s in tl.shots), abs=1e-2)
    # un xfade démarre exactement quand le plan suivant doit commencer
    for off, nxt in zip(tl.xfade_offsets(), tl.shots[1:]):
        assert off == pytest.approx(nxt.start, abs=1e-3)
    assert tl.video_length(0) == pytest.approx(tl.shots[0].duration + cfg.transition)
    assert tl.video_length(len(tl.shots) - 1) == pytest.approx(tl.shots[-1].duration)


def test_lines_do_not_overlap_and_stay_in_their_shot(script):
    tl = build_timeline(script, _durations(script, 1.7))
    for sh in tl.shots:
        for ln in sh.lines:
            assert sh.start <= ln.start and ln.start + ln.duration <= sh.start + sh.duration + 1e-6
        for a, b in zip(sh.lines, sh.lines[1:]):
            assert b.start >= a.start + a.duration


def test_min_shot_duration(script):
    tl = build_timeline(script, _durations(script, 0.1), TimelineConfig(min_shot=2.5))
    assert all(s.duration >= 2.5 for s in tl.shots)


def test_split_chunks_balanced_and_complete():
    text = "Je n'ai jamais touché à cette corbeille de fruits !"
    chunks = split_chunks(text)
    assert " ".join(chunks) == text
    assert all(len(c) <= 30 for c in chunks)
    assert min(len(c) for c in chunks) >= 8  # pas d'orphelin du type « fruits ! »


def test_split_chunks_never_mixes_sentences():
    for c in split_chunks("Silence, Citron. Le tribunal vous attend."):
        assert not re.search(r"[.!?]\s+\S", c)


def test_ass_has_one_style_per_character_and_ordered_events(script, characters):
    tl = build_timeline(script, _durations(script), TimelineConfig())
    ass = build_ass(tl, characters, 1080, 1920)
    assert "PlayResX: 1080" in ass and "PlayResY: 1920" in ass
    for cid in ("citron", "pasteque"):
        assert f"Style: {cid}," in ass
    events = [l for l in ass.splitlines() if l.startswith("Dialogue:")]
    assert len(events) >= len(tl.all_lines())

    def secs(t):
        h, m, s = t.split(":")
        return int(h) * 3600 + int(m) * 60 + float(s)

    starts = [secs(l.split(",")[1]) for l in events]
    assert starts == sorted(starts)
    assert all(secs(l.split(",")[2]) > secs(l.split(",")[1]) for l in events)
    # les deux personnages ont des couleurs de sous-titres différentes
    assert "&H004DE1FF" in ass and "&H008AFF7C" in ass
