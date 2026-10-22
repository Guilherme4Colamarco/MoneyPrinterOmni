---
title: 00 - Index
tags: [mapa, indice, status/stable]
aliases: [Home]
lang: en
---
# 00 - Index

The MoneyPrinterOmni 4D study guide: short linked notes and canvases that draw each flow. Start with the [[Overview]] or the [[00 - Overview.canvas|Overview]] canvas. The site at `docs/mapa/site/index.html` shows the same content.

> [!info] Feature status
> Every note carries the tag `status/stable` (already in `main`) or `status/unstable` (only in the `unstable` branch). See [[Branches main and unstable]].

## Walkthroughs

- [[01 - Video via the API]]: A `POST /api/v1/videos` request from start to finish.
- [[02 - Video via the CLI]]: The same video through `cli.py`, with `--stop-at` and JSON output.
- [[03 - Video via the WebUI]]: The WebUI path: queue, config lock and progress.
- [[04 - Video with the agent team]]: A video through the agent team, from topic to delivery.
- [[05 - Change with the technical team]]: A change to the program driven by the technical team.

## Concepts

- [[Overview]]: The program on one screen.
- [[Pipeline and stop_at]]: The stages, what each writes and where `stop_at` cuts.
- [[Task state and queue]]: States, queue, memory and Redis.
- [[Entry points]]: API, WebUI and CLI side by side.
- [[Configuration and locks]]: `config.toml`, locks and resource paths.
- [[LLM providers]]: The provider registry and how to add one.
- [[Subscriptions instead of keys]]: Subscription login instead of an API key.
- [[Voice and subtitles]]: TTS, pauses and the two subtitle paths.
- [[Video material]]: Stock sites, AI, local files and caches.
- [[Music and publishing]]: Background music and cross-posting.
- [[Agent harness]]: `AGENTS.md` + `.agents/` as the single source of truth.
- [[Claude and Grok adapters]]: The thin files that point to `.agents/`.
- [[MCP and permissions]]: MCP servers, allow/deny and secrets.
- [[Video team and file contracts]]: The roles, the stages and the project folder.
- [[Technical team]]: Who changes and audits the program code.
- [[Channel profiles]]: One profile per channel: identity, tone, safeguards.
- [[Remotion animations]]: Animated graphics that go into the timeline.
- [[Omni and Turbo]]: What came from Turbo and what Omni added.
- [[Branches main and unstable]]: What lives in each branch and how it is promoted.
- [[How to contribute]]: Commands, conventions and PR flow.
- [[Tests and CI]]: The suite, coverage and CI.

## Reference

- [[API routes]]: Every route, handler and authentication.
- [[CLI flags]]: Every `cli.py` flag.
- [[Configuration keys]]: The `config.example.toml` keys.
- [[Providers and adapters]]: LLM, voice, material and music providers.
- [[Agent JSON contracts]]: `sources`, `timing`, `shotlist`, `music`, `arte`.
- [[Roles and models]]: The roles, their models and tools.

## Canvas

- [[00 - Overview.canvas|00 - Overview]]: Everything in one drawing.
- [[01 - Pipeline.canvas|01 - Pipeline]]: The stage flow.
- [[02 - Entry points.canvas|02 - Entry points]]: Three doors, one pipeline.
- [[03 - Integrations.canvas|03 - Integrations]]: Each integration tied to the stage that uses it.
- [[04 - Video team.canvas|04 - Video team]]: The 13 steps and the roles.
- [[05 - Technical team.canvas|05 - Technical team]]: Change and audit modes.
- [[06 - Omni and Turbo.canvas|06 - Omni and Turbo]]: Fork timeline.
- [[07 - Branches.canvas|07 - Branches]]: main, unstable and PRs.
