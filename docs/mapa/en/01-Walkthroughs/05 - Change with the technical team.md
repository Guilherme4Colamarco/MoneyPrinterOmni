---
title: 05 - Change with the technical team
tags: [mapa, percurso, status/unstable]
aliases: [05 - Mudança pelo time técnico]
lang: en
sources: [.agents/skills/manutencao/SKILL.md, .agents/tecnico.md, .agents/roles/arquiteto.md, .agents/roles/testador.md, .agents/roles/desenvolvedor.md, .agents/roles/revisor-de-codigo.md, .agents/roles/auditor-de-seguranca.md, app/models/llm_provider.py, config.example.toml, AGENTS.md]
---
# 05 - Change with the technical team

[[00 - Index|← Index]]

An example of a change to the program: adding an LLM provider. The walkthrough shows how the plan, the stop, the tests and the review fit together.

> [!warning] unstable
> This walkthrough depends on the technical team, which is `status/unstable`. It is an **illustrative example**: provider "X" is made up and nothing was run. The files and keys cited are real.

## Core idea

A change to the program goes through whoever plans, whoever writes, whoever tests and whoever reviews. A change that touches config or the API stops before the code, and the user decides. Whoever reviews does not edit; they only point out problems.

## How it works

**Request.** The user says: "add LLM provider X". The orchestrator creates `storage/manutencao/<slug>/pedido.md` with what is expected (a provider that responds and appears in the list), what is out of scope (no change to the default) and the done criterion (tests green and CI passing).

**Plan (`arquiteto`).** It reads the code and writes `plano.md`. For a provider, the registration goes in `app/models/llm_provider.py`, where `LLM_PROVIDER_REGISTRY` starts at line 195 and each entry is an `LLMProviderSpec`. The use goes in `app/services/llm.py`. The config key goes in `app/config/config.py` and in `config.example.toml` (`tecnico.md:43-44`). The plan says which entry points are affected: the API, the WebUI and the CLI all receive work through `task.start()` and need no new code.

**Stop.** A config change is on the list that needs approval (`SKILL.md:30-33`). The orchestrator shows the plan to the user. Without approval, the developer does not start. If the provider needed a new library, the justification would go in the plan and the dependency would enter only with `uv add` (`tecnico.md:45-46`).

**Reproduction test (`testador`).** Skipped: there is no bug. Reproduction mode is only for bugs (`SKILL.md:34`).

**Implementation (`desenvolvedor`).** It adds the entry to the registry, uses the config key and runs the area checks:

```sh
nix develop --command uv run ruff check app cli.py main.py webui test docs/skill
nix develop --command uv run python -X utf8 -m pytest -q test/services
```

The result goes into `mudancas-01.md`, with the command and its output.

**Coverage (`testador`).** It writes tests for the new functions and runs the full suite with the CI coverage check:

```sh
nix develop --command bash -c 'uv run python -X utf8 -m coverage run -m pytest -q test && uv run python -m coverage report'  # fail_under = 70
```

The result goes into `testes-01.md`. The tester edits only files in `test/`.

**Review and security (in parallel).** `revisor-de-codigo` checks the contracts, the registry pattern and whether there are tests. `auditor-de-seguranca` checks the secret (which comes from `${VAR}` or from `config.toml`, never from code) and the provider's base address, which can become SSRF. Each writes its file: `revisao-01.md` and `seguranca-01.md`. Verdict `APROVADO` or `REVISAR`.

**Fix round.** If either says `REVISAR`, the developer fixes only the flagged items, and the coverage and review steps run again. At most two rounds. After that, the problem goes to the user.

**Final report.** It lists the changed files, the check outputs, the verdicts and open items. Nothing is committed without the user's approval (`tecnico.md:60-61`).

## Example / walkthrough

| Step | Who | File written | Result |
|---|---|---|---|
| 0 | orchestrator | `pedido.md` | done criterion |
| 1 | `arquiteto` | `plano.md` | plan with the registry entry and the config key |
| 2 | user | — | approves the plan (config changed) |
| 3 | `testador` | — | skipped: not a bug |
| 4 | `desenvolvedor` | `mudancas-01.md` | area ruff and pytest green |
| 5 | `testador` | `testes-01.md` | suite and coverage green |
| 6 | `revisor` and `auditor` | `revisao-01.md`, `seguranca-01.md` | `APROVADO` |
| 7 | orchestrator | — | report to the user |

## Why it works

- **The plan comes before the code.** A config or API change is costly to undo. Stopping here leaves the decision with the user, before there is any diff.
- **Whoever writes does not approve their own code.** The tester writes the test; the reviewer reads the diff without having written it.
- **CI is the yardstick.** The same checks (`tecnico.md:51-57`) run before any verdict. Green or red, with no interpretation.

## Pitfalls

- **Config and the runtime lock.** Writing config while a video task runs is blocked. The developer does not touch the user's `config.toml` (`tecnico.md:43-44`).
- **A test that fails on purpose does not pass.** Skipping, disabling or marking a test as expected-to-fail to get green is forbidden (`tecnico.md:49-50`).
- **Comment language.** The code has comments in Chinese. Follow the language of the file (`tecnico.md:38-39`).
- **CI is the yardstick.** A red check means not ready, whatever the verdict (`SKILL.md:68`).

## Practice

1. Why does the plan stop before the code when the change touches config?
2. A bug is fixed. Which role writes the test that fails before the fix?
3. The security auditor says `REVISAR`. What happens in the next round?

> [!faq]- Answer key
> 1. Because the rule says to stop for config, API, schema, dependency or more than five files (`SKILL.md:30-33`).
> 2. The `testador`, in reproduction mode (`SKILL.md:34`).
> 3. The developer fixes only the flagged items, and the coverage and review steps run again (`SKILL.md:37-40`). Two rounds at most.

## Connections

- Previous: [[Technical team]]. For comparison, the video walkthrough: [[04 - Video with the agent team]].
- Concepts: [[LLM providers]], [[Configuration and locks]], [[Tests and CI]], [[How to contribute]].
- Reference: [[Roles and models]].
- Canvas: [[05 - Technical team.canvas|Technical team canvas]].
