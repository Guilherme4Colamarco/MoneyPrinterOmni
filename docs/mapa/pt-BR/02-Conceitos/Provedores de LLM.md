---
title: Provedores de LLM
tags: [mapa, integracoes, status/unstable]
lang: pt-BR
sources: [app/models/llm_provider.py, app/services/llm.py, config.example.toml, webui/Main.py, webui/i18n/en.json, test/services/test_fluxionai_llm.py]
---
# Provedores de LLM

[[00 - Índice|← Índice]]

Um provedor de LLM é o serviço que escreve o roteiro, os termos de busca e os textos de publicação. O programa conhece 37 provedores, todos declarados em um único registro.

## Ideia central

Cada provedor é uma linha em `LLM_PROVIDER_REGISTRY` (`app/models/llm_provider.py:195`). A linha diz **o que** o provedor é: nome, modelo padrão, URL padrão e se pede chave. O código que **faz** a chamada fica em `app/services/llm.py`, escolhido pelo campo `adapter`. Por isso a maioria dos provedores novos precisa só de uma linha.

## Como funciona

1. A configuração escolhe o provedor em `[app] llm_provider`, padrão `moonshot` (`config.example.toml:253`; `DEFAULT_LLM_PROVIDER_ID` em `app/models/llm_provider.py:4`).
2. `_generate_response` (`app/services/llm.py:314`) lê `<id>_api_key`, `<id>_model_name` e `<id>_base_url` de `config.app`. Se o modelo estiver em `deprecated_models`, ele é trocado pelo `default_model`. Se a URL estiver vazia, usa-se a `default_base_url` do registro.
3. Se `adapter` não for `openai_compatible`, roda um ramo próprio: `qwen` (`:397`), `gemini` (`:423`), `cloudflare_ai_gateway` (`:473`), `litellm` (`:494`), `azure` (`:516`), `claude_code` (`:545`), `kimi_code` (`:666`) e `modelscope` (`:725`).
4. Os demais caem no SDK da OpenAI com `chat.completions.create` (`:754`).
5. Falha não vira exceção para quem chama. O `except` devolve a string `"Error: ..."` (`:778`), e os chamadores checam o prefixo (ex.: `:964`).

| Adaptador | Provedores | Autenticação |
|---|---|---|
| `openai_compatible` (padrão) | 29, incluindo `ollama` e `oneapi` | chave de API (`ollama` não usa) |
| `gemini` | `gemini` | chave |
| `qwen` | `qwen` (SDK dashscope) | chave |
| `azure` | `azure` | chave, URL e `azure_api_version` |
| `cloudflare_ai_gateway` | `cloudflare` | chave, `account_id` e `gateway_id` |
| `modelscope` | `modelscope` | chave |
| `litellm` | `litellm` | variáveis de ambiente, como `OPENAI_API_KEY` |
| `claude_code` | `claude_code` | assinatura Claude (CLI) — ver [[Assinaturas em vez de chaves]] |
| `kimi_code` | `kimi_code` | assinatura Kimi (OAuth) — ver [[Assinaturas em vez de chaves]] |

A tabela completa, gerada a partir do registro, está em [[Provedores e adaptadores]].

## Exemplo / percurso

Config mínima para usar o DeepSeek:

```toml
[app]
llm_provider = "deepseek"
deepseek_api_key = "sk-..."
deepseek_base_url = ""     # vazio: usa https://api.deepseek.com
deepseek_model_name = ""   # vazio: usa deepseek-v4-pro
```

Com isso, `_generate_response` monta um `OpenAI(api_key=..., base_url="https://api.deepseek.com")` e pede o roteiro. O resultado vai para `storage/tasks/<id>/script.json`, gravado por `save_script_data` (`app/services/task.py`). Um erro do provedor fica no estado da task como falha da etapa `script`, não como exceção no terminal.

## Armadilhas

- **Chave vazia para provedor que exige chave.** Falha antes de qualquer rede, com `api_key is not set` (`llm.py:377`).
- **Provedores sem URL padrão.** `azure` e `oneapi` não têm `default_base_url` no registro. A URL precisa ser preenchida, ou a chamada falha com `base_url is not set` (`llm.py:385`).
- **Erro é texto.** Como o erro volta como `"Error: ..."`, código novo precisa checar o prefixo, ou a mensagem vira roteiro.
- **Rótulos na WebUI são desiguais.** O AGENTS.md pede a chave `llm_provider_label.<id>` nos 14 arquivos `webui/i18n/*.json`. Hoje só `en` e `zh` têm 15 rótulos, os demais têm apenas o de `moonshot`. O resto aparece com o `default_label` do registro.

> [!warning] unstable
> `empiriolabs` (EmpirioLabs AI) veio do merge do upstream Turbo v1.3.9 (commit 0dc4e20 segundo o relatório de divergência). Estado a confirmar na `main`. O restante desta nota é estado `main`.

## Como adicionar um provedor novo

1. **Registro.** Adicione um `LLMProviderSpec` em `LLM_PROVIDER_REGISTRY` (`app/models/llm_provider.py:195`). A ordem da tupla é a ordem do dropdown. Para um provedor compatível com OpenAI bastam `provider_id`, `default_label`, `api_key_url`, `default_model` e `default_base_url`. Só crie ramo novo em `llm.py` se o protocolo for outro.
2. **Config.** Copie um bloco existente em `config.example.toml`, dentro de `[app]`: `<id>_api_key`, `<id>_base_url` e `<id>_model_name` (ex.: o bloco `groq_*`).
3. **Interface.** Adicione `llm_provider_label.<id>` em todos os 14 `webui/i18n/*.json` (AGENTS.md). A WebUI cai no `default_label` se a chave faltar (`webui/Main.py:2277`). `llm_provider_tips.<id>` é opcional e só aparece se existir (`Main.py:2196`).
4. **Teste.** Use `test/services/test_fluxionai_llm.py` como modelo: `uv run python -X utf8 -m pytest -q test/services/test_fluxionai_llm.py test/services/test_llm.py`.

## Prática

1. Em qual linha do registro fica o provedor padrão, e qual é ele?
2. Um provedor compatível com OpenAI precisa de um ramo novo em `llm.py`? Por quê?
3. Se `deepseek_api_key` estiver vazia, o que acontece antes de qualquer chamada de rede?

> [!faq]- Gabarito
> 1. Linha 195 (`LLM_PROVIDER_REGISTRY` começa lá; o primeiro item é `moonshot`). Por isso ele é o padrão em `DEFAULT_LLM_PROVIDER_ID` (`:4`).
> 2. Não. O caminho padrão é o SDK da OpenAI com `base_url`. Ramo novo só para protocolo diferente.
> 3. `_generate_response` levanta `ValueError: deepseek: api_key is not set` (`llm.py:377`). Nenhuma requisição sai, e a task falha na etapa `script`.

## Conexões

- [[Assinaturas em vez de chaves]] — `claude_code` e `kimi_code`, que não usam chave.
- [[Provedores e adaptadores]] — tabela completa do registro.
- [[Chaves de configuração]] — onde ficam `<id>_api_key` e as demais chaves.
- [[Pipeline e stop_at]] — a etapa `script` que usa o LLM.
- [[03 - Integrações.canvas|Canvas]]
