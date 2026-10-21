# MCPs livres do projeto

Servidores MCP instalados pelo `nix develop` (wrappers pinados no `flake.nix`). A config gerada
fica em `.claude/.mcp.json` e aponta para os binários do Nix; Claude Code lê o symlink
`.mcp.json` na raiz, Cursor lê `.cursor/mcp.json`. Segredos só entram por variável de ambiente
— nunca no Nix store nem em arquivo commitado.

Entre no shell (`nix develop`) antes de abrir o cliente, para o `shellHook` gerar a config.

## Quando usar

| Servidor | Ferramenta | Use para | Não use para |
|---|---|---|---|
| `yt-dlp` | `@kevinwatt/yt-dlp-mcp@0.10.0` | Metadados, busca no YouTube, transcrição e download a partir de uma URL do YouTube, TikTok, Instagram, X ou outro site que o yt-dlp cubra. TikTok baixa sem login. | Buscar *por termo* no X, Pinterest ou Instagram (não há MCP zero-login confiável). Não peça cookies ao usuário. |
| `reddit` | `reddit-mcp-buddy@1.1.14` | Navegar subreddits, achar discussões, posts e comentários como fonte ou gancho. Sem chave: só browse anônimo. | Postar, votar ou agir como o usuário. Não cole credenciais em arquivo. |

Papéis que mais se beneficiam: `pesquisador` (fontes e material visual), `cacador-de-clipes`
(URLs concretas para o shotlist), `auditor` (conferir um link citado). O download/corte em 1080p
continua sendo `yt-dlp` + `build_timeline.py` (`.agents/playbooks/yt-dlp.md`).

## Segredos (só no ambiente)

O Reddit em modo anônimo já serve para browse. Busca, comentários e análise de usuário pedem
OAuth de app (grátis):

```sh
export REDDIT_CLIENT_ID=...
export REDDIT_CLIENT_SECRET=...
```

Opcional (sobe o limite de taxa): `REDDIT_USERNAME`, `REDDIT_PASSWORD`. Crie o app em
https://www.reddit.com/prefs/apps (tipo **script**). Nada disso vai para o `flake.nix`, para
`.claude/.mcp.json` nem para o git.

yt-dlp-mcp não precisa de chave. O wrapper cria `${XDG_CACHE_HOME:-$HOME/.cache}/yt-dlp-mcp`
se `YTDLP_DOWNLOADS_DIR` não estiver definido (o servidor recusa subir sem esse diretório).
Cookies (`YTDLP_COOKIES_*`) são opcionais e também só no env; o playbook pede para pular vídeo
com “sign in”, não para pedir cookies.

## Pendente (sem MCP zero-login confiável)

Busca/descoberta (não download por URL) nestas redes:

- **X / Twitter** — busca e timeline pedem login ou API paga.
- **Pinterest** — busca de pins/boards idem.
- **Instagram** — busca de contas/hashtags idem. Download de um post *com URL* segue no `yt-dlp`.

Até existir um servidor livre estável, use busca na web, cole a URL e deixe o `yt-dlp` baixar.
