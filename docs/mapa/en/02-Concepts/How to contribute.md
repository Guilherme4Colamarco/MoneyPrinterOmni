---
title: How to contribute
tags: [mapa, contribute, status/unstable]
aliases: [Contributing, Developer setup]
lang: en
sources: [AGENTS.md, flake.nix, pyproject.toml, .python-version, animations/.nvmrc, config.example.toml, app/services/task.py, app/services/webui_task.py, app/config/config.py, app/paths.py, app/utils/file_security.py, Dockerfile, .agents/tecnico.md, .agents/skills/manutencao/SKILL.md]
---
# How to contribute

[[00 - Index|← Index]]

Contributing means changing the service layer, running the same checks as CI on your own machine, and taking the change to `unstable`.

## Core idea

All new behaviour goes into `app/services/`, so the API, the WebUI and the CLI receive the change together. Before saying "done", run the three CI checks locally, because GitHub Actions do not run on the fork.

## How it works

1. **Set up the environment.**
   - With Nix: `nix develop`. The shell (`flake.nix`) brings Python 3.11, uv, ffmpeg, ImageMagick, Node 24, Chromium and yt-dlp, and prints the hint `uv sync --frozen && ./webui.sh`.
   - Without Nix: Python 3.11 or newer (`pyproject.toml`, `requires-python = ">=3.11"`), then `uv sync --frozen`.
   - Copy the config: `cp config.example.toml config.toml`.
   - If `.venv` was created by the Nix Python, run everything inside the shell: `nix develop --command ...`. Outside it, numpy fails to load `libstdc++.so.6` (`AGENTS.md`, lines 11-12).
2. **Run the program.**
   - `./webui.sh`: WebUI on `127.0.0.1:8501`.
   - `python main.py`: FastAPI, with docs at `/docs`.
   - `uv run python cli.py --help`: CLI.
3. **Check before saying "done"** (the same commands CI runs):
   ```sh
   nix develop --command uv run ruff check app cli.py main.py webui test docs/skill
   nix develop --command uv run python -X utf8 -m pytest -q test
   nix develop --command bash -c 'uv run python -X utf8 -m coverage run -m pytest -q test && uv run python -m coverage report'   # fail_under = 70
   ```
4. **Conventions.**
   - New behaviour goes in `app/services/`. The entry points only call `task.start()` (`app/services/task.py:1907`), which runs `_run_pipeline` (`app/services/task.py:1519`).
   - New WebUI text goes into all 14 files in `webui/i18n/*.json`.
   - Resource paths go through `app/paths.py`. Files received from the client go only through the helpers in `app/utils/file_security.py`. `allow_server_file_input` is CLI-only.
   - A new configuration key goes in `app/config/config.py` and in `config.example.toml`. Never edit the user's `config.toml`.
   - Dependencies: `uv add` or `uv lock` (`pyproject.toml` and `uv.lock`). `requirements.txt` is legacy.
   - Comments: follow the language of the file. Of the 54 `.py` files in `app/`, 43 contain Chinese text; the older code is mostly in Chinese.
5. **Ask the technical team for a change or an audit.** Tell your assistant: "follow `.agents/skills/manutencao/SKILL.md` for <bug, function or audit>". The team writes everything to `storage/manutencao/<slug>/` (`pedido.md`, `plano.md`, review and security reports) and does not commit, push or open a PR without your request.

> [!warning] unstable
> The technical team (`.agents/tecnico.md` and the roles `arquiteto`, `desenvolvedor`, `testador`, `revisor-de-codigo`, `auditor-de-seguranca`, `auditor-de-saude`) lives on the `unstable` branch. Status to be confirmed: lightly tested.

## Example / walkthrough

Fixing a small bug in `app/services/`, start to finish:

1. `uv sync --frozen` (or `nix develop` first).
2. Write a test that **fails before** the fix. The team's rule: every fixed bug gets a test that failed before.
3. Fix the code in `app/services/`.
4. Run `nix develop --command uv run ruff check app cli.py main.py webui test docs/skill`. In the copy used for this map, the output was `All checks passed!`.
5. Run the relevant suite, for example `nix develop --command uv run python -X utf8 -m pytest -q test/services/test_task.py`, then the full suite with coverage.
6. Take the change to `unstable`; promotion to `main` follows [[Branches main and unstable]].

## Pitfalls

- **The configuration lock only applies to the WebUI.** `config.runtime_config_lock()` is used in `app/services/webui_task.py:94`; the WebUI also uses `try_runtime_config_lock()` (`webui/Main.py:440`, `:3649`, `:6153`). The API and the CLI do not take it, so a config change during an API job can take effect in the middle of that job.
- **Docker does not use `uv.lock`.** The `Dockerfile` copies and installs `requirements.txt` (lines 83 and 89). A dependency added only with `uv add` does not reach the image until `requirements.txt` is updated. Open item.
- **WebUI text without all 14 translations.** If you add a key only to `en.json`, the other 13 languages fall back to English (`tr()` falls back to English, then to the raw key). Write to every file.

## Practice

1. You need one function that serves the API, the WebUI and the CLI at once. Which folder does it go in?
2. You added new text for the WebUI. How many JSON files must you touch?
3. You installed a dependency with `pip install`. What is wrong?

> [!faq]- Answer key
> 1. In `app/services/`, called from `task.start()`. That way all three entry points get the same logic.
> 2. The 14 files in `webui/i18n/`.
> 3. Use `uv add` instead of `pip`, which updates `pyproject.toml` and `uv.lock`. Remember that Docker reads `requirements.txt`, so the dependency must reach it too (open item).

## Connections

- [[Configuration and locks]]: why the lock applies only to the WebUI.
- [[Tests and CI]]: what each check covers and why CI is off on the fork.
- [[Branches main and unstable]]: where the change goes and how it moves.
- [[Technical team]]: the roles that do the change and the audit.
- [[Omni and Turbo]]: why the code still carries upstream names.
- Canvas: [[05 - Technical team.canvas|Canvas]].
