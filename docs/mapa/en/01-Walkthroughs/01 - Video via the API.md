---
title: 01 - Video via the API
tags: [mapa, percurso, status/stable]
aliases: [API walkthrough]
lang: en
sources: [main.py, app/controllers/v1/video.py, app/controllers/v1/base.py, app/controllers/base.py, app/controllers/manager/base_manager.py, app/services/task.py, app/services/state.py, app/services/material_upload.py]
---
# 01 - Video via the API

[[00 - Index|← Index]]

A video made over HTTP: you send a JSON body, get back a `task_id`, and follow the task until the final files exist.

## Core idea

The API does not render the video inside the request. `POST /api/v1/videos` records the task, queues `tm.start`, and returns the id. The work runs in the background. `GET /api/v1/tasks/{id}` shows progress. The files end up in `storage/tasks/<id>/`.

## How it works

1. **Start the server.** `python main.py` starts uvicorn on `app.asgi:app` (`main.py:12`). With `listen_host = "0.0.0.0"` and `listen_port = 8080` (`config.example.toml:11-12`), the API listens on every interface. Docs live at `/docs`.
2. **Upload material (optional).** For local material, `POST /api/v1/video_materials` (multipart, field `file`) writes the file to `storage/local_videos/<uuid>.<ext>` and returns the name (`app/controllers/v1/video.py:477`).
3. **Create the task.** `POST /api/v1/videos` calls `create_video` (`app/controllers/v1/video.py:215`), which passes `stop_at="video"` to `create_task` (`video.py:235`). That function:
   - validates subtitle colours and the font path; an error becomes 400;
   - writes the record with `sm.state.update_task(task_id)` before queueing;
   - calls `task_manager.add_task(tm.start, ...)`. If the queue is full, it returns 429 and deletes the record.
4. **Run.** `add_task` reserves a slot and opens a thread (`app/controllers/manager/base_manager.py:54`). `tm.start` calls `_run_pipeline` (`app/services/task.py:1519`), which goes through the stages in [[Pipeline and stop_at]].
5. **Poll.** `GET /api/v1/tasks/{id}` (`video.py:310`) returns the state. When `state` is `1` and `progress` is `100`, `videos` holds the paths.

## Example / walkthrough

Tested against a local server with `MPT_HOME` pointing at a scratch folder. No API key is needed: local material, a script sent in the body, and the `no-voice` voice.

Step 1, the clip upload:

```sh
curl -F "file=@clip.mp4" http://127.0.0.1:8080/api/v1/video_materials
```

Real response:

```json
{"status":200,"message":"success","data":{"file":"b28b913225e64e538558ac0f05ace66c.mp4"}}
```

Step 2, the creation. Body used:

```json
{
  "video_subject": "Percurso pela API",
  "video_script": "Este é um roteiro de teste para o percurso pela API. Ele tem duas frases curtas.",
  "video_source": "local",
  "video_materials": [{"provider": "local", "url": "b28b913225e64e538558ac0f05ace66c.mp4"}],
  "voice_name": "no-voice",
  "subtitle_enabled": false
}
```

When `video_script` is filled in, the LLM is not called (`app/services/task.py:358`, `generate_script`). When `video_source` is `local`, the terms stage is skipped (`task.py:1686`). The response was:

```json
{"status":200,"message":"success","data":{"task_id":"42a3123c-1a6f-4be7-95fd-85591cf935c8"}}
```

Step 3, the poll, about 40 s later. Relevant fields:

- `state`: `1` (done); `progress`: `100`; `failed_stage`: `null`.
- `videos`: `["/tasks/42a3123c-1a6f-4be7-95fd-85591cf935c8/final-1.mp4"]`.
- `combined_videos`: `["/tasks/42a3123c-.../combined-1.mp4"]`.
- `audio_file`: `/tasks/42a3123c-.../audio.mp3`; `audio_duration`: `7`.

Files written to `storage/tasks/42a3123c-1a6f-4be7-95fd-85591cf935c8/`:

| File | Written by | Note |
|---|---|---|
| `script.json` | `save_script_data` (`task.py:424`) | keys `params`, `script`, `search_terms` |
| `audio.mp3` | `generate_audio` (`task.py:601`) | silence for `no-voice`; duration estimated from the text |
| `combined-1.mp4` | `generate_final_videos` (`task.py:1026`) | concatenated video |
| `final-1.mp4` | `generate_final_videos` (`task.py:1082`) | final video |

Why it works: the API only stores state and queues work. The pipeline writes the files, always inside `storage/tasks/<id>/`. The poll returns ready-to-download paths.

Response detail: `materials` comes back as an absolute server path, because `_task_response_data` (`video.py:142`) only turns `videos`, `combined_videos`, `audio_file` and `subtitle_path` into URLs. See [[API routes]].

## Pitfalls

- **200 does not mean the video is ready.** The creation answers before any stage runs. A failure shows up later, in `GET /tasks/{id}`, with `failed_stage` and `error`.
- **Partial validation over HTTP.** `video_source` is not checked by the route. A value outside the list fails at the pipeline preflight (`task.py:1543`), not with 400.
- **State lives in memory.** Without Redis, restarting the API drops the state. `GET /api/v1/tasks/{id}` then returns 404, but `storage/tasks/<id>/` still has the files and they stay under `/tasks/...`.
- **Full queue.** With the defaults (`max_concurrent_tasks = 5`, `max_queued_tasks = 100`), with 5 tasks running and 100 waiting, the next one gets 429.

## Practice

1. Which function receives `POST /api/v1/videos`, and which `stop_at` does it pass to the pipeline?
2. After `state: 1`, which folder holds the videos, and which path does the API return?
3. Why does the creation answer 200 even when the task will fail later?

> [!faq]- Answer key
> 1. `create_video` (`app/controllers/v1/video.py:215`) calls `create_task` with `stop_at="video"`.
> 2. In `storage/tasks/<task_id>/final-N.mp4`. The API returns `/tasks/<task_id>/final-N.mp4`.
> 3. The task was only queued. The pipeline runs later in another thread, and the result (success or failure) goes to the task state.

## Connections

- [[Overview]]: where this entry point fits in the program.
- [[Pipeline and stop_at]]: the stages the task goes through.
- [[Task state and queue]]: where the 429 and the 404 come from.
- [[Entry points]]: what the API validates, compared with the WebUI and the CLI.
- [[API routes]]: the full route table.
- [[CLI flags]]: the same pipeline, from the command line.
- Canvas: [[01 - Pipeline.canvas|Canvas]].
