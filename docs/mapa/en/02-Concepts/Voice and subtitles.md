---
title: Voice and subtitles
tags: [mapa, integracoes, status/unstable]
lang: en
sources: [app/services/voice.py, app/services/subtitle.py, app/services/task.py, app/utils/utils.py, app/utils/subtitle_writer.py, config.example.toml, app/models/schema.py]
---
# Voice and subtitles

[[00 - Index|← Index]]

Audio is generated **before** the subtitles, and the subtitles are aligned to that audio.

## Core idea

Narration (TTS) and subtitles are separate stages, but they are linked. The `edge` subtitle provider uses the timings that the synthesis itself returns. The `whisper` provider ignores those timings and transcribes the audio. Because audio comes first, `POST /subtitle` also runs the TTS.

## How it works

1. `generate_audio` (`app/services/task.py:551`) picks the source: a file sent by the user (`resolve_custom_audio_file`), a WebUI preview that is reused, or `voice.tts`.
2. `tts` (`app/services/voice.py:1250`) handles pauses. Without pause tags it calls `_single_tts` directly (`voice.py:745`).
3. `_single_tts` picks the provider from the **voice name prefix**. Order: `no-voice` (`generate_silent_audio`, `:698`), `-V2` (`azure_tts_v2`, `:1896`), `siliconflow:`, `gemini:`, `xai:`, `mimo:`, `minimax:`, `elevenlabs:`, `chatterbox:`, `kokoro:`, `fish_audio:`, `voxcpm:`. Without a prefix it falls back to Edge/Azure v1 (`azure_tts_v1`, `:1647`).
4. Pauses: `[pause: 2s]` and its variants in other languages (`pausa`, `silence`, `停顿`...) are recognised by `PAUSE_TAG_PATTERN` (`app/utils/utils.py:328`). Duration ranges from 0.1 s to 10 s (`utils.py:337-338`).
5. Only Edge v1 synthesises in separate segments, with exact PCM silence (`_tts_with_pauses`, `voice.py:1084`). Other providers strip the tags and synthesise in one request.
6. `generate_subtitle` (`task.py:649`) reads `config.app.subtitle_provider` (default `edge`, `config.example.toml:516`).
   - `edge`: `voice.create_subtitle` (`voice.py:4086`), using the synthesis timings.
   - `whisper`: `subtitle.create` (`app/services/subtitle.py:61`), with faster-whisper, then `subtitle.correct` (`:230`), which compares against the script.
7. Writing is atomic (`staged_subtitle_file`, `app/utils/subtitle_writer.py:11`).

TTS providers and configuration:

| Voice (prefix) | Function | Configuration |
|---|---|---|
| Edge / Azure v1 (default, no key) | `azure_tts_v1` (`voice.py:1647`) | `edge_tts_timeout` |
| Azure v2 (suffix `-V2`) | `azure_tts_v2` (`:1896`) | `[azure]` `speech_key`, `speech_region` |
| `siliconflow:` | `siliconflow_tts` (`:1716`) | `[siliconflow]` `api_key` |
| `gemini:` | `gemini_tts` (`:2025`) | `gemini_api_key` |
| `xai:` | `xai_tts` (`:2304`) | `[xai]` `api_key`, or `XAI_API_KEY`, or `grok_api_key` |
| `mimo:` | `mimo_tts` (`:2462`) | `mimo_api_key`, `mimo_base_url` |
| `minimax:` | `minimax_tts` (`:2787`) | `[minimax_tts]` |
| `elevenlabs:` | `elevenlabs_tts` (`:2880`) | `[elevenlabs]` `api_key` |
| `chatterbox:` | `chatterbox_tts` (`:3173`) | `[chatterbox]` |
| `kokoro:` | `kokoro_tts` (`:3215`) | `[kokoro]` |
| `fish_audio:` | `fish_audio_tts` (`:3269`) | `[fish_audio]` or `FISH_API_KEY` |
| `voxcpm:` | `voxcpm_tts` (`:3617`) | `[voxcpm]`, accepts a reference audio |
| `no-voice` | `generate_silent_audio` | none |

`chatterbox` and `kokoro` share the helper `_openai_compatible_tts` (`voice.py:3061`). `xai_tts` requests `with_timestamps=true` and groups native `graph_chars`/`graph_times` into words; if the API omits timings, it uses the repo's proportional fallback. xAI STT is not wired: TTS already aligns the original script.

## Example / walkthrough

Default voice in the schema: `zh-CN-XiaoxiaoNeural-Female` (`app/models/schema.py:175`). A task with that value goes through `azure_tts_v1`, writes `storage/tasks/<id>/audio.mp3` and measures the duration from the file. With `subtitle_provider = "edge"`, `subtitle.srt` comes from the synthesis timings. If Edge synthesis fails, subtitles are skipped and the log says `skip subtitles without falling back to whisper`. There is no automatic fallback.

## Pitfalls

- **Whisper is global.** `subtitle_provider` applies to all tasks. There is no per-task parameter.
- **No subtitles is not an error.** An Edge failure gives a video without subtitles, and the task continues. The user has to check the subtitles.
- **The prefix decides the provider.** A voice name without the right prefix falls back to Edge silently. E.g. `gemini-...` without `gemini:` goes to Azure.
- **Pause tags with non-Edge providers.** The pause is removed, not turned into silence. The text loses the pause time.

> [!warning] unstable
> The voice and subtitle fixes from upstream Turbo v1.3.9 (SiliconFlow dB volume, pause tags after CJK keywords, symbol-only lines, rounded seconds and SRT timestamps, long-word line splitting) are only in the `unstable` branch. See [[Omni and Turbo]].

## Practice

1. In which order do `generate_audio` and `generate_subtitle` run? Why does that matter for `POST /subtitle`?
2. Which subtitle provider uses the synthesis timings, and which one transcribes the audio?
3. What happens to `[pause: 2s]` if the voice is `kokoro:`?

> [!faq]- Answer key
> 1. Audio first (`task.py:1715` calls `generate_audio`; `:1760` calls `generate_subtitle`). That is why `POST /subtitle` always synthesises the voice before subtitling.
> 2. `edge` uses the synthesis timings. `whisper` transcribes (faster-whisper).
> 3. The tag is removed by `remove_pause_tags` in `tts` (`voice.py:1250`), with no silence. Only Edge v1 generates the pause.

## Connections

- [[Pipeline and stop_at]] — the order of the stages.
- [[Configuration keys]] — `[whisper]`, `[azure]`, `[kokoro]` and the other keys.
- [[Video material]] — the next stage.
- [[03 - Integrations.canvas|Canvas]]
