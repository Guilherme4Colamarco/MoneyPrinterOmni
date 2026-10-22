---
title: 04 - Video with the agent team
tags: [mapa, percurso, status/stable]
aliases: [04 - Vídeo pelo time de agentes]
lang: en
sources: [.agents/skills/video/SKILL.md, .agents/pipeline.md, .agents/setup.md, .agents/playbooks/moneyprinter.md, .agents/roles/montador-mpt.md, .agents/skills/video/scripts/build_timeline.py, .agents/skills/video/scripts/build_music.py, .agents/skills/video/scripts/build_thumbnail.py, cli.py]
---
# 04 - Video with the agent team

[[00 - Index|← Index]]

One video, end to end: from the request to `entrega.md`, through the twelve roles. Each step writes a file, and the next role reads it.

> [!info] Illustrative example
> Nothing was run in this checkout: `storage/projects/` does not exist. Names in `<...>` are placeholders you replace. The commands and file names are the real ones from the repository.

## Core idea

The walkthrough is a queue of roles with files between them. The expensive part, the render, starts only after the script passes review and the user approves the package. Until then, the program only generates a test voice track.

## How it works

**Request.** You write: "follow `.agents/skills/video/SKILL.md` for a video about <topic>, 60 s, 9:16, pt-BR". The skill takes duration, format and language (`SKILL.md:8-9`).

**Step 0 · Profile and brief.** The assistant reads `setup.md` and picks the profile. With `tecnologia` as the profile, it creates `storage/projects/<slug>/brief.md`:

```
perfil: tecnologia
tema: <topic>
angulo: <the thesis in one sentence>
```

Only what differs from the profile goes in the brief (`SKILL.md:32-33`).

**Step 1 · `pesquisador`.** It writes `research.md` (facts with sources), `sources.json` (videos per scene), `script.txt` (only the narrated text) and `music-plan.md` (the mood of each block). A fact without a source does not go in; a recent topic needs two sources (`setup.md:51-52`).

**Step 2 · in parallel.** `critico` writes `critique/content-01.md`, `sugestor-de-pauta` writes `critique/ideas-01.md`, and `auditor` writes `audit/fatos-01.md` with `OK` or `CORRIGIR`. If there is `REVISAR`, `CORRIGIR` or a high-value suggestion, the researcher revises. At most two rounds (`SKILL.md:44-45`).

**Step 4 · `diretor-de-arte`.** It writes `arte.json`. An example, following the contract (`pipeline.md:103-108`):

```json
{"legenda": {"font_name": "BeVietnamPro-Bold.ttf", "text_fore_color": "#FFFFFF", "stroke_color": "#000000"},
 "texto_na_tela": {"font": "BeVietnamPro-Bold.ttf", "color": "#FFD400", "size": 96, "box": true},
 "thumbnail": {"font": "BeVietnamPro-Bold.ttf", "color": "#FFFFFF", "accent": "#FFD400"}}
```

**Step 5 · stop.** `diretor` writes `aprovacao-01.md` with the script, duration, music mood, visual plan and open items. The assistant shows it and waits. Without the user's approval, nothing is downloaded (`SKILL.md:47-49`).

**Step 6 · `montador-mpt`, timing mode.** Everything runs inside the dev shell (`moneyprinter.md:6`). First, the audio test:

```sh
nix develop --command bash -c '.venv/bin/python cli.py --video-script "$(cat storage/projects/<slug>/script.txt)" --video-language pt-BR --voice-rate 1.0 --stop-at audio'
```

The last line is a JSON with `audio_duration`. The target is ±3 s of the goal. Change the text first; change the speed only between 0.95 and 1.10 (`montador-mpt.md:24-26`). Then the subtitles and timings:

```sh
nix develop --command bash -c '.venv/bin/python cli.py ... --stop-at subtitle'
python3 .agents/skills/video/scripts/srt_to_timing.py storage/tasks/<task_id>/subtitle.srt storage/projects/<slug>/timing.json
```

The music comes next: `music.json` with the cues, then `build_music.py <proj> --preview`. The script writes `bgm.mp3`, copies it to `storage/bgm/<slug>.mp3` and prints `--bgm-type custom --bgm-file <slug>.mp3` (`build_music.py:116-120`).

**Step 7 · `cacador-de-clipes`.** It watches the sources in low resolution, picks the segment for each phrase and writes `shotlist.json`. Scenes with `anim` go to the `animador` (step 7b, see [[Remotion animations]]).

