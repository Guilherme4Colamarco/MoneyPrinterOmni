---
title: Rotas da API
tags: [mapa, referencia, status/unstable]
aliases: [Referência da API]
lang: pt-BR
sources: [app/router.py, app/controllers/ping.py, app/controllers/v1/base.py, app/controllers/v1/video.py, app/controllers/v1/llm.py, app/controllers/base.py, app/asgi.py, app/models/schema.py, app/services/material_upload.py, app/services/bgm.py]
---
# Rotas da API

[[00 - Índice|← Índice]]

Tabela das rotas HTTP do programa, com o handler, a autenticação e o que cada rota devolve. Todas as rotas `/api/v1/*` pedem `x-api-key` quando `app.api_key` está preenchida.

> [!warning] unstable
> O campo `image_motion` do corpo de `POST /api/v1/videos` vem do merge do upstream Turbo v1.3.9. Estado a confirmar. O restante das rotas está na `main`.

## Ideia central

Há três grupos de rotas: **tarefas** (criar, consultar, apagar), **materiais e músicas** (listar e enviar arquivos) e **utilitários de texto** (roteiro, termos e metadados, que chamam o LLM direto, sem tarefa). Todas passam pelo mesmo `verify_token` (`app/controllers/base.py:47`), exceto `/ping`.

## Como funciona

Como as rotas são montadas: `app/router.py` inclui `ping`, `v1.video` e `v1.llm`. Cada módulo `v1` cria seu roteador com `new_router(dependencies=[Depends(base.verify_token)])` (`app/controllers/v1/base.py`, `video.py:43`, `llm.py:19`), e o prefixo `/api/v1` é aplicado ali.

### Tabela de rotas

| Método | Caminho | Handler (arquivo:linha) | Auth | Resposta e erros |
|---|---|---|---|---|
| GET | `/ping` | `app/controllers/ping.py:12` `ping` | não | `"pong"` |
| POST | `/api/v1/videos` | `video.py:215` `create_video` → `create_task` (`:235`), `stop_at="video"` | `x-api-key` | `200` com `task_id`; `400` validação; `429` fila cheia |
| POST | `/api/v1/subtitle` | `video.py:222` `create_subtitle`, `stop_at="subtitle"` | `x-api-key` | igual ao anterior |
| POST | `/api/v1/audio` | `video.py:229` `create_audio`, `stop_at="audio"` | `x-api-key` | igual ao anterior |
| GET | `/api/v1/tasks` | `video.py:285` `get_all_tasks` | `x-api-key` | lista paginada; `page` ≥ 1, `page_size` de 1 a 1000 |
| GET | `/api/v1/tasks/{task_id}` | `video.py:310` `get_task` | `x-api-key` | `200` com o estado; `404` se não existe |
| DELETE | `/api/v1/tasks/{task_id}` | `video.py:333` `delete_video` | `x-api-key` | `200`; `404`; `409` se a tarefa ainda roda |
| GET | `/api/v1/musics` | `video.py:373` `get_bgm_list` | `x-api-key` | lista de músicas locais |
| POST | `/api/v1/musics` | `video.py:408` `upload_bgm_file` (multipart, campo `file`) | `x-api-key` | `200`; `400` se recusado; limite 30 MB (`app/services/bgm.py:255`) |
| GET | `/api/v1/video_materials` | `video.py:441` `get_video_materials_list` | `x-api-key` | lista de arquivos em `storage/local_videos` |
| POST | `/api/v1/video_materials` | `video.py:477` `upload_video_material_file` (multipart, campo `file`) | `x-api-key` | `{"file": "<uuid>.<ext>"}`; `400` recusado; `500` se a validação está indisponível |
| GET / HEAD | `/api/v1/stream/{file_path}` | `video.py:512` `stream_video` | `x-api-key` | `200` ou `206` com faixa de bytes; `416` se a faixa é inválida |
| GET / HEAD | `/api/v1/download/{file_path}` | `video.py:578` `download_video` | `x-api-key` | arquivo de `storage/tasks` |
| POST | `/api/v1/scripts` | `llm.py:27` `generate_video_script` → `llm.generate_script` | `x-api-key` | roteiro; `503` se o LLM não está configurado |
| POST | `/api/v1/terms` | `llm.py:49` `generate_video_terms` → `llm.generate_terms` | `x-api-key` | lista de termos |
| POST | `/api/v1/social-metadata` | `llm.py:70` `generate_video_social_metadata` → `llm.generate_social_metadata` | `x-api-key` | título, descrição e tags |

Arquivos estáticos, fora das rotas da API:

| Caminho | Montagem | Auth |
|---|---|---|
| `/tasks/*` | `app/asgi.py:309` (`StaticFiles` sobre `storage/tasks`) | `x-api-key`, pelo middleware `protect_generated_task_files` (`app/asgi.py:283`) |
| `/*` | `app/asgi.py:312` (`StaticFiles` sobre `resource/public`) | nenhuma |

