# /**
#  * @file        record_1min_eduboard_session.py
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
#  * @description High-fidelity 1-minute Fullscreen EduBoard Lecture Recording engine with teacher Camera PiP, synchronized 48kHz audio, live chalk derivations, and animated fluorescent highlighter.
#  */

import os
import sys
import math
import shutil
import subprocess
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "docs" / "assets" / "commercial"
FRONTEND_MEDIA_DIR = ROOT / "frontend" / "public" / "media" / "commercial"
ARTIFACTS_DIR = Path(r"C:\Users\netma\.gemini\antigravity\brain\0d532662-f973-4d13-b3ec-a0c67bb58f2e")

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
FRONTEND_MEDIA_DIR.mkdir(parents=True, exist_ok=True)

FINAL_MP4_NAME = "PrathamOne_EduBoard_1Min_Physics_Lecture_1080p.mp4"
FINAL_OUTPUT_MP4 = OUTPUT_DIR / FINAL_MP4_NAME
FRONTEND_OUTPUT_MP4 = FRONTEND_MEDIA_DIR / FINAL_MP4_NAME

AUDIO_WAV = ROOT / "assets" / "audio" / "lecture_1min_master.wav"
TEACHER_IMG_PATH = ARTIFACTS_DIR / "scene_teacher_close.png"

WIDTH = 1920
HEIGHT = 1080
FPS = 30
TOTAL_DURATION = 59.16  # Exact audio length
TOTAL_FRAMES = int(TOTAL_DURATION * FPS)

# Typography fonts
FONT_REGULAR = "C:/Windows/Fonts/segoeui.ttf"
FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
FONT_SERIF_BOLD = "C:/Windows/Fonts/georgiab.ttf"
FONT_MONO_BOLD = "C:/Windows/Fonts/consola.ttf"

font_header_title = ImageFont.truetype(FONT_BOLD, 28)
font_header_sub = ImageFont.truetype(FONT_REGULAR, 18)
font_top_pill = ImageFont.truetype(FONT_BOLD, 14)
font_formula_title = ImageFont.truetype(FONT_BOLD, 22)
font_formula_math = ImageFont.truetype(FONT_SERIF_BOLD, 22)
font_formula_code = ImageFont.truetype(FONT_MONO_BOLD, 20)
font_axis_label = ImageFont.truetype(FONT_BOLD, 17)
font_pip_label = ImageFont.truetype(FONT_BOLD, 13)
font_footer = ImageFont.truetype(FONT_REGULAR, 14)


def create_base_chalkboard():
    """Renders crystal-clear 1920x1080 dark greenboard with crisp frame and authentic wooden rail."""
    # Crystal-clear, deep matte emerald chalkboard (#0f3d2b)
    base = Image.new("RGBA", (WIDTH, HEIGHT), (15, 61, 43, 255))
    draw = ImageDraw.Draw(base)

    # Inner crisp chalkboard frame line (clean school board border)
    draw.rectangle([8, 62, WIDTH - 8, HEIGHT - 26], outline=(28, 92, 66, 255), width=2)

    # Bottom wooden chalk rail
    draw.rectangle([0, HEIGHT - 24, WIDTH, HEIGHT], fill=(58, 38, 22, 255))
    draw.line([0, HEIGHT - 24, WIDTH, HEIGHT - 24], fill=(138, 92, 53, 255), width=2)
    # Chalk pieces in tray
    draw.rectangle([60, HEIGHT - 18, 120, HEIGHT - 8], fill=(245, 245, 245, 255))  # White
    draw.rectangle([140, HEIGHT - 18, 200, HEIGHT - 8], fill=(253, 224, 71, 255))  # Yellow
    draw.rectangle([220, HEIGHT - 18, 280, HEIGHT - 8], fill=(134, 239, 172, 255))  # Green
    draw.rectangle([300, HEIGHT - 18, 360, HEIGHT - 8], fill=(103, 232, 249, 255))  # Blue
    draw.rectangle([WIDTH - 180, HEIGHT - 20, WIDTH - 60, HEIGHT - 6], fill=(45, 25, 12, 255))  # Eraser block
    draw.rectangle([WIDTH - 176, HEIGHT - 18, WIDTH - 64, HEIGHT - 12], fill=(220, 200, 170, 255))  # Felt strip

    return base


