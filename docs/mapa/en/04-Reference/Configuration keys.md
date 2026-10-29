---
title: Configuration keys
tags: [mapa, referencia, status/unstable]
aliases: [config.toml reference]
lang: en
sources: [config.example.toml, app/config/config.py, app/services/task.py, app/services/voice.py, app/services/ofox.py, app/services/muapi.py, app/services/volcengine_seedance.py, app/services/loomloom.py, app/models/llm_provider.py, app/services/upload_post.py]
---
# Configuration keys

[[00 - Index|← Index]]

Reference for the sections and keys of `config.example.toml`, what each one controls and which ones are secrets. Line numbers refer to the example file.

> [!warning] unstable
> The `[diagnostics]` section (`config.example.toml:14-24`, key `log_requests`) and the EmpirioLabs provider (`config.example.toml:325-329`) came from the upstream Turbo v1.3.9 merge. State to be confirmed. The other keys are on `main`.

## Core idea

`config.toml` is a copy of the example, created on the first run. Each section goes to a different place in the code. Most `[app]` keys belong to a provider: one API key, one URL and one model, per provider. One rule: secrets stay in `config.toml` only, never in git (`.gitignore:2`).

## How it works

### Sections

| Section | Line | Controls | Secrets |
|---|---|---|---|
| (top) | `:9-12` | `log_level`, `listen_host` (default `0.0.0.0`), `listen_port` (`8080`) | no |
| `[diagnostics]` | `:14` | `log_requests` (request tracing, unstable) | no |
| `[app]` | `:26` | everything else: API, materials, LLM, TTS, queue, Redis, publishing | yes, many |
| `[whisper]` | `:609` | Whisper subtitles: `model_size`, `device`, `compute_type` | no |
| `[proxy]` | `:626` | proxy for Pexels, Pixabay, Coverr and material downloads. `http` and `https` keys commented out in the example | the URL can carry a username and password |
| `[azure]` | `:637` | Azure v2 voice: `speech_key`, `speech_region` | `speech_key` |
| `[siliconflow]` | `:643` | SiliconFlow voice | `api_key` |
| `[minimax_tts]` | `:647` | MiniMax voice | `api_key` |
| `[elevenlabs]` | `:665` | ElevenLabs voice and music | `api_key` |
| `[chatterbox]` | `:678` | Chatterbox voice (your own server) | `api_key` |
| `[kokoro]` | `:687` | Kokoro voice (your own server) | `api_key` |
| `[fish_audio]` | `:697` | Fish Audio voice | `api_key` |
| `[voxcpm]` | `:722` | VoxCPM voice, with cloning from reference audio | `api_key` |
| `[xai]` | `:732` | xAI Grok Voice TTS (`api_key`, `language`, `timeout`) | `api_key` |
| `[ui]` | `:750` | WebUI preferences (`hide_log`, `open_task_folder_on_completion`) | no |

The example's `[ui]` section has only two keys. The WebUI writes others (voice, subtitles, font and colours) into the real `config.toml`, and the CLI reads the same keys as defaults (see [[CLI flags]]).

### `[app]` keys by group

