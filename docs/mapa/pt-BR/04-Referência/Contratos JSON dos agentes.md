---
title: Contratos JSON dos agentes
tags: [mapa, referencia, status/stable]
aliases: [Agent JSON contracts]
lang: pt-BR
sources: [.agents/pipeline.md, .agents/skills/video/scripts/srt_to_timing.py, .agents/skills/video/scripts/build_timeline.py, .agents/skills/video/scripts/build_music.py, .agents/skills/video/scripts/build_thumbnail.py, .agents/skills/video/scripts/arte.py]
---
# Contratos JSON dos agentes

[[00 - Índice|← Índice]]

Os cinco arquivos JSON que os papéis do time de vídeo trocam: `sources.json`, `timing.json`, `shotlist.json`, `music.json` e `arte.json`. A coluna **Lido por script** diz o que o código de fato usa. O resto é lido só pelos agentes.

## Ideia central

Os contratos são a interface entre papéis. O texto de `pipeline.md` é a especificação. Os scripts são a prova do que é lido de verdade. Um campo pode existir na especificação e não ter leitor no código: nesse caso, quem interpreta é um agente, não um script.

## Como funciona

### `sources.json` (escreve: `pesquisador`; lido por caçador, editor, auditor e diretor de arte)

Uma lista de candidatos a vídeo ou imagem. Veja o exemplo em `pipeline.md:61-66`.

| Campo | Tipo | Opcional | Valores ou formato | Lido por script |
|---|---|---|---|---|
| `id` | texto | não | id da fonte (ex.: id do YouTube) | não |
| `url` | texto | não | link da fonte | não (o `build_timeline` usa a `url` do shotlist) |
| `type` | texto | não | `video`, `image`, `stock`, `chart`, `user` | não |
| `channel` | texto | não | nome do canal ou autor | não |
| `license` | texto | não | ex.: `terceiro (trecho curto)`, `domínio público`, `CC-BY`, `stock` | não |
| `duration` | texto | não | `m:ss` | não |
| `covers` | lista de textos | não | em que bloco do roteiro a fonte entra | não |
| `platform` | texto | sim | `youtube`, `x`, `tiktok`, `instagram`, `reddit` | não |
| `author` | texto | sim | `@handle` | não |
| `posted_at` | texto | sim | `AAAA-MM-DD` | não |
| `via` | texto | sim | `mcp:yt-dlp`, `mcp:reddit`, `mcp:apify`, `yt-dlp`, `web` | não |

O exemplo de `pipeline.md:57-66` mostra os campos; `pipeline.md:58-59` marca `platform`, `author`, `posted_at` e `via` como opcionais. Nenhum script lê o arquivo.

### `timing.json` (escreve: `srt_to_timing.py`, a partir da legenda; lido por caçador, animador, `build_music`, redator)

Uma lista, um item por linha da legenda (`srt_to_timing.py:18-35`).

| Campo | Tipo | Notas |
|---|---|---|
| `n` | inteiro | começa em 1 |
| `start` | número, segundos | 3 casas decimais |
| `end` | número, segundos | 3 casas decimais |
| `text` | texto | as linhas da legenda juntadas com espaço |

Formato gravado: `json.dump(..., ensure_ascii=False, indent=1)` (`srt_to_timing.py:42-43`).

### `shotlist.json` (escreve: `cacador-de-clipes`; lido por animador, editor, `build_timeline`, crítico e auditor)

Uma lista, um item por cena. `dur` é o início da próxima cena menos o início desta (`pipeline.md:74`). A soma das durações deve ser maior ou igual à do áudio.

| Campo | Tipo | Lido por `build_timeline` | Notas |
|---|---|---|---|
| `n` | texto ou inteiro | sim | normalizado para dois dígitos (`build_timeline.py:212`) |
| `dur` | número, segundos | sim | duração exata do clipe |
| `kind` | texto | sim | `fill`, `window`, `fit`, `image`; aliases `game` e `vert` (fill), `gta` (window), `app` (fit, zoom 0.62) (`:39`) |
| `file` + `ss` | texto + número | sim | origem local; `ss` é o início no arquivo, padrão 0 |
| `url` + `start` | texto + número | sim | origem online; baixa de `start - 1` a `start + dur + 1` |
| `source` | texto | sim | `youtube:<id>`, alternativa a `url` |
| `x`, `y` | número (0–1) | sim | ponto de foco de `fill` e `image`; padrão 0,5 |
| `top` | número | sim | só `window`; padrão 0,05 |
| `zoom` | número (0–1) | sim | `fit` (faixa central) e `image` (zoom final; padrão 1,15) |
| `crop` | texto | sim | filtro de corte do ffmpeg, só em `fit` |
| `motion` | verdadeiro ou falso | sim | só `fit` com imagem; padrão verdadeiro (ver nota unstable) |
| `text` | texto | sim | texto na tela; `\n` quebra linha |
| `text_pos` | texto | sim | `top`, `center` ou `bottom`; padrão `top` |
| `anim` | texto | não | id da composição Remotion; o animador lê |
| `props` | objeto | não | parâmetros extras para o animador |
| `phrases` | lista de inteiros | não | frases cobertas; só para o agente |
| `why` | texto | não | motivo da escolha; só para o agente |

