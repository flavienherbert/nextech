#!/usr/bin/env python3
"""Assemble une publicité verticale 1080x1920 à partir de plans vidéo ou fixes,
de voix off, d'une musique et d'un fichier de montage JSON.

Usage : python3 build_ad.py montage.json sortie.mp4

Segments (dans l'ordre) :
  {"type": "clip", "src": "a.mp4", "start": 0, "duration": 3.6,   # durée prise dans la source
   "speed": 1.0,            # > 1 ralentit (1.5 = 50 % plus long)
   "audio": 1.0,            # volume du son d'origine, 0 pour le couper
   "vo": "vo1.wav", "vo_delay": 0.15,
   "caption_y": 1310, "captions": [[debut, fin, "TEXTE", accent], ...],
   "chip": "Zéro fuite", "badge": "19 €", "cta": "Lien ↓", "cta_at": 1.0, "cta_y": 1500}
  {"type": "still", "src": "b.jpg", "duration": 3.8, "zoom": [1.0, 1.08], "focus": [0.5, 0.5], ...}
Champs globaux : "label" (mention IA), "music": {"src": "m.wav", "volume": 0.25}.
Les temps des sous-titres sont relatifs au début de la voix du segment.
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
Style: Cap,Inter ExtraBold,84,{WHITE},{WHITE},&H00000000,&H80000000,0,0,0,0,100,100,-1,0,1,7,3,5,60,60,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    for start, end, text, accent, y in events:
        colour = ACCENT if accent else WHITE
        tag = (f"{{\\an5\\pos({W // 2},{y})\\c{colour}\\fscx82\\fscy82"
               f"\\t(0,90,\\fscx100\\fscy100)}}")
        lines.append(f"Dialogue: 0,{ass_time(start)},{ass_time(end)},Cap,,0,0,0,,{tag}{text}")
    open(path, "w", encoding="utf-8").write(head + "\n".join(lines) + "\n")


def main():
    spec_path, out = sys.argv[1], sys.argv[2]
    spec = json.load(open(spec_path, encoding="utf-8"))
    base = os.path.dirname(os.path.abspath(spec_path))
    tmp = tempfile.mkdtemp(prefix="ad_")
    p = lambda f: f if os.path.isabs(f) else os.path.join(base, f)
    fit = (f"scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}")

    segs, events, overlays, audio = [], [], [], []
    t = 0.0
    for i, s in enumerate(spec["segments"]):
        seg = os.path.join(tmp, f"seg{i}.mp4")
        if s["type"] == "clip":
            start, src_d, speed = s.get("start", 0), s["duration"], s.get("speed", 1.0)
            d = round(src_d * speed * FPS) / FPS
            run(["ffmpeg", "-y", "-v", "error", "-ss", f"{start}", "-t", f"{src_d}", "-i", p(s["src"]),
                 "-an", "-vf", f"setpts={speed}*PTS,{fit},unsharp=5:5:0.5:5:5:0.0,fps={FPS},format=yuv420p",
                 "-t", f"{d}", "-c:v", "libx264", "-crf", "15", "-preset", "medium", seg])
            vol = s.get("audio", 1.0)
            if vol > 0:
                audio.append({"src": p(s["src"]), "at": t, "ss": start, "dur": src_d,
                              "tempo": 1 / speed, "vol": vol, "norm": speed == 1.0 and "vo" not in s})
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
                 "-c:v", "libx264", "-crf", "15", "-preset", "medium", seg])
        off = 0.0
        if s.get("vo"):
            off = s.get("vo_delay", 0.15)
            audio.append({"src": p(s["vo"]), "at": t + off, "vol": 1.0, "norm": True})
        cy = s.get("caption_y", 1310)
        for a, b, text, *acc in s.get("captions", []):
            events.append((t + off + a, t + off + b, text, bool(acc and acc[0]), cy))
        if s.get("chip"):
            png = os.path.join(tmp, f"chip{i}.png")
            w, h = pill(s["chip"], png)
            overlays.append((png, t + 0.15, t + d - 0.1, (W - w) // 2, s.get("chip_y", 300)))
        if s.get("badge"):
            png = os.path.join(tmp, f"badge{i}.png")
            w, h = pill(s["badge"], png, size=s.get("badge_size", 110), fg=(255, 255, 255), bg=(226, 73, 27, 255),
                        pad=(56, 30), weight="ExtraBold")
            overlays.append((png, t + 0.15, t + d, s.get("badge_x", (W - w) // 2), s.get("badge_y", 280)))
        if s.get("cta"):
            png = os.path.join(tmp, f"cta{i}.png")
            w, h = pill(s["cta"], png, size=54, fg=(255, 255, 255), bg=(23, 20, 15, 255))
            overlays.append((png, t + s.get("cta_at", 2.0), t + d, (W - w) // 2, s.get("cta_y", 1500)))
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
    for a in audio:
        cmd += ["-i", a["src"]]
    music = spec.get("music")
    if music:
        cmd += ["-stream_loop", "-1", "-i", p(music["src"])]
    fc, last = [], "0:v"
    for k, (png, a, b, x, y) in enumerate(overlays, start=1):
        fc.append(f"[{k}:v]format=rgba,fade=t=in:st={a:.2f}:d=0.18:alpha=1[o{k}]")
        fc.append(f"[{last}][o{k}]overlay={x}:{y}:enable='between(t,{a:.2f},{b:.2f})'[v{k}]")
        last = f"v{k}"
    fc.append(f"[{last}]ass='{ass}':fontsdir='{FONT_DIR}'[vout]")
    a0 = 1 + len(overlays)
    labels = []
    for k, a in enumerate(audio):
        chain = []
        if "ss" in a:
            chain.append(f"atrim={a['ss']}:{a['ss'] + a['dur']},asetpts=PTS-STARTPTS")
            if a["tempo"] != 1:
                chain.append(f"atempo={a['tempo']:.4f}")
        chain.append("aresample=48000,aformat=channel_layouts=stereo")
        if a["norm"]:
            chain.append("loudnorm=I=-16:TP=-1.5:LRA=11")
        chain.append(f"volume={a['vol']},adelay={int(a['at'] * 1000)}:all=1")
        fc.append(f"[{a0 + k}:a]{','.join(chain)}[a{k}]")
        labels.append(f"[a{k}]")
    fc.append(f"{''.join(labels)}amix=inputs={len(labels)}:normalize=0:duration=longest,"
              f"apad,atrim=0:{total}[voice]")
    if music:
        mi = a0 + len(audio)
        fc.append(f"[{mi}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:{total},"
                  f"loudnorm=I=-16:TP=-2:LRA=7,volume={music.get('volume', 0.2)},"
                  f"afade=t=in:d=0.3,afade=t=out:st={total - 0.8:.2f}:d=0.8[mus]")
        fc.append("[voice][mus]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.89[aout]")
    else:
        fc.append("[voice]alimiter=limit=0.89[aout]")
    cmd += ["-filter_complex", ";".join(fc), "-map", "[vout]", "-map", "[aout]", "-t", f"{total}",
            "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out]
    run(cmd)
    print(f"OK {out} — {total:.2f} s")


if __name__ == "__main__":
    main()
