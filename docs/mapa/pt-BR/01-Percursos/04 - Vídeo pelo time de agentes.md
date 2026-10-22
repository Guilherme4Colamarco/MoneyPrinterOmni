---
title: 04 - Vídeo pelo time de agentes
tags: [mapa, percurso, status/stable]
aliases: [Video with the agent team]
lang: pt-BR
sources: [.agents/skills/video/SKILL.md, .agents/pipeline.md, .agents/setup.md, .agents/playbooks/moneyprinter.md, .agents/roles/montador-mpt.md, .agents/skills/video/scripts/build_timeline.py, .agents/skills/video/scripts/build_music.py, .agents/skills/video/scripts/build_thumbnail.py, cli.py]
---
# 04 - Vídeo pelo time de agentes

[[00 - Índice|← Índice]]

Um vídeo de ponta a ponta: do pedido ao `entrega.md`, passando pelos doze papéis. Cada etapa grava um arquivo, e o próximo papel lê esse arquivo.

> [!info] Exemplo ilustrativo
> Nada foi rodado neste checkout: `storage/projects/` não existe. Os nomes em `<...>` são o que você troca. Os comandos e os arquivos são os reais do repositório.

## Ideia central

O percurso é uma fila de papéis com arquivos entre eles. A parte mais cara, o render, só começa depois que o roteiro passa pela revisão e o usuário aprova o pacote. Até lá, o programa só gera áudio de teste.

## Como funciona

**Pedido.** Você escreve: "siga `.agents/skills/video/SKILL.md` para um vídeo sobre <tema>, 60 s, 9:16, pt-BR". A skill recebe duração, formato e idioma (`SKILL.md:8-9`).

**Etapa 0 · Perfil e brief.** O assistente lê `setup.md` e escolhe o perfil. Com `tecnologia` como perfil, cria `storage/projects/<slug>/brief.md`:

```
perfil: tecnologia
tema: <tema>
angulo: <a tese em uma frase>
```

Só o que difere do perfil entra no brief (`SKILL.md:32-33`).

**Etapa 1 · `pesquisador`.** Escreve `research.md` (fatos com fonte), `sources.json` (vídeos por cena), `script.txt` (só o texto narrado) e `music-plan.md` (clima de cada bloco). Fato sem fonte não entra; assunto recente pede duas fontes (`setup.md:51-52`).

**Etapa 2 · em paralelo.** `critico` grava `critique/content-01.md`, `sugestor-de-pauta` grava `critique/ideas-01.md` e `auditor` grava `audit/fatos-01.md` com `OK` ou `CORRIGIR`. Se houver `REVISAR`, `CORRIGIR` ou sugestão de alto ganho, o pesquisador revisa. No máximo duas rodadas (`SKILL.md:44-45`).

**Etapa 4 · `diretor-de-arte`.** Grava `arte.json`. Um exemplo, como no contrato (`pipeline.md:103-108`):

```json
{"legenda": {"font_name": "BeVietnamPro-Bold.ttf", "text_fore_color": "#FFFFFF", "stroke_color": "#000000"},
 "texto_na_tela": {"font": "BeVietnamPro-Bold.ttf", "color": "#FFD400", "size": 96, "box": true},
 "thumbnail": {"font": "BeVietnamPro-Bold.ttf", "color": "#FFFFFF", "accent": "#FFD400"}}
```

**Etapa 5 · parada.** `diretor` grava `aprovacao-01.md` com roteiro, duração, clima da música, plano visual e pendências. O assistente mostra e espera. Sem o aval do usuário, nada é baixado (`SKILL.md:47-49`).

**Etapa 6 · `montador-mpt`, modo tempo.** Tudo passa pelo dev shell (`moneyprinter.md:6`). Primeiro, o teste de áudio:

```sh
nix develop --command bash -c '.venv/bin/python cli.py --video-script "$(cat storage/projects/<slug>/script.txt)" --video-language pt-BR --voice-rate 1.0 --stop-at audio'
```

A última linha é um JSON com `audio_duration`. A meta é ±3 s da duração alvo. Ajuste o texto primeiro; a velocidade só entre 0,95 e 1,10 (`montador-mpt.md:24-26`). Depois, a legenda e os tempos:

```sh
nix develop --command bash -c '.venv/bin/python cli.py ... --stop-at subtitle'
python3 .agents/skills/video/scripts/srt_to_timing.py storage/tasks/<task_id>/subtitle.srt storage/projects/<slug>/timing.json
```

A trilha vem em seguida: `music.json` com as deixas, e `build_music.py <proj> --preview`. O script grava `bgm.mp3`, copia para `storage/bgm/<slug>.mp3` e imprime `--bgm-type custom --bgm-file <slug>.mp3` (`build_music.py:116-120`).

**Etapa 7 · `cacador-de-clipes`.** Assiste aos vídeos em baixa resolução, escolhe o trecho de cada frase e grava `shotlist.json`. Cenas com `anim` vão para o `animador` (etapa 7b, ver [[Animações com Remotion]]).

