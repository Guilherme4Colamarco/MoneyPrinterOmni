"""Leitura do arte.json e desenho de texto com ffmpeg, compartilhados pelos scripts da skill."""

import json
import os
import re
import shutil
import tempfile

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
FONTS = os.path.join(REPO, "resource", "fonts")
DEFAULT_OUTLINE = "black@0.85"

# Nomes de https://ffmpeg.org/ffmpeg-utils.html#Color (e `ffmpeg -colors`), case-insensitive.
# Sem "random": não é cor fixa e não está na tabela documentada.
FFMPEG_COLOR_NAMES = (
    "AliceBlue", "AntiqueWhite", "Aqua", "Aquamarine", "Azure", "Beige", "Bisque",
    "Black", "BlanchedAlmond", "Blue", "BlueViolet", "Brown", "BurlyWood", "CadetBlue",
    "Chartreuse", "Chocolate", "Coral", "CornflowerBlue", "Cornsilk", "Crimson", "Cyan",
    "DarkBlue", "DarkCyan", "DarkGoldenRod", "DarkGray", "DarkGreen", "DarkKhaki",
    "DarkMagenta", "DarkOliveGreen", "Darkorange", "DarkOrchid", "DarkRed", "DarkSalmon",
    "DarkSeaGreen", "DarkSlateBlue", "DarkSlateGray", "DarkTurquoise", "DarkViolet",
    "DeepPink", "DeepSkyBlue", "DimGray", "DodgerBlue", "FireBrick", "FloralWhite",
    "ForestGreen", "Fuchsia", "Gainsboro", "GhostWhite", "Gold", "GoldenRod", "Gray",
    "Green", "GreenYellow", "HoneyDew", "HotPink", "IndianRed", "Indigo", "Ivory",
    "Khaki", "Lavender", "LavenderBlush", "LawnGreen", "LemonChiffon", "LightBlue",
    "LightCoral", "LightCyan", "LightGoldenRodYellow", "LightGreen", "LightGrey",
    "LightPink", "LightSalmon", "LightSeaGreen", "LightSkyBlue", "LightSlateGray",
    "LightSteelBlue", "LightYellow", "Lime", "LimeGreen", "Linen", "Magenta", "Maroon",
    "MediumAquaMarine", "MediumBlue", "MediumOrchid", "MediumPurple", "MediumSeaGreen",
    "MediumSlateBlue", "MediumSpringGreen", "MediumTurquoise", "MediumVioletRed",
    "MidnightBlue", "MintCream", "MistyRose", "Moccasin", "NavajoWhite", "Navy",
    "OldLace", "Olive", "OliveDrab", "Orange", "OrangeRed", "Orchid", "PaleGoldenRod",
    "PaleGreen", "PaleTurquoise", "PaleVioletRed", "PapayaWhip", "PeachPuff", "Peru",
    "Pink", "Plum", "PowderBlue", "Purple", "Red", "RosyBrown", "RoyalBlue",
    "SaddleBrown", "Salmon", "SandyBrown", "SeaGreen", "SeaShell", "Sienna", "Silver",
    "SkyBlue", "SlateBlue", "SlateGray", "Snow", "SpringGreen", "SteelBlue", "Tan",
    "Teal", "Thistle", "Tomato", "Turquoise", "Violet", "Wheat", "White", "WhiteSmoke",
    "Yellow", "YellowGreen",
)
_FFMPEG_COLOR_LOOKUP = {name.lower() for name in FFMPEG_COLOR_NAMES}
_COLOR_KEYS = ("color", "accent", "outline", "box_color")
_HEX_RE = re.compile(r"^(?:#|0x)[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$")
_ALPHA_RE = re.compile(r"^(?:0(?:\.\d+)?|1(?:\.0+)?|\.\d+)$")
_COLOR_HELP = (
    "use um nome do ffmpeg (ffmpeg -colors), #RRGGBB, #RRGGBBAA, 0xRRGGBB ou "
    "0xRRGGBBAA, opcionalmente @alpha entre 0 e 1"
)

DEFAULTS = {
    "texto_na_tela": {"font": "BeVietnamPro-Bold.ttf", "color": "#FFFFFF", "size": 96,
                      "box": True, "box_color": "#000000@0.55"},
    "thumbnail": {"font": "BeVietnamPro-Bold.ttf", "color": "#FFFFFF", "accent": "#FFD400",
                  "outline": DEFAULT_OUTLINE},
}


