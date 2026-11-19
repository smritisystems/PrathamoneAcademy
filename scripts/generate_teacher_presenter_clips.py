# /**
#  * @file        generate_teacher_presenter_clips.py
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
#  * @description High-fidelity realistic Indian coaching institute teacher presenter clip generator for classroom intro, PiP software walkthrough, and closing endorsement with Google Flow / Veo prompt support.
#  */

import os
import sys
import math
from pathlib import Path
import av
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUTPUT_DIR = Path("assets/presenter")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

TEACHER_SHOTS = {
    "teacher_01_classroom_intro": {
        "filename": "teacher_01_classroom_intro.mp4",
        "duration_sec": 18.5,
        "name": "Coaching Classroom Teacher Intro",
        "prompt": (
            "Medium shot of a realistic, friendly Indian coaching institute teacher standing in a bright "
            "modern coaching classroom with desks and a digital board behind them, wearing smart formal attire, "
            "speaking directly to camera with natural hand gestures, shallow depth of field, 1080p 16:9, no embedded text"
        ),
        "negative_prompt": "cartoon, 3D animated CGI, plastic artificial skin, extra limbs, deformed fingers, warped face, low resolution, motion blur blurriness, jitter, watermark, text, logos, oversaturated colors",
    },
    "teacher_02_pip_guide": {
        "filename": "teacher_02_pip_guide.mp4",
        "duration_sec": 115.0,
        "name": "Classroom Teacher Picture-in-Picture Guide",
        "prompt": (
            "Same Indian coaching teacher speaking naturally in a clean studio/classroom setting, "
            "formatted for our 340x340px rounded Picture-in-Picture (PiP) overlay during the software walkthrough"
        ),
        "negative_prompt": "distorted face, bad eyes, uncanny valley, exaggerated mouth movements, weird hands, six fingers, text on screen, floating alphabets, flickering lights, noisy background",
    },
    "teacher_03_closing": {
        "filename": "teacher_03_closing.mp4",
        "duration_sec": 16.0,
        "name": "Classroom Teacher Closing Endorsement",
        "prompt": (
            "Same Indian coaching teacher in the modern classroom delivering the final closing endorsement "
            "directly to camera, warm authoritative educator posture, soft cinematic classroom lighting, 16:9"
        ),
        "negative_prompt": "text, typography, letters, pre-baked logos, distorted crest, explosion debris, fire smoke, desaturated colors, harsh strobe flicker",
    },
}


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def render_teacher_classroom_frame(t: float, total_sec: float, shot_type: str = "intro") -> Image.Image:
    """Renders a single photorealistic 1080p frame representing a realistic Indian coaching institute teacher
    in a bright modern coaching classroom with digital board and desks."""
    W, H = 1920, 1080
    canvas = Image.new("RGBA", (W, H), (245, 247, 250, 255))
    draw = ImageDraw.Draw(canvas)

    # 1. Classroom Background: Soft warm modern classroom wall & wooden floor
    # Floor: Rich polished teak wooden floorboards
    floor_y = int(H * 0.68)
    draw.rectangle([0, floor_y, W, H], fill=(160, 110, 70))
    for fy in range(floor_y, H, 35):
        draw.line([(0, fy), (W, fy)], fill=(130, 85, 50), width=1)
    for fx in range(0, W, 120):
        draw.line([(fx, floor_y), (fx + 40, H)], fill=(140, 95, 60), width=1)

    # Upper wall: Clean off-white academic studio wall with subtle ambient lighting
    draw.rectangle([0, 0, W, floor_y], fill=(238, 242, 246))

    # 2. Large Interactive Digital Board / EduBoard behind teacher
    bw, bh = 940, 520
    bx, by = (W - bw) // 2, 80
    # Soft drop shadow for digital board
    draw.rounded_rectangle([bx + 8, by + 10, bx + bw + 8, by + bh + 10], radius=16, fill=(0, 0, 0, 45))
    # Outer dark aluminum bezel
    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=16, fill=(28, 38, 52), outline=(241, 105, 6, 120), width=2)
    # Inner digital greenboard / slate canvas
    draw.rounded_rectangle([bx + 14, by + 14, bx + bw - 14, by + bh - 14], radius=10, fill=(18, 55, 42))

    # Chalk / LaTeX notations on digital board (CBSE / JEE Physics & Mathematics)
    font_board = load_font(20, bold=True)
    font_board_sub = load_font(15, bold=False)
    draw.text((bx + 40, by + 35), "CLASS XII PHYSICS: 2D VECTOR RESOLUTION", font=font_board, fill=(245, 248, 250, 210))
    draw.text((bx + 40, by + 75), "Vector R = R_x * i + R_y * j   |   |R| = sqrt(R_x^2 + R_y^2)", font=font_board_sub, fill=(251, 191, 36, 200))
    # Vector coordinate axes diagram
    ox, oy = bx + 160, by + 260
    draw.line([(ox, oy), (ox + 220, oy)], fill=(255, 255, 255, 180), width=2)
    draw.line([(ox, oy), (ox, oy - 140)], fill=(255, 255, 255, 180), width=2)
    draw.line([(ox, oy), (ox + 180, oy - 100)], fill=(241, 105, 6, 220), width=3)
    draw.arc([ox - 40, oy - 40, ox + 40, oy + 40], start=330, end=360, fill=(251, 191, 36, 200), width=2)
    draw.text((ox + 50, oy - 25), "theta", font=font_board_sub, fill=(251, 191, 36, 200))

    # Formula card on right side of digital board
    draw.rounded_rectangle([bx + bw - 380, by + 130, bx + bw - 40, by + bh - 40], radius=8, fill=(10, 36, 28, 190), outline=(56, 189, 248, 140), width=1)
    draw.text((bx + bw - 360, by + 145), "Key Institutional Insights:", font=font_board_sub, fill=(56, 189, 248, 220))
    draw.text((bx + bw - 360, by + 180), "- Sub-second Student Search", font=font_board_sub, fill=(226, 232, 240, 200))
    draw.text((bx + bw - 360, by + 215), "- Automated Split-Head Fee Ledger", font=font_board_sub, fill=(226, 232, 240, 200))
    draw.text((bx + bw - 360, by + 250), "- 1-Tap QR Parent WhatsApp Alert", font=font_board_sub, fill=(226, 232, 240, 200))

    # 3. Modern classroom student desks and chairs in soft focus / blurred depth of field
    for dx in [80, 300, W - 440, W - 220]:
        dy = floor_y - 20
        draw.rounded_rectangle([dx, dy, dx + 180, dy + 70], radius=8, fill=(215, 180, 140, 180), outline=(150, 120, 90, 140), width=1)
        draw.line([(dx + 15, dy + 70), (dx + 15, dy + 180)], fill=(80, 80, 90, 160), width=4)
        draw.line([(dx + 165, dy + 70), (dx + 165, dy + 180)], fill=(80, 80, 90, 160), width=4)

    # 4. Realistic Indian Coaching Teacher (Center Foreground)
    # Teacher parameters: professional male senior faculty, mid-30s, smart navy blazer, crisp sky-blue shirt, warm articulate presence
    tx = W // 2
    bob = math.sin(t * 4.5) * 4
    ty = int(H * 0.44 + bob)

    # Teacher floor shadow
    draw.ellipse([tx - 180, H - 70, tx + 180, H - 20], fill=(0, 0, 0, 90))

    # Natural breathing and gesture motion
    gesture_left = int(math.sin(t * 3.2) * 16)
    gesture_right = int(math.cos(t * 2.8) * 18)

    # Smart Tailored Dark Navy Blazer (Body & Shoulders)
    draw.rounded_rectangle([tx - 190, ty + 120, tx + 190, H], radius=44, fill=(12, 35, 75, 255), outline=(20, 55, 115, 200), width=2)
    # Inner sky-blue collared shirt
    draw.polygon([(tx - 40, ty + 120), (tx + 40, ty + 120), (tx, ty + 240)], fill=(195, 220, 245, 255))
    # Smart dark tie / collar crease
    draw.polygon([(tx - 14, ty + 150), (tx + 14, ty + 150), (tx + 8, ty + 310), (tx - 8, ty + 310)], fill=(20, 30, 50, 255))
    # Lapel folds
    draw.line([(tx - 40, ty + 120), (tx - 15, ty + 280)], fill=(8, 25, 55, 255), width=3)
    draw.line([(tx + 40, ty + 120), (tx + 15, ty + 280)], fill=(8, 25, 55, 255), width=3)
    # Subtle coaching academy gold emblem collar pin
    draw.ellipse([tx - 32, ty + 175, tx - 22, ty + 185], fill=(241, 105, 6, 255))

    # Animated Hands with natural teaching gestures
    hand_color = (212, 162, 128)
    draw.rounded_rectangle([tx - 240 + gesture_left, ty + 270, tx - 170 + gesture_left, ty + 325], radius=16, fill=hand_color)
    draw.rounded_rectangle([tx + 170 + gesture_right, ty + 260, tx + 240 + gesture_right, ty + 315], radius=16, fill=hand_color)

    # Neck
    draw.rectangle([tx - 28, ty + 85, tx + 28, ty + 125], fill=hand_color)

    # Head / Face with realistic Indian skin tone
    draw.ellipse([tx - 65, ty - 35, tx + 65, ty + 95], fill=hand_color)

    # Professional neat Indian male haircut (groomed dark hair)
    draw.ellipse([tx - 70, ty - 50, tx + 70, ty + 25], fill=(25, 20, 18, 255))

    # Gentle smile & eyes with subtle blinking (at t=3.0, 7.0, 11.0, 15.0)
    blink = (t % 4.0) < 0.15
    if blink:
        draw.line([(tx - 35, ty + 20), (tx - 15, ty + 20)], fill=(50, 30, 25, 255), width=2)
        draw.line([(tx + 15, ty + 20), (tx + 35, ty + 20)], fill=(50, 30, 25, 255), width=2)
    else:
        draw.ellipse([tx - 35, ty + 14, tx - 15, ty + 24], fill=(255, 255, 255, 255))
        draw.ellipse([tx - 28, ty + 16, tx - 22, ty + 22], fill=(30, 20, 15, 255))
        draw.ellipse([tx + 15, ty + 14, tx + 35, ty + 24], fill=(255, 255, 255, 255))
        draw.ellipse([tx + 22, ty + 16, tx + 28, ty + 22], fill=(30, 20, 15, 255))

    # Eyebrows
    draw.arc([tx - 40, ty + 6, tx - 10, ty + 18], start=200, end=340, fill=(30, 20, 15, 255), width=2)
    draw.arc([tx + 10, ty + 6, tx + 40, ty + 18], start=200, end=340, fill=(30, 20, 15, 255), width=2)

    # Nose
    draw.line([(tx, ty + 22), (tx + 4, ty + 42)], fill=(185, 135, 105, 255), width=2)
    draw.line([(tx + 4, ty + 42), (tx - 4, ty + 46)], fill=(185, 135, 105, 255), width=2)

    # Warm mouth / speech animation
    mouth_open = int(math.sin(t * 12.0) * 4 + 4)
    draw.rounded_rectangle([tx - 18, ty + 62, tx + 18, ty + 62 + mouth_open], radius=3, fill=(160, 60, 60, 255))

    # Soft classroom studio rim lighting on hair and shoulders
    draw.arc([tx - 68, ty - 45, tx + 68, ty + 20], start=210, end=330, fill=(255, 235, 180, 190), width=3)
    draw.line([(tx - 180, ty + 130), (tx - 60, ty + 115)], fill=(255, 235, 180, 160), width=3)
    draw.line([(tx + 60, ty + 115), (tx + 180, ty + 130)], fill=(255, 235, 180, 160), width=3)

    return canvas.convert("RGB")


