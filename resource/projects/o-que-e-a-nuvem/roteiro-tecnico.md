# Roteiro Técnico Audiovisual (`roteiro-tecnico.md`) — O que é a nuvem? (`infortux`)

Este roteiro integra **Narração (`script.txt`)**, **Legendas Dinâmicas (com palavra-chave em `#F9BD3C`)**, **Texto na Tela (`On-Screen Text`)**, **Efeitos Sonoros (`SFX`)**, **Música (`BGM`)** e **Efeitos Especiais (`VFX 3D & Motion`)** cena a cena.

---

## Mapa Sonoro e Visual Frase a Frase (13 Cenas — `60s`)

### ATO 1 — Gancho & Analogia da Mochila (`0.0s – 18.0s`)
- **BGM do Ato 1**: *Marimba Curiosa & Pizzicato Leve* (`-20 dBFS`, 108 BPM, clima de descoberta).

#### Cena 01 (`0.0s – 4.5s`) — O Gancho
- **Narração**: *"Quando você salva uma foto na nuvem, ela sobe para o céu?"*
- **Legenda Dinâmica (`y: 80%`)**: `Quando você salva uma foto na` **`[NUVEM]`** *(pop `#F9BD3C`)* `, ela sobe para o` **`[CÉU?]`** *(pop `#F9BD3C`)*
- **Texto no Topo (`y: 220px`)**: `SOBE PRO` / `CÉU?` (com 5 triângulos low poly laranjas/amarelos se juntando atrás da palavra `CÉU?`).
- **SFX (Efeitos Sonoros)**:
  - `0.1s` (em *"salva uma foto"*): **Shutter Click** suave de câmera fotográfica (`sfx_camera_click.wav`, `-12 dB`).
  - `2.2s` (em *"sobe para o céu?"*): **Slide Whistle / Whoosh ascendente** suave + **Plim de interrogação** (`sfx_question_plim.wav`, `-10 dB`).
- **VFX / Efeito Especial 3D**:
  - **Pinguim Infortux (`take_pinguim_curioso`)** inclina a cabeça `6°` para a direita olhando para cima; os **fones laranjas pulsam** (`escala 1.0 → 1.08`) junto com o *plim* da pergunta.

---

#### Cena 02 (`4.5s – 9.0s`) — A Quebra de Expectativa
- **Narração**: *"Não mesmo! Na tecnologia, a nuvem fica bem firme aqui no chão."*
- **Legenda Dinâmica (`y: 80%`)**: **`[NÃO MESMO!]`** *(shake leve + `#F9BD3C`)* `Na tecnologia, a nuvem fica bem firme aqui no` **`[CHÃO.]`** *(pop `#F9BD3C`)*
- **Texto no Topo (`y: 220px`)**: `FICA NO` / `CHÃO!`
- **BGM (Ação Musical)**: **DROP / Pausa dramática** de `0.6s` na música exatamente em *"Não mesmo!"*; a batida volta em *"Na tecnologia..."*.
- **SFX (Efeitos Sonoros)**:
  - `4.5s` (em *"Não mesmo!"*): **Buzzer cômico suave / Boing de freio** (`sfx_wrong_soft.wav`, `-11 dB`).
  - `7.8s` (em *"firme aqui no chão"*): **Thud / Impacto grave macio** (`sfx_ground_thud.wav`, `-10 dB`) quando o Rack de Servidores pousa firme na base.
- **VFX / Efeito Especial 3D**:
  - Transição por **varredura diagonal de facetas** (8 frames).
  - Câmera faz *tilt down* da **Nuvem 3D Low Poly** até o **Rack de Servidores Linux** na base (`take_nuvem_servidor_geral`), acendendo os 3 feixes laranjas de conexão.

---

