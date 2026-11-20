# /**
#  * @file        record_prashant_physics_session.py
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
#  * @description 1080p EduBoard lecture recording for ICSE Class 10 Physics (Moment of Force & Torque) in Dean Prashant Tejam's authentic voice, style, expressions, real-time derivations, dual highlighters, and camera PiP.
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

FINAL_MP4_NAME = "PrashantAcademy_ICSE_Class10_Physics_Moment_Lecture_1080p.mp4"
FINAL_OUTPUT_MP4 = OUTPUT_DIR / FINAL_MP4_NAME
FRONTEND_OUTPUT_MP4 = FRONTEND_MEDIA_DIR / FINAL_MP4_NAME

AUDIO_WAV = ROOT / "assets" / "audio" / "physics_moment_generated_master.wav"
TEACHER_IMG_PATH = ROOT / "assets" / "prashant_face_crop.jpg"

WIDTH = 1920
HEIGHT = 1080
FPS = 30
TOTAL_DURATION = 100.94  # Exact master audio duration
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
font_formula_code = ImageFont.truetype(FONT_MONO_BOLD, 21)
font_badge = ImageFont.truetype(FONT_BOLD, 16)
font_chalk_lg = ImageFont.truetype(FONT_BOLD, 30)
font_chalk_md = ImageFont.truetype(FONT_BOLD, 23)
font_chalk_sm = ImageFont.truetype(FONT_REGULAR, 20)
font_chalk_mono = ImageFont.truetype(FONT_MONO_BOLD, 22)
font_sig = ImageFont.truetype(FONT_BOLD, 22)

# Color Palette (Crisp emerald greenboard, high contrast chalks)
BG_GREEN = (15, 61, 43)             # Crisp clean emerald chalkboard (#0f3d2b)
BORDER_WOOD = (74, 44, 20)          # Rich mahogany border
BORDER_WOOD_LIGHT = (115, 75, 42)
CHALK_WHITE = (250, 252, 250)       # Fresh white chalk
CHALK_YELLOW = (255, 230, 110)      # Warm buttercup chalk
CHALK_CYAN = (130, 225, 240)        # Electric sky chalk
CHALK_PINK = (255, 165, 195)        # Soft coral chalk
CHALK_GREEN = (140, 240, 175)       # Mint green chalk
CHALK_GRAY = (180, 200, 190)        # Muted explanation text
ACCENT_GOLD = (255, 204, 0)
ACCENT_GREEN = (34, 197, 94)

def load_teacher_pip():
    """Prepare circular webcam PiP of Dean Prashant Tejam."""
    if TEACHER_IMG_PATH.exists():
        img = Image.open(TEACHER_IMG_PATH).convert("RGBA")
        img = img.resize((150, 150), Image.Resampling.LANCZOS)
        mask = Image.new("L", (150, 150), 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, 150, 150), fill=255)
        img.putalpha(mask)
        return img
    return None

teacher_pip_img = load_teacher_pip()

