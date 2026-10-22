---
title: Chaves de configuração
tags: [mapa, referencia, status/unstable]
aliases: [Referência do config.toml]
lang: pt-BR
sources: [config.example.toml, app/config/config.py, app/services/task.py, app/services/voice.py, app/services/ofox.py, app/services/muapi.py, app/services/volcengine_seedance.py, app/services/loomloom.py, app/models/llm_provider.py, app/services/upload_post.py]
---
# Chaves de configuração

[[00 - Índice|← Índice]]

Referência das seções e chaves de `config.example.toml`, o que cada uma controla e quais são segredos. Os números de linha são do arquivo de exemplo.

> [!warning] unstable
> A seção `[diagnostics]` (`config.example.toml:14-24`, chave `log_requests`) e o provedor EmpirioLabs (`config.example.toml:325-329`) vêm do merge do upstream Turbo v1.3.9. Estado a confirmar. As demais chaves estão na `main`.

## Ideia central

O `config.toml` é cópia do exemplo, criada na primeira execução. Cada seção vai para um lugar diferente no código. A maioria das chaves de `[app]` é de provedor: uma chave de API, uma URL e um modelo, por provedor. Há uma regra: segredo fica só no `config.toml`, nunca no git (`.gitignore:2`).

## Como funciona

### Seções

| Seção | Linha | Controla | Segredos |
|---|---|---|---|
| (topo) | `:9-12` | `log_level`, `listen_host` (padrão `0.0.0.0`), `listen_port` (`8080`) | não |
| `[diagnostics]` | `:14` | `log_requests` (rastreamento de requisições, unstable) | não |
| `[app]` | `:26` | o restante: API, materiais, LLM, TTS, fila, Redis, publicação | sim, muitos |
| `[whisper]` | `:609` | legenda por Whisper: `model_size`, `device`, `compute_type` | não |
| `[proxy]` | `:626` | proxy para Pexels, Pixabay, Coverr e downloads de material. Chaves `http` e `https` comentadas no exemplo | a URL pode levar usuário e senha |
| `[azure]` | `:637` | voz Azure v2: `speech_key`, `speech_region` | `speech_key` |
| `[siliconflow]` | `:643` | voz SiliconFlow | `api_key` |
| `[minimax_tts]` | `:647` | voz MiniMax | `api_key` |
| `[elevenlabs]` | `:665` | voz e música ElevenLabs | `api_key` |
| `[chatterbox]` | `:678` | voz Chatterbox (servidor próprio) | `api_key` |
| `[kokoro]` | `:687` | voz Kokoro (servidor próprio) | `api_key` |
| `[fish_audio]` | `:697` | voz Fish Audio | `api_key` |
| `[voxcpm]` | `:722` | voz VoxCPM, com clonagem por áudio de referência | `api_key` |
| `[ui]` | `:736` | preferências da WebUI (`hide_log`, `open_task_folder_on_completion`) | não |

A seção `[ui]` do exemplo tem só duas chaves. A WebUI grava outras (voz, legenda, fonte e cores) no `config.toml` real, e o CLI lê as mesmas chaves como padrão (veja [[Flags do CLI]]).

### Chaves de `[app]` por grupo

