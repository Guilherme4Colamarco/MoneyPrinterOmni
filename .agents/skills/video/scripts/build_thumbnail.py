"""Monta uma thumbnail a partir de um quadro do vídeo (ou de uma imagem) com texto curto.

Uso:
  python3 build_thumbnail.py <projeto> --from timeline/07.mp4 --at 1.5 --text "A IA COPIOU|A ADOBE" \\
      [--size 1280x720|1080x1920] [--out publicacao/thumb-A.png] [--preview]
  python3 build_thumbnail.py <projeto> --image raw/foto.png --text "..."

Tire o quadro de timeline/ ou raw/: o output/final.mp4 tem a legenda queimada.
"|" separa as linhas: a primeira sai na cor "color" e as seguintes na cor "accent" do bloco
"thumbnail" do arte.json (padrões em arte.py). O tamanho da fonte se ajusta à linha mais longa.
--outline-color define a cor do contorno do texto (padrão: black@0.85, ou thumbnail.outline).
--no-vignette desliga a vinheta; o padrão continua com ela ligada.
--preview junta todas as publicacao/thumb-*.png num mosaico (publicacao/thumbs_preview.png).
"""

import argparse
import glob
import os
import subprocess
import tempfile

import arte

_ALLOWED_OUT_SUFFIXES = frozenset({".png", ".jpg", ".jpeg", ".webp"})
_STDERR_TAIL = 8
_STDERR_LINE_MAX = 300


def _outline_color_arg(value: str) -> str:
    try:
        return arte.validate_color(value, field="outline")
    except ValueError as exc:
        raise argparse.ArgumentTypeError(str(exc)) from exc


def _validate_out(path: str) -> None:
    suffix = os.path.splitext(path)[1].lower()
    if suffix not in _ALLOWED_OUT_SUFFIXES:
        raise SystemExit(f"--out recusado: só .png, .jpg/.jpeg ou .webp ({path})")
    if os.path.islink(path):
        raise SystemExit(f"--out recusado: symlink ({path})")
    if os.path.isdir(path):
        raise SystemExit(f"--out recusado: pasta ({path})")


def _format_ffmpeg_stderr(stderr: bytes) -> str:
    lines = (stderr or b"").decode("utf-8", errors="replace").strip().splitlines()
    tail = [line[:_STDERR_LINE_MAX] for line in lines[-_STDERR_TAIL:]]
    return "\n".join(tail)


def _run_ffmpeg(cmd: list[str], **kwargs) -> None:
    result = subprocess.run(cmd, capture_output=True, check=False, **kwargs)
    if result.returncode == 0:
        return
    detail = _format_ffmpeg_stderr(result.stderr)
    raise SystemExit(f"ffmpeg saiu {result.returncode}" + (f":\n{detail}" if detail else ""))


def _ffmpeg_write_image(cmd: list[str], out: str, **kwargs) -> None:
    parent = os.path.dirname(out) or "."
    suffix = os.path.splitext(out)[1]
    fd, tmp = tempfile.mkstemp(prefix=".thumb-", suffix=suffix, dir=parent)
    os.close(fd)
    pending = tmp
    try:
        _run_ffmpeg([*cmd, "-update", "1", tmp], **kwargs)
        if not os.path.isfile(tmp) or os.path.getsize(tmp) <= 0:
            raise SystemExit(
                f"thumbnail não foi escrita em {out} "
                "(ffmpeg pode ter interpretado '%' no --out como padrão de sequência)"
            )
        os.replace(tmp, out)
        pending = None
    finally:
        if pending and os.path.lexists(pending):
            try:
                os.remove(pending)
            except OSError:
                pass


