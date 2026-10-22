"""Gera docs/mapa/site/data.js a partir dos vaults (.md e .canvas): o site lê só esse arquivo.

Uso (da raiz do repositório): python3 -m docs.mapa.tools.build_site
A saída é determinística: rodar duas vezes sem mudar os vaults dá o mesmo arquivo.
"""

import json
import re
from pathlib import Path

from .manifest import CANVASES, INDEX, LANGS, NOTES, SECTION_TITLES, SECTIONS, canvas_path, note_path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "site"
FRONT = re.compile(r"^---\n(.*?)\n---\n", re.S)


def _list(value: str) -> list[str]:
    value = value.strip()
    if value.startswith("[") and value.endswith("]"):
        value = value[1:-1]
    return [v.strip().strip("'\"") for v in value.split(",") if v.strip()]


def parse_note(text: str) -> tuple[dict, str]:
    """Separa o frontmatter (campos simples e listas em linha) do corpo."""
    m = FRONT.match(text)
    meta: dict = {}
    body = text
    if m:
        body = text[m.end():]
        for line in m.group(1).splitlines():
            if ":" in line and not line.startswith((" ", "-")):
                key, value = line.split(":", 1)
                meta[key.strip()] = value.split("  #")[0].strip()
    tags = _list(meta.get("tags", ""))
    status = "unstable" if "status/unstable" in tags else "stable"
    return {
        "tags": [t for t in tags if not t.startswith("status/")],
        "status": status,
        "sources": _list(meta.get("sources", "")),
    }, body.strip() + "\n"


def build() -> dict:
    data: dict = {"langs": {}}
    for lang in LANGS:
        base = ROOT / lang
        notes, canvases = [], []
        for nid, section, pt, en in NOTES:
            name = pt if lang == "pt-BR" else en
            path = base / note_path(lang, section, name)
            if not path.exists():
                continue
            meta, body = parse_note(path.read_text(encoding="utf-8"))
            notes.append({"id": nid, "section": section, "title": name, **meta, "body": body})
        for cid, pt, en in CANVASES:
            name = pt if lang == "pt-BR" else en
            path = base / canvas_path(lang, name)
            if path.exists():
                canvases.append({"id": cid, "title": name, "data": json.loads(path.read_text(encoding="utf-8"))})
        index_path = base / f"{INDEX[lang]}.md"
        index_body = parse_note(index_path.read_text(encoding="utf-8"))[1] if index_path.exists() else ""
        data["langs"][lang] = {
            "sections": SECTION_TITLES[lang],
            "folders": SECTIONS[lang],
            "index": {"title": INDEX[lang], "body": index_body},
            "notes": notes,
            "canvases": canvases,
        }
    return data


def main() -> int:
    data = build()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for lang, payload in data["langs"].items():
        path = OUT_DIR / f"data.{lang}.js"
        path.write_text("window.MAPA_LANG = " + json.dumps({"lang": lang, **payload}, ensure_ascii=False) + ";\n", encoding="utf-8")
    total = {lang: (len(v["notes"]), len(v["canvases"])) for lang, v in data["langs"].items()}
    print(f"site/data.<idioma>.js: {total}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
