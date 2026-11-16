---
title: "PrathamOne EduOS — Full Hybrid Real-Time Chat & Academic Doubt Resolution Engine Implementation Report"
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
tags: ["chat", "realtime-websocket", "staff-collaboration", "academic-doubts", "safeguards", "curfew-mode"]
entities: ["ChatRoom", "ChatParticipant", "ChatMessage", "DoubtResolution", "CurfewPolicy"]
api_routes: ["/api/v1/chat/rooms", "/api/v1/chat/rooms/{id}/messages", "/api/v1/chat/ws/{room_id}", "/api/v1/chat/messages/{id}/resolve"]
related_modules: ["01_ARCHITECTURE", "03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "15_INTEGRATIONS"]
---

# PrathamOne EduOS — Full Hybrid Real-Time Chat & Academic Doubt Resolution Engine Implementation Report

## 1. Executive Summary & Objective

In coaching institutes, unstructured open messaging produces severe friction: minor students get distracted during study hours, teachers get spammed with late-night personal messages, and management lacks an audit trail.

This report documents the end-to-end implementation of the **Full Hybrid Real-Time Chat & Academic Doubt Resolution Engine** in **PrathamOne EduOS**:
- **Space A: Internal Staff Room:** Dedicated, encrypted operational desks (`#staff-general`, `#faculty-room`, `#accounts-desk`, `#reception-desk`) and staff-to-staff direct messaging.
- **Space B: Batch Academic Doubt Desks:** Automated classroom channels derived from active student enrollments and divisions, featuring LaTeX formula formatting, textbook image sharing, and doubt resolution states.
- **Space C: Management Safeguards:** Automated night curfew mode (`8:30 PM to 8:00 AM`) locking batch desks to read-only, algorithmic profanity/abuse quarantine, and immutable compliance audit logs.

---

## 2. Implemented Architecture & Database Schema

### 2.1 Database Migration (`050_chat_and_doubt_engine`)
The schema introduces three normalized tables in PostgreSQL:

1. **`chat_rooms`:**
   - `id` (PK), `institution_id` (FK ➔ `institutions.id`), `room_type` (`STAFF_GENERAL`, `STAFF_DEPT`, `STAFF_DIRECT`, `BATCH_DOUBT`), `name`, `code` (Unique), `description`.
   - Academic anchors: `academic_year_id`, `standard_id`, `division_id`, `subject_id`.
   - Curfew controls: `is_curfew_enabled` (bool), `curfew_start_time` (e.g. `20:30`), `curfew_end_time` (e.g. `08:00`).

2. **`chat_participants`:**
   - `room_id` (FK), `user_id` (FK ➔ `users.id` for staff), `student_id` (FK ➔ `students.id` for students).
   - Strict identity check ensuring Single Source of Truth (`user_id` XOR `student_id`).
   - Read status: `last_read_message_id`, `is_muted`.

3. **`chat_messages`:**
   - `room_id` (FK), sender FKs (`sender_user_id`, `sender_student_id`), `sender_display_name`, `sender_role`.
   - Message categories: `TEXT`, `DOUBT_QUESTION`, `DOUBT_ANSWER`, `ATTACHMENT`, `SYSTEM_NOTICE`.
   - Doubt state: `is_doubt_resolved` (bool), `resolved_by_user_id` (FK), `resolved_at` (timestamp).
   - Safeguards: `is_quarantined` (bool), `quarantine_reason` (varchar), `is_deleted` (soft delete).

### 2.2 Seeded Operational Desks
Upon database initialization, the engine seeds 4 foundational staff desks for the institute:
- `staff_general`: General announcements and institute operational matters.
- `faculty_room`: Syllabus pacing, exam preparation, and curriculum coordination.
- `accounts_desk`: Fee reconciliations, concessions, and cheque clearances.
- `reception_desk`: Walk-in inquiries, parent visits, and student pickups.

---

## 3. Real-Time Transport & WebSocket Architecture

1. **FastAPI WebSocket Endpoint:**
   - Route: `/api/v1/chat/ws/{room_id}?token=<jwt>`
   - Validates user identity via JWT access token.
   - Publishes incoming messages to all active room subscribers sub-second.
2. **Resilient Long-Polling Fallback:**
   - Network firewalls that terminate long-lived WebSocket connections automatically fall back to `/api/v1/chat/rooms/{room_id}/messages` polling every 4 seconds.
3. **Automated Curfew Enforcement:**
   - If a student attempts to dispatch a message during curfew hours (`8:30 PM to 8:00 AM`), the backend throws an `HTTP 403 Forbidden` (`PermissionError`).
   - The UI displays a persistent curfew banner:  
     *“Curfew Active: This academic room is read-only overnight to encourage healthy sleep habits. Messaging reopens at 8:00 AM.”*
4. **Algorithmic Profanity Screening:**
   - Checks every incoming message against prohibited terms.
   - Flagged messages are quarantined with an internal reason tag and hidden from peer students until reviewed by an administrator.

---

## 4. Frontend Component & User Interface

The chat workspace is built at `frontend/src/components/communication/ChatWorkspaceTab.tsx` and mounted under `/communication/chat`:

1. **Left Navigation Pane (Channel Explorer):**
   - Search bar and category chips (`All`, `Staff`, `Doubts`).
   - Channel cards with active status, unread counts, and night curfew indicators.
   - Admin modal to create custom collaboration rooms.
2. **Center Message Stream:**
   - Distinct role tags: `[Admin]`, `[Faculty]`, `[Student]`, `[Staff]`.
   - Academic doubt cards highlighted in amber with a **“Mark as Resolved”** button for teachers.
   - Auto-scroll to latest incoming messages with jsdom-safe guards.
3. **Interactive Composer:**
   - Quick-toggle to tag posts as **“Academic Doubt”**.
   - Input lock when curfew mode is active.

---

## 5. Verification & Quality Assurance Summary

| Test Layer | Test Suite | Results |
| :--- | :--- | :--- |
| **Backend Service** | `backend/tests/test_chat_service.py` | **6 / 6 Passed (100%)** |
| **Frontend Unit** | `frontend/src/test/ChatWorkspace.test.tsx` | **3 / 3 Passed (100%)** |
| **Submenus Integration**| `frontend/src/test/CommunicationDedicatedSubmenus.test.tsx` | **12 / 12 Passed (100%)** |
| **Frontend Production Build** | `npm run build` (tsc + vite) | **0 Errors (Built in 6.16s)** |
| **Header Compliance** | `python scripts/manage_headers.py check` | **633 / 633 Files Passed (100%)** |
| **Documentation Manifest**| `python tools/docs_manager.py validate` | **490 / 490 Documents Passed (0 Errors)** |
