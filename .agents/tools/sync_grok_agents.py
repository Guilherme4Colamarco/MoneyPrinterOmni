"""Gera os adaptadores do Grok Build em `.grok/agents/` a partir de `.claude/agents/`.

`.agents/roles/` continua sendo a fonte única dos papéis. O script só copia as linhas
`name`, `description` e `tools` do adaptador Claude, troca `model` por `inherit` (o Grok
não tem `sonnet`) e aponta o corpo para o papel.

Uso:
    python3 .agents/tools/sync_grok_agents.py           # gera ou atualiza
    python3 .agents/tools/sync_grok_agents.py --check   # só confere; sai com 1 se desatualizado
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
ORIGEM = RAIZ / ".claude" / "agents"
DESTINO = RAIZ / ".grok" / "agents"
PAPEIS = RAIZ / ".agents" / "roles"
# Marca presente em todo adaptador gerado; usada para não apagar arquivos feitos à mão.
MARCA = "Adaptador do Grok Build."
CORPO = (
    "Adaptador do Grok Build. Leia e siga `.agents/roles/{papel}.md` — "
    "fonte única deste papel, compartilhada com qualquer outro assistente de IA."
)


def _linha(frontmatter: list[str], chave: str) -> str:
    """Devolve a linha `chave: valor` inteira, sem alterar o texto."""
    for linha in frontmatter:
        if linha.startswith(f"{chave}:"):
            return linha
    raise ValueError(f"campo '{chave}' ausente no frontmatter")


def gerar(adaptador: Path) -> str:
    """Monta o conteúdo do adaptador Grok a partir do adaptador Claude."""
    linhas = adaptador.read_text(encoding="utf-8").splitlines()
    if not linhas or linhas[0].strip() != "---" or "---" not in linhas[1:]:
        raise ValueError(f"{adaptador.name}: frontmatter ausente")
    fim = linhas.index("---", 1)
    frontmatter = linhas[1:fim]
    return "\n".join(
        [
            "---",
            _linha(frontmatter, "name"),
            _linha(frontmatter, "description"),
            "model: inherit",
            _linha(frontmatter, "tools"),
            "---",
            "",
            CORPO.format(papel=adaptador.stem),
            "",
        ]
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="só confere; não escreve nada")
    args = parser.parse_args(argv)

    esperados: dict[str, str] = {}
    for adaptador in sorted(ORIGEM.glob("*.md")):
        if not (PAPEIS / adaptador.name).is_file():
            print(f"erro: {adaptador.name} não tem papel em .agents/roles/", file=sys.stderr)
            return 2
        try:
            esperados[adaptador.name] = gerar(adaptador)
        except ValueError as erro:
            print(f"erro: {erro}", file=sys.stderr)
            return 2

    pendentes: list[str] = []
    for nome, conteudo in esperados.items():
        destino = DESTINO / nome
        atual = destino.read_text(encoding="utf-8") if destino.is_file() else None
        if atual == conteudo:
            continue
        pendentes.append(f"desatualizado: .grok/agents/{nome}")
        if not args.check:
            DESTINO.mkdir(parents=True, exist_ok=True)
            destino.write_text(conteudo, encoding="utf-8")
            print(f"gerado: .grok/agents/{nome}")

    # Adaptadores gerados cujo papel sumiu do .claude/agents/ são removidos.
    for orfao in sorted(DESTINO.glob("*.md")):
        if orfao.name in esperados or MARCA not in orfao.read_text(encoding="utf-8"):
            continue
        pendentes.append(f"órfão: .grok/agents/{orfao.name}")
        if not args.check:
            orfao.unlink()
            print(f"removido: .grok/agents/{orfao.name}")

    if args.check:
        for linha in pendentes:
            print(linha)
        if pendentes:
            return 1
        print("ok: .grok/agents em dia")
        return 0
    if not pendentes:
        print("ok: .grok/agents já estava em dia")
    return 0


if __name__ == "__main__":
    sys.exit(main())
