# Technical Implementation Plan

**System**: Prashant Academy SMS & Coaching Platform  
**Architecture**: FastAPI + SQLAlchemy 2.0 (async) + PostgreSQL + React 18 + Vite + TypeScript  

---

## 1. Architectural Evolution

The Prashant Academy platform is designed in progressive architectural layers:

```
┌─────────────────────────────────────────────────────────────┐
│                       Phase 1: Core                         │
│  Institutions ──► Academic Years ──► Standards ──► Divisions │
│                                         │                   │
│                                         ▼                   │
│                                      Students               │
│                                         │                   │
│                       ┌─────────────────┴────────────────┐  │
│                       ▼                                  ▼  │
│                   Attendance                       Fee Ledger│
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼ (Phase 2 [PLANNED])
┌─────────────────────────────────────────────────────────────┐
│                 Phase 2: Coaching Extension                 │
│      Boards ──► Courses ──► Batches ──► Time Schedules      │
│                    │                                        │
│                    ▼                                        │
│         Batch-Wise Fee Structures & Test Series             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Implemented Components Status (`v2.0.0`)

| Subsystem | Components | Implementation Status |
|---|---|:---:|
| **Backend Models** | 29 SQLAlchemy async models across `backend/app/models/` | `[IMPLEMENTED]` |
| **Alembic Schema** | `001_initial_schema`, `002_fee_register_imports`, `003_add_boards`, `004_student_portal_and_profile` | `[IMPLEMENTED]` |
| **FastAPI Routers** | 17 endpoints in `backend/app/api/v1/endpoints/` (incl. `student_portal`, `import_register`, `examinations`) | `[IMPLEMENTED]` |
| **Authentication** | OAuth2 Password Bearer, JWT HS256, bcrypt hashing, student role isolation | `[IMPLEMENTED]` |
| **Database Seed** | Full coaching roster (39 students, 5 batches, 3 boards, real payments & attendance) | `[IMPLEMENTED]` |
| **Student Portal** | 8-tab responsive portal (`Home`, `My Classes`, `Timetable`, `Attendance`, `Tests`, `Fees`, `Materials`, `Profile`) | `[IMPLEMENTED]` |
| **Admin Student Profile**| 8-tab administrative 360° profile (`Overview`, `Enrollment`, `Classes`, `Attendance`, `Tests`, `Fees`, `Documents`, `Activity`) | `[IMPLEMENTED]` |
| **Frontend UI** | 16 React pages + responsive components + Tailwind styling | `[IMPLEMENTED]` |
| **State & API** | Zustand auth store, TanStack React Query, Axios client | `[IMPLEMENTED]` |
| **Containerization**| Docker Compose multi-container stack (Postgres 16, FastAPI, React/Nginx) | `[IMPLEMENTED]` |
| **Automated Tests** | 24 Pytest backend tests + 7 Vitest frontend tests | `[IMPLEMENTED]` |

---

## 3. Planned Architecture Extensions (`v1.1.0+`) — `[PLANNED]`

### Step 1: Database Migration for Coaching Tables
- Create Alembic migration `002_coaching_tables.py`:
  - `boards` (id, institution_id, name, code, board_type)
  - `courses` (id, board_id, academic_year_id, name, duration_months, max_capacity)
  - `batches` (id, course_id, name, start_time, end_time, capacity)
  - `batch_schedules` (id, batch_id, day_of_week, room_number)
  - `teacher_batch_assignments` (id, batch_id, subject_id, teacher_id)

### Step 2: Service Layer & Business Validation
- Batch capacity checking using PostgreSQL row-level locks (`SELECT FOR UPDATE`).
- Teacher timetable conflict validation: preventing overlapping time assignments.

### Step 3: Payment Gateway Integration
- Webhook endpoints for asynchronous payment status verification.
- Idempotency key tracking to guarantee zero double-charging.

