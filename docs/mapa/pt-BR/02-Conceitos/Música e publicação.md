---
title: Música e publicação
tags: [mapa, integracoes, status/stable]
lang: pt-BR
sources: [app/services/bgm.py, app/services/task.py, app/services/upload_post.py, app/services/llm.py, app/services/sonilo.py, app/services/elevenlabs_music.py, app/asgi.py, config.example.toml]
---
# Música e publicação

[[00 - Índice|← Índice]]

A trilha pode ser um arquivo local ou gerada por IA. Depois do render, o vídeo pode ser enviado a plataformas em segundo plano.

## Ideia central

Música e publicação são etapas opcionais que rodam em volta do pipeline. A trilha entra na montagem do vídeo. A publicação roda **depois** que a task termina, numa thread separada. Se o processo reiniciar no meio, o envio não é retomado.

## Como funciona

### Trilha

1. `should_use_bgm` (`app/services/bgm.py:73`) decide se há trilha.
2. Trilha local: `list_bgm_files` (`bgm.py:361`) junta as músicas embutidas em `resource/songs` e os uploads em `storage/bgm` (`uploaded_bgm_dir`, `bgm.py:90`).
3. Trilha por IA: `_VIDEO_MUSIC_PROVIDERS` (`app/services/task.py:79`) registra dois provedores.
   - `sonilo` (`app/services/sonilo.py`): chave `sonilo_api_key` ou env `SONILO_API_KEY`, prompt de até 2000 caracteres (`MAX_PROMPT_LENGTH`, `sonilo.py:25`).
   - `elevenlabs` (`app/services/elevenlabs_music.py`): chave `[elevenlabs] api_key`, `music_model_id = "music_v2"`, prompt de até 1000 caracteres (`elevenlabs_music.py:24`).
4. Preflight (`task.py:1609` em diante): chave presente, prompt dentro do limite, e `validate_generation_access()` quando existe (`elevenlabs_music.py:177`, chamado em `task.py:1639`). Tudo isso roda antes de qualquer chamada paga.
5. Na etapa `video`, `generate_final_videos` (`task.py:980`) chama `service.generate_bgm` para cada índice. O arquivo sai como `<bgm_type>-bgm-i.m4a` (Sonilo) ou `.mp3` (ElevenLabs).

### Publicação

1. Ao terminar, `_schedule_cross_post` (`task.py:1463`) envia `_run_cross_post_with_slot` ao `_cross_post_executor` (`task.py:45`), que tem `max_workers=2`.
2. Um `BoundedSemaphore` limita os envios pendentes a `upload_post_max_pending_tasks`, padrão 10 (`task.py:51-53`; `config.example.toml:603`).
3. `_run_cross_post` (`task.py:1259`) chama `llm.generate_social_metadata` (`app/services/llm.py:1343`), que devolve título, legenda e hashtags. Depois chama `upload_post.cross_post_video` (`app/services/upload_post.py:396`).
4. `UploadPostService` (`upload_post.py:23`) usa `API_BASE = "https://api.upload-post.com"` (`:24`), com cabeçalho `Authorization: Apikey ...`. Plataformas padrão: TikTok e Instagram (`config.example.toml:587`).
5. No boot da API, `recover_interrupted_cross_posts` (`task.py:1217`), chamada por `app/asgi.py:45`, marca como falha os envios que estavam ativos. Os vídeos gerados são mantidos.

## Exemplo / percurso

Uma task com `bgm_type = "elevenlabs"` e `video_music_prompt = "piano calmo"`:

1. Preflight valida a chave e o tamanho do prompt.
2. A etapa `video` grava `storage/tasks/<id>/elevenlabs-bgm-0.mp3` e mistura na `final-0.mp4`.
3. Com `upload_post_enabled = true`, a task termina `complete`. O envio vai para o executor, e a state guarda `cross_post_state`. Se o processo cair antes de terminar, a próxima subida marca o envio como `failed`.

## Armadilhas

- **Prompt longo demais.** Sonilo aceita 2000 caracteres, ElevenLabs aceita 1000. O preflight recusa antes da cobrança.
- **Envio não é retomado.** Reinício no meio de um envio marca `failed`. Ele não é refeito.
- **Pool de 2 threads.** Muitas tasks com publicação automática esperam na fila. Não é um serviço de fila persistente.
- **Redis e `ast.literal_eval`.** Os valores do estado são lidos com `ast.literal_eval`. O Redis precisa ser privado e confiável.

## Prática

1. Quantas publicações podem rodar em paralelo, e o que limita o número de pendentes?
2. O que `recover_interrupted_cross_posts` faz com um envio que estava `processing` quando o processo caiu?
3. Qual campo de `config.example.toml` define a plataforma padrão de publicação?

> [!faq]- Gabarito
> 1. Duas threads (`max_workers=2`, `task.py:45`). O limite de pendentes vem de `upload_post_max_pending_tasks`, padrão 10 (`task.py:51`).
> 2. Marca como `failed`. Não retoma, e preserva os vídeos já gerados (`task.py:1217`).
> 3. `upload_post_platforms` (`config.example.toml:587`), com padrão `["tiktok", "instagram"]`.

## Conexões

- [[Material de vídeo]] — a etapa que produz o vídeo.
- [[Pipeline e stop_at]] — quando a publicação roda.
- [[Estado das tasks e fila]] — os campos `cross_post_*`.
- [[Chaves de configuração]] — `upload_post_*` e `[elevenlabs]`.
- [[03 - Integrações.canvas|Canvas]]
