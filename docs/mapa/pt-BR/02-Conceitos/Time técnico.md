---
title: Time técnico
tags: [mapa, tecnico, status/unstable]
aliases: [Technical team]
lang: pt-BR
sources: [.agents/skills/manutencao/SKILL.md, .agents/tecnico.md, .agents/roles/arquiteto.md, .agents/roles/revisor-de-codigo.md, .agents/roles/auditor-de-seguranca.md, .agents/roles/mantenedor-do-harness.md, AGENTS.md]
---
# Time técnico

[[00 - Índice|← Índice]]

O time técnico muda ou audita o **programa** (o código em `app/`, `cli.py` e `webui/`). É outro time, separado do de vídeo: ele não produz vídeo.

## Ideia central

Mudar código sem plano gera regressão. Por isso o time separa quem planeja, quem escreve, quem testa e quem revisa. Quem revisa só aponta. Quem escreve não aprova o próprio código. A regra mais forte é o plano: mudança grande só anda com o aval do usuário.

## Como funciona

**Os quatro modos** (`manutencao/SKILL.md:8-12`):

| Modo | Para quê | Seção |
|---|---|---|
| mudança | corrigir bug, incluir função, refatorar | `SKILL.md:28-41` |
| auditoria | avaliar sem mudar nada; lista priorizada | `SKILL.md:43-48` |
| pesquisa de integração | avaliar API, SDK ou MCP candidato | `SKILL.md:50-56` |
| harness | revisar `AGENTS.md`, `.agents/`, adaptadores e permissões | `SKILL.md:58-63` |

**Os oito papéis** (todos usam `sonnet` no Claude; ver [[Papéis e modelos]]):

| Papel | Escreve | Faz |
|---|---|---|
| `arquiteto` | `plano.md` | lê o código, lista arquivos, passos e riscos. Não edita código. |
| `desenvolvedor` | `mudancas-NN.md` | implementa na camada de serviço; roda ruff e os testes da área |
| `testador` | `testes-NN.md` | teste que falha para bug; cobertura; suíte inteira. Só edita `test/` |
| `revisor-de-codigo` | `revisao-NN.md` | bugs, contratos entre API, WebUI e CLI, padrões. Só aponta |
| `auditor-de-seguranca` | `seguranca-NN.md` | arquivos, subprocess, SSRF, segredos, dependências. Só aponta |
| `auditor-de-saude` | `saude.md` | CI, cobertura, código morto, dívida. Lista priorizada, sem veredito |
| `pesquisador-de-integracoes` | `integracoes-NN.md` | candidatos com fonte, auth, custo e termos. Não instala nada |
| `mantenedor-do-harness` | `harness-NN.md` | edita o harness quando pedido e registra o diff |

**A pasta da tarefa** é `storage/manutencao/<slug>/` (`tecnico.md:15-31`). Ela fica fora do git, como `storage/projects/`. O primeiro arquivo é `pedido.md`, escrito pelo orquestrador.

**Mudança, passo a passo** (`SKILL.md:30-40`):

1. `arquiteto` escreve o `plano.md`.
2. **Parada:** se a mudança toca API pública, schema, config, dependência nova ou mais de cinco arquivos, o plano vai ao usuário.
3. `testador` escreve um teste que falha, para bugs.
4. `desenvolvedor` implementa e roda ruff e os testes da área.
5. `testador` completa a cobertura e roda a suíte inteira.
6. `revisor-de-codigo` e `auditor-de-seguranca` rodam em paralelo.
7. Se algum disser `REVISAR`, o desenvolvedor corrige e os passos 5 e 6 rodam de novo. No máximo 2 rodadas.
8. Relatório final ao usuário. Nada é commitado sem o aval dele.

**Regras que os papéis seguem** (`tecnico.md:33-66`):

- comportamento novo vai em `app/services/`, para que API, WebUI e CLI recebam pelo mesmo `task.start()`;
- texto novo da WebUI entra em todos os `webui/i18n/*.json`;
- recursos pelo `app/paths.py`; arquivo de entrada pelo `app/utils/file_security.py`;
- config nova em `config.py` e em `config.example.toml`, nunca no `config.toml` do usuário;
- dependência só com `uv add`, com justificativa no plano;
- todo bug corrigido ganha teste que falhava antes.

**Checagens do CI**, que precisam passar antes de declarar pronto (`tecnico.md:51-57`):

```sh
uv run ruff check app cli.py main.py webui test docs/skill
uv run python -X utf8 -m pytest -q test
uv run python -X utf8 -m coverage run -m pytest -q test && uv run python -m coverage report  # fail_under = 70
```

Se a mudança toca `animations/`, roda também `npm run typecheck --prefix animations`.

**Vereditos** (`tecnico.md:68-73`): cada item é `bloqueia`, `importante` ou `detalhe`. Revisor e auditor de segurança terminam em `APROVADO` ou `REVISAR`. `REVISAR` quando há algum `bloqueia` ou três ou mais `importante`.

## Exemplo / percurso

Um pedido de "adicionar um provedor de LLM" toca API e config, então o plano vai ao usuário antes de qualquer código. O percurso completo, com arquivos, está em [[05 - Mudança pelo time técnico]].

## Armadilhas

- **A skill diz "seis papéis".** A descrição do frontmatter (`manutencao/SKILL.md:3`) e a do adaptador Claude listam seis. Hoje são oito, e a tabela de `AGENTS.md` (`AGENTS.md:102-109`) já tem os oito.
- **"Dois modos" no `AGENTS.md`.** O texto da linha 94 fala em dois modos. A skill tem quatro.
- **Não é o time de vídeo.** `tecnico.md:6` diz que o time de vídeo não mexe no código e este não produz vídeo. Um pedido de vídeo não vai para cá.
- **Git não é do time.** Nenhum papel faz commit, push ou PR (`tecnico.md:60-61`).
- **Checagem vermelha não passa.** "Checagens do CI vermelhas = não está pronto", qualquer que seja o veredito (`SKILL.md:68`).

> [!warning] unstable
> Todo este time é `status/unstable`: os papéis, os modos de integração e harness, e `storage/manutencao/`. Estado a confirmar na branch de origem. Ver [[Branches main e unstable]].

## Prática

1. Quantos modos e quantos papéis tem o time técnico hoje?
2. Uma mudança toca `config.py` e um arquivo de `webui/`. O que o arquiteto precisa colocar no plano antes de qualquer código?
3. Um revisor encontra dois itens `importante` e nenhum `bloqueia`. Qual é o veredito?

> [!faq]- Gabarito
> 1. Quatro modos (`manutencao/SKILL.md:8-12`) e oito papéis (`AGENTS.md:102-109`).
> 2. O plano precisa mostrar a mudança de config (mudança de API ou config exige parada, `SKILL.md:30-33`). Também precisa indicar a camada de serviço e os testes, e dizer que o `webui/i18n/*.json` muda em todos os idiomas.
> 3. `APROVADO`. `REVISAR` só com um `bloqueia` ou com três ou mais `importante` (`tecnico.md:72-73`).

## Conexões

- Anterior: [[Time de vídeo e contratos de arquivo]]. Ver também: [[Como contribuir]], [[Testes e CI]], [[Harness de agentes]].
- Exemplo: [[05 - Mudança pelo time técnico]].
- Canvas: [[05 - Time técnico.canvas|Canvas do time técnico]].
