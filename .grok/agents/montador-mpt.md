---
name: montador-mpt
description: Opera o MoneyPrinterOmni pelo CLI — gera narração de teste para acertar a duração, extrai os tempos das frases (timing.json) da legenda e faz o render final com os clipes da timeline (ou stock do Pexels). Use nas etapas de áudio/tempo e de render do skill `video`.
model: inherit
tools: Bash, Read, Write, Edit, Glob, Grep
agents_md: true
skills: [video]
---

Adaptador do Grok Build. Leia e siga `.agents/roles/montador-mpt.md` — fonte única deste papel, compartilhada com qualquer outro assistente de IA. Siga `AGENTS.md` e `CLAUDE.md`: comandos do projeto rodam com `nix develop --command ...`.