### Corpo de `POST /api/v1/videos`

O corpo segue `TaskVideoRequest` (`app/models/schema.py:263`), que herda de `VideoParams` (`schema.py:96`). Campos principais, com o padrão:

| Campo | Padrão | Limites ou valores |
|---|---|---|
| `video_subject` | obrigatório | texto |
| `video_script` | `""` | se vier preenchido, o LLM não é chamado |
| `video_source` | `"pexels"` | `pexels`, `pixabay`, `coverr`, `local`, `wavespeed`, `volcengine_seedance`, `ofox`, `metaso_minimax`, `muapi`, `loomloom`, `openai_image` (`app/services/task.py:97`) |
| `video_materials` | `null` | lista de `{provider, url, duration, source_info}` (`schema.py:86`); para `local`, `url` é o nome em `storage/local_videos` |
| `video_aspect` | `"9:16"` | `9:16`, `16:9`, `1:1` (`schema.py:34`) |
| `video_count` | `1` | `1` a `5` (`schema.py:266`) |
| `video_clip_duration` | `5` | `1` a `15` (`schema.py:267`) |
| `n_threads` | `2` | `1` a `16` (`schema.py:268`) |
| `voice_name` | `""` | `no-voice` para áudio silencioso |
| `bgm_type` | `"random"` | padrão de música de fundo |
| `bgm_volume` | `0.2` | número |
| `subtitle_enabled` | `true` | liga e desliga a legenda |
| `font_size` | `60` | inteiro ≥ 1 |
| `paragraph_number` | `1` | `1` a `10` |
| `image_motion` | `"zoom"` | `static` ou `zoom` (unstable, `schema.py:116`) |

Erros de validação do corpo viram **400**, não 422: `app/asgi.py:67-86` troca o código e devolve o primeiro campo rejeitado na mensagem.

### Formato de resposta

Todas as respostas JSON têm `status`, `message` e `data` (`schema.py:292`). Erros de tarefa usam `message` com o `request_id` na frente, como `"<id>: task not found"`. O `request_id` vem do cabeçalho `x-task-id`, ou é gerado (`app/controllers/base.py:25`).

## Exemplo / percurso

Testado nesta documentação, com `api_key` preenchida no `config.toml` de teste:

- `GET /ping` → `200`, sem chave.
- `GET /api/v1/tasks/<id>` sem chave → `401`; com chave errada → `401`; com a chave certa → `404` quando a tarefa não existe na memória.
- `GET /tasks/<id>/final-1.mp4` sem chave → `401`; com chave → `200`.
- `POST /api/v1/scripts` com chave, sem LLM configurado → `503 script generation is unavailable`.
- `POST /api/v1/videos` com `video_count: 9` → `400`, mensagem `body.video_count: Input should be less than or equal to 5`.

Veja o percurso completo em [[01 - Vídeo pela API]].

## Armadilhas

- **`/ping` não pede chave.** Ele é a única rota da API sem `verify_token`. Não use para checar autenticação.
- **Criar não é concluir.** `POST /videos` responde `200` antes do pipeline rodar. A falha aparece depois, em `GET /tasks/{id}`.
- **O navegador não manda `x-api-key`.** Um link direto para `/tasks/...` com a chave ligada dá `401`. O cliente precisa mandar o cabeçalho (`config.example.toml:34-35`).
- **Os caminhos de `materials` vêm absolutos.** A resposta de `GET /tasks/{id}` devolve `materials` com caminho do disco do servidor. Só `videos`, `combined_videos`, `audio_file` e `subtitle_path` viram URL (`video.py:142`).

## Prática

1. Qual rota não pede `x-api-key` e por quê?
2. O que devolve `POST /api/v1/videos` quando o cliente manda `video_count: 9`? E o que acontece se o pipeline falhar depois?
3. Qual código HTTP o `DELETE /api/v1/tasks/{id}` devolve para uma tarefa com `state=4`?

> [!faq]- Gabarito
> 1. `/ping`. Ele é registrado em `app/controllers/ping.py` com o roteador simples, sem `new_router`, então não recebe `verify_token`.
> 2. `400`, pelo esquema (`app/models/schema.py:266`). Uma falha do pipeline não muda a resposta da criação: ela aparece depois, em `GET /tasks/{id}`.
> 3. `409`, `task is still running` (`app/controllers/v1/video.py:345`).

## Conexões

- [[Visão geral]]: as três portas, e a API entre elas.
- [[Portas de entrada]]: o que a API valida, comparado à WebUI e ao CLI.
- [[Estado das tasks e fila]]: os códigos 404, 409 e 429.
- [[Configuração e travas]]: `api_key` e os caminhos permitidos.
- [[Flags do CLI]]: os mesmos campos, por linha de comando.
- [[01 - Vídeo pela API]]: percurso com resposta real.
