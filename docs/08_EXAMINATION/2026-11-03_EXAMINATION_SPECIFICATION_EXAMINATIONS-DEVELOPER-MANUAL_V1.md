---
title: "Examinations Module Developer Manual"
module: "08_EXAMINATION"
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
tags: ["08-examination", "specification"]
entities: ["Exam", "ExamResult"]
api_routes: ["/api/v1/examinations"]
related_modules: []
---

# Examinations Module Developer Manual

**Backend Files**: `backend/app/models/exam.py`, `backend/app/models/subject.py`  

---

## 1. Data Schema

### Table: `examinations`
- `id`: BigInt PK
- `academic_year_id`: Int FK -> `academic_years(id)`
- `standard_id`: Int FK -> `standards(id)`
- `name`: Varchar(100) NOT NULL
- `start_date`: Date
- `end_date`: Date
- `is_published`: Boolean DEFAULT FALSE

### Table: `exam_marks`
- `id`: BigInt PK
- `examination_id`: Int FK -> `examinations(id)`
- `subject_id`: Int FK -> `subjects(id)`
- `enrollment_id`: Int FK -> `student_enrollments(id)`
- `marks_obtained`: Numeric(5, 2)
- `max_marks`: Numeric(5, 2) NOT NULL
- `is_absent`: Boolean DEFAULT FALSE
- `remarks`: Text

