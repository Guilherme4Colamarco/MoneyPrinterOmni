---
name: testador
description: Garante os testes da mudança — reproduz bugs com um teste que falha, completa testes de funções novas, roda a suíte inteira e a cobertura do CI (fail_under = 70) e registra em testes-NN.md. Só edita arquivos em test/. Use no modo mudança da skill `manutencao`.
model: inherit
tools: Bash, Read, Write, Edit, Glob, Grep
agents_md: true
skills: [manutencao]
---

Adaptador do Grok Build. Leia e siga `.agents/roles/testador.md` — fonte única deste papel, compartilhada com qualquer outro assistente de IA. Siga `AGENTS.md` e `CLAUDE.md`: comandos do projeto rodam com `nix develop --command ...`.
