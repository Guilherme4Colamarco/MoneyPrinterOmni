# MAPA: o MoneyPrinterOmni em um arquivo

Mapa compacto para agentes e contribuidores. Detalhe, exemplos e prática: vault em [`pt-BR/`](pt-BR/00%20-%20Índice.md). Fatos conferidos no código; `arquivo:linha` pode envelhecer, então confirme com `grep -n`. English: [`MAPA.en.md`](MAPA.en.md).

## 1. O programa
Três portas levam à mesma função: `app/services/task.py::start()` → `_run_pipeline`.

| Porta | Arquivo | Como chega em `start()` |
|---|---|---|
| API (FastAPI, `:8080`) | `main.py` → `app/asgi.py`, rotas em `app/controllers/v1/` | `task_manager.add_task(tm.start, …)` (fila; 429 se cheia) |
| WebUI (Streamlit, `:8501`) | `webui/Main.py`, `app/services/webui_task.py` | `submit_generation()` com `runtime_config_lock` |
| CLI | `cli.py` (`mpt cli`) | direto e síncrono, `allow_server_file_input=True`; JSON no stdout, exit 0/1/2 |

Estágios (`stop_at` corta depois de qualquer um): **script** (`llm.generate_script`) → **terms** (`llm.generate_terms`) → **audio** (`voice.tts`) → **subtitle** (`edge` ou `whisper`) → **materials** (`material.download_videos`, `local`, `loomloom`) → **video** (`video.combine_videos` → `generate_video`, BGM opcional) → cross-post (`upload_post`, depois de concluir). O áudio vem ANTES da legenda. Arquivos em `storage/tasks/<id>/`: `script.json`, `audio.mp3`, `subtitle.srt`, `combined-N.mp4`, `final-N.mp4`. Estado: `app/services/state.py` (memória ou Redis).

Pegadinhas: `video_project.py` está FORA do pipeline (roda com `python -m`); o `runtime_config_lock` só é pego pela WebUI; `allow_server_file_input` é só do CLI; recursos passam por `app/paths.py`.

Config: `config.toml` (a partir de `config.example.toml`), `app/config/config.py`. Provedores de LLM: registro `LLM_PROVIDER_REGISTRY` em `app/models/llm_provider.py` (37), adaptadores em `app/services/llm.py`; por assinatura: `claude_code` (CLI oficial) e `kimi_code` (OAuth). Música: `_VIDEO_MUSIC_PROVIDERS` em `task.py`.

## 2. O harness de agentes
Fonte única: `AGENTS.md` + `.agents/`. Os adaptadores só apontam para lá.

| Camada | Onde | Para quê |
|---|---|---|
| Regras | `.agents/setup.md`, `.agents/tecnico.md`, `.agents/pipeline.md`, `.agents/comunicacao.md` | prioridade: pedido > brief > perfil > gostos > setup |
| Papéis | `.agents/roles/*.md` (20) | um por função; o modelo vive só nos adaptadores |
| Skills | `.agents/skills/video/` (13 etapas, scripts em `scripts/`), `.agents/skills/manutencao/` | orquestração |
| Playbooks e perfis | `.agents/playbooks/`, `.agents/perfis/` | receitas (yt-dlp, redes sociais, ffmpeg, MPT) e um perfil por canal |
| Adaptadores | `.claude/agents/`, `.claude/skills/`, `.grok/agents/` (gerado por `.agents/tools/sync_grok_agents.py`) | Claude Code e Grok Build |
| MCP | `.mcp.json`, `.claude/settings.json`, `.claude/hooks/ensure-yt-dlp.sh` | yt-dlp (main); reddit e apify (unstable); só leitura |

Time de vídeo (12 papéis, pasta `storage/projects/<slug>/`): pesquisador → (critico, sugestor-de-pauta, auditor) → diretor-de-arte → **diretor (parada de aprovação)** → montador-mpt (áudio, `timing.json`) → cacador-de-clipes → animador → editor-de-clipes → montador-mpt (render) → critico + auditor → designer-de-thumbnail + redator-de-publicacao → diretor (entrega). Nunca publica. Time técnico (8 papéis, `storage/manutencao/<slug>/`): arquiteto, desenvolvedor, testador, revisor-de-codigo, auditor-de-seguranca, auditor-de-saude, pesquisador-de-integracoes, mantenedor-do-harness.

## 3. Origem e branches
Fork do MoneyPrinterTurbo no commit `9e7d8b7`; rebrand `a6c685c` (`app/paths.py:_with_legacy` mantém a pasta de dados antiga). Em 22/10/2026 entrou o upstream v1.3.9. Remote `upstream` = `harry0703/MoneyPrinterTurbo`.
- **`main`**: só o que é testado e provado (bancos de vídeo, roteiro com IA, fluxo de agentes, Remotion, yt-dlp, adaptação Grok).
- **`unstable`**: recém-adicionado e pouco testado (MCPs Reddit/Apify, time técnico, animações novas, upstream v1.3.9, futuras assinaturas). Sobe para a `main` por PR quando corrigido e testado. Sem force-push.

## 4. Comandos
```sh
nix develop && uv sync --frozen            # ambiente (o ffmpeg do Nix passa nos testes de áudio)
uv run ruff check app cli.py main.py webui test docs/skill
uv run python -X utf8 -m pytest -q test
uv run python -X utf8 -m coverage run -m pytest -q test && uv run python -m coverage report   # fail_under = 70
python3 -m docs.mapa.tools.check_vault     # confere esta apostila
```
Camada de serviço primeiro (as três portas herdam); texto novo da WebUI em todos os `webui/i18n/*.json`; dependências só por `uv`.

## 5. Pendências conhecidas (do levantamento da apostila)
Segurança: `GET /api/v1/tasks/{id}` devolve caminho absoluto do servidor em `materials`; `listen_host = "0.0.0.0"` com `api_key` vazia é o padrão. Outras: `version_checker.py` consulta releases do Turbo; o `Dockerfile` ainda instala `requirements.txt`; `build_timeline.py` chama o yt-dlp via Nix; comentários antigos ainda em chinês. Veja as seções "Armadilhas" das notas.

## 6. Índice das notas
Percursos: API · CLI · WebUI · time de agentes · time técnico. Conceitos: [Visão geral](pt-BR/02-Conceitos/Vis%C3%A3o%20geral.md), [Pipeline e stop_at](pt-BR/02-Conceitos/Pipeline%20e%20stop_at.md), [Portas de entrada](pt-BR/02-Conceitos/Portas%20de%20entrada.md), [Provedores de LLM](pt-BR/02-Conceitos/Provedores%20de%20LLM.md), [Harness de agentes](pt-BR/02-Conceitos/Harness%20de%20agentes.md), [MCP e permissões](pt-BR/02-Conceitos/MCP%20e%20permiss%C3%B5es.md), [Omni e Turbo](pt-BR/02-Conceitos/Omni%20e%20Turbo.md), [Branches main e unstable](pt-BR/02-Conceitos/Branches%20main%20e%20unstable.md), [Como contribuir](pt-BR/02-Conceitos/Como%20contribuir.md). Referência: rotas da API, flags do CLI, chaves de configuração, provedores, contratos JSON, papéis e modelos. Lista completa: [`00 - Índice`](pt-BR/00%20-%20Índice.md).
