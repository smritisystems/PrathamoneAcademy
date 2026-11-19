# /**
#  * @file        render_synced_commercial.py
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
#  * @description Composites timeline-aligned voiceovers, optional ducked background music, and branded module badges onto the Playwright demo recording.
#  */

import argparse
import json
import math
import shutil
import subprocess
import tempfile
import wave
from array import array
from pathlib import Path
from typing import Any

import av
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent
TIMELINE_FILE = ROOT / "assets" / "captures" / "synced_timeline.json"
MANIFEST_FILE = ROOT / "assets" / "audio" / "modules" / "audio_manifest.json"
OFFICIAL_LOGO = ROOT / "frontend" / "public" / "artwork" / "18112026" / "LOGO.PNG"
OUTPUT_VIDEO = ROOT / "assets" / "captures" / "prathamone_synced_20modules_1080p.mp4"
DEFAULT_MUSIC = ROOT / "assets" / "audio" / "bgm_master.wav"
FRAME_SIZE = (1920, 1080)
FRAME_RATE = 30
AUDIO_RATE = 48000
BADGE_SIZE = (960, 156)


def ffmpeg_binary() -> str:
    binary = shutil.which("ffmpeg")
    if binary:
        return binary
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError as exc:
        raise RuntimeError("FFmpeg is required; install ffmpeg or imageio-ffmpeg") from exc


