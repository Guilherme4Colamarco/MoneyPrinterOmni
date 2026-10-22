---
name: manutencao
description: Muda ou audita o programa MoneyPrinterOmni com um time técnico (arquiteto, desenvolvedor, testador, revisor de código, auditor de segurança e auditor de saúde) — plano antes de codar, mudança na camada de serviço, testes, revisão e auditoria independentes e checagens do CI. Use quando pedirem para corrigir um bug, adicionar ou mudar uma função do programa, refatorar, ou auditar o código, a segurança ou a saúde do projeto.
---

# manutencao — mudar ou auditar o programa

Entrada: o pedido do usuário. Dois modos:
- **mudança**: corrigir bug, adicionar ou alterar função, refatorar;
- **auditoria**: só avaliar (código inteiro ou uma área) e entregar a lista priorizada, sem mudar nada.

Você orquestra. Cada etapa tem um papel em `.agents/roles/` (`arquiteto`, `desenvolvedor`,
`testador`, `revisor-de-codigo`, `auditor-de-seguranca`, `auditor-de-saude`):
- se a sua ferramenta tem subagentes, delegue cada papel a um, passando a pasta da tarefa e a etapa;
- se não tem, execute os papéis você mesmo, em sequência, lendo o arquivo de cada um antes.

Regras e pasta da tarefa em `.agents/tecnico.md`; comandos e arquitetura em `AGENTS.md`.

## 0. Pedido

Crie `storage/manutencao/<slug>/pedido.md`: o pedido em palavras do usuário, critérios de pronto,
o que fica fora. Se faltar algo que mude o resultado (comportamento esperado, compatibilidade),
pergunte antes.

## Modo mudança

1. `arquiteto` → `plano.md`: lê o código envolvido, lista arquivos, passos, riscos, testes e se as
   três portas de entrada são afetadas.
2. **Pare e mostre o plano ao usuário** quando a mudança mexe em API pública, schema, config,
   dependência nova, ou mais de ~5 arquivos. Mudança pequena segue direto.
3. `testador` (modo reprodução, só em bug) → teste que falha mostrando o bug.
4. `desenvolvedor` → implementa o plano, roda ruff e os testes da área → `mudancas-NN.md`.
5. `testador` (modo cobertura) → completa os testes e roda a suíte inteira e a cobertura → `testes-NN.md`.
6. Em paralelo: `revisor-de-codigo` → `revisao-NN.md` e `auditor-de-seguranca` → `seguranca-NN.md`.
7. Se algum disser `REVISAR`, o `desenvolvedor` corrige só os itens apontados e as etapas 5–6
   rodam de novo — no máximo 2 rodadas; depois disso, leve as pendências ao usuário.
8. Relatório final ao usuário: o que mudou (arquivos), saída das checagens do CI, vereditos,
   pendências. Nada é commitado sem o aval dele.

## Modo auditoria

1. Em paralelo: `auditor-de-saude` → `saude.md` e `auditor-de-seguranca` (modo varredura) →
   `seguranca-01.md`, ambos sobre a área pedida (padrão: o programa inteiro).
2. Junte numa lista única priorizada (severidade × esforço) e mostre ao usuário.
3. Para cada item que ele aprovar, rode o modo mudança com o item como pedido.

## Regras

- Um papel que só aponta (revisor, auditores) nunca edita código.
- Checagens do CI vermelhas = não está pronto, qualquer que seja o veredito.
- Sem commit, push ou PR sem pedido do usuário.
