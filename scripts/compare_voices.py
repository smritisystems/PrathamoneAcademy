# /**
#  * @file        compare_voices.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      00_PRODUCT_OVERVIEW
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-20
#  * @updated     2026-11-21
#  *
#  * @description Forensic acoustic comparison between Dean Prashant Tejam's real voice and synthesized neural speech models.
#  */

import wave
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def analyze_audio(path):
    with wave.open(str(path), 'r') as f:
        sr = f.getframerate()
        frames = f.readframes(f.getnframes())
        samples = np.frombuffer(frames, dtype=np.int16).astype(np.float32)
        if f.getnchannels() == 2:
            samples = samples.reshape(-1, 2).mean(axis=1)

    win_len = int(0.03 * sr)
    step = int(0.015 * sr)
    pitches = []
    energy = []
    for i in range(0, len(samples) - win_len, step):
        window = samples[i:i+win_len]
        rms = np.sqrt(np.mean(window**2))
        energy.append(rms)
        if rms > 1500:
            corr = np.correlate(window, window, mode='full')
            corr = corr[len(corr)//2:]
            min_lag = int(sr / 350)
            max_lag = int(sr / 80)
            lag = min_lag + np.argmax(corr[min_lag:max_lag])
            f0 = sr / lag
            if 85 <= f0 <= 300:
                pitches.append(f0)

    fft_vals = np.abs(np.fft.rfft(samples[:min(len(samples), sr*10)]))
    freqs = np.fft.rfftfreq(min(len(samples), sr*10), 1/sr)
    spectral_centroid = float(np.sum(freqs * fft_vals) / (np.sum(fft_vals) + 1e-6))

    sorted_e = np.sort(energy)
    dynamic_range_db = float(20 * np.log10((sorted_e[int(len(sorted_e)*0.95)] + 1e-6) / (sorted_e[int(len(sorted_e)*0.05)] + 1e-6)))

    return {
        'f0_mean': float(np.mean(pitches)) if pitches else 0,
        'f0_std': float(np.std(pitches)) if pitches else 0,
        'f0_min': float(np.min(pitches)) if pitches else 0,
        'f0_max': float(np.max(pitches)) if pitches else 0,
        'spectral_centroid': spectral_centroid,
        'dynamic_range_db': dynamic_range_db,
    }

def main():
    math_path = ROOT / "assets" / "audio" / "original_prashant_calculation_master.wav"
    phys_path = ROOT / "assets" / "audio" / "physics_moment_clip_raw.wav"
    synth_path = ROOT / "assets" / "audio" / "physics_moment_generated_master.wav"

    rm = analyze_audio(math_path)
    rp = analyze_audio(phys_path)
    sy = analyze_audio(synth_path)

    print("\n" + "=" * 90)
    print("      FORENSIC ACOUSTIC AUDIT: REAL VOICE vs SYNTHESIZED NEURAL TTS")
    print("=" * 90)
    print(f"{'Metric':<28} | {'Real Voice (Maths)':<20} | {'Real Voice (Physics)':<20} | {'Synthesized TTS':<18}")
    print("-" * 90)
    print(f"{'Mean Pitch (F0)':<28} | {rm['f0_mean']:>14.1f} Hz  | {rp['f0_mean']:>14.1f} Hz  | {sy['f0_mean']:>12.1f} Hz")
    print(f"{'Pitch Inflection (Std Dev)':<28} | {rm['f0_std']:>14.1f} Hz  | {rp['f0_std']:>14.1f} Hz  | {sy['f0_std']:>12.1f} Hz")
    print(f"{'Dynamic Pitch Range':<28} | {rm['f0_min']:>5.0f} -> {rm['f0_max']:<3.0f} Hz   | {rp['f0_min']:>5.0f} -> {rp['f0_max']:<3.0f} Hz   | {sy['f0_min']:>3.0f} -> {sy['f0_max']:<3.0f} Hz")
    print(f"{'Spectral Brightness (Centroid)':<28} | {rm['spectral_centroid']:>14.1f} Hz  | {rp['spectral_centroid']:>14.1f} Hz  | {sy['spectral_centroid']:>12.1f} Hz")
    print(f"{'Dynamic Range (Expression)':<28} | {rm['dynamic_range_db']:>14.1f} dB  | {rp['dynamic_range_db']:>14.1f} dB  | {sy['dynamic_range_db']:>12.1f} dB")
    print("=" * 90 + "\n")

if __name__ == "__main__":
    main()