**Etapa 8 · `editor-de-clipes`.** Gera a timeline e confere a prévia:

```sh
python3 .agents/skills/video/scripts/build_timeline.py storage/projects/<slug> --aspect 9:16 --preview
```

O script imprime a duração de cada clipe e o total (`build_timeline.py:225-228`) e grava `raw/timeline_preview.png`. O editor olha a imagem antes de seguir. Depois escreve `credits.md`.

**Etapa 9 · `montador-mpt`, modo render.** A chamada junta os clipes, a trilha e a legenda:

```sh
nix develop --command bash -c '.venv/bin/python cli.py --video-script "$(cat storage/projects/<slug>/script.txt)" --video-language pt-BR --voice-name <voz> --voice-rate <igual ao teste> --video-aspect 9:16 --video-source local --video-materials "$(ls storage/projects/<slug>/timeline/*.mp4 | paste -sd,)" --video-concat-mode sequential --video-transition-mode none --video-clip-duration <maior clipe> --bgm-type custom --bgm-file <slug>.mp3 --bgm-volume 0.2'
```

Os parâmetros da legenda vêm do `arte.json`, traduzidos para `--font-name`, `--text-fore-color`, `--stroke-color` e as demais flags (`montador-mpt.md:21`). O resultado é copiado para `output/final.mp4` e conferido com `ffprobe`. O `--video-clip-duration` é o corte de cada clipe (`app/services/video.py:1154-1155`).

**Etapa 10 · em paralelo.** `critico` grava `critique/visual-01.md` e `auditor` grava `audit/direitos-01.md`. Se algum reprovar, só as cenas apontadas voltam: `build_timeline.py --only 07,12`, e o render roda de novo.

**Etapa 11 · em paralelo.** `designer-de-thumbnail` gera a capa:

```sh
python3 .agents/skills/video/scripts/build_thumbnail.py storage/projects/<slug> --from timeline/07.mp4 --at 1.5 --text "<LINHA 1>|<LINHA 2>"
```

O `redator-de-publicacao` grava `publicacao/publicacao.md`: títulos, descrição, créditos e tags.

**Etapa 12 · `diretor` (entrega).** Confere o checklist e grava `entrega.md` com `PRONTO` ou `REFAZER <etapa>`. Anota o vídeo no Histórico do perfil.

**Etapa 13 · relatório.** Caminho do vídeo, capas, títulos prontos para colar e pendências. Nada é publicado.

## Por que funciona

- **Arquivos são a interface.** Cada papel só precisa do contrato. O revisor não precisa saber quem escreveu o roteiro.
- **O caro vem depois das paradas.** Roteiro e aprovação vêm antes de download e render.
- **Clipes já cortados.** Cada clipe sai com a duração da cena, então o modo `sequential` não precisa adivinhar onde cortar.
- **Mesmo texto, mesma velocidade.** O teste de áudio e o render usam o mesmo texto e o mesmo `--voice-rate`. Senão a sincronia quebra (`montador-mpt.md:41`).

## Armadilhas

- **Python fora do dev shell.** O `.venv` usa o Python do Nix e precisa do `libstdc++` do flake. Rodar `python3 cli.py` fora do `nix develop` falha. Os scripts da skill são a exceção: rodam com `python3` puro.
- **Tarefas de teste.** Apague de `storage/tasks/` as tasks de teste descartadas. A regra está em `SKILL.md:126`.
- **Download de terceiros.** Na nuvem, o `yt-dlp` falha no YouTube sem login. Ver [[MCP e permissões]].
- **Velocidade fora da faixa.** Se o áudio não bater em ±10%, o problema é o texto. Corte o roteiro.

## Prática

1. Por que o `--stop-at audio` vem antes do `--stop-at subtitle`?
2. Você não tem material para uma cena. O que o editor faz e o que o assistente pergunta ao usuário?
3. O `critico` aponta `REVISAR` na etapa 10. Quantas rodadas de refação são permitidas?

> [!faq]- Gabarito
> 1. Porque o áudio dá a duração, que define o texto e a velocidade. Só depois disso a legenda e os tempos têm sentido (`montador-mpt.md:24-27`).
> 2. O editor não inventa clipe. O assistente pergunta se o usuário grava ou envia algo, ou se aceita stock (`SKILL.md:56`).
> 3. Duas rodadas no máximo (`SKILL.md:64-66`).

## Conexões

- Anterior: [[Time de vídeo e contratos de arquivo]]. Próximo: [[05 - Mudança pelo time técnico]].
- Conceitos: [[Pipeline e stop_at]], [[Voz e legenda]], [[Material de vídeo]], [[Música e publicação]], [[Perfis de canal]].
- Referência: [[Contratos JSON dos agentes]], [[Papéis e modelos]], [[Flags do CLI]].
- Canvas: [[04 - Time de vídeo.canvas|Canvas do time de vídeo]].
