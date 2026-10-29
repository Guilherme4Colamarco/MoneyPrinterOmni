"""
Sintetiza a trilha musical de 3 climas (bgm.mp3) + todos os efeitos sonoros (SFX)
previstos no roteiro-tecnico.md e mixa com a narração do VoiceStudio (audio.wav),
gerando `audio_master.mp3` e `bgm.mp3`.

Execução:
  /home/geko/.config/VoiceStudio/runtime/project/.venv/bin/python scripts/build_nuvem_soundscape.py resource/projects/o-que-e-a-nuvem
"""

import json
import math
import os
import subprocess
import sys
import wave

import numpy as np


def load_wav(path: str) -> tuple[np.ndarray, int]:
    with wave.open(path, "rb") as wf:
        sr = wf.getframerate()
        n = wf.getnframes()
        raw = wf.readframes(n)
        ch = wf.getnchannels()
    arr = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    if ch > 1:
        arr = arr.reshape(-1, ch).mean(axis=1)
    return arr, sr


def save_wav(path: str, samples: np.ndarray, sr: int = 24000) -> None:
    peak = float(np.max(np.abs(samples))) if len(samples) else 1.0
    if peak > 0.98:
        samples = samples * (0.96 / peak)
    pcm = np.clip(samples * 32767.0, -32768, 32767).astype(np.int16)
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(pcm.tobytes())


def env_adsr(n: int, sr: int, a: float = 0.01, d: float = 0.08, s: float = 0.4, r: float = 0.08) -> np.ndarray:
    t = np.linspace(0.0, n / sr, n, endpoint=False, dtype=np.float32)
    dur = n / sr
    env = np.ones_like(t) * s
    a_mask = t < a
    env[a_mask] = t[a_mask] / max(a, 1e-4)
    d_mask = (t >= a) & (t < a + d)
    env[d_mask] = 1.0 - (1.0 - s) * ((t[d_mask] - a) / max(d, 1e-4))
    r_start = max(a + d, dur - r)
    r_mask = t >= r_start
    env[r_mask] = s * (1.0 - (t[r_mask] - r_start) / max(dur - r_start, 1e-4))
    return np.clip(env, 0.0, 1.0)


def tone(freq: float, dur: float, sr: int = 24000, kind: str = "sine", amp: float = 0.25) -> np.ndarray:
    n = max(1, int(sr * dur))
    t = np.linspace(0.0, dur, n, endpoint=False, dtype=np.float32)
    phase = 2.0 * math.pi * freq * t
    if kind == "sine":
        w = np.sin(phase) + 0.25 * np.sin(2.0 * phase)
    elif kind == "triangle":
        w = (2.0 / math.pi) * np.arcsin(np.sin(phase))
    elif kind == "square8bit":
        w = np.sign(np.sin(phase)) * 0.6 + 0.4 * np.sin(phase)
    else:
        w = np.sin(phase)
    return (w * env_adsr(n, sr, a=0.008, d=min(0.08, dur * 0.3), s=0.45, r=min(0.08, dur * 0.3)) * amp).astype(np.float32)


def chirp(f0: float, f1: float, dur: float, sr: int = 24000, amp: float = 0.25) -> np.ndarray:
    n = max(1, int(sr * dur))
    t = np.linspace(0.0, dur, n, endpoint=False, dtype=np.float32)
    inst_f = np.linspace(f0, f1, n, dtype=np.float32)
    phase = 2.0 * math.pi * np.cumsum(inst_f) / sr
    w = np.sin(phase) + 0.2 * np.sin(2.0 * phase)
    env = np.sin(np.linspace(0.0, math.pi, n, dtype=np.float32))
    return (w * env * amp).astype(np.float32)


def add_at(buf: np.ndarray, clip: np.ndarray, t_sec: float, sr: int = 24000) -> None:
    idx = max(0, int(round(t_sec * sr)))
    if idx >= len(buf):
        return
    end = min(len(buf), idx + len(clip))
    buf[idx:end] += clip[: end - idx]


