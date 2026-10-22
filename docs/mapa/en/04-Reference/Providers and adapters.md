---
title: Providers and adapters
tags: [mapa, integracoes, status/unstable]
lang: en
sources: [app/models/llm_provider.py, app/services/llm.py, app/services/voice.py, app/services/material.py, app/services/bgm.py, app/services/upload_post.py, config.example.toml]
---
# Providers and adapters

[[00 - Index|← Index]]

Reference tables. The LLM table was **generated** from `LLM_PROVIDER_REGISTRY` with `PYTHONPATH=<worktree> python3 -c "from app.models.llm_provider import LLM_PROVIDER_REGISTRY ..."`, not typed by hand. Total: 37 providers. The explanation is in [[LLM providers]].

## LLM adapters

| Adapter | Providers | Branch in `llm.py` |
|---|---|---|
| `openai_compatible` | 29 | default, `llm.py:754` |
| `gemini` | `gemini` | `:423` |
| `qwen` | `qwen` | `:397` |
| `azure` | `azure` | `:516` |
| `cloudflare_ai_gateway` | `cloudflare` | `:473` |
| `modelscope` | `modelscope` | `:725` |
| `litellm` | `litellm` | `:494` |
| `claude_code` | `claude_code` | `:545` |
| `kimi_code` | `kimi_code` | `:666` |

## LLM providers (full registry)

Columns: `Default base URL` shows the registry's `effective_default_base_url`. Where there are regions, the region ids are listed. `Where the key lives` is the key in `[app]` of `config.example.toml`.

| provider_id | Name | Adapter | Needs key? | Default base URL | Where the key lives |
|---|---|---|---|---|---|
| `moonshot` | Kimi / Moonshot AI | `openai_compatible` | yes | https://api.moonshot.cn/v1 (regions: china, global) | moonshot_api_key |
| `kimi_code` | Kimi Code (Kimi subscription) | `kimi_code` | no | https://api.kimi.com/coding/v1 (regions: china, global) | OAuth: kimi_code_access_token/refresh/expires/region |
| `openai` | OpenAI | `openai_compatible` | yes | https://api.openai.com/v1 | openai_api_key |
| `anthropic` | Anthropic Claude | `openai_compatible` | yes | https://api.anthropic.com/v1/ | anthropic_api_key |
| `gemini` | Google Gemini | `gemini` | yes | — | gemini_api_key |
| `muse_spark` | Muse Spark | `openai_compatible` | yes | https://api.meta.ai/v1 | muse_spark_api_key |
| `deepseek` | DeepSeek | `openai_compatible` | yes | https://api.deepseek.com | deepseek_api_key |
| `qwen` | Alibaba Cloud Qwen | `qwen` | yes | — | qwen_api_key |
| `azure` | Microsoft Azure OpenAI | `azure` | yes | — | azure_api_key |
| `volcengine` | ByteDance VolcEngine Ark | `openai_compatible` | yes | https://ark.cn-beijing.volces.com/api/v3 | volcengine_api_key |
| `grok` | xAI Grok | `openai_compatible` | yes | https://api.x.ai/v1 | grok_api_key |
| `minimax` | MiniMax | `openai_compatible` | yes | https://api.minimax.io/v1 | minimax_api_key |
| `mimo` | Xiaomi MiMo | `openai_compatible` | yes | https://api.xiaomimimo.com/v1 | mimo_api_key |
| `iflytek` | iFlytek Spark (Astron MaaS) | `openai_compatible` | yes | https://maas-api.cn-huabei-1.xf-yun.com/v2 | iflytek_api_key |
| `shengsuanyun` | Shengsuan Cloud | `openai_compatible` | yes | https://router.shengsuanyun.com/api/v1 | shengsuanyun_api_key |
| `apimart` | APIMart | `openai_compatible` | yes | https://api.apimart.ai/v1 | apimart_api_key |
| `cloudflare` | Cloudflare AI Gateway | `cloudflare_ai_gateway` | yes | — | cloudflare_api_key + cloudflare_account_id + cloudflare_gateway_id |
| `modelscope` | Alibaba ModelScope | `modelscope` | yes | https://api-inference.modelscope.cn/v1/ | modelscope_api_key |
| `aihubmix` | AIHubMix | `openai_compatible` | yes | https://aihubmix.com/v1 | aihubmix_api_key |
| `aimlapi` | AIML API | `openai_compatible` | yes | https://api.aimlapi.com/v1 | aimlapi_api_key |
| `evolink` | EvoLink | `openai_compatible` | yes | https://direct.evolink.ai/v1 | evolink_api_key |
| `openrouter` | OpenRouter | `openai_compatible` | yes | https://openrouter.ai/api/v1 | openrouter_api_key |
| `api_route` | API Route | `openai_compatible` | yes | https://www.api-route.com/v1 | api_route_api_key |
| `fluxionai` | Fluxion AI | `openai_compatible` | yes | https://fluxionai.space/v1 | fluxionai_api_key |
| `cheaperinference` | Cheaper Inference | `openai_compatible` | yes | https://api.cheaperinference.com/v1 | cheaperinference_api_key |
| `requesty` | Requesty | `openai_compatible` | yes | https://router.requesty.ai/v1 | requesty_api_key |
| `futureinfra` | FutureInfra | `openai_compatible` | yes | https://futureinfra.ai/v1/ai | futureinfra_api_key |
| `yapi` | Y-API | `openai_compatible` | yes | https://api.y-api.bestvirtualgoods.com/v1 | yapi_api_key |
| `opper` | Opper | `openai_compatible` | yes | https://api.opper.ai/v3/compat | opper_api_key |
| `onomeo` | onomeo | `openai_compatible` | yes | https://onomeo.com/v1 | onomeo_api_key |
| `empiriolabs` | EmpirioLabs AI | `openai_compatible` | yes | https://api.empiriolabs.ai/v1 | empiriolabs_api_key |
| `ollama` | Ollama | `openai_compatible` | no | — (detected at run time) | not used (api_key fixed to "ollama") |
| `claude_code` | Claude Code (Claude subscription) | `claude_code` | no | — | not used (logged-in CLI) |
| `oneapi` | OneAPI | `openai_compatible` | yes | — | oneapi_api_key |
| `litellm` | LiteLLM | `litellm` | no | — | env (e.g. OPENAI_API_KEY); no key in [app] |
| `groq` | Groq | `openai_compatible` | yes | https://api.groq.com/openai/v1 | groq_api_key |
| `pollinations` | Pollinations AI | `openai_compatible` | yes | https://gen.pollinations.ai/v1 | pollinations_api_key |

