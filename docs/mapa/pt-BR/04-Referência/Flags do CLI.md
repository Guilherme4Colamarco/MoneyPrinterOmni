---
title: Flags do CLI
tags: [mapa, referencia, status/unstable]
aliases: [Referência do CLI]
lang: pt-BR
sources: [cli.py, app/models/schema.py, app/services/task.py, app/config/config.py]
---
# Flags do CLI

[[00 - Índice|← Índice]]

Lista das flags de `cli.py`, agrupadas como o parser agrupa, com os padrões tirados da saída real de `--help`, os códigos de saída e os limites do lote.

> [!warning] unstable
> A flag `--image-motion` (`cli.py:444`) vem do merge do upstream Turbo v1.3.9. Estado a confirmar. As demais flags estão na `main`.

## Ideia central

O CLI aceita a mesma configuração de tarefa da API, mas com flags. Os valores aceitos são fixados por constantes no próprio `cli.py` (`_PIPELINE_STAGES` em `cli.py:33`, `_CLI_VIDEO_SOURCES` em `cli.py:40`). Quando a flag não é passada, o valor vem de `[ui]` no `config.toml` ou do padrão do esquema, conforme indicado em cada linha.

## Como funciona

Como ler a tabela. Entre parênteses, o padrão mostrado por `--help`. Quando o padrão diz "`[ui]`…", o valor sai do `config.toml`, na seção `[ui]`. Quando não há valor no `[ui]`, vale o segundo valor citado.

### Conteúdo (roteiro)

| Flag | Padrão | Observação |
|---|---|---|
| `--video-subject TEXTO` | `""` | obrigatória, a não ser que `--video-script` seja dada (`cli.py:724`) |
| `--video-script TEXTO` | `""` | roteiro completo; pula a geração pelo LLM |
| `--video-terms LISTA` | gerado | termos separados por vírgula |
| `--video-language CÓDIGO` | detecção automática | ex.: `zh-CN`, `en-US` |
| `--paragraph-number N` | `1` | de 1 a 10 (`cli.py:79`) |
| `--video-script-prompt TEXTO` | nenhum | requisitos extras para o LLM |
| `--custom-system-prompt TEXTO` | nenhum | substitui o prompt de sistema padrão |

### Material e pipeline

| Flag | Padrão | Observação |
|---|---|---|
| `--video-source` | `pexels` | `pexels`, `pixabay`, `coverr`, `wavespeed`, `volcengine_seedance`, `ofox`, `metaso_minimax`, `muapi`, `openai_image`, `local` (`cli.py:40-50`). Não inclui `loomloom` |
| `--video-materials CAMINHO[,CAMINHO...]` | `""` | para `local`: imagens ou vídeos separados por vírgula |
| `--stop-at ETAPA` | `video` | `script`, `terms`, `audio`, `subtitle`, `materials`, `video` (`cli.py:33`). Vale para o lote inteiro |
| `--confirm-wavespeed-charge` | desligada | confirma cobrança do provedor WaveSpeed |
| `--confirm-seedance-charge` | desligada | confirma cobrança do Seedance |
| `--confirm-ofox-charge` | desligada | confirma cobrança do OFox |
| `--confirm-metaso-minimax-charge` | desligada | confirma cobrança do Metaso MiniMax |
| `--confirm-muapi-charge` | desligada | confirma cobrança do MuAPI |

Combinação recusada: `--video-source local` com `--stop-at terms` sai com 2 (`cli.py:726`).

### Vídeo

| Flag | Padrão | Observação |
|---|---|---|
| `--video-count N` | `1` | mínimo 1; não há teto na CLI, mas a API limita a 5 |
| `--video-aspect` | `9:16` | `9:16`, `16:9`, `1:1` |
| `--video-fit-mode` | `cover` | `cover` ou `contain` (barras pretas) |
| `--video-concat-mode` | `random` | `random` ou `sequential` |
| `--image-motion` | `zoom` (padrão do help) | `static` ou `zoom`; movimento para imagens (unstable) |
| `--video-transition-mode` | `none` | `shuffle`, `fade-in`, `fade-out`, `slide-in`, `slide-out`, `zoom-in`, `zoom-out` |
| `--video-clip-duration S` | `5` | segundos máximos por clipe, mínimo 1 |
| `--video-clip-speed V` | `1.0` | de 0,5 a 2,0 |
| `--match-materials-to-script` | desligada | `--no-match-materials-to-script` desliga; ativa 8 termos em vez de 5 |
| `--n-threads N` | `2` | threads do FFmpeg, mínimo 1 |

### Áudio e música

| Flag | Padrão | Observação |
|---|---|---|
| `--voice-name` | `[ui].voice_name`, senão `zh-CN-XiaoxiaoNeural-Female` | `no-voice` para áudio silencioso; prefixos `gemini:`, `xai:`, `mimo:`, `elevenlabs:`, `chatterbox:`, `kokoro:`, `voxcpm:` |
| `--voice-volume V` | `[ui].voice_volume`, senão `1.0` | número ≥ 0 |
| `--voice-rate V` | `[ui].voice_rate`, senão `1.0` | número > 0 |
| `--custom-audio-file CAMINHO` | nenhum | MP3, WAV, M4A, AAC, FLAC ou OGG. Pula o TTS. Caminho relativo vale a partir do diretório atual |
| `--bgm-type` | `random` | `none`, `random`, `custom`, `sonilo`, `elevenlabs` |
| `--sonilo-bgm-prompt TEXTO` | vazio | legado; até 2000 caracteres |
| `--video-music-prompt TEXTO` | vazio | prompt do provedor de música escolhido (`sonilo` ou `elevenlabs`) |
| `--bgm-file NOME` | nenhum | arquivo dentro de `storage/bgm` ou `resource/songs` |
| `--bgm-volume V` | `0.2` | número ≥ 0 |

