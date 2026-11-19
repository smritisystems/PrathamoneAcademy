# /**
#  * @file        inspect_master_commercial.py
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
#  * @description Forensic verification script extracting sample inspection frames across all 8 chapters of the rendered master commercial.
#  */

import os
from pathlib import Path
import av

INPUT_VIDEO = "frontend/public/media/commercial/prathamone_commercial_master_1080p.mp4"
FRAMES_DIR = Path("docs/assets/commercial/inspection_frames")
FRAMES_DIR.mkdir(parents=True, exist_ok=True)

# Timestamps to inspect across all 8 chapters
SAMPLE_TIMESTAMPS = [
    (5.0, "ch01_opening_presenter_00m05s"),
    (40.0, "ch03_executive_dashboard_kpis_00m40s"),
    (65.0, "ch04_student_directory_search_01m05s"),
    (90.0, "ch05_fee_collection_analytics_01m30s"),
    (108.0, "ch06_fresh_eduboard_greenboard_01m48s"),
    (128.0, "ch07_attendance_qr_terminal_02m08s"),
    (146.0, "ch08_onprem_vs_cloud_architecture_02m26s"),
    (160.0, "ch08_brand_climax_endcard_02m40s"),
]

def main():
    print(f"Inspecting Master Commercial: {INPUT_VIDEO}")
    container = av.open(INPUT_VIDEO)
    stream = container.streams.video[0]
    
    # Calculate video stats
    duration = float(stream.duration * stream.time_base) if stream.duration else None
    print(f"Video Stream: {stream.width}x{stream.height} @ {float(stream.average_rate)} fps, Duration: {duration:.2f}s")
    
    audio_stream = container.streams.audio[0]
    print(f"Audio Stream: {audio_stream.rate}Hz, {audio_stream.layout.name}, {audio_stream.codec_context.name}")

    target_idx = 0
    for frame in container.decode(stream):
        t = float(frame.pts * frame.time_base) if frame.pts is not None else 0
        if target_idx < len(SAMPLE_TIMESTAMPS):
            ts, label = SAMPLE_TIMESTAMPS[target_idx]
            if t >= ts:
                img = frame.to_image()
                out_path = FRAMES_DIR / f"{target_idx + 1:02d}_{label}_{t:.1f}s.jpg"
                img.save(out_path, quality=92)
                print(f"  Captured Frame [{target_idx + 1}/8] @ {t:05.2f}s -> {out_path.name}")
                target_idx += 1
        else:
            break

    container.close()
    print("Forensic inspection frame extraction complete!")

if __name__ == "__main__":
    main()