def build(project: str, args: argparse.Namespace) -> str:
    def resolve(path: str) -> str:
        return path if os.path.isabs(path) else os.path.join(project, path)

    out = os.path.abspath(resolve(args.out))
    _validate_out(out)

    w, h = (int(v) for v in args.size.split("x"))
    style = arte.load(project)["thumbnail"]
    lines = [line.strip() for line in args.text.split("|") if line.strip()]
    longest = max(len(line) for line in lines)
    # largura média de um caractere em fonte bold ≈ 0,64 do tamanho (com folga)
    size = int(min(h * (0.17 if w > h else 0.085), w * 0.88 / (longest * 0.64)))
    gap = int(size * 1.08)
    top = h * (0.92 if w > h else 0.72) - gap * len(lines)

    src = args.image or args.source
    outline = arte.validate_color(
        getattr(args, "outline_color", None) or style.get("outline") or arte.DEFAULT_OUTLINE,
        field="outline",
    )
    bar = arte.validate_color("black@0.35", field="drawbox")

    seek = [] if args.image else ["-ss", str(args.at)]
    chain = [
        f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}",
        "eq=contrast=1.12:saturation=1.3:brightness=-0.04",
    ]
    if not getattr(args, "no_vignette", False):
        chain.append("vignette=PI/4.5")
    chain.append(f"drawbox=x=0:y={int(top - gap * 0.4)}:w={w}:h={h}:color={bar}:t=fill")
    parent = os.path.dirname(out)
    if parent:
        os.makedirs(parent, exist_ok=True)
    # Fonte e textos entram no filtro só como f0.ttf / tN.txt; o grafo vai num
    # arquivo (-filter_script:v). Caminhos do --out ou do projeto nunca entram
    # no filtergraph — ':' ou aspas no nome não viram opção extra.
    # O ffmpeg grava num temporário na mesma pasta; só então o os.replace
    # atômico cobre o --out. Falha não apaga a thumb anterior.
    with arte.FilterAssets() as assets:
        for i, line in enumerate(lines):
            chain.append(arte.drawtext(
                line, os.path.join(project, "raw", f"_thumb_{i}.txt"),
                font=style["font"], color=style["color"] if i == 0 else style["accent"],
                size=size, x="(w-text_w)/2", y=str(int(top + gap * i)),
                border=max(4, size // 14), border_color=outline, assets=assets,
            ))
        graph = assets.write_graph(",".join(chain))
        _ffmpeg_write_image(
            ["ffmpeg", "-v", "error", "-y", *seek, "-i", os.path.abspath(resolve(src)),
             "-frames:v", "1", "-filter_script:v", graph],
            out,
            cwd=assets.dir,
        )
    return out


def preview(project: str) -> str | None:
    thumbs = sorted(glob.glob(os.path.join(project, "publicacao", "thumb-*.png")))
    if not thumbs:
        return None
    out = os.path.join(project, "publicacao", "thumbs_preview.png")
    inputs = [arg for t in thumbs for arg in ("-i", t)]
    scaled = "".join(f"[{i}]scale=-2:360[t{i}];" for i in range(len(thumbs)))
    stack = "".join(f"[t{i}]" for i in range(len(thumbs)))
    graph = scaled + (f"{stack}hstack=inputs={len(thumbs)}" if len(thumbs) > 1 else "[t0]null")
    _run_ffmpeg(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", graph, out])
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("project")
    origin = parser.add_mutually_exclusive_group(required=True)
    origin.add_argument("--from", dest="source", help="vídeo de onde tirar o quadro")
    origin.add_argument("--image", help="imagem de fundo")
    parser.add_argument("--at", type=float, default=0.0, help="segundo do quadro (com --from)")
    parser.add_argument("--text", required=True, help='linhas separadas por "|"')
    parser.add_argument("--size", default="1280x720", help="1280x720 (YouTube) ou 1080x1920 (Shorts)")
    parser.add_argument("--out", default="publicacao/thumb-A.png")
    parser.add_argument(
        "--outline-color",
        default=None,
        type=_outline_color_arg,
        help=(
            f"cor do contorno (nome do ffmpeg, #RRGGBB[AA] ou 0xRRGGBB[AA], "
            f"opcional @alpha 0–1; padrão: {arte.DEFAULT_OUTLINE} ou thumbnail.outline)"
        ),
    )
    parser.add_argument(
        "--no-vignette",
        action="store_true",
        help="desliga a vinheta (ligada por padrão)",
    )
    parser.add_argument("--preview", action="store_true")
    args = parser.parse_args()

    project = os.path.abspath(args.project)
    print("thumbnail:", build(project, args))
    if args.preview:
        print("preview:", preview(project))


if __name__ == "__main__":
    main()
