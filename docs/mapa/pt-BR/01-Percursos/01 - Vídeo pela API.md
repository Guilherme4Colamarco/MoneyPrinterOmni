---
title: 01 - Vídeo pela API
tags: [mapa, percurso, status/stable]
aliases: [Percurso pela API]
lang: pt-BR
sources: [main.py, app/controllers/v1/video.py, app/controllers/v1/base.py, app/controllers/base.py, app/controllers/manager/base_manager.py, app/services/task.py, app/services/state.py, app/services/material_upload.py]
---
# 01 - Vídeo pela API

[[00 - Índice|← Índice]]

Um vídeo gerado por HTTP: você envia um JSON, recebe um `task_id` e acompanha a tarefa até os arquivos finais.

## Ideia central

A API não gera o vídeo na hora. `POST /api/v1/videos` registra a tarefa, coloca `tm.start` na fila e responde com o id. O trabalho roda em segundo plano. `GET /api/v1/tasks/{id}` mostra o andamento. Os arquivos ficam em `storage/tasks/<id>/`.

## Como funciona

1. **Sobe o servidor.** `python main.py` inicia o uvicorn em `app.asgi:app` (`main.py:12`). Com `listen_host = "0.0.0.0"` e `listen_port = 8080` (`config.example.toml:11-12`), a API escuta em todas as interfaces. A documentação fica em `/docs`.
2. **Envia o material (opcional).** Para material local, `POST /api/v1/video_materials` (multipart, campo `file`) grava o arquivo em `storage/local_videos/<uuid>.<ext>` e devolve o nome (`app/controllers/v1/video.py:477`).
3. **Cria a tarefa.** `POST /api/v1/videos` chama `create_video` (`app/controllers/v1/video.py:215`), que passa `stop_at="video"` para `create_task` (`video.py:235`). Essa função:
   - valida as cores da legenda e o caminho da fonte; erro vira 400;
   - grava o registro com `sm.state.update_task(task_id)` antes de enfileirar;
   - chama `task_manager.add_task(tm.start, ...)`. Se a fila estiver cheia, responde 429 e apaga o registro.
4. **Executa.** `add_task` reserva um slot e abre uma thread (`app/controllers/manager/base_manager.py:54`). `tm.start` chama `_run_pipeline` (`app/services/task.py:1519`), que percorre os estágios de [[Pipeline e stop_at]].
5. **Consulta.** `GET /api/v1/tasks/{id}` (`video.py:310`) devolve o estado. Quando `state` é `1` e `progress` é `100`, `videos` traz os caminhos finais.

## Exemplo / percurso

Testado com o servidor local e `MPT_HOME` apontando para uma pasta de teste. Nada precisa de chave de API: material local, roteiro enviado no corpo e voz `no-voice`.

Passo 1, o upload do clipe:

```sh
curl -F "file=@clip.mp4" http://127.0.0.1:8080/api/v1/video_materials
```

Resposta real:

```json
{"status":200,"message":"success","data":{"file":"b28b913225e64e538558ac0f05ace66c.mp4"}}
```

Passo 2, a criação. Corpo usado:

```json
{
  "video_subject": "Percurso pela API",
  "video_script": "Este é um roteiro de teste para o percurso pela API. Ele tem duas frases curtas.",
  "video_source": "local",
  "video_materials": [{"provider": "local", "url": "b28b913225e64e538558ac0f05ace66c.mp4"}],
  "voice_name": "no-voice",
  "subtitle_enabled": false
}
```

Com `video_script` preenchido, o LLM não é chamado (`app/services/task.py:358`, `generate_script`). Com `video_source` igual a `local`, a etapa de termos é pulada (`task.py:1686`). A resposta foi:

```json
{"status":200,"message":"success","data":{"task_id":"42a3123c-1a6f-4be7-95fd-85591cf935c8"}}
```

Passo 3, a consulta, cerca de 40 s depois. Campos relevantes:

- `state`: `1` (concluído); `progress`: `100`; `failed_stage`: `null`.
- `videos`: `["/tasks/42a3123c-1a6f-4be7-95fd-85591cf935c8/final-1.mp4"]`.
- `combined_videos`: `["/tasks/42a3123c-.../combined-1.mp4"]`.
- `audio_file`: `/tasks/42a3123c-.../audio.mp3`; `audio_duration`: `7`.

Arquivos gravados em `storage/tasks/42a3123c-1a6f-4be7-95fd-85591cf935c8/`:

| Arquivo | Quem grava | Observação |
|---|---|---|
| `script.json` | `save_script_data` (`task.py:424`) | chaves `params`, `script`, `search_terms` |
| `audio.mp3` | `generate_audio` (`task.py:601`) | silêncio do `no-voice`; duração estimada pelo texto |
| `combined-1.mp4` | `generate_final_videos` (`task.py:1026`) | vídeo concatenado |
| `final-1.mp4` | `generate_final_videos` (`task.py:1082`) | vídeo final |

Por que funciona: a API só guarda estado e enfileira. Quem escreve os arquivos é o pipeline, sempre dentro de `storage/tasks/<id>/`. A consulta devolve os caminhos prontos para o cliente baixar.

Detalhe da resposta: `materials` sai como caminho absoluto do servidor, porque `_task_response_data` (`video.py:142`) só converte `videos`, `combined_videos`, `audio_file` e `subtitle_path` em URL. Veja [[Rotas da API]].

## Armadilhas

- **200 não quer dizer que o vídeo ficou pronto.** A criação responde antes de os estágios rodarem. Uma falha aparece depois, em `GET /tasks/{id}`, com `failed_stage` e `error`.
- **Validação parcial no HTTP.** `video_source` não é checado na rota. Um valor fora da lista falha na pré-checagem do pipeline (`task.py:1543`), e não com 400.
- **Estado só em memória.** Sem Redis, reiniciar a API apaga o estado. `GET /api/v1/tasks/{id}` passa a dar 404, mas `storage/tasks/<id>/` continua com os arquivos e eles seguem em `/tasks/...`.
- **Fila cheia.** Com os padrões (`max_concurrent_tasks = 5`, `max_queued_tasks = 100`), com 5 tarefas rodando e 100 na fila, a próxima recebe 429.

## Prática

1. Qual função recebe `POST /api/v1/videos` e qual `stop_at` ela passa ao pipeline?
2. Depois de `state: 1`, em que pasta estão os vídeos, e que caminho a API devolve?
3. Por que a criação responde 200 mesmo quando a tarefa vai falhar mais tarde?

> [!faq]- Gabarito
> 1. `create_video` (`app/controllers/v1/video.py:215`) chama `create_task` com `stop_at="video"`.
> 2. Em `storage/tasks/<task_id>/final-N.mp4`. A API devolve `/tasks/<task_id>/final-N.mp4`.
> 3. A tarefa só foi enfileirada. O pipeline roda depois, em outra thread, e o resultado (sucesso ou falha) vai para o estado da tarefa.

## Conexões

- [[Visão geral]]: onde esta porta se encaixa no programa.
- [[Pipeline e stop_at]]: os estágios que a tarefa percorre.
- [[Estado das tasks e fila]]: de onde vêm o 429 e o 404.
- [[Portas de entrada]]: o que a API valida, comparado à WebUI e ao CLI.
- [[Rotas da API]]: tabela completa das rotas.
- [[Flags do CLI]]: o mesmo pipeline, por linha de comando.
- Canvas: [[01 - Pipeline.canvas|Canvas]].
