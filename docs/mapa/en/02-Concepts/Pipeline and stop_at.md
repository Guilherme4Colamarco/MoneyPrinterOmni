---
title: Pipeline and stop_at
tags: [mapa, conceito, status/unstable]
aliases: [Pipeline]
lang: en
sources: [app/services/task.py, app/services/llm.py, app/services/voice.py, app/services/subtitle.py, app/services/material.py, app/services/video.py, app/services/upload_post.py, app/services/task_artifacts.py, cli.py]
---
# Pipeline and stop_at

[[00 - Index|← Index]]

The pipeline is a fixed sequence of steps. `stop_at` says which step to stop after, and the task returns that step's result.

> [!warning] unstable
> Image motion (`image_motion`, options `static` and `zoom`) came from the upstream Turbo v1.3.9 merge. It appears in the materials and video steps (`app/services/video.py:1955`, `app/services/material.py:1740`). State to be confirmed. The rest of the pipeline is on `main`.

## Core idea

`_run_pipeline` (`app/services/task.py:1519`) runs the steps in a fixed order: script, terms, audio, subtitles, materials, video and publishing. Each step writes a file or a state field. The real order is **script → terms → audio → subtitles → materials → video → publishing**. Audio comes before subtitles because the Edge subtitle provider uses the timeline that TTS produces.

## How it works

**Preflight (before any paid call).** Runs between `task.py:1532` and `task.py:1650`:

- the state moves to `processing` at 5% (`task.py:1532`);
- with `stop_at="video"` and subtitles on, the colours are validated (`task.py:1537`);
- with `stop_at` set to `materials` or `video`, the video source must be in `_SUPPORTED_VIDEO_SOURCES` (`task.py:97`, checked at `task.py:1543`);
- provider keys for Seedance, OFox, Metaso, MuAPI and openai_image (only for `materials` and `video`);
- background music (`sonilo` or `elevenlabs`, `_VIDEO_MUSIC_PROVIDERS` at `task.py:79`): key, prompt length and, when available, `validate_generation_access()`. Only for `video`;
- ffmpeg: `utils.check_ffmpeg_ready()` (`task.py:1650`), except for `script` and `terms`.

A failure in any preflight check calls `_mark_task_failed(..., "preflight", ...)`.

**Steps.**

| # | `stop_at` | Function (file:line) | Calls | Writes | Progress |
|---|---|---|---|---|---|
| 1 | `script` | `generate_script` (`task.py:358`) | `llm.generate_script` (`app/services/llm.py:894`). Skipped if `video_script` was given | nothing on disk | 10 |
| 2 | `terms` | `generate_terms` (`task.py:379`) | `llm.generate_terms` (`llm.py:1023`), `amount=8` with `match_materials_to_script`, otherwise 5. Skipped for `local`. Then `twelvelabs.rerank_terms_by_subject` (`app/services/twelvelabs.py:113`), if configured | `script.json` via `save_script_data` (`task.py:424`) | 20 |
| 3 | `audio` | `generate_audio` (`task.py:551`) | `voice.tts` (`app/services/voice.py:1138`) → `_single_tts` (`voice.py:640`). With `no-voice`, `generate_silent_audio` (`voice.py:593`) | `audio.mp3` (`task.py:601`) | 30 |
| 4 | `subtitle` | `generate_subtitle` (`task.py:649`) | `edge` provider → `voice.create_subtitle` (`voice.py:3679`); `whisper` → `subtitle.create` (`app/services/subtitle.py:61`) and `correct` (`subtitle.py:230`) | `subtitle.srt` (`task.py:661`) | 40 |
| 5 | `materials` | `get_video_materials` (`task.py:723`) | `local` → `preprocess_video` (`app/services/video.py:1955`); the rest → `material.download_videos` (`app/services/material.py:2161`) | material cache and `material_sources` in `script.json` | 40 → 50 |
| 6 | `video` | `generate_final_videos` (`task.py:980`) | `video.combine_videos` (`video.py:973`), optional BGM (`app/services/sonilo.py:392` or `elevenlabs_music.py:388`), `video.generate_video` (`video.py:1569`) | `combined-N.mp4`, `final-N.mp4` (`task.py:1026`, `task.py:1082`) | 50 → 100 |
| 7 | (end) | `_schedule_cross_post` (`task.py:1463`) → `_run_cross_post` (`task.py:1259`) | `llm.generate_social_metadata` (`llm.py:1343`), `upload_post.cross_post_video` (`app/services/upload_post.py:396`). Pool of 2 threads | `cross_post_*` fields in the state | not applicable |

