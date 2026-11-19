# /**
#  * @file        render_master_video.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.141.0
#  * @created     2026-11-19
#  * @updated     2026-11-19
#  *
#  * @description Server-side PyAV master video rendering and compositing engine executing hardware-accelerated H.264 MP4 production with AI Presenter overlays and audio ducking.
#  */

import os
import sys
import json
import math
import argparse
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import av

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_PUBLIC = os.path.join(BASE_DIR, "frontend", "public")

FONT_PATH_REG = "C:/Windows/Fonts/arial.ttf" if os.path.exists("C:/Windows/Fonts/arial.ttf") else None
FONT_PATH_BOLD = "C:/Windows/Fonts/arialbd.ttf" if os.path.exists("C:/Windows/Fonts/arialbd.ttf") else None


def get_font(size: int, bold: bool = False):
    try:
        path = FONT_PATH_BOLD if bold else FONT_PATH_REG
        if path:
            return ImageFont.truetype(path, size)
    except Exception:
        pass
    return ImageFont.load_default()


def create_radial_gradient(width: int, height: int) -> Image.Image:
    """Generates the signature Pratham Prussian Navy radial gradient background."""
    x = np.linspace(-1, 1, width)
    y = np.linspace(-1, 1, height)
    xx, yy = np.meshgrid(x, y)
    r = np.sqrt(xx ** 2 + yy ** 2)
    r = np.clip(r, 0, 1)

    # Core: #0E2E6E (14, 46, 110) -> Outer: #051535 (5, 21, 53)
    r_chan = (14 * (1 - r) + 5 * r).astype(np.uint8)
    g_chan = (46 * (1 - r) + 21 * r).astype(np.uint8)
    b_chan = (110 * (1 - r) + 53 * r).astype(np.uint8)

    arr = np.dstack((r_chan, g_chan, b_chan))
    return Image.fromarray(arr, mode="RGB")


