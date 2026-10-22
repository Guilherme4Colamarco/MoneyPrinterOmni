---
title: Provedores e adaptadores
tags: [mapa, integracoes, status/stable]
lang: pt-BR
sources: [app/models/llm_provider.py, app/services/llm.py, app/services/voice.py, app/services/material.py, app/services/bgm.py, app/services/upload_post.py, config.example.toml]
---
# Provedores e adaptadores

[[00 - Índice|← Índice]]

Tabelas de referência. A tabela de LLM foi **gerada** a partir de `LLM_PROVIDER_REGISTRY` com `PYTHONPATH=<worktree> python3 -c "from app.models.llm_provider import LLM_PROVIDER_REGISTRY ..."`, não digitada à mão. Total: 37 provedores. Ver a explicação em [[Provedores de LLM]].

## Adaptadores de LLM

| Adaptador | Provedores | Ramo em `llm.py` |
|---|---|---|
| `openai_compatible` | 29 | padrão, `llm.py:754` |
| `gemini` | `gemini` | `:423` |
| `qwen` | `qwen` | `:397` |
| `azure` | `azure` | `:516` |
| `cloudflare_ai_gateway` | `cloudflare` | `:473` |
| `modelscope` | `modelscope` | `:725` |
| `litellm` | `litellm` | `:494` |
| `claude_code` | `claude_code` | `:545` |
| `kimi_code` | `kimi_code` | `:666` |

## Provedores de LLM (registro completo)

Colunas: `Base URL padrão` mostra o `effective_default_base_url` do registro. Quando há regiões, aparecem as ids. `Onde a chave vive` é a chave em `[app]` de `config.example.toml`.

| provider_id | Nome | Adaptador | Exige chave? | Base URL padrão | Onde a chave vive |
|---|---|---|---|---|---|
| `moonshot` | Kimi / Moonshot AI | `openai_compatible` | sim | https://api.moonshot.cn/v1 (região: china, global) | moonshot_api_key |
| `kimi_code` | Kimi Code (Kimi subscription) | `kimi_code` | não | https://api.kimi.com/coding/v1 (região: china, global) | OAuth: kimi_code_access_token/refresh/expires/region |
| `openai` | OpenAI | `openai_compatible` | sim | https://api.openai.com/v1 | openai_api_key |
| `anthropic` | Anthropic Claude | `openai_compatible` | sim | https://api.anthropic.com/v1/ | anthropic_api_key |
| `gemini` | Google Gemini | `gemini` | sim | — | gemini_api_key |
| `muse_spark` | Muse Spark | `openai_compatible` | sim | https://api.meta.ai/v1 | muse_spark_api_key |
| `deepseek` | DeepSeek | `openai_compatible` | sim | https://api.deepseek.com | deepseek_api_key |
| `qwen` | Alibaba Cloud Qwen | `qwen` | sim | — | qwen_api_key |
| `azure` | Microsoft Azure OpenAI | `azure` | sim | — | azure_api_key |
| `volcengine` | ByteDance VolcEngine Ark | `openai_compatible` | sim | https://ark.cn-beijing.volces.com/api/v3 | volcengine_api_key |
| `grok` | xAI Grok | `openai_compatible` | sim | https://api.x.ai/v1 | grok_api_key |
| `minimax` | MiniMax | `openai_compatible` | sim | https://api.minimax.io/v1 | minimax_api_key |
| `mimo` | Xiaomi MiMo | `openai_compatible` | sim | https://api.xiaomimimo.com/v1 | mimo_api_key |
| `iflytek` | iFlytek Spark (Astron MaaS) | `openai_compatible` | sim | https://maas-api.cn-huabei-1.xf-yun.com/v2 | iflytek_api_key |
| `shengsuanyun` | Shengsuan Cloud | `openai_compatible` | sim | https://router.shengsuanyun.com/api/v1 | shengsuanyun_api_key |
| `apimart` | APIMart | `openai_compatible` | sim | https://api.apimart.ai/v1 | apimart_api_key |
| `cloudflare` | Cloudflare AI Gateway | `cloudflare_ai_gateway` | sim | — | cloudflare_api_key + cloudflare_account_id + cloudflare_gateway_id |
| `modelscope` | Alibaba ModelScope | `modelscope` | sim | https://api-inference.modelscope.cn/v1/ | modelscope_api_key |
| `aihubmix` | AIHubMix | `openai_compatible` | sim | https://aihubmix.com/v1 | aihubmix_api_key |
| `aimlapi` | AIML API | `openai_compatible` | sim | https://api.aimlapi.com/v1 | aimlapi_api_key |
| `evolink` | EvoLink | `openai_compatible` | sim | https://direct.evolink.ai/v1 | evolink_api_key |
| `openrouter` | OpenRouter | `openai_compatible` | sim | https://openrouter.ai/api/v1 | openrouter_api_key |
| `api_route` | API Route | `openai_compatible` | sim | https://www.api-route.com/v1 | api_route_api_key |
| `fluxionai` | Fluxion AI | `openai_compatible` | sim | https://fluxionai.space/v1 | fluxionai_api_key |
| `cheaperinference` | Cheaper Inference | `openai_compatible` | sim | https://api.cheaperinference.com/v1 | cheaperinference_api_key |
| `requesty` | Requesty | `openai_compatible` | sim | https://router.requesty.ai/v1 | requesty_api_key |
| `futureinfra` | FutureInfra | `openai_compatible` | sim | https://futureinfra.ai/v1/ai | futureinfra_api_key |
| `yapi` | Y-API | `openai_compatible` | sim | https://api.y-api.bestvirtualgoods.com/v1 | yapi_api_key |
| `opper` | Opper | `openai_compatible` | sim | https://api.opper.ai/v3/compat | opper_api_key |
| `onomeo` | onomeo | `openai_compatible` | sim | https://onomeo.com/v1 | onomeo_api_key |
| `empiriolabs` | EmpirioLabs AI | `openai_compatible` | sim | https://api.empiriolabs.ai/v1 | empiriolabs_api_key |
| `ollama` | Ollama | `openai_compatible` | não | — (detectado em tempo de execução) | não usa chave (api_key fixo "ollama") |
| `claude_code` | Claude Code (Claude subscription) | `claude_code` | não | — | não usa chave (CLI logado) |
| `oneapi` | OneAPI | `openai_compatible` | sim | — | oneapi_api_key |
| `litellm` | LiteLLM | `litellm` | não | — | env (ex.: OPENAI_API_KEY); sem chave em [app] |
| `groq` | Groq | `openai_compatible` | sim | https://api.groq.com/openai/v1 | groq_api_key |
| `pollinations` | Pollinations AI | `openai_compatible` | sim | https://gen.pollinations.ai/v1 | pollinations_api_key |

