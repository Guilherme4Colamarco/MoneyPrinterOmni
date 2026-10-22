---
title: API routes
tags: [mapa, referencia, status/unstable]
aliases: [API reference]
lang: en
sources: [app/router.py, app/controllers/ping.py, app/controllers/v1/base.py, app/controllers/v1/video.py, app/controllers/v1/llm.py, app/controllers/base.py, app/asgi.py, app/models/schema.py, app/services/material_upload.py, app/services/bgm.py]
---
# API routes

[[00 - Index|← Index]]

Table of the program's HTTP routes, with the handler, the authentication and what each route returns. Every `/api/v1/*` route asks for `x-api-key` when `app.api_key` is set.

> [!warning] unstable
> The `image_motion` field in the body of `POST /api/v1/videos` came from the upstream Turbo v1.3.9 merge. State to be confirmed. The other routes are on `main`.

## Core idea

There are three groups of routes: **tasks** (create, read, delete), **materials and music** (list and upload files), and **text utilities** (script, terms and metadata, which call the LLM directly with no task). All go through the same `verify_token` (`app/controllers/base.py:47`), except `/ping`.

## How it works

How the routes are mounted: `app/router.py` includes `ping`, `v1.video` and `v1.llm`. Each `v1` module creates its router with `new_router(dependencies=[Depends(base.verify_token)])` (`app/controllers/v1/base.py`, `video.py:43`, `llm.py:19`), and the `/api/v1` prefix is applied there.

### Route table

| Method | Path | Handler (file:line) | Auth | Response and errors |
|---|---|---|---|---|
| GET | `/ping` | `app/controllers/ping.py:12` `ping` | no | `"pong"` |
| POST | `/api/v1/videos` | `video.py:215` `create_video` → `create_task` (`:235`), `stop_at="video"` | `x-api-key` | `200` with `task_id`; `400` validation; `429` queue full |
| POST | `/api/v1/subtitle` | `video.py:222` `create_subtitle`, `stop_at="subtitle"` | `x-api-key` | same as above |
| POST | `/api/v1/audio` | `video.py:229` `create_audio`, `stop_at="audio"` | `x-api-key` | same as above |
| GET | `/api/v1/tasks` | `video.py:285` `get_all_tasks` | `x-api-key` | paginated list; `page` ≥ 1, `page_size` from 1 to 1000 |
| GET | `/api/v1/tasks/{task_id}` | `video.py:310` `get_task` | `x-api-key` | `200` with the state; `404` if it does not exist |
| DELETE | `/api/v1/tasks/{task_id}` | `video.py:333` `delete_video` | `x-api-key` | `200`; `404`; `409` if the task is still running |
| GET | `/api/v1/musics` | `video.py:373` `get_bgm_list` | `x-api-key` | list of local music files |
| POST | `/api/v1/musics` | `video.py:408` `upload_bgm_file` (multipart, field `file`) | `x-api-key` | `200`; `400` if refused; limit 30 MB (`app/services/bgm.py:255`) |
| GET | `/api/v1/video_materials` | `video.py:441` `get_video_materials_list` | `x-api-key` | list of files in `storage/local_videos` |
| POST | `/api/v1/video_materials` | `video.py:477` `upload_video_material_file` (multipart, field `file`) | `x-api-key` | `{"file": "<uuid>.<ext>"}`; `400` if refused; `500` if validation is unavailable |
| GET / HEAD | `/api/v1/stream/{file_path}` | `video.py:512` `stream_video` | `x-api-key` | `200` or `206` with a byte range; `416` if the range is invalid |
| GET / HEAD | `/api/v1/download/{file_path}` | `video.py:578` `download_video` | `x-api-key` | file from `storage/tasks` |
| POST | `/api/v1/scripts` | `llm.py:27` `generate_video_script` → `llm.generate_script` | `x-api-key` | script; `503` if no LLM is configured |
| POST | `/api/v1/terms` | `llm.py:49` `generate_video_terms` → `llm.generate_terms` | `x-api-key` | list of terms |
| POST | `/api/v1/social-metadata` | `llm.py:70` `generate_video_social_metadata` → `llm.generate_social_metadata` | `x-api-key` | title, description and tags |

Static files, outside the API routes:

| Path | Mount | Auth |
|---|---|---|
| `/tasks/*` | `app/asgi.py:309` (`StaticFiles` over `storage/tasks`) | `x-api-key`, through the middleware `protect_generated_task_files` (`app/asgi.py:283`) |
| `/*` | `app/asgi.py:312` (`StaticFiles` over `resource/public`) | none |

