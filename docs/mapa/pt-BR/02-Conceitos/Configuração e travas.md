---
title: Configuração e travas
tags: [mapa, conceito, status/unstable]
aliases: [Config e travas]
lang: pt-BR
sources: [app/config/config.py, app/paths.py, app/utils/file_security.py, app/services/webui_task.py, webui/Main.py, config.example.toml, app/utils/logging_utils.py, app/services/task.py]
---
# Configuração e travas

[[00 - Índice|← Índice]]

Toda a configuração vem de um arquivo, `config.toml`, lido uma vez na importação. A WebUI pode gravá-lo. Uma trava evita que a configuração mude no meio de uma geração. Caminhos e arquivos passam por checagens próprias.

> [!warning] unstable
> A seção `[diagnostics]` (`config.example.toml:14-24`), os controles de log em tempo de execução (`app/config/config.py:137`, `app/utils/logging_utils.py:33`) e o botão de diagnóstico da WebUI (`webui/Main.py:3207-3223`) vêm do merge do upstream Turbo v1.3.9. Estado a confirmar. O restante desta nota (config, trava e caminhos) está na `main`.

## Ideia central

O `config.toml` fica na pasta de execução (`app/paths.py:20`, `runtime_root`). Cada seção vira um dicionário sincronizado em memória, e o programa lê dele em todo lugar. A trava de configuração (`runtime_config_lock`) impede gravações durante uma geração, mas só a WebUI a usa. API e CLI não pegam a trava.

## Como funciona

1. **Arquivo.** `config.py:15-16` monta `root_dir/config.toml`. Na primeira execução, `_initialize_config_from_example` (`config.py:495`) copia `config.example.toml` para lá, por um link duro atômico, sem sobrescrever um arquivo que já exista (`config.py:513`).
2. **Leitura.** `load_config` (`config.py:531`) lê o TOML. Cada seção vira `_SynchronizedConfig` (`config.py:30`): `diagnostics` (`:641`), `app` (`:642`), `azure`, `siliconflow`, `minimax_tts`, `elevenlabs`, `chatterbox`, `kokoro`, `fish_audio`, `voxcpm` e `ui` (`:653`). `whisper` e `proxy` são dicionários simples (`:643-644`). Os valores de topo são `listen_host`, `listen_port`, `log_level` e `ffmpeg_path` (`:665-680`).
3. **Gravação.** `save_config` (`config.py:566`) escreve num arquivo temporário e troca com `os.replace` (`config.py:620`). Se o arquivo for montagem de Docker e não puder ser trocado, grava no lugar, dentro da trava.
4. **Trava.** `runtime_config_lock` (`config.py:304`) segura um lock reentrante por toda a geração. `_run_generation` a pega em `webui_task.py:94`. `try_runtime_config_lock` (`config.py:322`) é a versão não bloqueante, usada pela WebUI na prévia de voz (`webui/Main.py:6153`), no teste de conexão com o LLM (`:3649`) e ao copiar a configuração para gerar um texto novo (`:440`).
5. **Gravação com trava ocupada.** `update_config_nonblocking` (`config.py:92`) guarda só o último valor de cada chave e aplica quando a trava solta. Não bloqueia a interface e não muda a configuração da tarefa em andamento.
6. **Caminhos.** `app/paths.py`:
   - `runtime_root` (`paths.py:20`): usa `MPT_HOME` se existir; senão, a pasta do repositório (checkout) ou a pasta de dados do usuário por SO;
   - `_with_legacy` (`paths.py:38`): se a pasta nova não existe e a antiga `MoneyPrinterTurbo` existe, usa a antiga;
   - `resource_directory` (`paths.py:70`): copia recursos que faltam, sem sobrescrever o que o usuário editou.
7. **Arquivos de usuário.** `app/utils/file_security.py:4` (`resolve_path_within_directory`) resolve o caminho real e confere se ele fica dentro da pasta permitida, com `realpath` e `commonpath`. Usado pela fonte da API (`video.py:251`), pelas rotas de stream e download (`video.py:515`, `:587`), pelo áudio customizado (`task.py:445`), pela BGM (`bgm.py:339`, `:413`) e pelo material local (`video.py:1971`).

