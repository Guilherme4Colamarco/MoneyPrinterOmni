---
title: Harness de agentes
tags: [mapa, agentes, status/stable]
aliases: [Agent harness]
lang: pt-BR
sources: [AGENTS.md, .agents/setup.md, .agents/tecnico.md, .agents/pipeline.md, .agents/grok-bot.md, .agents/comunicacao.md]
---
# Harness de agentes

[[00 - Índice|← Índice]]

O repositório também é um **harness**: textos e JSON que dizem a um assistente de IA como produzir um vídeo ou mudar o programa, sem ele precisar adivinhar.

## Ideia central

Um **harness** é a camada que liga um modelo de IA ao trabalho: regras, papéis, roteiros de etapas e permissões. Aqui o harness não é código do programa. Ele vive em arquivos de texto. Um assistente que lê `AGENTS.md` e a skill certa consegue rodar o time de vídeo ou o time técnico.

A regra de ouro: **uma fonte só**. `AGENTS.md` e `.agents/` dizem o que vale. As pastas de cada ferramenta (`.claude/`, `.grok/`) guardam só adaptadores finos que apontam para lá.

## Como funciona

1. `AGENTS.md` é a porta de entrada para qualquer assistente. Tem os comandos do programa e três seções de harness: vídeo (`AGENTS.md:50`), time técnico (`AGENTS.md:90`) e Grok (`AGENTS.md:114`).
2. `.agents/` guarda o conteúdo:

| Item | O que é |
|---|---|
| `setup.md` | regras do time de vídeo, prioridades, padrões e regras fixas |
| `pipeline.md` | pasta do projeto, etapas e contratos de arquivo |
| `tecnico.md` | regras do time técnico, pasta da tarefa e checagens do CI |
| `gostos.md` | gostos do criador (música, visual, narração); hoje são só marcadores |
| `comunicacao.md` | como falar com o usuário, de forma curta; os relatórios dos papéis não seguem essa regra |
| `perfis/` | um perfil por canal dark (ver [[Perfis de canal]]) |
| `roles/` | um arquivo por papel: 20 ao todo |
| `playbooks/` | receitas de ferramenta: `yt-dlp`, `redes-sociais`, `ffmpeg-timeline`, `moneyprinter` |
| `skills/` | orquestração: `video/` e `manutencao/`, com scripts |
| `tools/` | `sync_grok_agents.py`, que gera os adaptadores do Grok |
| `grok-bot.md` | guia para montar o time no Grok Bot, que não lê o repositório |

3. Quando duas regras conflitam, vale a ordem de `setup.md:6-15`: pedido explícito > `brief.md` > perfil > gostos > setup. No time técnico a ordem é pedido > `pedido.md` > `AGENTS.md` > `tecnico.md` (`tecnico.md:8-13`).
4. Cada ferramenta lê a própria pasta de adaptador. O Claude Code lê `.claude/`; o Grok Build lê `.grok/` e, segundo `AGENTS.md:116`, também `.claude/agents/`. Ver [[Adaptadores Claude e Grok]].

Regras que o harness repete em todo lugar: nunca publicar, nunca mudar `config.toml`, parada de aprovação antes do download e auditoria antes da entrega (`setup.md:59-62`, `setup.md:76-77`).

## Exemplo / percurso

Pedido típico: "siga `.agents/skills/video/SKILL.md` para um vídeo sobre <tema>".

- O assistente lê `AGENTS.md` e `setup.md`, escolhe o perfil (`SKILL.md:27-30`) e cria `storage/projects/<slug>/brief.md` (`SKILL.md:32`).
- Se a ferramenta tem subagentes, delega cada papel a um, usando o arquivo do papel (`SKILL.md:16-18`). Se não tem, executa os papéis em sequência, lendo o arquivo de cada um.

No time técnico, "siga `.agents/skills/manutencao/SKILL.md` para <pedido>" cria `storage/manutencao/<slug>/pedido.md` (`manutencao/SKILL.md:22-26`).

## Armadilhas

- **`AGENTS.md` está atrasado.** Ele diz que o time técnico tem "dois modos" (`AGENTS.md:94`). A skill tem quatro: mudança, auditoria, pesquisa de integração e harness (`manutencao/SKILL.md:8-12`). A tabela de papéis de vídeo também deixa de fora o `animador` (`AGENTS.md:73-83`).
- **Gostos vazios.** `gostos.md` tem só marcadores (`<ex.: ...>`), mas todo papel manda seguir o arquivo. Sem preencher, o agente escolhe pelo perfil.
- **Harness não é o pipeline.** `.agents/` descreve o trabalho dos agentes. O programa segue em `app/`. Mudar o harness não muda o MoneyPrinterOmni.
- **O estado varia por branch.** Parte do time técnico e dos MCPs não está na `main`. Ver [[Branches main e unstable]].

> [!warning] unstable
> O time técnico (`tecnico.md`, `skills/manutencao`, os papéis técnicos) e os MCPs de Reddit e Apify são `status/unstable`. Ver [[Time técnico]] e [[MCP e permissões]]. Estado de `comunicacao.md`: estado a confirmar.

## Prática

1. Quando duas regras conflitam, qual delas vence: a do perfil ou a do pedido?
2. A regra de um papel fica em `.claude/agents/` ou em `.agents/roles/`?
3. Um vídeo pronto é publicado pelo harness? Por quê?

> [!faq]- Gabarito
> 1. O pedido explícito. A ordem é pedido > brief > perfil > gostos > setup (`setup.md:6-15`).
> 2. Em `.agents/roles/`. O adaptador em `.claude/agents/` só aponta para lá.
> 3. Não. É regra fixa: nunca publicar, enviar ou agendar (`setup.md:76-77`). O papel `diretor` só entrega o checklist.

## Conexões

- Anterior: [[Visão geral]]. Próximos: [[Time de vídeo e contratos de arquivo]], [[Time técnico]], [[Adaptadores Claude e Grok]], [[MCP e permissões]].
- Referência: [[Papéis e modelos]], [[Contratos JSON dos agentes]].
- Canvas: [[04 - Time de vídeo.canvas|Canvas do time de vídeo]], [[05 - Time técnico.canvas|Canvas do time técnico]].
