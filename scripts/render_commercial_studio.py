# /**
#  * @file        render_commercial_studio.py
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
#  * @description Declarative studio commercial compositor ingesting project manifest, events JSON, studio bezel framing, PiP presenter overlays, and master multi-track audio.
#  */

import os
import sys
import json
import wave
import shutil
import subprocess
from pathlib import Path
import av
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

PROJECT_FILE = Path("commercial_project.json") if Path("commercial_project.json").exists() else Path("data/commercial/commercial_project_master.json")
EVENTS_FILE = Path("assets/captures/kiosk_demo_events.json") if Path("assets/captures/kiosk_demo_events.json").exists() else Path("data/commercial/kiosk_demo_events.json")
OUTPUT_VIDEO = Path("frontend/public/media/commercial/prathamone_commercial_master_1080p.mp4")
DOCS_ASSETS_DIR = Path("docs/assets/commercial")
OUTPUT_VIDEO.parent.mkdir(parents=True, exist_ok=True)
DOCS_ASSETS_DIR.mkdir(parents=True, exist_ok=True)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """Loads crisp Segoe UI typography with cross-platform fallbacks."""
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def decode_trimmed_clip(
    video_path: str,
    target_size: tuple[int, int] = (1920, 1080),
    start_sec: float = 0.0,
    max_frames: int = None,
    crop_box: tuple[int, int, int, int] | None = None,
) -> list[Image.Image]:
    """Decodes video frames starting from start_sec up to max_frames, optionally applying crop_box and suppressing pure-white loading flashes."""
    if not Path(video_path).exists():
        print(f"Warning: video file {video_path} not found. Using dark background placeholder.")
        dummy = Image.new("RGB", target_size, (11, 45, 107))
        return [dummy] * (max_frames or 30)

    container = av.open(video_path)
    stream = container.streams.video[0]
    stream.thread_type = "AUTO"

    seek_pts = int(start_sec / float(stream.time_base))
    try:
        container.seek(seek_pts, stream=stream)
    except Exception:
        pass

    frames = []
    last_valid_frame = None

    for frame in container.decode(stream):
        t = float(frame.pts * frame.time_base) if frame.pts is not None else 0
        if t < start_sec:
            continue

        img = frame.to_image().convert("RGB")

        # Suppress blank white loading flashes (mean brightness > 253.5)
        arr = np.array(img)
        if arr.mean() > 253.5 and last_valid_frame is not None:
            img = last_valid_frame.copy()
        else:
            if arr.mean() <= 253.5:
                last_valid_frame = img.copy()

        # Apply browser chrome crop if specified
        if crop_box:
            img = img.crop(crop_box)

        if img.size != target_size:
            img = img.resize(target_size, Image.Resampling.LANCZOS)

        frames.append(img)
        if max_frames and len(frames) >= max_frames:
            break

    container.close()

    if not frames:
        frames.append(Image.new("RGB", target_size, (11, 45, 107)))

    while max_frames and len(frames) < max_frames:
        frames.append(frames[-1])

    return frames


_BEZEL_CACHE = {}


def get_bezel_assets(scale: float = 0.88):
    """Caches pre-blurred backdrop, rounded mask, and glowing bezel border for ultra-fast compositing."""
    if scale in _BEZEL_CACHE:
        return _BEZEL_CACHE[scale]
    W, H = 1920, 1080
    new_w, new_h = int(W * scale), int(H * scale)
    x_off, y_off = (W - new_w) // 2, (H - new_h) // 2

    studio_bg = Image.new("RGB", (W, H), (12, 32, 72))
    canvas_bg = studio_bg.filter(ImageFilter.GaussianBlur(radius=24)).convert("RGBA")
    dark_tint = Image.new("RGBA", (W, H), (5, 21, 53, 190))
    canvas_bg = Image.alpha_composite(canvas_bg, dark_tint)

    mask = Image.new("L", (new_w, new_h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, new_w, new_h], radius=24, fill=255)

    border_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(border_layer).rounded_rectangle(
        [x_off - 3, y_off - 3, x_off + new_w + 3, y_off + new_h + 3],
        radius=26,
        outline=(241, 105, 6, 180),
        width=3,
    )
    canvas_base = Image.alpha_composite(canvas_bg, border_layer)

    _BEZEL_CACHE[scale] = (canvas_base, mask, (new_w, new_h), (x_off, y_off))
    return _BEZEL_CACHE[scale]


