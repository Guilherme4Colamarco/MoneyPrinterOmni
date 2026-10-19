#!/usr/bin/env sh

# Atualiza o MoneyPrinterOmni para a versão mais recente do GitHub.
# Seu config.toml, a pasta storage/ e a .venv não são tocados.
#
# Uso:
#   ./update.sh                  baixa e instala a atualização
#   ./update.sh --check          só mostra se existe atualização, sem mudar nada
#   ./update.sh --check --quiet  aviso de uma linha (stderr), só se houver atualização;
#                                silencioso se estiver em dia ou sem internet. É o que
#                                o `nix develop` roda ao entrar no ambiente.
#
# Variáveis opcionais:
#   MPT_UPDATE_REMOTE                remoto do git a usar (padrão: origin)
#   MPT_UPDATE_CHECK_INTERVAL_MIN    intervalo mínimo entre consultas ao GitHub no
#                                    modo --quiet, em minutos (padrão: 360)
#   MPT_NO_UPDATE_CHECK=1            desliga a checagem automática do `nix develop`

set -eu

CURRENT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$CURRENT_DIR"

REMOTE="${MPT_UPDATE_REMOTE:-origin}"
CHECK_INTERVAL_MIN="${MPT_UPDATE_CHECK_INTERVAL_MIN:-360}"
CHECK_ONLY=0
QUIET=0

usage() {
  echo "Uso: ./update.sh [--check [--quiet]]"
  echo "  (sem opção)       baixa e instala a atualização"
  echo "  --check           só mostra se existe atualização"
  echo "  --check --quiet   aviso curto, só se houver atualização"
}

for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=1 ;;
    --quiet) QUIET=1 ;;
    -h | --help) usage; exit 0 ;;
    *) usage >&2; exit 2 ;;
  esac
done

if [ "$QUIET" -eq 1 ] && [ "$CHECK_ONLY" -eq 0 ]; then
  usage >&2
  exit 2
fi

# No modo silencioso qualquer problema termina sem ruído: a checagem
# automática nunca pode atrapalhar quem só quer entrar no ambiente.
fail() {
  if [ "$QUIET" -eq 1 ]; then
    exit 0
  fi
  echo "***** $* *****" >&2
  exit 1
}

say() {
  if [ "$QUIET" -eq 0 ]; then
    echo "$@"
  fi
}

# Roda o comando dentro do ambiente do Nix quando ele existe (o Python do
# projeto depende das bibliotecas do flake); senão, roda direto.
run_in_env() {
  if command -v nix >/dev/null 2>&1 && [ -f flake.nix ]; then
    nix develop --command "$@"
  else
    "$@"
  fi
}

# git fetch com prazo: no macOS não existe `timeout`, então esperamos em laço.
# Prazo em décimos de segundo: 5 s no modo silencioso, 60 s no normal.
fetch_remote() {
  limit=600
  if [ "$QUIET" -eq 1 ]; then
    limit=50
  fi
  git fetch --quiet "$REMOTE" "+refs/heads/$BRANCH:refs/remotes/$REMOTE/$BRANCH" 2>/dev/null &
  fetch_pid=$!
  waited=0
  while kill -0 "$fetch_pid" 2>/dev/null; do
    if [ "$waited" -ge "$limit" ]; then
      kill "$fetch_pid" 2>/dev/null || true
      wait "$fetch_pid" 2>/dev/null || true
      return 1
    fi
    sleep 0.1
    waited=$((waited + 1))
  done
  wait "$fetch_pid"
}

command -v git >/dev/null 2>&1 || fail "O git não foi encontrado. No Mac, rode 'xcode-select --install'."
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "Esta pasta não é um repositório git. Baixe o programa com 'git clone'."
git remote get-url "$REMOTE" >/dev/null 2>&1 || fail "O remoto '$REMOTE' não existe neste repositório."

BRANCH=$(git symbolic-ref --short -q HEAD) || fail "O repositório está sem branch ativa (HEAD solta). Rode 'git checkout main' e tente de novo."
TARGET="refs/remotes/$REMOTE/$BRANCH"

