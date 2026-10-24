"""Leitura do arte.json e desenho de texto com ffmpeg, compartilhados pelos scripts da skill."""

import json
import os
import re

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
FONTS = os.path.join(REPO, "resource", "fonts")
DEFAULT_OUTLINE = "black@0.85"
# nome, #RRGGBB ou 0xRRGGBB, com @alpha 0–1 opcional — sem ':' nem outros tokens de filtro
_COLOR_RE = re.compile(
    r"^(?:[A-Za-z]{1,32}|(?:#|0x)[0-9A-Fa-f]{6})"
    r"(?:@(?:0(?:\.\d+)?|1(?:\.0+)?|\.\d+))?$"
)

DEFAULTS = {
    "texto_na_tela": {"font": "BeVietnamPro-Bold.ttf", "color": "#FFFFFF", "size": 96,
                      "box": True, "box_color": "#000000@0.55"},
    "thumbnail": {"font": "BeVietnamPro-Bold.ttf", "color": "#FFFFFF", "accent": "#FFD400",
                  "outline": DEFAULT_OUTLINE},
}


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
        out[key] = {**DEFAULTS.get(key, {}), **val} if isinstance(val, dict) else val
    return out


def font_path(name: str) -> str:
    path = name if os.path.isabs(name) else os.path.join(FONTS, name)
    if not os.path.exists(path):
        raise SystemExit(f"fonte não encontrada: {path} (use um arquivo de resource/fonts/)")
    return path


def validate_color(value: str, *, field: str = "cor") -> str:
    """Aceita só nome, #RRGGBB ou 0xRRGGBB, com @alpha 0–1 opcional.

    Rejeita ':' e qualquer outro token que o ffmpeg interpretaria como opção
    extra no filtergraph (injeção em drawtext=...:bordercolor=...).
    """
    if not isinstance(value, str) or not _COLOR_RE.fullmatch(value):
        raise ValueError(
            f"{field} inválida: {value!r} "
            "(use um nome, #RRGGBB ou 0xRRGGBB, opcionalmente @alpha entre 0 e 1)"
        )
    return value


def _quote(value: str) -> str:
    # valor entre aspas simples dentro de um filtergraph do ffmpeg
    return "'" + value.replace("\\", "\\\\").replace("'", "'\\''") + "'"


def drawtext(text: str, textfile: str, *, font: str, color: str, size: int, x: str, y: str,
             box: bool = False, box_color: str = "#000000@0.55", border: int = 0,
             border_color: str = DEFAULT_OUTLINE) -> str:
    """Filtro drawtext lendo o texto de um arquivo (evita escapar acentos, ':' e '%')."""
    os.makedirs(os.path.dirname(textfile), exist_ok=True)
    with open(textfile, "w", encoding="utf-8") as f:
        f.write(text)
    parts = [
        f"fontfile={_quote(font_path(font))}", f"textfile={_quote(textfile)}", "expansion=none",
        f"fontcolor={color}", f"fontsize={size}", f"x={x}", f"y={y}", "line_spacing=12",
    ]
    if box:
        parts += ["box=1", f"boxcolor={box_color}", f"boxborderw={max(12, size // 4)}"]
    if border:
        parts += [f"borderw={border}", f"bordercolor={validate_color(border_color, field='contorno')}"]
    return "drawtext=" + ":".join(parts)
