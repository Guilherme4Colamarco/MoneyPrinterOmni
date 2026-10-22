---
title: 05 - Mudança pelo time técnico
tags: [mapa, percurso, status/unstable]
aliases: [05 - Change with the technical team]
lang: pt-BR
sources: [.agents/skills/manutencao/SKILL.md, .agents/tecnico.md, .agents/roles/arquiteto.md, .agents/roles/testador.md, .agents/roles/desenvolvedor.md, .agents/roles/revisor-de-codigo.md, .agents/roles/auditor-de-seguranca.md, app/models/llm_provider.py, config.example.toml, AGENTS.md]
---
# 05 - Mudança pelo time técnico

[[00 - Índice|← Índice]]

Um exemplo de mudança no programa: adicionar um provedor de LLM. O percurso mostra como o plano, a parada, os testes e a revisão se encaixam.

> [!warning] unstable
> Este percurso depende do time técnico, que é `status/unstable`. É um **exemplo ilustrativo**: o provedor "X" é fictício e nada foi executado. Os arquivos e as chaves citados são reais.

## Ideia central

Uma mudança no programa passa por quem planeja, quem escreve, quem testa e quem revisa. A mudança que toca config ou API para antes do código, e o usuário decide. Quem revisa não edita; só aponta.

## Como funciona

**Pedido.** O usuário diz: "adicione o provedor X de LLM". O orquestrador cria `storage/manutencao/<slug>/pedido.md` com o que se espera (um provedor que responde e aparece na lista), o que fica fora (sem mudar o padrão) e o critério de pronto (testes verdes e CI passando).

**Plano (`arquiteto`).** Lê o código e escreve `plano.md`. No caso de um provedor, o registro fica em `app/models/llm_provider.py`, onde `LLM_PROVIDER_REGISTRY` começa na linha 195 e cada entrada é um `LLMProviderSpec`. O uso fica em `app/services/llm.py`. A chave de configuração entra em `app/config/config.py` e em `config.example.toml` (`tecnico.md:43-44`). O plano diz quais portas de entrada são afetadas: a API, a WebUI e a CLI recebem tudo pelo `task.start()` e não precisam de código novo.

**Parada.** Mudança de config está na lista que exige aval (`SKILL.md:30-33`). O orquestrador mostra o plano ao usuário. Sem o aval, o desenvolvedor não começa. Se o provedor precisasse de uma biblioteca nova, a justificativa iria no plano e a dependência entraria só com `uv add` (`tecnico.md:45-46`).

**Teste de reprodução (`testador`).** Pulado: não há bug. O modo reprodução é só para bugs (`SKILL.md:34`).

**Implementação (`desenvolvedor`).** Adiciona a entrada no registro, usa a chave de config e roda as checagens da área:

```sh
uv run ruff check app cli.py main.py webui test docs/skill
uv run python -X utf8 -m pytest -q test/services
```

O resultado vai para `mudancas-01.md`, com o comando e a saída.

**Cobertura (`testador`).** Escreve testes para as funções novas e roda a suíte completa com a cobertura do CI:

```sh
uv run python -X utf8 -m coverage run -m pytest -q test && uv run python -m coverage report  # fail_under = 70
```

O resultado vai para `testes-01.md`. O testador só edita arquivos em `test/`.

**Revisão e segurança (em paralelo).** `revisor-de-codigo` confere os contratos, o padrão do registro e se há teste. `auditor-de-seguranca` confere o segredo (que vem de `${VAR}` ou do `config.toml`, nunca do código) e o endereço de base do provedor, que pode virar SSRF. Cada um grava seu arquivo: `revisao-01.md` e `seguranca-01.md`. Veredito `APROVADO` ou `REVISAR`.

**Rodada de correção.** Se algum disser `REVISAR`, o desenvolvedor corrige só os itens apontados e os passos de cobertura e revisão rodam de novo. No máximo duas rodadas. Depois disso, o problema vai ao usuário.

**Relatório final.** Lista os arquivos alterados, a saída das checagens, os vereditos e as pendências. Nada é commitado sem o aval do usuário (`tecnico.md:60-61`).

## Exemplo / percurso

| Etapa | Quem | Arquivo gravado | Resultado |
|---|---|---|---|
| 0 | orquestrador | `pedido.md` | critério de pronto |
| 1 | `arquiteto` | `plano.md` | plano com a entrada no registro e a chave de config |
| 2 | usuário | — | aprova o plano (config mudou) |
| 3 | `testador` | — | pulado: não é bug |
| 4 | `desenvolvedor` | `mudancas-01.md` | ruff e pytest da área verdes |
| 5 | `testador` | `testes-01.md` | suíte e cobertura verdes |
| 6 | `revisor` e `auditor` | `revisao-01.md`, `seguranca-01.md` | `APROVADO` |
| 7 | orquestrador | — | relatório ao usuário |

## Por que funciona

- **O plano vem antes do código.** Mudança de config ou API é cara de desfazer. Parar aqui deixa a decisão com o usuário, antes de haver diff.
- **Quem escreve não aprova o próprio código.** O testador escreve o teste; o revisor lê o diff sem tê-lo escrito.
- **A régua é o CI.** As mesmas checagens (`tecnico.md:51-57`) rodam antes de qualquer veredito. Verde ou vermelho, sem interpretação.

## Armadilhas

- **Config é `runtime_config_lock`.** Gravar config com um vídeo rodando é bloqueado. O desenvolvedor não mexe no `config.toml` do usuário (`tecnico.md:43-44`).
- **Teste que falha de propósito não passa.** Pular, desligar ou marcar como esperado a falhar para ficar verde é proibido (`tecnico.md:49-50`).
- **Língua dos comentários.** A maioria dos comentários do código é em chinês. Siga a língua do arquivo (`tecnico.md:38-39`).
- **O CI é a régua.** Checagem vermelha = não está pronto, qualquer que seja o veredito (`SKILL.md:68`).

## Prática

1. Por que o plano para antes do código quando a mudança toca config?
2. Um bug é corrigido. Qual papel escreve o teste que falha antes da correção?
3. O auditor de segurança aponta `REVISAR`. O que acontece na rodada seguinte?

> [!faq]- Gabarito
> 1. Porque a regra manda parar em mudança de config, API, schema, dependência ou mais de cinco arquivos (`SKILL.md:30-33`).
> 2. O `testador`, no modo reprodução (`SKILL.md:34`).
> 3. O desenvolvedor corrige só os itens apontados, e os passos de cobertura e revisão rodam de novo (`SKILL.md:37-40`). Até duas rodadas.

## Conexões

- Anterior: [[Time técnico]]. Vídeo, para comparar: [[04 - Vídeo pelo time de agentes]].
- Conceitos: [[Provedores de LLM]], [[Configuração e travas]], [[Testes e CI]], [[Como contribuir]].
- Referência: [[Papéis e modelos]].
- Canvas: [[05 - Time técnico.canvas|Canvas do time técnico]].
