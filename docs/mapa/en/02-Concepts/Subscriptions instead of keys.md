---
title: Subscriptions instead of keys
tags: [mapa, integracoes, status/unstable]
lang: en
sources: [app/services/llm.py, app/services/kimi_code_oauth.py, app/models/llm_provider.py, config.example.toml, Dockerfile.claude, docker-compose.claude.yml, webui/kimi_login.py]
---
# Subscriptions instead of keys

[[00 - Index|← Index]]

Two providers use the subscription you already pay for (Claude or Kimi) instead of a per-token API key.

## Core idea

An API key is billed per use: every token goes on the account. A subscription is a monthly plan with a usage limit. It does not give out a key. The credential stays with the official client (the Claude CLI or the Kimi OAuth login), and the program only asks that client to answer. That is why these providers have `requires_api_key=False` in the registry.

| | API key | Subscription |
|---|---|---|
| How it authenticates | `Authorization` with a key in `[app]` | logged-in CLI or OAuth token |
| Billing | per token | monthly plan, with a limit |
| Providers | most of them | `claude_code`, `kimi_code` |

## How it works

### Claude (`claude_code`)

The adapter does not talk to the Anthropic API. It runs the official CLI in headless mode (`app/services/llm.py:545`).

1. Command: `claude -p --output-format json --system-prompt <...> --tools "" --safe-mode`, with `--model` only when `claude_code_model_name` is set (`llm.py:~560-580`). The prompt goes through **stdin**, because on Windows `cmd.exe` cuts multi-line prompts passed as arguments.
2. `--tools ""` turns tools off. `--safe-mode` turns off CLAUDE.md, skills, hooks, plugins and MCP. It runs in an empty temporary directory (`llm.py:~590`).
3. Minimum version: `CLAUDE_CODE_MIN_CLI_VERSION = "2.1.260"` (`llm.py:82`). An older CLI exits with `unknown option`, and the error asks for an upgrade.
4. `build_claude_code_env` (`llm.py:167`) removes variables that would switch the subscription to another billing path: the `ANTHROPIC_*` and `CLAUDE_CODE_USE_*` prefixes, plus `AWS_BEARER_TOKEN_BEDROCK` and `CLAUDE_CODE_SKIP_*_AUTH`. It keeps `CLAUDE_CODE_OAUTH_TOKEN`, `ANTHROPIC_CONFIG_DIR` and `CLAUDE_CONFIG_DIR`.
5. Timeout: `claude_code_timeout`, default 300 s (`CLAUDE_CODE_DEFAULT_TIMEOUT`, `llm.py:78`). `coerce_claude_code_timeout` (`llm.py:115`) rejects zero, negatives, `nan` and `inf`.

In Docker, `Dockerfile.claude` installs `@anthropic-ai/claude-code@2.1.260` with npm. `docker-compose.claude.yml` requires `CLAUDE_CODE_OAUTH_TOKEN` (the `:?` form makes it mandatory). The token is produced on the host with `claude setup-token`, because the container has no keychain.

### Kimi (`kimi_code`)

Login uses the device flow (RFC 8628), in `app/services/kimi_code_oauth.py`.

1. Request a code: `POST {auth}/api/oauth/device_authorization` (`kimi_code_oauth.py:162`). The user approves in the browser.
2. Exchange for a token: `POST {auth}/api/oauth/token` (`:202`), with `grant_type=urn:ietf:params:oauth:grant-type:device_code` (`:209-210`).
3. Regions are in `_REGIONS` (`:47`). China: `auth.kimi.com` and `api.kimi.com/coding/v1`. Global: `auth.kimi.ai` and `api.kimi.ai/coding/v1`.
4. The token expires after `expires_in`, default 900 s = 15 min (`:266`). `get_valid_access_token` (`:311`) renews it 60 s before expiry (`_EXPIRY_MARGIN_SECONDS`, `:71`), with a lock against concurrent renewals.
5. Tokens are stored in `[app]`: `kimi_code_access_token`, `kimi_code_refresh_token`, `kimi_code_token_expires_at` and `kimi_code_region` (`config.example.toml:475-480`).
6. The call uses the OpenAI SDK with the access token and the CLI identity headers (`llm.py:666-724`). The token's issuing region wins over the region picked in the UI, because a token from one region gets a 401 in the other.
7. The login screen is `webui/kimi_login.py` (`render_kimi_login`, `:129`).

## Example / walkthrough

A user picks `claude_code` with `claude_code_timeout` empty. `coerce_claude_code_timeout` returns 300 s. The CLI answers with a JSON carrying `result`, and `_normalize_text_response` cleans the text. The script goes to `storage/tasks/<id>/script.json`. If the CLI is logged out, the JSON has `is_error` and the login message, and the task gets `[claude_code] returned an error response`.

## Pitfalls

- **An old key in the environment.** If `ANTHROPIC_API_KEY` is set, it is removed. Billing follows the subscription, not the key. The log records only the name of the removed variable.
- **Docker without a token.** Inside the container there is no interactive login. Without `CLAUDE_CODE_OAUTH_TOKEN` the call fails, and the message suggests `claude setup-token`.
- **Stale docstring.** The header of `kimi_code_oauth.py` (lines 9-12) says the program calls `{api}/usages` and `{api}/messages`. The code only calls chat completions. The description is wrong.

> [!warning] unstable
> The section below mixes what **already landed** (xAI TTS, API key) and what is still **PLANNED**. I searched the repository for `Codex`, `Gemini CLI`, `Grok Build` and `SuperGrok` and found no implementation. The project phase plan was not found in the repository.

## xAI TTS (implemented, API key)

Grok Voice is **not** a subscription adapter. It calls the official `POST https://api.x.ai/v1/tts` endpoint with a Bearer token (`XAI_API_KEY`, `[xai].api_key`, or, if both are empty, `grok_api_key`). The voice prefix is `xai:`. See [[Voice and subtitles]].

xAI STT (`POST /v1/stt`) is **not** wired: TTS already returns native timestamps (`with_timestamps` → `graph_chars` / `graph_times`). An extra STT pass would re-transcribe the audio, adding cost and the risk of drifting from the script.

## Next (PLANNED)

| Item | State |
|---|---|
| Codex CLI (subscription) | PLANNED, does not exist |
| Gemini CLI (subscription) | PLANNED, does not exist |
| Grok Build / SuperGrok | PLANNED, does not exist |

## Practice

1. Why does `claude_code` remove `ANTHROPIC_API_KEY` from the environment before running the CLI?
2. Why is the prompt sent through stdin instead of as an argument?
3. How long does a Kimi access token last, and when is it renewed?

> [!faq]- Answer key
> 1. So the CLI uses the subscription login, not the key. Without the removal, billing would go to the API account. The function is `build_claude_code_env` (`llm.py:167`).
> 2. On Windows `cmd.exe` cuts arguments at the first newline (comment in `llm.py`, near line 556). Stdin keeps the whole prompt.
> 3. 15 min (900 s by default, `kimi_code_oauth.py:266`). Renewed 60 s before expiry (`:71`), using the refresh token.

## Connections

- [[LLM providers]] — the registry and the adapters.
- [[Configuration keys]] — `kimi_code_*` and `claude_code_*`.
- [[Configuration and locks]] — why config reads go through the lock.
- [[03 - Integrations.canvas|Canvas]]
