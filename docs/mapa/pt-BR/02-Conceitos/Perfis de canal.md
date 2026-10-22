---
title: Perfis de canal
tags: [mapa, video, status/stable]
aliases: [Channel profiles]
lang: pt-BR
sources: [.agents/perfis/_modelo.md, .agents/perfis/saude.md, .agents/setup.md, .agents/gostos.md, .agents/skills/video/SKILL.md, .agents/playbooks/moneyprinter.md]
---
# Perfis de canal

[[00 - Índice|← Índice]]

Cada vídeo pertence a um **perfil**: o jeito de um canal dark (sem rosto) falar, mostrar e embalar um assunto.

## Ideia central

O perfil é o terceiro item da ordem de prioridade. Ele diz o público, o tom, a narração, o visual, a trilha e as fontes. Um vídeo herda tudo do perfil e só escreve no `brief.md` o que muda. Só duas coisas não são sobrescritas por perfil: as "Regras fixas" do setup e os "Cuidados obrigatórios" do perfil (`setup.md:15`).

## Como funciona

1. **Arquivos.** `.agents/perfis/` tem o modelo `_modelo.md` e cinco perfis: `financas`, `historia-ciencia`, `infantil`, `saude` e `tecnologia`.
2. **Cabeçalho.** Cada perfil começa com um bloco de campos: `perfil` (o nome do arquivo sem `.md`), `nome`, `link`, `plataformas`, `idioma`, `voz`, `velocidade`, `formato` e `duracao` (`_modelo.md:1-11`).
3. **Treze seções**, nesta ordem (`_modelo.md:20-99`): Identidade (20), Narração (30), Roteiro (37), Identidade visual (44), Trilha (53), Fontes de informação (59), Imagem (65), Cuidados obrigatórios (72), O que funciona (77), Embalagem (81), Gostos do canal (87), Canais de referência (91) e Histórico (99).
4. **Escolha.** Se o pedido não diz o perfil: com um só, usa-o; com vários, lista nome e público e pergunta; sem nenhum, segue com os padrões e oferece criar um a partir do modelo (`setup.md:19-25`, `SKILL.md:27-30`).
5. **Gostos.** `gostos.md` vale para todos os perfis. Um perfil pode mudar qualquer item da seção "Gostos do canal" (`gostos.md:3-4`).
6. **Histórico.** Ao terminar um vídeo, o diretor anota na tabela do perfil: data, slug, duração e o que funcionou (`setup.md:29-30`, `SKILL.md:69-70`). A tabela de cada perfil é o lugar dessas notas.

## Exemplo / percurso

O perfil `saude` (`saude.md`) mostra o uso das seções:

- **Cuidados obrigatórios** (linha 63): "Nada de diagnóstico, prescrição ou dose; oriente procurar um profissional." Esta seção não é sobrescrita por pedido de brief.
- **Histórico** (linha 85): tabela com as colunas Data, Vídeo (slug), Duração e Observações.

Para usar, o pedido diz "use o perfil saude" ou o assistente pergunta. Ao criar o `brief.md`, ele escreve `perfil: saude`.

## Armadilhas

- **Referência não é molde.** Canais de referência ensinam ritmo, gancho e estrutura. Não copie roteiro, bordão, vinheta ou trecho deles, salvo quando o perfil diz que o material é liberado (`setup.md:26-28`).
- **Voz com nome diferente.** O modelo traz `voz: pt-BR-AntonioNeural-Male` (`_modelo.md:7`), e o playbook escreve `pt-BR-AntonioNeural` (`moneyprinter.md:17`). O mesmo nome aparece com sufixos diferentes em dois arquivos; ver [[Voz e legenda]].
- **Perfil sem a seção de cuidados.** Um perfil novo que esquece "Cuidados obrigatórios" perde a proteção. Copie sempre do `_modelo.md`.

> [!warning] unstable
> A **proposta** de perfil em pasta, com `assets/`, `assets.json` e `referencias/`, está **PLANEJADO**. Não existe no código nem em arquivos: nenhuma referência a `assets.json` ou a `referencias/` foi encontrada no repositório. Ela leva `status/unstable` e não deve ser usada até existir.

## Prática

1. Um pedido de vídeo não cita perfil, e há dois perfis. O que o assistente faz?
2. Onde fica a regra que um perfil não pode sobrescrever?
3. Quando o diretor atualiza o perfil, e com que dados?

> [!faq]- Gabarito
> 1. Lista nome e público de cada um e pergunta qual usar (`setup.md:21-22`).
> 2. As "Regras fixas" do setup e os "Cuidados obrigatórios" do perfil (`setup.md:15`).
> 3. Ao terminar o vídeo, com data, slug, duração e o que funcionou ou não (`setup.md:29-30`).

## Conexões

- Anterior: [[Time de vídeo e contratos de arquivo]]. Ver também: [[Voz e legenda]], [[Música e publicação]], [[Material de vídeo]].
- Canvas: [[04 - Time de vídeo.canvas|Canvas do time de vídeo]].
