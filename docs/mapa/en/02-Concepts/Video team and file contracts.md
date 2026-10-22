---
title: Video team and file contracts
tags: [mapa, video, status/stable]
aliases: [Time de vídeo e contratos de arquivo]
lang: en
sources: [.agents/skills/video/SKILL.md, .agents/pipeline.md, .agents/setup.md, .agents/roles/pesquisador.md, .agents/skills/video/scripts/build_timeline.py, .agents/skills/video/scripts/build_music.py, .agents/skills/video/scripts/build_thumbnail.py, .agents/skills/video/scripts/arte.py, .agents/skills/video/scripts/srt_to_timing.py]
---
# Video team and file contracts

[[00 - Index|← Index]]

The video team is a sequence of roles that pass **files** through a project folder. A contract says who writes and who reads each file.

## Core idea

The roles do not talk to each other. Each one reads its input files, writes its output files and stops. The contract keeps the pieces fitting: `pipeline.md` gives the name, the format and the owner of each file. That way one role can be swapped, or run in another assistant, without touching the rest.

## How it works

**The 12 roles** (`.agents/roles/`; models in [[Roles and models]]):

| Role | Does |
|---|---|
| `pesquisador` | sourced facts, source videos, script and music plan |
| `critico` | flags content gaps (step 2) and visual gaps (step 10) |
| `sugestor-de-pauta` | up to 8 ideas for cases, data and scenes |
| `auditor` | checks facts against sources (step 2) and rights (step 10) |
| `diretor-de-arte` | subtitles, on-screen text and thumbnail direction |
| `diretor` | approval package (step 5) and delivery (step 12) |
| `montador-mpt` | the only role that runs MoneyPrinterOmni: timing, music and render |
| `cacador-de-clipes` | picks the clip segment for each scene (`shotlist.json`) |
| `animador` | Remotion graphics (step 7b), see [[Remotion animations]] |
| `editor-de-clipes` | builds clips with `build_timeline.py` and writes the credits |
| `designer-de-thumbnail` | thumbnails with `build_thumbnail.py` |
| `redator-de-publicacao` | titles, description, tags and pinned comment |

**The 13 steps** (`SKILL.md:41-72`):

1. `pesquisador` writes research, sources, script and music plan.
2. In parallel: `critico`, `sugestor-de-pauta` and `auditor` (facts).
3. If there is `REVISAR` or `CORRIGIR`, the researcher revises. At most 2 rounds.
4. `diretor-de-arte` writes `arte.md` and `arte.json`.
5. **Stop:** `diretor` brings the package to the user. It continues only with their approval (`SKILL.md:47-49`).
6. `montador-mpt` does timing (audio, subtitles, `timing.json`) and music (`music.json`, `bgm.mp3`).
7. `cacador-de-clipes` writes `shotlist.json`.
7b. `animador` renders `raw/anim_NN.mp4` for the scenes that have `anim`.
8. `editor-de-clipes` builds the timeline and `credits.md`.
9. `montador-mpt` renders `output/final.mp4`.
10. In parallel: `critico` (visual) and `auditor` (rights). At most 2 rounds.
11. In parallel: `designer-de-thumbnail` and `redator-de-publicacao`.
12. `diretor` writes `entrega.md`: `PRONTO` or `REFAZER <etapa>`.
13. Final report. Nothing is published.

**The project folder** (`storage/projects/<slug>/`, `pipeline.md:11-33`). `storage/` is not tracked by git.

**Who writes and who reads** (summary of `pipeline.md:37-51`):

| File | Writes | Reads |
|---|---|---|
| `brief.md` | orchestrator; `montador` adds the final speech rate | everyone |
| `research.md` | `pesquisador` | critico, auditor, sugestor, redator |
| `sources.json` | `pesquisador` | cacador, editor, auditor, diretor de arte |
| `script.txt` | `pesquisador` | montador (`--video-script`), designer, redator |
| `music-plan.md` | `pesquisador` | montador, diretor de arte |
| `arte.json` | `diretor-de-arte` | cacador, `build_timeline`, `build_thumbnail`, montador |
| `timing.json` | `montador` (from the subtitles) | cacador, animador, `build_music`, redator |
| `music.json` | `montador` | `build_music`, auditor, editor |
| `bgm.mp3` | `build_music.py` | render (`--bgm-file`) |
| `shotlist.json` | `cacador` | animador, editor, `build_timeline`, auditor |
| `raw/` | cacador, editor, animador | `build_timeline`, designer |
| `timeline/NN.mp4` | editor (via `build_timeline.py`) | render, designer |
| `credits.md` | editor | auditor, redator, diretor |
| `output/final.mp4` | `montador` (copy of the render) | critico, auditor, diretor |
| `entrega.md` | `diretor` | user |