def apply_studio_bezel(ui_img: Image.Image, bg_img: Image.Image, scale: float = 0.88) -> Image.Image:
    """Places 1080p software capture inside a rounded dark-glass bezel over blurred studio backdrop."""
    canvas_base, mask, (new_w, new_h), (x_off, y_off) = get_bezel_assets(scale)
    scaled_ui = ui_img.resize((new_w, new_h), Image.Resampling.BILINEAR).convert("RGBA")
    canvas = canvas_base.copy()
    canvas.paste(scaled_ui, (x_off, y_off), mask)
    return canvas.convert("RGB")


def draw_callout_badge(canvas: Image.Image, title: str, subtitle: str, alpha: float, pos: tuple = None) -> Image.Image:
    """Renders a crisp, broadcast-grade floating callout card with Segoe UI typography."""
    if alpha <= 0.01:
        return canvas
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    box_w, box_h = 660, 96
    x0, y0 = pos if pos else (120, 890)
    a_bg = int(235 * alpha)
    a_fg = int(255 * alpha)

    # Soft drop shadow
    draw.rounded_rectangle([x0 + 4, y0 + 6, x0 + box_w + 4, y0 + box_h + 6], radius=16, fill=(0, 0, 0, int(120 * alpha)))

    # Main card container
    draw.rounded_rectangle([x0, y0, x0 + box_w, y0 + box_h], radius=16, fill=(8, 24, 56, a_bg), outline=(241, 105, 6, int(200 * alpha)), width=2)
    draw.rounded_rectangle([x0 + 16, y0 + 16, x0 + 24, y0 + box_h - 16], radius=4, fill=(241, 105, 6, a_fg))

    font_title = load_font(22, bold=True)
    font_sub = load_font(16, bold=False)

    draw.text((x0 + 36, y0 + 16), title, font=font_title, fill=(255, 255, 255, a_fg))
    draw.text((x0 + 36, y0 + 52), subtitle, font=font_sub, fill=(203, 213, 225, int(235 * alpha)))
    return Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB")


