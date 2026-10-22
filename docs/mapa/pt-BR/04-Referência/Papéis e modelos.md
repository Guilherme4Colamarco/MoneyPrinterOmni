---
title: Papéis e modelos
tags: [mapa, referencia, status/unstable]
aliases: [Roles and models]
lang: pt-BR
sources: [.agents/roles/, .claude/agents/, .grok/agents/, .agents/setup.md, .agents/tecnico.md, .agents/tools/sync_grok_agents.py, AGENTS.md]
---
# Papéis e modelos

[[00 - Índice|← Índice]]

Os 20 papéis do harness: quem faz o quê, com que modelo e com quais ferramentas no Claude Code.

## Ideia central

Cada papel tem uma **fonte** em `.agents/roles/<papel>.md`, sem modelo nem ferramenta. O modelo e as ferramentas ficam só no adaptador `.claude/agents/<papel>.md`. O Grok gera o adaptador com `model: inherit`, porque `sonnet` e `haiku` não existem lá.

Regra de escolha de modelo (`setup.md:68-74`): modelo pequeno para trabalho mecânico (`haiku`), modelo intermediário para julgamento, visão ou código (`sonnet`). Modelo mais forte só se um papel errar fatos ou análise de forma repetida. Nenhum papel usa modelo mais forte hoje.

## Como funciona

Os papéis do time de vídeo (12). O modelo vem de `.claude/agents/<papel>.md`, linha 4.

| Papel | Entradas | Saídas | Modelo | Ferramentas (Claude) |
|---|---|---|---|---|
| `pesquisador` | `brief.md`; na revisão, críticas e auditoria | `research.md`, `sources.json`, `script.txt`, `music-plan.md` | sonnet | WebSearch, WebFetch, Read, Write, Edit, Bash, Glob, Grep, mcp yt-dlp, reddit, apify |
| `critico` | script, research, brief; final, timing, shotlist (visual) | `critique/content-NN.md`, `critique/visual-NN.md` | sonnet | Read, Glob, Grep, Bash, WebSearch, Write |
| `sugestor-de-pauta` | brief, script, research, último crítico | `critique/ideas-NN.md` (até 8 ideias) | sonnet | Read, Glob, Grep, WebSearch, WebFetch, Write, mcp yt-dlp, reddit, apify |
| `auditor` | script, research, brief; shotlist, music, credits, sources, final | `audit/fatos-NN.md`, `audit/direitos-NN.md` | sonnet | Read, Write, Glob, Grep, Bash, WebSearch, WebFetch, mcp yt-dlp, reddit, apify |
| `diretor-de-arte` | brief, script, music-plan, sources, Histórico do perfil | `arte.md`, `arte.json` | sonnet | Read, Write, Edit, Glob, Bash |
| `diretor` | tudo | `aprovacao-NN.md`, `entrega.md` | sonnet | Read, Write, Glob, Grep, Bash |
| `montador-mpt` | script, music-plan, timeline/, arte.json | `timing.json`, `music.json`, `bgm.mp3`, `output/final.mp4` | **haiku** | Bash, Read, Write, Edit, Glob, Grep |
| `cacador-de-clipes` | timing, sources, script, arte.md | `shotlist.json`, `raw/` | sonnet | Bash, Read, Write, Glob, Grep, WebSearch, mcp yt-dlp, apify |
| `animador` | shotlist (itens com `anim`), arte.json, timing | `raw/anim_NN.mp4` | sonnet | Bash, Read, Write, Edit, Glob, Grep |
| `editor-de-clipes` | shotlist, timing, sources | `timeline/NN.mp4`, `raw/timeline_preview.png`, `credits.md` | sonnet | Bash, Read, Write, Edit, Glob |
| `designer-de-thumbnail` | arte, script, timeline/, raw/ | `publicacao/thumb-*.png`, `thumbs_preview.png` | **haiku** | Bash, Read, Write, Glob |
| `redator-de-publicacao` | script, research, credits, timing, arte.md | `publicacao/publicacao.md` | **haiku** | Read, Write, Glob, WebSearch |

Os papéis do time técnico (6) e os de harness (2). Todos usam `sonnet` no Claude.

| Papel | Entradas | Saídas | Modelo | Ferramentas (Claude) |
|---|---|---|---|---|
| `arquiteto` | pedido, código | `plano.md` | sonnet | Read, Glob, Grep, Bash, Write |
| `desenvolvedor` | `plano.md` | código, `mudancas-NN.md` | sonnet | Bash, Read, Write, Edit, Glob, Grep |
| `testador` | `plano.md`, código | `test/`, `testes-NN.md` | sonnet | Bash, Read, Write, Edit, Glob, Grep |
| `revisor-de-codigo` | diff, `plano.md` | `revisao-NN.md` | sonnet | Read, Glob, Grep, Bash, Write |
| `auditor-de-seguranca` | diff ou código | `seguranca-NN.md` | sonnet | Read, Glob, Grep, Bash, Write, WebSearch, WebFetch |
| `auditor-de-saude` | código, CI | `saude.md` | sonnet | Read, Glob, Grep, Bash, Write, WebSearch |
| `pesquisador-de-integracoes` | candidato (API, SDK, MCP) | `integracoes-NN.md` | sonnet | WebSearch, WebFetch, Read, Glob, Grep, Bash, Write |
| `mantenedor-do-harness` | `AGENTS.md`, `.agents/`, adaptadores | `harness-NN.md` e edições pedidas | sonnet | Read, Glob, Grep, Bash, Write, Edit |

As entradas do time técnico vêm de `tecnico.md:19-29` e dos cabeçalhos de cada papel. Os modelos e as ferramentas vêm de `.claude/agents/<papel>.md` (linhas 4 e 5).

## Exemplo / percurso

Um papel novo, `revisor-de-acessibilidade`, precisaria de:

1. `.agents/roles/revisor-de-acessibilidade.md`, com `name` e `description` (sem modelo);
2. `.claude/agents/revisor-de-acessibilidade.md`, com `model:` e `tools:`;
3. a rodada `python3 .agents/tools/sync_grok_agents.py`, que gera o adaptador do Grok com `model: inherit`;
4. a linha na tabela de `AGENTS.md`.

## Armadilhas

- **O modelo não está na fonte.** Os cabeçalhos de `.agents/roles/` têm só `name` e `description`. Para saber o modelo, é preciso ler o adaptador Claude. Isso é a inconsistência 12 do mapa.
- **`AGENTS.md` lista 11 papéis de vídeo.** Falta o `animador`. A tabela de `AGENTS.md:73-83` está incompleta.
- **Grok não tem modelo fixo.** Todos os adaptadores gerados usam `inherit`, então o modelo do Grok é o da sessão. Ver [[Adaptadores Claude e Grok]].

> [!warning] unstable
> Os 8 papéis do time técnico, incluindo `mantenedor-do-harness` e `pesquisador-de-integracoes`, são `status/unstable`. Os 12 papéis de vídeo estão na `main`.

## Conexões

- Conceitos: [[Time de vídeo e contratos de arquivo]], [[Time técnico]], [[Harness de agentes]].
- Referência: [[Contratos JSON dos agentes]].
- Canvas: [[04 - Time de vídeo.canvas|Canvas do time de vídeo]], [[05 - Time técnico.canvas|Canvas do time técnico]].
