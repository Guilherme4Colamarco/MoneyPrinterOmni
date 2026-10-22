---
title: Omni and Turbo
tags: [mapa, omni-turbo, status/unstable]
aliases: [Turbo fork, Omni vs Turbo]
lang: en
sources: [app/paths.py, app/services/version_checker.py, app/models/llm_provider.py, webui/Main.py, webui/i18n/en.json, pyproject.toml, app/__init__.py, docs/release-notes-v1.3.9.md, docs/packaging.md, update.sh, README.md]
---
# Omni and Turbo

[[00 - Index|← Index]]

MoneyPrinterOmni is a fork of MoneyPrinterTurbo. It inherits the pipeline, adds an agent harness, and keeps receiving upstream releases by merge.

## Core idea

Omni started from the Turbo fork at commit `9e7d8b7` ("fix(task): keep tasks with invalid state (#1663)", 2026-10-17). The package name (`mpt`) and the `app/` layout did not change, so code paths are the same as in Turbo. What Omni adds on top is the rebrand, the agent harness, `animations/`, and the Nix environment.

## How it works

1. **Origin.** Fork at commit `9e7d8b7`. Confirmed in the session; this worktree has no git history to re-check it.
2. **Rebrand (`a6c685c`, 67 files).** It swapped the names and added two compatibility shims:
   - `app/paths.py:38` (`_with_legacy`): if the new data folder does not exist and the old `MoneyPrinterTurbo` folder does, the program keeps using the old one.
   - `webui/Main.py:2965-2967`: imports settings and key files that were exported with the old `moneyprinterturbo.` schema.
3. **What Omni adds.** `.agents/` (agent teams), `.claude/` and `.grok/` (adapters), `animations/` (Remotion), `flake.nix`, and `update.sh`. The default `README.md` is in English; Chinese and Japanese are in `README-zh.md` and `README-ja.md`.
4. **Upstream v1.3.9 merge.** On 2026-10-22 Omni took in 25 upstream commits. The worktree contains the artifacts: `app/utils/request_logging.py`, `docs/diagnostic-logging.md`, `docs/local-image-server/`, and `docs/release-notes-v1.3.9.md`. The version is set in `app/__init__.py:3` and `pyproject.toml:10`.

> [!warning] unstable
> The v1.3.9 merge exists only on the `unstable` branch. Image motion options, runtime logging controls, the local SDXL image server, and the EmpirioLabs provider: status to be confirmed, lightly tested in Omni.

5. **Syncing with upstream.** The divergence report recommended one merge commit, not cherry-picks, because the 25 commits depend on each other. The steps:
   1. Add an `upstream` remote pointing to `harry0703/MoneyPrinterTurbo`. (Convention; I did not check the remote configuration in this worktree.)
   2. Fetch the full upstream history.
   3. Merge into a new branch based on Omni's base. Never force-push.
   4. Resolve the expected conflicts (see Pitfalls).
   5. Run the name check, `uv lock --check`, and the test suite.

## Example / walkthrough

To find where the code still cites Turbo, run a read-only search (real output in this worktree):

```sh
grep -rn "harry0703\|MoneyPrinterTurbo" app webui cli.py main.py docs/skill --include=*.py
```

Result: `app/paths.py:39-40` (folder compatibility), `app/services/video.py:1593` (issue link), `app/services/version_checker.py:17,20` (upstream releases), `app/models/llm_provider.py:337` (`utm_term=MoneyPrinterTurbo`), `webui/Main.py:88` (fork credit), `docs/skill/mpt_agent.py:68` (`utm_source=MoneyPrinterTurbo`). In `webui/i18n/`, all 14 JSON files carry `utm_content=moneyprinterturbo` in provider links.

## Pitfalls

- **Expected merge conflicts.** `README.md` and `README-ja.md` (Omni rewrote them and deleted `README-en.md`; per the divergence report, upstream edited it). `pyproject.toml`: the version (line 10) and the description (line 11) sit on neighbouring lines and conflict. `docs/packaging.md` (line 3). `webui/Main.py` and `webui/i18n/*.json`. In every case, keep Omni's text.
- **Omni still queries Turbo.** `app/services/version_checker.py` compares Omni's version with the latest release of `harry0703/MoneyPrinterTurbo`. A new Turbo release shows up as an Omni update. Open item.
- **Turbo referral links.** Texts in `webui/i18n/*.json` (for example `webui/i18n/en.json:469`, "MoneyPrinterTurbo referral link") and provider links still point to Turbo's accounts. Open item.
- **`update.sh` does not sync upstream.** It uses the `origin` remote by default (`update.sh:24`), so it updates Omni itself. Upstream changes only come in through a manual merge.

## Practice

1. Why does Omni's `version_checker` query the Turbo repository? Which decision is still missing?
2. In an upstream merge, which two `pyproject.toml` lines usually conflict?
3. What does `_with_legacy` do when the `MoneyPrinterOmni` folder does not exist but `MoneyPrinterTurbo` does?

> [!faq]- Answer key
> 1. Because the code still points at Turbo's release repository (an open item). The missing decision is which release repository Omni should check, or whether to turn the check off.
> 2. `version` (line 10) and `description` (line 11). They sit on neighbouring lines, so git flags a conflict.
> 3. It uses the old `MoneyPrinterTurbo` folder (`app/paths.py:38-40`), so people who installed before the rebrand keep their data.

## Connections

- [[Overview]] and [[Agent harness]]: what Omni adds to the pipeline.
- [[Branches main and unstable]]: where the v1.3.9 merge lives and how it moves to main.
- [[How to contribute]] and [[Tests and CI]]: what to run before syncing.
- [[Claude and Grok adapters]] and [[Remotion animations]]: the adapters and Omni's `animations/`.
- [[Technical team]]: the team that does the merge and the audit, when asked.
- Canvas: [[06 - Omni and Turbo.canvas|Canvas]].
