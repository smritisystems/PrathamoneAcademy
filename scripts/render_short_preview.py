# /**
#  * @file        render_short_preview.py
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
#  * @description Synthesizes and renders a clean, cinematic 14-second broadcast promo starting directly with 3D logo motion V1.mp4, transitioning seamlessly into photorealistic Indian Academic Director Prof. Rajesh Sharma speaking in the coaching classroom with a sleek, minimal semi-transparent name tag, and ending with a smooth cinematic fade-to-black. Zero 2D cartoon characters, zero artificial text cards, zero distorted logos.
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
TEMP_DIR = Path("scratch_frames/preview_temp")
TEMP_DIR.mkdir(parents=True, exist_ok=True)
OUT_DIR = Path("frontend/public/media/commercial")
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_VIDEO = OUT_DIR / "promo_short_preview_1080p.mp4"
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
    print("[1/4] Generating voiceover segments via edge-tts...")
    lines = [
        ("vo_p1.mp3", "Welcome to Prashant Academy, powered by Pratham One Edu O-S."),
        ("vo_p2.mp3", "As teachers, our focus must be on our students, not manual registers and endless paperwork.")
    ]
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    for fname, text in lines:
        mp3_p = TEMP_DIR / fname
        wav_p = TEMP_DIR / fname.replace(".mp3", ".wav")
        c = edge_tts.Communicate(text, "en-IN-PrabhatNeural", rate="-4%")
        await c.save(str(mp3_p))
        
        # Convert to 48kHz stereo WAV with broadcast filter
        cmd = [
            ffmpeg_exe, "-y", "-i", str(mp3_p),
            "-af", "highpass=f=85,equalizer=f=320:t=q:w=1.5:g=-3,equalizer=f=4500:t=q:w=1.2:g=4.5,loudnorm=I=-16:TP=-1.5:LRA=7",
            "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", str(wav_p)
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("      Voiceovers generated successfully.")

def draw_sleek_nametag(canvas: Image.Image, name: str, title: str, alpha: float) -> Image.Image:
    """Draws a sleek, minimal, semi-transparent modern glass badge in the lower-left corner."""
    if alpha <= 0.01:
        return canvas
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    bx, by = 90, 940
    bw, bh = 560, 68
    a_bg = int(190 * alpha)
    a_fg = int(255 * alpha)

    # Sleek dark frosted-glass pill
    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=12, fill=(8, 20, 48, a_bg), outline=(241, 105, 6, int(150 * alpha)), width=1)
    # Accent indicator bar
    draw.rounded_rectangle([bx + 10, by + 14, bx + 14, by + bh - 14], radius=2, fill=(241, 105, 6, a_fg))

    # Name & Title in single balanced line
    draw.text((bx + 26, by + 12), name, font=load_font(22, bold=True), fill=(255, 255, 255, a_fg))
    draw.text((bx + 26, by + 38), title, font=load_font(15, bold=False), fill=(203, 213, 225, int(230 * alpha)))

    return Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB")

_WATERMARK = None
def get_corner_watermark() -> Image.Image | None:
    global _WATERMARK
    if _WATERMARK is not None:
        return _WATERMARK
    p = Path("frontend/public/artwork/18112026/03/icon-180.png")
    if p.exists():
        im = Image.open(p).convert("RGBA")
        im = im.resize((64, 64), Image.Resampling.LANCZOS)
        # Apply 75% opacity
        r, g, b, a = im.split()
        a = a.point(lambda x: int(x * 0.75))
        _WATERMARK = Image.merge("RGBA", (r, g, b, a))
        return _WATERMARK
    return None

def apply_corner_watermark(canvas: Image.Image, alpha: float = 1.0) -> Image.Image:
    wm = get_corner_watermark()
    if wm is None or alpha <= 0.01:
        return canvas
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    pos = (W - 90, 40)
    overlay.paste(wm, pos, wm)
    return Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB")

def apply_fade_to_black(canvas: Image.Image, fade_ratio: float) -> Image.Image:
    """fade_ratio from 0.0 (no fade) to 1.0 (pure black)."""
    if fade_ratio <= 0.001:
        return canvas
    fade_ratio = min(1.0, max(0.0, fade_ratio))
    black = Image.new("RGB", canvas.size, (0, 0, 0))
    return Image.blend(canvas, black, fade_ratio)