## Exemplo / percurso

Primeira execução com uma pasta de teste. O comando abaixo cria o `config.toml` dentro de `MPT_HOME`, sem tocar no repositório:

```sh
MPT_HOME=/tmp/mpt-teste uv run python cli.py --video-subject "teste" --stop-at script
```

Depois dele, `/tmp/mpt-teste/config.toml` existe, com o mesmo tamanho de `config.example.toml`. Foi o que aconteceu nesta documentação: o arquivo criado tinha 34.300 bytes, igual ao exemplo. Mudar `api_key` ali e reiniciar a API já muda a exigência de autenticação (veja [[Portas de entrada]]).

Valores padrão do exemplo que mais importam:

| Chave | Valor | Seção | Linha |
|---|---|---|---|
| `listen_host` | `"0.0.0.0"` | topo | `config.example.toml:11` |
| `listen_port` | `8080` | topo | `:12` |
| `api_key` | `""` (sem autenticação) | `[app]` | `:38` |
| `tls_verify` | `true` | `[app]` | `:71` |
| `video_source` | `"pexels"` | `[app]` | `:90` |
| `llm_provider` | `"moonshot"` | `[app]` | `:253` |
| `subtitle_provider` | `"edge"` | `[app]` | `:516` |
| `enable_redis` | `false` | `[app]` | `:566` |
| `max_concurrent_tasks` | `5` | `[app]` | `:573` |
| `max_queued_tasks` | `100` | `[app]` | `:574` |

Chaves que são segredos (preenchidas por você, nunca no git): `api_key`, `loomloom_api_token`, as listas `*_api_keys` e as chaves `*_api_key` de cada provedor, `redis_password`, `speech_key` (Azure), `api_key` de `siliconflow`, `minimax_tts`, `elevenlabs`, `chatterbox`, `kokoro`, `fish_audio` e `voxcpm`, e `upload_post_api_key`. A lista completa está em [[Chaves de configuração]]. O `.gitignore` já inclui `/config.toml` (`.gitignore:2`).

## Armadilhas

- **A trava não protege a API nem o CLI.** Hoje só a WebUI grava configuração, então o risco é pequeno. Se outro código passar a gravar no mesmo processo, ele vai mudar a configuração de uma tarefa da API em andamento.
- **Editar o arquivo não basta.** A configuração é lida uma vez, na importação (`config.py:640-660`). Depois de editar `config.toml` à mão, reinicie o processo.
- **`tls_verify = false`** desliga a verificação de certificado para APIs externas e downloads de material. O comentário do exemplo manda deixar ligado (`config.example.toml:69-71`).
- **O `AGENTS.md` diz que gravações "são bloqueadas" durante a trava.** O código faz diferente: adia a gravação, guarda o último valor e aplica quando a trava solta (`config.py:92`). Vale o código.

## Prática

1. O que acontece com uma mudança de opção na WebUI enquanto uma geração está rodando?
2. Qual chave controla se a API exige `x-api-key`, e qual é o valor padrão?
3. Com `MPT_HOME` definido, onde o programa procura o `config.toml`?

> [!faq]- Gabarito
> 1. A mudança é guardada e aplicada quando a trava solta (`app/config/config.py:92`). A geração em andamento não muda.
> 2. `api_key` em `[app]` (`config.example.toml:38`). Padrão `""`, que desliga a exigência.
> 3. Em `$MPT_HOME/config.toml`. `runtime_root` (`app/paths.py:20`) usa essa variável antes de qualquer outra regra.

## Conexões

- [[Visão geral]]: onde a configuração entra no programa.
- [[Portas de entrada]]: quem usa a trava e quem não usa.
- [[Estado das tasks e fila]]: `max_concurrent_tasks`, `max_queued_tasks` e `enable_redis`.
- [[Chaves de configuração]]: todas as seções e chaves.
- Canvas: [[01 - Pipeline.canvas|Canvas]].
