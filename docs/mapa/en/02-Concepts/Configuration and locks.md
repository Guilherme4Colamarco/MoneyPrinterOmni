---
title: Configuration and locks
tags: [mapa, conceito, status/unstable]
aliases: [Config and locks]
lang: en
sources: [app/config/config.py, app/paths.py, app/utils/file_security.py, app/services/webui_task.py, webui/Main.py, config.example.toml, app/utils/logging_utils.py, app/services/task.py]
---
# Configuration and locks

[[00 - Index|← Index]]

All configuration comes from one file, `config.toml`, read once at import. The WebUI can write it. A lock keeps the configuration from changing in the middle of a generation. Paths and files go through their own checks.

> [!warning] unstable
> The `[diagnostics]` section (`config.example.toml:14-24`), the runtime logging controls (`app/config/config.py:137`, `app/utils/logging_utils.py:33`) and the WebUI diagnostic toggle (`webui/Main.py:3207-3223`) came from the upstream Turbo v1.3.9 merge. State to be confirmed. The rest of this note (configuration, lock and paths) is on `main`.

## Core idea

`config.toml` lives in the runtime folder (`app/paths.py:20`, `runtime_root`). Each section becomes a synchronized dictionary in memory, and the program reads from it everywhere. The configuration lock (`runtime_config_lock`) blocks writes during a generation, but only the WebUI uses it. The API and the CLI do not take the lock.

## How it works

1. **File.** `config.py:15-16` builds `root_dir/config.toml`. On first run, `_initialize_config_from_example` (`config.py:495`) copies `config.example.toml` there, by an atomic hard link that never overwrites an existing file (`config.py:513`).
2. **Reading.** `load_config` (`config.py:531`) reads the TOML. Each section becomes a `_SynchronizedConfig` (`config.py:30`): `diagnostics` (`:641`), `app` (`:642`), `azure`, `siliconflow`, `minimax_tts`, `elevenlabs`, `chatterbox`, `kokoro`, `fish_audio`, `voxcpm` and `ui` (`:653`). `whisper` and `proxy` are plain dictionaries (`:643-644`). The top-level values are `listen_host`, `listen_port`, `log_level` and `ffmpeg_path` (`:665-680`).
3. **Writing.** `save_config` (`config.py:566`) writes a temporary file and swaps it in with `os.replace` (`config.py:620`). If the file is a Docker bind mount and cannot be replaced, it is written in place, inside the lock.
4. **Lock.** `runtime_config_lock` (`config.py:304`) holds a reentrant lock for a whole generation. `_run_generation` takes it at `webui_task.py:94`. `try_runtime_config_lock` (`config.py:322`) is the non-blocking version, used by the WebUI for voice previews and LLM reads (`webui/Main.py:440`, `:3649`, `:6153`).
5. **Write while the lock is held.** `update_config_nonblocking` (`config.py:92`) keeps only the latest value of each key and applies it when the lock is released. It does not block the interface and does not change the configuration of the running task.
6. **Paths.** `app/paths.py`:
   - `runtime_root` (`paths.py:20`): uses `MPT_HOME` if set; otherwise the repository folder (checkout) or the user data folder for the OS;
   - `_with_legacy` (`paths.py:38`): if the new folder does not exist and the old `MoneyPrinterTurbo` folder does, uses the old one;
   - `resource_directory` (`paths.py:70`): copies missing resources, without overwriting what the user edited.
7. **User files.** `app/utils/file_security.py:4` (`resolve_path_within_directory`) resolves the real path and checks that it stays inside the allowed folder, using `realpath` and `commonpath`. It is used for the API font (`video.py:251`), the stream and download routes (`video.py:515`, `:587`), custom audio (`task.py:445`), background music (`bgm.py:339`, `:413`) and local material (`video.py:1971`).

## Example / walkthrough

First run with a scratch folder. This command creates `config.toml` inside `MPT_HOME`, without touching the repository:

```sh
MPT_HOME=/tmp/mpt-test uv run python cli.py --video-subject "teste" --stop-at script
```

Afterwards, `/tmp/mpt-test/config.toml` exists, with the same size as `config.example.toml`. That is what happened for this documentation: the file created was 34,300 bytes, the same as the example. Changing `api_key` there and restarting the API changes whether authentication is required (see [[Entry points]]).

Default values in the example that matter most:

| Key | Value | Section | Line |
|---|---|---|---|
| `listen_host` | `"0.0.0.0"` | top | `config.example.toml:11` |
| `listen_port` | `8080` | top | `:12` |
| `api_key` | `""` (no authentication) | `[app]` | `:38` |
| `tls_verify` | `true` | `[app]` | `:71` |
| `video_source` | `"pexels"` | `[app]` | `:90` |
| `llm_provider` | `"moonshot"` | `[app]` | `:253` |
| `subtitle_provider` | `"edge"` | `[app]` | `:516` |
| `enable_redis` | `false` | `[app]` | `:566` |
| `max_concurrent_tasks` | `5` | `[app]` | `:573` |
| `max_queued_tasks` | `100` | `[app]` | `:574` |

Keys that are secrets (filled in by you, never in git): `api_key`, `loomloom_api_token`, the `*_api_keys` lists and the `*_api_key` key of each provider, `redis_password`, `speech_key` (Azure), `api_key` of `siliconflow`, `minimax_tts`, `elevenlabs`, `chatterbox`, `kokoro`, `fish_audio` and `voxcpm`, and `upload_post_api_key`. The full list is in [[Configuration keys]]. `.gitignore` already covers `/config.toml` (`.gitignore:2`).

## Pitfalls

- **The lock does not protect the API or the CLI.** Today only the WebUI writes configuration, so the risk is small. If other code starts writing in the same process, it will change the configuration of an API task that is running.
- **Editing the file is not enough.** The configuration is read once, at import (`config.py:640-660`). After editing `config.toml` by hand, restart the process.
- **`listen_host = "0.0.0.0"` with an empty `api_key`** leaves the API open on the network. The log only warns (`app/asgi.py:29-32`).
- **`tls_verify = false`** turns off certificate checks for external APIs and material downloads. The example comment says to leave it on (`config.example.toml:69-71`).
- **`AGENTS.md` says writes are "blocked" while the lock is held.** The code does something different: it defers the write, keeps the last value and applies it when the lock is released (`config.py:92`). The code is right.

## Practice

1. What happens to an option change in the WebUI while a generation is running?
2. Which key controls whether the API requires `x-api-key`, and what is its default?
3. With `MPT_HOME` set, where does the program look for `config.toml`?

> [!faq]- Answer key
> 1. The change is stored and applied when the lock is released (`app/config/config.py:92`). The running generation does not change.
> 2. `api_key` in `[app]` (`config.example.toml:38`). Its default is `""`, which turns the requirement off.
> 3. In `$MPT_HOME/config.toml`. `runtime_root` (`app/paths.py:20`) reads that variable before any other rule.

## Connections

- [[Overview]]: where configuration enters the program.
- [[Entry points]]: who uses the lock and who does not.
- [[Task state and queue]]: `max_concurrent_tasks`, `max_queued_tasks` and `enable_redis`.
- [[Configuration keys]]: all sections and keys.
- Canvas: [[01 - Pipeline.canvas|Canvas]].
