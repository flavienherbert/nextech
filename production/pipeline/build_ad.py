#!/usr/bin/env python3
"""Assemble une publicité verticale 1080x1920 à partir d'un clip présentateur,
de plans produit fixes, de voix off et d'un fichier de montage JSON.

Usage : python3 build_ad.py montage.json sortie.mp4

Le JSON décrit les segments dans l'ordre :
  {"type": "clip",  "src": "hook.mp4", "captions": [[debut, fin, "TEXTE", accent], ...]}
  {"type": "still", "src": "b1.jpg", "vo": "vo1.wav", "duration": 3.8,
   "zoom": [1.0, 1.08], "focus": [0.5, 0.5], "chip": "Zéro fuite",
   "captions": [...]}   # temps relatifs au début du segment
Champs globaux : "label" (mention IA), "badge" (prix), "cta".
Dépendances : ffmpeg (libass), Pillow, police Inter.
"""
import json, subprocess, sys, os, tempfile
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1080, 1920, 30
FONT_DIR = "/usr/share/fonts/opentype/inter"
ACCENT = "&H003FD2FF"  # jaune (format ASS BGR)
WHITE = "&H00FFFFFF"


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit("ffmpeg a échoué :\n" + r.stderr[-3000:])


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", path], capture_output=True, text=True).stdout
    return float(out.strip())


def pill(text, path, size=58, fg=(23, 20, 15), bg=(255, 255, 255, 240), pad=(40, 22), weight="Bold"):
    font = ImageFont.truetype(f"{FONT_DIR}/Inter-{weight}.otf", size)
    box = font.getbbox(text)
    w, h = box[2] - box[0] + 2 * pad[0], size + 2 * pad[1]
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=h // 2, fill=bg)
    d.text((pad[0] - box[0], h / 2), text, font=font, fill=fg, anchor="lm")
    img.save(path)
    return w, h


