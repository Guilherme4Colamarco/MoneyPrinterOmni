---
title: Assinaturas em vez de chaves
tags: [mapa, integracoes, status/unstable]
lang: pt-BR
sources: [app/services/llm.py, app/services/kimi_code_oauth.py, app/models/llm_provider.py, config.example.toml, Dockerfile.claude, docker-compose.claude.yml, webui/kimi_login.py]
---
# Assinaturas em vez de chaves

[[00 - Índice|← Índice]]

Dois provedores usam a assinatura que você já paga (Claude ou Kimi) no lugar de uma chave de API cobrada por token.

## Ideia central

Chave de API é cobrada por uso: cada token entra na conta. Assinatura é um plano mensal com limite de uso. Ela não entrega chave. A credencial fica com o cliente oficial (a CLI do Claude ou o login OAuth da Kimi), e o programa só pede que ele responda. Por isso esses provedores têm `requires_api_key=False` no registro.

| | Chave de API | Assinatura |
|---|---|---|
| Como autentica | `Authorization` com chave em `[app]` | CLI logada ou token OAuth |
| Cobrança | por token | plano mensal, com limite |
| Provedores | a maioria | `claude_code`, `kimi_code` |

## Como funciona

### Claude (`claude_code`)

O adaptador não fala com a API da Anthropic. Ele executa a CLI oficial em modo headless (`app/services/llm.py:545`).

1. Comando: `claude -p --output-format json --system-prompt <...> --tools "" --safe-mode`, com `--model` só se `claude_code_model_name` estiver preenchido (`llm.py:~560-580`). O prompt vai por **stdin**, porque no Windows o `cmd.exe` corta prompts multilinha passados como argumento.
2. `--tools ""` desliga as ferramentas. `--safe-mode` desliga CLAUDE.md, skills, hooks, plugins e MCP. A execução acontece num diretório temporário vazio (`llm.py:~590`).
3. Versão mínima: `CLAUDE_CODE_MIN_CLI_VERSION = "2.1.260"` (`llm.py:82`). CLI antiga sai com `unknown option`, e o erro pede a atualização.
4. `build_claude_code_env` (`llm.py:167`) remove as variáveis que trocariam a assinatura por outra forma de cobrança: prefixos `ANTHROPIC_*` e `CLAUDE_CODE_USE_*`, além de `AWS_BEARER_TOKEN_BEDROCK` e `CLAUDE_CODE_SKIP_*_AUTH`. Preserva `CLAUDE_CODE_OAUTH_TOKEN`, `ANTHROPIC_CONFIG_DIR` e `CLAUDE_CONFIG_DIR`.
5. Timeout: `claude_code_timeout`, padrão 300 s (`CLAUDE_CODE_DEFAULT_TIMEOUT`, `llm.py:78`). `coerce_claude_code_timeout` (`llm.py:115`) rejeita zero, negativo, `nan` e `inf`.

No Docker, o `Dockerfile.claude` instala `@anthropic-ai/claude-code@2.1.260` via npm. O `docker-compose.claude.yml` exige `CLAUDE_CODE_OAUTH_TOKEN` (com `:?`, obrigatório). O token sai do host com `claude setup-token`, porque o container não tem keychain.

### Kimi (`kimi_code`)

O login usa o device flow (RFC 8628), em `app/services/kimi_code_oauth.py`.

1. Pede o código: `POST {auth}/api/oauth/device_authorization` (`kimi_code_oauth.py:162`). O usuário aprova no navegador.
2. Troca por token: `POST {auth}/api/oauth/token` (`:202`), com `grant_type=urn:ietf:params:oauth:grant-type:device_code` (`:209-210`).
3. Regiões em `_REGIONS` (`:47`). China: `auth.kimi.com` e `api.kimi.com/coding/v1`. Global: `auth.kimi.ai` e `api.kimi.ai/coding/v1`.
4. Token expira em `expires_in`, padrão 900 s = 15 min (`:266`). `get_valid_access_token` (`:311`) renova 60 s antes do vencimento (`_EXPIRY_MARGIN_SECONDS`, `:71`), com trava para renovações concorrentes.
5. Os tokens ficam em `[app]`: `kimi_code_access_token`, `kimi_code_refresh_token`, `kimi_code_token_expires_at` e `kimi_code_region` (`config.example.toml:475-480`).
6. A chamada usa o SDK da OpenAI com o access token e os cabeçalhos de identidade da CLI (`llm.py:666-724`). A região do token vence a região escolhida na tela, porque um token de uma região dá 401 na outra.
7. A tela de login está em `webui/kimi_login.py` (`render_kimi_login`, `:129`).

