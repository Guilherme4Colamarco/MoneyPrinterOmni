---
title: Estado das tasks e fila
tags: [mapa, conceito, status/stable]
aliases: [Estado e fila]
lang: pt-BR
sources: [app/services/state.py, app/controllers/manager/base_manager.py, app/controllers/manager/memory_manager.py, app/controllers/manager/redis_manager.py, app/controllers/v1/video.py, app/services/task.py, app/services/webui_task.py, app/models/const.py, app/asgi.py]
---
# Estado das tasks e fila

[[00 - Índice|← Índice]]

Cada tarefa tem um registro de estado, em memória ou no Redis. Um gerenciador de fila decide se a tarefa roda já, espera ou é recusada.

## Ideia central

Há dois componentes separados. O **estado** (`app/services/state.py`) guarda o que cada tarefa está fazendo. A **fila** (`app/controllers/manager/`) controla quantas tarefas rodam ao mesmo tempo. A API e a WebUI têm cada uma sua fila. O CLI não tem fila.

## Como funciona

1. **Estado.** A tarefa tem `state` (`app/models/const.py:25-27`):
   - `-1` = falhou;
   - `4` = processando;
   - `1` = concluída.

   Campos extras, como `progress`, `failed_stage`, `error`, `videos` e `cross_post_state`, vão no mesmo registro. `cross_post_state` tem `pending`, `processing`, `complete` ou `failed`.
2. **Dois backends.** `MemoryState` (`state.py:69`) guarda um dicionário na memória, com um lock. `RedisState` (`state.py:134`) guarda um hash por tarefa. Qual deles vale é escolhido em `state.py:317`, pelo `enable_redis` do config. O Redis usa HSET e scripts Lua que checam o dono (`state.py:221`, `state.py:264`).
3. **Fila.** `TaskManager.add_task` (`app/controllers/manager/base_manager.py:54`) decide, sob um lock:
   - se há menos tarefas rodando que `max_concurrent_tasks`, reserva um slot e abre uma thread (`execute_task`, `base_manager.py:86`);
   - senão, se a fila tem menos de `max_queued_tasks` itens, enfileira;
   - senão, levanta `TaskQueueFullError` (`base_manager.py:8`, `:78`).
4. **Implementações.** `InMemoryTaskManager` (`memory_manager.py:7`) guarda a fila na memória. `RedisTaskManager` (`redis_manager.py:29`) guarda a fila no Redis e, no início da API, retoma as tarefas que estavam na fila (`redis_manager.py:42`, chamado pelo `application_lifespan` em `app/asgi.py:24`).
5. **Limites.** `max_concurrent_tasks = 5` e `max_queued_tasks = 100` por padrão (`config.example.toml:573-574`). A WebUI tem a sua própria fila, com `max_concurrent_tasks=1` fixo (`app/services/webui_task.py:24`).
6. **Traduções para HTTP.** A API traduz as exceções assim:
   - `TaskQueueFullError` vira **429** e o registro criado é apagado (`app/controllers/v1/video.py:268` e `:272-277`);
   - delete de tarefa ocupada vira **409** (`video.py:345`). "Ocupada" é o que `is_task_busy` diz (`app/services/task.py:117`): estado `4` ou `cross_post_state` ativo;
   - tarefa inexistente vira **404** (`video.py:310`, `:333`).

## Exemplo / percurso

Com os padrões da API, cinco tarefas rodam, e as seguintes entram na fila:

- tarefas 1 a 5: começam já, `state=4`;
- tarefas 6 a 105: ficam na fila, `state=4` no registro, esperando um slot;
- tarefa 106: `add_task` levanta `TaskQueueFullError`. A API responde `429`, o registro é apagado, e a mensagem é `task queue is full, please try again later`.

Um `DELETE /api/v1/tasks/{id}` numa tarefa em execução responde `409 task is still running`. Depois que ela termina, o mesmo `DELETE` apaga `storage/tasks/<id>/` e o registro.

Verificado nesta documentação: depois de reiniciar a API com estado em memória, `GET /api/v1/tasks/{id}` deu 404, mas o arquivo `final-1.mp4` continuou acessível em `/tasks/...`. O estado se perde; os arquivos ficam.

## Armadilhas

- **Limites são por processo.** Dois processos têm duas filas. Com `webui` e `api` separados, o limite total é a soma dos dois, e nenhum deles vê a fila do outro.
- **Sem Redis, reiniciar apaga o estado.** Os arquivos continuam em disco. A consulta pelo id devolve 404.
- **O Redis é confiado.** Valores do Redis voltam por `ast.literal_eval` (`state.py:300`). O Redis precisa ficar privado, sem acesso de escrita por terceiros.
- **Publicação em rede não sobrevive ao restart.** A publicação roda num pool de duas threads, fora da fila. Ao subir, a API marca como falhas as publicações interrompidas (`recover_interrupted_cross_posts`, `app/services/task.py:1217`).

## Prática

1. Quais são os três valores de `state` e o que significa cada um?
2. Com `max_concurrent_tasks=5` e `max_queued_tasks=100`, qual é a tarefa que recebe 429?
3. Por que `DELETE` numa tarefa com `cross_post_state` ativo responde 409, mesmo que a geração do vídeo tenha terminado?

> [!faq]- Gabarito
> 1. `-1` falhou, `4` processando, `1` concluída (`app/models/const.py:25-27`).
> 2. A 106ª tarefa simultânea. Cinco rodam e cem esperam na fila (`base_manager.py:54-78`).
> 3. Porque `is_task_busy` considera também a publicação em rede, que ainda lê a pasta da tarefa (`app/services/task.py:117`).

## Conexões

- [[Pipeline e stop_at]]: o que a tarefa faz enquanto está em `state=4`.
- [[Portas de entrada]]: quem usa a fila e quem não usa.
- [[Visão geral]]: por que a API, a WebUI e o CLI são processos separados.
- [[Rotas da API]]: os códigos 404, 409 e 429 em cada rota.
- [[Configuração e travas]]: `max_concurrent_tasks`, `max_queued_tasks` e `enable_redis`.
- Canvas: [[02 - Portas de entrada.canvas|Canvas]].
