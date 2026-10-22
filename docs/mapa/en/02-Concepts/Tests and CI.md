---
title: Tests and CI
tags: [mapa, tests, ci, status/unstable]
aliases: [CI, Test suite, Coverage]
lang: en
sources: [.github/workflows/ci.yml, .github/workflows/docker-ghcr.yml, pyproject.toml, test/README.md, test/services/test_state.py, test/services/test_llm.py, test/services/test_voice.py, test/services/test_video_project.py, animations/.nvmrc, AGENTS.md]
---
# Tests and CI

[[00 - Index|← Index]]

The suite runs on pytest (which also runs the `unittest.TestCase` classes), requires 70% branch coverage, and in the upstream repository runs on GitHub Actions. On the fork, CI does not run: the checks are local.

## Core idea

Every change passes three checks: ruff (lint), pytest (tests), and coverage (branch coverage, with a 70% floor). CI runs the same set on Python 3.11 and 3.13, with a real Redis server.

## How it works

1. **Layout.**
   - `test/test_main.py`: the entry-point test.
   - `test/services/`: 221 entries, mostly `test_<domain>.py`, one per domain.
   - `test/resources/`: images `1.png` to `9.png` for the material tests.
   - There is no `conftest.py` and no `pytest.ini` or `setup.cfg`. The coverage configuration lives in `pyproject.toml`.
   - 64 files use `unittest.TestCase`; the rest use pytest functions. Pytest runs both.
2. **Mocks.** Tests swap dependencies with `unittest.mock.patch.object` (about 1,800 occurrences) and, in 24 files, with `monkeypatch`. The WebUI is tested with `streamlit.testing.v1.AppTest` (21 files).
3. **Live tests and Redis.**
   - `MPT_RUN_INTEGRATION_TESTS=1` enables the tests that call the LLM, TTS and Twelve Labs for real (`test_llm.py`, `test_task.py`, `test_voice.py`, `test_twelvelabs.py`). They need provider credentials.
   - `MPT_TEST_REDIS_HOST`, `MPT_TEST_REDIS_PORT` and `MPT_TEST_REDIS_DB` enable the Redis tests. Without the host, `test/services/test_state.py:321-323` skips the test.
4. **Coverage** (`pyproject.toml`): `branch = true`; `source = ["app", "cli", "webui", "main", "docs/skill"]`; `fail_under = 70`; `show_missing` and `skip_covered` on. The comment in the file records that measurements on 3.11 and 3.13 exceeded 70.4%.
5. **The `tests` job in `ci.yml`.**
   - Matrix on Python 3.11 and 3.13, with a `redis:7-alpine` service and `MPT_TEST_REDIS_DB: 15`.
   - Steps: `uv sync --frozen`; `compileall`; `ruff` (3.11 only); `coverage run -m pytest -q test`.
   - Then it installs ffmpeg with `apt-get` and runs `test/services/test_video_project.py` and `test/services/test_minimax_output_container.py` with `coverage run --append`.
   - It ends with `coverage report`, `coverage xml`, and uploads the XML as an artifact (7 days).
6. **Other jobs.**
   - `animations`: Node at the version in `animations/.nvmrc` (24), `npm ci --prefix animations`, then `npm run typecheck`.
   - `windows-smoke`: Windows with Python 3.11; compiles and runs a subset of service tests (config, state, task, task manager, the video controller, WebUI task).
   - `docker-ghcr.yml`: builds the image for amd64 and arm64 on pushes to `main` and on `v*` tags.

> [!warning] unstable
> The new v1.3.9 tests (for example `test/services/test_webui_image_motion.py` and `test/services/test_webui_logging_settings.py`) and the Kimi login test live on the `unstable` branch. Status to be confirmed.

## Example / walkthrough

Result of a local run in this session, in a copy of the worktree (outside the worktree, so no `config.toml` or `storage/` gets created):

- Setup: `uv sync --frozen` with Python 3.11; system ffmpeg 6.1.1; no Redis and no `MPT_RUN_INTEGRATION_TESTS`.
- `ruff check app cli.py main.py webui test docs/skill`: `All checks passed!`.
- `pytest -q test`: **10 failed, 2384 passed, 54 skipped** in 8 min 17 s.
- Audio failures (9): `test_bgm_decoded_audio.py` (1), `test_remote_speech_complete_decode.py` (5), `test_webui_bgm.py` (2 subtests, `en` and `zh`), and `test_webui_custom_audio_upload.py` (1). The error is `ffmpeg -xerror ... Decoder thread returned error`.
- Rerunning those 9 with the ffmpeg 7.0.2 binary bundled with `imageio-ffmpeg` on `PATH`: **32 passed, 14 subtests passed**. The only variable changed was the ffmpeg binary.
- Kimi login failure (1): a 3-second AppTest timeout in Streamlit. Run alone: 6 passed in 1.4 s. Unstable under load.
- I did not run `coverage` in this check, so the 70% floor was not re-verified here.

## Pitfalls

- **A local pass is not a CI pass.** GitHub Actions do not run on the fork, so the only proof is the local run. The three commands in [[How to contribute]] are the substitute.
- **The audio suite depends on the system ffmpeg.** With the system ffmpeg 6.1.1, the 9 audio failures appear; with the bundled 7.0.2, they pass. In CI, the main suite runs before `apt-get install ffmpeg`, so it uses whatever ffmpeg the runner already has (not verified). Check with `ffmpeg -version`.
- **Skipped is not verified.** The 54 skips in this run did not run. From the code, they are Redis and live-integration tests that skip without their variables (I did not list each one). Do not count them as covered.
- **WebUI tests with short timeouts are flaky.** AppTest allows 3 seconds per run; under the full suite's load, the Kimi login test hit that limit and passed when run alone.

## Practice

1. Nine audio tests fail with `Decoder thread returned error`. What do you check first, and how do you test the hypothesis?
2. A test shows as `skipped`. Does it count as verified? Why?
3. Which variable turns on the tests that call the LLM and TTS for real?

> [!faq]- Answer key
> 1. The ffmpeg version (`ffmpeg -version`). Test it by changing only the binary, for example putting the ffmpeg from `imageio-ffmpeg` on `PATH`, as done here.
> 2. No. `skipped` means the test did not run. It needs the right variable (Redis, or `MPT_RUN_INTEGRATION_TESTS=1`).
> 3. `MPT_RUN_INTEGRATION_TESTS=1`, together with the provider credentials.

## Connections

- [[How to contribute]]: the check commands and conventions.
- [[Branches main and unstable]]: why the fork's CI does not replace local checks.
- [[Configuration and locks]]: what the configuration tests protect.
- [[Technical team]]: the `testador` role, which writes the reproduction tests.
- Canvas: [[00 - Overview.canvas|Canvas]].