## Exemplo / percurso

Usuário escolhe `claude_code` com `claude_code_timeout` vazio. O `coerce_claude_code_timeout` devolve 300 s. A CLI responde um JSON com `result`, e `_normalize_text_response` limpa o texto. O roteiro vai para `storage/tasks/<id>/script.json`. Se a CLI estiver deslogada, o JSON vem com `is_error` e a mensagem de login, e o erro chega à task como `[claude_code] returned an error response`.

## Armadilhas

- **Chave antiga no ambiente.** Se `ANTHROPIC_API_KEY` estiver no ambiente, ela é removida. A cobrança segue a assinatura, não a chave. O log registra só o nome da variável removida.
- **Docker sem token.** Dentro do container não há login interativo. Sem `CLAUDE_CODE_OAUTH_TOKEN`, a chamada falha, e a mensagem sugere `claude setup-token`.
- **Docstring desatualizada.** O cabeçalho de `kimi_code_oauth.py` (linhas 9-12) diz que o programa chama `{api}/usages` e `{api}/messages`. O código só chama chat completions. A descrição está errada.

> [!warning] unstable
> A seção seguinte mistura o que **já entrou** (TTS da xAI, com chave de API) e o que continua **PLANEJADO**. Busquei `Codex`, `Gemini CLI`, `Grok Build` e `SuperGrok` no repositório e não achei implementação. A fonte do plano de fases não foi encontrada no repositório.

## TTS da xAI (implementado, com chave)

A voz do Grok **não** usa assinatura. É o endpoint oficial `POST https://api.x.ai/v1/tts`, autenticado com Bearer (`XAI_API_KEY`, `[xai].api_key` ou, se os dois estiverem vazios, `grok_api_key`). O prefixo da voz é `xai:`. Veja [[Voz e legenda]].

STT da xAI (`POST /v1/stt`) **não** foi ligado: o TTS já devolve timestamps nativos (`with_timestamps` → `graph_chars` / `graph_times`). Um STT extra retranscreveria o áudio, com custo e risco de divergir do roteiro.

## Próximas (PLANEJADO)

| Item | Estado |
|---|---|
| Codex CLI (assinatura) | PLANEJADO, não existe |
| Gemini CLI (assinatura) | PLANEJADO, não existe |
| Grok Build / SuperGrok | PLANEJADO, não existe |

## Prática

1. Por que `claude_code` remove `ANTHROPIC_API_KEY` do ambiente antes de rodar a CLI?
2. Por que o prompt vai por stdin, e não como argumento?
3. Qual é a validade do access token da Kimi, e quando ele é renovado?

> [!faq]- Gabarito
> 1. Para que a CLI use o login da assinatura, e não a chave. Sem a remoção, a cobrança iria para a conta de API. A função é `build_claude_code_env` (`llm.py:167`).
> 2. No Windows o `cmd.exe` corta argumentos no primeiro newline (comentário em `llm.py`, perto da linha 556). Stdin preserva o prompt inteiro.
> 3. 15 min (900 s por padrão, `kimi_code_oauth.py:266`). Renovado 60 s antes do vencimento (`:71`), via refresh token.

## Conexões

- [[Provedores de LLM]] — o registro e os adaptadores.
- [[Chaves de configuração]] — `kimi_code_*` e `claude_code_*`.
- [[Configuração e travas]] — por que a leitura de config passa pela trava.
- [[03 - Integrações.canvas|Canvas]]
