# Playbook: redes sociais (Reddit, X, Instagram, TikTok)

## Ferramentas

Servidores MCP do projeto (`.mcp.json`), todos gratuitos e só de leitura:

| Servidor | Cobre | Custo | Variáveis |
|---|---|---|---|
| `yt-dlp` (`@kevinwatt/yt-dlp-mcp`) | metadados, legendas, transcrição, comentários e download de qualquer URL do yt-dlp (X, TikTok, Instagram, Reddit, YouTube) | grátis | `YTDLP_DOWNLOADS_DIR` (opcional, padrão `/tmp/mpt-downloads`) |
| `reddit` (`reddit-mcp-buddy`) | busca, subreddits, post com comentários, perfil de usuário | grátis; anônimo (10 req/min) | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USER_AGENT` (opcionais, sobem o limite) |
| `apify` (Apify MCP) | busca por hashtag, perfil e termo no Instagram e no TikTok; Reddit como reserva | plano Free: US$ 5/mês de crédito, sem cartão | `APIFY_TOKEN` |

No Claude Code os servidores sobem sozinhos (o hook `.claude/hooks/ensure-yt-dlp.sh` instala o
`yt-dlp` na nuvem). Outro assistente: copie as entradas do `.mcp.json` para a config de MCP dele.
Sem MCP, use o `yt-dlp` pela linha de comando (`yt-dlp.md`) e a busca na web.

## Regras

- **Só leitura.** Nunca postar, comentar, votar, curtir, seguir nem mandar DM (`.agents/setup.md`,
  "Nunca"). Os servidores acima não têm ferramenta de escrita; `call-actor`, tarefas e agendamentos
  da Apify estão bloqueados em `.claude/settings.json`.
- **Rede social é pista, não fonte.** Post serve para achar o assunto, o vídeo original e a reação do
  público. Fato do roteiro precisa de fonte primária ou matéria; post sozinho é `[1 fonte]`.
- **Autor original.** Antes de usar um vídeo, confira quem postou primeiro (data, handle, marca d'água
  de outro perfil). Reupload não entra se o original existir.
- **Crédito:** `@handle (plataforma, data, link)` no `credits.md`. Áudio "em alta" do TikTok/Reels
  não é licença livre: o clipe entra sem áudio (padrão do setup).
- **Pessoa comum** (não pública): sem nome, rosto em close ou perfil citado, a menos que o brief diga.
- **Gasto da Apify:** cobra por resultado (Instagram ≈ US$ 2,70, TikTok ≈ US$ 1,70, Reddit ≈ US$ 3,40
  por 1.000). Peça poucos resultados (5–20), não ligue add-ons pagos (`shouldDownloadVideos`,
  transcrição, filtros marcados como "charged") e não repita a mesma busca: anote em `sources.json`.
- Nunca peça cookies, senha ou login de rede social.

## Conferir um post (qualquer rede)

1. `mcp__yt-dlp__ytdlp_get_video_metadata_summary` com a `url`: título, autor, duração, data,
   visualizações. Para o id e o link canônico, `ytdlp_get_video_metadata` com `fields`
   (`["id","webpage_url","uploader","uploader_id","upload_date","duration"]`).
2. Reação do público: `ytdlp_get_video_comments_summary` (melhor no YouTube) ou, no Reddit,
   `mcp__reddit__get_post_details`.
3. Legenda/transcrição para achar o trecho: `ytdlp_list_subtitle_languages` e
   `ytdlp_download_transcript` (`language`).

## Por rede

### X
Não há busca no X: use a busca na web (`site:x.com <termo>`, matérias que embutem o post) e confira
o post com o `yt-dlp` (funciona na nuvem). Download do trecho: `build_timeline.py` com a `url`.

### Reddit
- `mcp__reddit__search_reddit` (`query`, `subreddits`, `sort`, `time`, `limit`) e
  `mcp__reddit__browse_subreddit` para dúvidas reais do público, ganchos e reação da comunidade.
- `mcp__reddit__get_post_details` traz post e comentários; o campo `url` aponta para a mídia
  (`v.redd.it`, `i.redd.it`) ou para o link original, que é o que deve ser creditado.
- Reserva: `mcp__apify__trudax--reddit-scraper-lite` (`searches`, `startUrls`, `maxItems`,
  `includeMediaLinks: true` para `videoUrls`).

### Instagram
`mcp__apify__apify--instagram-scraper`:
- post ou reel conhecido: `directUrls` (`/p/…`, `/reel/…`), `resultsLimit`;
- descobrir: `search` + `searchType` (`hashtag`, `user`/`profile`), `searchLimit`, `resultsType`
  (`posts`, `comments`, `details`), `onlyPostsNewerThan` (`"7 days"`).

O resultado traz `videoUrl`, `displayUrl`, `ownerUsername`, `timestamp`. O `videoUrl` é um link
assinado do CDN que expira em horas: baixe logo ou guarde a URL do post.

### TikTok
`mcp__apify__clockworks--tiktok-scraper`: `hashtags`, `profiles`, `searchQueries` ou `postURLs`,
com `resultsPerPage` baixo. Deixe `shouldDownloadVideos` desligado e
`downloadSubtitlesOptions` em `NEVER_DOWNLOAD_SUBTITLES` (transcrição é cobrada à parte).

Se a ferramenta não trouxer os itens na resposta, leia com `mcp__apify__get-actor-run` e
`mcp__apify__get-dataset-items`.

## Assistir e baixar

- Assistir barato: `mcp__yt-dlp__ytdlp_download_video` com `resolution: "480p"` (e `startTime`/
  `endTime` para só um pedaço). O arquivo cai em `YTDLP_DOWNLOADS_DIR`: mova para
  `storage/projects/<slug>/raw/` e siga a contact sheet de `yt-dlp.md`.
- O trecho em 1080p continua com o `build_timeline.py` (`url` + `start` no `shotlist.json`).

## Problemas conhecidos

- **IP de nuvem:** sem login, o `yt-dlp` falha no YouTube ("Sign in to confirm you're not a bot"),
  no TikTok ("Unexpected response from webpage request"), no Instagram ("empty media response") e
  no Reddit ("Account authentication is required"). O X funciona. Nesses casos, use a Apify para
  achar e conferir o post, pegue outro candidato ou peça o arquivo ao usuário. Na máquina local
  costuma funcionar.
- `reddit` anônimo funciona na nuvem (testado; cai no RSS do Reddit, então `score` vem vazio), com
  limite de 10 req/min.
- `apify` sem `APIFY_TOKEN` sobe sem ferramentas. O Reddit pela Apify usa o proxy da Apify, que no
  plano Free é só um teste: se falhar, use o servidor `reddit`.
- `yt-dlp` MCP não sobe sem o binário `yt-dlp` no PATH ou sem a pasta de downloads; o hook cuida
  dos dois na nuvem; local, `nix develop` ou `uv tool install yt-dlp`.

## Upgrades pagos (opcionais, fora do `.mcp.json`)

| Serviço | Para quê | Custo |
|---|---|---|
| X API oficial (`https://api.x.com/mcp`, `Authorization: Bearer ${X_BEARER_TOKEN}`) | busca completa no X dentro dos termos de uso | pré-pago, ≈ US$ 0,005 por post lido |
| ScrapeCreators (`https://api.scrapecreators.com/mcp`, `x-api-key: ${SCRAPECREATORS_API_KEY}`) | as quatro redes com uma chave, com transcrição | 100 créditos grátis; depois US$ 47 por 25.000 |
| App OAuth do Reddit | limite de 60–100 req/min no `reddit` | grátis, mas exige aprovação do Reddit (semanas) |

Para ativar: entrada no `.mcp.json` só com `${VAR}`, nome em `enabledMcpjsonServers` e ferramentas de
leitura em `permissions.allow` do `.claude/settings.json`; as de escrita em `permissions.deny`.
