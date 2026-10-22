"""Exemplo mínimo de definição de canvas; copie e adapte (arquivos que começam com `99_` são ignorados)."""

from ..canvaslib import GREEN, YELLOW, RED, PURPLE, Canvas

NAME = {"pt-BR": "99 - Exemplo", "en": "99 - Example"}


def build(lang: str) -> Canvas:
    c = Canvas(lang)
    c.text("inicio", c.t("# Início\nPedido chega", "# Start\nRequest arrives"), 0, 0, GREEN)
    c.text("decisao", c.t("## Chave válida?\n`x-api-key`", "## Valid key?\n`x-api-key`"), 1, 0, YELLOW)
    c.text("ok", c.t("# Processa", "# Process"), 2, 0, PURPLE)
    c.text("erro", c.t("# 401", "# 401"), 2, 1, RED)
    c.edge("inicio", "decisao")
    c.edge("decisao", "ok", c.t("sim", "yes"))
    c.edge("decisao", "erro", c.t("não", "no"))
    return c