def prepare_teacher_pip():
    """Loads teacher image and crops to circular PiP with border and shadow."""
    if not TEACHER_IMG_PATH.exists():
        # Fallback placeholder if not present
        return None

    img = Image.open(TEACHER_IMG_PATH).convert("RGB")
    # Crop central bust
    w, h = img.size
    crop_size = min(w, h)
    left = (w - crop_size) // 2
    top = int((h - crop_size) * 0.15)
    img = img.crop((left, top, left + crop_size, top + crop_size))

    pip_size = 220
    img = img.resize((pip_size, pip_size), Image.Resampling.LANCZOS)

    # Circle mask
    mask = Image.new("L", (pip_size, pip_size), 0)
    draw_mask = ImageDraw.Draw(mask)
    draw_mask.ellipse((0, 0, pip_size, pip_size), fill=255)

    # Apply mask
    circular_img = Image.new("RGBA", (pip_size, pip_size), (0, 0, 0, 0))
    circular_img.paste(img, (0, 0), mask)

    # Add white outline border
    border = Image.new("RGBA", (pip_size + 8, pip_size + 8), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(border)
    bdraw.ellipse((0, 0, pip_size + 7, pip_size + 7), outline=(255, 255, 255, 240), width=4)
    border.paste(circular_img, (4, 4), circular_img)

    return border


def draw_arrow(draw, start, end, color, width=3, arrow_size=12):
    """Draws line with arrow head pointing to end."""
    draw.line([start, end], fill=color, width=width)
    x1, y1 = start
    x2, y2 = end
    angle = math.atan2(y2 - y1, x2 - x1)
    p1 = (x2 - arrow_size * math.cos(angle - math.pi / 6), y2 - arrow_size * math.sin(angle - math.pi / 6))
    p2 = (x2 - arrow_size * math.cos(angle + math.pi / 6), y2 - arrow_size * math.sin(angle + math.pi / 6))
    draw.polygon([end, p1, p2], fill=color)


def render_lecture_video():
    print(f"[RENDER] Starting 60-second Fullscreen EduBoard Lecture Recording...")
    print(f"[TARGET] {WIDTH}x{HEIGHT} @ {FPS}fps, Total Frames: {TOTAL_FRAMES}")

    base_board = create_base_chalkboard()
    teacher_pip = prepare_teacher_pip()

    # Pre-render static UI overlay components
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

    cmd = [
        ffmpeg_exe,
        "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{WIDTH}x{HEIGHT}",
        "-pix_fmt", "rgb24",
        "-r", str(FPS),
        "-i", "-",  # Pipe input
        "-i", str(AUDIO_WAV),  # Audio input
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "19",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        str(FINAL_OUTPUT_MP4),
    ]

    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    try:
        for f in range(TOTAL_FRAMES):
            t = f / float(FPS)
            current_sec = int(t)

            frame = base_board.copy()
            draw = ImageDraw.Draw(frame)

            # ─────────────────────────────────────────────────────────────
            # 1. TOP HEADER STATUS BAR (Fullscreen Focus Mode)
            # ─────────────────────────────────────────────────────────────
            draw.rectangle([0, 0, WIDTH, 54], fill=(10, 28, 20, 230))
            draw.line([0, 54, WIDTH, 54], fill=(255, 255, 255, 35), width=1)

            # Left Badge
            draw.rounded_rectangle([24, 12, 230, 42], radius=6, fill=(16, 75, 48, 255), outline=(52, 211, 153, 200), width=1)
            draw.text((36, 17), "CBSE XII • PHYSICS", font=font_top_pill, fill=(209, 250, 229))

            # Center Title
            draw.text((250, 17), "2D Vector Kinematics — Projectile Motion & Derivations", font=font_top_pill, fill=(245, 245, 245))

            # Acoustic Auto-Tuning Pill
            draw.rounded_rectangle([1380, 12, 1680, 42], radius=6, fill=(18, 38, 58, 255), outline=(56, 189, 248, 180), width=1)
            draw.text((1395, 17), "WebRTC AGC Active • 80Hz HPF", font=font_top_pill, fill=(186, 230, 253))

            # Pulsing Red Recording Indicator Pill
            rec_pill_x1 = 1710
            rec_pill_x2 = 1896
            draw.rounded_rectangle([rec_pill_x1, 12, rec_pill_x2, 42], radius=6, fill=(190, 18, 60, 255), outline=(244, 63, 94, 255), width=1)

            # Pulsing dot
            pulse_radius = 4.5 + 1.5 * math.sin(t * 6.0)
            dot_cx = rec_pill_x1 + 18
            dot_cy = 27
            draw.ellipse([dot_cx - pulse_radius, dot_cy - pulse_radius, dot_cx + pulse_radius, dot_cy + pulse_radius], fill=(255, 255, 255, 255))

            rec_min = current_sec // 60
            rec_s = current_sec % 60
            timer_text = f"REC {rec_min:02d}:{rec_s:02d}"
            draw.text((dot_cx + 12, 17), timer_text, font=font_top_pill, fill=(255, 255, 255))

            # ─────────────────────────────────────────────────────────────
            # 2. CHALK LESSON PROGRESSION (Synchronized to Voiceover)
            # ─────────────────────────────────────────────────────────────

            # Phase 1 (t >= 1.0s): Title and topic appear
            if t >= 1.0:
                draw.text((60, 75), "CBSE CLASS XII • PHYSICS • CHAPTER 4: MOTION IN A PLANE", font=font_header_title, fill=(253, 224, 71))
                draw.text((60, 115), "Topic: 2D Vector Kinematics — Trajectory, Maximum Height & Range", font=font_header_sub, fill=(134, 239, 172))
                draw.line([(60, 146), (1550, 146)], fill=(255, 255, 255, 60), width=1)

            # Phase 2 (t >= 8.0s): Cartesian Coordinate Frame draws
            if t >= 8.0:
                axis_progress = min(1.0, (t - 8.0) / 3.0)
                origin_x = 130
                origin_y = 660

                # Y Axis
                y_max = 240
                cur_y = origin_y - (origin_y - y_max) * axis_progress
                draw_arrow(draw, (origin_x, origin_y), (origin_x, int(cur_y)), (255, 255, 255, 230), width=3)
                if axis_progress > 0.8:
                    draw.text((origin_x - 40, y_max - 30), "Y (Vertical)", font=font_axis_label, fill=(103, 232, 249))

                # X Axis
                x_max = 880
                cur_x = origin_x + (x_max - origin_x) * axis_progress
                draw_arrow(draw, (origin_x, origin_y), (int(cur_x), origin_y), (255, 255, 255, 230), width=3)
                if axis_progress > 0.8:
                    draw.text((x_max + 12, origin_y - 10), "X (Range R)", font=font_axis_label, fill=(103, 232, 249))

            # Phase 3 (t >= 13.0s): Initial Velocity Vector v0 & Angle theta
            if t >= 13.0:
                v0_progress = min(1.0, (t - 13.0) / 2.5)
                v0_target_x = 310
                v0_target_y = 440
                cur_v0_x = 130 + (v0_target_x - 130) * v0_progress
                cur_v0_y = 660 + (v0_target_y - 660) * v0_progress
                draw_arrow(draw, (130, 660), (int(cur_v0_x), int(cur_v0_y)), (249, 168, 212, 255), width=4)
                if v0_progress > 0.7:
                    draw.text((v0_target_x + 10, v0_target_y - 12), "v₀ (Initial Velocity)", font=font_axis_label, fill=(249, 168, 212))

                # Angle theta arc
                draw.arc([130 - 45, 660 - 45, 130 + 45, 660 + 45], start=305, end=360, fill=(253, 224, 71, 240), width=2)
                draw.text((185, 626), "θ", font=font_formula_math, fill=(253, 224, 71))

            # Phase 4 (t >= 18.0s): Parabolic Trajectory curve animates
            if t >= 18.0:
                curve_progress = min(1.0, (t - 18.0) / 4.0)
                curve_points = []
                steps = int(40 * curve_progress)
                for i in range(steps + 1):
                    frac = i / 40.0
                    px = 130 + 720 * frac
                    # Parabola: y = -4 * h * frac * (1 - frac)
                    py = 660 - 4 * 380 * frac * (1.0 - frac)
                    curve_points.append((px, py))
                if len(curve_points) > 1:
                    draw.line(curve_points, fill=(255, 255, 255, 240), width=3)

            # Phase 5 (t >= 23.0s): Vector Component Equations
            if t >= 23.0:
                draw.text((160, 270), "v_{0x} = v₀ cos θ", font=font_formula_code, fill=(255, 255, 255))
                draw.text((160, 310), "v_{0y} = v₀ sin θ", font=font_formula_code, fill=(255, 255, 255))
                draw.text((160, 350), "a_y = -g  (constant)", font=font_formula_code, fill=(252, 165, 165))

            # Phase 6 (t >= 30.0s): Peak Height Altitude Line & Formula
            if t >= 30.0:
                # Dashed vertical line at x = 490 (peak)
                peak_x = 490
                peak_y = 280
                for dash_y in range(peak_y, 660, 14):
                    draw.line([(peak_x, dash_y), (peak_x, min(660, dash_y + 8))], fill=(103, 232, 249, 180), width=2)
                draw.text((peak_x + 10, 440), "H_max", font=font_axis_label, fill=(103, 232, 249))

                # Formulas Box on Right
                draw.rounded_rectangle([960, 165, 1580, 680], radius=10, fill=(11, 46, 32, 230), outline=(52, 211, 153, 160), width=2)
                draw.text((990, 188), "KEY DERIVATIONS & FORMULAS", font=font_formula_title, fill=(253, 224, 71))
                draw.line([(990, 225), (1550, 225)], fill=(52, 211, 153, 100), width=1)

                draw.text((990, 245), "1. Time of Flight (T):", font=font_formula_math, fill=(245, 245, 245))
                draw.text((1030, 280), "T = (2 v₀ sin θ) / g", font=font_formula_code, fill=(255, 255, 255))

                draw.text((990, 340), "2. Maximum Height (H_max):", font=font_formula_math, fill=(245, 245, 245))
                draw.text((1030, 375), "H_max = (v₀² sin²θ) / 2g", font=font_formula_code, fill=(103, 232, 249))

            # Phase 7 (t >= 40.0s): Horizontal Range Formula
            if t >= 40.0:
                # Range ground arrow
                draw_arrow(draw, (130, 690), (850, 690), (103, 232, 249, 220), width=2)
                draw_arrow(draw, (850, 690), (130, 690), (103, 232, 249, 220), width=2)
                draw.text((440, 700), "Horizontal Range (R)", font=font_axis_label, fill=(103, 232, 249))

                draw.text((990, 440), "3. Horizontal Range (R):", font=font_formula_math, fill=(245, 245, 245))
                draw.text((1030, 478), "R = (v₀² sin 2θ) / g", font=font_formula_code, fill=(255, 255, 255))

            # Phase 8 (t >= 48.0s): ANIMATED FLUORESCENT HIGHLIGHTER TOOL SWEEP!
            if t >= 48.0:
                # Yellow Highlighter sweep over Range formula: [1020, 470] to [1360, 508]
                hl_prog = min(1.0, (t - 48.0) / 2.5)
                hl_x1 = 1020
                hl_x2 = hl_x1 + (1360 - hl_x1) * hl_prog
                hl_y1 = 472
                hl_y2 = 508

                # Create semi-transparent glowing highlighter overlay
                hl_overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
                hl_draw = ImageDraw.Draw(hl_overlay)
                hl_draw.rectangle([hl_x1, hl_y1, hl_x2, hl_y2], fill=(253, 224, 71, 95))  # Fluorescent yellow 37% opacity
                frame = Image.alpha_composite(frame, hl_overlay)
                draw = ImageDraw.Draw(frame)

                # Cursor drawing the highlight
                if hl_prog < 1.0:
                    cursor_x = int(hl_x2)
                    cursor_y = int((hl_y1 + hl_y2) / 2)
                    draw.ellipse([cursor_x - 6, cursor_y - 6, cursor_x + 6, cursor_y + 6], fill=(253, 224, 71, 230), outline=(255, 255, 255, 255), width=2)

            # Phase 9 (t >= 52.0s): Second Green Highlighter sweep over Maximum Condition
            if t >= 52.0:
                draw.text((990, 545), "★ Condition for Maximum Range:", font=font_formula_math, fill=(134, 239, 172))
                draw.text((1030, 582), "θ = 45°  =>  sin(2θ) = 1  =>  R_max = v₀² / g", font=font_formula_code, fill=(255, 255, 255))

                hl2_prog = min(1.0, (t - 52.0) / 2.2)
                hl2_x1 = 1020
                hl2_x2 = hl2_x1 + (1520 - hl2_x1) * hl2_prog
                hl2_y1 = 576
                hl2_y2 = 612

                hl2_overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
                hl2_draw = ImageDraw.Draw(hl2_overlay)
                hl2_draw.rectangle([hl2_x1, hl2_y1, hl2_x2, hl2_y2], fill=(134, 239, 172, 90))  # Neon green 35% opacity
                frame = Image.alpha_composite(frame, hl2_overlay)
                draw = ImageDraw.Draw(frame)

            # ─────────────────────────────────────────────────────────────
            # 3. TEACHER CAMERA PiP (Circular webcam with live border)
            # ─────────────────────────────────────────────────────────────
            if teacher_pip:
                pip_w, pip_h = teacher_pip.size
                pip_x = WIDTH - pip_w - 36
                pip_y = HEIGHT - pip_h - 40

                # Subtle breathing scale (talking animation)
                scale_factor = 1.0 + 0.015 * math.sin(t * 7.5)
                scaled_w = int(pip_w * scale_factor)
                scaled_h = int(pip_h * scale_factor)
                scaled_pip = teacher_pip.resize((scaled_w, scaled_h), Image.Resampling.BILINEAR)

                frame.paste(scaled_pip, (pip_x - (scaled_w - pip_w) // 2, pip_y - (scaled_h - pip_h) // 2), scaled_pip)

                # Teacher Name Tag Badge under PiP
                badge_x = pip_x + 10
                badge_y = pip_y + pip_h - 18
                draw.rounded_rectangle([badge_x, badge_y, badge_x + 200, badge_y + 24], radius=5, fill=(11, 37, 89, 230), outline=(217, 119, 6, 200), width=1)
                draw.text((badge_x + 14, badge_y + 4), "Dean Prashant Tejam", font=font_pip_label, fill=(255, 255, 255))

            # ─────────────────────────────────────────────────────────────
            # 4. BOTTOM FOOTER ATTRIBUTION
            # ─────────────────────────────────────────────────────────────
            draw.text((60, HEIGHT - 46), "Prashant Academy Coaching Institute • PrathamOne EduOS Classroom Recording Engine", font=font_footer, fill=(255, 255, 255, 120))
            draw.text((WIDTH - 520, HEIGHT - 46), "Highlighter (H) • Auto-Tuning AGC • 1080p 30 FPS", font=font_footer, fill=(255, 255, 255, 120))

            # Convert RGBA to RGB and pipe bytes to ffmpeg
            rgb_frame = frame.convert("RGB")
            proc.stdin.write(rgb_frame.tobytes())

            if f % 150 == 0 or f == TOTAL_FRAMES - 1:
                pct = (f + 1) / float(TOTAL_FRAMES) * 100.0
                print(f"[PROGRESS] Rendered frame {f+1}/{TOTAL_FRAMES} ({pct:.1f}%) — {t:.1f}s / {TOTAL_DURATION:.1f}s")

    finally:
        proc.stdin.close()
        proc.wait()

    print(f"[SUCCESS] 60-second video rendered to: {FINAL_OUTPUT_MP4} (Size: {FINAL_OUTPUT_MP4.stat().st_size / (1024*1024):.2f} MB)")

    # Copy to frontend public media directory and artifacts
    shutil.copy2(FINAL_OUTPUT_MP4, FRONTEND_OUTPUT_MP4)
    print(f"[COPIED] Frontend public: {FRONTEND_OUTPUT_MP4}")

    artifact_copy = ARTIFACTS_DIR / FINAL_MP4_NAME
    shutil.copy2(FINAL_OUTPUT_MP4, artifact_copy)
    print(f"[COPIED TO ARTIFACTS] {artifact_copy}")

    # Extract high-resolution keyframes for inspection
    extract_keyframes(FINAL_OUTPUT_MP4)


def extract_keyframes(video_path: Path):
    """Extracts 4 representative keyframes from the rendered 60-second lecture video."""
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    timestamps = [5.0, 22.0, 42.0, 54.0]
    labels = [
        "01_intro_lecture_title.jpg",
        "02_vector_axes_trajectory.jpg",
        "03_kinematic_derivations.jpg",
        "04_fluorescent_highlighter_applied.jpg"
    ]

    for sec, label in zip(timestamps, labels):
        out_img = OUTPUT_DIR / "recording_inspection_frames" / label
        out_img.parent.mkdir(parents=True, exist_ok=True)
        cmd = [
            ffmpeg_exe, "-y",
            "-ss", str(sec),
            "-i", str(video_path),
            "-frames:v", "1",
            "-q:v", "2",
            str(out_img)
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        art_img = ARTIFACTS_DIR / label
        shutil.copy2(out_img, art_img)
        print(f"[KEYFRAME] {sec}s -> {label} (Copied to artifacts)")


if __name__ == "__main__":
    render_lecture_video()
