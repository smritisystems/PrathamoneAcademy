# /**
#  * @file        build_module_voiceovers.py
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
#  * @description Generates mastered Indian English voiceovers and a sample-accurate duration manifest for the twenty official demo modules.
#  */

import argparse
import asyncio
import json
import shutil
import subprocess
import tempfile
import wave
from pathlib import Path
from typing import Any

import edge_tts


ROOT = Path(__file__).resolve().parent.parent
TRANSCRIPTS_FILE = Path(__file__).with_name("module_transcripts.json")
AUDIO_DIR = ROOT / "assets" / "audio" / "modules"
MANIFEST_FILE = AUDIO_DIR / "audio_manifest.json"
VOICE = "en-IN-NeerjaNeural"
RATE = "-4%"
EXPECTED_MODULE_COUNT = 20
EXPECTED_WAV = {"channels": 2, "sample_rate": 48000, "sample_width": 2}


def load_transcripts() -> list[dict[str, Any]]:
    data = json.loads(TRANSCRIPTS_FILE.read_text(encoding="utf-8"))
    if not isinstance(data, list) or len(data) != EXPECTED_MODULE_COUNT:
        raise ValueError(f"{TRANSCRIPTS_FILE} must contain exactly {EXPECTED_MODULE_COUNT} modules")

    seen: set[str] = set()
    required = {"module_id", "module_name", "route", "script", "badge_title", "badge_subtitle"}
    for item in data:
        if not isinstance(item, dict) or not required.issubset(item):
            raise ValueError("Each transcript needs module_id, module_name, route, script, badge_title, and badge_subtitle")
        module_id = item["module_id"]
        if not isinstance(module_id, str) or not module_id or module_id in seen:
            raise ValueError(f"Invalid or duplicate module_id: {module_id!r}")
        if any(not isinstance(item[field], str) or not item[field].strip() for field in required):
            raise ValueError(f"Module {module_id!r} contains an empty or non-text required field")
        seen.add(module_id)
    return data


def ffmpeg_binary() -> str:
    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        return system_ffmpeg
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError as exc:
        raise RuntimeError("FFmpeg is required; install ffmpeg or imageio-ffmpeg") from exc


def mastered_wav(source_mp3: Path, destination_wav: Path) -> None:
    filters = (
        "highpass=f=85,"
        "equalizer=f=320:t=q:w=1.5:g=-3,"
        "equalizer=f=4500:t=q:w=1.2:g=4.5,"
        "acompressor=threshold=-18dB:ratio=3:attack=10:release=120,"
        "loudnorm=I=-16:TP=-1.5:LRA=7"
    )
    command = [
        ffmpeg_binary(),
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        str(source_mp3),
        "-af",
        filters,
        "-ar",
        str(EXPECTED_WAV["sample_rate"]),
        "-ac",
        str(EXPECTED_WAV["channels"]),
        "-c:a",
        "pcm_s16le",
        str(destination_wav),
    ]
    subprocess.run(command, check=True)
    with wave.open(str(destination_wav), "rb") as wav_file:
        actual = {
            "channels": wav_file.getnchannels(),
            "sample_rate": wav_file.getframerate(),
            "sample_width": wav_file.getsampwidth(),
        }
        if actual != EXPECTED_WAV or wav_file.getnframes() <= 0:
            raise RuntimeError(f"Unexpected mastered WAV format for {destination_wav}: {actual}")


async def generate_one(item: dict[str, Any], semaphore: asyncio.Semaphore) -> dict[str, Any]:
    module_id = item["module_id"]
    wav_path = AUDIO_DIR / f"vo_{module_id}.wav"
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(prefix=f"{module_id}_", suffix=".mp3", dir=AUDIO_DIR, delete=False) as handle:
        mp3_path = Path(handle.name)
    try:
        async with semaphore:
            communicate = edge_tts.Communicate(item["script"], VOICE, rate=RATE)
            await communicate.save(str(mp3_path))
        mastered_wav(mp3_path, wav_path)
    finally:
        mp3_path.unlink(missing_ok=True)

    with wave.open(str(wav_path), "rb") as wav_file:
        duration_sec = wav_file.getnframes() / wav_file.getframerate()
    return {
        "module_id": module_id,
        "wav_path": wav_path.relative_to(ROOT).as_posix(),
        "duration_sec": duration_sec,
    }


async def build_manifest(transcripts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    semaphore = asyncio.Semaphore(3)
    tasks = [generate_one(item, semaphore) for item in transcripts]
    return await asyncio.gather(*tasks)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Neerja Neural module voiceovers and their exact WAV duration manifest.")
    parser.add_argument("--validate-only", action="store_true", help="Validate the transcript file without contacting the TTS service.")
    args = parser.parse_args()

    transcripts = load_transcripts()
    if args.validate_only:
        print(f"Validated {len(transcripts)} module transcripts.")
        return

    manifest = asyncio.run(build_manifest(transcripts))
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST_FILE.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Generated {len(manifest)} mastered {VOICE} WAV files.")
    print(f"Duration manifest: {MANIFEST_FILE.relative_to(ROOT).as_posix()}")


if __name__ == "__main__":
    main()
