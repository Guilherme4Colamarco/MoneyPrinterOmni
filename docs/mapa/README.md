# Mapa do MoneyPrinterOmni · MoneyPrinterOmni Map

**pt-BR** · [English below](#english)

Apostila 4D e mapa do projeto: a lógica do pipeline, as integrações, o harness de agentes e a organização do repositório.

| Para quem | Abra |
|---|---|
| **Humanos** (navegar com calma) | `site/index.html` no navegador (funciona offline, pt-BR e en) |
| **Obsidian** | a pasta `pt-BR/` ou `en/` como vault; comece por `00 - Índice` e pelo canvas `00 - Geral` |
| **Agentes e contribuidores** | [`MAPA.md`](MAPA.md) (um arquivo só) e depois as notas citadas por ele |

## Estrutura
```
docs/mapa/
├─ MAPA.md · MAPA.en.md      mapa compacto para agentes
├─ pt-BR/ · en/              dois vaults Obsidian com as mesmas 32 notas e 8 canvas
│  ├─ 01-Percursos/          casos resolvidos do começo ao fim
│  ├─ 02-Conceitos/          a teoria, com prática e gabarito
│  ├─ 03-Canvas/             fluxos desenhados (.canvas, gerados por tools/)
│  └─ 04-Referência/         tabelas conferidas no código
├─ site/                     index.html + app.js + style.css + data.js (gerado)
└─ tools/                    manifesto, geradores, verificador
```

## Estado dos recursos
Cada nota tem a tag `status/stable` ou `status/unstable`. **`unstable` significa que a nota contém algo que só existe na branch `unstable`**; o callout `> [!warning] unstable` diz o quê. Regra das branches: [Branches main e unstable](pt-BR/02-Conceitos/Branches%20main%20e%20unstable.md).

## Manutenção
Os canvas **não se editam à mão**: ficam em `tools/canvases/*.py` (texto nos dois idiomas no mesmo arquivo).
```sh
python3 -m docs.mapa.tools.build_canvases   # regenera os .canvas dos dois vaults
python3 -m docs.mapa.tools.build_index      # regenera os índices (descrições em tools/build_index.py)
python3 -m docs.mapa.tools.check_vault      # confere arquivos, links, índice, canvas e paridade pt-BR/en
python3 -m docs.mapa.tools.build_site       # regenera site/data.js a partir dos vaults
```
Ao mudar o código, atualize a nota que o cita (`sources:` no frontmatter diz de onde veio cada fato) nos **dois** idiomas e rode as quatro linhas acima. Nota nova: acrescente-a em `tools/manifest.py` e em `tools/build_index.py`.

---

## English

4D study guide and project map: the pipeline logic, the integrations, the agent harness and how the repository is organised.

- **Humans:** open `site/index.html` in a browser (works offline, pt-BR and en).
- **Obsidian:** open `pt-BR/` or `en/` as a vault; start at `00 - Index` and the `00 - Overview` canvas.
- **Agents and contributors:** [`MAPA.en.md`](MAPA.en.md) (one file), then the notes it cites.

Both vaults hold the same 32 notes and 8 canvases. Each note is tagged `status/stable` or `status/unstable`; **`unstable` means the note contains something that only exists in the `unstable` branch** and its callout says what. Canvases are generated from `tools/canvases/*.py` (both languages in one file); use the four commands above to rebuild, check and regenerate the site. When code changes, update the note that cites it in **both** languages.
