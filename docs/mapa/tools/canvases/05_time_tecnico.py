"""Time técnico: modos mudança e auditoria de `.agents/skills/manutencao/SKILL.md` (status/unstable)."""

from ..canvaslib import GREEN, YELLOW, RED, PURPLE, CYAN, ORANGE, Canvas, _id

NAME = {"pt-BR": "05 - Time técnico", "en": "05 - Technical team"}


def _link(c, a, b, fs, ts, label=None, color=None):
    """Seta com lados escolhidos à mão (loops e desvios que cruzam a grade)."""
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
    c.group("mud", t("Modo mudança (instável)", "Change mode (unstable)"), 0, 0, 9, 1, ORANGE)
    c.group("aud", t("Modo auditoria (instável)", "Audit mode (unstable)"), 0, 2, 3, 1, ORANGE)

    c.text("mud", t("# Mudança\n`pedido.md` → `arquiteto` → `plano.md`",
                    "# Change\n`pedido.md` → `arquiteto` → `plano.md`"), 0, 0, GREEN)
    c.text("dec1", t("## Mexe em API, schema, config, dependência ou +5 arquivos?",
                     "## Touches API, schema, config, dependency or 5+ files?"), 1, 0, YELLOW)
    c.text("par", t("## Parada\nO usuário aprova o plano", "## Stop\nThe user approves the plan"), 2, 0, YELLOW)
    c.text("t1", t("## testador (reprodução)\nteste que falha; só em bug",
                   "## testador (reproduction)\na failing test; bugs only"), 3, 0, GREEN)
    c.text("dev", t("## desenvolvedor\ncódigo na camada de serviço; ruff e testes da área; `mudancas-NN.md`",
                    "## desenvolvedor\ncode in the service layer; ruff and area tests; `mudancas-NN.md`"), 4, 0, GREEN)
    c.text("t2", t("## testador (cobertura)\nsuíte inteira e cobertura; `testes-NN.md`",
                   "## testador (coverage)\nfull suite and coverage; `testes-NN.md`"), 5, 0, GREEN)
    c.text("rev", t("## revisor-de-codigo + auditor-de-seguranca\nem paralelo: `revisao-NN.md`, `seguranca-NN.md`",
                    "## revisor-de-codigo + auditor-de-seguranca\nin parallel: `revisao-NN.md`, `seguranca-NN.md`"), 6, 0, GREEN)
    c.text("dec2", t("## REVISAR?\nbloqueia, ou 3+ importante (máx. 2 rodadas)",
                     "## REVISAR?\nblocker, or 3+ important (max 2 rounds)"), 7, 0, YELLOW)
    c.text("rel", t("## Relatório\narquivos, saída do CI, vereditos. Sem commit.",
                    "## Report\nfiles, CI output, verdicts. No commit."), 8, 0, PURPLE)

    c.text("aud", t("# Auditoria\n`auditor-de-saude` → `saude.md`\n`auditor-de-seguranca` → `seguranca-01.md`",
                    "# Audit\n`auditor-de-saude` → `saude.md`\n`auditor-de-seguranca` → `seguranca-01.md`"), 0, 2, GREEN)
    c.text("lista", t("## Lista priorizada\nPARADA: o usuário escolhe os itens",
                      "## Ranked list\nSTOP: the user picks the items"), 1, 2, YELLOW)
    c.text("item", t("## Item aprovado\nvira um modo mudança, com o item como pedido",
                     "## Approved item\nbecomes a change run, with the item as the request"), 2, 2, GREEN)
    c.text("integ", t("## Pesquisa de integração e harness\n`pesquisador-de-integracoes` (não instala) · `mantenedor-do-harness`",
                      "## Integration research and harness\n`pesquisador-de-integracoes` (installs nothing) · `mantenedor-do-harness`"), 3, 2, CYAN)

    c.edge("mud", "dec1")
    c.edge("dec1", "par", t("sim", "yes"))
    c.edge("par", "t1", t("aprovado", "approved"))
    _link(c, "dec1", "t1", "bottom", "bottom", t("não", "no"))
    c.edge("t1", "dev")
    c.edge("dev", "t2")
    c.edge("t2", "rev")
    c.edge("rev", "dec2")
    c.edge("dec2", "rel", t("não", "no"))
    _link(c, "dec2", "dev", "bottom", "bottom", t("sim: volta (máx. 2)", "yes: back (max 2)"), RED)
    c.edge("aud", "lista")
    c.edge("lista", "item", t("escolhido", "chosen"))
    return c