def build_bgm_3_acts(total_dur: float, segs: list[dict], sr: int = 24000) -> np.ndarray:
    """
    Gera trilha musical em 3 climas:
      - Ato 1 (Cenas 1..4): Marimba curiosa (Dó maior / Lá menor leve) com DROP na Cena 2 ("Não mesmo!")
      - Ato 2 (Cenas 5..9): Synthwave / 8-bit suave pulsante (Sol maior / Mi menor tech)
      - Ato 3 (Cenas 10..13): Piano elétrico quente e acolhedor (Fá maior7 -> Dó maior7)
    """
    n_total = int(math.ceil(total_dur * sr))
    bgm = np.zeros(n_total, dtype=np.float32)

    t_act2 = segs[4]["start"] if len(segs) >= 5 else total_dur * 0.33
    t_act3 = segs[9]["start"] if len(segs) >= 10 else total_dur * 0.72

    # Ato 1: Marimba curiosa (arpejo leve a cada 0.28s)
    notes_act1 = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 293.66, 349.23]
    step1 = 0.28
    t = 0.0
    i = 0
    while t < t_act2:
        f = notes_act1[i % len(notes_act1)]
        add_at(bgm, tone(f, 0.22, sr, kind="sine", amp=0.14), t, sr)
        if i % 4 == 0:
            add_at(bgm, tone(f * 0.5, 0.50, sr, kind="triangle", amp=0.10), t, sr)
        t += step1
        i += 1

    # DROP dramático de 0.65s no início da Cena 2 ("Não mesmo!")
    if len(segs) >= 2:
        drop_s = segs[1]["start"]
        drop_e = min(total_dur, drop_s + 0.72)
        bgm[int(drop_s * sr): int(drop_e * sr)] *= 0.05

    # Ato 2: Aventura Tech / Synthwave 8-bit suave (120 BPM -> 0.25s por semicolcheia)
    notes_act2 = [196.00, 246.94, 293.66, 392.00, 329.63, 293.66, 246.94, 392.00]
    step2 = 0.24
    t = t_act2
    i = 0
    while t < t_act3:
        f = notes_act2[i % len(notes_act2)]
        add_at(bgm, tone(f, 0.18, sr, kind="triangle", amp=0.13), t, sr)
        if i % 2 == 0:
            add_at(bgm, tone(98.0, 0.20, sr, kind="sine", amp=0.12), t, sr)
        t += step2
        i += 1

    # Ato 3: Acordes quentes de piano elétrico lo-fi
    chords_act3 = [
        (174.61, 220.00, 261.63, 329.63),  # Fmaj7
        (196.00, 246.94, 293.66, 349.23),  # G7
        (130.81, 196.00, 246.94, 329.63),  # Cmaj7
    ]
    t = t_act3
    ci = 0
    while t < total_dur:
        ch = chords_act3[ci % len(chords_act3)]
        dur_c = min(1.6, total_dur - t)
        for nf in ch:
            add_at(bgm, tone(nf, dur_c, sr, kind="sine", amp=0.065), t, sr)
        # Melodia suave no topo
        add_at(bgm, tone(ch[-1] * 2.0, 0.35, sr, kind="sine", amp=0.07), t + 0.35, sr)
        t += 1.45
        ci += 1

    return bgm