def draw_lower_third(canvas: Image.Image, name: str, title: str, alpha: float, frame_idx: int) -> Image.Image:
    """Draws corporate lower-third chyron with animated audio waves."""
    if alpha <= 0.01:
        return canvas
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    bx, by, bw, bh = 100, 920, 780, 105
    a_bg = int(230 * alpha)
    a_fg = int(255 * alpha)

    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=16, fill=(11, 45, 107, a_bg), outline=(241, 105, 6, int(180 * alpha)), width=2)
    draw.rounded_rectangle([bx + 14, by + 18, bx + 22, by + bh - 18], radius=4, fill=(241, 105, 6, a_fg))

    draw.text((bx + 38, by + 18), name, font=load_font(28, bold=True), fill=(255, 255, 255, a_fg))
    draw.text((bx + 38, by + 60), title, font=load_font(17, bold=False), fill=(203, 213, 225, int(240 * alpha)))

    # Animated Voice Equalizer
    eq_x, eq_y = bx + bw - 140, by + 52
    for b in range(6):
        bar_h = max(6, int(18 + np.sin(frame_idx * 0.45 + b * 1.2) * 12))
        y0 = eq_y - bar_h // 2
        y1 = max(y0 + 4, eq_y + bar_h // 2)
        b_color = (241, 105, 6, int(240 * alpha)) if b % 2 == 0 else (16, 185, 129, int(240 * alpha))
        draw.rounded_rectangle([eq_x + b * 18, y0, eq_x + b * 18 + 8, y1], radius=3, fill=b_color)

    return Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB")


def draw_watermark(canvas: Image.Image, text: str = "PRATHAMONE EduOS™") -> Image.Image:
    """Subtle top-right broadcast watermark."""
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    W, H = canvas.size
    wx, wy = W - 290, 20
    draw.rounded_rectangle([wx, wy, wx + 260, wy + 32], radius=6, fill=(15, 23, 42, 180), outline=(51, 65, 85, 160), width=1)
    draw.ellipse([wx + 14, wy + 11, wx + 24, wy + 21], fill=(239, 68, 68, 255))
    draw.text((wx + 34, wy + 8), text, font=load_font(13, bold=True), fill=(241, 245, 249, 220))
    return Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB")


def draw_closing_tagline(canvas: Image.Image, branding_cfg: dict, alpha: float) -> Image.Image:
    """Renders the official brand closing hero container with full corporate attribution."""
    if alpha <= 0.01:
        return canvas
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    bx, by, bw, bh = 40, 740, 1840, 310
    a_fg = int(255 * alpha)

    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=24, fill=(7, 28, 68, a_fg), outline=(241, 105, 6, a_fg), width=3)

    font_hero_bold = load_font(42, bold=True)
    font_hero_sub = load_font(22, bold=False)
    font_hero_attr = load_font(16, bold=False)

    t1 = branding_cfg.get("primary_tagline", "COACHING MANAGEMENT. SIMPLIFIED.")
    bbox1 = font_hero_bold.getbbox(t1)
    w1 = bbox1[2] - bbox1[0]
    draw.text((bx + (bw - w1) // 2, by + 45), t1, font=font_hero_bold, fill=(255, 255, 255, a_fg))

    t2 = branding_cfg.get("secondary_tagline", "The Power of Enterprise Education. The Simplicity of WhatsApp.")
    bbox2 = font_hero_sub.getbbox(t2)
    w2 = bbox2[2] - bbox2[0]
    draw.text((bx + (bw - w2) // 2, by + 120), t2, font=font_hero_sub, fill=(251, 191, 36, int(240 * alpha)))

    t3 = branding_cfg.get("attribution", "Smritisys & AITDL Networks • Jawahar R. Mallah")
    bbox3 = font_hero_attr.getbbox(t3)
    w3 = bbox3[2] - bbox3[0]
    draw.text((bx + (bw - w3) // 2, by + 185), t3, font=font_hero_attr, fill=(148, 163, 184, int(220 * alpha)))

    return Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB")


def read_wav_samples(wav_path: str):
    """Safely reads a WAV file into a float32 numpy array with shape (samples, 2)."""
    with wave.open(wav_path, "rb") as w:
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


def build_master_audio(project: dict, total_duration: float, out_wav_path: Path):
    """Mixes BGM and scene voice-overs with automatic speech ducking and soft limiter."""
    sample_rate = 48000
    total_samples = int(total_duration * sample_rate)
    master_mix = np.zeros((total_samples, 2), dtype=np.float32)

    audio_cfg = project.get("audio_master", {})
    bgm_path = audio_cfg.get("bgm_track", "assets/audio/bgm_master.wav")
    bgm_gain = audio_cfg.get("bgm_base_gain", 0.85)
    duck_gain = audio_cfg.get("bgm_ducked_gain", 0.12)

    # 1. Load BGM
    if Path(bgm_path).exists():
        _, bgm_arr = read_wav_samples(bgm_path)
        repeats = (total_samples // len(bgm_arr)) + 1
        bgm_full = np.tile(bgm_arr, (repeats, 1))[:total_samples] * bgm_gain
    else:
        bgm_full = np.zeros((total_samples, 2), dtype=np.float32)

    # 2. Build Ducking Envelope & Voice Stems
    envelope = np.ones(total_samples, dtype=np.float32)
    cursor_sec = 0.0

    for scene in project["scenes"]:
        vo_path = scene.get("voiceover")
        sc_dur = scene["duration_sec"]
        if vo_path and Path(vo_path).exists():
            _, vo_arr = read_wav_samples(vo_path)
            start_idx = int(cursor_sec * sample_rate)
            end_idx = min(start_idx + len(vo_arr), total_samples)
            seg_len = end_idx - start_idx
            master_mix[start_idx:end_idx] += vo_arr[:seg_len] * audio_cfg.get("voice_gain", 0.95)
            envelope[start_idx:end_idx] = duck_gain / max(bgm_gain, 1e-5)
        cursor_sec += sc_dur

    # Smooth ducking envelope with moving average window (350ms)
    win = int((audio_cfg.get("ducking_fade_ms", 350) / 1000.0) * sample_rate)
    if win > 1:
        kernel = np.ones(win, dtype=np.float32) / win
        envelope = np.convolve(envelope, kernel, mode="same")

    master_mix += bgm_full * envelope[:, None]

    # Final 1.5s gentle fadeout
    fade_samples = int(1.5 * sample_rate)
    if total_samples > fade_samples:
        fade_ramp = np.linspace(1.0, 0.0, fade_samples, dtype=np.float32)[:, None]
        master_mix[-fade_samples:] *= fade_ramp

    # Soft limiter clamping
    master_mix = np.clip(master_mix, -0.96, 0.96)
    pcm_out = (master_mix * 32767.0).astype(np.int16)

    with wave.open(str(out_wav_path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        w.writeframes(pcm_out.tobytes())

    print(f"Master audio track generated: {out_wav_path} ({out_wav_path.stat().st_size} bytes)")


def render_commercial_studio():
    print("=================================================================")
    print("  PRATHAMONE EduOS — CINEMATIC STUDIO COMMERCIAL COMPOSITOR V2")
    print("=================================================================")

    if not PROJECT_FILE.exists():
        raise FileNotFoundError(f"Project manifest not found at {PROJECT_FILE}")

    project = json.loads(PROJECT_FILE.read_text(encoding="utf-8"))
    meta = project.get("project_meta", {})
    fps = meta.get("fps", 30)
    W, H = meta.get("resolution", [1920, 1080])
    branding = project.get("branding", {})

    events = {}
    if EVENTS_FILE.exists():
        events_data = json.loads(EVENTS_FILE.read_text(encoding="utf-8"))
        events = {e["event"]: e["t"] for e in events_data if "event" in e and "t" in e}
        print(f"Loaded {len(events)} synchronized UI events from {EVENTS_FILE}")

    total_duration = sum(s["duration_sec"] for s in project["scenes"])
    total_frames = int(total_duration * fps)
    print(f"Master Duration: {total_duration:.1f}s | Total Frames: {total_frames} @ {fps} fps")

    temp_audio = Path("data/commercial/_temp_studio_audio.wav")

    # Step 1: Master Audio First with Dynamic Speech Ducking
    print("\nMastering multi-track audio with dynamic speech ducking...")
    build_master_audio(project, total_duration, temp_audio)

    # Step 2: Open Broadcast Container Directly with Video & Audio Streams
    print("\nInitializing broadcast container with H.264 (8.5Mbps) and AAC (192kbps) streams...")
    out_container = av.open(str(OUTPUT_VIDEO), mode="w")
    v_stream = out_container.add_stream("h264", rate=fps)
    v_stream.width = W
    v_stream.height = H
    v_stream.pix_fmt = "yuv420p"
    v_stream.bit_rate = 8500000
    v_stream.options = {"preset": "fast", "profile": "high"}

    a_stream = out_container.add_stream("aac", rate=48000)
    a_stream.layout = "stereo"
    a_stream.bit_rate = 192000

    studio_bg = Image.new("RGB", (W, H), (12, 32, 72))
    global_frame_idx = 0
    prev_scene_last_frame = None

    for scene_idx, scene in enumerate(project["scenes"]):
        sc_id = scene["scene_id"]
        sc_dur = scene["duration_sec"]
        n_frames = int(sc_dur * fps)
        print(f"\nCompositing Scene [{scene_idx + 1}/{len(project['scenes'])}] - {sc_id} ({sc_dur}s, {n_frames} frames)...")

        # Decode source video frames with optional crop and white-flash suppression
        src_path = scene.get("video_source", "")
        start_sec = scene.get("source_start_sec", 0.0)

        crop_box = None
        if scene.get("apply_crop"):
            crop_box = tuple(meta.get("global_ui_crop", {}).get("crop_box", [0, 86, 1920, 1040]))

        src_frames = decode_trimmed_clip(
            src_path,
            (W, H),
            start_sec=start_sec,
            max_frames=n_frames,
            crop_box=crop_box,
        )

        # Decode PiP presenter frames if enabled
        pip_cfg = scene.get("presenter_pip", {})
        pip_frames = []
        if pip_cfg.get("enabled"):
            pip_path = pip_cfg.get("video_source", "")
            pip_start = pip_cfg.get("source_start_sec", 0.0)
            pip_frames = decode_trimmed_clip(pip_path, (360, 360), start_sec=pip_start, max_frames=n_frames)

        for f_idx in range(n_frames):
            t_local = f_idx / fps
            raw_img = src_frames[min(f_idx, len(src_frames) - 1)]

            # 1. Bezel framing or Fullscreen
            if scene.get("device_frame"):
                canvas = apply_studio_bezel(raw_img, studio_bg, scale=scene.get("device_scale", 0.88))
            else:
                canvas = raw_img.copy()

            # 2. Smooth cross-dissolve transition from previous scene (first 8 frames / 0.27s)
            if scene_idx > 0 and f_idx < 8 and prev_scene_last_frame is not None:
                blend_alpha = f_idx / 8.0
                canvas = Image.blend(prev_scene_last_frame, canvas, blend_alpha)

            # 3. Presenter PiP Overlay
            if pip_cfg.get("enabled") and pip_cfg.get("start_sec", 0) <= t_local <= pip_cfg.get("end_sec", sc_dur):
                if pip_frames:
                    pip_img = pip_frames[min(f_idx, len(pip_frames) - 1)].convert("RGBA")
                    pip_w, pip_h = 360, 360
                    mask = Image.new("L", (pip_w, pip_h), 0)
                    ImageDraw.Draw(mask).rounded_rectangle([0, 0, pip_w, pip_h], radius=36, fill=255)

                    pip_canvas = canvas.convert("RGBA")
                    pos_x = W - pip_w - 60
                    pos_y = H - pip_h - 60

                    # Glowing border for PiP
                    border_pip = Image.new("RGBA", (W, H), (0, 0, 0, 0))
                    ImageDraw.Draw(border_pip).rounded_rectangle(
                        [pos_x - 3, pos_y - 3, pos_x + pip_w + 3, pos_y + pip_h + 3],
                        radius=38,
                        outline=(241, 105, 6, 220),
                        width=3,
                    )
                    pip_canvas = Image.alpha_composite(pip_canvas, border_pip)
                    pip_canvas.paste(pip_img, (pos_x, pos_y), mask)
                    canvas = pip_canvas.convert("RGB")

            # 4. Lower Third Chyron
            lower_third_cfg = scene.get("lower_third", {})
            if lower_third_cfg.get("enabled"):
                lt_start = lower_third_cfg.get("fade_in_time", 0.5)
                lt_end = lower_third_cfg.get("fade_out_time", sc_dur - 0.5)
                if lt_start <= t_local <= lt_end:
                    fade = min((t_local - lt_start) / 0.4, (lt_end - t_local) / 0.4, 1.0)
                    canvas = draw_lower_third(
                        canvas,
                        lower_third_cfg.get("name", "PRIYA SHARMA"),
                        lower_third_cfg.get("title", "Solutions Specialist  •  PrathamOne EduOS"),
                        max(0.0, fade),
                        global_frame_idx,
                    )

            # 5. Synchronized Callout Badges
            for c in scene.get("callouts", []):
                start_t = events.get(c.get("sync_event", ""), c.get("start_sec", 0.0))
                end_t = c.get("end_sec", sc_dur)
                if start_t <= t_local <= end_t:
                    fade = min((t_local - start_t) / 0.35, (end_t - t_local) / 0.35, 1.0)
                    pos = (c["position"]["x"], c["position"]["y"]) if "position" in c else (120, 890)
                    canvas = draw_callout_badge(canvas, c["title"], c["subtitle"], max(0.0, fade), pos=pos)

            # 6. Closing Tagline Banner (Only if explicitly enabled)
            if scene.get("is_closing"):
                fade = min(1.0, t_local * 1.5)
                canvas = draw_closing_tagline(canvas, branding, fade)

            # 7. Top Watermark
            wm = meta.get("watermark", {})
            if wm.get("enabled", True):
                canvas = draw_watermark(canvas, text=wm.get("text", "PRATHAMONE EduOS™"))

            # Save last frame of scene for smooth cross-dissolve into next scene
            if f_idx == n_frames - 1:
                prev_scene_last_frame = canvas.copy()

            # Encode frame directly into final container
            av_frame = av.VideoFrame.from_image(canvas)
            for packet in v_stream.encode(av_frame):
                out_container.mux(packet)

            global_frame_idx += 1
            if global_frame_idx % 90 == 0:
                print(f"  Rendered {global_frame_idx}/{total_frames} frames ({global_frame_idx / fps:.1f}s)...")
                sys.stdout.flush()

    # Flush video packets
    for packet in v_stream.encode():
        out_container.mux(packet)

    # Step 3: Encode and Mux Master Audio Stream
    print("\nMuxing 48kHz master audio track into container...")
    raw_a_in = av.open(str(temp_audio))
    raw_a_stream = raw_a_in.streams.audio[0]
    for frame in raw_a_in.decode(raw_a_stream):
        for packet in a_stream.encode(frame):
            out_container.mux(packet)
    for packet in a_stream.encode():
        out_container.mux(packet)
    raw_a_in.close()

    out_container.close()

    # Mirror to docs assets
    docs_mirror = DOCS_ASSETS_DIR / "prathamone_commercial_master_1080p.mp4"
    shutil.copy2(OUTPUT_VIDEO, docs_mirror)

    # Clean temporary intermediate audio file
    if temp_audio.exists():
        temp_audio.unlink()

    print("\n=================================================================")
    print("  COMMERCIAL STUDIO RENDERING FINISHED SUCCESSFULLY!")
    print(f"  Master Target : {OUTPUT_VIDEO} ({OUTPUT_VIDEO.stat().st_size} bytes)")
    print(f"  Docs Mirror   : {docs_mirror}")
    print("=================================================================")


if __name__ == "__main__":
    render_commercial_studio()