**The scripts** (`.agents/skills/video/scripts/`, standard-library Python and ffmpeg only):

- `srt_to_timing.py <subtitle.srt> <timing.json>` turns subtitles into phrases with start and end (`parse` at `:18-35`).
- `build_timeline.py <project> [--aspect] [--only] [--preview]` writes `timeline/NN.mp4` without audio, at the exact duration (`build` at `:142-157`). The source is `file` or `url`. With `url`, it downloads with `nix shell ... yt-dlp` (`:117-123`).
- `build_music.py <project> [--duration] [--preview]` builds `bgm.mp3` with crossfade (`:70`) and copies it to `storage/bgm/<slug>.mp3` (`:116-118`).
- `build_thumbnail.py <project> --text "L1|L2"` builds the cover; the first line uses `color`, the others `accent` (`:1-12`).
- `arte.py` is library code only. It reads `arte.json`, merges defaults (`DEFAULTS` at `:9-13`) and draws text with `drawtext` (`:43-57`).

## Example / walkthrough

A real excerpt of the `shotlist.json` contract (`pipeline.md:76-79`):

```json
{"n": "01", "phrases": [1], "dur": 4.2, "url": "https://www.youtube.com/watch?v=...",
 "start": 4.0, "kind": "fill", "why": "portais visíveis"}
```

The hunter writes the item. The editor reads `url` and `start` and calls `build_timeline.py`, which writes `raw/hi_*.mp4` and `timeline/01.mp4`. No script reads `phrases` or `why`. They exist for the agents.

## Pitfalls

- **Fields with no reader.** `build_timeline.py` does not read `anim`, `props`, `phrases` or `why`. `anim` is an instruction for the agent, which renders `raw/anim_NN.mp4` and points `file` to it (`cacador-de-clipes.md:35-36`).
- **Files no code reads.** `sources.json` has no script reader. And `arte.json.legenda` has no code reader: the montador translates it into flags by hand (`arte.py` has no defaults for it).
- **The stop is not optional.** The package goes to the user before any download or edit (`setup.md:59-60`). Skipping step 5 reverses that order. The skill's rule is at `SKILL.md:125`.
- **A folder outside the project.** `build_music.py` copies to `storage/bgm/`, outside `storage/projects/<slug>/`. The "do not delete outside the project" rule (`setup.md:76-77`) does not mention that folder.
- **Review has a limit.** Two loops for each cycle. After that, take the problem to the user (`pipeline.md:53`).

> [!warning] unstable
> The slow zoom on images in `fit` (`build_timeline.py:58-63`) and the `motion` key are `status/unstable`. So are the new animated scenes (see [[Remotion animations]]). The rest of this note is `status/stable`.

## Practice

1. Who writes `arte.json`, and who reads it to draw the subtitles?
2. A `shotlist.json` has `"anim": "ReverseFlow"`. What must exist for the render to work?
3. Why does the step 5 stop come before the download, not after the render?

> [!faq]- Answer key
> 1. `diretor-de-arte` writes it. `build_timeline` reads `texto_na_tela` and `build_thumbnail` reads `thumbnail`. The montador translates the subtitle block into flags (`pipeline.md:110-112`).
> 2. The `animador` must render `raw/anim_NN.mp4`, and `file` must point to it. The script only sees `file`.
> 3. Because `setup.md:59-60` says the package goes to the user before any download or edit.

## Connections

- Previous: [[Claude and Grok adapters]]. Next: [[Technical team]].
- See also: [[Pipeline and stop_at]], [[Voice and subtitles]], [[Video material]], [[Music and publishing]], [[Channel profiles]].
- Reference: [[Agent JSON contracts]], [[Roles and models]].
- Canvas: [[04 - Video team.canvas|Video team canvas]].
