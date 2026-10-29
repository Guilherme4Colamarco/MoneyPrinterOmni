"""
Monta a timeline completa (timeline/01.mp4 .. 13.mp4), gera as legendas dinâmicas ASS
com palavras-chave acendendo em amarelo-bico (#F9BD3C), compõe o vídeo final
(output/final.mp4) com a narração VoiceStudio + SFX + BGM (audio_master.mp3)
e renderiza a thumbnail vertical 1080x1920 (output/thumbnail.png).

Execução:
  python3 scripts/assemble_nuvem_final.py resource/projects/o-que-e-a-nuvem
"""

import json
import os
import re
import shutil
import subprocess
import sys

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FONT_BOLD = os.path.join(REPO, "resource", "fonts", "BeVietnamPro-Bold.ttf")

SCENE_PLAN = [
    {"n": 1, "take": "take_pinguim_curioso.mp4", "top_text": "SOBE PRO\nCÉU?", "keywords": ["nuvem,", "nuvem", "céu?"]},
    {"n": 2, "take": "take_nuvem_servidor_geral.mp4", "top_text": "FICA NO\nCHÃO!", "keywords": ["Não", "mesmo!", "chão."]},
    {"n": 3, "take": "take_cpu_memoria.mp4", "top_text": "SUA\nMOCHILA", "keywords": ["memória", "mochila"]},
    {"n": 4, "take": "take_pacote_dados.mp4", "top_text": "MEMÓRIA\nCHEIA", "keywords": ["cheia", "pesada."]},
    {"n": 5, "take": "take_nuvem_servidor_geral.mp4", "top_text": "ARMÁRIO\nGIGANTE", "keywords": ["armário", "gigante"]},
    {"n": 6, "take": "take_servidor_blades_close.mp4", "top_text": "DATA\nCENTER", "keywords": ["data", "centers,", "servidores."]},
    {"n": 7, "take": "take_pacote_dados.mp4", "top_text": "CABOS NO\nMAR", "keywords": ["cabos", "luz", "mar!"]},
    {"n": 8, "take": "take_nuvem_servidor_geral.mp4", "top_text": "VEM EM\nPACOTES", "keywords": ["servidor", "pedacinho."]},
    {"n": 9, "take": "take_terminal_linux.mp4", "top_text": "SERVIDOR\nLINUX!", "keywords": ["comanda", "Linux!"]},
    {"n": 10, "take": "take_servidor_blades_close.mp4", "top_text": "OUTRO\nCOMPUTADOR", "keywords": ["atenção:", "computador"]},
    {"n": 11, "take": "take_pinguim_curioso.mp4", "top_text": "PEÇA A UM\nADULTO", "keywords": ["ajuda", "adulto"]},
    {"n": 12, "take": "take_pinguim_curioso.mp4", "top_text": "DESAFIO\nEM CASA!", "keywords": ["desafio", "desplugado"]},
    {"n": 13, "take": "take_pacote_dados.mp4", "top_text": "GUARDAR\nEM CASA", "keywords": ["três", "fotos", "pendrive."]},
]


def fmt_ass_time(seconds: float) -> str:
    cs = int(round(max(0.0, seconds) * 100))
    h = cs // 360_000
    cs %= 360_000
    m = cs // 6_000
    cs %= 6_000
    s = cs // 100
    cs %= 100
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def wrap_two_lines(words: list[str], max_chars: int = 28) -> str:
    """Quebra a frase em até 2 linhas equilibradas antes de aplicar tags ASS."""
    full = " ".join(words)
    if len(full) <= max_chars:
        return full
    mid = len(full) // 2
    best_idx = 1
    best_dist = 999
    acc = 0
    for i, w in enumerate(words[:-1], 1):
        acc += len(w) + (1 if i > 1 else 0)
        if abs(acc - mid) < best_dist:
            best_dist = abs(acc - mid)
            best_idx = i
    return " ".join(words[:best_idx]) + r"\N" + " ".join(words[best_idx:])


