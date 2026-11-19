# /**
#  * @file        render_commercial_poc.py
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
#  * @description High-fidelity multi-track cinematic video compositor and rendering engine producing the 24.5-second television-quality commercial proof-of-concept.
#  */

import os
import sys
import math
import shutil
import wave
import numpy as np
import av
from PIL import Image, ImageDraw, ImageFont

# Master Paths
OUTPUT_DIR = "frontend/public/media/commercial"
DOCS_ASSETS_DIR = "docs/assets/commercial"
FINAL_OUTPUT_MP4 = os.path.join(OUTPUT_DIR, "prathamone_cinematic_commercial_poc_24s.mp4")

PRESENTER_VIDEO_PATH = "frontend/public/media/motion/PrathamOne_EduOS_brand_video_pro…_0acd536b_1080p.mp4"
SOFTWARE_VIDEO_PATH = "frontend/public/media/commercial/live_software_demo_clean.mp4"
BRAND_VIDEO_PATH = "frontend/public/artwork/VIDEOS/V3.mp4"

VOICE_AUDIO_PATH = "temp_inspect/brand_audio.wav"
BGM_AUDIO_PATH = "temp_inspect/v3_audio.wav"
MIXED_AUDIO_PATH = "temp_inspect/commercial_master_audio.wav"

# Production Settings
FPS = 30
TOTAL_SECONDS = 24.5
TOTAL_FRAMES = int(TOTAL_SECONDS * FPS)  # 735 frames
SAMPLE_RATE = 48000
WIDTH = 1920
HEIGHT = 1080

# Font Setup
FONT_PATH_REGULAR = "C:/Windows/Fonts/segoeui.ttf"
FONT_PATH_BOLD = "C:/Windows/Fonts/segoeuib.ttf"

font_title_bold = ImageFont.truetype(FONT_PATH_BOLD, 28)
font_subtitle = ImageFont.truetype(FONT_PATH_REGULAR, 17)
font_badge_bold = ImageFont.truetype(FONT_PATH_BOLD, 20)
font_badge_sub = ImageFont.truetype(FONT_PATH_REGULAR, 15)
font_watermark = ImageFont.truetype(FONT_PATH_BOLD, 14)
font_hero_bold = ImageFont.truetype(FONT_PATH_BOLD, 36)
font_hero_sub = ImageFont.truetype(FONT_PATH_REGULAR, 19)


