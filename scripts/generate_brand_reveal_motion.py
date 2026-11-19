# /**
#  * @file        generate_brand_reveal_motion.py
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
#  * @description Generates the broadcast-grade 10-second official Brand Reveal motion video (00:10 - 00:20) using official 18112026 master logos, golden light accents, and deep Prussian Navy aesthetics.
#  */

import math
from pathlib import Path
import av
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUTPUT_DIR = Path("data/commercial/motion")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE = OUTPUT_DIR / "brand_reveal_official_1080p.mp4"

ARTWORK_DIR = Path("frontend/public/artwork/18112026")
LOGO_IMG_PATH = ARTWORK_DIR / "batch_g6.png" if (ARTWORK_DIR / "batch_g6.png").exists() else ARTWORK_DIR / "LOGO.PNG"
CREST_IMG_PATH = ARTWORK_DIR / "03" / "icon-512.png" if (ARTWORK_DIR / "03" / "icon-512.png").exists() else ARTWORK_DIR / "batch_path1.png"


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def render_brand_reveal_video(duration_sec: float = 10.0, fps: int = 30):
    W, H = 1920, 1080
    n_frames = int(duration_sec * fps)
    print(f"Generating 10-second Brand Reveal Video: {OUTPUT_FILE} ({n_frames} frames @ {fps}fps)...")

    # Load master logos with high resolution
    Image.MAX_IMAGE_PIXELS = None
    master_logo = Image.open(LOGO_IMG_PATH).convert("RGBA")
    master_crest = Image.open(CREST_IMG_PATH).convert("RGBA")

    # Crop tight bounding box on logo
    bbox = master_logo.getbbox()
    if bbox:
        master_logo = master_logo.crop(bbox)

    c_bbox = master_crest.getbbox()
    if c_bbox:
        master_crest = master_crest.crop(c_bbox)

    container = av.open(str(OUTPUT_FILE), mode="w")
    stream = container.add_stream("h264", rate=fps)
    stream.width = W
    stream.height = H
    stream.pix_fmt = "yuv420p"
    stream.bit_rate = 8500000
    stream.options = {"preset": "fast", "profile": "high"}

    # Base Colors
    navy_deep = (5, 21, 53)
    navy_prussian = (11, 45, 107)
    orange_brand = (241, 105, 6)
    amber_gold = (251, 191, 36)

    # Particle ribbons initialization
    np.random.seed(1811)
    n_particles = 180
    p_angles = np.random.uniform(0, 2 * math.pi, n_particles)
    p_radii = np.random.uniform(200, 850, n_particles)
    p_speeds = np.random.uniform(0.8, 2.0, n_particles)

    for f in range(n_frames):
        t = f / fps
        canvas = Image.new("RGBA", (W, H), (*navy_deep, 255))
        draw = ImageDraw.Draw(canvas)

        # 1. Volumetric ambient center glow
        cx, cy = W // 2, H // 2 - 20
        glow_max = int(320 + 30 * math.sin(t * 2.0))
        for r in range(glow_max, 0, -25):
            alpha = int(28 * (1.0 - r / glow_max))
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*navy_prussian, alpha))

        # 2. Golden-orange radial light streaks (t < 5.0)
        streak_alpha = min(1.0, t / 1.5) if t < 4.0 else max(0.0, (5.0 - t) / 1.0)
        if streak_alpha > 0.01:
            for s in range(12):
                ang = t * 0.35 + s * (math.pi / 6)
                sx = cx + int(math.cos(ang) * 960)
                sy = cy + int(math.sin(ang) * 540)
                draw.line([(cx, cy), (sx, sy)], fill=(*orange_brand, int(35 * streak_alpha)), width=2)

        # 3. Swirling particle convergence
        for i in range(n_particles):
            rad = max(60, p_radii[i] - (t * 110 * p_speeds[i]) % p_radii[i])
            ang = p_angles[i] + t * (1.1 * p_speeds[i])
            pt_x = cx + int(math.cos(ang) * rad * 1.6)
            pt_y = cy + int(math.sin(ang) * rad)
            p_clr = orange_brand if i % 2 == 0 else amber_gold
            draw.ellipse([pt_x - 3, pt_y - 3, pt_x + 3, pt_y + 3], fill=(*p_clr, 190))

        # 4. Official Master Logo Lockup Animation (smooth scale & opacity entrance)
        # Fade in 0.0s -> 2.0s, gentle floating zoom 2.0s -> 10.0s
        fade = min(1.0, t / 1.8)
        scale_anim = 0.82 + 0.18 * min(1.0, t / 2.2) + 0.02 * (t / duration_sec)

        target_logo_w = int(1120 * scale_anim)
        aspect = master_logo.height / master_logo.width
        target_logo_h = int(target_logo_w * aspect)

        scaled_logo = master_logo.resize((target_logo_w, target_logo_h), Image.Resampling.LANCZOS)
        
        # Apply alpha to logo
        if fade < 0.99:
            alpha_mask = scaled_logo.split()[3].point(lambda p: int(p * fade))
            scaled_logo.putalpha(alpha_mask)

        logo_x = (W - target_logo_w) // 2
        logo_y = cy - target_logo_h // 2 - 25
        canvas.paste(scaled_logo, (logo_x, logo_y), scaled_logo)

        # 5. Golden light sweep across emblem (at t=3.0s to 5.5s)
        if 2.5 <= t <= 6.0:
            sweep_p = (t - 2.5) / 3.5
            sweep_x = int(logo_x + sweep_p * (target_logo_w + 200) - 100)
            draw.polygon(
                [(sweep_x, logo_y - 20), (sweep_x + 70, logo_y - 20), (sweep_x + 10, logo_y + target_logo_h + 20), (sweep_x - 60, logo_y + target_logo_h + 20)],
                fill=(255, 255, 255, 45),
            )

        # 6. Secondary Tagline Entrance (fades in at t >= 2.0s)
        sub_fade = max(0.0, min(1.0, (t - 2.0) / 1.5))
        if sub_fade > 0.01:
            a_sub = int(240 * sub_fade)
            font_sub = load_font(26, bold=True)
            font_tag = load_font(20, bold=False)

            tag_text = "ENTERPRISE POWER. EVERYDAY SIMPLICITY."
            bbox_t = font_sub.getbbox(tag_text)
            tw = bbox_t[2] - bbox_t[0]
            draw.text(((W - tw) // 2, logo_y + target_logo_h + 38), tag_text, font=font_sub, fill=(241, 105, 6, a_sub))

            sub_text = "The Modern Operating System for Coaching Academies"
            bbox_s = font_tag.getbbox(sub_text)
            sw = bbox_s[2] - bbox_s[0]
            draw.text(((W - sw) // 2, logo_y + target_logo_h + 80), sub_text, font=font_tag, fill=(203, 213, 225, int(220 * sub_fade)))

        # Direct PyAV encode
        av_frame = av.VideoFrame.from_image(canvas.convert("RGB"))
        for packet in stream.encode(av_frame):
            container.mux(packet)

    for packet in stream.encode():
        container.mux(packet)
    container.close()
    print(f"Brand Reveal Video generated successfully: {OUTPUT_FILE} ({OUTPUT_FILE.stat().st_size} bytes)")


if __name__ == "__main__":
    render_brand_reveal_video()
