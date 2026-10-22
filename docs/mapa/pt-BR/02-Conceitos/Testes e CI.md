---
title: Testes e CI
tags: [mapa, testes, ci, status/unstable]
aliases: [CI, Suíte de testes, Cobertura]
lang: pt-BR
sources: [.github/workflows/ci.yml, .github/workflows/docker-ghcr.yml, pyproject.toml, test/README.md, test/services/test_state.py, test/services/test_llm.py, test/services/test_voice.py, test/services/test_video_project.py, animations/.nvmrc, AGENTS.md]
---
# Testes e CI

[[00 - Índice|← Índice]]

A suíte roda com pytest (que também executa os `unittest.TestCase`), exige 70% de cobertura de branch e, no repositório original, roda no GitHub Actions. No fork o CI não roda: as checagens são locais.

## Ideia central

Toda mudança passa por três checagens: ruff (lint), pytest (testes) e coverage (cobertura de branch, com piso de 70%). O CI é o mesmo conjunto, executado em Python 3.11 e 3.13 com um Redis de verdade.

## Como funciona

1. **Layout.**
   - `test/test_main.py`: teste do ponto de entrada.
   - `test/services/`: 221 entradas, a maioria `test_<domínio>.py`, uma por domínio.
   - `test/resources/`: imagens `1.png` a `9.png` para os testes de material.
   - Não há `conftest.py` nem `pytest.ini`/`setup.cfg`. A configuração de cobertura fica no `pyproject.toml`.
   - 64 arquivos usam `unittest.TestCase`; o resto usa funções pytest. O pytest roda os dois.
2. **Mocks.** Os testes trocam dependências com `unittest.mock.patch.object` (cerca de 1.800 ocorrências) e, em 24 arquivos, com `monkeypatch`. A WebUI é testada com `streamlit.testing.v1.AppTest` (21 arquivos).
3. **Testes ao vivo e Redis.**
   - `MPT_RUN_INTEGRATION_TESTS=1` liga os testes que chamam LLM, TTS e Twelve Labs de verdade (`test_llm.py`, `test_task.py`, `test_voice.py`, `test_twelvelabs.py`). Exigem as credenciais do provedor.
   - `MPT_TEST_REDIS_HOST`, `MPT_TEST_REDIS_PORT` e `MPT_TEST_REDIS_DB` ligam os testes de Redis. Sem o host, `test/services/test_state.py:321-323` pula o teste.
4. **Cobertura** (`pyproject.toml`): `branch = true`; `source = ["app", "cli", "webui", "main", "docs/skill"]`; `fail_under = 70`; `show_missing` e `skip_covered` ligados. O comentário do arquivo registra que as medições em 3.11 e 3.13 passaram de 70,4%.
5. **O job `tests` do `ci.yml`.**
   - Matriz Python 3.11 e 3.13, com um serviço `redis:7-alpine` e `MPT_TEST_REDIS_DB: 15`.
   - Passos: `uv sync --frozen`; `compileall`; `ruff` (só no 3.11); `coverage run -m pytest -q test`.
   - Depois instala o ffmpeg com `apt-get` e roda `test/services/test_video_project.py` e `test/services/test_minimax_output_container.py` com `coverage run --append`.
   - Fecha com `coverage report`, `coverage xml` e o envio do XML como artefato (7 dias).
6. **Outros jobs.**
   - `animations`: Node na versão de `animations/.nvmrc` (24), `npm ci --prefix animations` e `npm run typecheck`.
   - `windows-smoke`: Windows com Python 3.11, compila e roda um subconjunto de testes de serviço (config, state, task, task manager, controller de vídeo, WebUI task).
   - `docker-ghcr.yml`: constrói a imagem para amd64 e arm64 em push para `main` e em tags `v*`.

> [!warning] unstable
> Os testes novos do v1.3.9 (ex.: `test/services/test_webui_image_motion.py`, `test/services/test_webui_logging_settings.py`) e o teste de login Kimi estão na branch `unstable`. Estado a confirmar.

## Exemplo / percurso

Resultado de uma execução local nesta sessão, em uma cópia do worktree (fora do worktree, para não gerar `config.toml` nem `storage/`):

- Ambiente: `uv sync --frozen` com Python 3.11; ffmpeg 6.1.1 do sistema; sem Redis e sem `MPT_RUN_INTEGRATION_TESTS`.
- `ruff check app cli.py main.py webui test docs/skill`: `All checks passed!`.
- `pytest -q test`: **10 failed, 2384 passed, 54 skipped**, em 8 min 17 s.
- Falhas de áudio (9): `test_bgm_decoded_audio.py` (1), `test_remote_speech_complete_decode.py` (5), `test_webui_bgm.py` (2 subtestes, `en` e `zh`) e `test_webui_custom_audio_upload.py` (1). O erro é `ffmpeg -xerror ... Decoder thread returned error`.
- Repetindo essas 9 com o binário ffmpeg 7.0.2 do `imageio-ffmpeg` no `PATH`: **32 passed, 14 subtests passed**. A única variável trocada foi o ffmpeg.
- Falha de login Kimi (1): timeout de 3 s do AppTest do Streamlit. Rodado sozinho: 6 passed em 1,4 s. Instável sob carga.
- Não rodei o `coverage` nesta verificação; o piso de 70% não foi reconferido aqui.

## Armadilhas

- **Passar local não é passar no CI.** Como as Actions não rodam no fork, a única prova é a execução local. Os três comandos de [[Como contribuir]] são o substituto.
- **A suíte de áudio depende do ffmpeg do sistema.** Com ffmpeg 6.1.1 do sistema, as 9 falhas de áudio aparecem; com o 7.0.2 empacotado, passam. No CI, a suíte principal roda antes do `apt-get install ffmpeg`, então depende do ffmpeg que já vem no runner (não verificado). Confirme com `ffmpeg -version`.
- **Skipped não é verificado.** Os 54 skips desta execução não rodaram. Pelo código, eles são testes de Redis e de integração ao vivo, que pulam sem as variáveis (não listei cada um). Não conte como cobertos.
- **Teste de WebUI com timeout curto oscila.** O AppTest tem 3 s por execução; sob carga da suíte inteira, o login Kimi estourou o limite e passou sozinho.

## Prática

1. Nove testes de áudio falham com `Decoder thread returned error`. Qual é a primeira coisa a verificar, e como você testa a hipótese?
2. Um teste aparece como `skipped`. Ele conta como verificado? Por quê?
3. Qual variável liga os testes que chamam LLM e TTS de verdade?

> [!faq]- Gabarito
> 1. A versão do ffmpeg (`ffmpeg -version`). Teste trocando só o binário, por exemplo colocando o ffmpeg do `imageio-ffmpeg` no `PATH`, como feito aqui.
> 2. Não. `skipped` significa que o teste não rodou. Ele precisa da variável certa (Redis ou `MPT_RUN_INTEGRATION_TESTS=1`).
> 3. `MPT_RUN_INTEGRATION_TESTS=1`, junto com as credenciais do provedor.

## Conexões

- [[Como contribuir]]: os comandos de checagem e as convenções.
- [[Branches main e unstable]]: por que o CI do fork não substitui a checagem local.
- [[Configuração e travas]]: o que os testes de configuração protegem.
- [[Time técnico]]: o papel `testador`, que escreve os testes de reprodução.
- Canvas: [[00 - Geral.canvas|Canvas]].
