---
title: 00 - Índice
tags: [mapa, indice, status/stable]
aliases: [Início]
lang: pt-BR
---
# 00 - Índice

Apostila 4D do MoneyPrinterOmni: notas curtas ligadas entre si e canvas que desenham cada fluxo. Comece pelo [[Visão geral]] ou pelo canvas [[00 - Geral.canvas|Geral]]. O site em `docs/mapa/site/index.html` mostra o mesmo conteúdo.

> [!info] Estado dos recursos
> Cada nota tem a tag `status/stable` (já na `main`) ou `status/unstable` (só na branch `unstable`). Veja [[Branches main e unstable]].

## Percursos

- [[01 - Vídeo pela API]]: Um pedido `POST /api/v1/videos` do começo ao fim.
- [[02 - Vídeo pelo CLI]]: O mesmo vídeo pelo `cli.py`, com `--stop-at` e saída em JSON.
- [[03 - Vídeo pela WebUI]]: O caminho da WebUI: fila, trava de configuração e progresso.
- [[04 - Vídeo pelo time de agentes]]: Um vídeo pelo time de agentes, do tema à entrega.
- [[05 - Mudança pelo time técnico]]: Uma mudança no programa conduzida pelo time técnico.

## Conceitos

- [[Visão geral]]: O programa em uma tela.
- [[Pipeline e stop_at]]: Os estágios, o que cada um grava e onde `stop_at` corta.
- [[Estado das tasks e fila]]: Estados, fila, memória e Redis.
- [[Portas de entrada]]: API, WebUI e CLI lado a lado.
- [[Configuração e travas]]: `config.toml`, travas e caminhos de recursos.
- [[Provedores de LLM]]: O registro de provedores e como adicionar um.
- [[Assinaturas em vez de chaves]]: Login por assinatura no lugar de chave de API.
- [[Voz e legenda]]: TTS, pausas e os dois caminhos de legenda.
- [[Material de vídeo]]: Bancos de vídeo, IA, arquivos locais e caches.
- [[Música e publicação]]: Trilha de fundo e cross-post.
- [[Harness de agentes]]: `AGENTS.md` + `.agents/` como fonte única.
- [[Adaptadores Claude e Grok]]: Os arquivos finos que apontam para `.agents/`.
- [[MCP e permissões]]: Servidores MCP, allow/deny e segredos.
- [[Time de vídeo e contratos de arquivo]]: Os papéis, as etapas e a pasta do projeto.
- [[Time técnico]]: Quem muda e audita o código do programa.
- [[Perfis de canal]]: Um perfil por canal: identidade, tom, cuidados.
- [[Animações com Remotion]]: Gráficos animados que entram na timeline.
- [[Omni e Turbo]]: O que veio do Turbo e o que o Omni acrescentou.
- [[Branches main e unstable]]: O que mora em cada branch e como sobe.
- [[Como contribuir]]: Comandos, convenções e fluxo de PR.
- [[Testes e CI]]: Suíte, cobertura e o CI.

## Referência

- [[Rotas da API]]: Todas as rotas, handlers e autenticação.
- [[Flags do CLI]]: Todas as flags de `cli.py`.
- [[Chaves de configuração]]: As chaves do `config.example.toml`.
- [[Provedores e adaptadores]]: Provedores de LLM, voz, material e música.
- [[Contratos JSON dos agentes]]: `sources`, `timing`, `shotlist`, `music`, `arte`.
- [[Papéis e modelos]]: Os papéis, seus modelos e ferramentas.

## Canvas

- [[00 - Geral.canvas|00 - Geral]]: Tudo em um desenho.
- [[01 - Pipeline.canvas|01 - Pipeline]]: O fluxo dos estágios.
- [[02 - Portas de entrada.canvas|02 - Portas de entrada]]: Três portas, um pipeline.
- [[03 - Integrações.canvas|03 - Integrações]]: Cada integração ligada ao estágio que a usa.
- [[04 - Time de vídeo.canvas|04 - Time de vídeo]]: As 13 etapas e os papéis.
- [[05 - Time técnico.canvas|05 - Time técnico]]: Modos de mudança e de auditoria.
- [[06 - Omni e Turbo.canvas|06 - Omni e Turbo]]: Linha do tempo do fork.
- [[07 - Branches.canvas|07 - Branches]]: main, unstable e PRs.
