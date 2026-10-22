---
title: CLI flags
tags: [mapa, referencia, status/unstable]
aliases: [CLI reference]
lang: en
sources: [cli.py, app/models/schema.py, app/services/task.py, app/config/config.py]
---
# CLI flags

[[00 - Index|← Index]]

The flags of `cli.py`, grouped the way the parser groups them, with defaults taken from the real `--help` output, the exit codes and the batch limits.

> [!warning] unstable
> The `--image-motion` flag (`cli.py:444`) came from the upstream Turbo v1.3.9 merge. State to be confirmed. The other flags are on `main`.

## Core idea

The CLI accepts the same task settings as the API, but as flags. The accepted values are fixed by constants in `cli.py` itself (`_PIPELINE_STAGES` at `cli.py:33`, `_CLI_VIDEO_SOURCES` at `cli.py:40`). When a flag is not passed, the value comes from `[ui]` in `config.toml`, or from the schema default, as noted on each line.

## How it works

How to read the tables. The value in parentheses is the default shown by `--help`. When the default says "`[ui]`…", the value comes from `config.toml`, section `[ui]`. When there is no value in `[ui]`, the second value cited applies.

### Content (script)

| Flag | Default | Note |
|---|---|---|
| `--video-subject TEXT` | `""` | required, unless `--video-script` is given (`cli.py:724`) |
| `--video-script TEXT` | `""` | full script; skips LLM script generation |
| `--video-terms LIST` | generated | comma-separated terms |
| `--video-language CODE` | auto-detect | e.g. `zh-CN`, `en-US` |
| `--paragraph-number N` | `1` | from 1 to 10 (`cli.py:79`) |
| `--video-script-prompt TEXT` | none | extra requirements for the LLM |
| `--custom-system-prompt TEXT` | none | replaces the default LLM system prompt |

### Material and pipeline

| Flag | Default | Note |
|---|---|---|
| `--video-source` | `pexels` | `pexels`, `pixabay`, `coverr`, `wavespeed`, `volcengine_seedance`, `ofox`, `metaso_minimax`, `muapi`, `openai_image`, `local` (`cli.py:40-50`). Does not include `loomloom` |
| `--video-materials PATH[,PATH...]` | `""` | for `local`: comma-separated images or videos |
| `--stop-at STEP` | `video` | `script`, `terms`, `audio`, `subtitle`, `materials`, `video` (`cli.py:33`). Applies to the whole batch |
| `--confirm-wavespeed-charge` | off | confirms the WaveSpeed charge |
| `--confirm-seedance-charge` | off | confirms the Seedance charge |
| `--confirm-ofox-charge` | off | confirms the OFox charge |
| `--confirm-metaso-minimax-charge` | off | confirms the Metaso MiniMax charge |
| `--confirm-muapi-charge` | off | confirms the MuAPI charge |

Refused combination: `--video-source local` with `--stop-at terms` exits with 2 (`cli.py:726`).

### Video

| Flag | Default | Note |
|---|---|---|
| `--video-count N` | `1` | minimum 1; the CLI has no upper limit, but the API caps it at 5 |
| `--video-aspect` | `9:16` | `9:16`, `16:9`, `1:1` |
| `--video-fit-mode` | `cover` | `cover` or `contain` (black bars) |
| `--video-concat-mode` | `random` | `random` or `sequential` |
| `--image-motion` | `zoom` | `static` or `zoom`; motion for images (unstable) |
| `--video-transition-mode` | `none` | `shuffle`, `fade-in`, `fade-out`, `slide-in`, `slide-out`, `zoom-in`, `zoom-out` |
| `--video-clip-duration S` | `5` | maximum seconds per clip, minimum 1 |
| `--video-clip-speed V` | `1.0` | from 0.5 to 2.0 |
| `--match-materials-to-script` | off | `--no-match-materials-to-script` turns it off; enables 8 terms instead of 5 |
| `--n-threads N` | `2` | FFmpeg threads, minimum 1 |

### Audio and music

| Flag | Default | Note |
|---|---|---|
| `--voice-name` | `[ui].voice_name`, else `zh-CN-XiaoxiaoNeural-Female` | `no-voice` for silent audio; prefixes `gemini:`, `mimo:`, `elevenlabs:`, `chatterbox:`, `kokoro:`, `voxcpm:` |
| `--voice-volume V` | `[ui].voice_volume`, else `1.0` | number ≥ 0 |
| `--voice-rate V` | `[ui].voice_rate`, else `1.0` | number > 0 |
| `--custom-audio-file PATH` | none | MP3, WAV, M4A, AAC, FLAC or OGG. Skips TTS. A relative path is resolved from the current directory |
| `--bgm-type` | `random` | `none`, `random`, `custom`, `sonilo`, `elevenlabs` |
| `--sonilo-bgm-prompt TEXT` | empty | legacy; up to 2000 characters |
| `--video-music-prompt TEXT` | empty | prompt for the chosen music provider (`sonilo` or `elevenlabs`) |
| `--bgm-file NAME` | none | file inside `storage/bgm` or `resource/songs` |
| `--bgm-volume V` | `0.2` | number ≥ 0 |

