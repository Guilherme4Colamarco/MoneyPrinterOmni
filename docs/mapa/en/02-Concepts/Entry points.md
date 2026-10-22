---
title: Entry points
tags: [mapa, conceito, status/stable]
aliases: [API, WebUI and CLI]
lang: en
sources: [app/asgi.py, app/controllers/base.py, app/controllers/v1/video.py, app/services/webui_task.py, app/services/task.py, cli.py, webui.sh, app/launcher.py]
---
# Entry points

[[00 - Index|← Index]]

The API, the WebUI and the CLI are three ways to ask for the same thing. They differ in validation, authentication, queueing, the configuration lock and what they accept as a file path.

## Core idea

All three entry points call `task.start()` (`app/services/task.py:1907`). Before that, each one does its own part. The API validates the HTTP request and asks for authentication. The WebUI has a one-task queue and takes the configuration lock. The CLI runs synchronously, with no queue, and is the only one that accepts files outside the task folder.

## How it works

| Aspect | API (`/api/v1`) | WebUI (Streamlit) | CLI (`cli.py`) |
|---|---|---|---|
| Entry | `create_task` (`app/controllers/v1/video.py:235`) | `webui_task.submit_generation` (`app/services/webui_task.py:138`) | `run_cli` (`cli.py:1735`) |
| Authentication | `x-api-key` when `app.api_key` is set (`app/controllers/base.py:47`). Without the key: 401. Also covers `/tasks/*` (`app/asgi.py:283`) | none on the page. By default it listens on `127.0.0.1` (`webui.sh:16`) | none. Runs with the permissions of whoever runs it |
| Validation | pydantic schema: an error becomes **400** (`app/asgi.py:67`). Also subtitle colours and the font path, also **400** (`video.py:251-254`) | page widgets, then the pipeline | `argparse` (exit 2), `build_video_params` (2), `prepare_cli_files` (copies materials) |
| `video_source` | not validated by the route. An invalid value fails at the preflight (`task.py:1543`) | by the widget | by the argparse `choices` (exit 2) |
| Queue | yes: `add_task`, with 429 when full | yes: one task at a time (`webui_task.py:24`) | no: the call is synchronous |
| Configuration lock | **no** | **yes**: `runtime_config_lock` (`webui_task.py:94`) | **no** |
| User file paths | only inside `storage/tasks/<id>/`; fails in the pipeline if outside | uploads go to `storage/tasks/<id>/` | accepts absolute paths. Uses `allow_server_file_input=True` (`cli.py:1766`, `:1773`) |
| Output | JSON `{status, message, data}` and polling with `GET /tasks/{id}` | page with state and live logs | one JSON line on stdout; logs on stderr |
| Error codes | 400, 401, 404, 409, 429 | "Video Generation Failed" message | 0, 1 or 2 |

**Where the difference matters.** The API and the WebUI call `start()` through the same function, but with `allow_server_file_input` set to `False`. So a `custom_audio_file` outside the task folder is refused (`app/services/task.py:461-470`). The CLI passes `True`, so it accepts any path on disk. The code comment says this is deliberate: it is the operator's own machine, not an HTTP client.

## Example / walkthrough

Same request, three entry points, same result on disk:

- **API:** `POST /api/v1/videos` with the body shown in [[01 - Video via the API]].
- **WebUI:** the same script and material on the page, then the generate button. See [[03 - Video via the WebUI]].
- **CLI:** `cli.py --video-script "..." --video-source local --video-materials ./clip.mp4 --voice-name no-voice`. See [[02 - Video via the CLI]].

All three end in `storage/tasks/<id>/` with the same files.

## Pitfalls

- **The API validates little at the HTTP layer.** An unknown `video_source` or a `custom_audio_file` outside the task folder does not return 400. The task is created with 200 and fails later, inside the pipeline.
- **Only the CLI accepts outside paths.** Do not send the same absolute path through the API: it will be refused in the pipeline.
- **The lock applies only in the WebUI.** Today only the WebUI writes configuration (and the Kimi login, which runs from it). The API and the CLI read without the lock, so a write inside the same process during a task is not deferred. Editing `config.toml` by hand only takes effect in the API process after a restart, because the configuration is read once, at import (`app/config/config.py:640-660`).
- **An empty key means no authentication.** The example ships with `api_key = ""` and `listen_host = "0.0.0.0"` (`config.example.toml:38`, `:11`). The log warns, but nothing stops network exposure. Set a key before exposing the API.

## Practice

1. Which entry point calls `start()` with `allow_server_file_input=True`, and why?
2. What code does `POST /api/v1/videos` with `video_count: 9` return, and why?
3. Who takes `runtime_config_lock`, and which entry point does not?

> [!faq]- Answer key
> 1. The CLI (`cli.py:1773`). It is the operator's own machine, so an absolute path is trusted. HTTP and the WebUI use the default `False`.
> 2. 400. The pydantic schema caps `video_count` at 5 (`app/models/schema.py:266`), and the validation error becomes 400 (`app/asgi.py:67`).
> 3. The WebUI, inside `_run_generation` (`webui_task.py:94`). The API and the CLI do not take the lock.

## Connections

- [[Overview]]: the overall design of the three entry points.
- [[Pipeline and stop_at]]: what each entry point starts.
- [[Task state and queue]]: the API queue and the WebUI queue.
- [[Configuration and locks]]: the lock and the authentication keys.
- [[API routes]] and [[CLI flags]]: the reference for each entry point.
- Canvas: [[02 - Entry points.canvas|Canvas]].
