# /**
#  * @file        voice_clone_service.py
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
#  * @description Neural Voice Cloning service for Dean Prashant Tejam, supporting zero-shot voice cloning via ElevenLabs or local neural models for multi-topic EduBoard lecture generation.
#  */

import os
import aiohttp
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parents[2]
DATASET_PATH = ROOT / "assets" / "audio" / "voice_clone_dataset" / "prashant_sir_master_voice_clone_sample_124s.wav"

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
PRASHANT_VOICE_ID = os.getenv("PRASHANT_VOICE_ID", "")


class VoiceCloneService:
    """Service to generate new lecture voiceovers using Dean Prashant Tejam's cloned voice."""

    @classmethod
    def get_reference_dataset_path(cls) -> Path:
        """Return the master reference audio file for training or zero-shot cloning."""
        return DATASET_PATH

    @classmethod
    async def generate_speech_elevenlabs(cls, text: str, output_path: Path, voice_id: Optional[str] = None) -> bool:
        """Generate speech using ElevenLabs cloned voice of Dean Prashant Tejam."""
        api_key = os.getenv("ELEVENLABS_API_KEY", ELEVENLABS_API_KEY)
        vid = voice_id or os.getenv("PRASHANT_VOICE_ID", PRASHANT_VOICE_ID)

        if not api_key or not vid:
            print("[VoiceCloneService] ELEVENLABS_API_KEY or PRASHANT_VOICE_ID not configured.")
            return False

        url = f"https://api.elevenlabs.io/v1/text-to-speech/{vid}"
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": api_key,
        }
        payload = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.45,
                "similarity_boost": 0.88,
                "style": 0.65,
                "use_speaker_boost": True,
            },
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as resp:
                if resp.status == 200:
                    output_path.parent.mkdir(parents=True, exist_ok=True)
                    with open(output_path, "wb") as f:
                        f.write(await resp.read())
                    print(f"[VoiceCloneService] Cloned audio generated successfully at {output_path}")
                    return True
                else:
                    err = await resp.text()
                    print(f"[VoiceCloneService] API error ({resp.status}): {err}")
                    return False