Publishing runs after the state is already `complete` (`task.py:1883` schedules it).

**What each `stop_at` returns.** `start()` returns that step's dictionary:

- `script` → `{"script"}` (`task.py:1682`);
- `terms` → `{"script", "terms"}` (`task.py:1701`);
- `audio` → `{"audio_file", "audio_duration"}` (`task.py:1757`);
- `subtitle` → `{"subtitle_path"}` (`task.py:1777`);
- `materials` → `{"materials"}` (`task.py:1803`);
- `video` → the full dictionary: `videos`, `combined_videos`, `audio_file`, `subtitle_path`, `materials`, `cross_post_state` and so on.

In the API, `stop_at` is fixed per route: `/videos` uses `video`, `/subtitle` uses `subtitle`, `/audio` uses `audio` (`app/controllers/v1/video.py:215-229`). The other values exist only in the CLI. See [[CLI flags]].

**Errors.** `_mark_task_failed` (`task.py:260`) writes `failed_stage` (`preflight`, `script`, `terms`, `audio`, `subtitle`, `materials`, `video`, `pipeline`) and the error text. LLM errors come back as a string that starts with `Error: `. The pipeline recognises that marker only when the script was generated by the LLM (`task.py:1663`).

**Progress.** Each step writes its own percentage. Materials and video use a reporter that interpolates between the two values (`task.py:328`).

## Example / walkthrough

A `POST /api/v1/subtitle` runs audio and subtitles and stops. It makes no material and no video. A `POST /api/v1/audio` runs only up to step 3. From the CLI, `--stop-at audio` returns `{"audio_file", "audio_duration"}`, as shown in [[02 - Video via the CLI]].

For a full task with local material, the files in `storage/tasks/<id>/` are `script.json`, `audio.mp3`, `subtitle.srt` (if subtitles are on), `combined-N.mp4` and `final-N.mp4`. See [[01 - Video via the API]].

> [!warning] unstable
> With `image_motion` (default `zoom`), material images get movement. The option comes from `VideoParams.image_motion` (`app/models/schema.py:116`) and from `--image-motion` in the CLI (`cli.py:444`). See [[CLI flags]].

## Pitfalls

- **A passing preflight does not guarantee success.** It checks keys and format only. A valid key with an exhausted quota fails in the next step, with the matching `failed_stage`.
- **Subtitles do not fall back to Whisper.** If the `edge` provider does not produce the file, the task continues without subtitles. The code says so explicitly (`app/services/task.py:649-722`). For subtitles without TTS timing, the provider must be `whisper`, and that is a global setting, not per task.
- **A user script that starts with `Error: `** is not treated as an error, because the marker only applies to LLM-generated scripts (`task.py:1663`).
- **A paid-provider failure keeps the remote id.** Fields such as `volcengine_seedance_task_id` or `muapi_task_id` stay in the state so the result can be recovered later.

## Practice

1. Write the order of the pipeline steps without looking at the table.
2. With `match_materials_to_script` on, how many search terms does the LLM generate, and where is that decided?
3. What does the API return when you call `POST /api/v1/subtitle` and the Edge subtitle provider fails?

> [!faq]- Answer key
> 1. Script, terms, audio, subtitles, materials, video and publishing. Subtitles come after audio because they use the TTS timeline.
> 2. Eight. The decision is in `generate_terms` (`app/services/task.py:379`): `amount=8 if params.match_materials_to_script else 5`.
> 3. Success without subtitles. `subtitle_path` comes back empty and the task continues. There is no fallback to Whisper.

## Connections

- [[Overview]]: the three entry points that call this pipeline.
- [[Task state and queue]]: how the state and the queue follow these steps.
- [[Configuration and locks]]: the keys that choose providers.
- [[API routes]] and [[CLI flags]]: the `stop_at` values in each entry point.
- Canvas: [[01 - Pipeline.canvas|Canvas]].