### Legenda

| Flag | Padrão | Observação |
|---|---|---|
| `--subtitle-enabled` / `--no-subtitle-enabled` | `[ui].subtitle_enabled`, senão ligada | liga ou desliga |
| `--font-name ARQUIVO` | `[ui].font_name`, senão `STHeitiMedium.ttc` | arquivo dentro de `resource/fonts` |
| `--subtitle-position` | `[ui].subtitle_position`, senão `bottom` | `top`, `center`, `bottom`, `two_thirds_bottom`, `custom` |
| `--subtitle-display-mode` | `[ui]`, senão `sentence` | `sentence` ou `word_by_word` |
| `--subtitle-animation` | `[ui]`, senão `none` | `none` ou `pop_spring` |
| `--custom-position P` | `[ui]`, senão `70` | de 0 a 100; usado com `--subtitle-position custom` |
| `--text-fore-color #RRGGBB` | `[ui]`, senão `#FFFFFF` | entre aspas no shell |
| `--font-size N` | `[ui]`, senão `60` | inteiro |
| `--stroke-color #RRGGBB` | `[ui]`, senão `#000000` | cor do contorno |
| `--stroke-width N` | `[ui]`, senão `1.5` | número ≥ 0 |
| `--subtitle-background-enabled` / `--no-...` | `[ui]`, senão desligada | fundo atrás da legenda |
| `--subtitle-background-color #RRGGBB` | `[ui]` | cor do fundo |
| `--rounded-subtitle-background` / `--no-...` | `[ui]`, senão desligada | fundo com cantos arredondados |

### Execução

| Flag | Padrão | Observação |
|---|---|---|
| `--task-id UUID` | gerado | nome da pasta em `storage/tasks/`. Não combina com `--batch-file` |
| `--batch-file CAMINHO` | nenhum | JSON (array) ou JSONL. No máximo 100 tarefas e 1 MiB (`cli.py:35-36`). Cada objeto sobrescreve campos de `VideoParams`; campo desconhecido é recusado |

## Exemplo / percurso

Comando real, executado nesta documentação:

```sh
uv run python cli.py \
  --video-script "Este é um roteiro de teste para o percurso pelo CLI." \
  --voice-name no-voice --video-source local \
  --video-materials "./clip.mp4" --stop-at video
```

Saída 0, no stdout: `{"task_id": "...", "result": {"videos": [...], "combined_videos": [...], "script": "...", "terms": "", "audio_file": "...", "audio_duration": 8, "subtitle_path": "...", "materials": [...], "cross_post_state": null, ...}}`. Veja [[02 - Vídeo pelo CLI]].

### Códigos de saída

| Código | Quando | Stdout |
|---|---|---|
| `0` | tarefa concluída (ou lote sem falhas) | JSON com `task_id` e `result`. Em lote, um resumo |
| `1` | falha do pipeline ou exceção inesperada; em lote, pelo menos uma tarefa falhou (`cli.py:1732`) | vazio, ou o JSON parcial se já houver `videos` (`cli.py:1788`) |
| `2` | argumento inválido (argparse), combinação recusada, manifesto inválido | vazio |

Os logs vão para o stderr (`cli.py:1742`). O stdout contém só JSON.

### Formato do resumo de lote

`total`, `succeeded`, `failed` e `tasks`. Cada entrada de `tasks` tem `index`, `task_id`, `status`, `result`, `failed_stage` e `error`.

## Armadilhas

- **Sem teto de `video_count` no CLI.** A API recusa mais de 5. O CLI aceita qualquer inteiro ≥ 1. Isso é uma divergência entre as duas portas.
- **`--stop-at` é do lote, não de cada tarefa.** Um objeto do manifesto não pode definir `stop_at`.
- **`--custom-audio-file` pula o TTS.** Para legenda sobre esse áudio, use `subtitle_provider=whisper`, que é configuração global.
- **Padrões dependem do `config.toml`.** Dois computadores com `[ui]` diferente geram vídeos diferentes com o mesmo comando. Rode `--help` no seu ambiente para ver os padrões reais.

## Prática

1. Qual código de saída o CLI usa quando um argumento nunca chega ao pipeline?
2. Com `--video-source local`, o que pode vir em `--video-materials`, e o que acontece com um arquivo que está fora de `storage/local_videos`?
3. Quantas tarefas um `--batch-file` aceita, e qual flag é proibida junto com ele?

> [!faq]- Gabarito
> 1. Saída 2. Vale para erros do argparse, para a falta de assunto (`cli.py:724`) e para manifesto inválido (`cli.py:1748`).
> 2. Caminhos de imagem ou vídeo, separados por vírgula. Um arquivo fora de `storage/local_videos` é copiado para lá com um nome `cli-material-<hex>` (`cli.py:1597`).
> 3. Até 100 tarefas e 1 MiB (`cli.py:35-36`). Não se combina com `--task-id` (`cli.py:701-715`).

## Conexões

- [[Visão geral]]: o CLI é uma das três portas.
- [[Pipeline e stop_at]]: o que cada valor de `--stop-at` interrompe.
- [[Portas de entrada]]: a comparação entre CLI, API e WebUI.
- [[Chaves de configuração]]: as chaves `[ui]` que dão os padrões.
- [[Rotas da API]]: os mesmos campos, pelo corpo JSON.
- Canvas: [[02 - Portas de entrada.canvas|Canvas]].