### Subtitles

| Flag | Default | Note |
|---|---|---|
| `--subtitle-enabled` / `--no-subtitle-enabled` | `[ui].subtitle_enabled`, else on | turns subtitles on or off |
| `--font-name FILE` | `[ui].font_name`, else `STHeitiMedium.ttc` | file inside `resource/fonts` |
| `--subtitle-position` | `[ui].subtitle_position`, else `bottom` | `top`, `center`, `bottom`, `two_thirds_bottom`, `custom` |
| `--subtitle-display-mode` | `[ui]`, else `sentence` | `sentence` or `word_by_word` |
| `--subtitle-animation` | `[ui]`, else `none` | `none` or `pop_spring` |
| `--custom-position P` | `[ui]`, else `70` | 0 to 100; used with `--subtitle-position custom` |
| `--text-fore-color #RRGGBB` | `[ui]`, else `#FFFFFF` | quote it in the shell |
| `--font-size N` | `[ui]`, else `60` | integer |
| `--stroke-color #RRGGBB` | `[ui]`, else `#000000` | outline colour |
| `--stroke-width N` | `[ui]`, else `1.5` | number ≥ 0 |
| `--subtitle-background-enabled` / `--no-...` | `[ui]`, else off | background behind the subtitle |
| `--subtitle-background-color #RRGGBB` | `[ui]` | background colour |
| `--rounded-subtitle-background` / `--no-...` | `[ui]`, else off | rounded background corners |

### Execution

| Flag | Default | Note |
|---|---|---|
| `--task-id UUID` | generated | name of the folder in `storage/tasks/`. Cannot be combined with `--batch-file` |
| `--batch-file PATH` | none | JSON (array) or JSONL. At most 100 tasks and 1 MiB (`cli.py:35-36`). Each object overrides `VideoParams` fields; an unknown field is refused |

## Example / walkthrough

A real command, run for this documentation:

```sh
uv run python cli.py \
  --video-script "Este é um roteiro de teste para o percurso pelo CLI." \
  --voice-name no-voice --video-source local \
  --video-materials "./clip.mp4" --stop-at video
```

Exit 0, on stdout: `{"task_id": "...", "result": {"videos": [...], "combined_videos": [...], "script": "...", "terms": "", "audio_file": "...", "audio_duration": 8, "subtitle_path": "...", "materials": [...], "cross_post_state": null, ...}}`. See [[02 - Video via the CLI]].

### Exit codes

| Code | When | Stdout |
|---|---|---|
| `0` | task finished (or batch with no failures) | JSON with `task_id` and `result`. In a batch, a summary |
| `1` | pipeline failure or unexpected exception; in a batch, at least one task failed (`cli.py:1732`) | nothing, or the partial JSON if `videos` already exist (`cli.py:1788`) |
| `2` | invalid argument (argparse), refused combination, invalid manifest | nothing |

Logs go to stderr (`cli.py:1742`). Stdout only carries JSON.

### Batch summary format

`total`, `succeeded`, `failed` and `tasks`. Each entry in `tasks` has `index`, `task_id`, `status`, `result`, `failed_stage` and `error`.

## Pitfalls

- **No `video_count` ceiling in the CLI.** The API refuses more than 5. The CLI accepts any integer of 1 or more. That is a gap between the two entry points.
- **`--stop-at` belongs to the batch, not to each task.** A manifest object cannot set `stop_at`.
- **`--custom-audio-file` skips TTS.** For subtitles over that audio, use `subtitle_provider=whisper`, which is a global setting.
- **Defaults depend on `config.toml`.** Two machines with different `[ui]` sections make different videos from the same command. Run `--help` on your own setup to see the real defaults.

## Practice

1. Which exit code does the CLI use when an argument never reaches the pipeline?
2. With `--video-source local`, what can go into `--video-materials`, and what happens to a file outside `storage/local_videos`?
3. How many tasks can a `--batch-file` hold, and which flag cannot be combined with it?

> [!faq]- Answer key
> 1. Exit 2. This covers argparse errors, the missing subject (`cli.py:724`) and an invalid manifest (`cli.py:1748`).
> 2. Paths to images or videos, separated by commas. A file outside `storage/local_videos` is copied there with a `cli-material-<hex>` name (`cli.py:1597`).
> 3. Up to 100 tasks and 1 MiB (`cli.py:35-36`). It cannot be combined with `--task-id` (`cli.py:701-715`).

## Connections

- [[Overview]]: the CLI is one of the three entry points.
- [[Pipeline and stop_at]]: what each `--stop-at` value stops.
- [[Entry points]]: the comparison between CLI, API and WebUI.
- [[Configuration keys]]: the `[ui]` keys that provide the defaults.
- [[API routes]]: the same fields, through the JSON body.
- Canvas: [[02 - Entry points.canvas|Canvas]].