> [!warning] unstable
> The `empiriolabs` row came from the upstream Turbo v1.3.9 merge (commit 0dc4e20). State on `main` to be confirmed.

## Voices (TTS)

Routing in `_single_tts` (`app/services/voice.py:640`), by voice name prefix.

| Prefix | Function | Key in config |
|---|---|---|
| (default, Edge/Azure v1) | `azure_tts_v1` (`voice.py:1535`) | `edge_tts_timeout` |
| `-V2` | `azure_tts_v2` (`:1784`) | `[azure]` speech_key, speech_region |
| `siliconflow:` | `siliconflow_tts` (`:1604`) | `[siliconflow]` api_key |
| `gemini:` | `gemini_tts` (`:1913`) | `gemini_api_key` |
| `mimo:` | `mimo_tts` (`:2055`) | mimo_api_key, mimo_base_url, mimo_tts_model_name |
| `minimax:` | `minimax_tts` (`:2380`) | `[minimax_tts]` |
| `elevenlabs:` | `elevenlabs_tts` (`:2473`) | `[elevenlabs]` api_key |
| `chatterbox:` | `chatterbox_tts` (`:2766`) | `[chatterbox]` |
| `kokoro:` | `kokoro_tts` (`:2808`) | `[kokoro]` |
| `fish_audio:` | `fish_audio_tts` (`:2862`) | `[fish_audio]` or `FISH_API_KEY` |
| `voxcpm:` | `voxcpm_tts` (`:3210`) | `[voxcpm]` |
| `no-voice` | `generate_silent_audio` (`:593`) | none |

## Video material

| Source (`video_source`) | Module and function | Key | Authentication |
|---|---|---|---|
| `pexels` | `material.py` `search_videos_pexels` (`:341`) | `pexels_api_keys` | header |
| `pixabay` | `search_videos_pixabay` (`:448`) | `pixabay_api_keys` | query string |
| `coverr` | `search_videos_coverr` (`:590`) | `coverr_api_keys` | Bearer (`material.py:615`) |
| `wavespeed` | `generate_videos_wavespeed` (`:805`) | `wavespeed_api_keys` | key |
| `volcengine_seedance` | `volcengine_seedance.py` | `volcengine_seedance_api_key` (env `VOLCENGINE_ARK_API_KEY`) | Bearer |
| `ofox` | `ofox.py` | `ofox_api_key` (env `OFOX_API_KEY`) | Bearer |
| `muapi` | `muapi.py` | `muapi_api_key` (env `MUAPI_API_KEY`) | `x-api-key` |
| `metaso_minimax` | `metaso_minimax.py` | `metaso_minimax_api_key` | Bearer |
| `openai_image` | `generate_images_openai` (`:1677`) | `openai_image_base_url`, `openai_image_api_keys` (optional) | Bearer (optional) |
| `loomloom` (WebUI only) | `loomloom.py` | `loomloom_api_token` (falls back to `shengsuanyun_api_key`) | Bearer, confirmed quote |
| `local` | `video.preprocess_video` (`app/services/video.py:1955`) | none | — |

TwelveLabs (optional term reranking): `twelvelabs_api_keys`, `twelvelabs_marengo_model`, `twelvelabs_pegasus_model`.

## Music and publishing

| Service | Module | Key | Note |
|---|---|---|---|
| Sonilo | `app/services/sonilo.py` | `sonilo_api_key`, env `SONILO_API_KEY` | prompt up to 2000 characters |
| ElevenLabs Music | `app/services/elevenlabs_music.py` | `[elevenlabs] api_key` | `music_model_id = "music_v2"`, prompt up to 1000 characters |
| upload-post | `app/services/upload_post.py` (`API_BASE`, `:24`) | `upload_post_api_key`, `upload_post_username` | `Authorization: Apikey ...` |

## Connections

- [[LLM providers]] — how the registry works.
- [[Subscriptions instead of keys]] — `claude_code` and `kimi_code`.
- [[Voice and subtitles]], [[Video material]] and [[Music and publishing]] — the stages that use these tables.
- [[Configuration keys]] — the full list of keys in `[app]`.
- [[03 - Integrations.canvas|Canvas]]
