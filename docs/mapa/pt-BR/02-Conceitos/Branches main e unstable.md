---
title: Branches main e unstable
tags: [mapa, branches, status/unstable]
aliases: [Branch main, Branch unstable, Promoção de item]
lang: pt-BR
sources: [.mcp.json, .agents/tecnico.md, .agents/roles/arquiteto.md, .github/workflows/ci.yml, .github/workflows/docker-ghcr.yml, update.sh, docs/packaging.md]
---
# Branches main e unstable

[[00 - Índice|← Índice]]

A `main` guarda só o que foi testado e provado; a `unstable` guarda o que entrou há pouco e ainda tem pouco teste.

## Ideia central

Cada item tem uma casa. Um item nasce na `unstable`, é corrigido e testado, e só então sobe para a `main` por PR. Nada de force-push: o histórico não se reescreve.

## Como funciona

1. **Regra de conteúdo** (definida pelo dono do projeto):
   - `main`: captura de vídeo dos bancos de vídeo; roteiro com IA; fluxo de agentes do Claude Code e de outros harness; animações Remotion; yt-dlp; adaptação para Grok.
   - `unstable`: MCPs Reddit e Apify; time técnico; perfis de canal com assets; animações novas; merge do upstream v1.3.9; futuras assinaturas (ver [[Assinaturas em vez de chaves]]).
2. **Entrada.** Item novo entra na `unstable`. Essa etapa é implícita na regra; não há um documento escrito com o passo a passo.
3. **Promoção.** Quando o item está corrigido e testado, ele sobe para a `main` por PR.
4. **Sem force-push.** Correções vêm como commits novos.

> [!tip] Sugestão de fluxo (não é regra escrita)
> Para subir um item só, a PR deve sair da `main` e trazer apenas os commits daquele item (branch a partir da `main` com cherry-pick). Uma PR da `unstable` inteira leva tudo que está lá junto.

## Exemplo / percurso

Promover o MCP da Reddit (item da `unstable`):

1. Confirme que o item está na `unstable`: `.mcp.json` tem a entrada `reddit` (e `apify`). Este worktree tem as duas, o que é coerente com a regra.
2. Corrija o que os testes e a revisão acharem.
3. Rode as checagens que o CI rodaria (o CI do fork está desligado, então a checagem é local):
   ```sh
   uv run ruff check app cli.py main.py webui test docs/skill
   uv run python -X utf8 -m pytest -q test
   uv run python -X utf8 -m coverage run -m pytest -q test && uv run python -m coverage report   # fail_under = 70
   ```
4. Abra a PR para a `main` com só esse item.

## Estado atual

> [!warning] unstable
> Estado a confirmar: não rodei comandos git neste worktree, então não consigo dizer, por git, em qual branch cada item está. Pelo conteúdo dos arquivos:
> - **Na unstable (pela regra):** MCPs Reddit e Apify (`.mcp.json`); time técnico (`.agents/tecnico.md`, `.agents/roles/arquiteto.md` e os demais papéis técnicos); merge do upstream v1.3.9 (`docs/release-notes-v1.3.9.md`).
> - **Perfis de canal:** `.agents/perfis/` tem cinco perfis e o `_modelo.md`, mas não há pasta de assets neste worktree. Estado a confirmar.
> - **Branches de trabalho** que o relatório de divergência descreve: `ccr-879e967e-rcs3uw` (3 commits sobre `origin/main`: MCPs, time técnico, cache do yt-dlp) e `ccr-e7cc9390-tc3402` (4 commits: animações e zoom em `build_timeline`, perfis movidos para `nichos/` e `canais/`, `flake.nix` alterado e `update.sh` apagado). São nomes de sessão, não as branches `main` e `unstable`.

## Armadilhas

- **`update.sh` some em uma branch de trabalho.** A `ccr-e7cc9390-tc3402` apaga `update.sh`, que a `origin/main` mantém. Se essa branch for promovida sem cuidado, o script de atualização desaparece. Confira o diff antes.
- **Não existe CI no fork.** O `.github/workflows/ci.yml` roda em push e PR para `main`, mas as Actions não rodam no fork. Promover sem testar localmente é o risco principal.
- **O que você vê depende da branch.** Este worktree tem o time técnico, que é `unstable`. Antes de dizer que algo "já está na main", confirme com `git` no repositório.

## Prática

1. Você criou um comando novo de CLI hoje. Em qual branch ele nasce, e o que falta para ele ir para a `main`?
2. Por que uma PR "`unstable` para `main`" inteira é ruim para promover só o MCP da Reddit?
3. Quais três comandos substituem o CI quando as Actions estão desligadas?

> [!faq]- Gabarito
> 1. Nasce na `unstable`. Falta corrigir o que os testes acharem, rodar as checagens e abrir uma PR para a `main` só com esse item.
> 2. Porque ela leva junto todos os outros itens que estão só na `unstable` (time técnico, animações novas etc.), que ainda não foram provados.
> 3. `uv run ruff check app cli.py main.py webui test docs/skill`; `uv run python -X utf8 -m pytest -q test`; e o comando de coverage com `fail_under = 70` (ver [[Testes e CI]]).

## Conexões

- [[Omni e Turbo]]: o merge v1.3.9 que está na `unstable`.
- [[Como contribuir]]: o passo a passo de quem vai mudar o código.
- [[Testes e CI]]: o que o CI roda e por que está desligado no fork.
- [[Time técnico]] e [[MCP e permissões]]: dois dos itens da `unstable`.
- [[Animações com Remotion]]: animações da `main` e as novas, da `unstable`.
- Canvas: [[07 - Branches.canvas|Canvas]].