def ass_time(t):
    h, m = int(t // 3600), int(t % 3600 // 60)
    return f"{h}:{m:02d}:{t % 60:05.2f}"


def write_ass(events, path):
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Inter ExtraBold,88,{WHITE},{WHITE},&H00000000,&H80000000,0,0,0,0,100,100,-1,0,1,7,3,5,60,60,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    for start, end, text, accent in events:
        colour = ACCENT if accent else WHITE
        # apparition « pop » : 82 % -> 100 % en 90 ms
        tag = (f"{{\\an5\\pos({W // 2},1310)\\c{colour}\\fscx82\\fscy82"
               f"\\t(0,90,\\fscx100\\fscy100)}}")
        lines.append(f"Dialogue: 0,{ass_time(start)},{ass_time(end)},Cap,,0,0,0,,{tag}{text}")
    open(path, "w", encoding="utf-8").write(head + "\n".join(lines) + "\n")


def main():
    spec_path, out = sys.argv[1], sys.argv[2]
    spec = json.load(open(spec_path, encoding="utf-8"))
    base = os.path.dirname(os.path.abspath(spec_path))
    tmp = tempfile.mkdtemp(prefix="ad_")
    p = lambda f: f if os.path.isabs(f) else os.path.join(base, f)

    segs, events, overlays, audio = [], [], [], []
    t = 0.0
    for i, s in enumerate(spec["segments"]):
        seg = os.path.join(tmp, f"seg{i}.mp4")
        if s["type"] == "clip":
            d = s.get("duration") or duration(p(s["src"]))
            run(["ffmpeg", "-y", "-v", "error", "-i", p(s["src"]), "-t", f"{d}", "-an", "-vf",
                 f"scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H},"
                 f"unsharp=5:5:0.7:5:5:0.0,fps={FPS},format=yuv420p",
                 "-c:v", "libx264", "-crf", "16", "-preset", "medium", seg])
            audio.append((p(s["src"]), t, d))
        else:
            d = s["duration"]
            z0, z1 = s.get("zoom", [1.0, 1.08])
            fx, fy = s.get("focus", [0.5, 0.5])
            n = int(round(d * FPS))
            z = f"{z0}+({z1}-{z0})*on/{n}"
            run(["ffmpeg", "-y", "-v", "error", "-i", p(s["src"]), "-vf",
                 f"scale={W * 2}:{H * 2}:force_original_aspect_ratio=increase:flags=lanczos,"
                 f"crop={W * 2}:{H * 2},"
                 f"zoompan=z='{z}':x='(iw-iw/zoom)*{fx}':y='(ih-ih/zoom)*{fy}':d={n}:s={W}x{H}:fps={FPS},"
                 f"format=yuv420p", "-frames:v", str(n),
                 "-c:v", "libx264", "-crf", "16", "-preset", "medium", seg])
            if s.get("vo"):
                audio.append((p(s["vo"]), t + s.get("vo_delay", 0.15), None))
        for a, b, text, *acc in s.get("captions", []):
            off = s.get("vo_delay", 0.15) if s["type"] == "still" else 0
            events.append((t + off + a, t + off + b, text, bool(acc and acc[0])))
        if s.get("chip"):
            png = os.path.join(tmp, f"chip{i}.png")
            w, h = pill(s["chip"], png)
            overlays.append((png, t + 0.15, t + d - 0.1, (W - w) // 2, 300))
        if s.get("badge"):
            png = os.path.join(tmp, f"badge{i}.png")
            w, h = pill(s["badge"], png, size=120, fg=(255, 255, 255), bg=(226, 73, 27, 255),
                        pad=(60, 34), weight="ExtraBold")
            overlays.append((png, t + 0.15, t + d, (W - w) // 2, 280))
        if s.get("cta"):
            png = os.path.join(tmp, f"cta{i}.png")
            w, h = pill(s["cta"], png, size=54, fg=(255, 255, 255), bg=(23, 20, 15, 245))
            overlays.append((png, t + s.get("cta_at", 2.0), t + d, (W - w) // 2, 1500))
        segs.append(seg)
        t += d
    total = t

    if spec.get("label"):
        png = os.path.join(tmp, "label.png")
        pill(spec["label"], png, size=30, fg=(255, 255, 255), bg=(0, 0, 0, 120), pad=(22, 12),
             weight="SemiBold")
        overlays.append((png, 0, total, 48, 170))

    lst = os.path.join(tmp, "list.txt")
    open(lst, "w").write("".join(f"file '{s}'\n" for s in segs))
    ass = os.path.join(tmp, "caps.ass")
    write_ass(events, ass)

    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst]
    for png, *_ in overlays:
        cmd += ["-loop", "1", "-t", f"{total}", "-i", png]
    for src, *_ in audio:
        cmd += ["-i", src]
    fc, last = [], "0:v"
    for k, (png, a, b, x, y) in enumerate(overlays, start=1):
        fc.append(f"[{k}:v]format=rgba,fade=t=in:st={a:.2f}:d=0.18:alpha=1[o{k}]")
        fc.append(f"[{last}][o{k}]overlay={x}:{y}:enable='between(t,{a:.2f},{b:.2f})'[v{k}]")
        last = f"v{k}"
    fc.append(f"[{last}]ass='{ass}':fontsdir='{FONT_DIR}'[vout]")
    a0 = 1 + len(overlays)
    labels = []
    for k, (src, at, dur) in enumerate(audio):
        trim = f"atrim=0:{dur}," if dur else ""
        fc.append(f"[{a0 + k}:a]{trim}aresample=48000,aformat=channel_layouts=stereo,"
                  f"loudnorm=I=-16:TP=-1.5:LRA=11,adelay={int(at * 1000)}:all=1[a{k}]")
        labels.append(f"[a{k}]")
    fc.append(f"{''.join(labels)}amix=inputs={len(labels)}:normalize=0:duration=longest,"
              f"apad,atrim=0:{total},alimiter=limit=0.89[aout]")
    cmd += ["-filter_complex", ";".join(fc), "-map", "[vout]", "-map", "[aout]", "-t", f"{total}",
            "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out]
    run(cmd)
    print(f"OK {out} — {total:.2f} s")


if __name__ == "__main__":
    main()