def draw_board_base(draw: ImageDraw.ImageDraw, frame_idx: int):
    """Draw solid emerald chalkboard, mahogany frame, chalk tray, and UI header."""
    # Outer frame
    draw.rectangle([0, 0, WIDTH, HEIGHT], fill=BG_GREEN)
    draw.rectangle([0, 0, WIDTH, 16], fill=BORDER_WOOD)
    draw.rectangle([0, HEIGHT - 24, WIDTH, HEIGHT], fill=BORDER_WOOD)
    draw.rectangle([0, 0, 16, HEIGHT], fill=BORDER_WOOD)
    draw.rectangle([WIDTH - 16, 0, WIDTH, HEIGHT], fill=BORDER_WOOD)
    draw.rectangle([16, 16, WIDTH - 16, 20], fill=BORDER_WOOD_LIGHT)
    draw.rectangle([16, HEIGHT - 28, WIDTH - 16, HEIGHT - 24], fill=BORDER_WOOD_LIGHT)

    # Chalk tray at bottom
    tray_y = HEIGHT - 24
    draw.rectangle([200, tray_y - 8, WIDTH - 200, tray_y], fill=(95, 60, 32))
    # Chalk sticks in tray
    draw.rectangle([250, tray_y - 6, 310, tray_y - 2], fill=(245, 245, 245))  # White
    draw.rectangle([330, tray_y - 6, 390, tray_y - 2], fill=(255, 230, 110))  # Yellow
    draw.rectangle([410, tray_y - 6, 470, tray_y - 2], fill=(130, 225, 240))  # Cyan
    draw.rectangle([490, tray_y - 6, 550, tray_y - 2], fill=(255, 165, 195))  # Pink
    draw.rectangle([580, tray_y - 12, 670, tray_y - 2], fill=(45, 30, 20))    # Felt eraser

    # Top Status Bar
    current_sec = frame_idx / FPS
    mins = int(current_sec // 60)
    secs = int(current_sec % 60)
    time_str = f"REC {mins:02d}:{secs:02d}"

    # Blinking red recording indicator
    rec_alpha = int(255 * (0.5 + 0.5 * math.sin(frame_idx * 0.25)))
    rec_dot_color = (239, 68, 68) if rec_alpha > 120 else (120, 30, 30)

    # Top pills
    draw.rectangle([35, 28, 175, 64], fill=(20, 35, 28), outline=(60, 100, 80), width=1)
    draw.ellipse([47, 41, 57, 51], fill=rec_dot_color)
    draw.text((66, 37), time_str, fill=(240, 240, 240), font=font_top_pill)

    draw.rectangle([190, 28, 300, 64], fill=(20, 35, 28), outline=(60, 100, 80), width=1)
    draw.text((205, 37), "1080p 30fps", fill=(200, 230, 215), font=font_top_pill)

    draw.rectangle([315, 28, 455, 64], fill=(20, 35, 28), outline=(60, 100, 80), width=1)
    draw.text((328, 37), "EDUBOARD PRO", fill=(255, 215, 0), font=font_top_pill)

    # Center banner
    draw.text((500, 30), "PRASHANT ACADEMY • ICSE CLASS 10 PHYSICS", fill=CHALK_YELLOW, font=font_header_title)
    draw.text((500, 64), "CHAPTER 1: FORCE & TORQUE • TOPIC: MOMENT OF FORCE & EQUILIBRIUM", fill=CHALK_WHITE, font=font_header_sub)

    # Audio status pill
    draw.rectangle([1420, 28, 1690, 64], fill=(20, 35, 28), outline=(40, 90, 65), width=1)
    draw.ellipse([1432, 42, 1442, 52], fill=(34, 197, 94))
    draw.text((1450, 37), "Boya Wireless • AGC • 80Hz", fill=(200, 240, 220), font=font_top_pill)

    # Divider below header
    draw.line([35, 96, WIDTH - 35, 96], fill=(45, 95, 70), width=2)

def draw_teacher_pip(img: Image.Image, frame_idx: int):
    """Draw circular webcam PiP with audio breathing pulsation."""
    if teacher_pip_img is None:
        return

    pip_x = WIDTH - 200
    pip_y = 108

    pulse = 1.0 + 0.025 * math.sin(frame_idx * 0.18)
    size = int(140 * pulse)
    resized_pip = teacher_pip_img.resize((size, size), Image.Resampling.BILINEAR)

    offset = (size - 140) // 2
    px = pip_x - offset
    py = pip_y - offset

    # Outer glow / ring
    draw = ImageDraw.Draw(img)
    draw.ellipse([px - 4, py - 4, px + size + 4, py + size + 4], outline=(255, 215, 0), width=3)
    img.paste(resized_pip, (px, py), resized_pip)

    # Teacher label badge
    draw.rectangle([px - 15, py + size + 6, px + size + 15, py + size + 28], fill=(20, 35, 28), outline=(60, 110, 85), width=1)
    draw.text((px - 8, py + size + 8), "Dean Prashant Tejam", fill=(255, 240, 180), font=font_badge)

def render_frame(frame_idx: int) -> Image.Image:
    """Render a single 1080p frame synchronized to audio."""
    canvas = Image.new("RGB", (WIDTH, HEIGHT), BG_GREEN)
    draw = ImageDraw.Draw(canvas)

    draw_board_base(draw, frame_idx)

    t = frame_idx / FPS  # Current time in seconds

    # =========================================================================
    # LEFT COLUMN: THEORY & CANONICAL FORMULAS (X: 50 to 920)
    # =========================================================================

    # 1. Concept & Definition (Appears at t >= 5.0s)
    if t >= 5.0:
        box1_alpha = min(1.0, (t - 5.0) / 1.0)
        draw.rectangle([50, 115, 920, 260], fill=(12, 48, 34), outline=(60, 115, 85), width=2)
        draw.text((70, 125), "1. CONCEPT & DEFINITION", fill=CHALK_YELLOW, font=font_chalk_md)
        draw.text((70, 160), "Moment of Force (Torque, τ):", fill=CHALK_WHITE, font=font_chalk_md)
        draw.text((70, 195), "Turning effect produced in a body about a fixed pivot.", fill=CHALK_CYAN, font=font_chalk_sm)
        draw.text((70, 225), "Depends on: (1) Magnitude of Force (F)  (2) Perpendicular Distance (d)", fill=CHALK_GRAY, font=font_chalk_sm)

    # 2. Canonical Formula Box (Appears at t >= 20.0s)
    if t >= 20.0:
        draw.rectangle([50, 280, 920, 520], fill=(12, 48, 34), outline=ACCENT_GOLD, width=3)
        draw.text((70, 292), "2. THE CANONICAL FORMULA (ICSE MANDATORY)", fill=CHALK_YELLOW, font=font_chalk_md)

        # Highlight box for formula
        draw.rectangle([70, 330, 900, 410], fill=(20, 65, 45), outline=(100, 160, 120), width=1)
        draw.text((95, 345), "τ  =  F  ×  d_⟂", fill=ACCENT_GOLD, font=font_chalk_lg)
        draw.text((370, 355), "(Torque = Force × Perpendicular Distance)", fill=CHALK_WHITE, font=font_chalk_sm)

        # Units and Dimensions
        draw.text((70, 430), "• S.I. Unit of Moment:       Newton-metre (N·m)", fill=CHALK_CYAN, font=font_chalk_sm)
        draw.text((70, 460), "• C.G.S. Unit of Moment:   dyne-centimetre (dyne·cm)", fill=CHALK_PINK, font=font_chalk_sm)
        draw.text((70, 490), "• Conversion Factor:         1 N·m = 10⁵ dyne × 10² cm = 10⁷ dyne·cm", fill=CHALK_WHITE, font=font_chalk_sm)

    # =========================================================================
    # RIGHT COLUMN: LIVE CLASSROOM PROBLEM & CONTRAST (X: 955 to 1860)
    # =========================================================================

    # 3. Classroom Problem: The Door Handle Dilemma (Appears at t >= 38.0s)
    if t >= 38.0:
        draw.rectangle([955, 115, 1700, 470], fill=(12, 48, 34), outline=(60, 120, 90), width=2)
        draw.text((975, 125), "3. CLASSROOM EXAMPLE: THE DOOR HANDLE", fill=CHALK_YELLOW, font=font_chalk_md)
        draw.text((975, 160), "Setup: Door width = 2.0 m | Applied Force = 10 N", fill=CHALK_WHITE, font=font_chalk_sm)

        # Case A: Outermost edge (t >= 48.0s)
        if t >= 48.0:
            draw.rectangle([975, 195, 1680, 310], fill=(18, 58, 40), outline=(80, 150, 105), width=1)
            draw.text((995, 205), "CASE A: Handle at outermost edge (d = 2.0 m)", fill=CHALK_GREEN, font=font_chalk_md)
            draw.text((995, 240), "τ = F × d  =  10 N × 2.0 m  =  20 N·m", fill=CHALK_WHITE, font=font_chalk_lg)
            draw.text((995, 280), "Result: Maximum torque -> Door turns easily with 1 finger!", fill=CHALK_CYAN, font=font_chalk_sm)

        # Case B: Contrast / Error case (t >= 65.0s)
        if t >= 65.0:
            draw.rectangle([975, 325, 1680, 450], fill=(22, 50, 38), outline=(220, 80, 80), width=1)
            draw.text((995, 335), "CASE B: Handle placed near hinge (d = 0.5 m)", fill=(255, 140, 140), font=font_chalk_md)
            draw.text((995, 370), "τ = 10 N × 0.5 m  =  5 N·m", fill=CHALK_PINK, font=font_chalk_lg)
            draw.text((995, 410), "Result: 75% torque loss! Door feels heavy! Needs 4x force!", fill=(255, 200, 150), font=font_chalk_sm)

    # 4. Sign Conventions for ICSE Board Exams (Appears at t >= 78.0s)
    if t >= 78.0:
        draw.rectangle([50, 540, 1860, 710], fill=(12, 48, 34), outline=(70, 140, 105), width=2)
        draw.text((70, 552), "4. ICSE BOARD EXAM SIGN CONVENTIONS & EQUILIBRIUM", fill=CHALK_YELLOW, font=font_chalk_md)

        # Two sub-boxes for sign conventions
        draw.rectangle([70, 590, 920, 690], fill=(18, 55, 38), outline=(60, 180, 120), width=2)
        draw.text((90, 605), "↻ ANTICLOCKWISE MOMENT", fill=CHALK_GREEN, font=font_chalk_md)
        draw.text((90, 645), "Sign: POSITIVE (+)", fill=ACCENT_GOLD, font=font_chalk_lg)
        draw.text((450, 650), "[Standard Mathematical Convention]", fill=CHALK_GRAY, font=font_chalk_sm)

        draw.rectangle([955, 590, 1840, 690], fill=(22, 45, 36), outline=(230, 100, 100), width=2)
        draw.text((975, 605), "↺ CLOCKWISE MOMENT", fill=CHALK_PINK, font=font_chalk_md)
        draw.text((975, 645), "Sign: NEGATIVE (-)", fill=(255, 130, 130), font=font_chalk_lg)
        draw.text((1350, 650), "[Principle of Moments: Σ Anti = Σ Clock]", fill=CHALK_GRAY, font=font_chalk_sm)

    # =========================================================================
    # HIGH-CONTRAST DUAL HIGHLIGHTERS & SIGNATURE BADGE (t >= 88.0s)
    # =========================================================================

    # Fluorescent Yellow Highlighter (Sweeps across Case A 20 N·m formula at t >= 88.0s)
    if t >= 88.0:
        hl1_progress = min(1.0, (t - 88.0) / 3.0)
        hl1_width = int(680 * hl1_progress)
        if hl1_width > 0:
            overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
            hl_draw = ImageDraw.Draw(overlay)
            hl_draw.rectangle([985, 235, 985 + hl1_width, 275], fill=(255, 235, 59, 100))  # Semi-transparent yellow
            canvas = Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB")
            draw = ImageDraw.Draw(canvas)

    # Neon Green Highlighter (Sweeps across Sign Conventions at t >= 93.0s)
    if t >= 93.0:
        hl2_progress = min(1.0, (t - 93.0) / 3.0)
        hl2_width = int(1750 * hl2_progress)
        if hl2_width > 0:
            overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
            hl_draw = ImageDraw.Draw(overlay)
            hl_draw.rectangle([80, 640, 80 + hl2_width, 680], fill=(74, 222, 128, 95))  # Semi-transparent neon green
            canvas = Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB")
            draw = ImageDraw.Draw(canvas)

    # Prashant Sir Signature Catchphrase Badge (Appears at t >= 95.0s)
    if t >= 95.0:
        badge_alpha = min(1.0, (t - 95.0) / 1.5)
        badge_y = 735
        draw.rectangle([450, badge_y, 1470, badge_y + 60], fill=(30, 20, 10), outline=ACCENT_GOLD, width=3)
        draw.text((475, badge_y + 16), "★ \"BAAT SAMAJH MEIN AAYI?\" — Dean Prashant Tejam (ICSE Physics)", fill=ACCENT_GOLD, font=font_sig)

    # Bottom Footer Status Bar
    draw.text((50, HEIGHT - 22), "PrathamOne EduOS • Coaching Institute Edition 1.0.0 • Prashant Academy Coaching Institute", fill=(130, 160, 145), font=font_top_pill)
    draw.text((WIDTH - 480, HEIGHT - 22), "Teacher: Dean Prashant Tejam • ICSE Class 10 Physics", fill=(180, 215, 195), font=font_top_pill)

    # Teacher Camera PiP
    draw_teacher_pip(canvas, frame_idx)

    return canvas

def main():
    print("=" * 70)
    print("  PRASHANT ACADEMY — GENERATING NEW ICSE CLASS 10 PHYSICS LECTURE")
    print("=" * 70)
    print(f"Target Output: {FINAL_OUTPUT_MP4}")
    print(f"Audio Source:  {AUDIO_WAV}")
    print(f"Total Duration: {TOTAL_DURATION:.2f}s ({TOTAL_DURATION/60:.2f} mins) | Frames: {TOTAL_FRAMES} @ {FPS} FPS")

    if not AUDIO_WAV.exists():
        print(f"ERROR: Audio file not found at {AUDIO_WAV}")
        sys.exit(1)

    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

    # Create FFmpeg video pipe
    cmd = [
        ffmpeg_exe, "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{WIDTH}x{HEIGHT}",
        "-pix_fmt", "rgb24",
        "-r", str(FPS),
        "-i", "-",  # Video from stdin
        "-i", str(AUDIO_WAV),  # Master voiceover audio
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        str(FINAL_OUTPUT_MP4)
    ]

    print(f"Spawning FFmpeg pipe...")
    process = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)

    # Keyframe capture timestamps
    keyframe_times = [10.0, 30.0, 55.0, 75.0, 92.0, 98.0]
    captured_keyframes = set()

    for idx in range(TOTAL_FRAMES):
        frame = render_frame(idx)
        raw_bytes = frame.tobytes()
        process.stdin.write(raw_bytes)

        t = idx / FPS
        for kt in keyframe_times:
            if kt not in captured_keyframes and abs(t - kt) < (1.0 / FPS):
                captured_keyframes.add(kt)
                kf_name = f"physics_keyframe_{int(kt):02d}s.jpg"
                frame.save(OUTPUT_DIR / kf_name, quality=92)
                frame.save(ARTIFACTS_DIR / kf_name, quality=92)
                print(f"  [Keyframe] Captured at {t:.1f}s -> {kf_name}")

        if idx % 300 == 0 or idx == TOTAL_FRAMES - 1:
            pct = (idx + 1) / TOTAL_FRAMES * 100
            print(f"  [Progress] Rendered frame {idx+1}/{TOTAL_FRAMES} ({pct:.1f}%) | Time: {t:.1f}s")

    process.stdin.close()
    stderr = process.stderr.read().decode("utf-8", errors="replace")
    process.wait()

    if process.returncode != 0:
        print(f"ERROR in FFmpeg encoding: {stderr}")
        sys.exit(1)

    print(f"Successfully generated master video: {FINAL_OUTPUT_MP4} ({FINAL_OUTPUT_MP4.stat().st_size / (1024*1024):.2f} MB)")

    # Copy to frontend public media and brain artifacts
    shutil.copy2(FINAL_OUTPUT_MP4, FRONTEND_OUTPUT_MP4)
    shutil.copy2(FINAL_OUTPUT_MP4, ARTIFACTS_DIR / FINAL_MP4_NAME)
    print(f"Copied to frontend media: {FRONTEND_OUTPUT_MP4}")
    print(f"Copied to artifacts dir: {ARTIFACTS_DIR / FINAL_MP4_NAME}")

    print("=" * 70)
    print("  PHYSICS LECTURE RECORDING GENERATION COMPLETE!")
    print("=" * 70)

if __name__ == "__main__":
    main()
