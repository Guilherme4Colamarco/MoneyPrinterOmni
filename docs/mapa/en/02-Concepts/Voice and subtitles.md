---
title: Voice and subtitles
tags: [mapa, integracoes, status/stable]
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
2. `tts` (`app/services/voice.py:1138`) handles pauses. Without pause tags it calls `_single_tts` directly (`voice.py:640`).
3. `_single_tts` picks the provider from the **voice name prefix**. Order: `no-voice` (`generate_silent_audio`, `:593`), `-V2` (`azure_tts_v2`, `:1784`), `siliconflow:`, `gemini:`, `mimo:`, `minimax:`, `elevenlabs:`, `chatterbox:`, `kokoro:`, `fish_audio:`, `voxcpm:`. Without a prefix it falls back to Edge/Azure v1 (`azure_tts_v1`, `:1535`).
4. Pauses: `[pause: 2s]` and its variants in other languages (`pausa`, `silence`, `停顿`...) are recognised by `PAUSE_TAG_PATTERN` (`app/utils/utils.py:328`). Duration ranges from 0.1 s to 10 s (`utils.py:337-338`).
5. Only Edge v1 synthesises in separate segments, with exact PCM silence (`_tts_with_pauses`, `voice.py:972`). Other providers strip the tags and synthesise in one request.
6. `generate_subtitle` (`task.py:649`) reads `config.app.subtitle_provider` (default `edge`, `config.example.toml:516`).
   - `edge`: `voice.create_subtitle` (`voice.py:3679`), using the synthesis timings.
   - `whisper`: `subtitle.create` (`app/services/subtitle.py:61`), with faster-whisper, then `subtitle.correct` (`:230`), which compares against the script.
7. Writing is atomic (`staged_subtitle_file`, `app/utils/subtitle_writer.py:11`).

TTS providers and configuration:

| Voice (prefix) | Function | Configuration |
|---|---|---|
| Edge / Azure v1 (default, no key) | `azure_tts_v1` (`voice.py:1535`) | `edge_tts_timeout` |
| Azure v2 (suffix `-V2`) | `azure_tts_v2` (`:1784`) | `[azure]` `speech_key`, `speech_region` |
| `siliconflow:` | `siliconflow_tts` (`:1604`) | `[siliconflow]` `api_key` |
| `gemini:` | `gemini_tts` (`:1913`) | `gemini_api_key` |
| `mimo:` | `mimo_tts` (`:2055`) | `mimo_api_key`, `mimo_base_url` |
| `minimax:` | `minimax_tts` (`:2380`) | `[minimax_tts]` |
| `elevenlabs:` | `elevenlabs_tts` (`:2473`) | `[elevenlabs]` `api_key` |
| `chatterbox:` | `chatterbox_tts` (`:2766`) | `[chatterbox]` |
| `kokoro:` | `kokoro_tts` (`:2808`) | `[kokoro]` |
| `fish_audio:` | `fish_audio_tts` (`:2862`) | `[fish_audio]` or `FISH_API_KEY` |
| `voxcpm:` | `voxcpm_tts` (`:3210`) | `[voxcpm]`, accepts a reference audio |
| `no-voice` | `generate_silent_audio` | none |

`chatterbox` and `kokoro` share the helper `_openai_compatible_tts` (`voice.py:2654`).

## Example / walkthrough

Default voice in the schema: `zh-CN-XiaoxiaoNeural-Female` (`app/models/schema.py:175`). A task with that value goes through `azure_tts_v1`, writes `storage/tasks/<id>/audio.mp3` and measures the duration from the file. With `subtitle_provider = "edge"`, `subtitle.srt` comes from the synthesis timings. If Edge synthesis fails, subtitles are skipped and the log says `skip subtitles without falling back to whisper`. There is no automatic fallback.

## Pitfalls

- **Whisper is global.** `subtitle_provider` applies to all tasks. There is no per-task parameter.
- **No subtitles is not an error.** An Edge failure gives a video without subtitles, and the task continues. The user has to check the subtitles.
- **The prefix decides the provider.** A voice name without the right prefix falls back to Edge silently. E.g. `gemini-...` without `gemini:` goes to Azure.
- **Pause tags with non-Edge providers.** The pause is removed, not turned into silence. The text loses the pause time.

## Practice

1. In which order do `generate_audio` and `generate_subtitle` run? Why does that matter for `POST /subtitle`?
2. Which subtitle provider uses the synthesis timings, and which one transcribes the audio?
3. What happens to `[pause: 2s]` if the voice is `kokoro:`?

> [!faq]- Answer key
> 1. Audio first (`task.py:1715` calls `generate_audio`; `:1760` calls `generate_subtitle`). That is why `POST /subtitle` always synthesises the voice before subtitling.
> 2. `edge` uses the synthesis timings. `whisper` transcribes (faster-whisper).
> 3. The tag is removed by `remove_pause_tags` in `tts` (`voice.py:1138`), with no silence. Only Edge v1 generates the pause.

## Connections

- [[Pipeline and stop_at]] — the order of the stages.
- [[Configuration keys]] — `[whisper]`, `[azure]`, `[kokoro]` and the other keys.
- [[Video material]] — the next stage.
- [[03 - Integrations.canvas|Canvas]]
