---
title: Music and publishing
tags: [mapa, integracoes, status/stable]
lang: en
sources: [app/services/bgm.py, app/services/task.py, app/services/upload_post.py, app/services/llm.py, app/services/sonilo.py, app/services/elevenlabs_music.py, app/asgi.py, config.example.toml]
---
# Music and publishing

[[00 - Index|← Index]]

The soundtrack can be a local file or AI-generated. After the render, the video can be sent to platforms in the background.

## Core idea

Music and publishing are optional steps that run around the pipeline. The soundtrack goes into the video assembly. Publishing runs **after** the task finishes, in a separate thread. If the process restarts in the middle, the upload is not resumed.

## How it works

### Soundtrack

1. `should_use_bgm` (`app/services/bgm.py:73`) decides whether there is a soundtrack.
2. Local track: `list_bgm_files` (`bgm.py:361`) combines the built-in songs in `resource/songs` and the uploads in `storage/bgm` (`uploaded_bgm_dir`, `bgm.py:90`).
3. AI track: `_VIDEO_MUSIC_PROVIDERS` (`app/services/task.py:79`) registers two providers.
   - `sonilo` (`app/services/sonilo.py`): key `sonilo_api_key` or env `SONILO_API_KEY`, prompt up to 2000 characters (`MAX_PROMPT_LENGTH`, `sonilo.py:25`).
   - `elevenlabs` (`app/services/elevenlabs_music.py`): key `[elevenlabs] api_key`, `music_model_id = "music_v2"`, prompt up to 1000 characters (`elevenlabs_music.py:24`).
4. Preflight (`task.py:1609` onward): key present, prompt within the limit, and `validate_generation_access()` when it exists (`elevenlabs_music.py:177`, called from `task.py:1639`). All of this runs before any paid call.
5. In the `video` stage, `generate_final_videos` (`task.py:980`) calls `service.generate_bgm` for each index. The file is written as `<bgm_type>-bgm-i.m4a` (Sonilo) or `.mp3` (ElevenLabs).

### Publishing

1. When the task finishes, `_schedule_cross_post` (`task.py:1463`) submits `_run_cross_post_with_slot` to `_cross_post_executor` (`task.py:45`), which has `max_workers=2`.
2. A `BoundedSemaphore` caps pending uploads at `upload_post_max_pending_tasks`, default 10 (`task.py:51-53`; `config.example.toml:603`).
3. `_run_cross_post` (`task.py:1259`) calls `llm.generate_social_metadata` (`app/services/llm.py:1343`), which returns title, caption and hashtags. Then it calls `upload_post.cross_post_video` (`app/services/upload_post.py:396`).
4. `UploadPostService` (`upload_post.py:23`) uses `API_BASE = "https://api.upload-post.com"` (`:24`), with the header `Authorization: Apikey ...`. Default platforms: TikTok and Instagram (`config.example.toml:587`).
5. At API boot, `recover_interrupted_cross_posts` (`task.py:1217`), called from `app/asgi.py:45`, marks uploads that were active as failed. The generated videos are kept.

## Example / walkthrough

A task with `bgm_type = "elevenlabs"` and `video_music_prompt = "calm piano"`:

1. Preflight validates the key and the prompt size.
2. The `video` stage writes `storage/tasks/<id>/elevenlabs-bgm-0.mp3` and mixes it into `final-0.mp4`.
3. With `upload_post_enabled = true`, the task ends as `complete`. The upload goes to the executor, and the state keeps `cross_post_state`. If the process dies before the upload finishes, the next boot marks it `failed`.

## Pitfalls

- **Prompt too long.** Sonilo accepts 2000 characters, ElevenLabs 1000. Preflight refuses before any charge.
- **Uploads are not resumed.** A restart in the middle of an upload marks it `failed`. It is not retried.
- **Pool of 2 threads.** Many tasks with automatic publishing wait in line. This is not a persistent queue service.
- **Redis and `ast.literal_eval`.** State values are read with `ast.literal_eval`. Redis must be private and trusted.

## Practice

1. How many publications can run in parallel, and what limits the number of pending ones?
2. What does `recover_interrupted_cross_posts` do with an upload that was `processing` when the process died?
3. Which setting in `config.example.toml` defines the default publishing platforms?

> [!faq]- Answer key
> 1. Two threads (`max_workers=2`, `task.py:45`). The pending limit comes from `upload_post_max_pending_tasks`, default 10 (`task.py:51`).
> 2. It marks it `failed`. It does not resume it, and it keeps the videos already generated (`task.py:1217`).
> 3. `upload_post_platforms` (`config.example.toml:587`), default `["tiktok", "instagram"]`.

## Connections

- [[Video material]] — the stage that produces the video.
- [[Pipeline and stop_at]] — when publishing runs.
- [[Task state and queue]] — the `cross_post_*` fields.
- [[Configuration keys]] — `upload_post_*` and `[elevenlabs]`.
- [[03 - Integrations.canvas|Canvas]]
