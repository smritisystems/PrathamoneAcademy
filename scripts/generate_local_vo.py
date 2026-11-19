# /**
#  * @file        generate_local_vo.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-19
#  * @updated     2026-11-19
#  *
#  * @description Synthesizes broadcast-quality Indian English teacher voiceovers using edge-tts en-IN-PrabhatNeural and standardizes them into 48kHz 16-bit stereo WAV format.
#  */

import os
import sys
import json
import wave
import asyncio
import subprocess
from pathlib import Path
import av
import edge_tts
import imageio_ffmpeg

SCRIPT_FILE = Path("tts_script_v2.json")
OUTPUT_DIR = Path("assets/audio")
COMMERCIAL_VO_DIR = Path("data/commercial/audio")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
COMMERCIAL_VO_DIR.mkdir(parents=True, exist_ok=True)

VOICE = "en-IN-PrabhatNeural"
RATE = "-4%"


def convert_to_48k_stereo_wav(mp3_path: Path, wav_path: Path):
    """Applies broadcast vocal mastering chain (highpass, presence EQ, compression, loudness normalization) and converts MP3 to 48kHz 16-bit stereo WAV."""
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

    filter_chain = (
        "highpass=f=85,"                                # Remove muddy low rumble
        "equalizer=f=320:t=q:w=1.5:g=-3,"               # Cut boxy midrange
        "equalizer=f=4500:t=q:w=1.2:g=4.5,"             # Crisp teacher vocal clarity/presence
        "acompressor=threshold=-18dB:ratio=3:attack=10:release=120,"
        "loudnorm=I=-16:TP=-1.5:LRA=7"                  # Broadcast loudness standard (-16 LUFS)
    )

    cmd = [
        ffmpeg_exe, "-y",
        "-i", str(mp3_path),
        "-af", filter_chain,
        "-ar", "48000",
        "-ac", "2",
        "-c:a", "pcm_s16le",
        str(wav_path),
    ]

    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"  Mastered 48kHz Broadcast WAV: {wav_path.name} ({wav_path.stat().st_size} bytes)")


async def generate_chapter_audio(item: dict):
    ch_id = item["chapter_id"]
    text = item["tts_text"]
    temp_mp3 = OUTPUT_DIR / f"{ch_id}_temp.mp3"
    out_wav = OUTPUT_DIR / f"vo_{ch_id}.wav"
    comm_wav = COMMERCIAL_VO_DIR / f"vo_{ch_id}.wav"

    print(f"\n[TTS] Synthesizing '{ch_id}' via {VOICE} ({RATE})...")
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
    await communicate.save(str(temp_mp3))

    convert_to_48k_stereo_wav(temp_mp3, out_wav)
    if temp_mp3.exists():
        temp_mp3.unlink()

    # Mirror to data/commercial/audio
    comm_wav.write_bytes(out_wav.read_bytes())


async def main():
    print("=================================================================")
    print(f"  SYNTHESIZING NEURAL INDIAN TEACHER VOICEOVERS ({VOICE})")
    print("=================================================================")

    if not SCRIPT_FILE.exists():
        raise FileNotFoundError(f"Script file not found: {SCRIPT_FILE}")

    items = json.loads(SCRIPT_FILE.read_text(encoding="utf-8"))
    for item in items:
        await generate_chapter_audio(item)

    print("\n=================================================================")
    print("  ALL NEURAL TEACHER VOICEOVERS GENERATED SUCCESSFULLY!")
    print(f"  Primary Dir : {OUTPUT_DIR.resolve()}")
    print(f"  Mirror Dir  : {COMMERCIAL_VO_DIR.resolve()}")
    print("=================================================================")


if __name__ == "__main__":
    asyncio.run(main())
