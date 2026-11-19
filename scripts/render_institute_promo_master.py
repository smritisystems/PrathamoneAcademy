# /**
#  * @file        render_institute_promo_master.py
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
#  * @description Broadcast-grade 34.5-second master promotional commercial for Prashant Academy powered by PrathamOne EduOS. Combines official 3D logo motion, photorealistic Indian faculty classroom teaching, reception consultation, and Academic Director opening & closing endorsements. Zero 2D cartoon characters, zero distorted logos, zero artificial text cards.
#  */

import os
import sys
import wave
import shutil
import asyncio
from pathlib import Path
import numpy as np
import av
from PIL import Image, ImageDraw, ImageFont
import edge_tts
import imageio_ffmpeg

W, H = 1920, 1080
FPS = 30
TEMP_DIR = Path("scratch_frames/master_temp")
TEMP_DIR.mkdir(parents=True, exist_ok=True)
OUT_DIR = Path("frontend/public/media/commercial")
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_VIDEO = OUT_DIR / "prashant_academy_promo_master_1080p.mp4"
ARTIFACT_DIR = Path(r"C:\Users\netma\.gemini\antigravity\brain\0d532662-f973-4d13-b3ec-a0c67bb58f2e")

def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for p in candidates:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

async def generate_voiceovers():
    print("[1/4] Synthesizing broadcast-quality teacher voiceovers via edge-tts...")
    lines = [
        ("vo_01_intro.mp3", "Welcome to Prashant Academy, powered by Pratham One Edu O-S."),
        ("vo_02_director_open.mp3", "As educators, our real mission is student success — not getting buried under manual registers and fragmented follow-ups."),
        ("vo_03_classroom.mp3", "Inside our classrooms, interactive smart teaching connects directly with academic tracking and instant parent alerts."),
        ("vo_04_counselling.mp3", "From front-desk admissions to fee installments, every operation runs on one unified single source of truth."),
        ("vo_05_director_close.mp3", "Upgrade your coaching academy with enterprise precision. Pratham One Edu O-S — Coaching Management. Simplified.")
    ]
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    for fname, text in lines:
        mp3_p = TEMP_DIR / fname
        wav_p = TEMP_DIR / fname.replace(".mp3", ".wav")
        c = edge_tts.Communicate(text, "en-IN-PrabhatNeural", rate="-4%")
        await c.save(str(mp3_p))
        
        # Convert to 48kHz stereo WAV with broadcast mastering chain
        cmd = [
            ffmpeg_exe, "-y", "-i", str(mp3_p),
            "-af", "highpass=f=85,equalizer=f=320:t=q:w=1.5:g=-3,equalizer=f=4500:t=q:w=1.2:g=4.5,loudnorm=I=-16:TP=-1.5:LRA=7",
            "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", str(wav_p)
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("      All voiceovers synthesized successfully.")

def draw_sleek_badge(canvas: Image.Image, primary: str, secondary: str, alpha: float) -> Image.Image:
    """Draws a sleek, semi-transparent frosted-glass lower-third badge."""
    if alpha <= 0.01:
        return canvas
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    bx, by = 90, 940
    bw, bh = 580, 68
    a_bg = int(195 * alpha)
    a_fg = int(255 * alpha)

    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=12, fill=(8, 20, 48, a_bg), outline=(241, 105, 6, int(150 * alpha)), width=1)
    draw.rounded_rectangle([bx + 10, by + 14, bx + 14, by + bh - 14], radius=2, fill=(241, 105, 6, a_fg))

    draw.text((bx + 26, by + 12), primary, font=load_font(21, bold=True), fill=(255, 255, 255, a_fg))
    draw.text((bx + 26, by + 38), secondary, font=load_font(15, bold=False), fill=(203, 213, 225, int(230 * alpha)))

    return Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB")

_WATERMARK = None
def get_corner_watermark() -> Image.Image | None:
    global _WATERMARK
    if _WATERMARK is not None:
        return _WATERMARK
    p = Path("frontend/public/artwork/18112026/03/icon-180.png")
    if p.exists():
        im = Image.open(p).convert("RGBA")
        im = im.resize((60, 60), Image.Resampling.LANCZOS)
        r, g, b, a = im.split()
        a = a.point(lambda x: int(x * 0.70))
        _WATERMARK = Image.merge("RGBA", (r, g, b, a))
        return _WATERMARK
    return None

def apply_corner_watermark(canvas: Image.Image, alpha: float = 1.0) -> Image.Image:
    wm = get_corner_watermark()
    if wm is None or alpha <= 0.01:
        return canvas
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    pos = (W - 84, 36)
    overlay.paste(wm, pos, wm)
    return Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB")

