---
title: Branches main and unstable
tags: [mapa, branches, status/unstable]
aliases: [main branch, unstable branch, Promoting an item]
lang: en
sources: [.mcp.json, .agents/tecnico.md, .agents/roles/arquiteto.md, .github/workflows/ci.yml, .github/workflows/docker-ghcr.yml, update.sh, docs/packaging.md]
---
# Branches main and unstable

[[00 - Index|← Index]]

`main` holds only what has been tested and proven. `unstable` holds what was added recently and has had little testing.

## Core idea

Every item has a home. An item starts on `unstable`, is fixed and tested, and only then moves to `main` through a pull request. No force-pushes: history is never rewritten.

## How it works

1. **Content rule** (set by the project owner):
   - `main`: video capture from stock-video banks; AI scripts; the agent workflow for Claude Code and other harnesses; Remotion animations; yt-dlp; Grok adaptation.
   - `unstable`: Reddit and Apify MCPs; the technical team; channel profiles with assets; new animations; the upstream v1.3.9 merge; future subscriptions (see [[Subscriptions instead of keys]]).
2. **Entry.** New items enter on `unstable`. This step is implied by the rule; no written document spells it out.
3. **Promotion.** Once an item is fixed and tested, it moves to `main` through a pull request.
4. **No force-push.** Fixes arrive as new commits.

> [!tip] Suggested flow (not a written rule)
> To move a single item, the pull request should start from `main` and carry only that item's commits (a branch from `main` with cherry-picks). A pull request from all of `unstable` carries everything that sits there.

## Example / walkthrough

Promoting the Reddit MCP (an `unstable` item):

1. Confirm the item is on `unstable`: `.mcp.json` has the `reddit` entry (and `apify`). This worktree has both, which matches the rule.
2. Fix what the tests and the review find.
3. Run the checks the CI would run (the fork's CI is off, so the check is local):
   ```sh
   uv run ruff check app cli.py main.py webui test docs/skill
   uv run python -X utf8 -m pytest -q test
   uv run python -X utf8 -m coverage run -m pytest -q test && uv run python -m coverage report   # fail_under = 70
   ```
4. Open the pull request into `main` with only that item.

## Current state

> [!warning] unstable
> Status to be confirmed: I did not run git commands in this worktree, so I cannot say from git which branch holds each item. From the file contents:
> - **On unstable (by the rule):** the Reddit and Apify MCPs (`.mcp.json`); the technical team (`.agents/tecnico.md`, `.agents/roles/arquiteto.md` and the other technical roles); the upstream v1.3.9 merge (`docs/release-notes-v1.3.9.md`).
> - **Channel profiles:** `.agents/perfis/` has five profiles and `_modelo.md`, but there is no assets folder in this worktree. Status to be confirmed.
> - **Working branches** named in the divergence report: `ccr-879e967e-rcs3uw` (3 commits over `origin/main`: MCPs, technical team, yt-dlp cache) and `ccr-e7cc9390-tc3402` (4 commits: animations and a `build_timeline` zoom, profiles moved to `nichos/` and `canais/`, `flake.nix` changed, `update.sh` deleted). These are session names, not the `main` and `unstable` branches.

## Pitfalls

- **`update.sh` disappears on one working branch.** `ccr-e7cc9390-tc3402` deletes `update.sh`, which `origin/main` keeps. If that branch is promoted carelessly, the update script goes away. Check the diff first.
- **There is no CI on the fork.** `.github/workflows/ci.yml` runs on pushes and pull requests to `main`, but GitHub Actions do not run on the fork. Promoting without local testing is the main risk.
- **What you see depends on the branch.** This worktree has the technical team, which is `unstable`. Before saying something is "already on main", confirm with `git` in the repository.

## Practice

1. You added a new CLI command today. Which branch does it start on, and what is missing before it can go to `main`?
2. Why is a pull request from all of `unstable` to `main` a poor way to promote only the Reddit MCP?
3. Which three commands replace the CI when GitHub Actions are off?

> [!faq]- Answer key
> 1. It starts on `unstable`. What is missing: fix what the tests find, run the checks, and open a pull request into `main` with only that item.
> 2. Because it also carries every other item that is only on `unstable` (technical team, new animations, and so on), none of which has been proven yet.
> 3. `uv run ruff check app cli.py main.py webui test docs/skill`; `uv run python -X utf8 -m pytest -q test`; and the coverage command with `fail_under = 70` (see [[Tests and CI]]).

## Connections

- [[Omni and Turbo]]: the v1.3.9 merge that sits on `unstable`.
- [[How to contribute]]: the step-by-step for anyone changing the code.
- [[Tests and CI]]: what the CI runs and why it is off on the fork.
- [[Technical team]] and [[MCP and permissions]]: two of the `unstable` items.
- [[Remotion animations]]: the `main` animations and the new ones on `unstable`.
- Canvas: [[07 - Branches.canvas|Canvas]].
