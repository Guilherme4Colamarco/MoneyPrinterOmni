---
title: Agent harness
tags: [mapa, agentes, status/stable]
aliases: [Harness de agentes]
lang: en
sources: [AGENTS.md, .agents/setup.md, .agents/tecnico.md, .agents/pipeline.md, .agents/grok-bot.md, .agents/comunicacao.md]
---
# Agent harness

[[00 - Index|← Index]]

The repository is also a **harness**: text and JSON files that tell an AI assistant how to produce a video or change the program, so it does not have to guess.

## Core idea

A **harness** is the layer that connects an AI model to the work: rules, roles, step scripts and permissions. Here the harness is not program code. It lives in text files. An assistant that reads `AGENTS.md` and the right skill can run the video team or the technical team.

The golden rule: **one source**. `AGENTS.md` and `.agents/` say what applies. Each tool's folder (`.claude/`, `.grok/`) holds only thin adapters that point back there.

## How it works

1. `AGENTS.md` is the entry point for any assistant. It has the program commands and three harness sections: video (`AGENTS.md:50`), technical team (`AGENTS.md:90`) and Grok (`AGENTS.md:114`).
2. `.agents/` holds the content:

| Item | What it is |
|---|---|
| `setup.md` | video team rules, priorities, defaults and fixed rules |
| `pipeline.md` | project folder, steps and file contracts |
| `tecnico.md` | technical team rules, task folder and CI checks |
| `gostos.md` | creator tastes (music, look, narration); for now only placeholders |
| `comunicacao.md` | how to talk to the user, briefly; role reports do not follow this rule |
| `perfis/` | one profile per dark channel (see [[Channel profiles]]) |
| `roles/` | one file per role: 20 in total |
| `playbooks/` | tool recipes: `yt-dlp`, `redes-sociais`, `ffmpeg-timeline`, `moneyprinter` |
| `skills/` | orchestration: `video/` and `manutencao/`, with scripts |
| `tools/` | `sync_grok_agents.py`, which generates the Grok adapters |
| `grok-bot.md` | guide to set up the team in Grok Bot, which does not read the repository |

3. When two rules conflict, the order in `setup.md:6-15` wins: explicit request > `brief.md` > profile > tastes > setup. In the technical team the order is request > `pedido.md` > `AGENTS.md` > `tecnico.md` (`tecnico.md:8-13`).
4. Each tool reads its own adapter folder. Claude Code reads `.claude/`; Grok Build reads `.grok/`. See [[Claude and Grok adapters]].

Rules the harness repeats everywhere: never publish, never change `config.toml`, an approval stop before download, and an audit before delivery (`setup.md:59-62`, `setup.md:76-77`).

## Example / walkthrough

A typical request: "follow `.agents/skills/video/SKILL.md` for a video about <topic>".

- The assistant reads `AGENTS.md` and `setup.md`, picks the profile (`SKILL.md:27-30`) and creates `storage/projects/<slug>/brief.md` (`SKILL.md:32`).
- If the tool has subagents, it delegates each role to one, using the role file (`SKILL.md:16-18`). If not, it runs the roles in sequence, reading each file first.

In the technical team, "follow `.agents/skills/manutencao/SKILL.md` for <request>" creates `storage/manutencao/<slug>/pedido.md` (`manutencao/SKILL.md:22-26`).

## Pitfalls

- **`AGENTS.md` is behind.** It says the technical team has "two modes" (`AGENTS.md:94`). The skill has four: change, audit, integration research and harness (`manutencao/SKILL.md:8-12`). The video role table also leaves out `animador` (`AGENTS.md:73-83`).
- **Empty tastes.** `gostos.md` has only placeholders (`<ex.: ...>`), yet every role is told to follow it. Until it is filled, the agent picks by profile.
- **The harness is not the pipeline.** `.agents/` describes the agents' work. The program lives in `app/`. Changing the harness does not change MoneyPrinterOmni.
- **The status varies by branch.** Part of the technical team and of the MCPs is not on `main`. See [[Branches main and unstable]].

> [!warning] unstable
> The technical team (`tecnico.md`, `skills/manutencao`, the technical roles) and the Reddit and Apify MCPs are `status/unstable`. See [[Technical team]] and [[MCP and permissions]]. Status of `comunicacao.md`: to be confirmed.

## Practice

1. When two rules conflict, which one wins: the profile's or the request's?
2. Does a role's rule live in `.claude/agents/` or in `.agents/roles/`?
3. Does the harness publish a finished video? Why?

> [!faq]- Answer key
> 1. The explicit request. The order is request > brief > profile > tastes > setup (`setup.md:6-15`).
> 2. In `.agents/roles/`. The adapter in `.claude/agents/` only points there.
> 3. No. It is a fixed rule: never publish, send or schedule (`setup.md:76-77`). The `diretor` role only delivers the checklist.

## Connections

- Previous: [[Overview]]. Next: [[Video team and file contracts]], [[Technical team]], [[Claude and Grok adapters]], [[MCP and permissions]].
- Reference: [[Roles and models]], [[Agent JSON contracts]].
- Canvas: [[04 - Video team.canvas|Video team canvas]], [[05 - Technical team.canvas|Technical team canvas]].
