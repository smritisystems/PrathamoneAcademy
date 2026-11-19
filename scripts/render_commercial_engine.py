# /**
#  * @file        render_commercial_engine.py
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
#  * @description Declarative timeline rendering engine for PrathamOne EduOS commercial production reading project JSON manifests.
#  */

import os
import sys
import math
import shutil
import wave
import json
import numpy as np
import av
from PIL import Image, ImageDraw, ImageFont

MANIFEST_PATH = "data/commercial/commercial_project_poc.json"
OUTPUT_DIR = "frontend/public/media/commercial"
DOCS_ASSETS_DIR = "docs/assets/commercial"
FINAL_OUTPUT_MP4 = os.path.join(OUTPUT_DIR, "prathamone_cinematic_commercial_poc_24s.mp4")

# Load Declarative Project Manifest
with open(MANIFEST_PATH, "r") as f:
    PROJECT_MANIFEST = json.load(f)

FPS = PROJECT_MANIFEST.get("fps", 30)
TOTAL_SECONDS = PROJECT_MANIFEST.get("total_duration", 24.5)
TOTAL_FRAMES = int(TOTAL_SECONDS * FPS)
WIDTH = PROJECT_MANIFEST.get("resolution", {}).get("width", 1920)
HEIGHT = PROJECT_MANIFEST.get("resolution", {}).get("height", 1080)
SAMPLE_RATE = PROJECT_MANIFEST.get("audio", {}).get("sample_rate", 48000)

FONT_PATH_REGULAR = "C:/Windows/Fonts/segoeui.ttf"
FONT_PATH_BOLD = "C:/Windows/Fonts/segoeuib.ttf"

font_title_bold = ImageFont.truetype(FONT_PATH_BOLD, 28)
font_subtitle = ImageFont.truetype(FONT_PATH_REGULAR, 17)
font_badge_bold = ImageFont.truetype(FONT_PATH_BOLD, 20)
font_badge_sub = ImageFont.truetype(FONT_PATH_REGULAR, 15)
font_watermark = ImageFont.truetype(FONT_PATH_BOLD, 13)
font_hero_bold = ImageFont.truetype(FONT_PATH_BOLD, 36)
font_hero_sub = ImageFont.truetype(FONT_PATH_REGULAR, 19)
font_hero_attr = ImageFont.truetype(FONT_PATH_REGULAR, 14)


