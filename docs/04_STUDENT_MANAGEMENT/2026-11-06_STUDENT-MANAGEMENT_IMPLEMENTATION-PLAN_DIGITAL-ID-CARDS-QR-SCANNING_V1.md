---
title: "Digital Student ID Cards & QR Code Attendance Scanning Implementation Plan"
module: "04_STUDENT_MANAGEMENT"
category: "IMPLEMENTATION-PLAN"
document_type: "PLAN"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-06"
updated_date: "2026-11-06"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Draft"
tags: ["students", "id-cards", "qr-code", "attendance-scanning", "thermal-print", "coaching-edition"]
entities: ["Student", "StudentEnrollment", "Attendance", "Institution"]
api_routes: ["/api/v1/students/{student_id}/id-card", "/api/v1/attendance/scan-checkin"]
related_modules: ["07_ATTENDANCE", "14_PRINTING_DOCUMENTS", "12_RBAC_SECURITY"]
---

# Digital Student ID Cards & QR Code Attendance Scanning — Implementation Plan

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Module:** 04_STUDENT_MANAGEMENT & 07_ATTENDANCE  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  

---

## 1. OBJECTIVE & ARCHITECTURAL SCOPE

The objective of **Module 2** is to deliver a turnkey identity and physical check-in solution for coaching institutes, comprising:
1. **Official Printable Digital Student ID Cards:**
   - Standard CR80 landscape and portrait card layouts (85.6mm x 54mm) and multi-card A4 batch print sheets (8 cards/page).
   - Dynamic branding: Institute emblem, institute title, student photo, admission number, standard, batch, emergency guardian contact, and validity dates.
   - High-contrast SVG QR Code containing secure verification and check-in payload.
2. **High-Speed QR & Barcode Attendance Terminal:**
   - Direct handheld USB/Bluetooth hardware scanner support (auto-focus keyboard wedge).
   - Camera/Webcam video scanner stream for mobile and tablet attendance terminals.
   - Real-time check-in API (`POST /api/v1/attendance/scan-checkin`) that checks student validity, records daily attendance, triggers absent/late automation rules if configured, and displays visual and audio confirmation.

---

## 2. SSOT & ANTI-DUPLICATION AUDIT

In accordance with Platform Rule 001 and Rule 002:
- **Canonical Student Master:** Reuses existing `students` table (`id`, `admission_number`, `photo_url`, `blood_group`, `phone`).
- **Canonical Academic Enrollment:** Reuses existing `student_enrollments` (`standard_id`, `division_id`, `roll_number`, `status`).
- **Canonical Attendance Record:** Reuses existing `attendances` table (`student_id`, `enrollment_id`, `date`, `status`, `marked_by_id`).
- **No Duplicate Tables:** All verification and check-in workflows query canonical tables directly.

---

## 3. IMPLEMENTATION WORKFLOW

### Phase 1: Pure-Python SVG QR Code & Verification Engine
- Build `backend/app/services/qr_generator.py`: A self-contained, high-performance pure-Python QR Code generator generating vector SVG strings without requiring external binary or C-extension dependencies.
- Build `GET /api/v1/students/{student_id}/id-card`: Returns complete ID card payload including SVG QR code, student demographics, batch metadata, and institute branding.

### Phase 2: Instant Scan Check-In Endpoint
- Build `POST /api/v1/attendance/scan-checkin`:
  - Accepts `identifier` (either raw `admission_number`, student ID, or QR payload).
  - Resolves active enrollment for current academic year.
  - Checks if already marked for current date (idempotent duplicate prevention with timestamp feedback).
  - Commits `Attendance` record as `present` (or `late` if past threshold).
  - Dispatches automated guardian notification if automation rules specify instant entry check-in.
  - Returns verified student summary for real-time UI terminal display.

### Phase 3: Frontend ID Card Component & Batch Print Engine
- Create `frontend/src/components/StudentIDCardModal.tsx`:
  - Interactive preview of front and back of student ID card.
  - Single-click browser print targeting thermal card printers or paper lamination (`@media print`).
- Add "Student ID Card" action button to `StudentDetail.tsx`.
- Add "Batch ID Cards" capability to `Students.tsx` allowing batch selection of students.

### Phase 4: Frontend Attendance Terminal Workspace
- Enhance `frontend/src/pages/Attendance.tsx` with an interactive **"QR Attendance Terminal"** drawer/modal:
  - Hardware barcode wedge listener: detects rapid keyboard input and auto-submits.
  - Camera scanner preview option.
  - Real-time live check-in feed with photo, student name, batch, check-in timestamp, and audio feedback chime.

### Phase 5: Automated Testing & Verification
- Backend pytest: `backend/tests/test_id_cards_and_qr_attendance.py`.
- Frontend vitest: `frontend/src/test/StudentIDCardAndScanner.test.tsx`.
- Header compliance: `python scripts/manage_headers.py check`.
- Documentation reindex: `python tools/docs_manager.py reindex && validate`.

