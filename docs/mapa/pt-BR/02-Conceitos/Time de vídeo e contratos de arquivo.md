---
title: Time de vídeo e contratos de arquivo
tags: [mapa, video, status/stable]
aliases: [Video team and file contracts]
lang: pt-BR
sources: [.agents/skills/video/SKILL.md, .agents/pipeline.md, .agents/setup.md, .agents/roles/pesquisador.md, .agents/skills/video/scripts/build_timeline.py, .agents/skills/video/scripts/build_music.py, .agents/skills/video/scripts/build_thumbnail.py, .agents/skills/video/scripts/arte.py, .agents/skills/video/scripts/srt_to_timing.py]
---
# Time de vídeo e contratos de arquivo

[[00 - Índice|← Índice]]

O time de vídeo é uma sequência de papéis que trocam **arquivos** numa pasta de projeto. Quem escreve e quem lê cada arquivo está definido em contrato.

## Ideia central

Os papéis não conversam entre si. Cada um lê arquivos de entrada, escreve os de saída e para. Quem garante o encaixe é o contrato: `pipeline.md` diz o nome, o formato e o dono de cada arquivo. Assim, um papel pode ser trocado, ou rodar em outro assistente, sem mudar o resto.

## Como funciona

**Os 12 papéis** (`.agents/roles/`, modelo em [[Papéis e modelos]]):

| Papel | Faz |
|---|---|
| `pesquisador` | fatos com fonte, vídeos-fonte, roteiro e trilha |
| `critico` | aponta falhas de conteúdo (etapa 2) e visuais (etapa 10) |
| `sugestor-de-pauta` | até 8 ideias de casos, dados e cenas |
| `auditor` | confere fatos na fonte (etapa 2) e direitos (etapa 10) |
| `diretor-de-arte` | legenda, textos na tela e thumbnail |
| `diretor` | pacote de aprovação (passo 5) e entrega (passo 12) |
| `montador-mpt` | único que roda o MoneyPrinterOmni: tempo, trilha e render |
| `cacador-de-clipes` | escolhe o trecho de cada cena (`shotlist.json`) |
| `animador` | gráficos em Remotion (passo 7b), ver [[Animações com Remotion]] |
| `editor-de-clipes` | gera os clipes com `build_timeline.py` e escreve os créditos |
| `designer-de-thumbnail` | thumbnails com `build_thumbnail.py` |
| `redator-de-publicacao` | títulos, descrição, tags e comentário fixado |

**As 13 etapas** (`SKILL.md:41-72`):

1. `pesquisador` escreve pesquisa, fontes, roteiro e plano de música.
2. Em paralelo: `critico`, `sugestor-de-pauta` e `auditor` (fatos).
3. Se houver `REVISAR` ou `CORRIGIR`, o pesquisador revisa. No máximo 2 rodadas.
4. `diretor-de-arte` escreve `arte.md` e `arte.json`.
5. **Parada:** `diretor` leva o pacote ao usuário. Só segue com o aval dele (`SKILL.md:47-49`).
6. `montador-mpt` faz o tempo (áudio, legenda, `timing.json`) e a trilha (`music.json`, `bgm.mp3`).
7. `cacador-de-clipes` escreve `shotlist.json`.
7b. `animador` renderiza `raw/anim_NN.mp4` para as cenas com `anim`.
8. `editor-de-clipes` gera a timeline e o `credits.md`.
9. `montador-mpt` faz o render: `output/final.mp4`.
10. Em paralelo: `critico` (visual) e `auditor` (direitos). No máximo 2 rodadas.
11. Em paralelo: `designer-de-thumbnail` e `redator-de-publicacao`.
12. `diretor` escreve `entrega.md`: `PRONTO` ou `REFAZER <etapa>`.
13. Relatório final. Nada é publicado.

**A pasta do projeto** (`storage/projects/<slug>/`, `pipeline.md:11-33`). O `storage/` não vai para o git.

**Quem escreve e quem lê** (resumo de `pipeline.md:37-51`):

| Arquivo | Escreve | Lê |
|---|---|---|
| `brief.md` | orquestrador; `montador` acrescenta a velocidade final | todos |
| `research.md` | `pesquisador` | crítico, auditor, sugestor, redator |
| `sources.json` | `pesquisador` | caçador, editor, auditor, diretor de arte |
| `script.txt` | `pesquisador` | montador (`--video-script`), designer, redator |
| `music-plan.md` | `pesquisador` | montador, diretor de arte |
| `arte.json` | `diretor-de-arte` | caçador, `build_timeline`, `build_thumbnail`, montador |
| `timing.json` | `montador` (a partir da legenda) | caçador, animador, `build_music`, redator |
| `music.json` | `montador` | `build_music`, auditor, editor |
| `bgm.mp3` | `build_music.py` | render (`--bgm-file`) |
| `shotlist.json` | `caçador` | animador, editor, `build_timeline`, auditor |
| `raw/` | caçador, editor, animador | `build_timeline`, designer |
| `timeline/NN.mp4` | editor (via `build_timeline.py`) | render, designer |
| `credits.md` | editor | auditor, redator, diretor |
| `output/final.mp4` | `montador` (cópia do render) | crítico, auditor, diretor |
| `entrega.md` | `diretor` | usuário |