def composite_preview_video():
    print("[2/4] Decoding & Compositing Video Frames...")
    
    v1_path = Path(r"F:\PrashantAcademy\frontend\public\artwork\VIDEOS\V1.mp4")
    teacher_path = Path(r"F:\PrashantAcademy\frontend\public\artwork\VIDEOS\Academic_director_speaking_in_cl…_8a416b89_1080p (1).mp4")
    
    # 2 pure video segments:
    # 1. V1.mp4: 0.0s to 6.2s (3D emblem sketch, golden arc fly-in, logo reveal)
    # 2. Teacher: 0.0s to 7.9s (Prof. Rajesh Sharma speaking in classroom)
    timeline = [
        {"path": v1_path, "start_sec": 0.0, "duration": 6.2, "label": "v1_intro"},
        {"path": teacher_path, "start_sec": 0.0, "duration": 7.9, "label": "teacher"}
    ]
    
    raw_video = TEMP_DIR / "raw_composite.mp4"
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
        print(f"      Rendering segment: {label} ({seg_dur}s, {seg_frames} frames)...")
        
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
            
            if label == "teacher":
                t = i / FPS
                # Sleek nametag fades in 0.4s to 0.9s, fades out 5.2s to 6.0s
                if t < 0.4:
                    tag_alpha = 0.0
                elif t < 0.9:
                    tag_alpha = (t - 0.4) / 0.5
                elif t < 5.2:
                    tag_alpha = 1.0
                elif t < 6.0:
                    tag_alpha = max(0.0, (6.0 - t) / 0.8)
                else:
                    tag_alpha = 0.0
                    
                canvas = draw_sleek_nametag(
                    canvas,
                    name="Prof. Rajesh Sharma",
                    title="Senior Faculty & Academic Director  •  Prashant Academy",
                    alpha=tag_alpha
                )
                
                # Corner watermark
                canvas = apply_corner_watermark(canvas, alpha=0.85)
                
                # Cinematic fade to black in final 1.0s (6.9s to 7.9s)
                if t >= 6.9:
                    fade_ratio = (t - 6.9) / 1.0
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
    print("      Raw video composited successfully.")
    
    # Save snapshots for artifacts
    snapshots_dir = Path("scratch_frames/preview_snapshots")
    snapshots_dir.mkdir(parents=True, exist_ok=True)
    for k, img in preview_snapshots.items():
        img.save(snapshots_dir / f"scene_{k}.png")
        if ARTIFACT_DIR.exists():
            img.save(ARTIFACT_DIR / f"scene_{k}.png")
            
    return raw_video, frame_count / FPS

def build_audio_track(total_dur: float) -> Path:
    print("[3/4] Mixing Multi-Track Audio (Voiceover + BGM)...")
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    
    # Timing:
    # 0.5s: vo_p1 (Intro: Welcome to Prashant Academy...)
    # 6.4s: vo_p2 (Teacher: As teachers, our focus...)
    # BGM gently ducked, fades out smoothly in final 1.5s
    
    mixed_wav = TEMP_DIR / "mixed_audio.wav"
    bgm_path = Path("assets/audio/bgm_master.wav")
    vo1 = TEMP_DIR / "vo_p1.wav"
    vo2 = TEMP_DIR / "vo_p2.wav"
    
    fade_start = max(0.0, total_dur - 1.5)
    
    filter_complex = (
        f"[1:a]adelay=500|500,volume=1.0[v1];"
        f"[2:a]adelay=6400|6400,volume=1.1[v2];"
        f"[v1][v2]amix=inputs=2:dropout_transition=0[all_vo];"
        f"[0:a]volume=0.22,afade=t=out:st={fade_start:.2f}:d=1.5[bgm];"
        f"[bgm][all_vo]amix=inputs=2:duration=first[out]"
    )
    
    cmd = [
        ffmpeg_exe, "-y",
        "-i", str(bgm_path),
        "-i", str(vo1),
        "-i", str(vo2),
        "-filter_complex", filter_complex,
        "-map", "[out]",
        "-t", f"{total_dur:.2f}",
        "-ar", "48000",
        "-ac", "2",
        str(mixed_wav)
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("      Audio track mixed successfully.")
    return mixed_wav

def finalize_preview(raw_video: Path, mixed_audio: Path):
    print("[4/4] Muxing Final Preview Video...")
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
        
    print(f"\nSUCCESS: Master preview video rendered to:\n  {OUT_VIDEO}\n")

if __name__ == "__main__":
    import subprocess
    asyncio.run(generate_voiceovers())
    raw_vid, duration = composite_preview_video()
    audio_wav = build_audio_track(duration)
    finalize_preview(raw_vid, audio_wav)
