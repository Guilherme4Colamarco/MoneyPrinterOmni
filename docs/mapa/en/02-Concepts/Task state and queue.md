---
title: Task state and queue
tags: [mapa, conceito, status/stable]
aliases: [State and queue]
lang: en
sources: [app/services/state.py, app/controllers/manager/base_manager.py, app/controllers/manager/memory_manager.py, app/controllers/manager/redis_manager.py, app/controllers/v1/video.py, app/services/task.py, app/services/webui_task.py, app/models/const.py, app/asgi.py]
---
# Task state and queue

[[00 - Index|← Index]]

Each task has a state record, in memory or in Redis. A queue manager decides whether the task runs now, waits, or is refused.

## Core idea

There are two separate parts. The **state** (`app/services/state.py`) keeps what each task is doing. The **queue** (`app/controllers/manager/`) controls how many tasks run at once. The API and the WebUI each have their own queue. The CLI has no queue.

## How it works

1. **State.** A task has a `state` (`app/models/const.py:25-27`):
   - `-1` = failed;
   - `4` = processing;
   - `1` = complete.

   Extra fields, such as `progress`, `failed_stage`, `error`, `videos` and `cross_post_state`, live in the same record. `cross_post_state` takes `pending`, `processing`, `complete` or `failed`.
2. **Two backends.** `MemoryState` (`state.py:69`) keeps a dictionary in memory with a lock. `RedisState` (`state.py:134`) keeps one hash per task. Which one is used is chosen at `state.py:317`, from the config's `enable_redis`. Redis uses HSET and Lua scripts that check the owner (`state.py:221`, `state.py:264`).
3. **Queue.** `TaskManager.add_task` (`app/controllers/manager/base_manager.py:54`) decides, under a lock:
   - if fewer tasks are running than `max_concurrent_tasks`, it reserves a slot and opens a thread (`execute_task`, `base_manager.py:86`);
   - otherwise, if the queue holds fewer than `max_queued_tasks` items, it enqueues;
   - otherwise it raises `TaskQueueFullError` (`base_manager.py:8`, `:78`).
4. **Implementations.** `InMemoryTaskManager` (`memory_manager.py:7`) keeps the queue in memory. `RedisTaskManager` (`redis_manager.py:29`) keeps it in Redis and, when the API starts, resumes the queued tasks (`redis_manager.py:42`, called from `application_lifespan` in `app/asgi.py:24`).
5. **Limits.** `max_concurrent_tasks = 5` and `max_queued_tasks = 100` by default (`config.example.toml:573-574`). The WebUI has its own queue, with a fixed `max_concurrent_tasks=1` (`app/services/webui_task.py:24`).
6. **HTTP mapping.** The API maps the exceptions like this:
   - `TaskQueueFullError` becomes **429** and the record just created is deleted (`app/controllers/v1/video.py:268` and `:272-277`);
   - deleting a busy task becomes **409** (`video.py:345`). "Busy" is what `is_task_busy` says (`app/services/task.py:117`): state `4` or an active `cross_post_state`;
   - a missing task becomes **404** (`video.py:310`, `:333`).

## Example / walkthrough

With the API defaults, five tasks run and the following ones queue:

- tasks 1 to 5: start straight away, `state=4`;
- tasks 6 to 105: wait in the queue, `state=4` in the record, waiting for a slot;
- task 106: `add_task` raises `TaskQueueFullError`. The API answers `429`, the record is deleted, and the message is `task queue is full, please try again later`.

A `DELETE /api/v1/tasks/{id}` on a running task answers `409 task is still running`. After it finishes, the same `DELETE` removes `storage/tasks/<id>/` and the record.

Checked for this documentation: after restarting the API with in-memory state, `GET /api/v1/tasks/{id}` returned 404, but the file `final-1.mp4` stayed reachable under `/tasks/...`. The state is lost; the files stay.

## Pitfalls

- **Limits are per process.** Two processes mean two queues. With `webui` and `api` separate, the total limit is the sum of both, and neither sees the other's queue.
- **Without Redis, a restart drops the state.** The files remain on disk. Asking for the id returns 404.
- **Redis is trusted.** Values from Redis come back through `ast.literal_eval` (`state.py:300`). Redis must stay private, with no write access for third parties.
- **Network publishing does not survive a restart.** Publishing runs in a pool of two threads, outside the queue. On startup, the API marks interrupted publications as failed (`recover_interrupted_cross_posts`, `app/services/task.py:1217`).

## Practice

1. What are the three values of `state`, and what does each mean?
2. With `max_concurrent_tasks=5` and `max_queued_tasks=100`, which task gets the 429?
3. Why does a `DELETE` on a task with an active `cross_post_state` answer 409, even though the video generation has finished?

> [!faq]- Answer key
> 1. `-1` failed, `4` processing, `1` complete (`app/models/const.py:25-27`).
> 2. The 106th simultaneous task. Five run and one hundred wait in the queue (`base_manager.py:54-78`).
> 3. Because `is_task_busy` also counts network publishing, which still reads the task folder (`app/services/task.py:117`).

## Connections

- [[Pipeline and stop_at]]: what the task does while it is in `state=4`.
- [[Entry points]]: who uses the queue and who does not.
- [[Overview]]: why the API, the WebUI and the CLI are separate processes.
- [[API routes]]: the 404, 409 and 429 codes on each route.
- [[Configuration and locks]]: `max_concurrent_tasks`, `max_queued_tasks` and `enable_redis`.
- Canvas: [[02 - Entry points.canvas|Canvas]].
