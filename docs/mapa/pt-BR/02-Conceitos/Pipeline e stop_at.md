---
title: Pipeline e stop_at
tags: [mapa, conceito, status/unstable]
aliases: [Pipeline]
lang: pt-BR
sources: [app/services/task.py, app/services/llm.py, app/services/voice.py, app/services/subtitle.py, app/services/material.py, app/services/video.py, app/services/upload_post.py, app/services/task_artifacts.py, cli.py]
---
# Pipeline e stop_at

[[00 - Índice|← Índice]]

O pipeline é uma sequência fixa de etapas. `stop_at` diz em qual etapa parar, e a tarefa devolve o resultado daquela etapa.

> [!warning] unstable
> O movimento de imagem (`image_motion`, opções `static` e `zoom`) veio do merge do upstream Turbo v1.3.9. Ele aparece nas etapas de materiais e de vídeo (`app/services/video.py:1955`, `app/services/material.py:1740`). Estado a confirmar. O resto do pipeline está na `main`.

## Ideia central

`_run_pipeline` (`app/services/task.py:1519`) executa as etapas em uma ordem fixa: roteiro, termos, áudio, legenda, materiais, vídeo e publicação. Cada etapa grava um arquivo ou um campo de estado. A ordem real é **roteiro → termos → áudio → legenda → materiais → vídeo → publicação**. O áudio vem antes da legenda porque a legenda Edge usa a linha do tempo que o TTS gera.

## Como funciona

**Pré-checagens (antes de qualquer chamada paga).** Acontecem entre `task.py:1532` e `task.py:1650`:

- o estado vai para `processing` com progresso 5 (`task.py:1532`);
- com `stop_at="video"` e legenda ligada, as cores são validadas (`task.py:1537`);
- com `stop_at` igual a `materials` ou `video`, a fonte de vídeo precisa estar em `_SUPPORTED_VIDEO_SOURCES` (`task.py:97`, checagem em `task.py:1543`);
- chaves de provedor para Seedance, OFox, Metaso, MuAPI e openai_image (só `materials` e `video`);
- para música de fundo (`sonilo` ou `elevenlabs`, `_VIDEO_MUSIC_PROVIDERS` em `task.py:79`): chave, tamanho do prompt e, se houver, `validate_generation_access()`. Só em `video`;
- ffmpeg: `utils.check_ffmpeg_ready()` (`task.py:1650`), exceto para `script` e `terms`.

Falha em qualquer pré-checagem chama `_mark_task_failed(..., "preflight", ...)`.

**Etapas.**

| # | `stop_at` | Função (arquivo:linha) | Chama | Grava | Progresso |
|---|---|---|---|---|---|
| 1 | `script` | `generate_script` (`task.py:358`) | `llm.generate_script` (`app/services/llm.py:894`). Pulada se `video_script` veio preenchido | nada no disco | 10 |
| 2 | `terms` | `generate_terms` (`task.py:379`) | `llm.generate_terms` (`llm.py:1023`), `amount=8` com `match_materials_to_script`, senão 5. Pula com `local`. Depois, `twelvelabs.rerank_terms_by_subject` (`app/services/twelvelabs.py:113`), se configurado | `script.json` por `save_script_data` (`task.py:424`) | 20 |
| 3 | `audio` | `generate_audio` (`task.py:551`) | `voice.tts` (`app/services/voice.py:1138`) → `_single_tts` (`voice.py:640`). Com `no-voice`, `generate_silent_audio` (`voice.py:593`) | `audio.mp3` (`task.py:601`) | 30 |
| 4 | `subtitle` | `generate_subtitle` (`task.py:649`) | provedor `edge` → `voice.create_subtitle` (`voice.py:3679`); `whisper` → `subtitle.create` (`app/services/subtitle.py:61`) e `correct` (`subtitle.py:230`) | `subtitle.srt` (`task.py:661`) | 40 |
| 5 | `materials` | `get_video_materials` (`task.py:723`) | `local` → `preprocess_video` (`app/services/video.py:1955`); demais → `material.download_videos` (`app/services/material.py:2161`) | cache de material e `material_sources` no `script.json` | 40 → 50 |
| 6 | `video` | `generate_final_videos` (`task.py:980`) | `video.combine_videos` (`video.py:973`), BGM opcional (`app/services/sonilo.py:392` ou `elevenlabs_music.py:388`), `video.generate_video` (`video.py:1569`) | `combined-N.mp4`, `final-N.mp4` (`task.py:1026`, `task.py:1082`) | 50 → 100 |
| 7 | (fim) | `_schedule_cross_post` (`task.py:1463`) → `_run_cross_post` (`task.py:1259`) | `llm.generate_social_metadata` (`llm.py:1343`), `upload_post.cross_post_video` (`app/services/upload_post.py:396`). Pool de 2 threads | campos `cross_post_*` no estado | não se aplica |