| Group | Keys (line) |
|---|---|
| API access | `api_key` (38), `endpoint` (557) |
| WebUI behaviour | `hide_config` (46), `script_generation_backend` (51) |
| Network and TTS | `tls_verify` (71), `edge_tts_timeout` (67) |
| Default materials | `video_source` (90), `match_materials_to_script` (236), `material_directory` (562) |
| Pexels, Pixabay, Coverr | `pexels_api_keys` (97), `pixabay_api_keys` (100), `coverr_api_keys` (103) |
| WaveSpeed | `wavespeed_api_keys` (107) |
| Volcengine Seedance | `volcengine_seedance_api_key` (125), `_base_url` (126), `_model` (129), `_resolution` (130), `_min_duration` (131), `_max_duration` (132), `_poll_interval` (133), `_run_timeout` (134), `_watermark` (135) |
| OFox | `ofox_api_key` (142), `_base_url` (143), `_text_to_video_model` (145), `_resolution` (149), `_min_duration` (154), `_max_duration` (155), `_provider` (168), `_poll_interval` (169), `_run_timeout` (170) |
| MuAPI | `muapi_api_key` (177), `_base_url` (178), `_video_endpoint` (180), `_resolution` (181), `_min_duration` (182), `_max_duration` (183), `_poll_interval` (184), `_run_timeout` (185) |
| Metaso MiniMax | `metaso_minimax_api_key` (192), `_base_url` (193), `_resolution` (194), `_poll_interval` (195), `_run_timeout` (196) |
| OpenAI image | `openai_image_base_url` (205), `openai_image_api_keys` (208), `openai_image_model` (211), `_size` (217), `_prompt_template` (221) |
| TwelveLabs | `twelvelabs_api_keys` (226), `twelvelabs_rerank_terms` (229); model keys `twelvelabs_marengo_model` and `twelvelabs_pegasus_model` commented out (231-232) |
| Sonilo music | `sonilo_api_key` (241), `sonilo_base_url` (242), `sonilo_timeout` (244) |
| LoomLoom | `loomloom_base_url` (58), `loomloom_api_token` (59), `loomloom_request_timeout_seconds` (60), `loomloom_poll_interval_seconds` (61), `loomloom_run_timeout_seconds` (62), `loomloom_video_run_timeout_seconds` (63) |
| LLM provider | `llm_provider` (253); per-provider keys in the table below |
| Claude Code and Kimi | `claude_code_model_name` (468), `claude_code_cli_path` (469), `claude_code_timeout` (470), `kimi_code_model_name` (479), `kimi_code_timeout` (480) |
| Ollama and LiteLLM | `ollama_base_url` (453), `ollama_model_name` (454), `litellm_model_name` (492) |
| Subtitles | `subtitle_provider` (516), default `edge` |
| Extra TTS | `mimo_tts_model_name` (510), `mimo_tts_style_prompt` (511) |
| Queue and Redis | `enable_redis` (566), `redis_host` (567), `redis_port` (568), `redis_db` (569), `redis_password` (570), `max_concurrent_tasks` (573), `max_queued_tasks` (574) |
| Publishing | `upload_post_enabled` (583), `upload_post_api_key` (584), `upload_post_username` (585), `upload_post_platforms` (587), `upload_post_auto_upload` (589), `upload_post_youtube_privacy_status` (591), `upload_post_youtube_made_for_kids` (598), `upload_post_max_pending_tasks` (603) |

### LLM providers

Each provider uses three keys with the same prefix: `<id>_api_key`, `<id>_base_url` and `<id>_model_name`. The name is chosen by `llm_provider` (`config.example.toml:253`). The provider registry is in `app/models/llm_provider.py`.

| Provider | `api_key` | `base_url` | `model_name` |
|---|---|---|---|
| moonshot (default) | 257 | 258 | 259 |
| shengsuanyun | 263 | 264 | 265 |
| apimart | 270 | 271 | 272 |
| fluxionai | 277 | 278 | 279 |
| cheaperinference | 284 | 285 | 286 |
| requesty | 292 | 293 | 294 |
| futureinfra | 299 | 300 | 301 |
| yapi | 306 | 307 | 308 |
| opper | 313 | 314 | 315 |
| onomeo | 320 | 321 | 322 |
| empiriolabs (unstable) | 327 | 328 | 329 |
| openai | 333 | 334 | 335 |
| anthropic | 339 | 340 | 341 |
| gemini | 345 | — | 346 |
| muse_spark | 350 | 351 | 352 |
| deepseek | 356 | 357 | 358 |
| qwen | 362 | — | 363 |
| azure | 367 | 368 | 369 (plus `azure_api_version`, 370) |
| volcengine | 374 | 375 | 376 |
| grok | 380 | 381 | 382 |
| minimax | 387 | 388 | 389 |
| mimo | 393 | 394 | 395 |
| iflytek | 401 | 402 | 403 |
| cloudflare | 408 | — | 411 (plus `cloudflare_account_id` 409 and `cloudflare_gateway_id` 410) |
| modelscope | 415 | 416 | 417 |
| aihubmix | 421 | 422 | 423 |
| aimlapi | 427 | 428 | 429 |
| evolink | 433 | 434 | 435 |
| openrouter | 440 | 441 | 442 |
| api_route | 447 | 448 | 449 |
| oneapi | 484 | 485 | 486 |
| groq | 496 | 497 | 498 |
| pollinations | 501 | 502 | 503 |
| ollama (no key) | — | 453 | 454 |
| claude_code (subscription) | — | — | 468 (plus CLI path at 469, timeout at 470) |
| kimi_code (OAuth login) | — | — | 479 (plus timeout at 480) |
| litellm (uses environment variables) | — | — | 492 |

