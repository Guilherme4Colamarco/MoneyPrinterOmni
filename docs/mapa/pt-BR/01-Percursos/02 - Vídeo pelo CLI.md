---
title: 02 - Vídeo pelo CLI
tags: [mapa, percurso, status/stable]
aliases: [Percurso pelo CLI]
lang: pt-BR
sources: [cli.py, app/services/task.py, app/models/schema.py, app/services/task_artifacts.py]
---
# 02 - Vídeo pelo CLI

[[00 - Índice|← Índice]]

O CLI é a porta mais direta: um comando, uma tarefa, um JSON na saída. Não há fila nem trava de configuração. A chamada é síncrona.

## Ideia central

`cli.py` monta os parâmetros, copia os arquivos locais para dentro do programa e chama `tm.start(...)` no mesmo processo, com `allow_server_file_input=True`. O processo só termina quando o pipeline termina. O resultado vai para o stdout como uma linha de JSON.

## Como funciona

1. **Entrada.** `parse_args` (`cli.py:250`) define as flags. Os valores aceitos ficam em constantes: `_PIPELINE_STAGES` (`cli.py:33`) e `_CLI_VIDEO_SOURCES` (`cli.py:40`). Valor fora da lista é erro de argumento, com saída 2.
2. **Montagem.** `build_video_params` (`cli.py:916`) cria o `VideoParams`. Sem `--video-subject` nem `--video-script`, `parser.error` sai com 2 (`cli.py:724`). `--video-source local` com `--stop-at terms` também sai com 2 (`cli.py:726`).
3. **Arquivos locais.** `prepare_cli_files` (`cli.py:1643`) valida os materiais. Quem vem de fora de `storage/local_videos` é copiado para lá com o nome `cli-material-<hex>.<ext>` (`_prepare_cli_materials`, `cli.py:1597`).
4. **Execução.** `run_cli` (`cli.py:1735`) chama `tm.start(task_id=..., params=..., stop_at=args.stop_at, allow_server_file_input=True)` (`cli.py:1766`). O `task_id` é gerado, ou vem de `--task-id`.
5. **Saída.** Sucesso: uma linha `{"task_id": ..., "result": {...}}` no stdout e saída 0 (`cli.py:1791-1792`). Logs vão para o stderr (`cli.py:1742`).

## Exemplo / percurso

Os comandos abaixo foram executados nesta documentação, com `MPT_HOME` em uma pasta de teste e ffmpeg instalado.

**Vídeo completo, com material local e sem voz.**

```sh
uv run python cli.py \
  --video-script "Este é um roteiro de teste para o percurso pelo CLI. Ele serve para conferir o JSON de saída." \
  --voice-name no-voice --video-source local \
  --video-materials "./clip.mp4" --stop-at video
```

Saída (stdout), com os caminhos encurtados:

```json
{"task_id": "a7b55e12-7b16-46cb-9edd-6ca06b2afcad", "result": {
  "videos": ["storage/tasks/a7b55e12-.../final-1.mp4"],
  "combined_videos": ["storage/tasks/a7b55e12-.../combined-1.mp4"],
  "script": "Este é um roteiro de teste para o percurso pelo CLI. Ele serve para conferir o JSON de saída.",
  "terms": "",
  "audio_file": "storage/tasks/a7b55e12-.../audio.mp3",
  "audio_duration": 8,
  "subtitle_path": "storage/tasks/a7b55e12-.../subtitle.srt",
  "materials": ["storage/local_videos/cli-material-7bc07fd9c63148cf9dea3af5dc6c2313.mp4"],
  "cross_post_state": null, "cross_post_results": null, "cross_post_error": null,
  "cross_post_owner": null, "warnings": null}}
```

Neste caso o CLI devolve caminhos absolutos do disco, não URLs. Saída 0. Na execução, o log avisou que o clipe (4 s) era menor que o áudio (8 s) e que ele seria repetido (`video.py:1245`).

**Só até o áudio (`--stop-at audio`).** A saída tem só o resultado daquele estágio:

```sh
uv run python cli.py --video-script "Roteiro curto para o teste de áudio." --voice-name no-voice --stop-at audio
```

```json
{"task_id": "3a942da8-f38b-4cec-a65f-cc2bf8045a53", "result": {"audio_file": "storage/tasks/3a942da8-.../audio.mp3", "audio_duration": 4}}
```

Saída 0. Nenhum vídeo foi gerado, e o ffmpeg nem precisou ser chamado para o vídeo.

**Dois códigos de erro.**

```sh
uv run python cli.py --video-subject "teste" --video-source foo   # saída 2
```

O argparse recusa o valor antes de qualquer tarefa começar: `invalid choice: 'foo' (choose from 'pexels', ...)`. Nenhum JSON é impresso.

```sh
uv run python cli.py --video-subject "Teste de falha" --stop-at script   # saída 1, sem chave do LLM
```

O LLM devolve `Error: moonshot: api_key is not set...`. O pipeline marca a falha no estágio `script` e o CLI sai com 1. O stdout fica vazio, porque não há vídeo para listar.

Resumo dos códigos:

| Saída | Quando | O que aparece no stdout |
|---|---|---|
| 0 | tarefa concluída | JSON com `task_id` e `result` |
| 1 | falha do pipeline ou exceção inesperada | nada, ou o JSON parcial se já houver `videos` |
| 2 | argumento inválido, manifesto inválido ou falta de assunto | nada |

## Armadilhas

- **Caminho fora de `storage/local_videos` é copiado.** O arquivo original não é usado depois. Confira `storage/local_videos` se o disco encher.
- **O CLI aceita caminhos absolutos para áudio customizado.** Isso só existe aqui, porque `allow_server_file_input=True` (`cli.py:1773`). API e WebUI não aceitam (veja [[Portas de entrada]]).
- **`--stop-at` vale para o lote inteiro.** Em `--batch-file`, cada objeto do manifesto não define `--stop-at`; ele vem da linha de comando (`cli.py:1191`).
- **`stop_at=terms` com material local é erro.** A etapa de termos não existe para `local`, então o CLI recusa a combinação com saída 2 (`cli.py:726`).

## Prática

1. Qual saída de código o CLI usa quando o argparse recusa um valor?
2. Por que `--stop-at audio` não precisa de LLM quando há `--video-script`?
3. Com `--video-source local`, o que acontece com um arquivo que está fora de `storage/local_videos`?

> [!faq]- Gabarito
> 1. Saída 2 (`parser.error` do argparse). Nenhum JSON é impresso.
> 2. Porque o roteiro foi passado com `--video-script`. `generate_script` só chama o LLM quando o roteiro está vazio (`app/services/task.py:358`).
> 3. É copiado para `storage/local_videos/cli-material-<hex>.<ext>` (`cli.py:1597`), e a cópia é que entra no vídeo.

## Conexões

- [[Visão geral]]: o CLI é a terceira das três portas.
- [[Pipeline e stop_at]]: o que `--stop-at` interrompe e o que cada estágio grava.
- [[Portas de entrada]]: a comparação entre API, WebUI e CLI.
- [[Flags do CLI]]: a lista completa de flags, padrões e códigos de saída.
- [[01 - Vídeo pela API]]: o mesmo pipeline, por HTTP.
- Canvas: [[01 - Pipeline.canvas|Canvas]].
