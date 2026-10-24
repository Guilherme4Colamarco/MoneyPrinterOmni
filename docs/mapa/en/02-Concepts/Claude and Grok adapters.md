---
title: Claude and Grok adapters
tags: [mapa, agentes, status/stable]
aliases: [Adaptadores Claude e Grok]
lang: en
sources: [.claude/agents/arquiteto.md, .claude/skills/video/SKILL.md, .claude/skills/manutencao/SKILL.md, .grok/agents/arquiteto.md, .grok/personas/arquiteto.toml, .grok/skills/video/SKILL.md, .grok/skills/manutencao/SKILL.md, .agents/tools/sync_grok_agents.py, skills-lock.json, .agents/grok-bot.md, AGENTS.md, CLAUDE.md]
---
# Claude and Grok adapters

[[00 - Index|← Index]]

Each AI tool reads its own folder, and that folder only repeats what is in `.agents/`.

## Core idea

An **adapter** is a thin file the tool understands (a subagent or a skill) that points to the single source. The adapter body adds no new rule. If a rule changes, it changes only in `.agents/`.

There are two adapters:
- **Claude Code**: `.claude/agents/` (subagents) and `.claude/skills/` (skills).
- **Grok Build** (`grok`): `.grok/agents/` and `.grok/personas/` (generated) and `.grok/skills/video/` and `.grok/skills/manutencao/` (hand-written).

## How it works

1. **Claude subagents.** Each of the 20 files in `.claude/agents/` has a header (`name`, `description`, `model`, `tools` at `.claude/agents/arquiteto.md:2-5`, `skills` on the next line) and a short body: "Read and follow `.agents/roles/<role>.md`", plus the order to follow `AGENTS.md` and `CLAUDE.md`.
2. **Model per role.** The `model:` line exists only here. Three roles use `haiku`: `montador-mpt` (`.claude/agents/montador-mpt.md:4`), `designer-de-thumbnail` and `redator-de-publicacao`. The other seventeen use `sonnet`. The rule comes from `setup.md:68-74` and `tecnico.md:64-66`.
3. **Claude skills.** `.claude/skills/video/SKILL.md` and `.claude/skills/manutencao/SKILL.md` take `$ARGUMENTS` and tell the tool to read `.agents/skills/...`. There are also 12 `remotion-*` skills, vendored from `remotion-dev/skills` and pinned by hash in `skills-lock.json` (12 entries).
4. **Grok subagents and personas.** `.agents/tools/sync_grok_agents.py` generates both folders. In `.grok/agents/` it copies `name`, `description`, `tools` and `skills`, changes `model` to `inherit`, sets `agents_md: true` (loads the project instructions) and points the body to the role, which says to follow `AGENTS.md` and `CLAUDE.md` (`sync_grok_agents.py:83`; body at `:28-32`). If the description contains `:`, the value is quoted (`:58`): otherwise Grok does not load the agent. In `.grok/personas/` it writes one `.toml` per role: the Claude `description` and the same instruction (`sync_grok_agents.py:100`). The file name is the persona name.
5. **Check.** `python3 .agents/tools/sync_grok_agents.py --check` exits 1 if a file is out of date or a generated adapter has no role left (`sync_grok_agents.py:165`). Without `--check` it writes. It never touches hand-made files, because it only deletes files that carry the mark "Adaptador do Grok Build." (`:27`).
6. **Grok Bot is something else.** The Grok Bot app does not read the repository. The guide `.agents/grok-bot.md` says to create one bot per role and paste the instruction "Read and follow `.agents/roles/<role>.md`" into the app. The video guide lists 12 bots.

## Example / walkthrough

When you change a role's rule:

1. Edit `.agents/roles/<role>.md`. The adapters do not change.
2. If you change the model, edit `model:` in `.claude/agents/<role>.md`.
3. Run `python3 .agents/tools/sync_grok_agents.py`. It regenerates `.grok/agents/` and `.grok/personas/`; the agent `model` stays `inherit`.
4. Run `--check` before committing: it should print `ok: .grok/agents e .grok/personas em dia`.

The same flow applies to new roles: create `.agents/roles/<role>.md`, then `.claude/agents/<role>.md`, then run the script.

## Pitfalls

- **`.grok/skills/video/SKILL.md` is outside `--check`.** The script covers `.grok/agents/` and `.grok/personas/`. The skill is hand-written and can drift.
- **`.grok/skills/manutencao/SKILL.md` is also outside `--check`.** It is the same kind of adapter as the video skill: it points to `.agents/skills/manutencao/SKILL.md` and to the subagents in `.grok/agents/`.
- **`model: sonnet` does not exist in Grok.** That is why the generated agent uses `inherit` (`AGENTS.md:132`). The persona does not pin a model. Do not edit `.grok/agents/` or `.grok/personas/` by hand: the next generation erases the change.
- **Grok Bot does not use these files.** Grok Bot configuration, skills and routines are created in the app, not read from the repository. xAI does not document whether the bot reads `.mcp.json`.

> [!warning] unstable
> The adapters for the technical roles (`arquiteto` through `mantenedor-do-harness`) and the `manutencao` skill exist only in the technical team, which is `status/unstable`. See [[Technical team]].

## Practice

1. Where do you change a role's rule so that Claude and Grok both follow it?
2. Why does `--check` not catch an error in `.grok/skills/video/SKILL.md`?
3. Which model runs `montador-mpt` in Claude Code?

> [!faq]- Answer key
> 1. In `.agents/roles/<role>.md`. Both adapters only point there.
> 2. Because the script compares `.grok/agents/` and `.grok/personas/`. The Grok skill is a separate file with no check.
> 3. `haiku` (`.claude/agents/montador-mpt.md:4`).

## Connections

- Previous: [[Agent harness]]. Next: [[MCP and permissions]].
- Teams: [[Video team and file contracts]], [[Technical team]].
- Reference: [[Roles and models]].
- Canvas: [[04 - Video team.canvas|Video team canvas]].