### Secrets

Filled in only in the real `config.toml`:

- `[app]`: `api_key` (38), `loomloom_api_token` (59), `pexels_api_keys` (97), `pixabay_api_keys` (100), `coverr_api_keys` (103), `wavespeed_api_keys` (107), `volcengine_seedance_api_key` (125), `ofox_api_key` (142), `muapi_api_key` (177), `metaso_minimax_api_key` (192), `openai_image_api_keys` (208), `twelvelabs_api_keys` (226), `sonilo_api_key` (241), `redis_password` (570), `upload_post_api_key` (584);
- the `*_api_key` keys of every LLM provider listed above;
- voice sections: `[azure] speech_key` (640), `[siliconflow] api_key` (645), `[minimax_tts] api_key` (653), `[elevenlabs] api_key` (668), `[chatterbox] api_key` (682), `[kokoro] api_key` (691), `[fish_audio] api_key` (701), `[voxcpm] api_key` (728), `[xai] api_key` (741).

Kimi login tokens (`kimi_code_access_token`, `kimi_code_refresh_token`) do not appear in the example; the login writes them to `config.toml` (`config.example.toml:475`).

## Example / walkthrough

To switch the default LLM to DeepSeek, edit two keys in `[app]` and restart the process:

```toml
llm_provider = "deepseek"        # config.example.toml:253
deepseek_api_key = "sk-..."      # line 356 of the example
```

`deepseek_model_name` (358) is empty in the example, so fill in the model you want. Without a restart, the API process keeps the old configuration, because `config.toml` is read at import (see [[Configuration and locks]]).

## Pitfalls

- **`tls_verify` is one key shared by three providers.** There is no per-provider switch. Ofox, MuAPI and Seedance all read the same `[app]` key (`app/services/ofox.py:157`, `muapi.py:139`, `volcengine_seedance.py:142`), with default `true`. There is no way to turn verification off for one of them only.
- **`redis_password` is plain text.** Redis must sit on a private network. The code trusts what comes back from Redis (`app/services/state.py:300`).
- **The example does not have every `[ui]` key.** The real defaults come from what the WebUI writes. An older `config.toml` may differ from the example.
- **The example has empty keys.** Only the real `config.toml` should hold real values. `.gitignore` covers that file (`.gitignore:2`).

## Practice

1. What is the API key name for the OpenAI provider, and on which line of the example is it?
2. Which section holds the voice API key for ElevenLabs, and does the music feature use the same key?
3. If you want to turn off TLS verification only for OFox, what does the configuration let you do?

> [!faq]- Answer key
> 1. `openai_api_key`, line 333 of `config.example.toml`. The provider is chosen by `llm_provider`.
> 2. `[elevenlabs] api_key` (line 668). Music uses the same section, with `music_base_url` (674) and `music_model_id` (675).
> 3. Not possible. `tls_verify` is one key in `[app]` (`config.example.toml:71`), also read by MuAPI and Seedance. Turning it off affects all three, so do it only on a trusted network.

## Connections

- [[Configuration and locks]]: how the file is read, written and protected.
- [[CLI flags]]: the `[ui]` defaults that the CLI reuses.
- [[Pipeline and stop_at]]: which providers run in each step.
- [[Entry points]]: who uses `api_key` and who does not.
- Canvas: [[03 - Integrations.canvas|Canvas]].
