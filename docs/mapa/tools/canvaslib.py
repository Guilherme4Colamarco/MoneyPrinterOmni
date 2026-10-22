"""Biblioteca mínima para gerar arquivos .canvas (JSON Canvas 1.0) em dois idiomas.

Cada canvas é definido em `tools/canvases/<nome>.py` com `NAME` e `build(lang)`.
Os nós ficam numa grade (coluna, linha) e os ids são determinísticos (hash da chave),
então regenerar não muda o arquivo se o conteúdo não mudou.
"""

import hashlib
import json

# Cores do Obsidian: 1 vermelho, 2 laranja, 3 amarelo, 4 verde, 5 ciano, 6 roxo.
GREEN, YELLOW, RED, PURPLE, CYAN, ORANGE = "4", "3", "1", "6", "5", "2"

CELL_W, CELL_H, GAP_X, GAP_Y = 320, 140, 80, 60


def _id(key: str) -> str:
    return hashlib.md5(key.encode("utf-8")).hexdigest()[:16]


class Canvas:
    def __init__(self, lang: str):
        self.lang = lang
        self.nodes, self.edges, self._pos = [], [], {}

    def t(self, pt: str, en: str) -> str:
        """Escolhe o texto pelo idioma do canvas em construção."""
        return pt if self.lang == "pt-BR" else en

    def _xy(self, col, row):
        return int(col * (CELL_W + GAP_X)), int(row * (CELL_H + GAP_Y))

    def text(self, key, text, col, row, color=None, w=1, h=1):
        """Nó de texto (Markdown). `w`/`h` são múltiplos de célula."""
        x, y = self._xy(col, row)
        node = {
            "id": _id(key), "type": "text", "text": text, "x": x, "y": y,
            "width": int(w * CELL_W + (w - 1) * GAP_X), "height": int(h * CELL_H + (h - 1) * GAP_Y),
        }
        if color:
            node["color"] = color
        self.nodes.append(node)
        self._pos[key] = (col + (w - 1) / 2, row + (h - 1) / 2)
        return key

    def file(self, key, path, col, row, color=None):
        """Nó que embute uma nota do vault (caminho relativo à raiz do vault do idioma)."""
        x, y = self._xy(col, row)
        node = {"id": _id(key), "type": "file", "file": path, "x": x, "y": y,
                "width": CELL_W, "height": CELL_H}
        if color:
            node["color"] = color
        self.nodes.append(node)
        self._pos[key] = (col, row)
        return key

    def group(self, key, label, col, row, cols, rows, color=None):
        """Moldura visual; deve ser criada antes dos nós que ficam dentro dela."""
        x, y = self._xy(col, row)
        node = {
            "id": _id(key), "type": "group", "label": label, "x": x - 30, "y": y - 50,
            "width": int(cols * CELL_W + (cols - 1) * GAP_X + 60),
            "height": int(rows * CELL_H + (rows - 1) * GAP_Y + 80),
        }
        if color:
            node["color"] = color
        self.nodes.append(node)

    def edge(self, a, b, label=None, color=None):
        """Seta de `a` para `b`; os lados saem da posição relativa dos nós."""
        (ax, ay), (bx, by) = self._pos[a], self._pos[b]
        if abs(bx - ax) >= abs(by - ay):
            fs, ts = ("right", "left") if bx >= ax else ("left", "right")
        else:
            fs, ts = ("bottom", "top") if by >= ay else ("top", "bottom")
        edge = {"id": _id(f"{a}->{b}:{label}"), "fromNode": _id(a), "fromSide": fs,
                "toNode": _id(b), "toSide": ts, "toEnd": "arrow"}
        if label:
            edge["label"] = label
        if color:
            edge["color"] = color
        self.edges.append(edge)

    def dump(self) -> str:
        return json.dumps({"nodes": self.nodes, "edges": self.edges}, ensure_ascii=False, indent=2) + "\n"
