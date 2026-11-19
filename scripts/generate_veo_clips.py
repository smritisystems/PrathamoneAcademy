# /**
#  * @file        generate_veo_clips.py
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
#  * @description Automated generation and export orchestrator for Google Veo 2 / Google Flow cinematic commercial video assets with procedural fallback rendering.
#  */

import os
import sys
import time
import json
import math
import argparse
import subprocess
from pathlib import Path
import av
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUTPUT_DIR = Path("assets/flow_exports")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Scene shot catalog matching google_flow_prompts.md and commercial_project.json
SHOTS_CATALOG = {
    "01": {
        "shot_id": "01_opening",
        "filename": "flow_01_corridor_presenter.mp4",
        "duration_sec": 8.0,
        "name": "Corridor Presenter Walking Shot",
        "prompt": (
            "Medium tracking shot of a confident Indian corporate woman in smart blazer "
            "walking through a modern, sunlit coaching academy glass corridor, smiling warmly "
            "and speaking naturally toward camera, shallow depth of field, cinematic studio lighting, 16:9"
        ),
        "negative_prompt": "cartoon, 3D animated CGI, plastic artificial skin, extra limbs, deformed fingers, warped face, low resolution, motion blur blurriness, jitter, watermark, text, logos, oversaturated colors",
    },
    "02": {
        "shot_id": "02_intro",
        "filename": "flow_02_studio_intro.mp4",
        "duration_sec": 8.0,
        "name": "Studio Keynote Intro Beside 85-inch Display",
        "prompt": (
            "Medium close-up of the same Indian female presenter standing beside a sleek "
            "frameless 85-inch studio display in a dark navy modern tech studio, natural hand "
            "gestures, speaking directly to camera, soft rim lighting"
        ),
        "negative_prompt": "distorted face, bad eyes, uncanny valley, exaggerated mouth movements, weird hands, six fingers, text on screen, floating alphabets, flickering lights, noisy background",
    },
    "06": {
        "shot_id": "06_deployment",
        "filename": "flow_06_onprem_cloud_3d.mp4",
        "duration_sec": 8.0,
        "name": "3D On-Premises Server to Cloud Sync Motion",
        "prompt": (
            "Sleek 3D architectural motion graphics in deep Prussian Navy (#051535) and "
            "glowing brand orange (#F16906) light streaks, showing a secure local campus server "
            "rack seamlessly syncing via encrypted golden data arcs to a modern cloud network, "
            "clean enterprise commercial aesthetic, no text"
        ),
        "negative_prompt": "text, letters, words, messy cables, 2D vector art, cheap cartoon, gaming neon RGB, blurry textures, pixelation, low poly artifacts",
    },
    "08": {
        "shot_id": "08_closing",
        "filename": "flow_08_brand_crest_reveal.mp4",
        "duration_sec": 8.0,
        "name": "3D Particle Convergence Brand Shield Climax",
        "prompt": (
            "High-impact 3D particle convergence of glowing gold and electric blue light ribbons "
            "swirling into a centered dark-navy shield emblem space, dramatic studio volumetric "
            "lighting, 16:9 television commercial outro background, no text"
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


def get_gcloud_token() -> str:
    """Attempts to retrieve an OAuth2 access token via gcloud CLI."""
    try:
        res = subprocess.run(
            ["gcloud", "auth", "print-access-token"],
            capture_output=True,
            text=True,
            check=True,
        )
        return res.stdout.strip()
    except Exception:
        return ""


def call_vertex_veo_api(shot_cfg: dict, out_path: Path, project_id: str, location: str = "us-central1") -> bool:
    """Submits a video generation request to Google Cloud Vertex AI Veo 2 API."""
    token = get_gcloud_token()
    if not token:
        print("  [Error] No Google Cloud access token found. Run 'gcloud auth application-default login' first.")
        return False

    url = f"https://{location}-aiplatform.googleapis.com/v1/projects/{project_id}/locations/{location}/publishers/google/models/veo-2.0-generate-001:predictLongRunning"
    payload = {
        "instances": [
            {
                "prompt": shot_cfg["prompt"],
                "aspectRatio": "16:9",
                "durationSeconds": int(shot_cfg["duration_sec"]),
                "personGeneration": "ALLOW_ADULT",
            }
        ],
        "parameters": {
            "sampleCount": 1,
            "negativePrompt": shot_cfg.get("negative_prompt", ""),
        },
    }

    import urllib.request
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        print(f"  [Veo API] Submitting generation job for {shot_cfg['filename']}...")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            op_name = data.get("name")
            print(f"  [Veo API] Operation initiated: {op_name}")
            print(f"  [Veo API] Polling generation status...")
            # Polling loop
            poll_url = f"https://{location}-aiplatform.googleapis.com/v1/{op_name}"
            for _ in range(60):
                time.sleep(10)
                poll_req = urllib.request.Request(
                    poll_url,
                    headers={"Authorization": f"Bearer {token}"},
                )
                with urllib.request.urlopen(poll_req) as poll_resp:
                    poll_data = json.loads(poll_resp.read().decode("utf-8"))
                    if poll_data.get("done"):
                        if "response" in poll_data:
                            videos = poll_data["response"].get("generatedVideos", [])
                            if videos and "videoUri" in videos[0]:
                                gcs_uri = videos[0]["videoUri"]
                                print(f"  [Veo API] Video completed at GCS: {gcs_uri}")
                                subprocess.run(["gcloud", "storage", "cp", gcs_uri, str(out_path)], check=True)
                                print(f"  [Veo API] Saved to {out_path}")
                                return True
                        print(f"  [Veo API Error] Generation returned: {poll_data}")
                        return False
            print("  [Veo API Timeout] Operation exceeded polling threshold.")
            return False
    except Exception as e:
        print(f"  [Veo API Exception] {e}")
        return False


def render_procedural_clip(shot_key: str, out_path: Path, fps: int = 30, duration_sec: float = 8.0):
    """Renders a broadcast-grade 1080p procedural simulation video matching the prompt specifications."""
    W, H = 1920, 1080
    n_frames = int(duration_sec * fps)
    print(f"  [Procedural Render] Generating 1080p asset '{out_path.name}' ({duration_sec}s, {n_frames} frames)...")

    container = av.open(str(out_path), mode="w")
    stream = container.add_stream("h264", rate=fps)
    stream.width = W
    stream.height = H
    stream.pix_fmt = "yuv420p"
    stream.bit_rate = 8500000
    stream.options = {"preset": "fast", "profile": "high"}

    # Base colors
    navy_dark = (5, 21, 53)
    navy_prussian = (11, 45, 107)
    orange_brand = (241, 105, 6)
    amber_gold = (251, 191, 36)
    emerald_green = (16, 185, 129)
    cyan_bright = (56, 189, 248)

    # Pre-generate particles for shot 08
    np.random.seed(42)
    n_particles = 240
    p_angles = np.random.uniform(0, 2 * math.pi, n_particles)
    p_radii = np.random.uniform(150, 900, n_particles)
    p_speeds = np.random.uniform(0.6, 2.2, n_particles)
    p_sizes = np.random.uniform(2, 6, n_particles)
    p_colors = [orange_brand if i % 2 == 0 else amber_gold if i % 3 == 0 else cyan_bright for i in range(n_particles)]

    for f in range(n_frames):
        t = f / fps
        img = Image.new("RGBA", (W, H), (*navy_dark, 255))
        draw = ImageDraw.Draw(img)

        if shot_key == "01":
            # -------------------------------------------------------------
            # Shot 01: Modern sunlit coaching academy corridor walking shot
            # -------------------------------------------------------------
            # Vanishing perspective lines
            cx, cy = W // 2, H // 2 - 40
            for i in range(-5, 6):
                x_base = W // 2 + i * 220
                draw.line([(cx, cy), (x_base, H)], fill=(20, 55, 120, 80), width=2)
                draw.line([(cx, cy), (x_base, 0)], fill=(20, 55, 120, 40), width=1)

            # Warm sunlit floor reflection streaks
            sun_offset = int((t * 40) % 200)
            for s in range(0, W, 180):
                draw.polygon([(s + sun_offset, H), (s + sun_offset + 90, H), (cx + (s - W//2)//4, cy + 220), (cx + (s - W//2)//4 - 20, cy + 220)], fill=(255, 240, 200, 25))

            # Glass wall partitions on left and right
            for gx in [260, 480, W - 480, W - 260]:
                draw.line([(gx, 0), (gx, H)], fill=(56, 189, 248, 60), width=2)
                draw.polygon([(gx, 120), (gx + 80, 160), (gx + 80, H - 180), (gx, H - 140)], fill=(11, 45, 107, 30))

            # Presenter representation (smooth walking scale & subtle bob)
            walk_scale = 1.0 + (t / duration_sec) * 0.18
            bob = math.sin(t * 8.0) * 6
            pw = int(320 * walk_scale)
            ph = int(580 * walk_scale)
            px = W // 2 - pw // 2
            py = int(H - ph - 60 + bob)

            # Shadow on floor
            draw.ellipse([px + 20, H - 75, px + pw - 20, H - 35], fill=(0, 0, 0, 110))

            # Navy tailored blazer silhouette with warm rim lighting
            draw.rounded_rectangle([px + 40, py + 150, px + pw - 40, py + ph], radius=32, fill=(8, 30, 75, 240), outline=(241, 105, 6, 140), width=2)
            # Crisp white inner blouse
            draw.polygon([(px + pw//2 - 25, py + 150), (px + pw//2 + 25, py + 150), (px + pw//2, py + 260)], fill=(245, 248, 255, 240))
            # Head / neck with natural skin tone
            draw.ellipse([px + pw//2 - 50, py + 30, px + pw//2 + 50, py + 145], fill=(215, 165, 130, 255))
            # Professional styled hair
            draw.ellipse([px + pw//2 - 56, py + 22, px + pw//2 + 56, py + 105], fill=(30, 20, 15, 255))
            # Soft warm cinematic rim light
            draw.arc([px + pw//2 - 54, py + 26, px + pw//2 + 54, py + 140], start=210, end=330, fill=(255, 215, 140, 200), width=3)

        elif shot_key == "02":
            # -------------------------------------------------------------
            # Shot 02: Studio Keynote Intro Beside 85-inch Glass Display
            # -------------------------------------------------------------
            # Sleek frameless 85-inch studio display on left
            dx, dy, dw, dh = 180, 140, 840, 680
            # Ambient glow behind display
            draw.rounded_rectangle([dx - 8, dy - 8, dx + dw + 8, dy + dh + 8], radius=24, fill=(11, 45, 107, 70))
            draw.rounded_rectangle([dx, dy, dx + dw, dy + dh], radius=20, fill=(7, 24, 60, 235), outline=(56, 189, 248, 160), width=2)

            # Subtle charts inside screen
            for k in range(5):
                bar_h = int(120 + 80 * math.sin(t * 2.0 + k))
                bx = dx + 80 + k * 140
                draw.rounded_rectangle([bx, dy + dh - 80 - bar_h, bx + 70, dy + dh - 80], radius=8, fill=(241, 105, 6, 180))

            # Presenter standing on right (Medium close-up)
            px, py = 1260, 240
            # Studio backdrop soft gradient
            draw.ellipse([px - 220, py - 120, px + 520, py + 620], fill=(15, 45, 110, 80))

            # Subtle hand gesture motion
            hand_y = int(py + 320 + math.sin(t * 3.0) * 18)
            draw.rounded_rectangle([px - 80, hand_y, px - 20, hand_y + 45], radius=12, fill=(215, 165, 130, 240))

            # Smart tailored blazer
            draw.rounded_rectangle([px, py + 180, px + 440, H], radius=40, fill=(8, 30, 75, 245), outline=(56, 189, 248, 120), width=2)
            # White collar
            draw.polygon([(px + 185, py + 180), (px + 255, py + 180), (px + 220, py + 300)], fill=(245, 248, 255, 240))
            # Head / face
            draw.ellipse([px + 145, py + 25, px + 295, py + 185], fill=(215, 165, 130, 255))
            # Hair
            draw.ellipse([px + 138, py + 15, px + 302, py + 125], fill=(30, 20, 15, 255))
            # Soft studio rim light on shoulder
            draw.line([(px, py + 240), (px + 140, py + 190)], fill=(241, 105, 6, 200), width=3)

        elif shot_key == "06":
            # -------------------------------------------------------------
            # Shot 06: 3D Architectural On-Prem Server to Cloud Sync Motion
            # -------------------------------------------------------------
            # Left: Local Campus Server Rack
            sx, sy, sw, sh = 240, 200, 480, 680
            draw.rounded_rectangle([sx + 8, sy + 10, sx + sw + 8, sy + sh + 10], radius=20, fill=(0, 0, 0, 120))
            draw.rounded_rectangle([sx, sy, sx + sw, sy + sh], radius=20, fill=(10, 32, 74, 240), outline=(56, 189, 248, 180), width=2)

            # Server blades
            for b in range(5):
                by = sy + 40 + b * 120
                draw.rounded_rectangle([sx + 24, by, sx + sw - 24, by + 90], radius=10, fill=(5, 18, 44, 230), outline=(20, 50, 100, 160), width=1)
                # LED blinking
                led_blink = int(140 + 115 * math.sin(t * 6.0 + b))
                draw.ellipse([sx + 50, by + 35, sx + 68, by + 53], fill=(*emerald_green, led_blink))
                draw.ellipse([sx + 80, by + 35, sx + 98, by + 53], fill=(*cyan_bright, 180))

            # Right: Cloud Constellation Network
            cloud_cx, cloud_cy = 1440, 520
            for r in [220, 160, 100]:
                draw.ellipse([cloud_cx - r, cloud_cy - r, cloud_cx + r, cloud_cy + r], outline=(56, 189, 248, 40), width=1)

            # Cloud network nodes
            for n in range(8):
                ang = t * 0.4 + n * (math.pi / 4)
                nx = cloud_cx + int(math.cos(ang) * 180)
                ny = cloud_cy + int(math.sin(ang) * 130)
                draw.line([(cloud_cx, cloud_cy), (nx, ny)], fill=(56, 189, 248, 80), width=1)
                draw.ellipse([nx - 14, ny - 14, nx + 14, ny + 14], fill=(*orange_brand, 210))

            draw.ellipse([cloud_cx - 40, cloud_cy - 40, cloud_cx + 40, cloud_cy + 40], fill=(*cyan_bright, 230))

            # Encrypted golden data arcs moving between on-prem and cloud
            arc_p = (t * 1.5) % 1.0
            p1 = (sx + sw, sy + sh // 2)
            p2 = (cloud_cx - 180, cloud_cy)
            mid = ((p1[0] + p2[0]) // 2, min(p1[1], p2[1]) - 160)
            # Quadratic bezier points
            for step in range(25):
                u = step / 25.0
                bx = (1 - u)**2 * p1[0] + 2 * (1 - u) * u * mid[0] + u**2 * p2[0]
                by = (1 - u)**2 * p1[1] + 2 * (1 - u) * u * mid[1] + u**2 * p2[1]
                draw.ellipse([bx - 3, by - 3, bx + 3, by + 3], fill=(*amber_gold, 130))

            # Active pulsing golden packet
            u_act = arc_p
            act_x = (1 - u_act)**2 * p1[0] + 2 * (1 - u_act) * u_act * mid[0] + u_act**2 * p2[0]
            act_y = (1 - u_act)**2 * p1[1] + 2 * (1 - u_act) * u_act * mid[1] + u_act**2 * p2[1]
            draw.ellipse([act_x - 16, act_y - 16, act_x + 16, act_y + 16], fill=(*orange_brand, 240))
            draw.ellipse([act_x - 8, act_y - 8, act_x + 8, act_y + 8], fill=(255, 255, 255, 255))

        elif shot_key == "08":
            # -------------------------------------------------------------
            # Shot 08: 3D Particle Convergence into Brand Shield Climax
            # -------------------------------------------------------------
            cx, cy = W // 2, H // 2 - 40

            # Central shield emblem space glow
            glow_r = int(180 + 30 * math.sin(t * 3.5))
            for r in range(glow_r, 0, -20):
                alpha = int(35 * (1.0 - r / glow_r))
                draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*navy_prussian, alpha))

            # Centered dark-navy shield emblem silhouette
            sw, sh = 180, 230
            shield_poly = [
                (cx - sw // 2, cy - sh // 2),
                (cx + sw // 2, cy - sh // 2),
                (cx + sw // 2, cy + sh // 6),
                (cx, cy + sh // 2),
                (cx - sw // 2, cy + sh // 6),
            ]
            draw.polygon(shield_poly, fill=(8, 28, 68, 220), outline=(*orange_brand, 210))

            # Particles converging toward center
            for i in range(n_particles):
                spd = p_speeds[i]
                # Radius decreases as t progresses, then spirals
                rad = max(40, p_radii[i] - (t * 80 * spd) % p_radii[i])
                ang = p_angles[i] + t * (0.8 * spd)
                pt_x = cx + int(math.cos(ang) * rad * 1.5)
                pt_y = cy + int(math.sin(ang) * rad)
                sz = p_sizes[i]
                clr = p_colors[i]
                draw.ellipse([pt_x - sz, pt_y - sz, pt_x + sz, pt_y + sz], fill=(*clr, 210))
                # Particle motion streak
                streak_x = cx + int(math.cos(ang - 0.08) * (rad + 14) * 1.5)
                streak_y = cy + int(math.sin(ang - 0.08) * (rad + 14))
                draw.line([(pt_x, pt_y), (streak_x, streak_y)], fill=(*clr, 120), width=int(sz))

        # Direct AV Frame Encoding
        av_frame = av.VideoFrame.from_image(img.convert("RGB"))
        for packet in stream.encode(av_frame):
            container.mux(packet)

    # Flush encoder
    for packet in stream.encode():
        container.mux(packet)
    container.close()
    print(f"  [Procedural Render] Successfully written: {out_path} ({out_path.stat().st_size} bytes)")


def main():
    parser = argparse.ArgumentParser(description="PrathamOne EduOS — Google Flow & Veo Video Asset Generator")
    parser.add_argument("--all", action="store_true", help="Generate all 4 cinematic clips")
    parser.add_argument("--scene", type=str, choices=["01", "02", "06", "08"], help="Generate a specific scene clip")
    parser.add_argument("--dry-run", action="store_true", help="Print prompt payloads and configuration without generating")
    parser.add_argument("--list", action="store_true", help="List available shot definitions")
    parser.add_argument("--mock", action="store_true", help="Render procedural 1080p simulation clips for immediate pipeline testing")
    parser.add_argument("--project-id", type=str, default=os.getenv("VERTEX_PROJECT_ID", os.getenv("GOOGLE_CLOUD_PROJECT", "")), help="GCP Project ID for Vertex AI")
    parser.add_argument("--location", type=str, default=os.getenv("VERTEX_LOCATION", "us-central1"), help="Vertex AI Region")
    args = parser.parse_args()

    print("=================================================================")
    print("  PRATHAMONE EduOS — GOOGLE FLOW & VEO 2 COMMERCIAL ORCHESTRATOR")
    print("=================================================================")

    if args.list or (not args.all and not args.scene and not args.mock and not args.dry_run):
        print("\nAvailable Commercial Shots:")
        for key, sc in SHOTS_CATALOG.items():
            print(f"  Key [{key}] -> {sc['filename']} ({sc['name']})")
            print(f"          Target Duration: {sc['duration_sec']}s")
            print(f"          Prompt: {sc['prompt'][:85]}...\n")
        if not args.dry_run and not args.mock:
            print("Usage Examples:")
            print("  python scripts/generate_veo_clips.py --mock         # Procedurally renders all 4 test clips")
            print("  python scripts/generate_veo_clips.py --dry-run      # Inspect API payload parameters")
            print("  python scripts/generate_veo_clips.py --all          # Ingests/generates via Cloud Veo API")
            return

    target_keys = (
        [args.scene]
        if args.scene
        else list(SHOTS_CATALOG.keys())
    )

    if args.dry_run:
        print("\n[DRY RUN] Inspection of Generation Payloads:")
        for k in target_keys:
            sc = SHOTS_CATALOG[k]
            print(f"\n--- Scene {k}: {sc['filename']} ---")
            print(f"Target Output : {OUTPUT_DIR / sc['filename']}")
            print(f"Aspect Ratio  : 16:9 Widescreen (1920x1080)")
            print(f"Duration      : {sc['duration_sec']}s")
            print(f"Prompt        : {sc['prompt']}")
            print(f"Negative      : {sc['negative_prompt']}")
        return

    if args.mock:
        print("\n[MOCK MODE] Rendering high-fidelity procedural test assets into assets/flow_exports/...")
        for k in target_keys:
            sc = SHOTS_CATALOG[k]
            out_file = OUTPUT_DIR / sc["filename"]
            render_procedural_clip(k, out_file, fps=30, duration_sec=sc["duration_sec"])
        print("\nAll mock Flow clips rendered successfully!")
        return

    # Real Veo API generation
    if not args.project_id:
        print("\n[Notice] No GCP Project ID specified. To call Vertex AI Veo API, provide --project-id <ID> or set VERTEX_PROJECT_ID.")
        print("To generate high-quality procedural test clips immediately, use: python scripts/generate_veo_clips.py --mock")
        print("Or copy the ready-to-paste prompts from 'google_flow_prompts.md' into https://labs.google/fx/tools/flow.")
        return

    for k in target_keys:
        sc = SHOTS_CATALOG[k]
        out_file = OUTPUT_DIR / sc["filename"]
        print(f"\nProcessing Scene [{k}]: {sc['filename']}...")
        success = call_vertex_veo_api(sc, out_file, project_id=args.project_id, location=args.location)
        if not success:
            print(f"  Falling back to procedural simulation for {sc['filename']}...")
            render_procedural_clip(k, out_file, fps=30, duration_sec=sc["duration_sec"])


if __name__ == "__main__":
    main()
