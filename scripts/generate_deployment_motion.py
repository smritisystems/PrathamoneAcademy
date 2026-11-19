# /**
#  * @file        generate_deployment_motion.py
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
#  * @description Generates the broadcast-grade 24-second Chapter 08 video: On-Premises vs Cloud Hybrid Architecture animation transitioning into the clean dark-navy PrathamOne EduOS brand end-slate.
#  */

import math
from pathlib import Path
import av
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUTPUT_DIR = Path("data/commercial/motion")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE = OUTPUT_DIR / "deployment_and_endcard_1080p.mp4"


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def render_deployment_frame(t: float, total_sec: float = 24.0) -> Image.Image:
    """Renders a single 1080p frame for Chapter 08:
    0.0s - 12.0s : On-Premises vs Cloud/Hybrid Architecture split
    12.0s - 24.0s: Clean Dark Navy Brand Climax & End Slate
    """
    W, H = 1920, 1080

    # Base background: Deep Prussian Navy gradient (#051535 -> #0A2558)
    base = Image.new("RGBA", (W, H), (5, 21, 53, 255))
    draw = ImageDraw.Draw(base)

    # Subtle ambient lighting glow in center
    cx, cy = W // 2, H // 2
    for r in range(400, 0, -40):
        alpha = int(14 * (1.0 - r / 400))
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(15, 45, 107, alpha))

    # Grid lines for technological aesthetic
    for x in range(0, W, 80):
        draw.line([x, 0, x, H], fill=(12, 35, 75, 50), width=1)
    for y in range(0, H, 80):
        draw.line([0, y, W, y], fill=(12, 35, 75, 50), width=1)

    if t < 12.5:
        # =====================================================================
        # PART 1: ON-PREMISES VS CLOUD HYBRID ARCHITECTURE (0.0s - 12.5s)
        # =====================================================================
        fade_in = min(1.0, t / 1.0)
        fade_out = 1.0 if t < 11.5 else max(0.0, (12.5 - t) / 1.0)
        alpha = fade_in * fade_out
        a_int = int(255 * alpha)

        # Header Title
        draw.text((W // 2 - 420, 70), "ENTERPRISE DEPLOYMENT ARCHITECTURE", font=load_font(28, bold=True), fill=(241, 105, 6, a_int))
        draw.text((W // 2 - 380, 115), "Air-Gapped Institutional Custody with Hybrid Multi-Branch Cloud Sync", font=load_font(18, bold=False), fill=(203, 213, 225, int(220 * alpha)))

        # LEFT CARD: ON-PREMISES CAMPUS SERVER
        card_w, card_h = 680, 700
        x1, y1 = 160, 180
        draw.rounded_rectangle([x1 + 6, y1 + 8, x1 + card_w + 6, y1 + card_h + 8], radius=20, fill=(0, 0, 0, int(110 * alpha)))
        draw.rounded_rectangle([x1, y1, x1 + card_w, y1 + card_h], radius=20, fill=(11, 35, 80, int(230 * alpha)), outline=(56, 189, 248, int(180 * alpha)), width=2)

        # Left Badge
        draw.rounded_rectangle([x1 + 30, y1 + 30, x1 + 280, y1 + 68], radius=8, fill=(14, 165, 233, int(40 * alpha)), outline=(56, 189, 248, int(200 * alpha)), width=1)
        draw.text((x1 + 45, y1 + 38), "CAMPUS AIR-GAPPED", font=load_font(14, bold=True), fill=(56, 189, 248, a_int))

        draw.text((x1 + 30, y1 + 95), "On-Premises Campus Server", font=load_font(26, bold=True), fill=(255, 255, 255, a_int))
        draw.text((x1 + 30, y1 + 140), "Local bare-metal or hypervisor deployment with zero internet dependency.", font=load_font(15, bold=False), fill=(148, 163, 184, int(230 * alpha)))

        # Server Rack Visual
        sy = y1 + 200
        for i in range(4):
            by = sy + i * 55
            draw.rounded_rectangle([x1 + 30, by, x1 + card_w - 30, by + 45], radius=8, fill=(6, 20, 50, int(220 * alpha)), outline=(30, 58, 110, int(180 * alpha)), width=1)
            # Server status LEDs
            led_blink = int(128 + 127 * math.sin(t * 5.0 + i))
            draw.ellipse([x1 + 55, by + 18, x1 + 67, by + 30], fill=(16, 185, 129, int(led_blink * alpha)))
            draw.ellipse([x1 + 75, by + 18, x1 + 87, by + 30], fill=(56, 189, 248, int(180 * alpha)))
            draw.text((x1 + 110, by + 13), f"Node #{i+1:02d} • PostgreSQL 16 Cluster • Microservices Online", font=load_font(13, bold=False), fill=(226, 232, 240, int(210 * alpha)))

        # Key Capabilities Bullet List
        specs = [
            ("100% Institutional Custody", "All biometric and fee records reside inside campus physical security perimeter."),
            ("Zero Latency LAN Operations", "Sub-millisecond RFID / QR badge scans and offline receipt printing."),
            ("DPDP Act 2023 Compliant", "End-to-end data localization guarantees zero non-sovereign foreign exposure."),
        ]
        for idx, (head, desc) in enumerate(specs):
            py = y1 + 460 + idx * 72
            draw.ellipse([x1 + 35, py + 6, x1 + 45, py + 16], fill=(56, 189, 248, a_int))
            draw.text((x1 + 60, py), head, font=load_font(16, bold=True), fill=(255, 255, 255, a_int))
            draw.text((x1 + 60, py + 24), desc, font=load_font(13, bold=False), fill=(148, 163, 184, int(210 * alpha)))

        # RIGHT CARD: CLOUD & HYBRID SYNC
        x2 = W - 160 - card_w
        draw.rounded_rectangle([x2 + 6, y1 + 8, x2 + card_w + 6, y1 + card_h + 8], radius=20, fill=(0, 0, 0, int(110 * alpha)))
        draw.rounded_rectangle([x2, y1, x2 + card_w, y1 + card_h], radius=20, fill=(11, 35, 80, int(230 * alpha)), outline=(241, 105, 6, int(180 * alpha)), width=2)

        # Right Badge
        draw.rounded_rectangle([x2 + 30, y1 + 30, x2 + 310, y1 + 68], radius=8, fill=(241, 105, 6, int(40 * alpha)), outline=(241, 105, 6, int(200 * alpha)), width=1)
        draw.text((x2 + 45, y1 + 38), "MULTI-BRANCH HYBRID", font=load_font(14, bold=True), fill=(241, 105, 6, a_int))

        draw.text((x2 + 30, y1 + 95), "Cloud & Multi-Branch Sync", font=load_font(26, bold=True), fill=(255, 255, 255, a_int))
        draw.text((x2 + 30, y1 + 140), "Synchronize satellite centers and parent communication with high availability.", font=load_font(15, bold=False), fill=(148, 163, 184, int(230 * alpha)))

        # Cloud Nodes Visual
        for i in range(4):
            by = sy + i * 55
            draw.rounded_rectangle([x2 + 30, by, x2 + card_w - 30, by + 45], radius=8, fill=(6, 20, 50, int(220 * alpha)), outline=(30, 58, 110, int(180 * alpha)), width=1)
            pulse = int(128 + 127 * math.sin(t * 6.0 + i * 1.5))
            draw.ellipse([x2 + 55, by + 18, x2 + 67, by + 30], fill=(241, 105, 6, int(pulse * alpha)))
            draw.ellipse([x2 + 75, by + 18, x2 + 87, by + 30], fill=(251, 191, 36, int(180 * alpha)))
            branch_names = ["Mumbai Central Head Office", "Pune Kothrud Branch", "Thane West Academic Center", "Parent WhatsApp & Mobile API Gateway"]
            draw.text((x2 + 110, by + 13), f"Sync Relay #{i+1:02d} • {branch_names[i]}", font=load_font(13, bold=False), fill=(226, 232, 240, int(210 * alpha)))

        # Cloud Capabilities
        specs_cloud = [
            ("Centralized Multi-Branch Analytics", "Aggregate revenue collections and student performance across all coaching branches."),
            ("Automated WhatsApp Alert Bus", "Instant trigger queuing when students check in or tuition payments clear."),
            ("Zero-Data-Loss Ledger Replication", "Automatic background syncing with conflict-free immutable ledger ledgers."),
        ]
        for idx, (head, desc) in enumerate(specs_cloud):
            py = y1 + 460 + idx * 72
            draw.ellipse([x2 + 35, py + 6, x2 + 45, py + 16], fill=(241, 105, 6, a_int))
            draw.text((x2 + 60, py), head, font=load_font(16, bold=True), fill=(255, 255, 255, a_int))
            draw.text((x2 + 60, py + 24), desc, font=load_font(13, bold=False), fill=(148, 163, 184, int(210 * alpha)))

        # CENTER INTERCONNECT DATA FLOW
        wire_y = y1 + 105
        draw.line([x1 + card_w, wire_y, x2, wire_y], fill=(30, 58, 110, int(200 * alpha)), width=3)
        # Moving packet along wire
        packet_x = (x1 + card_w) + int(((t * 180) % (x2 - (x1 + card_w))))
        draw.ellipse([packet_x - 7, wire_y - 7, packet_x + 7, wire_y + 7], fill=(241, 105, 6, a_int))
        draw.text((W // 2 - 80, wire_y - 25), "SSL AES-256", font=load_font(12, bold=True), fill=(56, 189, 248, int(220 * alpha)))

        # Bottom Footer Banner
        draw.rounded_rectangle([W // 2 - 440, 930, W // 2 + 440, 985], radius=12, fill=(8, 24, 60, int(220 * alpha)), outline=(30, 58, 110, int(180 * alpha)), width=1)
        draw.text((W // 2 - 380, 946), "CHOOSE 100% ON-PREMISES SOVEREIGNTY OR CLOUD HYBRID FREEDOM", font=load_font(15, bold=True), fill=(251, 191, 36, a_int))

    else:
        # =====================================================================
        # PART 2: CLEAN DARK NAVY BRAND CLIMAX & END SLATE (12.0s - 24.0s)
        # =====================================================================
        fade_in = min(1.0, (t - 12.0) / 1.0)
        a_int = int(255 * fade_in)

        # Radiant Shield / Crest Visual
        crest_cy = 340
        crest_scale = min(1.0, 0.9 + 0.1 * math.sin((t - 12.0) * 0.8))
        cr = int(90 * crest_scale)

        # Golden radiant ring
        for r in range(cr + 30, cr, -5):
            alpha_ring = int(18 * (1.0 - (r - cr) / 30) * fade_in)
            draw.ellipse([cx - r, crest_cy - r, cx + r, crest_cy + r], fill=(241, 105, 6, alpha_ring))

        # Hexagon/Shield Crest
        draw.ellipse([cx - cr, crest_cy - cr, cx + cr, crest_cy + cr], fill=(11, 45, 107, int(240 * fade_in)), outline=(241, 105, 6, a_int), width=4)
        draw.text((cx - 30, crest_cy - 45), "P", font=load_font(72, bold=True), fill=(255, 255, 255, a_int))

        # Brand Headline
        draw.text((cx - 320, 480), "PRATHAMONE EduOS™", font=load_font(48, bold=True), fill=(255, 255, 255, a_int))

        # Primary Tagline
        t1 = "COACHING MANAGEMENT. SIMPLIFIED."
        draw.text((cx - 280, 560), t1, font=load_font(26, bold=True), fill=(241, 105, 6, a_int))

        # Secondary Tagline
        t2 = "Enterprise Power. Everyday Simplicity."
        draw.text((cx - 210, 610), t2, font=load_font(20, bold=False), fill=(251, 191, 36, int(230 * fade_in)))

        # Badges Row
        bx, by = cx - 440, 680
        badges = [
            "ON-PREMISES SOVEREIGNTY",
            "CLOUD & HYBRID MOBILITY",
            "DPDP ACT 2023 COMPLIANT",
            "SINGLE SOURCE OF TRUTH (SSOT)",
        ]
        curr_x = bx
        for b in badges:
            bw = len(b) * 10 + 24
            draw.rounded_rectangle([curr_x, by, curr_x + bw, by + 36], radius=8, fill=(11, 35, 80, int(200 * fade_in)), outline=(56, 189, 248, int(150 * fade_in)), width=1)
            draw.text((curr_x + 12, by + 9), b, font=load_font(12, bold=True), fill=(226, 232, 240, int(230 * fade_in)))
            curr_x += bw + 16

        # Corporate Attribution Footer Container
        draw.rounded_rectangle([cx - 520, 800, cx + 520, 920], radius=16, fill=(7, 24, 60, int(230 * fade_in)), outline=(241, 105, 6, int(160 * fade_in)), width=2)
        draw.text((cx - 240, 825), "Smritisys & AITDL Networks  •  Product Architect: Jawahar R. Mallah", font=load_font(15, bold=True), fill=(203, 213, 225, a_int))
        draw.text((cx - 280, 860), "Client: Prashant Academy Coaching Institute  •  Baseline Version 1.0.0", font=load_font(14, bold=False), fill=(148, 163, 184, int(210 * fade_in)))

    return base.convert("RGB")


def generate_motion_clip():
    fps = 30
    duration_sec = 24.0
    total_frames = int(duration_sec * fps)

    print("=================================================================")
    print(f"  GENERATING CHAPTER 08 MOTION GRAPHIC ({duration_sec}s, {total_frames} frames)")
    print("=================================================================")

    out_container = av.open(str(OUTPUT_FILE), mode="w")
    v_stream = out_container.add_stream("h264", rate=fps)
    v_stream.width = 1920
    v_stream.height = 1080
    v_stream.pix_fmt = "yuv420p"
    v_stream.bit_rate = 8500000
    v_stream.options = {"preset": "fast", "profile": "high"}

    for idx in range(total_frames):
        t = idx / fps
        frame_img = render_deployment_frame(t, duration_sec)
        av_frame = av.VideoFrame.from_image(frame_img)
        for packet in v_stream.encode(av_frame):
            out_container.mux(packet)

        if idx % 90 == 0:
            print(f"  Rendered {idx}/{total_frames} frames ({t:.1f}s)...")

    for packet in v_stream.encode():
        out_container.mux(packet)

    out_container.close()
    print(f"\nGenerated Chapter 08 Motion Master: {OUTPUT_FILE} ({OUTPUT_FILE.stat().st_size} bytes)")


if __name__ == "__main__":
    generate_motion_clip()
