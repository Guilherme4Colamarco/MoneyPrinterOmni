---
title: Visão geral
tags: [mapa, conceito, status/stable]
aliases: [Visão geral do programa]
lang: pt-BR
sources: [main.py, cli.py, app/asgi.py, app/services/task.py, app/services/webui_task.py, webui/Main.py, app/services/state.py, AGENTS.md]
---
# Visão geral

[[00 - Índice|← Índice]]

O MoneyPrinterOmni recebe um pedido por uma de três portas, chama `task.start()` e grava os resultados em `storage/tasks/<id>/`.

## Ideia central

Há três portas de entrada: API HTTP, WebUI (Streamlit) e CLI. As três usam a mesma função, `task.start()` (`app/services/task.py:1907`), que executa o pipeline (`_run_pipeline`, `task.py:1519`). Cada porta faz uma preparação própria antes disso: valida, enfileira, trava ou não. O pipeline é único. Por isso, uma correção na camada de serviço vale para as três portas.

## Como funciona

1. **Porta.** Cada entrada tem seu próprio caminho até `start()`:
   - **API:** `main.py:12` sobe o uvicorn em `app.asgi:app`. A rota `create_task` (`app/controllers/v1/video.py:235`) registra o estado e chama `task_manager.add_task(tm.start, ...)`.
   - **WebUI:** `webui/Main.py` chama `webui_task.submit_generation` (`app/services/webui_task.py:138`). Uma fila própria roda `_run_generation`, que pega a trava de configuração antes de `tm.start`.
   - **CLI:** `cli.py:1735` (`run_cli`) monta os parâmetros e chama `tm.start` direto (`cli.py:1766`), sem fila.
2. **Pipeline.** `_run_pipeline` executa as etapas na ordem: roteiro, termos, áudio, legenda, materiais, vídeo e, por fim, publicação. Detalhes em [[Pipeline e stop_at]].
3. **Estado.** Cada etapa grava progresso e estado em `app/services/state.py`, em memória ou no Redis (veja [[Estado das tasks e fila]]).
4. **Arquivos.** Tudo que é gerado fica em `storage/tasks/<id>/`. A API devolve esses caminhos como URLs `/tasks/...`; o CLI devolve caminhos absolutos.

## Exemplo / percurso

Pedido `POST /api/v1/videos` com um roteiro e material local. O caminho é:

`POST /api/v1/videos` → `create_video` (`video.py:215`) → `create_task` (`video.py:235`) → `add_task` (`base_manager.py:54`) → `tm.start` (`task.py:1907`) → `_run_pipeline` (`task.py:1519`) → `storage/tasks/<id>/final-1.mp4`.

O percurso completo, com resposta real, está em [[Vídeo pela API]].

Onde cada coisa mora no repositório:

| Caminho | O que tem |
|---|---|
| `main.py`, `cli.py`, `webui/` | as três portas (API, CLI e WebUI) |
| `app/asgi.py`, `app/router.py` | aplicação FastAPI, middlewares e montagem das rotas |
| `app/controllers/` | rotas HTTP (`v1/video.py`, `v1/llm.py`) e gerenciadores de fila (`manager/`) |
| `app/services/` | o pipeline (`task.py`), estado (`state.py`), vídeo, voz, legenda, materiais e provedores |
| `app/models/` | esquemas de requisição (`schema.py`), constantes (`const.py`) e provedores de LLM |
| `app/config/config.py` | leitura e gravação do `config.toml` e a trava de configuração |
| `app/paths.py` | onde ficam configuração, recursos e dados de execução |
| `config.example.toml` | modelo de configuração, com todas as chaves |
| `resource/` | fontes, músicas e arquivos públicos (copiados para `storage` ou `resource` de execução) |
| `storage/` | saída gerada em tempo de execução (ignorada pelo git) |
| `docs/mapa/` | este vault |
| `.agents/`, `.claude/` | o harness de agentes (produção de vídeo e manutenção) |

## Armadilhas

- **`video_project.py` não faz parte do pipeline.** Nenhum módulo do programa o importa; só o teste `test/services/test_video_project.py:13` usa. O `AGENTS.md` o lista como estágio de composição, o que não bate com o código.
- **A trava de configuração só existe na WebUI.** API e CLI chamam `start()` sem pegar `runtime_config_lock`. Dentro de um mesmo processo, uma mudança de configuração pode afetar uma tarefa da API em andamento.
- **Processos não compartilham estado.** Com `docker-compose`, `webui` e `api` têm cada um seu estado em memória. Sem Redis, a WebUI não enxerga as tarefas da API, exceto pela varredura de `storage/tasks`.

## Prática

1. Qual função é o ponto de entrada comum das três portas, e em qual arquivo ela fica?
2. Em qual pasta do repositório fica o código que decide quais rotas HTTP existem?
3. Se você instalar a API e a WebUI em processos separados sem Redis, a WebUI mostra as tarefas da API? Por quê?

> [!faq]- Gabarito
> 1. `start()` em `app/services/task.py:1907`. Ela chama `_run_pipeline` (`task.py:1519`).
> 2. Em `app/controllers/v1/`: `video.py` (vídeos, tarefas e materiais) e `llm.py` (roteiro, termos e metadados).
> 3. Não. Cada processo tem seu `MemoryState`. A WebUI só lista tarefas da API se elas estiverem em `storage/tasks` no disco e a pasta for compartilhada.

## Conexões

- [[Pipeline e stop_at]]: as etapas dentro de `start()`.
- [[Estado das tasks e fila]]: estado, filas e os códigos 429 e 409.
- [[Portas de entrada]]: a comparação lado a lado.
- [[Configuração e travas]]: `config.toml`, a trava e os caminhos.
- [[Rotas da API]] e [[Flags do CLI]]: as referências das portas.
- Canvas: [[01 - Pipeline.canvas|Canvas]] e [[02 - Portas de entrada.canvas|Canvas de portas]].
