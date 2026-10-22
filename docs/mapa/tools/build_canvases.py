"""Gera os .canvas dos dois vaults (pt-BR e en) a partir de tools/canvases/*.py.

Uso (da raiz do repositório): python3 -m docs.mapa.tools.build_canvases
"""

import importlib
import pkgutil
from pathlib import Path

from . import canvases

ROOT = Path(__file__).resolve().parent.parent
OUT = {"pt-BR": ROOT / "pt-BR" / "03-Canvas", "en": ROOT / "en" / "03-Canvas"}


def main() -> int:
    count = 0
    for info in sorted(pkgutil.iter_modules(canvases.__path__), key=lambda i: i.name):
        if info.name.startswith("99_"):
            continue
        mod = importlib.import_module(f"{canvases.__name__}.{info.name}")
        for lang, folder in OUT.items():
            folder.mkdir(parents=True, exist_ok=True)
            path = folder / f"{mod.NAME[lang]}.canvas"
            path.write_text(mod.build(lang).dump(), encoding="utf-8")
            count += 1
    print(f"{count} canvas gerados")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
