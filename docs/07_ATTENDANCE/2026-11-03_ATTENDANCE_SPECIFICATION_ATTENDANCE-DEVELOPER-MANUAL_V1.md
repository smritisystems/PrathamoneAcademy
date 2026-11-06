---
title: "Attendance Module Developer Manual"
module: "07_ATTENDANCE"
category: "SPECIFICATION"
document_type: "SPECIFICATION"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-03"
updated_date: "2026-11-03"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["07-attendance", "specification"]
entities: ["Attendance"]
api_routes: ["/api/v1/attendance"]
related_modules: []
---

# Attendance Module Developer Manual

**Backend Files**: `backend/app/api/v1/endpoints/attendance.py`, `backend/app/models/attendance.py`  
**Frontend Files**: `frontend/src/pages/Attendance.tsx`, `frontend/src/api/endpoints.ts`  

---

## 1. Schema & Endpoints

### Table: `attendance`
- `id`: BigInt PK
- `student_id`: Int FK -> `students(id)`
- `enrollment_id`: Int FK -> `student_enrollments(id)`
- `date`: Date NOT NULL
- `status`: Varchar(20) (`present`, `absent`, `late`, `half_day`)
- `remarks`: Text

### `POST /api/v1/attendance/bulk`
Submits bulk roster marks within a single database transaction.

**Request**:
```json
{
  "date": "2024-06-15",
  "entries": [
    {
      "student_id": 1,
      "enrollment_id": 1,
      "status": "present",
      "remarks": ""
    },
    {
      "student_id": 2,
      "enrollment_id": 2,
      "status": "absent",
      "remarks": "Fever reported"
    }
  ]
}
```

