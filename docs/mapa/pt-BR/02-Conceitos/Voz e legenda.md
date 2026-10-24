---
title: Voz e legenda
tags: [mapa, integracoes, status/unstable]
lang: pt-BR
sources: [app/services/voice.py, app/services/subtitle.py, app/services/task.py, app/utils/utils.py, app/utils/subtitle_writer.py, config.example.toml, app/models/schema.py]
---
# Voz e legenda

[[00 - Índice|← Índice]]

O áudio é gerado **antes** da legenda, e a legenda é alinhada ao tempo desse áudio.

## Ideia central

Narração (TTS) e legenda são etapas separadas, mas ligadas. A legenda do provedor `edge` usa os tempos que a própria síntese devolve. O provedor `whisper` ignora esses tempos e transcreve o áudio. Como o áudio vem primeiro, `POST /subtitle` também roda a TTS.

## Como funciona

1. `generate_audio` (`app/services/task.py:551`) escolhe a fonte: arquivo enviado pelo usuário (`resolve_custom_audio_file`), prévia reaproveitada da WebUI, ou `voice.tts`.
2. `tts` (`app/services/voice.py:1250`) trata pausas. Sem tag de pausa, chama `_single_tts` direto (`voice.py:745`).
3. `_single_tts` escolhe o provedor pelo **prefixo do nome da voz**. Ordem: `no-voice` (`generate_silent_audio`, `:698`), `-V2` (`azure_tts_v2`, `:1896`), `siliconflow:`, `gemini:`, `xai:`, `mimo:`, `minimax:`, `elevenlabs:`, `chatterbox:`, `kokoro:`, `fish_audio:`, `voxcpm:`. Sem prefixo, cai no Edge/Azure v1 (`azure_tts_v1`, `:1647`).
4. Pausas: `[pause: 2s]` e as variantes em outros idiomas (`pausa`, `silence`, `停顿`...) são reconhecidas por `PAUSE_TAG_PATTERN` (`app/utils/utils.py:328`). A duração vai de 0,1 s a 10 s (`utils.py:337-338`).
5. Só o Edge v1 sintetiza em segmentos separados, com silêncio PCM exato (`_tts_with_pauses`, `voice.py:1084`). Os demais provedores removem as tags e sintetizam de uma vez.
6. `generate_subtitle` (`task.py:649`) lê `config.app.subtitle_provider` (padrão `edge`, `config.example.toml:516`).
   - `edge`: `voice.create_subtitle` (`voice.py:4086`), com os tempos da síntese.
   - `whisper`: `subtitle.create` (`app/services/subtitle.py:61`), com faster-whisper, e depois `subtitle.correct` (`:230`), que compara com o roteiro.
7. A escrita é atômica (`staged_subtitle_file`, `app/utils/subtitle_writer.py:11`).

Provedores de TTS e configuração:

| Voz (prefixo) | Função | Configuração |
|---|---|---|
| Edge / Azure v1 (padrão, sem chave) | `azure_tts_v1` (`voice.py:1647`) | `edge_tts_timeout` |
| Azure v2 (sufixo `-V2`) | `azure_tts_v2` (`:1896`) | `[azure]` `speech_key`, `speech_region` |
| `siliconflow:` | `siliconflow_tts` (`:1716`) | `[siliconflow]` `api_key` |
| `gemini:` | `gemini_tts` (`:2025`) | `gemini_api_key` |
| `xai:` | `xai_tts` (`:2304`) | `[xai]` `api_key`, ou `XAI_API_KEY`, ou `grok_api_key` |
| `mimo:` | `mimo_tts` (`:2462`) | `mimo_api_key`, `mimo_base_url` |
| `minimax:` | `minimax_tts` (`:2787`) | `[minimax_tts]` |
| `elevenlabs:` | `elevenlabs_tts` (`:2880`) | `[elevenlabs]` `api_key` |
| `chatterbox:` | `chatterbox_tts` (`:3173`) | `[chatterbox]` |
| `kokoro:` | `kokoro_tts` (`:3215`) | `[kokoro]` |
| `fish_audio:` | `fish_audio_tts` (`:3269`) | `[fish_audio]` ou `FISH_API_KEY` |
| `voxcpm:` | `voxcpm_tts` (`:3617`) | `[voxcpm]`, aceita áudio de referência |
| `no-voice` | `generate_silent_audio` | nenhuma |

`chatterbox` e `kokoro` usam o mesmo auxiliar `_openai_compatible_tts` (`voice.py:3061`). `xai_tts` pede `with_timestamps=true` e agrega os `graph_chars`/`graph_times` nativos em palavras; se a API não devolver tempos, cai no fallback proporcional do repositório. STT da xAI não foi ligado: o TTS já alinha o texto original.

## Exemplo / percurso

Voz padrão do schema: `zh-CN-XiaoxiaoNeural-Female` (`app/models/schema.py:175`). Uma task com esse valor passa por `azure_tts_v1`, grava `storage/tasks/<id>/audio.mp3` e mede a duração do arquivo. Com `subtitle_provider = "edge"`, o `subtitle.srt` sai dos tempos da síntese. Se a síntese do Edge falhar, a legenda é pulada, e o log diz `skip subtitles without falling back to whisper`. Não há fallback automático.

## Armadilhas

- **Whisper é global.** `subtitle_provider` vale para todas as tasks. Não existe parâmetro por task.
- **Sem legenda não é erro.** Falha do Edge gera vídeo sem legenda, e a task segue. Quem confere a legenda é o usuário.
- **O prefixo decide o provedor.** Um nome de voz sem o prefixo certo cai no Edge sem aviso. Ex.: `gemini-...` sem `gemini:` vai para Azure.
- **Tag de pausa com provedor não-Edge.** A pausa é removida, não virada em silêncio. O texto perde o tempo da pausa.

> [!warning] unstable
> As correções de voz e legenda do upstream Turbo v1.3.9 (volume em dB do SiliconFlow, tags de pausa após palavras-chave CJK, linhas só de símbolos, arredondamento de segundos e de timestamps do SRT, quebra de linhas com palavras longas) só estão na branch `unstable`. Veja [[Omni e Turbo]].

## Prática

1. Em que ordem rodam `generate_audio` e `generate_subtitle`? Por quê isso importa para `POST /subtitle`?
2. Qual provedor de legenda usa os tempos da síntese, e qual transcreve o áudio?
3. O que acontece com `[pause: 2s]` se a voz for `kokoro:`?

> [!faq]- Gabarito
> 1. Áudio primeiro (`task.py:1715` chama `generate_audio`; `:1760` chama `generate_subtitle`). Por isso `POST /subtitle` sempre sintetiza a voz antes de legendar.
> 2. `edge` usa os tempos da síntese. `whisper` transcreve (faster-whisper).
> 3. A tag é removida pelo `remove_pause_tags` em `tts` (`voice.py:1250`), sem silêncio. Só o Edge v1 gera a pausa.

## Conexões

- [[Pipeline e stop_at]] — a ordem das etapas.
- [[Chaves de configuração]] — `[whisper]`, `[azure]`, `[kokoro]` e as demais chaves.
- [[Material de vídeo]] — a etapa seguinte.
- [[03 - Integrações.canvas|Canvas]]
