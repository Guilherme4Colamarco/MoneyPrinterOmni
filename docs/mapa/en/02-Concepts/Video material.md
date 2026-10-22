---
title: Video material
tags: [mapa, integracoes, status/unstable]
lang: en
sources: [app/services/material.py, app/services/task.py, app/services/video.py, app/services/cache_manager.py, app/services/material_cache.py, app/services/twelvelabs.py, cli.py, app/models/schema.py, app/services/video_project.py]
---
# Video material

[[00 - Index|← Index]]

The material stage brings in video or image clips from stock libraries, AI generation or local files, and the `video` stage assembles everything.

## Core idea

One entry point, `download_videos` (`app/services/material.py:2161`), picks the source from `video_source`. Stock and AI sources use a key and charge per use. The `local` source makes no external call. The final stage, `generate_final_videos` (`task.py:980`), joins the material with subtitles and music.

## How it works

1. `get_video_materials` (`task.py:723`) validates the source against `_SUPPORTED_VIDEO_SOURCES` (`task.py:97`): `pexels`, `pixabay`, `coverr`, `local`, `wavespeed`, `volcengine_seedance`, `ofox`, `metaso_minimax`, `muapi`, `loomloom` and `openai_image`.
2. Dispatch in `download_videos`:
   - Stock: `_search_videos_with_cache` (`material.py:1853`) calls `search_videos_pexels` (`:341`), `search_videos_pixabay` (`:448`) or `search_videos_coverr` (`:590`). With script-order matching it goes to `_download_videos_by_script_order` (`:2938`).
   - AI: `generate_videos_wavespeed` (`:805`), and the `_download_videos_*_on_demand` functions for Seedance (`:2486`), OFox (`:2599`), MuAPI (`:2704`) and Metaso (`:2824`).
   - `openai_image`: `generate_images_openai` (`:1677`) and `_download_videos_openai_image_on_demand` (`:1760`).
   - `local`: `video.preprocess_video` (`app/services/video.py:1955`).
   - `loomloom`: WebUI only. The CLI does not accept this source (`cli.py:40`).
3. Charges are confirmed. Paid sources need `--confirm-<provider>-charge` on the CLI (`cli.py:750-789`). The WebUI has `*_confirm_charge` checkboxes (`webui/Main.py:772-776`). I did not find an equivalent field in the API.
4. Caches: `storage/cache_videos` (`material.py:1159`), `storage/cache_images` (`:1635`) and `storage/cache_material_search` (`app/services/material_cache.py:116`). Cleanup is `clean_video_cache` (`app/services/cache_manager.py:180`).
5. `twelvelabs` is optional. When enabled, `rerank_terms_by_subject` (`app/services/twelvelabs.py:113`) reorders the terms before search (`task.py:416`). It needs the `twelvelabs` extra installed.
6. Assembly uses `combine_videos` (`video.py:973`) and `generate_video` (`video.py:1569`), which mixes audio, subtitles and music.

## Example / walkthrough

```bash
uv run python cli.py --video-subject "Life of bees" --video-source pexels
```

The `materials` stage downloads clips into `storage/cache_videos/`. The task's `script.json` gains `material_sources`. The `video` stage writes `storage/tasks/<id>/combined-0.mp4` and `final-0.mp4`, and updates `material_selections` in `script.json`.

For `local`, the command requires `--video-materials`. `--stop-at terms` has no effect with `local` (`cli.py:728`).

> [!warning] unstable
> These items came from the upstream Turbo v1.3.9 merge, according to the divergence report, and are marked unstable:
> - Image motion `--image-motion static|zoom` (`cli.py:447`, `ImageMotion` in `app/models/schema.py:56`).
> - Local SDXL image server in `docs/local-image-server/`, mentioned in `config.example.toml:204`. A search of the app code found no SDXL integration; only the standalone server exists. State to be confirmed.
> - EmpirioLabs provider, in [[LLM providers]].

## Pitfalls

- **Paid source without confirmation.** The CLI exits with code 2 (bad input) before spending any credit.
- **`video_project.py` is not part of the pipeline.** No app module imports it. It is for re-rendering local revisions: `python -m app.services.video_project --help`. Only the tests use it.
- **LoomLoom is WebUI only.** Through the API, a request with this source fails at the `materials` stage.
- **The cache is shared.** `storage/cache_videos` is not per task. Clean it with care.

## Practice

1. What stock sources exist, and which search functions serve them?
2. What does the CLI require before using `--video-source wavespeed`?
3. Why is `video_project.py` not a stage of the pipeline?

> [!faq]- Answer key
> 1. Pexels, Pixabay and Coverr, through the `search_videos_*` functions in `material.py` (`:341`, `:448`, `:590`).
> 2. The flag `--confirm-wavespeed-charge` (`cli.py:750`). Without it the CLI exits with an input error.
> 3. Because no pipeline module imports it. It is a separate tool, run with `python -m`.

## Connections

- [[Voice and subtitles]] — the previous stage.
- [[Music and publishing]] — the music used in the video stage.
- [[Pipeline and stop_at]] — where the `materials` stage sits.
- [[Configuration keys]] — the keys for each source.
- [[03 - Integrations.canvas|Canvas]]