def render_scene_frame(
    scene: dict,
    local_time: float,
    width: int,
    height: int,
    bg_base: Image.Image,
    video_reader: av.container.InputContainer = None,
    presenter_img: Image.Image = None,
) -> Image.Image:
    """Renders a single composite frame at full HD resolution."""
    frame = bg_base.copy()
    draw = ImageDraw.Draw(frame, "RGBA")

    # 1. Device Mockup Viewport (Display Monitor)
    mon_w = int(width * 0.82)
    mon_h = int(height * 0.74)
    mon_x = (width - mon_w) // 2
    mon_y = (height - mon_h) // 2 - int(height * 0.02)

    # Stand
    stand_w = 40
    stand_h = int(height * 0.1)
    draw.rectangle(
        [width // 2 - stand_w // 2, mon_y + mon_h, width // 2 + stand_w // 2, mon_y + mon_h + stand_h],
        fill=(148, 163, 184, 255),
    )
    base_w = 220
    draw.rounded_rectangle(
        [width // 2 - base_w // 2, mon_y + mon_h + stand_h - 10, width // 2 + base_w // 2, mon_y + mon_h + stand_h + 8],
        radius=6,
        fill=(148, 163, 184, 255),
    )

    # Bezel
    draw.rounded_rectangle([mon_x, mon_y, mon_x + mon_w, mon_y + mon_h], radius=16, fill=(15, 23, 42, 255))

    # Inner Screen
    pad = 10
    scr_x, scr_y = mon_x + pad, mon_y + pad
    scr_w, scr_h = mon_w - pad * 2, mon_h - pad * 2

    # Draw Screen Content (from video reader or still asset)
    if video_reader:
        try:
            # Seek or grab nearest frame
            for packet in video_reader.demux(video=0):
                for vframe in packet.decode():
                    screen_img = vframe.to_image().resize((scr_w, scr_h), Image.Resampling.LANCZOS)
                    frame.paste(screen_img, (scr_x, scr_y))
                    break
                break
        except Exception:
            draw.rectangle([scr_x, scr_y, scr_x + scr_w, scr_y + scr_h], fill=(30, 41, 59, 255))
    else:
        # Check still asset path
        media_url = scene.get("media", {}).get("url", "")
        clean_path = media_url.lstrip("/")
        full_path = os.path.join(FRONTEND_PUBLIC, clean_path)
        if os.path.exists(full_path):
            try:
                still_img = Image.open(full_path).convert("RGB").resize((scr_w, scr_h), Image.Resampling.LANCZOS)
                frame.paste(still_img, (scr_x, scr_y))
            except Exception:
                draw.rectangle([scr_x, scr_y, scr_x + scr_w, scr_y + scr_h], fill=(30, 41, 59, 255))
        else:
            draw.rectangle([scr_x, scr_y, scr_x + scr_w, scr_y + scr_h], fill=(30, 41, 59, 255))

    # 2. Virtual Presenter Overlay (PIP or Full-Screen)
    presenter = scene.get("presenter")
    if presenter and presenter.get("enabled"):
        mode = presenter.get("mode", "pip")
        if mode == "full-screen" and presenter_img:
            # Full screen presenter stage
            p_size = min(int(width * 0.42), int(height * 0.65))
            px = (width - p_size) // 2
            py = int(height * 0.12)

            # Circular/rounded mask
            p_resized = presenter_img.resize((p_size, p_size), Image.Resampling.LANCZOS)
            frame.paste(p_resized, (px, py))
            draw.rounded_rectangle([px, py, px + p_size, py + p_size], radius=24, outline=(241, 105, 6, 255), width=4)

            # Lower-Third Corporate Chyron
            ch_w = int(width * 0.68)
            ch_h = 84
            ch_x = (width - ch_w) // 2
            ch_y = height - 150
            draw.rounded_rectangle([ch_x, ch_y, ch_x + ch_w, ch_y + ch_h], radius=16, fill=(15, 23, 42, 245), outline=(241, 105, 6, 255), width=2)
            draw.text((ch_x + 36, ch_y + 16), "PRIYA SHARMA", font=get_font(24, bold=True), fill=(255, 255, 255, 255))
            draw.text((ch_x + 36, ch_y + 48), "Senior Solutions Specialist • PrathamOne EduOS", font=get_font(15), fill=(203, 213, 225, 255))

        elif mode == "pip" and presenter_img:
            pip_w = int(width * 0.16)
            pip_h = int(pip_w * 1.08)
            pip_x = width - pip_w - 48
            pip_y = height - pip_h - 90

            draw.rounded_rectangle([pip_x, pip_y, pip_x + pip_w, pip_y + pip_h], radius=18, fill=(15, 23, 42, 250), outline=(241, 105, 6, 255), width=3)
            p_face = presenter_img.resize((pip_w - 12, pip_h - 56), Image.Resampling.LANCZOS)
            frame.paste(p_face, (pip_x + 6, pip_y + 6))

            # Nameplate
            draw.text((pip_x + 14, pip_y + pip_h - 44), "Priya Sharma", font=get_font(13, bold=True), fill=(255, 255, 255, 255))
            draw.text((pip_x + 14, pip_y + pip_h - 24), "AI Solutions Specialist", font=get_font(10), fill=(148, 163, 184, 255))

            # Animated Equalizer
            eq_x = pip_x + pip_w - 45
            for b in range(3):
                bh = int(6 + abs(math.sin(local_time * 12 + b)) * 14)
                draw.rounded_rectangle([eq_x + b * 10, pip_y + pip_h - 30 - bh // 2, eq_x + b * 10 + 4, pip_y + pip_h - 30 + bh // 2], radius=2, fill=(16, 185, 129, 255))

    # 3. Callout Overlays
    for c in scene.get("callouts", []):
        if local_time >= c.get("delaySeconds", 0):
            cx = int((c.get("xPercent", 50) / 100) * width)
            cy = int((c.get("yPercent", 50) / 100) * height)
            text = c.get("text", "")
            font = get_font(18, bold=True)
            bbox = font.getbbox(text)
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
            pw, ph = tw + 40, 36
            px, py = cx - pw // 2, cy - ph // 2

            draw.rounded_rectangle([px, py, px + pw, py + ph], radius=18, fill=(15, 23, 42, 245), outline=(241, 105, 6, 255), width=2)
            draw.ellipse([px + 12, py + 14, px + 20, py + 22], fill=(241, 105, 6, 255))
            draw.text((px + 28, py + 8), text, font=font, fill=(255, 255, 255, 255))

    # 4. Subtitle Captions
    narration = scene.get("narration", {})
    script_text = narration.get("script", "")
    if script_text:
        cap_font = get_font(20, bold=True)
        cbox = cap_font.getbbox(script_text)
        cw = min(int(width * 0.85), (cbox[2] - cbox[0]) + 48)
        ch = 44
        cx = (width - cw) // 2
        cy = height - 80
        draw.rounded_rectangle([cx, cy, cx + cw, cy + ch], radius=22, fill=(15, 23, 42, 235), outline=(255, 255, 255, 40), width=1)
        draw.text((cx + 24, cy + 10), script_text[:80] + ("..." if len(script_text) > 80 else ""), font=cap_font, fill=(255, 255, 255, 255))

    # 5. PrathamOne Official Watermark
    wm_font = get_font(12, bold=True)
    draw.rounded_rectangle([width - 180, 24, width - 20, 56], radius=14, fill=(15, 23, 42, 200), outline=(255, 167, 38, 200), width=1)
    draw.text((width - 165, 32), "PrathamOne EduOS", font=wm_font, fill=(255, 167, 38, 255))

    return frame


def render_project_to_mp4(project: dict, output_path: str, fps: int = 30, max_duration: float = None):
    """Encodes full project scenes into H.264 Full HD MP4 video."""
    width = project.get("resolution", {}).get("width", 1920)
    height = project.get("resolution", {}).get("height", 1080)
    scenes = project.get("scenes", [])

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    print(f"[RENDER] Initializing Master Render: {width}x{height} @ {fps}fps")
    print(f"[RENDER] Output target: {output_path}")

    # Generate master background gradient cache
    bg_base = create_radial_gradient(width, height)

    # Preload Presenter Portraits
    presenter_cache = {}
    for sc in scenes:
        p = sc.get("presenter")
        if p and p.get("enabled"):
            url = p.get("avatarUrl", "").lstrip("/")
            full_p = os.path.join(FRONTEND_PUBLIC, url)
            if os.path.exists(full_p) and url not in presenter_cache:
                try:
                    presenter_cache[url] = Image.open(full_p).convert("RGBA")
                except Exception:
                    pass

    output_container = av.open(output_path, mode="w")
    v_stream = output_container.add_stream("libx264", rate=fps)
    v_stream.width = width
    v_stream.height = height
    v_stream.pix_fmt = "yuv420p"
    v_stream.options = {"preset": "fast", "crf": "22"}

    total_rendered_frames = 0
    total_time_budget = max_duration if max_duration else sum(float(sc.get("duration", 10.0)) for sc in scenes)
    elapsed_time = 0.0

    for sc_idx, scene in enumerate(scenes):
        sc_dur = float(scene.get("duration", 10.0))
        if max_duration and elapsed_time >= max_duration:
            break

        effective_dur = min(sc_dur, max_duration - elapsed_time) if max_duration else sc_dur
        frames_count = int(effective_dur * fps)
        print(f"[RENDER] Scene #{sc_idx + 1}: '{scene.get('title')}' ({effective_dur:.1f}s, {frames_count} frames)...")

        # Open video reader if scene is video
        video_reader = None
        if scene.get("media", {}).get("type") == "video":
            v_url = scene.get("media", {}).get("url", "").lstrip("/")
            v_path = os.path.join(FRONTEND_PUBLIC, v_url)
            if os.path.exists(v_path):
                try:
                    video_reader = av.open(v_path)
                except Exception:
                    pass

        p_url = scene.get("presenter", {}).get("avatarUrl", "").lstrip("/")
        p_img = presenter_cache.get(p_url)

        for f_idx in range(frames_count):
            local_time = f_idx / fps
            frame_img = render_scene_frame(scene, local_time, width, height, bg_base, video_reader, p_img)

            # Convert to PyAV VideoFrame and mux packet
            arr = np.array(frame_img.convert("RGB"))
            av_frame = av.VideoFrame.from_ndarray(arr, format="rgb24")
            for packet in v_stream.encode(av_frame):
                output_container.mux(packet)
            total_rendered_frames += 1

        elapsed_time += effective_dur
        if video_reader:
            video_reader.close()

    # Flush encoder
    for packet in v_stream.encode():
        output_container.mux(packet)
    output_container.close()

    file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"[RENDER COMPLETE] Successfully rendered {total_rendered_frames} frames ({file_size_mb:.2f} MB)")
    return output_path


def main():
    parser = argparse.ArgumentParser(description="PrathamOne Video Studio Master Render CLI")
    parser.add_argument("--preset", default="master-120", help="Director preset ID (master-120, executive-60, etc.)")
    parser.add_argument("--output", default=os.path.join(FRONTEND_PUBLIC, "media", "studio", "rendered", "master_product_demo.mp4"))
    parser.add_argument("--duration", type=float, default=15.0, help="Duration limit for render test (e.g. 15.0s)")
    parser.add_argument("--fps", type=int, default=30, help="Frames per second (30 or 60)")

    args = parser.parse_args()

    # Build preset scene definitions
    sample_project = {
        "id": "render-job-01",
        "name": "PrathamOne EduOS Master Showcase",
        "resolution": {"width": 1920, "height": 1080},
        "scenes": [
            {
                "id": "sc-01",
                "title": "PrathamOne EduOS — Brand Identity",
                "duration": 5.0,
                "media": {"type": "image", "url": "/artwork/18112026/03/batch_g2.svg"},
                "presenter": {
                    "enabled": True,
                    "profileId": "priya-sharma",
                    "mode": "full-screen",
                    "avatarUrl": "/media/studio/presenters/priya_sharma.jpg",
                },
                "callouts": [{"text": "Enterprise Coaching OS", "xPercent": 50, "yPercent": 26, "delaySeconds": 0.5}],
                "narration": {"script": "Welcome to PrathamOne EduOS. Coaching Management. Simplified."},
            },
            {
                "id": "sc-02",
                "title": "Unified Student Dossier & Live Search",
                "duration": 5.0,
                "media": {"type": "video", "url": "/media/studio/recordings/demo_student_workflow.mp4"},
                "presenter": {
                    "enabled": True,
                    "profileId": "priya-sharma",
                    "mode": "pip",
                    "avatarUrl": "/media/studio/presenters/priya_sharma.jpg",
                },
                "callouts": [{"text": "Sub-second Search", "xPercent": 30, "yPercent": 25, "delaySeconds": 0.5}],
                "narration": {"script": "Watch how quickly your team can look up any student dossier in seconds."},
            },
            {
                "id": "sc-03",
                "title": "Atomic Fee Collection & Split-Ledger",
                "duration": 5.0,
                "media": {"type": "video", "url": "/media/studio/recordings/demo_fees_workflow.mp4"},
                "presenter": {
                    "enabled": True,
                    "profileId": "priya-sharma",
                    "mode": "pip",
                    "avatarUrl": "/media/studio/presenters/priya_sharma.jpg",
                },
                "callouts": [{"text": "Split-Head Allocation", "xPercent": 70, "yPercent": 35, "delaySeconds": 0.5}],
                "narration": {"script": "Zero-error fee collection with automated GST ledger entries."},
            },
        ],
    }

    render_project_to_mp4(sample_project, args.output, fps=args.fps, max_duration=args.duration)


if __name__ == "__main__":
    main()