def apply_fade_to_black(canvas: Image.Image, fade_ratio: float) -> Image.Image:
    if fade_ratio <= 0.001:
        return canvas
    fade_ratio = min(1.0, max(0.0, fade_ratio))
    black = Image.new("RGB", canvas.size, (0, 0, 0))
    return Image.blend(canvas, black, fade_ratio)

def composite_master_commercial():
    print("[2/4] Decoding & Compositing Master Video Stream...")
    
    video_dir = Path(r"F:\PrashantAcademy\frontend\public\artwork\VIDEOS")
    v1_path = video_dir / "V1.mp4"
    teacher_open = video_dir / "Academic_director_speaking_in_cl…_8a416b89_1080p.mp4"
    classroom_path = video_dir / "Faculty_explaining_physics_diagrams_c5291880_1080p.mp4"
    counsellor_path = video_dir / "Counsellor_speaking_to_parents_59f389dd_1080p.mp4"
    teacher_close = video_dir / "Academic_director_speaking_to_ca…_d6b25ec3.mp4"
    
    # Master Timeline:
    # 1. V1.mp4: 0.0s - 5.5s (3D animated logo motion reveal)
    # 2. Director Open: 0.0s - 8.0s (Prof. Rajesh Sharma in classroom)
    # 3. Classroom Teaching: 0.0s - 7.0s (Faculty explaining physics diagrams to students)
    # 4. Counselling Lobby: 0.0s - 6.0s (Parents & student consultation at reception)
    # 5. Director Close: 0.0s - 8.0s (Prof. Rajesh Sharma closing endorsement + fade to black)
    timeline = [
        {"path": v1_path, "start_sec": 0.0, "duration": 5.5, "label": "v1_intro", "badge": None},
        {"path": teacher_open, "start_sec": 0.0, "duration": 8.0, "label": "teacher_open",
         "badge": ("Prof. Rajesh Sharma", "Senior Faculty & Academic Director  •  Prashant Academy")},
        {"path": classroom_path, "start_sec": 0.5, "duration": 7.0, "label": "classroom_teaching",
         "badge": ("Interactive Smart Classroom", "EduBoard Digital Teaching  •  Instant Academic Sync")},
        {"path": counsellor_path, "start_sec": 0.5, "duration": 6.0, "label": "counselling_lobby",
         "badge": ("Student Admissions & Counselling", "Seamless Parent Connect  •  Unified Single Source of Truth")},
        {"path": teacher_close, "start_sec": 0.0, "duration": 8.0, "label": "teacher_close",
         "badge": ("Prashant Academy Coaching Institute", "Powered by PrathamOne EduOS™")}
    ]
    
    raw_video = TEMP_DIR / "raw_master_composite.mp4"
    container = av.open(str(raw_video), mode="w")
    stream = container.add_stream("libx264", rate=FPS)
    stream.width = W
    stream.height = H
    stream.pix_fmt = "yuv420p"
    stream.options = {"crf": "18", "preset": "fast"}

    frame_count = 0
    preview_snapshots = {}

    for seg in timeline:
        seg_dur = seg["duration"]
        seg_frames = int(round(seg_dur * FPS))
        label = seg["label"]
        badge_info = seg["badge"]
        print(f"      Rendering chapter: {label} ({seg_dur}s, {seg_frames} frames)...")
        
        c = av.open(str(seg["path"]))
        src_stream = c.streams.video[0]
        start_pts = int(seg["start_sec"] / src_stream.time_base)
        c.seek(start_pts, stream=src_stream)
        
        decoded_imgs = []
        for frame in c.decode(src_stream):
            img = frame.to_image()
            if img.size != (W, H):
                img = img.resize((W, H), Image.Resampling.LANCZOS)
            decoded_imgs.append(img)
            if len(decoded_imgs) >= seg_frames:
                break
        c.close()
        
        if not decoded_imgs:
            decoded_imgs = [Image.new("RGB", (W, H), (0, 0, 0))]
        while len(decoded_imgs) < seg_frames:
            decoded_imgs.append(decoded_imgs[-1])
            
        for i in range(seg_frames):
            canvas = decoded_imgs[i]
            t = i / FPS
            
            # Watermark on all footage scenes
            if label != "v1_intro":
                canvas = apply_corner_watermark(canvas, alpha=0.85)
                
            # Sleek badge overlay
            if badge_info is not None:
                # Fade in over 0.5s, fade out over final 0.8s of segment
                if t < 0.4:
                    tag_alpha = 0.0
                elif t < 0.9:
                    tag_alpha = (t - 0.4) / 0.5
                elif t < seg_dur - 1.0:
                    tag_alpha = 1.0
                elif t < seg_dur - 0.2:
                    tag_alpha = max(0.0, ((seg_dur - 0.2) - t) / 0.8)
                else:
                    tag_alpha = 0.0
                    
                canvas = draw_sleek_badge(canvas, badge_info[0], badge_info[1], tag_alpha)
                
            # Fade to black in final 1.0s of closing scene
            if label == "teacher_close" and t >= seg_dur - 1.0:
                fade_ratio = (t - (seg_dur - 1.0)) / 1.0
                canvas = apply_fade_to_black(canvas, fade_ratio)
                
            if i == seg_frames // 2:
                preview_snapshots[label] = canvas.copy()
                
            av_frame = av.VideoFrame.from_image(canvas)
            for packet in stream.encode(av_frame):
                container.mux(packet)
            frame_count += 1

    for packet in stream.encode():
        container.mux(packet)
    container.close()
    print("      Master raw video stream composited successfully.")
    
    snapshots_dir = Path("scratch_frames/master_snapshots")
    snapshots_dir.mkdir(parents=True, exist_ok=True)
    for k, img in preview_snapshots.items():
        img.save(snapshots_dir / f"scene_{k}.png")
        if ARTIFACT_DIR.exists():
            img.save(ARTIFACT_DIR / f"scene_{k}.png")
            
    return raw_video, frame_count / FPS

