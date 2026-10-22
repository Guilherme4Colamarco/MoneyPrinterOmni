"""Manifesto do vault: ids estáveis -> nomes de arquivo em pt-BR e en.

Usado por check_vault.py e build_site.py. Se uma nota mudar de nome, mude aqui.
"""

SECTIONS = {
    "pt-BR": {"walk": "01-Percursos", "concept": "02-Conceitos", "canvas": "03-Canvas", "ref": "04-Referência"},
    "en": {"walk": "01-Walkthroughs", "concept": "02-Concepts", "canvas": "03-Canvas", "ref": "04-Reference"},
}

SECTION_TITLES = {
    "pt-BR": {"walk": "Percursos", "concept": "Conceitos", "canvas": "Canvas", "ref": "Referência"},
    "en": {"walk": "Walkthroughs", "concept": "Concepts", "canvas": "Canvas", "ref": "Reference"},
}

INDEX = {"pt-BR": "00 - Índice", "en": "00 - Index"}

# (id, secao, nome pt-BR, nome en)
NOTES = [
    ("p1", "walk", "01 - Vídeo pela API", "01 - Video via the API"),
    ("p2", "walk", "02 - Vídeo pelo CLI", "02 - Video via the CLI"),
    ("p3", "walk", "03 - Vídeo pela WebUI", "03 - Video via the WebUI"),
    ("p4", "walk", "04 - Vídeo pelo time de agentes", "04 - Video with the agent team"),
    ("p5", "walk", "05 - Mudança pelo time técnico", "05 - Change with the technical team"),
    ("c01", "concept", "Visão geral", "Overview"),
    ("c02", "concept", "Pipeline e stop_at", "Pipeline and stop_at"),
    ("c03", "concept", "Estado das tasks e fila", "Task state and queue"),
    ("c04", "concept", "Portas de entrada", "Entry points"),
    ("c05", "concept", "Configuração e travas", "Configuration and locks"),
    ("c06", "concept", "Provedores de LLM", "LLM providers"),
    ("c07", "concept", "Assinaturas em vez de chaves", "Subscriptions instead of keys"),
    ("c08", "concept", "Voz e legenda", "Voice and subtitles"),
    ("c09", "concept", "Material de vídeo", "Video material"),
    ("c10", "concept", "Música e publicação", "Music and publishing"),
    ("c11", "concept", "Harness de agentes", "Agent harness"),
    ("c12", "concept", "Adaptadores Claude e Grok", "Claude and Grok adapters"),
    ("c13", "concept", "MCP e permissões", "MCP and permissions"),
    ("c14", "concept", "Time de vídeo e contratos de arquivo", "Video team and file contracts"),
    ("c15", "concept", "Time técnico", "Technical team"),
    ("c16", "concept", "Perfis de canal", "Channel profiles"),
    ("c17", "concept", "Animações com Remotion", "Remotion animations"),
    ("c18", "concept", "Omni e Turbo", "Omni and Turbo"),
    ("c19", "concept", "Branches main e unstable", "Branches main and unstable"),
    ("c20", "concept", "Como contribuir", "How to contribute"),
    ("c21", "concept", "Testes e CI", "Tests and CI"),
    ("r1", "ref", "Rotas da API", "API routes"),
    ("r2", "ref", "Flags do CLI", "CLI flags"),
    ("r3", "ref", "Chaves de configuração", "Configuration keys"),
    ("r4", "ref", "Provedores e adaptadores", "Providers and adapters"),
    ("r5", "ref", "Contratos JSON dos agentes", "Agent JSON contracts"),
    ("r6", "ref", "Papéis e modelos", "Roles and models"),
]

# (id, nome pt-BR, nome en)
CANVASES = [
    ("k0", "00 - Geral", "00 - Overview"),
    ("k1", "01 - Pipeline", "01 - Pipeline"),
    ("k2", "02 - Portas de entrada", "02 - Entry points"),
    ("k3", "03 - Integrações", "03 - Integrations"),
    ("k4", "04 - Time de vídeo", "04 - Video team"),
    ("k5", "05 - Time técnico", "05 - Technical team"),
    ("k6", "06 - Omni e Turbo", "06 - Omni and Turbo"),
    ("k7", "07 - Branches", "07 - Branches"),
]

LANGS = ("pt-BR", "en")


def note_path(lang: str, section: str, name: str) -> str:
    """Caminho relativo à raiz do vault do idioma."""
    return f"{SECTIONS[lang][section]}/{name}.md"


def canvas_path(lang: str, name: str) -> str:
    return f"{SECTIONS[lang]['canvas']}/{name}.canvas"
