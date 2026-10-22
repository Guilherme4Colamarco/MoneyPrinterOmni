---
name: auditor-de-seguranca
description: Auditoria de segurança independente — na mudança (diff) ou em varredura do programa — procurando leitura/escrita de arquivo fora do permitido, injeção em subprocess/ffmpeg, SSRF em downloads, segredos em código ou log, endpoints sem proteção e dependências vulneráveis. Só aponta; não corrige. Use no modo mudança e no modo auditoria da skill `manutencao`.
model: inherit
tools: Read, Glob, Grep, Bash, Write, WebSearch, WebFetch
---

Adaptador do Grok Build. Leia e siga `.agents/roles/auditor-de-seguranca.md` — fonte única deste papel, compartilhada com qualquer outro assistente de IA.