def build_master_audio(total_dur: float) -> Path:
    print("[3/4] Mixing Multi-Track Master Audio (Voiceover + BGM)...")
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    
    # Cue points:
    # 0.4s: vo_01_intro (Welcome to Prashant Academy...)
    # 5.8s: vo_02_director_open (As educators, our real mission...)
    # 13.8s: vo_03_classroom (Inside our classrooms, interactive smart teaching...)
    # 20.8s: vo_04_counselling (From front-desk admissions to fee installments...)
    # 27.0s: vo_05_director_close (Upgrade your coaching academy...)
    
    mixed_wav = TEMP_DIR / "mixed_master_audio.wav"
    bgm_path = Path("assets/audio/bgm_master.wav")
    vo1 = TEMP_DIR / "vo_01_intro.wav"
    vo2 = TEMP_DIR / "vo_02_director_open.wav"
    vo3 = TEMP_DIR / "vo_03_classroom.wav"
    vo4 = TEMP_DIR / "vo_04_counselling.wav"
    vo5 = TEMP_DIR / "vo_05_director_close.wav"
    
    fade_start = max(0.0, total_dur - 2.0)
    
    filter_complex = (
        f"[1:a]adelay=400|400,volume=1.0[v1];"
        f"[2:a]adelay=5800|5800,volume=1.1[v2];"
        f"[3:a]adelay=13800|13800,volume=1.1[v3];"
        f"[4:a]adelay=20800|20800,volume=1.05[v4];"
        f"[5:a]adelay=27000|27000,volume=1.1[v5];"
        f"[v1][v2][v3][v4][v5]amix=inputs=5:dropout_transition=0[all_vo];"
        f"[0:a]volume=0.20,afade=t=out:st={fade_start:.2f}:d=2.0[bgm];"
        f"[bgm][all_vo]amix=inputs=2:duration=first[out]"
    )
    
    cmd = [
        ffmpeg_exe, "-y",
        "-i", str(bgm_path),
        "-i", str(vo1),
        "-i", str(vo2),
        "-i", str(vo3),
        "-i", str(vo4),
        "-i", str(vo5),
        "-filter_complex", filter_complex,
        "-map", "[out]",
        "-t", f"{total_dur:.2f}",
        "-ar", "48000",
        "-ac", "2",
        str(mixed_wav)
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("      Master multi-track audio mixed successfully.")
    return mixed_wav

def finalize_master(raw_video: Path, mixed_audio: Path):
    print("[4/4] Finalizing Broadcast Master MP4...")
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    
    cmd = [
        ffmpeg_exe, "-y",
        "-i", str(raw_video),
        "-i", str(mixed_audio),
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        str(OUT_VIDEO)
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    if ARTIFACT_DIR.exists():
        shutil.copy2(OUT_VIDEO, ARTIFACT_DIR / OUT_VIDEO.name)
        
    print(f"\nSUCCESS: Master promotional commercial rendered to:\n  {OUT_VIDEO}\n")

if __name__ == "__main__":
    import subprocess
    asyncio.run(generate_voiceovers())
    raw_vid, duration = composite_master_commercial()
    audio_wav = build_master_audio(duration)
    finalize_master(raw_vid, audio_wav)
