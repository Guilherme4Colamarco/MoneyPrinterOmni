---
title: Agent JSON contracts
tags: [mapa, referencia, status/stable]
aliases: [Contratos JSON dos agentes]
lang: en
sources: [.agents/pipeline.md, .agents/skills/video/scripts/srt_to_timing.py, .agents/skills/video/scripts/build_timeline.py, .agents/skills/video/scripts/build_music.py, .agents/skills/video/scripts/build_thumbnail.py, .agents/skills/video/scripts/arte.py]
---
# Agent JSON contracts

[[00 - Index|← Index]]

The five JSON files the video team roles exchange: `sources.json`, `timing.json`, `shotlist.json`, `music.json` and `arte.json`. The **Read by script** column shows what the code actually uses. The rest is read only by the agents.

## Core idea

The contracts are the interface between roles. The text of `pipeline.md` is the specification. The scripts are the proof of what is really read. A field can exist in the specification and have no reader in the code: in that case, an agent interprets it, not a script.

## How it works

### `sources.json` (written by `pesquisador`; read by cacador, editor, auditor and diretor de arte)

A list of candidate videos or images. See the example in `pipeline.md:61-66`.

| Field | Type | Optional | Values or format | Read by script |
|---|---|---|---|---|
| `id` | text | no | source id (e.g. a YouTube id) | no |
| `url` | text | no | link to the source | no (`build_timeline` uses the shotlist `url`) |
| `type` | text | no | `video`, `image`, `stock`, `chart`, `user` | no |
| `channel` | text | no | channel or author name | no |
| `license` | text | no | e.g. `terceiro (trecho curto)`, `domínio público`, `CC-BY`, `stock` | no |
| `duration` | text | no | `m:ss` | no |
| `covers` | list of text | no | which script block the source fits | no |
| `platform` | text | yes | `youtube`, `x`, `tiktok`, `instagram`, `reddit` | no |
| `author` | text | yes | `@handle` | no |
| `posted_at` | text | yes | `YYYY-MM-DD` | no |
| `via` | text | yes | `mcp:yt-dlp`, `mcp:reddit`, `mcp:apify`, `yt-dlp`, `web` | no |

The example in `pipeline.md:57-66` shows the fields; `pipeline.md:58-59` marks `platform`, `author`, `posted_at` and `via` as optional. No script reads the file.

### `timing.json` (written by `srt_to_timing.py`, from the subtitles; read by cacador, animador, `build_music`, redator)

A list, one item per subtitle line (`srt_to_timing.py:18-35`).

| Field | Type | Notes |
|---|---|---|
| `n` | integer | starts at 1 |
| `start` | number, seconds | 3 decimal places |
| `end` | number, seconds | 3 decimal places |
| `text` | text | the subtitle lines joined with a space |

Written with `json.dump(..., ensure_ascii=False, indent=1)` (`srt_to_timing.py:42-43`).

### `shotlist.json` (written by `cacador-de-clipes`; read by animador, editor, `build_timeline`, critico and auditor)

A list, one item per scene. `dur` is the start of the next scene minus the start of this one (`pipeline.md:74`). The sum of the durations must be at least the audio length.

| Field | Type | Read by `build_timeline` | Notes |
|---|---|---|---|
| `n` | text or integer | yes | normalized to two digits (`build_timeline.py:212`) |
| `dur` | number, seconds | yes | exact clip length |
| `kind` | text | yes | `fill`, `window`, `fit`, `image`; aliases `game` and `vert` (fill), `gta` (window), `app` (fit, zoom 0.62) (`:39`) |
| `file` + `ss` | text + number | yes | local source; `ss` is the start point in the file, default 0 |
| `url` + `start` | text + number | yes | online source; downloads from `start - 1` to `start + dur + 1` |
| `source` | text | yes | `youtube:<id>`, an alternative to `url` |
| `x`, `y` | number (0–1) | yes | focus point for `fill` and `image`; default 0.5 |
| `top` | number | yes | `window` only; default 0.05 |
| `zoom` | number (0–1) | yes | `fit` (centre band) and `image` (final zoom; default 1.15) |
| `crop` | text | yes | ffmpeg crop filter, `fit` only |
| `motion` | boolean | yes | `fit` with an image only; default true (see the unstable note) |
| `text` | text | yes | on-screen text; `\n` breaks the line |
| `text_pos` | text | yes | `top`, `center` or `bottom`; default `top` |
| `anim` | text | no | Remotion composition id; the animador reads it |
| `props` | object | no | extra parameters for the animador |
| `phrases` | list of integers | no | phrases covered; for the agent only |
| `why` | text | no | reason for the choice; for the agent only |

