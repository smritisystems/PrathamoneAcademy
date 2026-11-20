# /**
#  * @file        prepare_voice_clone_dataset.py
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
#  * @description Packages clean acoustic reference samples of Dean Prashant Tejam for neural voice cloning engines (ElevenLabs, F5-TTS, OpenVoice, Coqui XTTS).
#  */

import os
import shutil
import subprocess
from pathlib import Path
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
DATASET_DIR = ROOT / "assets" / "audio" / "voice_clone_dataset"
FRONTEND_MEDIA_DIR = ROOT / "frontend" / "public" / "media" / "commercial"

DATASET_DIR.mkdir(parents=True, exist_ok=True)
FRONTEND_MEDIA_DIR.mkdir(parents=True, exist_ok=True)

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

def main():
    print("=" * 70)
    print("  PREPARING DEAN PRASHANT TEJAM NEURAL VOICE CLONING DATASET")
    print("=" * 70)

    # 1. Clean Maths reference (60s)
    f_maths = DATASET_DIR / "01_prashant_reference_maths_mono.wav"
    cmd1 = [
        ffmpeg, "-y",
        "-i", str(ROOT / "assets" / "audio" / "original_prashant_calculation_master.wav"),
        "-af", "highpass=f=80,equalizer=f=3200:t=q:w=1.5:g=2.5,loudnorm=I=-16:TP=-1.5:LRA=11",
        "-ar", "44100",
        "-ac", "1",
        str(f_maths)
    ]
    subprocess.run(cmd1, capture_output=True)
    print(f"  [1/3] Processed Maths Sample: {f_maths.name}")

    # 2. Clean Physics reference (62s)
    f_phys = DATASET_DIR / "02_prashant_reference_physics_mono.wav"
    cmd2 = [
        ffmpeg, "-y",
        "-i", str(ROOT / "assets" / "audio" / "prashant_real_physics_master_62s.wav"),
        "-af", "highpass=f=80,equalizer=f=3200:t=q:w=1.5:g=2.5,loudnorm=I=-16:TP=-1.5:LRA=11",
        "-ar", "44100",
        "-ac", "1",
        str(f_phys)
    ]
    subprocess.run(cmd2, capture_output=True)
    print(f"  [2/3] Processed Physics Sample: {f_phys.name}")

    # 3. Concatenate into a unified 124-second training dataset
    concat_txt = DATASET_DIR / "concat_list.txt"
    with open(concat_txt, "w", encoding="utf-8") as f:
        f.write(f"file '{f_maths.name}'\nfile '{f_phys.name}'\n")

    f_master_wav = DATASET_DIR / "prashant_sir_master_voice_clone_sample_124s.wav"
    cmd3 = [
        ffmpeg, "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_txt),
        "-c", "copy",
        str(f_master_wav)
    ]
    subprocess.run(cmd3, capture_output=True)

    # 4. Generate high-quality MP3 for web player and review
    f_master_mp3 = DATASET_DIR / "prashant_sir_master_voice_clone_sample_124s.mp3"
    cmd4 = [
        ffmpeg, "-y",
        "-i", str(f_master_wav),
        "-b:a", "192k",
        str(f_master_mp3)
    ]
    subprocess.run(cmd4, capture_output=True)

    # Copy to frontend public media
    shutil.copy2(f_master_mp3, FRONTEND_MEDIA_DIR / f_master_mp3.name)

    print(f"  [3/3] Master 124-Second Training Sample: {f_master_wav.name} ({f_master_wav.stat().st_size / (1024*1024):.2f} MB)")
    print(f"  Published MP3: {FRONTEND_MEDIA_DIR / f_master_mp3.name}")
    print("=" * 70)
    print("  DATASET READY FOR NEURAL VOICE CLONING ENGINES!")
    print("=" * 70)

if __name__ == "__main__":
    main()
