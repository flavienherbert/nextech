"""Génération des sous-titres ASS (incrustés ensuite par FFmpeg)."""
from __future__ import annotations

import re

from .models import Character
from .timeline import Timeline

# Zone de sécurité : l'interface TikTok recouvre le bas de l'écran (≈ 20 %).
MARGIN_V = 420


def _balanced(words: list[str], n: int) -> list[str]:
    """Répartit les mots en n groupes de longueur de texte proche (jamais de groupe vide)."""
    target = len(" ".join(words)) / n
    groups: list[list[str]] = []
    cur: list[str] = []
    for i, word in enumerate(words):
        cur.append(word)
        words_left = len(words) - i - 1
        groups_left = n - len(groups) - 1
        if groups_left > 0 and words_left >= groups_left and len(" ".join(cur)) >= target:
            groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)
    return [" ".join(g) for g in groups]


def split_chunks(text: str, max_chars: int = 26) -> list[str]:
    """Découpe une réplique en segments courts et équilibrés, sans mélanger deux phrases."""
    chunks: list[str] = []
    for sentence in re.findall(r"[^.!?…]+[.!?…]*", text):
        words = sentence.split()
        if words:
            chunks += _balanced(words, max(1, -(-len(" ".join(words)) // max_chars)))
    return chunks


def _ass_time(t: float) -> str:
    t = max(t, 0.0)
    cs = int(round(t * 100))
    h, rem = divmod(cs, 360000)
    m, rem = divmod(rem, 6000)
    s, c = divmod(rem, 100)
    return f"{h}:{m:02d}:{s:02d}.{c:02d}"


def _ass_color(hex_rgb: str) -> str:
    h = hex_rgb.lstrip("#")
    if len(h) != 6:
        h = "FFFFFF"
    r, g, b = h[0:2], h[2:4], h[4:6]
    return f"&H00{b}{g}{r}".upper()


def _escape(text: str) -> str:
    return text.replace("\\", "").replace("{", "(").replace("}", ")").replace("\n", " ")


def build_ass(timeline: Timeline, characters: dict[str, Character], width: int, height: int,
              font: str = "Arial", font_size: int | None = None) -> str:
    fs = font_size or round(width * 0.068)
    margin_lr = round(width * 0.08)
    margin_v = round(height * MARGIN_V / 1920)
    styles = []
    for cid, ch in characters.items():
        styles.append(
            f"Style: {cid},{font},{fs},{_ass_color(ch.ui_color)},&H00FFFFFF,&H00000000,&H96000000,"
            f"-1,0,0,0,100,100,0,0,1,{max(3, fs // 14)},2,2,{margin_lr},{margin_lr},{margin_v},1"
        )
    header = (
        "[Script Info]\nScriptType: v4.00+\n"
        f"PlayResX: {width}\nPlayResY: {height}\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n"
        "[V4+ Styles]\n"
        "Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,"
        "Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,"
        "Alignment,MarginL,MarginR,MarginV,Encoding\n" + "\n".join(styles) + "\n\n"
        "[Events]\nFormat: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n"
    )
    events = []
    for ln in timeline.all_lines():
        chunks = split_chunks(ln.text)
        weights = [max(len(c), 1) for c in chunks]
        total_w = sum(weights)
        t = ln.start
        for chunk, w in zip(chunks, weights):
            dur = ln.duration * w / total_w
            style = ln.speaker if ln.speaker in characters else next(iter(characters))
            events.append(
                f"Dialogue: 0,{_ass_time(t)},{_ass_time(t + dur)},{style},,0,0,0,,{_escape(chunk)}"
            )
            t += dur
    return header + "\n".join(events) + "\n"
