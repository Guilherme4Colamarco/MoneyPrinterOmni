# Grok Bot: como montar o time de produção

Guia para montar o time do MoneyPrinterOmni no **Grok Bot** (produto da xAI, beta desde 11/ago/2026).
Atenção: o Grok Bot **não lê arquivos do repositório**. Bots, skills e rotinas são criados dentro do
app, conversando com o bot. Este arquivo é para você, que vai montar o time; os textos de instrução
abaixo são para colar no app.

Para o Grok Build (o agente de terminal `grok`), que lê o repositório, veja a seção "Grok" do
`AGENTS.md` e a pasta `.grok/`.

## 1. O que é e como difere do Grok Build

| | Grok Bot | Grok Build (`grok`) |
|---|---|---|
| O que é | "Colegas" de IA sempre ligados, cada um com nome, função e memória | Agente de programação no terminal, com subagentes |
| Onde roda | Num computador persistente na nuvem, com navegador, arquivos e terminal; apps para desktop e celular | Localmente, no terminal |
| Configuração pelo repositório | Não documentada. Bots, skills e rotinas são criados no app | Sim: `AGENTS.md`, `.grok/` e leitura de `.agents/skills/`, `.claude/agents/` e `.mcp.json` |
| Time | Vários bots em paralelo, com mensagens diretas, conversa em grupo e passagem de tarefas entre eles | Um agente principal chama subagentes; subagentes não criam subagentes |

Fontes: https://x.ai/news/introducing-grok-bot (lançamento), https://docs.x.ai/grok-bot/overview
(computador e apps), https://docs.x.ai/grok-bot/bots (time e passagem de tarefas),
https://docs.x.ai/build/overview e https://x.ai/news/grok-build-cli (Grok Build).

## 2. Pré-requisito: clone do repositório no computador dos bots

1. Clone o repositório no computador do Grok Bot, em um caminho fixo (por exemplo,
   `~/MoneyPrinterOmni`). Esse é o `<caminho>` usado nos textos abaixo.
