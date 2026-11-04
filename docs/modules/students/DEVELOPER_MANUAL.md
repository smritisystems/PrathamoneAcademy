# Students & Student Portal Developer Manual

**Backend Files**:
- `backend/app/api/v1/endpoints/student_portal.py`
- `backend/app/api/v1/endpoints/students.py`
- `backend/app/models/portal.py`
- `backend/app/models/student.py`
- `backend/app/models/user.py`
- `backend/alembic/versions/004_student_portal_and_profile.py`

**Frontend Files**:
- `frontend/src/pages/StudentDashboard.tsx`
- `frontend/src/pages/StudentDetail.tsx`
- `frontend/src/pages/Students.tsx`
- `frontend/src/api/endpoints.ts`
- `frontend/src/types/index.ts`
- `frontend/src/test/StudentPortal.test.tsx`

---

## 1. Architecture & Endpoints

### 1.1 Student Portal Endpoints (`/api/v1/student-portal`)

| Endpoint | Method | Role Access | Description |
|---|---|---|---|
| `/dashboard` | `GET` | Student, Admin, Staff | Returns student info, active enrollment, today's classes, attendance summary, fee status, recent results, announcements. |
| `/classes` | `GET` | Student, Admin, Staff | Returns student enrollments across academic years and curriculum subjects. |
| `/timetable` | `GET` | Student, Admin, Staff | Returns weekly timetable entries grouped by day of week. |
| `/attendance` | `GET` | Student, Admin, Staff | Returns aggregate attendance statistics and dated log records. |
| `/tests` | `GET` | Student, Admin, Staff | Returns upcoming assessments and historical graded test marks. |
| `/fees` | `GET` | Student, Admin, Staff | Returns read-only fee plan, invoice breakdown, and payment transaction receipts. |
| `/study-materials` | `GET` | Student, Admin, Staff | Returns notes, question banks, and syllabus documents for the student's standard. |
| `/profile` | `GET` | Student, Admin, Staff | Returns complete student profile with guardians and uploaded documents. |
| `/profile` | `PUT` | Student, Admin, Staff | Permits updating personal contact fields (`phone`, `email`, `blood_group`, `address`, `city`, `pincode`). |

### 1.2 Administrative Profile Endpoints (`/api/v1/students`)

| Endpoint | Method | Role Access | Description |
|---|---|---|---|
| `/{id}/profile` | `GET` | Staff, Teacher, Admin, Superadmin | Aggregates all 8 tabs: `overview`, `enrollment`, `classes`, `attendance`, `tests`, `fees`, `documents`, `activity`. |
| `/{id}` | `PUT` | Admin, Superadmin, Principal | Full administrative profile editing: updates master fields, manages guardians, executes batch transfers, and logs changes to `audit_logs`. |
| `/{id}/profile` | `PUT` | Admin, Superadmin, Principal | Alias for `PUT /{id}`, providing full profile update capabilities. |
| `/{id}/documents` | `POST` | Staff, Teacher, Admin, Superadmin | Uploads/registers a student identity or official document. |
| `/{id}/documents/{doc_id}` | `DELETE` | Admin, Superadmin, Principal | Deletes a student document. |

---

## 2. Security & Effective Student Resolution

In `backend/app/api/v1/endpoints/student_portal.py`:
```python
async def get_effective_student(
    db: AsyncSession,
    current_user: User,
    requested_student_id: Optional[int] = None,
) -> Student:
    if current_user.role == "student":
        # Strict isolation: students can ONLY access their own records
        target_id = current_user.student_id
    else:
        # Administrators & Teachers can inspect any student via student_id switcher
        target_id = requested_student_id or default_active_student_id
```

---

## 3. Database Schema

Migration `004_student_portal_and_profile.py`:
- Added `users.student_id -> students.id (ON DELETE SET NULL)`
- Created `timetable_entries` table with foreign keys to `divisions.id` and `subjects.id`
- Created `study_materials` table with foreign keys to `institutions`, `standards`, `subjects`, and optional `divisions`
- Created `announcements` table with institution/standard/division targeting and pinning
- Created `student_documents` table with foreign key to `students.id`

---

## 4. Automated Testing

Run backend tests:
```bash
cd backend
python -m pytest tests/test_student_profile_edit.py -v
python -m pytest tests/test_student_portal.py -v
python -m pytest tests/ -v
```

Run frontend tests & build:
```bash
cd frontend
npm test
npm run build
```