#### Cena 03 (`9.0s – 13.5s`) — A Mochila do Celular
- **Narração**: *"Pense na memória do celular como a sua mochila da escola."*
- **Legenda Dinâmica (`y: 80%`)**: `Pense na` **`[MEMÓRIA]`** *(pop `#F9BD3C`)* `do celular como a sua` **`[MOCHILA]`** *(pop `#F9BD3C`)* `da escola.`
- **Texto no Topo (`y: 220px`)**: `SUA` / `MOCHILA`
- **SFX (Efeitos Sonoros)**:
  - `9.2s` (em *"memória do celular"*): **Pop digital cristalino** (`sfx_digital_pop.wav`, `-12 dB`).
  - `11.4s` (em *"mochila da escola"*): **Zíper abrindo rápido** (`sfx_backpack_zip.wav`, `-11 dB`).
- **VFX / Efeito Especial 3D**:
  - Entrada com *zoom-in punch* (`1.0 → 1.06`) no **Chip de Memória 3D (`take_cpu_memoria`)**, com pulso luminoso dourado percorrendo as trilhas do substrato roxo.

---

#### Cena 04 (`13.5s – 18.0s`) — Mochila Cheia e Pesada
- **Narração**: *"Se colocar cadernos demais, a mochila fica cheia e bem pesada."*
- **Legenda Dinâmica (`y: 80%`)**: `Se colocar cadernos demais, a mochila fica` **`[CHEIA]`** `e bem` **`[PESADA.]`** *(pop `#F9BD3C`)*
- **Texto no Topo (`y: 220px`)**: `MEMÓRIA` / `CHEIA`
- **SFX (Efeitos Sonoros)**:
  - `14.0s – 15.5s` (em *"cadernos demais"*): **3 Pops rápidos empilhando** (`pop-pop-pop` em tom crescente, `-12 dB`).
  - `16.8s` (em *"bem pesada"*): **Som de mola / peso cômico** (`sfx_heavy_stretch.wav`, `-11 dB`).
- **VFX / Efeito Especial 3D**:
  - **Pacote de Dados 3D (`take_pacote_dados`)** infla em escala (`0.85 → 1.12`) quase encostando nas margens da zona segura central, com leve *camera shake* vertical no momento de *"bem pesada"*.

---

### ATO 2 — Data Centers, Cabos Submarinos e Linux (`18.0s – 42.0s`)
- **BGM do Ato 2**: **Virada de Clima (`crossfade 1.0s`)** para *Aventura Tecnológica / Pulso Synthwave 8-bit Suave* (118 BPM, energético e curioso).

#### Cena 05 (`18.0s – 22.5s`) — O Armário Gigante
- **Narração**: *"A nuvem funciona como um armário gigante guardado em outro prédio."*
- **Legenda Dinâmica (`y: 80%`)**: `A nuvem funciona como um` **`[ARMÁRIO GIGANTE]`** *(pop `#F9BD3C`)* `guardado em outro prédio.`
- **Texto no Topo (`y: 220px`)**: `ARMÁRIO` / `GIGANTE`
- **SFX (Efeitos Sonoros)**:
  - `18.2s` (na virada do Ato 2): **Whoosh de transição espacial** (`sfx_whoosh_clean.wav`, `-12 dB`).
  - `19.8s` (em *"armário gigante"*): **Porta metálica futurista abrindo com reverb curto** (`sfx_vault_open.wav`, `-12 dB`).
- **VFX / Efeito Especial 3D**:
  - Retorno ao conjunto **Nuvem + Servidor 3D (`take_nuvem_servidor_geral`)** com brilho volumétrico (*bloom*) suave na nuvem branca facetada.

---

#### Cena 06 (`22.5s – 27.5s`) — Data Centers e Servidores
- **Narração**: *"Esses prédios são os data centers, cheios de computadores chamados servidores."*
- **Legenda Dinâmica (`y: 80%`)**: `Esses prédios são os` **`[DATA CENTERS,]`** `cheios de computadores chamados` **`[SERVIDORES.]`** *(pop `#F9BD3C`)*
- **Texto no Topo (`y: 220px`)**: `DATA` / `CENTER`
- **SFX (Efeitos Sonoros)**:
  - `22.6s – 27.5s`: **Server Hum / Ventilação suave de Data Center + Bips eletrônicos rápidos** (`sfx_datacenter_ambience.wav`, `-16 dB`).
