---
title: Portas de entrada
tags: [mapa, conceito, status/stable]
aliases: [API, WebUI e CLI]
lang: pt-BR
sources: [app/asgi.py, app/controllers/base.py, app/controllers/v1/video.py, app/services/webui_task.py, app/services/task.py, cli.py, webui.sh, app/launcher.py]
---
# Portas de entrada

[[00 - Índice|← Índice]]

API, WebUI e CLI são três formas de pedir a mesma coisa. Elas diferem em validação, autenticação, fila, trava de configuração e no que aceitam como caminho de arquivo.

## Ideia central

As três portas chamam `task.start()` (`app/services/task.py:1907`). Antes disso, cada uma faz o seu papel. A API valida o HTTP e pede autenticação. A WebUI tem fila de uma tarefa e pega a trava de configuração. O CLI roda síncrono, sem fila, e é o único que aceita arquivos fora da pasta da tarefa.

## Como funciona

| Aspecto | API (`/api/v1`) | WebUI (Streamlit) | CLI (`cli.py`) |
|---|---|---|---|
| Entrada | `create_task` (`app/controllers/v1/video.py:235`) | `webui_task.submit_generation` (`app/services/webui_task.py:138`) | `run_cli` (`cli.py:1735`) |
| Autenticação | `x-api-key` quando `app.api_key` está preenchida (`app/controllers/base.py:47`). Sem a chave: 401. Vale também para `/tasks/*` (`app/asgi.py:283`) | nenhuma na página. Por padrão ouve em `127.0.0.1` (`webui.sh:16`) | nenhuma. Roda com as permissões de quem executa |
| Validação | esquema pydantic: erro vira **400** (`app/asgi.py:67`). Mais: cores da legenda e caminho da fonte, também **400** (`video.py:251-254`) | widgets da página, depois o pipeline | `argparse` (saída 2), `build_video_params` (2), `prepare_cli_files` (copia materiais) |
| `video_source` | não é validado na rota. Valor inválido falha na pré-checagem (`task.py:1543`) | pelo widget | pelo `choices` do argparse (saída 2) |
| Fila | sim: `add_task`, com 429 quando cheia | sim: uma tarefa por vez (`webui_task.py:20`) | não: a chamada é síncrona |
| Trava de configuração | **não** | **sim**: `runtime_config_lock` (`webui_task.py:94`) | **não** |
| Caminho de arquivo do usuário | só dentro de `storage/tasks/<id>/`; falha no pipeline se estiver fora | uploads ficam em `storage/tasks/<id>/` | aceita caminho absoluto. Usa `allow_server_file_input=True` (`cli.py:1766`, `:1773`) |
| Saída | JSON `{status, message, data}` e consulta por `GET /tasks/{id}` | página com estado e logs ao vivo | uma linha de JSON no stdout; logs no stderr |
| Código de erro | 400, 401, 404, 409, 429 | mensagem "Video Generation Failed" | 0, 1 ou 2 |

**Onde a diferença importa.** A API e a WebUI chamam `start()` pela mesma função, mas com `allow_server_file_input` em `False`. Por isso, um `custom_audio_file` fora da pasta da tarefa é recusado (`app/services/task.py:461-470`). O CLI passa `True`, e então aceita um caminho qualquer do disco. O comentário no código diz que isso é de propósito: é a máquina do operador, não um cliente HTTP.

## Exemplo / percurso

Mesmo pedido, três portas, mesmo resultado em disco:

- **API:** `POST /api/v1/videos` com o corpo mostrado em [[01 - Vídeo pela API]].
- **WebUI:** o mesmo roteiro e material na página, botão de gerar. Veja [[03 - Vídeo pela WebUI]].
- **CLI:** `cli.py --video-script "..." --video-source local --video-materials ./clip.mp4 --voice-name no-voice`. Veja [[02 - Vídeo pelo CLI]].

Os três terminam em `storage/tasks/<id>/` com os mesmos arquivos.

## Armadilhas

- **A API valida pouco no HTTP.** Um `video_source` inexistente ou um `custom_audio_file` fora da pasta da tarefa não dão 400. A tarefa é criada com 200 e falha depois, dentro do pipeline.
- **Só o CLI aceita caminho de fora.** Não tente o mesmo caminho absoluto pela API: ele será recusado no pipeline.
- **A trava vale só na WebUI.** Hoje só a WebUI grava configuração (e o login Kimi, que roda a partir dela). A API e o CLI leem sem trava, então uma gravação dentro do mesmo processo durante uma tarefa não é adiada. Editar `config.toml` à mão só tem efeito no processo da API depois de reiniciar, porque a configuração é lida uma vez, na importação (`app/config/config.py:640-660`).
- **Chave vazia = sem autenticação.** O exemplo vem com `api_key = ""` e `listen_host = "0.0.0.0"` (`config.example.toml:38`, `:11`). O log avisa, mas nada impede a exposição na rede. Preencha a chave antes de expor a API.

## Prática

1. Qual porta chama `start()` com `allow_server_file_input=True`, e por quê?
2. Um `POST /api/v1/videos` com `video_count: 9` recebe qual código, e por quê?
3. Quem pega `runtime_config_lock`, e qual porta não pega?

> [!faq]- Gabarito
> 1. O CLI (`cli.py:1773`). É a máquina do próprio operador, então um caminho absoluto é confiável. HTTP e WebUI usam o padrão `False`.
> 2. 400. O esquema pydantic limita `video_count` a 5 (`app/models/schema.py:266`), e o erro de validação vira 400 (`app/asgi.py:67`).
> 3. A WebUI, dentro de `_run_generation` (`webui_task.py:94`). API e CLI não pegam a trava.

## Conexões

- [[Visão geral]]: o desenho geral das três portas.
- [[Pipeline e stop_at]]: o que cada porta dispara.
- [[Estado das tasks e fila]]: a fila da API e a da WebUI.
- [[Configuração e travas]]: a trava e as chaves de autenticação.
- [[Rotas da API]] e [[Flags do CLI]]: as referências de cada porta.
- Canvas: [[02 - Portas de entrada.canvas|Canvas]].
