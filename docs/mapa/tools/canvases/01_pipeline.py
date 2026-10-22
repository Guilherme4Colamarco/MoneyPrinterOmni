"""Canvas 01: fluxo dos estágios do pipeline, com preflight, decisão de stop_at e ramo de falha."""

from ..canvaslib import CYAN, GREEN, ORANGE, PURPLE, RED, YELLOW, Canvas

NAME = {"pt-BR": "01 - Pipeline", "en": "01 - Pipeline"}


def build(lang: str) -> Canvas:
    c = Canvas(lang)
    c.group("g_prep", c.t("Preparação", "Preparation"), 0, 0, 2, 2)
    c.group("g_etapas", c.t("Etapas, ordem fixa", "Stages, fixed order"), 2, 0, 7, 1)

    c.text("inicio", c.t("# Início\n`start()` → `_run_pipeline`", "# Start\n`start()` → `_run_pipeline`"), 0, 0, GREEN)
    c.text("preflight", c.t("## Pré-checagens\nfonte, chaves, ffmpeg", "## Preflight\nsource, keys, ffmpeg"), 1, 0, YELLOW)
    c.text("erro", c.t("# Falha\n`_mark_task_failed` grava `failed_stage`", "# Failure\n`_mark_task_failed` writes `failed_stage`"), 1, 1, RED)
    c.text("roteiro", c.t("# 1 · Roteiro\nLLM, pulado com `video_script`", "# 1 · Script\nLLM, skipped with `video_script`"), 2, 0, CYAN)
    c.text("termos", c.t("# 2 · Termos\nLLM e rerank opcional", "# 2 · Terms\nLLM, optional rerank"), 3, 0, CYAN)
    c.text("audio", c.t("# 3 · Áudio\nTTS ou silêncio", "# 3 · Audio\nTTS or silence"), 4, 0, CYAN)
    c.text("legenda", c.t("# 4 · Legenda\nedge ou whisper", "# 4 · Subtitles\nedge or whisper"), 5, 0, CYAN)
    c.text("materiais", c.t("# 5 · Materiais\nlocal ou provedor de vídeo", "# 5 · Materials\nlocal or video provider"), 6, 0, CYAN)
    c.text("video", c.t("# 6 · Vídeo\ncombina, mixa, legenda, BGM", "# 6 · Video\ncombine, mix, subtitles, BGM"), 7, 0)
    c.text("concluido", c.t("# Concluído\n`state=1`; publicação em segundo plano", "# Done\n`state=1`; publishing runs in background"), 8, 0, PURPLE)
    c.text("decisao", c.t("## stop_at\nesta é a etapa-alvo? sim: devolve; não: segue", "## stop_at\nis this the target step? yes: return; no: continue"), 2, 1, YELLOW)
    c.text("saida", c.t("# Saída parcial\ndicionário da etapa", "# Partial output\nthe step's dictionary"), 2, 2, PURPLE)
    c.text("movimento", c.t("# Movimento de imagem\n`image_motion` (unstable)", "# Image motion\n`image_motion` (unstable)"), 6, 2, ORANGE)

    c.edge("inicio", "preflight")
    c.edge("preflight", "roteiro", c.t("sim", "yes"), GREEN)
    c.edge("preflight", "erro", c.t("não", "no"), RED)
    c.edge("roteiro", "termos")
    c.edge("termos", "audio")
    c.edge("audio", "legenda")
    c.edge("legenda", "materiais")
    c.edge("materiais", "video")
    c.edge("video", "concluido")
    c.edge("roteiro", "decisao", c.t("após cada etapa", "after each step"))
    c.edge("decisao", "saida", c.t("sim", "yes"), PURPLE)
    c.edge("decisao", "termos", c.t("não", "no"))
    c.edge("movimento", "materiais", c.t("static / zoom", "static / zoom"), ORANGE)
    return c
