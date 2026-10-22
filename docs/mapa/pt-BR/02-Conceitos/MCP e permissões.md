---
title: MCP e permissões
tags: [mapa, agentes, status/unstable]
aliases: [MCP and permissions]
lang: pt-BR
sources: [.mcp.json, .claude/settings.json, .claude/hooks/ensure-yt-dlp.sh, .agents/playbooks/redes-sociais.md, .agents/playbooks/yt-dlp.md, .claude/agents/pesquisador.md, AGENTS.md]
---
# MCP e permissões

[[00 - Índice|← Índice]]

Servidores **MCP** dão aos agentes ferramentas de leitura de redes sociais, e o Claude Code libera ou bloqueia cada uma.

## Ideia central

**MCP** (Model Context Protocol) é o jeito padrão de um assistente usar ferramenta externa. Cada servidor expõe funções, como "baixar metadados" ou "buscar no Reddit". No harness, os servidores servem à pesquisa e à curadoria de vídeos-fonte. Todos são **só de leitura**: nada posta, comenta, curte nem agenda.

Três camadas controlam o acesso:
1. `.mcp.json` define o servidor e as variáveis (segredos entram como `${VAR}`).
2. `enabledMcpjsonServers` em `.claude/settings.json` liga os servidores.
3. `permissions.allow` e `permissions.deny` liberam ou bloqueiam cada ferramenta.

## Como funciona

1. **Servidores** (`.mcp.json`):

| Servidor | Tipo | Pacote ou URL | Estado |
|---|---|---|---|
| `yt-dlp` | stdio | `npx @kevinwatt/yt-dlp-mcp@0.10.0` (`.mcp.json:3`) | `status/stable` |
| `reddit` | stdio | `npx reddit-mcp-buddy@1.1.14` (`.mcp.json:14`) | `status/unstable` |
| `apify` | http | `mcp.apify.com/?tools=...`, com `Authorization: Bearer ${APIFY_TOKEN}` (`.mcp.json:25`) | `status/unstable` |

2. **Ligação e permissões** (`.claude/settings.json`): `enabledMcpjsonServers` (linha 3) liga os três. `allow` (linha 5) libera 10 ferramentas do `yt-dlp`, 5 do `reddit` e 6 do `apify` (3 atores de leitura e 3 de consulta à execução e aos dados). `deny` (linha 28) bloqueia escrita no Apify: `call-actor`, criar, editar, publicar e despublicar tarefas de ator, agendamentos e `report-problem`.
3. **Subagentes**: a linha `tools:` do papel aceita o nome do servidor, como `mcp__yt-dlp` (`.claude/agents/pesquisador.md:5`). Não precisa listar cada ferramenta.
4. **Hook de sessão**: `SessionStart` roda `.claude/hooks/ensure-yt-dlp.sh` (`settings.json:41-49`, tempo limite 120 s). O script sempre cria `~/.cache/yt-dlp-mcp`. Só na nuvem (`CLAUDE_CODE_REMOTE=true`, linha 14) instala o `yt-dlp` com `uv tool install` (linha 23, 90 s). Sempre sai com 0, para não derrubar a sessão.
5. **Segredos**: `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` e `APIFY_TOKEN` entram só como `${VAR}`. Nenhum valor vai para o git.

## Exemplo / percurso

Um papel pesquisa um post no X para ilustrar uma cena:

1. O `pesquisador` tem `mcp__yt-dlp` em `tools:`. Ele chama `ytdlp_get_video_metadata` e depois `ytdlp_download_video_subtitles`. Ambas estão em `allow`.
2. Se quiser postar ou comentar, nenhuma ferramenta existe para isso: não há o que liberar.
3. Se o Apify for chamado para executar um ator novo, a chamada `call-actor` cai no `deny`.
4. O post vira pista, não fonte: `redes-sociais.md` manda marcar `[1 fonte]` e creditar `@handle (plataforma, data, link)`.

## Armadilhas

- **Limites da nuvem.** Sem login, o `yt-dlp` falha no YouTube ("Sign in to confirm you're not a bot"), TikTok, Instagram e Reddit. O X costuma funcionar. A causa é o IP de datacenter (`redes-sociais.md:84-87`, `yt-dlp.md:60-62`). O `reddit` anônimo funciona na nuvem, mas o `score` vem vazio (`redes-sociais.md:89`).
- **"Gratuito" não é tudo.** `AGENTS.md:65` e `redes-sociais.md:5` dizem que os servidores são gratuitos. O Apify cobra por resultado (`redes-sociais.md:29`). Sem `APIFY_TOKEN`, ele sobe sem ferramentas (`redes-sociais.md:91`).
- **Permissão não é regra.** O `deny` impede a chamada. A regra "nunca publicar" continua em `setup.md`, e o harness depende dela também.
- **Não verificado:** se o Grok Build lê `.mcp.json` e `.claude/settings.json`. `AGENTS.md:116` afirma que sim; não testei.

> [!warning] unstable
> `reddit` e `apify` estão só na branch `unstable`, com as entradas do `allow` e do `deny` que os citam. Na `main`, só o `yt-dlp` e o hook. Ver [[Branches main e unstable]].

## Prática

1. Onde fica a lista de servidores MCP e onde fica a lista de ferramentas liberadas?
2. Um papel quer usar `mcp__apify` inteiro. O que precisa ter em `tools:`?
3. Por que o hook do `SessionStart` sempre sai com 0?

> [!faq]- Gabarito
> 1. `.mcp.json` tem os servidores. `.claude/settings.json` tem `enabledMcpjsonServers`, `allow` e `deny`.
> 2. Só `mcp__apify` (o nome do servidor). Ferramentas liberadas ou bloqueadas são controladas em `settings.json`.
> 3. Para não derrubar a sessão: qualquer falha vira aviso no stderr (`ensure-yt-dlp.sh`, comentário de cabeçalho).

## Conexões

- Anterior: [[Adaptadores Claude e Grok]]. Próximo: [[Time de vídeo e contratos de arquivo]].
- Ver também: [[Harness de agentes]], [[Assinaturas em vez de chaves]], [[Testes e CI]].
- Canvas: [[04 - Time de vídeo.canvas|Canvas do time de vídeo]].
