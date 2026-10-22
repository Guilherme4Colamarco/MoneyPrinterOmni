---
title: Remotion animations
tags: [mapa, animacoes, status/stable]
aliases: [Animações com Remotion]
lang: en
sources: [animations/src/Root.tsx, animations/src/lib.tsx, animations/remotion.config.ts, animations/package.json, docs/animations.md, .agents/roles/animador.md, .agents/pipeline.md]
---
# Remotion animations

[[00 - Index|← Index]]

`animations/` is a Remotion project (React and TypeScript) that renders animated charts and diagrams to mp4. The `animador` uses it for scenes that do not exist as a photo or a video.

## Core idea

A scene with `"anim"` in `shotlist.json` becomes an mp4 of the exact length. The rest of the pipeline does not know it was animated: `build_timeline.py` treats the mp4 as a local file. So the animation enters the timeline like any other clip.

## How it works

1. **Project.** Remotion 4.0.536 in all `remotion` and `@remotion/*` packages, React 19.2.3 and TypeScript 5.9.3 (`animations/package.json`, dependencies). `remotion.config.ts` turns on rspack, JPEG frames, output overwrite and 2 s of premount.
2. **npm scripts** (`package.json`): `dev` and `studio` open the editor, `render` and `still` export, `typecheck` runs `tsc --noEmit`, and `lint` runs eslint.
3. **Compositions** in `src/Root.tsx`. All are 1080x1920 at 30 fps, except `HelloChartWide`, which is 1920x1080:

| Id | Line | Use |
|---|---|---|
| `HelloChart` | 22 | sample, 9:16 |
| `HelloChartWide` | 31 | sample, 16:9 |
| `ReverseFlow` | 40 | flow in numbered steps |
| `AgentSwarm` | 50 | grid filled by agents |
| `ByteCompare` | 60 | byte-by-byte comparison |
| `TimelineAnos` | 70 | bars and program pairs |
| `TerminalAntigo` | 80 | old terminal with errors |
| `FedoraVersoes` | 90 | version timeline |
| `ComentaBalao` | 100 | comment bubbles |
| `TrocariaCard` | 110 | chips and a yellow question |
| `QuoteCard` | 120 | quote card, 1 frame |

4. **Duration.** `durationMetadata` (`lib.tsx:38-40`) converts `durationSeconds` into frames: `round(seconds × 30)`, minimum 1. That is why the shotlist `dur` becomes `durationSeconds` at render time.
5. **Colours and font** live in `lib.tsx` (`FPS` at line 14, `colors` from line 16). The font is BeVietnamPro, loaded from `public/`.
6. **Path to the timeline:**
   - `cacador-de-clipes` marks the scene with `"anim"`, `"file": "raw/anim_NN.mp4"` and `"kind": "fill"`;
   - the `animador` runs `cd animations && npx remotion render <Id> ../storage/projects/<slug>/raw/anim_NN.mp4 --props='{"durationSeconds":<dur>, ...}'` (`animador.md:33`);
   - `build_timeline.py` reads `file` as a local file;
   - the montador joins the clips in the render.

## Example / walkthrough

A 7.4 s scene with three steps, as in the docs (`docs/animations.md:43`):

```sh
cd animations
npx remotion render ReverseFlow ../storage/projects/<slug>/raw/anim_01.mp4 \
  --props='{"durationSeconds":7.4,"steps":["A","B","C"]}'
npx remotion still ByteCompare out/preview.png --frame=240   # check one frame
```

The animador checks the frame, legibility (text at least 48 px) and that nothing covers the subtitle area (`animador.md:34-36`). Then it points `file` at the shotlist, or asks the hunter to adjust.

## Pitfalls

- **`QuoteCard` and `HelloChartWide` are outside the docs.** `QuoteCard` has one frame and does not fit the `render → fill` path: it needs `remotion still` and `kind: image`. `docs/animations.md` lists neither; `animador.md` names only four compositions (`animador.md:26`).
- **Wrong duration.** If `durationSeconds` does not match the shotlist `dur`, the scene is shorter or longer than the narration.
- **Licence.** Remotion is free for individuals and small teams. Larger companies need a paid licence (`docs/animations.md:49`).
- **`kit.tsx` is shared.** Changing `kit.tsx` affects `ComentaBalao`, `FedoraVersoes` and `TrocariaCard`.

> [!warning] unstable
> The four compositions `TerminalAntigo`, `FedoraVersoes`, `ComentaBalao` and `TrocariaCard`, and `src/kit.tsx`, exist only on the branch with the new animations (PR #1). Status to be confirmed on `main`. See [[Branches main and unstable]].

## Practice

1. Which `shotlist.json` fields trigger the rendering of an animation?
2. Why does `build_timeline.py` not need to know that a clip came from Remotion?
3. A clip has `durationSeconds` 4 and the shotlist `dur` is 4.2. What happens?

> [!faq]- Answer key
> 1. `"anim"` and `"file"`. The `kind` is `fill` (`animador.md:37`; `pipeline.md:82-83`).
> 2. Because it receives an mp4 in `file`, like any local file (`docs/animations.md:47`). No script reads `anim`.
> 3. The clip is 4 s and the scene asks for 4.2 s. It does not cover the whole narration. Rule: `durationSeconds` = `dur`.

## Connections

- Previous: [[Video team and file contracts]]. See also: [[Video material]], [[Claude and Grok adapters]].
- Reference: [[Agent JSON contracts]].
- Canvas: [[04 - Video team.canvas|Video team canvas]].