def load_timeline() -> tuple[dict[str, Any], list[dict[str, Any]]]:
    timeline = json.loads(TIMELINE_FILE.read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST_FILE.read_text(encoding="utf-8"))
    manifest_by_id = {item["module_id"]: item for item in manifest}
    modules = timeline.get("modules")
    if not isinstance(modules, list) or len(modules) != 20:
        raise ValueError(f"{TIMELINE_FILE} must contain exactly twenty timeline entries")

    previous_end = -1.0
    seen: set[str] = set()
    for module in modules:
        module_id = module.get("module_id")
        if module_id not in manifest_by_id or module_id in seen:
            raise ValueError(f"Unknown or duplicate module in timeline: {module_id!r}")
        seen.add(module_id)
        start = float(module["start_sec"])
        end = float(module["end_sec"])
        if start < 0 or end <= start or start < previous_end:
            raise ValueError(f"Invalid or overlapping timeline interval for {module_id}")
        expected = float(manifest_by_id[module_id]["duration_sec"])
        if abs((end - start) - expected) > 0.001:
            raise ValueError(
                f"Timeline duration for {module_id} ({end - start:.6f}s) "
                f"does not match WAV manifest ({expected:.6f}s)"
            )
        wav_path = (ROOT / manifest_by_id[module_id]["wav_path"]).resolve()
        if not wav_path.is_relative_to(ROOT) or not wav_path.is_file():
            raise FileNotFoundError(f"Missing or out-of-project WAV for {module_id}: {wav_path}")
        with wave.open(str(wav_path), "rb") as wav_file:
            measured_duration = wav_file.getnframes() / wav_file.getframerate()
        if abs(measured_duration - expected) > 1 / AUDIO_RATE:
            raise ValueError(f"WAV duration changed after manifest generation: {module_id}")
        module["absolute_wav_path"] = wav_path
        previous_end = end

    if len(seen) != len(manifest_by_id):
        raise ValueError("Timeline and audio manifest do not contain the same module IDs")
    return timeline, modules


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    ]
    for candidate in candidates:
        if candidate.is_file():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def make_badge(module: dict[str, Any], logo_path: Path, destination: Path) -> None:
    badge = Image.new("RGBA", BADGE_SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(badge)
    draw.rounded_rectangle((0, 0, BADGE_SIZE[0] - 1, BADGE_SIZE[1] - 1), radius=22, fill=(8, 24, 56, 238))
    draw.rounded_rectangle((0, 0, 14, BADGE_SIZE[1] - 1), radius=7, fill=(241, 105, 6, 255))
    draw.rectangle((8, 0, 15, BADGE_SIZE[1] - 1), fill=(241, 105, 6, 255))
    draw.text((42, 30), module["badge_title"], font=load_font(34, bold=True), fill=(255, 255, 255, 255))
    draw.text((42, 88), module["badge_subtitle"], font=load_font(24), fill=(214, 225, 245, 255))

    with Image.open(logo_path) as source:
        logo = source.convert("RGBA")
    logo.thumbnail((260, 100), Image.Resampling.LANCZOS)
    pixels = logo.load()
    for y in range(logo.height):
        for x in range(logo.width):
            red, green, blue, alpha = pixels[x, y]
            if red < 18 and 20 <= green <= 48 and 65 <= blue <= 110:
                pixels[x, y] = (red, green, blue, 0)
    badge.alpha_composite(logo, (BADGE_SIZE[0] - logo.width - 36, (BADGE_SIZE[1] - logo.height) // 2))
    badge.save(destination)


def video_duration(path: Path) -> float:
    with av.open(str(path)) as container:
        stream = container.streams.video[0]
        if stream.duration is not None:
            return float(stream.duration * stream.time_base)
        if container.duration is not None:
            return float(container.duration / av.time_base)
    raise ValueError(f"Could not determine video duration: {path}")


def build_ffmpeg_command(
    video_path: Path,
    output_path: Path,
    modules: list[dict[str, Any]],
    badge_paths: list[Path],
    duration: float,
    music_path: Path | None,
) -> list[str]:
    command = [ffmpeg_binary(), "-hide_banner", "-loglevel", "error", "-y", "-i", str(video_path)]
    badge_inputs = []
    for badge in badge_paths:
        command.extend(["-loop", "1", "-framerate", str(FRAME_RATE), "-i", str(badge)])
        badge_inputs.append(len(badge_inputs) + 1)

    voice_inputs = []
    for module in modules:
        command.extend(["-i", str(module["absolute_wav_path"])])
        voice_inputs.append(1 + len(badge_paths) + len(voice_inputs))

    music_input = None
    if music_path:
        command.extend(["-stream_loop", "-1", "-i", str(music_path)])
        music_input = 1 + len(badge_paths) + len(voice_inputs)

    filters = [
        f"[0:v]fps={FRAME_RATE},scale={FRAME_SIZE[0]}:{FRAME_SIZE[1]}:"
        "force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[vbase]"
    ]
    video_label = "vbase"
    for index, (module, image_input) in enumerate(zip(modules, badge_inputs)):
        next_label = f"v{index + 1}"
        start = float(module["start_sec"])
        end = float(module["end_sec"])
        filters.append(
            f"[{video_label}][{image_input}:v]overlay=x=64:y=64:eof_action=pass:"
            f"enable='gte(t,{start:.6f})*lt(t,{end:.6f})'[{next_label}]"
        )
        video_label = next_label
    filters.append(f"[{video_label}]null[vout]")

    for index, (module, audio_input) in enumerate(zip(modules, voice_inputs)):
        delay_samples = round(float(module["start_sec"]) * AUDIO_RATE)
        filters.append(
            f"[{audio_input}:a]aresample={AUDIO_RATE},aformat=sample_fmts=fltp:"
            f"sample_rates={AUDIO_RATE}:channel_layouts=stereo,adelay=delays={delay_samples}S:all=1[vo{index}]"
        )
    voices = "".join(f"[vo{index}]" for index in range(len(modules)))
    filters.append(
        f"{voices}amix=inputs={len(modules)}:duration=longest:dropout_transition=0:normalize=0[voice_mix]"
    )

    if music_input is not None:
        active_intervals = "+".join(
            f"gte(t\\,{float(module['start_sec']):.6f})*lt(t\\,{float(module['end_sec']):.6f})"
            for module in modules
        )
        filters.append(
            f"[{music_input}:a]aresample={AUDIO_RATE},volume='if({active_intervals},0.12,0.85)':"
            "eval=frame,apad[bgm]"
        )
        filters.append("[voice_mix][bgm]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0[aout]")
    else:
        filters.append("[voice_mix]anull[aout]")

    command.extend(
        [
            "-filter_complex",
            ";".join(filters),
            "-map",
            "[vout]",
            "-map",
            "[aout]",
            "-t",
            f"{duration:.6f}",
            "-r",
            str(FRAME_RATE),
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-ar",
            str(AUDIO_RATE),
            "-movflags",
            "+faststart",
            str(output_path),
        ]
    )
    return command


def check_audio_at(path: Path, timestamp: float) -> float:
    result = subprocess.run(
        [
            ffmpeg_binary(),
            "-hide_banner",
            "-loglevel",
            "error",
            "-ss",
            f"{timestamp:.6f}",
            "-i",
            str(path),
            "-t",
            "0.08",
            "-vn",
            "-ac",
            "2",
            "-ar",
            str(AUDIO_RATE),
            "-f",
            "s16le",
            "pipe:1",
        ],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    samples = array("h")
    samples.frombytes(result.stdout[: len(result.stdout) - len(result.stdout) % 2])
    if not samples:
        return 0.0
    return math.sqrt(sum(sample * sample for sample in samples) / len(samples))


def check_badge_at(path: Path, timestamp: float) -> None:
    with av.open(str(path)) as container:
        stream = container.streams.video[0]
        seek_timestamp = max(0.0, timestamp - 0.2)
        container.seek(int(seek_timestamp / float(stream.time_base)), stream=stream, backward=True)
        for frame in container.decode(stream):
            frame_time = float(frame.pts * frame.time_base) if frame.pts is not None else -1
            if frame_time >= timestamp - 0.04:
                pixel = frame.to_image().convert("RGB").getpixel((70, 164))
                red, green, blue = pixel
                if red < 175 or not 45 <= green <= 165 or blue > 80:
                    raise RuntimeError(f"Orange module badge is not visible at {timestamp:.3f}s: {pixel}")
                return
    raise RuntimeError(f"No decoded video frame found near {timestamp:.3f}s")


def verify_output(path: Path, modules: list[dict[str, Any]], expected_duration: float) -> None:
    with av.open(str(path)) as container:
        if not container.streams.video or not container.streams.audio:
            raise RuntimeError("Rendered MP4 must contain video and audio streams")
        video = container.streams.video[0]
        if (video.codec_context.width, video.codec_context.height) != FRAME_SIZE:
            raise RuntimeError(f"Unexpected output resolution: {video.codec_context.width}x{video.codec_context.height}")
        if float(video.average_rate) != FRAME_RATE:
            raise RuntimeError(f"Unexpected output frame rate: {video.average_rate}")
        actual_duration = video_duration(path)
        if actual_duration + 1 / FRAME_RATE < expected_duration:
            raise RuntimeError(f"Rendered video ends before its last voiceover: {actual_duration:.3f}s")

    for module in modules:
        start = float(module["start_sec"])
        end = float(module["end_sec"])
        visual_sample = (start + end) / 2
        check_badge_at(path, visual_sample)
        audio_samples = (start + (end - start) * part for part in (0.25, 0.5, 0.75))
        if max(check_audio_at(path, sample) for sample in audio_samples) < 70:
            raise RuntimeError(f"No audible voiceover energy found inside the {module['module_id']} interval")


def render(video_path: Path, music_path: Path | None, logo_path: Path, output_path: Path) -> Path:
    timeline, modules = load_timeline()
    if not video_path.is_file():
        raise FileNotFoundError(f"Missing Playwright recording: {video_path}")
    if not logo_path.is_file():
        raise FileNotFoundError(f"Missing official logo artwork: {logo_path}")
    if music_path and not music_path.is_file():
        raise FileNotFoundError(f"Background music file does not exist: {music_path}")

    last_module_end = max(float(module["end_sec"]) for module in modules)
    duration = max(last_module_end, video_duration(video_path))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="prathamone_badges_") as temp_dir:
        badge_paths = []
        for index, module in enumerate(modules):
            badge_path = Path(temp_dir) / f"badge_{index:02d}.png"
            make_badge(module, logo_path, badge_path)
            badge_paths.append(badge_path)
        command = build_ffmpeg_command(video_path, output_path, modules, badge_paths, duration, music_path)
        subprocess.run(command, check=True)

    verify_output(output_path, modules, last_module_end)
    print(f"Rendered and verified 1080p/30fps commercial: {output_path.relative_to(ROOT).as_posix()}")
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Render synchronized module narration and branded callouts onto the Playwright demo.")
    parser.add_argument("--video", type=Path, default=ROOT / "assets" / "captures" / "synced_demo_recording.webm")
    parser.add_argument(
        "--music",
        type=Path,
        default=DEFAULT_MUSIC if DEFAULT_MUSIC.is_file() else None,
        help="Background music; defaults to assets/audio/bgm_master.wav when present.",
    )
    parser.add_argument("--logo", type=Path, default=OFFICIAL_LOGO)
    parser.add_argument("--output", type=Path, default=OUTPUT_VIDEO)
    args = parser.parse_args()
    render(
        args.video.resolve(),
        args.music.resolve() if args.music else None,
        args.logo.resolve(),
        args.output.resolve(),
    )


if __name__ == "__main__":
    main()
