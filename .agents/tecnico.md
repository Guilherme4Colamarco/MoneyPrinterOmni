# Técnico — regras do time de manutenção do programa

Regras que os papéis técnicos (`arquiteto`, `desenvolvedor`, `testador`, `revisor-de-codigo`,
`auditor-de-seguranca`, `auditor-de-saude`) e a skill `manutencao` seguem em qualquer mudança ou
auditoria do MoneyPrinterOmni. Leia este arquivo e o `AGENTS.md` antes de começar.
O time de vídeo (`.agents/setup.md`) não mexe no código; este time não produz vídeo.

## Ordem de prioridade

1. Pedido explícito do usuário na conversa.
2. `pedido.md` da tarefa (`storage/manutencao/<slug>/pedido.md`).
3. `AGENTS.md` (comandos, arquitetura, convenções).
4. Este arquivo.

## Pasta da tarefa

Cada tarefa tem a pasta `storage/manutencao/<slug>/` (fora do git, como `storage/projects/`):

| Arquivo | Quem escreve | Conteúdo |
|---|---|---|
| `pedido.md` | orquestrador | o que o usuário pediu, critérios de pronto, fora de escopo |
| `plano.md` | `arquiteto` | arquivos afetados, passos, riscos, testes a criar |
| `mudancas-NN.md` | `desenvolvedor` | o que mudou e por quê, comandos rodados e saída |
| `testes-NN.md` | `testador` | testes criados, saída do pytest e da cobertura |
| `revisao-NN.md` | `revisor-de-codigo` | achados de correção e padrão; veredito |
| `seguranca-NN.md` | `auditor-de-seguranca` | achados de segurança; veredito |
| `saude.md` | `auditor-de-saude` | auditoria geral do programa (modo auditoria) |

`NN` é a rodada (`01`, `02`…). Quem só aponta escreve apenas o seu relatório.

## Regras fixas

- **Camada de serviço:** comportamento novo vai em `app/services/`, para que API
  (`app/controllers/v1`), WebUI (`webui/Main.py`) e CLI (`cli.py`) recebam juntos via
  `task.start()` → `_run_pipeline`. Lógica só numa porta de entrada é achado de revisão.
- **Estilo do código:** siga a língua e a densidade dos comentários do arquivo (a maioria está em
  chinês). Nada de refatoração fora do pedido.
- **WebUI:** texto novo entra em todos os `webui/i18n/*.json`.
- **Caminhos e arquivos:** recursos via `app/paths.py`; entrada de arquivo pelo servidor só pelos
  helpers de `app/utils/file_security.py`; `allow_server_file_input` é só do CLI.
- **Config:** novas chaves em `app/config/config.py` e em `config.example.toml`; nunca editar o
  `config.toml` do usuário; respeite o `runtime_config_lock`.
- **Dependências:** só pelo `uv add`/`uv lock` (`pyproject.toml` + `uv.lock`); `requirements.txt` é
  legado. Dependência nova precisa de justificativa no `plano.md`.
- **Provedores:** LLM e música são plugáveis (`app/models/llm_provider.py`,
  `_VIDEO_MUSIC_PROVIDERS` em `task.py`); nenhum provedor ganha tratamento especial.
- **Testes:** todo bug corrigido ganha um teste que falhava antes; toda função nova ganha teste.
  Nada de pular, desligar ou marcar teste como esperado-falhar para ficar verde.
- **Checagens (as mesmas do CI)**, antes de declarar pronto:
  ```sh
  uv run ruff check app cli.py main.py webui test docs/skill
  uv run python -X utf8 -m pytest -q test
  uv run python -X utf8 -m coverage run -m pytest -q test && uv run python -m coverage report  # fail_under = 70
  ```
  Mudança em `animations/` também roda `npm run typecheck --prefix animations`.
- **Segredos:** nunca em código, teste, log ou relatório; chaves vêm do `config.toml` ou de
  variável de ambiente.
- **Git:** o time não faz commit, push, nem abre PR; quem decide é o usuário (ou o orquestrador
  com o aval dele). Não reescreva histórico.
- **Falhas:** relate o erro real com a saída do comando; não finja que uma checagem passou.
- **Modelo por papel:** julgamento e código (arquiteto, desenvolvedor, revisor, auditores) em
  modelo intermediário; trabalho mecânico em modelo pequeno; modelo mais forte só se um papel
  errar repetidamente. No Claude Code, é a linha `model:` de `.claude/agents/<papel>.md`.

## Severidade e vereditos

Itens dos relatórios: `bloqueia` (bug, regressão, falha de segurança, teste vermelho),
`importante` (desvio de padrão que vai custar caro, falta de teste) ou `detalhe`.
Vereditos: revisor e auditor de segurança terminam com `APROVADO` ou `REVISAR`
(há `bloqueia`, ou três ou mais `importante`); o auditor de saúde não dá veredito, prioriza.