# No modo silencioso, consulta o GitHub no máximo uma vez por intervalo; entre
# uma consulta e outra, o aviso continua saindo a partir da última busca.
NEED_FETCH=1
if [ "$QUIET" -eq 1 ]; then
  STAMP="$(git rev-parse --git-dir)/omni-update-check"
  if [ -f "$STAMP" ] && [ -n "$(find "$STAMP" -mmin "-$CHECK_INTERVAL_MIN" 2>/dev/null)" ]; then
    NEED_FETCH=0
  else
    touch "$STAMP" 2>/dev/null || true
  fi
fi

if [ "$NEED_FETCH" -eq 1 ]; then
  say "Procurando atualizações em $REMOTE/$BRANCH..."
  fetch_remote || fail "Não consegui acessar o GitHub. Confira a internet e tente de novo."
fi

git rev-parse --verify --quiet "$TARGET" >/dev/null || fail "Não encontrei $REMOTE/$BRANCH no GitHub."

BEHIND=$(git rev-list --count "HEAD..$TARGET")
AHEAD=$(git rev-list --count "$TARGET..HEAD")

if [ "$BEHIND" -eq 0 ]; then
  say "Já está na versão mais recente."
  exit 0
fi

if [ "$QUIET" -eq 1 ]; then
  echo "[omni] Há $BEHIND atualização(ões) do MoneyPrinterOmni. Rode ./update.sh para instalar." >&2
  exit 0
fi

echo "Há $BEHIND atualização(ões) disponível(is):"
git log --oneline --no-decorate "HEAD..$TARGET" | head -15
if [ "$BEHIND" -gt 15 ]; then
  echo "  ... e mais $((BEHIND - 15))."
fi

if [ "$CHECK_ONLY" -eq 1 ]; then
  echo "Rode ./update.sh para instalar."
  exit 0
fi

if [ "$AHEAD" -gt 0 ]; then
  fail "Seu código tem $AHEAD commit(s) locais que o GitHub não tem, e o GitHub tem $BEHIND novo(s). Não vou misturar sozinho; resolva com 'git pull --rebase'."
fi

# Mudanças locais em arquivos rastreados atrapalhariam a atualização.
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Há mudanças locais em arquivos do programa:" >&2
  git status --short --untracked-files=no >&2
  fail "Guarde-as antes com 'git stash' (e recupere depois com 'git stash pop') e rode ./update.sh de novo."
fi

OLD_HEAD=$(git rev-parse HEAD)
git merge --ff-only --quiet "$TARGET" || fail "Não foi possível atualizar sem conflitos."
CHANGED=$(git diff --name-only "$OLD_HEAD" HEAD)

has_changed() {
  printf '%s\n' "$CHANGED" | grep -Eq "$1"
}

# Bibliotecas Python mudaram: sincroniza com o uv.lock.
if has_changed '^(pyproject\.toml|uv\.lock)$'; then
  echo "As bibliotecas Python mudaram; instalando..."
  if { command -v nix >/dev/null 2>&1 && [ -f flake.nix ]; } || command -v uv >/dev/null 2>&1; then
    run_in_env uv sync --frozen || fail "Falha ao instalar as bibliotecas. Rode 'nix develop' e depois 'uv sync --frozen' para ver o erro."
  else
    echo "Aviso: nem o Nix nem o uv foram encontrados; rode 'uv sync --frozen' quando puder." >&2
  fi
fi

# Animações (Remotion) só são reinstaladas se você já as tinha instalado.
if has_changed '^animations/package(-lock)?\.json$' && [ -d animations/node_modules ]; then
  echo "As dependências das animações mudaram; instalando..."
  run_in_env npm ci --prefix animations || echo "Aviso: 'npm ci --prefix animations' falhou; rode-o manualmente." >&2
fi

echo
echo "Atualizado: $(git rev-parse --short "$OLD_HEAD") -> $(git rev-parse --short HEAD) ($BEHIND atualização(ões))."

if has_changed '^config\.example\.toml$'; then
  echo "Há opções novas em config.example.toml. Seu config.toml foi mantido; compare com:"
  echo "  diff config.example.toml config.toml"
fi

echo "Se o programa estiver aberto, feche (Ctrl + C) e ligue de novo para usar a versão nova."
