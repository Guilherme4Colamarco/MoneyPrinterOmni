---
title: Roles and models
tags: [mapa, referencia, status/unstable]
aliases: [Papéis e modelos]
lang: en
sources: [.agents/roles/, .claude/agents/, .grok/agents/, .agents/setup.md, .agents/tecnico.md, .agents/tools/sync_grok_agents.py, AGENTS.md]
---
# Roles and models

[[00 - Index|← Index]]

The 20 roles of the harness: who does what, with which model and which tools in Claude Code.

## Core idea

Each role has one **source** in `.agents/roles/<role>.md`, with no model and no tools. The model and the tools live only in the adapter `.claude/agents/<role>.md`. Grok generates its adapter with `model: inherit`, because `sonnet` and `haiku` do not exist there.

Model rule (`setup.md:68-74`): a small model for mechanical work (`haiku`), a middle model for judgement, vision or code (`sonnet`). A stronger model only if a role repeatedly gets facts or analysis wrong. No role uses a stronger model today.

## How it works

The video team roles (12). The model comes from `.claude/agents/<role>.md`, line 4.

| Role | Inputs | Outputs | Model | Tools (Claude) |
|---|---|---|---|---|
| `pesquisador` | `brief.md`; in revision, critiques and audit | `research.md`, `sources.json`, `script.txt`, `music-plan.md` | sonnet | WebSearch, WebFetch, Read, Write, Edit, Bash, Glob, Grep, mcp yt-dlp, reddit, apify |
| `critico` | script, research, brief; final, timing, shotlist (visual) | `critique/content-NN.md`, `critique/visual-NN.md` | sonnet | Read, Glob, Grep, Bash, WebSearch, Write |
| `sugestor-de-pauta` | brief, script, research, latest critique | `critique/ideas-NN.md` (up to 8 ideas) | sonnet | Read, Glob, Grep, WebSearch, WebFetch, Write, mcp yt-dlp, reddit, apify |
| `auditor` | script, research, brief; shotlist, music, credits, sources, final | `audit/fatos-NN.md`, `audit/direitos-NN.md` | sonnet | Read, Write, Glob, Grep, Bash, WebSearch, WebFetch, mcp yt-dlp, reddit, apify |
| `diretor-de-arte` | brief, script, music-plan, sources, profile History | `arte.md`, `arte.json` | sonnet | Read, Write, Edit, Glob, Bash |
| `diretor` | everything | `aprovacao-NN.md`, `entrega.md` | sonnet | Read, Write, Glob, Grep, Bash |
| `montador-mpt` | script, music-plan, timeline/, arte.json | `timing.json`, `music.json`, `bgm.mp3`, `output/final.mp4` | **haiku** | Bash, Read, Write, Edit, Glob, Grep |
| `cacador-de-clipes` | timing, sources, script, arte.md | `shotlist.json`, `raw/` | sonnet | Bash, Read, Write, Glob, Grep, WebSearch, mcp yt-dlp, apify |
| `animador` | shotlist (items with `anim`), arte.json, timing | `raw/anim_NN.mp4` | sonnet | Bash, Read, Write, Edit, Glob, Grep |
| `editor-de-clipes` | shotlist, timing, sources | `timeline/NN.mp4`, `raw/timeline_preview.png`, `credits.md` | sonnet | Bash, Read, Write, Edit, Glob |
| `designer-de-thumbnail` | arte, script, timeline/, raw/ | `publicacao/thumb-*.png`, `thumbs_preview.png` | **haiku** | Bash, Read, Write, Glob |
| `redator-de-publicacao` | script, research, credits, timing, arte.md | `publicacao/publicacao.md` | **haiku** | Read, Write, Glob, WebSearch |

The technical team roles (6) and the harness roles (2). All use `sonnet` on Claude.

| Role | Inputs | Outputs | Model | Tools (Claude) |
|---|---|---|---|---|
| `arquiteto` | request, code | `plano.md` | sonnet | Read, Glob, Grep, Bash, Write |
| `desenvolvedor` | `plano.md` | code, `mudancas-NN.md` | sonnet | Bash, Read, Write, Edit, Glob, Grep |
| `testador` | `plano.md`, code | `test/`, `testes-NN.md` | sonnet | Bash, Read, Write, Edit, Glob, Grep |
| `revisor-de-codigo` | diff, `plano.md` | `revisao-NN.md` | sonnet | Read, Glob, Grep, Bash, Write |
| `auditor-de-seguranca` | diff or code | `seguranca-NN.md` | sonnet | Read, Glob, Grep, Bash, Write, WebSearch, WebFetch |
| `auditor-de-saude` | code, CI | `saude.md` | sonnet | Read, Glob, Grep, Bash, Write, WebSearch |
| `pesquisador-de-integracoes` | candidate (API, SDK, MCP) | `integracoes-NN.md` | sonnet | WebSearch, WebFetch, Read, Glob, Grep, Bash, Write |
| `mantenedor-do-harness` | `AGENTS.md`, `.agents/`, adapters | `harness-NN.md` and requested edits | sonnet | Read, Glob, Grep, Bash, Write, Edit |

The technical team inputs come from `tecnico.md:19-29` and each role's header. Models and tools come from `.claude/agents/<role>.md` (lines 4 and 5).

## Example / walkthrough

A new role, `revisor-de-acessibilidade`, would need:

1. `.agents/roles/revisor-de-acessibilidade.md`, with `name` and `description` (no model);
2. `.claude/agents/revisor-de-acessibilidade.md`, with `model:` and `tools:`;
3. a run of `python3 .agents/tools/sync_grok_agents.py`, which generates the Grok adapter with `model: inherit`;
4. a row in the table in `AGENTS.md`.

## Pitfalls

- **The model is not in the source.** The headers of `.agents/roles/` have only `name` and `description`. To learn the model, you must read the Claude adapter. This is inconsistency 12 in the map.
- **`AGENTS.md` lists 11 video roles.** `animador` is missing. The table at `AGENTS.md:73-83` is incomplete.
- **Grok has no fixed model.** All generated adapters use `inherit`, so the Grok model is the session's. See [[Claude and Grok adapters]].

> [!warning] unstable
> The eight technical team roles, including `mantenedor-do-harness` and `pesquisador-de-integracoes`, are `status/unstable`. The twelve video roles are on `main`.

## Connections

- Concepts: [[Video team and file contracts]], [[Technical team]], [[Agent harness]].
- Reference: [[Agent JSON contracts]].
- Canvas: [[04 - Video team.canvas|Video team canvas]], [[05 - Technical team.canvas|Technical team canvas]].
