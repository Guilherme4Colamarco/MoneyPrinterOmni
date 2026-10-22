---
title: Animações com Remotion
tags: [mapa, animacoes, status/unstable]
aliases: [Remotion animations]
lang: pt-BR
sources: [animations/src/Root.tsx, animations/src/lib.tsx, animations/remotion.config.ts, animations/package.json, docs/animations.md, .agents/roles/animador.md, .agents/pipeline.md]
---
# Animações com Remotion

[[00 - Índice|← Índice]]

`animations/` é um projeto Remotion (React e TypeScript) que renderiza gráficos e esquemas animados em mp4. O `animador` usa esse projeto para cenas que não existem como foto ou vídeo.

## Ideia central

Uma cena com `"anim"` no `shotlist.json` vira um mp4 com a duração exata. O resto do pipeline não sabe que houve animação: o `build_timeline.py` trata o mp4 como um arquivo local. Assim, a animação entra na timeline como qualquer outro clipe.

## Como funciona

1. **Projeto.** Remotion 4.0.536 em todos os pacotes `remotion` e `@remotion/*`, React 19.2.3 e TypeScript 5.9.3 (`animations/package.json`, dependências). O `remotion.config.ts` liga o rspack, frames em JPEG, sobrescrita de saída e 2 s de pré-montagem.
2. **Scripts npm** (`package.json`): `dev` e `studio` abrem o editor, `render` e `still` exportam, `typecheck` roda `tsc --noEmit` e `lint` roda o eslint.
3. **Composições** em `src/Root.tsx`. Todas são 1080x1920 e 30 fps, exceto `HelloChartWide`, que é 1920x1080:

| Id | Linha | Uso |
|---|---|---|
| `HelloChart` | 22 | exemplo, 9:16 |
| `HelloChartWide` | 31 | exemplo, 16:9 |
| `ReverseFlow` | 40 | fluxo em etapas |
| `AgentSwarm` | 50 | grade preenchida por agentes |
| `ByteCompare` | 60 | comparação byte a byte |
| `TimelineAnos` | 70 | barras e pares de programas |
| `TerminalAntigo` | 80 | terminal com erros |
| `FedoraVersoes` | 90 | linha do tempo de versões |
| `ComentaBalao` | 100 | balões de comentário |
| `TrocariaCard` | 110 | chips e pergunta em amarelo |
| `QuoteCard` | 120 | cartão de citação, 1 quadro |

4. **Duração.** `durationMetadata` (`lib.tsx:38-40`) converte `durationSeconds` em quadros: `round(segundos × 30)`, com mínimo de 1. Por isso o `dur` do shotlist vira `durationSeconds` no render.
5. **Cores e fonte** ficam em `lib.tsx` (`FPS` na linha 14, `colors` a partir da linha 16). A fonte é BeVietnamPro, carregada de `public/`.
6. **Caminho até a timeline:**
   - `cacador-de-clipes` marca a cena com `"anim"`, `"file": "raw/anim_NN.mp4"` e `"kind": "fill"`;
   - o `animador` roda `cd animations && npx remotion render <Id> ../storage/projects/<slug>/raw/anim_NN.mp4 --props='{"durationSeconds":<dur>, ...}'` (`animador.md:33`);
   - `build_timeline.py` lê o `file` como arquivo local;
   - o montador junta os clipes no render.

## Exemplo / percurso

Uma cena de 7,4 s com três etapas, como na documentação (`docs/animations.md:43`):

```sh
cd animations
npx remotion render ReverseFlow ../storage/projects/<slug>/raw/anim_01.mp4 \
  --props='{"durationSeconds":7.4,"steps":["A","B","C"]}'
npx remotion still ByteCompare out/preview.png --frame=240   # confere um quadro
```

O animador confere o quadro, a legibilidade (texto de pelo menos 48 px) e se nada cobre a área da legenda (`animador.md:34-36`). Depois aponta o `file` no shotlist, ou pede ao caçador que ajuste.

## Armadilhas

- **`QuoteCard` e `HelloChartWide` fora da documentação.** `QuoteCard` tem 1 quadro e não cabe no caminho `render → fill`: precisa de `remotion still` e `kind: image`. `docs/animations.md` não lista nenhuma das duas; `animador.md` nomeia só quatro composições (`animador.md:26`).
- **Duração errada.** Se o `durationSeconds` não bate com o `dur` do shotlist, a cena fica mais curta ou mais longa que a narração.
- **Licença.** O Remotion é grátis para indivíduos e equipes pequenas. Empresas maiores precisam de licença paga (`docs/animations.md:49`).
- **`kit.tsx` é compartilhado.** Mudar `kit.tsx` afeta `ComentaBalao`, `FedoraVersoes` e `TrocariaCard`.

> [!warning] unstable
> As quatro composições `TerminalAntigo`, `FedoraVersoes`, `ComentaBalao` e `TrocariaCard`, além de `src/kit.tsx`, existem só na branch com as novas animações (PR #1). Estado a confirmar na `main`. Ver [[Branches main e unstable]].

## Prática

1. Quais campos do `shotlist.json` disparam a renderização de uma animação?
2. Por que o `build_timeline.py` não precisa saber que o clipe veio do Remotion?
3. Um clipe tem `durationSeconds` de 4 e o `dur` do shotlist é 4,2. O que acontece?

> [!faq]- Gabarito
> 1. `"anim"` e `"file"`. O `kind` é `fill` (`animador.md:37`; `pipeline.md:82-83`).
> 2. Porque ele recebe um mp4 em `file`, como qualquer arquivo local (`docs/animations.md:47`). O `anim` não é lido por script.
> 3. O clipe fica com 4 s, e a cena pede 4,2 s. Ele não cobre a fala inteira. Regra: `durationSeconds` = `dur`.

## Conexões

- Anterior: [[Time de vídeo e contratos de arquivo]]. Ver também: [[Material de vídeo]], [[Adaptadores Claude e Grok]].
- Referência: [[Contratos JSON dos agentes]].
- Canvas: [[04 - Time de vídeo.canvas|Canvas do time de vídeo]].
