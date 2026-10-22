---
title: 03 - Vídeo pela WebUI
tags: [mapa, percurso, status/unstable]
aliases: [Percurso pela WebUI]
lang: pt-BR
sources: [webui/Main.py, app/services/webui_task.py, app/config/config.py, app/services/task.py, app/utils/logging_utils.py]
---
# 03 - Vídeo pela WebUI

[[00 - Índice|← Índice]]

A WebUI é uma página Streamlit: você preenche as colunas, clica em gerar e acompanha o log ao vivo. Por baixo, ela usa a mesma `task.start()` da API, com uma fila própria e uma trava de configuração.

> [!warning] unstable
> O painel de logs por tarefa e os controles de diagnóstico (Interface > Diagnóstico, `webui/Main.py:3207-3223`) vêm do merge do upstream Turbo v1.3.9. Estado a confirmar. O fluxo de fila e de trava descrito abaixo está no código lido, mas o percurso não foi testado no navegador.

## Ideia central

Cada clique em gerar vira `webui_task.submit_generation(...)`. Essa função grava o estado da tarefa como `processing` e a entrega à fila da WebUI. A fila roda uma tarefa por vez. Antes de chamar `tm.start`, o worker pega a trava de configuração, para que nenhuma tela mude provedor ou chave no meio da geração.

## Como funciona

1. **Abre a página.** `./webui.sh` procura a primeira porta livre entre 8501 e 8599 em `127.0.0.1` (`webui.sh:16-17`). `mpt webui` faz o mesmo pelo `app/launcher.py:26`.
2. **Configura.** A janela de configurações (`_render_settings_dialog`, `webui/Main.py:3237`) tem seis abas: LLM, Material API, Auto-Publish, Interface, Key Backup e Cache Management (`Main.py:3242-3249`). Essas escolhas vão para `config.toml` pela camada de configuração.
3. **Monta a tarefa.** A página tem quatro colunas (`_render_application`, `Main.py:8441`): roteiro (`_render_script_settings`, `Main.py:5029`), vídeo (`5224`), áudio (`6966`) e legenda (`7670`). O botão de gerar fica em `_render_generation_controls` (`Main.py:8009`).
4. **Envia.** `Main.py:8412` chama `webui_task.submit_generation(task_id=..., params=..., capture_logs=...)` (`app/services/webui_task.py:138`). Antes disso, a função copia os parâmetros e grava o registro `processing` com `video_subject` (`webui_task.py:156-161`), para que a página ache a tarefa mesmo que o script seja executado de novo.
5. **Enfileira.** `_task_manager` (`webui_task.py:20`) é um `InMemoryTaskManager` com `max_concurrent_tasks=1` e `max_queued_tasks` lido do config. Se a fila estiver cheia, a exceção sobe e o registro vira `failed` com `failed_stage="scheduling"` (`webui_task.py:199`).
6. **Executa.** `_run_generation` (`webui_task.py:58`) prende a captura de logs da thread e entra em `config.runtime_config_lock()` (`webui_task.py:94`). Só depois chama `tm.start(...)`. Qualquer exceção do wrapper vira `failed_stage="webui_worker"`.
7. **Acompanha.** `_render_running_generation_task` (`Main.py:2151`) é um fragmento do Streamlit que atualiza a cada 0,5 s (`webui_task.py:34`) e lê o log com `get_task_logs` (`webui_task.py:52`). A lista de tarefas e o histórico são outro fragmento, a cada 2 s (`Main.py:1442`), que varre `storage/tasks` (`_scan_history_tasks`, `Main.py:991`).

## Exemplo / percurso

Não abri o navegador nesta documentação. O que foi executado: a mesma chamada que a página faz, `webui_task.submit_generation(...)`, com os parâmetros da coluna de vídeo, `video_source="local"`, voz `no-voice` e roteiro enviado. A função foi chamada direto, fora do Streamlit.

Resultado observado após cerca de 3 s de polling:

- estado `1`, progresso `100`, `failed_stage` nulo;
- `videos`: caminho absoluto de `final-1.mp4` dentro de `storage/tasks/<id>/`;
- 30 linhas de log capturadas para a tarefa (`get_task_logs`).

Os arquivos são os mesmos da API e do CLI: `script.json`, `audio.mp3`, `combined-1.mp4` e `final-1.mp4`. Veja [[Vídeo pela API]] para a tabela.

Como a página mostra o resultado: `Main.py:2060` exibe "Video Generation Failed" quando o estado não é `1` ou não há arquivo de vídeo.

## Armadilhas

- **Uma tarefa por vez, sempre.** A WebUI fixa `max_concurrent_tasks=1` (`webui_task.py:20-23`). O limite do `config.toml` vale só para a API. As duas filas não se enxergam.
- **Trava pega, mas a página não bloqueia.** Mudar uma opção durante uma geração não quebra a tarefa, porque `update_config_nonblocking` (`app/config/config.py:92`) guarda o valor e aplica quando a trava solta. A tarefa em curso continua com a configuração anterior.
- **Sem Redis, a API não vê a WebUI.** Cada processo tem o próprio estado em memória. A lista da WebUI só mostra tarefas da API porque lê `storage/tasks` do disco.
- **Fila cheia aparece como erro genérico.** A página mostra "Video Generation Failed" (`Main.py:2060`). O motivo real está no campo `error` do estado, com `failed_stage="scheduling"`.

## Prática

1. Quantas tarefas a WebUI executa ao mesmo tempo, e por que isso não depende de `max_concurrent_tasks`?
2. Em qual função a WebUI pega a trava de configuração, e o que ela faz com uma mudança de opção enquanto a trava está presa?
3. Se a fila da WebUI estiver cheia, qual `failed_stage` fica no estado da tarefa?

> [!faq]- Gabarito
> 1. Uma. `_task_manager` é criado com `max_concurrent_tasks=1` (`app/services/webui_task.py:20`). `max_concurrent_tasks` do config é lido só pela API.
> 2. Em `_run_generation`, com `config.runtime_config_lock()` (`webui_task.py:94`). A mudança é guardada e aplicada quando a trava solta (`config.py:92`).
> 3. `scheduling` (`webui_task.py:199`).

## Conexões

- [[Visão geral]]: onde a WebUI entra no programa.
- [[Estado das tasks e fila]]: as duas filas e o estado `failed`.
- [[Configuração e travas]]: a trava de configuração em detalhe.
- [[Portas de entrada]]: a comparação com API e CLI.
- [[Pipeline e stop_at]]: o que roda dentro de `tm.start`.
- Canvas: [[02 - Portas de entrada.canvas|Canvas]].
