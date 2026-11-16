---
title: "Canonical Wide Logo Branding & Authenticode Windows Installer Implementation Report"
module: "02_INSTALLATION_DEPLOYMENT"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-16"
updated_date: "2026-11-16"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["02-installation-deployment", "windows-installer", "inno-setup", "widelogo", "branding", "code-signing", "authenticode", "offline-installer"]
entities: ["InstallationEngine", "InnoSetupWizard", "ArtworkEngine", "AuthenticodeSigner", "CodeSigningPipeline"]
api_routes: ["/health", "/api/v1/*"]
related_modules: ["01_ARCHITECTURE", "17_UI_UX_DESIGN", "18_TESTING_QA", "19_RELEASES_CHANGELOG"]
---

# PrathamOne EduOS — Canonical Wide Logo & Authenticode Windows Installer Implementation Report

**Document Reference:** `PRATHAMONE-WIDELOGO-AUTHENTICODE-INSTALLER-IMPL-20261116`  
**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R. Mallah  
**Organization:** Smritisys & AITDL Networks  
**Client:** Prashant Academy Coaching Institute  
**Target Operating Systems:** Windows 10 (Build 19041+), Windows 11 (64-bit)  
**Deliverable Status:** Complete & Verified  

---

## 1. Executive Summary

This report documents the architectural overhaul of the **PrathamOne EduOS Windows Offline Installer branding pipeline** and **Authenticode code signing infrastructure**.

Following the design finalization of the canonical wide brand lockup logo (`frontend/public/artwork/CSM/widelogo.svg`), the installer graphics engine was modernized to render pristine, multi-resolution 24-bit bitmap assets (`wizard_large.bmp` and `wizard_small.bmp`) that fit Inno Setup's modern wizard layout with zero distortion and zero color bleeding.

Additionally, this phase resolved visual artifacts caused by legacy CSS ambient glows, implemented dynamic Pascal Script wizard header resizing in Inno Setup 6, integrated the vector watermark on the production login interface, optimized mobile viewport form prominence, and executed end-to-end Authenticode digital signature enforcement.

---

## 2. Engineering Architecture & Asset Upgrades

### 2.1 Canonical Wide Logo Vector Specification (`widelogo.svg`)
- **Location:** `frontend/public/artwork/CSM/widelogo.svg`
- **Aspect Ratio:** ~4.93:1 (`159.21056mm x 32.311047mm`)
- **Brand Dual-Tone Palette:**
  - **Academy Blue:** `#2C5AA0` (Open-Book Academic Crest + "Pratham" Wordmark)
  - **Saffron Orange:** `#FF7F2A` ("ONE" Emblem + "EduOS" Architecture Identifier)
- **Vector Integrity:** Fully vector-based SVG paths without raster dependencies, ensuring flawless rendering at all DPI scalings (100%, 125%, 150%, 200%).

### 2.2 Installer Wizard Graphic Assets (`installer/assets/`)
The installer graphics compilation engine in `scripts/prepare_installer_artwork.py` was refactored to generate crystal-clear, uncompressed 24-bit Windows Bitmaps:
1. **Welcome & Finish Sidebar Banner (`wizard_large.bmp` — 164×314 px)**:
   - High-contrast rounded white card containing the canonical wide logo.
   - Solid Academy Navy gradient (`#0A1C42` to `#112A66`).
   - Frosted glass edition badge (`Coaching Institute Edition`).
   - Feature bullet list highlighting 100% Offline Local Engine, Biometrics, Double-Entry Ledger, and OMR Marksheets.
   - Production attribution footer: `v1.0.0 Production | Smritisys & AITDL`.
2. **Intermediate Wizard Header (`wizard_small.bmp` — 160×58 px)**:
   - Expanded from standard 55×58 px to 160×58 px.
   - Clean white background perfectly aligning with Inno Setup's top navigation banner.
   - Canonical `widelogo.svg` vertically and horizontally centered with pristine antialiasing.
3. **Application Icon & Tray Icon (`app_icon.ico` — Multi-resolution)**:
   - Contains 256×256, 128×128, 64×64, 48×48, 32×32, and 16×16 px mipmaps generated from the official academic crest (`frontend/public/artwork/16112026/001/2.svg`).

