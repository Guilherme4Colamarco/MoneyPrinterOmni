"""Canvas 03: pipeline ao centro e as integrações externas ligadas ao estágio que as usa."""

from ..canvaslib import CYAN, GREEN, ORANGE, PURPLE, YELLOW, Canvas

NAME = {"pt-BR": "03 - Integrações", "en": "03 - Integrations"}


def build(lang: str) -> Canvas:
    c = Canvas(lang)
    c.group("g_fases", c.t("Pipeline (estágios)", "Pipeline (stages)"), 1, 3, 6, 1)

    # Pipeline ao centro (linha 3)
    c.text("roteiro", c.t("## Roteiro e termos\n`llm.generate_script`", "## Script and terms\n`llm.generate_script`"), 1, 3, YELLOW)
    c.text("audio", c.t("## Áudio\n`generate_audio` → `voice.tts`", "## Audio\n`generate_audio` → `voice.tts`"), 2, 3, YELLOW)
    c.text("legenda", c.t("## Legenda\n`edge` ou `whisper` local", "## Subtitles\n`edge` or local `whisper`"), 3, 3, YELLOW)
    c.text("material", c.t("## Material\n`get_video_materials`", "## Material\n`get_video_materials`"), 4, 3, YELLOW)
    c.text("video", c.t("## Vídeo final\n`generate_final_videos`", "## Final video\n`generate_final_videos`"), 5, 3, YELLOW)
    c.text("publica", c.t("# Publicação\n`_run_cross_post`", "# Publishing\n`_run_cross_post`"), 6, 3, PURPLE)
    c.edge("roteiro", "audio")
    c.edge("audio", "legenda")
    c.edge("legenda", "material")
    c.edge("material", "video")
    c.edge("video", "publica")

    # Integrações externas (ciano) acima e abaixo
    c.text("llm", c.t("## LLM\n37 provedores (`LLM_PROVIDER_REGISTRY`)", "## LLM\n37 providers (`LLM_PROVIDER_REGISTRY`)"), 1, 1, CYAN)
    c.text("assinatura", c.t("## Assinaturas (sem chave)\nClaude Code (CLI), Kimi Code (OAuth)", "## Subscriptions (no key)\nClaude Code (CLI), Kimi Code (OAuth)"), 0, 1, GREEN)
    c.text("tts", c.t("## TTS\nEdge, Azure, Gemini, xAI, ElevenLabs e outros", "## TTS\nEdge, Azure, Gemini, xAI, ElevenLabs and others"), 2, 1, CYAN)
    c.text("upload", c.t("## upload-post\nTikTok, Instagram, YouTube", "## upload-post\nTikTok, Instagram, YouTube"), 6, 1, CYAN)
    c.text("material_ext", c.t("## Stock e IA\nPexels, Pixabay, Coverr; WaveSpeed, Seedance, OFox, MuAPI, Metaso, OpenAI image", "## Stock and AI\nPexels, Pixabay, Coverr; WaveSpeed, Seedance, OFox, MuAPI, Metaso, OpenAI image"), 4, 5, CYAN)
    c.text("musica", c.t("## Música por IA\nSonilo, ElevenLabs Music", "## AI music\nSonilo, ElevenLabs Music"), 5, 5, CYAN)
    c.text("sdxl", c.t("## SDXL local\n`docs/local-image-server` (instável)", "## Local SDXL\n`docs/local-image-server` (unstable)"), 3, 5, ORANGE)
    c.text("planejado", c.t("## PLANEJADO\nCodex CLI, Gemini CLI, Grok Build", "## PLANNED\nCodex CLI, Gemini CLI, Grok Build"), 0, 5, ORANGE)

    c.edge("assinatura", "llm", c.t("login", "login"), CYAN)
    c.edge("llm", "roteiro", c.t("roteiro", "script"), CYAN)
    c.edge("tts", "audio", c.t("voz", "voice"), CYAN)
    c.edge("material_ext", "material", c.t("clipes", "clips"), CYAN)
    c.edge("musica", "video", c.t("trilha", "soundtrack"), CYAN)
    c.edge("upload", "publica", c.t("envio", "upload"), CYAN)
    c.edge("sdxl", "material", c.t("imagens", "images"), ORANGE)
    return c
