---
title: "Attendance Centre Dedicated Submenu Workspaces Completion Matrix"
module: "07_ATTENDANCE"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-08"
updated_date: "2026-11-08"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["attendance", "workspaces", "qr-terminal", "roll-call", "defaulters", "ssot", "view-first"]
entities: ["AttendanceRecord", "Student", "Standard", "Division", "AttendancePolicy"]
api_routes: ["/api/v1/attendance", "/api/v1/standards", "/api/v1/divisions", "/api/v1/students"]
related_modules: ["04_STUDENT_MANAGEMENT", "03_ACADEMIC_MANAGEMENT"]
---

# PRATHAMONE EDUOS — ATTENDANCE CENTRE SUBMENU COMPLETION MATRIX

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Version:** 1.0.0  
**Architect:** Jawahar R. Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Date:** 2026-11-08  

---

## 1. Executive Summary

This document certifies the successful transformation and hardening of the **Attendance Centre** inside **PrathamOne EduOS** (Coaching Institute Edition). All 8 submenus have been transitioned into dedicated, first-class workspaces with canonical URL routing, full state persistence across page reloads, bidirectional tab-URL synchronization, Rule 010 View-First edit mode gating, and QR terminal kiosk capabilities.

---

## 2. Workspaces Implementation Summary

| # | Submenu & Route | Component | Page Heading | Contextual Primary Action | View-First Mode Status |
|---|----------------|-----------|--------------|---------------------------|------------------------|
| 1 | `/attendance/overview` | `Attendance.tsx` | Attendance & Biometric Kiosk | Open QR Terminal | Default Safe |
| 2 | `/attendance/daily` | `Attendance.tsx` | Daily Batch Roll Call | Save Attendance Register | Locked until Edit Mode |
| 3 | `/attendance/qr-terminal` | `Attendance.tsx` | QR Attendance Terminal & Kiosk | Record Scan Check-In | Locked until Edit Mode |
| 4 | `/attendance/register` | `Attendance.tsx` | Monthly Attendance Register | Export Register | Default Safe |
| 5 | `/attendance/absenteeism` | `Attendance.tsx` | Absenteeism & Defaulters Tracker | Dispatch Parent Alerts | Locked until Edit Mode |
| 6 | `/attendance/leaves` | `Attendance.tsx` | Student Leave Applications | Apply Leave Request | Locked until Edit Mode |
| 7 | `/attendance/reports` | `Attendance.tsx` | Attendance Analytics & Audit Logs | Export Analytics | Default Safe |
| 8 | `/attendance/settings` | `Attendance.tsx` | Attendance Settings & Policy Framework | Save Attendance Policies | Locked until Edit Mode |

---

## 3. Key Technical Capabilities

### 3.1 First-Class Routing & Deep Linking
- Registered independent routes under `/attendance/*` in `frontend/src/App.tsx`.
- Bidirectional state binding between browser history (`useLocation`, `useNavigate`) and active workspace tabs.
- Full browser reload (`F5`) and back/forward navigation preservation.

### 3.2 Responsive Navigation & Submenu Architecture
- Integrated interactive collapsible accordion in `Sidebar.tsx`.
- Persistent accordion expansion state managed via `sidebarStore.ts` (persisted in `localStorage`).
- Submenu item labels optimized for zero ambiguity (`Daily Roll Call`, `QR Terminal`, `Monthly Register`, `Defaulters & Alerts`, `Leave Requests`, `Reports & Analytics`, `Settings & Policies`).
- Support for desktop sidebar, compact icon-rail hover flyouts, and mobile navigation drawer.

### 3.3 Rule 010: View-First Governance & Scoped Edit Mode
- Scoped Edit Mode key: `academic:attendance`.
- Default View Mode locks batch submissions (`Save Attendance Register`), manual scan submissions (`Record Scan Check-In`), absentee alert dispatches (`Dispatch Parent Alerts`), leave applications (`Apply Leave Request`), and institutional policy alterations (`Save Attendance Policies`).
- Amber warning banners and lock badges inform operators when action requires explicit activation.

### 3.4 High-Speed QR Terminal & Digital ID Card Scanning
- Interactive kiosk mode with auto-focusing scan stream input.
- Real-time audio synthesis chime using web AudioContext (pleasant harmonic tones for successful scans, lower frequency dissonance for duplicates/errors).
- Activity feed displaying student profile pictures, admission numbers, timestamps, and entry status.

### 3.5 SSOT & Data Integrity
- Single authoritative endpoint usage: `/api/v1/attendance`, `/api/v1/standards`, `/api/v1/divisions`, `/api/v1/students`.
- Zero database duplication or mock data reliance.
- Full support for the isolated Training & Demo Environment with amber warning indicator.

---

## 4. Test Suite Verification

Comprehensive automated test suites confirm complete stability:
1. `frontend/src/test/AttendanceDedicatedSubmenus.test.tsx` (9 tests passing)
   - Route switching and workspace rendering
   - URL synchronicity
   - Rule 010 button lock enforcement
   - Training mode indicator display
2. `frontend/src/test/StudentIDCardAndScanner.test.tsx` (3 tests passing)
   - QR scanner integration
   - Digital student ID card generation
3. `frontend/src/test/Sidebar.test.tsx` (13 tests passing)
   - Menu accordion expansion and sub-item routing
   - Active state styling and link integrity
- **Total Combined Regression Suite:** 25/25 tests passing (100% green).

---

## 5. Visual Evidence Artifacts

High-resolution 1080p visual captures recorded:
- `screenshot_56_attendance_overview.png` — Attendance Overview Workspace
- `screenshot_57_attendance_daily.png` — Daily Batch Roll Call Workspace
- `screenshot_58_attendance_qr_terminal.png` — QR Attendance Terminal & Kiosk Workspace
- `screenshot_59_attendance_register.png` — Monthly Attendance Register Workspace
- `screenshot_60_attendance_absenteeism.png` — Absenteeism & Defaulters Tracker Workspace
- `screenshot_61_attendance_leaves.png` — Student Leave Applications Workspace
- `screenshot_62_attendance_reports.png` — Attendance Analytics & Audit Logs Workspace
- `screenshot_63_attendance_settings.png` — Attendance Settings & Policy Framework Workspace
