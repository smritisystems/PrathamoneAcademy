---
title: "PrathamOne EduOS — Full Hybrid Real-Time Chat & Academic Doubt Resolution Engine Architecture"
module: "01_ARCHITECTURE"
category: "TECHNICAL-BLUEPRINT"
document_type: "BLUEPRINT"
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
api_routes: ["/api/v1/chat/rooms", "/api/v1/chat/rooms/{id}/messages", "/api/v1/chat/ws/{room_id}"]
related_modules: ["01_ARCHITECTURE", "03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "15_INTEGRATIONS"]
---

# PrathamOne EduOS — Full Hybrid Real-Time Chat & Academic Doubt Resolution Engine Architecture

## 1. Executive Summary & Directive

Modern coaching institutes require immediate operational coordination among faculty, accountants, and administrators, alongside structured, healthy academic support for students outside class hours. However, deploying open, unmonitored consumer chat (such as WhatsApp groups or unrestricted direct messaging) exposes institutes to severe risks:
1. **Student Distraction & Bullying:** Unmonitored private direct messaging enables peer-to-peer distraction, inappropriate conduct, and exam cheating.
2. **Faculty Overwhelm & Boundary Violation:** Direct 24/7 student pings disrupt personal teacher time and cause staff dissatisfaction.
3. **Disciplinary & Legal Liability:** Lack of institute-controlled audit logs leaves directors defenseless in dispute inquiries.

The **Full Hybrid Communication Engine** reconciles these needs by establishing two isolated, highly governed channels within **PrathamOne EduOS**:
- **Channel A: Internal Staff Room (Operational Collaboration):** Private, encrypted collaboration between Admins, Faculty, Accountants, and Receptionists.
- **Channel B: Batch Academic Doubt Desks (Class & Subject Forums):** Structured, teacher-moderated batch rooms automatically synchronized with academic enrollment, featuring curfew locks and doubt tracking.

---

## 2. High-Level Architecture & Separation of Concerns

```
                                 ┌─────────────────────────────────────────────────────────┐
                                 │       PRATHAMONE EduOS UNIFIED COMMUNICATION ENGINE     │
                                 └────────────────────────────┬────────────────────────────┘
                                                              │
                    ┌─────────────────────────────────────────┴─────────────────────────────────────────┐
                    ▼                                                                                   ▼
   ┌───────────────────────────────────────────────┐                                   ┌───────────────────────────────────────────────┐
   │         CHANNEL A: INTERNAL STAFF ROOM        │                                   │       CHANNEL B: BATCH ACADEMIC DOUBT DESK    │
   ├───────────────────────────────────────────────┤                                   ├───────────────────────────────────────────────┤
   │ • Superadmin, Admin, Principal                │                                   │ • Enrolled Students in Division / Batch       │
   │ • Faculty / Subject Teachers                  │                                   │ • Assigned Batch Teachers & Class Teachers    │
   │ • Accountants & Front-Desk Receptionists      │                                   │ • Institute Management (Audit Oversight)      │
   ├───────────────────────────────────────────────┤                                   ├───────────────────────────────────────────────┤
   │ Sub-Rooms:                                    │                                   │ Sub-Rooms:                                    │
   │   #staff-general (All-staff coordination)     │                                   │   #Std10-CBSE-BatchA-Mathematics              │
   │   #faculty-room (Syllabus & exam papers)      │                                   │   #Std12-HSC-Physics-Batch1                   │
   │   #reception-desk (Walk-ins & student pickups)│                                   │   #NEET-Droppers-Chemistry-Doubts             │
   │   #accounts-desk (Fee approvals & waivers)    │                                   │                                               │
   │   Staff-to-Staff Direct Messaging             │                                   │ Zero Student-to-Student Private DMs           │
   ├───────────────────────────────────────────────┤                                   ├───────────────────────────────────────────────┤
   │ Hours: Unrestricted 24/7                      │                                   │ Hours: Enforced Curfew (8:00 AM - 8:30 PM)    │
   └───────────────────────────────────────────────┘                                   └───────────────────────────────────────────────┘
                                                              │
                                                              ▼
                                 ┌─────────────────────────────────────────────────────────┐
                                 │       INSTITUTE CONTROL TOWER & SAFEGUARD ENGINE        │
                                 ├─────────────────────────────────────────────────────────┤
                                 │ • Curfew Auto-Lock (Read-Only after hours)              │
                                 │ • Profanity & Abuse Keyword Quarantine                  │
                                 │ • Academic Doubt Lifecycle (Unresolved ➔ Solved)        │
                                 │ • Immutable Audit Logs & PDF Transcript Exporter        │
                                 └─────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema & SSOT Compliance

In strict adherence to **Rule 001 (SSOT)** and **Rule 003 (Canonical Person Masters)**:
- Staff members reference canonical `users.id`.
- Students reference canonical `students.id`.
- Rooms automatically derive membership from `student_enrollments` and `timetable_entries` without maintaining redundant membership lists.

```sql
-- 1. Chat Rooms Master
CREATE TABLE chat_rooms (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    room_type VARCHAR(30) NOT NULL, -- 'STAFF_GENERAL', 'STAFF_DEPT', 'STAFF_DIRECT', 'BATCH_DOUBT'
    name VARCHAR(150) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE CASCADE,
    standard_id INTEGER REFERENCES standards(id) ON DELETE SET NULL,
    division_id INTEGER REFERENCES divisions(id) ON DELETE SET NULL,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_curfew_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    curfew_start_time TIME DEFAULT '20:30:00',
    curfew_end_time TIME DEFAULT '08:00:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Chat Participants (Membership & Read State)
CREATE TABLE chat_participants (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    role_in_room VARCHAR(30) NOT NULL DEFAULT 'MEMBER', -- 'MODERATOR', 'TEACHER', 'MEMBER', 'OBSERVER'
    is_muted BOOLEAN NOT NULL DEFAULT FALSE,
    last_read_message_id INTEGER DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_participant_identity CHECK (
        (user_id IS NOT NULL AND student_id IS NULL) OR
        (user_id IS NULL AND student_id IS NOT NULL)
    ),
    CONSTRAINT uq_room_user UNIQUE (room_id, user_id),
    CONSTRAINT uq_room_student UNIQUE (room_id, student_id)
);

-- 3. Chat Messages Ledger
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    sender_student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
    sender_display_name VARCHAR(120) NOT NULL,
    sender_role VARCHAR(30) NOT NULL, -- 'ADMIN', 'TEACHER', 'STUDENT', 'STAFF'
    message_type VARCHAR(30) NOT NULL DEFAULT 'TEXT', -- 'TEXT', 'DOUBT_QUESTION', 'DOUBT_ANSWER', 'ATTACHMENT', 'SYSTEM_NOTICE'
    content TEXT NOT NULL,
    attachment_url VARCHAR(500),
    attachment_type VARCHAR(50), -- 'image/png', 'application/pdf'
    is_doubt_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    is_quarantined BOOLEAN NOT NULL DEFAULT FALSE,
    quarantine_reason VARCHAR(255),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for lightning-fast retrieval
CREATE INDEX ix_chat_messages_room_created ON chat_messages(room_id, created_at DESC);
CREATE INDEX ix_chat_rooms_institution ON chat_rooms(institution_id, room_type);
CREATE INDEX ix_chat_rooms_division ON chat_rooms(division_id);
```

---

## 4. Operational Safeguards & Disciplinary Controls

### 4.1 Automated Curfew Mode (Study Hours Protection)
Coaching students must prioritize sleep and independent revision over late-night messaging:
- Institute Admins configure curfew hours (default: `8:30 PM to 8:00 AM`).
- During curfew, the room automatically enters **Read-Only Mode** for students:
  - Students can read past solutions and lecture notes.
  - New posts and attachments are locked with a friendly banner:  
    *“Curfew Active: Academic Doubt Desks are closed overnight to encourage healthy study habits. Reopens at 8:00 AM.”*
- Teachers and Admins retain emergency override capabilities if urgent exam alerts must be dispatched.

### 4.2 Prohibited Student-to-Student Direct Messaging
- To eliminate bullying, peer distractions, and unmonitored harassment, students **cannot** open private direct chat with fellow students.
- All student queries must be posted in the moderated **Batch Academic Doubt Desk**.

### 4.3 Profanity & Content Quarantine
- Ingoing messages pass through an algorithmic keyword sanitizer.
- Any message containing abusive language, harassment, or inappropriate links is immediately quarantined:
  - The message is hidden from peers.
  - An instant incident report is filed in the **Admin Audit Console** for disciplinary action.

### 4.4 Doubt Resolution Tracking (SLA for Teachers)
- When a student posts a problem tagged `[DOUBT_QUESTION]`, it receives an amber indicator.
- Teachers can answer with explanatory text, KaTeX formulas, or photos of chalkboard steps.
- Clicking **“Mark as Resolved”** turns the badge green, indexing the solution so other students encountering the same problem can search and view it instantly without asking repeatedly.

---

## 5. Real-Time Communication Protocol & API Architecture

### 5.1 Dual-Transport Strategy (WebSocket + REST Fallback)
1. **Primary Transport (FastAPI WebSockets):**
   - Endpoint: `ws://localhost:2026/api/v1/chat/ws/{room_id}?token=<jwt>`
   - Sub-second delivery of incoming messages, typing indicators, and read receipts.
2. **Resilient Fallback (HTTP Long-Polling):**
   - For restricted coaching LANs or firewalled environments blocking persistent WebSocket connections:
     - `GET /api/v1/chat/rooms/{id}/messages?since_id=1234`
     - Automatically transitions to polling if WebSocket handshakes fail.

### 5.2 Core API Endpoints

| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/chat/rooms` | Authenticated | Lists all accessible rooms for current user/student |
| `POST` | `/api/v1/chat/rooms` | Admin / Principal | Authors a new custom collaboration channel |
| `GET` | `/api/v1/chat/rooms/{id}/messages` | Room Members | Retrieves paginated message history |
| `POST` | `/api/v1/chat/rooms/{id}/messages` | Room Members | Posts text, attachments, or doubt questions |
| `POST` | `/api/v1/chat/messages/{id}/resolve` | Faculty / Admin | Marks academic doubt as resolved |
| `POST` | `/api/v1/chat/messages/{id}/quarantine`| Admin / Moderator| Manually flags or approves a quarantined message |
| `GET` | `/api/v1/chat/rooms/{id}/export-pdf` | Admin / Principal | Generates immutable audit transcript of room history |

---

## 6. Frontend User Interface Specification

The Chat Workspace will be integrated under the existing Communication module at `/communication/chat`:

1. **Left Sidebar (Channel Explorer):**
   - Group 1: 🏢 **Staff Operations** (`#General`, `#Faculty`, `#Accounts`, `#Admissions`)
   - Group 2: 🎓 **Batch Doubt Desks** (`#Std10-CBSE-Maths`, `#Std12-Physics`)
   - Group 3: 💬 **Direct Messages** (Staff-to-Staff only)
   - Live unread badges with notification counters.

2. **Center Pane (Live Message Stream):**
   - Distinct visual badges for sender roles:  
     `[Admin]` (Purple), `[Faculty]` (Blue), `[Student]` (Emerald), `[Staff]` (Amber).
   - Rich Math rendering via **KaTeX** (`$\int \frac{dx}{x} = \ln|x| + C$`).
   - Image zoom modal for textbook snapshots and handwritten solutions.
   - Pinned resolution cards for solved questions.

3. **Right Pane (Context & Roster):**
   - Active faculty member on duty.
   - Current Curfew status and operating hours.
   - Quick filter: *Show only Unresolved Doubts*.

---

## 7. Phased Implementation Roadmap

1. **Phase 1: Internal Staff Collaboration Engine (Weeks 1–2)**
   - Database tables: `chat_rooms`, `chat_participants`, `chat_messages`.
   - WebSockets manager in FastAPI backend.
   - Staff rooms (`#staff-general`, `#faculty-room`, `#accounts-desk`) and 1-on-1 staff chat.
   - Zero student interaction; immediate operational coordination for institute team.

2. **Phase 2: Automated Batch Doubt Desks & Student Integration (Weeks 3–4)**
   - Automatic room provisioning based on `divisions` and `student_enrollments`.
   - LaTeX mathematical formula rendering and doubt resolution state tags.
   - Enforced curfew auto-locks and profanity filter.

3. **Phase 3: Management Audit Console & Transcript Exporters (Week 5)**
   - Disciplinary audit viewer for Superadmin.
   - PDF transcript generator for official parent meetings or dispute resolution.
