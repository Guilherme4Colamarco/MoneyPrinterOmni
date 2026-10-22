---
title: Adaptadores Claude e Grok
tags: [mapa, agentes, status/stable]
aliases: [Claude and Grok adapters]
lang: pt-BR
sources: [.claude/agents/arquiteto.md, .claude/skills/video/SKILL.md, .grok/agents/arquiteto.md, .grok/skills/video/SKILL.md, .agents/tools/sync_grok_agents.py, skills-lock.json, .agents/grok-bot.md, AGENTS.md]
---
# Adaptadores Claude e Grok

[[00 - Índice|← Índice]]

Cada ferramenta de IA lê uma pasta própria, e essa pasta só repete o que está em `.agents/`.

## Ideia central

Um **adaptador** é um arquivo fino que a ferramenta entende (um subagente ou uma skill) e que aponta para a fonte única. O corpo do adaptador não tem regra nova. Se a regra mudar, muda só em `.agents/`.

Há dois adaptadores:
- **Claude Code**: `.claude/agents/` (subagentes) e `.claude/skills/` (skills).
- **Grok Build** (`grok`): `.grok/agents/` (gerado) e `.grok/skills/video/` (escrito à mão).

## Como funciona

1. **Subagentes do Claude.** Cada um dos 20 arquivos de `.claude/agents/` tem um cabeçalho (`name`, `description`, `model`, `tools`) e um corpo curto: "Leia e siga `.agents/roles/<papel>.md`" (exemplo: `.claude/agents/arquiteto.md:2-5`, cabeçalho; corpo logo abaixo).
2. **Modelo por papel.** A linha `model:` existe só aqui. Três papéis usam `haiku`: `montador-mpt` (`.claude/agents/montador-mpt.md:4`), `designer-de-thumbnail` e `redator-de-publicacao`. Os outros dezessete usam `sonnet`. A regra vem de `setup.md:68-74` e `tecnico.md:64-66`.
3. **Skills do Claude.** `.claude/skills/video/SKILL.md` e `.claude/skills/manutencao/SKILL.md` recebem `$ARGUMENTS` e mandam ler `.agents/skills/...`. Também há 12 skills `remotion-*`, vendorizadas de `remotion-dev/skills` e fixadas pelo hash em `skills-lock.json` (12 entradas).
4. **Subagentes do Grok.** `.grok/agents/` é gerado por `.agents/tools/sync_grok_agents.py`. O script copia `name`, `description` e `tools` do adaptador Claude, troca `model` por `inherit` e aponta o corpo para o papel (`sync_grok_agents.py:50`, corpo em `:24-27`).
5. **Verificação.** `python3 .agents/tools/sync_grok_agents.py --check` sai com 1 se algum arquivo está desatualizado, ou se sobra um adaptador gerado sem papel (`sync_grok_agents.py:101`). Sem `--check`, ele escreve. Ele não toca em arquivos feitos à mão, porque só remove os que têm a marca "Adaptador do Grok Build." (`:23`).
6. **Grok Bot é outra coisa.** O app Grok Bot não lê o repositório. O guia `.agents/grok-bot.md` diz para criar um bot por papel, colando a instrução "Leia e siga `.agents/roles/<papel>.md`" dentro do app. São 12 bots no guia de vídeo.

## Exemplo / percurso

Quando você troca a regra de um papel:

1. Edite `.agents/roles/<papel>.md`. Os adaptadores não mudam.
2. Se trocar o modelo, edite `model:` em `.claude/agents/<papel>.md`.
3. Rode `python3 .agents/tools/sync_grok_agents.py`. Ele regera `.grok/agents/`; o `model` continua `inherit`.
4. Rode `--check` antes de commitar: deve imprimir `ok: .grok/agents em dia`.

O mesmo fluxo vale para novos papéis. Crie `.agents/roles/<papel>.md`, depois o `.claude/agents/<papel>.md`, e rode o script.

## Armadilhas

- **`.grok/skills/video/SKILL.md` fica fora do `--check`.** O script só cuida de `.grok/agents/`. Esse arquivo é escrito à mão, e pode sair de sincronia.
- **Não existe `.grok/skills/manutencao/`.** O time técnico tem skill no Claude, mas o Grok só enxerga a do vídeo.
- **`model: sonnet` não existe no Grok.** Por isso o gerado usa `inherit` (`AGENTS.md:119`). Não edite `.grok/agents/` à mão: a próxima geração apaga a mudança.
- **O Grok Bot não usa estes arquivos.** Configuração, skills e rotinas do Grok Bot são criadas no app, não lidas do repositório. A xAI não documenta a leitura de `.mcp.json` pelo bot.

> [!warning] unstable
> Os adaptadores dos papéis técnicos (`arquiteto` a `mantenedor-do-harness`) e a skill `manutencao` existem só no time técnico, que é `status/unstable`. Ver [[Time técnico]].

## Prática

1. Onde você muda a regra de um papel para que Claude e Grok a sigam?
2. Por que o `--check` não pega um erro em `.grok/skills/video/SKILL.md`?
3. Qual modelo roda o `montador-mpt` no Claude Code?

> [!faq]- Gabarito
> 1. Em `.agents/roles/<papel>.md`. Os dois adaptadores só apontam para lá.
> 2. Porque o script só compara `.grok/agents/`. A skill do Grok é um arquivo à parte, sem verificação.
> 3. `haiku` (`.claude/agents/montador-mpt.md:4`).

## Conexões

- Anterior: [[Harness de agentes]]. Próximo: [[MCP e permissões]].
- Times: [[Time de vídeo e contratos de arquivo]], [[Time técnico]].
- Referência: [[Papéis e modelos]].
- Canvas: [[04 - Time de vídeo.canvas|Canvas do time de vídeo]].
