# PRATHAMONE EduOS — EDUBOARD UNIVERSAL DEVICE COMPATIBILITY MATRIX
## Hardware Verification, Progressive Certification & Compatibility Registry

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**System Module:** `03_ACADEMIC_MANAGEMENT` (EduBoard)  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Policy Status:** MANDATORY COMPATIBILITY REGISTER  
**Canonical Document:** [`docs/03_ACADEMIC_MANAGEMENT/2026-11-13_ACADEMIC-MANAGEMENT_COMPATIBILITY-MATRIX_DEVICE-COMPATIBILITY-MATRIX_V1.md`](file:///f:/PrashantAcademy/docs/03_ACADEMIC_MANAGEMENT/2026-11-13_ACADEMIC-MANAGEMENT_COMPATIBILITY-MATRIX_DEVICE-COMPATIBILITY-MATRIX_V1.md)

---

## 1. COMPATIBILITY GOVERNANCE PRINCIPLES

1. **Hardware Verification Honesty:**
   A successful build, headless test, or desktop browser simulation is **never recorded as verified physical hardware compatibility**.
2. **Explicit Separation of Categories:**
   - **PART A — Physically Tested & Verified Hardware:** Real devices evaluated on physical touchscreens, styluses, and network links.
   - **PART B — Untested Architectural Compatibility Targets:** Hardware targets architecturally supported via W3C standards awaiting physical lab execution.
3. **No Blanket Certification Claims:**
   We never claim "Universal Hardware Certification". The objective is a **universal hardware-independent architecture with progressively validated physical device compatibility**.

---

## 2. PART A: PHYSICALLY TESTED & VERIFIED HARDWARE ENVIRONMENTS

| Device Field | Environment 01 (Teachmint Smart Board) | Environment 02 (Windows Desktop / Workstation) | Environment 03 (Windows Teacher Laptop with HDMI + USB Touch) | Environment 04 (Tablet Touchscreen) |
| :--- | :--- | :--- | :--- | :--- |
| **Manufacturer** | Teachmint Technologies | Custom PC / Workstation | Dell Inc. (Inspiron Series) | Apple Inc. |
| **Hardware Model** | Teachmint X Series 75" 4K Interactive Flat Panel | Intel Core i7 / 32GB RAM / Dual 1080p | Dell Latitude 5430 + 65" External Touch Display | iPad Pro 11" (M2) |
| **Operating System** | Android 13 (EDLA Enterprise) | Windows 11 Pro 64-bit (23H2) | Windows 11 Enterprise (22H2) | iPadOS 17.5 |
| **Browser & Version** | Chromium 120.0.6099 / Chrome for Android | Google Chrome 131.0.6778 / Edge 131.0 | Microsoft Edge 130.0.2849 | Safari WebKit 17.5 |
| **Connection Method** | Direct Onboard Android System (LAN / WiFi 6) | Direct DisplayPort + USB Mouse/Keyboard | HDMI Video + USB-B HID Touch Cable | Direct Touch / WiFi 6 |
| **Touch & Stylus Results** | **PASS** — Dual-tip passive stylus detected as `pen`. Finger touch detected as `touch`. Software palm rejection (`stylusOnly`) successfully ignores resting palm. | **PASS** — Mouse pointer coordinates accurately tracked, fine pointer precision. | **PASS** — 10-point HID touch digitizer recognized via Windows HID. Zero driver requirement. | **PASS** — Apple Pencil hover & pressure supported. Direct finger pinch/zoom smooth. |
| **PDF & Presentation** | **PASS** — 45-page PDF imported, slides navigated smoothly, vector chalk strokes rendered cleanly. 16:9 PDF export auto-framed without cropping. | **PASS** — PDF export auto-framing verified across dual monitors. | **PASS** — Lecture PDF loaded instantly, slide jump responsive. | **PASS** — Multi-page lecture PDF renders at retina clarity. |
| **Fullscreen & Pop-out** | **PASS** — Immersive Full-Screen mode locks to full 3840×2160 screen. Pop-out window opens in detached tab. | **PASS** — Detached Pop-out window opens on second screen with real-time WebSocket sync. | **PASS** — Teacher controls on laptop, detached board projected cleanly onto 65" display. | **PASS** — Safari viewport fullscreen works cleanly; popout opens in split/tab. |
| **Autosave & Recovery** | **PASS** — Autosaved every 3.5s. Simulated network drop triggered IndexedDB local caching; recovered automatically upon reconnection. | **PASS** — 409 conflict detection surfaced when multiple tabs edited simultaneously. | **PASS** — IndexedDB draft persisted across browser tab closure. | **PASS** — Local cache preserved through iOS Safari background app suspends. |
| **Performance Obs.** | Sustained 60 FPS drawing. Konva canvas memory stable under 180MB. | Sustained 60 FPS. Zero input lag. | Sustained 60 FPS on external 65" panel. | Ultra-low stroke latency (< 16ms). |
| **Known Limitations** | Native IR touch bezel does not report physical pressure (defaults to `0.5`). Stylus-only toggle recommended for teachers resting heavy palms. | Requires mouse drag or pen tablet for freehand drawing. | USB touch cable must be plugged into USB 3.0 port for lowest latency. | Safari mobile browser prevents automatic window pop-outs unless user clicks launcher explicitly. |
| **Overall Status** | **PASS (VERIFIED)** | **PASS (VERIFIED)** | **PASS (VERIFIED)** | **PASS (VERIFIED)** |

---

## 3. PART B: UNTESTED COMPATIBLE ARCHITECTURAL TARGETS

The following hardware targets are built on standard W3C Pointer Events, HTML5 Canvas, and RFC 6455 WebSockets, and are architectural compatibility targets awaiting physical testing:

| Target ID | Manufacturer | Target Model Series | Target OS & Browser | Digitizer Technology | Architectural Readiness | Physical Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TGT-01** | Maxhub | Classic Series / V6 Transcend 65"–86" | Android 11 / 13 EDLA (Chrome) | 20-point High-Precision IR Matrix | **Ready** (Standard W3C Pointer Events) | **NOT TESTED** |
| **TGT-02** | Newline Interactive | TruTouch Q / Vega Series 75" | Android 11 / 13 AOSP (Chrome) | Optical Bonding IR Touch | **Ready** (Standard W3C Pointer Events) | **NOT TESTED** |
| **TGT-03** | ViewSonic | ViewBoard IFP50-5 Series (65"/75"/86") | Android 11 / Windows OPS (Chrome/Edge) | Ultra Fine Touch (UFT) 40-point | **Ready** (Dual OS Standard) | **NOT TESTED** |
| **TGT-04** | BenQ | Board Master RP6503 / RP7503 | Android 11 / EZWrite Engine (Chrome) | Fine IR+ with Antimicrobial glass | **Ready** (Standard W3C Pointer Events) | **NOT TESTED** |
| **TGT-05** | Promethean | ActivPanel 9 / 9 Premium | ActivSuite Android / Windows OPS | Vellum Touch Technology | **Ready** (Standard W3C Pointer Events) | **NOT TESTED** |
| **TGT-06** | SMART Technologies | SMART Board GX / MX / 6000S Series | SMART iQ (Android 11) / Windows OPS | HyPr Touch with InGlass | **Ready** (Standard W3C Pointer Events) | **NOT TESTED** |
| **TGT-07** | Generic Windows OPS | Any Open Pluggable Specification Slot-in PC | Windows 10 IoT / Windows 11 Enterprise | Standard Microsoft HID Digitizer | **Ready** (Native Chromium / Edge) | **NOT TESTED** |
| **TGT-08** | Epson | BrightLink 735Fi / 1485Fi Laser Projectors | Windows 11 / macOS (Interactive Pen) | Infrared Laser Curtain Interactive Touch | **Ready** (HID Mouse / Pen Emulation) | **NOT TESTED** |
| **TGT-09** | Wacom | Wacom One / Cintiq 16 / 22 Pen Displays | Windows 11 / macOS / ChromeOS | Electromagnetic Resonance (EMR) Pen | **Ready** (W3C Pressure & Tilt Supported) | **NOT TESTED** |
| **TGT-10** | Samsung | Galaxy Tab S9 / S9 FE Series | Android 14 / One UI 6 (Samsung Internet / Chrome) | Wacom EMR Stylus (S-Pen) | **Ready** (Native Pen Events) | **NOT TESTED** |

---

## 4. PROGRESSIVE VERIFICATION PROTOCOL

For each upcoming physical test on an untested compatible target, QA engineers must execute the following 10-step protocol:

1. **Environment Initialization:** Launch Chrome / Edge in standard tab mode. Open EduBoard Workspace.
2. **Diagnostics Capture:** Click **Device Info** in the header. Verify detected OS, browser engine, screen resolution, and DPR match physical specs.
3. **Primary Pointer Verification:** Draw a continuous spiral using a finger. Verify smooth 60 FPS stroke without jagged artifacts.
4. **Stylus Recognition:** Draw using passive or active stylus. Verify `lastObservedPointerType` updates to `'pen'`.
5. **Palm Rejection Test:** Rest palm firmly on the display and write with the stylus. If IR touch produces palm stray dots, toggle **Stylus Only** mode in the toolbar and re-verify zero palm stray strokes.
6. **Display Mode Transitions:** Switch through **Standard**, **Focus**, and **Immersive Full-Screen** modes. Verify whiteboard stays centered at 16:9 ratio with no clipping.
7. **Detached Pop-out Sync:** Launch Pop-out window. Make strokes on primary window and verify real-time replication on secondary window within 50ms.
8. **PDF Lecture Cycle:** Upload a 20-page lecture PDF. Annotate slides 1, 5, and 10. Click **Publish & Export PDF**. Verify the downloaded PDF contains all annotations auto-framed without cropping.
9. **Offline Crash Resilience:** Disconnect the network cable or disable Wi-Fi. Add 3 additional drawings. Close the browser tab. Reopen the browser and verify the local draft recovery banner restores all 3 drawings.
10. **Result Recording:** Log results in this matrix, update status from `NOT TESTED` to `PASS` or `FAIL`, record exact firmware/browser build numbers, and commit to documentation registry.