> [!warning] unstable
> A linha `empiriolabs` veio do merge do upstream Turbo v1.3.9 (commit 0dc4e20). Estado a confirmar na `main`.

## Vozes (TTS)

Roteamento em `_single_tts` (`app/services/voice.py:640`), pelo prefixo do nome da voz.

| Prefixo | Função | Chave em config |
|---|---|---|
| (padrão, Edge/Azure v1) | `azure_tts_v1` (`voice.py:1535`) | `edge_tts_timeout` |
| `-V2` | `azure_tts_v2` (`:1784`) | `[azure]` speech_key, speech_region |
| `siliconflow:` | `siliconflow_tts` (`:1604`) | `[siliconflow]` api_key |
| `gemini:` | `gemini_tts` (`:1913`) | `gemini_api_key` |
| `mimo:` | `mimo_tts` (`:2055`) | mimo_api_key, mimo_base_url, mimo_tts_model_name |
| `minimax:` | `minimax_tts` (`:2380`) | `[minimax_tts]` |
| `elevenlabs:` | `elevenlabs_tts` (`:2473`) | `[elevenlabs]` api_key |
| `chatterbox:` | `chatterbox_tts` (`:2766`) | `[chatterbox]` |
| `kokoro:` | `kokoro_tts` (`:2808`) | `[kokoro]` |
| `fish_audio:` | `fish_audio_tts` (`:2862`) | `[fish_audio]` ou `FISH_API_KEY` |
| `voxcpm:` | `voxcpm_tts` (`:3210`) | `[voxcpm]` |
| `no-voice` | `generate_silent_audio` (`:593`) | nenhuma |

## Material de vídeo

| Fonte (`video_source`) | Módulo e função | Chave | Autenticação |
|---|---|---|---|
| `pexels` | `material.py` `search_videos_pexels` (`:341`) | `pexels_api_keys` | cabeçalho |
| `pixabay` | `search_videos_pixabay` (`:448`) | `pixabay_api_keys` | query string |
| `coverr` | `search_videos_coverr` (`:590`) | `coverr_api_keys` | Bearer (`material.py:615`) |
| `wavespeed` | `generate_videos_wavespeed` (`:805`) | `wavespeed_api_keys` | chave |
| `volcengine_seedance` | `volcengine_seedance.py` | `volcengine_seedance_api_key` (env `VOLCENGINE_ARK_API_KEY`) | Bearer |
| `ofox` | `ofox.py` | `ofox_api_key` (env `OFOX_API_KEY`) | Bearer |
| `muapi` | `muapi.py` | `muapi_api_key` (env `MUAPI_API_KEY`) | `x-api-key` |
| `metaso_minimax` | `metaso_minimax.py` | `metaso_minimax_api_key` | Bearer |
| `openai_image` | `generate_images_openai` (`:1677`) | `openai_image_base_url`, `openai_image_api_keys` (opcional) | Bearer |
| `loomloom` (só WebUI) | `loomloom.py` | `loomloom_api_token` (cai em `shengsuanyun_api_key`) | Bearer, cotação confirmada |
| `local` | `video.preprocess_video` (`app/services/video.py:1955`) | nenhuma | — |

TwelveLabs (reordenação de termos, opcional): `twelvelabs_api_keys`, `twelvelabs_marengo_model`, `twelvelabs_pegasus_model`.

## Música e publicação

| Serviço | Módulo | Chave | Observação |
|---|---|---|---|
| Sonilo | `app/services/sonilo.py` | `sonilo_api_key`, env `SONILO_API_KEY` | prompt até 2000 caracteres |
| ElevenLabs Music | `app/services/elevenlabs_music.py` | `[elevenlabs] api_key` | `music_model_id = "music_v2"`, prompt até 1000 caracteres |
| upload-post | `app/services/upload_post.py` (`API_BASE`, `:24`) | `upload_post_api_key`, `upload_post_username` | `Authorization: Apikey ...` |

## Conexões

- [[Provedores de LLM]] — como o registro funciona.
- [[Assinaturas em vez de chaves]] — `claude_code` e `kimi_code`.
- [[Voz e legenda]], [[Material de vídeo]] e [[Música e publicação]] — as etapas que usam essas tabelas.
- [[Chaves de configuração]] — a lista completa de chaves em `[app]`.
- [[03 - Integrações.canvas|Canvas]]
