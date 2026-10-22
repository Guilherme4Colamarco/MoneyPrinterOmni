---
title: MCP and permissions
tags: [mapa, agentes, status/unstable]
aliases: [MCP e permissões]
lang: en
sources: [.mcp.json, .claude/settings.json, .claude/hooks/ensure-yt-dlp.sh, .agents/playbooks/redes-sociais.md, .agents/playbooks/yt-dlp.md, .claude/agents/pesquisador.md, AGENTS.md]
---
# MCP and permissions

[[00 - Index|← Index]]

**MCP** servers give the agents read-only social-media tools, and Claude Code allows or blocks each one.

## Core idea

**MCP** (Model Context Protocol) is the standard way an assistant uses an external tool. Each server exposes functions, such as "get metadata" or "search Reddit". In the harness, the servers support research and the search for source videos. All are **read-only**: nothing posts, comments, likes or schedules.

Three layers control access:
1. `.mcp.json` defines the server and its variables (secrets enter as `${VAR}`).
2. `enabledMcpjsonServers` in `.claude/settings.json` turns the servers on.
3. `permissions.allow` and `permissions.deny` allow or block each tool.

## How it works

1. **Servers** (`.mcp.json`):

| Server | Type | Package or URL | State |
|---|---|---|---|
| `yt-dlp` | stdio | `npx @kevinwatt/yt-dlp-mcp@0.10.0` (`.mcp.json:3`) | `status/stable` |
| `reddit` | stdio | `npx reddit-mcp-buddy@1.1.14` (`.mcp.json:14`) | `status/unstable` |
| `apify` | http | `mcp.apify.com/?tools=...`, with `Authorization: Bearer ${APIFY_TOKEN}` (`.mcp.json:25`) | `status/unstable` |

2. **Enabling and permissions** (`.claude/settings.json`): `enabledMcpjsonServers` (line 3) turns the three on. `allow` (line 5) frees 10 `yt-dlp` tools, 5 `reddit` tools and 6 `apify` tools (3 read-only actors and 3 tools that read run status and data). `deny` (line 28) blocks Apify writes: `call-actor`, creating, editing, publishing and unpublishing actor tasks, schedules, and `report-problem`.
3. **Subagents**: the role's `tools:` line accepts the server name, such as `mcp__yt-dlp` (`.claude/agents/pesquisador.md:5`). You do not list each tool.
4. **Session hook**: `SessionStart` runs `.claude/hooks/ensure-yt-dlp.sh` (`settings.json:41-49`, 120 s timeout). The script always creates `~/.cache/yt-dlp-mcp`. Only in the cloud (`CLAUDE_CODE_REMOTE=true`, line 14) does it install `yt-dlp` with `uv tool install` (line 23, 90 s). It always exits 0, so it never breaks the session.
5. **Secrets**: `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` and `APIFY_TOKEN` enter only as `${VAR}`. No value goes into git.

## Example / walkthrough

A role looks up a post on X to illustrate a scene:

1. The `pesquisador` has `mcp__yt-dlp` in `tools:`. It calls `ytdlp_get_video_metadata`, then `ytdlp_download_video_subtitles`. Both are in `allow`.
2. If it wants to post or comment, no tool exists for that: there is nothing to allow.
3. If Apify is asked to run a new actor, the `call-actor` call hits `deny`.
4. The post becomes a lead, not a source: `redes-sociais.md` says to mark it `[1 fonte]` and credit `@handle (platform, date, link)`.

## Pitfalls

- **Cloud limits.** Without login, `yt-dlp` fails on YouTube ("Sign in to confirm you're not a bot"), TikTok, Instagram and Reddit. X usually works. The cause is the datacenter IP (`redes-sociais.md:84-87`, `yt-dlp.md:60-62`). The anonymous `reddit` works in the cloud, but `score` comes back empty (`redes-sociais.md:89`).
- **"Free" is not the whole story.** `AGENTS.md:65` and `redes-sociais.md:5` call the servers free. Apify charges per result (`redes-sociais.md:29`). Without `APIFY_TOKEN` it starts with no tools (`redes-sociais.md:91`).
- **Permission is not the rule.** `deny` stops the call. The "never publish" rule still lives in `setup.md`, and the harness relies on it too.
- **Not verified:** whether Grok Build reads `.mcp.json` and `.claude/settings.json`. `AGENTS.md:116` says it does; I did not test it.

> [!warning] unstable
> `reddit` and `apify` exist only on the `unstable` branch, together with the `allow` and `deny` entries that name them. On `main`, only `yt-dlp` and the hook. See [[Branches main and unstable]].

## Practice

1. Where is the list of MCP servers, and where is the list of allowed tools?
2. A role wants all of `mcp__apify`. What must it have in `tools:`?
3. Why does the `SessionStart` hook always exit 0?

> [!faq]- Answer key
> 1. `.mcp.json` has the servers. `.claude/settings.json` has `enabledMcpjsonServers`, `allow` and `deny`.
> 2. Only `mcp__apify` (the server name). Which tools are allowed or blocked is controlled in `settings.json`.
> 3. So a failure never breaks the session: any error becomes a warning on stderr (`ensure-yt-dlp.sh`, header comment).

## Connections

- Previous: [[Claude and Grok adapters]]. Next: [[Video team and file contracts]].
- See also: [[Agent harness]], [[Subscriptions instead of keys]], [[Tests and CI]].
- Canvas: [[04 - Video team.canvas|Video team canvas]].