### Body of `POST /api/v1/videos`

The body follows `TaskVideoRequest` (`app/models/schema.py:263`), which inherits from `VideoParams` (`schema.py:96`). Main fields, with defaults:

| Field | Default | Limits or values |
|---|---|---|
| `video_subject` | required | text |
| `video_script` | `""` | if filled in, the LLM is not called |
| `video_source` | `"pexels"` | `pexels`, `pixabay`, `coverr`, `local`, `wavespeed`, `volcengine_seedance`, `ofox`, `metaso_minimax`, `muapi`, `loomloom`, `openai_image` (`app/services/task.py:97`) |
| `video_materials` | `null` | list of `{provider, url, duration, source_info}` (`schema.py:86`); for `local`, `url` is the name inside `storage/local_videos` |
| `video_aspect` | `"9:16"` | `9:16`, `16:9`, `1:1` (`schema.py:34`) |
| `video_count` | `1` | `1` to `5` (`schema.py:266`) |
| `video_clip_duration` | `5` | `1` to `15` (`schema.py:267`) |
| `n_threads` | `2` | `1` to `16` (`schema.py:268`) |
| `voice_name` | `""` | `no-voice` for silent audio |
| `bgm_type` | `"random"` | default background music mode |
| `bgm_volume` | `0.2` | number |
| `subtitle_enabled` | `true` | turns subtitles on and off |
| `font_size` | `60` | integer ≥ 1 |
| `paragraph_number` | `1` | `1` to `10` |
| `image_motion` | `"zoom"` | `static` or `zoom` (unstable, `schema.py:116`) |

Validation errors in the body become **400**, not 422: `app/asgi.py:67-86` changes the code and returns the first rejected field in the message.

### Response format

Every JSON response has `status`, `message` and `data` (`schema.py:292`). Task errors put the `request_id` in front of the message, as in `"<id>: task not found"`. The `request_id` comes from the `x-task-id` header, or is generated (`app/controllers/base.py:25`).

## Example / walkthrough

Tested for this documentation, with `api_key` set in the test `config.toml`:

- `GET /ping` → `200`, no key.
- `GET /api/v1/tasks/<id>` without a key → `401`; with a wrong key → `401`; with the right key → `404` when the task is not in memory.
- `GET /tasks/<id>/final-1.mp4` without a key → `401`; with a key → `200`.
- `POST /api/v1/scripts` with a key, no LLM configured → `503 script generation is unavailable`.
- `POST /api/v1/videos` with `video_count: 9` → `400`, message `body.video_count: Input should be less than or equal to 5`.

The full walkthrough is in [[01 - Video via the API]].

## Pitfalls

- **`/ping` does not ask for a key.** It is the only API route without `verify_token`. Do not use it to check authentication.
- **Creating is not finishing.** `POST /videos` answers `200` before the pipeline runs. A failure shows up later, in `GET /tasks/{id}`.
- **The browser does not send `x-api-key`.** A direct link to `/tasks/...` with the key enabled returns `401`. The client must send the header (`config.example.toml:34-35`).
- **`materials` paths come back absolute.** The response of `GET /tasks/{id}` returns `materials` with the server's disk path. Only `videos`, `combined_videos`, `audio_file` and `subtitle_path` become URLs (`video.py:142`).

## Practice

1. Which route does not ask for `x-api-key`, and why?
2. What does `POST /api/v1/videos` return when the client sends `video_count: 9`? And what happens if the pipeline fails later?
3. Which HTTP code does `DELETE /api/v1/tasks/{id}` return for a task with `state=4`?

> [!faq]- Answer key
> 1. `/ping`. It is registered in `app/controllers/ping.py` with a plain router, not `new_router`, so it does not get `verify_token`.
> 2. `400`, from the schema (`app/models/schema.py:266`). A pipeline failure does not change the creation response: it appears later, in `GET /tasks/{id}`.
> 3. `409`, `task is still running` (`app/controllers/v1/video.py:345`).

## Connections

- [[Overview]]: the three entry points, with the API among them.
- [[Entry points]]: what the API validates, compared with the WebUI and the CLI.
- [[Task state and queue]]: the 404, 409 and 429 codes.
- [[Configuration and locks]]: `api_key` and the allowed paths.
- [[CLI flags]]: the same fields, from the command line.
- [[01 - Video via the API]]: the walkthrough with a real response.