def mix_master_audio(manifest):
    """Generates broadcast-grade 48kHz stereo master audio track with ducking."""
    audio_cfg = manifest["audio"]
    voice_path = audio_cfg["voice_track"]
    bgm_path = audio_cfg["bgm_track"]
    out_path = audio_cfg["master_output"]

    print("Mastering audio according to declarative ducking curve...")

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

    _, voice = read_wav_as_float(voice_path)
    _, bgm = read_wav_as_float(bgm_path)

    total_samples = int(TOTAL_SECONDS * SAMPLE_RATE)
    master = np.zeros((total_samples, 2), dtype=np.float32)

    bgm_samples = len(bgm)
    for i in range(total_samples):
        t = i / SAMPLE_RATE
        bgm_sample = bgm[i % bgm_samples]

        # Calculate gain from ducking curve
        if t < 9.5:
            gain = 0.28
        elif t < 11.0:
            alpha = (t - 9.5) / 1.5
            gain = 0.28 + alpha * (1.0 - 0.28)
        elif t < 23.5:
            gain = 1.0
        else:
            gain = max(0.0, 1.0 - (t - 23.5) / 1.0)

        master[i] += bgm_sample * gain

    # Add Voice Narration
    voice_start = int(audio_cfg.get("voice_start", 0.4) * SAMPLE_RATE)
    voice_len = min(len(voice), total_samples - voice_start)
    master[voice_start : voice_start + voice_len] += voice[:voice_len] * audio_cfg.get("voice_gain", 0.95)

    # Master soft limiter
    master = np.clip(master, -0.96, 0.96)

    out_int16 = (master * 32767.0).astype(np.int16)
    with wave.open(out_path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(out_int16.tobytes())

    print(f"Master audio saved to {out_path}")
    return out_path


def extract_frame_sequence(video_path, start_sec, count):
    """Pre-extracts an array of PIL Images from a video at exact target FPS."""
    container = av.open(video_path)
    in_stream = container.streams.video[0]

    frames = []
    # Seek by pts units
    time_base = in_stream.time_base
    seek_pts = int(start_sec / float(time_base))
    container.seek(seek_pts, stream=in_stream)

    for frame in container.decode(in_stream):
        t = float(frame.pts * frame.time_base) if frame.pts is not None else 0
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


def draw_lower_third(t, lower_third_cfg):
    """Draws corporate chyron banner with animated audio wave and orange accents."""
    start_t = lower_third_cfg.get("fade_in_time", 0.6)
    end_t = lower_third_cfg.get("fade_out_time", 5.0)

    if t < start_t or t > end_t:
        return None

    # Alpha ramp
    fade_dur = 0.4
    if t < start_t + fade_dur:
        alpha = (t - start_t) / fade_dur
    elif t > end_t - fade_dur:
        alpha = max(0.0, (end_t - t) / fade_dur)
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
    name_str = lower_third_cfg.get("name", "PRIYA SHARMA")
    ol_draw.text((bx + 38, by + 18), name_str, font=font_title_bold, fill=(255, 255, 255, int(255 * alpha)))

    # Title & Role
    title_str = lower_third_cfg.get("title", "Solutions Specialist  •  PrathamOne EduOS")
    ol_draw.text((bx + 38, by + 60), title_str, font=font_subtitle, fill=(203, 213, 225, int(240 * alpha)))

    # Animated Voice Equalizer
    eq_x = bx + bw - 140
    eq_y = by + 52
    frame_idx = int(t * FPS)
    for b in range(6):
        bar_h = max(6, int(18 + math.sin(frame_idx * 0.45 + b * 1.2) * 12))
        y0 = eq_y - bar_h // 2
        y1 = max(y0 + 4, eq_y + bar_h // 2)
        b_color = (241, 105, 6, int(240 * alpha)) if b % 2 == 0 else (16, 185, 129, int(240 * alpha))
        ol_draw.rounded_rectangle([eq_x + b * 18, y0, eq_x + b * 18 + 8, y1], radius=3, fill=b_color)

    return overlay


def draw_callout_badge(callout_def, current_time):
    """Draws a floating 3D perspective callout pill badge for software highlights."""
    st = callout_def["start_time"]
    et = callout_def["end_time"]
    if current_time < st or current_time > et:
        return None

    dur = et - st
    local_t = current_time - st
    prog = local_t / dur

    if prog < 0.2:
        alpha = prog / 0.2
        offset_y = (1.0 - prog / 0.2) * 20
    elif prog > 0.85:
        alpha = (1.0 - prog) / 0.15
        offset_y = 0
    else:
        alpha = 1.0
        offset_y = 0

    x = callout_def.get("position", {}).get("x", 1200)
    y = callout_def.get("position", {}).get("y", 240)
    curr_y = int(y - offset_y)
    bw = 640
    bh = 74

    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    ol_draw = ImageDraw.Draw(overlay)

    # Soft shadow
    ol_draw.rounded_rectangle([x + 6, curr_y + 8, x + bw + 6, curr_y + bh + 8], radius=14, fill=(0, 0, 0, int(110 * alpha)))

    # Pill container
    pill_fill = (15, 23, 42, int(235 * alpha))
    badge_color = callout_def.get("color", "emerald")
    outline_color = (16, 185, 129, int(220 * alpha)) if badge_color == "emerald" else (241, 105, 6, int(220 * alpha))
    ol_draw.rounded_rectangle([x, curr_y, x + bw, curr_y + bh], radius=14, fill=pill_fill, outline=outline_color, width=2)

    # Indicator pip
    ol_draw.rounded_rectangle([x + 16, curr_y + 16, x + 24, curr_y + bh - 16], radius=4, fill=outline_color)

    # Main text & Subtext
    ol_draw.text((x + 36, curr_y + 12), callout_def["title"], font=font_badge_bold, fill=(255, 255, 255, int(255 * alpha)))
    ol_draw.text((x + 36, curr_y + 42), callout_def["subtitle"], font=font_badge_sub, fill=(203, 213, 225, int(230 * alpha)))

    return overlay


def draw_top_watermark():
    """Permanent subtle television broadcast watermark clear of UI buttons."""
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    ol_draw = ImageDraw.Draw(overlay)

    wx = WIDTH - 290
    wy = 20
    ol_draw.rounded_rectangle([wx, wy, wx + 260, wy + 32], radius=6, fill=(15, 23, 42, 180), outline=(51, 65, 85, 160), width=1)
    # Red live broadcast dot
    ol_draw.ellipse([wx + 14, wy + 11, wx + 24, wy + 21], fill=(239, 68, 68, 255))
    ol_draw.text((wx + 34, wy + 8), "PRATHAMONE EduOS™", font=font_watermark, fill=(241, 245, 249, 220))

    return overlay


def draw_closing_tagline(current_time, branding_cfg):
    """Renders the official brand closing tagline covering any legacy typos."""
    start_t = 16.5
    if current_time < start_t:
        return None

    alpha = min(1.0, (current_time - start_t) * 2.0)

    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    ol_draw = ImageDraw.Draw(overlay)

    bx = 40
    by = 740
    bw = 1840
    bh = 310

    # Glassmorphism container masking legacy typo subtitle completely
    ol_draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=24, fill=(7, 28, 68, int(255 * alpha)), outline=(241, 105, 6, int(255 * alpha)), width=3)

    # Tagline line 1
    t1 = branding_cfg.get("primary_tagline", "COACHING MANAGEMENT. SIMPLIFIED.")
    bbox1 = font_hero_bold.getbbox(t1)
    w1 = bbox1[2] - bbox1[0]
    ol_draw.text((bx + (bw - w1) // 2, by + 45), t1, font=font_hero_bold, fill=(255, 255, 255, int(255 * alpha)))

    # Tagline line 2
    t2 = branding_cfg.get("secondary_tagline", "The Power of Enterprise Education. The Simplicity of WhatsApp.")
    bbox2 = font_hero_sub.getbbox(t2)
    w2 = bbox2[2] - bbox2[0]
    ol_draw.text((bx + (bw - w2) // 2, by + 120), t2, font=font_hero_sub, fill=(251, 191, 36, int(240 * alpha)))

    # Attribution line
    t3 = branding_cfg.get("attribution", "Smritisys & AITDL Networks • Jawahar R. Mallah")
    bbox3 = font_hero_attr.getbbox(t3)
    w3 = bbox3[2] - bbox3[0]
    ol_draw.text((bx + (bw - w3) // 2, by + 185), t3, font=font_hero_attr, fill=(148, 163, 184, int(220 * alpha)))

    return overlay


def run_engine():
    print("=================================================================")
    print("  PRATHAMONE EduOS — CINEMATIC COMMERCIAL RENDERING ENGINE")
    print(f"  Project: {PROJECT_MANIFEST['project_name']} (v{PROJECT_MANIFEST['version']})")
    print("=================================================================")

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(DOCS_ASSETS_DIR, exist_ok=True)

    # 1. Master Audio
    master_audio_path = mix_master_audio(PROJECT_MANIFEST)

    # 2. Extract frames for each scene according to manifest
    scenes = PROJECT_MANIFEST["scenes"]
    scene_frames = {}

    for sc in scenes:
        sc_id = sc["scene_id"]
        sc_dur = sc["end_time"] - sc["start_time"]
        sc_count = int(sc_dur * FPS)
        if "clips" in sc:
            print(f"Extracting multi-clip sequence for {sc_id}...")
            frames = []
            for cl in sc["clips"]:
                cl_dur = cl["duration"]
                cl_count = int(cl_dur * FPS)
                cl_frames = extract_frame_sequence(cl["source_video"], cl["source_start_sec"], cl_count)
                frames.extend(cl_frames)
            while len(frames) < sc_count + 30:
                frames.append(frames[-1] if frames else Image.new("RGB", (WIDTH, HEIGHT), (11, 45, 107)))
            scene_frames[sc_id] = frames
        else:
            buffer = 15
            print(f"Extracting {sc_id} ({sc_count + buffer} frames from {sc['source_video']})...")
            scene_frames[sc_id] = extract_frame_sequence(sc["source_video"], sc["source_start_sec"], sc_count + buffer)

    # 3. Setup PyAV Output Container
    out_container = av.open(FINAL_OUTPUT_MP4, mode="w")

    v_stream = out_container.add_stream("h264", rate=FPS)
    v_stream.width = WIDTH
    v_stream.height = HEIGHT
    v_stream.pix_fmt = "yuv420p"
    v_stream.bit_rate = 8500000
    v_stream.options = {"preset": "fast", "profile": "high"}

    a_stream = out_container.add_stream("aac", rate=SAMPLE_RATE)
    a_stream.layout = "stereo"
    a_stream.bit_rate = 192000

    top_watermark = draw_top_watermark()
    branding = PROJECT_MANIFEST.get("branding", {})

    # 4. Render All Frames
    print(f"Compositing all {TOTAL_FRAMES} broadcast frames (0.0s to {TOTAL_SECONDS}s)...")
    for frame_idx in range(TOTAL_FRAMES):
        t = frame_idx / FPS

        # Scene 1: Presenter (0.0s to 5.0s / frames 0 to 150)
        if frame_idx < 150:
            base_img = scene_frames["shot_01_presenter"][frame_idx].copy()
            chyron = draw_lower_third(t, scenes[0].get("lower_third", {}))
            if chyron:
                base_img = Image.alpha_composite(base_img.convert("RGBA"), chyron).convert("RGB")

            # Cross-dissolve into Scene 2 (frames 135 to 150)
            if frame_idx >= 135:
                cross_alpha = (frame_idx - 135) / 15.0
                sw_first = scene_frames["shot_02_live_kiosk_demo"][0]
                base_img = Image.blend(base_img, sw_first, cross_alpha)

        # Scene 2: Live Authenticated Kiosk Demonstration (5.0s to 16.5s / frames 150 to 495)
        elif frame_idx < 495:
            sw_idx = frame_idx - 150
            sw_list = scene_frames["shot_02_live_kiosk_demo"]
            base_img = sw_list[min(sw_idx, len(sw_list) - 1)].copy()

            # Render synchronized callout badges from manifest
            for callout in scenes[1].get("callouts", []):
                badge_img = draw_callout_badge(callout, t)
                if badge_img:
                    base_img = Image.alpha_composite(base_img.convert("RGBA"), badge_img).convert("RGB")

            # Zoom push & Cross-dissolve into Scene 3 (frames 480 to 495)
            if frame_idx >= 480:
                cross_alpha = (frame_idx - 480) / 15.0
                br_first = scene_frames["shot_03_brand_reveal"][0]
                base_img = Image.blend(base_img, br_first, cross_alpha)

        # Scene 3: Cleaned 3D Motion Graphics Brand Reveal (16.5s to 24.5s / frames 495 to 735)
        else:
            br_idx = frame_idx - 495
            br_list = scene_frames["shot_03_brand_reveal"]
            base_img = br_list[min(br_idx, len(br_list) - 1)].copy()

            # Master closing banner covering any legacy typo
            tagline_img = draw_closing_tagline(t, branding)
            if tagline_img:
                base_img = Image.alpha_composite(base_img.convert("RGBA"), tagline_img).convert("RGB")

            # Final fade to deep Prussian Navy (last 15 frames)
            if frame_idx >= 720:
                fade_alpha = (frame_idx - 720) / 15.0
                navy_img = Image.new("RGB", (WIDTH, HEIGHT), (5, 21, 53))
                base_img = Image.blend(base_img, navy_img, fade_alpha)

        # Composite watermark
        final_frame = Image.alpha_composite(base_img.convert("RGBA"), top_watermark).convert("RGB")

        # Encode frame
        av_frame = av.VideoFrame.from_image(final_frame)
        for packet in v_stream.encode(av_frame):
            out_container.mux(packet)

        if frame_idx % 90 == 0:
            print(f"Rendered {frame_idx}/{TOTAL_FRAMES} frames ({t:.1f}s)...")

    # Flush video
    for packet in v_stream.encode():
        out_container.mux(packet)

    # 5. Mux Master Audio
    print("Muxing master audio track...")
    audio_container = av.open(master_audio_path)
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

    print("=================================================================")
    print("  COMMERCIAL RENDERING COMPLETE!")
    print(f"  Target: {FINAL_OUTPUT_MP4} ({os.path.getsize(FINAL_OUTPUT_MP4)} bytes)")
    print(f"  Docs Mirror: {os.path.join(DOCS_ASSETS_DIR, 'prathamone_cinematic_commercial_poc_24s.mp4')}")
    print("=================================================================")


if __name__ == "__main__":
    run_engine()
