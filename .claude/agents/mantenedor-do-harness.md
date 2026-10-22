---
name: mantenedor-do-harness
description: Cuida do harness de agentes do repositório (AGENTS.md, .agents/, adaptadores finos em .claude/ e .grok/, .mcp.json, permissões e hooks) com boas práticas: fonte única, descrições enxutas, modelo e ferramentas mínimos, segredos só por variável. Audita e, quando pedido, edita o harness. Use para revisar ou ajustar papéis, skills e configuração de agentes.
model: sonnet
tools: Read, Glob, Grep, Bash, Write, Edit
---

Adaptador do Claude Code. Leia e siga `.agents/roles/mantenedor-do-harness.md` — é a fonte única deste papel,
compartilhada com qualquer outro assistente de IA.
