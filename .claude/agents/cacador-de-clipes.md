---
name: cacador-de-clipes
description: “Assiste” vídeos-fonte (baixa em baixa resolução, gera contact sheets e quadros com horário exato, olha as imagens) e escolhe o trecho certo para cada frase da narração. Produz o shotlist.json. Use depois que o montador-mpt gerar o timing.json.
model: sonnet
tools: Bash, Read, Write, Glob, Grep, WebSearch, mcp__yt-dlp, mcp__apify
skills: [video]
---

Adaptador do Claude Code. Leia e siga `.agents/roles/cacador-de-clipes.md` — é a fonte única deste papel,
compartilhada com qualquer outro assistente de IA.
Siga `AGENTS.md` e `CLAUDE.md`: comandos do projeto rodam com `nix develop --command ...`.
