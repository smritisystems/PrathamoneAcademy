# Standards & Divisions Developer Manual

**Backend Files**: `backend/app/api/v1/endpoints/standards.py`, `backend/app/api/v1/endpoints/divisions.py`, `backend/app/models/standard.py`, `backend/app/models/division.py`  
**Frontend Files**: `frontend/src/pages/Standards.tsx`, `frontend/src/api/endpoints.ts`  

---

## 1. Endpoints

- `GET /api/v1/standards/?institution_id={id}`: List all standards with division and student counts.
- `POST /api/v1/standards/`: Create standard with `level`, `order_number`, and `name`.
- `GET /api/v1/divisions/?standard_id={id}`: List all divisions with capacity and room number.
- `POST /api/v1/divisions/`: Create division with `standard_id`, `name`, `capacity`, and `room_number`.

---

## 2. Frontend Design
- `Standards.tsx` renders a master-detail split layout:
  - Left pane: standard selector with real-time student count badge.
  - Right pane: grid of division cards with dynamic occupancy gauge styles.