def mix_master_audio():
    """Generates broadcast-grade 48kHz stereo master audio track with ducking."""
    print("Mastering multi-track audio...")

    def read_wav_as_float(path):
        with wave.open(path, "rb") as w:
            rate = w.getframerate()
            channels = w.getnchannels()
            nframes = w.getnframes()
            raw = w.readframes(nframes)
            arr = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
            if channels == 2:
                arr = arr.reshape(-1, 2)
            else:
                arr = np.column_stack([arr, arr])
            return rate, arr

    _, voice = read_wav_as_float(VOICE_AUDIO_PATH)
    _, bgm = read_wav_as_float(BGM_AUDIO_PATH)

    total_samples = int(TOTAL_SECONDS * SAMPLE_RATE)
    master = np.zeros((total_samples, 2), dtype=np.float32)

    # 1. Background Music Curve (with vocal ducking)
    bgm_samples = len(bgm)
    for i in range(total_samples):
        t = i / SAMPLE_RATE
        bgm_sample = bgm[i % bgm_samples]

        # Ducking curve: 0.0 - 10.0s ducked to 0.28, smoothly ramp to 1.0 from 10.0s to 11.5s
        if t < 10.0:
            gain = 0.28
        elif t < 11.5:
            alpha = (t - 10.0) / 1.5
            gain = 0.28 + alpha * (1.0 - 0.28)
        elif t < 23.5:
            gain = 1.0
        else:
            gain = max(0.0, 1.0 - (t - 23.5) / 1.0)

        master[i] += bgm_sample * gain

    # 2. Add Voice Narration (starts at t=0.4s)
    voice_start = int(0.4 * SAMPLE_RATE)
    voice_len = min(len(voice), total_samples - voice_start)
    master[voice_start : voice_start + voice_len] += voice[:voice_len] * 0.95

    # 3. Master Soft Limiter
    master = np.clip(master, -0.96, 0.96)

    # Write out 16-bit PCM WAV
    out_int16 = (master * 32767.0).astype(np.int16)
    with wave.open(MIXED_AUDIO_PATH, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(out_int16.tobytes())

    print(f"Master audio saved to {MIXED_AUDIO_PATH}")


def extract_frame_sequence(video_path, start_sec, count):
    """Pre-extracts an array of PIL Images from a video at exact target FPS."""
    container = av.open(video_path)
    in_stream = container.streams.video[0]

    container.seek(int(start_sec * 1000000))
    frames = []

    for frame in container.decode(in_stream):
        t = float(frame.pts * frame.time_base)
        if t >= start_sec:
            img = frame.to_image().convert("RGB")
            if img.size != (WIDTH, HEIGHT):
                img = img.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
            frames.append(img)
            if len(frames) >= count:
                break
    container.close()

    while len(frames) < count:
        frames.append(frames[-1] if frames else Image.new("RGB", (WIDTH, HEIGHT), (11, 45, 107)))

    return frames


def draw_lower_third(frame_idx, total_scene_frames):
    """Draws corporate chyron banner with animated audio wave and orange accents."""
    if frame_idx < 15:
        alpha = frame_idx / 15.0
    elif frame_idx > total_scene_frames - 15:
        alpha = max(0.0, (total_scene_frames - frame_idx) / 15.0)
    else:
        alpha = 1.0

    if alpha <= 0.01:
        return None

    bx = 100
    by = 920
    bw = 780
    bh = 105

    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    ol_draw = ImageDraw.Draw(overlay)

    # Glass container
    bg_color = (11, 45, 107, int(220 * alpha))
    ol_draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=16, fill=bg_color, outline=(241, 105, 6, int(180 * alpha)), width=2)

    # Orange indicator bar
    ol_draw.rounded_rectangle([bx + 14, by + 18, bx + 22, by + bh - 18], radius=4, fill=(241, 105, 6, int(255 * alpha)))

    # Presenter Name
    ol_draw.text((bx + 38, by + 18), "PRIYA SHARMA", font=font_title_bold, fill=(255, 255, 255, int(255 * alpha)))

    # Title & Role
    ol_draw.text((bx + 38, by + 60), "Solutions Specialist  •  PrathamOne EduOS", font=font_subtitle, fill=(203, 213, 225, int(240 * alpha)))

    # Animated Voice Equalizer
    eq_x = bx + bw - 140
    eq_y = by + 52
    for b in range(6):
        bar_h = max(6, int(18 + math.sin(frame_idx * 0.45 + b * 1.2) * 12))
        y0 = eq_y - bar_h // 2
        y1 = max(y0 + 4, eq_y + bar_h // 2)
        b_color = (241, 105, 6, int(240 * alpha)) if b % 2 == 0 else (16, 185, 129, int(240 * alpha))
        ol_draw.rounded_rectangle([eq_x + b * 18, y0, eq_x + b * 18 + 8, y1], radius=3, fill=b_color)

    return overlay


def draw_callout_badge(text, subtext, x, y, progress, badge_color="orange"):
    """Draws a floating 3D perspective callout pill badge for software highlights."""
    if progress <= 0 or progress >= 1:
        return None

    if progress < 0.2:
        alpha = progress / 0.2
        offset_y = (1.0 - progress / 0.2) * 20
    elif progress > 0.85:
        alpha = (1.0 - progress) / 0.15
        offset_y = 0
    else:
        alpha = 1.0
        offset_y = 0

    curr_y = int(y - offset_y)
    bw = 640
    bh = 74

    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    ol_draw = ImageDraw.Draw(overlay)

    # Shadow
    ol_draw.rounded_rectangle([x + 6, curr_y + 8, x + bw + 6, curr_y + bh + 8], radius=14, fill=(0, 0, 0, int(110 * alpha)))

    # Pill container
    pill_fill = (15, 23, 42, int(235 * alpha))
    outline_color = (241, 105, 6, int(220 * alpha)) if badge_color == "orange" else (16, 185, 129, int(220 * alpha))
    ol_draw.rounded_rectangle([x, curr_y, x + bw, curr_y + bh], radius=14, fill=pill_fill, outline=outline_color, width=2)

    # Indicator pip
    ol_draw.rounded_rectangle([x + 16, curr_y + 16, x + 24, curr_y + bh - 16], radius=4, fill=outline_color)

    # Main text (clean ASCII strings)
    ol_draw.text((x + 36, curr_y + 12), text, font=font_badge_bold, fill=(255, 255, 255, int(255 * alpha)))
    # Subtext
    ol_draw.text((x + 36, curr_y + 42), subtext, font=font_badge_sub, fill=(203, 213, 225, int(230 * alpha)))

    return overlay


def draw_top_watermark():
    """Permanent subtle television broadcast watermark."""
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    ol_draw = ImageDraw.Draw(overlay)

    wx = WIDTH - 340
    wy = 35
    ol_draw.rounded_rectangle([wx, wy, wx + 290, wy + 38], radius=8, fill=(15, 23, 42, 190), outline=(51, 65, 85, 180), width=1)
    # Red live broadcast dot
    ol_draw.ellipse([wx + 16, wy + 14, wx + 26, wy + 24], fill=(239, 68, 68, 255))
    ol_draw.text((wx + 36, wy + 9), "PRATHAMONE EduOS™", font=font_watermark, fill=(241, 245, 249, 230))

    return overlay


def draw_closing_tagline(progress):
    """Renders the official brand closing tagline and corporate attribution."""
    if progress <= 0:
        return None
    alpha = min(1.0, progress * 2.0)

    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    ol_draw = ImageDraw.Draw(overlay)

    cy = HEIGHT - 200
    bx = (WIDTH - 1200) // 2
    bw = 1200
    bh = 115

    ol_draw.rounded_rectangle([bx, cy, bx + bw, cy + bh], radius=20, fill=(7, 28, 68, int(230 * alpha)), outline=(241, 105, 6, int(200 * alpha)), width=2)

    # Tagline line 1
    t1 = "COACHING MANAGEMENT. SIMPLIFIED."
    bbox1 = font_hero_bold.getbbox(t1)
    w1 = bbox1[2] - bbox1[0]
    ol_draw.text((bx + (bw - w1) // 2, cy + 18), t1, font=font_hero_bold, fill=(255, 255, 255, int(255 * alpha)))

    # Tagline line 2
    t2 = "The Power of Enterprise Education. The Simplicity of WhatsApp."
    bbox2 = font_hero_sub.getbbox(t2)
    w2 = bbox2[2] - bbox2[0]
    ol_draw.text((bx + (bw - w2) // 2, cy + 68), t2, font=font_hero_sub, fill=(251, 191, 36, int(240 * alpha)))

    return overlay


def render_master_commercial():
    print("Beginning multi-track 1080p commercial rendering...")
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(DOCS_ASSETS_DIR, exist_ok=True)

    # 1. Generate Master Audio
    mix_master_audio()

    # 2. Extract Source Video Sequences
    print("Extracting presenter footage (0.0s - 7.0s)...")
    presenter_frames = extract_frame_sequence(PRESENTER_VIDEO_PATH, start_sec=0.0, count=210)

    print("Extracting live software demo footage (6.5s - 16.0s)...")
    software_frames = extract_frame_sequence(SOFTWARE_VIDEO_PATH, start_sec=6.5, count=285)

    print("Extracting 3D brand reveal footage (17.0s - 25.0s)...")
    brand_frames = extract_frame_sequence(BRAND_VIDEO_PATH, start_sec=17.0, count=240)

    # 3. Setup PyAV Output Container
    out_container = av.open(FINAL_OUTPUT_MP4, mode="w")

    # Add Video Stream
    v_stream = out_container.add_stream("h264", rate=FPS)
    v_stream.width = WIDTH
    v_stream.height = HEIGHT
    v_stream.pix_fmt = "yuv420p"
    v_stream.bit_rate = 8500000
    v_stream.options = {"preset": "fast", "profile": "high"}

    # Add Audio Stream
    a_stream = out_container.add_stream("aac", rate=SAMPLE_RATE)
    a_stream.layout = "stereo"
    a_stream.bit_rate = 192000

    top_watermark = draw_top_watermark()

    # 4. Render All 735 Video Frames
    print("Compositing all 735 broadcast frames...")
    for frame_idx in range(TOTAL_FRAMES):
        t = frame_idx / FPS

        if frame_idx < 210:
            # Segment 1: Presenter (0 - 7.0s)
            base_img = presenter_frames[frame_idx].copy()
            chyron = draw_lower_third(frame_idx, 210)
            if chyron:
                base_img = Image.alpha_composite(base_img.convert("RGBA"), chyron).convert("RGB")

            # Cross-fade to software demo near end of shot 1
            if frame_idx >= 195:
                cross_alpha = (frame_idx - 195) / 15.0
                sw_first = software_frames[0]
                base_img = Image.blend(base_img, sw_first, cross_alpha)

        elif frame_idx < 495:
            # Segment 2: Live Authenticated Software Demonstration (7.0 - 16.5s)
            sw_idx = frame_idx - 210
            base_img = software_frames[min(sw_idx, len(software_frames) - 1)].copy()

            # Dynamic animated callout badges
            # Badge 1: Real-time Pulse (7.5s - 9.8s / sw_idx 15 to 84)
            if 15 <= sw_idx <= 84:
                prog = (sw_idx - 15) / (84 - 15)
                b1 = draw_callout_badge("LIVE PULSE: REAL-TIME OPERATIONS", "Rs. 18.6L Collections & 92.8% Attendance", 1200, 240, prog, "emerald")
                if b1:
                    base_img = Image.alpha_composite(base_img.convert("RGBA"), b1).convert("RGB")

            # Badge 2: Fee counter & Split Modes (10.2s - 12.8s / sw_idx 96 to 174)
            if 96 <= sw_idx <= 174:
                prog = (sw_idx - 96) / (174 - 96)
                b2 = draw_callout_badge("AUTOMATED FEE COUNTER & LEDGER", "Split Heads, Inflow Targets & Multi-Mode Donut", 1200, 580, prog, "orange")
                if b2:
                    base_img = Image.alpha_composite(base_img.convert("RGBA"), b2).convert("RGB")

            # Badge 3: Student Directory Search (13.2s - 15.8s / sw_idx 186 to 264)
            if 186 <= sw_idx <= 264:
                prog = (sw_idx - 186) / (264 - 186)
                b3 = draw_callout_badge("SUB-SECOND STUDENT SEARCH", "Instant Filter, View Mode Lock & Masked Aadhaar", 1200, 240, prog, "emerald")
                if b3:
                    base_img = Image.alpha_composite(base_img.convert("RGBA"), b3).convert("RGB")

            # Zoom push & Cross-fade into 3D Brand Reveal
            if frame_idx >= 480:
                cross_alpha = (frame_idx - 480) / 15.0
                br_first = brand_frames[0]
                base_img = Image.blend(base_img, br_first, cross_alpha)

        else:
            # Segment 3: 3D Motion Graphics & Brand Reveal (16.5 - 24.5s)
            br_idx = frame_idx - 495
            base_img = brand_frames[min(br_idx, len(brand_frames) - 1)].copy()

            # Closing Tagline banner starting at 19.5s (frame 585)
            if frame_idx >= 585:
                tagline_prog = (frame_idx - 585) / 30.0
                tagline = draw_closing_tagline(tagline_prog)
                if tagline:
                    base_img = Image.alpha_composite(base_img.convert("RGBA"), tagline).convert("RGB")

            # Final fade to deep Prussian Navy in last 15 frames
            if frame_idx >= 720:
                fade_alpha = (frame_idx - 720) / 15.0
                navy_img = Image.new("RGB", (WIDTH, HEIGHT), (5, 21, 53))
                base_img = Image.blend(base_img, navy_img, fade_alpha)

        # Composite Top Broadcast Watermark
        final_frame_img = Image.alpha_composite(base_img.convert("RGBA"), top_watermark).convert("RGB")

        # Encode frame to MP4
        av_frame = av.VideoFrame.from_image(final_frame_img)
        for packet in v_stream.encode(av_frame):
            out_container.mux(packet)

        if frame_idx % 90 == 0:
            print(f"Rendered {frame_idx}/{TOTAL_FRAMES} frames ({t:.1f}s)...")

    # Flush video packets
    for packet in v_stream.encode():
        out_container.mux(packet)

    # 5. Encode and Mux Master Audio
    print("Muxing 48kHz master audio track...")
    audio_container = av.open(MIXED_AUDIO_PATH)
    in_a_stream = audio_container.streams.audio[0]

    for frame in audio_container.decode(in_a_stream):
        for packet in a_stream.encode(frame):
            out_container.mux(packet)

    for packet in a_stream.encode():
        out_container.mux(packet)

    audio_container.close()
    out_container.close()

    # Mirror to docs assets
    shutil.copy2(FINAL_OUTPUT_MP4, os.path.join(DOCS_ASSETS_DIR, "prathamone_cinematic_commercial_poc_24s.mp4"))

    print(f"Final Cinematic Commercial POC successfully rendered!")
    print(f"Path: {FINAL_OUTPUT_MP4} ({os.path.getsize(FINAL_OUTPUT_MP4)} bytes)")


if __name__ == "__main__":
    render_master_commercial()
