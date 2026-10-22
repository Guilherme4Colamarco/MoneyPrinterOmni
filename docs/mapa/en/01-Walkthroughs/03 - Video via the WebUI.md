---
title: 03 - Video via the WebUI
tags: [mapa, percurso, status/unstable]
aliases: [WebUI walkthrough]
lang: en
sources: [webui/Main.py, app/services/webui_task.py, app/config/config.py, app/services/task.py, app/utils/logging_utils.py]
---
# 03 - Video via the WebUI

[[00 - Index|← Index]]

The WebUI is a Streamlit page: you fill in the columns, press generate, and follow the live log. Underneath it uses the same `task.start()` as the API, with its own queue and a configuration lock.

> [!warning] unstable
> The per-task log panel and the diagnostic controls (Interface > Diagnostics, `webui/Main.py:3207-3223`) come from the upstream Turbo v1.3.9 merge. State to be confirmed. The queue and lock flow described below is what the code shows, but the walkthrough was not tested in a browser.

## Core idea

Each press of the generate button becomes `webui_task.submit_generation(...)`. That function writes the task state as `processing` and hands the task to the WebUI queue. The queue runs one task at a time. Before calling `tm.start`, the worker takes the configuration lock, so no screen can change the provider or a key in the middle of a generation.

## How it works

1. **Open the page.** `./webui.sh` looks for the first free port between 8501 and 8599 on `127.0.0.1` (`webui.sh:16-17`). `mpt webui` does the same through `app/launcher.py:26`.
2. **Configure.** The settings dialog (`_render_settings_dialog`, `webui/Main.py:3237`) has six tabs: LLM, Material API, Auto-Publish, Interface, Key Backup and Cache Management (`Main.py:3242-3249`). Those choices go into `config.toml` through the configuration layer.
3. **Build the task.** The page has four columns (`_render_application`, `Main.py:8441`): script (`_render_script_settings`, `Main.py:5029`), video (`5224`), audio (`6966`) and subtitles (`7670`). The generate button lives in `_render_generation_controls` (`Main.py:8009`).
4. **Submit.** `Main.py:8412` calls `webui_task.submit_generation(task_id=..., params=..., capture_logs=...)` (`app/services/webui_task.py:138`). Before that, the function copies the parameters and writes the `processing` record with `video_subject` (`webui_task.py:154` e `:173`), so the page can find the task even if the script runs again.
5. **Queue.** `_task_manager` (`webui_task.py:24`) is an `InMemoryTaskManager` with `max_concurrent_tasks=1` and `max_queued_tasks` read from the config. If the queue is full, the exception goes up and the record becomes `failed` with `failed_stage="scheduling"` (`webui_task.py:199`).
6. **Run.** `_run_generation` (`webui_task.py:58`) attaches the thread's log capture and enters `config.runtime_config_lock()` (`webui_task.py:94`). Only then does it call `tm.start(...)`. Any exception in the wrapper becomes `failed_stage="webui_worker"`.
7. **Follow.** `_render_running_generation_task` (`Main.py:2151`) is a Streamlit fragment that refreshes every 0.5 s (`webui_task.py:34`) and reads the log with `get_task_logs` (`webui_task.py:52`). The task list and history are another fragment, every 2 s (`Main.py:1442`), which scans `storage/tasks` (`_scan_history_tasks`, `Main.py:991`).

## Example / walkthrough

The browser was not opened for this documentation. What was run: the same call the page makes, `webui_task.submit_generation(...)`, with the video column's parameters, `video_source="local"`, voice `no-voice` and a script sent in. The function was called directly, outside Streamlit.

Observed result after about 3 s of polling:

- state `1`, progress `100`, `failed_stage` null;
- `videos`: the absolute path of `final-1.mp4` inside `storage/tasks/<id>/`;
- 30 log lines captured for the task (`get_task_logs`).

The files are the same as for the API and the CLI: `script.json`, `audio.mp3`, `combined-1.mp4` and `final-1.mp4`. See [[01 - Video via the API]] for the table.

How the page shows the result: `Main.py:2060` displays "Video Generation Failed" when the state is not `1` or there is no video file.

## Pitfalls

- **One task at a time, always.** The WebUI fixes `max_concurrent_tasks=1` (`webui_task.py:21-25`). The config limit applies only to the API. The two queues do not see each other.
- **The lock holds, but the page does not block.** Changing an option during a generation does not break the task, because `update_config_nonblocking` (`app/config/config.py:92`) keeps the value and applies it when the lock is released. The running task keeps the previous configuration.
- **Without Redis, the API cannot see the WebUI.** Each process has its own in-memory state. The WebUI list shows API tasks only because it reads `storage/tasks` from disk.
- **A full queue looks like a generic error.** The page shows "Video Generation Failed" (`Main.py:2060`). The real reason is in the `error` field of the state, with `failed_stage="scheduling"`.

## Practice

1. How many tasks does the WebUI run at the same time, and why does that not depend on `max_concurrent_tasks`?
2. In which function does the WebUI take the configuration lock, and what does it do with an option change while the lock is held?
3. If the WebUI queue is full, which `failed_stage` ends up in the task state?

> [!faq]- Answer key
> 1. One. `_task_manager` is created with `max_concurrent_tasks=1` (`app/services/webui_task.py:24`). The config's `max_concurrent_tasks` is read only by the API.
> 2. In `_run_generation`, with `config.runtime_config_lock()` (`webui_task.py:94`). The change is stored and applied when the lock is released (`config.py:92`).
> 3. `scheduling` (`webui_task.py:199`).

## Connections

- [[Overview]]: where the WebUI fits in the program.
- [[Task state and queue]]: the two queues and the `failed` state.
- [[Configuration and locks]]: the configuration lock in detail.
- [[Entry points]]: the comparison with the API and the CLI.
- [[Pipeline and stop_at]]: what runs inside `tm.start`.
- Canvas: [[02 - Entry points.canvas|Canvas]].
