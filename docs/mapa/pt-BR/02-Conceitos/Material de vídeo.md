---
title: Material de vídeo
tags: [mapa, integracoes, status/unstable]
lang: pt-BR
sources: [app/services/material.py, app/services/task.py, app/services/video.py, app/services/cache_manager.py, app/services/material_cache.py, app/services/twelvelabs.py, cli.py, app/models/schema.py, app/services/video_project.py]
---
# Material de vídeo

[[00 - Índice|← Índice]]

A etapa de material traz os trechos de vídeo ou imagem, de banco de imagens, de geração por IA ou de arquivos locais, e o estágio `video` monta tudo.

## Ideia central

Existe uma função de entrada, `download_videos` (`app/services/material.py:2161`), que escolhe a fonte pelo `video_source`. Stock e IA usam chave e cobram por uso. A fonte `local` não faz chamada externa. O estágio final, `generate_final_videos` (`task.py:980`), junta o material com legenda e trilha.

## Como funciona

1. `get_video_materials` (`task.py:723`) valida a fonte contra `_SUPPORTED_VIDEO_SOURCES` (`task.py:97`): `pexels`, `pixabay`, `coverr`, `local`, `wavespeed`, `volcengine_seedance`, `ofox`, `metaso_minimax`, `muapi`, `loomloom` e `openai_image`.
2. Despacho em `download_videos`:
   - Stock: `_search_videos_with_cache` (`material.py:1853`) chama `search_videos_pexels` (`:341`), `search_videos_pixabay` (`:448`) ou `search_videos_coverr` (`:590`). Com ordem de roteiro, vai para `_download_videos_by_script_order` (`:2938`).
   - IA: `generate_videos_wavespeed` (`:805`), e os `_download_videos_*_on_demand` de Seedance (`:2486`), OFox (`:2599`), MuAPI (`:2704`) e Metaso (`:2824`).
   - `openai_image`: `generate_images_openai` (`:1677`) e `_download_videos_openai_image_on_demand` (`:1760`).
   - `local`: `video.preprocess_video` (`app/services/video.py:1955`).
   - `loomloom`: só pela WebUI. A CLI não aceita essa fonte (`cli.py:40`).
3. Cobrança confirmada. Fontes pagas exigem `--confirm-<provedor>-charge` na CLI (`cli.py:750-789`). A WebUI tem checkboxes `*_confirm_charge` (`webui/Main.py:772-776`). Não encontrei o campo equivalente na API.
4. Caches: `storage/cache_videos` (`material.py:1159`), `storage/cache_images` (`:1635`) e `storage/cache_material_search` (`app/services/material_cache.py:116`). A limpeza fica em `clean_video_cache` (`app/services/cache_manager.py:180`).
5. `twelvelabs` é opcional. Quando habilitado, `rerank_terms_by_subject` (`app/services/twelvelabs.py:113`) reordena os termos antes da busca (`task.py:416`). Precisa do extra `twelvelabs` instalado.
6. A montagem usa `combine_videos` (`video.py:973`) e `generate_video` (`video.py:1569`), que mistura áudio, legenda e trilha.

## Exemplo / percurso

```bash
uv run python cli.py --video-subject "Vida das abelhas" --video-source pexels
```

O estágio `materials` baixa clipes para `storage/cache_videos/`. O `script.json` da task ganha `material_sources`. O estágio `video` gera `storage/tasks/<id>/combined-0.mp4` e `final-0.mp4`, e atualiza `material_selections` no `script.json`.

Para `local`, o comando exige `--video-materials`. O mesmo `--stop-at terms` não tem efeito com `local` (`cli.py:728`).

> [!warning] unstable
> Estes itens vieram do merge do upstream Turbo v1.3.9, segundo o relatório de divergência, e estão marcados como instáveis:
> - Movimento de imagem `--image-motion static|zoom` (`cli.py:447`, `ImageMotion` em `app/models/schema.py:56`).
> - Servidor SDXL local em `docs/local-image-server/`, citado em `config.example.toml:204`. A busca no código do app não achou integração SDXL; só o servidor standalone existe. Estado a confirmar.
> - Provedor EmpirioLabs, em [[Provedores de LLM]].

## Armadilhas

- **Fonte paga sem confirmação.** A CLI sai com código 2 (entrada inválida) antes de gastar qualquer crédito.
- **`video_project.py` não faz parte do pipeline.** Nenhum módulo do app o importa. Ele serve para re-renderizar revisões locais: `python -m app.services.video_project --help`. Só os testes o usam.
- **LoomLoom só pela WebUI.** Via API, o pedido com essa fonte falha na etapa `materials`.
- **Cache é compartilhado.** `storage/cache_videos` não é por task. Limpe com cuidado.

## Prática

1. Quais fontes de stock existem, e quais funções de busca as atendem?
2. O que a CLI exige antes de usar `--video-source wavespeed`?
3. Por que `video_project.py` não é uma etapa do pipeline?

> [!faq]- Gabarito
> 1. Pexels, Pixabay e Coverr, pelas funções `search_videos_*` em `material.py` (`:341`, `:448`, `:590`).
> 2. A flag `--confirm-wavespeed-charge` (`cli.py:750`). Sem ela, a CLI sai com erro de entrada.
> 3. Porque nenhum módulo do pipeline o importa. Ele é uma ferramenta separada, rodada com `python -m`.

## Conexões

- [[Voz e legenda]] — a etapa anterior.
- [[Música e publicação]] — a trilha usada na etapa de vídeo.
- [[Pipeline e stop_at]] — onde a etapa `materials` entra.
- [[Chaves de configuração]] — as chaves de cada fonte.
- [[03 - Integrações.canvas|Canvas]]
