"""Canvas 07: branches main (testada) e unstable (laranja), promoção por PR e regras."""

from ..canvaslib import GREEN, ORANGE, YELLOW, Canvas

NAME = {"pt-BR": "07 - Branches", "en": "07 - Branches"}


def build(lang: str) -> Canvas:
    c = Canvas(lang)
    c.text("main", c.t("## main\nSó o testado e provado", "## main\nOnly what is tested and proven"), 0, 0, GREEN)
    c.text("unstable", c.t("## unstable\nRecém-adicionado, pouco testado", "## unstable\nRecently added, lightly tested"),
           0, 1, ORANGE)
    c.text("merge_up", c.t("## Upstream v1.3.9\nentra na unstable", "## Upstream v1.3.9\nenters unstable"), 0, 2, ORANGE)
    c.text("decisao", c.t("## Corrigido e testado?", "## Fixed and tested?"), 1, 1, YELLOW)
    c.text("nao", c.t("## Não\nFica na unstable", "## No\nStays on unstable"), 1, 2)
    c.text("main_lista", c.t("### Na main\n- captura dos bancos de vídeo\n- roteiro com IA\n- harness Claude Code e outros\n- Remotion, yt-dlp, Grok",
                             "### On main\n- stock-video capture\n- AI scripts\n- Claude Code and other harnesses\n- Remotion, yt-dlp, Grok"), 2, 0)
    c.text("unstable_lista", c.t("### Na unstable\n- MCPs Reddit e Apify\n- time técnico\n- perfis com assets\n- animações novas\n- merge v1.3.9\n- assinaturas",
                                 "### On unstable\n- Reddit and Apify MCPs\n- technical team\n- channel profiles with assets\n- new animations\n- v1.3.9 merge\n- subscriptions"), 2, 1)
    c.text("teste", c.t("## Teste antes da PR\nActions desligadas no fork: ruff e pytest locais",
                        "## Test before the PR\nActions are off on the fork: local ruff and pytest"), 2, 2)
    c.text("regras", c.t("## Regras\nSem force-push\nPromoção só por PR", "## Rules\nNo force-push\nPromotion only by PR"), 3, 1)

    c.edge("merge_up", "unstable", c.t("entra", "enters"))
    c.edge("unstable", "decisao", c.t("pronto para PR", "ready for PR"))
    c.edge("decisao", "main", c.t("sim: PR para a main", "yes: PR to main"))
    c.edge("decisao", "nao", c.t("não", "no"))
    c.edge("teste", "decisao", c.t("checagens locais", "local checks"))
    return c
