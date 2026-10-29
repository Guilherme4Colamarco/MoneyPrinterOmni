"""
Gera a narração em português usando o VoiceStudio local (k2-fsa/OmniVoice em CUDA)
com timbre clonado consistente para todas as frases do script.txt, exportando:
  - raw/voice_01.wav .. raw/voice_NN.wav
  - audio.wav / audio.mp3
  - subtitle.srt
  - timing.json (no formato exato esperado pela skill `video`)

Execução:
  /home/geko/.config/VoiceStudio/runtime/project/.venv/bin/python scripts/generate_voicestudio_narration.py resource/projects/o-que-e-a-nuvem
"""

import json
import os
import subprocess
import sys
import wave

BACKEND_DIR = "/home/geko/.config/VoiceStudio/runtime/project/backend"
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import numpy as np  # noqa: E402
import torch  # noqa: E402
from services.tts_backend import OmniVoiceBackend  # noqa: E402

DEFAULT_REF_AUDIO = "/home/geko/.omnivoice/outputs/64980ee0.wav"
DEFAULT_REF_TEXT = (
    "Boas-vindas. Há pouco eu era apenas um clipe de três segundos — "
    "agora posso dizer tudo o que quiser, com a sua voz ou com a minha."
)


def fmt_srt_time(seconds: float) -> str:
    ms = int(round(seconds * 1000))
    h = ms // 3_600_000
    ms %= 3_600_000
    m = ms // 60_000
    ms %= 60_000
    s = ms // 1000
    ms %= 1000
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def trim_silence(wav_np: np.ndarray, sr: int = 24000, thresh: float = 0.008, pad_s: float = 0.06) -> np.ndarray:
    """Remove silêncio excessivo nas pontas preservando ataque e cauda natural."""
    if wav_np.ndim > 1:
        wav_np = wav_np.squeeze()
    abs_w = np.abs(wav_np)
    idx = np.where(abs_w > thresh)[0]
    if len(idx) == 0:
        return wav_np
    pad = int(sr * pad_s)
    start = max(0, int(idx[0]) - pad)
    end = min(len(wav_np), int(idx[-1]) + pad)
    return wav_np[start:end]


def save_wav_mono16(path: str, samples: np.ndarray, sr: int = 24000) -> None:
    if samples.ndim > 1:
        samples = samples.squeeze()
    peak = float(np.max(np.abs(samples))) if len(samples) else 1.0
    if peak > 0.98:
        samples = samples * (0.95 / peak)
    pcm16 = np.clip(samples * 32767.0, -32768, 32767).astype(np.int16)
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(pcm16.tobytes())


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("Uso: generate_voicestudio_narration.py <pasta_do_projeto>")
    project = os.path.abspath(sys.argv[1])
    script_path = os.path.join(project, "script.txt")
    raw_dir = os.path.join(project, "raw")
    os.makedirs(raw_dir, exist_ok=True)

    with open(script_path, encoding="utf-8") as f:
        lines = [ln.strip() for ln in f.read().splitlines() if ln.strip()]

    print(f"[VoiceStudio] Inicializando OmniVoiceBackend para {len(lines)} frases...")
    backend = OmniVoiceBackend()
    sr = backend.sample_rate  # 24000 Hz

    ref_audio = DEFAULT_REF_AUDIO if os.path.exists(DEFAULT_REF_AUDIO) else None
    ref_text = DEFAULT_REF_TEXT if ref_audio else None

    pause_between_s = 0.16
    pause_samples = np.zeros(int(sr * pause_between_s), dtype=np.float32)

    all_chunks: list[np.ndarray] = []
    segments = []
    cursor_s = 0.0

    for i, text in enumerate(lines, 1):
        print(f"  [{i:02d}/{len(lines):02d}] Sintetizando: {text}")
        with torch.inference_mode():
            wav_tensor = backend.generate(
                text,
                language="Portuguese",
                ref_audio=ref_audio,
                ref_text=ref_text,
                speed=1.08,
                num_step=16,
                guidance_scale=2.0,
                denoise=True,
                postprocess_output=True,
            )
        wav_np = wav_tensor.detach().cpu().float().numpy().squeeze()
        wav_np = trim_silence(wav_np, sr=sr)

        seg_path = os.path.join(raw_dir, f"voice_{i:02d}.wav")
        save_wav_mono16(seg_path, wav_np, sr=sr)

        dur_s = len(wav_np) / float(sr)
        start_s = cursor_s
        end_s = start_s + dur_s + (pause_between_s if i < len(lines) else 0.0)

        segments.append({
            "n": i,
            "start": round(start_s, 3),
            "end": round(end_s, 3),
            "dur": round(end_s - start_s, 3),
            "text": text,
            "file": f"raw/voice_{i:02d}.wav",
        })

        all_chunks.append(wav_np)
        if i < len(lines):
            all_chunks.append(pause_samples)
        cursor_s = end_s
        print(f"      -> {dur_s:.2f}s (acumulado: {cursor_s:.2f}s)")

    full_audio = np.concatenate(all_chunks, axis=0)
    wav_out = os.path.join(project, "audio.wav")
    mp3_out = os.path.join(project, "audio.mp3")
    save_wav_mono16(wav_out, full_audio, sr=sr)

    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", wav_out, "-c:a", "libmp3lame", "-b:a", "192k", mp3_out],
        check=True,
    )

    srt_out = os.path.join(project, "subtitle.srt")
    with open(srt_out, "w", encoding="utf-8") as f:
        for seg in segments:
            f.write(
                f"{seg['n']}\n"
                f"{fmt_srt_time(seg['start'])} --> {fmt_srt_time(seg['end'])}\n"
                f"{seg['text']}\n\n"
            )

    timing_out = os.path.join(project, "timing.json")
    with open(timing_out, "w", encoding="utf-8") as f:
        json.dump(segments, f, ensure_ascii=False, indent=2)

    print(f"[VoiceStudio] Concluído! Duração total: {cursor_s:.2f}s -> {mp3_out}")


if __name__ == "__main__":
    main()
