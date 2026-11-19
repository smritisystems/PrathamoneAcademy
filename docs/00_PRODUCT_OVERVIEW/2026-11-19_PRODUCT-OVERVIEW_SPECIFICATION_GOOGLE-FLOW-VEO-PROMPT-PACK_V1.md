---
title: "PrathamOne EduOS — Google Flow & Veo 2 Scene Builder Prompt Pack and Commercial Studio Ingestion"
module: "00_PRODUCT_OVERVIEW"
category: "SPECIFICATION"
document_type: "SPECIFICATION"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-19"
updated_date: "2026-11-19"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["google-flow", "veo-2", "ai-cinematography", "commercial-studio", "prompt-pack", "video-ingestion"]
entities: ["GoogleFlowPromptPack", "VeoVideoGenerator", "CommercialProjectManifest", "StudioCompositor"]
api_routes: ["/api/v1/auth/login", "/dashboard"]
related_modules: ["00_PRODUCT_OVERVIEW", "01_ARCHITECTURE"]
---

# PRATHAMONE EDUOS
## Google Flow & Veo 2 Scene Builder Prompt Pack & Auto-Ingestion Specification
### Broadcast Commercial Studio Production Pipeline (16:9 1080p Full HD)

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** Smritisys & AITDL Networks  
**Client:** Prashant Academy Coaching Institute  
**Date:** November 19, 2026  

---

## 1. EXECUTIVE SUMMARY & OBJECTIVE

This specification details the end-to-end integration of **Google Flow** (`labs.google/fx/tools/flow`) and Google DeepMind's **Veo 2** video generation system into the PrathamOne EduOS declarative commercial production pipeline.

Google Flow is a browser-based creative filmmaking environment combining Veo 2 text-to-video dynamics with Imagen 3 rendering. Because Google Flow operates in a web environment without a standalone public REST API, this directive establishes:
1. **Standardized Prompt Pack:** A calibrated prompt sheet tailored for Google Flow's Scene Builder (16:9 widescreen, 1080p, 30fps) targeting four key cinematic shots in `assets/flow_exports/`.
2. **Auto-Ingestion Manifest:** Dynamic scene routing in `commercial_project.json` linking Scenes `01_opening`, `02_intro`, `06_deployment`, and `08_closing` directly to `assets/flow_exports/*.mp4`.
3. **Automated Time-Stretching & Conforming Engine:** Enhanced logic in `scripts/render_commercial_studio.py` utilizing FFmpeg (`setpts`) and temporal resampling to dynamically stretch or trim clips to match voiceover speech cadence without freeze-frame distortion.
4. **Programmatic Veo Script:** An optional programmatic automation script (`scripts/generate_veo_clips.py`) supporting Google Cloud Vertex AI Veo API and procedural mock rendering.

---

## 2. PRODUCTION SHOT SPECIFICATION

| Shot ID | File Destination | Scene ID | Voiceover Target | Visual Theme |
|---|---|---|---|---|
| **Shot 01** | `assets/flow_exports/flow_01_corridor_presenter.mp4` | `01_opening` | `assets/audio/vo_01_opening.wav` (12.82s) | Priya Sharma (Solutions Specialist) corridor walk |
| **Shot 02** | `assets/flow_exports/flow_02_studio_intro.mp4` | `02_intro` | `assets/audio/vo_02_intro.wav` (13.75s) | Keynote presenter standing beside 85-inch studio display |
| **Shot 03** | `assets/flow_exports/flow_06_onprem_cloud_3d.mp4` | `06_deployment` | `assets/audio/vo_06_deployment.wav` (15.82s) | 3D On-Premises Server vs Cloud Hybrid Sync |
| **Shot 04** | `assets/flow_exports/flow_08_brand_crest_reveal.mp4` | `08_closing` | `assets/audio/vo_08_closing.wav` (10.18s) | Luminous particle convergence into brand shield emblem |

---

## 3. PROMPT FORMULATIONS

### 3.1 Shot 01: `flow_01_corridor_presenter.mp4`
* **Prompt:**
  ```text
  Medium tracking shot of a confident Indian corporate woman in smart navy blazer walking through a modern, sunlit coaching academy glass corridor, smiling warmly and speaking naturally toward camera, shallow depth of field, cinematic studio lighting, 16:9
  ```
* **Negative Prompt:**
  ```text
  cartoon, 3D animated CGI, plastic artificial skin, extra limbs, deformed fingers, warped face, low resolution, motion blur blurriness, jitter, watermark, text, logos, oversaturated colors
  ```

### 3.2 Shot 02: `flow_02_studio_intro.mp4`
* **Prompt:**
  ```text
  Medium close-up of the same Indian female presenter standing beside a sleek frameless 85-inch studio display in a dark navy modern tech studio, natural hand gestures, speaking directly to camera, soft rim lighting
  ```
* **Negative Prompt:**
  ```text
  distorted face, bad eyes, uncanny valley, exaggerated mouth movements, weird hands, six fingers, text on screen, floating alphabets, flickering lights, noisy background
  ```

### 3.3 Shot 03: `flow_06_onprem_cloud_3d.mp4`
* **Prompt:**
  ```text
  Sleek 3D architectural motion graphics in deep Prussian Navy (#051535) and glowing brand orange (#F16906) light streaks, showing a secure local campus server rack seamlessly syncing via encrypted golden data arcs to a modern cloud network, clean enterprise commercial aesthetic, no text
  ```
* **Negative Prompt:**
  ```text
  text, letters, words, messy cables, 2D vector art, cheap cartoon, gaming neon RGB, blurry textures, pixelation, low poly artifacts
  ```

### 3.4 Shot 04: `flow_08_brand_crest_reveal.mp4`
* **Prompt:**
  ```text
  High-impact 3D particle convergence of glowing gold and electric blue light ribbons swirling into a centered dark-navy shield emblem space, dramatic studio volumetric lighting, 16:9 television commercial outro background, no text
  ```
* **Negative Prompt:**
  ```text
  text, typography, letters, pre-baked logos, distorted crest, explosion debris, fire smoke, desaturated colors, harsh strobe flicker
  ```

---

## 4. TEMPORAL CONFORMING & TIME-STRETCHING ARCHITECTURE

Google Flow / Veo generations typically deliver clips of 5 to 8 seconds. Commercial voiceover segments range between 10.18s and 15.82s. To prevent freeze-framing on the final frame:
1. **FFmpeg `setpts` Filter Chain:**
   ```bash
   ffmpeg -y -i input.mp4 -filter:v "setpts={pts_multiplier}*PTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30" -t {target_duration} -c:v libx264 -pix_fmt yuv420p output.mp4
   ```
   where `pts_multiplier = target_duration / source_duration`.
2. **In-Memory Temporal Resampling Fallback:**
   If FFmpeg binary execution is bypassed, PyAV decodes the source stream and performs linear time-stretching:
   ```python
   indices = np.linspace(0, len(raw_frames) - 1, target_frames).astype(int)
   frames = [raw_frames[i] for i in indices]
   ```
3. **Resilient Fallback Hierarchy:**
   If `assets/flow_exports/*.mp4` is missing during development, the compositor transparently falls back to `fallback_video_source` (`data/commercial/presenter/...`), guaranteeing uninterrupted rendering.