def validate_color(value: str, *, field: str = "cor") -> str:
    """Aceita só nomes oficiais do ffmpeg e hex #/0x RRGGBB[AA], com @alpha 0–1.

    Rejeita ':' e qualquer outro token que o ffmpeg interpretaria como opção
    extra no filtergraph (injeção em drawtext=...:fontcolor=...).
    """
    if not isinstance(value, str) or not value:
        raise ValueError(f"{field} inválida: {value!r} ({_COLOR_HELP})")
    body, sep, alpha = value.partition("@")
    if sep and not _ALPHA_RE.fullmatch(alpha):
        raise ValueError(f"{field} inválida: {value!r} ({_COLOR_HELP})")
    if _HEX_RE.fullmatch(body) or body.lower() in _FFMPEG_COLOR_LOOKUP:
        return value
    raise ValueError(f"{field} inválida: {value!r} ({_COLOR_HELP})")


def _validate_section_colors(section: dict, prefix: str) -> dict:
    out = dict(section)
    for key in _COLOR_KEYS:
        if key in out:
            out[key] = validate_color(out[key], field=f"{prefix}.{key}" if prefix else key)
    return out


def load(project: str | None) -> dict:
    """arte.json do projeto mesclado sobre os padrões (seção por seção)."""
    data = {}
    path = os.path.join(project, "arte.json") if project else ""
    if path and os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    # seções que não são objetos (ex.: listas "textos") passam sem mesclar
    out = {}
    for key in {*DEFAULTS, *data}:
        val = data.get(key, {})
        merged = {**DEFAULTS.get(key, {}), **val} if isinstance(val, dict) else val
        if isinstance(merged, dict):
            merged = _validate_section_colors(merged, key)
        out[key] = merged
    return out


def font_path(name: str) -> str:
    path = name if os.path.isabs(name) else os.path.join(FONTS, name)
    if not os.path.exists(path):
        raise SystemExit(f"fonte não encontrada: {path} (use um arquivo de resource/fonts/)")
    return path


_SAFE_NAME = re.compile(r"^[A-Za-z0-9._-]+$")


class FilterAssets:
    """Fonte e textos com nomes seguros; o filtergraph só cita esses nomes (cwd = dir)."""

    def __init__(self) -> None:
        self.dir = tempfile.mkdtemp(prefix="mpt-arte-")
        self._fonts: dict[str, str] = {}
        self._n = 0

    def font(self, name: str) -> str:
        src = font_path(name)
        if src not in self._fonts:
            ext = os.path.splitext(src)[1] or ".ttf"
            if not _SAFE_NAME.fullmatch(ext):
                ext = ".ttf"
            dest = f"f{len(self._fonts)}{ext}"
            shutil.copy2(src, os.path.join(self.dir, dest))
            self._fonts[src] = dest
        return self._fonts[src]

    def text(self, content: str) -> str:
        self._n += 1
        dest = f"t{self._n}.txt"
        with open(os.path.join(self.dir, dest), "w", encoding="utf-8") as f:
            f.write(content)
        return dest

    def write_graph(self, graph: str) -> str:
        dest = "graph.txt"
        with open(os.path.join(self.dir, dest), "w", encoding="utf-8") as f:
            f.write(graph)
        return dest

    def close(self) -> None:
        shutil.rmtree(self.dir, ignore_errors=True)

    def __enter__(self) -> "FilterAssets":
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()


def _quote(value: str) -> str:
    # valor entre aspas simples dentro de um filtergraph do ffmpeg
    return "'" + value.replace("\\", "\\\\").replace("'", "'\\''") + "'"


def drawtext(text: str, textfile: str, *, font: str, color: str, size: int, x: str, y: str,
             box: bool = False, box_color: str = "#000000@0.55", border: int = 0,
             border_color: str = DEFAULT_OUTLINE, assets: FilterAssets | None = None) -> str:
    """Filtro drawtext lendo o texto de um arquivo (evita escapar acentos, ':' e '%').

    Com `assets`, fontfile/textfile no filtro são só nomes seguros (f0.ttf, t1.txt);
    o ffmpeg deve rodar com cwd=assets.dir. Sem `assets`, mantém o comportamento
    antigo (caminho no filtro) para callers que ainda não migraram.
    """
    parent = os.path.dirname(textfile)
    if parent:
        os.makedirs(parent, exist_ok=True)
    with open(textfile, "w", encoding="utf-8") as f:
        f.write(text)
    if assets is not None:
        font_ref = assets.font(font)
        text_ref = assets.text(text)
    else:
        font_ref = _quote(font_path(font))
        text_ref = _quote(textfile)
    color = validate_color(color, field="color")
    parts = [
        f"fontfile={font_ref}", f"textfile={text_ref}", "expansion=none",
        f"fontcolor={color}", f"fontsize={size}", f"x={x}", f"y={y}", "line_spacing=12",
    ]
    if box:
        box_color = validate_color(box_color, field="box_color")
        parts += ["box=1", f"boxcolor={box_color}", f"boxborderw={max(12, size // 4)}"]
    if border:
        border_color = validate_color(border_color, field="border_color")
        parts += [f"borderw={border}", f"bordercolor={border_color}"]
    return "drawtext=" + ":".join(parts)
