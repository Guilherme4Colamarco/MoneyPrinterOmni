"""Confere os vaults da apostila: arquivos do manifesto, links, canvas e paridade pt-BR/en.

Uso (da raiz do repositório): python3 -m docs.mapa.tools.check_vault
Sai com código 1 se achar qualquer problema.
"""

import json
import re
import sys
from pathlib import Path

from .manifest import CANVASES, INDEX, LANGS, NOTES, canvas_path, note_path

ROOT = Path(__file__).resolve().parent.parent
WIKILINK = re.compile(r"!?\[\[([^\]]+)\]\]")
FRONT = re.compile(r"^---\n(.*?)\n---\n", re.S)


def frontmatter(text: str) -> dict:
    m = FRONT.match(text)
    out = {}
    if not m:
        return out
    for line in m.group(1).splitlines():
        if ":" in line and not line.startswith(" "):
            k, v = line.split(":", 1)
            out[k.strip()] = v.split("#")[0].strip()
    return out


def check_lang(lang: str, errors: list[str]) -> dict:
    base = ROOT / lang
    names = {INDEX[lang]}
    canvases = {name for _, pt, en in CANVASES for name in [pt if lang == "pt-BR" else en]}
    stats = {"notes": 0, "words": 0}
    for nid, section, pt, en in NOTES:
        name = pt if lang == "pt-BR" else en
        names.add(name)
    index_file = base / f"{INDEX[lang]}.md"
    index_text = index_file.read_text(encoding="utf-8") if index_file.exists() else ""
    if not index_text:
        errors.append(f"{lang}: falta {INDEX[lang]}.md")
    for nid, section, pt, en in NOTES:
        name = pt if lang == "pt-BR" else en
        path = base / note_path(lang, section, name)
        if not path.exists():
            errors.append(f"{lang}: falta {path.relative_to(ROOT)} ({nid})")
            continue
        text = path.read_text(encoding="utf-8")
        stats["notes"] += 1
        stats["words"] += len(text.split())
        fm = frontmatter(text)
        if fm.get("title") != name:
            errors.append(f"{lang}/{name}: title do frontmatter ({fm.get('title')!r}) != nome do arquivo")
        if fm.get("lang") != lang:
            errors.append(f"{lang}/{name}: lang do frontmatter ({fm.get('lang')!r}) != {lang}")
        if not re.search(r"status/(stable|unstable)", text.split("\n---\n", 1)[0]):
            errors.append(f"{lang}/{name}: falta tag status/stable ou status/unstable")
        if f"[[{INDEX[lang]}" not in text:
            errors.append(f"{lang}/{name}: sem link de volta para o índice")
        if section != "ref" and "Gabarito" not in text and "Answer" not in text:
            errors.append(f"{lang}/{name}: sem seção Prática com gabarito")
        if f"[[{name}]]" not in index_text and f"[[{name}|" not in index_text:
            errors.append(f"{lang}/{name}: não aparece no índice")
        for target in WIKILINK.findall(text):
            t = target.split("|")[0].split("#")[0].strip()
            if t and t not in names and t not in canvases and not t.endswith(".canvas"):
                errors.append(f"{lang}/{name}: wikilink quebrado [[{target}]]")
            if t.endswith(".canvas") and t[: -len(".canvas")] not in canvases:
                errors.append(f"{lang}/{name}: canvas inexistente [[{target}]]")
    for target in WIKILINK.findall(index_text):
        t = target.split("|")[0].split("#")[0].strip()
        if t and t not in names and t.removesuffix(".canvas") not in canvases:
            errors.append(f"{lang}/índice: wikilink quebrado [[{target}]]")
    return stats


def check_canvas(errors: list[str]) -> None:
    counts = {}
    for cid, pt, en in CANVASES:
        for lang, name in (("pt-BR", pt), ("en", en)):
            path = ROOT / lang / canvas_path(lang, name)
            if not path.exists():
                errors.append(f"{lang}: falta canvas {path.relative_to(ROOT)}")
                continue
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError as exc:
                errors.append(f"{lang}/{name}.canvas: JSON inválido ({exc})")
                continue
            ids = [n["id"] for n in data.get("nodes", [])] + [e["id"] for e in data.get("edges", [])]
            if len(ids) != len(set(ids)):
                errors.append(f"{lang}/{name}.canvas: ids duplicados")
            node_ids = {n["id"] for n in data.get("nodes", [])}
            for e in data.get("edges", []):
                if e["fromNode"] not in node_ids or e["toNode"] not in node_ids:
                    errors.append(f"{lang}/{name}.canvas: aresta aponta para nó inexistente")
            for n in data.get("nodes", []):
                if n["type"] == "file" and not (ROOT / lang / n["file"]).exists():
                    errors.append(f"{lang}/{name}.canvas: nó file aponta para {n['file']} que não existe")
            counts.setdefault(cid, {})[lang] = (len(data.get("nodes", [])), len(data.get("edges", [])))
    for cid, by_lang in counts.items():
        if len(set(by_lang.values())) > 1:
            errors.append(f"canvas {cid}: pt-BR e en diferem em nós/arestas: {by_lang}")


def main() -> int:
    errors: list[str] = []
    stats = {lang: check_lang(lang, errors) for lang in LANGS}
    check_canvas(errors)
    for lang, s in stats.items():
        print(f"{lang}: {s['notes']} notas, {s['words']} palavras")
    if errors:
        print(f"\n{len(errors)} problema(s):")
        for e in errors:
            print(" -", e)
        return 1
    print("vault ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
