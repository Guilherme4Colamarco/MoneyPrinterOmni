"""Gera os adaptadores do Grok Build a partir de `.claude/agents/`.

`.agents/roles/` continua sendo a fonte única dos papéis. O script escreve duas pastas:

- `.grok/agents/`: copia `name`, `description`, `tools` e `skills`, troca `model` por `inherit`,
  liga `agents_md: true` (o Grok não tem `sonnet`) e aponta o corpo para o papel.
- `.grok/personas/`: um `.toml` por papel, com a mesma `description` e a instrução
  que aponta para o papel. O nome do arquivo é o nome da persona.

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
DESTINO_PERSONAS = RAIZ / ".grok" / "personas"
PAPEIS = RAIZ / ".agents" / "roles"
# Marca presente em todo adaptador gerado; usada para não apagar arquivos feitos à mão.
MARCA = "Adaptador do Grok Build."
CORPO = (
    "Adaptador do Grok Build. Leia e siga `.agents/roles/{papel}.md` — "
    "fonte única deste papel, compartilhada com qualquer outro assistente de IA. "
    "Siga `AGENTS.md` e `CLAUDE.md`: comandos do projeto rodam com `nix develop --command ...`."
)


def _linha(frontmatter: list[str], chave: str) -> str:
    """Devolve a linha `chave: valor` inteira, sem alterar o texto."""
    for linha in frontmatter:
        if linha.startswith(f"{chave}:"):
            return linha
    raise ValueError(f"campo '{chave}' ausente no frontmatter")


def _valor(frontmatter: list[str], chave: str) -> str:
    """Devolve o texto depois de `chave:`, sem aspas de YAML."""
    texto = _linha(frontmatter, chave).split(":", 1)[1].strip()
    if len(texto) >= 2 and texto[0] == texto[-1] and texto[0] in {'"', "'"}:
        return texto[1:-1]
    return texto


def _frontmatter(adaptador: Path) -> list[str]:
    linhas = adaptador.read_text(encoding="utf-8").splitlines()
    if not linhas or linhas[0].strip() != "---" or "---" not in linhas[1:]:
        raise ValueError(f"{adaptador.name}: frontmatter ausente")
    return linhas[1 : linhas.index("---", 1)]


def _yaml_valor(texto: str) -> str:
    """Cota o valor quando o YAML simples quebraria. O Grok rejeita `:` solto na descrição."""
    if texto == "" or any(c in texto for c in ':#"\'\n') or texto[0] in " \t[{&*!|>%@`" or texto != texto.strip():
        escapado = texto.replace("\\", "\\\\").replace('"', '\\"')
        return f'"{escapado}"'
    return texto


def _toml_string(texto: str) -> str:
    """String básica do TOML. O conteúdo não é interpretado como escape."""
    escapado = (
        texto.replace("\\", "\\\\")
        .replace('"', '\\"')
        .replace("\b", "\\b")
        .replace("\f", "\\f")
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\t", "\\t")
    )
    return f'"{escapado}"'


def gerar(adaptador: Path) -> str:
    """Monta o conteúdo do adaptador Grok a partir do adaptador Claude."""
    frontmatter = _frontmatter(adaptador)
    return "\n".join(
        [
            "---",
            _linha(frontmatter, "name"),
            f"description: {_yaml_valor(_valor(frontmatter, 'description'))}",
            "model: inherit",
            _linha(frontmatter, "tools"),
            "agents_md: true",
            *([f"skills: {_valor(frontmatter, 'skills')}"] if any(l.startswith("skills:") for l in frontmatter) else []),
            "---",
            "",
            CORPO.format(papel=adaptador.stem),
            "",
        ]
    )


def gerar_persona(adaptador: Path) -> str:
    """Monta a persona do Grok: descrição do Claude e instrução que aponta para o papel."""
    frontmatter = _frontmatter(adaptador)
    return "\n".join(
        [
            f"description = {_toml_string(_valor(frontmatter, 'description'))}",
            f"instructions = {_toml_string(CORPO.format(papel=adaptador.stem))}",
            "",
        ]
    )


def _sincronizar(destino: Path, esperados: dict[str, str], padrao: str, check: bool) -> list[str]:
    """Escreve o que mudou e lista órfãos gerados. Não apaga arquivo sem a marca."""
    pendentes: list[str] = []
    for nome, conteudo in esperados.items():
        arquivo = destino / nome
        atual = arquivo.read_text(encoding="utf-8") if arquivo.is_file() else None
        if atual == conteudo:
            continue
        relativo = arquivo.relative_to(RAIZ)
        pendentes.append(f"desatualizado: {relativo}")
        if not check:
            destino.mkdir(parents=True, exist_ok=True)
            arquivo.write_text(conteudo, encoding="utf-8")
            print(f"gerado: {relativo}")

    if not destino.is_dir():
        return pendentes
    for orfao in sorted(destino.glob(padrao)):
        if orfao.name in esperados or MARCA not in orfao.read_text(encoding="utf-8"):
            continue
        relativo = orfao.relative_to(RAIZ)
        pendentes.append(f"órfão: {relativo}")
        if not check:
            orfao.unlink()
            print(f"removido: {relativo}")
    return pendentes


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="só confere; não escreve nada")
    args = parser.parse_args(argv)

    agentes: dict[str, str] = {}
    personas: dict[str, str] = {}
    for adaptador in sorted(ORIGEM.glob("*.md")):
        if not (PAPEIS / adaptador.name).is_file():
            print(f"erro: {adaptador.name} não tem papel em .agents/roles/", file=sys.stderr)
            return 2
        try:
            agentes[adaptador.name] = gerar(adaptador)
            personas[f"{adaptador.stem}.toml"] = gerar_persona(adaptador)
        except ValueError as erro:
            print(f"erro: {erro}", file=sys.stderr)
            return 2

    pendentes = _sincronizar(DESTINO, agentes, "*.md", args.check)
    pendentes += _sincronizar(DESTINO_PERSONAS, personas, "*.toml", args.check)

    if args.check:
        for linha in pendentes:
            print(linha)
        if pendentes:
            return 1
        print("ok: .grok/agents e .grok/personas em dia")
        return 0
    if not pendentes:
        print("ok: .grok/agents e .grok/personas já estavam em dia")
    return 0


if __name__ == "__main__":
    sys.exit(main())
