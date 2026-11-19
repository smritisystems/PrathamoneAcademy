---
title: "PrathamOne AI Video Presenter Studio — Complete Operator & Production Manual"
module: "22_USER_MANUALS"
category: "USER-MANUAL"
document_type: "MANUAL"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-19"
updated_date: "2026-11-19"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["video_studio", "user_manual", "ai_presenter", "screen_recording", "playwright", "pyav", "timeline_editor"]
entities: ["VideoStudioProject", "PresenterProfile", "VideoSceneDefinition", "VerifiedAssetItem"]
api_routes: ["/api/v1/video-studio/templates", "/api/v1/video-studio/assets", "/api/v1/video-studio/presenters", "/api/v1/video-studio/recordings", "/api/v1/video-studio/record-demonstration", "/api/v1/video-studio/render"]
related_modules: ["00_PRODUCT_OVERVIEW", "01_ARCHITECTURE", "17_UI_UX_DESIGN"]
---

# PrathamOne AI Video Presenter Studio — Operator & Production Manual

## 1. Overview & Purpose

The **PrathamOne AI Video Presenter Studio** is an enterprise-grade video production suite built natively into **PrathamOne EduOS** (Coaching Institute Edition). Unlike traditional slide-based presentation tools or static screenshot collages, the studio produces authentic, broadcast-quality software sales presentations, module walkthroughs, and social media reels.

Each video is driven by three unified production engines:
1. **Engine A (Realistic Virtual Human AI Presenter):** Indian corporate personas (*Priya Sharma, Arjun Mallah, Neha Verma*) presenting the software with natural voice cadence, lip synchronization, and multiple stage layouts (Full-Screen, Picture-in-Picture, and Split-Screen).
2. **Engine B (Actual Software Demonstration Engine):** Automated, controlled browser workflows that interact with the live running PrathamOne EduOS application to capture authentic 1080p 60fps screen recordings of real student searches, fee collections, roll calls, and EduBoard sessions.
3. **Engine C (Studio Compositor & Multi-Track Video Production Engine):** Real-time 60fps HTML5 Canvas previewer, Web Audio BGM mixing with speech ducking, dynamic subtitles, and server-side hardware-accelerated PyAV / FFmpeg rendering.

---

## 2. Accessing Video Studio

1. Open your browser and navigate to `http://localhost/video-studio` (or `http://localhost/studio`).
2. Alternatively, open the **Navigation Menu** (or press `Cmd/Ctrl + K`) and search for **Video Studio**.
3. The studio opens in an independent, distraction-free creative workspace.

---

## 3. Core Interface Components

```
+---------------------------------------------------------------------------------------+
|  STUDIO HEADER: Project Title | Duration: 120s | AI Director | Library | Export Video |
+---------------------------------------------------+-----------------------------------+
|                                                   |  SCENE STAGE EDITOR               |
|                                                   |  [Visual] [Presenter] [Motion]... |
|             VIDEO CANVAS PREVIEWER                +-----------------------------------+
|             (60 FPS Real-Time Canvas)             |  Persona: Priya Sharma            |
|                                                   |  Layout: Picture-in-Picture (PIP) |
|   - Real Recorded Software Video                  |  Placement: Bottom Right          |
|   - Floating Virtual Presenter Badge              |  Speech Script:                   |
|   - Animated Speech Equalizer Wave                |  "Watch how quickly your team     |
|   - Subtitles & Watermark                         |   can locate any student..."      |
|                                                   |  [Audition Voice]                 |
+---------------------------------------------------+-----------------------------------+
|  MULTI-SCENE VISUAL TIMELINE EDITOR                                                   |
|  [Play/Pause] [Time: 00:24 / 02:00] [Zoom] [Add Scene]                                |
|  +----------------+----------------+----------------+----------------+----------------+
|  | Sc 1: Intro    | Sc 2: Dash     | Sc 3: Students | Sc 4: Fees     | Sc 5: Acad     |
|  | 0 - 8s (Fade)  | 8 - 20s        | 20 - 35s (Vid) | 35 - 48s (Vid) | 48 - 60s       |
|  +----------------+----------------+----------------+----------------+----------------+
+---------------------------------------------------------------------------------------+
```

### 3.1 Studio Header
- **Project Title & Metadata:** Editable project title, target duration tracker, aspect ratio pill (`16:9`, `9:16`, `1:1`).
- **AI Director (`Film` icon):** Generates complete 30s to 120s storyboards based on verified application capabilities.
- **Project Library (`Folder` icon):** Manage, duplicate, save, or import/export video project definitions.
- **Export Video (`Download` icon):** Master render dialog with Full HD MP4 options, resolution settings, and direct download links.

### 3.2 Video Canvas Previewer
- **Hardware-Accelerated HTML5 Canvas:** Renders at 60 FPS with pixel-perfect resolution scaling.
- **Simultaneous Video & Presenter Playback:** Plays real MP4 software demonstrations while rendering the virtual human presenter in PIP, Split-Screen, or Full-Screen mode.
- **Audio Mixing & Ducking:** Automatically blends ambient corporate background music (`prathamone-ambient-bgm.mp3`) with voice-over narration, ducking background volume by 85% during active speech.

### 3.3 Multi-Scene Visual Timeline Editor
- **Multi-Scene Drag-and-Drop:** Reorder scenes effortlessly along the horizontal timeline.
- **Scrubbing & Frame Seeking:** Click anywhere on the timeline to scrub instantly to any frame.
- **Scene Duration Trimming:** Adjust individual scene durations from 2.0 to 60.0 seconds with automatic project duration recalculation.
- **Undo / Redo History:** Full history stack supporting `Cmd/Ctrl + Z` undo and `Cmd/Ctrl + Y` redo.

---

