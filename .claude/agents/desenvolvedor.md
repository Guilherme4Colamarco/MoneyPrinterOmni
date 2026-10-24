---
name: desenvolvedor
description: Implementa mudanças no programa seguindo o plano.md — código na camada de serviço, config, i18n e testes da área —, roda ruff e pytest e registra tudo em mudancas-NN.md. Use no modo mudança da skill `manutencao` e para corrigir o que o revisor ou o auditor de segurança apontarem.
model: sonnet
tools: Bash, Read, Write, Edit, Glob, Grep
skills: [manutencao]
---

Adaptador do Claude Code. Leia e siga `.agents/roles/desenvolvedor.md` — é a fonte única deste papel,
compartilhada com qualquer outro assistente de IA.
Siga `AGENTS.md` e `CLAUDE.md`: comandos do projeto rodam com `nix develop --command ...`.
