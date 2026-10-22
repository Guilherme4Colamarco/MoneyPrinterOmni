"""Canvas 06: linha do tempo Turbo (upstream) x Omni, do fork ao merge v1.3.9, com a decisão em aberto."""

from ..canvaslib import CYAN, GREEN, ORANGE, YELLOW, Canvas

NAME = {"pt-BR": "06 - Omni e Turbo", "en": "06 - Omni and Turbo"}


def build(lang: str) -> Canvas:
    c = Canvas(lang)
    c.text("upstream", c.t("## Turbo (upstream)\nreleases em `harry0703/MoneyPrinterTurbo`",
                           "## Turbo (upstream)\nreleases at `harry0703/MoneyPrinterTurbo`"), 1, 1, CYAN)
    c.text("fork", c.t("# Fork\n`9e7d8b7` · fix(task) #1663\n17/10/2026",
                       "# Fork\n`9e7d8b7` · fix(task) #1663\n2026-10-17"), 0, 0, GREEN)
    c.text("rebrand", c.t("## Rebrand\n`a6c685c` · 67 arquivos\n`app/paths.py` mantém a pasta antiga",
                          "## Rebrand\n`a6c685c` · 67 files\n`app/paths.py` keeps the old folder"), 1, 0)
    c.text("harness", c.t("## Harness e Remotion\n`.agents/` · `.claude/` · `.grok/` · `animations/` · `flake.nix`",
                          "## Harness and Remotion\n`.agents/` · `.claude/` · `.grok/` · `animations/` · `flake.nix`"), 2, 0)
    c.text("v139", c.t("## Upstream v1.3.9\nlogging, movimento de imagem, SDXL, EmpirioLabs",
                       "## Upstream v1.3.9\nlogging, image motion, SDXL, EmpirioLabs"), 3, 1, CYAN)
    c.text("merge", c.t("## Merge v1.3.9\n25 commits do upstream\nem `unstable`",
                        "## v1.3.9 merge\n25 upstream commits\non `unstable`"), 3, 0, ORANGE)
    c.text("pend", c.t("## Pendências\n`version_checker` e links de referral do Turbo",
                       "## Open items\n`version_checker` and Turbo referral links"), 0, 1)
    c.text("decisao", c.t("## Seguir o upstream?", "## Keep following upstream?"), 4, 0, YELLOW)
    c.text("sim", c.t("## Sim\nUm merge único por release", "## Yes\nOne merge per release"), 4, 1)
    c.text("nao", c.t("## Não\nO Omni para de sincronizar", "## No\nOmni stops syncing"), 5, 0)

    c.edge("fork", "rebrand")
    c.edge("rebrand", "harness")
    c.edge("upstream", "fork", c.t("origem", "origin"))
    c.edge("upstream", "v139", c.t("25 commits", "25 commits"))
    c.edge("v139", "merge", c.t("merge", "merge"))
    c.edge("harness", "merge")
    c.edge("merge", "decisao")
    c.edge("decisao", "sim", c.t("sim", "yes"))
    c.edge("decisao", "nao", c.t("não", "no"))
    return c