- **VFX / Efeito Especial 3D**:
  - **Close-up com *dolly-in* (`take_servidor_blades_close`)** nas 3 lâminas (*blades*) roxas e laranjas do servidor; os **9 LEDs amarelos (`#F9BD3C`) piscam em sequência** sincronizados com os bips eletrônicos.

---

#### Cena 07 (`27.5s – 32.5s`) — Cabos de Luz Debaixo do Mar
- **Narração**: *"Eles enviam dados pelo mundo usando cabos de luz sob o mar!"*
- **Legenda Dinâmica (`y: 80%`)**: `Eles enviam dados pelo mundo usando` **`[CABOS DE LUZ]`** `sob o` **`[MAR!]`** *(pop `#F9BD3C`)*
- **Texto no Topo (`y: 220px`)**: `CABOS NO` / `MAR`
- **SFX (Efeitos Sonoros)**:
  - `29.2s` (em *"cabos de luz"*): **Laser / Pulso de fibra óptica veloz** (`sfx_fiber_zap.wav`, `-11 dB`).
  - `31.0s` (em *"sob o mar!"*): **Borbulhar subaquático curto + Ping de sonar oceânico** (`sfx_underwater_sonar.wav`, `-11 dB`).
- **VFX / Efeito Especial 3D**:
  - **Pacote de Dados 3D (`take_pacote_dados`)** gira em alta velocidade com rastro de luz amarelo-bico (`#F9BD3C`) e laranja (`#F35A20`) atravessando o quadro.

---

#### Cena 08 (`32.5s – 37.0s`) — Vídeo Chegando em Pedacinhos
- **Narração**: *"Quando você assiste a um vídeo, o servidor manda cada pedacinho."*
- **Legenda Dinâmica (`y: 80%`)**: `Quando você assiste a um vídeo, o servidor manda cada` **`[PEDACINHO.]`** *(pop `#F9BD3C`)*
- **Texto no Topo (`y: 220px`)**: `VEM EM` / `PACOTES`
- **SFX (Efeitos Sonoros)**:
  - `35.0s – 36.8s` (em *"manda cada pedacinho"*): **Sequência rítmica de 3 blips de dados** (`blip-blip-blip` em arpejo maior, `-12 dB`).
- **VFX / Efeito Especial 3D**:
  - No `take_nuvem_servidor_geral`, zoom focado nos **3 cubinhos amarelos e laranjas trafegando pelos feixes ópticos** entre o Rack e a Nuvem, acendendo a cada *blip*.

---

#### Cena 09 (`37.0s – 42.0s`) — O Ganchinho Linux!
- **Narração**: *"E sabe quem comanda quase todos esses servidores da nuvem? O Linux!"*
- **Legenda Dinâmica (`y: 80%`)**: `E sabe quem comanda quase todos esses servidores da nuvem? O` **`[LINUX!]`** *(destaque máximo `#F9BD3C` + pop `1.08x`)*
- **Texto no Topo (`y: 220px`)**: `SERVIDOR` / `LINUX!`
- **BGM (Ação Musical)**: Leve **subida de filtro (*riser*)** até `"da nuvem?"` e **acorde brilhante de vitória** em *"O Linux!"*.
- **SFX (Efeitos Sonoros)**:
  - `37.2s`: **Teclado mecânico digitando rápido** (`sfx_keystrokes.wav`, `-14 dB`).
  - `40.8s` (exatamente em *"O Linux!"*): **Beep clássico de Terminal + Fanfarra 8-bit alegre de confirmação** (`sfx_linux_powerup.wav`, `-9 dB`).
- **VFX / Efeito Especial 3D**:
  - **Monitor Terminal 3D (`take_terminal_linux`)** exibe o prompt `>_` em amarelo-bico piscando 2 vezes e explodindo 6 triângulos low poly laranjas/amarelos ao redor do texto `SERVIDOR LINUX!`.

---

### ATO 3 — Cuidado com Adulto & Desafio Desplugado (`42.0s – 60.0s`)
- **BGM do Ato 3**: **Virada de Clima (`crossfade 1.0s`)** para *Lo-Fi Acústico / Piano Elétrico Quente e Acolhedor* (96 BPM, seguro e familiar).

