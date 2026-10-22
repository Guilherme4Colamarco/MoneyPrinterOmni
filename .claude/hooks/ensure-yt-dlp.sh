#!/usr/bin/env sh

# Hook SessionStart do Claude Code: prepara o servidor MCP `yt-dlp` (.mcp.json), que não
# sobe sem a pasta de downloads e sem o binário `yt-dlp` no PATH.
#
# - Cria a pasta de downloads (~/.cache/yt-dlp-mcp, a mesma do .mcp.json) em qualquer máquina.
# - Só instala o yt-dlp quando CLAUDE_CODE_REMOTE=true; na máquina local use `nix develop` (flake.nix).
# - Idempotente: se o yt-dlp já existe, sai na hora.
# - Instala pelo PyPI (`uv tool install`); o GitHub Releases pode estar bloqueado pelo proxy.
# - Nunca derruba a sessão: qualquer falha vira aviso no stderr e saída 0.

mkdir -p "$HOME/.cache/yt-dlp-mcp" 2>/dev/null || true

[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
command -v yt-dlp >/dev/null 2>&1 && exit 0

if ! command -v uv >/dev/null 2>&1; then
  echo "ensure-yt-dlp: uv não encontrado; MCP yt-dlp ficará indisponível" >&2
  exit 0
fi

if command -v timeout >/dev/null 2>&1; then
  timeout 90 uv tool install --quiet yt-dlp >/dev/null 2>&1
else
  uv tool install --quiet yt-dlp >/dev/null 2>&1
fi || echo "ensure-yt-dlp: falha ao instalar yt-dlp (uv tool install yt-dlp)" >&2

exit 0