### 2.3 Elimination of Ambient Glow & Color Diffusion
- **Forensic Diagnosis:** The installer template previously utilized a decorative CSS radial gradient (`.glow-top { background: radial-gradient(circle, rgba(255, 127, 42, 0.35) 0%, transparent 70%); }`) designed to provide warm ambient backlighting. Because the gradient was centered behind the white card, the orange center bled outward into the deep blue body of the banner.
- **Resolution:** The ambient glow was completely eliminated. The background was converted to a clean, solid Navy gradient, ensuring that the brand saffron `#FF7F2A` remains strictly bounded within the vector letters of the logo card.

### 2.4 Inno Setup Dynamic Header Control Resizing (`installer/prathamone_setup.iss`)
In standard Inno Setup configurations, `WizardSmallImageFile` is constrained to a 55×58 px box, which squishes horizontal logos. In `installer/prathamone_setup.iss`, Pascal Script was integrated in `procedure InitializeWizard`:

```pascal
procedure InitializeWizard;
begin
  // Dynamically configure upper-right header for wide logo branding
  WizardForm.WizardSmallBitmapImage.Width := 160;
  WizardForm.WizardSmallBitmapImage.Left := WizardForm.MainPanel.ClientWidth - 165;
  WizardForm.PageNameLabel.Width := WizardForm.WizardSmallBitmapImage.Left - WizardForm.PageNameLabel.Left - 10;
  WizardForm.PageDescriptionLabel.Width := WizardForm.WizardSmallBitmapImage.Left - WizardForm.PageDescriptionLabel.Left - 10;
  ...
```

This dynamically shifts the image container and adjusts title label widths, allowing the 160×58 px wide logo to display natively across Directory Selection, Custom Academy Config, Educational Boards Selection, and Ready-to-Install screens.

---

## 3. Build & Code Signing Pipeline

### 3.1 Automated Pipeline Flow
The compilation script (`scripts/build_windows_installer.py`) unifies the following automated stages:
1. **Frontend Compilation:** Compiles React 18 SPA via Vite into `frontend/dist/`.
2. **Runtime Staging:** Copies portable PostgreSQL 16 binaries and Python 3.11 base runtime to `build_staging/`.
3. **Artwork Generation:** Invokes `prepare_installer_artwork.py` to regenerate `wizard_large.bmp`, `wizard_small.bmp`, `widelogo.png`, and `app_icon.ico`.
4. **Inno Setup ISCC Compilation:** Compiles `installer/prathamone_setup.iss` into `dist/PrathamOne-EduOS-Setup-v1.0.0.exe` (132 MB compressed package).
5. **Authenticode Digital Signing:** Applies SHA-256 digital signature with RFC-3161 timestamping.

### 3.2 Authenticode Signing Details
- **Signer Identity:** `CN=Smritisys & AITDL Networks, O=Smritisys & AITDL Networks, C=IN`
- **Certificate Thumbprint:** `C2920B24F87AE380394821DF20517D953D531F71`
- **Timestamp Authority:** `http://timestamp.digicert.com`
- **Signed Artifacts:**
  - `dist/PrathamOne-EduOS-Setup-v1.0.0.exe`
  - `installer/files/PrathamOne.exe`
  - `installer/files/StopPrathamOne.exe`
- **Public CA Export:** `dist/Smritisys_AITDL_Networks_CA.cer`

---

## 4. Verification & Quality Gates

| Verification Gate | Required Threshold | Result | Status |
|:---|:---:|:---:|:---:|
| **Frontend Unit Tests (Vitest)** | 100% Pass | 71/71 Suites Passed (543/543 Tests) | ✅ PASSED |
| **Corporate Headers** | 100% Compliance | 636/636 Files Compliant | ✅ PASSED |
| **Documentation Integrity** | 0 Errors, 0 Warnings | 494/494 Documents Validated | ✅ PASSED |
| **Installer Binary Verification** | Valid Windows PE32+ | 138,551,808 bytes, Authenticode Signed | ✅ PASSED |
| **Git Version Synchronization** | Master Branch Sync | Recorded on `master` (`v1.110.1`) | ✅ PASSED |

---

## 5. Artifact Directory References

- **Diagnosis Comparison Artifact:** `orange_spread_diagnosis_comparison.png`
- **Clean Installer Showcase:** `installer_widelogo_clean_showcase.png`
- **Wide Logo Preview:** `widelogo_preview.png`
- **Production Setup Binary:** `dist/PrathamOne-EduOS-Setup-v1.0.0.exe`
- **Public Certificate:** `dist/Smritisys_AITDL_Networks_CA.cer`
