# /**
#  * @file        record_prashant_sir_session.py
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
#  * @description 1-minute 1080p EduBoard lecture recording styled after Dean Prashant Tejam's ICSE Class 9 Mathematics lecture (Mean & Median) with authentic Hinglish voiceover, real-time chalk derivations, animated fluorescent highlighters, and camera PiP.
#  */

import os
import sys
import math
import shutil
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "docs" / "assets" / "commercial"
FRONTEND_MEDIA_DIR = ROOT / "frontend" / "public" / "media" / "commercial"
ARTIFACTS_DIR = Path(r"C:\Users\netma\.gemini\antigravity\brain\0d532662-f973-4d13-b3ec-a0c67bb58f2e")

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
FRONTEND_MEDIA_DIR.mkdir(parents=True, exist_ok=True)

FINAL_MP4_NAME = "PrashantAcademy_ICSE_Class9_Mean_Original_Lecture_1080p.mp4"
FINAL_OUTPUT_MP4 = OUTPUT_DIR / FINAL_MP4_NAME
FRONTEND_OUTPUT_MP4 = FRONTEND_MEDIA_DIR / FINAL_MP4_NAME

AUDIO_WAV = ROOT / "assets" / "audio" / "original_prashant_calculation_master.wav"
TEACHER_IMG_PATH = ROOT / "assets" / "prashant_face_crop.jpg"

WIDTH = 1920
HEIGHT = 1080
FPS = 30
TOTAL_DURATION = 62.00  # Exact authentic audio length
TOTAL_FRAMES = int(TOTAL_DURATION * FPS)

# Typography fonts
FONT_REGULAR = "C:/Windows/Fonts/segoeui.ttf"
FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
FONT_SERIF_BOLD = "C:/Windows/Fonts/georgiab.ttf"
FONT_MONO_BOLD = "C:/Windows/Fonts/consola.ttf"

font_header_title = ImageFont.truetype(FONT_BOLD, 28)
font_header_sub = ImageFont.truetype(FONT_REGULAR, 19)
font_top_pill = ImageFont.truetype(FONT_BOLD, 14)
font_formula_title = ImageFont.truetype(FONT_BOLD, 22)
font_formula_math = ImageFont.truetype(FONT_BOLD, 22)
font_formula_code = ImageFont.truetype(FONT_MONO_BOLD, 22)
font_large_math = ImageFont.truetype(FONT_BOLD, 28)
font_axis_label = ImageFont.truetype(FONT_BOLD, 18)
font_pip_label = ImageFont.truetype(FONT_BOLD, 13)
font_pip_sub = ImageFont.truetype(FONT_REGULAR, 11)
font_footer = ImageFont.truetype(FONT_REGULAR, 14)
font_badge = ImageFont.truetype(FONT_BOLD, 20)