For an animated scene, `file` points to `raw/anim_NN.mp4` (`pipeline.md:82-83`). Example at `pipeline.md:76-79`.

### `music.json` (written by `montador-mpt`; read by `build_music`, auditor and editor)

| Field | Type | Read by `build_music` | Notes |
|---|---|---|---|
| `crossfade` | number, seconds | yes (`build_music.py:70`) | default 1.5 |
| `cues` | list | yes | each music cue |
| `cues[].start` | number, seconds | yes | when the track starts in the video, on a phrase from `timing.json` |
| `cues[].mood` | text | prints only | the block's mood |
| `cues[].url` or `file` | text | yes | track source |
| `cues[].ss` | number | yes | point in the track to start; default 0 |
| `cues[].gain_db` | number | yes | extra gain; default 0 |
| `cues[].title` | text | prints only | track name |
| `cues[].author`, `license` | text | no | used in the credits by the agents |

### `arte.json` (written by `diretor-de-arte`; read by `build_timeline`, `build_thumbnail` and the montador)

| Section | Field | Read by script | Default in `arte.py` |
|---|---|---|---|
| `texto_na_tela` | `font`, `color`, `size`, `box`, `box_color` | yes: `build_timeline.py:215` | `BeVietnamPro-Bold.ttf`, `#FFFFFF`, 96, true, `#000000@0.55` (`arte.py:10-11`) |
| `thumbnail` | `font`, `color`, `accent` | yes: `build_thumbnail.py:24` and `:48` | `BeVietnamPro-Bold.ttf`, `#FFFFFF`, `#FFD400` (`arte.py:12`) |
| `legenda` | `font_name`, `text_fore_color`, `stroke_color`, `stroke_width`, `position`, `background`, `background_color` | no | **no default** in `arte.py` |

The montador turns the `legenda` section into CLI flags: `--font-name`, `--text-fore-color`, `--stroke-color`, `--stroke-width`, `--subtitle-position`, `--subtitle-background-enabled`, `--subtitle-background-color` (`pipeline.md:110-112`).

## Example / walkthrough

A `timing.json` built from subtitles, and one `music.json` cue:

```json
[{"n": 1, "start": 0.098, "end": 3.598, "text": "A inteligência artificial..."}]
```

```json
{"crossfade": 1.5, "cues": [{"start": 34.5, "mood": "amedrontador", "file": "raw/music/Darkest Child.mp3", "ss": 0,
  "title": "Darkest Child", "author": "Kevin MacLeod", "license": "CC BY 4.0"}]}
```

## Pitfalls

- **Fields with no reader.** `sources.json` has no script reader; the reader is the auditor, in the rights check. `arte.json.legenda` also has no reader in the code: the montador translates it into flags by hand.
- **Different default colour.** `texto_na_tela.color` is `#FFFFFF` in `arte.py:10`, but the example in `pipeline.md:106` uses `#FFD400`. The project file always wins over the default.
- **`anim` and `props` are not read by `build_timeline`.** They are instructions for the animador, which renders `raw/anim_NN.mp4` and points `file` to it.
- **`start` is not `ss`.** With `url`, `start` is the moment in the source video. With `file`, `ss` is the start point inside the local file.

> [!warning] unstable
> The `motion` field of `fit` (slow zoom on a still image) is `status/unstable`. Status to be confirmed on `main`.

## Connections

- Concept: [[Video team and file contracts]]. Walkthrough: [[04 - Video with the agent team]].
- Reference: [[Roles and models]], [[CLI flags]], [[Configuration keys]].
- Related concepts: [[Pipeline and stop_at]], [[Voice and subtitles]], [[Music and publishing]].