| Grupo | Chaves (linha) |
|---|---|
| Acesso à API | `api_key` (38), `endpoint` (557) |
| Comportamento da WebUI | `hide_config` (46), `script_generation_backend` (51) |
| Rede e TTS | `tls_verify` (71), `edge_tts_timeout` (67) |
| Materiais padrão | `video_source` (90), `match_materials_to_script` (236), `material_directory` (562) |
| Pexels, Pixabay, Coverr | `pexels_api_keys` (97), `pixabay_api_keys` (100), `coverr_api_keys` (103) |
| WaveSpeed | `wavespeed_api_keys` (107) |
| Volcengine Seedance | `volcengine_seedance_api_key` (125), `_base_url` (126), `_model` (129), `_resolution` (130), `_min_duration` (131), `_max_duration` (132), `_poll_interval` (133), `_run_timeout` (134), `_watermark` (135) |
| OFox | `ofox_api_key` (142), `_base_url` (143), `_text_to_video_model` (145), `_resolution` (149), `_min_duration` (154), `_max_duration` (155), `_provider` (168), `_poll_interval` (169), `_run_timeout` (170) |
| MuAPI | `muapi_api_key` (177), `_base_url` (178), `_video_endpoint` (180), `_resolution` (181), `_min_duration` (182), `_max_duration` (183), `_poll_interval` (184), `_run_timeout` (185) |
| Metaso MiniMax | `metaso_minimax_api_key` (192), `_base_url` (193), `_resolution` (194), `_poll_interval` (195), `_run_timeout` (196) |
| OpenAI image | `openai_image_base_url` (205), `openai_image_api_keys` (208), `openai_image_model` (211), `_size` (217), `_prompt_template` (221) |
| TwelveLabs | `twelvelabs_api_keys` (226), `twelvelabs_rerank_terms` (229); modelos `twelvelabs_marengo_model` e `twelvelabs_pegasus_model` comentados (231-232) |
| Música Sonilo | `sonilo_api_key` (241), `sonilo_base_url` (242), `sonilo_timeout` (244) |
| LoomLoom | `loomloom_base_url` (58), `loomloom_api_token` (59), `loomloom_request_timeout_seconds` (60), `loomloom_poll_interval_seconds` (61), `loomloom_run_timeout_seconds` (62), `loomloom_video_run_timeout_seconds` (63) |
| Provedor de LLM | `llm_provider` (253); chaves por provedor, na tabela abaixo |
| Provedores Claude Code e Kimi | `claude_code_model_name` (468), `claude_code_cli_path` (469), `claude_code_timeout` (470), `kimi_code_model_name` (479), `kimi_code_timeout` (480) |
| Ollama e LiteLLM | `ollama_base_url` (453), `ollama_model_name` (454), `litellm_model_name` (492) |
| Legenda | `subtitle_provider` (516), padrão `edge` |
| TTS extra | `mimo_tts_model_name` (510), `mimo_tts_style_prompt` (511) |
| Fila e Redis | `enable_redis` (566), `redis_host` (567), `redis_port` (568), `redis_db` (569), `redis_password` (570), `max_concurrent_tasks` (573), `max_queued_tasks` (574) |
| Publicação | `upload_post_enabled` (583), `upload_post_api_key` (584), `upload_post_username` (585), `upload_post_platforms` (587), `upload_post_auto_upload` (589), `upload_post_youtube_privacy_status` (591), `upload_post_youtube_made_for_kids` (598), `upload_post_max_pending_tasks` (603) |

### Provedores de LLM

Cada provedor usa três chaves com o mesmo prefixo: `<id>_api_key`, `<id>_base_url` e `<id>_model_name`. O nome é escolhido por `llm_provider` (`config.example.toml:253`). O registro de provedores fica em `app/models/llm_provider.py`.

| Provedor | `api_key` | `base_url` | `model_name` |
|---|---|---|---|
| moonshot (padrão) | 257 | 258 | 259 |
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
| azure | 367 | 368 | 369 (mais `azure_api_version`, 370) |
| volcengine | 374 | 375 | 376 |
| grok | 380 | 381 | 382 |
| minimax | 387 | 388 | 389 |
| mimo | 393 | 394 | 395 |
| iflytek | 401 | 402 | 403 |
| cloudflare | 408 | — | 411 (mais `cloudflare_account_id` 409 e `cloudflare_gateway_id` 410) |
| modelscope | 415 | 416 | 417 |
| aihubmix | 421 | 422 | 423 |
| aimlapi | 427 | 428 | 429 |
| evolink | 433 | 434 | 435 |
| openrouter | 440 | 441 | 442 |
| api_route | 447 | 448 | 449 |
| oneapi | 484 | 485 | 486 |
| groq | 496 | 497 | 498 |
| pollinations | 501 | 502 | 503 |
| ollama (sem chave) | — | 453 | 454 |
| claude_code (assinatura) | — | — | 468 (mais CLI em 469, timeout em 470) |
| kimi_code (login OAuth) | — | — | 479 (mais timeout em 480) |
| litellm (usa variáveis de ambiente) | — | — | 492 |

