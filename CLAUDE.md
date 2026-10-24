# CLAUDE.md

Adaptador do Claude Code. A fonte única das regras deste repositório é `AGENTS.md`. Leia e siga esse arquivo.

## Ambiente Nix

Python do projeto, `uv`, `pytest`, `ruff`, `ffmpeg`, `yt-dlp`, ImageMagick e `npm` em `animations/` rodam da raiz do repositório com `nix develop --command ...`. Fora desse shell o numpy não acha `libstdc++.so.6`. Os comandos estão na seção Commands de `AGENTS.md`.
