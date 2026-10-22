window.MAPA = {
 "langs": {
  "pt-BR": {
   "sections": {
    "walk": "Percursos",
    "concept": "Conceitos",
    "canvas": "Canvas",
    "ref": "Referência"
   },
   "folders": {
    "walk": "01-Percursos",
    "concept": "02-Conceitos",
    "canvas": "03-Canvas",
    "ref": "04-Referência"
   },
   "index": {
    "title": "00 - Índice",
    "body": "# 00 - Índice\n\nApostila 4D do MoneyPrinterOmni: notas curtas ligadas entre si e canvas que desenham cada fluxo. Comece pelo [[Visão geral]] ou pelo canvas [[00 - Geral.canvas|Geral]]. O site em `docs/mapa/site/index.html` mostra o mesmo conteúdo.\n\n> [!info] Estado dos recursos\n> Cada nota tem a tag `status/stable` (já na `main`) ou `status/unstable` (só na branch `unstable`). Veja [[Branches main e unstable]].\n\n## Percursos\n\n- [[01 - Vídeo pela API]]: Um pedido `POST /api/v1/videos` do começo ao fim.\n- [[02 - Vídeo pelo CLI]]: O mesmo vídeo pelo `cli.py`, com `--stop-at` e saída em JSON.\n- [[03 - Vídeo pela WebUI]]: O caminho da WebUI: fila, trava de configuração e progresso.\n- [[04 - Vídeo pelo time de agentes]]: Um vídeo pelo time de agentes, do tema à entrega.\n- [[05 - Mudança pelo time técnico]]: Uma mudança no programa conduzida pelo time técnico.\n\n## Conceitos\n\n- [[Visão geral]]: O programa em uma tela.\n- [[Pipeline e stop_at]]: Os estágios, o que cada um grava e onde `stop_at` corta.\n- [[Estado das tasks e fila]]: Estados, fila, memória e Redis.\n- [[Portas de entrada]]: API, WebUI e CLI lado a lado.\n- [[Configuração e travas]]: `config.toml`, travas e caminhos de recursos.\n- [[Provedores de LLM]]: O registro de provedores e como adicionar um.\n- [[Assinaturas em vez de chaves]]: Login por assinatura no lugar de chave de API.\n- [[Voz e legenda]]: TTS, pausas e os dois caminhos de legenda.\n- [[Material de vídeo]]: Bancos de vídeo, IA, arquivos locais e caches.\n- [[Música e publicação]]: Trilha de fundo e cross-post.\n- [[Harness de agentes]]: `AGENTS.md` + `.agents/` como fonte única.\n- [[Adaptadores Claude e Grok]]: Os arquivos finos que apontam para `.agents/`.\n- [[MCP e permissões]]: Servidores MCP, allow/deny e segredos.\n- [[Time de vídeo e contratos de arquivo]]: Os papéis, as etapas e a pasta do projeto.\n- [[Time técnico]]: Quem muda e audita o código do programa.\n- [[Perfis de canal]]: Um perfil por canal: identidade, tom, cuidados.\n- [[Animações com Remotion]]: Gráficos animados que entram na timeline.\n- [[Omni e Turbo]]: O que veio do Turbo e o que o Omni acrescentou.\n- [[Branches main e unstable]]: O que mora em cada branch e como sobe.\n- [[Como contribuir]]: Comandos, convenções e fluxo de PR.\n- [[Testes e CI]]: Suíte, cobertura e o CI.\n\n## Referência\n\n- [[Rotas da API]]: Todas as rotas, handlers e autenticação.\n- [[Flags do CLI]]: Todas as flags de `cli.py`.\n- [[Chaves de configuração]]: As chaves do `config.example.toml`.\n- [[Provedores e adaptadores]]: Provedores de LLM, voz, material e música.\n- [[Contratos JSON dos agentes]]: `sources`, `timing`, `shotlist`, `music`, `arte`.\n- [[Papéis e modelos]]: Os papéis, seus modelos e ferramentas.\n\n## Canvas\n\n- [[00 - Geral.canvas|00 - Geral]]: Tudo em um desenho.\n- [[01 - Pipeline.canvas|01 - Pipeline]]: O fluxo dos estágios.\n- [[02 - Portas de entrada.canvas|02 - Portas de entrada]]: Três portas, um pipeline.\n- [[03 - Integrações.canvas|03 - Integrações]]: Cada integração ligada ao estágio que a usa.\n- [[04 - Time de vídeo.canvas|04 - Time de vídeo]]: As 13 etapas e os papéis.\n- [[05 - Time técnico.canvas|05 - Time técnico]]: Modos de mudança e de auditoria.\n- [[06 - Omni e Turbo.canvas|06 - Omni e Turbo]]: Linha do tempo do fork.\n- [[07 - Branches.canvas|07 - Branches]]: main, unstable e PRs.\n"
   },
   "notes": [
    {
     "id": "p1",
     "section": "walk",
     "title": "01 - Vídeo pela API",
     "tags": [
      "mapa",
      "percurso"
     ],
     "status": "stable",
     "sources": [
      "main.py",
      "app/controllers/v1/video.py",
      "app/controllers/v1/base.py",
      "app/controllers/base.py",
      "app/controllers/manager/base_manager.py",
      "app/services/task.py",
      "app/services/state.py",
      "app/services/material_upload.py"
     ],
     "body": "# 01 - Vídeo pela API\n\n[[00 - Índice|← Índice]]\n\nUm vídeo gerado por HTTP: você envia um JSON, recebe um `task_id` e acompanha a tarefa até os arquivos finais.\n\n## Ideia central\n\nA API não gera o vídeo na hora. `POST /api/v1/videos` registra a tarefa, coloca `tm.start` na fila e responde com o id. O trabalho roda em segundo plano. `GET /api/v1/tasks/{id}` mostra o andamento. Os arquivos ficam em `storage/tasks/<id>/`.\n\n## Como funciona\n\n1. **Sobe o servidor.** `python main.py` inicia o uvicorn em `app.asgi:app` (`main.py:12`). Com `listen_host = \"0.0.0.0\"` e `listen_port = 8080` (`config.example.toml:11-12`), a API escuta em todas as interfaces. A documentação fica em `/docs`.\n2. **Envia o material (opcional).** Para material local, `POST /api/v1/video_materials` (multipart, campo `file`) grava o arquivo em `storage/local_videos/<uuid>.<ext>` e devolve o nome (`app/controllers/v1/video.py:477`).\n3. **Cria a tarefa.** `POST /api/v1/videos` chama `create_video` (`app/controllers/v1/video.py:215`), que passa `stop_at=\"video\"` para `create_task` (`video.py:235`). Essa função:\n   - valida as cores da legenda e o caminho da fonte; erro vira 400;\n   - grava o registro com `sm.state.update_task(task_id)` antes de enfileirar;\n   - chama `task_manager.add_task(tm.start, ...)`. Se a fila estiver cheia, responde 429 e apaga o registro.\n4. **Executa.** `add_task` reserva um slot e abre uma thread (`app/controllers/manager/base_manager.py:54`). `tm.start` chama `_run_pipeline` (`app/services/task.py:1519`), que percorre os estágios de [[Pipeline e stop_at]].\n5. **Consulta.** `GET /api/v1/tasks/{id}` (`video.py:310`) devolve o estado. Quando `state` é `1` e `progress` é `100`, `videos` traz os caminhos finais.\n\n## Exemplo / percurso\n\nTestado com o servidor local e `MPT_HOME` apontando para uma pasta de teste. Nada precisa de chave de API: material local, roteiro enviado no corpo e voz `no-voice`.\n\nPasso 1, o upload do clipe:\n\n```sh\ncurl -F \"file=@clip.mp4\" http://127.0.0.1:8080/api/v1/video_materials\n```\n\nResposta real:\n\n```json\n{\"status\":200,\"message\":\"success\",\"data\":{\"file\":\"b28b913225e64e538558ac0f05ace66c.mp4\"}}\n```\n\nPasso 2, a criação. Corpo usado:\n\n```json\n{\n  \"video_subject\": \"Percurso pela API\",\n  \"video_script\": \"Este é um roteiro de teste para o percurso pela API. Ele tem duas frases curtas.\",\n  \"video_source\": \"local\",\n  \"video_materials\": [{\"provider\": \"local\", \"url\": \"b28b913225e64e538558ac0f05ace66c.mp4\"}],\n  \"voice_name\": \"no-voice\",\n  \"subtitle_enabled\": false\n}\n```\n\nCom `video_script` preenchido, o LLM não é chamado (`app/services/task.py:358`, `generate_script`). Com `video_source` igual a `local`, a etapa de termos é pulada (`task.py:1686`). A resposta foi:\n\n```json\n{\"status\":200,\"message\":\"success\",\"data\":{\"task_id\":\"42a3123c-1a6f-4be7-95fd-85591cf935c8\"}}\n```\n\nPasso 3, a consulta, cerca de 40 s depois. Campos relevantes:\n\n- `state`: `1` (concluído); `progress`: `100`; `failed_stage`: `null`.\n- `videos`: `[\"/tasks/42a3123c-1a6f-4be7-95fd-85591cf935c8/final-1.mp4\"]`.\n- `combined_videos`: `[\"/tasks/42a3123c-.../combined-1.mp4\"]`.\n- `audio_file`: `/tasks/42a3123c-.../audio.mp3`; `audio_duration`: `7`.\n\nArquivos gravados em `storage/tasks/42a3123c-1a6f-4be7-95fd-85591cf935c8/`:\n\n| Arquivo | Quem grava | Observação |\n|---|---|---|\n| `script.json` | `save_script_data` (`task.py:424`) | chaves `params`, `script`, `search_terms` |\n| `audio.mp3` | `generate_audio` (`task.py:601`) | silêncio do `no-voice`; duração estimada pelo texto |\n| `combined-1.mp4` | `generate_final_videos` (`task.py:1026`) | vídeo concatenado |\n| `final-1.mp4` | `generate_final_videos` (`task.py:1082`) | vídeo final |\n\nPor que funciona: a API só guarda estado e enfileira. Quem escreve os arquivos é o pipeline, sempre dentro de `storage/tasks/<id>/`. A consulta devolve os caminhos prontos para o cliente baixar.\n\nDetalhe da resposta: `materials` sai como caminho absoluto do servidor, porque `_task_response_data` (`video.py:142`) só converte `videos`, `combined_videos`, `audio_file` e `subtitle_path` em URL. Veja [[Rotas da API]].\n\n## Armadilhas\n\n- **200 não quer dizer que o vídeo ficou pronto.** A criação responde antes de os estágios rodarem. Uma falha aparece depois, em `GET /tasks/{id}`, com `failed_stage` e `error`.\n- **Validação parcial no HTTP.** `video_source` não é checado na rota. Um valor fora da lista falha na pré-checagem do pipeline (`task.py:1543`), e não com 400.\n- **Estado só em memória.** Sem Redis, reiniciar a API apaga o estado. `GET /api/v1/tasks/{id}` passa a dar 404, mas `storage/tasks/<id>/` continua com os arquivos e eles seguem em `/tasks/...`.\n- **Fila cheia.** Com os padrões (`max_concurrent_tasks = 5`, `max_queued_tasks = 100`), com 5 tarefas rodando e 100 na fila, a próxima recebe 429.\n\n## Prática\n\n1. Qual função recebe `POST /api/v1/videos` e qual `stop_at` ela passa ao pipeline?\n2. Depois de `state: 1`, em que pasta estão os vídeos, e que caminho a API devolve?\n3. Por que a criação responde 200 mesmo quando a tarefa vai falhar mais tarde?\n\n> [!faq]- Gabarito\n> 1. `create_video` (`app/controllers/v1/video.py:215`) chama `create_task` com `stop_at=\"video\"`.\n> 2. Em `storage/tasks/<task_id>/final-N.mp4`. A API devolve `/tasks/<task_id>/final-N.mp4`.\n> 3. A tarefa só foi enfileirada. O pipeline roda depois, em outra thread, e o resultado (sucesso ou falha) vai para o estado da tarefa.\n\n## Conexões\n\n- [[Visão geral]]: onde esta porta se encaixa no programa.\n- [[Pipeline e stop_at]]: os estágios que a tarefa percorre.\n- [[Estado das tasks e fila]]: de onde vêm o 429 e o 404.\n- [[Portas de entrada]]: o que a API valida, comparado à WebUI e ao CLI.\n- [[Rotas da API]]: tabela completa das rotas.\n- [[Flags do CLI]]: o mesmo pipeline, por linha de comando.\n- Canvas: [[01 - Pipeline.canvas|Canvas]].\n"
    },
    {
     "id": "p2",
     "section": "walk",
     "title": "02 - Vídeo pelo CLI",
     "tags": [
      "mapa",
      "percurso"
     ],
     "status": "stable",
     "sources": [
      "cli.py",
      "app/services/task.py",
      "app/models/schema.py",
      "app/services/task_artifacts.py"
     ],
     "body": "# 02 - Vídeo pelo CLI\n\n[[00 - Índice|← Índice]]\n\nO CLI é a porta mais direta: um comando, uma tarefa, um JSON na saída. Não há fila nem trava de configuração. A chamada é síncrona.\n\n## Ideia central\n\n`cli.py` monta os parâmetros, copia os arquivos locais para dentro do programa e chama `tm.start(...)` no mesmo processo, com `allow_server_file_input=True`. O processo só termina quando o pipeline termina. O resultado vai para o stdout como uma linha de JSON.\n\n## Como funciona\n\n1. **Entrada.** `parse_args` (`cli.py:250`) define as flags. Os valores aceitos ficam em constantes: `_PIPELINE_STAGES` (`cli.py:33`) e `_CLI_VIDEO_SOURCES` (`cli.py:40`). Valor fora da lista é erro de argumento, com saída 2.\n2. **Montagem.** `build_video_params` (`cli.py:916`) cria o `VideoParams`. Sem `--video-subject` nem `--video-script`, `parser.error` sai com 2 (`cli.py:724`). `--video-source local` com `--stop-at terms` também sai com 2 (`cli.py:726`).\n3. **Arquivos locais.** `prepare_cli_files` (`cli.py:1643`) valida os materiais. Quem vem de fora de `storage/local_videos` é copiado para lá com o nome `cli-material-<hex>.<ext>` (`_prepare_cli_materials`, `cli.py:1597`).\n4. **Execução.** `run_cli` (`cli.py:1735`) chama `tm.start(task_id=..., params=..., stop_at=args.stop_at, allow_server_file_input=True)` (`cli.py:1766`). O `task_id` é gerado, ou vem de `--task-id`.\n5. **Saída.** Sucesso: uma linha `{\"task_id\": ..., \"result\": {...}}` no stdout e saída 0 (`cli.py:1791-1792`). Logs vão para o stderr (`cli.py:1742`).\n\n## Exemplo / percurso\n\nOs comandos abaixo foram executados nesta documentação, com `MPT_HOME` em uma pasta de teste e ffmpeg instalado.\n\n**Vídeo completo, com material local e sem voz.**\n\n```sh\nuv run python cli.py \\\n  --video-script \"Este é um roteiro de teste para o percurso pelo CLI. Ele serve para conferir o JSON de saída.\" \\\n  --voice-name no-voice --video-source local \\\n  --video-materials \"./clip.mp4\" --stop-at video\n```\n\nSaída (stdout), com os caminhos encurtados:\n\n```json\n{\"task_id\": \"a7b55e12-7b16-46cb-9edd-6ca06b2afcad\", \"result\": {\n  \"videos\": [\"storage/tasks/a7b55e12-.../final-1.mp4\"],\n  \"combined_videos\": [\"storage/tasks/a7b55e12-.../combined-1.mp4\"],\n  \"script\": \"Este é um roteiro de teste para o percurso pelo CLI. Ele serve para conferir o JSON de saída.\",\n  \"terms\": \"\",\n  \"audio_file\": \"storage/tasks/a7b55e12-.../audio.mp3\",\n  \"audio_duration\": 8,\n  \"subtitle_path\": \"storage/tasks/a7b55e12-.../subtitle.srt\",\n  \"materials\": [\"storage/local_videos/cli-material-7bc07fd9c63148cf9dea3af5dc6c2313.mp4\"],\n  \"cross_post_state\": null, \"cross_post_results\": null, \"cross_post_error\": null,\n  \"cross_post_owner\": null, \"warnings\": null}}\n```\n\nNeste caso o CLI devolve caminhos absolutos do disco, não URLs. Saída 0. Na execução, o log avisou que o clipe (4 s) era menor que o áudio (8 s) e que ele seria repetido (`video.py:1245`).\n\n**Só até o áudio (`--stop-at audio`).** A saída tem só o resultado daquele estágio:\n\n```sh\nuv run python cli.py --video-script \"Roteiro curto para o teste de áudio.\" --voice-name no-voice --stop-at audio\n```\n\n```json\n{\"task_id\": \"3a942da8-f38b-4cec-a65f-cc2bf8045a53\", \"result\": {\"audio_file\": \"storage/tasks/3a942da8-.../audio.mp3\", \"audio_duration\": 4}}\n```\n\nSaída 0. Nenhum vídeo foi gerado, e o ffmpeg nem precisou ser chamado para o vídeo.\n\n**Dois códigos de erro.**\n\n```sh\nuv run python cli.py --video-subject \"teste\" --video-source foo   # saída 2\n```\n\nO argparse recusa o valor antes de qualquer tarefa começar: `invalid choice: 'foo' (choose from 'pexels', ...)`. Nenhum JSON é impresso.\n\n```sh\nuv run python cli.py --video-subject \"Teste de falha\" --stop-at script   # saída 1, sem chave do LLM\n```\n\nO LLM devolve `Error: moonshot: api_key is not set...`. O pipeline marca a falha no estágio `script` e o CLI sai com 1. O stdout fica vazio, porque não há vídeo para listar.\n\nResumo dos códigos:\n\n| Saída | Quando | O que aparece no stdout |\n|---|---|---|\n| 0 | tarefa concluída | JSON com `task_id` e `result` |\n| 1 | falha do pipeline ou exceção inesperada | nada, ou o JSON parcial se já houver `videos` |\n| 2 | argumento inválido, manifesto inválido ou falta de assunto | nada |\n\n## Armadilhas\n\n- **Caminho fora de `storage/local_videos` é copiado.** O arquivo original não é usado depois. Confira `storage/local_videos` se o disco encher.\n- **O CLI aceita caminhos absolutos para áudio customizado.** Isso só existe aqui, porque `allow_server_file_input=True` (`cli.py:1773`). API e WebUI não aceitam (veja [[Portas de entrada]]).\n- **`--stop-at` vale para o lote inteiro.** Em `--batch-file`, cada objeto do manifesto não define `--stop-at`; ele vem da linha de comando (`cli.py:1191`).\n- **`stop_at=terms` com material local é erro.** A etapa de termos não existe para `local`, então o CLI recusa a combinação com saída 2 (`cli.py:726`).\n\n## Prática\n\n1. Qual saída de código o CLI usa quando o argparse recusa um valor?\n2. Por que `--stop-at audio` não precisa de LLM quando há `--video-script`?\n3. Com `--video-source local`, o que acontece com um arquivo que está fora de `storage/local_videos`?\n\n> [!faq]- Gabarito\n> 1. Saída 2 (`parser.error` do argparse). Nenhum JSON é impresso.\n> 2. Porque o roteiro foi passado com `--video-script`. `generate_script` só chama o LLM quando o roteiro está vazio (`app/services/task.py:358`).\n> 3. É copiado para `storage/local_videos/cli-material-<hex>.<ext>` (`cli.py:1597`), e a cópia é que entra no vídeo.\n\n## Conexões\n\n- [[Visão geral]]: o CLI é a terceira das três portas.\n- [[Pipeline e stop_at]]: o que `--stop-at` interrompe e o que cada estágio grava.\n- [[Portas de entrada]]: a comparação entre API, WebUI e CLI.\n- [[Flags do CLI]]: a lista completa de flags, padrões e códigos de saída.\n- [[01 - Vídeo pela API]]: o mesmo pipeline, por HTTP.\n- Canvas: [[01 - Pipeline.canvas|Canvas]].\n"
    },
    {
     "id": "p3",
     "section": "walk",
     "title": "03 - Vídeo pela WebUI",
     "tags": [
      "mapa",
      "percurso"
     ],
     "status": "unstable",
     "sources": [
      "webui/Main.py",
      "app/services/webui_task.py",
      "app/config/config.py",
      "app/services/task.py",
      "app/utils/logging_utils.py"
     ],
     "body": "# 03 - Vídeo pela WebUI\n\n[[00 - Índice|← Índice]]\n\nA WebUI é uma página Streamlit: você preenche as colunas, clica em gerar e acompanha o log ao vivo. Por baixo, ela usa a mesma `task.start()` da API, com uma fila própria e uma trava de configuração.\n\n> [!warning] unstable\n> O painel de logs por tarefa e os controles de diagnóstico (Interface > Diagnóstico, `webui/Main.py:3207-3223`) vêm do merge do upstream Turbo v1.3.9. Estado a confirmar. O fluxo de fila e de trava descrito abaixo está no código lido, mas o percurso não foi testado no navegador.\n\n## Ideia central\n\nCada clique em gerar vira `webui_task.submit_generation(...)`. Essa função grava o estado da tarefa como `processing` e a entrega à fila da WebUI. A fila roda uma tarefa por vez. Antes de chamar `tm.start`, o worker pega a trava de configuração, para que nenhuma tela mude provedor ou chave no meio da geração.\n\n## Como funciona\n\n1. **Abre a página.** `./webui.sh` procura a primeira porta livre entre 8501 e 8599 em `127.0.0.1` (`webui.sh:16-17`). `mpt webui` faz o mesmo pelo `app/launcher.py:26`.\n2. **Configura.** A janela de configurações (`_render_settings_dialog`, `webui/Main.py:3237`) tem seis abas: LLM, Material API, Auto-Publish, Interface, Key Backup e Cache Management (`Main.py:3242-3249`). Essas escolhas vão para `config.toml` pela camada de configuração.\n3. **Monta a tarefa.** A página tem quatro colunas (`_render_application`, `Main.py:8441`): roteiro (`_render_script_settings`, `Main.py:5029`), vídeo (`5224`), áudio (`6966`) e legenda (`7670`). O botão de gerar fica em `_render_generation_controls` (`Main.py:8009`).\n4. **Envia.** `Main.py:8412` chama `webui_task.submit_generation(task_id=..., params=..., capture_logs=...)` (`app/services/webui_task.py:138`). Antes disso, a função copia os parâmetros e grava o registro `processing` com `video_subject` (`webui_task.py:154` e `:173`), para que a página ache a tarefa mesmo que o script seja executado de novo.\n5. **Enfileira.** `_task_manager` (`webui_task.py:24`) é um `InMemoryTaskManager` com `max_concurrent_tasks=1` e `max_queued_tasks` lido do config. Se a fila estiver cheia, a exceção sobe e o registro vira `failed` com `failed_stage=\"scheduling\"` (`webui_task.py:199`).\n6. **Executa.** `_run_generation` (`webui_task.py:58`) prende a captura de logs da thread e entra em `config.runtime_config_lock()` (`webui_task.py:94`). Só depois chama `tm.start(...)`. Qualquer exceção do wrapper vira `failed_stage=\"webui_worker\"`.\n7. **Acompanha.** `_render_running_generation_task` (`Main.py:2151`) é um fragmento do Streamlit que atualiza a cada 0,5 s (`webui_task.py:34`) e lê o log com `get_task_logs` (`webui_task.py:52`). A lista de tarefas e o histórico são outro fragmento, a cada 2 s (`Main.py:1442`), que varre `storage/tasks` (`_scan_history_tasks`, `Main.py:991`).\n\n## Exemplo / percurso\n\nNão abri o navegador nesta documentação. O que foi executado: a mesma chamada que a página faz, `webui_task.submit_generation(...)`, com os parâmetros da coluna de vídeo, `video_source=\"local\"`, voz `no-voice` e roteiro enviado. A função foi chamada direto, fora do Streamlit.\n\nResultado observado após cerca de 3 s de polling:\n\n- estado `1`, progresso `100`, `failed_stage` nulo;\n- `videos`: caminho absoluto de `final-1.mp4` dentro de `storage/tasks/<id>/`;\n- 30 linhas de log capturadas para a tarefa (`get_task_logs`).\n\nOs arquivos são os mesmos da API e do CLI: `script.json`, `audio.mp3`, `combined-1.mp4` e `final-1.mp4`. Veja [[01 - Vídeo pela API]] para a tabela.\n\nComo a página mostra o resultado: `Main.py:2060` exibe \"Video Generation Failed\" quando o estado não é `1` ou não há arquivo de vídeo.\n\n## Armadilhas\n\n- **Uma tarefa por vez, sempre.** A WebUI fixa `max_concurrent_tasks=1` (`webui_task.py:21-25`). O limite do `config.toml` vale só para a API. As duas filas não se enxergam.\n- **Trava pega, mas a página não bloqueia.** Mudar uma opção durante uma geração não quebra a tarefa, porque `update_config_nonblocking` (`app/config/config.py:92`) guarda o valor e aplica quando a trava solta. A tarefa em curso continua com a configuração anterior.\n- **Sem Redis, a API não vê a WebUI.** Cada processo tem o próprio estado em memória. A lista da WebUI só mostra tarefas da API porque lê `storage/tasks` do disco.\n- **Fila cheia aparece como erro genérico.** A página mostra \"Video Generation Failed\" (`Main.py:2060`). O motivo real está no campo `error` do estado, com `failed_stage=\"scheduling\"`.\n\n## Prática\n\n1. Quantas tarefas a WebUI executa ao mesmo tempo, e por que isso não depende de `max_concurrent_tasks`?\n2. Em qual função a WebUI pega a trava de configuração, e o que ela faz com uma mudança de opção enquanto a trava está presa?\n3. Se a fila da WebUI estiver cheia, qual `failed_stage` fica no estado da tarefa?\n\n> [!faq]- Gabarito\n> 1. Uma. `_task_manager` é criado com `max_concurrent_tasks=1` (`app/services/webui_task.py:24`). `max_concurrent_tasks` do config é lido só pela API.\n> 2. Em `_run_generation`, com `config.runtime_config_lock()` (`webui_task.py:94`). A mudança é guardada e aplicada quando a trava solta (`config.py:92`).\n> 3. `scheduling` (`webui_task.py:199`).\n\n## Conexões\n\n- [[Visão geral]]: onde a WebUI entra no programa.\n- [[Estado das tasks e fila]]: as duas filas e o estado `failed`.\n- [[Configuração e travas]]: a trava de configuração em detalhe.\n- [[Portas de entrada]]: a comparação com API e CLI.\n- [[Pipeline e stop_at]]: o que roda dentro de `tm.start`.\n- Canvas: [[02 - Portas de entrada.canvas|Canvas]].\n"
    },
    {
     "id": "p4",
     "section": "walk",
     "title": "04 - Vídeo pelo time de agentes",
     "tags": [
      "mapa",
      "percurso"
     ],
     "status": "stable",
     "sources": [
      ".agents/skills/video/SKILL.md",
      ".agents/pipeline.md",
      ".agents/setup.md",
      ".agents/playbooks/moneyprinter.md",
      ".agents/roles/montador-mpt.md",
      ".agents/skills/video/scripts/build_timeline.py",
      ".agents/skills/video/scripts/build_music.py",
      ".agents/skills/video/scripts/build_thumbnail.py",
      "cli.py"
     ],
     "body": "# 04 - Vídeo pelo time de agentes\n\n[[00 - Índice|← Índice]]\n\nUm vídeo de ponta a ponta: do pedido ao `entrega.md`, passando pelos doze papéis. Cada etapa grava um arquivo, e o próximo papel lê esse arquivo.\n\n> [!info] Exemplo ilustrativo\n> Nada foi rodado neste checkout: `storage/projects/` não existe. Os nomes em `<...>` são o que você troca. Os comandos e os arquivos são os reais do repositório.\n\n## Ideia central\n\nO percurso é uma fila de papéis com arquivos entre eles. A parte mais cara, o render, só começa depois que o roteiro passa pela revisão e o usuário aprova o pacote. Até lá, o programa só gera áudio de teste.\n\n## Como funciona\n\n**Pedido.** Você escreve: \"siga `.agents/skills/video/SKILL.md` para um vídeo sobre <tema>, 60 s, 9:16, pt-BR\". A skill recebe duração, formato e idioma (`SKILL.md:8-9`).\n\n**Etapa 0 · Perfil e brief.** O assistente lê `setup.md` e escolhe o perfil. Com `tecnologia` como perfil, cria `storage/projects/<slug>/brief.md`:\n\n```\nperfil: tecnologia\ntema: <tema>\nangulo: <a tese em uma frase>\n```\n\nSó o que difere do perfil entra no brief (`SKILL.md:32-33`).\n\n**Etapa 1 · `pesquisador`.** Escreve `research.md` (fatos com fonte), `sources.json` (vídeos por cena), `script.txt` (só o texto narrado) e `music-plan.md` (clima de cada bloco). Fato sem fonte não entra; assunto recente pede duas fontes (`setup.md:51-52`).\n\n**Etapa 2 · em paralelo.** `critico` grava `critique/content-01.md`, `sugestor-de-pauta` grava `critique/ideas-01.md` e `auditor` grava `audit/fatos-01.md` com `OK` ou `CORRIGIR`. Se houver `REVISAR`, `CORRIGIR` ou sugestão de alto ganho, o pesquisador revisa. No máximo duas rodadas (`SKILL.md:44-45`).\n\n**Etapa 4 · `diretor-de-arte`.** Grava `arte.json`. Um exemplo, como no contrato (`pipeline.md:103-108`):\n\n```json\n{\"legenda\": {\"font_name\": \"BeVietnamPro-Bold.ttf\", \"text_fore_color\": \"#FFFFFF\", \"stroke_color\": \"#000000\"},\n \"texto_na_tela\": {\"font\": \"BeVietnamPro-Bold.ttf\", \"color\": \"#FFD400\", \"size\": 96, \"box\": true},\n \"thumbnail\": {\"font\": \"BeVietnamPro-Bold.ttf\", \"color\": \"#FFFFFF\", \"accent\": \"#FFD400\"}}\n```\n\n**Etapa 5 · parada.** `diretor` grava `aprovacao-01.md` com roteiro, duração, clima da música, plano visual e pendências. O assistente mostra e espera. Sem o aval do usuário, nada é baixado (`SKILL.md:47-49`).\n\n**Etapa 6 · `montador-mpt`, modo tempo.** Tudo passa pelo dev shell (`moneyprinter.md:6`). Primeiro, o teste de áudio:\n\n```sh\nnix develop --command bash -c '.venv/bin/python cli.py --video-script \"$(cat storage/projects/<slug>/script.txt)\" --video-language pt-BR --voice-rate 1.0 --stop-at audio'\n```\n\nA última linha é um JSON com `audio_duration`. A meta é ±3 s da duração alvo. Ajuste o texto primeiro; a velocidade só entre 0,95 e 1,10 (`montador-mpt.md:24-26`). Depois, a legenda e os tempos:\n\n```sh\nnix develop --command bash -c '.venv/bin/python cli.py ... --stop-at subtitle'\npython3 .agents/skills/video/scripts/srt_to_timing.py storage/tasks/<task_id>/subtitle.srt storage/projects/<slug>/timing.json\n```\n\nA trilha vem em seguida: `music.json` com as deixas, e `build_music.py <proj> --preview`. O script grava `bgm.mp3`, copia para `storage/bgm/<slug>.mp3` e imprime `--bgm-type custom --bgm-file <slug>.mp3` (`build_music.py:116-120`).\n\n**Etapa 7 · `cacador-de-clipes`.** Assiste aos vídeos em baixa resolução, escolhe o trecho de cada frase e grava `shotlist.json`. Cenas com `anim` vão para o `animador` (etapa 7b, ver [[Animações com Remotion]]).\n\n**Etapa 8 · `editor-de-clipes`.** Gera a timeline e confere a prévia:\n\n```sh\npython3 .agents/skills/video/scripts/build_timeline.py storage/projects/<slug> --aspect 9:16 --preview\n```\n\nO script imprime a duração de cada clipe e o total (`build_timeline.py:225-228`) e grava `raw/timeline_preview.png`. O editor olha a imagem antes de seguir. Depois escreve `credits.md`.\n\n**Etapa 9 · `montador-mpt`, modo render.** A chamada junta os clipes, a trilha e a legenda:\n\n```sh\nnix develop --command bash -c '.venv/bin/python cli.py --video-script \"$(cat storage/projects/<slug>/script.txt)\" --video-language pt-BR --voice-name <voz> --voice-rate <igual ao teste> --video-aspect 9:16 --video-source local --video-materials \"$(ls storage/projects/<slug>/timeline/*.mp4 | paste -sd,)\" --video-concat-mode sequential --video-transition-mode none --video-clip-duration <maior clipe> --bgm-type custom --bgm-file <slug>.mp3 --bgm-volume 0.2'\n```\n\nOs parâmetros da legenda vêm do `arte.json`, traduzidos para `--font-name`, `--text-fore-color`, `--stroke-color` e as demais flags (`montador-mpt.md:21`). O resultado é copiado para `output/final.mp4` e conferido com `ffprobe`. O `--video-clip-duration` é o corte de cada clipe (`app/services/video.py:1154-1155`).\n\n**Etapa 10 · em paralelo.** `critico` grava `critique/visual-01.md` e `auditor` grava `audit/direitos-01.md`. Se algum reprovar, só as cenas apontadas voltam: `build_timeline.py --only 07,12`, e o render roda de novo.\n\n**Etapa 11 · em paralelo.** `designer-de-thumbnail` gera a capa:\n\n```sh\npython3 .agents/skills/video/scripts/build_thumbnail.py storage/projects/<slug> --from timeline/07.mp4 --at 1.5 --text \"<LINHA 1>|<LINHA 2>\"\n```\n\nO `redator-de-publicacao` grava `publicacao/publicacao.md`: títulos, descrição, créditos e tags.\n\n**Etapa 12 · `diretor` (entrega).** Confere o checklist e grava `entrega.md` com `PRONTO` ou `REFAZER <etapa>`. Anota o vídeo no Histórico do perfil.\n\n**Etapa 13 · relatório.** Caminho do vídeo, capas, títulos prontos para colar e pendências. Nada é publicado.\n\n## Por que funciona\n\n- **Arquivos são a interface.** Cada papel só precisa do contrato. O revisor não precisa saber quem escreveu o roteiro.\n- **O caro vem depois das paradas.** Roteiro e aprovação vêm antes de download e render.\n- **Clipes já cortados.** Cada clipe sai com a duração da cena, então o modo `sequential` não precisa adivinhar onde cortar.\n- **Mesmo texto, mesma velocidade.** O teste de áudio e o render usam o mesmo texto e o mesmo `--voice-rate`. Senão a sincronia quebra (`montador-mpt.md:41`).\n\n## Armadilhas\n\n- **Python fora do dev shell.** O `.venv` usa o Python do Nix e precisa do `libstdc++` do flake. Rodar `python3 cli.py` fora do `nix develop` falha. Os scripts da skill são a exceção: rodam com `python3` puro.\n- **Tarefas de teste.** Apague de `storage/tasks/` as tasks de teste descartadas. A regra está em `SKILL.md:126`.\n- **Download de terceiros.** Na nuvem, o `yt-dlp` falha no YouTube sem login. Ver [[MCP e permissões]].\n- **Velocidade fora da faixa.** Se o áudio não bater em ±10%, o problema é o texto. Corte o roteiro.\n\n## Prática\n\n1. Por que o `--stop-at audio` vem antes do `--stop-at subtitle`?\n2. Você não tem material para uma cena. O que o editor faz e o que o assistente pergunta ao usuário?\n3. O `critico` aponta `REVISAR` na etapa 10. Quantas rodadas de refação são permitidas?\n\n> [!faq]- Gabarito\n> 1. Porque o áudio dá a duração, que define o texto e a velocidade. Só depois disso a legenda e os tempos têm sentido (`montador-mpt.md:24-27`).\n> 2. O editor não inventa clipe. O assistente pergunta se o usuário grava ou envia algo, ou se aceita stock (`SKILL.md:56`).\n> 3. Duas rodadas no máximo (`SKILL.md:64-66`).\n\n## Conexões\n\n- Anterior: [[Time de vídeo e contratos de arquivo]]. Próximo: [[05 - Mudança pelo time técnico]].\n- Conceitos: [[Pipeline e stop_at]], [[Voz e legenda]], [[Material de vídeo]], [[Música e publicação]], [[Perfis de canal]].\n- Referência: [[Contratos JSON dos agentes]], [[Papéis e modelos]], [[Flags do CLI]].\n- Canvas: [[04 - Time de vídeo.canvas|Canvas do time de vídeo]].\n"
    },
    {
     "id": "p5",
     "section": "walk",
     "title": "05 - Mudança pelo time técnico",
     "tags": [
      "mapa",
      "percurso"
     ],
     "status": "unstable",
     "sources": [
      ".agents/skills/manutencao/SKILL.md",
      ".agents/tecnico.md",
      ".agents/roles/arquiteto.md",
      ".agents/roles/testador.md",
      ".agents/roles/desenvolvedor.md",
      ".agents/roles/revisor-de-codigo.md",
      ".agents/roles/auditor-de-seguranca.md",
      "app/models/llm_provider.py",
      "config.example.toml",
      "AGENTS.md"
     ],
     "body": "# 05 - Mudança pelo time técnico\n\n[[00 - Índice|← Índice]]\n\nUm exemplo de mudança no programa: adicionar um provedor de LLM. O percurso mostra como o plano, a parada, os testes e a revisão se encaixam.\n\n> [!warning] unstable\n> Este percurso depende do time técnico, que é `status/unstable`. É um **exemplo ilustrativo**: o provedor \"X\" é fictício e nada foi executado. Os arquivos e as chaves citados são reais.\n\n## Ideia central\n\nUma mudança no programa passa por quem planeja, quem escreve, quem testa e quem revisa. A mudança que toca config ou API para antes do código, e o usuário decide. Quem revisa não edita; só aponta.\n\n## Como funciona\n\n**Pedido.** O usuário diz: \"adicione o provedor X de LLM\". O orquestrador cria `storage/manutencao/<slug>/pedido.md` com o que se espera (um provedor que responde e aparece na lista), o que fica fora (sem mudar o padrão) e o critério de pronto (testes verdes e CI passando).\n\n**Plano (`arquiteto`).** Lê o código e escreve `plano.md`. No caso de um provedor, o registro fica em `app/models/llm_provider.py`, onde `LLM_PROVIDER_REGISTRY` começa na linha 195 e cada entrada é um `LLMProviderSpec`. O uso fica em `app/services/llm.py`. A chave de configuração entra em `app/config/config.py` e em `config.example.toml` (`tecnico.md:43-44`). O plano diz quais portas de entrada são afetadas: a API, a WebUI e a CLI recebem tudo pelo `task.start()` e não precisam de código novo.\n\n**Parada.** Mudança de config está na lista que exige aval (`SKILL.md:30-33`). O orquestrador mostra o plano ao usuário. Sem o aval, o desenvolvedor não começa. Se o provedor precisasse de uma biblioteca nova, a justificativa iria no plano e a dependência entraria só com `uv add` (`tecnico.md:45-46`).\n\n**Teste de reprodução (`testador`).** Pulado: não há bug. O modo reprodução é só para bugs (`SKILL.md:34`).\n\n**Implementação (`desenvolvedor`).** Adiciona a entrada no registro, usa a chave de config e roda as checagens da área:\n\n```sh\nuv run ruff check app cli.py main.py webui test docs/skill\nuv run python -X utf8 -m pytest -q test/services\n```\n\nO resultado vai para `mudancas-01.md`, com o comando e a saída.\n\n**Cobertura (`testador`).** Escreve testes para as funções novas e roda a suíte completa com a cobertura do CI:\n\n```sh\nuv run python -X utf8 -m coverage run -m pytest -q test && uv run python -m coverage report  # fail_under = 70\n```\n\nO resultado vai para `testes-01.md`. O testador só edita arquivos em `test/`.\n\n**Revisão e segurança (em paralelo).** `revisor-de-codigo` confere os contratos, o padrão do registro e se há teste. `auditor-de-seguranca` confere o segredo (que vem de `${VAR}` ou do `config.toml`, nunca do código) e o endereço de base do provedor, que pode virar SSRF. Cada um grava seu arquivo: `revisao-01.md` e `seguranca-01.md`. Veredito `APROVADO` ou `REVISAR`.\n\n**Rodada de correção.** Se algum disser `REVISAR`, o desenvolvedor corrige só os itens apontados e os passos de cobertura e revisão rodam de novo. No máximo duas rodadas. Depois disso, o problema vai ao usuário.\n\n**Relatório final.** Lista os arquivos alterados, a saída das checagens, os vereditos e as pendências. Nada é commitado sem o aval do usuário (`tecnico.md:60-61`).\n\n## Exemplo / percurso\n\n| Etapa | Quem | Arquivo gravado | Resultado |\n|---|---|---|---|\n| 0 | orquestrador | `pedido.md` | critério de pronto |\n| 1 | `arquiteto` | `plano.md` | plano com a entrada no registro e a chave de config |\n| 2 | usuário | — | aprova o plano (config mudou) |\n| 3 | `testador` | — | pulado: não é bug |\n| 4 | `desenvolvedor` | `mudancas-01.md` | ruff e pytest da área verdes |\n| 5 | `testador` | `testes-01.md` | suíte e cobertura verdes |\n| 6 | `revisor` e `auditor` | `revisao-01.md`, `seguranca-01.md` | `APROVADO` |\n| 7 | orquestrador | — | relatório ao usuário |\n\n## Por que funciona\n\n- **O plano vem antes do código.** Mudança de config ou API é cara de desfazer. Parar aqui deixa a decisão com o usuário, antes de haver diff.\n- **Quem escreve não aprova o próprio código.** O testador escreve o teste; o revisor lê o diff sem tê-lo escrito.\n- **A régua é o CI.** As mesmas checagens (`tecnico.md:51-57`) rodam antes de qualquer veredito. Verde ou vermelho, sem interpretação.\n\n## Armadilhas\n\n- **Config é `runtime_config_lock`.** Gravar config com um vídeo rodando é bloqueado. O desenvolvedor não mexe no `config.toml` do usuário (`tecnico.md:43-44`).\n- **Teste que falha de propósito não passa.** Pular, desligar ou marcar como esperado a falhar para ficar verde é proibido (`tecnico.md:49-50`).\n- **Língua dos comentários.** A maioria dos comentários do código é em chinês. Siga a língua do arquivo (`tecnico.md:38-39`).\n- **O CI é a régua.** Checagem vermelha = não está pronto, qualquer que seja o veredito (`SKILL.md:68`).\n\n## Prática\n\n1. Por que o plano para antes do código quando a mudança toca config?\n2. Um bug é corrigido. Qual papel escreve o teste que falha antes da correção?\n3. O auditor de segurança aponta `REVISAR`. O que acontece na rodada seguinte?\n\n> [!faq]- Gabarito\n> 1. Porque a regra manda parar em mudança de config, API, schema, dependência ou mais de cinco arquivos (`SKILL.md:30-33`).\n> 2. O `testador`, no modo reprodução (`SKILL.md:34`).\n> 3. O desenvolvedor corrige só os itens apontados, e os passos de cobertura e revisão rodam de novo (`SKILL.md:37-40`). Até duas rodadas.\n\n## Conexões\n\n- Anterior: [[Time técnico]]. Vídeo, para comparar: [[04 - Vídeo pelo time de agentes]].\n- Conceitos: [[Provedores de LLM]], [[Configuração e travas]], [[Testes e CI]], [[Como contribuir]].\n- Referência: [[Papéis e modelos]].\n- Canvas: [[05 - Time técnico.canvas|Canvas do time técnico]].\n"
    },
    {
     "id": "c01",
     "section": "concept",
     "title": "Visão geral",
     "tags": [
      "mapa",
      "conceito"
     ],
     "status": "stable",
     "sources": [
      "main.py",
      "cli.py",
      "app/asgi.py",
      "app/services/task.py",
      "app/services/webui_task.py",
      "webui/Main.py",
      "app/services/state.py",
      "AGENTS.md"
     ],
     "body": "# Visão geral\n\n[[00 - Índice|← Índice]]\n\nO MoneyPrinterOmni recebe um pedido por uma de três portas, chama `task.start()` e grava os resultados em `storage/tasks/<id>/`.\n\n## Ideia central\n\nHá três portas de entrada: API HTTP, WebUI (Streamlit) e CLI. As três usam a mesma função, `task.start()` (`app/services/task.py:1907`), que executa o pipeline (`_run_pipeline`, `task.py:1519`). Cada porta faz uma preparação própria antes disso: valida, enfileira, trava ou não. O pipeline é único. Por isso, uma correção na camada de serviço vale para as três portas.\n\n## Como funciona\n\n1. **Porta.** Cada entrada tem seu próprio caminho até `start()`:\n   - **API:** `main.py:12` sobe o uvicorn em `app.asgi:app`. A rota `create_task` (`app/controllers/v1/video.py:235`) registra o estado e chama `task_manager.add_task(tm.start, ...)`.\n   - **WebUI:** `webui/Main.py` chama `webui_task.submit_generation` (`app/services/webui_task.py:138`). Uma fila própria roda `_run_generation`, que pega a trava de configuração antes de `tm.start`.\n   - **CLI:** `cli.py:1735` (`run_cli`) monta os parâmetros e chama `tm.start` direto (`cli.py:1766`), sem fila.\n2. **Pipeline.** `_run_pipeline` executa as etapas na ordem: roteiro, termos, áudio, legenda, materiais, vídeo e, por fim, publicação. Detalhes em [[Pipeline e stop_at]].\n3. **Estado.** Cada etapa grava progresso e estado em `app/services/state.py`, em memória ou no Redis (veja [[Estado das tasks e fila]]).\n4. **Arquivos.** Tudo que é gerado fica em `storage/tasks/<id>/`. A API devolve esses caminhos como URLs `/tasks/...`; o CLI devolve caminhos absolutos.\n\n## Exemplo / percurso\n\nPedido `POST /api/v1/videos` com um roteiro e material local. O caminho é:\n\n`POST /api/v1/videos` → `create_video` (`video.py:215`) → `create_task` (`video.py:235`) → `add_task` (`base_manager.py:54`) → `tm.start` (`task.py:1907`) → `_run_pipeline` (`task.py:1519`) → `storage/tasks/<id>/final-1.mp4`.\n\nO percurso completo, com resposta real, está em [[01 - Vídeo pela API]].\n\nOnde cada coisa mora no repositório:\n\n| Caminho | O que tem |\n|---|---|\n| `main.py`, `cli.py`, `webui/` | as três portas (API, CLI e WebUI) |\n| `app/asgi.py`, `app/router.py` | aplicação FastAPI, middlewares e montagem das rotas |\n| `app/controllers/` | rotas HTTP (`v1/video.py`, `v1/llm.py`) e gerenciadores de fila (`manager/`) |\n| `app/services/` | o pipeline (`task.py`), estado (`state.py`), vídeo, voz, legenda, materiais e provedores |\n| `app/models/` | esquemas de requisição (`schema.py`), constantes (`const.py`) e provedores de LLM |\n| `app/config/config.py` | leitura e gravação do `config.toml` e a trava de configuração |\n| `app/paths.py` | onde ficam configuração, recursos e dados de execução |\n| `config.example.toml` | modelo de configuração, com todas as chaves |\n| `resource/` | fontes, músicas e arquivos públicos (copiados para `storage` ou `resource` de execução) |\n| `storage/` | saída gerada em tempo de execução (ignorada pelo git) |\n| `docs/mapa/` | este vault |\n| `.agents/`, `.claude/` | o harness de agentes (produção de vídeo e manutenção) |\n\n## Armadilhas\n\n- **`video_project.py` não faz parte do pipeline.** Nenhum módulo do programa o importa; só o teste `test/services/test_video_project.py:13` usa. O `AGENTS.md` o lista como estágio de composição, o que não bate com o código.\n- **A trava de configuração só existe na WebUI.** API e CLI chamam `start()` sem pegar `runtime_config_lock`. Dentro de um mesmo processo, uma mudança de configuração pode afetar uma tarefa da API em andamento.\n- **Processos não compartilham estado.** Com `docker-compose`, `webui` e `api` têm cada um seu estado em memória. Sem Redis, a WebUI não enxerga as tarefas da API, exceto pela varredura de `storage/tasks`.\n\n## Prática\n\n1. Qual função é o ponto de entrada comum das três portas, e em qual arquivo ela fica?\n2. Em qual pasta do repositório fica o código que decide quais rotas HTTP existem?\n3. Se você instalar a API e a WebUI em processos separados sem Redis, a WebUI mostra as tarefas da API? Por quê?\n\n> [!faq]- Gabarito\n> 1. `start()` em `app/services/task.py:1907`. Ela chama `_run_pipeline` (`task.py:1519`).\n> 2. Em `app/controllers/v1/`: `video.py` (vídeos, tarefas e materiais) e `llm.py` (roteiro, termos e metadados).\n> 3. Não. Cada processo tem seu `MemoryState`. A WebUI só lista tarefas da API se elas estiverem em `storage/tasks` no disco e a pasta for compartilhada.\n\n## Conexões\n\n- [[Pipeline e stop_at]]: as etapas dentro de `start()`.\n- [[Estado das tasks e fila]]: estado, filas e os códigos 429 e 409.\n- [[Portas de entrada]]: a comparação lado a lado.\n- [[Configuração e travas]]: `config.toml`, a trava e os caminhos.\n- [[Rotas da API]] e [[Flags do CLI]]: as referências das portas.\n- Canvas: [[01 - Pipeline.canvas|Canvas]] e [[02 - Portas de entrada.canvas|Canvas de portas]].\n"
    },
    {
     "id": "c02",
     "section": "concept",
     "title": "Pipeline e stop_at",
     "tags": [
      "mapa",
      "conceito"
     ],
     "status": "unstable",
     "sources": [
      "app/services/task.py",
      "app/services/llm.py",
      "app/services/voice.py",
      "app/services/subtitle.py",
      "app/services/material.py",
      "app/services/video.py",
      "app/services/upload_post.py",
      "app/services/task_artifacts.py",
      "cli.py"
     ],
     "body": "# Pipeline e stop_at\n\n[[00 - Índice|← Índice]]\n\nO pipeline é uma sequência fixa de etapas. `stop_at` diz em qual etapa parar, e a tarefa devolve o resultado daquela etapa.\n\n> [!warning] unstable\n> O movimento de imagem (`image_motion`, opções `static` e `zoom`) veio do merge do upstream Turbo v1.3.9. Ele aparece nas etapas de materiais e de vídeo (`app/services/video.py:1955`, `app/services/material.py:1740`). Estado a confirmar. O resto do pipeline está na `main`.\n\n## Ideia central\n\n`_run_pipeline` (`app/services/task.py:1519`) executa as etapas em uma ordem fixa: roteiro, termos, áudio, legenda, materiais, vídeo e publicação. Cada etapa grava um arquivo ou um campo de estado. A ordem real é **roteiro → termos → áudio → legenda → materiais → vídeo → publicação**. O áudio vem antes da legenda porque a legenda Edge usa a linha do tempo que o TTS gera.\n\n## Como funciona\n\n**Pré-checagens (antes de qualquer chamada paga).** Acontecem entre `task.py:1532` e `task.py:1650`:\n\n- o estado vai para `processing` com progresso 5 (`task.py:1532`);\n- com `stop_at=\"video\"` e legenda ligada, as cores são validadas (`task.py:1537`);\n- com `stop_at` igual a `materials` ou `video`, a fonte de vídeo precisa estar em `_SUPPORTED_VIDEO_SOURCES` (`task.py:97`, checagem em `task.py:1543`);\n- chaves de provedor para Seedance, OFox, Metaso, MuAPI e openai_image (só `materials` e `video`);\n- para música de fundo (`sonilo` ou `elevenlabs`, `_VIDEO_MUSIC_PROVIDERS` em `task.py:79`): chave, tamanho do prompt e, se houver, `validate_generation_access()`. Só em `video`;\n- ffmpeg: `utils.check_ffmpeg_ready()` (`task.py:1650`), exceto para `script` e `terms`.\n\nFalha em qualquer pré-checagem chama `_mark_task_failed(..., \"preflight\", ...)`.\n\n**Etapas.**\n\n| # | `stop_at` | Função (arquivo:linha) | Chama | Grava | Progresso |\n|---|---|---|---|---|---|\n| 1 | `script` | `generate_script` (`task.py:358`) | `llm.generate_script` (`app/services/llm.py:894`). Pulada se `video_script` veio preenchido | nada no disco | 10 |\n| 2 | `terms` | `generate_terms` (`task.py:379`) | `llm.generate_terms` (`llm.py:1023`), `amount=8` com `match_materials_to_script`, senão 5. Pula com `local`. Depois, `twelvelabs.rerank_terms_by_subject` (`app/services/twelvelabs.py:113`), se configurado | `script.json` por `save_script_data` (`task.py:424`) | 20 |\n| 3 | `audio` | `generate_audio` (`task.py:551`) | `voice.tts` (`app/services/voice.py:1138`) → `_single_tts` (`voice.py:640`). Com `no-voice`, `generate_silent_audio` (`voice.py:593`) | `audio.mp3` (`task.py:601`) | 30 |\n| 4 | `subtitle` | `generate_subtitle` (`task.py:649`) | provedor `edge` → `voice.create_subtitle` (`voice.py:3679`); `whisper` → `subtitle.create` (`app/services/subtitle.py:61`) e `correct` (`subtitle.py:230`) | `subtitle.srt` (`task.py:661`) | 40 |\n| 5 | `materials` | `get_video_materials` (`task.py:723`) | `local` → `preprocess_video` (`app/services/video.py:1955`); demais → `material.download_videos` (`app/services/material.py:2161`) | cache de material e `material_sources` no `script.json` | 40 → 50 |\n| 6 | `video` | `generate_final_videos` (`task.py:980`) | `video.combine_videos` (`video.py:973`), BGM opcional (`app/services/sonilo.py:392` ou `elevenlabs_music.py:388`), `video.generate_video` (`video.py:1569`) | `combined-N.mp4`, `final-N.mp4` (`task.py:1026`, `task.py:1082`) | 50 → 100 |\n| 7 | (fim) | `_schedule_cross_post` (`task.py:1463`) → `_run_cross_post` (`task.py:1259`) | `llm.generate_social_metadata` (`llm.py:1343`), `upload_post.cross_post_video` (`app/services/upload_post.py:396`). Pool de 2 threads | campos `cross_post_*` no estado | não se aplica |\n\nA publicação roda depois que o estado já está `complete` (`task.py:1883` agenda a publicação).\n\n**O que cada `stop_at` devolve.** A função `start()` retorna o dicionário daquela etapa:\n\n- `script` → `{\"script\"}` (`task.py:1682`);\n- `terms` → `{\"script\", \"terms\"}` (`task.py:1701`);\n- `audio` → `{\"audio_file\", \"audio_duration\"}` (`task.py:1757`);\n- `subtitle` → `{\"subtitle_path\"}` (`task.py:1777`);\n- `materials` → `{\"materials\"}` (`task.py:1803`);\n- `video` → o dicionário completo: `videos`, `combined_videos`, `audio_file`, `subtitle_path`, `materials`, `cross_post_state` etc.\n\nNa API, o `stop_at` é fixo por rota: `/videos` usa `video`, `/subtitle` usa `subtitle`, `/audio` usa `audio` (`app/controllers/v1/video.py:215-229`). Os outros valores só existem no CLI. Veja [[Flags do CLI]].\n\n**Erros.** `_mark_task_failed` (`task.py:260`) grava `failed_stage` (`preflight`, `script`, `terms`, `audio`, `subtitle`, `materials`, `video`, `pipeline`) e o texto do erro. Erros de LLM voltam como string que começa com `Error: `. O pipeline reconhece essa marca só quando o roteiro foi gerado pelo LLM (`task.py:1663`).\n\n**Progresso.** Cada etapa grava seu percentual. Materiais e vídeo usam um relator que interpola entre os dois valores (`task.py:328`).\n\n## Exemplo / percurso\n\nUm `POST /api/v1/subtitle` roda áudio e legenda e para. Ele não gera material nem vídeo. Um `POST /api/v1/audio` roda só até a etapa 3. Pelo CLI, `--stop-at audio` devolve `{\"audio_file\", \"audio_duration\"}`, como mostrado em [[02 - Vídeo pelo CLI]].\n\nPara uma tarefa completa com material local, os arquivos em `storage/tasks/<id>/` são `script.json`, `audio.mp3`, `subtitle.srt` (se a legenda estiver ligada), `combined-N.mp4` e `final-N.mp4`. Veja [[01 - Vídeo pela API]].\n\n> [!warning] unstable\n> Com `image_motion` (padrão `zoom`), imagens de material ganham movimento. A opção vem de `VideoParams.image_motion` (`app/models/schema.py:116`) e de `--image-motion` no CLI (`cli.py:444`). Veja [[Flags do CLI]].\n\n## Armadilhas\n\n- **Pré-checagem não é garantia de sucesso.** Ela só olha chaves e formato. Uma chave válida com cota esgotada falha na etapa seguinte, com `failed_stage` correspondente.\n- **Legenda não cai para o Whisper.** Se o provedor `edge` não gerar o arquivo, a tarefa segue sem legenda. O código diz isso de forma explícita (`app/services/task.py:649-722`). Para legenda sem linha do tempo do TTS, o provedor precisa ser `whisper`, e isso é uma configuração global, não por tarefa.\n- **Roteiro do usuário que começa com `Error: `** não é tratado como erro, porque a marca só vale para roteiro gerado pelo LLM (`task.py:1663`).\n- **Falha em provedor pago mantém o id remoto.** Campos como `volcengine_seedance_task_id` ou `muapi_task_id` ficam no estado para recuperar o resultado depois.\n\n## Prática\n\n1. Escreva a ordem das etapas do pipeline, sem consultar a tabela.\n2. Com `match_materials_to_script` ligado, quantos termos de busca o LLM deve gerar, e onde isso é decidido?\n3. O que a API devolve quando você chama `POST /api/v1/subtitle` e o provedor de legenda Edge falha?\n\n> [!faq]- Gabarito\n> 1. Roteiro, termos, áudio, legenda, materiais, vídeo e publicação. A legenda vem depois do áudio porque usa a linha do tempo do TTS.\n> 2. Oito. A decisão está em `generate_terms` (`app/services/task.py:379`): `amount=8 if params.match_materials_to_script else 5`.\n> 3. Sucesso sem legenda. O `subtitle_path` vem vazio e a tarefa segue. Não há fallback para o Whisper.\n\n## Conexões\n\n- [[Visão geral]]: as três portas que chamam este pipeline.\n- [[Estado das tasks e fila]]: como o estado e a fila acompanham essas etapas.\n- [[Configuração e travas]]: as chaves que escolhem provedores.\n- [[Rotas da API]] e [[Flags do CLI]]: os valores de `stop_at` em cada porta.\n- Canvas: [[01 - Pipeline.canvas|Canvas]].\n"
    },
    {
     "id": "c03",
     "section": "concept",
     "title": "Estado das tasks e fila",
     "tags": [
      "mapa",
      "conceito"
     ],
     "status": "stable",
     "sources": [
      "app/services/state.py",
      "app/controllers/manager/base_manager.py",
      "app/controllers/manager/memory_manager.py",
      "app/controllers/manager/redis_manager.py",
      "app/controllers/v1/video.py",
      "app/services/task.py",
      "app/services/webui_task.py",
      "app/models/const.py",
      "app/asgi.py"
     ],
     "body": "# Estado das tasks e fila\n\n[[00 - Índice|← Índice]]\n\nCada tarefa tem um registro de estado, em memória ou no Redis. Um gerenciador de fila decide se a tarefa roda já, espera ou é recusada.\n\n## Ideia central\n\nHá dois componentes separados. O **estado** (`app/services/state.py`) guarda o que cada tarefa está fazendo. A **fila** (`app/controllers/manager/`) controla quantas tarefas rodam ao mesmo tempo. A API e a WebUI têm cada uma sua fila. O CLI não tem fila.\n\n## Como funciona\n\n1. **Estado.** A tarefa tem `state` (`app/models/const.py:25-27`):\n   - `-1` = falhou;\n   - `4` = processando;\n   - `1` = concluída.\n\n   Campos extras, como `progress`, `failed_stage`, `error`, `videos` e `cross_post_state`, vão no mesmo registro. `cross_post_state` tem `pending`, `processing`, `complete` ou `failed`.\n2. **Dois backends.** `MemoryState` (`state.py:69`) guarda um dicionário na memória, com um lock. `RedisState` (`state.py:134`) guarda um hash por tarefa. Qual deles vale é escolhido em `state.py:317`, pelo `enable_redis` do config. O Redis usa HSET e scripts Lua que checam o dono (`state.py:221`, `state.py:264`).\n3. **Fila.** `TaskManager.add_task` (`app/controllers/manager/base_manager.py:54`) decide, sob um lock:\n   - se há menos tarefas rodando que `max_concurrent_tasks`, reserva um slot e abre uma thread (`execute_task`, `base_manager.py:86`);\n   - senão, se a fila tem menos de `max_queued_tasks` itens, enfileira;\n   - senão, levanta `TaskQueueFullError` (`base_manager.py:8`, `:78`).\n4. **Implementações.** `InMemoryTaskManager` (`memory_manager.py:7`) guarda a fila na memória. `RedisTaskManager` (`redis_manager.py:29`) guarda a fila no Redis e, no início da API, retoma as tarefas que estavam na fila (`redis_manager.py:42`, chamado pelo `application_lifespan` em `app/asgi.py:24`).\n5. **Limites.** `max_concurrent_tasks = 5` e `max_queued_tasks = 100` por padrão (`config.example.toml:573-574`). A WebUI tem a sua própria fila, com `max_concurrent_tasks=1` fixo (`app/services/webui_task.py:24`).\n6. **Traduções para HTTP.** A API traduz as exceções assim:\n   - `TaskQueueFullError` vira **429** e o registro criado é apagado (`app/controllers/v1/video.py:268` e `:272-277`);\n   - delete de tarefa ocupada vira **409** (`video.py:345`). \"Ocupada\" é o que `is_task_busy` diz (`app/services/task.py:117`): estado `4` ou `cross_post_state` ativo;\n   - tarefa inexistente vira **404** (`video.py:310`, `:333`).\n\n## Exemplo / percurso\n\nCom os padrões da API, cinco tarefas rodam, e as seguintes entram na fila:\n\n- tarefas 1 a 5: começam já, `state=4`;\n- tarefas 6 a 105: ficam na fila, `state=4` no registro, esperando um slot;\n- tarefa 106: `add_task` levanta `TaskQueueFullError`. A API responde `429`, o registro é apagado, e a mensagem é `task queue is full, please try again later`.\n\nUm `DELETE /api/v1/tasks/{id}` numa tarefa em execução responde `409 task is still running`. Depois que ela termina, o mesmo `DELETE` apaga `storage/tasks/<id>/` e o registro.\n\nVerificado nesta documentação: depois de reiniciar a API com estado em memória, `GET /api/v1/tasks/{id}` deu 404, mas o arquivo `final-1.mp4` continuou acessível em `/tasks/...`. O estado se perde; os arquivos ficam.\n\n## Armadilhas\n\n- **Limites são por processo.** Dois processos têm duas filas. Com `webui` e `api` separados, o limite total é a soma dos dois, e nenhum deles vê a fila do outro.\n- **Sem Redis, reiniciar apaga o estado.** Os arquivos continuam em disco. A consulta pelo id devolve 404.\n- **O Redis é confiado.** Valores do Redis voltam por `ast.literal_eval` (`state.py:300`). O Redis precisa ficar privado, sem acesso de escrita por terceiros.\n- **Publicação em rede não sobrevive ao restart.** A publicação roda num pool de duas threads, fora da fila. Ao subir, a API marca como falhas as publicações interrompidas (`recover_interrupted_cross_posts`, `app/services/task.py:1217`).\n\n## Prática\n\n1. Quais são os três valores de `state` e o que significa cada um?\n2. Com `max_concurrent_tasks=5` e `max_queued_tasks=100`, qual é a tarefa que recebe 429?\n3. Por que `DELETE` numa tarefa com `cross_post_state` ativo responde 409, mesmo que a geração do vídeo tenha terminado?\n\n> [!faq]- Gabarito\n> 1. `-1` falhou, `4` processando, `1` concluída (`app/models/const.py:25-27`).\n> 2. A 106ª tarefa simultânea. Cinco rodam e cem esperam na fila (`base_manager.py:54-78`).\n> 3. Porque `is_task_busy` considera também a publicação em rede, que ainda lê a pasta da tarefa (`app/services/task.py:117`).\n\n## Conexões\n\n- [[Pipeline e stop_at]]: o que a tarefa faz enquanto está em `state=4`.\n- [[Portas de entrada]]: quem usa a fila e quem não usa.\n- [[Visão geral]]: por que a API, a WebUI e o CLI são processos separados.\n- [[Rotas da API]]: os códigos 404, 409 e 429 em cada rota.\n- [[Configuração e travas]]: `max_concurrent_tasks`, `max_queued_tasks` e `enable_redis`.\n- Canvas: [[02 - Portas de entrada.canvas|Canvas]].\n"
    },
    {
     "id": "c04",
     "section": "concept",
     "title": "Portas de entrada",
     "tags": [
      "mapa",
      "conceito"
     ],
     "status": "stable",
     "sources": [
      "app/asgi.py",
      "app/controllers/base.py",
      "app/controllers/v1/video.py",
      "app/services/webui_task.py",
      "app/services/task.py",
      "cli.py",
      "webui.sh",
      "app/launcher.py"
     ],
     "body": "# Portas de entrada\n\n[[00 - Índice|← Índice]]\n\nAPI, WebUI e CLI são três formas de pedir a mesma coisa. Elas diferem em validação, autenticação, fila, trava de configuração e no que aceitam como caminho de arquivo.\n\n## Ideia central\n\nAs três portas chamam `task.start()` (`app/services/task.py:1907`). Antes disso, cada uma faz o seu papel. A API valida o HTTP e pede autenticação. A WebUI tem fila de uma tarefa e pega a trava de configuração. O CLI roda síncrono, sem fila, e é o único que aceita arquivos fora da pasta da tarefa.\n\n## Como funciona\n\n| Aspecto | API (`/api/v1`) | WebUI (Streamlit) | CLI (`cli.py`) |\n|---|---|---|---|\n| Entrada | `create_task` (`app/controllers/v1/video.py:235`) | `webui_task.submit_generation` (`app/services/webui_task.py:138`) | `run_cli` (`cli.py:1735`) |\n| Autenticação | `x-api-key` quando `app.api_key` está preenchida (`app/controllers/base.py:47`). Sem a chave: 401. Vale também para `/tasks/*` (`app/asgi.py:283`) | nenhuma na página. Por padrão ouve em `127.0.0.1` (`webui.sh:16`) | nenhuma. Roda com as permissões de quem executa |\n| Validação | esquema pydantic: erro vira **400** (`app/asgi.py:67`). Mais: cores da legenda e caminho da fonte, também **400** (`video.py:251-254`) | widgets da página, depois o pipeline | `argparse` (saída 2), `build_video_params` (2), `prepare_cli_files` (copia materiais) |\n| `video_source` | não é validado na rota. Valor inválido falha na pré-checagem (`task.py:1543`) | pelo widget | pelo `choices` do argparse (saída 2) |\n| Fila | sim: `add_task`, com 429 quando cheia | sim: uma tarefa por vez (`webui_task.py:24`) | não: a chamada é síncrona |\n| Trava de configuração | **não** | **sim**: `runtime_config_lock` (`webui_task.py:94`) | **não** |\n| Caminho de arquivo do usuário | só dentro de `storage/tasks/<id>/`; falha no pipeline se estiver fora | uploads ficam em `storage/tasks/<id>/` | aceita caminho absoluto. Usa `allow_server_file_input=True` (`cli.py:1766`, `:1773`) |\n| Saída | JSON `{status, message, data}` e consulta por `GET /tasks/{id}` | página com estado e logs ao vivo | uma linha de JSON no stdout; logs no stderr |\n| Código de erro | 400, 401, 404, 409, 429 | mensagem \"Video Generation Failed\" | 0, 1 ou 2 |\n\n**Onde a diferença importa.** A API e a WebUI chamam `start()` pela mesma função, mas com `allow_server_file_input` em `False`. Por isso, um `custom_audio_file` fora da pasta da tarefa é recusado (`app/services/task.py:461-470`). O CLI passa `True`, e então aceita um caminho qualquer do disco. O comentário no código diz que isso é de propósito: é a máquina do operador, não um cliente HTTP.\n\n## Exemplo / percurso\n\nMesmo pedido, três portas, mesmo resultado em disco:\n\n- **API:** `POST /api/v1/videos` com o corpo mostrado em [[01 - Vídeo pela API]].\n- **WebUI:** o mesmo roteiro e material na página, botão de gerar. Veja [[03 - Vídeo pela WebUI]].\n- **CLI:** `cli.py --video-script \"...\" --video-source local --video-materials ./clip.mp4 --voice-name no-voice`. Veja [[02 - Vídeo pelo CLI]].\n\nOs três terminam em `storage/tasks/<id>/` com os mesmos arquivos.\n\n## Armadilhas\n\n- **A API valida pouco no HTTP.** Um `video_source` inexistente ou um `custom_audio_file` fora da pasta da tarefa não dão 400. A tarefa é criada com 200 e falha depois, dentro do pipeline.\n- **Só o CLI aceita caminho de fora.** Não tente o mesmo caminho absoluto pela API: ele será recusado no pipeline.\n- **A trava vale só na WebUI.** Hoje só a WebUI grava configuração (e o login Kimi, que roda a partir dela). A API e o CLI leem sem trava, então uma gravação dentro do mesmo processo durante uma tarefa não é adiada. Editar `config.toml` à mão só tem efeito no processo da API depois de reiniciar, porque a configuração é lida uma vez, na importação (`app/config/config.py:640-660`).\n- **Chave vazia = sem autenticação.** O exemplo vem com `api_key = \"\"` e `listen_host = \"0.0.0.0\"` (`config.example.toml:38`, `:11`). O log avisa, mas nada impede a exposição na rede. Preencha a chave antes de expor a API.\n\n## Prática\n\n1. Qual porta chama `start()` com `allow_server_file_input=True`, e por quê?\n2. Um `POST /api/v1/videos` com `video_count: 9` recebe qual código, e por quê?\n3. Quem pega `runtime_config_lock`, e qual porta não pega?\n\n> [!faq]- Gabarito\n> 1. O CLI (`cli.py:1773`). É a máquina do próprio operador, então um caminho absoluto é confiável. HTTP e WebUI usam o padrão `False`.\n> 2. 400. O esquema pydantic limita `video_count` a 5 (`app/models/schema.py:266`), e o erro de validação vira 400 (`app/asgi.py:67`).\n> 3. A WebUI, dentro de `_run_generation` (`webui_task.py:94`). API e CLI não pegam a trava.\n\n## Conexões\n\n- [[Visão geral]]: o desenho geral das três portas.\n- [[Pipeline e stop_at]]: o que cada porta dispara.\n- [[Estado das tasks e fila]]: a fila da API e a da WebUI.\n- [[Configuração e travas]]: a trava e as chaves de autenticação.\n- [[Rotas da API]] e [[Flags do CLI]]: as referências de cada porta.\n- Canvas: [[02 - Portas de entrada.canvas|Canvas]].\n"
    },
    {
     "id": "c05",
     "section": "concept",
     "title": "Configuração e travas",
     "tags": [
      "mapa",
      "conceito"
     ],
     "status": "unstable",
     "sources": [
      "app/config/config.py",
      "app/paths.py",
      "app/utils/file_security.py",
      "app/services/webui_task.py",
      "webui/Main.py",
      "config.example.toml",
      "app/utils/logging_utils.py",
      "app/services/task.py"
     ],
     "body": "# Configuração e travas\n\n[[00 - Índice|← Índice]]\n\nToda a configuração vem de um arquivo, `config.toml`, lido uma vez na importação. A WebUI pode gravá-lo. Uma trava evita que a configuração mude no meio de uma geração. Caminhos e arquivos passam por checagens próprias.\n\n> [!warning] unstable\n> A seção `[diagnostics]` (`config.example.toml:14-24`), os controles de log em tempo de execução (`app/config/config.py:137`, `app/utils/logging_utils.py:33`) e o botão de diagnóstico da WebUI (`webui/Main.py:3207-3223`) vêm do merge do upstream Turbo v1.3.9. Estado a confirmar. O restante desta nota (config, trava e caminhos) está na `main`.\n\n## Ideia central\n\nO `config.toml` fica na pasta de execução (`app/paths.py:20`, `runtime_root`). Cada seção vira um dicionário sincronizado em memória, e o programa lê dele em todo lugar. A trava de configuração (`runtime_config_lock`) impede gravações durante uma geração, mas só a WebUI a usa. API e CLI não pegam a trava.\n\n## Como funciona\n\n1. **Arquivo.** `config.py:15-16` monta `root_dir/config.toml`. Na primeira execução, `_initialize_config_from_example` (`config.py:495`) copia `config.example.toml` para lá, por um link duro atômico, sem sobrescrever um arquivo que já exista (`config.py:513`).\n2. **Leitura.** `load_config` (`config.py:531`) lê o TOML. Cada seção vira `_SynchronizedConfig` (`config.py:30`): `diagnostics` (`:641`), `app` (`:642`), `azure`, `siliconflow`, `minimax_tts`, `elevenlabs`, `chatterbox`, `kokoro`, `fish_audio`, `voxcpm` e `ui` (`:653`). `whisper` e `proxy` são dicionários simples (`:643-644`). Os valores de topo são `listen_host`, `listen_port`, `log_level` e `ffmpeg_path` (`:665-680`).\n3. **Gravação.** `save_config` (`config.py:566`) escreve num arquivo temporário e troca com `os.replace` (`config.py:620`). Se o arquivo for montagem de Docker e não puder ser trocado, grava no lugar, dentro da trava.\n4. **Trava.** `runtime_config_lock` (`config.py:304`) segura um lock reentrante por toda a geração. `_run_generation` a pega em `webui_task.py:94`. `try_runtime_config_lock` (`config.py:322`) é a versão não bloqueante, usada pela WebUI na prévia de voz (`webui/Main.py:6153`), no teste de conexão com o LLM (`:3649`) e ao copiar a configuração para gerar um texto novo (`:440`).\n5. **Gravação com trava ocupada.** `update_config_nonblocking` (`config.py:92`) guarda só o último valor de cada chave e aplica quando a trava solta. Não bloqueia a interface e não muda a configuração da tarefa em andamento.\n6. **Caminhos.** `app/paths.py`:\n   - `runtime_root` (`paths.py:20`): usa `MPT_HOME` se existir; senão, a pasta do repositório (checkout) ou a pasta de dados do usuário por SO;\n   - `_with_legacy` (`paths.py:38`): se a pasta nova não existe e a antiga `MoneyPrinterTurbo` existe, usa a antiga;\n   - `resource_directory` (`paths.py:70`): copia recursos que faltam, sem sobrescrever o que o usuário editou.\n7. **Arquivos de usuário.** `app/utils/file_security.py:4` (`resolve_path_within_directory`) resolve o caminho real e confere se ele fica dentro da pasta permitida, com `realpath` e `commonpath`. Usado pela fonte da API (`video.py:251`), pelas rotas de stream e download (`video.py:515`, `:587`), pelo áudio customizado (`task.py:445`), pela BGM (`bgm.py:339`, `:413`) e pelo material local (`video.py:1971`).\n\n## Exemplo / percurso\n\nPrimeira execução com uma pasta de teste. O comando abaixo cria o `config.toml` dentro de `MPT_HOME`, sem tocar no repositório:\n\n```sh\nMPT_HOME=/tmp/mpt-teste uv run python cli.py --video-subject \"teste\" --stop-at script\n```\n\nDepois dele, `/tmp/mpt-teste/config.toml` existe, com o mesmo tamanho de `config.example.toml`. Foi o que aconteceu nesta documentação: o arquivo criado tinha 34.300 bytes, igual ao exemplo. Mudar `api_key` ali e reiniciar a API já muda a exigência de autenticação (veja [[Portas de entrada]]).\n\nValores padrão do exemplo que mais importam:\n\n| Chave | Valor | Seção | Linha |\n|---|---|---|---|\n| `listen_host` | `\"0.0.0.0\"` | topo | `config.example.toml:11` |\n| `listen_port` | `8080` | topo | `:12` |\n| `api_key` | `\"\"` (sem autenticação) | `[app]` | `:38` |\n| `tls_verify` | `true` | `[app]` | `:71` |\n| `video_source` | `\"pexels\"` | `[app]` | `:90` |\n| `llm_provider` | `\"moonshot\"` | `[app]` | `:253` |\n| `subtitle_provider` | `\"edge\"` | `[app]` | `:516` |\n| `enable_redis` | `false` | `[app]` | `:566` |\n| `max_concurrent_tasks` | `5` | `[app]` | `:573` |\n| `max_queued_tasks` | `100` | `[app]` | `:574` |\n\nChaves que são segredos (preenchidas por você, nunca no git): `api_key`, `loomloom_api_token`, as listas `*_api_keys` e as chaves `*_api_key` de cada provedor, `redis_password`, `speech_key` (Azure), `api_key` de `siliconflow`, `minimax_tts`, `elevenlabs`, `chatterbox`, `kokoro`, `fish_audio` e `voxcpm`, e `upload_post_api_key`. A lista completa está em [[Chaves de configuração]]. O `.gitignore` já inclui `/config.toml` (`.gitignore:2`).\n\n## Armadilhas\n\n- **A trava não protege a API nem o CLI.** Hoje só a WebUI grava configuração, então o risco é pequeno. Se outro código passar a gravar no mesmo processo, ele vai mudar a configuração de uma tarefa da API em andamento.\n- **Editar o arquivo não basta.** A configuração é lida uma vez, na importação (`config.py:640-660`). Depois de editar `config.toml` à mão, reinicie o processo.\n- **`tls_verify = false`** desliga a verificação de certificado para APIs externas e downloads de material. O comentário do exemplo manda deixar ligado (`config.example.toml:69-71`).\n- **O `AGENTS.md` diz que gravações \"são bloqueadas\" durante a trava.** O código faz diferente: adia a gravação, guarda o último valor e aplica quando a trava solta (`config.py:92`). Vale o código.\n\n## Prática\n\n1. O que acontece com uma mudança de opção na WebUI enquanto uma geração está rodando?\n2. Qual chave controla se a API exige `x-api-key`, e qual é o valor padrão?\n3. Com `MPT_HOME` definido, onde o programa procura o `config.toml`?\n\n> [!faq]- Gabarito\n> 1. A mudança é guardada e aplicada quando a trava solta (`app/config/config.py:92`). A geração em andamento não muda.\n> 2. `api_key` em `[app]` (`config.example.toml:38`). Padrão `\"\"`, que desliga a exigência.\n> 3. Em `$MPT_HOME/config.toml`. `runtime_root` (`app/paths.py:20`) usa essa variável antes de qualquer outra regra.\n\n## Conexões\n\n- [[Visão geral]]: onde a configuração entra no programa.\n- [[Portas de entrada]]: quem usa a trava e quem não usa.\n- [[Estado das tasks e fila]]: `max_concurrent_tasks`, `max_queued_tasks` e `enable_redis`.\n- [[Chaves de configuração]]: todas as seções e chaves.\n- Canvas: [[01 - Pipeline.canvas|Canvas]].\n"
    },
    {
     "id": "c06",
     "section": "concept",
     "title": "Provedores de LLM",
     "tags": [
      "mapa",
      "integracoes"
     ],
     "status": "unstable",
     "sources": [
      "app/models/llm_provider.py",
      "app/services/llm.py",
      "config.example.toml",
      "webui/Main.py",
      "webui/i18n/en.json",
      "test/services/test_fluxionai_llm.py"
     ],
     "body": "# Provedores de LLM\n\n[[00 - Índice|← Índice]]\n\nUm provedor de LLM é o serviço que escreve o roteiro, os termos de busca e os textos de publicação. O programa conhece 37 provedores, todos declarados em um único registro.\n\n## Ideia central\n\nCada provedor é uma linha em `LLM_PROVIDER_REGISTRY` (`app/models/llm_provider.py:195`). A linha diz **o que** o provedor é: nome, modelo padrão, URL padrão e se pede chave. O código que **faz** a chamada fica em `app/services/llm.py`, escolhido pelo campo `adapter`. Por isso a maioria dos provedores novos precisa só de uma linha.\n\n## Como funciona\n\n1. A configuração escolhe o provedor em `[app] llm_provider`, padrão `moonshot` (`config.example.toml:253`; `DEFAULT_LLM_PROVIDER_ID` em `app/models/llm_provider.py:4`).\n2. `_generate_response` (`app/services/llm.py:314`) lê `<id>_api_key`, `<id>_model_name` e `<id>_base_url` de `config.app`. Se o modelo estiver em `deprecated_models`, ele é trocado pelo `default_model`. Se a URL estiver vazia, usa-se a `default_base_url` do registro.\n3. Se `adapter` não for `openai_compatible`, roda um ramo próprio: `qwen` (`:397`), `gemini` (`:423`), `cloudflare_ai_gateway` (`:473`), `litellm` (`:494`), `azure` (`:516`), `claude_code` (`:545`), `kimi_code` (`:666`) e `modelscope` (`:725`).\n4. Os demais caem no SDK da OpenAI com `chat.completions.create` (`:754`).\n5. Falha não vira exceção para quem chama. O `except` devolve a string `\"Error: ...\"` (`:778`), e os chamadores checam o prefixo (ex.: `:964`).\n\n| Adaptador | Provedores | Autenticação |\n|---|---|---|\n| `openai_compatible` (padrão) | 29, incluindo `ollama` e `oneapi` | chave de API (`ollama` não usa) |\n| `gemini` | `gemini` | chave |\n| `qwen` | `qwen` (SDK dashscope) | chave |\n| `azure` | `azure` | chave, URL e `azure_api_version` |\n| `cloudflare_ai_gateway` | `cloudflare` | chave, `account_id` e `gateway_id` |\n| `modelscope` | `modelscope` | chave |\n| `litellm` | `litellm` | variáveis de ambiente, como `OPENAI_API_KEY` |\n| `claude_code` | `claude_code` | assinatura Claude (CLI) — ver [[Assinaturas em vez de chaves]] |\n| `kimi_code` | `kimi_code` | assinatura Kimi (OAuth) — ver [[Assinaturas em vez de chaves]] |\n\nA tabela completa, gerada a partir do registro, está em [[Provedores e adaptadores]].\n\n## Exemplo / percurso\n\nConfig mínima para usar o DeepSeek:\n\n```toml\n[app]\nllm_provider = \"deepseek\"\ndeepseek_api_key = \"sk-...\"\ndeepseek_base_url = \"\"     # vazio: usa https://api.deepseek.com\ndeepseek_model_name = \"\"   # vazio: usa deepseek-v4-pro\n```\n\nCom isso, `_generate_response` monta um `OpenAI(api_key=..., base_url=\"https://api.deepseek.com\")` e pede o roteiro. O resultado vai para `storage/tasks/<id>/script.json`, gravado por `save_script_data` (`app/services/task.py`). Um erro do provedor fica no estado da task como falha da etapa `script`, não como exceção no terminal.\n\n## Armadilhas\n\n- **Chave vazia para provedor que exige chave.** Falha antes de qualquer rede, com `api_key is not set` (`llm.py:377`).\n- **Provedores sem URL padrão.** `azure` e `oneapi` não têm `default_base_url` no registro. A URL precisa ser preenchida, ou a chamada falha com `base_url is not set` (`llm.py:385`).\n- **Erro é texto.** Como o erro volta como `\"Error: ...\"`, código novo precisa checar o prefixo, ou a mensagem vira roteiro.\n- **Rótulos na WebUI são desiguais.** O AGENTS.md pede a chave `llm_provider_label.<id>` nos 14 arquivos `webui/i18n/*.json`. Hoje só `en` e `zh` têm 15 rótulos, os demais têm apenas o de `moonshot`. O resto aparece com o `default_label` do registro.\n\n> [!warning] unstable\n> `empiriolabs` (EmpirioLabs AI) veio do merge do upstream Turbo v1.3.9 (commit 0dc4e20 segundo o relatório de divergência). Estado a confirmar na `main`. O restante desta nota é estado `main`.\n\n## Como adicionar um provedor novo\n\n1. **Registro.** Adicione um `LLMProviderSpec` em `LLM_PROVIDER_REGISTRY` (`app/models/llm_provider.py:195`). A ordem da tupla é a ordem do dropdown. Para um provedor compatível com OpenAI bastam `provider_id`, `default_label`, `api_key_url`, `default_model` e `default_base_url`. Só crie ramo novo em `llm.py` se o protocolo for outro.\n2. **Config.** Copie um bloco existente em `config.example.toml`, dentro de `[app]`: `<id>_api_key`, `<id>_base_url` e `<id>_model_name` (ex.: o bloco `groq_*`).\n3. **Interface.** Adicione `llm_provider_label.<id>` em todos os 14 `webui/i18n/*.json` (AGENTS.md). A WebUI cai no `default_label` se a chave faltar (`webui/Main.py:2277`). `llm_provider_tips.<id>` é opcional e só aparece se existir (`Main.py:2196`).\n4. **Teste.** Use `test/services/test_fluxionai_llm.py` como modelo: `uv run python -X utf8 -m pytest -q test/services/test_fluxionai_llm.py test/services/test_llm.py`.\n\n## Prática\n\n1. Em qual linha do registro fica o provedor padrão, e qual é ele?\n2. Um provedor compatível com OpenAI precisa de um ramo novo em `llm.py`? Por quê?\n3. Se `deepseek_api_key` estiver vazia, o que acontece antes de qualquer chamada de rede?\n\n> [!faq]- Gabarito\n> 1. Linha 195 (`LLM_PROVIDER_REGISTRY` começa lá; o primeiro item é `moonshot`). Por isso ele é o padrão em `DEFAULT_LLM_PROVIDER_ID` (`:4`).\n> 2. Não. O caminho padrão é o SDK da OpenAI com `base_url`. Ramo novo só para protocolo diferente.\n> 3. `_generate_response` levanta `ValueError: deepseek: api_key is not set` (`llm.py:377`). Nenhuma requisição sai, e a task falha na etapa `script`.\n\n## Conexões\n\n- [[Assinaturas em vez de chaves]] — `claude_code` e `kimi_code`, que não usam chave.\n- [[Provedores e adaptadores]] — tabela completa do registro.\n- [[Chaves de configuração]] — onde ficam `<id>_api_key` e as demais chaves.\n- [[Pipeline e stop_at]] — a etapa `script` que usa o LLM.\n- [[03 - Integrações.canvas|Canvas]]\n"
    },
    {
     "id": "c07",
     "section": "concept",
     "title": "Assinaturas em vez de chaves",
     "tags": [
      "mapa",
      "integracoes"
     ],
     "status": "unstable",
     "sources": [
      "app/services/llm.py",
      "app/services/kimi_code_oauth.py",
      "app/models/llm_provider.py",
      "config.example.toml",
      "Dockerfile.claude",
      "docker-compose.claude.yml",
      "webui/kimi_login.py"
     ],
     "body": "# Assinaturas em vez de chaves\n\n[[00 - Índice|← Índice]]\n\nDois provedores usam a assinatura que você já paga (Claude ou Kimi) no lugar de uma chave de API cobrada por token.\n\n## Ideia central\n\nChave de API é cobrada por uso: cada token entra na conta. Assinatura é um plano mensal com limite de uso. Ela não entrega chave. A credencial fica com o cliente oficial (a CLI do Claude ou o login OAuth da Kimi), e o programa só pede que ele responda. Por isso esses provedores têm `requires_api_key=False` no registro.\n\n| | Chave de API | Assinatura |\n|---|---|---|\n| Como autentica | `Authorization` com chave em `[app]` | CLI logada ou token OAuth |\n| Cobrança | por token | plano mensal, com limite |\n| Provedores | a maioria | `claude_code`, `kimi_code` |\n\n## Como funciona\n\n### Claude (`claude_code`)\n\nO adaptador não fala com a API da Anthropic. Ele executa a CLI oficial em modo headless (`app/services/llm.py:545`).\n\n1. Comando: `claude -p --output-format json --system-prompt <...> --tools \"\" --safe-mode`, com `--model` só se `claude_code_model_name` estiver preenchido (`llm.py:~560-580`). O prompt vai por **stdin**, porque no Windows o `cmd.exe` corta prompts multilinha passados como argumento.\n2. `--tools \"\"` desliga as ferramentas. `--safe-mode` desliga CLAUDE.md, skills, hooks, plugins e MCP. A execução acontece num diretório temporário vazio (`llm.py:~590`).\n3. Versão mínima: `CLAUDE_CODE_MIN_CLI_VERSION = \"2.1.260\"` (`llm.py:82`). CLI antiga sai com `unknown option`, e o erro pede a atualização.\n4. `build_claude_code_env` (`llm.py:167`) remove as variáveis que trocariam a assinatura por outra forma de cobrança: prefixos `ANTHROPIC_*` e `CLAUDE_CODE_USE_*`, além de `AWS_BEARER_TOKEN_BEDROCK` e `CLAUDE_CODE_SKIP_*_AUTH`. Preserva `CLAUDE_CODE_OAUTH_TOKEN`, `ANTHROPIC_CONFIG_DIR` e `CLAUDE_CONFIG_DIR`.\n5. Timeout: `claude_code_timeout`, padrão 300 s (`CLAUDE_CODE_DEFAULT_TIMEOUT`, `llm.py:78`). `coerce_claude_code_timeout` (`llm.py:115`) rejeita zero, negativo, `nan` e `inf`.\n\nNo Docker, o `Dockerfile.claude` instala `@anthropic-ai/claude-code@2.1.260` via npm. O `docker-compose.claude.yml` exige `CLAUDE_CODE_OAUTH_TOKEN` (com `:?`, obrigatório). O token sai do host com `claude setup-token`, porque o container não tem keychain.\n\n### Kimi (`kimi_code`)\n\nO login usa o device flow (RFC 8628), em `app/services/kimi_code_oauth.py`.\n\n1. Pede o código: `POST {auth}/api/oauth/device_authorization` (`kimi_code_oauth.py:162`). O usuário aprova no navegador.\n2. Troca por token: `POST {auth}/api/oauth/token` (`:202`), com `grant_type=urn:ietf:params:oauth:grant-type:device_code` (`:209-210`).\n3. Regiões em `_REGIONS` (`:47`). China: `auth.kimi.com` e `api.kimi.com/coding/v1`. Global: `auth.kimi.ai` e `api.kimi.ai/coding/v1`.\n4. Token expira em `expires_in`, padrão 900 s = 15 min (`:266`). `get_valid_access_token` (`:311`) renova 60 s antes do vencimento (`_EXPIRY_MARGIN_SECONDS`, `:71`), com trava para renovações concorrentes.\n5. Os tokens ficam em `[app]`: `kimi_code_access_token`, `kimi_code_refresh_token`, `kimi_code_token_expires_at` e `kimi_code_region` (`config.example.toml:475-480`).\n6. A chamada usa o SDK da OpenAI com o access token e os cabeçalhos de identidade da CLI (`llm.py:666-724`). A região do token vence a região escolhida na tela, porque um token de uma região dá 401 na outra.\n7. A tela de login está em `webui/kimi_login.py` (`render_kimi_login`, `:129`).\n\n## Exemplo / percurso\n\nUsuário escolhe `claude_code` com `claude_code_timeout` vazio. O `coerce_claude_code_timeout` devolve 300 s. A CLI responde um JSON com `result`, e `_normalize_text_response` limpa o texto. O roteiro vai para `storage/tasks/<id>/script.json`. Se a CLI estiver deslogada, o JSON vem com `is_error` e a mensagem de login, e o erro chega à task como `[claude_code] returned an error response`.\n\n## Armadilhas\n\n- **Chave antiga no ambiente.** Se `ANTHROPIC_API_KEY` estiver no ambiente, ela é removida. A cobrança segue a assinatura, não a chave. O log registra só o nome da variável removida.\n- **Docker sem token.** Dentro do container não há login interativo. Sem `CLAUDE_CODE_OAUTH_TOKEN`, a chamada falha, e a mensagem sugere `claude setup-token`.\n- **Docstring desatualizada.** O cabeçalho de `kimi_code_oauth.py` (linhas 9-12) diz que o programa chama `{api}/usages` e `{api}/messages`. O código só chama chat completions. A descrição está errada.\n\n> [!warning] unstable\n> A seção seguinte é **PLANEJADO**: ainda não existe no código. Busquei `Codex`, `Gemini CLI`, `Grok Build`, `SuperGrok` e `STT`/`TTS` xAI no repositório e não achei implementação. A fonte do plano de fases não foi encontrada no repositório. Estado a confirmar.\n\n## Próximas (PLANEJADO)\n\n| Item | Estado |\n|---|---|\n| Codex CLI (assinatura) | PLANEJADO, não existe |\n| Gemini CLI (assinatura) | PLANEJADO, não existe |\n| Grok Build / SuperGrok | PLANEJADO, não existe |\n| STT e TTS da xAI | PLANEJADO, não existe |\n\n## Prática\n\n1. Por que `claude_code` remove `ANTHROPIC_API_KEY` do ambiente antes de rodar a CLI?\n2. Por que o prompt vai por stdin, e não como argumento?\n3. Qual é a validade do access token da Kimi, e quando ele é renovado?\n\n> [!faq]- Gabarito\n> 1. Para que a CLI use o login da assinatura, e não a chave. Sem a remoção, a cobrança iria para a conta de API. A função é `build_claude_code_env` (`llm.py:167`).\n> 2. No Windows o `cmd.exe` corta argumentos no primeiro newline (comentário em `llm.py`, perto da linha 556). Stdin preserva o prompt inteiro.\n> 3. 15 min (900 s por padrão, `kimi_code_oauth.py:266`). Renovado 60 s antes do vencimento (`:71`), via refresh token.\n\n## Conexões\n\n- [[Provedores de LLM]] — o registro e os adaptadores.\n- [[Chaves de configuração]] — `kimi_code_*` e `claude_code_*`.\n- [[Configuração e travas]] — por que a leitura de config passa pela trava.\n- [[03 - Integrações.canvas|Canvas]]\n"
    },
    {
     "id": "c08",
     "section": "concept",
     "title": "Voz e legenda",
     "tags": [
      "mapa",
      "integracoes"
     ],
     "status": "unstable",
     "sources": [
      "app/services/voice.py",
      "app/services/subtitle.py",
      "app/services/task.py",
      "app/utils/utils.py",
      "app/utils/subtitle_writer.py",
      "config.example.toml",
      "app/models/schema.py"
     ],
     "body": "# Voz e legenda\n\n[[00 - Índice|← Índice]]\n\nO áudio é gerado **antes** da legenda, e a legenda é alinhada ao tempo desse áudio.\n\n## Ideia central\n\nNarração (TTS) e legenda são etapas separadas, mas ligadas. A legenda do provedor `edge` usa os tempos que a própria síntese devolve. O provedor `whisper` ignora esses tempos e transcreve o áudio. Como o áudio vem primeiro, `POST /subtitle` também roda a TTS.\n\n## Como funciona\n\n1. `generate_audio` (`app/services/task.py:551`) escolhe a fonte: arquivo enviado pelo usuário (`resolve_custom_audio_file`), prévia reaproveitada da WebUI, ou `voice.tts`.\n2. `tts` (`app/services/voice.py:1138`) trata pausas. Sem tag de pausa, chama `_single_tts` direto (`voice.py:640`).\n3. `_single_tts` escolhe o provedor pelo **prefixo do nome da voz**. Ordem: `no-voice` (`generate_silent_audio`, `:593`), `-V2` (`azure_tts_v2`, `:1784`), `siliconflow:`, `gemini:`, `mimo:`, `minimax:`, `elevenlabs:`, `chatterbox:`, `kokoro:`, `fish_audio:`, `voxcpm:`. Sem prefixo, cai no Edge/Azure v1 (`azure_tts_v1`, `:1535`).\n4. Pausas: `[pause: 2s]` e as variantes em outros idiomas (`pausa`, `silence`, `停顿`...) são reconhecidas por `PAUSE_TAG_PATTERN` (`app/utils/utils.py:328`). A duração vai de 0,1 s a 10 s (`utils.py:337-338`).\n5. Só o Edge v1 sintetiza em segmentos separados, com silêncio PCM exato (`_tts_with_pauses`, `voice.py:972`). Os demais provedores removem as tags e sintetizam de uma vez.\n6. `generate_subtitle` (`task.py:649`) lê `config.app.subtitle_provider` (padrão `edge`, `config.example.toml:516`).\n   - `edge`: `voice.create_subtitle` (`voice.py:3679`), com os tempos da síntese.\n   - `whisper`: `subtitle.create` (`app/services/subtitle.py:61`), com faster-whisper, e depois `subtitle.correct` (`:230`), que compara com o roteiro.\n7. A escrita é atômica (`staged_subtitle_file`, `app/utils/subtitle_writer.py:11`).\n\nProvedores de TTS e configuração:\n\n| Voz (prefixo) | Função | Configuração |\n|---|---|---|\n| Edge / Azure v1 (padrão, sem chave) | `azure_tts_v1` (`voice.py:1535`) | `edge_tts_timeout` |\n| Azure v2 (sufixo `-V2`) | `azure_tts_v2` (`:1784`) | `[azure]` `speech_key`, `speech_region` |\n| `siliconflow:` | `siliconflow_tts` (`:1604`) | `[siliconflow]` `api_key` |\n| `gemini:` | `gemini_tts` (`:1913`) | `gemini_api_key` |\n| `mimo:` | `mimo_tts` (`:2055`) | `mimo_api_key`, `mimo_base_url` |\n| `minimax:` | `minimax_tts` (`:2380`) | `[minimax_tts]` |\n| `elevenlabs:` | `elevenlabs_tts` (`:2473`) | `[elevenlabs]` `api_key` |\n| `chatterbox:` | `chatterbox_tts` (`:2766`) | `[chatterbox]` |\n| `kokoro:` | `kokoro_tts` (`:2808`) | `[kokoro]` |\n| `fish_audio:` | `fish_audio_tts` (`:2862`) | `[fish_audio]` ou `FISH_API_KEY` |\n| `voxcpm:` | `voxcpm_tts` (`:3210`) | `[voxcpm]`, aceita áudio de referência |\n| `no-voice` | `generate_silent_audio` | nenhuma |\n\n`chatterbox` e `kokoro` usam o mesmo auxiliar `_openai_compatible_tts` (`voice.py:2654`).\n\n## Exemplo / percurso\n\nVoz padrão do schema: `zh-CN-XiaoxiaoNeural-Female` (`app/models/schema.py:175`). Uma task com esse valor passa por `azure_tts_v1`, grava `storage/tasks/<id>/audio.mp3` e mede a duração do arquivo. Com `subtitle_provider = \"edge\"`, o `subtitle.srt` sai dos tempos da síntese. Se a síntese do Edge falhar, a legenda é pulada, e o log diz `skip subtitles without falling back to whisper`. Não há fallback automático.\n\n## Armadilhas\n\n- **Whisper é global.** `subtitle_provider` vale para todas as tasks. Não existe parâmetro por task.\n- **Sem legenda não é erro.** Falha do Edge gera vídeo sem legenda, e a task segue. Quem confere a legenda é o usuário.\n- **O prefixo decide o provedor.** Um nome de voz sem o prefixo certo cai no Edge sem aviso. Ex.: `gemini-...` sem `gemini:` vai para Azure.\n- **Tag de pausa com provedor não-Edge.** A pausa é removida, não virada em silêncio. O texto perde o tempo da pausa.\n\n> [!warning] unstable\n> As correções de voz e legenda do upstream Turbo v1.3.9 (volume em dB do SiliconFlow, tags de pausa após palavras-chave CJK, linhas só de símbolos, arredondamento de segundos e de timestamps do SRT, quebra de linhas com palavras longas) só estão na branch `unstable`. Veja [[Omni e Turbo]].\n\n## Prática\n\n1. Em que ordem rodam `generate_audio` e `generate_subtitle`? Por quê isso importa para `POST /subtitle`?\n2. Qual provedor de legenda usa os tempos da síntese, e qual transcreve o áudio?\n3. O que acontece com `[pause: 2s]` se a voz for `kokoro:`?\n\n> [!faq]- Gabarito\n> 1. Áudio primeiro (`task.py:1715` chama `generate_audio`; `:1760` chama `generate_subtitle`). Por isso `POST /subtitle` sempre sintetiza a voz antes de legendar.\n> 2. `edge` usa os tempos da síntese. `whisper` transcreve (faster-whisper).\n> 3. A tag é removida pelo `remove_pause_tags` em `tts` (`voice.py:1138`), sem silêncio. Só o Edge v1 gera a pausa.\n\n## Conexões\n\n- [[Pipeline e stop_at]] — a ordem das etapas.\n- [[Chaves de configuração]] — `[whisper]`, `[azure]`, `[kokoro]` e as demais chaves.\n- [[Material de vídeo]] — a etapa seguinte.\n- [[03 - Integrações.canvas|Canvas]]\n"
    },
    {
     "id": "c09",
     "section": "concept",
     "title": "Material de vídeo",
     "tags": [
      "mapa",
      "integracoes"
     ],
     "status": "unstable",
     "sources": [
      "app/services/material.py",
      "app/services/task.py",
      "app/services/video.py",
      "app/services/cache_manager.py",
      "app/services/material_cache.py",
      "app/services/twelvelabs.py",
      "cli.py",
      "app/models/schema.py",
      "app/services/video_project.py"
     ],
     "body": "# Material de vídeo\n\n[[00 - Índice|← Índice]]\n\nA etapa de material traz os trechos de vídeo ou imagem, de banco de imagens, de geração por IA ou de arquivos locais, e o estágio `video` monta tudo.\n\n## Ideia central\n\nExiste uma função de entrada, `download_videos` (`app/services/material.py:2161`), que escolhe a fonte pelo `video_source`. Stock e IA usam chave e cobram por uso. A fonte `local` não faz chamada externa. O estágio final, `generate_final_videos` (`task.py:980`), junta o material com legenda e trilha.\n\n## Como funciona\n\n1. `get_video_materials` (`task.py:723`) valida a fonte contra `_SUPPORTED_VIDEO_SOURCES` (`task.py:97`): `pexels`, `pixabay`, `coverr`, `local`, `wavespeed`, `volcengine_seedance`, `ofox`, `metaso_minimax`, `muapi`, `loomloom` e `openai_image`.\n2. Despacho em `download_videos`:\n   - Stock: `_search_videos_with_cache` (`material.py:1853`) chama `search_videos_pexels` (`:341`), `search_videos_pixabay` (`:448`) ou `search_videos_coverr` (`:590`). Com ordem de roteiro, vai para `_download_videos_by_script_order` (`:2938`).\n   - IA: `generate_videos_wavespeed` (`:805`), e os `_download_videos_*_on_demand` de Seedance (`:2486`), OFox (`:2599`), MuAPI (`:2704`) e Metaso (`:2824`).\n   - `openai_image`: `generate_images_openai` (`:1677`) e `_download_videos_openai_image_on_demand` (`:1760`).\n   - `local`: `video.preprocess_video` (`app/services/video.py:1955`).\n   - `loomloom`: só pela WebUI. A CLI não aceita essa fonte (`cli.py:40`).\n3. Cobrança confirmada. Fontes pagas exigem `--confirm-<provedor>-charge` na CLI (`cli.py:750-789`). A WebUI tem checkboxes `*_confirm_charge` (`webui/Main.py:772-776`). Não encontrei o campo equivalente na API.\n4. Caches: `storage/cache_videos` (`material.py:1159`), `storage/cache_images` (`:1635`) e `storage/cache_material_search` (`app/services/material_cache.py:116`). A limpeza fica em `clean_video_cache` (`app/services/cache_manager.py:180`).\n5. `twelvelabs` é opcional. Quando habilitado, `rerank_terms_by_subject` (`app/services/twelvelabs.py:113`) reordena os termos antes da busca (`task.py:416`). Precisa do extra `twelvelabs` instalado.\n6. A montagem usa `combine_videos` (`video.py:973`) e `generate_video` (`video.py:1569`), que mistura áudio, legenda e trilha.\n\n## Exemplo / percurso\n\n```bash\nuv run python cli.py --video-subject \"Vida das abelhas\" --video-source pexels\n```\n\nO estágio `materials` baixa clipes para `storage/cache_videos/`. O `script.json` da task ganha `material_sources`. O estágio `video` gera `storage/tasks/<id>/combined-0.mp4` e `final-0.mp4`, e atualiza `material_selections` no `script.json`.\n\nPara `local`, o comando exige `--video-materials`. O mesmo `--stop-at terms` não tem efeito com `local` (`cli.py:728`).\n\n> [!warning] unstable\n> Estes itens vieram do merge do upstream Turbo v1.3.9, segundo o relatório de divergência, e estão marcados como instáveis:\n> - Movimento de imagem `--image-motion static|zoom` (`cli.py:447`, `ImageMotion` em `app/models/schema.py:56`).\n> - Servidor SDXL local em `docs/local-image-server/`, citado em `config.example.toml:204`. A busca no código do app não achou integração SDXL; só o servidor standalone existe. Estado a confirmar.\n> - Provedor EmpirioLabs, em [[Provedores de LLM]].\n\n## Armadilhas\n\n- **Fonte paga sem confirmação.** A CLI sai com código 2 (entrada inválida) antes de gastar qualquer crédito.\n- **`video_project.py` não faz parte do pipeline.** Nenhum módulo do app o importa. Ele serve para re-renderizar revisões locais: `python -m app.services.video_project --help`. Só os testes o usam.\n- **LoomLoom só pela WebUI.** Via API, o pedido com essa fonte falha na etapa `materials`.\n- **Cache é compartilhado.** `storage/cache_videos` não é por task. Limpe com cuidado.\n\n## Prática\n\n1. Quais fontes de stock existem, e quais funções de busca as atendem?\n2. O que a CLI exige antes de usar `--video-source wavespeed`?\n3. Por que `video_project.py` não é uma etapa do pipeline?\n\n> [!faq]- Gabarito\n> 1. Pexels, Pixabay e Coverr, pelas funções `search_videos_*` em `material.py` (`:341`, `:448`, `:590`).\n> 2. A flag `--confirm-wavespeed-charge` (`cli.py:750`). Sem ela, a CLI sai com erro de entrada.\n> 3. Porque nenhum módulo do pipeline o importa. Ele é uma ferramenta separada, rodada com `python -m`.\n\n## Conexões\n\n- [[Voz e legenda]] — a etapa anterior.\n- [[Música e publicação]] — a trilha usada na etapa de vídeo.\n- [[Pipeline e stop_at]] — onde a etapa `materials` entra.\n- [[Chaves de configuração]] — as chaves de cada fonte.\n- [[03 - Integrações.canvas|Canvas]]\n"
    },
    {
     "id": "c10",
     "section": "concept",
     "title": "Música e publicação",
     "tags": [
      "mapa",
      "integracoes"
     ],
     "status": "stable",
     "sources": [
      "app/services/bgm.py",
      "app/services/task.py",
      "app/services/upload_post.py",
      "app/services/llm.py",
      "app/services/sonilo.py",
      "app/services/elevenlabs_music.py",
      "app/asgi.py",
      "config.example.toml"
     ],
     "body": "# Música e publicação\n\n[[00 - Índice|← Índice]]\n\nA trilha pode ser um arquivo local ou gerada por IA. Depois do render, o vídeo pode ser enviado a plataformas em segundo plano.\n\n## Ideia central\n\nMúsica e publicação são etapas opcionais que rodam em volta do pipeline. A trilha entra na montagem do vídeo. A publicação roda **depois** que a task termina, numa thread separada. Se o processo reiniciar no meio, o envio não é retomado.\n\n## Como funciona\n\n### Trilha\n\n1. `should_use_bgm` (`app/services/bgm.py:73`) decide se há trilha.\n2. Trilha local: `list_bgm_files` (`bgm.py:361`) junta as músicas embutidas em `resource/songs` e os uploads em `storage/bgm` (`uploaded_bgm_dir`, `bgm.py:90`).\n3. Trilha por IA: `_VIDEO_MUSIC_PROVIDERS` (`app/services/task.py:79`) registra dois provedores.\n   - `sonilo` (`app/services/sonilo.py`): chave `sonilo_api_key` ou env `SONILO_API_KEY`, prompt de até 2000 caracteres (`MAX_PROMPT_LENGTH`, `sonilo.py:25`).\n   - `elevenlabs` (`app/services/elevenlabs_music.py`): chave `[elevenlabs] api_key`, `music_model_id = \"music_v2\"`, prompt de até 1000 caracteres (`elevenlabs_music.py:24`).\n4. Preflight (`task.py:1609` em diante): chave presente, prompt dentro do limite, e `validate_generation_access()` quando existe (`elevenlabs_music.py:177`, chamado em `task.py:1639`). Tudo isso roda antes de qualquer chamada paga.\n5. Na etapa `video`, `generate_final_videos` (`task.py:980`) chama `service.generate_bgm` para cada índice. O arquivo sai como `<bgm_type>-bgm-i.m4a` (Sonilo) ou `.mp3` (ElevenLabs).\n\n### Publicação\n\n1. Ao terminar, `_schedule_cross_post` (`task.py:1463`) envia `_run_cross_post_with_slot` ao `_cross_post_executor` (`task.py:45`), que tem `max_workers=2`.\n2. Um `BoundedSemaphore` limita os envios pendentes a `upload_post_max_pending_tasks`, padrão 10 (`task.py:51-53`; `config.example.toml:603`).\n3. `_run_cross_post` (`task.py:1259`) chama `llm.generate_social_metadata` (`app/services/llm.py:1343`), que devolve título, legenda e hashtags. Depois chama `upload_post.cross_post_video` (`app/services/upload_post.py:396`).\n4. `UploadPostService` (`upload_post.py:23`) usa `API_BASE = \"https://api.upload-post.com\"` (`:24`), com cabeçalho `Authorization: Apikey ...`. Plataformas padrão: TikTok e Instagram (`config.example.toml:587`).\n5. No boot da API, `recover_interrupted_cross_posts` (`task.py:1217`), chamada por `app/asgi.py:45`, marca como falha os envios que estavam ativos. Os vídeos gerados são mantidos.\n\n## Exemplo / percurso\n\nUma task com `bgm_type = \"elevenlabs\"` e `video_music_prompt = \"piano calmo\"`:\n\n1. Preflight valida a chave e o tamanho do prompt.\n2. A etapa `video` grava `storage/tasks/<id>/elevenlabs-bgm-0.mp3` e mistura na `final-0.mp4`.\n3. Com `upload_post_enabled = true`, a task termina `complete`. O envio vai para o executor, e a state guarda `cross_post_state`. Se o processo cair antes de terminar, a próxima subida marca o envio como `failed`.\n\n## Armadilhas\n\n- **Prompt longo demais.** Sonilo aceita 2000 caracteres, ElevenLabs aceita 1000. O preflight recusa antes da cobrança.\n- **Envio não é retomado.** Reinício no meio de um envio marca `failed`. Ele não é refeito.\n- **Pool de 2 threads.** Muitas tasks com publicação automática esperam na fila. Não é um serviço de fila persistente.\n- **Redis e `ast.literal_eval`.** Os valores do estado são lidos com `ast.literal_eval`. O Redis precisa ser privado e confiável.\n\n## Prática\n\n1. Quantas publicações podem rodar em paralelo, e o que limita o número de pendentes?\n2. O que `recover_interrupted_cross_posts` faz com um envio que estava `processing` quando o processo caiu?\n3. Qual campo de `config.example.toml` define a plataforma padrão de publicação?\n\n> [!faq]- Gabarito\n> 1. Duas threads (`max_workers=2`, `task.py:45`). O limite de pendentes vem de `upload_post_max_pending_tasks`, padrão 10 (`task.py:51`).\n> 2. Marca como `failed`. Não retoma, e preserva os vídeos já gerados (`task.py:1217`).\n> 3. `upload_post_platforms` (`config.example.toml:587`), com padrão `[\"tiktok\", \"instagram\"]`.\n\n## Conexões\n\n- [[Material de vídeo]] — a etapa que produz o vídeo.\n- [[Pipeline e stop_at]] — quando a publicação roda.\n- [[Estado das tasks e fila]] — os campos `cross_post_*`.\n- [[Chaves de configuração]] — `upload_post_*` e `[elevenlabs]`.\n- [[03 - Integrações.canvas|Canvas]]\n"
    },
    {
     "id": "c11",
     "section": "concept",
     "title": "Harness de agentes",
     "tags": [
      "mapa",
      "agentes"
     ],
     "status": "unstable",
     "sources": [
      "AGENTS.md",
      ".agents/setup.md",
      ".agents/tecnico.md",
      ".agents/pipeline.md",
      ".agents/grok-bot.md",
      ".agents/comunicacao.md"
     ],
     "body": "# Harness de agentes\n\n[[00 - Índice|← Índice]]\n\nO repositório também é um **harness**: textos e JSON que dizem a um assistente de IA como produzir um vídeo ou mudar o programa, sem ele precisar adivinhar.\n\n## Ideia central\n\nUm **harness** é a camada que liga um modelo de IA ao trabalho: regras, papéis, roteiros de etapas e permissões. Aqui o harness não é código do programa. Ele vive em arquivos de texto. Um assistente que lê `AGENTS.md` e a skill certa consegue rodar o time de vídeo ou o time técnico.\n\nA regra de ouro: **uma fonte só**. `AGENTS.md` e `.agents/` dizem o que vale. As pastas de cada ferramenta (`.claude/`, `.grok/`) guardam só adaptadores finos que apontam para lá.\n\n## Como funciona\n\n1. `AGENTS.md` é a porta de entrada para qualquer assistente. Tem os comandos do programa e três seções de harness: vídeo (`AGENTS.md:50`), time técnico (`AGENTS.md:90`) e Grok (`AGENTS.md:114`).\n2. `.agents/` guarda o conteúdo:\n\n| Item | O que é |\n|---|---|\n| `setup.md` | regras do time de vídeo, prioridades, padrões e regras fixas |\n| `pipeline.md` | pasta do projeto, etapas e contratos de arquivo |\n| `tecnico.md` | regras do time técnico, pasta da tarefa e checagens do CI |\n| `gostos.md` | gostos do criador (música, visual, narração); hoje são só marcadores |\n| `comunicacao.md` | como falar com o usuário, de forma curta; os relatórios dos papéis não seguem essa regra |\n| `perfis/` | um perfil por canal dark (ver [[Perfis de canal]]) |\n| `roles/` | um arquivo por papel: 20 ao todo |\n| `playbooks/` | receitas de ferramenta: `yt-dlp`, `redes-sociais`, `ffmpeg-timeline`, `moneyprinter` |\n| `skills/` | orquestração: `video/` e `manutencao/`, com scripts |\n| `tools/` | `sync_grok_agents.py`, que gera os adaptadores do Grok |\n| `grok-bot.md` | guia para montar o time no Grok Bot, que não lê o repositório |\n\n3. Quando duas regras conflitam, vale a ordem de `setup.md:6-15`: pedido explícito > `brief.md` > perfil > gostos > setup. No time técnico a ordem é pedido > `pedido.md` > `AGENTS.md` > `tecnico.md` (`tecnico.md:8-13`).\n4. Cada ferramenta lê a própria pasta de adaptador. O Claude Code lê `.claude/`; o Grok Build lê `.grok/` e, segundo `AGENTS.md:116`, também `.claude/agents/`. Ver [[Adaptadores Claude e Grok]].\n\nRegras que o harness repete em todo lugar: nunca publicar, nunca mudar `config.toml`, parada de aprovação antes do download e auditoria antes da entrega (`setup.md:59-62`, `setup.md:76-77`).\n\n## Exemplo / percurso\n\nPedido típico: \"siga `.agents/skills/video/SKILL.md` para um vídeo sobre <tema>\".\n\n- O assistente lê `AGENTS.md` e `setup.md`, escolhe o perfil (`SKILL.md:27-30`) e cria `storage/projects/<slug>/brief.md` (`SKILL.md:32`).\n- Se a ferramenta tem subagentes, delega cada papel a um, usando o arquivo do papel (`SKILL.md:16-18`). Se não tem, executa os papéis em sequência, lendo o arquivo de cada um.\n\nNo time técnico, \"siga `.agents/skills/manutencao/SKILL.md` para <pedido>\" cria `storage/manutencao/<slug>/pedido.md` (`manutencao/SKILL.md:22-26`).\n\n## Armadilhas\n\n- **`AGENTS.md` está atrasado.** Ele diz que o time técnico tem \"dois modos\" (`AGENTS.md:94`). A skill tem quatro: mudança, auditoria, pesquisa de integração e harness (`manutencao/SKILL.md:8-12`). A tabela de papéis de vídeo também deixa de fora o `animador` (`AGENTS.md:73-83`).\n- **Gostos vazios.** `gostos.md` tem só marcadores (`<ex.: ...>`), mas todo papel manda seguir o arquivo. Sem preencher, o agente escolhe pelo perfil.\n- **Harness não é o pipeline.** `.agents/` descreve o trabalho dos agentes. O programa segue em `app/`. Mudar o harness não muda o MoneyPrinterOmni.\n- **O estado varia por branch.** Parte do time técnico e dos MCPs não está na `main`. Ver [[Branches main e unstable]].\n\n> [!warning] unstable\n> O time técnico (`tecnico.md`, `skills/manutencao`, os papéis técnicos) e os MCPs de Reddit e Apify são `status/unstable`. Ver [[Time técnico]] e [[MCP e permissões]]. Estado de `comunicacao.md`: estado a confirmar.\n\n## Prática\n\n1. Quando duas regras conflitam, qual delas vence: a do perfil ou a do pedido?\n2. A regra de um papel fica em `.claude/agents/` ou em `.agents/roles/`?\n3. Um vídeo pronto é publicado pelo harness? Por quê?\n\n> [!faq]- Gabarito\n> 1. O pedido explícito. A ordem é pedido > brief > perfil > gostos > setup (`setup.md:6-15`).\n> 2. Em `.agents/roles/`. O adaptador em `.claude/agents/` só aponta para lá.\n> 3. Não. É regra fixa: nunca publicar, enviar ou agendar (`setup.md:76-77`). O papel `diretor` só entrega o checklist.\n\n## Conexões\n\n- Anterior: [[Visão geral]]. Próximos: [[Time de vídeo e contratos de arquivo]], [[Time técnico]], [[Adaptadores Claude e Grok]], [[MCP e permissões]].\n- Referência: [[Papéis e modelos]], [[Contratos JSON dos agentes]].\n- Canvas: [[04 - Time de vídeo.canvas|Canvas do time de vídeo]], [[05 - Time técnico.canvas|Canvas do time técnico]].\n"
    },
    {
     "id": "c12",
     "section": "concept",
     "title": "Adaptadores Claude e Grok",
     "tags": [
      "mapa",
      "agentes"
     ],
     "status": "stable",
     "sources": [
      ".claude/agents/arquiteto.md",
      ".claude/skills/video/SKILL.md",
      ".grok/agents/arquiteto.md",
      ".grok/skills/video/SKILL.md",
      ".agents/tools/sync_grok_agents.py",
      "skills-lock.json",
      ".agents/grok-bot.md",
      "AGENTS.md"
     ],
     "body": "# Adaptadores Claude e Grok\n\n[[00 - Índice|← Índice]]\n\nCada ferramenta de IA lê uma pasta própria, e essa pasta só repete o que está em `.agents/`.\n\n## Ideia central\n\nUm **adaptador** é um arquivo fino que a ferramenta entende (um subagente ou uma skill) e que aponta para a fonte única. O corpo do adaptador não tem regra nova. Se a regra mudar, muda só em `.agents/`.\n\nHá dois adaptadores:\n- **Claude Code**: `.claude/agents/` (subagentes) e `.claude/skills/` (skills).\n- **Grok Build** (`grok`): `.grok/agents/` (gerado) e `.grok/skills/video/` (escrito à mão).\n\n## Como funciona\n\n1. **Subagentes do Claude.** Cada um dos 20 arquivos de `.claude/agents/` tem um cabeçalho (`name`, `description`, `model`, `tools`) e um corpo curto: \"Leia e siga `.agents/roles/<papel>.md`\" (exemplo: `.claude/agents/arquiteto.md:2-5`, cabeçalho; corpo logo abaixo).\n2. **Modelo por papel.** A linha `model:` existe só aqui. Três papéis usam `haiku`: `montador-mpt` (`.claude/agents/montador-mpt.md:4`), `designer-de-thumbnail` e `redator-de-publicacao`. Os outros dezessete usam `sonnet`. A regra vem de `setup.md:68-74` e `tecnico.md:64-66`.\n3. **Skills do Claude.** `.claude/skills/video/SKILL.md` e `.claude/skills/manutencao/SKILL.md` recebem `$ARGUMENTS` e mandam ler `.agents/skills/...`. Também há 12 skills `remotion-*`, vendorizadas de `remotion-dev/skills` e fixadas pelo hash em `skills-lock.json` (12 entradas).\n4. **Subagentes do Grok.** `.grok/agents/` é gerado por `.agents/tools/sync_grok_agents.py`. O script copia `name`, `description` e `tools` do adaptador Claude, troca `model` por `inherit` e aponta o corpo para o papel (`sync_grok_agents.py:50`, corpo em `:24-27`).\n5. **Verificação.** `python3 .agents/tools/sync_grok_agents.py --check` sai com 1 se algum arquivo está desatualizado, ou se sobra um adaptador gerado sem papel (`sync_grok_agents.py:101`). Sem `--check`, ele escreve. Ele não toca em arquivos feitos à mão, porque só remove os que têm a marca \"Adaptador do Grok Build.\" (`:23`).\n6. **Grok Bot é outra coisa.** O app Grok Bot não lê o repositório. O guia `.agents/grok-bot.md` diz para criar um bot por papel, colando a instrução \"Leia e siga `.agents/roles/<papel>.md`\" dentro do app. São 12 bots no guia de vídeo.\n\n## Exemplo / percurso\n\nQuando você troca a regra de um papel:\n\n1. Edite `.agents/roles/<papel>.md`. Os adaptadores não mudam.\n2. Se trocar o modelo, edite `model:` em `.claude/agents/<papel>.md`.\n3. Rode `python3 .agents/tools/sync_grok_agents.py`. Ele regera `.grok/agents/`; o `model` continua `inherit`.\n4. Rode `--check` antes de commitar: deve imprimir `ok: .grok/agents em dia`.\n\nO mesmo fluxo vale para novos papéis. Crie `.agents/roles/<papel>.md`, depois o `.claude/agents/<papel>.md`, e rode o script.\n\n## Armadilhas\n\n- **`.grok/skills/video/SKILL.md` fica fora do `--check`.** O script só cuida de `.grok/agents/`. Esse arquivo é escrito à mão, e pode sair de sincronia.\n- **Não existe `.grok/skills/manutencao/`.** O time técnico tem skill no Claude, mas o Grok só enxerga a do vídeo.\n- **`model: sonnet` não existe no Grok.** Por isso o gerado usa `inherit` (`AGENTS.md:119`). Não edite `.grok/agents/` à mão: a próxima geração apaga a mudança.\n- **O Grok Bot não usa estes arquivos.** Configuração, skills e rotinas do Grok Bot são criadas no app, não lidas do repositório. A xAI não documenta a leitura de `.mcp.json` pelo bot.\n\n> [!warning] unstable\n> Os adaptadores dos papéis técnicos (`arquiteto` a `mantenedor-do-harness`) e a skill `manutencao` existem só no time técnico, que é `status/unstable`. Ver [[Time técnico]].\n\n## Prática\n\n1. Onde você muda a regra de um papel para que Claude e Grok a sigam?\n2. Por que o `--check` não pega um erro em `.grok/skills/video/SKILL.md`?\n3. Qual modelo roda o `montador-mpt` no Claude Code?\n\n> [!faq]- Gabarito\n> 1. Em `.agents/roles/<papel>.md`. Os dois adaptadores só apontam para lá.\n> 2. Porque o script só compara `.grok/agents/`. A skill do Grok é um arquivo à parte, sem verificação.\n> 3. `haiku` (`.claude/agents/montador-mpt.md:4`).\n\n## Conexões\n\n- Anterior: [[Harness de agentes]]. Próximo: [[MCP e permissões]].\n- Times: [[Time de vídeo e contratos de arquivo]], [[Time técnico]].\n- Referência: [[Papéis e modelos]].\n- Canvas: [[04 - Time de vídeo.canvas|Canvas do time de vídeo]].\n"
    },
    {
     "id": "c13",
     "section": "concept",
     "title": "MCP e permissões",
     "tags": [
      "mapa",
      "agentes"
     ],
     "status": "unstable",
     "sources": [
      ".mcp.json",
      ".claude/settings.json",
      ".claude/hooks/ensure-yt-dlp.sh",
      ".agents/playbooks/redes-sociais.md",
      ".agents/playbooks/yt-dlp.md",
      ".claude/agents/pesquisador.md",
      "AGENTS.md"
     ],
     "body": "# MCP e permissões\n\n[[00 - Índice|← Índice]]\n\nServidores **MCP** dão aos agentes ferramentas de leitura de redes sociais, e o Claude Code libera ou bloqueia cada uma.\n\n## Ideia central\n\n**MCP** (Model Context Protocol) é o jeito padrão de um assistente usar ferramenta externa. Cada servidor expõe funções, como \"baixar metadados\" ou \"buscar no Reddit\". No harness, os servidores servem à pesquisa e à curadoria de vídeos-fonte. Todos são **só de leitura**: nada posta, comenta, curte nem agenda.\n\nTrês camadas controlam o acesso:\n1. `.mcp.json` define o servidor e as variáveis (segredos entram como `${VAR}`).\n2. `enabledMcpjsonServers` em `.claude/settings.json` liga os servidores.\n3. `permissions.allow` e `permissions.deny` liberam ou bloqueiam cada ferramenta.\n\n## Como funciona\n\n1. **Servidores** (`.mcp.json`):\n\n| Servidor | Tipo | Pacote ou URL | Estado |\n|---|---|---|---|\n| `yt-dlp` | stdio | `npx @kevinwatt/yt-dlp-mcp@0.10.0` (`.mcp.json:3`) | `status/stable` |\n| `reddit` | stdio | `npx reddit-mcp-buddy@1.1.14` (`.mcp.json:14`) | `status/unstable` |\n| `apify` | http | `mcp.apify.com/?tools=...`, com `Authorization: Bearer ${APIFY_TOKEN}` (`.mcp.json:25`) | `status/unstable` |\n\n2. **Ligação e permissões** (`.claude/settings.json`): `enabledMcpjsonServers` (linha 3) liga os três. `allow` (linha 5) libera 10 ferramentas do `yt-dlp`, 5 do `reddit` e 6 do `apify` (3 atores de leitura e 3 de consulta à execução e aos dados). `deny` (linha 28) bloqueia escrita no Apify: `call-actor`, criar, editar, publicar e despublicar tarefas de ator, agendamentos e `report-problem`.\n3. **Subagentes**: a linha `tools:` do papel aceita o nome do servidor, como `mcp__yt-dlp` (`.claude/agents/pesquisador.md:5`). Não precisa listar cada ferramenta.\n4. **Hook de sessão**: `SessionStart` roda `.claude/hooks/ensure-yt-dlp.sh` (`settings.json:41-49`, tempo limite 120 s). O script sempre cria `~/.cache/yt-dlp-mcp`. Só na nuvem (`CLAUDE_CODE_REMOTE=true`, linha 14) instala o `yt-dlp` com `uv tool install` (linha 23, 90 s). Sempre sai com 0, para não derrubar a sessão.\n5. **Segredos**: `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` e `APIFY_TOKEN` entram só como `${VAR}`. Nenhum valor vai para o git.\n\n## Exemplo / percurso\n\nUm papel pesquisa um post no X para ilustrar uma cena:\n\n1. O `pesquisador` tem `mcp__yt-dlp` em `tools:`. Ele chama `ytdlp_get_video_metadata` e depois `ytdlp_download_video_subtitles`. Ambas estão em `allow`.\n2. Se quiser postar ou comentar, nenhuma ferramenta existe para isso: não há o que liberar.\n3. Se o Apify for chamado para executar um ator novo, a chamada `call-actor` cai no `deny`.\n4. O post vira pista, não fonte: `redes-sociais.md` manda marcar `[1 fonte]` e creditar `@handle (plataforma, data, link)`.\n\n## Armadilhas\n\n- **Limites da nuvem.** Sem login, o `yt-dlp` falha no YouTube (\"Sign in to confirm you're not a bot\"), TikTok, Instagram e Reddit. O X costuma funcionar. A causa é o IP de datacenter (`redes-sociais.md:84-87`, `yt-dlp.md:60-62`). O `reddit` anônimo funciona na nuvem, mas o `score` vem vazio (`redes-sociais.md:89`).\n- **\"Gratuito\" não é tudo.** `AGENTS.md:65` e `redes-sociais.md:5` dizem que os servidores são gratuitos. O Apify cobra por resultado (`redes-sociais.md:29`). Sem `APIFY_TOKEN`, ele sobe sem ferramentas (`redes-sociais.md:91`).\n- **Permissão não é regra.** O `deny` impede a chamada. A regra \"nunca publicar\" continua em `setup.md`, e o harness depende dela também.\n- **Não verificado:** se o Grok Build lê `.mcp.json` e `.claude/settings.json`. `AGENTS.md:116` afirma que sim; não testei.\n\n> [!warning] unstable\n> `reddit` e `apify` estão só na branch `unstable`, com as entradas do `allow` e do `deny` que os citam. Na `main`, só o `yt-dlp` e o hook. Ver [[Branches main e unstable]].\n\n## Prática\n\n1. Onde fica a lista de servidores MCP e onde fica a lista de ferramentas liberadas?\n2. Um papel quer usar `mcp__apify` inteiro. O que precisa ter em `tools:`?\n3. Por que o hook do `SessionStart` sempre sai com 0?\n\n> [!faq]- Gabarito\n> 1. `.mcp.json` tem os servidores. `.claude/settings.json` tem `enabledMcpjsonServers`, `allow` e `deny`.\n> 2. Só `mcp__apify` (o nome do servidor). Ferramentas liberadas ou bloqueadas são controladas em `settings.json`.\n> 3. Para não derrubar a sessão: qualquer falha vira aviso no stderr (`ensure-yt-dlp.sh`, comentário de cabeçalho).\n\n## Conexões\n\n- Anterior: [[Adaptadores Claude e Grok]]. Próximo: [[Time de vídeo e contratos de arquivo]].\n- Ver também: [[Harness de agentes]], [[Assinaturas em vez de chaves]], [[Testes e CI]].\n- Canvas: [[04 - Time de vídeo.canvas|Canvas do time de vídeo]].\n"
    },
    {
     "id": "c14",
     "section": "concept",
     "title": "Time de vídeo e contratos de arquivo",
     "tags": [
      "mapa",
      "video"
     ],
     "status": "stable",
     "sources": [
      ".agents/skills/video/SKILL.md",
      ".agents/pipeline.md",
      ".agents/setup.md",
      ".agents/roles/pesquisador.md",
      ".agents/skills/video/scripts/build_timeline.py",
      ".agents/skills/video/scripts/build_music.py",
      ".agents/skills/video/scripts/build_thumbnail.py",
      ".agents/skills/video/scripts/arte.py",
      ".agents/skills/video/scripts/srt_to_timing.py"
     ],
     "body": "# Time de vídeo e contratos de arquivo\n\n[[00 - Índice|← Índice]]\n\nO time de vídeo é uma sequência de papéis que trocam **arquivos** numa pasta de projeto. Quem escreve e quem lê cada arquivo está definido em contrato.\n\n## Ideia central\n\nOs papéis não conversam entre si. Cada um lê arquivos de entrada, escreve os de saída e para. Quem garante o encaixe é o contrato: `pipeline.md` diz o nome, o formato e o dono de cada arquivo. Assim, um papel pode ser trocado, ou rodar em outro assistente, sem mudar o resto.\n\n## Como funciona\n\n**Os 12 papéis** (`.agents/roles/`, modelo em [[Papéis e modelos]]):\n\n| Papel | Faz |\n|---|---|\n| `pesquisador` | fatos com fonte, vídeos-fonte, roteiro e trilha |\n| `critico` | aponta falhas de conteúdo (etapa 2) e visuais (etapa 10) |\n| `sugestor-de-pauta` | até 8 ideias de casos, dados e cenas |\n| `auditor` | confere fatos na fonte (etapa 2) e direitos (etapa 10) |\n| `diretor-de-arte` | legenda, textos na tela e thumbnail |\n| `diretor` | pacote de aprovação (passo 5) e entrega (passo 12) |\n| `montador-mpt` | único que roda o MoneyPrinterOmni: tempo, trilha e render |\n| `cacador-de-clipes` | escolhe o trecho de cada cena (`shotlist.json`) |\n| `animador` | gráficos em Remotion (passo 7b), ver [[Animações com Remotion]] |\n| `editor-de-clipes` | gera os clipes com `build_timeline.py` e escreve os créditos |\n| `designer-de-thumbnail` | thumbnails com `build_thumbnail.py` |\n| `redator-de-publicacao` | títulos, descrição, tags e comentário fixado |\n\n**As 13 etapas** (`SKILL.md:41-72`):\n\n1. `pesquisador` escreve pesquisa, fontes, roteiro e plano de música.\n2. Em paralelo: `critico`, `sugestor-de-pauta` e `auditor` (fatos).\n3. Se houver `REVISAR` ou `CORRIGIR`, o pesquisador revisa. No máximo 2 rodadas.\n4. `diretor-de-arte` escreve `arte.md` e `arte.json`.\n5. **Parada:** `diretor` leva o pacote ao usuário. Só segue com o aval dele (`SKILL.md:47-49`).\n6. `montador-mpt` faz o tempo (áudio, legenda, `timing.json`) e a trilha (`music.json`, `bgm.mp3`).\n7. `cacador-de-clipes` escreve `shotlist.json`.\n7b. `animador` renderiza `raw/anim_NN.mp4` para as cenas com `anim`.\n8. `editor-de-clipes` gera a timeline e o `credits.md`.\n9. `montador-mpt` faz o render: `output/final.mp4`.\n10. Em paralelo: `critico` (visual) e `auditor` (direitos). No máximo 2 rodadas.\n11. Em paralelo: `designer-de-thumbnail` e `redator-de-publicacao`.\n12. `diretor` escreve `entrega.md`: `PRONTO` ou `REFAZER <etapa>`.\n13. Relatório final. Nada é publicado.\n\n**A pasta do projeto** (`storage/projects/<slug>/`, `pipeline.md:11-33`). O `storage/` não vai para o git.\n\n**Quem escreve e quem lê** (resumo de `pipeline.md:37-51`):\n\n| Arquivo | Escreve | Lê |\n|---|---|---|\n| `brief.md` | orquestrador; `montador` acrescenta a velocidade final | todos |\n| `research.md` | `pesquisador` | crítico, auditor, sugestor, redator |\n| `sources.json` | `pesquisador` | caçador, editor, auditor, diretor de arte |\n| `script.txt` | `pesquisador` | montador (`--video-script`), designer, redator |\n| `music-plan.md` | `pesquisador` | montador, diretor de arte |\n| `arte.json` | `diretor-de-arte` | caçador, `build_timeline`, `build_thumbnail`, montador |\n| `timing.json` | `montador` (a partir da legenda) | caçador, animador, `build_music`, redator |\n| `music.json` | `montador` | `build_music`, auditor, editor |\n| `bgm.mp3` | `build_music.py` | render (`--bgm-file`) |\n| `shotlist.json` | `caçador` | animador, editor, `build_timeline`, auditor |\n| `raw/` | caçador, editor, animador | `build_timeline`, designer |\n| `timeline/NN.mp4` | editor (via `build_timeline.py`) | render, designer |\n| `credits.md` | editor | auditor, redator, diretor |\n| `output/final.mp4` | `montador` (cópia do render) | crítico, auditor, diretor |\n| `entrega.md` | `diretor` | usuário |\n\n**Os scripts** (`.agents/skills/video/scripts/`, só biblioteca padrão do Python e ffmpeg):\n\n- `srt_to_timing.py <subtitle.srt> <timing.json>` converte a legenda em frases com início e fim (`parse` em `:18-35`).\n- `build_timeline.py <projeto> [--aspect] [--only] [--preview]` gera `timeline/NN.mp4` sem áudio, com a duração exata (`build` em `:142-157`). A origem é `file` ou `url`. Com `url`, baixa com `nix shell ... yt-dlp` (`:117-123`).\n- `build_music.py <projeto> [--duration] [--preview]` monta `bgm.mp3` com crossfade (`:70`) e copia para `storage/bgm/<slug>.mp3` (`:116-118`).\n- `build_thumbnail.py <projeto> --text \"L1|L2\"` monta a capa; a primeira linha usa `color`, as outras `accent` (`:1-12`).\n- `arte.py` é só biblioteca. Lê `arte.json`, mescla padrões (`DEFAULTS` em `:9-13`) e desenha o texto com `drawtext` (`:43-57`).\n\n## Exemplo / percurso\n\nUm trecho real do contrato de `shotlist.json` (`pipeline.md:76-79`):\n\n```json\n{\"n\": \"01\", \"phrases\": [1], \"dur\": 4.2, \"url\": \"https://www.youtube.com/watch?v=...\",\n \"start\": 4.0, \"kind\": \"fill\", \"why\": \"portais visíveis\"}\n```\n\nO caçador escreve o item. O editor lê `url` e `start` e chama `build_timeline.py`, que grava `raw/hi_*.mp4` e `timeline/01.mp4`. O campo `phrases` e o campo `why` não são lidos por nenhum script. Eles existem para os agentes.\n\n## Armadilhas\n\n- **Campos sem leitor.** `build_timeline.py` não lê `anim`, `props`, `phrases` nem `why`. O `anim` é instrução para o animador (`cacador-de-clipes.md:35-36`). `sources.json` e `arte.json.legenda` também não têm leitor em script: a legenda vira flags pelo montador, à mão.\n- **Parada não é opcional.** O pacote vai ao usuário antes de baixar e editar (`setup.md:59-60`). Pular o passo 5 inverte essa ordem. A regra da skill está em `SKILL.md:125`.\n- **Pasta fora do projeto.** `build_music.py` copia para `storage/bgm/`, fora de `storage/projects/<slug>/`. A regra \"não apagar fora do projeto\" (`setup.md:76-77`) não cita essa pasta.\n- **Revisão tem limite.** Dois ciclos em cada laço. Depois disso, leve o problema ao usuário (`pipeline.md:53`).\n\n> [!warning] unstable\n> A zoom lento de imagens em `fit` (`build_timeline.py:58-63`) e a chave `motion` são `status/unstable`. A cena animada com as composições novas também (ver [[Animações com Remotion]]). O resto desta nota é `status/stable`.\n\n## Prática\n\n1. Quem escreve `arte.json` e quem o lê para desenhar a legenda?\n2. Um `shotlist.json` tem `\"anim\": \"ReverseFlow\"`. O que precisa existir para o render funcionar?\n3. Por que a parada do passo 5 vem antes do download, e não depois do render?\n\n> [!faq]- Gabarito\n> 1. O `diretor-de-arte` escreve. O `build_timeline` lê `texto_na_tela` e o `build_thumbnail` lê `thumbnail`. A legenda é traduzida para flags pelo montador (`pipeline.md:110-112`).\n> 2. O `animador` precisa renderizar `raw/anim_NN.mp4` e o campo `file` apontando para ele. O script só enxerga `file`.\n> 3. Porque `setup.md:59-60` manda levar o pacote ao usuário antes de baixar e editar.\n\n## Conexões\n\n- Anterior: [[Adaptadores Claude e Grok]]. Próximo: [[Time técnico]].\n- Ver também: [[Pipeline e stop_at]], [[Voz e legenda]], [[Material de vídeo]], [[Música e publicação]], [[Perfis de canal]].\n- Referência: [[Contratos JSON dos agentes]], [[Papéis e modelos]].\n- Canvas: [[04 - Time de vídeo.canvas|Canvas do time de vídeo]].\n"
    },
    {
     "id": "c15",
     "section": "concept",
     "title": "Time técnico",
     "tags": [
      "mapa",
      "tecnico"
     ],
     "status": "unstable",
     "sources": [
      ".agents/skills/manutencao/SKILL.md",
      ".agents/tecnico.md",
      ".agents/roles/arquiteto.md",
      ".agents/roles/revisor-de-codigo.md",
      ".agents/roles/auditor-de-seguranca.md",
      ".agents/roles/mantenedor-do-harness.md",
      "AGENTS.md"
     ],
     "body": "# Time técnico\n\n[[00 - Índice|← Índice]]\n\nO time técnico muda ou audita o **programa** (o código em `app/`, `cli.py` e `webui/`). É outro time, separado do de vídeo: ele não produz vídeo.\n\n## Ideia central\n\nMudar código sem plano gera regressão. Por isso o time separa quem planeja, quem escreve, quem testa e quem revisa. Quem revisa só aponta. Quem escreve não aprova o próprio código. A regra mais forte é o plano: mudança grande só anda com o aval do usuário.\n\n## Como funciona\n\n**Os quatro modos** (`manutencao/SKILL.md:8-12`):\n\n| Modo | Para quê | Seção |\n|---|---|---|\n| mudança | corrigir bug, incluir função, refatorar | `SKILL.md:28-41` |\n| auditoria | avaliar sem mudar nada; lista priorizada | `SKILL.md:43-48` |\n| pesquisa de integração | avaliar API, SDK ou MCP candidato | `SKILL.md:50-56` |\n| harness | revisar `AGENTS.md`, `.agents/`, adaptadores e permissões | `SKILL.md:58-63` |\n\n**Os oito papéis** (todos usam `sonnet` no Claude; ver [[Papéis e modelos]]):\n\n| Papel | Escreve | Faz |\n|---|---|---|\n| `arquiteto` | `plano.md` | lê o código, lista arquivos, passos e riscos. Não edita código. |\n| `desenvolvedor` | `mudancas-NN.md` | implementa na camada de serviço; roda ruff e os testes da área |\n| `testador` | `testes-NN.md` | teste que falha para bug; cobertura; suíte inteira. Só edita `test/` |\n| `revisor-de-codigo` | `revisao-NN.md` | bugs, contratos entre API, WebUI e CLI, padrões. Só aponta |\n| `auditor-de-seguranca` | `seguranca-NN.md` | arquivos, subprocess, SSRF, segredos, dependências. Só aponta |\n| `auditor-de-saude` | `saude.md` | CI, cobertura, código morto, dívida. Lista priorizada, sem veredito |\n| `pesquisador-de-integracoes` | `integracoes-NN.md` | candidatos com fonte, auth, custo e termos. Não instala nada |\n| `mantenedor-do-harness` | `harness-NN.md` | edita o harness quando pedido e registra o diff |\n\n**A pasta da tarefa** é `storage/manutencao/<slug>/` (`tecnico.md:15-31`). Ela fica fora do git, como `storage/projects/`. O primeiro arquivo é `pedido.md`, escrito pelo orquestrador.\n\n**Mudança, passo a passo** (`SKILL.md:30-40`):\n\n1. `arquiteto` escreve o `plano.md`.\n2. **Parada:** se a mudança toca API pública, schema, config, dependência nova ou mais de cinco arquivos, o plano vai ao usuário.\n3. `testador` escreve um teste que falha, para bugs.\n4. `desenvolvedor` implementa e roda ruff e os testes da área.\n5. `testador` completa a cobertura e roda a suíte inteira.\n6. `revisor-de-codigo` e `auditor-de-seguranca` rodam em paralelo.\n7. Se algum disser `REVISAR`, o desenvolvedor corrige e os passos 5 e 6 rodam de novo. No máximo 2 rodadas.\n8. Relatório final ao usuário. Nada é commitado sem o aval dele.\n\n**Regras que os papéis seguem** (`tecnico.md:33-66`):\n\n- comportamento novo vai em `app/services/`, para que API, WebUI e CLI recebam pelo mesmo `task.start()`;\n- texto novo da WebUI entra em todos os `webui/i18n/*.json`;\n- recursos pelo `app/paths.py`; arquivo de entrada pelo `app/utils/file_security.py`;\n- config nova em `config.py` e em `config.example.toml`, nunca no `config.toml` do usuário;\n- dependência só com `uv add`, com justificativa no plano;\n- todo bug corrigido ganha teste que falhava antes.\n\n**Checagens do CI**, que precisam passar antes de declarar pronto (`tecnico.md:51-57`):\n\n```sh\nuv run ruff check app cli.py main.py webui test docs/skill\nuv run python -X utf8 -m pytest -q test\nuv run python -X utf8 -m coverage run -m pytest -q test && uv run python -m coverage report  # fail_under = 70\n```\n\nSe a mudança toca `animations/`, roda também `npm run typecheck --prefix animations`.\n\n**Vereditos** (`tecnico.md:68-73`): cada item é `bloqueia`, `importante` ou `detalhe`. Revisor e auditor de segurança terminam em `APROVADO` ou `REVISAR`. `REVISAR` quando há algum `bloqueia` ou três ou mais `importante`.\n\n## Exemplo / percurso\n\nUm pedido de \"adicionar um provedor de LLM\" toca API e config, então o plano vai ao usuário antes de qualquer código. O percurso completo, com arquivos, está em [[05 - Mudança pelo time técnico]].\n\n## Armadilhas\n\n- **Textos desatualizados.** A descrição de `manutencao/SKILL.md:3` e a do adaptador Claude listam seis papéis; são oito. `AGENTS.md:94` diz \"dois modos\"; são quatro.\n- **Git não é do time.** Nenhum papel faz commit, push ou PR (`tecnico.md:60-61`).\n- **Checagem vermelha não passa.** \"Checagens do CI vermelhas = não está pronto\", qualquer que seja o veredito (`SKILL.md:68`).\n\n> [!warning] unstable\n> Todo este time é `status/unstable`: os papéis, os modos de integração e harness, e `storage/manutencao/`. Estado a confirmar na branch de origem. Ver [[Branches main e unstable]].\n\n## Prática\n\n1. Quantos modos e quantos papéis tem o time técnico hoje?\n2. Uma mudança toca `config.py` e um arquivo de `webui/`. O que o arquiteto precisa colocar no plano antes de qualquer código?\n3. Um revisor encontra dois itens `importante` e nenhum `bloqueia`. Qual é o veredito?\n\n> [!faq]- Gabarito\n> 1. Quatro modos (`manutencao/SKILL.md:8-12`) e oito papéis (`AGENTS.md:102-109`).\n> 2. O plano precisa mostrar a mudança de config (mudança de API ou config exige parada, `SKILL.md:30-33`). Também precisa indicar a camada de serviço e os testes, e dizer que o `webui/i18n/*.json` muda em todos os idiomas.\n> 3. `APROVADO`. `REVISAR` só com um `bloqueia` ou com três ou mais `importante` (`tecnico.md:72-73`).\n\n## Conexões\n\n- Anterior: [[Time de vídeo e contratos de arquivo]]. Ver também: [[Como contribuir]], [[Testes e CI]], [[Harness de agentes]].\n- Exemplo: [[05 - Mudança pelo time técnico]].\n- Canvas: [[05 - Time técnico.canvas|Canvas do time técnico]].\n"
    },
    {
     "id": "c16",
     "section": "concept",
     "title": "Perfis de canal",
     "tags": [
      "mapa",
      "video"
     ],
     "status": "stable",
     "sources": [
      ".agents/perfis/_modelo.md",
      ".agents/perfis/saude.md",
      ".agents/setup.md",
      ".agents/gostos.md",
      ".agents/skills/video/SKILL.md",
      ".agents/playbooks/moneyprinter.md"
     ],
     "body": "# Perfis de canal\n\n[[00 - Índice|← Índice]]\n\nCada vídeo pertence a um **perfil**: o jeito de um canal dark (sem rosto) falar, mostrar e embalar um assunto.\n\n## Ideia central\n\nO perfil é o terceiro item da ordem de prioridade. Ele diz o público, o tom, a narração, o visual, a trilha e as fontes. Um vídeo herda tudo do perfil e só escreve no `brief.md` o que muda. Só duas coisas não são sobrescritas por perfil: as \"Regras fixas\" do setup e os \"Cuidados obrigatórios\" do perfil (`setup.md:15`).\n\n## Como funciona\n\n1. **Arquivos.** `.agents/perfis/` tem o modelo `_modelo.md` e cinco perfis: `financas`, `historia-ciencia`, `infantil`, `saude` e `tecnologia`.\n2. **Cabeçalho.** Cada perfil começa com um bloco de campos: `perfil` (o nome do arquivo sem `.md`), `nome`, `link`, `plataformas`, `idioma`, `voz`, `velocidade`, `formato` e `duracao` (`_modelo.md:1-11`).\n3. **Treze seções**, nesta ordem (`_modelo.md:20-99`): Identidade (20), Narração (30), Roteiro (37), Identidade visual (44), Trilha (53), Fontes de informação (59), Imagem (65), Cuidados obrigatórios (72), O que funciona (77), Embalagem (81), Gostos do canal (87), Canais de referência (91) e Histórico (99).\n4. **Escolha.** Se o pedido não diz o perfil: com um só, usa-o; com vários, lista nome e público e pergunta; sem nenhum, segue com os padrões e oferece criar um a partir do modelo (`setup.md:19-25`, `SKILL.md:27-30`).\n5. **Gostos.** `gostos.md` vale para todos os perfis. Um perfil pode mudar qualquer item da seção \"Gostos do canal\" (`gostos.md:3-4`).\n6. **Histórico.** Ao terminar um vídeo, o diretor anota na tabela do perfil: data, slug, duração e o que funcionou (`setup.md:29-30`, `SKILL.md:69-70`). A tabela de cada perfil é o lugar dessas notas.\n\n## Exemplo / percurso\n\nO perfil `saude` (`saude.md`) mostra o uso das seções:\n\n- **Cuidados obrigatórios** (linha 63): \"Nada de diagnóstico, prescrição ou dose; oriente procurar um profissional.\" Esta seção não é sobrescrita por pedido de brief.\n- **Histórico** (linha 85): tabela com as colunas Data, Vídeo (slug), Duração e Observações.\n\nPara usar, o pedido diz \"use o perfil saude\" ou o assistente pergunta. Ao criar o `brief.md`, ele escreve `perfil: saude`.\n\n## Armadilhas\n\n- **Referência não é molde.** Canais de referência ensinam ritmo, gancho e estrutura. Não copie roteiro, bordão, vinheta ou trecho deles, salvo quando o perfil diz que o material é liberado (`setup.md:26-28`).\n- **Voz com nome diferente.** O modelo traz `voz: pt-BR-AntonioNeural-Male` (`_modelo.md:7`), e o playbook escreve `pt-BR-AntonioNeural` (`moneyprinter.md:17`). O mesmo nome aparece com sufixos diferentes em dois arquivos; ver [[Voz e legenda]].\n- **Perfil sem a seção de cuidados.** Um perfil novo que esquece \"Cuidados obrigatórios\" perde a proteção. Copie sempre do `_modelo.md`.\n\n> [!warning] unstable\n> A **proposta** de perfil em pasta, com `assets/`, `assets.json` e `referencias/`, está **PLANEJADO**. Não existe no código nem em arquivos: nenhuma referência a `assets.json` ou a `referencias/` foi encontrada no repositório. Ela leva `status/unstable` e não deve ser usada até existir.\n\n## Prática\n\n1. Um pedido de vídeo não cita perfil, e há dois perfis. O que o assistente faz?\n2. Onde fica a regra que um perfil não pode sobrescrever?\n3. Quando o diretor atualiza o perfil, e com que dados?\n\n> [!faq]- Gabarito\n> 1. Lista nome e público de cada um e pergunta qual usar (`setup.md:21-22`).\n> 2. As \"Regras fixas\" do setup e os \"Cuidados obrigatórios\" do perfil (`setup.md:15`).\n> 3. Ao terminar o vídeo, com data, slug, duração e o que funcionou ou não (`setup.md:29-30`).\n\n## Conexões\n\n- Anterior: [[Time de vídeo e contratos de arquivo]]. Ver também: [[Voz e legenda]], [[Música e publicação]], [[Material de vídeo]].\n- Canvas: [[04 - Time de vídeo.canvas|Canvas do time de vídeo]].\n"
    },
    {
     "id": "c17",
     "section": "concept",
     "title": "Animações com Remotion",
     "tags": [
      "mapa",
      "animacoes"
     ],
     "status": "unstable",
     "sources": [
      "animations/src/Root.tsx",
      "animations/src/lib.tsx",
      "animations/remotion.config.ts",
      "animations/package.json",
      "docs/animations.md",
      ".agents/roles/animador.md",
      ".agents/pipeline.md"
     ],
     "body": "# Animações com Remotion\n\n[[00 - Índice|← Índice]]\n\n`animations/` é um projeto Remotion (React e TypeScript) que renderiza gráficos e esquemas animados em mp4. O `animador` usa esse projeto para cenas que não existem como foto ou vídeo.\n\n## Ideia central\n\nUma cena com `\"anim\"` no `shotlist.json` vira um mp4 com a duração exata. O resto do pipeline não sabe que houve animação: o `build_timeline.py` trata o mp4 como um arquivo local. Assim, a animação entra na timeline como qualquer outro clipe.\n\n## Como funciona\n\n1. **Projeto.** Remotion 4.0.536 em todos os pacotes `remotion` e `@remotion/*`, React 19.2.3 e TypeScript 5.9.3 (`animations/package.json`, dependências). O `remotion.config.ts` liga o rspack, frames em JPEG, sobrescrita de saída e 2 s de pré-montagem.\n2. **Scripts npm** (`package.json`): `dev` e `studio` abrem o editor, `render` e `still` exportam, `typecheck` roda `tsc --noEmit` e `lint` roda o eslint.\n3. **Composições** em `src/Root.tsx`. Todas são 1080x1920 e 30 fps, exceto `HelloChartWide`, que é 1920x1080:\n\n| Id | Linha | Uso |\n|---|---|---|\n| `HelloChart` | 22 | exemplo, 9:16 |\n| `HelloChartWide` | 31 | exemplo, 16:9 |\n| `ReverseFlow` | 40 | fluxo em etapas |\n| `AgentSwarm` | 50 | grade preenchida por agentes |\n| `ByteCompare` | 60 | comparação byte a byte |\n| `TimelineAnos` | 70 | barras e pares de programas |\n| `TerminalAntigo` | 80 | terminal com erros |\n| `FedoraVersoes` | 90 | linha do tempo de versões |\n| `ComentaBalao` | 100 | balões de comentário |\n| `TrocariaCard` | 110 | chips e pergunta em amarelo |\n| `QuoteCard` | 120 | cartão de citação, 1 quadro |\n\n4. **Duração.** `durationMetadata` (`lib.tsx:38-40`) converte `durationSeconds` em quadros: `round(segundos × 30)`, com mínimo de 1. Por isso o `dur` do shotlist vira `durationSeconds` no render.\n5. **Cores e fonte** ficam em `lib.tsx` (`FPS` na linha 14, `colors` a partir da linha 16). A fonte é BeVietnamPro, carregada de `public/`.\n6. **Caminho até a timeline:**\n   - `cacador-de-clipes` marca a cena com `\"anim\"`, `\"file\": \"raw/anim_NN.mp4\"` e `\"kind\": \"fill\"`;\n   - o `animador` roda `cd animations && npx remotion render <Id> ../storage/projects/<slug>/raw/anim_NN.mp4 --props='{\"durationSeconds\":<dur>, ...}'` (`animador.md:33`);\n   - `build_timeline.py` lê o `file` como arquivo local;\n   - o montador junta os clipes no render.\n\n## Exemplo / percurso\n\nUma cena de 7,4 s com três etapas, como na documentação (`docs/animations.md:43`):\n\n```sh\ncd animations\nnpx remotion render ReverseFlow ../storage/projects/<slug>/raw/anim_01.mp4 \\\n  --props='{\"durationSeconds\":7.4,\"steps\":[\"A\",\"B\",\"C\"]}'\nnpx remotion still ByteCompare out/preview.png --frame=240   # confere um quadro\n```\n\nO animador confere o quadro, a legibilidade (texto de pelo menos 48 px) e se nada cobre a área da legenda (`animador.md:34-36`). Depois aponta o `file` no shotlist, ou pede ao caçador que ajuste.\n\n## Armadilhas\n\n- **`QuoteCard` e `HelloChartWide` fora da documentação.** `QuoteCard` tem 1 quadro e não cabe no caminho `render → fill`: precisa de `remotion still` e `kind: image`. `docs/animations.md` não lista nenhuma das duas; `animador.md` nomeia só quatro composições (`animador.md:26`).\n- **Duração errada.** Se o `durationSeconds` não bate com o `dur` do shotlist, a cena fica mais curta ou mais longa que a narração.\n- **Licença.** O Remotion é grátis para indivíduos e equipes pequenas. Empresas maiores precisam de licença paga (`docs/animations.md:49`).\n- **`kit.tsx` é compartilhado.** Mudar `kit.tsx` afeta `ComentaBalao`, `FedoraVersoes` e `TrocariaCard`.\n\n> [!warning] unstable\n> As quatro composições `TerminalAntigo`, `FedoraVersoes`, `ComentaBalao` e `TrocariaCard`, além de `src/kit.tsx`, existem só na branch com as novas animações (PR #1). Estado a confirmar na `main`. Ver [[Branches main e unstable]].\n\n## Prática\n\n1. Quais campos do `shotlist.json` disparam a renderização de uma animação?\n2. Por que o `build_timeline.py` não precisa saber que o clipe veio do Remotion?\n3. Um clipe tem `durationSeconds` de 4 e o `dur` do shotlist é 4,2. O que acontece?\n\n> [!faq]- Gabarito\n> 1. `\"anim\"` e `\"file\"`. O `kind` é `fill` (`animador.md:37`; `pipeline.md:82-83`).\n> 2. Porque ele recebe um mp4 em `file`, como qualquer arquivo local (`docs/animations.md:47`). O `anim` não é lido por script.\n> 3. O clipe fica com 4 s, e a cena pede 4,2 s. Ele não cobre a fala inteira. Regra: `durationSeconds` = `dur`.\n\n## Conexões\n\n- Anterior: [[Time de vídeo e contratos de arquivo]]. Ver também: [[Material de vídeo]], [[Adaptadores Claude e Grok]].\n- Referência: [[Contratos JSON dos agentes]].\n- Canvas: [[04 - Time de vídeo.canvas|Canvas do time de vídeo]].\n"
    },
    {
     "id": "c18",
     "section": "concept",
     "title": "Omni e Turbo",
     "tags": [
      "mapa",
      "omni-turbo"
     ],
     "status": "unstable",
     "sources": [
      "app/paths.py",
      "app/services/version_checker.py",
      "app/models/llm_provider.py",
      "webui/Main.py",
      "webui/i18n/pt.json",
      "pyproject.toml",
      "app/__init__.py",
      "docs/release-notes-v1.3.9.md",
      "docs/packaging.md",
      "update.sh",
      "README.md"
     ],
     "body": "# Omni e Turbo\n\n[[00 - Índice|← Índice]]\n\nO MoneyPrinterOmni é um fork do MoneyPrinterTurbo: herda o pipeline, acrescenta o harness de agentes e continua recebendo versões do upstream por merge.\n\n## Ideia central\n\nO Omni nasceu do fork do Turbo no commit `9e7d8b7` (\"fix(task): keep tasks with invalid state (#1663)\", 17/10/2026). O nome do pacote (`mpt`) e o layout `app/` não mudaram, então os caminhos de código são os mesmos do Turbo. A diferença está no rebrand, no harness de agentes, no `animations/` e no ambiente Nix.\n\n## Como funciona\n\n1. **Origem.** Fork no commit `9e7d8b7`. Confirmado na sessão; este worktree não tem histórico git para reconferir.\n2. **Rebrand (`a6c685c`, 67 arquivos).** Trocou os nomes e acrescentou dois ajustes de compatibilidade:\n   - `app/paths.py:38` (`_with_legacy`): se a pasta de dados nova não existe e a antiga `MoneyPrinterTurbo` existe, o programa continua usando a antiga.\n   - `webui/Main.py:2965-2967`: aceita arquivos exportados com o schema antigo `moneyprinterturbo.`.\n3. **O que o Omni acrescentou.** `.agents/` (times de agentes), `.claude/` e `.grok/` (adaptadores), `animations/` (Remotion), `flake.nix` e `update.sh`. O `README.md` é o inglês; chinês e japonês ficam em `README-zh.md` e `README-ja.md`.\n4. **Merge do upstream v1.3.9.** Em 22/10/2026 o Omni incorporou 25 commits do upstream. No worktree estão os artefatos: `app/utils/request_logging.py`, `docs/diagnostic-logging.md`, `docs/local-image-server/` e `docs/release-notes-v1.3.9.md`. A versão está em `app/__init__.py:3` e `pyproject.toml:10`.\n\n> [!warning] unstable\n> O merge v1.3.9 só existe na branch `unstable`. Opções de movimento de imagem, logging com controles em tempo de execução, servidor SDXL local e provedor EmpirioLabs: estado a confirmar, pouco testados no Omni.\n\n5. **Sincronizar com o upstream.** O relatório de divergência recomendou um merge único, não cherry-picks, porque os 25 commits dependem uns dos outros. O roteiro:\n   1. Adicionar o remote `upstream` apontando para `harry0703/MoneyPrinterTurbo`. (Convenção; não verifiquei a configuração de remotes deste worktree.)\n   2. Buscar o histórico completo do upstream.\n   3. Fazer o merge numa branch nova, a partir da base do Omni. Nunca force-push.\n   4. Resolver os conflitos previsíveis (ver Armadilhas).\n   5. Rodar a checagem de nomes, `uv lock --check` e a suíte de testes.\n\n## Exemplo / percurso\n\nPara descobrir onde o código ainda cita o Turbo, rode uma busca de leitura (saída real neste worktree):\n\n```sh\ngrep -rn \"harry0703\\|MoneyPrinterTurbo\" app webui cli.py main.py docs/skill --include=*.py\n```\n\nResultado: `app/paths.py:39-40` (compatibilidade de pasta), `app/services/video.py:1593` (link de issue), `app/services/version_checker.py:17,20` (releases do upstream), `app/models/llm_provider.py:337` (`utm_term=MoneyPrinterTurbo`), `webui/Main.py:88` (crédito de fork), `docs/skill/mpt_agent.py:68` (`utm_source=MoneyPrinterTurbo`). Nos JSON de `webui/i18n/`, 14 de 14 arquivos trazem `utm_content=moneyprinterturbo` em links de provedores.\n\n## Armadilhas\n\n- **Conflitos previsíveis no merge.** `README.md` e `README-ja.md` (o Omni reescreveu e apagou `README-en.md`; segundo o relatório de divergência, o upstream o editou). `pyproject.toml`: versão (linha 10) e descrição (linha 11) são linhas vizinhas e conflitam. `docs/packaging.md` (linha 3). `webui/Main.py` e `webui/i18n/*.json`. Em todos, mantenha o texto do Omni.\n- **O Omni ainda consulta o Turbo.** `app/services/version_checker.py` compara a versão do Omni com `releases/latest` de `harry0703/MoneyPrinterTurbo`. Um release novo do Turbo aparece como atualização do Omni. Pendência em aberto.\n- **Links de referral do Turbo.** Os textos de `webui/i18n/*.json` (ex.: `webui/i18n/pt.json:417`) e `webui/i18n/en.json:469` (\"MoneyPrinterTurbo referral link\") ainda apontam para a conta do Turbo. Pendência em aberto.\n- **`update.sh` não sincroniza com o upstream.** Ele usa o remote `origin` (padrão, `update.sh:24`), ou seja, atualiza o próprio Omni. O upstream só entra por merge manual.\n\n## Prática\n\n1. Por que o `version_checker` do Omni consulta o repositório do Turbo? Qual decisão falta tomar?\n2. Num merge do upstream, quais são as duas linhas do `pyproject.toml` que costumam conflitar?\n3. O que `_with_legacy` faz quando a pasta `MoneyPrinterOmni` não existe, mas a `MoneyPrinterTurbo` existe?\n\n> [!faq]- Gabarito\n> 1. Porque o código ainda aponta para o repositório de releases do Turbo (pendência). Falta decidir qual repositório de releases o Omni deve consultar, ou desligar a checagem.\n> 2. `version` (linha 10) e `description` (linha 11). Estão em linhas vizinhas, então o git marca conflito.\n> 3. Usa a pasta antiga `MoneyPrinterTurbo` (`app/paths.py:38-40`), para não perder os dados de quem instalou antes do rebrand.\n\n## Conexões\n\n- [[Visão geral]] e [[Harness de agentes]]: o que o Omni acrescentou ao pipeline.\n- [[Branches main e unstable]]: onde o merge v1.3.9 está e como ele sobe para a main.\n- [[Como contribuir]] e [[Testes e CI]]: o que rodar antes de sincronizar.\n- [[Adaptadores Claude e Grok]] e [[Animações com Remotion]]: os adaptadores e o `animations/` do Omni.\n- [[Time técnico]]: o time que faz o merge e a auditoria, quando pedido.\n- Canvas: [[06 - Omni e Turbo.canvas|Canvas]].\n"
    },
    {
     "id": "c19",
     "section": "concept",
     "title": "Branches main e unstable",
     "tags": [
      "mapa",
      "branches"
     ],
     "status": "unstable",
     "sources": [
      ".mcp.json",
      ".agents/tecnico.md",
      ".agents/roles/arquiteto.md",
      ".github/workflows/ci.yml",
      ".github/workflows/docker-ghcr.yml",
      "update.sh",
      "docs/packaging.md"
     ],
     "body": "# Branches main e unstable\n\n[[00 - Índice|← Índice]]\n\nA `main` guarda só o que foi testado e provado; a `unstable` guarda o que entrou há pouco e ainda tem pouco teste.\n\n## Ideia central\n\nCada item tem uma casa. Um item nasce na `unstable`, é corrigido e testado, e só então sobe para a `main` por PR. Nada de force-push: o histórico não se reescreve.\n\n## Como funciona\n\n1. **Regra de conteúdo** (definida pelo dono do projeto):\n   - `main`: captura de vídeo dos bancos de vídeo; roteiro com IA; fluxo de agentes do Claude Code e de outros harness; animações Remotion; yt-dlp; adaptação para Grok.\n   - `unstable`: MCPs Reddit e Apify; time técnico; perfis de canal com assets; animações novas; merge do upstream v1.3.9; futuras assinaturas (ver [[Assinaturas em vez de chaves]]).\n2. **Entrada.** Item novo entra na `unstable`. Essa etapa é implícita na regra; não há um documento escrito com o passo a passo.\n3. **Promoção.** Quando o item está corrigido e testado, ele sobe para a `main` por PR.\n4. **Sem force-push.** Correções vêm como commits novos.\n\n> [!tip] Sugestão de fluxo (não é regra escrita)\n> Para subir um item só, a PR deve sair da `main` e trazer apenas os commits daquele item (branch a partir da `main` com cherry-pick). Uma PR da `unstable` inteira leva tudo que está lá junto.\n\n## Exemplo / percurso\n\nPromover o MCP da Reddit (item da `unstable`):\n\n1. Confirme que o item está na `unstable`: `.mcp.json` tem a entrada `reddit` (e `apify`). Este worktree tem as duas, o que é coerente com a regra.\n2. Corrija o que os testes e a revisão acharem.\n3. Rode as checagens que o CI rodaria (o CI do fork está desligado, então a checagem é local):\n   ```sh\n   uv run ruff check app cli.py main.py webui test docs/skill\n   uv run python -X utf8 -m pytest -q test\n   uv run python -X utf8 -m coverage run -m pytest -q test && uv run python -m coverage report   # fail_under = 70\n   ```\n4. Abra a PR para a `main` com só esse item.\n\n## Estado atual\n\n> [!warning] unstable\n> Estado a confirmar: não rodei comandos git neste worktree, então não consigo dizer, por git, em qual branch cada item está. Pelo conteúdo dos arquivos:\n> - **Na unstable (pela regra):** MCPs Reddit e Apify (`.mcp.json`); time técnico (`.agents/tecnico.md`, `.agents/roles/arquiteto.md` e os demais papéis técnicos); merge do upstream v1.3.9 (`docs/release-notes-v1.3.9.md`).\n> - **Perfis de canal:** `.agents/perfis/` tem cinco perfis e o `_modelo.md`, mas não há pasta de assets neste worktree. Estado a confirmar.\n> - **Branches de trabalho** que o relatório de divergência descreve: `ccr-879e967e-rcs3uw` (3 commits sobre `origin/main`: MCPs, time técnico, cache do yt-dlp) e `ccr-e7cc9390-tc3402` (4 commits: animações e zoom em `build_timeline`, perfis movidos para `nichos/` e `canais/`, `flake.nix` alterado e `update.sh` apagado). São nomes de sessão, não as branches `main` e `unstable`.\n\n## Armadilhas\n\n- **`update.sh` some em uma branch de trabalho.** A `ccr-e7cc9390-tc3402` apaga `update.sh`, que a `origin/main` mantém. Se essa branch for promovida sem cuidado, o script de atualização desaparece. Confira o diff antes.\n- **Não existe CI no fork.** O `.github/workflows/ci.yml` roda em push e PR para `main`, mas as Actions não rodam no fork. Promover sem testar localmente é o risco principal.\n- **O que você vê depende da branch.** Este worktree tem o time técnico, que é `unstable`. Antes de dizer que algo \"já está na main\", confirme com `git` no repositório.\n\n## Prática\n\n1. Você criou um comando novo de CLI hoje. Em qual branch ele nasce, e o que falta para ele ir para a `main`?\n2. Por que uma PR \"`unstable` para `main`\" inteira é ruim para promover só o MCP da Reddit?\n3. Quais três comandos substituem o CI quando as Actions estão desligadas?\n\n> [!faq]- Gabarito\n> 1. Nasce na `unstable`. Falta corrigir o que os testes acharem, rodar as checagens e abrir uma PR para a `main` só com esse item.\n> 2. Porque ela leva junto todos os outros itens que estão só na `unstable` (time técnico, animações novas etc.), que ainda não foram provados.\n> 3. `uv run ruff check app cli.py main.py webui test docs/skill`; `uv run python -X utf8 -m pytest -q test`; e o comando de coverage com `fail_under = 70` (ver [[Testes e CI]]).\n\n## Conexões\n\n- [[Omni e Turbo]]: o merge v1.3.9 que está na `unstable`.\n- [[Como contribuir]]: o passo a passo de quem vai mudar o código.\n- [[Testes e CI]]: o que o CI roda e por que está desligado no fork.\n- [[Time técnico]] e [[MCP e permissões]]: dois dos itens da `unstable`.\n- [[Animações com Remotion]]: animações da `main` e as novas, da `unstable`.\n- Canvas: [[07 - Branches.canvas|Canvas]].\n"
    },
    {
     "id": "c20",
     "section": "concept",
     "title": "Como contribuir",
     "tags": [
      "mapa",
      "contribuir"
     ],
     "status": "unstable",
     "sources": [
      "AGENTS.md",
      "flake.nix",
      "pyproject.toml",
      ".python-version",
      "animations/.nvmrc",
      "config.example.toml",
      "app/services/task.py",
      "app/services/webui_task.py",
      "app/config/config.py",
      "app/paths.py",
      "app/utils/file_security.py",
      "Dockerfile",
      ".agents/tecnico.md",
      ".agents/skills/manutencao/SKILL.md"
     ],
     "body": "# Como contribuir\n\n[[00 - Índice|← Índice]]\n\nContribuir é mudar a camada de serviço, rodar as mesmas checagens do CI na sua máquina e levar a mudança para a `unstable`.\n\n## Ideia central\n\nTodo comportamento novo entra em `app/services/`. Assim a API, a WebUI e a CLI recebem a mudança juntas. Antes de dizer \"pronto\", rode as três checagens do CI localmente, porque as Actions não rodam no fork.\n\n## Como funciona\n\n1. **Preparar o ambiente.**\n   - Com Nix: `nix develop`. O shell (`flake.nix`) traz Python 3.11, uv, ffmpeg, ImageMagick, Node 24, Chromium e yt-dlp, e mostra a dica `uv sync --frozen && ./webui.sh`.\n   - Sem Nix: Python 3.11 ou mais novo (`pyproject.toml`, `requires-python = \">=3.11\"`), depois `uv sync --frozen`.\n   - Copie a configuração: `cp config.example.toml config.toml`.\n   - Se o `.venv` foi criado pelo Python do Nix, rode tudo dentro do shell: `nix develop --command ...`. Fora dele, o numpy não carrega `libstdc++.so.6` (`AGENTS.md`, linhas 11-12).\n2. **Rodar o programa.**\n   - `./webui.sh`: WebUI em `127.0.0.1:8501`.\n   - `python main.py`: API FastAPI, com documentação em `/docs`.\n   - `uv run python cli.py --help`: CLI.\n3. **Checar antes de declarar pronto** (os mesmos comandos do CI):\n   ```sh\n   uv run ruff check app cli.py main.py webui test docs/skill\n   uv run python -X utf8 -m pytest -q test\n   uv run python -X utf8 -m coverage run -m pytest -q test && uv run python -m coverage report   # fail_under = 70\n   ```\n4. **Convenções.**\n   - Comportamento novo vai em `app/services/`. As portas de entrada só chamam `task.start()` (`app/services/task.py:1907`), que roda `_run_pipeline` (`app/services/task.py:1519`).\n   - Texto novo da WebUI entra nos 14 arquivos `webui/i18n/*.json`.\n   - Recursos passam por `app/paths.py`. Arquivo enviado pelo servidor só pelos helpers de `app/utils/file_security.py`. `allow_server_file_input` é só do CLI.\n   - Chave nova de configuração entra em `app/config/config.py` e em `config.example.toml`. Nunca edite o `config.toml` do usuário.\n   - Dependência: `uv add` ou `uv lock` (`pyproject.toml` e `uv.lock`). `requirements.txt` é legado.\n   - Comentário: siga a língua do arquivo. Dos 54 arquivos `.py` de `app/`, 43 têm texto em chinês; o código antigo é majoritariamente em chinês.\n5. **Pedir mudança ou auditoria ao time técnico.** Diga ao assistente: \"siga `.agents/skills/manutencao/SKILL.md` para <bug, função ou auditoria>\". O time grava tudo em `storage/manutencao/<slug>/` (`pedido.md`, `plano.md`, relatórios de revisão e segurança) e não faz commit, push nem PR sem pedido seu.\n\n> [!warning] unstable\n> O time técnico (`.agents/tecnico.md` e os papéis `arquiteto`, `desenvolvedor`, `testador`, `revisor-de-codigo`, `auditor-de-seguranca`, `auditor-de-saude`) é da branch `unstable`. Estado a confirmar: pouco testado.\n\n## Exemplo / percurso\n\nCorrigir um bug pequeno em `app/services/`, do começo ao fim:\n\n1. `uv sync --frozen` (ou `nix develop` antes).\n2. Escreva um teste que **falha antes** da correção. A regra do time é: todo bug corrigido ganha um teste que falhava.\n3. Corrija o código em `app/services/`.\n4. Rode `uv run ruff check app cli.py main.py webui test docs/skill`. Na cópia usada para este mapa, a saída foi `All checks passed!`.\n5. Rode a suíte da área, por exemplo `uv run python -X utf8 -m pytest -q test/services/test_task.py`, e depois a suíte inteira com coverage.\n6. Leve a mudança para a `unstable`; a promoção para a `main` segue [[Branches main e unstable]].\n\n## Armadilhas\n\n- **O lock de configuração só vale para a WebUI.** `config.runtime_config_lock()` é usado em `app/services/webui_task.py:94`; a WebUI também usa `try_runtime_config_lock()` (`webui/Main.py:440`, `:3649`, `:6153`). API e CLI não o pegam, então uma mudança de config no meio de um job da API pode valer para o job em andamento.\n- **O Docker não usa `uv.lock`.** O `Dockerfile` copia e instala `requirements.txt` (linhas 83 e 89). Uma dependência adicionada só com `uv add` não chega à imagem até o `requirements.txt` ser atualizado. Pendência em aberto.\n- **Texto na WebUI sem as 14 traduções.** Se você põe a chave só em `en.json`, as outras 13 línguas caem no inglês (`tr()` cai no inglês, depois na chave crua). Escreva em todos os arquivos.\n\n## Prática\n\n1. Você precisa de uma função que serve a API, a WebUI e a CLI ao mesmo tempo. Em qual pasta ela vai?\n2. Você adicionou um texto novo para a WebUI. Quantos arquivos JSON precisa tocar?\n3. Você instalou uma dependência com `pip install`. O que está errado?\n\n> [!faq]- Gabarito\n> 1. Em `app/services/`, chamada a partir de `task.start()`. Assim as três portas recebem a mesma lógica.\n> 2. Os 14 arquivos de `webui/i18n/`.\n> 3. Em vez de `pip`, use `uv add`, que atualiza `pyproject.toml` e `uv.lock`. Lembre que o Docker lê `requirements.txt`, então essa dependência também precisa chegar lá (pendência).\n\n## Conexões\n\n- [[Configuração e travas]]: por que o lock vale só para a WebUI.\n- [[Testes e CI]]: o que cada checagem cobre e por que o CI está desligado no fork.\n- [[Branches main e unstable]]: para onde a mudança vai e como ela sobe.\n- [[Time técnico]]: os papéis que fazem mudança e auditoria.\n- [[Omni e Turbo]]: por que o código ainda tem nomes do upstream.\n- Canvas: [[05 - Time técnico.canvas|Canvas]].\n"
    },
    {
     "id": "c21",
     "section": "concept",
     "title": "Testes e CI",
     "tags": [
      "mapa",
      "testes",
      "ci"
     ],
     "status": "unstable",
     "sources": [
      ".github/workflows/ci.yml",
      ".github/workflows/docker-ghcr.yml",
      "pyproject.toml",
      "test/README.md",
      "test/services/test_state.py",
      "test/services/test_llm.py",
      "test/services/test_voice.py",
      "test/services/test_video_project.py",
      "animations/.nvmrc",
      "AGENTS.md"
     ],
     "body": "# Testes e CI\n\n[[00 - Índice|← Índice]]\n\nA suíte roda com pytest (que também executa os `unittest.TestCase`), exige 70% de cobertura de branch e, no repositório original, roda no GitHub Actions. No fork o CI não roda: as checagens são locais.\n\n## Ideia central\n\nToda mudança passa por três checagens: ruff (lint), pytest (testes) e coverage (cobertura de branch, com piso de 70%). O CI é o mesmo conjunto, executado em Python 3.11 e 3.13 com um Redis de verdade.\n\n## Como funciona\n\n1. **Layout.**\n   - `test/test_main.py`: teste do ponto de entrada.\n   - `test/services/`: 221 entradas, a maioria `test_<domínio>.py`, uma por domínio.\n   - `test/resources/`: imagens `1.png` a `9.png` para os testes de material.\n   - Não há `conftest.py` nem `pytest.ini`/`setup.cfg`. A configuração de cobertura fica no `pyproject.toml`.\n   - 64 arquivos usam `unittest.TestCase`; o resto usa funções pytest. O pytest roda os dois.\n2. **Mocks.** Os testes trocam dependências com `unittest.mock.patch.object` (cerca de 1.800 ocorrências) e, em 24 arquivos, com `monkeypatch`. A WebUI é testada com `streamlit.testing.v1.AppTest` (21 arquivos).\n3. **Testes ao vivo e Redis.**\n   - `MPT_RUN_INTEGRATION_TESTS=1` liga os testes que chamam LLM, TTS e Twelve Labs de verdade (`test_llm.py`, `test_task.py`, `test_voice.py`, `test_twelvelabs.py`). Exigem as credenciais do provedor.\n   - `MPT_TEST_REDIS_HOST`, `MPT_TEST_REDIS_PORT` e `MPT_TEST_REDIS_DB` ligam os testes de Redis. Sem o host, `test/services/test_state.py:321-323` pula o teste.\n4. **Cobertura** (`pyproject.toml`): `branch = true`; `source = [\"app\", \"cli\", \"webui\", \"main\", \"docs/skill\"]`; `fail_under = 70`; `show_missing` e `skip_covered` ligados. O comentário do arquivo registra que as medições em 3.11 e 3.13 passaram de 70,4%.\n5. **O job `tests` do `ci.yml`.**\n   - Matriz Python 3.11 e 3.13, com um serviço `redis:7-alpine` e `MPT_TEST_REDIS_DB: 15`.\n   - Passos: `uv sync --frozen`; `compileall`; `ruff` (só no 3.11); `coverage run -m pytest -q test`.\n   - Depois instala o ffmpeg com `apt-get` e roda `test/services/test_video_project.py` e `test/services/test_minimax_output_container.py` com `coverage run --append`.\n   - Fecha com `coverage report`, `coverage xml` e o envio do XML como artefato (7 dias).\n6. **Outros jobs.**\n   - `animations`: Node na versão de `animations/.nvmrc` (24), `npm ci --prefix animations` e `npm run typecheck`.\n   - `windows-smoke`: Windows com Python 3.11, compila e roda um subconjunto de testes de serviço (config, state, task, task manager, controller de vídeo, WebUI task).\n   - `docker-ghcr.yml`: constrói a imagem para amd64 e arm64 em push para `main` e em tags `v*`.\n\n> [!warning] unstable\n> Os testes novos do v1.3.9 (ex.: `test/services/test_webui_image_motion.py`, `test/services/test_webui_logging_settings.py`) e o teste de login Kimi estão na branch `unstable`. Estado a confirmar.\n\n## Exemplo / percurso\n\nResultado de uma execução local nesta sessão, em uma cópia do worktree (fora do worktree, para não gerar `config.toml` nem `storage/`):\n\n- Ambiente: `uv sync --frozen` com Python 3.11; ffmpeg 6.1.1 do sistema; sem Redis e sem `MPT_RUN_INTEGRATION_TESTS`.\n- `ruff check app cli.py main.py webui test docs/skill`: `All checks passed!`.\n- `pytest -q test`: **10 failed, 2384 passed, 54 skipped**, em 8 min 17 s.\n- Falhas de áudio (9): `test_bgm_decoded_audio.py` (1), `test_remote_speech_complete_decode.py` (5), `test_webui_bgm.py` (2 subtestes, `en` e `zh`) e `test_webui_custom_audio_upload.py` (1). O erro é `ffmpeg -xerror ... Decoder thread returned error`.\n- Repetindo essas 9 com o binário ffmpeg 7.0.2 do `imageio-ffmpeg` no `PATH`: **32 passed, 14 subtests passed**. A única variável trocada foi o ffmpeg.\n- Falha de login Kimi (1): timeout de 3 s do AppTest do Streamlit. Rodado sozinho: 6 passed em 1,4 s. Instável sob carga.\n- Não rodei o `coverage` nesta verificação; o piso de 70% não foi reconferido aqui.\n\n## Armadilhas\n\n- **Passar local não é passar no CI.** Como as Actions não rodam no fork, a única prova é a execução local. Os três comandos de [[Como contribuir]] são o substituto.\n- **A suíte de áudio depende do ffmpeg do sistema.** Com ffmpeg 6.1.1 do sistema, as 9 falhas de áudio aparecem; com o 7.0.2 empacotado, passam. No CI, a suíte principal roda antes do `apt-get install ffmpeg`, então depende do ffmpeg que já vem no runner (não verificado). Confirme com `ffmpeg -version`.\n- **Skipped não é verificado.** Os 54 skips desta execução não rodaram. Pelo código, eles são testes de Redis e de integração ao vivo, que pulam sem as variáveis (não listei cada um). Não conte como cobertos.\n- **Teste de WebUI com timeout curto oscila.** O AppTest tem 3 s por execução; sob carga da suíte inteira, o login Kimi estourou o limite e passou sozinho.\n\n## Prática\n\n1. Nove testes de áudio falham com `Decoder thread returned error`. Qual é a primeira coisa a verificar, e como você testa a hipótese?\n2. Um teste aparece como `skipped`. Ele conta como verificado? Por quê?\n3. Qual variável liga os testes que chamam LLM e TTS de verdade?\n\n> [!faq]- Gabarito\n> 1. A versão do ffmpeg (`ffmpeg -version`). Teste trocando só o binário, por exemplo colocando o ffmpeg do `imageio-ffmpeg` no `PATH`, como feito aqui.\n> 2. Não. `skipped` significa que o teste não rodou. Ele precisa da variável certa (Redis ou `MPT_RUN_INTEGRATION_TESTS=1`).\n> 3. `MPT_RUN_INTEGRATION_TESTS=1`, junto com as credenciais do provedor.\n\n## Conexões\n\n- [[Como contribuir]]: os comandos de checagem e as convenções.\n- [[Branches main e unstable]]: por que o CI do fork não substitui a checagem local.\n- [[Configuração e travas]]: o que os testes de configuração protegem.\n- [[Time técnico]]: o papel `testador`, que escreve os testes de reprodução.\n- Canvas: [[00 - Geral.canvas|Canvas]].\n"
    },
    {
     "id": "r1",
     "section": "ref",
     "title": "Rotas da API",
     "tags": [
      "mapa",
      "referencia"
     ],
     "status": "unstable",
     "sources": [
      "app/router.py",
      "app/controllers/ping.py",
      "app/controllers/v1/base.py",
      "app/controllers/v1/video.py",
      "app/controllers/v1/llm.py",
      "app/controllers/base.py",
      "app/asgi.py",
      "app/models/schema.py",
      "app/services/material_upload.py",
      "app/services/bgm.py"
     ],
     "body": "# Rotas da API\n\n[[00 - Índice|← Índice]]\n\nTabela das rotas HTTP do programa, com o handler, a autenticação e o que cada rota devolve. Todas as rotas `/api/v1/*` pedem `x-api-key` quando `app.api_key` está preenchida.\n\n> [!warning] unstable\n> O campo `image_motion` do corpo de `POST /api/v1/videos` vem do merge do upstream Turbo v1.3.9. Estado a confirmar. O restante das rotas está na `main`.\n\n## Ideia central\n\nHá três grupos de rotas: **tarefas** (criar, consultar, apagar), **materiais e músicas** (listar e enviar arquivos) e **utilitários de texto** (roteiro, termos e metadados, que chamam o LLM direto, sem tarefa). Todas passam pelo mesmo `verify_token` (`app/controllers/base.py:47`), exceto `/ping`.\n\n## Como funciona\n\nComo as rotas são montadas: `app/router.py` inclui `ping`, `v1.video` e `v1.llm`. Cada módulo `v1` cria seu roteador com `new_router(dependencies=[Depends(base.verify_token)])` (`app/controllers/v1/base.py`, `video.py:43`, `llm.py:19`), e o prefixo `/api/v1` é aplicado ali.\n\n### Tabela de rotas\n\n| Método | Caminho | Handler (arquivo:linha) | Auth | Resposta e erros |\n|---|---|---|---|---|\n| GET | `/ping` | `app/controllers/ping.py:12` `ping` | não | `\"pong\"` |\n| POST | `/api/v1/videos` | `video.py:215` `create_video` → `create_task` (`:235`), `stop_at=\"video\"` | `x-api-key` | `200` com `task_id`; `400` validação; `429` fila cheia |\n| POST | `/api/v1/subtitle` | `video.py:222` `create_subtitle`, `stop_at=\"subtitle\"` | `x-api-key` | igual ao anterior |\n| POST | `/api/v1/audio` | `video.py:229` `create_audio`, `stop_at=\"audio\"` | `x-api-key` | igual ao anterior |\n| GET | `/api/v1/tasks` | `video.py:285` `get_all_tasks` | `x-api-key` | lista paginada; `page` ≥ 1, `page_size` de 1 a 1000 |\n| GET | `/api/v1/tasks/{task_id}` | `video.py:310` `get_task` | `x-api-key` | `200` com o estado; `404` se não existe |\n| DELETE | `/api/v1/tasks/{task_id}` | `video.py:333` `delete_video` | `x-api-key` | `200`; `404`; `409` se a tarefa ainda roda |\n| GET | `/api/v1/musics` | `video.py:373` `get_bgm_list` | `x-api-key` | lista de músicas locais |\n| POST | `/api/v1/musics` | `video.py:408` `upload_bgm_file` (multipart, campo `file`) | `x-api-key` | `200`; `400` se recusado; limite 30 MB (`app/services/bgm.py:255`) |\n| GET | `/api/v1/video_materials` | `video.py:441` `get_video_materials_list` | `x-api-key` | lista de arquivos em `storage/local_videos` |\n| POST | `/api/v1/video_materials` | `video.py:477` `upload_video_material_file` (multipart, campo `file`) | `x-api-key` | `{\"file\": \"<uuid>.<ext>\"}`; `400` recusado; `500` se a validação está indisponível |\n| GET / HEAD | `/api/v1/stream/{file_path}` | `video.py:512` `stream_video` | `x-api-key` | `200` ou `206` com faixa de bytes; `416` se a faixa é inválida |\n| GET / HEAD | `/api/v1/download/{file_path}` | `video.py:578` `download_video` | `x-api-key` | arquivo de `storage/tasks` |\n| POST | `/api/v1/scripts` | `llm.py:27` `generate_video_script` → `llm.generate_script` | `x-api-key` | roteiro; `503` se o LLM não está configurado |\n| POST | `/api/v1/terms` | `llm.py:49` `generate_video_terms` → `llm.generate_terms` | `x-api-key` | lista de termos |\n| POST | `/api/v1/social-metadata` | `llm.py:70` `generate_video_social_metadata` → `llm.generate_social_metadata` | `x-api-key` | título, descrição e tags |\n\nArquivos estáticos, fora das rotas da API:\n\n| Caminho | Montagem | Auth |\n|---|---|---|\n| `/tasks/*` | `app/asgi.py:309` (`StaticFiles` sobre `storage/tasks`) | `x-api-key`, pelo middleware `protect_generated_task_files` (`app/asgi.py:283`) |\n| `/*` | `app/asgi.py:312` (`StaticFiles` sobre `resource/public`) | nenhuma |\n\n### Corpo de `POST /api/v1/videos`\n\nO corpo segue `TaskVideoRequest` (`app/models/schema.py:263`), que herda de `VideoParams` (`schema.py:96`). Campos principais, com o padrão:\n\n| Campo | Padrão | Limites ou valores |\n|---|---|---|\n| `video_subject` | obrigatório | texto |\n| `video_script` | `\"\"` | se vier preenchido, o LLM não é chamado |\n| `video_source` | `\"pexels\"` | `pexels`, `pixabay`, `coverr`, `local`, `wavespeed`, `volcengine_seedance`, `ofox`, `metaso_minimax`, `muapi`, `loomloom`, `openai_image` (`app/services/task.py:97`) |\n| `video_materials` | `null` | lista de `{provider, url, duration, source_info}` (`schema.py:86`); para `local`, `url` é o nome em `storage/local_videos` |\n| `video_aspect` | `\"9:16\"` | `9:16`, `16:9`, `1:1` (`schema.py:34`) |\n| `video_count` | `1` | `1` a `5` (`schema.py:266`) |\n| `video_clip_duration` | `5` | `1` a `15` (`schema.py:267`) |\n| `n_threads` | `2` | `1` a `16` (`schema.py:268`) |\n| `voice_name` | `\"\"` | `no-voice` para áudio silencioso |\n| `bgm_type` | `\"random\"` | padrão de música de fundo |\n| `bgm_volume` | `0.2` | número |\n| `subtitle_enabled` | `true` | liga e desliga a legenda |\n| `font_size` | `60` | inteiro ≥ 1 |\n| `paragraph_number` | `1` | `1` a `10` |\n| `image_motion` | `\"zoom\"` | `static` ou `zoom` (unstable, `schema.py:116`) |\n\nErros de validação do corpo viram **400**, não 422: `app/asgi.py:67-86` troca o código e devolve o primeiro campo rejeitado na mensagem.\n\n### Formato de resposta\n\nTodas as respostas JSON têm `status`, `message` e `data` (`schema.py:292`). Erros de tarefa usam `message` com o `request_id` na frente, como `\"<id>: task not found\"`. O `request_id` vem do cabeçalho `x-task-id`, ou é gerado (`app/controllers/base.py:25`).\n\n## Exemplo / percurso\n\nTestado nesta documentação, com `api_key` preenchida no `config.toml` de teste:\n\n- `GET /ping` → `200`, sem chave.\n- `GET /api/v1/tasks/<id>` sem chave → `401`; com chave errada → `401`; com a chave certa → `404` quando a tarefa não existe na memória.\n- `GET /tasks/<id>/final-1.mp4` sem chave → `401`; com chave → `200`.\n- `POST /api/v1/scripts` com chave, sem LLM configurado → `503 script generation is unavailable`.\n- `POST /api/v1/videos` com `video_count: 9` → `400`, mensagem `body.video_count: Input should be less than or equal to 5`.\n\nVeja o percurso completo em [[01 - Vídeo pela API]].\n\n## Armadilhas\n\n- **`/ping` não pede chave.** Ele é a única rota da API sem `verify_token`. Não use para checar autenticação.\n- **Criar não é concluir.** `POST /videos` responde `200` antes do pipeline rodar. A falha aparece depois, em `GET /tasks/{id}`.\n- **O navegador não manda `x-api-key`.** Um link direto para `/tasks/...` com a chave ligada dá `401`. O cliente precisa mandar o cabeçalho (`config.example.toml:34-35`).\n- **Os caminhos de `materials` vêm absolutos.** A resposta de `GET /tasks/{id}` devolve `materials` com caminho do disco do servidor. Só `videos`, `combined_videos`, `audio_file` e `subtitle_path` viram URL (`video.py:142`).\n\n## Prática\n\n1. Qual rota não pede `x-api-key` e por quê?\n2. O que devolve `POST /api/v1/videos` quando o cliente manda `video_count: 9`? E o que acontece se o pipeline falhar depois?\n3. Qual código HTTP o `DELETE /api/v1/tasks/{id}` devolve para uma tarefa com `state=4`?\n\n> [!faq]- Gabarito\n> 1. `/ping`. Ele é registrado em `app/controllers/ping.py` com o roteador simples, sem `new_router`, então não recebe `verify_token`.\n> 2. `400`, pelo esquema (`app/models/schema.py:266`). Uma falha do pipeline não muda a resposta da criação: ela aparece depois, em `GET /tasks/{id}`.\n> 3. `409`, `task is still running` (`app/controllers/v1/video.py:345`).\n\n## Conexões\n\n- [[Visão geral]]: as três portas, e a API entre elas.\n- [[Portas de entrada]]: o que a API valida, comparado à WebUI e ao CLI.\n- [[Estado das tasks e fila]]: os códigos 404, 409 e 429.\n- [[Configuração e travas]]: `api_key` e os caminhos permitidos.\n- [[Flags do CLI]]: os mesmos campos, por linha de comando.\n- [[01 - Vídeo pela API]]: percurso com resposta real.\n"
    },
    {
     "id": "r2",
     "section": "ref",
     "title": "Flags do CLI",
     "tags": [
      "mapa",
      "referencia"
     ],
     "status": "unstable",
     "sources": [
      "cli.py",
      "app/models/schema.py",
      "app/services/task.py",
      "app/config/config.py"
     ],
     "body": "# Flags do CLI\n\n[[00 - Índice|← Índice]]\n\nLista das flags de `cli.py`, agrupadas como o parser agrupa, com os padrões tirados da saída real de `--help`, os códigos de saída e os limites do lote.\n\n> [!warning] unstable\n> A flag `--image-motion` (`cli.py:444`) vem do merge do upstream Turbo v1.3.9. Estado a confirmar. As demais flags estão na `main`.\n\n## Ideia central\n\nO CLI aceita a mesma configuração de tarefa da API, mas com flags. Os valores aceitos são fixados por constantes no próprio `cli.py` (`_PIPELINE_STAGES` em `cli.py:33`, `_CLI_VIDEO_SOURCES` em `cli.py:40`). Quando a flag não é passada, o valor vem de `[ui]` no `config.toml` ou do padrão do esquema, conforme indicado em cada linha.\n\n## Como funciona\n\nComo ler a tabela. Entre parênteses, o padrão mostrado por `--help`. Quando o padrão diz \"`[ui]`…\", o valor sai do `config.toml`, na seção `[ui]`. Quando não há valor no `[ui]`, vale o segundo valor citado.\n\n### Conteúdo (roteiro)\n\n| Flag | Padrão | Observação |\n|---|---|---|\n| `--video-subject TEXTO` | `\"\"` | obrigatória, a não ser que `--video-script` seja dada (`cli.py:724`) |\n| `--video-script TEXTO` | `\"\"` | roteiro completo; pula a geração pelo LLM |\n| `--video-terms LISTA` | gerado | termos separados por vírgula |\n| `--video-language CÓDIGO` | detecção automática | ex.: `zh-CN`, `en-US` |\n| `--paragraph-number N` | `1` | de 1 a 10 (`cli.py:79`) |\n| `--video-script-prompt TEXTO` | nenhum | requisitos extras para o LLM |\n| `--custom-system-prompt TEXTO` | nenhum | substitui o prompt de sistema padrão |\n\n### Material e pipeline\n\n| Flag | Padrão | Observação |\n|---|---|---|\n| `--video-source` | `pexels` | `pexels`, `pixabay`, `coverr`, `wavespeed`, `volcengine_seedance`, `ofox`, `metaso_minimax`, `muapi`, `openai_image`, `local` (`cli.py:40-50`). Não inclui `loomloom` |\n| `--video-materials CAMINHO[,CAMINHO...]` | `\"\"` | para `local`: imagens ou vídeos separados por vírgula |\n| `--stop-at ETAPA` | `video` | `script`, `terms`, `audio`, `subtitle`, `materials`, `video` (`cli.py:33`). Vale para o lote inteiro |\n| `--confirm-wavespeed-charge` | desligada | confirma cobrança do provedor WaveSpeed |\n| `--confirm-seedance-charge` | desligada | confirma cobrança do Seedance |\n| `--confirm-ofox-charge` | desligada | confirma cobrança do OFox |\n| `--confirm-metaso-minimax-charge` | desligada | confirma cobrança do Metaso MiniMax |\n| `--confirm-muapi-charge` | desligada | confirma cobrança do MuAPI |\n\nCombinação recusada: `--video-source local` com `--stop-at terms` sai com 2 (`cli.py:726`).\n\n### Vídeo\n\n| Flag | Padrão | Observação |\n|---|---|---|\n| `--video-count N` | `1` | mínimo 1; não há teto na CLI, mas a API limita a 5 |\n| `--video-aspect` | `9:16` | `9:16`, `16:9`, `1:1` |\n| `--video-fit-mode` | `cover` | `cover` ou `contain` (barras pretas) |\n| `--video-concat-mode` | `random` | `random` ou `sequential` |\n| `--image-motion` | `zoom` (padrão do help) | `static` ou `zoom`; movimento para imagens (unstable) |\n| `--video-transition-mode` | `none` | `shuffle`, `fade-in`, `fade-out`, `slide-in`, `slide-out`, `zoom-in`, `zoom-out` |\n| `--video-clip-duration S` | `5` | segundos máximos por clipe, mínimo 1 |\n| `--video-clip-speed V` | `1.0` | de 0,5 a 2,0 |\n| `--match-materials-to-script` | desligada | `--no-match-materials-to-script` desliga; ativa 8 termos em vez de 5 |\n| `--n-threads N` | `2` | threads do FFmpeg, mínimo 1 |\n\n### Áudio e música\n\n| Flag | Padrão | Observação |\n|---|---|---|\n| `--voice-name` | `[ui].voice_name`, senão `zh-CN-XiaoxiaoNeural-Female` | `no-voice` para áudio silencioso; prefixos `gemini:`, `mimo:`, `elevenlabs:`, `chatterbox:`, `kokoro:`, `voxcpm:` |\n| `--voice-volume V` | `[ui].voice_volume`, senão `1.0` | número ≥ 0 |\n| `--voice-rate V` | `[ui].voice_rate`, senão `1.0` | número > 0 |\n| `--custom-audio-file CAMINHO` | nenhum | MP3, WAV, M4A, AAC, FLAC ou OGG. Pula o TTS. Caminho relativo vale a partir do diretório atual |\n| `--bgm-type` | `random` | `none`, `random`, `custom`, `sonilo`, `elevenlabs` |\n| `--sonilo-bgm-prompt TEXTO` | vazio | legado; até 2000 caracteres |\n| `--video-music-prompt TEXTO` | vazio | prompt do provedor de música escolhido (`sonilo` ou `elevenlabs`) |\n| `--bgm-file NOME` | nenhum | arquivo dentro de `storage/bgm` ou `resource/songs` |\n| `--bgm-volume V` | `0.2` | número ≥ 0 |\n\n### Legenda\n\n| Flag | Padrão | Observação |\n|---|---|---|\n| `--subtitle-enabled` / `--no-subtitle-enabled` | `[ui].subtitle_enabled`, senão ligada | liga ou desliga |\n| `--font-name ARQUIVO` | `[ui].font_name`, senão `STHeitiMedium.ttc` | arquivo dentro de `resource/fonts` |\n| `--subtitle-position` | `[ui].subtitle_position`, senão `bottom` | `top`, `center`, `bottom`, `two_thirds_bottom`, `custom` |\n| `--subtitle-display-mode` | `[ui]`, senão `sentence` | `sentence` ou `word_by_word` |\n| `--subtitle-animation` | `[ui]`, senão `none` | `none` ou `pop_spring` |\n| `--custom-position P` | `[ui]`, senão `70` | de 0 a 100; usado com `--subtitle-position custom` |\n| `--text-fore-color #RRGGBB` | `[ui]`, senão `#FFFFFF` | entre aspas no shell |\n| `--font-size N` | `[ui]`, senão `60` | inteiro |\n| `--stroke-color #RRGGBB` | `[ui]`, senão `#000000` | cor do contorno |\n| `--stroke-width N` | `[ui]`, senão `1.5` | número ≥ 0 |\n| `--subtitle-background-enabled` / `--no-...` | `[ui]`, senão desligada | fundo atrás da legenda |\n| `--subtitle-background-color #RRGGBB` | `[ui]` | cor do fundo |\n| `--rounded-subtitle-background` / `--no-...` | `[ui]`, senão desligada | fundo com cantos arredondados |\n\n### Execução\n\n| Flag | Padrão | Observação |\n|---|---|---|\n| `--task-id UUID` | gerado | nome da pasta em `storage/tasks/`. Não combina com `--batch-file` |\n| `--batch-file CAMINHO` | nenhum | JSON (array) ou JSONL. No máximo 100 tarefas e 1 MiB (`cli.py:35-36`). Cada objeto sobrescreve campos de `VideoParams`; campo desconhecido é recusado |\n\n## Exemplo / percurso\n\nComando real, executado nesta documentação:\n\n```sh\nuv run python cli.py \\\n  --video-script \"Este é um roteiro de teste para o percurso pelo CLI.\" \\\n  --voice-name no-voice --video-source local \\\n  --video-materials \"./clip.mp4\" --stop-at video\n```\n\nSaída 0, no stdout: `{\"task_id\": \"...\", \"result\": {\"videos\": [...], \"combined_videos\": [...], \"script\": \"...\", \"terms\": \"\", \"audio_file\": \"...\", \"audio_duration\": 8, \"subtitle_path\": \"...\", \"materials\": [...], \"cross_post_state\": null, ...}}`. Veja [[02 - Vídeo pelo CLI]].\n\n### Códigos de saída\n\n| Código | Quando | Stdout |\n|---|---|---|\n| `0` | tarefa concluída (ou lote sem falhas) | JSON com `task_id` e `result`. Em lote, um resumo |\n| `1` | falha do pipeline ou exceção inesperada; em lote, pelo menos uma tarefa falhou (`cli.py:1732`) | vazio, ou o JSON parcial se já houver `videos` (`cli.py:1788`) |\n| `2` | argumento inválido (argparse), combinação recusada, manifesto inválido | vazio |\n\nOs logs vão para o stderr (`cli.py:1742`). O stdout contém só JSON.\n\n### Formato do resumo de lote\n\n`total`, `succeeded`, `failed` e `tasks`. Cada entrada de `tasks` tem `index`, `task_id`, `status`, `result`, `failed_stage` e `error`.\n\n## Armadilhas\n\n- **Sem teto de `video_count` no CLI.** A API recusa mais de 5. O CLI aceita qualquer inteiro ≥ 1. Isso é uma divergência entre as duas portas.\n- **`--stop-at` é do lote, não de cada tarefa.** Um objeto do manifesto não pode definir `stop_at`.\n- **`--custom-audio-file` pula o TTS.** Para legenda sobre esse áudio, use `subtitle_provider=whisper`, que é configuração global.\n- **Padrões dependem do `config.toml`.** Dois computadores com `[ui]` diferente geram vídeos diferentes com o mesmo comando. Rode `--help` no seu ambiente para ver os padrões reais.\n\n## Prática\n\n1. Qual código de saída o CLI usa quando um argumento nunca chega ao pipeline?\n2. Com `--video-source local`, o que pode vir em `--video-materials`, e o que acontece com um arquivo que está fora de `storage/local_videos`?\n3. Quantas tarefas um `--batch-file` aceita, e qual flag é proibida junto com ele?\n\n> [!faq]- Gabarito\n> 1. Saída 2. Vale para erros do argparse, para a falta de assunto (`cli.py:724`) e para manifesto inválido (`cli.py:1748`).\n> 2. Caminhos de imagem ou vídeo, separados por vírgula. Um arquivo fora de `storage/local_videos` é copiado para lá com um nome `cli-material-<hex>` (`cli.py:1597`).\n> 3. Até 100 tarefas e 1 MiB (`cli.py:35-36`). Não se combina com `--task-id` (`cli.py:701-715`).\n\n## Conexões\n\n- [[Visão geral]]: o CLI é uma das três portas.\n- [[Pipeline e stop_at]]: o que cada valor de `--stop-at` interrompe.\n- [[Portas de entrada]]: a comparação entre CLI, API e WebUI.\n- [[Chaves de configuração]]: as chaves `[ui]` que dão os padrões.\n- [[Rotas da API]]: os mesmos campos, pelo corpo JSON.\n- Canvas: [[02 - Portas de entrada.canvas|Canvas]].\n"
    },
    {
     "id": "r3",
     "section": "ref",
     "title": "Chaves de configuração",
     "tags": [
      "mapa",
      "referencia"
     ],
     "status": "unstable",
     "sources": [
      "config.example.toml",
      "app/config/config.py",
      "app/services/task.py",
      "app/services/voice.py",
      "app/services/ofox.py",
      "app/services/muapi.py",
      "app/services/volcengine_seedance.py",
      "app/services/loomloom.py",
      "app/models/llm_provider.py",
      "app/services/upload_post.py"
     ],
     "body": "# Chaves de configuração\n\n[[00 - Índice|← Índice]]\n\nReferência das seções e chaves de `config.example.toml`, o que cada uma controla e quais são segredos. Os números de linha são do arquivo de exemplo.\n\n> [!warning] unstable\n> A seção `[diagnostics]` (`config.example.toml:14-24`, chave `log_requests`) e o provedor EmpirioLabs (`config.example.toml:325-329`) vêm do merge do upstream Turbo v1.3.9. Estado a confirmar. As demais chaves estão na `main`.\n\n## Ideia central\n\nO `config.toml` é cópia do exemplo, criada na primeira execução. Cada seção vai para um lugar diferente no código. A maioria das chaves de `[app]` é de provedor: uma chave de API, uma URL e um modelo, por provedor. Há uma regra: segredo fica só no `config.toml`, nunca no git (`.gitignore:2`).\n\n## Como funciona\n\n### Seções\n\n| Seção | Linha | Controla | Segredos |\n|---|---|---|---|\n| (topo) | `:9-12` | `log_level`, `listen_host` (padrão `0.0.0.0`), `listen_port` (`8080`) | não |\n| `[diagnostics]` | `:14` | `log_requests` (rastreamento de requisições, unstable) | não |\n| `[app]` | `:26` | o restante: API, materiais, LLM, TTS, fila, Redis, publicação | sim, muitos |\n| `[whisper]` | `:609` | legenda por Whisper: `model_size`, `device`, `compute_type` | não |\n| `[proxy]` | `:626` | proxy para Pexels, Pixabay, Coverr e downloads de material. Chaves `http` e `https` comentadas no exemplo | a URL pode levar usuário e senha |\n| `[azure]` | `:637` | voz Azure v2: `speech_key`, `speech_region` | `speech_key` |\n| `[siliconflow]` | `:643` | voz SiliconFlow | `api_key` |\n| `[minimax_tts]` | `:647` | voz MiniMax | `api_key` |\n| `[elevenlabs]` | `:665` | voz e música ElevenLabs | `api_key` |\n| `[chatterbox]` | `:678` | voz Chatterbox (servidor próprio) | `api_key` |\n| `[kokoro]` | `:687` | voz Kokoro (servidor próprio) | `api_key` |\n| `[fish_audio]` | `:697` | voz Fish Audio | `api_key` |\n| `[voxcpm]` | `:722` | voz VoxCPM, com clonagem por áudio de referência | `api_key` |\n| `[ui]` | `:736` | preferências da WebUI (`hide_log`, `open_task_folder_on_completion`) | não |\n\nA seção `[ui]` do exemplo tem só duas chaves. A WebUI grava outras (voz, legenda, fonte e cores) no `config.toml` real, e o CLI lê as mesmas chaves como padrão (veja [[Flags do CLI]]).\n\n### Chaves de `[app]` por grupo\n\n| Grupo | Chaves (linha) |\n|---|---|\n| Acesso à API | `api_key` (38), `endpoint` (557) |\n| Comportamento da WebUI | `hide_config` (46), `script_generation_backend` (51) |\n| Rede e TTS | `tls_verify` (71), `edge_tts_timeout` (67) |\n| Materiais padrão | `video_source` (90), `match_materials_to_script` (236), `material_directory` (562) |\n| Pexels, Pixabay, Coverr | `pexels_api_keys` (97), `pixabay_api_keys` (100), `coverr_api_keys` (103) |\n| WaveSpeed | `wavespeed_api_keys` (107) |\n| Volcengine Seedance | `volcengine_seedance_api_key` (125), `_base_url` (126), `_model` (129), `_resolution` (130), `_min_duration` (131), `_max_duration` (132), `_poll_interval` (133), `_run_timeout` (134), `_watermark` (135) |\n| OFox | `ofox_api_key` (142), `_base_url` (143), `_text_to_video_model` (145), `_resolution` (149), `_min_duration` (154), `_max_duration` (155), `_provider` (168), `_poll_interval` (169), `_run_timeout` (170) |\n| MuAPI | `muapi_api_key` (177), `_base_url` (178), `_video_endpoint` (180), `_resolution` (181), `_min_duration` (182), `_max_duration` (183), `_poll_interval` (184), `_run_timeout` (185) |\n| Metaso MiniMax | `metaso_minimax_api_key` (192), `_base_url` (193), `_resolution` (194), `_poll_interval` (195), `_run_timeout` (196) |\n| OpenAI image | `openai_image_base_url` (205), `openai_image_api_keys` (208), `openai_image_model` (211), `_size` (217), `_prompt_template` (221) |\n| TwelveLabs | `twelvelabs_api_keys` (226), `twelvelabs_rerank_terms` (229); modelos `twelvelabs_marengo_model` e `twelvelabs_pegasus_model` comentados (231-232) |\n| Música Sonilo | `sonilo_api_key` (241), `sonilo_base_url` (242), `sonilo_timeout` (244) |\n| LoomLoom | `loomloom_base_url` (58), `loomloom_api_token` (59), `loomloom_request_timeout_seconds` (60), `loomloom_poll_interval_seconds` (61), `loomloom_run_timeout_seconds` (62), `loomloom_video_run_timeout_seconds` (63) |\n| Provedor de LLM | `llm_provider` (253); chaves por provedor, na tabela abaixo |\n| Provedores Claude Code e Kimi | `claude_code_model_name` (468), `claude_code_cli_path` (469), `claude_code_timeout` (470), `kimi_code_model_name` (479), `kimi_code_timeout` (480) |\n| Ollama e LiteLLM | `ollama_base_url` (453), `ollama_model_name` (454), `litellm_model_name` (492) |\n| Legenda | `subtitle_provider` (516), padrão `edge` |\n| TTS extra | `mimo_tts_model_name` (510), `mimo_tts_style_prompt` (511) |\n| Fila e Redis | `enable_redis` (566), `redis_host` (567), `redis_port` (568), `redis_db` (569), `redis_password` (570), `max_concurrent_tasks` (573), `max_queued_tasks` (574) |\n| Publicação | `upload_post_enabled` (583), `upload_post_api_key` (584), `upload_post_username` (585), `upload_post_platforms` (587), `upload_post_auto_upload` (589), `upload_post_youtube_privacy_status` (591), `upload_post_youtube_made_for_kids` (598), `upload_post_max_pending_tasks` (603) |\n\n### Provedores de LLM\n\nCada provedor usa três chaves com o mesmo prefixo: `<id>_api_key`, `<id>_base_url` e `<id>_model_name`. O nome é escolhido por `llm_provider` (`config.example.toml:253`). O registro de provedores fica em `app/models/llm_provider.py`.\n\n| Provedor | `api_key` | `base_url` | `model_name` |\n|---|---|---|---|\n| moonshot (padrão) | 257 | 258 | 259 |\n| shengsuanyun | 263 | 264 | 265 |\n| apimart | 270 | 271 | 272 |\n| fluxionai | 277 | 278 | 279 |\n| cheaperinference | 284 | 285 | 286 |\n| requesty | 292 | 293 | 294 |\n| futureinfra | 299 | 300 | 301 |\n| yapi | 306 | 307 | 308 |\n| opper | 313 | 314 | 315 |\n| onomeo | 320 | 321 | 322 |\n| empiriolabs (unstable) | 327 | 328 | 329 |\n| openai | 333 | 334 | 335 |\n| anthropic | 339 | 340 | 341 |\n| gemini | 345 | — | 346 |\n| muse_spark | 350 | 351 | 352 |\n| deepseek | 356 | 357 | 358 |\n| qwen | 362 | — | 363 |\n| azure | 367 | 368 | 369 (mais `azure_api_version`, 370) |\n| volcengine | 374 | 375 | 376 |\n| grok | 380 | 381 | 382 |\n| minimax | 387 | 388 | 389 |\n| mimo | 393 | 394 | 395 |\n| iflytek | 401 | 402 | 403 |\n| cloudflare | 408 | — | 411 (mais `cloudflare_account_id` 409 e `cloudflare_gateway_id` 410) |\n| modelscope | 415 | 416 | 417 |\n| aihubmix | 421 | 422 | 423 |\n| aimlapi | 427 | 428 | 429 |\n| evolink | 433 | 434 | 435 |\n| openrouter | 440 | 441 | 442 |\n| api_route | 447 | 448 | 449 |\n| oneapi | 484 | 485 | 486 |\n| groq | 496 | 497 | 498 |\n| pollinations | 501 | 502 | 503 |\n| ollama (sem chave) | — | 453 | 454 |\n| claude_code (assinatura) | — | — | 468 (mais CLI em 469, timeout em 470) |\n| kimi_code (login OAuth) | — | — | 479 (mais timeout em 480) |\n| litellm (usa variáveis de ambiente) | — | — | 492 |\n\n### Segredos\n\nPreenchidos só no `config.toml` real:\n\n- `[app]`: `api_key` (38), `loomloom_api_token` (59), `pexels_api_keys` (97), `pixabay_api_keys` (100), `coverr_api_keys` (103), `wavespeed_api_keys` (107), `volcengine_seedance_api_key` (125), `ofox_api_key` (142), `muapi_api_key` (177), `metaso_minimax_api_key` (192), `openai_image_api_keys` (208), `twelvelabs_api_keys` (226), `sonilo_api_key` (241), `redis_password` (570), `upload_post_api_key` (584);\n- chaves `*_api_key` de todos os provedores de LLM listados acima;\n- seções de voz: `[azure] speech_key` (640), `[siliconflow] api_key` (645), `[minimax_tts] api_key` (653), `[elevenlabs] api_key` (668), `[chatterbox] api_key` (682), `[kokoro] api_key` (691), `[fish_audio] api_key` (701), `[voxcpm] api_key` (728).\n\nTokens de login Kimi (`kimi_code_access_token`, `kimi_code_refresh_token`) não aparecem no exemplo; o login os grava no `config.toml` (`config.example.toml:475`).\n\n## Exemplo / percurso\n\nPara trocar o LLM padrão por DeepSeek, edite duas chaves de `[app]` e reinicie o processo:\n\n```toml\nllm_provider = \"deepseek\"        # config.example.toml:253\ndeepseek_api_key = \"sk-...\"      # linha 356 do exemplo\n```\n\nO `deepseek_model_name` (358) vem vazio no exemplo, então preencha com o modelo desejado. Sem reiniciar, o processo da API mantém a configuração antiga, porque `config.toml` é lido na importação (veja [[Configuração e travas]]).\n\n## Armadilhas\n\n- **`tls_verify` é uma chave só, para três provedores.** Ofox, MuAPI e Seedance leem a mesma chave de `[app]` (`app/services/ofox.py:157`, `muapi.py:139`, `volcengine_seedance.py:142`), com padrão `true`. Não há como desligar a verificação só para um deles.\n- **`redis_password` é texto puro.** O Redis precisa ficar em rede privada. O código confia no que vem do Redis (`app/services/state.py:300`).\n- **O exemplo não tem todas as chaves de `[ui]`.** O padrão real vem do que a WebUI grava. Um `config.toml` antigo pode ter valores diferentes do exemplo.\n- **O exemplo tem chaves vazias.** Só o `config.toml` recebe valores reais. O `.gitignore` cobre esse arquivo (`.gitignore:2`).\n\n## Prática\n\n1. Qual é o nome da chave de API do provedor OpenAI, e em qual linha do exemplo ela está?\n2. Qual seção guarda a chave de API para a voz ElevenLabs, e a chave de API para a música ElevenLabs usa a mesma?\n3. Se você quer desligar a verificação TLS só para o Ofox, o que a configuração permite?\n\n> [!faq]- Gabarito\n> 1. `openai_api_key`, linha 333 de `config.example.toml`. O provedor é escolhido por `llm_provider`.\n> 2. `[elevenlabs] api_key` (linha 668). A música usa a mesma seção, com `music_base_url` (674) e `music_model_id` (675).\n> 3. Não dá. `tls_verify` é uma chave de `[app]` (`config.example.toml:71`) lida também por MuAPI e Seedance. Desligá-la afeta os três, por isso só faça isso em rede confiável.\n\n## Conexões\n\n- [[Configuração e travas]]: como o arquivo é lido, gravado e protegido.\n- [[Flags do CLI]]: os padrões de `[ui]` que o CLI reaproveita.\n- [[Pipeline e stop_at]]: quais provedores entram em cada etapa.\n- [[Portas de entrada]]: quem usa `api_key` e quem não usa.\n- Canvas: [[03 - Integrações.canvas|Canvas]].\n"
    },
    {
     "id": "r4",
     "section": "ref",
     "title": "Provedores e adaptadores",
     "tags": [
      "mapa",
      "integracoes"
     ],
     "status": "unstable",
     "sources": [
      "app/models/llm_provider.py",
      "app/services/llm.py",
      "app/services/voice.py",
      "app/services/material.py",
      "app/services/bgm.py",
      "app/services/upload_post.py",
      "config.example.toml"
     ],
     "body": "# Provedores e adaptadores\n\n[[00 - Índice|← Índice]]\n\nTabelas de referência. A tabela de LLM foi **gerada** a partir de `LLM_PROVIDER_REGISTRY` com `PYTHONPATH=<worktree> python3 -c \"from app.models.llm_provider import LLM_PROVIDER_REGISTRY ...\"`, não digitada à mão. Total: 37 provedores. Ver a explicação em [[Provedores de LLM]].\n\n## Adaptadores de LLM\n\n| Adaptador | Provedores | Ramo em `llm.py` |\n|---|---|---|\n| `openai_compatible` | 29 | padrão, `llm.py:754` |\n| `gemini` | `gemini` | `:423` |\n| `qwen` | `qwen` | `:397` |\n| `azure` | `azure` | `:516` |\n| `cloudflare_ai_gateway` | `cloudflare` | `:473` |\n| `modelscope` | `modelscope` | `:725` |\n| `litellm` | `litellm` | `:494` |\n| `claude_code` | `claude_code` | `:545` |\n| `kimi_code` | `kimi_code` | `:666` |\n\n## Provedores de LLM (registro completo)\n\nColunas: `Base URL padrão` mostra o `effective_default_base_url` do registro. Quando há regiões, aparecem as ids. `Onde a chave vive` é a chave em `[app]` de `config.example.toml`.\n\n| provider_id | Nome | Adaptador | Exige chave? | Base URL padrão | Onde a chave vive |\n|---|---|---|---|---|---|\n| `moonshot` | Kimi / Moonshot AI | `openai_compatible` | sim | https://api.moonshot.cn/v1 (região: china, global) | moonshot_api_key |\n| `kimi_code` | Kimi Code (Kimi subscription) | `kimi_code` | não | https://api.kimi.com/coding/v1 (região: china, global) | OAuth: kimi_code_access_token/refresh/expires/region |\n| `openai` | OpenAI | `openai_compatible` | sim | https://api.openai.com/v1 | openai_api_key |\n| `anthropic` | Anthropic Claude | `openai_compatible` | sim | https://api.anthropic.com/v1/ | anthropic_api_key |\n| `gemini` | Google Gemini | `gemini` | sim | — | gemini_api_key |\n| `muse_spark` | Muse Spark | `openai_compatible` | sim | https://api.meta.ai/v1 | muse_spark_api_key |\n| `deepseek` | DeepSeek | `openai_compatible` | sim | https://api.deepseek.com | deepseek_api_key |\n| `qwen` | Alibaba Cloud Qwen | `qwen` | sim | — | qwen_api_key |\n| `azure` | Microsoft Azure OpenAI | `azure` | sim | — | azure_api_key |\n| `volcengine` | ByteDance VolcEngine Ark | `openai_compatible` | sim | https://ark.cn-beijing.volces.com/api/v3 | volcengine_api_key |\n| `grok` | xAI Grok | `openai_compatible` | sim | https://api.x.ai/v1 | grok_api_key |\n| `minimax` | MiniMax | `openai_compatible` | sim | https://api.minimax.io/v1 | minimax_api_key |\n| `mimo` | Xiaomi MiMo | `openai_compatible` | sim | https://api.xiaomimimo.com/v1 | mimo_api_key |\n| `iflytek` | iFlytek Spark (Astron MaaS) | `openai_compatible` | sim | https://maas-api.cn-huabei-1.xf-yun.com/v2 | iflytek_api_key |\n| `shengsuanyun` | Shengsuan Cloud | `openai_compatible` | sim | https://router.shengsuanyun.com/api/v1 | shengsuanyun_api_key |\n| `apimart` | APIMart | `openai_compatible` | sim | https://api.apimart.ai/v1 | apimart_api_key |\n| `cloudflare` | Cloudflare AI Gateway | `cloudflare_ai_gateway` | sim | — | cloudflare_api_key + cloudflare_account_id + cloudflare_gateway_id |\n| `modelscope` | Alibaba ModelScope | `modelscope` | sim | https://api-inference.modelscope.cn/v1/ | modelscope_api_key |\n| `aihubmix` | AIHubMix | `openai_compatible` | sim | https://aihubmix.com/v1 | aihubmix_api_key |\n| `aimlapi` | AIML API | `openai_compatible` | sim | https://api.aimlapi.com/v1 | aimlapi_api_key |\n| `evolink` | EvoLink | `openai_compatible` | sim | https://direct.evolink.ai/v1 | evolink_api_key |\n| `openrouter` | OpenRouter | `openai_compatible` | sim | https://openrouter.ai/api/v1 | openrouter_api_key |\n| `api_route` | API Route | `openai_compatible` | sim | https://www.api-route.com/v1 | api_route_api_key |\n| `fluxionai` | Fluxion AI | `openai_compatible` | sim | https://fluxionai.space/v1 | fluxionai_api_key |\n| `cheaperinference` | Cheaper Inference | `openai_compatible` | sim | https://api.cheaperinference.com/v1 | cheaperinference_api_key |\n| `requesty` | Requesty | `openai_compatible` | sim | https://router.requesty.ai/v1 | requesty_api_key |\n| `futureinfra` | FutureInfra | `openai_compatible` | sim | https://futureinfra.ai/v1/ai | futureinfra_api_key |\n| `yapi` | Y-API | `openai_compatible` | sim | https://api.y-api.bestvirtualgoods.com/v1 | yapi_api_key |\n| `opper` | Opper | `openai_compatible` | sim | https://api.opper.ai/v3/compat | opper_api_key |\n| `onomeo` | onomeo | `openai_compatible` | sim | https://onomeo.com/v1 | onomeo_api_key |\n| `empiriolabs` | EmpirioLabs AI | `openai_compatible` | sim | https://api.empiriolabs.ai/v1 | empiriolabs_api_key |\n| `ollama` | Ollama | `openai_compatible` | não | — (detectado em tempo de execução) | não usa chave (api_key fixo \"ollama\") |\n| `claude_code` | Claude Code (Claude subscription) | `claude_code` | não | — | não usa chave (CLI logado) |\n| `oneapi` | OneAPI | `openai_compatible` | sim | — | oneapi_api_key |\n| `litellm` | LiteLLM | `litellm` | não | — | env (ex.: OPENAI_API_KEY); sem chave em [app] |\n| `groq` | Groq | `openai_compatible` | sim | https://api.groq.com/openai/v1 | groq_api_key |\n| `pollinations` | Pollinations AI | `openai_compatible` | sim | https://gen.pollinations.ai/v1 | pollinations_api_key |\n\n> [!warning] unstable\n> A linha `empiriolabs` veio do merge do upstream Turbo v1.3.9 (commit 0dc4e20). Estado a confirmar na `main`.\n\n## Vozes (TTS)\n\nRoteamento em `_single_tts` (`app/services/voice.py:640`), pelo prefixo do nome da voz.\n\n| Prefixo | Função | Chave em config |\n|---|---|---|\n| (padrão, Edge/Azure v1) | `azure_tts_v1` (`voice.py:1535`) | `edge_tts_timeout` |\n| `-V2` | `azure_tts_v2` (`:1784`) | `[azure]` speech_key, speech_region |\n| `siliconflow:` | `siliconflow_tts` (`:1604`) | `[siliconflow]` api_key |\n| `gemini:` | `gemini_tts` (`:1913`) | `gemini_api_key` |\n| `mimo:` | `mimo_tts` (`:2055`) | mimo_api_key, mimo_base_url, mimo_tts_model_name |\n| `minimax:` | `minimax_tts` (`:2380`) | `[minimax_tts]` |\n| `elevenlabs:` | `elevenlabs_tts` (`:2473`) | `[elevenlabs]` api_key |\n| `chatterbox:` | `chatterbox_tts` (`:2766`) | `[chatterbox]` |\n| `kokoro:` | `kokoro_tts` (`:2808`) | `[kokoro]` |\n| `fish_audio:` | `fish_audio_tts` (`:2862`) | `[fish_audio]` ou `FISH_API_KEY` |\n| `voxcpm:` | `voxcpm_tts` (`:3210`) | `[voxcpm]` |\n| `no-voice` | `generate_silent_audio` (`:593`) | nenhuma |\n\n## Material de vídeo\n\n| Fonte (`video_source`) | Módulo e função | Chave | Autenticação |\n|---|---|---|---|\n| `pexels` | `material.py` `search_videos_pexels` (`:341`) | `pexels_api_keys` | cabeçalho |\n| `pixabay` | `search_videos_pixabay` (`:448`) | `pixabay_api_keys` | query string |\n| `coverr` | `search_videos_coverr` (`:590`) | `coverr_api_keys` | Bearer (`material.py:615`) |\n| `wavespeed` | `generate_videos_wavespeed` (`:805`) | `wavespeed_api_keys` | chave |\n| `volcengine_seedance` | `volcengine_seedance.py` | `volcengine_seedance_api_key` (env `VOLCENGINE_ARK_API_KEY`) | Bearer |\n| `ofox` | `ofox.py` | `ofox_api_key` (env `OFOX_API_KEY`) | Bearer |\n| `muapi` | `muapi.py` | `muapi_api_key` (env `MUAPI_API_KEY`) | `x-api-key` |\n| `metaso_minimax` | `metaso_minimax.py` | `metaso_minimax_api_key` | Bearer |\n| `openai_image` | `generate_images_openai` (`:1677`) | `openai_image_base_url`, `openai_image_api_keys` (opcional) | Bearer |\n| `loomloom` (só WebUI) | `loomloom.py` | `loomloom_api_token` (cai em `shengsuanyun_api_key`) | Bearer, cotação confirmada |\n| `local` | `video.preprocess_video` (`app/services/video.py:1955`) | nenhuma | — |\n\nTwelveLabs (reordenação de termos, opcional): `twelvelabs_api_keys`, `twelvelabs_marengo_model`, `twelvelabs_pegasus_model`.\n\n## Música e publicação\n\n| Serviço | Módulo | Chave | Observação |\n|---|---|---|---|\n| Sonilo | `app/services/sonilo.py` | `sonilo_api_key`, env `SONILO_API_KEY` | prompt até 2000 caracteres |\n| ElevenLabs Music | `app/services/elevenlabs_music.py` | `[elevenlabs] api_key` | `music_model_id = \"music_v2\"`, prompt até 1000 caracteres |\n| upload-post | `app/services/upload_post.py` (`API_BASE`, `:24`) | `upload_post_api_key`, `upload_post_username` | `Authorization: Apikey ...` |\n\n## Conexões\n\n- [[Provedores de LLM]] — como o registro funciona.\n- [[Assinaturas em vez de chaves]] — `claude_code` e `kimi_code`.\n- [[Voz e legenda]], [[Material de vídeo]] e [[Música e publicação]] — as etapas que usam essas tabelas.\n- [[Chaves de configuração]] — a lista completa de chaves em `[app]`.\n- [[03 - Integrações.canvas|Canvas]]\n"
    },
    {
     "id": "r5",
     "section": "ref",
     "title": "Contratos JSON dos agentes",
     "tags": [
      "mapa",
      "referencia"
     ],
     "status": "stable",
     "sources": [
      ".agents/pipeline.md",
      ".agents/skills/video/scripts/srt_to_timing.py",
      ".agents/skills/video/scripts/build_timeline.py",
      ".agents/skills/video/scripts/build_music.py",
      ".agents/skills/video/scripts/build_thumbnail.py",
      ".agents/skills/video/scripts/arte.py"
     ],
     "body": "# Contratos JSON dos agentes\n\n[[00 - Índice|← Índice]]\n\nOs cinco arquivos JSON que os papéis do time de vídeo trocam: `sources.json`, `timing.json`, `shotlist.json`, `music.json` e `arte.json`. A coluna **Lido por script** diz o que o código de fato usa. O resto é lido só pelos agentes.\n\n## Ideia central\n\nOs contratos são a interface entre papéis. O texto de `pipeline.md` é a especificação. Os scripts são a prova do que é lido de verdade. Um campo pode existir na especificação e não ter leitor no código: nesse caso, quem interpreta é um agente, não um script.\n\n## Como funciona\n\n### `sources.json` (escreve: `pesquisador`; lido por caçador, editor, auditor e diretor de arte)\n\nUma lista de candidatos a vídeo ou imagem. Veja o exemplo em `pipeline.md:61-66`.\n\n| Campo | Tipo | Opcional | Valores ou formato | Lido por script |\n|---|---|---|---|---|\n| `id` | texto | não | id da fonte (ex.: id do YouTube) | não |\n| `url` | texto | não | link da fonte | não (o `build_timeline` usa a `url` do shotlist) |\n| `type` | texto | não | `video`, `image`, `stock`, `chart`, `user` | não |\n| `channel` | texto | não | nome do canal ou autor | não |\n| `license` | texto | não | ex.: `terceiro (trecho curto)`, `domínio público`, `CC-BY`, `stock` | não |\n| `duration` | texto | não | `m:ss` | não |\n| `covers` | lista de textos | não | em que bloco do roteiro a fonte entra | não |\n| `platform` | texto | sim | `youtube`, `x`, `tiktok`, `instagram`, `reddit` | não |\n| `author` | texto | sim | `@handle` | não |\n| `posted_at` | texto | sim | `AAAA-MM-DD` | não |\n| `via` | texto | sim | `mcp:yt-dlp`, `mcp:reddit`, `mcp:apify`, `yt-dlp`, `web` | não |\n\nO exemplo de `pipeline.md:57-66` mostra os campos; `pipeline.md:58-59` marca `platform`, `author`, `posted_at` e `via` como opcionais. Nenhum script lê o arquivo.\n\n### `timing.json` (escreve: `srt_to_timing.py`, a partir da legenda; lido por caçador, animador, `build_music`, redator)\n\nUma lista, um item por linha da legenda (`srt_to_timing.py:18-35`).\n\n| Campo | Tipo | Notas |\n|---|---|---|\n| `n` | inteiro | começa em 1 |\n| `start` | número, segundos | 3 casas decimais |\n| `end` | número, segundos | 3 casas decimais |\n| `text` | texto | as linhas da legenda juntadas com espaço |\n\nFormato gravado: `json.dump(..., ensure_ascii=False, indent=1)` (`srt_to_timing.py:42-43`).\n\n### `shotlist.json` (escreve: `cacador-de-clipes`; lido por animador, editor, `build_timeline`, crítico e auditor)\n\nUma lista, um item por cena. `dur` é o início da próxima cena menos o início desta (`pipeline.md:74`). A soma das durações deve ser maior ou igual à do áudio.\n\n| Campo | Tipo | Lido por `build_timeline` | Notas |\n|---|---|---|---|\n| `n` | texto ou inteiro | sim | normalizado para dois dígitos (`build_timeline.py:212`) |\n| `dur` | número, segundos | sim | duração exata do clipe |\n| `kind` | texto | sim | `fill`, `window`, `fit`, `image`; aliases `game` e `vert` (fill), `gta` (window), `app` (fit, zoom 0.62) (`:39`) |\n| `file` + `ss` | texto + número | sim | origem local; `ss` é o início no arquivo, padrão 0 |\n| `url` + `start` | texto + número | sim | origem online; baixa de `start - 1` a `start + dur + 1` |\n| `source` | texto | sim | `youtube:<id>`, alternativa a `url` |\n| `x`, `y` | número (0–1) | sim | ponto de foco de `fill` e `image`; padrão 0,5 |\n| `top` | número | sim | só `window`; padrão 0,05 |\n| `zoom` | número (0–1) | sim | `fit` (faixa central) e `image` (zoom final; padrão 1,15) |\n| `crop` | texto | sim | filtro de corte do ffmpeg, só em `fit` |\n| `motion` | verdadeiro ou falso | sim | só `fit` com imagem; padrão verdadeiro (ver nota unstable) |\n| `text` | texto | sim | texto na tela; `\\n` quebra linha |\n| `text_pos` | texto | sim | `top`, `center` ou `bottom`; padrão `top` |\n| `anim` | texto | não | id da composição Remotion; o animador lê |\n| `props` | objeto | não | parâmetros extras para o animador |\n| `phrases` | lista de inteiros | não | frases cobertas; só para o agente |\n| `why` | texto | não | motivo da escolha; só para o agente |\n\nPara cena animada, `file` aponta para `raw/anim_NN.mp4` (`pipeline.md:82-83`). Exemplo em `pipeline.md:76-79`.\n\n### `music.json` (escreve: `montador-mpt`; lido por `build_music`, auditor e editor)\n\n| Campo | Tipo | Lido por `build_music` | Notas |\n|---|---|---|---|\n| `crossfade` | número, segundos | sim (`build_music.py:70`) | padrão 1,5 |\n| `cues` | lista | sim | cada deixa de música |\n| `cues[].start` | número, segundos | sim | início da música no vídeo, numa frase do `timing.json` |\n| `cues[].mood` | texto | só imprime | clima do bloco |\n| `cues[].url` ou `file` | texto | sim | origem da faixa |\n| `cues[].ss` | número | sim | ponto da faixa onde começar; padrão 0 |\n| `cues[].gain_db` | número | sim | ganho extra; padrão 0 |\n| `cues[].title` | texto | só imprime | nome da faixa |\n| `cues[].author`, `license` | texto | não | usados nos créditos pelos agentes |\n\n### `arte.json` (escreve: `diretor-de-arte`; lido por `build_timeline`, `build_thumbnail` e montador)\n\n| Seção | Campo | Lido por script | Padrão em `arte.py` |\n|---|---|---|---|\n| `texto_na_tela` | `font`, `color`, `size`, `box`, `box_color` | sim: `build_timeline.py:215` | `BeVietnamPro-Bold.ttf`, `#FFFFFF`, 96, verdadeiro, `#000000@0.55` (`arte.py:10-11`) |\n| `thumbnail` | `font`, `color`, `accent` | sim: `build_thumbnail.py:24` e `:48` | `BeVietnamPro-Bold.ttf`, `#FFFFFF`, `#FFD400` (`arte.py:12`) |\n| `legenda` | `font_name`, `text_fore_color`, `stroke_color`, `stroke_width`, `position`, `background`, `background_color` | não | **sem padrão** em `arte.py` |\n\nA seção `legenda` vira flags do CLI pelo montador: `--font-name`, `--text-fore-color`, `--stroke-color`, `--stroke-width`, `--subtitle-position`, `--subtitle-background-enabled`, `--subtitle-background-color` (`pipeline.md:110-112`).\n\n## Exemplo / percurso\n\nUm `timing.json` gerado a partir de uma legenda, e um item de `music.json`:\n\n```json\n[{\"n\": 1, \"start\": 0.098, \"end\": 3.598, \"text\": \"A inteligência artificial...\"}]\n```\n\n```json\n{\"crossfade\": 1.5, \"cues\": [{\"start\": 34.5, \"mood\": \"amedrontador\", \"file\": \"raw/music/Darkest Child.mp3\", \"ss\": 0,\n  \"title\": \"Darkest Child\", \"author\": \"Kevin MacLeod\", \"license\": \"CC BY 4.0\"}]}\n```\n\n## Armadilhas\n\n- **Campos sem leitor.** `sources.json` não tem leitor em script; quem o lê é o auditor, na checagem de direitos. `arte.json.legenda` também não tem leitor no código: o montador o traduz para flags à mão.\n- **Cor padrão diferente.** `texto_na_tela.color` vale `#FFFFFF` em `arte.py:10`, mas o exemplo de `pipeline.md:106` usa `#FFD400`. O arquivo do projeto sempre vence o padrão.\n- **`anim` e `props` não são lidos por `build_timeline`.** Eles são instruções para o animador, que renderiza `raw/anim_NN.mp4` e aponta `file`.\n- **`start` não é `ss`.** Com `url`, `start` é o momento no vídeo-fonte. Com `file`, `ss` é o início dentro do arquivo local.\n\n> [!warning] unstable\n> O campo `motion` de `fit` (zoom lento em imagem fixa) é `status/unstable`. Estado a confirmar na `main`.\n\n## Conexões\n\n- Conceito: [[Time de vídeo e contratos de arquivo]]. Percurso: [[04 - Vídeo pelo time de agentes]].\n- Referência: [[Papéis e modelos]], [[Flags do CLI]], [[Chaves de configuração]].\n- Conceitos relacionados: [[Pipeline e stop_at]], [[Voz e legenda]], [[Música e publicação]].\n"
    },
    {
     "id": "r6",
     "section": "ref",
     "title": "Papéis e modelos",
     "tags": [
      "mapa",
      "referencia"
     ],
     "status": "unstable",
     "sources": [
      ".agents/roles/",
      ".claude/agents/",
      ".grok/agents/",
      ".agents/setup.md",
      ".agents/tecnico.md",
      ".agents/tools/sync_grok_agents.py",
      "AGENTS.md"
     ],
     "body": "# Papéis e modelos\n\n[[00 - Índice|← Índice]]\n\nOs 20 papéis do harness: quem faz o quê, com que modelo e com quais ferramentas no Claude Code.\n\n## Ideia central\n\nCada papel tem uma **fonte** em `.agents/roles/<papel>.md`, sem modelo nem ferramenta. O modelo e as ferramentas ficam só no adaptador `.claude/agents/<papel>.md`. O Grok gera o adaptador com `model: inherit`, porque `sonnet` e `haiku` não existem lá.\n\nRegra de escolha de modelo (`setup.md:68-74`): modelo pequeno para trabalho mecânico (`haiku`), modelo intermediário para julgamento, visão ou código (`sonnet`). Modelo mais forte só se um papel errar fatos ou análise de forma repetida. Nenhum papel usa modelo mais forte hoje.\n\n## Como funciona\n\nOs papéis do time de vídeo (12). O modelo vem de `.claude/agents/<papel>.md`, linha 4.\n\n| Papel | Entradas | Saídas | Modelo | Ferramentas (Claude) |\n|---|---|---|---|---|\n| `pesquisador` | `brief.md`; na revisão, críticas e auditoria | `research.md`, `sources.json`, `script.txt`, `music-plan.md` | sonnet | WebSearch, WebFetch, Read, Write, Edit, Bash, Glob, Grep, mcp yt-dlp, reddit, apify |\n| `critico` | script, research, brief; final, timing, shotlist (visual) | `critique/content-NN.md`, `critique/visual-NN.md` | sonnet | Read, Glob, Grep, Bash, WebSearch, Write |\n| `sugestor-de-pauta` | brief, script, research, último crítico | `critique/ideas-NN.md` (até 8 ideias) | sonnet | Read, Glob, Grep, WebSearch, WebFetch, Write, mcp yt-dlp, reddit, apify |\n| `auditor` | script, research, brief; shotlist, music, credits, sources, final | `audit/fatos-NN.md`, `audit/direitos-NN.md` | sonnet | Read, Write, Glob, Grep, Bash, WebSearch, WebFetch, mcp yt-dlp, reddit, apify |\n| `diretor-de-arte` | brief, script, music-plan, sources, Histórico do perfil | `arte.md`, `arte.json` | sonnet | Read, Write, Edit, Glob, Bash |\n| `diretor` | tudo | `aprovacao-NN.md`, `entrega.md` | sonnet | Read, Write, Glob, Grep, Bash |\n| `montador-mpt` | script, music-plan, timeline/, arte.json | `timing.json`, `music.json`, `bgm.mp3`, `output/final.mp4` | **haiku** | Bash, Read, Write, Edit, Glob, Grep |\n| `cacador-de-clipes` | timing, sources, script, arte.md | `shotlist.json`, `raw/` | sonnet | Bash, Read, Write, Glob, Grep, WebSearch, mcp yt-dlp, apify |\n| `animador` | shotlist (itens com `anim`), arte.json, timing | `raw/anim_NN.mp4` | sonnet | Bash, Read, Write, Edit, Glob, Grep |\n| `editor-de-clipes` | shotlist, timing, sources | `timeline/NN.mp4`, `raw/timeline_preview.png`, `credits.md` | sonnet | Bash, Read, Write, Edit, Glob |\n| `designer-de-thumbnail` | arte, script, timeline/, raw/ | `publicacao/thumb-*.png`, `thumbs_preview.png` | **haiku** | Bash, Read, Write, Glob |\n| `redator-de-publicacao` | script, research, credits, timing, arte.md | `publicacao/publicacao.md` | **haiku** | Read, Write, Glob, WebSearch |\n\nOs papéis do time técnico (6) e os de harness (2). Todos usam `sonnet` no Claude.\n\n| Papel | Entradas | Saídas | Modelo | Ferramentas (Claude) |\n|---|---|---|---|---|\n| `arquiteto` | pedido, código | `plano.md` | sonnet | Read, Glob, Grep, Bash, Write |\n| `desenvolvedor` | `plano.md` | código, `mudancas-NN.md` | sonnet | Bash, Read, Write, Edit, Glob, Grep |\n| `testador` | `plano.md`, código | `test/`, `testes-NN.md` | sonnet | Bash, Read, Write, Edit, Glob, Grep |\n| `revisor-de-codigo` | diff, `plano.md` | `revisao-NN.md` | sonnet | Read, Glob, Grep, Bash, Write |\n| `auditor-de-seguranca` | diff ou código | `seguranca-NN.md` | sonnet | Read, Glob, Grep, Bash, Write, WebSearch, WebFetch |\n| `auditor-de-saude` | código, CI | `saude.md` | sonnet | Read, Glob, Grep, Bash, Write, WebSearch |\n| `pesquisador-de-integracoes` | candidato (API, SDK, MCP) | `integracoes-NN.md` | sonnet | WebSearch, WebFetch, Read, Glob, Grep, Bash, Write |\n| `mantenedor-do-harness` | `AGENTS.md`, `.agents/`, adaptadores | `harness-NN.md` e edições pedidas | sonnet | Read, Glob, Grep, Bash, Write, Edit |\n\nAs entradas do time técnico vêm de `tecnico.md:19-29` e dos cabeçalhos de cada papel. Os modelos e as ferramentas vêm de `.claude/agents/<papel>.md` (linhas 4 e 5).\n\n## Exemplo / percurso\n\nUm papel novo, `revisor-de-acessibilidade`, precisaria de:\n\n1. `.agents/roles/revisor-de-acessibilidade.md`, com `name` e `description` (sem modelo);\n2. `.claude/agents/revisor-de-acessibilidade.md`, com `model:` e `tools:`;\n3. a rodada `python3 .agents/tools/sync_grok_agents.py`, que gera o adaptador do Grok com `model: inherit`;\n4. a linha na tabela de `AGENTS.md`.\n\n## Armadilhas\n\n- **O modelo não está na fonte.** Os cabeçalhos de `.agents/roles/` têm só `name` e `description`. Para saber o modelo, é preciso ler o adaptador Claude. Isso é a inconsistência 12 do mapa.\n- **`AGENTS.md` lista 11 papéis de vídeo.** Falta o `animador`. A tabela de `AGENTS.md:73-83` está incompleta.\n- **Grok não tem modelo fixo.** Todos os adaptadores gerados usam `inherit`, então o modelo do Grok é o da sessão. Ver [[Adaptadores Claude e Grok]].\n\n> [!warning] unstable\n> Os 8 papéis do time técnico, incluindo `mantenedor-do-harness` e `pesquisador-de-integracoes`, são `status/unstable`. Os 12 papéis de vídeo estão na `main`.\n\n## Conexões\n\n- Conceitos: [[Time de vídeo e contratos de arquivo]], [[Time técnico]], [[Harness de agentes]].\n- Referência: [[Contratos JSON dos agentes]].\n- Canvas: [[04 - Time de vídeo.canvas|Canvas do time de vídeo]], [[05 - Time técnico.canvas|Canvas do time técnico]].\n"
    }
   ],
   "canvases": [
    {
     "id": "k0",
     "title": "00 - Geral",
     "data": {
      "nodes": [
       {
        "id": "b0c2815e2ce544d4",
        "type": "group",
        "label": "Portas de entrada",
        "x": -30,
        "y": -50,
        "width": 380,
        "height": 620
       },
       {
        "id": "be0ec00a9f2ea457",
        "type": "group",
        "label": "Harness de agentes",
        "x": 370,
        "y": 350,
        "width": 1180,
        "height": 420
       },
       {
        "id": "8a5da52ed126447d",
        "type": "text",
        "text": "# API\n`POST /api/v1/videos`\n`app/asgi.py`",
        "x": 0,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "2567a5ec9705eb7a",
        "type": "text",
        "text": "# WebUI\n`webui/Main.py` (Streamlit)",
        "x": 0,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "0898b22730d57afc",
        "type": "text",
        "text": "# CLI\n`cli.py` · `mpt cli`",
        "x": 0,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "ea2b2676c28c0db2",
        "type": "text",
        "text": "## task.start()\n`_run_pipeline` em `app/services/task.py`",
        "x": 400,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "bf8b08fc6f47355e",
        "type": "text",
        "text": "## Etapas\nroteiro → termos → voz → legenda → material → vídeo",
        "x": 800,
        "y": 200,
        "width": 320,
        "height": 140
       },
       {
        "id": "f5cef96d7e57bb60",
        "type": "text",
        "text": "# Saída\n`storage/tasks/<id>/`\n`final-N.mp4`",
        "x": 1200,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "6"
       },
       {
        "id": "5d8d1cb9136777c8",
        "type": "text",
        "text": "## Integrações\nLLM · TTS · legenda · bancos de vídeo · IA",
        "x": 800,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "48a8f39871124f8a",
        "type": "text",
        "text": "## montador-mpt\nroda o `mpt cli`",
        "x": 400,
        "y": 400,
        "width": 320,
        "height": 140
       },
       {
        "id": "421b47ffd946ca08",
        "type": "text",
        "text": "## Time de vídeo\n`.agents/skills/video`",
        "x": 800,
        "y": 400,
        "width": 320,
        "height": 140
       },
       {
        "id": "044c3027c1bfd773",
        "type": "text",
        "text": "## Time técnico\n`.agents/skills/manutencao`",
        "x": 1200,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "2"
       },
       {
        "id": "42732a4781317eda",
        "type": "text",
        "text": "## MCP e adaptadores\n`.mcp.json` · `.claude/` · `.grok/`",
        "x": 800,
        "y": 600,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "3aa53cec161c587e",
        "type": "text",
        "text": "## Omni × Turbo\nfork em `9e7d8b7` · ver canvas 06",
        "x": 0,
        "y": 800,
        "width": 320,
        "height": 140
       },
       {
        "id": "92ec19ffde05e157",
        "type": "text",
        "text": "## Branches\n`main` testada · `unstable` em laranja · ver canvas 07",
        "x": 400,
        "y": 800,
        "width": 320,
        "height": 140
       }
      ],
      "edges": [
       {
        "id": "6627f62fb7121155",
        "fromNode": "8a5da52ed126447d",
        "fromSide": "right",
        "toNode": "ea2b2676c28c0db2",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "118103c45d42595c",
        "fromNode": "2567a5ec9705eb7a",
        "fromSide": "right",
        "toNode": "ea2b2676c28c0db2",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "c5e06bb7f9d27590",
        "fromNode": "0898b22730d57afc",
        "fromSide": "right",
        "toNode": "ea2b2676c28c0db2",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "7bfff4d373dacfff",
        "fromNode": "ea2b2676c28c0db2",
        "fromSide": "right",
        "toNode": "bf8b08fc6f47355e",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "fa6c3cfb53176676",
        "fromNode": "bf8b08fc6f47355e",
        "fromSide": "top",
        "toNode": "5d8d1cb9136777c8",
        "toSide": "bottom",
        "toEnd": "arrow",
        "label": "roteiro, voz, material"
       },
       {
        "id": "d841638f14d1dc09",
        "fromNode": "bf8b08fc6f47355e",
        "fromSide": "right",
        "toNode": "f5cef96d7e57bb60",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "render"
       },
       {
        "id": "1170c55b4821d944",
        "fromNode": "48a8f39871124f8a",
        "fromSide": "left",
        "toNode": "0898b22730d57afc",
        "toSide": "right",
        "toEnd": "arrow",
        "label": "mpt cli"
       },
       {
        "id": "4b81ad06dbd4ac7e",
        "fromNode": "421b47ffd946ca08",
        "fromSide": "left",
        "toNode": "48a8f39871124f8a",
        "toSide": "right",
        "toEnd": "arrow",
        "label": "comanda"
       },
       {
        "id": "77da8a83e8a39e0a",
        "fromNode": "42732a4781317eda",
        "fromSide": "top",
        "toNode": "421b47ffd946ca08",
        "toSide": "bottom",
        "toEnd": "arrow",
        "label": "ferramentas"
       }
      ]
     }
    },
    {
     "id": "k1",
     "title": "01 - Pipeline",
     "data": {
      "nodes": [
       {
        "id": "051f9506323738e8",
        "type": "group",
        "label": "Preparação",
        "x": -30,
        "y": -50,
        "width": 780,
        "height": 420
       },
       {
        "id": "cbcdec1b7b1b769b",
        "type": "group",
        "label": "Etapas, ordem fixa",
        "x": 770,
        "y": -50,
        "width": 2780,
        "height": 220
       },
       {
        "id": "893ce80729195afe",
        "type": "text",
        "text": "# Início\n`start()` → `_run_pipeline`",
        "x": 0,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "0b0088ea4af2070c",
        "type": "text",
        "text": "## Pré-checagens\nfonte, chaves, ffmpeg",
        "x": 400,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "a2843ebd03a7d7dd",
        "type": "text",
        "text": "# Falha\n`_mark_task_failed` grava `failed_stage`",
        "x": 400,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "1"
       },
       {
        "id": "ccdb3717dd1f8154",
        "type": "text",
        "text": "# 1 · Roteiro\nLLM, pulado com `video_script`",
        "x": 800,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "6f28133e9829d70f",
        "type": "text",
        "text": "# 2 · Termos\nLLM e rerank opcional",
        "x": 1200,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "a5ca0b5894324f8b",
        "type": "text",
        "text": "# 3 · Áudio\nTTS ou silêncio",
        "x": 1600,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "88f7b0199083ab4f",
        "type": "text",
        "text": "# 4 · Legenda\nedge ou whisper",
        "x": 2000,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "b0362266f4a485e9",
        "type": "text",
        "text": "# 5 · Materiais\nlocal ou provedor de vídeo",
        "x": 2400,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "421b47ffd946ca08",
        "type": "text",
        "text": "# 6 · Vídeo\ncombina, mixa, legenda, BGM",
        "x": 2800,
        "y": 0,
        "width": 320,
        "height": 140
       },
       {
        "id": "82f60b1d688c0223",
        "type": "text",
        "text": "# Concluído\n`state=1`; publicação em segundo plano",
        "x": 3200,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "6"
       },
       {
        "id": "7fad4cee9e5014d0",
        "type": "text",
        "text": "## stop_at\nesta é a etapa-alvo? sim: devolve; não: segue",
        "x": 800,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "f5cef96d7e57bb60",
        "type": "text",
        "text": "# Saída parcial\ndicionário da etapa",
        "x": 800,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "6"
       },
       {
        "id": "312a2dad2be750a1",
        "type": "text",
        "text": "# Movimento de imagem\n`image_motion` (unstable)",
        "x": 2400,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "2"
       }
      ],
      "edges": [
       {
        "id": "bcd66e80dd4fc245",
        "fromNode": "893ce80729195afe",
        "fromSide": "right",
        "toNode": "0b0088ea4af2070c",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "3d16dd8fa2c064cc",
        "fromNode": "0b0088ea4af2070c",
        "fromSide": "right",
        "toNode": "ccdb3717dd1f8154",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "sim",
        "color": "4"
       },
       {
        "id": "fb1005144fa27c90",
        "fromNode": "0b0088ea4af2070c",
        "fromSide": "bottom",
        "toNode": "a2843ebd03a7d7dd",
        "toSide": "top",
        "toEnd": "arrow",
        "label": "não",
        "color": "1"
       },
       {
        "id": "1267f2dc216bd071",
        "fromNode": "ccdb3717dd1f8154",
        "fromSide": "right",
        "toNode": "6f28133e9829d70f",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "0d6d205ac92eef46",
        "fromNode": "6f28133e9829d70f",
        "fromSide": "right",
        "toNode": "a5ca0b5894324f8b",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "058e5d75ce90e502",
        "fromNode": "a5ca0b5894324f8b",
        "fromSide": "right",
        "toNode": "88f7b0199083ab4f",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "2a075b5d6ecf59c3",
        "fromNode": "88f7b0199083ab4f",
        "fromSide": "right",
        "toNode": "b0362266f4a485e9",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "592e6d5177b8d610",
        "fromNode": "b0362266f4a485e9",
        "fromSide": "right",
        "toNode": "421b47ffd946ca08",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "e2ca09f3a6237077",
        "fromNode": "421b47ffd946ca08",
        "fromSide": "right",
        "toNode": "82f60b1d688c0223",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "d83272750a8540ad",
        "fromNode": "ccdb3717dd1f8154",
        "fromSide": "bottom",
        "toNode": "7fad4cee9e5014d0",
        "toSide": "top",
        "toEnd": "arrow",
        "label": "após cada etapa"
       },
       {
        "id": "9ad02aca0c4aadb5",
        "fromNode": "7fad4cee9e5014d0",
        "fromSide": "bottom",
        "toNode": "f5cef96d7e57bb60",
        "toSide": "top",
        "toEnd": "arrow",
        "label": "sim",
        "color": "6"
       },
       {
        "id": "09b5300709a25603",
        "fromNode": "7fad4cee9e5014d0",
        "fromSide": "right",
        "toNode": "6f28133e9829d70f",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "não"
       },
       {
        "id": "28a562013fa42457",
        "fromNode": "312a2dad2be750a1",
        "fromSide": "top",
        "toNode": "b0362266f4a485e9",
        "toSide": "bottom",
        "toEnd": "arrow",
        "label": "static / zoom",
        "color": "2"
       }
      ]
     }
    },
    {
     "id": "k2",
     "title": "02 - Portas de entrada",
     "data": {
      "nodes": [
       {
        "id": "3899f0216ad054c5",
        "type": "group",
        "label": "Antes de start()",
        "x": -30,
        "y": -50,
        "width": 1180,
        "height": 620
       },
       {
        "id": "8a5da52ed126447d",
        "type": "text",
        "text": "# API\n`POST /api/v1/videos`",
        "x": 0,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "55d456555ef94ef8",
        "type": "text",
        "text": "## Valida\nesquema, cores, fonte, `x-api-key`",
        "x": 400,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "085556ac79fd5c5f",
        "type": "text",
        "text": "# Fila\n`add_task`; cheia: 429",
        "x": 800,
        "y": 0,
        "width": 320,
        "height": 140
       },
       {
        "id": "2567a5ec9705eb7a",
        "type": "text",
        "text": "# WebUI\nbotão Gerar",
        "x": 0,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "a1939d60ac374a69",
        "type": "text",
        "text": "# Fila da WebUI\n1 tarefa por vez; pega `runtime_config_lock`",
        "x": 800,
        "y": 200,
        "width": 320,
        "height": 140
       },
       {
        "id": "0898b22730d57afc",
        "type": "text",
        "text": "# CLI\n`cli.py --video-script ...`",
        "x": 0,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "1c58a6e55f600a41",
        "type": "text",
        "text": "## Valida\nargparse, materiais copiados",
        "x": 400,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "6ba2b4705065d33c",
        "type": "text",
        "text": "# Sem fila\nchamada síncrona, caminho absoluto aceito",
        "x": 800,
        "y": 400,
        "width": 320,
        "height": 140
       },
       {
        "id": "ea2b2676c28c0db2",
        "type": "text",
        "text": "# task.start()\n`_run_pipeline`",
        "x": 1200,
        "y": 200,
        "width": 320,
        "height": 140
       },
       {
        "id": "f5cef96d7e57bb60",
        "type": "text",
        "text": "# Arquivos\n`storage/tasks/<id>/`",
        "x": 1600,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "6"
       },
       {
        "id": "0f9a758d5f89d8ce",
        "type": "text",
        "text": "# Recusa\nAPI: 400, 401, 429 · CLI: saída 2",
        "x": 400,
        "y": 600,
        "width": 320,
        "height": 140,
        "color": "1"
       }
      ],
      "edges": [
       {
        "id": "07dfccd85e617499",
        "fromNode": "8a5da52ed126447d",
        "fromSide": "right",
        "toNode": "55d456555ef94ef8",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "4b002fde90aa4fea",
        "fromNode": "55d456555ef94ef8",
        "fromSide": "right",
        "toNode": "085556ac79fd5c5f",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "sim",
        "color": "4"
       },
       {
        "id": "ef42eba829beb5db",
        "fromNode": "55d456555ef94ef8",
        "fromSide": "bottom",
        "toNode": "0f9a758d5f89d8ce",
        "toSide": "top",
        "toEnd": "arrow",
        "label": "não",
        "color": "1"
       },
       {
        "id": "c0d258b4ed3ef9e1",
        "fromNode": "085556ac79fd5c5f",
        "fromSide": "right",
        "toNode": "ea2b2676c28c0db2",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "9dcdfa09968bdfcc",
        "fromNode": "2567a5ec9705eb7a",
        "fromSide": "right",
        "toNode": "a1939d60ac374a69",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "trava + fila"
       },
       {
        "id": "a84884616d62a55a",
        "fromNode": "a1939d60ac374a69",
        "fromSide": "right",
        "toNode": "ea2b2676c28c0db2",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "0682114e17b0897c",
        "fromNode": "0898b22730d57afc",
        "fromSide": "right",
        "toNode": "1c58a6e55f600a41",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "bac6ec69baa8e014",
        "fromNode": "1c58a6e55f600a41",
        "fromSide": "right",
        "toNode": "6ba2b4705065d33c",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "sim",
        "color": "4"
       },
       {
        "id": "33d700870203a3ee",
        "fromNode": "1c58a6e55f600a41",
        "fromSide": "bottom",
        "toNode": "0f9a758d5f89d8ce",
        "toSide": "top",
        "toEnd": "arrow",
        "label": "não",
        "color": "1"
       },
       {
        "id": "17155546e195d614",
        "fromNode": "6ba2b4705065d33c",
        "fromSide": "right",
        "toNode": "ea2b2676c28c0db2",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "e2fdd4a164e9b15e",
        "fromNode": "ea2b2676c28c0db2",
        "fromSide": "right",
        "toNode": "f5cef96d7e57bb60",
        "toSide": "left",
        "toEnd": "arrow"
       }
      ]
     }
    },
    {
     "id": "k3",
     "title": "03 - Integrações",
     "data": {
      "nodes": [
       {
        "id": "b84d6fb6ada5da06",
        "type": "group",
        "label": "Pipeline (estágios)",
        "x": 370,
        "y": 550,
        "width": 2380,
        "height": 220
       },
       {
        "id": "ccdb3717dd1f8154",
        "type": "text",
        "text": "## Roteiro e termos\n`llm.generate_script`",
        "x": 400,
        "y": 600,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "a5ca0b5894324f8b",
        "type": "text",
        "text": "## Áudio\n`generate_audio` → `voice.tts`",
        "x": 800,
        "y": 600,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "88f7b0199083ab4f",
        "type": "text",
        "text": "## Legenda\n`edge` ou `whisper` local",
        "x": 1200,
        "y": 600,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "eec34d804c9ce6c8",
        "type": "text",
        "text": "## Material\n`get_video_materials`",
        "x": 1600,
        "y": 600,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "421b47ffd946ca08",
        "type": "text",
        "text": "## Vídeo final\n`generate_final_videos`",
        "x": 2000,
        "y": 600,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "f8e71a764f4915da",
        "type": "text",
        "text": "# Publicação\n`_run_cross_post`",
        "x": 2400,
        "y": 600,
        "width": 320,
        "height": 140,
        "color": "6"
       },
       {
        "id": "dae1be85dab3650e",
        "type": "text",
        "text": "## LLM\n37 provedores (`LLM_PROVIDER_REGISTRY`)",
        "x": 400,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "decc1eab6d0751fc",
        "type": "text",
        "text": "## Assinaturas (sem chave)\nClaude Code (CLI), Kimi Code (OAuth)",
        "x": 0,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "72ecb0838c7b4ffb",
        "type": "text",
        "text": "## TTS\nEdge, Azure, Gemini, ElevenLabs e outros",
        "x": 800,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "76ee3de97a1b8b90",
        "type": "text",
        "text": "## upload-post\nTikTok, Instagram, YouTube",
        "x": 2400,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "fd3ee263d1cd81c6",
        "type": "text",
        "text": "## Stock e IA\nPexels, Pixabay, Coverr; WaveSpeed, Seedance, OFox, MuAPI, Metaso, OpenAI image",
        "x": 1600,
        "y": 1000,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "ddc88111e7c64377",
        "type": "text",
        "text": "## Música por IA\nSonilo, ElevenLabs Music",
        "x": 2000,
        "y": 1000,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "19e74ab95eb54475",
        "type": "text",
        "text": "## SDXL local\n`docs/local-image-server` (instável)",
        "x": 1200,
        "y": 1000,
        "width": 320,
        "height": 140,
        "color": "2"
       },
       {
        "id": "d158ca5ea46eeded",
        "type": "text",
        "text": "## PLANEJADO\nCodex CLI, Gemini CLI, Grok Build, STT/TTS xAI",
        "x": 0,
        "y": 1000,
        "width": 320,
        "height": 140,
        "color": "2"
       }
      ],
      "edges": [
       {
        "id": "bef1323968238210",
        "fromNode": "ccdb3717dd1f8154",
        "fromSide": "right",
        "toNode": "a5ca0b5894324f8b",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "058e5d75ce90e502",
        "fromNode": "a5ca0b5894324f8b",
        "fromSide": "right",
        "toNode": "88f7b0199083ab4f",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "9c3bb4702f40cd8c",
        "fromNode": "88f7b0199083ab4f",
        "fromSide": "right",
        "toNode": "eec34d804c9ce6c8",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "505f110c6c11a5a9",
        "fromNode": "eec34d804c9ce6c8",
        "fromSide": "right",
        "toNode": "421b47ffd946ca08",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "9a1a7f8575cfacbd",
        "fromNode": "421b47ffd946ca08",
        "fromSide": "right",
        "toNode": "f8e71a764f4915da",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "07ee9ba507f86e69",
        "fromNode": "decc1eab6d0751fc",
        "fromSide": "right",
        "toNode": "dae1be85dab3650e",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "login",
        "color": "5"
       },
       {
        "id": "147015526e45bede",
        "fromNode": "dae1be85dab3650e",
        "fromSide": "bottom",
        "toNode": "ccdb3717dd1f8154",
        "toSide": "top",
        "toEnd": "arrow",
        "label": "roteiro",
        "color": "5"
       },
       {
        "id": "208c3a47f3728036",
        "fromNode": "72ecb0838c7b4ffb",
        "fromSide": "bottom",
        "toNode": "a5ca0b5894324f8b",
        "toSide": "top",
        "toEnd": "arrow",
        "label": "voz",
        "color": "5"
       },
       {
        "id": "2d570d6b52d847a1",
        "fromNode": "fd3ee263d1cd81c6",
        "fromSide": "top",
        "toNode": "eec34d804c9ce6c8",
        "toSide": "bottom",
        "toEnd": "arrow",
        "label": "clipes",
        "color": "5"
       },
       {
        "id": "846f99fc8d559e1e",
        "fromNode": "ddc88111e7c64377",
        "fromSide": "top",
        "toNode": "421b47ffd946ca08",
        "toSide": "bottom",
        "toEnd": "arrow",
        "label": "trilha",
        "color": "5"
       },
       {
        "id": "4ba16e39f6667113",
        "fromNode": "76ee3de97a1b8b90",
        "fromSide": "bottom",
        "toNode": "f8e71a764f4915da",
        "toSide": "top",
        "toEnd": "arrow",
        "label": "envio",
        "color": "5"
       },
       {
        "id": "f631139e08a25ea2",
        "fromNode": "19e74ab95eb54475",
        "fromSide": "top",
        "toNode": "eec34d804c9ce6c8",
        "toSide": "bottom",
        "toEnd": "arrow",
        "label": "imagens",
        "color": "2"
       }
      ]
     }
    },
    {
     "id": "k4",
     "title": "04 - Time de vídeo",
     "data": {
      "nodes": [
       {
        "id": "2bee2f2a139f9191",
        "type": "group",
        "label": "Pesquisa e crítica (0–3)",
        "x": -30,
        "y": -50,
        "width": 1580,
        "height": 220
       },
       {
        "id": "f929b34474fd31fb",
        "type": "group",
        "label": "Arte, aprovação e tempo (4–6)",
        "x": 1570,
        "y": -50,
        "width": 1180,
        "height": 220
       },
       {
        "id": "d20b2dbedf71a5f3",
        "type": "group",
        "label": "Clipes, render e revisão (7–10)",
        "x": 770,
        "y": 350,
        "width": 1980,
        "height": 220
       },
       {
        "id": "965b43ca338e37e4",
        "type": "group",
        "label": "Publicação e entrega (11–12)",
        "x": -30,
        "y": 350,
        "width": 780,
        "height": 220
       },
       {
        "id": "106f16a8fde7ae2e",
        "type": "text",
        "text": "# 0 · Pedido e brief\n`brief.md`: perfil, tema, duração, formato, idioma\n*orquestrador*",
        "x": 0,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "ba3902395ef335e4",
        "type": "text",
        "text": "## 1 · pesquisador\n`research.md`, `sources.json`, `script.txt`, `music-plan.md`",
        "x": 400,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "48cd7517d21176f9",
        "type": "text",
        "text": "## 2 · revisão em paralelo\n`critico` → `critique/content-NN.md`\n`sugestor-de-pauta` → `critique/ideas-NN.md`\n`auditor` (fatos) → `audit/fatos-NN.md`",
        "x": 800,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "a3218734457b9a9b",
        "type": "text",
        "text": "## 3 · reprova ou sugere?\n`REVISAR`, `CORRIGIR` ou sugestão de alto ganho",
        "x": 1200,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "c8581bc43486c23e",
        "type": "text",
        "text": "## 4 · diretor-de-arte\n`arte.md`, `arte.json`: legenda, textos, thumbnail",
        "x": 1600,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "d018268506e28685",
        "type": "text",
        "text": "## 5 · diretor (aprovação)\n`aprovacao-NN.md`\n**PARADA:** só segue com o aval do usuário",
        "x": 2000,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "e34c64a05273012b",
        "type": "text",
        "text": "## 6 · montador-mpt (tempo)\n`--stop-at audio` e `subtitle`, `timing.json`, `music.json`, `bgm.mp3`",
        "x": 2400,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "f6d8b886335927d4",
        "type": "text",
        "text": "## 7 · cacador-de-clipes\n`shotlist.json`, `raw/`\n7b · `animador`: `raw/anim_NN.mp4`",
        "x": 2400,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "de95b43bceeb4b99",
        "type": "text",
        "text": "## 8 · editor-de-clipes\n`build_timeline.py` → `timeline/NN.mp4`, `credits.md`",
        "x": 2000,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "9e5f0bb330344d58",
        "type": "text",
        "text": "## 9 · montador-mpt (render)\n`output/final.mp4`",
        "x": 1600,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "c3e888ce42796ce1",
        "type": "text",
        "text": "## 10 · revisão final\n`critico` → `critique/visual-NN.md`\n`auditor` (direitos) → `audit/direitos-NN.md`",
        "x": 1200,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "a585257a5b4d06da",
        "type": "text",
        "text": "## Reprova?\n`REVISAR` ou `CORRIGIR`",
        "x": 800,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "3a21cd7317e1445b",
        "type": "text",
        "text": "## 11 · designer e redator\n`publicacao/thumb-*.png`, `publicacao.md`",
        "x": 400,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "645ec79f22bec5ef",
        "type": "text",
        "text": "## 12 · diretor (entrega)\n`entrega.md`: `PRONTO` ou `REFAZER <etapa>`\n## 13 · relatório\nNada é publicado.",
        "x": 0,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "6"
       }
      ],
      "edges": [
       {
        "id": "42a6f2f12597381f",
        "fromNode": "106f16a8fde7ae2e",
        "fromSide": "right",
        "toNode": "ba3902395ef335e4",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "ae1b0907ba95b60c",
        "fromNode": "ba3902395ef335e4",
        "fromSide": "right",
        "toNode": "48cd7517d21176f9",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "cfd34e21e5850322",
        "fromNode": "48cd7517d21176f9",
        "fromSide": "right",
        "toNode": "a3218734457b9a9b",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "ca80889801aa80cc",
        "fromNode": "a3218734457b9a9b",
        "fromSide": "right",
        "toNode": "c8581bc43486c23e",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "não"
       },
       {
        "id": "761f59688c20f567",
        "fromNode": "c8581bc43486c23e",
        "fromSide": "right",
        "toNode": "d018268506e28685",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "e32fd3153c431314",
        "fromNode": "d018268506e28685",
        "fromSide": "right",
        "toNode": "e34c64a05273012b",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "aprovado"
       },
       {
        "id": "3a5cda6807b341b8",
        "fromNode": "e34c64a05273012b",
        "fromSide": "bottom",
        "toNode": "f6d8b886335927d4",
        "toSide": "top",
        "toEnd": "arrow"
       },
       {
        "id": "c78d294bcc1a8d89",
        "fromNode": "f6d8b886335927d4",
        "fromSide": "left",
        "toNode": "de95b43bceeb4b99",
        "toSide": "right",
        "toEnd": "arrow"
       },
       {
        "id": "c2267adb7e2d4687",
        "fromNode": "de95b43bceeb4b99",
        "fromSide": "left",
        "toNode": "9e5f0bb330344d58",
        "toSide": "right",
        "toEnd": "arrow"
       },
       {
        "id": "29548060f0037337",
        "fromNode": "9e5f0bb330344d58",
        "fromSide": "left",
        "toNode": "c3e888ce42796ce1",
        "toSide": "right",
        "toEnd": "arrow"
       },
       {
        "id": "8f9cb1564baafd35",
        "fromNode": "c3e888ce42796ce1",
        "fromSide": "left",
        "toNode": "a585257a5b4d06da",
        "toSide": "right",
        "toEnd": "arrow"
       },
       {
        "id": "1351c8cd734c5bd5",
        "fromNode": "a585257a5b4d06da",
        "fromSide": "left",
        "toNode": "3a21cd7317e1445b",
        "toSide": "right",
        "toEnd": "arrow",
        "label": "não"
       },
       {
        "id": "f9e89624094b3d35",
        "fromNode": "3a21cd7317e1445b",
        "fromSide": "left",
        "toNode": "645ec79f22bec5ef",
        "toSide": "right",
        "toEnd": "arrow"
       },
       {
        "id": "381fa04edd730914",
        "fromNode": "a3218734457b9a9b",
        "fromSide": "bottom",
        "toNode": "ba3902395ef335e4",
        "toSide": "bottom",
        "toEnd": "arrow",
        "label": "sim: revisa (máx. 2)",
        "color": "1"
       },
       {
        "id": "8897182a8d7dc7b0",
        "fromNode": "a585257a5b4d06da",
        "fromSide": "top",
        "toNode": "de95b43bceeb4b99",
        "toSide": "bottom",
        "toEnd": "arrow",
        "label": "sim: refaz cenas (máx. 2)",
        "color": "1"
       }
      ]
     }
    },
    {
     "id": "k5",
     "title": "05 - Time técnico",
     "data": {
      "nodes": [
       {
        "id": "26515233cb2ee04f",
        "type": "group",
        "label": "Modo mudança (instável)",
        "x": -30,
        "y": -50,
        "width": 3580,
        "height": 220,
        "color": "2"
       },
       {
        "id": "1a31333e681725a5",
        "type": "group",
        "label": "Modo auditoria (instável)",
        "x": -30,
        "y": 350,
        "width": 1180,
        "height": 220,
        "color": "2"
       },
       {
        "id": "c95e3dd9ec923045",
        "type": "text",
        "text": "# Mudança\n`pedido.md` → `arquiteto` → `plano.md`",
        "x": 0,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "a3218734457b9a9b",
        "type": "text",
        "text": "## Mexe em API, schema, config, dependência ou +5 arquivos?",
        "x": 400,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "d018268506e28685",
        "type": "text",
        "text": "## Parada\nO usuário aprova o plano",
        "x": 800,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "83f1535f99ab0bf4",
        "type": "text",
        "text": "## testador (reprodução)\nteste que falha; só em bug",
        "x": 1200,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "e77989ed21758e78",
        "type": "text",
        "text": "## desenvolvedor\ncódigo na camada de serviço; ruff e testes da área; `mudancas-NN.md`",
        "x": 1600,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "0f826a89cf68c399",
        "type": "text",
        "text": "## testador (cobertura)\nsuíte inteira e cobertura; `testes-NN.md`",
        "x": 2000,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "48cd7517d21176f9",
        "type": "text",
        "text": "## revisor-de-codigo + auditor-de-seguranca\nem paralelo: `revisao-NN.md`, `seguranca-NN.md`",
        "x": 2400,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "a585257a5b4d06da",
        "type": "text",
        "text": "## REVISAR?\nbloqueia, ou 3+ importante (máx. 2 rodadas)",
        "x": 2800,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "7ffc4d510260a854",
        "type": "text",
        "text": "## Relatório\narquivos, saída do CI, vereditos. Sem commit.",
        "x": 3200,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "6"
       },
       {
        "id": "a1213419a0c503fc",
        "type": "text",
        "text": "# Auditoria\n`auditor-de-saude` → `saude.md`\n`auditor-de-seguranca` → `seguranca-01.md`",
        "x": 0,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "ecd2ec43c588ae01",
        "type": "text",
        "text": "## Lista priorizada\nPARADA: o usuário escolhe os itens",
        "x": 400,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "447b7147e84be512",
        "type": "text",
        "text": "## Item aprovado\nvira um modo mudança, com o item como pedido",
        "x": 800,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "5d8d1cb9136777c8",
        "type": "text",
        "text": "## Pesquisa de integração e harness\n`pesquisador-de-integracoes` (não instala) · `mantenedor-do-harness`",
        "x": 1200,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "5"
       }
      ],
      "edges": [
       {
        "id": "ba80ef139c51128f",
        "fromNode": "c95e3dd9ec923045",
        "fromSide": "right",
        "toNode": "a3218734457b9a9b",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "80ff50547d2e4cc9",
        "fromNode": "a3218734457b9a9b",
        "fromSide": "right",
        "toNode": "d018268506e28685",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "sim"
       },
       {
        "id": "9c4fb726f291cb66",
        "fromNode": "d018268506e28685",
        "fromSide": "right",
        "toNode": "83f1535f99ab0bf4",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "aprovado"
       },
       {
        "id": "9cecef9f6ce13c30",
        "fromNode": "a3218734457b9a9b",
        "fromSide": "bottom",
        "toNode": "83f1535f99ab0bf4",
        "toSide": "bottom",
        "toEnd": "arrow",
        "label": "não"
       },
       {
        "id": "fa972c41fcac7c78",
        "fromNode": "83f1535f99ab0bf4",
        "fromSide": "right",
        "toNode": "e77989ed21758e78",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "617c96977635c108",
        "fromNode": "e77989ed21758e78",
        "fromSide": "right",
        "toNode": "0f826a89cf68c399",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "96c25ee5b1638b00",
        "fromNode": "0f826a89cf68c399",
        "fromSide": "right",
        "toNode": "48cd7517d21176f9",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "c91f10962cb2e666",
        "fromNode": "48cd7517d21176f9",
        "fromSide": "right",
        "toNode": "a585257a5b4d06da",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "ba185a678ffc3a28",
        "fromNode": "a585257a5b4d06da",
        "fromSide": "right",
        "toNode": "7ffc4d510260a854",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "não"
       },
       {
        "id": "68be1d98c2acd531",
        "fromNode": "a585257a5b4d06da",
        "fromSide": "bottom",
        "toNode": "e77989ed21758e78",
        "toSide": "bottom",
        "toEnd": "arrow",
        "label": "sim: volta (máx. 2)",
        "color": "1"
       },
       {
        "id": "f69545fd8235a915",
        "fromNode": "a1213419a0c503fc",
        "fromSide": "right",
        "toNode": "ecd2ec43c588ae01",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "b2e1326843f08981",
        "fromNode": "ecd2ec43c588ae01",
        "fromSide": "right",
        "toNode": "447b7147e84be512",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "escolhido"
       }
      ]
     }
    },
    {
     "id": "k6",
     "title": "06 - Omni e Turbo",
     "data": {
      "nodes": [
       {
        "id": "bc3b0556316b0ba2",
        "type": "text",
        "text": "## Turbo (upstream)\nreleases em `harry0703/MoneyPrinterTurbo`",
        "x": 400,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "b2fcb4ba898f4797",
        "type": "text",
        "text": "# Fork\n`9e7d8b7` · fix(task) #1663\n17/10/2026",
        "x": 0,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "67aed930d7a2290a",
        "type": "text",
        "text": "## Rebrand\n`a6c685c` · 67 arquivos\n`app/paths.py` mantém a pasta antiga",
        "x": 400,
        "y": 0,
        "width": 320,
        "height": 140
       },
       {
        "id": "04c75d4c027d99f1",
        "type": "text",
        "text": "## Harness e Remotion\n`.agents/` · `.claude/` · `.grok/` · `animations/` · `flake.nix`",
        "x": 800,
        "y": 0,
        "width": 320,
        "height": 140
       },
       {
        "id": "afae5d802918c841",
        "type": "text",
        "text": "## Upstream v1.3.9\nlogging, movimento de imagem, SDXL, EmpirioLabs",
        "x": 1200,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "65464c31b2e6ac04",
        "type": "text",
        "text": "## Merge v1.3.9\n25 commits do upstream\nem `unstable`",
        "x": 1200,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "2"
       },
       {
        "id": "f2f530eef36aed56",
        "type": "text",
        "text": "## Pendências\n`version_checker` e links de referral do Turbo",
        "x": 0,
        "y": 200,
        "width": 320,
        "height": 140
       },
       {
        "id": "7fad4cee9e5014d0",
        "type": "text",
        "text": "## Seguir o upstream?",
        "x": 1600,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "e9064b74d28acc05",
        "type": "text",
        "text": "## Sim\nUm merge único por release",
        "x": 1600,
        "y": 200,
        "width": 320,
        "height": 140
       },
       {
        "id": "4f876ab4493c98f6",
        "type": "text",
        "text": "## Não\nO Omni para de sincronizar",
        "x": 2000,
        "y": 0,
        "width": 320,
        "height": 140
       }
      ],
      "edges": [
       {
        "id": "a24e627777cdc102",
        "fromNode": "b2fcb4ba898f4797",
        "fromSide": "right",
        "toNode": "67aed930d7a2290a",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "625a9bc688d1e2b9",
        "fromNode": "67aed930d7a2290a",
        "fromSide": "right",
        "toNode": "04c75d4c027d99f1",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "3a55c50980aa1ab8",
        "fromNode": "bc3b0556316b0ba2",
        "fromSide": "left",
        "toNode": "b2fcb4ba898f4797",
        "toSide": "right",
        "toEnd": "arrow",
        "label": "origem"
       },
       {
        "id": "599eb32ce1d0f749",
        "fromNode": "bc3b0556316b0ba2",
        "fromSide": "right",
        "toNode": "afae5d802918c841",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "25 commits"
       },
       {
        "id": "cd610b06767a98e2",
        "fromNode": "afae5d802918c841",
        "fromSide": "top",
        "toNode": "65464c31b2e6ac04",
        "toSide": "bottom",
        "toEnd": "arrow",
        "label": "merge"
       },
       {
        "id": "9857750853cdf3ed",
        "fromNode": "04c75d4c027d99f1",
        "fromSide": "right",
        "toNode": "65464c31b2e6ac04",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "4198554899f50100",
        "fromNode": "65464c31b2e6ac04",
        "fromSide": "right",
        "toNode": "7fad4cee9e5014d0",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "7e442fcc372132ac",
        "fromNode": "7fad4cee9e5014d0",
        "fromSide": "bottom",
        "toNode": "e9064b74d28acc05",
        "toSide": "top",
        "toEnd": "arrow",
        "label": "sim"
       },
       {
        "id": "30efa12275fd76c1",
        "fromNode": "7fad4cee9e5014d0",
        "fromSide": "right",
        "toNode": "4f876ab4493c98f6",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "não"
       }
      ]
     }
    },
    {
     "id": "k7",
     "title": "07 - Branches",
     "data": {
      "nodes": [
       {
        "id": "fad58de7366495db",
        "type": "text",
        "text": "## main\nSó o testado e provado",
        "x": 0,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "a6389c69fe881a8e",
        "type": "text",
        "text": "## unstable\nRecém-adicionado, pouco testado",
        "x": 0,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "2"
       },
       {
        "id": "3df851502f9c020b",
        "type": "text",
        "text": "## Upstream v1.3.9\nentra na unstable",
        "x": 0,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "2"
       },
       {
        "id": "7fad4cee9e5014d0",
        "type": "text",
        "text": "## Corrigido e testado?",
        "x": 400,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "4f876ab4493c98f6",
        "type": "text",
        "text": "## Não\nFica na unstable",
        "x": 400,
        "y": 400,
        "width": 320,
        "height": 140
       },
       {
        "id": "ec92848559fdebdf",
        "type": "text",
        "text": "### Na main\n- captura dos bancos de vídeo\n- roteiro com IA\n- harness Claude Code e outros\n- Remotion, yt-dlp, Grok",
        "x": 800,
        "y": 0,
        "width": 320,
        "height": 140
       },
       {
        "id": "ecc20679929e8f31",
        "type": "text",
        "text": "### Na unstable\n- MCPs Reddit e Apify\n- time técnico\n- perfis com assets\n- animações novas\n- merge v1.3.9\n- assinaturas",
        "x": 800,
        "y": 200,
        "width": 320,
        "height": 140
       },
       {
        "id": "698dc19d489c4e4d",
        "type": "text",
        "text": "## Teste antes da PR\nActions desligadas no fork: ruff e pytest locais",
        "x": 800,
        "y": 400,
        "width": 320,
        "height": 140
       },
       {
        "id": "30316cac0e49fe6c",
        "type": "text",
        "text": "## Regras\nSem force-push\nPromoção só por PR",
        "x": 1200,
        "y": 200,
        "width": 320,
        "height": 140
       }
      ],
      "edges": [
       {
        "id": "93575361e8e46c3e",
        "fromNode": "3df851502f9c020b",
        "fromSide": "top",
        "toNode": "a6389c69fe881a8e",
        "toSide": "bottom",
        "toEnd": "arrow",
        "label": "entra"
       },
       {
        "id": "13436a6523d0536e",
        "fromNode": "a6389c69fe881a8e",
        "fromSide": "right",
        "toNode": "7fad4cee9e5014d0",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "pronto para PR"
       },
       {
        "id": "e6531dcf10427221",
        "fromNode": "7fad4cee9e5014d0",
        "fromSide": "left",
        "toNode": "fad58de7366495db",
        "toSide": "right",
        "toEnd": "arrow",
        "label": "sim: PR para a main"
       },
       {
        "id": "30efa12275fd76c1",
        "fromNode": "7fad4cee9e5014d0",
        "fromSide": "bottom",
        "toNode": "4f876ab4493c98f6",
        "toSide": "top",
        "toEnd": "arrow",
        "label": "não"
       },
       {
        "id": "83078b5d2e1ee788",
        "fromNode": "698dc19d489c4e4d",
        "fromSide": "left",
        "toNode": "7fad4cee9e5014d0",
        "toSide": "right",
        "toEnd": "arrow",
        "label": "checagens locais"
       }
      ]
     }
    }
   ]
  },
  "en": {
   "sections": {
    "walk": "Walkthroughs",
    "concept": "Concepts",
    "canvas": "Canvas",
    "ref": "Reference"
   },
   "folders": {
    "walk": "01-Walkthroughs",
    "concept": "02-Concepts",
    "canvas": "03-Canvas",
    "ref": "04-Reference"
   },
   "index": {
    "title": "00 - Index",
    "body": "# 00 - Index\n\nThe MoneyPrinterOmni 4D study guide: short linked notes and canvases that draw each flow. Start with the [[Overview]] or the [[00 - Overview.canvas|Overview]] canvas. The site at `docs/mapa/site/index.html` shows the same content.\n\n> [!info] Feature status\n> Every note carries the tag `status/stable` (already in `main`) or `status/unstable` (only in the `unstable` branch). See [[Branches main and unstable]].\n\n## Walkthroughs\n\n- [[01 - Video via the API]]: A `POST /api/v1/videos` request from start to finish.\n- [[02 - Video via the CLI]]: The same video through `cli.py`, with `--stop-at` and JSON output.\n- [[03 - Video via the WebUI]]: The WebUI path: queue, config lock and progress.\n- [[04 - Video with the agent team]]: A video through the agent team, from topic to delivery.\n- [[05 - Change with the technical team]]: A change to the program driven by the technical team.\n\n## Concepts\n\n- [[Overview]]: The program on one screen.\n- [[Pipeline and stop_at]]: The stages, what each writes and where `stop_at` cuts.\n- [[Task state and queue]]: States, queue, memory and Redis.\n- [[Entry points]]: API, WebUI and CLI side by side.\n- [[Configuration and locks]]: `config.toml`, locks and resource paths.\n- [[LLM providers]]: The provider registry and how to add one.\n- [[Subscriptions instead of keys]]: Subscription login instead of an API key.\n- [[Voice and subtitles]]: TTS, pauses and the two subtitle paths.\n- [[Video material]]: Stock sites, AI, local files and caches.\n- [[Music and publishing]]: Background music and cross-posting.\n- [[Agent harness]]: `AGENTS.md` + `.agents/` as the single source of truth.\n- [[Claude and Grok adapters]]: The thin files that point to `.agents/`.\n- [[MCP and permissions]]: MCP servers, allow/deny and secrets.\n- [[Video team and file contracts]]: The roles, the stages and the project folder.\n- [[Technical team]]: Who changes and audits the program code.\n- [[Channel profiles]]: One profile per channel: identity, tone, safeguards.\n- [[Remotion animations]]: Animated graphics that go into the timeline.\n- [[Omni and Turbo]]: What came from Turbo and what Omni added.\n- [[Branches main and unstable]]: What lives in each branch and how it is promoted.\n- [[How to contribute]]: Commands, conventions and PR flow.\n- [[Tests and CI]]: The suite, coverage and CI.\n\n## Reference\n\n- [[API routes]]: Every route, handler and authentication.\n- [[CLI flags]]: Every `cli.py` flag.\n- [[Configuration keys]]: The `config.example.toml` keys.\n- [[Providers and adapters]]: LLM, voice, material and music providers.\n- [[Agent JSON contracts]]: `sources`, `timing`, `shotlist`, `music`, `arte`.\n- [[Roles and models]]: The roles, their models and tools.\n\n## Canvas\n\n- [[00 - Overview.canvas|00 - Overview]]: Everything in one drawing.\n- [[01 - Pipeline.canvas|01 - Pipeline]]: The stage flow.\n- [[02 - Entry points.canvas|02 - Entry points]]: Three doors, one pipeline.\n- [[03 - Integrations.canvas|03 - Integrations]]: Each integration tied to the stage that uses it.\n- [[04 - Video team.canvas|04 - Video team]]: The 13 steps and the roles.\n- [[05 - Technical team.canvas|05 - Technical team]]: Change and audit modes.\n- [[06 - Omni and Turbo.canvas|06 - Omni and Turbo]]: Fork timeline.\n- [[07 - Branches.canvas|07 - Branches]]: main, unstable and PRs.\n"
   },
   "notes": [
    {
     "id": "p1",
     "section": "walk",
     "title": "01 - Video via the API",
     "tags": [
      "mapa",
      "percurso"
     ],
     "status": "stable",
     "sources": [
      "main.py",
      "app/controllers/v1/video.py",
      "app/controllers/v1/base.py",
      "app/controllers/base.py",
      "app/controllers/manager/base_manager.py",
      "app/services/task.py",
      "app/services/state.py",
      "app/services/material_upload.py"
     ],
     "body": "# 01 - Video via the API\n\n[[00 - Index|← Index]]\n\nA video made over HTTP: you send a JSON body, get back a `task_id`, and follow the task until the final files exist.\n\n## Core idea\n\nThe API does not render the video inside the request. `POST /api/v1/videos` records the task, queues `tm.start`, and returns the id. The work runs in the background. `GET /api/v1/tasks/{id}` shows progress. The files end up in `storage/tasks/<id>/`.\n\n## How it works\n\n1. **Start the server.** `python main.py` starts uvicorn on `app.asgi:app` (`main.py:12`). With `listen_host = \"0.0.0.0\"` and `listen_port = 8080` (`config.example.toml:11-12`), the API listens on every interface. Docs live at `/docs`.\n2. **Upload material (optional).** For local material, `POST /api/v1/video_materials` (multipart, field `file`) writes the file to `storage/local_videos/<uuid>.<ext>` and returns the name (`app/controllers/v1/video.py:477`).\n3. **Create the task.** `POST /api/v1/videos` calls `create_video` (`app/controllers/v1/video.py:215`), which passes `stop_at=\"video\"` to `create_task` (`video.py:235`). That function:\n   - validates subtitle colours and the font path; an error becomes 400;\n   - writes the record with `sm.state.update_task(task_id)` before queueing;\n   - calls `task_manager.add_task(tm.start, ...)`. If the queue is full, it returns 429 and deletes the record.\n4. **Run.** `add_task` reserves a slot and opens a thread (`app/controllers/manager/base_manager.py:54`). `tm.start` calls `_run_pipeline` (`app/services/task.py:1519`), which goes through the stages in [[Pipeline and stop_at]].\n5. **Poll.** `GET /api/v1/tasks/{id}` (`video.py:310`) returns the state. When `state` is `1` and `progress` is `100`, `videos` holds the paths.\n\n## Example / walkthrough\n\nTested against a local server with `MPT_HOME` pointing at a scratch folder. No API key is needed: local material, a script sent in the body, and the `no-voice` voice.\n\nStep 1, the clip upload:\n\n```sh\ncurl -F \"file=@clip.mp4\" http://127.0.0.1:8080/api/v1/video_materials\n```\n\nReal response:\n\n```json\n{\"status\":200,\"message\":\"success\",\"data\":{\"file\":\"b28b913225e64e538558ac0f05ace66c.mp4\"}}\n```\n\nStep 2, the creation. Body used:\n\n```json\n{\n  \"video_subject\": \"Percurso pela API\",\n  \"video_script\": \"Este é um roteiro de teste para o percurso pela API. Ele tem duas frases curtas.\",\n  \"video_source\": \"local\",\n  \"video_materials\": [{\"provider\": \"local\", \"url\": \"b28b913225e64e538558ac0f05ace66c.mp4\"}],\n  \"voice_name\": \"no-voice\",\n  \"subtitle_enabled\": false\n}\n```\n\nWhen `video_script` is filled in, the LLM is not called (`app/services/task.py:358`, `generate_script`). When `video_source` is `local`, the terms stage is skipped (`task.py:1686`). The response was:\n\n```json\n{\"status\":200,\"message\":\"success\",\"data\":{\"task_id\":\"42a3123c-1a6f-4be7-95fd-85591cf935c8\"}}\n```\n\nStep 3, the poll, about 40 s later. Relevant fields:\n\n- `state`: `1` (done); `progress`: `100`; `failed_stage`: `null`.\n- `videos`: `[\"/tasks/42a3123c-1a6f-4be7-95fd-85591cf935c8/final-1.mp4\"]`.\n- `combined_videos`: `[\"/tasks/42a3123c-.../combined-1.mp4\"]`.\n- `audio_file`: `/tasks/42a3123c-.../audio.mp3`; `audio_duration`: `7`.\n\nFiles written to `storage/tasks/42a3123c-1a6f-4be7-95fd-85591cf935c8/`:\n\n| File | Written by | Note |\n|---|---|---|\n| `script.json` | `save_script_data` (`task.py:424`) | keys `params`, `script`, `search_terms` |\n| `audio.mp3` | `generate_audio` (`task.py:601`) | silence for `no-voice`; duration estimated from the text |\n| `combined-1.mp4` | `generate_final_videos` (`task.py:1026`) | concatenated video |\n| `final-1.mp4` | `generate_final_videos` (`task.py:1082`) | final video |\n\nWhy it works: the API only stores state and queues work. The pipeline writes the files, always inside `storage/tasks/<id>/`. The poll returns ready-to-download paths.\n\nResponse detail: `materials` comes back as an absolute server path, because `_task_response_data` (`video.py:142`) only turns `videos`, `combined_videos`, `audio_file` and `subtitle_path` into URLs. See [[API routes]].\n\n## Pitfalls\n\n- **200 does not mean the video is ready.** The creation answers before any stage runs. A failure shows up later, in `GET /tasks/{id}`, with `failed_stage` and `error`.\n- **Partial validation over HTTP.** `video_source` is not checked by the route. A value outside the list fails at the pipeline preflight (`task.py:1543`), not with 400.\n- **State lives in memory.** Without Redis, restarting the API drops the state. `GET /api/v1/tasks/{id}` then returns 404, but `storage/tasks/<id>/` still has the files and they stay under `/tasks/...`.\n- **Full queue.** With the defaults (`max_concurrent_tasks = 5`, `max_queued_tasks = 100`), with 5 tasks running and 100 waiting, the next one gets 429.\n\n## Practice\n\n1. Which function receives `POST /api/v1/videos`, and which `stop_at` does it pass to the pipeline?\n2. After `state: 1`, which folder holds the videos, and which path does the API return?\n3. Why does the creation answer 200 even when the task will fail later?\n\n> [!faq]- Answer key\n> 1. `create_video` (`app/controllers/v1/video.py:215`) calls `create_task` with `stop_at=\"video\"`.\n> 2. In `storage/tasks/<task_id>/final-N.mp4`. The API returns `/tasks/<task_id>/final-N.mp4`.\n> 3. The task was only queued. The pipeline runs later in another thread, and the result (success or failure) goes to the task state.\n\n## Connections\n\n- [[Overview]]: where this entry point fits in the program.\n- [[Pipeline and stop_at]]: the stages the task goes through.\n- [[Task state and queue]]: where the 429 and the 404 come from.\n- [[Entry points]]: what the API validates, compared with the WebUI and the CLI.\n- [[API routes]]: the full route table.\n- [[CLI flags]]: the same pipeline, from the command line.\n- Canvas: [[01 - Pipeline.canvas|Canvas]].\n"
    },
    {
     "id": "p2",
     "section": "walk",
     "title": "02 - Video via the CLI",
     "tags": [
      "mapa",
      "percurso"
     ],
     "status": "stable",
     "sources": [
      "cli.py",
      "app/services/task.py",
      "app/models/schema.py",
      "app/services/task_artifacts.py"
     ],
     "body": "# 02 - Video via the CLI\n\n[[00 - Index|← Index]]\n\nThe CLI is the most direct entry point: one command, one task, one JSON line on output. There is no queue and no configuration lock. The call is synchronous.\n\n## Core idea\n\n`cli.py` builds the parameters, copies local files into the program's storage, and calls `tm.start(...)` in the same process with `allow_server_file_input=True`. The process ends only when the pipeline ends. The result goes to stdout as one line of JSON.\n\n## How it works\n\n1. **Input.** `parse_args` (`cli.py:250`) defines the flags. The accepted values are fixed in constants: `_PIPELINE_STAGES` (`cli.py:33`) and `_CLI_VIDEO_SOURCES` (`cli.py:40`). A value outside the list is an argument error, exit 2.\n2. **Build.** `build_video_params` (`cli.py:916`) creates the `VideoParams`. Without `--video-subject` or `--video-script`, `parser.error` exits with 2 (`cli.py:724`). `--video-source local` with `--stop-at terms` also exits with 2 (`cli.py:726`).\n3. **Local files.** `prepare_cli_files` (`cli.py:1643`) validates the materials. Files outside `storage/local_videos` are copied there as `cli-material-<hex>.<ext>` (`_prepare_cli_materials`, `cli.py:1597`).\n4. **Run.** `run_cli` (`cli.py:1735`) calls `tm.start(task_id=..., params=..., stop_at=args.stop_at, allow_server_file_input=True)` (`cli.py:1766`). The `task_id` is generated, or comes from `--task-id`.\n5. **Output.** Success: one line `{\"task_id\": ..., \"result\": {...}}` on stdout and exit 0 (`cli.py:1791-1792`). Logs go to stderr (`cli.py:1742`).\n\n## Example / walkthrough\n\nThe commands below were run for this documentation, with `MPT_HOME` in a scratch folder and ffmpeg installed.\n\n**Full video, local material, no voice.**\n\n```sh\nuv run python cli.py \\\n  --video-script \"Este é um roteiro de teste para o percurso pelo CLI. Ele serve para conferir o JSON de saída.\" \\\n  --voice-name no-voice --video-source local \\\n  --video-materials \"./clip.mp4\" --stop-at video\n```\n\nOutput (stdout), paths shortened:\n\n```json\n{\"task_id\": \"a7b55e12-7b16-46cb-9edd-6ca06b2afcad\", \"result\": {\n  \"videos\": [\"storage/tasks/a7b55e12-.../final-1.mp4\"],\n  \"combined_videos\": [\"storage/tasks/a7b55e12-.../combined-1.mp4\"],\n  \"script\": \"Este é um roteiro de teste para o percurso pelo CLI. Ele serve para conferir o JSON de saída.\",\n  \"terms\": \"\",\n  \"audio_file\": \"storage/tasks/a7b55e12-.../audio.mp3\",\n  \"audio_duration\": 8,\n  \"subtitle_path\": \"storage/tasks/a7b55e12-.../subtitle.srt\",\n  \"materials\": [\"storage/local_videos/cli-material-7bc07fd9c63148cf9dea3af5dc6c2313.mp4\"],\n  \"cross_post_state\": null, \"cross_post_results\": null, \"cross_post_error\": null,\n  \"cross_post_owner\": null, \"warnings\": null}}\n```\n\nHere the CLI returns absolute disk paths, not URLs. Exit 0. During the run, the log warned that the clip (4 s) was shorter than the audio (8 s), so it would be looped (`app/services/video.py:1245`).\n\n**Stop after audio (`--stop-at audio`).** The output holds only that stage's result:\n\n```sh\nuv run python cli.py --video-script \"Roteiro curto para o teste de áudio.\" --voice-name no-voice --stop-at audio\n```\n\n```json\n{\"task_id\": \"3a942da8-f38b-4cec-a65f-cc2bf8045a53\", \"result\": {\"audio_file\": \"storage/tasks/3a942da8-.../audio.mp3\", \"audio_duration\": 4}}\n```\n\nExit 0. No video was made, and ffmpeg was not needed for the video step.\n\n**Two error codes.**\n\n```sh\nuv run python cli.py --video-subject \"teste\" --video-source foo   # exit 2\n```\n\nargparse rejects the value before any task starts: `invalid choice: 'foo' (choose from 'pexels', ...)`. No JSON is printed.\n\n```sh\nuv run python cli.py --video-subject \"Teste de falha\" --stop-at script   # exit 1, no LLM key\n```\n\nThe LLM returns `Error: moonshot: api_key is not set...`. The pipeline marks the failure at the `script` stage and the CLI exits 1. Stdout is empty, because there is no video to list.\n\nExit code summary:\n\n| Exit | When | What appears on stdout |\n|---|---|---|\n| 0 | task finished | JSON with `task_id` and `result` |\n| 1 | pipeline failure or unexpected exception | nothing, or the partial JSON if `videos` already exist |\n| 2 | invalid argument, invalid manifest, or missing subject | nothing |\n\n## Pitfalls\n\n- **Paths outside `storage/local_videos` are copied.** The video uses the copy. Check `storage/local_videos` if the disk fills up.\n- **The CLI accepts absolute paths for custom audio.** Only here, because `allow_server_file_input=True` (`cli.py:1773`). The API and the WebUI do not (see [[Entry points]]).\n- **`--stop-at` applies to the whole batch.** In `--batch-file`, each manifest object does not set `--stop-at`; it comes from the command line (`cli.py:1191`).\n- **`stop_at=terms` with local material is an error.** There is no terms stage for `local`, so the CLI rejects the combination with exit 2 (`cli.py:726`).\n\n## Practice\n\n1. Which exit code does the CLI use when argparse refuses a value?\n2. Why does `--stop-at audio` not need an LLM when `--video-script` is given?\n3. With `--video-source local`, what happens to a file that lives outside `storage/local_videos`?\n\n> [!faq]- Answer key\n> 1. Exit 2 (argparse's `parser.error`). No JSON is printed.\n> 2. Because the script came from `--video-script`. `generate_script` only calls the LLM when the script is empty (`app/services/task.py:358`).\n> 3. It is copied to `storage/local_videos/cli-material-<hex>.<ext>` (`cli.py:1597`), and the copy is what goes into the video.\n\n## Connections\n\n- [[Overview]]: the CLI is the third of the three entry points.\n- [[Pipeline and stop_at]]: what each `--stop-at` value stops, and what each stage writes.\n- [[Entry points]]: the comparison between API, WebUI and CLI.\n- [[CLI flags]]: the full flag list, defaults and exit codes.\n- [[01 - Video via the API]]: the same pipeline over HTTP.\n- Canvas: [[01 - Pipeline.canvas|Canvas]].\n"
    },
    {
     "id": "p3",
     "section": "walk",
     "title": "03 - Video via the WebUI",
     "tags": [
      "mapa",
      "percurso"
     ],
     "status": "unstable",
     "sources": [
      "webui/Main.py",
      "app/services/webui_task.py",
      "app/config/config.py",
      "app/services/task.py",
      "app/utils/logging_utils.py"
     ],
     "body": "# 03 - Video via the WebUI\n\n[[00 - Index|← Index]]\n\nThe WebUI is a Streamlit page: you fill in the columns, press generate, and follow the live log. Underneath it uses the same `task.start()` as the API, with its own queue and a configuration lock.\n\n> [!warning] unstable\n> The per-task log panel and the diagnostic controls (Interface > Diagnostics, `webui/Main.py:3207-3223`) come from the upstream Turbo v1.3.9 merge. State to be confirmed. The queue and lock flow described below is what the code shows, but the walkthrough was not tested in a browser.\n\n## Core idea\n\nEach press of the generate button becomes `webui_task.submit_generation(...)`. That function writes the task state as `processing` and hands the task to the WebUI queue. The queue runs one task at a time. Before calling `tm.start`, the worker takes the configuration lock, so no screen can change the provider or a key in the middle of a generation.\n\n## How it works\n\n1. **Open the page.** `./webui.sh` looks for the first free port between 8501 and 8599 on `127.0.0.1` (`webui.sh:16-17`). `mpt webui` does the same through `app/launcher.py:26`.\n2. **Configure.** The settings dialog (`_render_settings_dialog`, `webui/Main.py:3237`) has six tabs: LLM, Material API, Auto-Publish, Interface, Key Backup and Cache Management (`Main.py:3242-3249`). Those choices go into `config.toml` through the configuration layer.\n3. **Build the task.** The page has four columns (`_render_application`, `Main.py:8441`): script (`_render_script_settings`, `Main.py:5029`), video (`5224`), audio (`6966`) and subtitles (`7670`). The generate button lives in `_render_generation_controls` (`Main.py:8009`).\n4. **Submit.** `Main.py:8412` calls `webui_task.submit_generation(task_id=..., params=..., capture_logs=...)` (`app/services/webui_task.py:138`). Before that, the function copies the parameters and writes the `processing` record with `video_subject` (`webui_task.py:154` e `:173`), so the page can find the task even if the script runs again.\n5. **Queue.** `_task_manager` (`webui_task.py:24`) is an `InMemoryTaskManager` with `max_concurrent_tasks=1` and `max_queued_tasks` read from the config. If the queue is full, the exception goes up and the record becomes `failed` with `failed_stage=\"scheduling\"` (`webui_task.py:199`).\n6. **Run.** `_run_generation` (`webui_task.py:58`) attaches the thread's log capture and enters `config.runtime_config_lock()` (`webui_task.py:94`). Only then does it call `tm.start(...)`. Any exception in the wrapper becomes `failed_stage=\"webui_worker\"`.\n7. **Follow.** `_render_running_generation_task` (`Main.py:2151`) is a Streamlit fragment that refreshes every 0.5 s (`webui_task.py:34`) and reads the log with `get_task_logs` (`webui_task.py:52`). The task list and history are another fragment, every 2 s (`Main.py:1442`), which scans `storage/tasks` (`_scan_history_tasks`, `Main.py:991`).\n\n## Example / walkthrough\n\nThe browser was not opened for this documentation. What was run: the same call the page makes, `webui_task.submit_generation(...)`, with the video column's parameters, `video_source=\"local\"`, voice `no-voice` and a script sent in. The function was called directly, outside Streamlit.\n\nObserved result after about 3 s of polling:\n\n- state `1`, progress `100`, `failed_stage` null;\n- `videos`: the absolute path of `final-1.mp4` inside `storage/tasks/<id>/`;\n- 30 log lines captured for the task (`get_task_logs`).\n\nThe files are the same as for the API and the CLI: `script.json`, `audio.mp3`, `combined-1.mp4` and `final-1.mp4`. See [[01 - Video via the API]] for the table.\n\nHow the page shows the result: `Main.py:2060` displays \"Video Generation Failed\" when the state is not `1` or there is no video file.\n\n## Pitfalls\n\n- **One task at a time, always.** The WebUI fixes `max_concurrent_tasks=1` (`webui_task.py:21-25`). The config limit applies only to the API. The two queues do not see each other.\n- **The lock holds, but the page does not block.** Changing an option during a generation does not break the task, because `update_config_nonblocking` (`app/config/config.py:92`) keeps the value and applies it when the lock is released. The running task keeps the previous configuration.\n- **Without Redis, the API cannot see the WebUI.** Each process has its own in-memory state. The WebUI list shows API tasks only because it reads `storage/tasks` from disk.\n- **A full queue looks like a generic error.** The page shows \"Video Generation Failed\" (`Main.py:2060`). The real reason is in the `error` field of the state, with `failed_stage=\"scheduling\"`.\n\n## Practice\n\n1. How many tasks does the WebUI run at the same time, and why does that not depend on `max_concurrent_tasks`?\n2. In which function does the WebUI take the configuration lock, and what does it do with an option change while the lock is held?\n3. If the WebUI queue is full, which `failed_stage` ends up in the task state?\n\n> [!faq]- Answer key\n> 1. One. `_task_manager` is created with `max_concurrent_tasks=1` (`app/services/webui_task.py:24`). The config's `max_concurrent_tasks` is read only by the API.\n> 2. In `_run_generation`, with `config.runtime_config_lock()` (`webui_task.py:94`). The change is stored and applied when the lock is released (`config.py:92`).\n> 3. `scheduling` (`webui_task.py:199`).\n\n## Connections\n\n- [[Overview]]: where the WebUI fits in the program.\n- [[Task state and queue]]: the two queues and the `failed` state.\n- [[Configuration and locks]]: the configuration lock in detail.\n- [[Entry points]]: the comparison with the API and the CLI.\n- [[Pipeline and stop_at]]: what runs inside `tm.start`.\n- Canvas: [[02 - Entry points.canvas|Canvas]].\n"
    },
    {
     "id": "p4",
     "section": "walk",
     "title": "04 - Video with the agent team",
     "tags": [
      "mapa",
      "percurso"
     ],
     "status": "stable",
     "sources": [
      ".agents/skills/video/SKILL.md",
      ".agents/pipeline.md",
      ".agents/setup.md",
      ".agents/playbooks/moneyprinter.md",
      ".agents/roles/montador-mpt.md",
      ".agents/skills/video/scripts/build_timeline.py",
      ".agents/skills/video/scripts/build_music.py",
      ".agents/skills/video/scripts/build_thumbnail.py",
      "cli.py"
     ],
     "body": "# 04 - Video with the agent team\n\n[[00 - Index|← Index]]\n\nOne video, end to end: from the request to `entrega.md`, through the twelve roles. Each step writes a file, and the next role reads it.\n\n> [!info] Illustrative example\n> Nothing was run in this checkout: `storage/projects/` does not exist. Names in `<...>` are placeholders you replace. The commands and file names are the real ones from the repository.\n\n## Core idea\n\nThe walkthrough is a queue of roles with files between them. The expensive part, the render, starts only after the script passes review and the user approves the package. Until then, the program only generates a test voice track.\n\n## How it works\n\n**Request.** You write: \"follow `.agents/skills/video/SKILL.md` for a video about <topic>, 60 s, 9:16, pt-BR\". The skill takes duration, format and language (`SKILL.md:8-9`).\n\n**Step 0 · Profile and brief.** The assistant reads `setup.md` and picks the profile. With `tecnologia` as the profile, it creates `storage/projects/<slug>/brief.md`:\n\n```\nperfil: tecnologia\ntema: <topic>\nangulo: <the thesis in one sentence>\n```\n\nOnly what differs from the profile goes in the brief (`SKILL.md:32-33`).\n\n**Step 1 · `pesquisador`.** It writes `research.md` (facts with sources), `sources.json` (videos per scene), `script.txt` (only the narrated text) and `music-plan.md` (the mood of each block). A fact without a source does not go in; a recent topic needs two sources (`setup.md:51-52`).\n\n**Step 2 · in parallel.** `critico` writes `critique/content-01.md`, `sugestor-de-pauta` writes `critique/ideas-01.md`, and `auditor` writes `audit/fatos-01.md` with `OK` or `CORRIGIR`. If there is `REVISAR`, `CORRIGIR` or a high-value suggestion, the researcher revises. At most two rounds (`SKILL.md:44-45`).\n\n**Step 4 · `diretor-de-arte`.** It writes `arte.json`. An example, following the contract (`pipeline.md:103-108`):\n\n```json\n{\"legenda\": {\"font_name\": \"BeVietnamPro-Bold.ttf\", \"text_fore_color\": \"#FFFFFF\", \"stroke_color\": \"#000000\"},\n \"texto_na_tela\": {\"font\": \"BeVietnamPro-Bold.ttf\", \"color\": \"#FFD400\", \"size\": 96, \"box\": true},\n \"thumbnail\": {\"font\": \"BeVietnamPro-Bold.ttf\", \"color\": \"#FFFFFF\", \"accent\": \"#FFD400\"}}\n```\n\n**Step 5 · stop.** `diretor` writes `aprovacao-01.md` with the script, duration, music mood, visual plan and open items. The assistant shows it and waits. Without the user's approval, nothing is downloaded (`SKILL.md:47-49`).\n\n**Step 6 · `montador-mpt`, timing mode.** Everything runs inside the dev shell (`moneyprinter.md:6`). First, the audio test:\n\n```sh\nnix develop --command bash -c '.venv/bin/python cli.py --video-script \"$(cat storage/projects/<slug>/script.txt)\" --video-language pt-BR --voice-rate 1.0 --stop-at audio'\n```\n\nThe last line is a JSON with `audio_duration`. The target is ±3 s of the goal. Change the text first; change the speed only between 0.95 and 1.10 (`montador-mpt.md:24-26`). Then the subtitles and timings:\n\n```sh\nnix develop --command bash -c '.venv/bin/python cli.py ... --stop-at subtitle'\npython3 .agents/skills/video/scripts/srt_to_timing.py storage/tasks/<task_id>/subtitle.srt storage/projects/<slug>/timing.json\n```\n\nThe music comes next: `music.json` with the cues, then `build_music.py <proj> --preview`. The script writes `bgm.mp3`, copies it to `storage/bgm/<slug>.mp3` and prints `--bgm-type custom --bgm-file <slug>.mp3` (`build_music.py:116-120`).\n\n**Step 7 · `cacador-de-clipes`.** It watches the sources in low resolution, picks the segment for each phrase and writes `shotlist.json`. Scenes with `anim` go to the `animador` (step 7b, see [[Remotion animations]]).\n\n**Step 8 · `editor-de-clipes`.** It builds the timeline and checks the preview:\n\n```sh\npython3 .agents/skills/video/scripts/build_timeline.py storage/projects/<slug> --aspect 9:16 --preview\n```\n\nThe script prints each clip's duration and the total (`build_timeline.py:225-228`) and writes `raw/timeline_preview.png`. The editor looks at the image before going on. Then it writes `credits.md`.\n\n**Step 9 · `montador-mpt`, render mode.** The call joins the clips, the music and the subtitles:\n\n```sh\nnix develop --command bash -c '.venv/bin/python cli.py --video-script \"$(cat storage/projects/<slug>/script.txt)\" --video-language pt-BR --voice-name <voice> --voice-rate <same as the test> --video-aspect 9:16 --video-source local --video-materials \"$(ls storage/projects/<slug>/timeline/*.mp4 | paste -sd,)\" --video-concat-mode sequential --video-transition-mode none --video-clip-duration <longest clip> --bgm-type custom --bgm-file <slug>.mp3 --bgm-volume 0.2'\n```\n\nThe subtitle settings come from `arte.json`, translated into `--font-name`, `--text-fore-color`, `--stroke-color` and the other flags (`montador-mpt.md:21`). The result is copied to `output/final.mp4` and checked with `ffprobe`. `--video-clip-duration` is the cut for each clip (`app/services/video.py:1154-1155`).\n\n**Step 10 · in parallel.** `critico` writes `critique/visual-01.md` and `auditor` writes `audit/direitos-01.md`. If either rejects, only the flagged scenes come back: `build_timeline.py --only 07,12`, then the render runs again.\n\n**Step 11 · in parallel.** `designer-de-thumbnail` builds the cover:\n\n```sh\npython3 .agents/skills/video/scripts/build_thumbnail.py storage/projects/<slug> --from timeline/07.mp4 --at 1.5 --text \"<LINE 1>|<LINE 2>\"\n```\n\n`redator-de-publicacao` writes `publicacao/publicacao.md`: titles, description, credits and tags.\n\n**Step 12 · `diretor` (delivery).** It runs the checklist and writes `entrega.md` with `PRONTO` or `REFAZER <etapa>`. It notes the video in the profile's History.\n\n**Step 13 · report.** The video path, covers, titles ready to paste, and open items. Nothing is published.\n\n## Why it works\n\n- **Files are the interface.** Each role needs only the contract. The reviewer does not need to know who wrote the script.\n- **The expensive part comes after the stops.** Script and approval come before download and render.\n- **Clips are cut already.** Each clip has the scene's length, so `sequential` mode does not have to guess where to cut.\n- **Same text, same speed.** The audio test and the render use the same text and the same `--voice-rate`. Otherwise the sync breaks (`montador-mpt.md:41`).\n\n## Pitfalls\n\n- **Python outside the dev shell.** The `.venv` uses Nix's Python and needs the flake's `libstdc++`. Running `python3 cli.py` outside `nix develop` fails. The skill's scripts are the exception: they run with plain `python3`.\n- **Test tasks.** Delete discarded test tasks from `storage/tasks/`. The rule is at `SKILL.md:126`.\n- **Third-party downloads.** In the cloud, `yt-dlp` fails on YouTube without login. See [[MCP and permissions]].\n- **Speed out of range.** If the audio does not land within ±10%, the problem is the text. Cut the script.\n\n## Practice\n\n1. Why does `--stop-at audio` come before `--stop-at subtitle`?\n2. You have no footage for one scene. What does the editor do, and what does the assistant ask the user?\n3. `critico` says `REVISAR` in step 10. How many rework rounds are allowed?\n\n> [!faq]- Answer key\n> 1. Because the audio gives the duration, which sets the text and the speed. Only then do the subtitles and timings make sense (`montador-mpt.md:24-27`).\n> 2. The editor does not invent a clip. The assistant asks whether the user will record or send something, or accept stock (`SKILL.md:56`).\n> 3. Two rounds at most (`SKILL.md:64-66`).\n\n## Connections\n\n- Previous: [[Video team and file contracts]]. Next: [[05 - Change with the technical team]].\n- Concepts: [[Pipeline and stop_at]], [[Voice and subtitles]], [[Video material]], [[Music and publishing]], [[Channel profiles]].\n- Reference: [[Agent JSON contracts]], [[Roles and models]], [[CLI flags]].\n- Canvas: [[04 - Video team.canvas|Video team canvas]].\n"
    },
    {
     "id": "p5",
     "section": "walk",
     "title": "05 - Change with the technical team",
     "tags": [
      "mapa",
      "percurso"
     ],
     "status": "unstable",
     "sources": [
      ".agents/skills/manutencao/SKILL.md",
      ".agents/tecnico.md",
      ".agents/roles/arquiteto.md",
      ".agents/roles/testador.md",
      ".agents/roles/desenvolvedor.md",
      ".agents/roles/revisor-de-codigo.md",
      ".agents/roles/auditor-de-seguranca.md",
      "app/models/llm_provider.py",
      "config.example.toml",
      "AGENTS.md"
     ],
     "body": "# 05 - Change with the technical team\n\n[[00 - Index|← Index]]\n\nAn example of a change to the program: adding an LLM provider. The walkthrough shows how the plan, the stop, the tests and the review fit together.\n\n> [!warning] unstable\n> This walkthrough depends on the technical team, which is `status/unstable`. It is an **illustrative example**: provider \"X\" is made up and nothing was run. The files and keys cited are real.\n\n## Core idea\n\nA change to the program goes through whoever plans, whoever writes, whoever tests and whoever reviews. A change that touches config or the API stops before the code, and the user decides. Whoever reviews does not edit; they only point out problems.\n\n## How it works\n\n**Request.** The user says: \"add LLM provider X\". The orchestrator creates `storage/manutencao/<slug>/pedido.md` with what is expected (a provider that responds and appears in the list), what is out of scope (no change to the default) and the done criterion (tests green and CI passing).\n\n**Plan (`arquiteto`).** It reads the code and writes `plano.md`. For a provider, the registration goes in `app/models/llm_provider.py`, where `LLM_PROVIDER_REGISTRY` starts at line 195 and each entry is an `LLMProviderSpec`. The use goes in `app/services/llm.py`. The config key goes in `app/config/config.py` and in `config.example.toml` (`tecnico.md:43-44`). The plan says which entry points are affected: the API, the WebUI and the CLI all receive work through `task.start()` and need no new code.\n\n**Stop.** A config change is on the list that needs approval (`SKILL.md:30-33`). The orchestrator shows the plan to the user. Without approval, the developer does not start. If the provider needed a new library, the justification would go in the plan and the dependency would enter only with `uv add` (`tecnico.md:45-46`).\n\n**Reproduction test (`testador`).** Skipped: there is no bug. Reproduction mode is only for bugs (`SKILL.md:34`).\n\n**Implementation (`desenvolvedor`).** It adds the entry to the registry, uses the config key and runs the area checks:\n\n```sh\nuv run ruff check app cli.py main.py webui test docs/skill\nuv run python -X utf8 -m pytest -q test/services\n```\n\nThe result goes into `mudancas-01.md`, with the command and its output.\n\n**Coverage (`testador`).** It writes tests for the new functions and runs the full suite with the CI coverage check:\n\n```sh\nuv run python -X utf8 -m coverage run -m pytest -q test && uv run python -m coverage report  # fail_under = 70\n```\n\nThe result goes into `testes-01.md`. The tester edits only files in `test/`.\n\n**Review and security (in parallel).** `revisor-de-codigo` checks the contracts, the registry pattern and whether there are tests. `auditor-de-seguranca` checks the secret (which comes from `${VAR}` or from `config.toml`, never from code) and the provider's base address, which can become SSRF. Each writes its file: `revisao-01.md` and `seguranca-01.md`. Verdict `APROVADO` or `REVISAR`.\n\n**Fix round.** If either says `REVISAR`, the developer fixes only the flagged items, and the coverage and review steps run again. At most two rounds. After that, the problem goes to the user.\n\n**Final report.** It lists the changed files, the check outputs, the verdicts and open items. Nothing is committed without the user's approval (`tecnico.md:60-61`).\n\n## Example / walkthrough\n\n| Step | Who | File written | Result |\n|---|---|---|---|\n| 0 | orchestrator | `pedido.md` | done criterion |\n| 1 | `arquiteto` | `plano.md` | plan with the registry entry and the config key |\n| 2 | user | — | approves the plan (config changed) |\n| 3 | `testador` | — | skipped: not a bug |\n| 4 | `desenvolvedor` | `mudancas-01.md` | area ruff and pytest green |\n| 5 | `testador` | `testes-01.md` | suite and coverage green |\n| 6 | `revisor` and `auditor` | `revisao-01.md`, `seguranca-01.md` | `APROVADO` |\n| 7 | orchestrator | — | report to the user |\n\n## Why it works\n\n- **The plan comes before the code.** A config or API change is costly to undo. Stopping here leaves the decision with the user, before there is any diff.\n- **Whoever writes does not approve their own code.** The tester writes the test; the reviewer reads the diff without having written it.\n- **CI is the yardstick.** The same checks (`tecnico.md:51-57`) run before any verdict. Green or red, with no interpretation.\n\n## Pitfalls\n\n- **Config and the runtime lock.** Writing config while a video task runs is blocked. The developer does not touch the user's `config.toml` (`tecnico.md:43-44`).\n- **A test that fails on purpose does not pass.** Skipping, disabling or marking a test as expected-to-fail to get green is forbidden (`tecnico.md:49-50`).\n- **Comment language.** The code has comments in Chinese. Follow the language of the file (`tecnico.md:38-39`).\n- **CI is the yardstick.** A red check means not ready, whatever the verdict (`SKILL.md:68`).\n\n## Practice\n\n1. Why does the plan stop before the code when the change touches config?\n2. A bug is fixed. Which role writes the test that fails before the fix?\n3. The security auditor says `REVISAR`. What happens in the next round?\n\n> [!faq]- Answer key\n> 1. Because the rule says to stop for config, API, schema, dependency or more than five files (`SKILL.md:30-33`).\n> 2. The `testador`, in reproduction mode (`SKILL.md:34`).\n> 3. The developer fixes only the flagged items, and the coverage and review steps run again (`SKILL.md:37-40`). Two rounds at most.\n\n## Connections\n\n- Previous: [[Technical team]]. For comparison, the video walkthrough: [[04 - Video with the agent team]].\n- Concepts: [[LLM providers]], [[Configuration and locks]], [[Tests and CI]], [[How to contribute]].\n- Reference: [[Roles and models]].\n- Canvas: [[05 - Technical team.canvas|Technical team canvas]].\n"
    },
    {
     "id": "c01",
     "section": "concept",
     "title": "Overview",
     "tags": [
      "mapa",
      "conceito"
     ],
     "status": "stable",
     "sources": [
      "main.py",
      "cli.py",
      "app/asgi.py",
      "app/services/task.py",
      "app/services/webui_task.py",
      "webui/Main.py",
      "app/services/state.py",
      "AGENTS.md"
     ],
     "body": "# Overview\n\n[[00 - Index|← Index]]\n\nMoneyPrinterOmni takes a request through one of three entry points, calls `task.start()`, and writes the results to `storage/tasks/<id>/`.\n\n## Core idea\n\nThere are three entry points: the HTTP API, the WebUI (Streamlit) and the CLI. All three use the same function, `task.start()` (`app/services/task.py:1907`), which runs the pipeline (`_run_pipeline`, `task.py:1519`). Each entry point prepares the request in its own way before that: it validates, queues, locks or not. The pipeline is one. A fix in the service layer therefore reaches all three.\n\n## How it works\n\n1. **Entry point.** Each one has its own path to `start()`:\n   - **API:** `main.py:12` starts uvicorn on `app.asgi:app`. The route `create_task` (`app/controllers/v1/video.py:235`) records the state and calls `task_manager.add_task(tm.start, ...)`.\n   - **WebUI:** `webui/Main.py` calls `webui_task.submit_generation` (`app/services/webui_task.py:138`). Its own queue runs `_run_generation`, which takes the configuration lock before `tm.start`.\n   - **CLI:** `cli.py:1735` (`run_cli`) builds the parameters and calls `tm.start` directly (`cli.py:1766`), with no queue.\n2. **Pipeline.** `_run_pipeline` runs the steps in order: script, terms, audio, subtitle, materials, video and, last, publishing. Details in [[Pipeline and stop_at]].\n3. **State.** Each step writes progress and state to `app/services/state.py`, in memory or in Redis (see [[Task state and queue]]).\n4. **Files.** Everything generated is in `storage/tasks/<id>/`. The API returns those paths as `/tasks/...` URLs; the CLI returns absolute paths.\n\n## Example / walkthrough\n\nA `POST /api/v1/videos` request with a script and local material. The path is:\n\n`POST /api/v1/videos` → `create_video` (`video.py:215`) → `create_task` (`video.py:235`) → `add_task` (`base_manager.py:54`) → `tm.start` (`task.py:1907`) → `_run_pipeline` (`task.py:1519`) → `storage/tasks/<id>/final-1.mp4`.\n\nThe full walkthrough, with a real response, is in [[01 - Video via the API]].\n\nWhere things live in the repository:\n\n| Path | What is there |\n|---|---|\n| `main.py`, `cli.py`, `webui/` | the three entry points (API, CLI and WebUI) |\n| `app/asgi.py`, `app/router.py` | FastAPI application, middleware and route mounting |\n| `app/controllers/` | HTTP routes (`v1/video.py`, `v1/llm.py`) and queue managers (`manager/`) |\n| `app/services/` | the pipeline (`task.py`), state (`state.py`), video, voice, subtitles, materials and providers |\n| `app/models/` | request schemas (`schema.py`), constants (`const.py`) and LLM providers |\n| `app/config/config.py` | reading and writing `config.toml`, and the configuration lock |\n| `app/paths.py` | where configuration, resources and runtime data live |\n| `config.example.toml` | configuration template, with every key |\n| `resource/` | fonts, songs and public files (copied to the runtime folder when installed as a package) |\n| `storage/` | runtime output (ignored by git) |\n| `docs/mapa/` | this vault |\n| `.agents/`, `.claude/` | the agent harness (video production and program maintenance) |\n\n## Pitfalls\n\n- **`video_project.py` is not part of the pipeline.** No program module imports it; only the test `test/services/test_video_project.py:13` does. `AGENTS.md` lists it as a compositing stage, which does not match the code.\n- **The configuration lock exists only in the WebUI.** The API and the CLI call `start()` without taking `runtime_config_lock`. Inside one process, a configuration change can affect an API task that is running.\n- **Processes do not share state.** With `docker-compose`, `webui` and `api` each keep their own in-memory state. Without Redis, the WebUI does not see the API's tasks, except through its scan of `storage/tasks`.\n\n## Practice\n\n1. Which function is the common entry point for the three entry points, and in which file is it?\n2. In which folder of the repository is the code that decides which HTTP routes exist?\n3. If you run the API and the WebUI as separate processes without Redis, does the WebUI show the API's tasks? Why?\n\n> [!faq]- Answer key\n> 1. `start()` in `app/services/task.py:1907`. It calls `_run_pipeline` (`task.py:1519`).\n> 2. In `app/controllers/v1/`: `video.py` (videos, tasks and materials) and `llm.py` (script, terms and metadata).\n> 3. No. Each process has its own `MemoryState`. The WebUI lists API tasks only if they are in `storage/tasks` on disk and that folder is shared.\n\n## Connections\n\n- [[Pipeline and stop_at]]: the steps inside `start()`.\n- [[Task state and queue]]: state, queues and the 429 and 409 codes.\n- [[Entry points]]: the side-by-side comparison.\n- [[Configuration and locks]]: `config.toml`, the lock and the paths.\n- [[API routes]] and [[CLI flags]]: the reference for each entry point.\n- Canvas: [[01 - Pipeline.canvas|Canvas]] and [[02 - Entry points.canvas|Canvas of entry points]].\n"
    },
    {
     "id": "c02",
     "section": "concept",
     "title": "Pipeline and stop_at",
     "tags": [
      "mapa",
      "conceito"
     ],
     "status": "unstable",
     "sources": [
      "app/services/task.py",
      "app/services/llm.py",
      "app/services/voice.py",
      "app/services/subtitle.py",
      "app/services/material.py",
      "app/services/video.py",
      "app/services/upload_post.py",
      "app/services/task_artifacts.py",
      "cli.py"
     ],
     "body": "# Pipeline and stop_at\n\n[[00 - Index|← Index]]\n\nThe pipeline is a fixed sequence of steps. `stop_at` says which step to stop after, and the task returns that step's result.\n\n> [!warning] unstable\n> Image motion (`image_motion`, options `static` and `zoom`) came from the upstream Turbo v1.3.9 merge. It appears in the materials and video steps (`app/services/video.py:1955`, `app/services/material.py:1740`). State to be confirmed. The rest of the pipeline is on `main`.\n\n## Core idea\n\n`_run_pipeline` (`app/services/task.py:1519`) runs the steps in a fixed order: script, terms, audio, subtitles, materials, video and publishing. Each step writes a file or a state field. The real order is **script → terms → audio → subtitles → materials → video → publishing**. Audio comes before subtitles because the Edge subtitle provider uses the timeline that TTS produces.\n\n## How it works\n\n**Preflight (before any paid call).** Runs between `task.py:1532` and `task.py:1650`:\n\n- the state moves to `processing` at 5% (`task.py:1532`);\n- with `stop_at=\"video\"` and subtitles on, the colours are validated (`task.py:1537`);\n- with `stop_at` set to `materials` or `video`, the video source must be in `_SUPPORTED_VIDEO_SOURCES` (`task.py:97`, checked at `task.py:1543`);\n- provider keys for Seedance, OFox, Metaso, MuAPI and openai_image (only for `materials` and `video`);\n- background music (`sonilo` or `elevenlabs`, `_VIDEO_MUSIC_PROVIDERS` at `task.py:79`): key, prompt length and, when available, `validate_generation_access()`. Only for `video`;\n- ffmpeg: `utils.check_ffmpeg_ready()` (`task.py:1650`), except for `script` and `terms`.\n\nA failure in any preflight check calls `_mark_task_failed(..., \"preflight\", ...)`.\n\n**Steps.**\n\n| # | `stop_at` | Function (file:line) | Calls | Writes | Progress |\n|---|---|---|---|---|---|\n| 1 | `script` | `generate_script` (`task.py:358`) | `llm.generate_script` (`app/services/llm.py:894`). Skipped if `video_script` was given | nothing on disk | 10 |\n| 2 | `terms` | `generate_terms` (`task.py:379`) | `llm.generate_terms` (`llm.py:1023`), `amount=8` with `match_materials_to_script`, otherwise 5. Skipped for `local`. Then `twelvelabs.rerank_terms_by_subject` (`app/services/twelvelabs.py:113`), if configured | `script.json` via `save_script_data` (`task.py:424`) | 20 |\n| 3 | `audio` | `generate_audio` (`task.py:551`) | `voice.tts` (`app/services/voice.py:1138`) → `_single_tts` (`voice.py:640`). With `no-voice`, `generate_silent_audio` (`voice.py:593`) | `audio.mp3` (`task.py:601`) | 30 |\n| 4 | `subtitle` | `generate_subtitle` (`task.py:649`) | `edge` provider → `voice.create_subtitle` (`voice.py:3679`); `whisper` → `subtitle.create` (`app/services/subtitle.py:61`) and `correct` (`subtitle.py:230`) | `subtitle.srt` (`task.py:661`) | 40 |\n| 5 | `materials` | `get_video_materials` (`task.py:723`) | `local` → `preprocess_video` (`app/services/video.py:1955`); the rest → `material.download_videos` (`app/services/material.py:2161`) | material cache and `material_sources` in `script.json` | 40 → 50 |\n| 6 | `video` | `generate_final_videos` (`task.py:980`) | `video.combine_videos` (`video.py:973`), optional BGM (`app/services/sonilo.py:392` or `elevenlabs_music.py:388`), `video.generate_video` (`video.py:1569`) | `combined-N.mp4`, `final-N.mp4` (`task.py:1026`, `task.py:1082`) | 50 → 100 |\n| 7 | (end) | `_schedule_cross_post` (`task.py:1463`) → `_run_cross_post` (`task.py:1259`) | `llm.generate_social_metadata` (`llm.py:1343`), `upload_post.cross_post_video` (`app/services/upload_post.py:396`). Pool of 2 threads | `cross_post_*` fields in the state | not applicable |\n\nPublishing runs after the state is already `complete` (`task.py:1883` schedules it).\n\n**What each `stop_at` returns.** `start()` returns that step's dictionary:\n\n- `script` → `{\"script\"}` (`task.py:1682`);\n- `terms` → `{\"script\", \"terms\"}` (`task.py:1701`);\n- `audio` → `{\"audio_file\", \"audio_duration\"}` (`task.py:1757`);\n- `subtitle` → `{\"subtitle_path\"}` (`task.py:1777`);\n- `materials` → `{\"materials\"}` (`task.py:1803`);\n- `video` → the full dictionary: `videos`, `combined_videos`, `audio_file`, `subtitle_path`, `materials`, `cross_post_state` and so on.\n\nIn the API, `stop_at` is fixed per route: `/videos` uses `video`, `/subtitle` uses `subtitle`, `/audio` uses `audio` (`app/controllers/v1/video.py:215-229`). The other values exist only in the CLI. See [[CLI flags]].\n\n**Errors.** `_mark_task_failed` (`task.py:260`) writes `failed_stage` (`preflight`, `script`, `terms`, `audio`, `subtitle`, `materials`, `video`, `pipeline`) and the error text. LLM errors come back as a string that starts with `Error: `. The pipeline recognises that marker only when the script was generated by the LLM (`task.py:1663`).\n\n**Progress.** Each step writes its own percentage. Materials and video use a reporter that interpolates between the two values (`task.py:328`).\n\n## Example / walkthrough\n\nA `POST /api/v1/subtitle` runs audio and subtitles and stops. It makes no material and no video. A `POST /api/v1/audio` runs only up to step 3. From the CLI, `--stop-at audio` returns `{\"audio_file\", \"audio_duration\"}`, as shown in [[02 - Video via the CLI]].\n\nFor a full task with local material, the files in `storage/tasks/<id>/` are `script.json`, `audio.mp3`, `subtitle.srt` (if subtitles are on), `combined-N.mp4` and `final-N.mp4`. See [[01 - Video via the API]].\n\n> [!warning] unstable\n> With `image_motion` (default `zoom`), material images get movement. The option comes from `VideoParams.image_motion` (`app/models/schema.py:116`) and from `--image-motion` in the CLI (`cli.py:444`). See [[CLI flags]].\n\n## Pitfalls\n\n- **A passing preflight does not guarantee success.** It checks keys and format only. A valid key with an exhausted quota fails in the next step, with the matching `failed_stage`.\n- **Subtitles do not fall back to Whisper.** If the `edge` provider does not produce the file, the task continues without subtitles. The code says so explicitly (`app/services/task.py:649-722`). For subtitles without TTS timing, the provider must be `whisper`, and that is a global setting, not per task.\n- **A user script that starts with `Error: `** is not treated as an error, because the marker only applies to LLM-generated scripts (`task.py:1663`).\n- **A paid-provider failure keeps the remote id.** Fields such as `volcengine_seedance_task_id` or `muapi_task_id` stay in the state so the result can be recovered later.\n\n## Practice\n\n1. Write the order of the pipeline steps without looking at the table.\n2. With `match_materials_to_script` on, how many search terms does the LLM generate, and where is that decided?\n3. What does the API return when you call `POST /api/v1/subtitle` and the Edge subtitle provider fails?\n\n> [!faq]- Answer key\n> 1. Script, terms, audio, subtitles, materials, video and publishing. Subtitles come after audio because they use the TTS timeline.\n> 2. Eight. The decision is in `generate_terms` (`app/services/task.py:379`): `amount=8 if params.match_materials_to_script else 5`.\n> 3. Success without subtitles. `subtitle_path` comes back empty and the task continues. There is no fallback to Whisper.\n\n## Connections\n\n- [[Overview]]: the three entry points that call this pipeline.\n- [[Task state and queue]]: how the state and the queue follow these steps.\n- [[Configuration and locks]]: the keys that choose providers.\n- [[API routes]] and [[CLI flags]]: the `stop_at` values in each entry point.\n- Canvas: [[01 - Pipeline.canvas|Canvas]].\n"
    },
    {
     "id": "c03",
     "section": "concept",
     "title": "Task state and queue",
     "tags": [
      "mapa",
      "conceito"
     ],
     "status": "stable",
     "sources": [
      "app/services/state.py",
      "app/controllers/manager/base_manager.py",
      "app/controllers/manager/memory_manager.py",
      "app/controllers/manager/redis_manager.py",
      "app/controllers/v1/video.py",
      "app/services/task.py",
      "app/services/webui_task.py",
      "app/models/const.py",
      "app/asgi.py"
     ],
     "body": "# Task state and queue\n\n[[00 - Index|← Index]]\n\nEach task has a state record, in memory or in Redis. A queue manager decides whether the task runs now, waits, or is refused.\n\n## Core idea\n\nThere are two separate parts. The **state** (`app/services/state.py`) keeps what each task is doing. The **queue** (`app/controllers/manager/`) controls how many tasks run at once. The API and the WebUI each have their own queue. The CLI has no queue.\n\n## How it works\n\n1. **State.** A task has a `state` (`app/models/const.py:25-27`):\n   - `-1` = failed;\n   - `4` = processing;\n   - `1` = complete.\n\n   Extra fields, such as `progress`, `failed_stage`, `error`, `videos` and `cross_post_state`, live in the same record. `cross_post_state` takes `pending`, `processing`, `complete` or `failed`.\n2. **Two backends.** `MemoryState` (`state.py:69`) keeps a dictionary in memory with a lock. `RedisState` (`state.py:134`) keeps one hash per task. Which one is used is chosen at `state.py:317`, from the config's `enable_redis`. Redis uses HSET and Lua scripts that check the owner (`state.py:221`, `state.py:264`).\n3. **Queue.** `TaskManager.add_task` (`app/controllers/manager/base_manager.py:54`) decides, under a lock:\n   - if fewer tasks are running than `max_concurrent_tasks`, it reserves a slot and opens a thread (`execute_task`, `base_manager.py:86`);\n   - otherwise, if the queue holds fewer than `max_queued_tasks` items, it enqueues;\n   - otherwise it raises `TaskQueueFullError` (`base_manager.py:8`, `:78`).\n4. **Implementations.** `InMemoryTaskManager` (`memory_manager.py:7`) keeps the queue in memory. `RedisTaskManager` (`redis_manager.py:29`) keeps it in Redis and, when the API starts, resumes the queued tasks (`redis_manager.py:42`, called from `application_lifespan` in `app/asgi.py:24`).\n5. **Limits.** `max_concurrent_tasks = 5` and `max_queued_tasks = 100` by default (`config.example.toml:573-574`). The WebUI has its own queue, with a fixed `max_concurrent_tasks=1` (`app/services/webui_task.py:24`).\n6. **HTTP mapping.** The API maps the exceptions like this:\n   - `TaskQueueFullError` becomes **429** and the record just created is deleted (`app/controllers/v1/video.py:268` and `:272-277`);\n   - deleting a busy task becomes **409** (`video.py:345`). \"Busy\" is what `is_task_busy` says (`app/services/task.py:117`): state `4` or an active `cross_post_state`;\n   - a missing task becomes **404** (`video.py:310`, `:333`).\n\n## Example / walkthrough\n\nWith the API defaults, five tasks run and the following ones queue:\n\n- tasks 1 to 5: start straight away, `state=4`;\n- tasks 6 to 105: wait in the queue, `state=4` in the record, waiting for a slot;\n- task 106: `add_task` raises `TaskQueueFullError`. The API answers `429`, the record is deleted, and the message is `task queue is full, please try again later`.\n\nA `DELETE /api/v1/tasks/{id}` on a running task answers `409 task is still running`. After it finishes, the same `DELETE` removes `storage/tasks/<id>/` and the record.\n\nChecked for this documentation: after restarting the API with in-memory state, `GET /api/v1/tasks/{id}` returned 404, but the file `final-1.mp4` stayed reachable under `/tasks/...`. The state is lost; the files stay.\n\n## Pitfalls\n\n- **Limits are per process.** Two processes mean two queues. With `webui` and `api` separate, the total limit is the sum of both, and neither sees the other's queue.\n- **Without Redis, a restart drops the state.** The files remain on disk. Asking for the id returns 404.\n- **Redis is trusted.** Values from Redis come back through `ast.literal_eval` (`state.py:300`). Redis must stay private, with no write access for third parties.\n- **Network publishing does not survive a restart.** Publishing runs in a pool of two threads, outside the queue. On startup, the API marks interrupted publications as failed (`recover_interrupted_cross_posts`, `app/services/task.py:1217`).\n\n## Practice\n\n1. What are the three values of `state`, and what does each mean?\n2. With `max_concurrent_tasks=5` and `max_queued_tasks=100`, which task gets the 429?\n3. Why does a `DELETE` on a task with an active `cross_post_state` answer 409, even though the video generation has finished?\n\n> [!faq]- Answer key\n> 1. `-1` failed, `4` processing, `1` complete (`app/models/const.py:25-27`).\n> 2. The 106th simultaneous task. Five run and one hundred wait in the queue (`base_manager.py:54-78`).\n> 3. Because `is_task_busy` also counts network publishing, which still reads the task folder (`app/services/task.py:117`).\n\n## Connections\n\n- [[Pipeline and stop_at]]: what the task does while it is in `state=4`.\n- [[Entry points]]: who uses the queue and who does not.\n- [[Overview]]: why the API, the WebUI and the CLI are separate processes.\n- [[API routes]]: the 404, 409 and 429 codes on each route.\n- [[Configuration and locks]]: `max_concurrent_tasks`, `max_queued_tasks` and `enable_redis`.\n- Canvas: [[02 - Entry points.canvas|Canvas]].\n"
    },
    {
     "id": "c04",
     "section": "concept",
     "title": "Entry points",
     "tags": [
      "mapa",
      "conceito"
     ],
     "status": "stable",
     "sources": [
      "app/asgi.py",
      "app/controllers/base.py",
      "app/controllers/v1/video.py",
      "app/services/webui_task.py",
      "app/services/task.py",
      "cli.py",
      "webui.sh",
      "app/launcher.py"
     ],
     "body": "# Entry points\n\n[[00 - Index|← Index]]\n\nThe API, the WebUI and the CLI are three ways to ask for the same thing. They differ in validation, authentication, queueing, the configuration lock and what they accept as a file path.\n\n## Core idea\n\nAll three entry points call `task.start()` (`app/services/task.py:1907`). Before that, each one does its own part. The API validates the HTTP request and asks for authentication. The WebUI has a one-task queue and takes the configuration lock. The CLI runs synchronously, with no queue, and is the only one that accepts files outside the task folder.\n\n## How it works\n\n| Aspect | API (`/api/v1`) | WebUI (Streamlit) | CLI (`cli.py`) |\n|---|---|---|---|\n| Entry | `create_task` (`app/controllers/v1/video.py:235`) | `webui_task.submit_generation` (`app/services/webui_task.py:138`) | `run_cli` (`cli.py:1735`) |\n| Authentication | `x-api-key` when `app.api_key` is set (`app/controllers/base.py:47`). Without the key: 401. Also covers `/tasks/*` (`app/asgi.py:283`) | none on the page. By default it listens on `127.0.0.1` (`webui.sh:16`) | none. Runs with the permissions of whoever runs it |\n| Validation | pydantic schema: an error becomes **400** (`app/asgi.py:67`). Also subtitle colours and the font path, also **400** (`video.py:251-254`) | page widgets, then the pipeline | `argparse` (exit 2), `build_video_params` (2), `prepare_cli_files` (copies materials) |\n| `video_source` | not validated by the route. An invalid value fails at the preflight (`task.py:1543`) | by the widget | by the argparse `choices` (exit 2) |\n| Queue | yes: `add_task`, with 429 when full | yes: one task at a time (`webui_task.py:24`) | no: the call is synchronous |\n| Configuration lock | **no** | **yes**: `runtime_config_lock` (`webui_task.py:94`) | **no** |\n| User file paths | only inside `storage/tasks/<id>/`; fails in the pipeline if outside | uploads go to `storage/tasks/<id>/` | accepts absolute paths. Uses `allow_server_file_input=True` (`cli.py:1766`, `:1773`) |\n| Output | JSON `{status, message, data}` and polling with `GET /tasks/{id}` | page with state and live logs | one JSON line on stdout; logs on stderr |\n| Error codes | 400, 401, 404, 409, 429 | \"Video Generation Failed\" message | 0, 1 or 2 |\n\n**Where the difference matters.** The API and the WebUI call `start()` through the same function, but with `allow_server_file_input` set to `False`. So a `custom_audio_file` outside the task folder is refused (`app/services/task.py:461-470`). The CLI passes `True`, so it accepts any path on disk. The code comment says this is deliberate: it is the operator's own machine, not an HTTP client.\n\n## Example / walkthrough\n\nSame request, three entry points, same result on disk:\n\n- **API:** `POST /api/v1/videos` with the body shown in [[01 - Video via the API]].\n- **WebUI:** the same script and material on the page, then the generate button. See [[03 - Video via the WebUI]].\n- **CLI:** `cli.py --video-script \"...\" --video-source local --video-materials ./clip.mp4 --voice-name no-voice`. See [[02 - Video via the CLI]].\n\nAll three end in `storage/tasks/<id>/` with the same files.\n\n## Pitfalls\n\n- **The API validates little at the HTTP layer.** An unknown `video_source` or a `custom_audio_file` outside the task folder does not return 400. The task is created with 200 and fails later, inside the pipeline.\n- **Only the CLI accepts outside paths.** Do not send the same absolute path through the API: it will be refused in the pipeline.\n- **The lock applies only in the WebUI.** Today only the WebUI writes configuration (and the Kimi login, which runs from it). The API and the CLI read without the lock, so a write inside the same process during a task is not deferred. Editing `config.toml` by hand only takes effect in the API process after a restart, because the configuration is read once, at import (`app/config/config.py:640-660`).\n- **An empty key means no authentication.** The example ships with `api_key = \"\"` and `listen_host = \"0.0.0.0\"` (`config.example.toml:38`, `:11`). The log warns, but nothing stops network exposure. Set a key before exposing the API.\n\n## Practice\n\n1. Which entry point calls `start()` with `allow_server_file_input=True`, and why?\n2. What code does `POST /api/v1/videos` with `video_count: 9` return, and why?\n3. Who takes `runtime_config_lock`, and which entry point does not?\n\n> [!faq]- Answer key\n> 1. The CLI (`cli.py:1773`). It is the operator's own machine, so an absolute path is trusted. HTTP and the WebUI use the default `False`.\n> 2. 400. The pydantic schema caps `video_count` at 5 (`app/models/schema.py:266`), and the validation error becomes 400 (`app/asgi.py:67`).\n> 3. The WebUI, inside `_run_generation` (`webui_task.py:94`). The API and the CLI do not take the lock.\n\n## Connections\n\n- [[Overview]]: the overall design of the three entry points.\n- [[Pipeline and stop_at]]: what each entry point starts.\n- [[Task state and queue]]: the API queue and the WebUI queue.\n- [[Configuration and locks]]: the lock and the authentication keys.\n- [[API routes]] and [[CLI flags]]: the reference for each entry point.\n- Canvas: [[02 - Entry points.canvas|Canvas]].\n"
    },
    {
     "id": "c05",
     "section": "concept",
     "title": "Configuration and locks",
     "tags": [
      "mapa",
      "conceito"
     ],
     "status": "unstable",
     "sources": [
      "app/config/config.py",
      "app/paths.py",
      "app/utils/file_security.py",
      "app/services/webui_task.py",
      "webui/Main.py",
      "config.example.toml",
      "app/utils/logging_utils.py",
      "app/services/task.py"
     ],
     "body": "# Configuration and locks\n\n[[00 - Index|← Index]]\n\nAll configuration comes from one file, `config.toml`, read once at import. The WebUI can write it. A lock keeps the configuration from changing in the middle of a generation. Paths and files go through their own checks.\n\n> [!warning] unstable\n> The `[diagnostics]` section (`config.example.toml:14-24`), the runtime logging controls (`app/config/config.py:137`, `app/utils/logging_utils.py:33`) and the WebUI diagnostic toggle (`webui/Main.py:3207-3223`) came from the upstream Turbo v1.3.9 merge. State to be confirmed. The rest of this note (configuration, lock and paths) is on `main`.\n\n## Core idea\n\n`config.toml` lives in the runtime folder (`app/paths.py:20`, `runtime_root`). Each section becomes a synchronized dictionary in memory, and the program reads from it everywhere. The configuration lock (`runtime_config_lock`) blocks writes during a generation, but only the WebUI uses it. The API and the CLI do not take the lock.\n\n## How it works\n\n1. **File.** `config.py:15-16` builds `root_dir/config.toml`. On first run, `_initialize_config_from_example` (`config.py:495`) copies `config.example.toml` there, by an atomic hard link that never overwrites an existing file (`config.py:513`).\n2. **Reading.** `load_config` (`config.py:531`) reads the TOML. Each section becomes a `_SynchronizedConfig` (`config.py:30`): `diagnostics` (`:641`), `app` (`:642`), `azure`, `siliconflow`, `minimax_tts`, `elevenlabs`, `chatterbox`, `kokoro`, `fish_audio`, `voxcpm` and `ui` (`:653`). `whisper` and `proxy` are plain dictionaries (`:643-644`). The top-level values are `listen_host`, `listen_port`, `log_level` and `ffmpeg_path` (`:665-680`).\n3. **Writing.** `save_config` (`config.py:566`) writes a temporary file and swaps it in with `os.replace` (`config.py:620`). If the file is a Docker bind mount and cannot be replaced, it is written in place, inside the lock.\n4. **Lock.** `runtime_config_lock` (`config.py:304`) holds a reentrant lock for a whole generation. `_run_generation` takes it at `webui_task.py:94`. `try_runtime_config_lock` (`config.py:322`) is the non-blocking version, used by the WebUI for the voice preview (`webui/Main.py:6153`), the LLM connection test (`:3649`) and copying the configuration to generate new text (`:440`).\n5. **Write while the lock is held.** `update_config_nonblocking` (`config.py:92`) keeps only the latest value of each key and applies it when the lock is released. It does not block the interface and does not change the configuration of the running task.\n6. **Paths.** `app/paths.py`:\n   - `runtime_root` (`paths.py:20`): uses `MPT_HOME` if set; otherwise the repository folder (checkout) or the user data folder for the OS;\n   - `_with_legacy` (`paths.py:38`): if the new folder does not exist and the old `MoneyPrinterTurbo` folder does, uses the old one;\n   - `resource_directory` (`paths.py:70`): copies missing resources, without overwriting what the user edited.\n7. **User files.** `app/utils/file_security.py:4` (`resolve_path_within_directory`) resolves the real path and checks that it stays inside the allowed folder, using `realpath` and `commonpath`. It is used for the API font (`video.py:251`), the stream and download routes (`video.py:515`, `:587`), custom audio (`task.py:445`), background music (`bgm.py:339`, `:413`) and local material (`video.py:1971`).\n\n## Example / walkthrough\n\nFirst run with a scratch folder. This command creates `config.toml` inside `MPT_HOME`, without touching the repository:\n\n```sh\nMPT_HOME=/tmp/mpt-test uv run python cli.py --video-subject \"teste\" --stop-at script\n```\n\nAfterwards, `/tmp/mpt-test/config.toml` exists, with the same size as `config.example.toml`. That is what happened for this documentation: the file created was 34,300 bytes, the same as the example. Changing `api_key` there and restarting the API changes whether authentication is required (see [[Entry points]]).\n\nDefault values in the example that matter most:\n\n| Key | Value | Section | Line |\n|---|---|---|---|\n| `listen_host` | `\"0.0.0.0\"` | top | `config.example.toml:11` |\n| `listen_port` | `8080` | top | `:12` |\n| `api_key` | `\"\"` (no authentication) | `[app]` | `:38` |\n| `tls_verify` | `true` | `[app]` | `:71` |\n| `video_source` | `\"pexels\"` | `[app]` | `:90` |\n| `llm_provider` | `\"moonshot\"` | `[app]` | `:253` |\n| `subtitle_provider` | `\"edge\"` | `[app]` | `:516` |\n| `enable_redis` | `false` | `[app]` | `:566` |\n| `max_concurrent_tasks` | `5` | `[app]` | `:573` |\n| `max_queued_tasks` | `100` | `[app]` | `:574` |\n\nKeys that are secrets (filled in by you, never in git): `api_key`, `loomloom_api_token`, the `*_api_keys` lists and the `*_api_key` key of each provider, `redis_password`, `speech_key` (Azure), `api_key` of `siliconflow`, `minimax_tts`, `elevenlabs`, `chatterbox`, `kokoro`, `fish_audio` and `voxcpm`, and `upload_post_api_key`. The full list is in [[Configuration keys]]. `.gitignore` already covers `/config.toml` (`.gitignore:2`).\n\n## Pitfalls\n\n- **The lock does not protect the API or the CLI.** Today only the WebUI writes configuration, so the risk is small. If other code starts writing in the same process, it will change the configuration of an API task that is running.\n- **Editing the file is not enough.** The configuration is read once, at import (`config.py:640-660`). After editing `config.toml` by hand, restart the process.\n- **`tls_verify = false`** turns off certificate checks for external APIs and material downloads. The example comment says to leave it on (`config.example.toml:69-71`).\n- **`AGENTS.md` says writes are \"blocked\" while the lock is held.** The code does something different: it defers the write, keeps the last value and applies it when the lock is released (`config.py:92`). The code is right.\n\n## Practice\n\n1. What happens to an option change in the WebUI while a generation is running?\n2. Which key controls whether the API requires `x-api-key`, and what is its default?\n3. With `MPT_HOME` set, where does the program look for `config.toml`?\n\n> [!faq]- Answer key\n> 1. The change is stored and applied when the lock is released (`app/config/config.py:92`). The running generation does not change.\n> 2. `api_key` in `[app]` (`config.example.toml:38`). Its default is `\"\"`, which turns the requirement off.\n> 3. In `$MPT_HOME/config.toml`. `runtime_root` (`app/paths.py:20`) reads that variable before any other rule.\n\n## Connections\n\n- [[Overview]]: where configuration enters the program.\n- [[Entry points]]: who uses the lock and who does not.\n- [[Task state and queue]]: `max_concurrent_tasks`, `max_queued_tasks` and `enable_redis`.\n- [[Configuration keys]]: all sections and keys.\n- Canvas: [[01 - Pipeline.canvas|Canvas]].\n"
    },
    {
     "id": "c06",
     "section": "concept",
     "title": "LLM providers",
     "tags": [
      "mapa",
      "integracoes"
     ],
     "status": "unstable",
     "sources": [
      "app/models/llm_provider.py",
      "app/services/llm.py",
      "config.example.toml",
      "webui/Main.py",
      "webui/i18n/en.json",
      "test/services/test_fluxionai_llm.py"
     ],
     "body": "# LLM providers\n\n[[00 - Index|← Index]]\n\nAn LLM provider is the service that writes the script, the search terms and the publishing texts. The program knows 37 providers, all declared in one registry.\n\n## Core idea\n\nEach provider is one entry in `LLM_PROVIDER_REGISTRY` (`app/models/llm_provider.py:195`). The entry says **what** the provider is: name, default model, default URL and whether it needs a key. The code that **makes** the call lives in `app/services/llm.py`, chosen by the `adapter` field. That is why most new providers need only one entry.\n\n## How it works\n\n1. The configuration picks the provider in `[app] llm_provider`, default `moonshot` (`config.example.toml:253`; `DEFAULT_LLM_PROVIDER_ID` in `app/models/llm_provider.py:4`).\n2. `_generate_response` (`app/services/llm.py:314`) reads `<id>_api_key`, `<id>_model_name` and `<id>_base_url` from `config.app`. If the model is in `deprecated_models`, it is replaced by `default_model`. If the URL is empty, the registry's `default_base_url` is used.\n3. If `adapter` is not `openai_compatible`, a dedicated branch runs: `qwen` (`:397`), `gemini` (`:423`), `cloudflare_ai_gateway` (`:473`), `litellm` (`:494`), `azure` (`:516`), `claude_code` (`:545`), `kimi_code` (`:666`) and `modelscope` (`:725`).\n4. Everything else goes to the OpenAI SDK with `chat.completions.create` (`:754`).\n5. A failure does not raise to the caller. The `except` returns the string `\"Error: ...\"` (`:778`), and callers check the prefix (e.g. `:964`).\n\n| Adapter | Providers | Authentication |\n|---|---|---|\n| `openai_compatible` (default) | 29, including `ollama` and `oneapi` | API key (`ollama` uses none) |\n| `gemini` | `gemini` | key |\n| `qwen` | `qwen` (dashscope SDK) | key |\n| `azure` | `azure` | key, URL and `azure_api_version` |\n| `cloudflare_ai_gateway` | `cloudflare` | key, `account_id` and `gateway_id` |\n| `modelscope` | `modelscope` | key |\n| `litellm` | `litellm` | environment variables, such as `OPENAI_API_KEY` |\n| `claude_code` | `claude_code` | Claude subscription (CLI) — see [[Subscriptions instead of keys]] |\n| `kimi_code` | `kimi_code` | Kimi subscription (OAuth) — see [[Subscriptions instead of keys]] |\n\nThe full table, generated from the registry, is in [[Providers and adapters]].\n\n## Example / walkthrough\n\nMinimal config to use DeepSeek:\n\n```toml\n[app]\nllm_provider = \"deepseek\"\ndeepseek_api_key = \"sk-...\"\ndeepseek_base_url = \"\"     # empty: uses https://api.deepseek.com\ndeepseek_model_name = \"\"   # empty: uses deepseek-v4-pro\n```\n\nWith this, `_generate_response` builds `OpenAI(api_key=..., base_url=\"https://api.deepseek.com\")` and asks for the script. The result goes to `storage/tasks/<id>/script.json`, written by `save_script_data` (`app/services/task.py`). A provider error becomes a failure of the `script` stage in the task state, not an exception in the terminal.\n\n## Pitfalls\n\n- **Empty key for a provider that needs one.** It fails before any network call, with `api_key is not set` (`llm.py:377`).\n- **Providers with no default URL.** `azure` and `oneapi` have no `default_base_url` in the registry. The URL must be filled in, or the call fails with `base_url is not set` (`llm.py:385`).\n- **Errors are text.** Because errors come back as `\"Error: ...\"`, new code must check the prefix, or the message ends up as a script.\n- **WebUI labels are uneven.** AGENTS.md asks for the key `llm_provider_label.<id>` in all 14 `webui/i18n/*.json` files. Today only `en` and `zh` have the 15 labels, and the other files have only the `moonshot` one. The rest show the registry's `default_label`.\n\n> [!warning] unstable\n> `empiriolabs` (EmpirioLabs AI) came from the upstream Turbo v1.3.9 merge (commit 0dc4e20 according to the divergence report). State on `main` to be confirmed. The rest of this note is `main` state.\n\n## How to add a new provider\n\n1. **Registry.** Add an `LLMProviderSpec` to `LLM_PROVIDER_REGISTRY` (`app/models/llm_provider.py:195`). The tuple order is the dropdown order. For an OpenAI-compatible provider, `provider_id`, `default_label`, `api_key_url`, `default_model` and `default_base_url` are enough. Only write a new branch in `llm.py` if the protocol is different.\n2. **Config.** Copy an existing block in `config.example.toml`, inside `[app]`: `<id>_api_key`, `<id>_base_url` and `<id>_model_name` (e.g. the `groq_*` block).\n3. **Interface.** Add `llm_provider_label.<id>` to all 14 `webui/i18n/*.json` files (AGENTS.md). The WebUI falls back to `default_label` if the key is missing (`webui/Main.py:2277`). `llm_provider_tips.<id>` is optional and only shown if present (`Main.py:2196`).\n4. **Test.** Use `test/services/test_fluxionai_llm.py` as a model: `uv run python -X utf8 -m pytest -q test/services/test_fluxionai_llm.py test/services/test_llm.py`.\n\n## Practice\n\n1. On which line of the registry is the default provider, and which one is it?\n2. Does an OpenAI-compatible provider need a new branch in `llm.py`? Why?\n3. If `deepseek_api_key` is empty, what happens before any network call?\n\n> [!faq]- Answer key\n> 1. Line 195 (`LLM_PROVIDER_REGISTRY` starts there; the first item is `moonshot`). That is why it is the default in `DEFAULT_LLM_PROVIDER_ID` (`:4`).\n> 2. No. The default path is the OpenAI SDK with a `base_url`. A new branch is only for a different protocol.\n> 3. `_generate_response` raises `ValueError: deepseek: api_key is not set` (`llm.py:377`). No request goes out, and the task fails at the `script` stage.\n\n## Connections\n\n- [[Subscriptions instead of keys]] — `claude_code` and `kimi_code`, which use no key.\n- [[Providers and adapters]] — the full registry table.\n- [[Configuration keys]] — where `<id>_api_key` and the other keys live.\n- [[Pipeline and stop_at]] — the `script` stage that uses the LLM.\n- [[03 - Integrations.canvas|Canvas]]\n"
    },
    {
     "id": "c07",
     "section": "concept",
     "title": "Subscriptions instead of keys",
     "tags": [
      "mapa",
      "integracoes"
     ],
     "status": "unstable",
     "sources": [
      "app/services/llm.py",
      "app/services/kimi_code_oauth.py",
      "app/models/llm_provider.py",
      "config.example.toml",
      "Dockerfile.claude",
      "docker-compose.claude.yml",
      "webui/kimi_login.py"
     ],
     "body": "# Subscriptions instead of keys\n\n[[00 - Index|← Index]]\n\nTwo providers use the subscription you already pay for (Claude or Kimi) instead of a per-token API key.\n\n## Core idea\n\nAn API key is billed per use: every token goes on the account. A subscription is a monthly plan with a usage limit. It does not give out a key. The credential stays with the official client (the Claude CLI or the Kimi OAuth login), and the program only asks that client to answer. That is why these providers have `requires_api_key=False` in the registry.\n\n| | API key | Subscription |\n|---|---|---|\n| How it authenticates | `Authorization` with a key in `[app]` | logged-in CLI or OAuth token |\n| Billing | per token | monthly plan, with a limit |\n| Providers | most of them | `claude_code`, `kimi_code` |\n\n## How it works\n\n### Claude (`claude_code`)\n\nThe adapter does not talk to the Anthropic API. It runs the official CLI in headless mode (`app/services/llm.py:545`).\n\n1. Command: `claude -p --output-format json --system-prompt <...> --tools \"\" --safe-mode`, with `--model` only when `claude_code_model_name` is set (`llm.py:~560-580`). The prompt goes through **stdin**, because on Windows `cmd.exe` cuts multi-line prompts passed as arguments.\n2. `--tools \"\"` turns tools off. `--safe-mode` turns off CLAUDE.md, skills, hooks, plugins and MCP. It runs in an empty temporary directory (`llm.py:~590`).\n3. Minimum version: `CLAUDE_CODE_MIN_CLI_VERSION = \"2.1.260\"` (`llm.py:82`). An older CLI exits with `unknown option`, and the error asks for an upgrade.\n4. `build_claude_code_env` (`llm.py:167`) removes variables that would switch the subscription to another billing path: the `ANTHROPIC_*` and `CLAUDE_CODE_USE_*` prefixes, plus `AWS_BEARER_TOKEN_BEDROCK` and `CLAUDE_CODE_SKIP_*_AUTH`. It keeps `CLAUDE_CODE_OAUTH_TOKEN`, `ANTHROPIC_CONFIG_DIR` and `CLAUDE_CONFIG_DIR`.\n5. Timeout: `claude_code_timeout`, default 300 s (`CLAUDE_CODE_DEFAULT_TIMEOUT`, `llm.py:78`). `coerce_claude_code_timeout` (`llm.py:115`) rejects zero, negatives, `nan` and `inf`.\n\nIn Docker, `Dockerfile.claude` installs `@anthropic-ai/claude-code@2.1.260` with npm. `docker-compose.claude.yml` requires `CLAUDE_CODE_OAUTH_TOKEN` (the `:?` form makes it mandatory). The token is produced on the host with `claude setup-token`, because the container has no keychain.\n\n### Kimi (`kimi_code`)\n\nLogin uses the device flow (RFC 8628), in `app/services/kimi_code_oauth.py`.\n\n1. Request a code: `POST {auth}/api/oauth/device_authorization` (`kimi_code_oauth.py:162`). The user approves in the browser.\n2. Exchange for a token: `POST {auth}/api/oauth/token` (`:202`), with `grant_type=urn:ietf:params:oauth:grant-type:device_code` (`:209-210`).\n3. Regions are in `_REGIONS` (`:47`). China: `auth.kimi.com` and `api.kimi.com/coding/v1`. Global: `auth.kimi.ai` and `api.kimi.ai/coding/v1`.\n4. The token expires after `expires_in`, default 900 s = 15 min (`:266`). `get_valid_access_token` (`:311`) renews it 60 s before expiry (`_EXPIRY_MARGIN_SECONDS`, `:71`), with a lock against concurrent renewals.\n5. Tokens are stored in `[app]`: `kimi_code_access_token`, `kimi_code_refresh_token`, `kimi_code_token_expires_at` and `kimi_code_region` (`config.example.toml:475-480`).\n6. The call uses the OpenAI SDK with the access token and the CLI identity headers (`llm.py:666-724`). The token's issuing region wins over the region picked in the UI, because a token from one region gets a 401 in the other.\n7. The login screen is `webui/kimi_login.py` (`render_kimi_login`, `:129`).\n\n## Example / walkthrough\n\nA user picks `claude_code` with `claude_code_timeout` empty. `coerce_claude_code_timeout` returns 300 s. The CLI answers with a JSON carrying `result`, and `_normalize_text_response` cleans the text. The script goes to `storage/tasks/<id>/script.json`. If the CLI is logged out, the JSON has `is_error` and the login message, and the task gets `[claude_code] returned an error response`.\n\n## Pitfalls\n\n- **An old key in the environment.** If `ANTHROPIC_API_KEY` is set, it is removed. Billing follows the subscription, not the key. The log records only the name of the removed variable.\n- **Docker without a token.** Inside the container there is no interactive login. Without `CLAUDE_CODE_OAUTH_TOKEN` the call fails, and the message suggests `claude setup-token`.\n- **Stale docstring.** The header of `kimi_code_oauth.py` (lines 9-12) says the program calls `{api}/usages` and `{api}/messages`. The code only calls chat completions. The description is wrong.\n\n> [!warning] unstable\n> The section below is **PLANNED**: it does not exist in the code yet. I searched the repository for `Codex`, `Gemini CLI`, `Grok Build`, `SuperGrok` and xAI `STT`/`TTS` and found no implementation. The project phase plan was not found in the repository. State to be confirmed.\n\n## Next (PLANNED)\n\n| Item | State |\n|---|---|\n| Codex CLI (subscription) | PLANNED, does not exist |\n| Gemini CLI (subscription) | PLANNED, does not exist |\n| Grok Build / SuperGrok | PLANNED, does not exist |\n| xAI STT and TTS | PLANNED, does not exist |\n\n## Practice\n\n1. Why does `claude_code` remove `ANTHROPIC_API_KEY` from the environment before running the CLI?\n2. Why is the prompt sent through stdin instead of as an argument?\n3. How long does a Kimi access token last, and when is it renewed?\n\n> [!faq]- Answer key\n> 1. So the CLI uses the subscription login, not the key. Without the removal, billing would go to the API account. The function is `build_claude_code_env` (`llm.py:167`).\n> 2. On Windows `cmd.exe` cuts arguments at the first newline (comment in `llm.py`, near line 556). Stdin keeps the whole prompt.\n> 3. 15 min (900 s by default, `kimi_code_oauth.py:266`). Renewed 60 s before expiry (`:71`), using the refresh token.\n\n## Connections\n\n- [[LLM providers]] — the registry and the adapters.\n- [[Configuration keys]] — `kimi_code_*` and `claude_code_*`.\n- [[Configuration and locks]] — why config reads go through the lock.\n- [[03 - Integrations.canvas|Canvas]]\n"
    },
    {
     "id": "c08",
     "section": "concept",
     "title": "Voice and subtitles",
     "tags": [
      "mapa",
      "integracoes"
     ],
     "status": "unstable",
     "sources": [
      "app/services/voice.py",
      "app/services/subtitle.py",
      "app/services/task.py",
      "app/utils/utils.py",
      "app/utils/subtitle_writer.py",
      "config.example.toml",
      "app/models/schema.py"
     ],
     "body": "# Voice and subtitles\n\n[[00 - Index|← Index]]\n\nAudio is generated **before** the subtitles, and the subtitles are aligned to that audio.\n\n## Core idea\n\nNarration (TTS) and subtitles are separate stages, but they are linked. The `edge` subtitle provider uses the timings that the synthesis itself returns. The `whisper` provider ignores those timings and transcribes the audio. Because audio comes first, `POST /subtitle` also runs the TTS.\n\n## How it works\n\n1. `generate_audio` (`app/services/task.py:551`) picks the source: a file sent by the user (`resolve_custom_audio_file`), a WebUI preview that is reused, or `voice.tts`.\n2. `tts` (`app/services/voice.py:1138`) handles pauses. Without pause tags it calls `_single_tts` directly (`voice.py:640`).\n3. `_single_tts` picks the provider from the **voice name prefix**. Order: `no-voice` (`generate_silent_audio`, `:593`), `-V2` (`azure_tts_v2`, `:1784`), `siliconflow:`, `gemini:`, `mimo:`, `minimax:`, `elevenlabs:`, `chatterbox:`, `kokoro:`, `fish_audio:`, `voxcpm:`. Without a prefix it falls back to Edge/Azure v1 (`azure_tts_v1`, `:1535`).\n4. Pauses: `[pause: 2s]` and its variants in other languages (`pausa`, `silence`, `停顿`...) are recognised by `PAUSE_TAG_PATTERN` (`app/utils/utils.py:328`). Duration ranges from 0.1 s to 10 s (`utils.py:337-338`).\n5. Only Edge v1 synthesises in separate segments, with exact PCM silence (`_tts_with_pauses`, `voice.py:972`). Other providers strip the tags and synthesise in one request.\n6. `generate_subtitle` (`task.py:649`) reads `config.app.subtitle_provider` (default `edge`, `config.example.toml:516`).\n   - `edge`: `voice.create_subtitle` (`voice.py:3679`), using the synthesis timings.\n   - `whisper`: `subtitle.create` (`app/services/subtitle.py:61`), with faster-whisper, then `subtitle.correct` (`:230`), which compares against the script.\n7. Writing is atomic (`staged_subtitle_file`, `app/utils/subtitle_writer.py:11`).\n\nTTS providers and configuration:\n\n| Voice (prefix) | Function | Configuration |\n|---|---|---|\n| Edge / Azure v1 (default, no key) | `azure_tts_v1` (`voice.py:1535`) | `edge_tts_timeout` |\n| Azure v2 (suffix `-V2`) | `azure_tts_v2` (`:1784`) | `[azure]` `speech_key`, `speech_region` |\n| `siliconflow:` | `siliconflow_tts` (`:1604`) | `[siliconflow]` `api_key` |\n| `gemini:` | `gemini_tts` (`:1913`) | `gemini_api_key` |\n| `mimo:` | `mimo_tts` (`:2055`) | `mimo_api_key`, `mimo_base_url` |\n| `minimax:` | `minimax_tts` (`:2380`) | `[minimax_tts]` |\n| `elevenlabs:` | `elevenlabs_tts` (`:2473`) | `[elevenlabs]` `api_key` |\n| `chatterbox:` | `chatterbox_tts` (`:2766`) | `[chatterbox]` |\n| `kokoro:` | `kokoro_tts` (`:2808`) | `[kokoro]` |\n| `fish_audio:` | `fish_audio_tts` (`:2862`) | `[fish_audio]` or `FISH_API_KEY` |\n| `voxcpm:` | `voxcpm_tts` (`:3210`) | `[voxcpm]`, accepts a reference audio |\n| `no-voice` | `generate_silent_audio` | none |\n\n`chatterbox` and `kokoro` share the helper `_openai_compatible_tts` (`voice.py:2654`).\n\n## Example / walkthrough\n\nDefault voice in the schema: `zh-CN-XiaoxiaoNeural-Female` (`app/models/schema.py:175`). A task with that value goes through `azure_tts_v1`, writes `storage/tasks/<id>/audio.mp3` and measures the duration from the file. With `subtitle_provider = \"edge\"`, `subtitle.srt` comes from the synthesis timings. If Edge synthesis fails, subtitles are skipped and the log says `skip subtitles without falling back to whisper`. There is no automatic fallback.\n\n## Pitfalls\n\n- **Whisper is global.** `subtitle_provider` applies to all tasks. There is no per-task parameter.\n- **No subtitles is not an error.** An Edge failure gives a video without subtitles, and the task continues. The user has to check the subtitles.\n- **The prefix decides the provider.** A voice name without the right prefix falls back to Edge silently. E.g. `gemini-...` without `gemini:` goes to Azure.\n- **Pause tags with non-Edge providers.** The pause is removed, not turned into silence. The text loses the pause time.\n\n> [!warning] unstable\n> The voice and subtitle fixes from upstream Turbo v1.3.9 (SiliconFlow dB volume, pause tags after CJK keywords, symbol-only lines, rounded seconds and SRT timestamps, long-word line splitting) are only in the `unstable` branch. See [[Omni and Turbo]].\n\n## Practice\n\n1. In which order do `generate_audio` and `generate_subtitle` run? Why does that matter for `POST /subtitle`?\n2. Which subtitle provider uses the synthesis timings, and which one transcribes the audio?\n3. What happens to `[pause: 2s]` if the voice is `kokoro:`?\n\n> [!faq]- Answer key\n> 1. Audio first (`task.py:1715` calls `generate_audio`; `:1760` calls `generate_subtitle`). That is why `POST /subtitle` always synthesises the voice before subtitling.\n> 2. `edge` uses the synthesis timings. `whisper` transcribes (faster-whisper).\n> 3. The tag is removed by `remove_pause_tags` in `tts` (`voice.py:1138`), with no silence. Only Edge v1 generates the pause.\n\n## Connections\n\n- [[Pipeline and stop_at]] — the order of the stages.\n- [[Configuration keys]] — `[whisper]`, `[azure]`, `[kokoro]` and the other keys.\n- [[Video material]] — the next stage.\n- [[03 - Integrations.canvas|Canvas]]\n"
    },
    {
     "id": "c09",
     "section": "concept",
     "title": "Video material",
     "tags": [
      "mapa",
      "integracoes"
     ],
     "status": "unstable",
     "sources": [
      "app/services/material.py",
      "app/services/task.py",
      "app/services/video.py",
      "app/services/cache_manager.py",
      "app/services/material_cache.py",
      "app/services/twelvelabs.py",
      "cli.py",
      "app/models/schema.py",
      "app/services/video_project.py"
     ],
     "body": "# Video material\n\n[[00 - Index|← Index]]\n\nThe material stage brings in video or image clips from stock libraries, AI generation or local files, and the `video` stage assembles everything.\n\n## Core idea\n\nOne entry point, `download_videos` (`app/services/material.py:2161`), picks the source from `video_source`. Stock and AI sources use a key and charge per use. The `local` source makes no external call. The final stage, `generate_final_videos` (`task.py:980`), joins the material with subtitles and music.\n\n## How it works\n\n1. `get_video_materials` (`task.py:723`) validates the source against `_SUPPORTED_VIDEO_SOURCES` (`task.py:97`): `pexels`, `pixabay`, `coverr`, `local`, `wavespeed`, `volcengine_seedance`, `ofox`, `metaso_minimax`, `muapi`, `loomloom` and `openai_image`.\n2. Dispatch in `download_videos`:\n   - Stock: `_search_videos_with_cache` (`material.py:1853`) calls `search_videos_pexels` (`:341`), `search_videos_pixabay` (`:448`) or `search_videos_coverr` (`:590`). With script-order matching it goes to `_download_videos_by_script_order` (`:2938`).\n   - AI: `generate_videos_wavespeed` (`:805`), and the `_download_videos_*_on_demand` functions for Seedance (`:2486`), OFox (`:2599`), MuAPI (`:2704`) and Metaso (`:2824`).\n   - `openai_image`: `generate_images_openai` (`:1677`) and `_download_videos_openai_image_on_demand` (`:1760`).\n   - `local`: `video.preprocess_video` (`app/services/video.py:1955`).\n   - `loomloom`: WebUI only. The CLI does not accept this source (`cli.py:40`).\n3. Charges are confirmed. Paid sources need `--confirm-<provider>-charge` on the CLI (`cli.py:750-789`). The WebUI has `*_confirm_charge` checkboxes (`webui/Main.py:772-776`). I did not find an equivalent field in the API.\n4. Caches: `storage/cache_videos` (`material.py:1159`), `storage/cache_images` (`:1635`) and `storage/cache_material_search` (`app/services/material_cache.py:116`). Cleanup is `clean_video_cache` (`app/services/cache_manager.py:180`).\n5. `twelvelabs` is optional. When enabled, `rerank_terms_by_subject` (`app/services/twelvelabs.py:113`) reorders the terms before search (`task.py:416`). It needs the `twelvelabs` extra installed.\n6. Assembly uses `combine_videos` (`video.py:973`) and `generate_video` (`video.py:1569`), which mixes audio, subtitles and music.\n\n## Example / walkthrough\n\n```bash\nuv run python cli.py --video-subject \"Life of bees\" --video-source pexels\n```\n\nThe `materials` stage downloads clips into `storage/cache_videos/`. The task's `script.json` gains `material_sources`. The `video` stage writes `storage/tasks/<id>/combined-0.mp4` and `final-0.mp4`, and updates `material_selections` in `script.json`.\n\nFor `local`, the command requires `--video-materials`. `--stop-at terms` has no effect with `local` (`cli.py:728`).\n\n> [!warning] unstable\n> These items came from the upstream Turbo v1.3.9 merge, according to the divergence report, and are marked unstable:\n> - Image motion `--image-motion static|zoom` (`cli.py:447`, `ImageMotion` in `app/models/schema.py:56`).\n> - Local SDXL image server in `docs/local-image-server/`, mentioned in `config.example.toml:204`. A search of the app code found no SDXL integration; only the standalone server exists. State to be confirmed.\n> - EmpirioLabs provider, in [[LLM providers]].\n\n## Pitfalls\n\n- **Paid source without confirmation.** The CLI exits with code 2 (bad input) before spending any credit.\n- **`video_project.py` is not part of the pipeline.** No app module imports it. It is for re-rendering local revisions: `python -m app.services.video_project --help`. Only the tests use it.\n- **LoomLoom is WebUI only.** Through the API, a request with this source fails at the `materials` stage.\n- **The cache is shared.** `storage/cache_videos` is not per task. Clean it with care.\n\n## Practice\n\n1. What stock sources exist, and which search functions serve them?\n2. What does the CLI require before using `--video-source wavespeed`?\n3. Why is `video_project.py` not a stage of the pipeline?\n\n> [!faq]- Answer key\n> 1. Pexels, Pixabay and Coverr, through the `search_videos_*` functions in `material.py` (`:341`, `:448`, `:590`).\n> 2. The flag `--confirm-wavespeed-charge` (`cli.py:750`). Without it the CLI exits with an input error.\n> 3. Because no pipeline module imports it. It is a separate tool, run with `python -m`.\n\n## Connections\n\n- [[Voice and subtitles]] — the previous stage.\n- [[Music and publishing]] — the music used in the video stage.\n- [[Pipeline and stop_at]] — where the `materials` stage sits.\n- [[Configuration keys]] — the keys for each source.\n- [[03 - Integrations.canvas|Canvas]]\n"
    },
    {
     "id": "c10",
     "section": "concept",
     "title": "Music and publishing",
     "tags": [
      "mapa",
      "integracoes"
     ],
     "status": "stable",
     "sources": [
      "app/services/bgm.py",
      "app/services/task.py",
      "app/services/upload_post.py",
      "app/services/llm.py",
      "app/services/sonilo.py",
      "app/services/elevenlabs_music.py",
      "app/asgi.py",
      "config.example.toml"
     ],
     "body": "# Music and publishing\n\n[[00 - Index|← Index]]\n\nThe soundtrack can be a local file or AI-generated. After the render, the video can be sent to platforms in the background.\n\n## Core idea\n\nMusic and publishing are optional steps that run around the pipeline. The soundtrack goes into the video assembly. Publishing runs **after** the task finishes, in a separate thread. If the process restarts in the middle, the upload is not resumed.\n\n## How it works\n\n### Soundtrack\n\n1. `should_use_bgm` (`app/services/bgm.py:73`) decides whether there is a soundtrack.\n2. Local track: `list_bgm_files` (`bgm.py:361`) combines the built-in songs in `resource/songs` and the uploads in `storage/bgm` (`uploaded_bgm_dir`, `bgm.py:90`).\n3. AI track: `_VIDEO_MUSIC_PROVIDERS` (`app/services/task.py:79`) registers two providers.\n   - `sonilo` (`app/services/sonilo.py`): key `sonilo_api_key` or env `SONILO_API_KEY`, prompt up to 2000 characters (`MAX_PROMPT_LENGTH`, `sonilo.py:25`).\n   - `elevenlabs` (`app/services/elevenlabs_music.py`): key `[elevenlabs] api_key`, `music_model_id = \"music_v2\"`, prompt up to 1000 characters (`elevenlabs_music.py:24`).\n4. Preflight (`task.py:1609` onward): key present, prompt within the limit, and `validate_generation_access()` when it exists (`elevenlabs_music.py:177`, called from `task.py:1639`). All of this runs before any paid call.\n5. In the `video` stage, `generate_final_videos` (`task.py:980`) calls `service.generate_bgm` for each index. The file is written as `<bgm_type>-bgm-i.m4a` (Sonilo) or `.mp3` (ElevenLabs).\n\n### Publishing\n\n1. When the task finishes, `_schedule_cross_post` (`task.py:1463`) submits `_run_cross_post_with_slot` to `_cross_post_executor` (`task.py:45`), which has `max_workers=2`.\n2. A `BoundedSemaphore` caps pending uploads at `upload_post_max_pending_tasks`, default 10 (`task.py:51-53`; `config.example.toml:603`).\n3. `_run_cross_post` (`task.py:1259`) calls `llm.generate_social_metadata` (`app/services/llm.py:1343`), which returns title, caption and hashtags. Then it calls `upload_post.cross_post_video` (`app/services/upload_post.py:396`).\n4. `UploadPostService` (`upload_post.py:23`) uses `API_BASE = \"https://api.upload-post.com\"` (`:24`), with the header `Authorization: Apikey ...`. Default platforms: TikTok and Instagram (`config.example.toml:587`).\n5. At API boot, `recover_interrupted_cross_posts` (`task.py:1217`), called from `app/asgi.py:45`, marks uploads that were active as failed. The generated videos are kept.\n\n## Example / walkthrough\n\nA task with `bgm_type = \"elevenlabs\"` and `video_music_prompt = \"calm piano\"`:\n\n1. Preflight validates the key and the prompt size.\n2. The `video` stage writes `storage/tasks/<id>/elevenlabs-bgm-0.mp3` and mixes it into `final-0.mp4`.\n3. With `upload_post_enabled = true`, the task ends as `complete`. The upload goes to the executor, and the state keeps `cross_post_state`. If the process dies before the upload finishes, the next boot marks it `failed`.\n\n## Pitfalls\n\n- **Prompt too long.** Sonilo accepts 2000 characters, ElevenLabs 1000. Preflight refuses before any charge.\n- **Uploads are not resumed.** A restart in the middle of an upload marks it `failed`. It is not retried.\n- **Pool of 2 threads.** Many tasks with automatic publishing wait in line. This is not a persistent queue service.\n- **Redis and `ast.literal_eval`.** State values are read with `ast.literal_eval`. Redis must be private and trusted.\n\n## Practice\n\n1. How many publications can run in parallel, and what limits the number of pending ones?\n2. What does `recover_interrupted_cross_posts` do with an upload that was `processing` when the process died?\n3. Which setting in `config.example.toml` defines the default publishing platforms?\n\n> [!faq]- Answer key\n> 1. Two threads (`max_workers=2`, `task.py:45`). The pending limit comes from `upload_post_max_pending_tasks`, default 10 (`task.py:51`).\n> 2. It marks it `failed`. It does not resume it, and it keeps the videos already generated (`task.py:1217`).\n> 3. `upload_post_platforms` (`config.example.toml:587`), default `[\"tiktok\", \"instagram\"]`.\n\n## Connections\n\n- [[Video material]] — the stage that produces the video.\n- [[Pipeline and stop_at]] — when publishing runs.\n- [[Task state and queue]] — the `cross_post_*` fields.\n- [[Configuration keys]] — `upload_post_*` and `[elevenlabs]`.\n- [[03 - Integrations.canvas|Canvas]]\n"
    },
    {
     "id": "c11",
     "section": "concept",
     "title": "Agent harness",
     "tags": [
      "mapa",
      "agentes"
     ],
     "status": "unstable",
     "sources": [
      "AGENTS.md",
      ".agents/setup.md",
      ".agents/tecnico.md",
      ".agents/pipeline.md",
      ".agents/grok-bot.md",
      ".agents/comunicacao.md"
     ],
     "body": "# Agent harness\n\n[[00 - Index|← Index]]\n\nThe repository is also a **harness**: text and JSON files that tell an AI assistant how to produce a video or change the program, so it does not have to guess.\n\n## Core idea\n\nA **harness** is the layer that connects an AI model to the work: rules, roles, step scripts and permissions. Here the harness is not program code. It lives in text files. An assistant that reads `AGENTS.md` and the right skill can run the video team or the technical team.\n\nThe golden rule: **one source**. `AGENTS.md` and `.agents/` say what applies. Each tool's folder (`.claude/`, `.grok/`) holds only thin adapters that point back there.\n\n## How it works\n\n1. `AGENTS.md` is the entry point for any assistant. It has the program commands and three harness sections: video (`AGENTS.md:50`), technical team (`AGENTS.md:90`) and Grok (`AGENTS.md:114`).\n2. `.agents/` holds the content:\n\n| Item | What it is |\n|---|---|\n| `setup.md` | video team rules, priorities, defaults and fixed rules |\n| `pipeline.md` | project folder, steps and file contracts |\n| `tecnico.md` | technical team rules, task folder and CI checks |\n| `gostos.md` | creator tastes (music, look, narration); for now only placeholders |\n| `comunicacao.md` | how to talk to the user, briefly; role reports do not follow this rule |\n| `perfis/` | one profile per dark channel (see [[Channel profiles]]) |\n| `roles/` | one file per role: 20 in total |\n| `playbooks/` | tool recipes: `yt-dlp`, `redes-sociais`, `ffmpeg-timeline`, `moneyprinter` |\n| `skills/` | orchestration: `video/` and `manutencao/`, with scripts |\n| `tools/` | `sync_grok_agents.py`, which generates the Grok adapters |\n| `grok-bot.md` | guide to set up the team in Grok Bot, which does not read the repository |\n\n3. When two rules conflict, the order in `setup.md:6-15` wins: explicit request > `brief.md` > profile > tastes > setup. In the technical team the order is request > `pedido.md` > `AGENTS.md` > `tecnico.md` (`tecnico.md:8-13`).\n4. Each tool reads its own adapter folder. Claude Code reads `.claude/`; Grok Build reads `.grok/` and, according to `AGENTS.md:116`, also `.claude/agents/`. See [[Claude and Grok adapters]].\n\nRules the harness repeats everywhere: never publish, never change `config.toml`, an approval stop before download, and an audit before delivery (`setup.md:59-62`, `setup.md:76-77`).\n\n## Example / walkthrough\n\nA typical request: \"follow `.agents/skills/video/SKILL.md` for a video about <topic>\".\n\n- The assistant reads `AGENTS.md` and `setup.md`, picks the profile (`SKILL.md:27-30`) and creates `storage/projects/<slug>/brief.md` (`SKILL.md:32`).\n- If the tool has subagents, it delegates each role to one, using the role file (`SKILL.md:16-18`). If not, it runs the roles in sequence, reading each file first.\n\nIn the technical team, \"follow `.agents/skills/manutencao/SKILL.md` for <request>\" creates `storage/manutencao/<slug>/pedido.md` (`manutencao/SKILL.md:22-26`).\n\n## Pitfalls\n\n- **`AGENTS.md` is behind.** It says the technical team has \"two modes\" (`AGENTS.md:94`). The skill has four: change, audit, integration research and harness (`manutencao/SKILL.md:8-12`). The video role table also leaves out `animador` (`AGENTS.md:73-83`).\n- **Empty tastes.** `gostos.md` has only placeholders (`<ex.: ...>`), yet every role is told to follow it. Until it is filled, the agent picks by profile.\n- **The harness is not the pipeline.** `.agents/` describes the agents' work. The program lives in `app/`. Changing the harness does not change MoneyPrinterOmni.\n- **The status varies by branch.** Part of the technical team and of the MCPs is not on `main`. See [[Branches main and unstable]].\n\n> [!warning] unstable\n> The technical team (`tecnico.md`, `skills/manutencao`, the technical roles) and the Reddit and Apify MCPs are `status/unstable`. See [[Technical team]] and [[MCP and permissions]]. Status of `comunicacao.md`: to be confirmed.\n\n## Practice\n\n1. When two rules conflict, which one wins: the profile's or the request's?\n2. Does a role's rule live in `.claude/agents/` or in `.agents/roles/`?\n3. Does the harness publish a finished video? Why?\n\n> [!faq]- Answer key\n> 1. The explicit request. The order is request > brief > profile > tastes > setup (`setup.md:6-15`).\n> 2. In `.agents/roles/`. The adapter in `.claude/agents/` only points there.\n> 3. No. It is a fixed rule: never publish, send or schedule (`setup.md:76-77`). The `diretor` role only delivers the checklist.\n\n## Connections\n\n- Previous: [[Overview]]. Next: [[Video team and file contracts]], [[Technical team]], [[Claude and Grok adapters]], [[MCP and permissions]].\n- Reference: [[Roles and models]], [[Agent JSON contracts]].\n- Canvas: [[04 - Video team.canvas|Video team canvas]], [[05 - Technical team.canvas|Technical team canvas]].\n"
    },
    {
     "id": "c12",
     "section": "concept",
     "title": "Claude and Grok adapters",
     "tags": [
      "mapa",
      "agentes"
     ],
     "status": "stable",
     "sources": [
      ".claude/agents/arquiteto.md",
      ".claude/skills/video/SKILL.md",
      ".grok/agents/arquiteto.md",
      ".grok/skills/video/SKILL.md",
      ".agents/tools/sync_grok_agents.py",
      "skills-lock.json",
      ".agents/grok-bot.md",
      "AGENTS.md"
     ],
     "body": "# Claude and Grok adapters\n\n[[00 - Index|← Index]]\n\nEach AI tool reads its own folder, and that folder only repeats what is in `.agents/`.\n\n## Core idea\n\nAn **adapter** is a thin file the tool understands (a subagent or a skill) that points to the single source. The adapter body adds no new rule. If a rule changes, it changes only in `.agents/`.\n\nThere are two adapters:\n- **Claude Code**: `.claude/agents/` (subagents) and `.claude/skills/` (skills).\n- **Grok Build** (`grok`): `.grok/agents/` (generated) and `.grok/skills/video/` (hand-written).\n\n## How it works\n\n1. **Claude subagents.** Each of the 20 files in `.claude/agents/` has a header (`name`, `description`, `model`, `tools`) and a short body: \"Read and follow `.agents/roles/<role>.md`\" (example: `.claude/agents/arquiteto.md:2-5` for the header; the body follows it).\n2. **Model per role.** The `model:` line exists only here. Three roles use `haiku`: `montador-mpt` (`.claude/agents/montador-mpt.md:4`), `designer-de-thumbnail` and `redator-de-publicacao`. The other seventeen use `sonnet`. The rule comes from `setup.md:68-74` and `tecnico.md:64-66`.\n3. **Claude skills.** `.claude/skills/video/SKILL.md` and `.claude/skills/manutencao/SKILL.md` take `$ARGUMENTS` and tell the tool to read `.agents/skills/...`. There are also 12 `remotion-*` skills, vendored from `remotion-dev/skills` and pinned by hash in `skills-lock.json` (12 entries).\n4. **Grok subagents.** `.grok/agents/` is generated by `.agents/tools/sync_grok_agents.py`. The script copies `name`, `description` and `tools` from the Claude adapter, changes `model` to `inherit`, and points the body to the role (`sync_grok_agents.py:50`; body at `:24-27`).\n5. **Check.** `python3 .agents/tools/sync_grok_agents.py --check` exits 1 if a file is out of date or a generated adapter has no role left (`sync_grok_agents.py:101`). Without `--check` it writes. It never touches hand-made files, because it only deletes files that carry the mark \"Adaptador do Grok Build.\" (`:23`).\n6. **Grok Bot is something else.** The Grok Bot app does not read the repository. The guide `.agents/grok-bot.md` says to create one bot per role and paste the instruction \"Read and follow `.agents/roles/<role>.md`\" into the app. The video guide lists 12 bots.\n\n## Example / walkthrough\n\nWhen you change a role's rule:\n\n1. Edit `.agents/roles/<role>.md`. The adapters do not change.\n2. If you change the model, edit `model:` in `.claude/agents/<role>.md`.\n3. Run `python3 .agents/tools/sync_grok_agents.py`. It regenerates `.grok/agents/`; `model` stays `inherit`.\n4. Run `--check` before committing: it should print `ok: .grok/agents em dia`.\n\nThe same flow applies to new roles: create `.agents/roles/<role>.md`, then `.claude/agents/<role>.md`, then run the script.\n\n## Pitfalls\n\n- **`.grok/skills/video/SKILL.md` is outside `--check`.** The script only covers `.grok/agents/`. That file is hand-written and can drift.\n- **There is no `.grok/skills/manutencao/`.** The technical team has a skill for Claude, but Grok only sees the video one.\n- **`model: sonnet` does not exist in Grok.** That is why the generated files use `inherit` (`AGENTS.md:119`). Do not edit `.grok/agents/` by hand: the next generation erases the change.\n- **Grok Bot does not use these files.** Grok Bot configuration, skills and routines are created in the app, not read from the repository. xAI does not document whether the bot reads `.mcp.json`.\n\n> [!warning] unstable\n> The adapters for the technical roles (`arquiteto` through `mantenedor-do-harness`) and the `manutencao` skill exist only in the technical team, which is `status/unstable`. See [[Technical team]].\n\n## Practice\n\n1. Where do you change a role's rule so that Claude and Grok both follow it?\n2. Why does `--check` not catch an error in `.grok/skills/video/SKILL.md`?\n3. Which model runs `montador-mpt` in Claude Code?\n\n> [!faq]- Answer key\n> 1. In `.agents/roles/<role>.md`. Both adapters only point there.\n> 2. Because the script only compares `.grok/agents/`. The Grok skill is a separate file with no check.\n> 3. `haiku` (`.claude/agents/montador-mpt.md:4`).\n\n## Connections\n\n- Previous: [[Agent harness]]. Next: [[MCP and permissions]].\n- Teams: [[Video team and file contracts]], [[Technical team]].\n- Reference: [[Roles and models]].\n- Canvas: [[04 - Video team.canvas|Video team canvas]].\n"
    },
    {
     "id": "c13",
     "section": "concept",
     "title": "MCP and permissions",
     "tags": [
      "mapa",
      "agentes"
     ],
     "status": "unstable",
     "sources": [
      ".mcp.json",
      ".claude/settings.json",
      ".claude/hooks/ensure-yt-dlp.sh",
      ".agents/playbooks/redes-sociais.md",
      ".agents/playbooks/yt-dlp.md",
      ".claude/agents/pesquisador.md",
      "AGENTS.md"
     ],
     "body": "# MCP and permissions\n\n[[00 - Index|← Index]]\n\n**MCP** servers give the agents read-only social-media tools, and Claude Code allows or blocks each one.\n\n## Core idea\n\n**MCP** (Model Context Protocol) is the standard way an assistant uses an external tool. Each server exposes functions, such as \"get metadata\" or \"search Reddit\". In the harness, the servers support research and the search for source videos. All are **read-only**: nothing posts, comments, likes or schedules.\n\nThree layers control access:\n1. `.mcp.json` defines the server and its variables (secrets enter as `${VAR}`).\n2. `enabledMcpjsonServers` in `.claude/settings.json` turns the servers on.\n3. `permissions.allow` and `permissions.deny` allow or block each tool.\n\n## How it works\n\n1. **Servers** (`.mcp.json`):\n\n| Server | Type | Package or URL | State |\n|---|---|---|---|\n| `yt-dlp` | stdio | `npx @kevinwatt/yt-dlp-mcp@0.10.0` (`.mcp.json:3`) | `status/stable` |\n| `reddit` | stdio | `npx reddit-mcp-buddy@1.1.14` (`.mcp.json:14`) | `status/unstable` |\n| `apify` | http | `mcp.apify.com/?tools=...`, with `Authorization: Bearer ${APIFY_TOKEN}` (`.mcp.json:25`) | `status/unstable` |\n\n2. **Enabling and permissions** (`.claude/settings.json`): `enabledMcpjsonServers` (line 3) turns the three on. `allow` (line 5) frees 10 `yt-dlp` tools, 5 `reddit` tools and 6 `apify` tools (3 read-only actors and 3 tools that read run status and data). `deny` (line 28) blocks Apify writes: `call-actor`, creating, editing, publishing and unpublishing actor tasks, schedules, and `report-problem`.\n3. **Subagents**: the role's `tools:` line accepts the server name, such as `mcp__yt-dlp` (`.claude/agents/pesquisador.md:5`). You do not list each tool.\n4. **Session hook**: `SessionStart` runs `.claude/hooks/ensure-yt-dlp.sh` (`settings.json:41-49`, 120 s timeout). The script always creates `~/.cache/yt-dlp-mcp`. Only in the cloud (`CLAUDE_CODE_REMOTE=true`, line 14) does it install `yt-dlp` with `uv tool install` (line 23, 90 s). It always exits 0, so it never breaks the session.\n5. **Secrets**: `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` and `APIFY_TOKEN` enter only as `${VAR}`. No value goes into git.\n\n## Example / walkthrough\n\nA role looks up a post on X to illustrate a scene:\n\n1. The `pesquisador` has `mcp__yt-dlp` in `tools:`. It calls `ytdlp_get_video_metadata`, then `ytdlp_download_video_subtitles`. Both are in `allow`.\n2. If it wants to post or comment, no tool exists for that: there is nothing to allow.\n3. If Apify is asked to run a new actor, the `call-actor` call hits `deny`.\n4. The post becomes a lead, not a source: `redes-sociais.md` says to mark it `[1 fonte]` and credit `@handle (platform, date, link)`.\n\n## Pitfalls\n\n- **Cloud limits.** Without login, `yt-dlp` fails on YouTube (\"Sign in to confirm you're not a bot\"), TikTok, Instagram and Reddit. X usually works. The cause is the datacenter IP (`redes-sociais.md:84-87`, `yt-dlp.md:60-62`). The anonymous `reddit` works in the cloud, but `score` comes back empty (`redes-sociais.md:89`).\n- **\"Free\" is not the whole story.** `AGENTS.md:65` and `redes-sociais.md:5` call the servers free. Apify charges per result (`redes-sociais.md:29`). Without `APIFY_TOKEN` it starts with no tools (`redes-sociais.md:91`).\n- **Permission is not the rule.** `deny` stops the call. The \"never publish\" rule still lives in `setup.md`, and the harness relies on it too.\n- **Not verified:** whether Grok Build reads `.mcp.json` and `.claude/settings.json`. `AGENTS.md:116` says it does; I did not test it.\n\n> [!warning] unstable\n> `reddit` and `apify` exist only on the `unstable` branch, together with the `allow` and `deny` entries that name them. On `main`, only `yt-dlp` and the hook. See [[Branches main and unstable]].\n\n## Practice\n\n1. Where is the list of MCP servers, and where is the list of allowed tools?\n2. A role wants all of `mcp__apify`. What must it have in `tools:`?\n3. Why does the `SessionStart` hook always exit 0?\n\n> [!faq]- Answer key\n> 1. `.mcp.json` has the servers. `.claude/settings.json` has `enabledMcpjsonServers`, `allow` and `deny`.\n> 2. Only `mcp__apify` (the server name). Which tools are allowed or blocked is controlled in `settings.json`.\n> 3. So a failure never breaks the session: any error becomes a warning on stderr (`ensure-yt-dlp.sh`, header comment).\n\n## Connections\n\n- Previous: [[Claude and Grok adapters]]. Next: [[Video team and file contracts]].\n- See also: [[Agent harness]], [[Subscriptions instead of keys]], [[Tests and CI]].\n- Canvas: [[04 - Video team.canvas|Video team canvas]].\n"
    },
    {
     "id": "c14",
     "section": "concept",
     "title": "Video team and file contracts",
     "tags": [
      "mapa",
      "video"
     ],
     "status": "stable",
     "sources": [
      ".agents/skills/video/SKILL.md",
      ".agents/pipeline.md",
      ".agents/setup.md",
      ".agents/roles/pesquisador.md",
      ".agents/skills/video/scripts/build_timeline.py",
      ".agents/skills/video/scripts/build_music.py",
      ".agents/skills/video/scripts/build_thumbnail.py",
      ".agents/skills/video/scripts/arte.py",
      ".agents/skills/video/scripts/srt_to_timing.py"
     ],
     "body": "# Video team and file contracts\n\n[[00 - Index|← Index]]\n\nThe video team is a sequence of roles that pass **files** through a project folder. A contract says who writes and who reads each file.\n\n## Core idea\n\nThe roles do not talk to each other. Each one reads its input files, writes its output files and stops. The contract keeps the pieces fitting: `pipeline.md` gives the name, the format and the owner of each file. That way one role can be swapped, or run in another assistant, without touching the rest.\n\n## How it works\n\n**The 12 roles** (`.agents/roles/`; models in [[Roles and models]]):\n\n| Role | Does |\n|---|---|\n| `pesquisador` | sourced facts, source videos, script and music plan |\n| `critico` | flags content gaps (step 2) and visual gaps (step 10) |\n| `sugestor-de-pauta` | up to 8 ideas for cases, data and scenes |\n| `auditor` | checks facts against sources (step 2) and rights (step 10) |\n| `diretor-de-arte` | subtitles, on-screen text and thumbnail direction |\n| `diretor` | approval package (step 5) and delivery (step 12) |\n| `montador-mpt` | the only role that runs MoneyPrinterOmni: timing, music and render |\n| `cacador-de-clipes` | picks the clip segment for each scene (`shotlist.json`) |\n| `animador` | Remotion graphics (step 7b), see [[Remotion animations]] |\n| `editor-de-clipes` | builds clips with `build_timeline.py` and writes the credits |\n| `designer-de-thumbnail` | thumbnails with `build_thumbnail.py` |\n| `redator-de-publicacao` | titles, description, tags and pinned comment |\n\n**The 13 steps** (`SKILL.md:41-72`):\n\n1. `pesquisador` writes research, sources, script and music plan.\n2. In parallel: `critico`, `sugestor-de-pauta` and `auditor` (facts).\n3. If there is `REVISAR` or `CORRIGIR`, the researcher revises. At most 2 rounds.\n4. `diretor-de-arte` writes `arte.md` and `arte.json`.\n5. **Stop:** `diretor` brings the package to the user. It continues only with their approval (`SKILL.md:47-49`).\n6. `montador-mpt` does timing (audio, subtitles, `timing.json`) and music (`music.json`, `bgm.mp3`).\n7. `cacador-de-clipes` writes `shotlist.json`.\n7b. `animador` renders `raw/anim_NN.mp4` for the scenes that have `anim`.\n8. `editor-de-clipes` builds the timeline and `credits.md`.\n9. `montador-mpt` renders `output/final.mp4`.\n10. In parallel: `critico` (visual) and `auditor` (rights). At most 2 rounds.\n11. In parallel: `designer-de-thumbnail` and `redator-de-publicacao`.\n12. `diretor` writes `entrega.md`: `PRONTO` or `REFAZER <etapa>`.\n13. Final report. Nothing is published.\n\n**The project folder** (`storage/projects/<slug>/`, `pipeline.md:11-33`). `storage/` is not tracked by git.\n\n**Who writes and who reads** (summary of `pipeline.md:37-51`):\n\n| File | Writes | Reads |\n|---|---|---|\n| `brief.md` | orchestrator; `montador` adds the final speech rate | everyone |\n| `research.md` | `pesquisador` | critico, auditor, sugestor, redator |\n| `sources.json` | `pesquisador` | cacador, editor, auditor, diretor de arte |\n| `script.txt` | `pesquisador` | montador (`--video-script`), designer, redator |\n| `music-plan.md` | `pesquisador` | montador, diretor de arte |\n| `arte.json` | `diretor-de-arte` | cacador, `build_timeline`, `build_thumbnail`, montador |\n| `timing.json` | `montador` (from the subtitles) | cacador, animador, `build_music`, redator |\n| `music.json` | `montador` | `build_music`, auditor, editor |\n| `bgm.mp3` | `build_music.py` | render (`--bgm-file`) |\n| `shotlist.json` | `cacador` | animador, editor, `build_timeline`, auditor |\n| `raw/` | cacador, editor, animador | `build_timeline`, designer |\n| `timeline/NN.mp4` | editor (via `build_timeline.py`) | render, designer |\n| `credits.md` | editor | auditor, redator, diretor |\n| `output/final.mp4` | `montador` (copy of the render) | critico, auditor, diretor |\n| `entrega.md` | `diretor` | user |\n\n**The scripts** (`.agents/skills/video/scripts/`, standard-library Python and ffmpeg only):\n\n- `srt_to_timing.py <subtitle.srt> <timing.json>` turns subtitles into phrases with start and end (`parse` at `:18-35`).\n- `build_timeline.py <project> [--aspect] [--only] [--preview]` writes `timeline/NN.mp4` without audio, at the exact duration (`build` at `:142-157`). The source is `file` or `url`. With `url`, it downloads with `nix shell ... yt-dlp` (`:117-123`).\n- `build_music.py <project> [--duration] [--preview]` builds `bgm.mp3` with crossfade (`:70`) and copies it to `storage/bgm/<slug>.mp3` (`:116-118`).\n- `build_thumbnail.py <project> --text \"L1|L2\"` builds the cover; the first line uses `color`, the others `accent` (`:1-12`).\n- `arte.py` is library code only. It reads `arte.json`, merges defaults (`DEFAULTS` at `:9-13`) and draws text with `drawtext` (`:43-57`).\n\n## Example / walkthrough\n\nA real excerpt of the `shotlist.json` contract (`pipeline.md:76-79`):\n\n```json\n{\"n\": \"01\", \"phrases\": [1], \"dur\": 4.2, \"url\": \"https://www.youtube.com/watch?v=...\",\n \"start\": 4.0, \"kind\": \"fill\", \"why\": \"portais visíveis\"}\n```\n\nThe hunter writes the item. The editor reads `url` and `start` and calls `build_timeline.py`, which writes `raw/hi_*.mp4` and `timeline/01.mp4`. No script reads `phrases` or `why`. They exist for the agents.\n\n## Pitfalls\n\n- **Fields with no reader.** `build_timeline.py` does not read `anim`, `props`, `phrases` or `why`. `anim` is an instruction for the animador (`cacador-de-clipes.md:35-36`). `sources.json` and `arte.json.legenda` also have no script reader: the montador turns the subtitle block into flags by hand.\n- **The stop is not optional.** The package goes to the user before any download or edit (`setup.md:59-60`). Skipping step 5 reverses that order. The skill's rule is at `SKILL.md:125`.\n- **A folder outside the project.** `build_music.py` copies to `storage/bgm/`, outside `storage/projects/<slug>/`. The \"do not delete outside the project\" rule (`setup.md:76-77`) does not mention that folder.\n- **Review has a limit.** Two loops for each cycle. After that, take the problem to the user (`pipeline.md:53`).\n\n> [!warning] unstable\n> The slow zoom on images in `fit` (`build_timeline.py:58-63`) and the `motion` key are `status/unstable`. So are the new animated scenes (see [[Remotion animations]]). The rest of this note is `status/stable`.\n\n## Practice\n\n1. Who writes `arte.json`, and who reads it to draw the subtitles?\n2. A `shotlist.json` has `\"anim\": \"ReverseFlow\"`. What must exist for the render to work?\n3. Why does the step 5 stop come before the download, not after the render?\n\n> [!faq]- Answer key\n> 1. `diretor-de-arte` writes it. `build_timeline` reads `texto_na_tela` and `build_thumbnail` reads `thumbnail`. The montador translates the subtitle block into flags (`pipeline.md:110-112`).\n> 2. The `animador` must render `raw/anim_NN.mp4`, and `file` must point to it. The script only sees `file`.\n> 3. Because `setup.md:59-60` says the package goes to the user before any download or edit.\n\n## Connections\n\n- Previous: [[Claude and Grok adapters]]. Next: [[Technical team]].\n- See also: [[Pipeline and stop_at]], [[Voice and subtitles]], [[Video material]], [[Music and publishing]], [[Channel profiles]].\n- Reference: [[Agent JSON contracts]], [[Roles and models]].\n- Canvas: [[04 - Video team.canvas|Video team canvas]].\n"
    },
    {
     "id": "c15",
     "section": "concept",
     "title": "Technical team",
     "tags": [
      "mapa",
      "tecnico"
     ],
     "status": "unstable",
     "sources": [
      ".agents/skills/manutencao/SKILL.md",
      ".agents/tecnico.md",
      ".agents/roles/arquiteto.md",
      ".agents/roles/revisor-de-codigo.md",
      ".agents/roles/auditor-de-seguranca.md",
      ".agents/roles/mantenedor-do-harness.md",
      "AGENTS.md"
     ],
     "body": "# Technical team\n\n[[00 - Index|← Index]]\n\nThe technical team changes or audits the **program** (the code in `app/`, `cli.py` and `webui/`). It is separate from the video team: it does not make videos.\n\n## Core idea\n\nChanging code without a plan causes regressions. So the team separates who plans, who writes, who tests and who reviews. The reviewer only points out problems. The writer does not approve their own code. The strongest rule is the plan: a big change moves only with the user's approval.\n\n## How it works\n\n**The four modes** (`manutencao/SKILL.md:8-12`):\n\n| Mode | Purpose | Section |\n|---|---|---|\n| change | fix a bug, add a function, refactor | `SKILL.md:28-41` |\n| audit | assess without changing anything; ranked list | `SKILL.md:43-48` |\n| integration research | assess an API, SDK or candidate MCP | `SKILL.md:50-56` |\n| harness | review `AGENTS.md`, `.agents/`, adapters and permissions | `SKILL.md:58-63` |\n\n**The eight roles** (all `sonnet` on Claude; see [[Roles and models]]):\n\n| Role | Writes | Does |\n|---|---|---|\n| `arquiteto` | `plano.md` | reads the code, lists files, steps and risks. Does not edit code. |\n| `desenvolvedor` | `mudancas-NN.md` | implements in the service layer; runs ruff and the area tests |\n| `testador` | `testes-NN.md` | failing test for a bug; coverage; full suite. Edits only `test/` |\n| `revisor-de-codigo` | `revisao-NN.md` | bugs, contracts between API, WebUI and CLI, patterns. Only points out |\n| `auditor-de-seguranca` | `seguranca-NN.md` | files, subprocess, SSRF, secrets, dependencies. Only points out |\n| `auditor-de-saude` | `saude.md` | CI, coverage, dead code, debt. Ranked list, no verdict |\n| `pesquisador-de-integracoes` | `integracoes-NN.md` | candidates with source, auth, cost and terms. Installs nothing |\n| `mantenedor-do-harness` | `harness-NN.md` | edits the harness when asked and records the diff |\n\n**The task folder** is `storage/manutencao/<slug>/` (`tecnico.md:15-31`). It is outside git, like `storage/projects/`. The first file is `pedido.md`, written by the orchestrator.\n\n**Change, step by step** (`SKILL.md:30-40`):\n\n1. `arquiteto` writes `plano.md`.\n2. **Stop:** if the change touches the public API, schema, config, a new dependency or more than five files, the plan goes to the user.\n3. `testador` writes a failing test, for bugs.\n4. `desenvolvedor` implements and runs ruff and the area tests.\n5. `testador` completes coverage and runs the full suite.\n6. `revisor-de-codigo` and `auditor-de-seguranca` run in parallel.\n7. If either says `REVISAR`, the developer fixes it and steps 5 and 6 run again. At most 2 rounds.\n8. Final report to the user. Nothing is committed without their approval.\n\n**Rules the roles follow** (`tecnico.md:33-66`):\n\n- new behaviour goes in `app/services/`, so the API, WebUI and CLI all receive it through the same `task.start()`;\n- new WebUI text goes into every `webui/i18n/*.json`;\n- resources go through `app/paths.py`; input files through `app/utils/file_security.py`;\n- new config goes in `config.py` and in `config.example.toml`, never in the user's `config.toml`;\n- dependencies only with `uv add`, with a justification in the plan;\n- every fixed bug gets a test that failed before the fix.\n\n**CI checks**, which must pass before anything is declared ready (`tecnico.md:51-57`):\n\n```sh\nuv run ruff check app cli.py main.py webui test docs/skill\nuv run python -X utf8 -m pytest -q test\nuv run python -X utf8 -m coverage run -m pytest -q test && uv run python -m coverage report  # fail_under = 70\n```\n\nIf the change touches `animations/`, also run `npm run typecheck --prefix animations`.\n\n**Verdicts** (`tecnico.md:68-73`): each item is `bloqueia` (blocker), `importante` (important) or `detalhe` (detail). The reviewer and the security auditor end with `APROVADO` or `REVISAR`. `REVISAR` means at least one blocker or three or more important items.\n\n## Example / walkthrough\n\nA request to \"add an LLM provider\" touches the API and the config, so the plan goes to the user before any code. The full walkthrough, with files, is in [[05 - Change with the technical team]].\n\n## Pitfalls\n\n- **Outdated texts.** The description in `manutencao/SKILL.md:3` and the Claude adapter's list six roles; there are eight. `AGENTS.md:94` says \"two modes\"; there are four.\n- **Git is not the team's job.** No role commits, pushes or opens a PR (`tecnico.md:60-61`).\n- **A red check is not ready.** \"Red CI checks = not ready\", whatever the verdict (`SKILL.md:68`).\n\n> [!warning] unstable\n> This whole team is `status/unstable`: the roles, the integration and harness modes, and `storage/manutencao/`. Status to be confirmed on the source branch. See [[Branches main and unstable]].\n\n## Practice\n\n1. How many modes and how many roles does the technical team have today?\n2. A change touches `config.py` and a file in `webui/`. What must the architect put in the plan before any code?\n3. A reviewer finds two `importante` items and no `bloqueia`. What is the verdict?\n\n> [!faq]- Answer key\n> 1. Four modes (`manutencao/SKILL.md:8-12`) and eight roles (`AGENTS.md:102-109`).\n> 2. The plan must show the config change (a config or API change requires a stop, `SKILL.md:30-33`). It must also name the service layer and the tests, and note that `webui/i18n/*.json` changes in every language.\n> 3. `APROVADO`. `REVISAR` only with one `bloqueia` or with three or more `importante` (`tecnico.md:72-73`).\n\n## Connections\n\n- Previous: [[Video team and file contracts]]. See also: [[How to contribute]], [[Tests and CI]], [[Agent harness]].\n- Example: [[05 - Change with the technical team]].\n- Canvas: [[05 - Technical team.canvas|Technical team canvas]].\n"
    },
    {
     "id": "c16",
     "section": "concept",
     "title": "Channel profiles",
     "tags": [
      "mapa",
      "video"
     ],
     "status": "stable",
     "sources": [
      ".agents/perfis/_modelo.md",
      ".agents/perfis/saude.md",
      ".agents/setup.md",
      ".agents/gostos.md",
      ".agents/skills/video/SKILL.md",
      ".agents/playbooks/moneyprinter.md"
     ],
     "body": "# Channel profiles\n\n[[00 - Index|← Index]]\n\nEvery video belongs to a **profile**: the way a faceless dark channel speaks, shows and packages a topic.\n\n## Core idea\n\nThe profile is the third item in the priority order. It sets the audience, tone, narration, look, music and sources. A video inherits everything from its profile and writes into `brief.md` only what changes. Only two things are not overridden by a profile: the \"Fixed rules\" of the setup and the profile's \"Mandatory cautions\" (`setup.md:15`).\n\n## How it works\n\n1. **Files.** `.agents/perfis/` has the template `_modelo.md` and five profiles: `financas`, `historia-ciencia`, `infantil`, `saude` and `tecnologia`.\n2. **Header.** Each profile starts with a block of fields: `perfil` (the file name without `.md`), `nome`, `link`, `plataformas`, `idioma`, `voz`, `velocidade`, `formato` and `duracao` (`_modelo.md:1-11`).\n3. **Thirteen sections**, in this order (`_modelo.md:20-99`): Identity (20), Narration (30), Script (37), Visual identity (44), Music (53), Information sources (59), Images (65), Mandatory cautions (72), What works (77), Packaging (81), Channel tastes (87), Reference channels (91) and History (99).\n4. **Choice.** If the request does not name a profile: with one, use it; with several, list each name and audience and ask; with none, follow the defaults and offer to create one from the template (`setup.md:19-25`, `SKILL.md:27-30`).\n5. **Tastes.** `gostos.md` applies to every profile. A profile can change any item in its \"Channel tastes\" section (`gostos.md:3-4`).\n6. **History.** When a video ends, the director notes it in the profile's table: date, slug, length and what worked (`setup.md:29-30`, `SKILL.md:69-70`). Profiles have the table empty or with a few rows.\n\n## Example / walkthrough\n\nThe `saude` profile (`saude.md`) shows how the sections are used:\n\n- **Mandatory cautions** (line 63): \"No diagnosis, prescription or dose; advise seeing a professional.\" No brief overrides this section.\n- **History** (line 85): a table with the columns Date, Video (slug), Duration and Notes.\n\nTo use it, the request says \"use the saude profile\", or the assistant asks. When it writes `brief.md`, it writes `perfil: saude`.\n\n## Pitfalls\n\n- **A reference is not a template.** Reference channels teach rhythm, hook and structure. Do not copy their script, catchphrase, jingle or footage, unless the profile says the material is released (`setup.md:26-28`).\n- **Voice names differ.** The template has `voz: pt-BR-AntonioNeural-Male` (`_modelo.md:7`), and the playbook writes `pt-BR-AntonioNeural` (`moneyprinter.md:17`). The same name appears with different suffixes in two files; see [[Voice and subtitles]].\n- **A profile without the cautions section.** A new profile that leaves out \"Mandatory cautions\" loses the protection. Always copy from `_modelo.md`.\n\n> [!warning] unstable\n> The **proposal** for a folder-based profile, with `assets/`, `assets.json` and `referencias/`, is **PLANNED**. It does not exist in the code or in any file: no reference to `assets.json` or `referencias/` was found in the repository. It is `status/unstable` and should not be used until it exists.\n\n## Practice\n\n1. A video request names no profile, and there are two profiles. What does the assistant do?\n2. Where is the rule that a profile cannot override?\n3. When the director updates the profile, with what data?\n\n> [!faq]- Answer key\n> 1. It lists each name and audience and asks which one to use (`setup.md:21-22`).\n> 2. The setup's \"Fixed rules\" and the profile's \"Mandatory cautions\" (`setup.md:15`).\n> 3. When the video ends, with date, slug, length and what did or did not work (`setup.md:29-30`).\n\n## Connections\n\n- Previous: [[Video team and file contracts]]. See also: [[Voice and subtitles]], [[Music and publishing]], [[Video material]].\n- Canvas: [[04 - Video team.canvas|Video team canvas]].\n"
    },
    {
     "id": "c17",
     "section": "concept",
     "title": "Remotion animations",
     "tags": [
      "mapa",
      "animacoes"
     ],
     "status": "unstable",
     "sources": [
      "animations/src/Root.tsx",
      "animations/src/lib.tsx",
      "animations/remotion.config.ts",
      "animations/package.json",
      "docs/animations.md",
      ".agents/roles/animador.md",
      ".agents/pipeline.md"
     ],
     "body": "# Remotion animations\n\n[[00 - Index|← Index]]\n\n`animations/` is a Remotion project (React and TypeScript) that renders animated charts and diagrams to mp4. The `animador` uses it for scenes that do not exist as a photo or a video.\n\n## Core idea\n\nA scene with `\"anim\"` in `shotlist.json` becomes an mp4 of the exact length. The rest of the pipeline does not know it was animated: `build_timeline.py` treats the mp4 as a local file. So the animation enters the timeline like any other clip.\n\n## How it works\n\n1. **Project.** Remotion 4.0.536 in all `remotion` and `@remotion/*` packages, React 19.2.3 and TypeScript 5.9.3 (`animations/package.json`, dependencies). `remotion.config.ts` turns on rspack, JPEG frames, output overwrite and 2 s of premount.\n2. **npm scripts** (`package.json`): `dev` and `studio` open the editor, `render` and `still` export, `typecheck` runs `tsc --noEmit`, and `lint` runs eslint.\n3. **Compositions** in `src/Root.tsx`. All are 1080x1920 at 30 fps, except `HelloChartWide`, which is 1920x1080:\n\n| Id | Line | Use |\n|---|---|---|\n| `HelloChart` | 22 | sample, 9:16 |\n| `HelloChartWide` | 31 | sample, 16:9 |\n| `ReverseFlow` | 40 | flow in numbered steps |\n| `AgentSwarm` | 50 | grid filled by agents |\n| `ByteCompare` | 60 | byte-by-byte comparison |\n| `TimelineAnos` | 70 | bars and program pairs |\n| `TerminalAntigo` | 80 | old terminal with errors |\n| `FedoraVersoes` | 90 | version timeline |\n| `ComentaBalao` | 100 | comment bubbles |\n| `TrocariaCard` | 110 | chips and a yellow question |\n| `QuoteCard` | 120 | quote card, 1 frame |\n\n4. **Duration.** `durationMetadata` (`lib.tsx:38-40`) converts `durationSeconds` into frames: `round(seconds × 30)`, minimum 1. That is why the shotlist `dur` becomes `durationSeconds` at render time.\n5. **Colours and font** live in `lib.tsx` (`FPS` at line 14, `colors` from line 16). The font is BeVietnamPro, loaded from `public/`.\n6. **Path to the timeline:**\n   - `cacador-de-clipes` marks the scene with `\"anim\"`, `\"file\": \"raw/anim_NN.mp4\"` and `\"kind\": \"fill\"`;\n   - the `animador` runs `cd animations && npx remotion render <Id> ../storage/projects/<slug>/raw/anim_NN.mp4 --props='{\"durationSeconds\":<dur>, ...}'` (`animador.md:33`);\n   - `build_timeline.py` reads `file` as a local file;\n   - the montador joins the clips in the render.\n\n## Example / walkthrough\n\nA 7.4 s scene with three steps, as in the docs (`docs/animations.md:43`):\n\n```sh\ncd animations\nnpx remotion render ReverseFlow ../storage/projects/<slug>/raw/anim_01.mp4 \\\n  --props='{\"durationSeconds\":7.4,\"steps\":[\"A\",\"B\",\"C\"]}'\nnpx remotion still ByteCompare out/preview.png --frame=240   # check one frame\n```\n\nThe animador checks the frame, legibility (text at least 48 px) and that nothing covers the subtitle area (`animador.md:34-36`). Then it points `file` at the shotlist, or asks the hunter to adjust.\n\n## Pitfalls\n\n- **`QuoteCard` and `HelloChartWide` are outside the docs.** `QuoteCard` has one frame and does not fit the `render → fill` path: it needs `remotion still` and `kind: image`. `docs/animations.md` lists neither; `animador.md` names only four compositions (`animador.md:26`).\n- **Wrong duration.** If `durationSeconds` does not match the shotlist `dur`, the scene is shorter or longer than the narration.\n- **Licence.** Remotion is free for individuals and small teams. Larger companies need a paid licence (`docs/animations.md:49`).\n- **`kit.tsx` is shared.** Changing `kit.tsx` affects `ComentaBalao`, `FedoraVersoes` and `TrocariaCard`.\n\n> [!warning] unstable\n> The four compositions `TerminalAntigo`, `FedoraVersoes`, `ComentaBalao` and `TrocariaCard`, and `src/kit.tsx`, exist only on the branch with the new animations (PR #1). Status to be confirmed on `main`. See [[Branches main and unstable]].\n\n## Practice\n\n1. Which `shotlist.json` fields trigger the rendering of an animation?\n2. Why does `build_timeline.py` not need to know that a clip came from Remotion?\n3. A clip has `durationSeconds` 4 and the shotlist `dur` is 4.2. What happens?\n\n> [!faq]- Answer key\n> 1. `\"anim\"` and `\"file\"`. The `kind` is `fill` (`animador.md:37`; `pipeline.md:82-83`).\n> 2. Because it receives an mp4 in `file`, like any local file (`docs/animations.md:47`). No script reads `anim`.\n> 3. The clip is 4 s and the scene asks for 4.2 s. It does not cover the whole narration. Rule: `durationSeconds` = `dur`.\n\n## Connections\n\n- Previous: [[Video team and file contracts]]. See also: [[Video material]], [[Claude and Grok adapters]].\n- Reference: [[Agent JSON contracts]].\n- Canvas: [[04 - Video team.canvas|Video team canvas]].\n"
    },
    {
     "id": "c18",
     "section": "concept",
     "title": "Omni and Turbo",
     "tags": [
      "mapa",
      "omni-turbo"
     ],
     "status": "unstable",
     "sources": [
      "app/paths.py",
      "app/services/version_checker.py",
      "app/models/llm_provider.py",
      "webui/Main.py",
      "webui/i18n/en.json",
      "pyproject.toml",
      "app/__init__.py",
      "docs/release-notes-v1.3.9.md",
      "docs/packaging.md",
      "update.sh",
      "README.md"
     ],
     "body": "# Omni and Turbo\n\n[[00 - Index|← Index]]\n\nMoneyPrinterOmni is a fork of MoneyPrinterTurbo. It inherits the pipeline, adds an agent harness, and keeps receiving upstream releases by merge.\n\n## Core idea\n\nOmni started from the Turbo fork at commit `9e7d8b7` (\"fix(task): keep tasks with invalid state (#1663)\", 2026-10-17). The package name (`mpt`) and the `app/` layout did not change, so code paths are the same as in Turbo. What Omni adds on top is the rebrand, the agent harness, `animations/`, and the Nix environment.\n\n## How it works\n\n1. **Origin.** Fork at commit `9e7d8b7`. Confirmed in the session; this worktree has no git history to re-check it.\n2. **Rebrand (`a6c685c`, 67 files).** It swapped the names and added two compatibility shims:\n   - `app/paths.py:38` (`_with_legacy`): if the new data folder does not exist and the old `MoneyPrinterTurbo` folder does, the program keeps using the old one.\n   - `webui/Main.py:2965-2967`: imports settings and key files that were exported with the old `moneyprinterturbo.` schema.\n3. **What Omni adds.** `.agents/` (agent teams), `.claude/` and `.grok/` (adapters), `animations/` (Remotion), `flake.nix`, and `update.sh`. The default `README.md` is in English; Chinese and Japanese are in `README-zh.md` and `README-ja.md`.\n4. **Upstream v1.3.9 merge.** On 2026-10-22 Omni took in 25 upstream commits. The worktree contains the artifacts: `app/utils/request_logging.py`, `docs/diagnostic-logging.md`, `docs/local-image-server/`, and `docs/release-notes-v1.3.9.md`. The version is set in `app/__init__.py:3` and `pyproject.toml:10`.\n\n> [!warning] unstable\n> The v1.3.9 merge exists only on the `unstable` branch. Image motion options, runtime logging controls, the local SDXL image server, and the EmpirioLabs provider: status to be confirmed, lightly tested in Omni.\n\n5. **Syncing with upstream.** The divergence report recommended one merge commit, not cherry-picks, because the 25 commits depend on each other. The steps:\n   1. Add an `upstream` remote pointing to `harry0703/MoneyPrinterTurbo`. (Convention; I did not check the remote configuration in this worktree.)\n   2. Fetch the full upstream history.\n   3. Merge into a new branch based on Omni's base. Never force-push.\n   4. Resolve the expected conflicts (see Pitfalls).\n   5. Run the name check, `uv lock --check`, and the test suite.\n\n## Example / walkthrough\n\nTo find where the code still cites Turbo, run a read-only search (real output in this worktree):\n\n```sh\ngrep -rn \"harry0703\\|MoneyPrinterTurbo\" app webui cli.py main.py docs/skill --include=*.py\n```\n\nResult: `app/paths.py:39-40` (folder compatibility), `app/services/video.py:1593` (issue link), `app/services/version_checker.py:17,20` (upstream releases), `app/models/llm_provider.py:337` (`utm_term=MoneyPrinterTurbo`), `webui/Main.py:88` (fork credit), `docs/skill/mpt_agent.py:68` (`utm_source=MoneyPrinterTurbo`). In `webui/i18n/`, all 14 JSON files carry `utm_content=moneyprinterturbo` in provider links.\n\n## Pitfalls\n\n- **Expected merge conflicts.** `README.md` and `README-ja.md` (Omni rewrote them and deleted `README-en.md`; per the divergence report, upstream edited it). `pyproject.toml`: the version (line 10) and the description (line 11) sit on neighbouring lines and conflict. `docs/packaging.md` (line 3). `webui/Main.py` and `webui/i18n/*.json`. In every case, keep Omni's text.\n- **Omni still queries Turbo.** `app/services/version_checker.py` compares Omni's version with the latest release of `harry0703/MoneyPrinterTurbo`. A new Turbo release shows up as an Omni update. Open item.\n- **Turbo referral links.** Texts in `webui/i18n/*.json` (for example `webui/i18n/en.json:469`, \"MoneyPrinterTurbo referral link\") and provider links still point to Turbo's accounts. Open item.\n- **`update.sh` does not sync upstream.** It uses the `origin` remote by default (`update.sh:24`), so it updates Omni itself. Upstream changes only come in through a manual merge.\n\n## Practice\n\n1. Why does Omni's `version_checker` query the Turbo repository? Which decision is still missing?\n2. In an upstream merge, which two `pyproject.toml` lines usually conflict?\n3. What does `_with_legacy` do when the `MoneyPrinterOmni` folder does not exist but `MoneyPrinterTurbo` does?\n\n> [!faq]- Answer key\n> 1. Because the code still points at Turbo's release repository (an open item). The missing decision is which release repository Omni should check, or whether to turn the check off.\n> 2. `version` (line 10) and `description` (line 11). They sit on neighbouring lines, so git flags a conflict.\n> 3. It uses the old `MoneyPrinterTurbo` folder (`app/paths.py:38-40`), so people who installed before the rebrand keep their data.\n\n## Connections\n\n- [[Overview]] and [[Agent harness]]: what Omni adds to the pipeline.\n- [[Branches main and unstable]]: where the v1.3.9 merge lives and how it moves to main.\n- [[How to contribute]] and [[Tests and CI]]: what to run before syncing.\n- [[Claude and Grok adapters]] and [[Remotion animations]]: the adapters and Omni's `animations/`.\n- [[Technical team]]: the team that does the merge and the audit, when asked.\n- Canvas: [[06 - Omni and Turbo.canvas|Canvas]].\n"
    },
    {
     "id": "c19",
     "section": "concept",
     "title": "Branches main and unstable",
     "tags": [
      "mapa",
      "branches"
     ],
     "status": "unstable",
     "sources": [
      ".mcp.json",
      ".agents/tecnico.md",
      ".agents/roles/arquiteto.md",
      ".github/workflows/ci.yml",
      ".github/workflows/docker-ghcr.yml",
      "update.sh",
      "docs/packaging.md"
     ],
     "body": "# Branches main and unstable\n\n[[00 - Index|← Index]]\n\n`main` holds only what has been tested and proven. `unstable` holds what was added recently and has had little testing.\n\n## Core idea\n\nEvery item has a home. An item starts on `unstable`, is fixed and tested, and only then moves to `main` through a pull request. No force-pushes: history is never rewritten.\n\n## How it works\n\n1. **Content rule** (set by the project owner):\n   - `main`: video capture from stock-video banks; AI scripts; the agent workflow for Claude Code and other harnesses; Remotion animations; yt-dlp; Grok adaptation.\n   - `unstable`: Reddit and Apify MCPs; the technical team; channel profiles with assets; new animations; the upstream v1.3.9 merge; future subscriptions (see [[Subscriptions instead of keys]]).\n2. **Entry.** New items enter on `unstable`. This step is implied by the rule; no written document spells it out.\n3. **Promotion.** Once an item is fixed and tested, it moves to `main` through a pull request.\n4. **No force-push.** Fixes arrive as new commits.\n\n> [!tip] Suggested flow (not a written rule)\n> To move a single item, the pull request should start from `main` and carry only that item's commits (a branch from `main` with cherry-picks). A pull request from all of `unstable` carries everything that sits there.\n\n## Example / walkthrough\n\nPromoting the Reddit MCP (an `unstable` item):\n\n1. Confirm the item is on `unstable`: `.mcp.json` has the `reddit` entry (and `apify`). This worktree has both, which matches the rule.\n2. Fix what the tests and the review find.\n3. Run the checks the CI would run (the fork's CI is off, so the check is local):\n   ```sh\n   uv run ruff check app cli.py main.py webui test docs/skill\n   uv run python -X utf8 -m pytest -q test\n   uv run python -X utf8 -m coverage run -m pytest -q test && uv run python -m coverage report   # fail_under = 70\n   ```\n4. Open the pull request into `main` with only that item.\n\n## Current state\n\n> [!warning] unstable\n> Status to be confirmed: I did not run git commands in this worktree, so I cannot say from git which branch holds each item. From the file contents:\n> - **On unstable (by the rule):** the Reddit and Apify MCPs (`.mcp.json`); the technical team (`.agents/tecnico.md`, `.agents/roles/arquiteto.md` and the other technical roles); the upstream v1.3.9 merge (`docs/release-notes-v1.3.9.md`).\n> - **Channel profiles:** `.agents/perfis/` has five profiles and `_modelo.md`, but there is no assets folder in this worktree. Status to be confirmed.\n> - **Working branches** named in the divergence report: `ccr-879e967e-rcs3uw` (3 commits over `origin/main`: MCPs, technical team, yt-dlp cache) and `ccr-e7cc9390-tc3402` (4 commits: animations and a `build_timeline` zoom, profiles moved to `nichos/` and `canais/`, `flake.nix` changed, `update.sh` deleted). These are session names, not the `main` and `unstable` branches.\n\n## Pitfalls\n\n- **`update.sh` disappears on one working branch.** `ccr-e7cc9390-tc3402` deletes `update.sh`, which `origin/main` keeps. If that branch is promoted carelessly, the update script goes away. Check the diff first.\n- **There is no CI on the fork.** `.github/workflows/ci.yml` runs on pushes and pull requests to `main`, but GitHub Actions do not run on the fork. Promoting without local testing is the main risk.\n- **What you see depends on the branch.** This worktree has the technical team, which is `unstable`. Before saying something is \"already on main\", confirm with `git` in the repository.\n\n## Practice\n\n1. You added a new CLI command today. Which branch does it start on, and what is missing before it can go to `main`?\n2. Why is a pull request from all of `unstable` to `main` a poor way to promote only the Reddit MCP?\n3. Which three commands replace the CI when GitHub Actions are off?\n\n> [!faq]- Answer key\n> 1. It starts on `unstable`. What is missing: fix what the tests find, run the checks, and open a pull request into `main` with only that item.\n> 2. Because it also carries every other item that is only on `unstable` (technical team, new animations, and so on), none of which has been proven yet.\n> 3. `uv run ruff check app cli.py main.py webui test docs/skill`; `uv run python -X utf8 -m pytest -q test`; and the coverage command with `fail_under = 70` (see [[Tests and CI]]).\n\n## Connections\n\n- [[Omni and Turbo]]: the v1.3.9 merge that sits on `unstable`.\n- [[How to contribute]]: the step-by-step for anyone changing the code.\n- [[Tests and CI]]: what the CI runs and why it is off on the fork.\n- [[Technical team]] and [[MCP and permissions]]: two of the `unstable` items.\n- [[Remotion animations]]: the `main` animations and the new ones on `unstable`.\n- Canvas: [[07 - Branches.canvas|Canvas]].\n"
    },
    {
     "id": "c20",
     "section": "concept",
     "title": "How to contribute",
     "tags": [
      "mapa",
      "contribute"
     ],
     "status": "unstable",
     "sources": [
      "AGENTS.md",
      "flake.nix",
      "pyproject.toml",
      ".python-version",
      "animations/.nvmrc",
      "config.example.toml",
      "app/services/task.py",
      "app/services/webui_task.py",
      "app/config/config.py",
      "app/paths.py",
      "app/utils/file_security.py",
      "Dockerfile",
      ".agents/tecnico.md",
      ".agents/skills/manutencao/SKILL.md"
     ],
     "body": "# How to contribute\n\n[[00 - Index|← Index]]\n\nContributing means changing the service layer, running the same checks as CI on your own machine, and taking the change to `unstable`.\n\n## Core idea\n\nAll new behaviour goes into `app/services/`, so the API, the WebUI and the CLI receive the change together. Before saying \"done\", run the three CI checks locally, because GitHub Actions do not run on the fork.\n\n## How it works\n\n1. **Set up the environment.**\n   - With Nix: `nix develop`. The shell (`flake.nix`) brings Python 3.11, uv, ffmpeg, ImageMagick, Node 24, Chromium and yt-dlp, and prints the hint `uv sync --frozen && ./webui.sh`.\n   - Without Nix: Python 3.11 or newer (`pyproject.toml`, `requires-python = \">=3.11\"`), then `uv sync --frozen`.\n   - Copy the config: `cp config.example.toml config.toml`.\n   - If `.venv` was created by the Nix Python, run everything inside the shell: `nix develop --command ...`. Outside it, numpy fails to load `libstdc++.so.6` (`AGENTS.md`, lines 11-12).\n2. **Run the program.**\n   - `./webui.sh`: WebUI on `127.0.0.1:8501`.\n   - `python main.py`: FastAPI, with docs at `/docs`.\n   - `uv run python cli.py --help`: CLI.\n3. **Check before saying \"done\"** (the same commands CI runs):\n   ```sh\n   uv run ruff check app cli.py main.py webui test docs/skill\n   uv run python -X utf8 -m pytest -q test\n   uv run python -X utf8 -m coverage run -m pytest -q test && uv run python -m coverage report   # fail_under = 70\n   ```\n4. **Conventions.**\n   - New behaviour goes in `app/services/`. The entry points only call `task.start()` (`app/services/task.py:1907`), which runs `_run_pipeline` (`app/services/task.py:1519`).\n   - New WebUI text goes into all 14 files in `webui/i18n/*.json`.\n   - Resource paths go through `app/paths.py`. Files received from the client go only through the helpers in `app/utils/file_security.py`. `allow_server_file_input` is CLI-only.\n   - A new configuration key goes in `app/config/config.py` and in `config.example.toml`. Never edit the user's `config.toml`.\n   - Dependencies: `uv add` or `uv lock` (`pyproject.toml` and `uv.lock`). `requirements.txt` is legacy.\n   - Comments: follow the language of the file. Of the 54 `.py` files in `app/`, 43 contain Chinese text; the older code is mostly in Chinese.\n5. **Ask the technical team for a change or an audit.** Tell your assistant: \"follow `.agents/skills/manutencao/SKILL.md` for <bug, function or audit>\". The team writes everything to `storage/manutencao/<slug>/` (`pedido.md`, `plano.md`, review and security reports) and does not commit, push or open a PR without your request.\n\n> [!warning] unstable\n> The technical team (`.agents/tecnico.md` and the roles `arquiteto`, `desenvolvedor`, `testador`, `revisor-de-codigo`, `auditor-de-seguranca`, `auditor-de-saude`) lives on the `unstable` branch. Status to be confirmed: lightly tested.\n\n## Example / walkthrough\n\nFixing a small bug in `app/services/`, start to finish:\n\n1. `uv sync --frozen` (or `nix develop` first).\n2. Write a test that **fails before** the fix. The team's rule: every fixed bug gets a test that failed before.\n3. Fix the code in `app/services/`.\n4. Run `uv run ruff check app cli.py main.py webui test docs/skill`. In the copy used for this map, the output was `All checks passed!`.\n5. Run the relevant suite, for example `uv run python -X utf8 -m pytest -q test/services/test_task.py`, then the full suite with coverage.\n6. Take the change to `unstable`; promotion to `main` follows [[Branches main and unstable]].\n\n## Pitfalls\n\n- **The configuration lock only applies to the WebUI.** `config.runtime_config_lock()` is used in `app/services/webui_task.py:94`; the WebUI also uses `try_runtime_config_lock()` (`webui/Main.py:440`, `:3649`, `:6153`). The API and the CLI do not take it, so a config change during an API job can take effect in the middle of that job.\n- **Docker does not use `uv.lock`.** The `Dockerfile` copies and installs `requirements.txt` (lines 83 and 89). A dependency added only with `uv add` does not reach the image until `requirements.txt` is updated. Open item.\n- **WebUI text without all 14 translations.** If you add a key only to `en.json`, the other 13 languages fall back to English (`tr()` falls back to English, then to the raw key). Write to every file.\n\n## Practice\n\n1. You need one function that serves the API, the WebUI and the CLI at once. Which folder does it go in?\n2. You added new text for the WebUI. How many JSON files must you touch?\n3. You installed a dependency with `pip install`. What is wrong?\n\n> [!faq]- Answer key\n> 1. In `app/services/`, called from `task.start()`. That way all three entry points get the same logic.\n> 2. The 14 files in `webui/i18n/`.\n> 3. Use `uv add` instead of `pip`, which updates `pyproject.toml` and `uv.lock`. Remember that Docker reads `requirements.txt`, so the dependency must reach it too (open item).\n\n## Connections\n\n- [[Configuration and locks]]: why the lock applies only to the WebUI.\n- [[Tests and CI]]: what each check covers and why CI is off on the fork.\n- [[Branches main and unstable]]: where the change goes and how it moves.\n- [[Technical team]]: the roles that do the change and the audit.\n- [[Omni and Turbo]]: why the code still carries upstream names.\n- Canvas: [[05 - Technical team.canvas|Canvas]].\n"
    },
    {
     "id": "c21",
     "section": "concept",
     "title": "Tests and CI",
     "tags": [
      "mapa",
      "tests",
      "ci"
     ],
     "status": "unstable",
     "sources": [
      ".github/workflows/ci.yml",
      ".github/workflows/docker-ghcr.yml",
      "pyproject.toml",
      "test/README.md",
      "test/services/test_state.py",
      "test/services/test_llm.py",
      "test/services/test_voice.py",
      "test/services/test_video_project.py",
      "animations/.nvmrc",
      "AGENTS.md"
     ],
     "body": "# Tests and CI\n\n[[00 - Index|← Index]]\n\nThe suite runs on pytest (which also runs the `unittest.TestCase` classes), requires 70% branch coverage, and in the upstream repository runs on GitHub Actions. On the fork, CI does not run: the checks are local.\n\n## Core idea\n\nEvery change passes three checks: ruff (lint), pytest (tests), and coverage (branch coverage, with a 70% floor). CI runs the same set on Python 3.11 and 3.13, with a real Redis server.\n\n## How it works\n\n1. **Layout.**\n   - `test/test_main.py`: the entry-point test.\n   - `test/services/`: 221 entries, mostly `test_<domain>.py`, one per domain.\n   - `test/resources/`: images `1.png` to `9.png` for the material tests.\n   - There is no `conftest.py` and no `pytest.ini` or `setup.cfg`. The coverage configuration lives in `pyproject.toml`.\n   - 64 files use `unittest.TestCase`; the rest use pytest functions. Pytest runs both.\n2. **Mocks.** Tests swap dependencies with `unittest.mock.patch.object` (about 1,800 occurrences) and, in 24 files, with `monkeypatch`. The WebUI is tested with `streamlit.testing.v1.AppTest` (21 files).\n3. **Live tests and Redis.**\n   - `MPT_RUN_INTEGRATION_TESTS=1` enables the tests that call the LLM, TTS and Twelve Labs for real (`test_llm.py`, `test_task.py`, `test_voice.py`, `test_twelvelabs.py`). They need provider credentials.\n   - `MPT_TEST_REDIS_HOST`, `MPT_TEST_REDIS_PORT` and `MPT_TEST_REDIS_DB` enable the Redis tests. Without the host, `test/services/test_state.py:321-323` skips the test.\n4. **Coverage** (`pyproject.toml`): `branch = true`; `source = [\"app\", \"cli\", \"webui\", \"main\", \"docs/skill\"]`; `fail_under = 70`; `show_missing` and `skip_covered` on. The comment in the file records that measurements on 3.11 and 3.13 exceeded 70.4%.\n5. **The `tests` job in `ci.yml`.**\n   - Matrix on Python 3.11 and 3.13, with a `redis:7-alpine` service and `MPT_TEST_REDIS_DB: 15`.\n   - Steps: `uv sync --frozen`; `compileall`; `ruff` (3.11 only); `coverage run -m pytest -q test`.\n   - Then it installs ffmpeg with `apt-get` and runs `test/services/test_video_project.py` and `test/services/test_minimax_output_container.py` with `coverage run --append`.\n   - It ends with `coverage report`, `coverage xml`, and uploads the XML as an artifact (7 days).\n6. **Other jobs.**\n   - `animations`: Node at the version in `animations/.nvmrc` (24), `npm ci --prefix animations`, then `npm run typecheck`.\n   - `windows-smoke`: Windows with Python 3.11; compiles and runs a subset of service tests (config, state, task, task manager, the video controller, WebUI task).\n   - `docker-ghcr.yml`: builds the image for amd64 and arm64 on pushes to `main` and on `v*` tags.\n\n> [!warning] unstable\n> The new v1.3.9 tests (for example `test/services/test_webui_image_motion.py` and `test/services/test_webui_logging_settings.py`) and the Kimi login test live on the `unstable` branch. Status to be confirmed.\n\n## Example / walkthrough\n\nResult of a local run in this session, in a copy of the worktree (outside the worktree, so no `config.toml` or `storage/` gets created):\n\n- Setup: `uv sync --frozen` with Python 3.11; system ffmpeg 6.1.1; no Redis and no `MPT_RUN_INTEGRATION_TESTS`.\n- `ruff check app cli.py main.py webui test docs/skill`: `All checks passed!`.\n- `pytest -q test`: **10 failed, 2384 passed, 54 skipped** in 8 min 17 s.\n- Audio failures (9): `test_bgm_decoded_audio.py` (1), `test_remote_speech_complete_decode.py` (5), `test_webui_bgm.py` (2 subtests, `en` and `zh`), and `test_webui_custom_audio_upload.py` (1). The error is `ffmpeg -xerror ... Decoder thread returned error`.\n- Rerunning those 9 with the ffmpeg 7.0.2 binary bundled with `imageio-ffmpeg` on `PATH`: **32 passed, 14 subtests passed**. The only variable changed was the ffmpeg binary.\n- Kimi login failure (1): a 3-second AppTest timeout in Streamlit. Run alone: 6 passed in 1.4 s. Unstable under load.\n- I did not run `coverage` in this check, so the 70% floor was not re-verified here.\n\n## Pitfalls\n\n- **A local pass is not a CI pass.** GitHub Actions do not run on the fork, so the only proof is the local run. The three commands in [[How to contribute]] are the substitute.\n- **The audio suite depends on the system ffmpeg.** With the system ffmpeg 6.1.1, the 9 audio failures appear; with the bundled 7.0.2, they pass. In CI, the main suite runs before `apt-get install ffmpeg`, so it uses whatever ffmpeg the runner already has (not verified). Check with `ffmpeg -version`.\n- **Skipped is not verified.** The 54 skips in this run did not run. From the code, they are Redis and live-integration tests that skip without their variables (I did not list each one). Do not count them as covered.\n- **WebUI tests with short timeouts are flaky.** AppTest allows 3 seconds per run; under the full suite's load, the Kimi login test hit that limit and passed when run alone.\n\n## Practice\n\n1. Nine audio tests fail with `Decoder thread returned error`. What do you check first, and how do you test the hypothesis?\n2. A test shows as `skipped`. Does it count as verified? Why?\n3. Which variable turns on the tests that call the LLM and TTS for real?\n\n> [!faq]- Answer key\n> 1. The ffmpeg version (`ffmpeg -version`). Test it by changing only the binary, for example putting the ffmpeg from `imageio-ffmpeg` on `PATH`, as done here.\n> 2. No. `skipped` means the test did not run. It needs the right variable (Redis, or `MPT_RUN_INTEGRATION_TESTS=1`).\n> 3. `MPT_RUN_INTEGRATION_TESTS=1`, together with the provider credentials.\n\n## Connections\n\n- [[How to contribute]]: the check commands and conventions.\n- [[Branches main and unstable]]: why the fork's CI does not replace local checks.\n- [[Configuration and locks]]: what the configuration tests protect.\n- [[Technical team]]: the `testador` role, which writes the reproduction tests.\n- Canvas: [[00 - Overview.canvas|Canvas]].\n"
    },
    {
     "id": "r1",
     "section": "ref",
     "title": "API routes",
     "tags": [
      "mapa",
      "referencia"
     ],
     "status": "unstable",
     "sources": [
      "app/router.py",
      "app/controllers/ping.py",
      "app/controllers/v1/base.py",
      "app/controllers/v1/video.py",
      "app/controllers/v1/llm.py",
      "app/controllers/base.py",
      "app/asgi.py",
      "app/models/schema.py",
      "app/services/material_upload.py",
      "app/services/bgm.py"
     ],
     "body": "# API routes\n\n[[00 - Index|← Index]]\n\nTable of the program's HTTP routes, with the handler, the authentication and what each route returns. Every `/api/v1/*` route asks for `x-api-key` when `app.api_key` is set.\n\n> [!warning] unstable\n> The `image_motion` field in the body of `POST /api/v1/videos` came from the upstream Turbo v1.3.9 merge. State to be confirmed. The other routes are on `main`.\n\n## Core idea\n\nThere are three groups of routes: **tasks** (create, read, delete), **materials and music** (list and upload files), and **text utilities** (script, terms and metadata, which call the LLM directly with no task). All go through the same `verify_token` (`app/controllers/base.py:47`), except `/ping`.\n\n## How it works\n\nHow the routes are mounted: `app/router.py` includes `ping`, `v1.video` and `v1.llm`. Each `v1` module creates its router with `new_router(dependencies=[Depends(base.verify_token)])` (`app/controllers/v1/base.py`, `video.py:43`, `llm.py:19`), and the `/api/v1` prefix is applied there.\n\n### Route table\n\n| Method | Path | Handler (file:line) | Auth | Response and errors |\n|---|---|---|---|---|\n| GET | `/ping` | `app/controllers/ping.py:12` `ping` | no | `\"pong\"` |\n| POST | `/api/v1/videos` | `video.py:215` `create_video` → `create_task` (`:235`), `stop_at=\"video\"` | `x-api-key` | `200` with `task_id`; `400` validation; `429` queue full |\n| POST | `/api/v1/subtitle` | `video.py:222` `create_subtitle`, `stop_at=\"subtitle\"` | `x-api-key` | same as above |\n| POST | `/api/v1/audio` | `video.py:229` `create_audio`, `stop_at=\"audio\"` | `x-api-key` | same as above |\n| GET | `/api/v1/tasks` | `video.py:285` `get_all_tasks` | `x-api-key` | paginated list; `page` ≥ 1, `page_size` from 1 to 1000 |\n| GET | `/api/v1/tasks/{task_id}` | `video.py:310` `get_task` | `x-api-key` | `200` with the state; `404` if it does not exist |\n| DELETE | `/api/v1/tasks/{task_id}` | `video.py:333` `delete_video` | `x-api-key` | `200`; `404`; `409` if the task is still running |\n| GET | `/api/v1/musics` | `video.py:373` `get_bgm_list` | `x-api-key` | list of local music files |\n| POST | `/api/v1/musics` | `video.py:408` `upload_bgm_file` (multipart, field `file`) | `x-api-key` | `200`; `400` if refused; limit 30 MB (`app/services/bgm.py:255`) |\n| GET | `/api/v1/video_materials` | `video.py:441` `get_video_materials_list` | `x-api-key` | list of files in `storage/local_videos` |\n| POST | `/api/v1/video_materials` | `video.py:477` `upload_video_material_file` (multipart, field `file`) | `x-api-key` | `{\"file\": \"<uuid>.<ext>\"}`; `400` if refused; `500` if validation is unavailable |\n| GET / HEAD | `/api/v1/stream/{file_path}` | `video.py:512` `stream_video` | `x-api-key` | `200` or `206` with a byte range; `416` if the range is invalid |\n| GET / HEAD | `/api/v1/download/{file_path}` | `video.py:578` `download_video` | `x-api-key` | file from `storage/tasks` |\n| POST | `/api/v1/scripts` | `llm.py:27` `generate_video_script` → `llm.generate_script` | `x-api-key` | script; `503` if no LLM is configured |\n| POST | `/api/v1/terms` | `llm.py:49` `generate_video_terms` → `llm.generate_terms` | `x-api-key` | list of terms |\n| POST | `/api/v1/social-metadata` | `llm.py:70` `generate_video_social_metadata` → `llm.generate_social_metadata` | `x-api-key` | title, description and tags |\n\nStatic files, outside the API routes:\n\n| Path | Mount | Auth |\n|---|---|---|\n| `/tasks/*` | `app/asgi.py:309` (`StaticFiles` over `storage/tasks`) | `x-api-key`, through the middleware `protect_generated_task_files` (`app/asgi.py:283`) |\n| `/*` | `app/asgi.py:312` (`StaticFiles` over `resource/public`) | none |\n\n### Body of `POST /api/v1/videos`\n\nThe body follows `TaskVideoRequest` (`app/models/schema.py:263`), which inherits from `VideoParams` (`schema.py:96`). Main fields, with defaults:\n\n| Field | Default | Limits or values |\n|---|---|---|\n| `video_subject` | required | text |\n| `video_script` | `\"\"` | if filled in, the LLM is not called |\n| `video_source` | `\"pexels\"` | `pexels`, `pixabay`, `coverr`, `local`, `wavespeed`, `volcengine_seedance`, `ofox`, `metaso_minimax`, `muapi`, `loomloom`, `openai_image` (`app/services/task.py:97`) |\n| `video_materials` | `null` | list of `{provider, url, duration, source_info}` (`schema.py:86`); for `local`, `url` is the name inside `storage/local_videos` |\n| `video_aspect` | `\"9:16\"` | `9:16`, `16:9`, `1:1` (`schema.py:34`) |\n| `video_count` | `1` | `1` to `5` (`schema.py:266`) |\n| `video_clip_duration` | `5` | `1` to `15` (`schema.py:267`) |\n| `n_threads` | `2` | `1` to `16` (`schema.py:268`) |\n| `voice_name` | `\"\"` | `no-voice` for silent audio |\n| `bgm_type` | `\"random\"` | default background music mode |\n| `bgm_volume` | `0.2` | number |\n| `subtitle_enabled` | `true` | turns subtitles on and off |\n| `font_size` | `60` | integer ≥ 1 |\n| `paragraph_number` | `1` | `1` to `10` |\n| `image_motion` | `\"zoom\"` | `static` or `zoom` (unstable, `schema.py:116`) |\n\nValidation errors in the body become **400**, not 422: `app/asgi.py:67-86` changes the code and returns the first rejected field in the message.\n\n### Response format\n\nEvery JSON response has `status`, `message` and `data` (`schema.py:292`). Task errors put the `request_id` in front of the message, as in `\"<id>: task not found\"`. The `request_id` comes from the `x-task-id` header, or is generated (`app/controllers/base.py:25`).\n\n## Example / walkthrough\n\nTested for this documentation, with `api_key` set in the test `config.toml`:\n\n- `GET /ping` → `200`, no key.\n- `GET /api/v1/tasks/<id>` without a key → `401`; with a wrong key → `401`; with the right key → `404` when the task is not in memory.\n- `GET /tasks/<id>/final-1.mp4` without a key → `401`; with a key → `200`.\n- `POST /api/v1/scripts` with a key, no LLM configured → `503 script generation is unavailable`.\n- `POST /api/v1/videos` with `video_count: 9` → `400`, message `body.video_count: Input should be less than or equal to 5`.\n\nThe full walkthrough is in [[01 - Video via the API]].\n\n## Pitfalls\n\n- **`/ping` does not ask for a key.** It is the only API route without `verify_token`. Do not use it to check authentication.\n- **Creating is not finishing.** `POST /videos` answers `200` before the pipeline runs. A failure shows up later, in `GET /tasks/{id}`.\n- **The browser does not send `x-api-key`.** A direct link to `/tasks/...` with the key enabled returns `401`. The client must send the header (`config.example.toml:34-35`).\n- **`materials` paths come back absolute.** The response of `GET /tasks/{id}` returns `materials` with the server's disk path. Only `videos`, `combined_videos`, `audio_file` and `subtitle_path` become URLs (`video.py:142`).\n\n## Practice\n\n1. Which route does not ask for `x-api-key`, and why?\n2. What does `POST /api/v1/videos` return when the client sends `video_count: 9`? And what happens if the pipeline fails later?\n3. Which HTTP code does `DELETE /api/v1/tasks/{id}` return for a task with `state=4`?\n\n> [!faq]- Answer key\n> 1. `/ping`. It is registered in `app/controllers/ping.py` with a plain router, not `new_router`, so it does not get `verify_token`.\n> 2. `400`, from the schema (`app/models/schema.py:266`). A pipeline failure does not change the creation response: it appears later, in `GET /tasks/{id}`.\n> 3. `409`, `task is still running` (`app/controllers/v1/video.py:345`).\n\n## Connections\n\n- [[Overview]]: the three entry points, with the API among them.\n- [[Entry points]]: what the API validates, compared with the WebUI and the CLI.\n- [[Task state and queue]]: the 404, 409 and 429 codes.\n- [[Configuration and locks]]: `api_key` and the allowed paths.\n- [[CLI flags]]: the same fields, from the command line.\n- [[01 - Video via the API]]: the walkthrough with a real response.\n"
    },
    {
     "id": "r2",
     "section": "ref",
     "title": "CLI flags",
     "tags": [
      "mapa",
      "referencia"
     ],
     "status": "unstable",
     "sources": [
      "cli.py",
      "app/models/schema.py",
      "app/services/task.py",
      "app/config/config.py"
     ],
     "body": "# CLI flags\n\n[[00 - Index|← Index]]\n\nThe flags of `cli.py`, grouped the way the parser groups them, with defaults taken from the real `--help` output, the exit codes and the batch limits.\n\n> [!warning] unstable\n> The `--image-motion` flag (`cli.py:444`) came from the upstream Turbo v1.3.9 merge. State to be confirmed. The other flags are on `main`.\n\n## Core idea\n\nThe CLI accepts the same task settings as the API, but as flags. The accepted values are fixed by constants in `cli.py` itself (`_PIPELINE_STAGES` at `cli.py:33`, `_CLI_VIDEO_SOURCES` at `cli.py:40`). When a flag is not passed, the value comes from `[ui]` in `config.toml`, or from the schema default, as noted on each line.\n\n## How it works\n\nHow to read the tables. The value in parentheses is the default shown by `--help`. When the default says \"`[ui]`…\", the value comes from `config.toml`, section `[ui]`. When there is no value in `[ui]`, the second value cited applies.\n\n### Content (script)\n\n| Flag | Default | Note |\n|---|---|---|\n| `--video-subject TEXT` | `\"\"` | required, unless `--video-script` is given (`cli.py:724`) |\n| `--video-script TEXT` | `\"\"` | full script; skips LLM script generation |\n| `--video-terms LIST` | generated | comma-separated terms |\n| `--video-language CODE` | auto-detect | e.g. `zh-CN`, `en-US` |\n| `--paragraph-number N` | `1` | from 1 to 10 (`cli.py:79`) |\n| `--video-script-prompt TEXT` | none | extra requirements for the LLM |\n| `--custom-system-prompt TEXT` | none | replaces the default LLM system prompt |\n\n### Material and pipeline\n\n| Flag | Default | Note |\n|---|---|---|\n| `--video-source` | `pexels` | `pexels`, `pixabay`, `coverr`, `wavespeed`, `volcengine_seedance`, `ofox`, `metaso_minimax`, `muapi`, `openai_image`, `local` (`cli.py:40-50`). Does not include `loomloom` |\n| `--video-materials PATH[,PATH...]` | `\"\"` | for `local`: comma-separated images or videos |\n| `--stop-at STEP` | `video` | `script`, `terms`, `audio`, `subtitle`, `materials`, `video` (`cli.py:33`). Applies to the whole batch |\n| `--confirm-wavespeed-charge` | off | confirms the WaveSpeed charge |\n| `--confirm-seedance-charge` | off | confirms the Seedance charge |\n| `--confirm-ofox-charge` | off | confirms the OFox charge |\n| `--confirm-metaso-minimax-charge` | off | confirms the Metaso MiniMax charge |\n| `--confirm-muapi-charge` | off | confirms the MuAPI charge |\n\nRefused combination: `--video-source local` with `--stop-at terms` exits with 2 (`cli.py:726`).\n\n### Video\n\n| Flag | Default | Note |\n|---|---|---|\n| `--video-count N` | `1` | minimum 1; the CLI has no upper limit, but the API caps it at 5 |\n| `--video-aspect` | `9:16` | `9:16`, `16:9`, `1:1` |\n| `--video-fit-mode` | `cover` | `cover` or `contain` (black bars) |\n| `--video-concat-mode` | `random` | `random` or `sequential` |\n| `--image-motion` | `zoom` | `static` or `zoom`; motion for images (unstable) |\n| `--video-transition-mode` | `none` | `shuffle`, `fade-in`, `fade-out`, `slide-in`, `slide-out`, `zoom-in`, `zoom-out` |\n| `--video-clip-duration S` | `5` | maximum seconds per clip, minimum 1 |\n| `--video-clip-speed V` | `1.0` | from 0.5 to 2.0 |\n| `--match-materials-to-script` | off | `--no-match-materials-to-script` turns it off; enables 8 terms instead of 5 |\n| `--n-threads N` | `2` | FFmpeg threads, minimum 1 |\n\n### Audio and music\n\n| Flag | Default | Note |\n|---|---|---|\n| `--voice-name` | `[ui].voice_name`, else `zh-CN-XiaoxiaoNeural-Female` | `no-voice` for silent audio; prefixes `gemini:`, `mimo:`, `elevenlabs:`, `chatterbox:`, `kokoro:`, `voxcpm:` |\n| `--voice-volume V` | `[ui].voice_volume`, else `1.0` | number ≥ 0 |\n| `--voice-rate V` | `[ui].voice_rate`, else `1.0` | number > 0 |\n| `--custom-audio-file PATH` | none | MP3, WAV, M4A, AAC, FLAC or OGG. Skips TTS. A relative path is resolved from the current directory |\n| `--bgm-type` | `random` | `none`, `random`, `custom`, `sonilo`, `elevenlabs` |\n| `--sonilo-bgm-prompt TEXT` | empty | legacy; up to 2000 characters |\n| `--video-music-prompt TEXT` | empty | prompt for the chosen music provider (`sonilo` or `elevenlabs`) |\n| `--bgm-file NAME` | none | file inside `storage/bgm` or `resource/songs` |\n| `--bgm-volume V` | `0.2` | number ≥ 0 |\n\n### Subtitles\n\n| Flag | Default | Note |\n|---|---|---|\n| `--subtitle-enabled` / `--no-subtitle-enabled` | `[ui].subtitle_enabled`, else on | turns subtitles on or off |\n| `--font-name FILE` | `[ui].font_name`, else `STHeitiMedium.ttc` | file inside `resource/fonts` |\n| `--subtitle-position` | `[ui].subtitle_position`, else `bottom` | `top`, `center`, `bottom`, `two_thirds_bottom`, `custom` |\n| `--subtitle-display-mode` | `[ui]`, else `sentence` | `sentence` or `word_by_word` |\n| `--subtitle-animation` | `[ui]`, else `none` | `none` or `pop_spring` |\n| `--custom-position P` | `[ui]`, else `70` | 0 to 100; used with `--subtitle-position custom` |\n| `--text-fore-color #RRGGBB` | `[ui]`, else `#FFFFFF` | quote it in the shell |\n| `--font-size N` | `[ui]`, else `60` | integer |\n| `--stroke-color #RRGGBB` | `[ui]`, else `#000000` | outline colour |\n| `--stroke-width N` | `[ui]`, else `1.5` | number ≥ 0 |\n| `--subtitle-background-enabled` / `--no-...` | `[ui]`, else off | background behind the subtitle |\n| `--subtitle-background-color #RRGGBB` | `[ui]` | background colour |\n| `--rounded-subtitle-background` / `--no-...` | `[ui]`, else off | rounded background corners |\n\n### Execution\n\n| Flag | Default | Note |\n|---|---|---|\n| `--task-id UUID` | generated | name of the folder in `storage/tasks/`. Cannot be combined with `--batch-file` |\n| `--batch-file PATH` | none | JSON (array) or JSONL. At most 100 tasks and 1 MiB (`cli.py:35-36`). Each object overrides `VideoParams` fields; an unknown field is refused |\n\n## Example / walkthrough\n\nA real command, run for this documentation:\n\n```sh\nuv run python cli.py \\\n  --video-script \"Este é um roteiro de teste para o percurso pelo CLI.\" \\\n  --voice-name no-voice --video-source local \\\n  --video-materials \"./clip.mp4\" --stop-at video\n```\n\nExit 0, on stdout: `{\"task_id\": \"...\", \"result\": {\"videos\": [...], \"combined_videos\": [...], \"script\": \"...\", \"terms\": \"\", \"audio_file\": \"...\", \"audio_duration\": 8, \"subtitle_path\": \"...\", \"materials\": [...], \"cross_post_state\": null, ...}}`. See [[02 - Video via the CLI]].\n\n### Exit codes\n\n| Code | When | Stdout |\n|---|---|---|\n| `0` | task finished (or batch with no failures) | JSON with `task_id` and `result`. In a batch, a summary |\n| `1` | pipeline failure or unexpected exception; in a batch, at least one task failed (`cli.py:1732`) | nothing, or the partial JSON if `videos` already exist (`cli.py:1788`) |\n| `2` | invalid argument (argparse), refused combination, invalid manifest | nothing |\n\nLogs go to stderr (`cli.py:1742`). Stdout only carries JSON.\n\n### Batch summary format\n\n`total`, `succeeded`, `failed` and `tasks`. Each entry in `tasks` has `index`, `task_id`, `status`, `result`, `failed_stage` and `error`.\n\n## Pitfalls\n\n- **No `video_count` ceiling in the CLI.** The API refuses more than 5. The CLI accepts any integer of 1 or more. That is a gap between the two entry points.\n- **`--stop-at` belongs to the batch, not to each task.** A manifest object cannot set `stop_at`.\n- **`--custom-audio-file` skips TTS.** For subtitles over that audio, use `subtitle_provider=whisper`, which is a global setting.\n- **Defaults depend on `config.toml`.** Two machines with different `[ui]` sections make different videos from the same command. Run `--help` on your own setup to see the real defaults.\n\n## Practice\n\n1. Which exit code does the CLI use when an argument never reaches the pipeline?\n2. With `--video-source local`, what can go into `--video-materials`, and what happens to a file outside `storage/local_videos`?\n3. How many tasks can a `--batch-file` hold, and which flag cannot be combined with it?\n\n> [!faq]- Answer key\n> 1. Exit 2. This covers argparse errors, the missing subject (`cli.py:724`) and an invalid manifest (`cli.py:1748`).\n> 2. Paths to images or videos, separated by commas. A file outside `storage/local_videos` is copied there with a `cli-material-<hex>` name (`cli.py:1597`).\n> 3. Up to 100 tasks and 1 MiB (`cli.py:35-36`). It cannot be combined with `--task-id` (`cli.py:701-715`).\n\n## Connections\n\n- [[Overview]]: the CLI is one of the three entry points.\n- [[Pipeline and stop_at]]: what each `--stop-at` value stops.\n- [[Entry points]]: the comparison between CLI, API and WebUI.\n- [[Configuration keys]]: the `[ui]` keys that provide the defaults.\n- [[API routes]]: the same fields, through the JSON body.\n- Canvas: [[02 - Entry points.canvas|Canvas]].\n"
    },
    {
     "id": "r3",
     "section": "ref",
     "title": "Configuration keys",
     "tags": [
      "mapa",
      "referencia"
     ],
     "status": "unstable",
     "sources": [
      "config.example.toml",
      "app/config/config.py",
      "app/services/task.py",
      "app/services/voice.py",
      "app/services/ofox.py",
      "app/services/muapi.py",
      "app/services/volcengine_seedance.py",
      "app/services/loomloom.py",
      "app/models/llm_provider.py",
      "app/services/upload_post.py"
     ],
     "body": "# Configuration keys\n\n[[00 - Index|← Index]]\n\nReference for the sections and keys of `config.example.toml`, what each one controls and which ones are secrets. Line numbers refer to the example file.\n\n> [!warning] unstable\n> The `[diagnostics]` section (`config.example.toml:14-24`, key `log_requests`) and the EmpirioLabs provider (`config.example.toml:325-329`) came from the upstream Turbo v1.3.9 merge. State to be confirmed. The other keys are on `main`.\n\n## Core idea\n\n`config.toml` is a copy of the example, created on the first run. Each section goes to a different place in the code. Most `[app]` keys belong to a provider: one API key, one URL and one model, per provider. One rule: secrets stay in `config.toml` only, never in git (`.gitignore:2`).\n\n## How it works\n\n### Sections\n\n| Section | Line | Controls | Secrets |\n|---|---|---|---|\n| (top) | `:9-12` | `log_level`, `listen_host` (default `0.0.0.0`), `listen_port` (`8080`) | no |\n| `[diagnostics]` | `:14` | `log_requests` (request tracing, unstable) | no |\n| `[app]` | `:26` | everything else: API, materials, LLM, TTS, queue, Redis, publishing | yes, many |\n| `[whisper]` | `:609` | Whisper subtitles: `model_size`, `device`, `compute_type` | no |\n| `[proxy]` | `:626` | proxy for Pexels, Pixabay, Coverr and material downloads. `http` and `https` keys commented out in the example | the URL can carry a username and password |\n| `[azure]` | `:637` | Azure v2 voice: `speech_key`, `speech_region` | `speech_key` |\n| `[siliconflow]` | `:643` | SiliconFlow voice | `api_key` |\n| `[minimax_tts]` | `:647` | MiniMax voice | `api_key` |\n| `[elevenlabs]` | `:665` | ElevenLabs voice and music | `api_key` |\n| `[chatterbox]` | `:678` | Chatterbox voice (your own server) | `api_key` |\n| `[kokoro]` | `:687` | Kokoro voice (your own server) | `api_key` |\n| `[fish_audio]` | `:697` | Fish Audio voice | `api_key` |\n| `[voxcpm]` | `:722` | VoxCPM voice, with cloning from reference audio | `api_key` |\n| `[ui]` | `:736` | WebUI preferences (`hide_log`, `open_task_folder_on_completion`) | no |\n\nThe example's `[ui]` section has only two keys. The WebUI writes others (voice, subtitles, font and colours) into the real `config.toml`, and the CLI reads the same keys as defaults (see [[CLI flags]]).\n\n### `[app]` keys by group\n\n| Group | Keys (line) |\n|---|---|\n| API access | `api_key` (38), `endpoint` (557) |\n| WebUI behaviour | `hide_config` (46), `script_generation_backend` (51) |\n| Network and TTS | `tls_verify` (71), `edge_tts_timeout` (67) |\n| Default materials | `video_source` (90), `match_materials_to_script` (236), `material_directory` (562) |\n| Pexels, Pixabay, Coverr | `pexels_api_keys` (97), `pixabay_api_keys` (100), `coverr_api_keys` (103) |\n| WaveSpeed | `wavespeed_api_keys` (107) |\n| Volcengine Seedance | `volcengine_seedance_api_key` (125), `_base_url` (126), `_model` (129), `_resolution` (130), `_min_duration` (131), `_max_duration` (132), `_poll_interval` (133), `_run_timeout` (134), `_watermark` (135) |\n| OFox | `ofox_api_key` (142), `_base_url` (143), `_text_to_video_model` (145), `_resolution` (149), `_min_duration` (154), `_max_duration` (155), `_provider` (168), `_poll_interval` (169), `_run_timeout` (170) |\n| MuAPI | `muapi_api_key` (177), `_base_url` (178), `_video_endpoint` (180), `_resolution` (181), `_min_duration` (182), `_max_duration` (183), `_poll_interval` (184), `_run_timeout` (185) |\n| Metaso MiniMax | `metaso_minimax_api_key` (192), `_base_url` (193), `_resolution` (194), `_poll_interval` (195), `_run_timeout` (196) |\n| OpenAI image | `openai_image_base_url` (205), `openai_image_api_keys` (208), `openai_image_model` (211), `_size` (217), `_prompt_template` (221) |\n| TwelveLabs | `twelvelabs_api_keys` (226), `twelvelabs_rerank_terms` (229); model keys `twelvelabs_marengo_model` and `twelvelabs_pegasus_model` commented out (231-232) |\n| Sonilo music | `sonilo_api_key` (241), `sonilo_base_url` (242), `sonilo_timeout` (244) |\n| LoomLoom | `loomloom_base_url` (58), `loomloom_api_token` (59), `loomloom_request_timeout_seconds` (60), `loomloom_poll_interval_seconds` (61), `loomloom_run_timeout_seconds` (62), `loomloom_video_run_timeout_seconds` (63) |\n| LLM provider | `llm_provider` (253); per-provider keys in the table below |\n| Claude Code and Kimi | `claude_code_model_name` (468), `claude_code_cli_path` (469), `claude_code_timeout` (470), `kimi_code_model_name` (479), `kimi_code_timeout` (480) |\n| Ollama and LiteLLM | `ollama_base_url` (453), `ollama_model_name` (454), `litellm_model_name` (492) |\n| Subtitles | `subtitle_provider` (516), default `edge` |\n| Extra TTS | `mimo_tts_model_name` (510), `mimo_tts_style_prompt` (511) |\n| Queue and Redis | `enable_redis` (566), `redis_host` (567), `redis_port` (568), `redis_db` (569), `redis_password` (570), `max_concurrent_tasks` (573), `max_queued_tasks` (574) |\n| Publishing | `upload_post_enabled` (583), `upload_post_api_key` (584), `upload_post_username` (585), `upload_post_platforms` (587), `upload_post_auto_upload` (589), `upload_post_youtube_privacy_status` (591), `upload_post_youtube_made_for_kids` (598), `upload_post_max_pending_tasks` (603) |\n\n### LLM providers\n\nEach provider uses three keys with the same prefix: `<id>_api_key`, `<id>_base_url` and `<id>_model_name`. The name is chosen by `llm_provider` (`config.example.toml:253`). The provider registry is in `app/models/llm_provider.py`.\n\n| Provider | `api_key` | `base_url` | `model_name` |\n|---|---|---|---|\n| moonshot (default) | 257 | 258 | 259 |\n| shengsuanyun | 263 | 264 | 265 |\n| apimart | 270 | 271 | 272 |\n| fluxionai | 277 | 278 | 279 |\n| cheaperinference | 284 | 285 | 286 |\n| requesty | 292 | 293 | 294 |\n| futureinfra | 299 | 300 | 301 |\n| yapi | 306 | 307 | 308 |\n| opper | 313 | 314 | 315 |\n| onomeo | 320 | 321 | 322 |\n| empiriolabs (unstable) | 327 | 328 | 329 |\n| openai | 333 | 334 | 335 |\n| anthropic | 339 | 340 | 341 |\n| gemini | 345 | — | 346 |\n| muse_spark | 350 | 351 | 352 |\n| deepseek | 356 | 357 | 358 |\n| qwen | 362 | — | 363 |\n| azure | 367 | 368 | 369 (plus `azure_api_version`, 370) |\n| volcengine | 374 | 375 | 376 |\n| grok | 380 | 381 | 382 |\n| minimax | 387 | 388 | 389 |\n| mimo | 393 | 394 | 395 |\n| iflytek | 401 | 402 | 403 |\n| cloudflare | 408 | — | 411 (plus `cloudflare_account_id` 409 and `cloudflare_gateway_id` 410) |\n| modelscope | 415 | 416 | 417 |\n| aihubmix | 421 | 422 | 423 |\n| aimlapi | 427 | 428 | 429 |\n| evolink | 433 | 434 | 435 |\n| openrouter | 440 | 441 | 442 |\n| api_route | 447 | 448 | 449 |\n| oneapi | 484 | 485 | 486 |\n| groq | 496 | 497 | 498 |\n| pollinations | 501 | 502 | 503 |\n| ollama (no key) | — | 453 | 454 |\n| claude_code (subscription) | — | — | 468 (plus CLI path at 469, timeout at 470) |\n| kimi_code (OAuth login) | — | — | 479 (plus timeout at 480) |\n| litellm (uses environment variables) | — | — | 492 |\n\n### Secrets\n\nFilled in only in the real `config.toml`:\n\n- `[app]`: `api_key` (38), `loomloom_api_token` (59), `pexels_api_keys` (97), `pixabay_api_keys` (100), `coverr_api_keys` (103), `wavespeed_api_keys` (107), `volcengine_seedance_api_key` (125), `ofox_api_key` (142), `muapi_api_key` (177), `metaso_minimax_api_key` (192), `openai_image_api_keys` (208), `twelvelabs_api_keys` (226), `sonilo_api_key` (241), `redis_password` (570), `upload_post_api_key` (584);\n- the `*_api_key` keys of every LLM provider listed above;\n- voice sections: `[azure] speech_key` (640), `[siliconflow] api_key` (645), `[minimax_tts] api_key` (653), `[elevenlabs] api_key` (668), `[chatterbox] api_key` (682), `[kokoro] api_key` (691), `[fish_audio] api_key` (701), `[voxcpm] api_key` (728).\n\nKimi login tokens (`kimi_code_access_token`, `kimi_code_refresh_token`) do not appear in the example; the login writes them to `config.toml` (`config.example.toml:475`).\n\n## Example / walkthrough\n\nTo switch the default LLM to DeepSeek, edit two keys in `[app]` and restart the process:\n\n```toml\nllm_provider = \"deepseek\"        # config.example.toml:253\ndeepseek_api_key = \"sk-...\"      # line 356 of the example\n```\n\n`deepseek_model_name` (358) is empty in the example, so fill in the model you want. Without a restart, the API process keeps the old configuration, because `config.toml` is read at import (see [[Configuration and locks]]).\n\n## Pitfalls\n\n- **`tls_verify` is one key shared by three providers.** There is no per-provider switch. Ofox, MuAPI and Seedance all read the same `[app]` key (`app/services/ofox.py:157`, `muapi.py:139`, `volcengine_seedance.py:142`), with default `true`. There is no way to turn verification off for one of them only.\n- **`redis_password` is plain text.** Redis must sit on a private network. The code trusts what comes back from Redis (`app/services/state.py:300`).\n- **The example does not have every `[ui]` key.** The real defaults come from what the WebUI writes. An older `config.toml` may differ from the example.\n- **The example has empty keys.** Only the real `config.toml` should hold real values. `.gitignore` covers that file (`.gitignore:2`).\n\n## Practice\n\n1. What is the API key name for the OpenAI provider, and on which line of the example is it?\n2. Which section holds the voice API key for ElevenLabs, and does the music feature use the same key?\n3. If you want to turn off TLS verification only for OFox, what does the configuration let you do?\n\n> [!faq]- Answer key\n> 1. `openai_api_key`, line 333 of `config.example.toml`. The provider is chosen by `llm_provider`.\n> 2. `[elevenlabs] api_key` (line 668). Music uses the same section, with `music_base_url` (674) and `music_model_id` (675).\n> 3. Not possible. `tls_verify` is one key in `[app]` (`config.example.toml:71`), also read by MuAPI and Seedance. Turning it off affects all three, so do it only on a trusted network.\n\n## Connections\n\n- [[Configuration and locks]]: how the file is read, written and protected.\n- [[CLI flags]]: the `[ui]` defaults that the CLI reuses.\n- [[Pipeline and stop_at]]: which providers run in each step.\n- [[Entry points]]: who uses `api_key` and who does not.\n- Canvas: [[03 - Integrations.canvas|Canvas]].\n"
    },
    {
     "id": "r4",
     "section": "ref",
     "title": "Providers and adapters",
     "tags": [
      "mapa",
      "integracoes"
     ],
     "status": "unstable",
     "sources": [
      "app/models/llm_provider.py",
      "app/services/llm.py",
      "app/services/voice.py",
      "app/services/material.py",
      "app/services/bgm.py",
      "app/services/upload_post.py",
      "config.example.toml"
     ],
     "body": "# Providers and adapters\n\n[[00 - Index|← Index]]\n\nReference tables. The LLM table was **generated** from `LLM_PROVIDER_REGISTRY` with `PYTHONPATH=<worktree> python3 -c \"from app.models.llm_provider import LLM_PROVIDER_REGISTRY ...\"`, not typed by hand. Total: 37 providers. The explanation is in [[LLM providers]].\n\n## LLM adapters\n\n| Adapter | Providers | Branch in `llm.py` |\n|---|---|---|\n| `openai_compatible` | 29 | default, `llm.py:754` |\n| `gemini` | `gemini` | `:423` |\n| `qwen` | `qwen` | `:397` |\n| `azure` | `azure` | `:516` |\n| `cloudflare_ai_gateway` | `cloudflare` | `:473` |\n| `modelscope` | `modelscope` | `:725` |\n| `litellm` | `litellm` | `:494` |\n| `claude_code` | `claude_code` | `:545` |\n| `kimi_code` | `kimi_code` | `:666` |\n\n## LLM providers (full registry)\n\nColumns: `Default base URL` shows the registry's `effective_default_base_url`. Where there are regions, the region ids are listed. `Where the key lives` is the key in `[app]` of `config.example.toml`.\n\n| provider_id | Name | Adapter | Needs key? | Default base URL | Where the key lives |\n|---|---|---|---|---|---|\n| `moonshot` | Kimi / Moonshot AI | `openai_compatible` | yes | https://api.moonshot.cn/v1 (regions: china, global) | moonshot_api_key |\n| `kimi_code` | Kimi Code (Kimi subscription) | `kimi_code` | no | https://api.kimi.com/coding/v1 (regions: china, global) | OAuth: kimi_code_access_token/refresh/expires/region |\n| `openai` | OpenAI | `openai_compatible` | yes | https://api.openai.com/v1 | openai_api_key |\n| `anthropic` | Anthropic Claude | `openai_compatible` | yes | https://api.anthropic.com/v1/ | anthropic_api_key |\n| `gemini` | Google Gemini | `gemini` | yes | — | gemini_api_key |\n| `muse_spark` | Muse Spark | `openai_compatible` | yes | https://api.meta.ai/v1 | muse_spark_api_key |\n| `deepseek` | DeepSeek | `openai_compatible` | yes | https://api.deepseek.com | deepseek_api_key |\n| `qwen` | Alibaba Cloud Qwen | `qwen` | yes | — | qwen_api_key |\n| `azure` | Microsoft Azure OpenAI | `azure` | yes | — | azure_api_key |\n| `volcengine` | ByteDance VolcEngine Ark | `openai_compatible` | yes | https://ark.cn-beijing.volces.com/api/v3 | volcengine_api_key |\n| `grok` | xAI Grok | `openai_compatible` | yes | https://api.x.ai/v1 | grok_api_key |\n| `minimax` | MiniMax | `openai_compatible` | yes | https://api.minimax.io/v1 | minimax_api_key |\n| `mimo` | Xiaomi MiMo | `openai_compatible` | yes | https://api.xiaomimimo.com/v1 | mimo_api_key |\n| `iflytek` | iFlytek Spark (Astron MaaS) | `openai_compatible` | yes | https://maas-api.cn-huabei-1.xf-yun.com/v2 | iflytek_api_key |\n| `shengsuanyun` | Shengsuan Cloud | `openai_compatible` | yes | https://router.shengsuanyun.com/api/v1 | shengsuanyun_api_key |\n| `apimart` | APIMart | `openai_compatible` | yes | https://api.apimart.ai/v1 | apimart_api_key |\n| `cloudflare` | Cloudflare AI Gateway | `cloudflare_ai_gateway` | yes | — | cloudflare_api_key + cloudflare_account_id + cloudflare_gateway_id |\n| `modelscope` | Alibaba ModelScope | `modelscope` | yes | https://api-inference.modelscope.cn/v1/ | modelscope_api_key |\n| `aihubmix` | AIHubMix | `openai_compatible` | yes | https://aihubmix.com/v1 | aihubmix_api_key |\n| `aimlapi` | AIML API | `openai_compatible` | yes | https://api.aimlapi.com/v1 | aimlapi_api_key |\n| `evolink` | EvoLink | `openai_compatible` | yes | https://direct.evolink.ai/v1 | evolink_api_key |\n| `openrouter` | OpenRouter | `openai_compatible` | yes | https://openrouter.ai/api/v1 | openrouter_api_key |\n| `api_route` | API Route | `openai_compatible` | yes | https://www.api-route.com/v1 | api_route_api_key |\n| `fluxionai` | Fluxion AI | `openai_compatible` | yes | https://fluxionai.space/v1 | fluxionai_api_key |\n| `cheaperinference` | Cheaper Inference | `openai_compatible` | yes | https://api.cheaperinference.com/v1 | cheaperinference_api_key |\n| `requesty` | Requesty | `openai_compatible` | yes | https://router.requesty.ai/v1 | requesty_api_key |\n| `futureinfra` | FutureInfra | `openai_compatible` | yes | https://futureinfra.ai/v1/ai | futureinfra_api_key |\n| `yapi` | Y-API | `openai_compatible` | yes | https://api.y-api.bestvirtualgoods.com/v1 | yapi_api_key |\n| `opper` | Opper | `openai_compatible` | yes | https://api.opper.ai/v3/compat | opper_api_key |\n| `onomeo` | onomeo | `openai_compatible` | yes | https://onomeo.com/v1 | onomeo_api_key |\n| `empiriolabs` | EmpirioLabs AI | `openai_compatible` | yes | https://api.empiriolabs.ai/v1 | empiriolabs_api_key |\n| `ollama` | Ollama | `openai_compatible` | no | — (detected at run time) | not used (api_key fixed to \"ollama\") |\n| `claude_code` | Claude Code (Claude subscription) | `claude_code` | no | — | not used (logged-in CLI) |\n| `oneapi` | OneAPI | `openai_compatible` | yes | — | oneapi_api_key |\n| `litellm` | LiteLLM | `litellm` | no | — | env (e.g. OPENAI_API_KEY); no key in [app] |\n| `groq` | Groq | `openai_compatible` | yes | https://api.groq.com/openai/v1 | groq_api_key |\n| `pollinations` | Pollinations AI | `openai_compatible` | yes | https://gen.pollinations.ai/v1 | pollinations_api_key |\n\n> [!warning] unstable\n> The `empiriolabs` row came from the upstream Turbo v1.3.9 merge (commit 0dc4e20). State on `main` to be confirmed.\n\n## Voices (TTS)\n\nRouting in `_single_tts` (`app/services/voice.py:640`), by voice name prefix.\n\n| Prefix | Function | Key in config |\n|---|---|---|\n| (default, Edge/Azure v1) | `azure_tts_v1` (`voice.py:1535`) | `edge_tts_timeout` |\n| `-V2` | `azure_tts_v2` (`:1784`) | `[azure]` speech_key, speech_region |\n| `siliconflow:` | `siliconflow_tts` (`:1604`) | `[siliconflow]` api_key |\n| `gemini:` | `gemini_tts` (`:1913`) | `gemini_api_key` |\n| `mimo:` | `mimo_tts` (`:2055`) | mimo_api_key, mimo_base_url, mimo_tts_model_name |\n| `minimax:` | `minimax_tts` (`:2380`) | `[minimax_tts]` |\n| `elevenlabs:` | `elevenlabs_tts` (`:2473`) | `[elevenlabs]` api_key |\n| `chatterbox:` | `chatterbox_tts` (`:2766`) | `[chatterbox]` |\n| `kokoro:` | `kokoro_tts` (`:2808`) | `[kokoro]` |\n| `fish_audio:` | `fish_audio_tts` (`:2862`) | `[fish_audio]` or `FISH_API_KEY` |\n| `voxcpm:` | `voxcpm_tts` (`:3210`) | `[voxcpm]` |\n| `no-voice` | `generate_silent_audio` (`:593`) | none |\n\n## Video material\n\n| Source (`video_source`) | Module and function | Key | Authentication |\n|---|---|---|---|\n| `pexels` | `material.py` `search_videos_pexels` (`:341`) | `pexels_api_keys` | header |\n| `pixabay` | `search_videos_pixabay` (`:448`) | `pixabay_api_keys` | query string |\n| `coverr` | `search_videos_coverr` (`:590`) | `coverr_api_keys` | Bearer (`material.py:615`) |\n| `wavespeed` | `generate_videos_wavespeed` (`:805`) | `wavespeed_api_keys` | key |\n| `volcengine_seedance` | `volcengine_seedance.py` | `volcengine_seedance_api_key` (env `VOLCENGINE_ARK_API_KEY`) | Bearer |\n| `ofox` | `ofox.py` | `ofox_api_key` (env `OFOX_API_KEY`) | Bearer |\n| `muapi` | `muapi.py` | `muapi_api_key` (env `MUAPI_API_KEY`) | `x-api-key` |\n| `metaso_minimax` | `metaso_minimax.py` | `metaso_minimax_api_key` | Bearer |\n| `openai_image` | `generate_images_openai` (`:1677`) | `openai_image_base_url`, `openai_image_api_keys` (optional) | Bearer (optional) |\n| `loomloom` (WebUI only) | `loomloom.py` | `loomloom_api_token` (falls back to `shengsuanyun_api_key`) | Bearer, confirmed quote |\n| `local` | `video.preprocess_video` (`app/services/video.py:1955`) | none | — |\n\nTwelveLabs (optional term reranking): `twelvelabs_api_keys`, `twelvelabs_marengo_model`, `twelvelabs_pegasus_model`.\n\n## Music and publishing\n\n| Service | Module | Key | Note |\n|---|---|---|---|\n| Sonilo | `app/services/sonilo.py` | `sonilo_api_key`, env `SONILO_API_KEY` | prompt up to 2000 characters |\n| ElevenLabs Music | `app/services/elevenlabs_music.py` | `[elevenlabs] api_key` | `music_model_id = \"music_v2\"`, prompt up to 1000 characters |\n| upload-post | `app/services/upload_post.py` (`API_BASE`, `:24`) | `upload_post_api_key`, `upload_post_username` | `Authorization: Apikey ...` |\n\n## Connections\n\n- [[LLM providers]] — how the registry works.\n- [[Subscriptions instead of keys]] — `claude_code` and `kimi_code`.\n- [[Voice and subtitles]], [[Video material]] and [[Music and publishing]] — the stages that use these tables.\n- [[Configuration keys]] — the full list of keys in `[app]`.\n- [[03 - Integrations.canvas|Canvas]]\n"
    },
    {
     "id": "r5",
     "section": "ref",
     "title": "Agent JSON contracts",
     "tags": [
      "mapa",
      "referencia"
     ],
     "status": "stable",
     "sources": [
      ".agents/pipeline.md",
      ".agents/skills/video/scripts/srt_to_timing.py",
      ".agents/skills/video/scripts/build_timeline.py",
      ".agents/skills/video/scripts/build_music.py",
      ".agents/skills/video/scripts/build_thumbnail.py",
      ".agents/skills/video/scripts/arte.py"
     ],
     "body": "# Agent JSON contracts\n\n[[00 - Index|← Index]]\n\nThe five JSON files the video team roles exchange: `sources.json`, `timing.json`, `shotlist.json`, `music.json` and `arte.json`. The **Read by script** column shows what the code actually uses. The rest is read only by the agents.\n\n## Core idea\n\nThe contracts are the interface between roles. The text of `pipeline.md` is the specification. The scripts are the proof of what is really read. A field can exist in the specification and have no reader in the code: in that case, an agent interprets it, not a script.\n\n## How it works\n\n### `sources.json` (written by `pesquisador`; read by cacador, editor, auditor and diretor de arte)\n\nA list of candidate videos or images. See the example in `pipeline.md:61-66`.\n\n| Field | Type | Optional | Values or format | Read by script |\n|---|---|---|---|---|\n| `id` | text | no | source id (e.g. a YouTube id) | no |\n| `url` | text | no | link to the source | no (`build_timeline` uses the shotlist `url`) |\n| `type` | text | no | `video`, `image`, `stock`, `chart`, `user` | no |\n| `channel` | text | no | channel or author name | no |\n| `license` | text | no | e.g. `terceiro (trecho curto)`, `domínio público`, `CC-BY`, `stock` | no |\n| `duration` | text | no | `m:ss` | no |\n| `covers` | list of text | no | which script block the source fits | no |\n| `platform` | text | yes | `youtube`, `x`, `tiktok`, `instagram`, `reddit` | no |\n| `author` | text | yes | `@handle` | no |\n| `posted_at` | text | yes | `YYYY-MM-DD` | no |\n| `via` | text | yes | `mcp:yt-dlp`, `mcp:reddit`, `mcp:apify`, `yt-dlp`, `web` | no |\n\nThe example in `pipeline.md:57-66` shows the fields; `pipeline.md:58-59` marks `platform`, `author`, `posted_at` and `via` as optional. No script reads the file.\n\n### `timing.json` (written by `srt_to_timing.py`, from the subtitles; read by cacador, animador, `build_music`, redator)\n\nA list, one item per subtitle line (`srt_to_timing.py:18-35`).\n\n| Field | Type | Notes |\n|---|---|---|\n| `n` | integer | starts at 1 |\n| `start` | number, seconds | 3 decimal places |\n| `end` | number, seconds | 3 decimal places |\n| `text` | text | the subtitle lines joined with a space |\n\nWritten with `json.dump(..., ensure_ascii=False, indent=1)` (`srt_to_timing.py:42-43`).\n\n### `shotlist.json` (written by `cacador-de-clipes`; read by animador, editor, `build_timeline`, critico and auditor)\n\nA list, one item per scene. `dur` is the start of the next scene minus the start of this one (`pipeline.md:74`). The sum of the durations must be at least the audio length.\n\n| Field | Type | Read by `build_timeline` | Notes |\n|---|---|---|---|\n| `n` | text or integer | yes | normalized to two digits (`build_timeline.py:212`) |\n| `dur` | number, seconds | yes | exact clip length |\n| `kind` | text | yes | `fill`, `window`, `fit`, `image`; aliases `game` and `vert` (fill), `gta` (window), `app` (fit, zoom 0.62) (`:39`) |\n| `file` + `ss` | text + number | yes | local source; `ss` is the start point in the file, default 0 |\n| `url` + `start` | text + number | yes | online source; downloads from `start - 1` to `start + dur + 1` |\n| `source` | text | yes | `youtube:<id>`, an alternative to `url` |\n| `x`, `y` | number (0–1) | yes | focus point for `fill` and `image`; default 0.5 |\n| `top` | number | yes | `window` only; default 0.05 |\n| `zoom` | number (0–1) | yes | `fit` (centre band) and `image` (final zoom; default 1.15) |\n| `crop` | text | yes | ffmpeg crop filter, `fit` only |\n| `motion` | boolean | yes | `fit` with an image only; default true (see the unstable note) |\n| `text` | text | yes | on-screen text; `\\n` breaks the line |\n| `text_pos` | text | yes | `top`, `center` or `bottom`; default `top` |\n| `anim` | text | no | Remotion composition id; the animador reads it |\n| `props` | object | no | extra parameters for the animador |\n| `phrases` | list of integers | no | phrases covered; for the agent only |\n| `why` | text | no | reason for the choice; for the agent only |\n\nFor an animated scene, `file` points to `raw/anim_NN.mp4` (`pipeline.md:82-83`). Example at `pipeline.md:76-79`.\n\n### `music.json` (written by `montador-mpt`; read by `build_music`, auditor and editor)\n\n| Field | Type | Read by `build_music` | Notes |\n|---|---|---|---|\n| `crossfade` | number, seconds | yes (`build_music.py:70`) | default 1.5 |\n| `cues` | list | yes | each music cue |\n| `cues[].start` | number, seconds | yes | when the track starts in the video, on a phrase from `timing.json` |\n| `cues[].mood` | text | prints only | the block's mood |\n| `cues[].url` or `file` | text | yes | track source |\n| `cues[].ss` | number | yes | point in the track to start; default 0 |\n| `cues[].gain_db` | number | yes | extra gain; default 0 |\n| `cues[].title` | text | prints only | track name |\n| `cues[].author`, `license` | text | no | used in the credits by the agents |\n\n### `arte.json` (written by `diretor-de-arte`; read by `build_timeline`, `build_thumbnail` and the montador)\n\n| Section | Field | Read by script | Default in `arte.py` |\n|---|---|---|---|\n| `texto_na_tela` | `font`, `color`, `size`, `box`, `box_color` | yes: `build_timeline.py:215` | `BeVietnamPro-Bold.ttf`, `#FFFFFF`, 96, true, `#000000@0.55` (`arte.py:10-11`) |\n| `thumbnail` | `font`, `color`, `accent` | yes: `build_thumbnail.py:24` and `:48` | `BeVietnamPro-Bold.ttf`, `#FFFFFF`, `#FFD400` (`arte.py:12`) |\n| `legenda` | `font_name`, `text_fore_color`, `stroke_color`, `stroke_width`, `position`, `background`, `background_color` | no | **no default** in `arte.py` |\n\nThe montador turns the `legenda` section into CLI flags: `--font-name`, `--text-fore-color`, `--stroke-color`, `--stroke-width`, `--subtitle-position`, `--subtitle-background-enabled`, `--subtitle-background-color` (`pipeline.md:110-112`).\n\n## Example / walkthrough\n\nA `timing.json` built from subtitles, and one `music.json` cue:\n\n```json\n[{\"n\": 1, \"start\": 0.098, \"end\": 3.598, \"text\": \"A inteligência artificial...\"}]\n```\n\n```json\n{\"crossfade\": 1.5, \"cues\": [{\"start\": 34.5, \"mood\": \"amedrontador\", \"file\": \"raw/music/Darkest Child.mp3\", \"ss\": 0,\n  \"title\": \"Darkest Child\", \"author\": \"Kevin MacLeod\", \"license\": \"CC BY 4.0\"}]}\n```\n\n## Pitfalls\n\n- **Fields with no reader.** `sources.json` has no script reader; the reader is the auditor, in the rights check. `arte.json.legenda` also has no reader in the code: the montador translates it into flags by hand.\n- **Different default colour.** `texto_na_tela.color` is `#FFFFFF` in `arte.py:10`, but the example in `pipeline.md:106` uses `#FFD400`. The project file always wins over the default.\n- **`anim` and `props` are not read by `build_timeline`.** They are instructions for the animador, which renders `raw/anim_NN.mp4` and points `file` to it.\n- **`start` is not `ss`.** With `url`, `start` is the moment in the source video. With `file`, `ss` is the start point inside the local file.\n\n> [!warning] unstable\n> The `motion` field of `fit` (slow zoom on a still image) is `status/unstable`. Status to be confirmed on `main`.\n\n## Connections\n\n- Concept: [[Video team and file contracts]]. Walkthrough: [[04 - Video with the agent team]].\n- Reference: [[Roles and models]], [[CLI flags]], [[Configuration keys]].\n- Related concepts: [[Pipeline and stop_at]], [[Voice and subtitles]], [[Music and publishing]].\n"
    },
    {
     "id": "r6",
     "section": "ref",
     "title": "Roles and models",
     "tags": [
      "mapa",
      "referencia"
     ],
     "status": "unstable",
     "sources": [
      ".agents/roles/",
      ".claude/agents/",
      ".grok/agents/",
      ".agents/setup.md",
      ".agents/tecnico.md",
      ".agents/tools/sync_grok_agents.py",
      "AGENTS.md"
     ],
     "body": "# Roles and models\n\n[[00 - Index|← Index]]\n\nThe 20 roles of the harness: who does what, with which model and which tools in Claude Code.\n\n## Core idea\n\nEach role has one **source** in `.agents/roles/<role>.md`, with no model and no tools. The model and the tools live only in the adapter `.claude/agents/<role>.md`. Grok generates its adapter with `model: inherit`, because `sonnet` and `haiku` do not exist there.\n\nModel rule (`setup.md:68-74`): a small model for mechanical work (`haiku`), a middle model for judgement, vision or code (`sonnet`). A stronger model only if a role repeatedly gets facts or analysis wrong. No role uses a stronger model today.\n\n## How it works\n\nThe video team roles (12). The model comes from `.claude/agents/<role>.md`, line 4.\n\n| Role | Inputs | Outputs | Model | Tools (Claude) |\n|---|---|---|---|---|\n| `pesquisador` | `brief.md`; in revision, critiques and audit | `research.md`, `sources.json`, `script.txt`, `music-plan.md` | sonnet | WebSearch, WebFetch, Read, Write, Edit, Bash, Glob, Grep, mcp yt-dlp, reddit, apify |\n| `critico` | script, research, brief; final, timing, shotlist (visual) | `critique/content-NN.md`, `critique/visual-NN.md` | sonnet | Read, Glob, Grep, Bash, WebSearch, Write |\n| `sugestor-de-pauta` | brief, script, research, latest critique | `critique/ideas-NN.md` (up to 8 ideas) | sonnet | Read, Glob, Grep, WebSearch, WebFetch, Write, mcp yt-dlp, reddit, apify |\n| `auditor` | script, research, brief; shotlist, music, credits, sources, final | `audit/fatos-NN.md`, `audit/direitos-NN.md` | sonnet | Read, Write, Glob, Grep, Bash, WebSearch, WebFetch, mcp yt-dlp, reddit, apify |\n| `diretor-de-arte` | brief, script, music-plan, sources, profile History | `arte.md`, `arte.json` | sonnet | Read, Write, Edit, Glob, Bash |\n| `diretor` | everything | `aprovacao-NN.md`, `entrega.md` | sonnet | Read, Write, Glob, Grep, Bash |\n| `montador-mpt` | script, music-plan, timeline/, arte.json | `timing.json`, `music.json`, `bgm.mp3`, `output/final.mp4` | **haiku** | Bash, Read, Write, Edit, Glob, Grep |\n| `cacador-de-clipes` | timing, sources, script, arte.md | `shotlist.json`, `raw/` | sonnet | Bash, Read, Write, Glob, Grep, WebSearch, mcp yt-dlp, apify |\n| `animador` | shotlist (items with `anim`), arte.json, timing | `raw/anim_NN.mp4` | sonnet | Bash, Read, Write, Edit, Glob, Grep |\n| `editor-de-clipes` | shotlist, timing, sources | `timeline/NN.mp4`, `raw/timeline_preview.png`, `credits.md` | sonnet | Bash, Read, Write, Edit, Glob |\n| `designer-de-thumbnail` | arte, script, timeline/, raw/ | `publicacao/thumb-*.png`, `thumbs_preview.png` | **haiku** | Bash, Read, Write, Glob |\n| `redator-de-publicacao` | script, research, credits, timing, arte.md | `publicacao/publicacao.md` | **haiku** | Read, Write, Glob, WebSearch |\n\nThe technical team roles (6) and the harness roles (2). All use `sonnet` on Claude.\n\n| Role | Inputs | Outputs | Model | Tools (Claude) |\n|---|---|---|---|---|\n| `arquiteto` | request, code | `plano.md` | sonnet | Read, Glob, Grep, Bash, Write |\n| `desenvolvedor` | `plano.md` | code, `mudancas-NN.md` | sonnet | Bash, Read, Write, Edit, Glob, Grep |\n| `testador` | `plano.md`, code | `test/`, `testes-NN.md` | sonnet | Bash, Read, Write, Edit, Glob, Grep |\n| `revisor-de-codigo` | diff, `plano.md` | `revisao-NN.md` | sonnet | Read, Glob, Grep, Bash, Write |\n| `auditor-de-seguranca` | diff or code | `seguranca-NN.md` | sonnet | Read, Glob, Grep, Bash, Write, WebSearch, WebFetch |\n| `auditor-de-saude` | code, CI | `saude.md` | sonnet | Read, Glob, Grep, Bash, Write, WebSearch |\n| `pesquisador-de-integracoes` | candidate (API, SDK, MCP) | `integracoes-NN.md` | sonnet | WebSearch, WebFetch, Read, Glob, Grep, Bash, Write |\n| `mantenedor-do-harness` | `AGENTS.md`, `.agents/`, adapters | `harness-NN.md` and requested edits | sonnet | Read, Glob, Grep, Bash, Write, Edit |\n\nThe technical team inputs come from `tecnico.md:19-29` and each role's header. Models and tools come from `.claude/agents/<role>.md` (lines 4 and 5).\n\n## Example / walkthrough\n\nA new role, `revisor-de-acessibilidade`, would need:\n\n1. `.agents/roles/revisor-de-acessibilidade.md`, with `name` and `description` (no model);\n2. `.claude/agents/revisor-de-acessibilidade.md`, with `model:` and `tools:`;\n3. a run of `python3 .agents/tools/sync_grok_agents.py`, which generates the Grok adapter with `model: inherit`;\n4. a row in the table in `AGENTS.md`.\n\n## Pitfalls\n\n- **The model is not in the source.** The headers of `.agents/roles/` have only `name` and `description`. To learn the model, you must read the Claude adapter. This is inconsistency 12 in the map.\n- **`AGENTS.md` lists 11 video roles.** `animador` is missing. The table at `AGENTS.md:73-83` is incomplete.\n- **Grok has no fixed model.** All generated adapters use `inherit`, so the Grok model is the session's. See [[Claude and Grok adapters]].\n\n> [!warning] unstable\n> The eight technical team roles, including `mantenedor-do-harness` and `pesquisador-de-integracoes`, are `status/unstable`. The twelve video roles are on `main`.\n\n## Connections\n\n- Concepts: [[Video team and file contracts]], [[Technical team]], [[Agent harness]].\n- Reference: [[Agent JSON contracts]].\n- Canvas: [[04 - Video team.canvas|Video team canvas]], [[05 - Technical team.canvas|Technical team canvas]].\n"
    }
   ],
   "canvases": [
    {
     "id": "k0",
     "title": "00 - Overview",
     "data": {
      "nodes": [
       {
        "id": "b0c2815e2ce544d4",
        "type": "group",
        "label": "Entry points",
        "x": -30,
        "y": -50,
        "width": 380,
        "height": 620
       },
       {
        "id": "be0ec00a9f2ea457",
        "type": "group",
        "label": "Agent harness",
        "x": 370,
        "y": 350,
        "width": 1180,
        "height": 420
       },
       {
        "id": "8a5da52ed126447d",
        "type": "text",
        "text": "# API\n`POST /api/v1/videos`\n`app/asgi.py`",
        "x": 0,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "2567a5ec9705eb7a",
        "type": "text",
        "text": "# WebUI\n`webui/Main.py` (Streamlit)",
        "x": 0,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "0898b22730d57afc",
        "type": "text",
        "text": "# CLI\n`cli.py` · `mpt cli`",
        "x": 0,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "ea2b2676c28c0db2",
        "type": "text",
        "text": "## task.start()\n`_run_pipeline` in `app/services/task.py`",
        "x": 400,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "bf8b08fc6f47355e",
        "type": "text",
        "text": "## Stages\nscript → terms → voice → subtitles → material → video",
        "x": 800,
        "y": 200,
        "width": 320,
        "height": 140
       },
       {
        "id": "f5cef96d7e57bb60",
        "type": "text",
        "text": "# Output\n`storage/tasks/<id>/`\n`final-N.mp4`",
        "x": 1200,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "6"
       },
       {
        "id": "5d8d1cb9136777c8",
        "type": "text",
        "text": "## Integrations\nLLM · TTS · subtitles · stock video · AI",
        "x": 800,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "48a8f39871124f8a",
        "type": "text",
        "text": "## montador-mpt\nruns `mpt cli`",
        "x": 400,
        "y": 400,
        "width": 320,
        "height": 140
       },
       {
        "id": "421b47ffd946ca08",
        "type": "text",
        "text": "## Video team\n`.agents/skills/video`",
        "x": 800,
        "y": 400,
        "width": 320,
        "height": 140
       },
       {
        "id": "044c3027c1bfd773",
        "type": "text",
        "text": "## Technical team\n`.agents/skills/manutencao`",
        "x": 1200,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "2"
       },
       {
        "id": "42732a4781317eda",
        "type": "text",
        "text": "## MCP and adapters\n`.mcp.json` · `.claude/` · `.grok/`",
        "x": 800,
        "y": 600,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "3aa53cec161c587e",
        "type": "text",
        "text": "## Omni × Turbo\nfork at `9e7d8b7` · see canvas 06",
        "x": 0,
        "y": 800,
        "width": 320,
        "height": 140
       },
       {
        "id": "92ec19ffde05e157",
        "type": "text",
        "text": "## Branches\n`main` tested · `unstable` in orange · see canvas 07",
        "x": 400,
        "y": 800,
        "width": 320,
        "height": 140
       }
      ],
      "edges": [
       {
        "id": "6627f62fb7121155",
        "fromNode": "8a5da52ed126447d",
        "fromSide": "right",
        "toNode": "ea2b2676c28c0db2",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "118103c45d42595c",
        "fromNode": "2567a5ec9705eb7a",
        "fromSide": "right",
        "toNode": "ea2b2676c28c0db2",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "c5e06bb7f9d27590",
        "fromNode": "0898b22730d57afc",
        "fromSide": "right",
        "toNode": "ea2b2676c28c0db2",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "7bfff4d373dacfff",
        "fromNode": "ea2b2676c28c0db2",
        "fromSide": "right",
        "toNode": "bf8b08fc6f47355e",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "13daddd3043a3b57",
        "fromNode": "bf8b08fc6f47355e",
        "fromSide": "top",
        "toNode": "5d8d1cb9136777c8",
        "toSide": "bottom",
        "toEnd": "arrow",
        "label": "script, voice, material"
       },
       {
        "id": "d841638f14d1dc09",
        "fromNode": "bf8b08fc6f47355e",
        "fromSide": "right",
        "toNode": "f5cef96d7e57bb60",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "render"
       },
       {
        "id": "1170c55b4821d944",
        "fromNode": "48a8f39871124f8a",
        "fromSide": "left",
        "toNode": "0898b22730d57afc",
        "toSide": "right",
        "toEnd": "arrow",
        "label": "mpt cli"
       },
       {
        "id": "f529729260669e01",
        "fromNode": "421b47ffd946ca08",
        "fromSide": "left",
        "toNode": "48a8f39871124f8a",
        "toSide": "right",
        "toEnd": "arrow",
        "label": "drives"
       },
       {
        "id": "6d7c4dd091b81e13",
        "fromNode": "42732a4781317eda",
        "fromSide": "top",
        "toNode": "421b47ffd946ca08",
        "toSide": "bottom",
        "toEnd": "arrow",
        "label": "tools"
       }
      ]
     }
    },
    {
     "id": "k1",
     "title": "01 - Pipeline",
     "data": {
      "nodes": [
       {
        "id": "051f9506323738e8",
        "type": "group",
        "label": "Preparation",
        "x": -30,
        "y": -50,
        "width": 780,
        "height": 420
       },
       {
        "id": "cbcdec1b7b1b769b",
        "type": "group",
        "label": "Stages, fixed order",
        "x": 770,
        "y": -50,
        "width": 2780,
        "height": 220
       },
       {
        "id": "893ce80729195afe",
        "type": "text",
        "text": "# Start\n`start()` → `_run_pipeline`",
        "x": 0,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "0b0088ea4af2070c",
        "type": "text",
        "text": "## Preflight\nsource, keys, ffmpeg",
        "x": 400,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "a2843ebd03a7d7dd",
        "type": "text",
        "text": "# Failure\n`_mark_task_failed` writes `failed_stage`",
        "x": 400,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "1"
       },
       {
        "id": "ccdb3717dd1f8154",
        "type": "text",
        "text": "# 1 · Script\nLLM, skipped with `video_script`",
        "x": 800,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "6f28133e9829d70f",
        "type": "text",
        "text": "# 2 · Terms\nLLM, optional rerank",
        "x": 1200,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "a5ca0b5894324f8b",
        "type": "text",
        "text": "# 3 · Audio\nTTS or silence",
        "x": 1600,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "88f7b0199083ab4f",
        "type": "text",
        "text": "# 4 · Subtitles\nedge or whisper",
        "x": 2000,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "b0362266f4a485e9",
        "type": "text",
        "text": "# 5 · Materials\nlocal or video provider",
        "x": 2400,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "421b47ffd946ca08",
        "type": "text",
        "text": "# 6 · Video\ncombine, mix, subtitles, BGM",
        "x": 2800,
        "y": 0,
        "width": 320,
        "height": 140
       },
       {
        "id": "82f60b1d688c0223",
        "type": "text",
        "text": "# Done\n`state=1`; publishing runs in background",
        "x": 3200,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "6"
       },
       {
        "id": "7fad4cee9e5014d0",
        "type": "text",
        "text": "## stop_at\nis this the target step? yes: return; no: continue",
        "x": 800,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "f5cef96d7e57bb60",
        "type": "text",
        "text": "# Partial output\nthe step's dictionary",
        "x": 800,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "6"
       },
       {
        "id": "312a2dad2be750a1",
        "type": "text",
        "text": "# Image motion\n`image_motion` (unstable)",
        "x": 2400,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "2"
       }
      ],
      "edges": [
       {
        "id": "bcd66e80dd4fc245",
        "fromNode": "893ce80729195afe",
        "fromSide": "right",
        "toNode": "0b0088ea4af2070c",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "0c7b40c1054b5479",
        "fromNode": "0b0088ea4af2070c",
        "fromSide": "right",
        "toNode": "ccdb3717dd1f8154",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "yes",
        "color": "4"
       },
       {
        "id": "2d82af9dbe09d9bd",
        "fromNode": "0b0088ea4af2070c",
        "fromSide": "bottom",
        "toNode": "a2843ebd03a7d7dd",
        "toSide": "top",
        "toEnd": "arrow",
        "label": "no",
        "color": "1"
       },
       {
        "id": "1267f2dc216bd071",
        "fromNode": "ccdb3717dd1f8154",
        "fromSide": "right",
        "toNode": "6f28133e9829d70f",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "0d6d205ac92eef46",
        "fromNode": "6f28133e9829d70f",
        "fromSide": "right",
        "toNode": "a5ca0b5894324f8b",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "058e5d75ce90e502",
        "fromNode": "a5ca0b5894324f8b",
        "fromSide": "right",
        "toNode": "88f7b0199083ab4f",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "2a075b5d6ecf59c3",
        "fromNode": "88f7b0199083ab4f",
        "fromSide": "right",
        "toNode": "b0362266f4a485e9",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "592e6d5177b8d610",
        "fromNode": "b0362266f4a485e9",
        "fromSide": "right",
        "toNode": "421b47ffd946ca08",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "e2ca09f3a6237077",
        "fromNode": "421b47ffd946ca08",
        "fromSide": "right",
        "toNode": "82f60b1d688c0223",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "f14339e09e9222e5",
        "fromNode": "ccdb3717dd1f8154",
        "fromSide": "bottom",
        "toNode": "7fad4cee9e5014d0",
        "toSide": "top",
        "toEnd": "arrow",
        "label": "after each step"
       },
       {
        "id": "4b9591ac07468d75",
        "fromNode": "7fad4cee9e5014d0",
        "fromSide": "bottom",
        "toNode": "f5cef96d7e57bb60",
        "toSide": "top",
        "toEnd": "arrow",
        "label": "yes",
        "color": "6"
       },
       {
        "id": "ee69c977353552e0",
        "fromNode": "7fad4cee9e5014d0",
        "fromSide": "right",
        "toNode": "6f28133e9829d70f",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "no"
       },
       {
        "id": "28a562013fa42457",
        "fromNode": "312a2dad2be750a1",
        "fromSide": "top",
        "toNode": "b0362266f4a485e9",
        "toSide": "bottom",
        "toEnd": "arrow",
        "label": "static / zoom",
        "color": "2"
       }
      ]
     }
    },
    {
     "id": "k2",
     "title": "02 - Entry points",
     "data": {
      "nodes": [
       {
        "id": "3899f0216ad054c5",
        "type": "group",
        "label": "Before start()",
        "x": -30,
        "y": -50,
        "width": 1180,
        "height": 620
       },
       {
        "id": "8a5da52ed126447d",
        "type": "text",
        "text": "# API\n`POST /api/v1/videos`",
        "x": 0,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "55d456555ef94ef8",
        "type": "text",
        "text": "## Validates\nschema, colours, font, `x-api-key`",
        "x": 400,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "085556ac79fd5c5f",
        "type": "text",
        "text": "# Queue\n`add_task`; full: 429",
        "x": 800,
        "y": 0,
        "width": 320,
        "height": 140
       },
       {
        "id": "2567a5ec9705eb7a",
        "type": "text",
        "text": "# WebUI\nGenerate button",
        "x": 0,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "a1939d60ac374a69",
        "type": "text",
        "text": "# WebUI queue\n1 task at a time; takes `runtime_config_lock`",
        "x": 800,
        "y": 200,
        "width": 320,
        "height": 140
       },
       {
        "id": "0898b22730d57afc",
        "type": "text",
        "text": "# CLI\n`cli.py --video-script ...`",
        "x": 0,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "1c58a6e55f600a41",
        "type": "text",
        "text": "## Validates\nargparse, materials copied",
        "x": 400,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "6ba2b4705065d33c",
        "type": "text",
        "text": "# No queue\nsynchronous call, absolute path accepted",
        "x": 800,
        "y": 400,
        "width": 320,
        "height": 140
       },
       {
        "id": "ea2b2676c28c0db2",
        "type": "text",
        "text": "# task.start()\n`_run_pipeline`",
        "x": 1200,
        "y": 200,
        "width": 320,
        "height": 140
       },
       {
        "id": "f5cef96d7e57bb60",
        "type": "text",
        "text": "# Files\n`storage/tasks/<id>/`",
        "x": 1600,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "6"
       },
       {
        "id": "0f9a758d5f89d8ce",
        "type": "text",
        "text": "# Refused\nAPI: 400, 401, 429 · CLI: exit 2",
        "x": 400,
        "y": 600,
        "width": 320,
        "height": 140,
        "color": "1"
       }
      ],
      "edges": [
       {
        "id": "07dfccd85e617499",
        "fromNode": "8a5da52ed126447d",
        "fromSide": "right",
        "toNode": "55d456555ef94ef8",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "6b93a921f82a521b",
        "fromNode": "55d456555ef94ef8",
        "fromSide": "right",
        "toNode": "085556ac79fd5c5f",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "yes",
        "color": "4"
       },
       {
        "id": "974b4b5f74ebd7ac",
        "fromNode": "55d456555ef94ef8",
        "fromSide": "bottom",
        "toNode": "0f9a758d5f89d8ce",
        "toSide": "top",
        "toEnd": "arrow",
        "label": "no",
        "color": "1"
       },
       {
        "id": "c0d258b4ed3ef9e1",
        "fromNode": "085556ac79fd5c5f",
        "fromSide": "right",
        "toNode": "ea2b2676c28c0db2",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "f1c46ef282244c35",
        "fromNode": "2567a5ec9705eb7a",
        "fromSide": "right",
        "toNode": "a1939d60ac374a69",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "lock + queue"
       },
       {
        "id": "a84884616d62a55a",
        "fromNode": "a1939d60ac374a69",
        "fromSide": "right",
        "toNode": "ea2b2676c28c0db2",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "0682114e17b0897c",
        "fromNode": "0898b22730d57afc",
        "fromSide": "right",
        "toNode": "1c58a6e55f600a41",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "1ad0345b26ffe129",
        "fromNode": "1c58a6e55f600a41",
        "fromSide": "right",
        "toNode": "6ba2b4705065d33c",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "yes",
        "color": "4"
       },
       {
        "id": "97c80636dd65b052",
        "fromNode": "1c58a6e55f600a41",
        "fromSide": "bottom",
        "toNode": "0f9a758d5f89d8ce",
        "toSide": "top",
        "toEnd": "arrow",
        "label": "no",
        "color": "1"
       },
       {
        "id": "17155546e195d614",
        "fromNode": "6ba2b4705065d33c",
        "fromSide": "right",
        "toNode": "ea2b2676c28c0db2",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "e2fdd4a164e9b15e",
        "fromNode": "ea2b2676c28c0db2",
        "fromSide": "right",
        "toNode": "f5cef96d7e57bb60",
        "toSide": "left",
        "toEnd": "arrow"
       }
      ]
     }
    },
    {
     "id": "k3",
     "title": "03 - Integrations",
     "data": {
      "nodes": [
       {
        "id": "b84d6fb6ada5da06",
        "type": "group",
        "label": "Pipeline (stages)",
        "x": 370,
        "y": 550,
        "width": 2380,
        "height": 220
       },
       {
        "id": "ccdb3717dd1f8154",
        "type": "text",
        "text": "## Script and terms\n`llm.generate_script`",
        "x": 400,
        "y": 600,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "a5ca0b5894324f8b",
        "type": "text",
        "text": "## Audio\n`generate_audio` → `voice.tts`",
        "x": 800,
        "y": 600,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "88f7b0199083ab4f",
        "type": "text",
        "text": "## Subtitles\n`edge` or local `whisper`",
        "x": 1200,
        "y": 600,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "eec34d804c9ce6c8",
        "type": "text",
        "text": "## Material\n`get_video_materials`",
        "x": 1600,
        "y": 600,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "421b47ffd946ca08",
        "type": "text",
        "text": "## Final video\n`generate_final_videos`",
        "x": 2000,
        "y": 600,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "f8e71a764f4915da",
        "type": "text",
        "text": "# Publishing\n`_run_cross_post`",
        "x": 2400,
        "y": 600,
        "width": 320,
        "height": 140,
        "color": "6"
       },
       {
        "id": "dae1be85dab3650e",
        "type": "text",
        "text": "## LLM\n37 providers (`LLM_PROVIDER_REGISTRY`)",
        "x": 400,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "decc1eab6d0751fc",
        "type": "text",
        "text": "## Subscriptions (no key)\nClaude Code (CLI), Kimi Code (OAuth)",
        "x": 0,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "72ecb0838c7b4ffb",
        "type": "text",
        "text": "## TTS\nEdge, Azure, Gemini, ElevenLabs and others",
        "x": 800,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "76ee3de97a1b8b90",
        "type": "text",
        "text": "## upload-post\nTikTok, Instagram, YouTube",
        "x": 2400,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "fd3ee263d1cd81c6",
        "type": "text",
        "text": "## Stock and AI\nPexels, Pixabay, Coverr; WaveSpeed, Seedance, OFox, MuAPI, Metaso, OpenAI image",
        "x": 1600,
        "y": 1000,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "ddc88111e7c64377",
        "type": "text",
        "text": "## AI music\nSonilo, ElevenLabs Music",
        "x": 2000,
        "y": 1000,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "19e74ab95eb54475",
        "type": "text",
        "text": "## Local SDXL\n`docs/local-image-server` (unstable)",
        "x": 1200,
        "y": 1000,
        "width": 320,
        "height": 140,
        "color": "2"
       },
       {
        "id": "d158ca5ea46eeded",
        "type": "text",
        "text": "## PLANNED\nCodex CLI, Gemini CLI, Grok Build, xAI STT/TTS",
        "x": 0,
        "y": 1000,
        "width": 320,
        "height": 140,
        "color": "2"
       }
      ],
      "edges": [
       {
        "id": "bef1323968238210",
        "fromNode": "ccdb3717dd1f8154",
        "fromSide": "right",
        "toNode": "a5ca0b5894324f8b",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "058e5d75ce90e502",
        "fromNode": "a5ca0b5894324f8b",
        "fromSide": "right",
        "toNode": "88f7b0199083ab4f",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "9c3bb4702f40cd8c",
        "fromNode": "88f7b0199083ab4f",
        "fromSide": "right",
        "toNode": "eec34d804c9ce6c8",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "505f110c6c11a5a9",
        "fromNode": "eec34d804c9ce6c8",
        "fromSide": "right",
        "toNode": "421b47ffd946ca08",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "9a1a7f8575cfacbd",
        "fromNode": "421b47ffd946ca08",
        "fromSide": "right",
        "toNode": "f8e71a764f4915da",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "07ee9ba507f86e69",
        "fromNode": "decc1eab6d0751fc",
        "fromSide": "right",
        "toNode": "dae1be85dab3650e",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "login",
        "color": "5"
       },
       {
        "id": "65b84a89323aa36a",
        "fromNode": "dae1be85dab3650e",
        "fromSide": "bottom",
        "toNode": "ccdb3717dd1f8154",
        "toSide": "top",
        "toEnd": "arrow",
        "label": "script",
        "color": "5"
       },
       {
        "id": "79a22992eb61f95e",
        "fromNode": "72ecb0838c7b4ffb",
        "fromSide": "bottom",
        "toNode": "a5ca0b5894324f8b",
        "toSide": "top",
        "toEnd": "arrow",
        "label": "voice",
        "color": "5"
       },
       {
        "id": "ab775b918cf886e1",
        "fromNode": "fd3ee263d1cd81c6",
        "fromSide": "top",
        "toNode": "eec34d804c9ce6c8",
        "toSide": "bottom",
        "toEnd": "arrow",
        "label": "clips",
        "color": "5"
       },
       {
        "id": "0f717fe5f5816300",
        "fromNode": "ddc88111e7c64377",
        "fromSide": "top",
        "toNode": "421b47ffd946ca08",
        "toSide": "bottom",
        "toEnd": "arrow",
        "label": "soundtrack",
        "color": "5"
       },
       {
        "id": "7adb0a69b95c2c93",
        "fromNode": "76ee3de97a1b8b90",
        "fromSide": "bottom",
        "toNode": "f8e71a764f4915da",
        "toSide": "top",
        "toEnd": "arrow",
        "label": "upload",
        "color": "5"
       },
       {
        "id": "3277e317c814dc99",
        "fromNode": "19e74ab95eb54475",
        "fromSide": "top",
        "toNode": "eec34d804c9ce6c8",
        "toSide": "bottom",
        "toEnd": "arrow",
        "label": "images",
        "color": "2"
       }
      ]
     }
    },
    {
     "id": "k4",
     "title": "04 - Video team",
     "data": {
      "nodes": [
       {
        "id": "2bee2f2a139f9191",
        "type": "group",
        "label": "Research and critique (0–3)",
        "x": -30,
        "y": -50,
        "width": 1580,
        "height": 220
       },
       {
        "id": "f929b34474fd31fb",
        "type": "group",
        "label": "Art, approval and timing (4–6)",
        "x": 1570,
        "y": -50,
        "width": 1180,
        "height": 220
       },
       {
        "id": "d20b2dbedf71a5f3",
        "type": "group",
        "label": "Clips, render and review (7–10)",
        "x": 770,
        "y": 350,
        "width": 1980,
        "height": 220
       },
       {
        "id": "965b43ca338e37e4",
        "type": "group",
        "label": "Publishing and delivery (11–12)",
        "x": -30,
        "y": 350,
        "width": 780,
        "height": 220
       },
       {
        "id": "106f16a8fde7ae2e",
        "type": "text",
        "text": "# 0 · Request and brief\n`brief.md`: profile, topic, length, format, language\n*orchestrator*",
        "x": 0,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "ba3902395ef335e4",
        "type": "text",
        "text": "## 1 · pesquisador\n`research.md`, `sources.json`, `script.txt`, `music-plan.md`",
        "x": 400,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "48cd7517d21176f9",
        "type": "text",
        "text": "## 2 · parallel review\n`critico` → `critique/content-NN.md`\n`sugestor-de-pauta` → `critique/ideas-NN.md`\n`auditor` (facts) → `audit/fatos-NN.md`",
        "x": 800,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "a3218734457b9a9b",
        "type": "text",
        "text": "## 3 · rejected or new ideas?\n`REVISAR`, `CORRIGIR` or a high-value suggestion",
        "x": 1200,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "c8581bc43486c23e",
        "type": "text",
        "text": "## 4 · diretor-de-arte\n`arte.md`, `arte.json`: subtitles, on-screen text, thumbnail",
        "x": 1600,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "d018268506e28685",
        "type": "text",
        "text": "## 5 · diretor (approval)\n`aprovacao-NN.md`\n**STOP:** continues only with the user's approval",
        "x": 2000,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "e34c64a05273012b",
        "type": "text",
        "text": "## 6 · montador-mpt (timing)\n`--stop-at audio` and `subtitle`, `timing.json`, `music.json`, `bgm.mp3`",
        "x": 2400,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "f6d8b886335927d4",
        "type": "text",
        "text": "## 7 · cacador-de-clipes\n`shotlist.json`, `raw/`\n7b · `animador`: `raw/anim_NN.mp4`",
        "x": 2400,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "de95b43bceeb4b99",
        "type": "text",
        "text": "## 8 · editor-de-clipes\n`build_timeline.py` → `timeline/NN.mp4`, `credits.md`",
        "x": 2000,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "9e5f0bb330344d58",
        "type": "text",
        "text": "## 9 · montador-mpt (render)\n`output/final.mp4`",
        "x": 1600,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "c3e888ce42796ce1",
        "type": "text",
        "text": "## 10 · final review\n`critico` → `critique/visual-NN.md`\n`auditor` (rights) → `audit/direitos-NN.md`",
        "x": 1200,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "a585257a5b4d06da",
        "type": "text",
        "text": "## Rejected?\n`REVISAR` or `CORRIGIR`",
        "x": 800,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "3a21cd7317e1445b",
        "type": "text",
        "text": "## 11 · designer and writer\n`publicacao/thumb-*.png`, `publicacao.md`",
        "x": 400,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "645ec79f22bec5ef",
        "type": "text",
        "text": "## 12 · diretor (delivery)\n`entrega.md`: `PRONTO` or `REFAZER <etapa>`\n## 13 · report\nNothing is published.",
        "x": 0,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "6"
       }
      ],
      "edges": [
       {
        "id": "42a6f2f12597381f",
        "fromNode": "106f16a8fde7ae2e",
        "fromSide": "right",
        "toNode": "ba3902395ef335e4",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "ae1b0907ba95b60c",
        "fromNode": "ba3902395ef335e4",
        "fromSide": "right",
        "toNode": "48cd7517d21176f9",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "cfd34e21e5850322",
        "fromNode": "48cd7517d21176f9",
        "fromSide": "right",
        "toNode": "a3218734457b9a9b",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "87a0596751e85873",
        "fromNode": "a3218734457b9a9b",
        "fromSide": "right",
        "toNode": "c8581bc43486c23e",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "no"
       },
       {
        "id": "761f59688c20f567",
        "fromNode": "c8581bc43486c23e",
        "fromSide": "right",
        "toNode": "d018268506e28685",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "8b584c30e536df34",
        "fromNode": "d018268506e28685",
        "fromSide": "right",
        "toNode": "e34c64a05273012b",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "approved"
       },
       {
        "id": "3a5cda6807b341b8",
        "fromNode": "e34c64a05273012b",
        "fromSide": "bottom",
        "toNode": "f6d8b886335927d4",
        "toSide": "top",
        "toEnd": "arrow"
       },
       {
        "id": "c78d294bcc1a8d89",
        "fromNode": "f6d8b886335927d4",
        "fromSide": "left",
        "toNode": "de95b43bceeb4b99",
        "toSide": "right",
        "toEnd": "arrow"
       },
       {
        "id": "c2267adb7e2d4687",
        "fromNode": "de95b43bceeb4b99",
        "fromSide": "left",
        "toNode": "9e5f0bb330344d58",
        "toSide": "right",
        "toEnd": "arrow"
       },
       {
        "id": "29548060f0037337",
        "fromNode": "9e5f0bb330344d58",
        "fromSide": "left",
        "toNode": "c3e888ce42796ce1",
        "toSide": "right",
        "toEnd": "arrow"
       },
       {
        "id": "8f9cb1564baafd35",
        "fromNode": "c3e888ce42796ce1",
        "fromSide": "left",
        "toNode": "a585257a5b4d06da",
        "toSide": "right",
        "toEnd": "arrow"
       },
       {
        "id": "250cbd5a7851a3ca",
        "fromNode": "a585257a5b4d06da",
        "fromSide": "left",
        "toNode": "3a21cd7317e1445b",
        "toSide": "right",
        "toEnd": "arrow",
        "label": "no"
       },
       {
        "id": "f9e89624094b3d35",
        "fromNode": "3a21cd7317e1445b",
        "fromSide": "left",
        "toNode": "645ec79f22bec5ef",
        "toSide": "right",
        "toEnd": "arrow"
       },
       {
        "id": "fdeeaae95e2965e2",
        "fromNode": "a3218734457b9a9b",
        "fromSide": "bottom",
        "toNode": "ba3902395ef335e4",
        "toSide": "bottom",
        "toEnd": "arrow",
        "label": "yes: revise (max 2)",
        "color": "1"
       },
       {
        "id": "05b26f8e75c128b9",
        "fromNode": "a585257a5b4d06da",
        "fromSide": "top",
        "toNode": "de95b43bceeb4b99",
        "toSide": "bottom",
        "toEnd": "arrow",
        "label": "yes: redo scenes (max 2)",
        "color": "1"
       }
      ]
     }
    },
    {
     "id": "k5",
     "title": "05 - Technical team",
     "data": {
      "nodes": [
       {
        "id": "26515233cb2ee04f",
        "type": "group",
        "label": "Change mode (unstable)",
        "x": -30,
        "y": -50,
        "width": 3580,
        "height": 220,
        "color": "2"
       },
       {
        "id": "1a31333e681725a5",
        "type": "group",
        "label": "Audit mode (unstable)",
        "x": -30,
        "y": 350,
        "width": 1180,
        "height": 220,
        "color": "2"
       },
       {
        "id": "c95e3dd9ec923045",
        "type": "text",
        "text": "# Change\n`pedido.md` → `arquiteto` → `plano.md`",
        "x": 0,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "a3218734457b9a9b",
        "type": "text",
        "text": "## Touches API, schema, config, dependency or 5+ files?",
        "x": 400,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "d018268506e28685",
        "type": "text",
        "text": "## Stop\nThe user approves the plan",
        "x": 800,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "83f1535f99ab0bf4",
        "type": "text",
        "text": "## testador (reproduction)\na failing test; bugs only",
        "x": 1200,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "e77989ed21758e78",
        "type": "text",
        "text": "## desenvolvedor\ncode in the service layer; ruff and area tests; `mudancas-NN.md`",
        "x": 1600,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "0f826a89cf68c399",
        "type": "text",
        "text": "## testador (coverage)\nfull suite and coverage; `testes-NN.md`",
        "x": 2000,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "48cd7517d21176f9",
        "type": "text",
        "text": "## revisor-de-codigo + auditor-de-seguranca\nin parallel: `revisao-NN.md`, `seguranca-NN.md`",
        "x": 2400,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "a585257a5b4d06da",
        "type": "text",
        "text": "## REVISAR?\nblocker, or 3+ important (max 2 rounds)",
        "x": 2800,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "7ffc4d510260a854",
        "type": "text",
        "text": "## Report\nfiles, CI output, verdicts. No commit.",
        "x": 3200,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "6"
       },
       {
        "id": "a1213419a0c503fc",
        "type": "text",
        "text": "# Audit\n`auditor-de-saude` → `saude.md`\n`auditor-de-seguranca` → `seguranca-01.md`",
        "x": 0,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "ecd2ec43c588ae01",
        "type": "text",
        "text": "## Ranked list\nSTOP: the user picks the items",
        "x": 400,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "447b7147e84be512",
        "type": "text",
        "text": "## Approved item\nbecomes a change run, with the item as the request",
        "x": 800,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "5d8d1cb9136777c8",
        "type": "text",
        "text": "## Integration research and harness\n`pesquisador-de-integracoes` (installs nothing) · `mantenedor-do-harness`",
        "x": 1200,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "5"
       }
      ],
      "edges": [
       {
        "id": "ba80ef139c51128f",
        "fromNode": "c95e3dd9ec923045",
        "fromSide": "right",
        "toNode": "a3218734457b9a9b",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "f03fd20189ad32ca",
        "fromNode": "a3218734457b9a9b",
        "fromSide": "right",
        "toNode": "d018268506e28685",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "yes"
       },
       {
        "id": "b6efc8a6fbe39d14",
        "fromNode": "d018268506e28685",
        "fromSide": "right",
        "toNode": "83f1535f99ab0bf4",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "approved"
       },
       {
        "id": "4e3b032b715ba65a",
        "fromNode": "a3218734457b9a9b",
        "fromSide": "bottom",
        "toNode": "83f1535f99ab0bf4",
        "toSide": "bottom",
        "toEnd": "arrow",
        "label": "no"
       },
       {
        "id": "fa972c41fcac7c78",
        "fromNode": "83f1535f99ab0bf4",
        "fromSide": "right",
        "toNode": "e77989ed21758e78",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "617c96977635c108",
        "fromNode": "e77989ed21758e78",
        "fromSide": "right",
        "toNode": "0f826a89cf68c399",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "96c25ee5b1638b00",
        "fromNode": "0f826a89cf68c399",
        "fromSide": "right",
        "toNode": "48cd7517d21176f9",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "c91f10962cb2e666",
        "fromNode": "48cd7517d21176f9",
        "fromSide": "right",
        "toNode": "a585257a5b4d06da",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "912c692638d8cd9d",
        "fromNode": "a585257a5b4d06da",
        "fromSide": "right",
        "toNode": "7ffc4d510260a854",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "no"
       },
       {
        "id": "978bcb3e827a4a9c",
        "fromNode": "a585257a5b4d06da",
        "fromSide": "bottom",
        "toNode": "e77989ed21758e78",
        "toSide": "bottom",
        "toEnd": "arrow",
        "label": "yes: back (max 2)",
        "color": "1"
       },
       {
        "id": "f69545fd8235a915",
        "fromNode": "a1213419a0c503fc",
        "fromSide": "right",
        "toNode": "ecd2ec43c588ae01",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "f20bdd25d11a2939",
        "fromNode": "ecd2ec43c588ae01",
        "fromSide": "right",
        "toNode": "447b7147e84be512",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "chosen"
       }
      ]
     }
    },
    {
     "id": "k6",
     "title": "06 - Omni and Turbo",
     "data": {
      "nodes": [
       {
        "id": "bc3b0556316b0ba2",
        "type": "text",
        "text": "## Turbo (upstream)\nreleases at `harry0703/MoneyPrinterTurbo`",
        "x": 400,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "b2fcb4ba898f4797",
        "type": "text",
        "text": "# Fork\n`9e7d8b7` · fix(task) #1663\n2026-10-17",
        "x": 0,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "67aed930d7a2290a",
        "type": "text",
        "text": "## Rebrand\n`a6c685c` · 67 files\n`app/paths.py` keeps the old folder",
        "x": 400,
        "y": 0,
        "width": 320,
        "height": 140
       },
       {
        "id": "04c75d4c027d99f1",
        "type": "text",
        "text": "## Harness and Remotion\n`.agents/` · `.claude/` · `.grok/` · `animations/` · `flake.nix`",
        "x": 800,
        "y": 0,
        "width": 320,
        "height": 140
       },
       {
        "id": "afae5d802918c841",
        "type": "text",
        "text": "## Upstream v1.3.9\nlogging, image motion, SDXL, EmpirioLabs",
        "x": 1200,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "5"
       },
       {
        "id": "65464c31b2e6ac04",
        "type": "text",
        "text": "## v1.3.9 merge\n25 upstream commits\non `unstable`",
        "x": 1200,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "2"
       },
       {
        "id": "f2f530eef36aed56",
        "type": "text",
        "text": "## Open items\n`version_checker` and Turbo referral links",
        "x": 0,
        "y": 200,
        "width": 320,
        "height": 140
       },
       {
        "id": "7fad4cee9e5014d0",
        "type": "text",
        "text": "## Keep following upstream?",
        "x": 1600,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "e9064b74d28acc05",
        "type": "text",
        "text": "## Yes\nOne merge per release",
        "x": 1600,
        "y": 200,
        "width": 320,
        "height": 140
       },
       {
        "id": "4f876ab4493c98f6",
        "type": "text",
        "text": "## No\nOmni stops syncing",
        "x": 2000,
        "y": 0,
        "width": 320,
        "height": 140
       }
      ],
      "edges": [
       {
        "id": "a24e627777cdc102",
        "fromNode": "b2fcb4ba898f4797",
        "fromSide": "right",
        "toNode": "67aed930d7a2290a",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "625a9bc688d1e2b9",
        "fromNode": "67aed930d7a2290a",
        "fromSide": "right",
        "toNode": "04c75d4c027d99f1",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "ba0dfaf231510bde",
        "fromNode": "bc3b0556316b0ba2",
        "fromSide": "left",
        "toNode": "b2fcb4ba898f4797",
        "toSide": "right",
        "toEnd": "arrow",
        "label": "origin"
       },
       {
        "id": "599eb32ce1d0f749",
        "fromNode": "bc3b0556316b0ba2",
        "fromSide": "right",
        "toNode": "afae5d802918c841",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "25 commits"
       },
       {
        "id": "cd610b06767a98e2",
        "fromNode": "afae5d802918c841",
        "fromSide": "top",
        "toNode": "65464c31b2e6ac04",
        "toSide": "bottom",
        "toEnd": "arrow",
        "label": "merge"
       },
       {
        "id": "9857750853cdf3ed",
        "fromNode": "04c75d4c027d99f1",
        "fromSide": "right",
        "toNode": "65464c31b2e6ac04",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "4198554899f50100",
        "fromNode": "65464c31b2e6ac04",
        "fromSide": "right",
        "toNode": "7fad4cee9e5014d0",
        "toSide": "left",
        "toEnd": "arrow"
       },
       {
        "id": "61b418c0a34416bc",
        "fromNode": "7fad4cee9e5014d0",
        "fromSide": "bottom",
        "toNode": "e9064b74d28acc05",
        "toSide": "top",
        "toEnd": "arrow",
        "label": "yes"
       },
       {
        "id": "a747e9c5a3b31881",
        "fromNode": "7fad4cee9e5014d0",
        "fromSide": "right",
        "toNode": "4f876ab4493c98f6",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "no"
       }
      ]
     }
    },
    {
     "id": "k7",
     "title": "07 - Branches",
     "data": {
      "nodes": [
       {
        "id": "fad58de7366495db",
        "type": "text",
        "text": "## main\nOnly what is tested and proven",
        "x": 0,
        "y": 0,
        "width": 320,
        "height": 140,
        "color": "4"
       },
       {
        "id": "a6389c69fe881a8e",
        "type": "text",
        "text": "## unstable\nRecently added, lightly tested",
        "x": 0,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "2"
       },
       {
        "id": "3df851502f9c020b",
        "type": "text",
        "text": "## Upstream v1.3.9\nenters unstable",
        "x": 0,
        "y": 400,
        "width": 320,
        "height": 140,
        "color": "2"
       },
       {
        "id": "7fad4cee9e5014d0",
        "type": "text",
        "text": "## Fixed and tested?",
        "x": 400,
        "y": 200,
        "width": 320,
        "height": 140,
        "color": "3"
       },
       {
        "id": "4f876ab4493c98f6",
        "type": "text",
        "text": "## No\nStays on unstable",
        "x": 400,
        "y": 400,
        "width": 320,
        "height": 140
       },
       {
        "id": "ec92848559fdebdf",
        "type": "text",
        "text": "### On main\n- stock-video capture\n- AI scripts\n- Claude Code and other harnesses\n- Remotion, yt-dlp, Grok",
        "x": 800,
        "y": 0,
        "width": 320,
        "height": 140
       },
       {
        "id": "ecc20679929e8f31",
        "type": "text",
        "text": "### On unstable\n- Reddit and Apify MCPs\n- technical team\n- channel profiles with assets\n- new animations\n- v1.3.9 merge\n- subscriptions",
        "x": 800,
        "y": 200,
        "width": 320,
        "height": 140
       },
       {
        "id": "698dc19d489c4e4d",
        "type": "text",
        "text": "## Test before the PR\nActions are off on the fork: local ruff and pytest",
        "x": 800,
        "y": 400,
        "width": 320,
        "height": 140
       },
       {
        "id": "30316cac0e49fe6c",
        "type": "text",
        "text": "## Rules\nNo force-push\nPromotion only by PR",
        "x": 1200,
        "y": 200,
        "width": 320,
        "height": 140
       }
      ],
      "edges": [
       {
        "id": "834e8a020f710f55",
        "fromNode": "3df851502f9c020b",
        "fromSide": "top",
        "toNode": "a6389c69fe881a8e",
        "toSide": "bottom",
        "toEnd": "arrow",
        "label": "enters"
       },
       {
        "id": "efa54da2f5cb2931",
        "fromNode": "a6389c69fe881a8e",
        "fromSide": "right",
        "toNode": "7fad4cee9e5014d0",
        "toSide": "left",
        "toEnd": "arrow",
        "label": "ready for PR"
       },
       {
        "id": "4026a85b2e8f946e",
        "fromNode": "7fad4cee9e5014d0",
        "fromSide": "left",
        "toNode": "fad58de7366495db",
        "toSide": "right",
        "toEnd": "arrow",
        "label": "yes: PR to main"
       },
       {
        "id": "a747e9c5a3b31881",
        "fromNode": "7fad4cee9e5014d0",
        "fromSide": "bottom",
        "toNode": "4f876ab4493c98f6",
        "toSide": "top",
        "toEnd": "arrow",
        "label": "no"
       },
       {
        "id": "51fc0fda8cb3d1de",
        "fromNode": "698dc19d489c4e4d",
        "fromSide": "left",
        "toNode": "7fad4cee9e5014d0",
        "toSide": "right",
        "toEnd": "arrow",
        "label": "local checks"
       }
      ]
     }
    }
   ]
  }
 }
};
