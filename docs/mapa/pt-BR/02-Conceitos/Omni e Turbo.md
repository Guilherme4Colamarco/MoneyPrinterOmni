---
title: Omni e Turbo
tags: [mapa, omni-turbo, status/unstable]
aliases: [Fork do Turbo, Omni x Turbo]
lang: pt-BR
sources: [app/paths.py, app/services/version_checker.py, app/models/llm_provider.py, webui/Main.py, webui/i18n/pt.json, pyproject.toml, app/__init__.py, docs/release-notes-v1.3.9.md, docs/packaging.md, update.sh, README.md]
---
# Omni e Turbo

[[00 - Índice|← Índice]]

O MoneyPrinterOmni é um fork do MoneyPrinterTurbo: herda o pipeline, acrescenta o harness de agentes e continua recebendo versões do upstream por merge.

## Ideia central

O Omni nasceu do fork do Turbo no commit `9e7d8b7` ("fix(task): keep tasks with invalid state (#1663)", 17/10/2026). O nome do pacote (`mpt`) e o layout `app/` não mudaram, então os caminhos de código são os mesmos do Turbo. A diferença está no rebrand, no harness de agentes, no `animations/` e no ambiente Nix.

## Como funciona

1. **Origem.** Fork no commit `9e7d8b7`. Confirmado na sessão; este worktree não tem histórico git para reconferir.
2. **Rebrand (`a6c685c`, 67 arquivos).** Trocou os nomes e acrescentou dois ajustes de compatibilidade:
   - `app/paths.py:38` (`_with_legacy`): se a pasta de dados nova não existe e a antiga `MoneyPrinterTurbo` existe, o programa continua usando a antiga.
   - `webui/Main.py:2965-2967`: aceita arquivos exportados com o schema antigo `moneyprinterturbo.`.
3. **O que o Omni acrescentou.** `.agents/` (times de agentes), `.claude/` e `.grok/` (adaptadores), `animations/` (Remotion), `flake.nix` e `update.sh`. O `README.md` é o inglês; chinês e japonês ficam em `README-zh.md` e `README-ja.md`.
4. **Merge do upstream v1.3.9.** Em 22/10/2026 o Omni incorporou 25 commits do upstream. No worktree estão os artefatos: `app/utils/request_logging.py`, `docs/diagnostic-logging.md`, `docs/local-image-server/` e `docs/release-notes-v1.3.9.md`. A versão está em `app/__init__.py:3` e `pyproject.toml:10`.

> [!warning] unstable
> O merge v1.3.9 só existe na branch `unstable`. Opções de movimento de imagem, logging com controles em tempo de execução, servidor SDXL local e provedor EmpirioLabs: estado a confirmar, pouco testados no Omni.

5. **Sincronizar com o upstream.** O relatório de divergência recomendou um merge único, não cherry-picks, porque os 25 commits dependem uns dos outros. O roteiro:
   1. Adicionar o remote `upstream` apontando para `harry0703/MoneyPrinterTurbo`. (Convenção; não verifiquei a configuração de remotes deste worktree.)
   2. Buscar o histórico completo do upstream.
   3. Fazer o merge numa branch nova, a partir da base do Omni. Nunca force-push.
   4. Resolver os conflitos previsíveis (ver Armadilhas).
   5. Rodar a checagem de nomes, `uv lock --check` e a suíte de testes.

## Exemplo / percurso

Para descobrir onde o código ainda cita o Turbo, rode uma busca de leitura (saída real neste worktree):

```sh
grep -rn "harry0703\|MoneyPrinterTurbo" app webui cli.py main.py docs/skill --include=*.py
```

Resultado: `app/paths.py:39-40` (compatibilidade de pasta), `app/services/video.py:1593` (link de issue), `app/services/version_checker.py:17,20` (releases do upstream), `app/models/llm_provider.py:337` (`utm_term=MoneyPrinterTurbo`), `webui/Main.py:88` (crédito de fork), `docs/skill/mpt_agent.py:68` (`utm_source=MoneyPrinterTurbo`). Nos JSON de `webui/i18n/`, 14 de 14 arquivos trazem `utm_content=moneyprinterturbo` em links de provedores.

## Armadilhas

- **Conflitos previsíveis no merge.** `README.md` e `README-ja.md` (o Omni reescreveu e apagou `README-en.md`; segundo o relatório de divergência, o upstream o editou). `pyproject.toml`: versão (linha 10) e descrição (linha 11) são linhas vizinhas e conflitam. `docs/packaging.md` (linha 3). `webui/Main.py` e `webui/i18n/*.json`. Em todos, mantenha o texto do Omni.
- **O Omni ainda consulta o Turbo.** `app/services/version_checker.py` compara a versão do Omni com `releases/latest` de `harry0703/MoneyPrinterTurbo`. Um release novo do Turbo aparece como atualização do Omni. Pendência em aberto.
- **Links de referral do Turbo.** Os textos de `webui/i18n/*.json` (ex.: `webui/i18n/pt.json:417`) e `webui/i18n/en.json:469` ("MoneyPrinterTurbo referral link") ainda apontam para a conta do Turbo. Pendência em aberto.
- **`update.sh` não sincroniza com o upstream.** Ele usa o remote `origin` (padrão, `update.sh:24`), ou seja, atualiza o próprio Omni. O upstream só entra por merge manual.

## Prática

1. Por que o `version_checker` do Omni consulta o repositório do Turbo? Qual decisão falta tomar?
2. Num merge do upstream, quais são as duas linhas do `pyproject.toml` que costumam conflitar?
3. O que `_with_legacy` faz quando a pasta `MoneyPrinterOmni` não existe, mas a `MoneyPrinterTurbo` existe?

> [!faq]- Gabarito
> 1. Porque o código ainda aponta para o repositório de releases do Turbo (pendência). Falta decidir qual repositório de releases o Omni deve consultar, ou desligar a checagem.
> 2. `version` (linha 10) e `description` (linha 11). Estão em linhas vizinhas, então o git marca conflito.
> 3. Usa a pasta antiga `MoneyPrinterTurbo` (`app/paths.py:38-40`), para não perder os dados de quem instalou antes do rebrand.

## Conexões

- [[Visão geral]] e [[Harness de agentes]]: o que o Omni acrescentou ao pipeline.
- [[Branches main e unstable]]: onde o merge v1.3.9 está e como ele sobe para a main.
- [[Como contribuir]] e [[Testes e CI]]: o que rodar antes de sincronizar.
- [[Adaptadores Claude e Grok]] e [[Animações com Remotion]]: os adaptadores e o `animations/` do Omni.
- [[Time técnico]]: o time que faz o merge e a auditoria, quando pedido.
- Canvas: [[06 - Omni e Turbo.canvas|Canvas]].