## 4. Virtual Human AI Presenter Workflows (Engine A)

### 4.1 Presenter Profiles Catalog

| Presenter | Role | Vocal Cadence | Key Presentation Focus | Default Layout |
| :--- | :--- | :--- | :--- | :--- |
| **Priya Sharma** | Senior Solutions Specialist | Authoritative, warm Indian Corporate English | Executive Dashboard, Student Management, Atomic Fee Collection Counter | Full-Screen (Intro/Outro), PIP (Demos) |
| **Arjun Mallah** | Enterprise Product Architect | Analytical, technical, strategic Indian English | Single Source of Truth, Academic Deduplication, RBAC Security, Database Architecture | Split-Screen, PIP |
| **Neha Verma** | Academic Consultant | Pedagogical, energetic, classroom-focused | EduBoard Smart Greenboard, Exam Marks & Graphical Report Cards, Attendance | PIP |
| **Custom Spokesperson** | User-Provided | Custom Audio or Video Track | User-recorded MP4/WebM footage or Cloud AI API URL (HeyGen / D-ID) | Custom |

### 4.2 Configuring Presenter in a Scene
1. Click the target scene on the timeline.
2. In the right-hand **Scene Stage Editor**, click the **AI Presenter (`UserCheck` icon)** tab.
3. Toggle the **Virtual Human AI Presenter** switch to ON.
4. Select the desired presenter persona (*Priya Sharma, Arjun Mallah, or Neha Verma*).
5. Choose the **Presenter Stage Layout**:
   - **Picture-in-Picture (PIP):** Presenter floats in a designated corner (default: Bottom-Right) in an elegant rounded badge with an active speech equalizer wave.
   - **Full-Screen:** Presenter takes center stage with studio lighting and a lower-third corporate chyron title bar.
   - **Split-Screen:** 32% presenter column on the left with key feature bullets; 68% software demonstration on the right.
6. Click **Audition Voice** to test speech pronunciation directly via your browser's speech synthesis engine.

---

## 5. Actual Software Demonstration Recording Engine (Engine B)

PrathamOne Video Studio includes an integrated browser automation engine powered by Playwright and PyAV that navigates the live running application and captures authentic Full HD video footage.

### 5.1 Pre-Recorded Demonstrations in Vault
The vault comes pre-loaded with four verified Full HD recordings located in `/media/studio/recordings/`:
1. `demo_student_workflow.mp4`: Demonstrates searching for student *"Aman"*, navigating the 15-tab student dossier, and showing masked Aadhaar compliance.
2. `demo_fees_workflow.mp4`: Demonstrates opening the fee collection counter, selecting student *"Avner"*, entering split payment allocations across tuition and exam fees, and issuing the official receipt.
3. `demo_attendance_workflow.mp4`: Demonstrates batch-wise digital roll call and switching to the high-speed camera QR check-in terminal.
4. `demo_eduboard_workflow.mp4`: Demonstrates the EduBoard interactive greenboard with digital chalk writing, geometric shape drawing, and math formulas.

### 5.2 Recording a Fresh Demonstration via API
To trigger a new live recording session of any module:
```bash
curl -X POST http://localhost:8000/api/v1/video-studio/record-demonstration \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"module": "fees", "durationSeconds": 15}'
```
Or execute the standalone Python script directly from the repository root:
```bash
python scripts/record_software_demonstrations.py
```

---

## 6. AI Video Director Presets

The AI Director generates production-ready storyboards with verified scene scripts, durations, and transitions:

1. **120s Master Product Demonstration:** Comprehensive walkthrough covering Brand Identity, Dashboard, Students, Fee Counter, Academics, EduBoard, Attendance, Exams, WhatsApp, and Closing CTA.
2. **60s Executive Leadership Overview:** Fast-paced tour for institute owners and directors focusing on real-time collection KPIs and recovery velocity.
3. **30s High-Impact Social Reel:** Vertical (9:16) format designed for Instagram Reels, YouTube Shorts, and WhatsApp Status with punchy captions and fast cuts.
4. **45s Automated Fee Counter Showcase:** Deep-dive into split-head collections, dynamic UPI QR codes, and zero ledger discrepancies.
5. **45s EduBoard Smart Classroom Showcase:** Interactive greenboard showcase highlighting zero-latency chalk, math tools, and PDF presentation projection.
6. **45s Student Lifecycle & KYC Dossier:** Comprehensive walk-through of the 15-tab student profile, parent tree, and statutory DPDP compliance.
7. **45s WhatsApp Automation Showcase:** Direct WhatsApp Web messaging, due payment reminder queues, and broadcast composer.

---

## 7. Video Export & Rendering (Engine C)

1. Click **Export Video** in the top header.
2. Configure export settings:
   - **Resolution:** Full HD 1080p (1920 &times; 1080), 4K (3840 &times; 2160), or Social Vertical (1080 &times; 1920).
   - **Framerate:** 30 FPS (standard) or 60 FPS (high-motion).
   - **Bitrate:** High (12 Mbps), Standard (8 Mbps), or Draft (4 Mbps).
   - **Burn-In Subtitles:** Automatically burns high-contrast subtitle pills into the video stream.
   - **PrathamOne Official Watermark:** Embeds the official corporate logo in the top-right corner.
3. Click **Start Master Render**.
4. The system executes the hardware-accelerated PyAV encoding pipeline and delivers a direct MP4 download link.

---

## 8. Brand Attribution & Governance

- **Product Name:** PrathamOne EduOS (Coaching Institute Edition)
- **Tagline:** Coaching Management. Simplified.
- **Architect & Author:** Jawahar R. Mallah
- **Organization:** Smritisys & AITDL Networks
- **Compliance:** 100% compliant with SSOT Rules 001–011, zero data loss protocols, and corporate attribution headers.