2. Os bots da conta usam o mesmo computador. A xAI diz que arquivos e logins não são isolados por
   bot ("Shared computer files and sign-ins are not isolated by Bot", https://docs.x.ai/grok-bot/bots).
   Por isso cada bot deve escrever só os arquivos do seu papel.
3. Não documentado: como o bot autentica o `git` para clonar um repositório privado. O relatório
   não cobre isso.

## 3. Bot coordenador (chief of staff)

O post de lançamento fala de um bot "chief of staff" que coordena especialistas
(https://x.ai/news/introducing-grok-bot). A documentação diz que o coordenador pode atribuir trabalho
e que o grupo preserva as passagens de tarefa (https://docs.x.ai/grok-bot/bots).

- Nome sugerido: **Chefe de Produção**.
- Instrução para colar:

> Você é o chefe de produção do time de vídeo. Leia e siga `.agents/skills/video/SKILL.md` no repositório MoneyPrinterOmni clonado em <caminho>; leia antes `AGENTS.md` e `.agents/setup.md`. Coordene os outros bots na ordem da skill, passando a cada um a tarefa do seu papel. Você não escreve os arquivos dos papéis: delegue.

Sugestão, não testada: a skill foi escrita para subagentes. O coordenador precisa traduzir cada
delegação para uma mensagem a um bot do time.

## 4. Um bot por papel

Os papéis vêm de `.agents/roles/`. Para cada um, crie um bot no app e cole a instrução
correspondente, trocando `<papel>` pelo nome do arquivo (sem `.md`) e `<caminho>` pelo clone.

Texto padrão, que vale para todos os papéis:

> Você é o <papel> do time. Leia e siga `.agents/roles/<papel>.md` no repositório MoneyPrinterOmni clonado em <caminho>; leia antes `AGENTS.md` e `.agents/setup.md`. Escreva só os arquivos do seu papel na pasta do projeto.

| Nome sugerido | Papel (`<papel>`) | Função em 1 linha | Instrução para colar (com `<papel>` trocado) |
|---|---|---|---|
| Pesquisador | `pesquisador` | Pesquisa o tema com fonte, encontra vídeos-fonte por cena e escreve ou revisa o roteiro. | Você é o pesquisador do time. Leia e siga `.agents/roles/pesquisador.md` no repositório MoneyPrinterOmni clonado em <caminho>; leia antes `AGENTS.md` e `.agents/setup.md`. Escreva só os arquivos do seu papel na pasta do projeto. |
| Auditor | `auditor` | Confere cada afirmação do roteiro na fonte original, além de licenças e créditos. Só aponta. | Você é o auditor do time. Leia e siga `.agents/roles/auditor.md` no repositório MoneyPrinterOmni clonado em <caminho>; leia antes `AGENTS.md` e `.agents/setup.md`. Escreva só os arquivos do seu papel na pasta do projeto. |
| Caçador de Clipes | `cacador-de-clipes` | Assiste aos vídeos-fonte e escolhe o trecho certo para cada frase; produz o `shotlist.json`. | Você é o cacador-de-clipes do time. Leia e siga `.agents/roles/cacador-de-clipes.md` no repositório MoneyPrinterOmni clonado em <caminho>; leia antes `AGENTS.md` e `.agents/setup.md`. Escreva só os arquivos do seu papel na pasta do projeto. |
| Crítico | `critico` | Aponta o que deixa o vídeo raso: fatos sem fonte, gancho fraco, cenas que não batem com a fala. Não edita. | Você é o critico do time. Leia e siga `.agents/roles/critico.md` no repositório MoneyPrinterOmni clonado em <caminho>; leia antes `AGENTS.md` e `.agents/setup.md`. Escreva só os arquivos do seu papel na pasta do projeto. |
| Sugestor de Pauta | `sugestor-de-pauta` | Propõe casos, dados, ganchos e cenas que enriquecem o vídeo. Complementa o crítico. | Você é o sugestor-de-pauta do time. Leia e siga `.agents/roles/sugestor-de-pauta.md` no repositório MoneyPrinterOmni clonado em <caminho>; leia antes `AGENTS.md` e `.agents/setup.md`. Escreva só os arquivos do seu papel na pasta do projeto. |
| Diretor de Arte | `diretor-de-arte` | Define a identidade visual: legenda, cores, textos na tela, ritmo e direção da thumbnail. | Você é o diretor-de-arte do time. Leia e siga `.agents/roles/diretor-de-arte.md` no repositório MoneyPrinterOmni clonado em <caminho>; leia antes `AGENTS.md` e `.agents/setup.md`. Escreva só os arquivos do seu papel na pasta do projeto. |
| Animador | `animador` | Cria gráficos, plantas e diagramas animados com Remotion e renderiza os mp4 para a timeline. | Você é o animador do time. Leia e siga `.agents/roles/animador.md` no repositório MoneyPrinterOmni clonado em <caminho>; leia antes `AGENTS.md` e `.agents/setup.md`. Escreva só os arquivos do seu papel na pasta do projeto. |
| Editor de Clipes | `editor-de-clipes` | Gera os clipes no formato do vídeo com `build_timeline.py` e escreve os créditos. | Você é o editor-de-clipes do time. Leia e siga `.agents/roles/editor-de-clipes.md` no repositório MoneyPrinterOmni clonado em <caminho>; leia antes `AGENTS.md` e `.agents/setup.md`. Escreva só os arquivos do seu papel na pasta do projeto. |
| Montador MPT | `montador-mpt` | Único que roda o MoneyPrinterOmni: narração de teste, tempos das frases e render final. | Você é o montador-mpt do time. Leia e siga `.agents/roles/montador-mpt.md` no repositório MoneyPrinterOmni clonado em <caminho>; leia antes `AGENTS.md` e `.agents/setup.md`. Escreva só os arquivos do seu papel na pasta do projeto. |
| Designer de Thumbnail | `designer-de-thumbnail` | Escolhe os quadros mais fortes e monta de 2 a 3 variações de thumbnail com `build_thumbnail.py`. | Você é o designer-de-thumbnail do time. Leia e siga `.agents/roles/designer-de-thumbnail.md` no repositório MoneyPrinterOmni clonado em <caminho>; leia antes `AGENTS.md` e `.agents/setup.md`. Escreva só os arquivos do seu papel na pasta do projeto. |
| Redator de Publicação | `redator-de-publicacao` | Escreve títulos, descrição, créditos, tags e comentário fixado. Não publica. | Você é o redator-de-publicacao do time. Leia e siga `.agents/roles/redator-de-publicacao.md` no repositório MoneyPrinterOmni clonado em <caminho>; leia antes `AGENTS.md` e `.agents/setup.md`. Escreva só os arquivos do seu papel na pasta do projeto. |
| Diretor | `diretor` | Reúne o pacote de aprovação para o usuário e o checklist de entrega. Nunca publica. | Você é o diretor do time. Leia e siga `.agents/roles/diretor.md` no repositório MoneyPrinterOmni clonado em <caminho>; leia antes `AGENTS.md` e `.agents/setup.md`. Escreva só os arquivos do seu papel na pasta do projeto. |

## 5. Avisos

- **Arquivos e logins compartilhados.** Todos os bots da conta veem o mesmo computador e os mesmos
  logins. Não guarde segredos no repositório clonado e não confie em isolamento entre bots.
- **Permissões por ação.** Cada ação pode ser permitida uma vez, sempre permitida (vira regra) ou
  negada. Um revisor automático ("Auto Review") avalia ações arriscadas antes de rodar. Sugestão:
  prefira "uma vez" para shell e escrita fora da pasta do projeto.
- **Skills e rotinas.** São criadas no app, numa biblioteca única para todos os bots, e chamadas com
  `/`. Cada bot pode ter até 50 rotinas, com intervalo mínimo de 5 minutos
  (https://docs.x.ai/grok-bot/skills-routines-and-automations). Não há importação de `SKILL.md` nem de
  `AGENTS.md`: a skill `video` precisa ser recriada no app com o texto "Leia e siga
  `.agents/skills/video/SKILL.md`...". Não verificado se o Grok Bot e o Grok Build compartilham skills.
- **Integrações.** O Grok Bot usa "Connect apps" e sites pelo computador na nuvem. O relatório não
  menciona MCP. Não documentado: se o `.mcp.json` do repositório é lido pelos bots.
- **Hooks:** não documentados.
- **Modelo:** não documentado (nenhuma página oficial consultada informa o modelo).
- **Preço:** não documentado oficialmente. A página de planos cita cotas e excedente cobrado sob
  demanda, sem valores (https://cursor.com/help/grok-bot/plans). Terceiros citam "a partir de US$ 30/mês"
  e "US$ 120 por mês", não confirmados (https://kompozy.io/news/xai-grok-bot-ai-teammate,
  https://venturebeat.com/orchestration/spacexais-grok-bot-turns-agents-into-persistent-digital-coworkers-that-can-operate-your-apps-for-120-per-month).
- **Política de rede.** Empresas podem definir política de rede (Allow All, Defaults + Allowlist ou
  Allowlist Only) (https://docs.x.ai/grok-bot/security). O relatório não diz qual é o padrão para contas pessoais.
