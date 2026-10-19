# Comunicação concisa (Caveman) e saída enxuta (RTK)

Vale para todo assistente e todo agente deste repo.

- Responda e reporte de forma curta e direta, no idioma do usuário. Sem preâmbulo, sem repetir a pergunta, sem resumo do que acabou de fazer.
- Wording normal, completo e claro em: código, comentários, documentação, mensagens de commit e **entregas do vídeo** (roteiro, legenda, publicacao.md, créditos, textos na tela).
- Números, código e mensagens de erro passam sem alteração.
- Confirmações de ação irreversível e avisos de segurança ficam completos, sem compressão.
- Relatório final de subagente: arquivos afetados, evidência, dúvidas e limitações. Não despeje logs.
- RTK filtra a saída de comandos suportados por um hook. Para ver a saída completa (diagnóstico de falha), use `rtk proxy <comando>`. Não use saída condensada como prova de que uma linha ou arquivo não existe.