#### Cena 10 (`42.0s – 46.5s`) — Contraponto CERT.br: O Computador de Outra Empresa
- **Narração**: *"Mas atenção: a nuvem é apenas o computador de outra empresa."*
- **Legenda Dinâmica (`y: 80%`)**: `Mas` **`[ATENÇÃO:]`** `a nuvem é apenas o` **`[COMPUTADOR]`** `de outra empresa.`
- **Texto no Topo (`y: 220px`)**: `OUTRO` / `COMPUTADOR`
- **SFX (Efeitos Sonoros)**:
  - `42.1s` (em *"Mas atenção"*): **Duplo sino suave de aviso amigável** (`sfx_gentle_alert.wav`, `-11 dB` — nunca sirene assustadora).
- **VFX / Efeito Especial 3D**:
  - `take_servidor_blades_close` com iluminação lateral âmbar-dourada (`#F9BD3C`) destacando as gavetas do servidor remoto.

---

#### Cena 11 (`46.5s – 51.5s`) — Peça Ajuda a um Adulto
- **Narração**: *"Por isso, sempre peça ajuda a um adulto antes de salvar arquivos."*
- **Legenda Dinâmica (`y: 80%`)**: `Por isso, sempre peça ajuda a um` **`[ADULTO]`** *(pop `#F9BD3C`)* `antes de salvar arquivos.`
- **Texto no Topo (`y: 220px`)**: `PEÇA A UM` / `ADULTO`
- **SFX (Efeitos Sonoros)**:
  - `48.2s` (em *"ajuda a um adulto"*): **Chime acolhedor de proteção / harpa curta** (`sfx_warm_chime.wav`, `-12 dB`).
- **VFX / Efeito Especial 3D**:
  - **Pinguim Infortux (`take_pinguim_curioso`)** dá uma piscada dupla amigável e assente com a cabeça, reforçando a confiança com os pais/professores.

---

#### Cena 12 (`51.5s – 55.5s`) — Chamada para o Desafio Desplugado
- **Narração**: *"Hora do desafio desplugado com um adulto aí na sua casa!"*
- **Legenda Dinâmica (`y: 80%`)**: `Hora do` **`[DESAFIO DESPLUGADO]`** *(pop `#F9BD3C`)* `com um adulto aí na sua casa!`
- **Texto no Topo (`y: 220px`)**: `DESAFIO` / `EM CASA!`
- **SFX (Efeitos Sonoros)**:
  - `51.6s` (em *"Hora do desafio"*): **Sininho de missão desbloqueada / Level Up suave** (`sfx_quest_start.wav`, `-10 dB`).
- **VFX / Efeito Especial 3D**:
  - **Fones laranjas do Pinguim** dão um pulso duplo vibrante (`1.0 → 1.08 → 1.0`) enquanto o fundo **Ubuntu Suru** respira `+5%` de brilho nas facetas.

---

#### Cena 13 (`55.5s – 60.0s`) — Fechamento Prático (O Pendrive em Casa)
- **Narração**: *"Escolham três fotos especiais para guardar fora da internet, num pendrive."*
- **Legenda Dinâmica (`y: 80%`)**: `Escolham` **`[TRÊS FOTOS]`** `especiais para guardar fora da internet, num` **`[PENDRIVE.]`** *(pop `#F9BD3C`)*
- **Texto no Topo (`y: 220px`)**: `GUARDAR` / `EM CASA`
- **SFX (Efeitos Sonoros)**:
  - `56.2s` (em *"três fotos"*): **3 cliques rápidos de câmera** (`click-click-click`, `-13 dB`).
  - `59.0s` (em *"num pendrive"*): **Som de encaixe USB seguro + Acorde final cristalino** (`sfx_usb_lock_chime.wav`, `-10 dB`).
- **VFX / Efeito Especial 3D**:
  - **Pacote de Dados 3D (`take_pacote_dados`)** fecha suas fitas laranjas com brilho dourado no selo central, terminando em pose simétrica que faz **loop perfeito** com o quadro 1 da Cena 01.