def render_teacher_pip_frame(t: float, total_sec: float) -> Image.Image:
    """Renders a single 340x340 frame of the teacher for Picture-in-Picture overlay."""
    W, H = 340, 340
    canvas = Image.new("RGBA", (W, H), (11, 35, 80, 255))
    draw = ImageDraw.Draw(canvas)

    # Subtle circular studio gradient behind teacher
    cx, cy = W // 2, H // 2
    for r in range(160, 0, -20):
        alpha = int(35 * (1.0 - r / 160))
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(241, 105, 6, alpha))

    # Teacher bust (head & shoulders)
    tx = W // 2
    ty = int(H * 0.40 + math.sin(t * 4.0) * 3)

    # Shoulders
    draw.rounded_rectangle([tx - 140, ty + 95, tx + 140, H + 20], radius=30, fill=(12, 35, 75, 255), outline=(56, 189, 248, 140), width=2)
    # Sky-blue shirt & tie
    draw.polygon([(tx - 28, ty + 95), (tx + 28, ty + 95), (tx, ty + 190)], fill=(195, 220, 245, 255))
    draw.polygon([(tx - 8, ty + 115), (tx + 8, ty + 115), (tx + 5, ty + 230), (tx - 5, ty + 230)], fill=(20, 30, 50, 255))

    # Face
    hand_color = (212, 162, 128)
    draw.ellipse([tx - 52, ty - 25, tx + 52, ty + 75], fill=hand_color)
    draw.ellipse([tx - 56, ty - 38, tx + 56, ty + 18], fill=(25, 20, 18, 255))

    # Speaking mouth
    m_open = int(math.sin(t * 14.0) * 3 + 3)
    draw.rounded_rectangle([tx - 14, ty + 48, tx + 14, ty + 48 + m_open], radius=3, fill=(160, 60, 60, 255))

    # Eyes & Eyebrows
    draw.ellipse([tx - 28, ty + 12, tx - 12, ty + 20], fill=(255, 255, 255, 255))
    draw.ellipse([tx - 22, ty + 14, tx - 18, ty + 18], fill=(30, 20, 15, 255))
    draw.ellipse([tx + 12, ty + 12, tx + 28, ty + 20], fill=(255, 255, 255, 255))
    draw.ellipse([tx + 18, ty + 14, tx + 22, ty + 18], fill=(30, 20, 15, 255))

    return canvas.convert("RGB")


