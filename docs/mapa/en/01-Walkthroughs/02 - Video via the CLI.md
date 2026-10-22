---
title: 02 - Video via the CLI
tags: [mapa, percurso, status/stable]
aliases: [CLI walkthrough]
lang: en
sources: [cli.py, app/services/task.py, app/models/schema.py, app/services/task_artifacts.py]
---
# 02 - Video via the CLI

[[00 - Index|← Index]]

The CLI is the most direct entry point: one command, one task, one JSON line on output. There is no queue and no configuration lock. The call is synchronous.

## Core idea

`cli.py` builds the parameters, copies local files into the program's storage, and calls `tm.start(...)` in the same process with `allow_server_file_input=True`. The process ends only when the pipeline ends. The result goes to stdout as one line of JSON.

## How it works

1. **Input.** `parse_args` (`cli.py:250`) defines the flags. The accepted values are fixed in constants: `_PIPELINE_STAGES` (`cli.py:33`) and `_CLI_VIDEO_SOURCES` (`cli.py:40`). A value outside the list is an argument error, exit 2.
2. **Build.** `build_video_params` (`cli.py:916`) creates the `VideoParams`. Without `--video-subject` or `--video-script`, `parser.error` exits with 2 (`cli.py:724`). `--video-source local` with `--stop-at terms` also exits with 2 (`cli.py:726`).
3. **Local files.** `prepare_cli_files` (`cli.py:1643`) validates the materials. Files outside `storage/local_videos` are copied there as `cli-material-<hex>.<ext>` (`_prepare_cli_materials`, `cli.py:1597`).
4. **Run.** `run_cli` (`cli.py:1735`) calls `tm.start(task_id=..., params=..., stop_at=args.stop_at, allow_server_file_input=True)` (`cli.py:1766`). The `task_id` is generated, or comes from `--task-id`.
5. **Output.** Success: one line `{"task_id": ..., "result": {...}}` on stdout and exit 0 (`cli.py:1791-1792`). Logs go to stderr (`cli.py:1742`).

## Example / walkthrough

The commands below were run for this documentation, with `MPT_HOME` in a scratch folder and ffmpeg installed.

**Full video, local material, no voice.**

```sh
uv run python cli.py \
  --video-script "Este é um roteiro de teste para o percurso pelo CLI. Ele serve para conferir o JSON de saída." \
  --voice-name no-voice --video-source local \
  --video-materials "./clip.mp4" --stop-at video
```

Output (stdout), paths shortened:

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

Here the CLI returns absolute disk paths, not URLs. Exit 0. During the run, the log warned that the clip (4 s) was shorter than the audio (8 s), so it would be looped (`app/services/video.py:1245`).

**Stop after audio (`--stop-at audio`).** The output holds only that stage's result:

```sh
uv run python cli.py --video-script "Roteiro curto para o teste de áudio." --voice-name no-voice --stop-at audio
```

```json
{"task_id": "3a942da8-f38b-4cec-a65f-cc2bf8045a53", "result": {"audio_file": "storage/tasks/3a942da8-.../audio.mp3", "audio_duration": 4}}
```

Exit 0. No video was made, and ffmpeg was not needed for the video step.

**Two error codes.**

```sh
uv run python cli.py --video-subject "teste" --video-source foo   # exit 2
```

argparse rejects the value before any task starts: `invalid choice: 'foo' (choose from 'pexels', ...)`. No JSON is printed.

```sh
uv run python cli.py --video-subject "Teste de falha" --stop-at script   # exit 1, no LLM key
```

The LLM returns `Error: moonshot: api_key is not set...`. The pipeline marks the failure at the `script` stage and the CLI exits 1. Stdout is empty, because there is no video to list.

Exit code summary:

| Exit | When | What appears on stdout |
|---|---|---|
| 0 | task finished | JSON with `task_id` and `result` |
| 1 | pipeline failure or unexpected exception | nothing, or the partial JSON if `videos` already exist |
| 2 | invalid argument, invalid manifest, or missing subject | nothing |

## Pitfalls

- **Paths outside `storage/local_videos` are copied.** The video uses the copy. Check `storage/local_videos` if the disk fills up.
- **The CLI accepts absolute paths for custom audio.** Only here, because `allow_server_file_input=True` (`cli.py:1773`). The API and the WebUI do not (see [[Entry points]]).
- **`--stop-at` applies to the whole batch.** In `--batch-file`, each manifest object does not set `--stop-at`; it comes from the command line (`cli.py:1191`).
- **`stop_at=terms` with local material is an error.** There is no terms stage for `local`, so the CLI rejects the combination with exit 2 (`cli.py:726`).

## Practice

1. Which exit code does the CLI use when argparse refuses a value?
2. Why does `--stop-at audio` not need an LLM when `--video-script` is given?
3. With `--video-source local`, what happens to a file that lives outside `storage/local_videos`?

> [!faq]- Answer key
> 1. Exit 2 (argparse's `parser.error`). No JSON is printed.
> 2. Because the script came from `--video-script`. `generate_script` only calls the LLM when the script is empty (`app/services/task.py:358`).
> 3. It is copied to `storage/local_videos/cli-material-<hex>.<ext>` (`cli.py:1597`), and the copy is what goes into the video.

## Connections

- [[Overview]]: the CLI is the third of the three entry points.
- [[Pipeline and stop_at]]: what each `--stop-at` value stops, and what each stage writes.
- [[Entry points]]: the comparison between API, WebUI and CLI.
- [[CLI flags]]: the full flag list, defaults and exit codes.
- [[01 - Video via the API]]: the same pipeline over HTTP.
- Canvas: [[01 - Pipeline.canvas|Canvas]].