Para cena animada, `file` aponta para `raw/anim_NN.mp4` (`pipeline.md:82-83`). Exemplo em `pipeline.md:76-79`.

### `music.json` (escreve: `montador-mpt`; lido por `build_music`, auditor e editor)

| Campo | Tipo | Lido por `build_music` | Notas |
|---|---|---|---|
| `crossfade` | número, segundos | sim (`build_music.py:70`) | padrão 1,5 |
| `cues` | lista | sim | cada deixa de música |
| `cues[].start` | número, segundos | sim | início da música no vídeo, numa frase do `timing.json` |
| `cues[].mood` | texto | só imprime | clima do bloco |
| `cues[].url` ou `file` | texto | sim | origem da faixa |
| `cues[].ss` | número | sim | ponto da faixa onde começar; padrão 0 |
| `cues[].gain_db` | número | sim | ganho extra; padrão 0 |
| `cues[].title` | texto | só imprime | nome da faixa |
| `cues[].author`, `license` | texto | não | usados nos créditos pelos agentes |

### `arte.json` (escreve: `diretor-de-arte`; lido por `build_timeline`, `build_thumbnail` e montador)

| Seção | Campo | Lido por script | Padrão em `arte.py` |
|---|---|---|---|
| `texto_na_tela` | `font`, `color`, `size`, `box`, `box_color` | sim: `build_timeline.py:215` | `BeVietnamPro-Bold.ttf`, `#FFFFFF`, 96, verdadeiro, `#000000@0.55` (`arte.py:10-11`) |
| `thumbnail` | `font`, `color`, `accent` | sim: `build_thumbnail.py:24` e `:48` | `BeVietnamPro-Bold.ttf`, `#FFFFFF`, `#FFD400` (`arte.py:12`) |
| `legenda` | `font_name`, `text_fore_color`, `stroke_color`, `stroke_width`, `position`, `background`, `background_color` | não | **sem padrão** em `arte.py` |

A seção `legenda` vira flags do CLI pelo montador: `--font-name`, `--text-fore-color`, `--stroke-color`, `--stroke-width`, `--subtitle-position`, `--subtitle-background-enabled`, `--subtitle-background-color` (`pipeline.md:110-112`).

## Exemplo / percurso

Um `timing.json` gerado a partir de uma legenda, e um item de `music.json`:

```json
[{"n": 1, "start": 0.098, "end": 3.598, "text": "A inteligência artificial..."}]
```

```json
{"crossfade": 1.5, "cues": [{"start": 34.5, "mood": "amedrontador", "file": "raw/music/Darkest Child.mp3", "ss": 0,
  "title": "Darkest Child", "author": "Kevin MacLeod", "license": "CC BY 4.0"}]}
```

## Armadilhas

- **Campos sem leitor.** `sources.json` não tem leitor em script; quem o lê é o auditor, na checagem de direitos. `arte.json.legenda` também não tem leitor no código: o montador o traduz para flags à mão.
- **Cor padrão diferente.** `texto_na_tela.color` vale `#FFFFFF` em `arte.py:10`, mas o exemplo de `pipeline.md:106` usa `#FFD400`. O arquivo do projeto sempre vence o padrão.
- **`anim` e `props` não são lidos por `build_timeline`.** Eles são instruções para o animador, que renderiza `raw/anim_NN.mp4` e aponta `file`.
- **`start` não é `ss`.** Com `url`, `start` é o momento no vídeo-fonte. Com `file`, `ss` é o início dentro do arquivo local.

> [!warning] unstable
> O campo `motion` de `fit` (zoom lento em imagem fixa) é `status/unstable`. Estado a confirmar na `main`.

## Conexões

- Conceito: [[Time de vídeo e contratos de arquivo]]. Percurso: [[04 - Vídeo pelo time de agentes]].
- Referência: [[Papéis e modelos]], [[Flags do CLI]], [[Chaves de configuração]].
- Conceitos relacionados: [[Pipeline e stop_at]], [[Voz e legenda]], [[Música e publicação]].
