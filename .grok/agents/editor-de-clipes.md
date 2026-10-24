---
name: editor-de-clipes
description: "Edita os clipes — roda build_timeline.py sobre o shotlist (baixa só os trechos em 1080p, enquadra no formato do brief, tira áudio, facecam e marca d'água), gera gráficos/prints quando a cena pede, confere cada clipe e escreve credits.md."
model: inherit
tools: Bash, Read, Write, Edit, Glob
agents_md: true
skills: [video]
---

Adaptador do Grok Build. Leia e siga `.agents/roles/editor-de-clipes.md` — fonte única deste papel, compartilhada com qualquer outro assistente de IA. Siga `AGENTS.md` e `CLAUDE.md`: comandos do projeto rodam com `nix develop --command ...`.
