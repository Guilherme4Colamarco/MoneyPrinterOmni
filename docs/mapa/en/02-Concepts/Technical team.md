---
title: Technical team
tags: [mapa, tecnico, status/unstable]
aliases: [Time técnico]
lang: en
sources: [.agents/skills/manutencao/SKILL.md, .agents/tecnico.md, .agents/roles/arquiteto.md, .agents/roles/revisor-de-codigo.md, .agents/roles/auditor-de-seguranca.md, .agents/roles/mantenedor-do-harness.md, AGENTS.md]
---
# Technical team

[[00 - Index|← Index]]

The technical team changes or audits the **program** (the code in `app/`, `cli.py` and `webui/`). It is separate from the video team: it does not make videos.

## Core idea

Changing code without a plan causes regressions. So the team separates who plans, who writes, who tests and who reviews. The reviewer only points out problems. The writer does not approve their own code. The strongest rule is the plan: a big change moves only with the user's approval.

## How it works

**The four modes** (`manutencao/SKILL.md:8-12`):

| Mode | Purpose | Section |
|---|---|---|
| change | fix a bug, add a function, refactor | `SKILL.md:28-41` |
| audit | assess without changing anything; ranked list | `SKILL.md:43-48` |
| integration research | assess an API, SDK or candidate MCP | `SKILL.md:50-56` |
| harness | review `AGENTS.md`, `.agents/`, adapters and permissions | `SKILL.md:58-63` |

**The eight roles** (all `sonnet` on Claude; see [[Roles and models]]):

| Role | Writes | Does |
|---|---|---|
| `arquiteto` | `plano.md` | reads the code, lists files, steps and risks. Does not edit code. |
| `desenvolvedor` | `mudancas-NN.md` | implements in the service layer; runs ruff and the area tests |
| `testador` | `testes-NN.md` | failing test for a bug; coverage; full suite. Edits only `test/` |
| `revisor-de-codigo` | `revisao-NN.md` | bugs, contracts between API, WebUI and CLI, patterns. Only points out |
| `auditor-de-seguranca` | `seguranca-NN.md` | files, subprocess, SSRF, secrets, dependencies. Only points out |
| `auditor-de-saude` | `saude.md` | CI, coverage, dead code, debt. Ranked list, no verdict |
| `pesquisador-de-integracoes` | `integracoes-NN.md` | candidates with source, auth, cost and terms. Installs nothing |
| `mantenedor-do-harness` | `harness-NN.md` | edits the harness when asked and records the diff |

**The task folder** is `storage/manutencao/<slug>/` (`tecnico.md:15-31`). It is outside git, like `storage/projects/`. The first file is `pedido.md`, written by the orchestrator.

**Change, step by step** (`SKILL.md:30-40`):

1. `arquiteto` writes `plano.md`.
2. **Stop:** if the change touches the public API, schema, config, a new dependency or more than five files, the plan goes to the user.
3. `testador` writes a failing test, for bugs.
4. `desenvolvedor` implements and runs ruff and the area tests.
5. `testador` completes coverage and runs the full suite.
6. `revisor-de-codigo` and `auditor-de-seguranca` run in parallel.
7. If either says `REVISAR`, the developer fixes it and steps 5 and 6 run again. At most 2 rounds.
8. Final report to the user. Nothing is committed without their approval.

**Rules the roles follow** (`tecnico.md:33-66`):

- new behaviour goes in `app/services/`, so the API, WebUI and CLI all receive it through the same `task.start()`;
- new WebUI text goes into every `webui/i18n/*.json`;
- resources go through `app/paths.py`; input files through `app/utils/file_security.py`;
- new config goes in `config.py` and in `config.example.toml`, never in the user's `config.toml`;
- dependencies only with `uv add`, with a justification in the plan;
- every fixed bug gets a test that failed before the fix.

**CI checks**, which must pass before anything is declared ready (`tecnico.md:51-57`):

```sh
uv run ruff check app cli.py main.py webui test docs/skill
uv run python -X utf8 -m pytest -q test
uv run python -X utf8 -m coverage run -m pytest -q test && uv run python -m coverage report  # fail_under = 70
```

If the change touches `animations/`, also run `npm run typecheck --prefix animations`.

**Verdicts** (`tecnico.md:68-73`): each item is `bloqueia` (blocker), `importante` (important) or `detalhe` (detail). The reviewer and the security auditor end with `APROVADO` or `REVISAR`. `REVISAR` means at least one blocker or three or more important items.

## Example / walkthrough

A request to "add an LLM provider" touches the API and the config, so the plan goes to the user before any code. The full walkthrough, with files, is in [[05 - Change with the technical team]].

## Pitfalls

- **The skill says "six roles".** The frontmatter description (`manutencao/SKILL.md:3`) and the Claude adapter's description both list six. There are eight now, and the table in `AGENTS.md` (`AGENTS.md:102-109`) already has all eight.
- **"Two modes" in `AGENTS.md`.** Line 94 says two modes. The skill has four.
- **Not the video team.** `tecnico.md:6` says the video team does not touch code and this team does not make videos. A video request does not go here.
- **Git is not the team's job.** No role commits, pushes or opens a PR (`tecnico.md:60-61`).
- **A red check is not ready.** "Red CI checks = not ready", whatever the verdict (`SKILL.md:68`).

> [!warning] unstable
> This whole team is `status/unstable`: the roles, the integration and harness modes, and `storage/manutencao/`. Status to be confirmed on the source branch. See [[Branches main and unstable]].

## Practice

1. How many modes and how many roles does the technical team have today?
2. A change touches `config.py` and a file in `webui/`. What must the architect put in the plan before any code?
3. A reviewer finds two `importante` items and no `bloqueia`. What is the verdict?

> [!faq]- Answer key
> 1. Four modes (`manutencao/SKILL.md:8-12`) and eight roles (`AGENTS.md:102-109`).
> 2. The plan must show the config change (a config or API change requires a stop, `SKILL.md:30-33`). It must also name the service layer and the tests, and note that `webui/i18n/*.json` changes in every language.
> 3. `APROVADO`. `REVISAR` only with one `bloqueia` or with three or more `importante` (`tecnico.md:72-73`).

## Connections

- Previous: [[Video team and file contracts]]. See also: [[How to contribute]], [[Tests and CI]], [[Agent harness]].
- Example: [[05 - Change with the technical team]].
- Canvas: [[05 - Technical team.canvas|Technical team canvas]].