**Os scripts** (`.agents/skills/video/scripts/`, só biblioteca padrão do Python e ffmpeg):

- `srt_to_timing.py <subtitle.srt> <timing.json>` converte a legenda em frases com início e fim (`parse` em `:18-35`).
- `build_timeline.py <projeto> [--aspect] [--only] [--preview]` gera `timeline/NN.mp4` sem áudio, com a duração exata (`build` em `:142-157`). A origem é `file` ou `url`. Com `url`, baixa com `nix shell ... yt-dlp` (`:117-123`).
- `build_music.py <projeto> [--duration] [--preview]` monta `bgm.mp3` com crossfade (`:70`) e copia para `storage/bgm/<slug>.mp3` (`:116-118`).
- `build_thumbnail.py <projeto> --text "L1|L2"` monta a capa; a primeira linha usa `color`, as outras `accent` (`:1-12`).
- `arte.py` é só biblioteca. Lê `arte.json`, mescla padrões (`DEFAULTS` em `:9-13`) e desenha o texto com `drawtext` (`:43-57`).

## Exemplo / percurso

Um trecho real do contrato de `shotlist.json` (`pipeline.md:76-79`):

```json
{"n": "01", "phrases": [1], "dur": 4.2, "url": "https://www.youtube.com/watch?v=...",
 "start": 4.0, "kind": "fill", "why": "portais visíveis"}
```

O caçador escreve o item. O editor lê `url` e `start` e chama `build_timeline.py`, que grava `raw/hi_*.mp4` e `timeline/01.mp4`. O campo `phrases` e o campo `why` não são lidos por nenhum script. Eles existem para os agentes.

## Armadilhas

- **Campos sem leitor.** `build_timeline.py` não lê `anim`, `props`, `phrases` nem `why`. O `anim` é instrução para o animador (`cacador-de-clipes.md:35-36`). `sources.json` e `arte.json.legenda` também não têm leitor em script: a legenda vira flags pelo montador, à mão.
- **Parada não é opcional.** O pacote vai ao usuário antes de baixar e editar (`setup.md:59-60`). Pular o passo 5 inverte essa ordem. A regra da skill está em `SKILL.md:125`.
- **Pasta fora do projeto.** `build_music.py` copia para `storage/bgm/`, fora de `storage/projects/<slug>/`. A regra "não apagar fora do projeto" (`setup.md:76-77`) não cita essa pasta.
- **Revisão tem limite.** Dois ciclos em cada laço. Depois disso, leve o problema ao usuário (`pipeline.md:53`).

> [!warning] unstable
> A zoom lento de imagens em `fit` (`build_timeline.py:58-63`) e a chave `motion` são `status/unstable`. A cena animada com as composições novas também (ver [[Animações com Remotion]]). O resto desta nota é `status/stable`.

## Prática

1. Quem escreve `arte.json` e quem o lê para desenhar a legenda?
2. Um `shotlist.json` tem `"anim": "ReverseFlow"`. O que precisa existir para o render funcionar?
3. Por que a parada do passo 5 vem antes do download, e não depois do render?

> [!faq]- Gabarito
> 1. O `diretor-de-arte` escreve. O `build_timeline` lê `texto_na_tela` e o `build_thumbnail` lê `thumbnail`. A legenda é traduzida para flags pelo montador (`pipeline.md:110-112`).
> 2. O `animador` precisa renderizar `raw/anim_NN.mp4` e o campo `file` apontando para ele. O script só enxerga `file`.
> 3. Porque `setup.md:59-60` manda levar o pacote ao usuário antes de baixar e editar.

## Conexões

- Anterior: [[Adaptadores Claude e Grok]]. Próximo: [[Time técnico]].
- Ver também: [[Pipeline e stop_at]], [[Voz e legenda]], [[Material de vídeo]], [[Música e publicação]], [[Perfis de canal]].
- Referência: [[Contratos JSON dos agentes]], [[Papéis e modelos]].
- Canvas: [[04 - Time de vídeo.canvas|Canvas do time de vídeo]].