def format_ass_highlighted(text: str, keywords: list[str]) -> str:
    """Destaca as palavras-chave em amarelo-bico (#F9BD3C -> BGR &H3CBDF9&) no ASS."""
    words = text.split()
    wrapped = wrap_two_lines(words, max_chars=27)
    kw_set = {k.lower().strip(".,!?") for k in keywords}

    def repl_word(token: str) -> str:
        clean = re.sub(r"[^\wÀ-ÿ]", "", token).lower()
        if clean in kw_set:
            return r"{\c&H003CBDF9&\fscx108\fscy108}" + token + r"{\c&H00FFFFFF&\fscx100\fscy100}"
        return token

    lines = wrapped.split(r"\N")
    out_lines = []
    for ln in lines:
        out_lines.append(" ".join(repl_word(w) for w in ln.split()))
    return r"{\fad(80,80)}" + r"\N".join(out_lines)


def write_styled_ass(project: str, segs: list[dict]) -> str:
    ass_path = os.path.join(project, "subtitles_styled.ass")
    header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: InfortuxSub,Be Vietnam Pro,60,&H00FFFFFF,&H003CBDF9,&H00300A1D,&H99300A1D,-1,0,0,0,100,100,0,0,1,5,2,2,60,60,340,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(header)
        for seg, plan in zip(segs, SCENE_PLAN):
            st = fmt_ass_time(seg["start"])
            et = fmt_ass_time(seg["end"])
            styled_txt = format_ass_highlighted(seg["text"], plan["keywords"])
            f.write(f"Dialogue: 0,{st},{et},InfortuxSub,,0,0,0,,{styled_txt}\n")
    return ass_path


def build_timeline_clips(project: str, segs: list[dict]) -> list[str]:
    tl_dir = os.path.join(project, "timeline")
    raw_dir = os.path.join(project, "raw")
    os.makedirs(tl_dir, exist_ok=True)

    shotlist = []
    clip_paths = []

    for seg, plan in zip(segs, SCENE_PLAN):
        idx = seg["n"]
        dur = float(seg["dur"])
        src_mp4 = os.path.join(raw_dir, plan["take"])
        out_mp4 = os.path.join(tl_dir, f"{idx:02d}.mp4")
        txt_file = os.path.join(raw_dir, f"top_text_{idx:02d}.txt")
        with open(txt_file, "w", encoding="utf-8") as tf:
            tf.write(plan["top_text"])

        shotlist.append({
            "n": idx,
            "dur": dur,
            "kind": "fill",
            "file": f"raw/{plan['take']}",
            "text": plan["top_text"],
            "text_pos": "top",
        })

        # Usa stream_loop -1 no take 3D de 3s para cobrir a duração exata da frase + drawtext de topo
        vf = (
            f"scale=1080:1920,setsar=1,fps=30,"
            f"drawtext=fontfile='{FONT_BOLD}':textfile='{txt_file}':expansion=none:"
            f"fontcolor=#F9BD3C:fontsize=82:line_spacing=14:"
            f"x=(w-text_w)/2:y=190:"
            f"box=1:boxcolor=#1D0A30@0.76:boxborderw=22:"
            f"borderw=4:bordercolor=#1D0A30"
        )
        subprocess.run(
            [
                "ffmpeg", "-y", "-v", "error",
                "-stream_loop", "-1",
                "-i", src_mp4,
                "-t", f"{dur:.3f}",
                "-an",
                "-vf", vf,
                "-c:v", "libx264", "-crf", "19", "-preset", "fast", "-pix_fmt", "yuv420p",
                out_mp4,
            ],
            check=True,
        )
        clip_paths.append(out_mp4)
        print(f"  [+] Clipe {idx:02d}.mp4 ({dur:.2f}s) gerado com On-Screen Text")

    with open(os.path.join(project, "shotlist.json"), "w", encoding="utf-8") as f:
        json.dump(shotlist, f, ensure_ascii=False, indent=2)

    # Gera grade raw/timeline_preview.png (13 quadros do meio de cada cena)
    thumbs = []
    for idx, (cp, seg) in enumerate(zip(clip_paths, segs), 1):
        t_mid = max(0.1, float(seg["dur"]) * 0.5)
        th = os.path.join(raw_dir, f"thumb_{idx:02d}.png")
        subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-ss", f"{t_mid:.2f}", "-i", cp, "-frames:v", "1", "-vf", "scale=270:480", th],
            check=True,
        )
        thumbs.append(th)

    # Monta mosaico 5x3 com ffmpeg xstack/tile
    concat_inputs = []
    for th in thumbs:
        concat_inputs += ["-i", th]
    n_th = len(thumbs)
    filter_tile = "".join(f"[{i}:v]" for i in range(n_th)) + f"concat=n={n_th}:v=1:a=0,tile=5x3:padding=8:margin=8:color=#1D0636"
    preview_png = os.path.join(raw_dir, "timeline_preview.png")
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", *concat_inputs, "-filter_complex", filter_tile, "-frames:v", "1", preview_png],
        check=True,
    )
    print(f"  [+] Grade de prévia salva: {preview_png}")
    return clip_paths


