"""Canvas 00: visão geral. Três portas, um pipeline, integrações; harness ligado ao CLI; Omni x Turbo e branches nas bordas."""

from ..canvaslib import CYAN, GREEN, ORANGE, PURPLE, Canvas

NAME = {"pt-BR": "00 - Geral", "en": "00 - Overview"}


def build(lang: str) -> Canvas:
    c = Canvas(lang)
    c.group("g_portas", c.t("Portas de entrada", "Entry points"), 0, 0, 1, 3)
    c.group("g_harness", c.t("Harness de agentes", "Agent harness"), 1, 2, 3, 2)

    c.text("api", "# API\n`POST /api/v1/videos`\n`app/asgi.py`", 0, 0, GREEN)
    c.text("web", "# WebUI\n`webui/Main.py` (Streamlit)", 0, 1, GREEN)
    c.text("cli", "# CLI\n`cli.py` · `mpt cli`", 0, 2, GREEN)

    c.text("start", c.t("## task.start()\n`_run_pipeline` em `app/services/task.py`",
                        "## task.start()\n`_run_pipeline` in `app/services/task.py`"), 1, 1, GREEN)
    c.text("etapas", c.t("## Etapas\nroteiro → termos → voz → legenda → material → vídeo",
                         "## Stages\nscript → terms → voice → subtitles → material → video"), 2, 1)
    c.text("saida", c.t("# Saída\n`storage/tasks/<id>/`\n`final-N.mp4`",
                        "# Output\n`storage/tasks/<id>/`\n`final-N.mp4`"), 3, 1, PURPLE)
    c.text("integ", c.t("## Integrações\nLLM · TTS · legenda · bancos de vídeo · IA",
                        "## Integrations\nLLM · TTS · subtitles · stock video · AI"), 2, 0, CYAN)

    c.text("montador", c.t("## montador-mpt\nroda o `mpt cli`", "## montador-mpt\nruns `mpt cli`"), 1, 2)
    c.text("video", c.t("## Time de vídeo\n`.agents/skills/video`", "## Video team\n`.agents/skills/video`"), 2, 2)
    c.text("tec", c.t("## Time técnico\n`.agents/skills/manutencao`", "## Technical team\n`.agents/skills/manutencao`"),
           3, 2, ORANGE)
    c.text("mcp", c.t("## MCP e adaptadores\n`.mcp.json` · `.claude/` · `.grok/`",
                      "## MCP and adapters\n`.mcp.json` · `.claude/` · `.grok/`"), 2, 3, CYAN)

    c.text("omni", c.t("## Omni × Turbo\nfork em `9e7d8b7` · ver canvas 06",
                       "## Omni × Turbo\nfork at `9e7d8b7` · see canvas 06"), 0, 4)
    c.text("branches", c.t("## Branches\n`main` testada · `unstable` em laranja · ver canvas 07",
                           "## Branches\n`main` tested · `unstable` in orange · see canvas 07"), 1, 4)

    c.edge("api", "start")
    c.edge("web", "start")
    c.edge("cli", "start")
    c.edge("start", "etapas")
    c.edge("etapas", "integ", c.t("roteiro, voz, material", "script, voice, material"))
    c.edge("etapas", "saida", c.t("render", "render"))
    c.edge("montador", "cli", c.t("mpt cli", "mpt cli"))
    c.edge("video", "montador", c.t("comanda", "drives"))
    c.edge("mcp", "video", c.t("ferramentas", "tools"))
    return c