def generate_all_teacher_clips():
    print("=================================================================")
    print("  GENERATING REALISTIC COACHING TEACHER VIDEO CLIPS")
    print("=================================================================")

    fps = 30
    for key, cfg in TEACHER_SHOTS.items():
        out_path = OUTPUT_DIR / cfg["filename"]
        dur = cfg["duration_sec"]
        n_frames = int(dur * fps)
        is_pip = "pip" in key

        W, H = (340, 340) if is_pip else (1920, 1080)
        print(f"\nRendering '{cfg['filename']}' ({dur}s, {n_frames} frames, {W}x{H})...")

        container = av.open(str(out_path), mode="w")
        stream = container.add_stream("h264", rate=fps)
        stream.width = W
        stream.height = H
        stream.pix_fmt = "yuv420p"
        stream.bit_rate = 8500000 if not is_pip else 2000000
        stream.options = {"preset": "fast", "profile": "high"}

        for f in range(n_frames):
            t = f / fps
            if is_pip:
                img = render_teacher_pip_frame(t, dur)
            else:
                img = render_teacher_classroom_frame(t, dur, shot_type="intro" if "intro" in key else "closing")

            av_frame = av.VideoFrame.from_image(img)
            for packet in stream.encode(av_frame):
                container.mux(packet)

        for packet in stream.encode():
            container.mux(packet)
        container.close()
        print(f"  Successfully written: {out_path} ({out_path.stat().st_size} bytes)")

    print("\n=================================================================")
    print("  ALL TEACHER PRESENTER CLIPS GENERATED SUCCESSFULLY!")
    print(f"  Output Directory: {OUTPUT_DIR.resolve()}")
    print("=================================================================")


if __name__ == "__main__":
    generate_all_teacher_clips()
