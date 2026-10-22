---
title: LLM providers
tags: [mapa, integracoes, status/unstable]
lang: en
sources: [app/models/llm_provider.py, app/services/llm.py, config.example.toml, webui/Main.py, webui/i18n/en.json, test/services/test_fluxionai_llm.py]
---
# LLM providers

[[00 - Index|← Index]]

An LLM provider is the service that writes the script, the search terms and the publishing texts. The program knows 37 providers, all declared in one registry.

## Core idea

Each provider is one entry in `LLM_PROVIDER_REGISTRY` (`app/models/llm_provider.py:195`). The entry says **what** the provider is: name, default model, default URL and whether it needs a key. The code that **makes** the call lives in `app/services/llm.py`, chosen by the `adapter` field. That is why most new providers need only one entry.

## How it works

1. The configuration picks the provider in `[app] llm_provider`, default `moonshot` (`config.example.toml:253`; `DEFAULT_LLM_PROVIDER_ID` in `app/models/llm_provider.py:4`).
2. `_generate_response` (`app/services/llm.py:314`) reads `<id>_api_key`, `<id>_model_name` and `<id>_base_url` from `config.app`. If the model is in `deprecated_models`, it is replaced by `default_model`. If the URL is empty, the registry's `default_base_url` is used.
3. If `adapter` is not `openai_compatible`, a dedicated branch runs: `qwen` (`:397`), `gemini` (`:423`), `cloudflare_ai_gateway` (`:473`), `litellm` (`:494`), `azure` (`:516`), `claude_code` (`:545`), `kimi_code` (`:666`) and `modelscope` (`:725`).
4. Everything else goes to the OpenAI SDK with `chat.completions.create` (`:754`).
5. A failure does not raise to the caller. The `except` returns the string `"Error: ..."` (`:778`), and callers check the prefix (e.g. `:964`).

| Adapter | Providers | Authentication |
|---|---|---|
| `openai_compatible` (default) | 29, including `ollama` and `oneapi` | API key (`ollama` uses none) |
| `gemini` | `gemini` | key |
| `qwen` | `qwen` (dashscope SDK) | key |
| `azure` | `azure` | key, URL and `azure_api_version` |
| `cloudflare_ai_gateway` | `cloudflare` | key, `account_id` and `gateway_id` |
| `modelscope` | `modelscope` | key |
| `litellm` | `litellm` | environment variables, such as `OPENAI_API_KEY` |
| `claude_code` | `claude_code` | Claude subscription (CLI) — see [[Subscriptions instead of keys]] |
| `kimi_code` | `kimi_code` | Kimi subscription (OAuth) — see [[Subscriptions instead of keys]] |

The full table, generated from the registry, is in [[Providers and adapters]].

## Example / walkthrough

Minimal config to use DeepSeek:

```toml
[app]
llm_provider = "deepseek"
deepseek_api_key = "sk-..."
deepseek_base_url = ""     # empty: uses https://api.deepseek.com
deepseek_model_name = ""   # empty: uses deepseek-v4-pro
```

With this, `_generate_response` builds `OpenAI(api_key=..., base_url="https://api.deepseek.com")` and asks for the script. The result goes to `storage/tasks/<id>/script.json`, written by `save_script_data` (`app/services/task.py`). A provider error becomes a failure of the `script` stage in the task state, not an exception in the terminal.

## Pitfalls

- **Empty key for a provider that needs one.** It fails before any network call, with `api_key is not set` (`llm.py:377`).
- **Providers with no default URL.** `azure` and `oneapi` have no `default_base_url` in the registry. The URL must be filled in, or the call fails with `base_url is not set` (`llm.py:385`).
- **Errors are text.** Because errors come back as `"Error: ..."`, new code must check the prefix, or the message ends up as a script.
- **WebUI labels are uneven.** AGENTS.md asks for the key `llm_provider_label.<id>` in all 14 `webui/i18n/*.json` files. Today only `en` and `zh` have the 15 labels, and the other files have only the `moonshot` one. The rest show the registry's `default_label`.

> [!warning] unstable
> `empiriolabs` (EmpirioLabs AI) came from the upstream Turbo v1.3.9 merge (commit 0dc4e20 according to the divergence report). State on `main` to be confirmed. The rest of this note is `main` state.

## How to add a new provider

1. **Registry.** Add an `LLMProviderSpec` to `LLM_PROVIDER_REGISTRY` (`app/models/llm_provider.py:195`). The tuple order is the dropdown order. For an OpenAI-compatible provider, `provider_id`, `default_label`, `api_key_url`, `default_model` and `default_base_url` are enough. Only write a new branch in `llm.py` if the protocol is different.
2. **Config.** Copy an existing block in `config.example.toml`, inside `[app]`: `<id>_api_key`, `<id>_base_url` and `<id>_model_name` (e.g. the `groq_*` block).
3. **Interface.** Add `llm_provider_label.<id>` to all 14 `webui/i18n/*.json` files (AGENTS.md). The WebUI falls back to `default_label` if the key is missing (`webui/Main.py:2277`). `llm_provider_tips.<id>` is optional and only shown if present (`Main.py:2196`).
4. **Test.** Use `test/services/test_fluxionai_llm.py` as a model: `uv run python -X utf8 -m pytest -q test/services/test_fluxionai_llm.py test/services/test_llm.py`.

## Practice

1. On which line of the registry is the default provider, and which one is it?
2. Does an OpenAI-compatible provider need a new branch in `llm.py`? Why?
3. If `deepseek_api_key` is empty, what happens before any network call?

> [!faq]- Answer key
> 1. Line 195 (`LLM_PROVIDER_REGISTRY` starts there; the first item is `moonshot`). That is why it is the default in `DEFAULT_LLM_PROVIDER_ID` (`:4`).
> 2. No. The default path is the OpenAI SDK with a `base_url`. A new branch is only for a different protocol.
> 3. `_generate_response` raises `ValueError: deepseek: api_key is not set` (`llm.py:377`). No request goes out, and the task fails at the `script` stage.

## Connections

- [[Subscriptions instead of keys]] — `claude_code` and `kimi_code`, which use no key.
- [[Providers and adapters]] — the full registry table.
- [[Configuration keys]] — where `<id>_api_key` and the other keys live.
- [[Pipeline and stop_at]] — the `script` stage that uses the LLM.
- [[03 - Integrations.canvas|Canvas]]
