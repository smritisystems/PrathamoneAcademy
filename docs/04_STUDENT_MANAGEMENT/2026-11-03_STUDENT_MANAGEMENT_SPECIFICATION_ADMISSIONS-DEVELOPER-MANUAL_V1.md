---
title: "Admissions Module Developer Manual"
module: "04_STUDENT_MANAGEMENT"
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
tags: ["04-student-management", "specification"]
entities: ["Student", "StudentEnrollment", "StudentAcademicHistory"]
api_routes: ["/api/v1/students", "/api/v1/admissions"]
related_modules: []
---

# Admissions Module Developer Manual

**Backend Files**: `backend/app/api/v1/endpoints/students.py`, `backend/app/models/student.py`, `backend/app/models/enrollment.py`  
**Frontend Files**: `frontend/src/pages/AddStudent.tsx`, `frontend/src/api/endpoints.ts`  

---

## 1. Data Schema & Relationships

```
students (id, admission_number, first_name, last_name, date_of_birth, gender...)
  ├── guardians (id, student_id, relation, first_name, last_name, phone, is_primary)
  └── student_enrollments (id, student_id, academic_year_id, standard_id, division_id, status)
```

---

## 2. API Endpoints

### `POST /api/v1/students/`
Creates student and linked guardian record.

**Request Payload**:
```json
{
  "institution_id": 1,
  "academic_year_id": 1,
  "full_name": "Rohan Gupta",
  "date_of_birth": "2008-05-14",
  "gender": "Male",
  "guardian": {
    "full_name": "Suresh Gupta",
    "relationship": "Father",
    "phone": "9876543210"
  },
  "standard_id": 10,
  "division_id": 1
}
```

**Response (HTTP 201 Created)**:
```json
{
  "id": 12,
  "admission_number": "PA-2024-000012",
  "first_name": "Rohan",
  "last_name": "Gupta",
  "is_active": true
}
```

---

## 3. Frontend Architecture
- `AddStudent.tsx` implements a 4-step wizard with local step state.
- Form validation occurs at each step boundary via `validateStep()`.
- Data is submitted via TanStack Query's `useMutation(createStudent)`.

