"""Canvas 02: as três portas de entrada, o que cada uma faz antes de start() e o caminho até o pipeline."""

from ..canvaslib import GREEN, PURPLE, RED, YELLOW, Canvas

NAME = {"pt-BR": "02 - Portas de entrada", "en": "02 - Entry points"}


def build(lang: str) -> Canvas:
    c = Canvas(lang)
    c.group("g_antes", c.t("Antes de start()", "Before start()"), 0, 0, 3, 3)

    c.text("api", c.t("# API\n`POST /api/v1/videos`", "# API\n`POST /api/v1/videos`"), 0, 0, GREEN)
    c.text("api_valida", c.t("## Valida\nesquema, cores, fonte, `x-api-key`", "## Validates\nschema, colours, font, `x-api-key`"), 1, 0, YELLOW)
    c.text("api_fila", c.t("# Fila\n`add_task`; cheia: 429", "# Queue\n`add_task`; full: 429"), 2, 0)

    c.text("web", c.t("# WebUI\nbotão Gerar", "# WebUI\nGenerate button"), 0, 1, GREEN)
    c.text("web_fila", c.t("# Fila da WebUI\n1 tarefa por vez; pega `runtime_config_lock`", "# WebUI queue\n1 task at a time; takes `runtime_config_lock`"), 2, 1)

    c.text("cli", c.t("# CLI\n`cli.py --video-script ...`", "# CLI\n`cli.py --video-script ...`"), 0, 2, GREEN)
    c.text("cli_valida", c.t("## Valida\nargparse, materiais copiados", "## Validates\nargparse, materials copied"), 1, 2, YELLOW)
    c.text("cli_direto", c.t("# Sem fila\nchamada síncrona, caminho absoluto aceito", "# No queue\nsynchronous call, absolute path accepted"), 2, 2)

    c.text("start", c.t("# task.start()\n`_run_pipeline`", "# task.start()\n`_run_pipeline`"), 3, 1)
    c.text("saida", c.t("# Arquivos\n`storage/tasks/<id>/`", "# Files\n`storage/tasks/<id>/`"), 4, 1, PURPLE)
    c.text("recusa", c.t("# Recusa\nAPI: 400, 401, 429 · CLI: saída 2", "# Refused\nAPI: 400, 401, 429 · CLI: exit 2"), 1, 3, RED)

    c.edge("api", "api_valida")
    c.edge("api_valida", "api_fila", c.t("sim", "yes"), GREEN)
    c.edge("api_valida", "recusa", c.t("não", "no"), RED)
    c.edge("api_fila", "start")
    c.edge("web", "web_fila", c.t("trava + fila", "lock + queue"))
    c.edge("web_fila", "start")
    c.edge("cli", "cli_valida")
    c.edge("cli_valida", "cli_direto", c.t("sim", "yes"), GREEN)
    c.edge("cli_valida", "recusa", c.t("não", "no"), RED)
    c.edge("cli_direto", "start")
    c.edge("start", "saida")
    return c