A publicação roda depois que o estado já está `complete` (`task.py:1883` agenda a publicação).

**O que cada `stop_at` devolve.** A função `start()` retorna o dicionário daquela etapa:

- `script` → `{"script"}` (`task.py:1682`);
- `terms` → `{"script", "terms"}` (`task.py:1701`);
- `audio` → `{"audio_file", "audio_duration"}` (`task.py:1757`);
- `subtitle` → `{"subtitle_path"}` (`task.py:1777`);
- `materials` → `{"materials"}` (`task.py:1803`);
- `video` → o dicionário completo: `videos`, `combined_videos`, `audio_file`, `subtitle_path`, `materials`, `cross_post_state` etc.

Na API, o `stop_at` é fixo por rota: `/videos` usa `video`, `/subtitle` usa `subtitle`, `/audio` usa `audio` (`app/controllers/v1/video.py:215-229`). Os outros valores só existem no CLI. Veja [[Flags do CLI]].

**Erros.** `_mark_task_failed` (`task.py:260`) grava `failed_stage` (`preflight`, `script`, `terms`, `audio`, `subtitle`, `materials`, `video`, `pipeline`) e o texto do erro. Erros de LLM voltam como string que começa com `Error: `. O pipeline reconhece essa marca só quando o roteiro foi gerado pelo LLM (`task.py:1663`).

**Progresso.** Cada etapa grava seu percentual. Materiais e vídeo usam um relator que interpola entre os dois valores (`task.py:328`).

## Exemplo / percurso

Um `POST /api/v1/subtitle` roda áudio e legenda e para. Ele não gera material nem vídeo. Um `POST /api/v1/audio` roda só até a etapa 3. Pelo CLI, `--stop-at audio` devolve `{"audio_file", "audio_duration"}`, como mostrado em [[02 - Vídeo pelo CLI]].

Para uma tarefa completa com material local, os arquivos em `storage/tasks/<id>/` são `script.json`, `audio.mp3`, `subtitle.srt` (se a legenda estiver ligada), `combined-N.mp4` e `final-N.mp4`. Veja [[01 - Vídeo pela API]].

> [!warning] unstable
> Com `image_motion` (padrão `zoom`), imagens de material ganham movimento. A opção vem de `VideoParams.image_motion` (`app/models/schema.py:116`) e de `--image-motion` no CLI (`cli.py:444`). Veja [[Flags do CLI]].

## Armadilhas

- **Pré-checagem não é garantia de sucesso.** Ela só olha chaves e formato. Uma chave válida com cota esgotada falha na etapa seguinte, com `failed_stage` correspondente.
- **Legenda não cai para o Whisper.** Se o provedor `edge` não gerar o arquivo, a tarefa segue sem legenda. O código diz isso de forma explícita (`app/services/task.py:649-722`). Para legenda sem linha do tempo do TTS, o provedor precisa ser `whisper`, e isso é uma configuração global, não por tarefa.
- **Roteiro do usuário que começa com `Error: `** não é tratado como erro, porque a marca só vale para roteiro gerado pelo LLM (`task.py:1663`).
- **Falha em provedor pago mantém o id remoto.** Campos como `volcengine_seedance_task_id` ou `muapi_task_id` ficam no estado para recuperar o resultado depois.

## Prática

1. Escreva a ordem das etapas do pipeline, sem consultar a tabela.
2. Com `match_materials_to_script` ligado, quantos termos de busca o LLM deve gerar, e onde isso é decidido?
3. O que a API devolve quando você chama `POST /api/v1/subtitle` e o provedor de legenda Edge falha?

> [!faq]- Gabarito
> 1. Roteiro, termos, áudio, legenda, materiais, vídeo e publicação. A legenda vem depois do áudio porque usa a linha do tempo do TTS.
> 2. Oito. A decisão está em `generate_terms` (`app/services/task.py:379`): `amount=8 if params.match_materials_to_script else 5`.
> 3. Sucesso sem legenda. O `subtitle_path` vem vazio e a tarefa segue. Não há fallback para o Whisper.

## Conexões

- [[Visão geral]]: as três portas que chamam este pipeline.
- [[Estado das tasks e fila]]: como o estado e a fila acompanham essas etapas.
- [[Configuração e travas]]: as chaves que escolhem provedores.
- [[Rotas da API]] e [[Flags do CLI]]: os valores de `stop_at` em cada porta.
- Canvas: [[01 - Pipeline.canvas|Canvas]].
