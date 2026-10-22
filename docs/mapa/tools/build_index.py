"""Gera `00 - Índice.md` e `00 - Index.md` a partir do manifesto e das descrições abaixo.

Uso (da raiz do repositório): python3 -m docs.mapa.tools.build_index
"""

from pathlib import Path

from .manifest import CANVASES, INDEX, NOTES, SECTION_TITLES

ROOT = Path(__file__).resolve().parent.parent

DESC = {
    "p1": ("Um pedido `POST /api/v1/videos` do começo ao fim.", "A `POST /api/v1/videos` request from start to finish."),
    "p2": ("O mesmo vídeo pelo `cli.py`, com `--stop-at` e saída em JSON.", "The same video through `cli.py`, with `--stop-at` and JSON output."),
    "p3": ("O caminho da WebUI: fila, trava de configuração e progresso.", "The WebUI path: queue, config lock and progress."),
    "p4": ("Um vídeo pelo time de agentes, do tema à entrega.", "A video through the agent team, from topic to delivery."),
    "p5": ("Uma mudança no programa conduzida pelo time técnico.", "A change to the program driven by the technical team."),
    "c01": ("O programa em uma tela.", "The program on one screen."),
    "c02": ("Os estágios, o que cada um grava e onde `stop_at` corta.", "The stages, what each writes and where `stop_at` cuts."),
    "c03": ("Estados, fila, memória e Redis.", "States, queue, memory and Redis."),
    "c04": ("API, WebUI e CLI lado a lado.", "API, WebUI and CLI side by side."),
    "c05": ("`config.toml`, travas e caminhos de recursos.", "`config.toml`, locks and resource paths."),
    "c06": ("O registro de provedores e como adicionar um.", "The provider registry and how to add one."),
    "c07": ("Login por assinatura no lugar de chave de API.", "Subscription login instead of an API key."),
    "c08": ("TTS, pausas e os dois caminhos de legenda.", "TTS, pauses and the two subtitle paths."),
    "c09": ("Bancos de vídeo, IA, arquivos locais e caches.", "Stock sites, AI, local files and caches."),
    "c10": ("Trilha de fundo e cross-post.", "Background music and cross-posting."),
    "c11": ("`AGENTS.md` + `.agents/` como fonte única.", "`AGENTS.md` + `.agents/` as the single source of truth."),
    "c12": ("Os arquivos finos que apontam para `.agents/`.", "The thin files that point to `.agents/`."),
    "c13": ("Servidores MCP, allow/deny e segredos.", "MCP servers, allow/deny and secrets."),
    "c14": ("Os papéis, as etapas e a pasta do projeto.", "The roles, the stages and the project folder."),
    "c15": ("Quem muda e audita o código do programa.", "Who changes and audits the program code."),
    "c16": ("Um perfil por canal: identidade, tom, cuidados.", "One profile per channel: identity, tone, safeguards."),
    "c17": ("Gráficos animados que entram na timeline.", "Animated graphics that go into the timeline."),
    "c18": ("O que veio do Turbo e o que o Omni acrescentou.", "What came from Turbo and what Omni added."),
    "c19": ("O que mora em cada branch e como sobe.", "What lives in each branch and how it is promoted."),
    "c20": ("Comandos, convenções e fluxo de PR.", "Commands, conventions and PR flow."),
    "c21": ("Suíte, cobertura e o CI.", "The suite, coverage and CI."),
    "r1": ("Todas as rotas, handlers e autenticação.", "Every route, handler and authentication."),
    "r2": ("Todas as flags de `cli.py`.", "Every `cli.py` flag."),
    "r3": ("As chaves do `config.example.toml`.", "The `config.example.toml` keys."),
    "r4": ("Provedores de LLM, voz, material e música.", "LLM, voice, material and music providers."),
    "r5": ("`sources`, `timing`, `shotlist`, `music`, `arte`.", "`sources`, `timing`, `shotlist`, `music`, `arte`."),
    "r6": ("Os papéis, seus modelos e ferramentas.", "The roles, their models and tools."),
}

CANVAS_DESC = {
    "k0": ("Tudo em um desenho.", "Everything in one drawing."),
    "k1": ("O fluxo dos estágios.", "The stage flow."),
    "k2": ("Três portas, um pipeline.", "Three doors, one pipeline."),
    "k3": ("Cada integração ligada ao estágio que a usa.", "Each integration tied to the stage that uses it."),
    "k4": ("As 13 etapas e os papéis.", "The 13 steps and the roles."),
    "k5": ("Modos de mudança e de auditoria.", "Change and audit modes."),
    "k6": ("Linha do tempo do fork.", "Fork timeline."),
    "k7": ("main, unstable e PRs.", "main, unstable and PRs."),
}

TEXT = {
    "pt-BR": {
        "intro": "Apostila 4D do MoneyPrinterOmni: notas curtas ligadas entre si e canvas que desenham cada fluxo. Comece pelo [[Visão geral]] ou pelo canvas [[00 - Geral.canvas|Geral]]. O site em `docs/mapa/site/index.html` mostra o mesmo conteúdo.",
        "legend": "> [!info] Estado dos recursos\n> Cada nota tem a tag `status/stable` (já na `main`) ou `status/unstable` (só na branch `unstable`). Veja [[Branches main e unstable]].",
    },
    "en": {
        "intro": "The MoneyPrinterOmni 4D study guide: short linked notes and canvases that draw each flow. Start with the [[Overview]] or the [[00 - Overview.canvas|Overview]] canvas. The site at `docs/mapa/site/index.html` shows the same content.",
        "legend": "> [!info] Feature status\n> Every note carries the tag `status/stable` (already in `main`) or `status/unstable` (only in the `unstable` branch). See [[Branches main and unstable]].",
    },
}


def build(lang: str) -> str:
    i = 0 if lang == "pt-BR" else 1
    title = INDEX[lang]
    out = [
        "---", f"title: {title}", "tags: [mapa, indice, status/stable]", f"aliases: [{'Início' if i == 0 else 'Home'}]", f"lang: {lang}", "---",
        f"# {title}", "", TEXT[lang]["intro"], "", TEXT[lang]["legend"], "",
    ]
    for sec in ("walk", "concept", "ref"):
        out += [f"## {SECTION_TITLES[lang][sec]}", ""]
        for nid, s, pt, en in NOTES:
            if s == sec:
                name = pt if i == 0 else en
                out.append(f"- [[{name}]]: {DESC[nid][i]}")
        out.append("")
    out += [f"## {SECTION_TITLES[lang]['canvas']}", ""]
    for cid, pt, en in CANVASES:
        name = pt if i == 0 else en
        out.append(f"- [[{name}.canvas|{name}]]: {CANVAS_DESC[cid][i]}")
    out.append("")
    return "\n".join(out)


def main() -> int:
    for lang in ("pt-BR", "en"):
        (ROOT / lang / f"{INDEX[lang]}.md").write_text(build(lang), encoding="utf-8")
    print("índices gerados")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
