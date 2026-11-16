---
title: "All Indian Examination Boards, Mediums, Canonical Subjects & Enterprise Login Redesign Implementation Report"
module: "03_ACADEMIC_MANAGEMENT"
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
tags: ["boards", "curriculum", "canonical-subjects", "login-redesign", "installer", "pan-india"]
entities: ["Board", "CanonicalSubject", "SubjectMapping", "Division", "Standard"]
api_routes: ["/api/v1/boards/", "/api/v1/subjects/canonical", "/api/v1/subjects/mappings"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "17_UI_UX_DESIGN", "02_INSTALLATION_DEPLOYMENT"]
---

# All Indian Examination Boards, Mediums, Canonical Subjects & Enterprise Login Redesign Implementation Report

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** Smritisys & AITDL Networks  
**Module:** 03_ACADEMIC_MANAGEMENT  
**Date:** 2026-11-16  

---

## 1. Executive Summary

This implementation delivers a dual transformation across **PrathamOne EduOS (Coaching Institute Edition v1.0.0)**:
1. **Enterprise Login Visual Transformation:** Replaces the legacy dark developer terminal interface with a Modern Split-Screen Showcase, luminous academic aurora mesh gradient (`#0B2D6B` to `#071C44` with warm sunrise amber `#F59E0B` and electric cyan `#0284C7`), half-white (`#F8FAFC`) elevated container badges, a dignified institutional motto, an automated first-time administrator credentials helper, and real-time local engine port status indication.
2. **Pan-India Academic Engine & Setup Customization:** Pre-packages the complete catalogue of 17 Indian examination boards (National, State, and Competitive Entrance streams), 43 canonical master subjects across 7 academic categories (SSOT Rule 011), standard-to-subject applicability mappings for Standards 1–12, instruction mediums (English, Semi-English, Hindi, Marathi, Gujarati), and multi-board checkbox selection within the Inno Setup Windows installer wizard.

---

## 2. Login Screen Architectural Redesign

### 2.1 Flaws Remediated in Legacy Login UI
* **Tagline De-commercialization:** Replaced third-party vendor trademark reference (`The Simplicity of WhatsApp`) with an inspiring institutional motto:  
  `"Empowering Minds • Inspiring Excellence • Shaping Futures"`.
* **Atmospheric Elevation:** Upgraded pitch-black background to a dynamic, warm educational aurora mesh featuring flowing vector wave contours, technical dot grid overlay, and multi-mode support (Aurora Mesh, Custom Campus Image, Ambient Video, SVG Pattern).
* **Logo Visual Isolation:** Framed institutional crests and monograms in elevated half-white (`#F8FAFC`) rounded squircle cards with 1px border (`#E2E8F0`) and soft drop shadow, preventing icon clipping or color clashing.
* **First-Time Setup Helper:** Added an interactive banner displaying default setup credentials (`admin / PrathamOne2026!Admin`) with an instant **Autofill** button.
* **Server Health Transparency:** Added a live status indicator confirming local PostgreSQL engine status on dedicated port `2026`.
* **Operator Convenience:** Added a "Remember me on this workstation" option and centralized support contact numbers (`9323 023 007 | 9324 117 007`).

---

## 3. Pan-India Educational Boards Catalogue

The system pre-configures and seeds 17 examination boards across three distinct tiers:

### 3.1 Central & National Boards
* **CBSE (Central Board of Secondary Education):** National NCERT curriculum across Classes 1–12; foundational preparation for JEE, NEET, and CUET.
* **ICSE / ISC (Council for the Indian School Certificate Examinations):** Rigorous ICSE (Class 10) and ISC (Class 12) curricula with dedicated science and literature papers.
* **NIOS (National Institute of Open Schooling):** Flexible secondary and senior secondary open schooling streams.
* **IB (International Baccalaureate):** PYP, MYP, and DP international curricula.
* **Cambridge (CAIE):** International IGCSE and A Level programmes.

