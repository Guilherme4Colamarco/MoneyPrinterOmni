"""Time de vídeo: as etapas 0–12 de `.agents/skills/video/SKILL.md` em fluxo, com os 12 papéis."""

from ..canvaslib import GREEN, YELLOW, RED, PURPLE, CYAN, Canvas, _id

NAME = {"pt-BR": "04 - Time de vídeo", "en": "04 - Video team"}


def _link(c, a, b, fs, ts, label=None, color=None):
    """Seta com lados escolhidos à mão (usada nos loops de revisão, que cruzam a grade)."""
    edge = {"id": _id(f"{a}->{b}:{label}"), "fromNode": _id(a), "fromSide": fs,
            "toNode": _id(b), "toSide": ts, "toEnd": "arrow"}
    if label:
        edge["label"] = label
    if color:
        edge["color"] = color
    c.edges.append(edge)


def build(lang: str) -> Canvas:
    c = Canvas(lang)
    t = c.t
    # grupos antes dos nós (ficam atrás)
    c.group("g1", t("Pesquisa e crítica (0–3)", "Research and critique (0–3)"), 0, 0, 4, 1)
    c.group("g2", t("Arte, aprovação e tempo (4–6)", "Art, approval and timing (4–6)"), 4, 0, 3, 1)
    c.group("g3", t("Clipes, render e revisão (7–10)", "Clips, render and review (7–10)"), 2, 2, 5, 1)
    c.group("g4", t("Publicação e entrega (11–12)", "Publishing and delivery (11–12)"), 0, 2, 2, 1)

    c.text("brief", t("# 0 · Pedido e brief\n`brief.md`: perfil, tema, duração, formato, idioma\n*orquestrador*",
                      "# 0 · Request and brief\n`brief.md`: profile, topic, length, format, language\n*orchestrator*"), 0, 0, GREEN)
    c.text("pesq", t("## 1 · pesquisador\n`research.md`, `sources.json`, `script.txt`, `music-plan.md`",
                     "## 1 · pesquisador\n`research.md`, `sources.json`, `script.txt`, `music-plan.md`"), 1, 0, GREEN)
    c.text("rev", t("## 2 · revisão em paralelo\n`critico` → `critique/content-NN.md`\n`sugestor-de-pauta` → `critique/ideas-NN.md`\n`auditor` (fatos) → `audit/fatos-NN.md`",
                    "## 2 · parallel review\n`critico` → `critique/content-NN.md`\n`sugestor-de-pauta` → `critique/ideas-NN.md`\n`auditor` (facts) → `audit/fatos-NN.md`"), 2, 0, GREEN)
    c.text("dec1", t("## 3 · reprova ou sugere?\n`REVISAR`, `CORRIGIR` ou sugestão de alto ganho",
                     "## 3 · rejected or new ideas?\n`REVISAR`, `CORRIGIR` or a high-value suggestion"), 3, 0, YELLOW)
    c.text("arte", t("## 4 · diretor-de-arte\n`arte.md`, `arte.json`: legenda, textos, thumbnail",
                     "## 4 · diretor-de-arte\n`arte.md`, `arte.json`: subtitles, on-screen text, thumbnail"), 4, 0, GREEN)
    c.text("par", t("## 5 · diretor (aprovação)\n`aprovacao-NN.md`\n**PARADA:** só segue com o aval do usuário",
                    "## 5 · diretor (approval)\n`aprovacao-NN.md`\n**STOP:** continues only with the user's approval"), 5, 0, YELLOW)
    c.text("tempo", t("## 6 · montador-mpt (tempo)\n`--stop-at audio` e `subtitle`, `timing.json`, `music.json`, `bgm.mp3`",
                      "## 6 · montador-mpt (timing)\n`--stop-at audio` and `subtitle`, `timing.json`, `music.json`, `bgm.mp3`"), 6, 0, CYAN)

    c.text("clip", t("## 7 · cacador-de-clipes\n`shotlist.json`, `raw/`\n7b · `animador`: `raw/anim_NN.mp4`",
                     "## 7 · cacador-de-clipes\n`shotlist.json`, `raw/`\n7b · `animador`: `raw/anim_NN.mp4`"), 6, 2, GREEN)
    c.text("edit", t("## 8 · editor-de-clipes\n`build_timeline.py` → `timeline/NN.mp4`, `credits.md`",
                     "## 8 · editor-de-clipes\n`build_timeline.py` → `timeline/NN.mp4`, `credits.md`"), 5, 2, GREEN)
    c.text("render", t("## 9 · montador-mpt (render)\n`output/final.mp4`",
                       "## 9 · montador-mpt (render)\n`output/final.mp4`"), 4, 2, CYAN)
    c.text("vis", t("## 10 · revisão final\n`critico` → `critique/visual-NN.md`\n`auditor` (direitos) → `audit/direitos-NN.md`",
                    "## 10 · final review\n`critico` → `critique/visual-NN.md`\n`auditor` (rights) → `audit/direitos-NN.md`"), 3, 2, GREEN)
    c.text("dec2", t("## Reprova?\n`REVISAR` ou `CORRIGIR`", "## Rejected?\n`REVISAR` or `CORRIGIR`"), 2, 2, YELLOW)
    c.text("pub", t("## 11 · designer e redator\n`publicacao/thumb-*.png`, `publicacao.md`",
                    "## 11 · designer and writer\n`publicacao/thumb-*.png`, `publicacao.md`"), 1, 2, GREEN)
    c.text("ent", t("## 12 · diretor (entrega)\n`entrega.md`: `PRONTO` ou `REFAZER <etapa>`\n## 13 · relatório\nNada é publicado.",
                    "## 12 · diretor (delivery)\n`entrega.md`: `PRONTO` or `REFAZER <etapa>`\n## 13 · report\nNothing is published."), 0, 2, PURPLE)

    c.edge("brief", "pesq")
    c.edge("pesq", "rev")
    c.edge("rev", "dec1")
    c.edge("dec1", "arte", t("não", "no"))
    c.edge("arte", "par")
    c.edge("par", "tempo", t("aprovado", "approved"))
    c.edge("tempo", "clip")
    c.edge("clip", "edit")
    c.edge("edit", "render")
    c.edge("render", "vis")
    c.edge("vis", "dec2")
    c.edge("dec2", "pub", t("não", "no"))
    c.edge("pub", "ent")
    # loops de revisão (no máximo 2 rodadas cada)
    _link(c, "dec1", "pesq", "bottom", "bottom", t("sim: revisa (máx. 2)", "yes: revise (max 2)"), RED)
    _link(c, "dec2", "edit", "top", "bottom", t("sim: refaz cenas (máx. 2)", "yes: redo scenes (max 2)"), RED)
    return c