def build_sfx_track(total_dur: float, segs: list[dict], sr: int = 24000) -> np.ndarray:
    """Adiciona os efeitos sonoros (SFX) pontuais de cada uma das 13 cenas."""
    n_total = int(math.ceil(total_dur * sr))
    sfx = np.zeros(n_total, dtype=np.float32)

    def s_start(idx_1based: int) -> float:
        return segs[idx_1based - 1]["start"] if idx_1based <= len(segs) else 0.0

    def s_end(idx_1based: int) -> float:
        return segs[idx_1based - 1]["end"] if idx_1based <= len(segs) else 0.0

    # Cena 1: Shutter click (0.2s) + Whoosh/Plim pergunta no final da frase
    add_at(sfx, chirp(1800, 420, 0.045, sr, amp=0.22), s_start(1) + 0.25, sr)
    add_at(sfx, chirp(320, 980, 0.28, sr, amp=0.18), s_end(1) - 0.55, sr)
    add_at(sfx, tone(1174.66, 0.22, sr, kind="sine", amp=0.20), s_end(1) - 0.25, sr)

    # Cena 2: Buzzer cômico suave em "Não mesmo!" + Thud grave em "no chão"
    add_at(sfx, tone(155.56, 0.22, sr, kind="square8bit", amp=0.18), s_start(2) + 0.05, sr)
    add_at(sfx, tone(138.59, 0.26, sr, kind="square8bit", amp=0.18), s_start(2) + 0.24, sr)
    add_at(sfx, chirp(140, 48, 0.28, sr, amp=0.28), s_end(2) - 0.55, sr)

    # Cena 3: Pop digital + zíper rápido
    add_at(sfx, chirp(420, 1100, 0.09, sr, amp=0.20), s_start(3) + 0.35, sr)
    add_at(sfx, chirp(900, 2200, 0.18, sr, amp=0.14), s_end(3) - 0.70, sr)

    # Cena 4: 3 pops empilhando + mola/peso
    for k, f_pop in enumerate((440, 554.37, 659.25)):
        add_at(sfx, tone(f_pop, 0.09, sr, kind="sine", amp=0.18), s_start(4) + 0.35 + k * 0.16, sr)
    add_at(sfx, chirp(280, 110, 0.32, sr, amp=0.20), s_end(4) - 0.65, sr)

    # Cena 5: Whoosh + porta de cofre/armário tecnológico
    add_at(sfx, chirp(240, 760, 0.24, sr, amp=0.18), s_start(5) + 0.05, sr)
    add_at(sfx, tone(523.25, 0.25, sr, kind="triangle", amp=0.16), s_start(5) + 1.25, sr)

    # Cena 6: Bips rápidos de LEDs de servidor Linux
    for k in range(6):
        f_led = 880.0 if k % 2 == 0 else 1174.66
        add_at(sfx, tone(f_led, 0.06, sr, kind="square8bit", amp=0.11), s_start(6) + 0.6 + k * 0.42, sr)

    # Cena 7: Zap de fibra óptica + Ping de sonar submarino
    add_at(sfx, chirp(1600, 520, 0.18, sr, amp=0.19), s_start(7) + 1.25, sr)
    add_at(sfx, tone(1046.50, 0.42, sr, kind="sine", amp=0.18), s_end(7) - 0.65, sr)

    # Cena 8: 3 blips de pacotes de vídeo
    for k, f_pkt in enumerate((523.25, 659.25, 783.99)):
        add_at(sfx, tone(f_pkt, 0.09, sr, kind="triangle", amp=0.17), s_end(8) - 0.90 + k * 0.18, sr)

    # Cena 9: Beep de Terminal + Fanfarra 8-bit alegre em "O Linux!"
    for k, f_fan in enumerate((523.25, 659.25, 783.99, 1046.50)):
        add_at(sfx, tone(f_fan, 0.13, sr, kind="square8bit", amp=0.20), s_end(9) - 0.85 + k * 0.12, sr)

    # Cena 10: Sino duplo amigável ("Mas atenção")
    add_at(sfx, tone(783.99, 0.16, sr, kind="sine", amp=0.17), s_start(10) + 0.12, sr)
    add_at(sfx, tone(659.25, 0.22, sr, kind="sine", amp=0.17), s_start(10) + 0.30, sr)

    # Cena 11: Chime acolhedor ("peça ajuda a um adulto")
    for k, f_ch in enumerate((523.25, 659.25, 783.99, 987.77)):
        add_at(sfx, tone(f_ch, 0.22, sr, kind="sine", amp=0.14), s_start(11) + 1.10 + k * 0.09, sr)

    # Cena 12: Sininho Quest Start ("Hora do desafio desplugado")
    for k, f_q in enumerate((587.33, 783.99, 1174.66)):
        add_at(sfx, tone(f_q, 0.16, sr, kind="triangle", amp=0.19), s_start(12) + 0.15 + k * 0.11, sr)

    # Cena 13: 3 cliques de foto + acorde final cristalino
    for k in range(3):
        add_at(sfx, chirp(1700, 450, 0.04, sr, amp=0.18), s_start(13) + 0.55 + k * 0.18, sr)
    for f_end in (523.25, 659.25, 783.99, 1046.50):
        add_at(sfx, tone(f_end, 0.55, sr, kind="sine", amp=0.14), s_end(13) - 0.60, sr)

    return sfx


def main() -> None:
    project = os.path.abspath(sys.argv[1])
    voice_wav = os.path.join(project, "audio.wav")
    timing_json = os.path.join(project, "timing.json")

    voice, sr = load_wav(voice_wav)
    with open(timing_json, encoding="utf-8") as f:
        segs = json.load(f)

    total_dur = len(voice) / float(sr)
    bgm = build_bgm_3_acts(total_dur, segs, sr=sr)
    sfx = build_sfx_track(total_dur, segs, sr=sr)

    # Salva bgm.mp3 isolado para documentação do pipeline
    bgm_wav = os.path.join(project, "bgm.wav")
    bgm_mp3 = os.path.join(project, "bgm.mp3")
    save_wav(bgm_wav, bgm, sr=sr)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", bgm_wav, "-c:a", "libmp3lame", "-b:a", "192k", bgm_mp3], check=True)

    # Mixagem master: Voz em 1.0 + SFX em 0.55 + BGM em 0.24
    n = len(voice)
    master = voice[:n] * 1.0 + sfx[:n] * 0.55 + bgm[:n] * 0.24
    master_wav = os.path.join(project, "audio_master.wav")
    master_mp3 = os.path.join(project, "audio_master.mp3")
    save_wav(master_wav, master, sr=sr)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", master_wav, "-c:a", "libmp3lame", "-b:a", "192k", master_mp3], check=True)
    print(f"[Soundscape] Mixagem concluída: {master_mp3} ({total_dur:.2f}s)")


if __name__ == "__main__":
    main()