**Step 8 · `editor-de-clipes`.** It builds the timeline and checks the preview:

```sh
python3 .agents/skills/video/scripts/build_timeline.py storage/projects/<slug> --aspect 9:16 --preview
```

The script prints each clip's duration and the total (`build_timeline.py:225-228`) and writes `raw/timeline_preview.png`. The editor looks at the image before going on. Then it writes `credits.md`.

**Step 9 · `montador-mpt`, render mode.** The call joins the clips, the music and the subtitles:

```sh
nix develop --command bash -c '.venv/bin/python cli.py --video-script "$(cat storage/projects/<slug>/script.txt)" --video-language pt-BR --voice-name <voice> --voice-rate <same as the test> --video-aspect 9:16 --video-source local --video-materials "$(ls storage/projects/<slug>/timeline/*.mp4 | paste -sd,)" --video-concat-mode sequential --video-transition-mode none --video-clip-duration <longest clip> --bgm-type custom --bgm-file <slug>.mp3 --bgm-volume 0.2'
```

The subtitle settings come from `arte.json`, translated into `--font-name`, `--text-fore-color`, `--stroke-color` and the other flags (`montador-mpt.md:21`). The result is copied to `output/final.mp4` and checked with `ffprobe`. `--video-clip-duration` is the cut for each clip (`app/services/video.py:1154-1155`).

**Step 10 · in parallel.** `critico` writes `critique/visual-01.md` and `auditor` writes `audit/direitos-01.md`. If either rejects, only the flagged scenes come back: `build_timeline.py --only 07,12`, then the render runs again.

**Step 11 · in parallel.** `designer-de-thumbnail` builds the cover:

```sh
python3 .agents/skills/video/scripts/build_thumbnail.py storage/projects/<slug> --from timeline/07.mp4 --at 1.5 --text "<LINE 1>|<LINE 2>"
```

`redator-de-publicacao` writes `publicacao/publicacao.md`: titles, description, credits and tags.

**Step 12 · `diretor` (delivery).** It runs the checklist and writes `entrega.md` with `PRONTO` or `REFAZER <etapa>`. It notes the video in the profile's History.

**Step 13 · report.** The video path, covers, titles ready to paste, and open items. Nothing is published.

## Why it works

- **Files are the interface.** Each role needs only the contract. The reviewer does not need to know who wrote the script.
- **The expensive part comes after the stops.** Script and approval come before download and render.
- **Clips are cut already.** Each clip has the scene's length, so `sequential` mode does not have to guess where to cut.
- **Same text, same speed.** The audio test and the render use the same text and the same `--voice-rate`. Otherwise the sync breaks (`montador-mpt.md:41`).

## Pitfalls

- **Python outside the dev shell.** The `.venv` uses Nix's Python and needs the flake's `libstdc++`. Running `python3 cli.py` outside `nix develop` fails. The skill's scripts are the exception: they run with plain `python3`.
- **Test tasks.** Delete discarded test tasks from `storage/tasks/`. The rule is at `SKILL.md:126`.
- **Third-party downloads.** In the cloud, `yt-dlp` fails on YouTube without login. See [[MCP and permissions]].
- **Speed out of range.** If the audio does not land within ±10%, the problem is the text. Cut the script.

## Practice

1. Why does `--stop-at audio` come before `--stop-at subtitle`?
2. You have no footage for one scene. What does the editor do, and what does the assistant ask the user?
3. `critico` says `REVISAR` in step 10. How many rework rounds are allowed?

> [!faq]- Answer key
> 1. Because the audio gives the duration, which sets the text and the speed. Only then do the subtitles and timings make sense (`montador-mpt.md:24-27`).
> 2. The editor does not invent a clip. The assistant asks whether the user will record or send something, or accept stock (`SKILL.md:56`).
> 3. Two rounds at most (`SKILL.md:64-66`).

## Connections

- Previous: [[Video team and file contracts]]. Next: [[05 - Change with the technical team]].
- Concepts: [[Pipeline and stop_at]], [[Voice and subtitles]], [[Video material]], [[Music and publishing]], [[Channel profiles]].
- Reference: [[Agent JSON contracts]], [[Roles and models]], [[CLI flags]].
- Canvas: [[04 - Video team.canvas|Video team canvas]].