### Segredos

Preenchidos só no `config.toml` real:

- `[app]`: `api_key` (38), `loomloom_api_token` (59), `pexels_api_keys` (97), `pixabay_api_keys` (100), `coverr_api_keys` (103), `wavespeed_api_keys` (107), `volcengine_seedance_api_key` (125), `ofox_api_key` (142), `muapi_api_key` (177), `metaso_minimax_api_key` (192), `openai_image_api_keys` (208), `twelvelabs_api_keys` (226), `sonilo_api_key` (241), `redis_password` (570), `upload_post_api_key` (584);
- chaves `*_api_key` de todos os provedores de LLM listados acima;
- seções de voz: `[azure] speech_key` (640), `[siliconflow] api_key` (645), `[minimax_tts] api_key` (653), `[elevenlabs] api_key` (668), `[chatterbox] api_key` (682), `[kokoro] api_key` (691), `[fish_audio] api_key` (701), `[voxcpm] api_key` (728).

Tokens de login Kimi (`kimi_code_access_token`, `kimi_code_refresh_token`) não aparecem no exemplo; o login os grava no `config.toml` (`config.example.toml:475`).

## Exemplo / percurso

Para trocar o LLM padrão por DeepSeek, edite duas chaves de `[app]` e reinicie o processo:

```toml
llm_provider = "deepseek"        # config.example.toml:253
deepseek_api_key = "sk-..."      # linha 356 do exemplo
```

O `deepseek_model_name` (358) vem vazio no exemplo, então preencha com o modelo desejado. Sem reiniciar, o processo da API mantém a configuração antiga, porque `config.toml` é lido na importação (veja [[Configuração e travas]]).

## Armadilhas

- **`tls_verify` é uma chave só, para três provedores.** Ofox, MuAPI e Seedance leem a mesma chave de `[app]` (`app/services/ofox.py:157`, `muapi.py:139`, `volcengine_seedance.py:142`), com padrão `true`. Não há como desligar a verificação só para um deles.
- **`redis_password` é texto puro.** O Redis precisa ficar em rede privada. O código confia no que vem do Redis (`app/services/state.py:300`).
- **O exemplo não tem todas as chaves de `[ui]`.** O padrão real vem do que a WebUI grava. Um `config.toml` antigo pode ter valores diferentes do exemplo.
- **O exemplo tem chaves vazias.** Só o `config.toml` recebe valores reais. O `.gitignore` cobre esse arquivo (`.gitignore:2`).

## Prática

1. Qual é o nome da chave de API do provedor OpenAI, e em qual linha do exemplo ela está?
2. Qual seção guarda a chave de API para a voz ElevenLabs, e a chave de API para a música ElevenLabs usa a mesma?
3. Se você quer desligar a verificação TLS só para o Ofox, o que a configuração permite?

> [!faq]- Gabarito
> 1. `openai_api_key`, linha 333 de `config.example.toml`. O provedor é escolhido por `llm_provider`.
> 2. `[elevenlabs] api_key` (linha 668). A música usa a mesma seção, com `music_base_url` (674) e `music_model_id` (675).
> 3. Não dá. `tls_verify` é uma chave de `[app]` (`config.example.toml:71`) lida também por MuAPI e Seedance. Desligá-la afeta os três, por isso só faça isso em rede confiável.

## Conexões

- [[Configuração e travas]]: como o arquivo é lido, gravado e protegido.
- [[Flags do CLI]]: os padrões de `[ui]` que o CLI reaproveita.
- [[Pipeline e stop_at]]: quais provedores entram em cada etapa.
- [[Portas de entrada]]: quem usa `api_key` e quem não usa.
- Canvas: [[03 - Integrações.canvas|Canvas]].
