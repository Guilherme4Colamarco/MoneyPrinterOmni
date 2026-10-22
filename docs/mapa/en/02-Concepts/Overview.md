---
title: Overview
tags: [mapa, conceito, status/stable]
aliases: [Program overview]
lang: en
sources: [main.py, cli.py, app/asgi.py, app/services/task.py, app/services/webui_task.py, webui/Main.py, app/services/state.py, AGENTS.md]
---
# Overview

[[00 - Index|← Index]]

MoneyPrinterOmni takes a request through one of three entry points, calls `task.start()`, and writes the results to `storage/tasks/<id>/`.

## Core idea

There are three entry points: the HTTP API, the WebUI (Streamlit) and the CLI. All three use the same function, `task.start()` (`app/services/task.py:1907`), which runs the pipeline (`_run_pipeline`, `task.py:1519`). Each entry point prepares the request in its own way before that: it validates, queues, locks or not. The pipeline is one. A fix in the service layer therefore reaches all three.

## How it works

1. **Entry point.** Each one has its own path to `start()`:
   - **API:** `main.py:12` starts uvicorn on `app.asgi:app`. The route `create_task` (`app/controllers/v1/video.py:235`) records the state and calls `task_manager.add_task(tm.start, ...)`.
   - **WebUI:** `webui/Main.py` calls `webui_task.submit_generation` (`app/services/webui_task.py:138`). Its own queue runs `_run_generation`, which takes the configuration lock before `tm.start`.
   - **CLI:** `cli.py:1735` (`run_cli`) builds the parameters and calls `tm.start` directly (`cli.py:1766`), with no queue.
2. **Pipeline.** `_run_pipeline` runs the steps in order: script, terms, audio, subtitle, materials, video and, last, publishing. Details in [[Pipeline and stop_at]].
3. **State.** Each step writes progress and state to `app/services/state.py`, in memory or in Redis (see [[Task state and queue]]).
4. **Files.** Everything generated is in `storage/tasks/<id>/`. The API returns those paths as `/tasks/...` URLs; the CLI returns absolute paths.

## Example / walkthrough

A `POST /api/v1/videos` request with a script and local material. The path is:

`POST /api/v1/videos` → `create_video` (`video.py:215`) → `create_task` (`video.py:235`) → `add_task` (`base_manager.py:54`) → `tm.start` (`task.py:1907`) → `_run_pipeline` (`task.py:1519`) → `storage/tasks/<id>/final-1.mp4`.

The full walkthrough, with a real response, is in [[01 - Video via the API]].

Where things live in the repository:

| Path | What is there |
|---|---|
| `main.py`, `cli.py`, `webui/` | the three entry points (API, CLI and WebUI) |
| `app/asgi.py`, `app/router.py` | FastAPI application, middleware and route mounting |
| `app/controllers/` | HTTP routes (`v1/video.py`, `v1/llm.py`) and queue managers (`manager/`) |
| `app/services/` | the pipeline (`task.py`), state (`state.py`), video, voice, subtitles, materials and providers |
| `app/models/` | request schemas (`schema.py`), constants (`const.py`) and LLM providers |
| `app/config/config.py` | reading and writing `config.toml`, and the configuration lock |
| `app/paths.py` | where configuration, resources and runtime data live |
| `config.example.toml` | configuration template, with every key |
| `resource/` | fonts, songs and public files (copied to the runtime folder when installed as a package) |
| `storage/` | runtime output (ignored by git) |
| `docs/mapa/` | this vault |
| `.agents/`, `.claude/` | the agent harness (video production and program maintenance) |

## Pitfalls

- **`video_project.py` is not part of the pipeline.** No program module imports it; only the test `test/services/test_video_project.py:13` does. `AGENTS.md` lists it as a compositing stage, which does not match the code.
- **The configuration lock exists only in the WebUI.** The API and the CLI call `start()` without taking `runtime_config_lock`. Inside one process, a configuration change can affect an API task that is running.
- **Processes do not share state.** With `docker-compose`, `webui` and `api` each keep their own in-memory state. Without Redis, the WebUI does not see the API's tasks, except through its scan of `storage/tasks`.

## Practice

1. Which function is the common entry point for the three entry points, and in which file is it?
2. In which folder of the repository is the code that decides which HTTP routes exist?
3. If you run the API and the WebUI as separate processes without Redis, does the WebUI show the API's tasks? Why?

> [!faq]- Answer key
> 1. `start()` in `app/services/task.py:1907`. It calls `_run_pipeline` (`task.py:1519`).
> 2. In `app/controllers/v1/`: `video.py` (videos, tasks and materials) and `llm.py` (script, terms and metadata).
> 3. No. Each process has its own `MemoryState`. The WebUI lists API tasks only if they are in `storage/tasks` on disk and that folder is shared.

## Connections

- [[Pipeline and stop_at]]: the steps inside `start()`.
- [[Task state and queue]]: state, queues and the 429 and 409 codes.
- [[Entry points]]: the side-by-side comparison.
- [[Configuration and locks]]: `config.toml`, the lock and the paths.
- [[API routes]] and [[CLI flags]]: the reference for each entry point.
- Canvas: [[01 - Pipeline.canvas|Canvas]] and [[02 - Entry points.canvas|Canvas of entry points]].
