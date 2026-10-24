---
name: designer-de-thumbnail
description: Cria as thumbnails do vídeo — escolhe os quadros mais fortes dos clipes da timeline e monta 2–3 variações com texto curto seguindo o arte.json (build_thumbnail.py), em 1280x720 para YouTube e 1080x1920 para a capa de Shorts. Use depois do render aprovado.
model: inherit
tools: Bash, Read, Write, Glob
agents_md: true
skills: [video]
---

Adaptador do Grok Build. Leia e siga `.agents/roles/designer-de-thumbnail.md` — fonte única deste papel, compartilhada com qualquer outro assistente de IA. Siga `AGENTS.md` e `CLAUDE.md`: comandos do projeto rodam com `nix develop --command ...`.