def build_thumbnail_9x16(project: str) -> str:
    out_dir = os.path.join(project, "output")
    os.makedirs(out_dir, exist_ok=True)
    thumb_out = os.path.join(out_dir, "thumbnail.png")

    src_take = os.path.join(project, "raw", "take_nuvem_servidor_geral.mp4")
    t1 = os.path.join(project, "raw", "thumb_line1.txt")
    t2 = os.path.join(project, "raw", "thumb_line2.txt")
    t3 = os.path.join(project, "raw", "thumb_brand.txt")
    with open(t1, "w", encoding="utf-8") as f:
        f.write("A NUVEM FICA")
    with open(t2, "w", encoding="utf-8") as f:
        f.write("NO CHÃO?")
    with open(t3, "w", encoding="utf-8") as f:
        f.write("INFORTUX")

    vf = (
        f"scale=1080:1920,setsar=1,"
        f"drawtext=fontfile='{FONT_BOLD}':textfile='{t3}':expansion=none:"
        f"fontcolor=#F35A20:fontsize=54:x=(w-text_w)/2:y=150:borderw=4:bordercolor=#1D0A30,"
        f"drawtext=fontfile='{FONT_BOLD}':textfile='{t1}':expansion=none:"
        f"fontcolor=#FFFFFF:fontsize=108:x=(w-text_w)/2:y=260:borderw=8:bordercolor=#1D0A30,"
        f"drawtext=fontfile='{FONT_BOLD}':textfile='{t2}':expansion=none:"
        f"fontcolor=#F9BD3C:fontsize=132:x=(w-text_w)/2:y=395:borderw=9:bordercolor=#1D0A30"
    )
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-ss", "0.8", "-i", src_take, "-frames:v", "1", "-vf", vf, thumb_out],
        check=True,
    )
    shutil.copy2(thumb_out, os.path.join(project, "thumbnail.png"))
    print(f"  [+] Thumbnail 9:16 salva: {thumb_out}")
    return thumb_out


def main() -> None:
    project = os.path.abspath(sys.argv[1])
    with open(os.path.join(project, "timing.json"), encoding="utf-8") as f:
        segs = json.load(f)

    clip_paths = build_timeline_clips(project, segs)
    ass_path = write_styled_ass(project, segs)

    concat_txt = os.path.join(project, "raw", "concat_list.txt")
    with open(concat_txt, "w", encoding="utf-8") as f:
        for cp in clip_paths:
            f.write(f"file '{cp}'\n")

    concat_mp4 = os.path.join(project, "raw", "video_concat.mp4")
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", concat_txt, "-c", "copy", concat_mp4],
        check=True,
    )

    out_dir = os.path.join(project, "output")
    os.makedirs(out_dir, exist_ok=True)
    final_mp4 = os.path.join(out_dir, "final.mp4")
    audio_master = os.path.join(project, "audio_master.mp3")
    fonts_dir = os.path.join(REPO, "resource", "fonts")

    subprocess.run(
        [
            "ffmpeg", "-y", "-v", "error",
            "-i", concat_mp4,
            "-i", audio_master,
            "-vf", f"ass='{ass_path}':fontsdir='{fonts_dir}'",
            "-c:v", "libx264", "-crf", "18", "-preset", "fast", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k",
            "-shortest",
            final_mp4,
        ],
        check=True,
    )
    print(f"[Assemble] Vídeo final renderizado: {final_mp4}")
    build_thumbnail_9x16(project)


if __name__ == "__main__":
    main()