def create_base_chalkboard():
    """Renders crystal-clear 1920x1080 solid dark greenboard with crisp frame and authentic wooden rail."""
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
    """Loads Prashant Sir's authentic portrait from YouTube video and crops to circular PiP."""
    if not TEACHER_IMG_PATH.exists():
        return None

    img = Image.open(TEACHER_IMG_PATH).convert("RGB")
    w, h = img.size
    crop_size = min(w, h)
    left = (w - crop_size) // 2
    top = int((h - crop_size) * 0.1)
    img = img.crop((left, top, left + crop_size, top + crop_size))

    pip_size = 230
    img = img.resize((pip_size, pip_size), Image.Resampling.LANCZOS)

    # Circle mask
    mask = Image.new("L", (pip_size, pip_size), 0)
    draw_mask = ImageDraw.Draw(mask)
    draw_mask.ellipse((0, 0, pip_size, pip_size), fill=255)

    circular_img = Image.new("RGBA", (pip_size, pip_size), (0, 0, 0, 0))
    circular_img.paste(img, (0, 0), mask)

    # Double outline border (inner cyan, outer white)
    border = Image.new("RGBA", (pip_size + 10, pip_size + 10), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(border)
    bdraw.ellipse((0, 0, pip_size + 9, pip_size + 9), outline=(56, 189, 248, 220), width=3)
    bdraw.ellipse((2, 2, pip_size + 7, pip_size + 7), outline=(255, 255, 255, 240), width=2)
    border.paste(circular_img, (5, 5), circular_img)

    return border


def render_prashant_sir_lecture():
    print(f"[RENDER] Starting Prashant Sir ICSE Class 9 Math Lecture Recording...")
    print(f"[TARGET] {WIDTH}x{HEIGHT} @ {FPS}fps, Total Frames: {TOTAL_FRAMES} (~{TOTAL_DURATION:.1f}s)")

    base_board = create_base_chalkboard()
    teacher_pip = prepare_teacher_pip()

    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

    cmd = [
        ffmpeg_exe,
        "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{WIDTH}x{HEIGHT}",
        "-pix_fmt", "rgb24",
        "-r", str(FPS),
        "-i", "-",  # Raw frames pipe
        "-i", str(AUDIO_WAV),  # Mastered audio
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "18",
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
            # 1. TOP HEADER STATUS BAR (Focus Mode with Live Timer)
            # ─────────────────────────────────────────────────────────────
            draw.rectangle([0, 0, WIDTH, 54], fill=(10, 28, 20, 240))
            draw.line([0, 54, WIDTH, 54], fill=(255, 255, 255, 35), width=1)

            # Left Badge
            draw.rounded_rectangle([24, 12, 260, 42], radius=6, fill=(16, 75, 48, 255), outline=(52, 211, 153, 200), width=1)
            draw.text((36, 17), "ICSE IX • MATHS: STATISTICS", font=font_top_pill, fill=(209, 250, 229))

            # Center Title
            draw.text((280, 17), "Mean & Median — Arithmetic Formulations, Shortcuts & Shift Properties", font=font_top_pill, fill=(245, 245, 245))

            # Acoustic Auto-Tuning Pill
            draw.rounded_rectangle([1360, 12, 1680, 42], radius=6, fill=(18, 38, 58, 255), outline=(56, 189, 248, 180), width=1)
            draw.text((1375, 17), "Boya Lapel Mic • AGC Active • 80Hz HPF", font=font_top_pill, fill=(186, 230, 253))

            # Pulsing Red Recording Indicator Pill
            rec_pill_x1 = 1710
            rec_pill_x2 = 1896
            draw.rounded_rectangle([rec_pill_x1, 12, rec_pill_x2, 42], radius=6, fill=(190, 18, 60, 255), outline=(244, 63, 94, 255), width=1)

            pulse_radius = 4.5 + 1.5 * math.sin(t * 6.0)
            dot_cx = rec_pill_x1 + 18
            dot_cy = 27
            draw.ellipse([dot_cx - pulse_radius, dot_cy - pulse_radius, dot_cx + pulse_radius, dot_cy + pulse_radius], fill=(255, 255, 255, 255))

            rec_min = current_sec // 60
            rec_s = current_sec % 60
            draw.text((dot_cx + 12, 17), f"REC {rec_min:02d}:{rec_s:02d}", font=font_top_pill, fill=(255, 255, 255))

            # ─────────────────────────────────────────────────────────────
            # 2. CHALK LESSON PROGRESSION (Synchronized to Prashant Sir)
            # ─────────────────────────────────────────────────────────────

            # Phase 1 (t >= 0.8s): Title and topic appear
            if t >= 0.8:
                draw.text((60, 75), "ICSE CLASS IX • MATHEMATICS • CHAPTER: STATISTICS", font=font_header_title, fill=(253, 224, 71))
                draw.text((60, 115), "Topic: Arithmetic Mean (x̄) — Definitions, Formula & Transformation Properties", font=font_header_sub, fill=(134, 239, 172))
                draw.line([(60, 146), (1550, 146)], fill=(52, 211, 153, 140), width=1)

            # Phase 2 (t >= 6.0s): Nomenclature & Notation (x-bar)
            if t >= 6.0:
                draw.rounded_rectangle([60, 168, 880, 260], radius=8, fill=(11, 46, 32, 230), outline=(52, 211, 153, 160), width=1)
                draw.text((80, 180), "NOMENCLATURE:", font=font_formula_title, fill=(253, 224, 71))
                draw.text((290, 178), "Mean Symbol = x̄  (\"x-bar\")", font=font_large_math, fill=(255, 255, 255))
                draw.text((80, 222), "Greek letter Σ (Sigma) represents \"Sum of all terms\"", font=font_header_sub, fill=(186, 230, 253))

            # Phase 3 (t >= 11.0s): The Canonical Mean Formula
            if t >= 11.0:
                draw.rounded_rectangle([60, 280, 880, 430], radius=10, fill=(11, 46, 32, 230), outline=(56, 189, 248, 180), width=2)
                draw.text((80, 295), "CANONICAL FORMULA:", font=font_formula_title, fill=(103, 232, 249))
                draw.text((120, 335), "x̄ = (Σ x) / n", font=font_large_math, fill=(253, 224, 71))
                draw.text((120, 385), "=  Sum of Observations  /  Total Number of Observations", font=font_formula_math, fill=(245, 245, 245))

            # Phase 4 (t >= 18.0s): Live Classroom Observations (Weights: 50, 60, 50, 80)
            if t >= 18.0:
                draw.rounded_rectangle([60, 450, 880, 630], radius=10, fill=(11, 46, 32, 230), outline=(255, 255, 255, 60), width=1)
                draw.text((80, 465), "LIVE CLASS OBSERVATIONS (Student Weights):", font=font_formula_title, fill=(253, 224, 71))
                draw.text((80, 505), "Weights:  50 kg,   60 kg,   50 kg,   80 kg", font=font_large_math, fill=(255, 255, 255))
                draw.text((80, 555), "Total number of students (n) = 4", font=font_formula_math, fill=(186, 230, 253))
                draw.text((80, 590), "Sum (Σ x) = 50 + 60 + 50 + 80 = 240 kg", font=font_large_math, fill=(134, 239, 172))

            # Phase 5 (t >= 28.0s): Arithmetic Calculation of Mean
            if t >= 28.0:
                draw.rounded_rectangle([60, 650, 880, 770], radius=10, fill=(11, 46, 32, 240), outline=(52, 211, 153, 200), width=2)
                draw.text((80, 665), "MEAN CALCULATION:", font=font_formula_title, fill=(253, 224, 71))
                draw.text((100, 705), "x̄ = 240 / 4 = 60 kg", font=font_large_math, fill=(255, 255, 255))

            # Phase 6 (t >= 35.0s): Right Panel — Faulty Scale Scenario & Uniform Shift
            if t >= 35.0:
                draw.rounded_rectangle([920, 168, 1580, 770], radius=12, fill=(10, 42, 30, 240), outline=(52, 211, 153, 180), width=2)
                draw.text((950, 190), "FUNDAMENTAL SHIFT PROPERTY", font=font_formula_title, fill=(253, 224, 71))
                draw.line([(950, 225), (1550, 225)], fill=(52, 211, 153, 100), width=1)

                draw.text((950, 245), "Scenario: Weighing Scale Under-Measured (+5 kg)", font=font_formula_math, fill=(245, 245, 245))
                draw.text((950, 280), "Every student weight increases uniformly by +5 kg:", font=font_header_sub, fill=(186, 230, 253))
                draw.text((980, 315), "55 kg,   65 kg,   55 kg,   85 kg", font=font_formula_code, fill=(255, 255, 255))

                draw.text((950, 365), "Do we re-add all 4,000 numbers from scratch? NO!", font=font_formula_math, fill=(252, 165, 165))

            # Phase 7 (t >= 44.0s): Golden Property Rule Box
            if t >= 44.0:
                draw.rounded_rectangle([950, 410, 1550, 540], radius=8, fill=(16, 75, 48, 240), outline=(52, 211, 153, 220), width=2)
                draw.text((970, 425), "* THE GOLDEN PROPERTY OF MEAN:", font=font_formula_title, fill=(253, 224, 71))
                draw.text((970, 460), "If each observation changes by +k:", font=font_formula_math, fill=(255, 255, 255))
                draw.text((970, 495), "New Mean = x̄ + k  =  60 + 5 = 65 kg", font=font_large_math, fill=(255, 255, 255))

                # Also list other properties
                draw.text((950, 560), "- Uniform subtraction:   x_i - k  =>  x̄ - k", font=font_formula_math, fill=(209, 250, 229))
                draw.text((950, 595), "- Uniform multiplication: x_i * k => x̄ * k", font=font_formula_math, fill=(209, 250, 229))
                draw.text((950, 630), "- Uniform division:       x_i / k  =>  x̄ / k", font=font_formula_math, fill=(209, 250, 229))

            # Phase 8 (t >= 53.0s): ANIMATED FLUORESCENT YELLOW HIGHLIGHTER SWEEP ON FIRST MEAN!
            if t >= 53.0:
                hl_prog = min(1.0, (t - 53.0) / 2.2)
                hl_x1 = 90
                hl_x2 = hl_x1 + (440 - hl_x1) * hl_prog
                hl_y1 = 698
                hl_y2 = 746

                hl_overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
                hl_draw = ImageDraw.Draw(hl_overlay)
                hl_draw.rectangle([hl_x1, hl_y1, hl_x2, hl_y2], fill=(253, 224, 71, 100))  # Fluorescent yellow
                frame = Image.alpha_composite(frame, hl_overlay)
                draw = ImageDraw.Draw(frame)

                if hl_prog < 1.0:
                    cursor_x = int(hl_x2)
                    cursor_y = int((hl_y1 + hl_y2) / 2)
                    draw.ellipse([cursor_x - 6, cursor_y - 6, cursor_x + 6, cursor_y + 6], fill=(253, 224, 71, 240), outline=(255, 255, 255, 255), width=2)

            # Phase 9 (t >= 57.0s): ANIMATED NEON GREEN HIGHLIGHTER SWEEP ON SHIFT PROPERTY!
            if t >= 57.0:
                hl2_prog = min(1.0, (t - 57.0) / 2.5)
                hl2_x1 = 960
                hl2_x2 = hl2_x1 + (1530 - hl2_x1) * hl2_prog
                hl2_y1 = 490
                hl2_y2 = 538

                hl2_overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
                hl2_draw = ImageDraw.Draw(hl2_overlay)
                hl2_draw.rectangle([hl2_x1, hl2_y1, hl2_x2, hl2_y2], fill=(134, 239, 172, 95))  # Neon green
                frame = Image.alpha_composite(frame, hl2_overlay)
                draw = ImageDraw.Draw(frame)

                if hl2_prog < 1.0:
                    cursor_x = int(hl2_x2)
                    cursor_y = int((hl2_y1 + hl2_y2) / 2)
                    draw.ellipse([cursor_x - 6, cursor_y - 6, cursor_x + 6, cursor_y + 6], fill=(134, 239, 172, 240), outline=(255, 255, 255, 255), width=2)

            # Phase 10 (t >= 58.0s): PRASHANT SIR'S SIGNATURE CATCHPHRASE BADGE!
            if t >= 58.0:
                badge_w = 480
                badge_h = 56
                badge_bx = 960
                badge_by = 685
                draw.rounded_rectangle([badge_bx, badge_by, badge_bx + badge_w, badge_by + badge_h], radius=10, fill=(217, 119, 6, 240), outline=(253, 224, 71, 255), width=2)
                draw.text((badge_bx + 20, badge_by + 14), "★ \"BAAT SAMAJH MEIN AAYI?\" — Prashant Sir", font=font_badge, fill=(255, 255, 255))

            # ─────────────────────────────────────────────────────────────
            # 3. TEACHER CAMERA PiP (Authentic Prashant Sir Portrait)
            # ─────────────────────────────────────────────────────────────
            if teacher_pip:
                pip_w, pip_h = teacher_pip.size
                pip_x = WIDTH - pip_w - 36
                pip_y = HEIGHT - pip_h - 40

                # Subtle breathing / talking motion
                scale_factor = 1.0 + 0.015 * math.sin(t * 8.0)
                scaled_w = int(pip_w * scale_factor)
                scaled_h = int(pip_h * scale_factor)
                scaled_pip = teacher_pip.resize((scaled_w, scaled_h), Image.Resampling.BILINEAR)

                frame.paste(scaled_pip, (pip_x - (scaled_w - pip_w) // 2, pip_y - (scaled_h - pip_h) // 2), scaled_pip)

                # Teacher Name Tag Badge under PiP
                badge_x = pip_x + 4
                badge_y = pip_y + pip_h - 24
                badge_w = 232
                badge_h = 42
                draw.rounded_rectangle([badge_x, badge_y, badge_x + badge_w, badge_y + badge_h], radius=6, fill=(11, 37, 89, 240), outline=(217, 119, 6, 220), width=1)
                draw.text((badge_x + 16, badge_y + 4), "Dean Prashant Tejam", font=font_pip_label, fill=(255, 255, 255))
                draw.text((badge_x + 16, badge_y + 21), "Prashant Academy • ICSE Maths", font=font_pip_sub, fill=(186, 230, 253))

            # ─────────────────────────────────────────────────────────────
            # 4. BOTTOM FOOTER ATTRIBUTION
            # ─────────────────────────────────────────────────────────────
            draw.text((60, HEIGHT - 46), "Prashant Academy Coaching Institute • PrathamOne EduOS Classroom Recording Engine", font=font_footer, fill=(255, 255, 255, 120))
            draw.text((WIDTH - 540, HEIGHT - 46), "Highlighter (H) • Boya Mic AGC • 1080p 30 FPS", font=font_footer, fill=(255, 255, 255, 120))

            # Stream RGB frame to FFmpeg pipe
            rgb_frame = frame.convert("RGB")
            proc.stdin.write(rgb_frame.tobytes())

            if f % 180 == 0 or f == TOTAL_FRAMES - 1:
                pct = (f + 1) / float(TOTAL_FRAMES) * 100.0
                print(f"[PROGRESS] Rendered frame {f+1}/{TOTAL_FRAMES} ({pct:.1f}%) — {t:.1f}s / {TOTAL_DURATION:.1f}s")

    finally:
        proc.stdin.close()
        proc.wait()

    print(f"[SUCCESS] Lecture video rendered to: {FINAL_OUTPUT_MP4} (Size: {FINAL_OUTPUT_MP4.stat().st_size / (1024*1024):.2f} MB)")

    # Copy to frontend public media directory and artifacts
    shutil.copy2(FINAL_OUTPUT_MP4, FRONTEND_OUTPUT_MP4)
    print(f"[COPIED] Frontend public: {FRONTEND_OUTPUT_MP4}")

    artifact_copy = ARTIFACTS_DIR / FINAL_MP4_NAME
    shutil.copy2(FINAL_OUTPUT_MP4, artifact_copy)
    print(f"[COPIED TO ARTIFACTS] {artifact_copy}")

    # Extract keyframes for inspection
    extract_keyframes(FINAL_OUTPUT_MP4)


def extract_keyframes(video_path: Path):
    """Extracts 4 representative keyframes from the rendered lecture video."""
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    timestamps = [6.0, 24.0, 48.0, 60.0]
    labels = [
        "prashant_01_intro_nomenclature.jpg",
        "prashant_02_observations_sum.jpg",
        "prashant_03_shift_property_rule.jpg",
        "prashant_04_highlighter_catchphrase.jpg"
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
    render_prashant_sir_lecture()
