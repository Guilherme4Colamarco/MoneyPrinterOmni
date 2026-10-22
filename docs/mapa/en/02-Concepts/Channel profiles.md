---
title: Channel profiles
tags: [mapa, video, status/stable]
aliases: [Perfis de canal]
lang: en
sources: [.agents/perfis/_modelo.md, .agents/perfis/saude.md, .agents/setup.md, .agents/gostos.md, .agents/skills/video/SKILL.md, .agents/playbooks/moneyprinter.md]
---
# Channel profiles

[[00 - Index|← Index]]

Every video belongs to a **profile**: the way a faceless dark channel speaks, shows and packages a topic.

## Core idea

The profile is the third item in the priority order. It sets the audience, tone, narration, look, music and sources. A video inherits everything from its profile and writes into `brief.md` only what changes. Only two things are not overridden by a profile: the "Fixed rules" of the setup and the profile's "Mandatory cautions" (`setup.md:15`).

## How it works

1. **Files.** `.agents/perfis/` has the template `_modelo.md` and five profiles: `financas`, `historia-ciencia`, `infantil`, `saude` and `tecnologia`.
2. **Header.** Each profile starts with a block of fields: `perfil` (the file name without `.md`), `nome`, `link`, `plataformas`, `idioma`, `voz`, `velocidade`, `formato` and `duracao` (`_modelo.md:1-11`).
3. **Thirteen sections**, in this order (`_modelo.md:20-99`): Identity (20), Narration (30), Script (37), Visual identity (44), Music (53), Information sources (59), Images (65), Mandatory cautions (72), What works (77), Packaging (81), Channel tastes (87), Reference channels (91) and History (99).
4. **Choice.** If the request does not name a profile: with one, use it; with several, list each name and audience and ask; with none, follow the defaults and offer to create one from the template (`setup.md:19-25`, `SKILL.md:27-30`).
5. **Tastes.** `gostos.md` applies to every profile. A profile can change any item in its "Channel tastes" section (`gostos.md:3-4`).
6. **History.** When a video ends, the director notes it in the profile's table: date, slug, length and what worked (`setup.md:29-30`, `SKILL.md:69-70`). Profiles have the table empty or with a few rows.

## Example / walkthrough

The `saude` profile (`saude.md`) shows how the sections are used:

- **Mandatory cautions** (line 63): "No diagnosis, prescription or dose; advise seeing a professional." No brief overrides this section.
- **History** (line 85): a table with the columns Date, Video (slug), Duration and Notes.

To use it, the request says "use the saude profile", or the assistant asks. When it writes `brief.md`, it writes `perfil: saude`.

## Pitfalls

- **A reference is not a template.** Reference channels teach rhythm, hook and structure. Do not copy their script, catchphrase, jingle or footage, unless the profile says the material is released (`setup.md:26-28`).
- **Voice names differ.** The template has `voz: pt-BR-AntonioNeural-Male` (`_modelo.md:7`), and the playbook writes `pt-BR-AntonioNeural` (`moneyprinter.md:17`). The same name appears with different suffixes in two files; see [[Voice and subtitles]].
- **A profile without the cautions section.** A new profile that leaves out "Mandatory cautions" loses the protection. Always copy from `_modelo.md`.

> [!warning] unstable
> The **proposal** for a folder-based profile, with `assets/`, `assets.json` and `referencias/`, is **PLANNED**. It does not exist in the code or in any file: no reference to `assets.json` or `referencias/` was found in the repository. It is `status/unstable` and should not be used until it exists.

## Practice

1. A video request names no profile, and there are two profiles. What does the assistant do?
2. Where is the rule that a profile cannot override?
3. When the director updates the profile, with what data?

> [!faq]- Answer key
> 1. It lists each name and audience and asks which one to use (`setup.md:21-22`).
> 2. The setup's "Fixed rules" and the profile's "Mandatory cautions" (`setup.md:15`).
> 3. When the video ends, with date, slug, length and what did or did not work (`setup.md:29-30`).

## Connections

- Previous: [[Video team and file contracts]]. See also: [[Voice and subtitles]], [[Music and publishing]], [[Video material]].
- Canvas: [[04 - Video team.canvas|Video team canvas]].
