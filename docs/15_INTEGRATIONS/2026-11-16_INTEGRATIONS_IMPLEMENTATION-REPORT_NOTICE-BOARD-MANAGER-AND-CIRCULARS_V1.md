---
title: "Notice Board Manager & Circulars Register Implementation Report"
module: "15_INTEGRATIONS"
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
tags: ["notice-board", "circulars", "communication", "announcements", "student-portal", "view-first", "rule-010"]
entities: ["Announcement", "Standard", "Division"]
api_routes: ["/api/v1/communication/notices", "/api/v1/communication/notices/{id}", "/api/v1/communication/notices/{id}/pin"]
related_modules: ["04_STUDENT_MANAGEMENT", "03_ACADEMIC_MANAGEMENT", "17_UI_UX_DESIGN"]
---

# PRATHAMONE EduOS — NOTICE BOARD MANAGER & CIRCULARS REGISTER IMPLEMENTATION REPORT

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R. Mallah  
**Organization:** Smritisys & AITDL Networks  
**Module:** Communication Center (`/communication/notices` and alias `/notices`)  
**Status:** Completed & Production Verified  
**Date:** 2026-11-16  

---

## 1. Executive Summary

This report documents the architectural design, backend REST implementation, and responsive frontend integration of the **Notice Board Manager & Circulars Register** in **PrathamOne EduOS**.

The Notice Board system provides an institutional broadcast register for publishing academic circulars, exam notices, holiday alerts, fee reminders, and general bulletins. It directly maps to the existing Single Source of Truth (SSOT) `announcements` database table and `app.models.portal.Announcement` model, instantly synchronizing with the Student and Parent Self-Service Portal.

The module strictly enforces **Rule 010 Global View-First & Explicit Edit Mode Governance**, locking all post, pin, edit, and delete operations in View Mode while allowing real-time searching, category filtering, standard/cohort filtering, and modal detail inspection.

---

## 2. Architecture & SSOT Compliance

In strict compliance with **Rule 001 (SSOT)** and **Rule 002 (Mandatory Reuse Before Creation)**:
- **Canonical Model:** Reused `backend/app/models/portal.py::Announcement` linked to relational `Standard` and `Division` models.
- **No Duplicate Tables:** Zero redundant tables or schema bifurcations were introduced.
- **Multi-Tenant Scoping:** All operations are scoped by `institution_id`.
- **Targeting Flexibility:** Notices can target either "All Standards & Cohorts" (`standard_id IS NULL`) or specific grade cohorts (`standard_id` and optional `division_id`).

### Database Relational Schema Overview

```
                      +-----------------------------+
                      |         institutions        |
                      +-----------------------------+
                                     | 1
                                     |
                                     | *
+-----------------+   *       1 +-----------------------+       *   +-----------------+
|    standards    |<------------|     announcements     |---------->|    divisions    |
+-----------------+             | (Notice Board SSOT)   |           +-----------------+
                                +-----------------------+
                                | id: SERIAL PRIMARY KEY|
                                | institution_id: INT FK|
                                | title: VARCHAR(255)   |
                                | content: TEXT         |
                                | category: VARCHAR(50) |
                                | is_pinned: BOOLEAN    |
                                | is_active: BOOLEAN    |
                                | publish_date: DATE    |
                                | expiry_date: DATE     |
                                | standard_id: INT NULL |
                                | division_id: INT NULL |
                                | author_id: INT NULL   |
                                | created_at: TIMESTAMP |
                                +-----------------------+
```

---

## 3. Backend REST API Endpoints

The backend endpoints are implemented in `backend/app/api/v1/endpoints/communication.py`:

| HTTP Method | Route | Description | Query / Body Parameters | Permission |
|---|---|---|---|---|
| `GET` | `/api/v1/communication/notices` | Fetches filtered notice board records with joined standard and division metadata. | `category`, `standard_id`, `search`, `limit`, `offset` | Read access |
| `POST` | `/api/v1/communication/notices` | Creates and broadcasts a new institutional notice or circular. | `title`, `content`, `category`, `standard_id`, `division_id`, `is_pinned`, `publish_date`, `expiry_date` | `communication:broadcasts` |
| `PUT` | `/api/v1/communication/notices/{id}` | Updates existing circular details, targeting, and schedule. | JSON payload matching creation attributes | `communication:broadcasts` |
| `PATCH` | `/api/v1/communication/notices/{id}/pin` | Atomically toggles pin-to-top status. | None | `communication:broadcasts` |
| `DELETE` | `/api/v1/communication/notices/{id}` | Permanently deletes circular from notice board. | None | `communication:broadcasts` |

---

## 4. Frontend Component Design & Responsive Layout

The frontend architecture is encapsulated in `frontend/src/components/communication/NoticeBoardTab.tsx` and integrated across routing:

1. **KPI Metric Telemetry:**
   - **Total Notices:** Total count of active circulars.
   - **Pinned Bulletins:** Count of priority pinned bulletins displayed at the top.
   - **Exam Circulars:** Category breakdown for upcoming examinations.
   - **Holiday Breaks:** Official institute holiday announcements.

2. **Dual-View Responsive Presentation:**
   - **Desktop (`>= md`):** Full data table with Category Badge, Pinned Indicator, Title & Content Preview, Target Audience Badge, Publish Date, and Action Bar.
   - **Mobile (`< md`):** Touch-friendly card listing ensuring no clipped badges, proper word wrapping, prominent action buttons, and zero horizontal page overflow across 320px–430px viewports.

3. **Rule 010 View-First Enforcement:**
   - Default mode is read-only. "Post Notice", "Pin", "Edit", and "Delete" buttons show padlock icons and helper tooltips.
   - Activating `communication:broadcasts` Edit Mode unmasks full administrative editing controls.

4. **Navigation Integration:**
   - Submenu tab in `frontend/src/pages/Communication.tsx` under `/communication/notices`.
   - Sidebar direct navigation item under Communication dropdown in `frontend/src/components/Sidebar.tsx`.
   - Canonical top-level alias route `/notices` in `frontend/src/App.tsx`.

---

## 5. Verification & Acceptance Testing

- **Unit Test Suite:** `frontend/src/test/NoticeBoard.test.tsx` (5/5 tests passing).
- **Communication Regression Suite:** `CommunicationDedicatedSubmenus.test.tsx` & `Communication.test.tsx` (32/32 tests passing).
- **Live Playwright Verification:** Verified on live containers with automated creation, pinning, filtering, and responsive view checking (375x667 mobile viewport, 0px horizontal overflow).
- **Header Compliance:** `python scripts/manage_headers.py check` verified 100% compliant across all 639 source files.

---

## 6. Corporate Governance & Sign-Off

- **Product:** PrathamOne EduOS (Coaching Institute Edition)
- **Baseline Version:** 1.0.0
- **Architect:** Jawahar R. Mallah
- **Organization:** Smritisys & AITDL Networks