### 3.2 State Examination Boards
* **MSBSHSE (Maharashtra State Board):** SSC (Class 10) & HSC (Class 12) Science, Commerce, and Arts streams with Semi-English support.
* **GSEB (Gujarat Secondary & Higher Secondary Board):** SSC and HSC General/Science streams in Gujarati and English.
* **UPMSP (UP Madhyamik Shiksha Parishad):** High School and Intermediate board curricula.
* **KSEAB (Karnataka School Examination Board):** SSLC and 1st/2nd Pre-University College (PUC).
* **TNBSE (Tamil Nadu State Board):** SSLC and Higher Secondary (+1 & +2) streams.
* **TSBIE & BIEAP (Telangana & Andhra Pradesh Boards):** SSC and Intermediate collegiate education.
* **WBBSE / WBCHSE (West Bengal Board):** Madhyamik and Higher Secondary curricula.
* **RBSE (Rajasthan Board):** Secondary and Senior Secondary coaching curricula (Kota coaching benchmark).
* **MPBSE (Madhya Pradesh Board):** High School and Higher Secondary education.
* **BSEB (Bihar School Examination Board):** Matric and Intermediate curricula.
* **KBPE / DHSE (Kerala State Board):** SSLC and Higher Secondary.
* **PSEB (Punjab School Education Board):** Matriculation and Senior Secondary.

### 3.3 Competitive Entrance Streams
* **IIT-JEE Stream (Main & Advanced):** Advanced problem-solving modules in Physics, Chemistry, and Mathematics.
* **NEET-UG Stream:** High-yield medical entrance coaching in Botany, Zoology, Physics, and Chemistry.
* **State CETs:** MHT-CET, GUJCET, KCET speed MCQ coaching.
* **Junior Olympiads & Foundation (Classes 6–10):** NTSE, PRMO, NSO, and IMO foundation math.
* **Commerce Professional Foundations:** CA Foundation, CSEET, CMA Foundation, and CUET.

---

## 4. Single Source of Truth (SSOT) Subject Master Catalogue

In strict compliance with **RULE 001** and **RULE 011**, each academic discipline exists once in `canonical_subjects` and maps across standards and boards via `subject_mappings`:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Category                │ Canonical Master Subjects                         │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ Languages               │ English, Hindi, Marathi, Gujarati, Sanskrit,      │
│                         │ French, German, Urdu, Regional Language           │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ Mathematics             │ Mathematics, Mathematics - Algebra (Part 1),      │
│                         │ Mathematics - Geometry (Part 2), Applied Maths,   │
│                         │ Vedic Mathematics & Mental Math                   │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ Sciences                │ Science & Technology, Science & Tech Part 1,      │
│                         │ Science & Tech Part 2, EVS, Physics, Chemistry,   │
│                         │ Biology, Botany, Zoology                          │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ Social Sciences         │ Social Science, History & Political Science,      │
│                         │ Geography & Economics, Political Science,         │
│                         │ Psychology, Sociology                             │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ Commerce & Finance      │ Bookkeeping & Accountancy, Economics,             │
│                         │ Organization of Commerce (OCM), Secretarial       │
│                         │ Practice (SP), Commercial Applications            │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ Technology & Vocational │ Computer Science & Coding, Information            │
│                         │ Technology (IT), Informatics Practices (IP),      │
│                         │ AI & Robotics, Bifocal Electronics                │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ Competitive Entrance    │ JEE Physics, JEE Chemistry, JEE Mathematics,      │
│                         │ NEET Biology, Mental Ability & Reasoning (MAT),   │
│                         │ General Aptitude & Numerical Ability              │
└─────────────────────────┴───────────────────────────────────────────────────┘
```

---

## 5. Installer Setup Wizard Customization

In Inno Setup (`installer/prathamone_setup.iss`), non-technical operators are provided two dedicated setup pages:
1. **Educational Boards & Academic Curriculum:** Checkbox selection of active boards pre-fills curriculum mappings.
2. **Instruction Mediums & Teaching Languages:** Checkbox selection of active mediums (English, Semi-English, Hindi, Marathi, Gujarati).
3. **Automated Handoff:** Inno Setup writes `{app}\setup_config.json`, which is read by `windows_bootstrap.py` during first initialization and safely unlinked after seeding.

---

## 6. Corporate Governance & Header Verification

All updated source code and script files contain the mandatory AITDL corporate header, achieving 100% compliance with repository directives.
