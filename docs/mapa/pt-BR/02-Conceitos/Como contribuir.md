---
title: Como contribuir
tags: [mapa, contribuir, status/unstable]
aliases: [Contribuir, Setup do desenvolvedor]
lang: pt-BR
sources: [AGENTS.md, flake.nix, pyproject.toml, .python-version, animations/.nvmrc, config.example.toml, app/services/task.py, app/services/webui_task.py, app/config/config.py, app/paths.py, app/utils/file_security.py, Dockerfile, .agents/tecnico.md, .agents/skills/manutencao/SKILL.md]
---
# Como contribuir

[[00 - Índice|← Índice]]

Contribuir é mudar a camada de serviço, rodar as mesmas checagens do CI na sua máquina e levar a mudança para a `unstable`.

## Ideia central

Todo comportamento novo entra em `app/services/`. Assim a API, a WebUI e a CLI recebem a mudança juntas. Antes de dizer "pronto", rode as três checagens do CI localmente, porque as Actions não rodam no fork.

## Como funciona

1. **Preparar o ambiente.**
   - Com Nix: `nix develop`. O shell (`flake.nix`) traz Python 3.11, uv, ffmpeg, ImageMagick, Node 24, Chromium e yt-dlp, e mostra a dica `uv sync --frozen && ./webui.sh`.
   - Sem Nix: Python 3.11 ou mais novo (`pyproject.toml`, `requires-python = ">=3.11"`), depois `uv sync --frozen`.
   - Copie a configuração: `cp config.example.toml config.toml`.
   - Se o `.venv` foi criado pelo Python do Nix, rode tudo dentro do shell: `nix develop --command ...`. Fora dele, o numpy não carrega `libstdc++.so.6` (`AGENTS.md`, linhas 11-12).
2. **Rodar o programa.**
   - `./webui.sh`: WebUI em `127.0.0.1:8501`.
   - `python main.py`: API FastAPI, com documentação em `/docs`.
   - `uv run python cli.py --help`: CLI.
3. **Checar antes de declarar pronto** (os mesmos comandos do CI):
   ```sh
   nix develop --command uv run ruff check app cli.py main.py webui test docs/skill
   nix develop --command uv run python -X utf8 -m pytest -q test
   nix develop --command bash -c 'uv run python -X utf8 -m coverage run -m pytest -q test && uv run python -m coverage report'   # fail_under = 70
   ```
4. **Convenções.**
   - Comportamento novo vai em `app/services/`. As portas de entrada só chamam `task.start()` (`app/services/task.py:1907`), que roda `_run_pipeline` (`app/services/task.py:1519`).
   - Texto novo da WebUI entra nos 14 arquivos `webui/i18n/*.json`.
   - Recursos passam por `app/paths.py`. Arquivo enviado pelo servidor só pelos helpers de `app/utils/file_security.py`. `allow_server_file_input` é só do CLI.
   - Chave nova de configuração entra em `app/config/config.py` e em `config.example.toml`. Nunca edite o `config.toml` do usuário.
   - Dependência: `uv add` ou `uv lock` (`pyproject.toml` e `uv.lock`). `requirements.txt` é legado.
   - Comentário: siga a língua do arquivo. Dos 54 arquivos `.py` de `app/`, 43 têm texto em chinês; o código antigo é majoritariamente em chinês.
5. **Pedir mudança ou auditoria ao time técnico.** Diga ao assistente: "siga `.agents/skills/manutencao/SKILL.md` para <bug, função ou auditoria>". O time grava tudo em `storage/manutencao/<slug>/` (`pedido.md`, `plano.md`, relatórios de revisão e segurança) e não faz commit, push nem PR sem pedido seu.

> [!warning] unstable
> O time técnico (`.agents/tecnico.md` e os papéis `arquiteto`, `desenvolvedor`, `testador`, `revisor-de-codigo`, `auditor-de-seguranca`, `auditor-de-saude`) é da branch `unstable`. Estado a confirmar: pouco testado.

## Exemplo / percurso

Corrigir um bug pequeno em `app/services/`, do começo ao fim:

1. `uv sync --frozen` (ou `nix develop` antes).
2. Escreva um teste que **falha antes** da correção. A regra do time é: todo bug corrigido ganha um teste que falhava.
3. Corrija o código em `app/services/`.
4. Rode `nix develop --command uv run ruff check app cli.py main.py webui test docs/skill`. Na cópia usada para este mapa, a saída foi `All checks passed!`.
5. Rode a suíte da área, por exemplo `nix develop --command uv run python -X utf8 -m pytest -q test/services/test_task.py`, e depois a suíte inteira com coverage.
6. Leve a mudança para a `unstable`; a promoção para a `main` segue [[Branches main e unstable]].

## Armadilhas

- **O lock de configuração só vale para a WebUI.** `config.runtime_config_lock()` é usado em `app/services/webui_task.py:94`; a WebUI também usa `try_runtime_config_lock()` (`webui/Main.py:440`, `:3649`, `:6153`). API e CLI não o pegam, então uma mudança de config no meio de um job da API pode valer para o job em andamento.
- **O Docker não usa `uv.lock`.** O `Dockerfile` copia e instala `requirements.txt` (linhas 83 e 89). Uma dependência adicionada só com `uv add` não chega à imagem até o `requirements.txt` ser atualizado. Pendência em aberto.
- **Texto na WebUI sem as 14 traduções.** Se você põe a chave só em `en.json`, as outras 13 línguas caem no inglês (`tr()` cai no inglês, depois na chave crua). Escreva em todos os arquivos.

## Prática

1. Você precisa de uma função que serve a API, a WebUI e a CLI ao mesmo tempo. Em qual pasta ela vai?
2. Você adicionou um texto novo para a WebUI. Quantos arquivos JSON precisa tocar?
3. Você instalou uma dependência com `pip install`. O que está errado?

> [!faq]- Gabarito
> 1. Em `app/services/`, chamada a partir de `task.start()`. Assim as três portas recebem a mesma lógica.
> 2. Os 14 arquivos de `webui/i18n/`.
> 3. Em vez de `pip`, use `uv add`, que atualiza `pyproject.toml` e `uv.lock`. Lembre que o Docker lê `requirements.txt`, então essa dependência também precisa chegar lá (pendência).

## Conexões

- [[Configuração e travas]]: por que o lock vale só para a WebUI.
- [[Testes e CI]]: o que cada checagem cobre e por que o CI está desligado no fork.
- [[Branches main e unstable]]: para onde a mudança vai e como ela sobe.
- [[Time técnico]]: os papéis que fazem mudança e auditoria.
- [[Omni e Turbo]]: por que o código ainda tem nomes do upstream.
- Canvas: [[05 - Time técnico.canvas|Canvas]].
