# Students & Student Portal Module Specification

**Module**: Students, Student Portal & 360° Profiles  
**Version**: 2.0.0  
**Status**: IMPLEMENTED & VERIFIED  

---

## 1. Purpose & Scope
Provides coaching institute student management, directory filtering, comprehensive 8-tab administrative profiles, and a responsive, secure self-service **Student Portal / Student Dashboard**.

---

## 2. Core Functional Components

### A. Student Dashboard (Student Portal)
A self-service portal accessible at `/student/dashboard` and `/student-portal` structured into 8 responsive navigation tabs:
1. **Home**: Institute welcome banner, enrolled standard/batch pill, quick metric cards (Attendance %, Fee Obligation, Outstanding Balance, Scheduled Sessions), today's lecture schedule, notice board announcements, and recent exam result cards.
2. **My Classes**: Active courses/boards (ICSE / CBSE / SSC), level/standard, batch/division, roll number, enrollment date, and curriculum subjects with maximum and passing marks.
3. **Timetable**: Weekly batch schedule grouped by day (Monday to Saturday) with time slots, subject names, room allocations, and session types.
4. **Attendance**: Aggregate attendance rate gauge, total working days, present, absent, late counts, and a dated chronological attendance history log.
5. **Tests & Results**: Upcoming scheduled examinations (start/end dates, exam type, passing marks) and historical test results with marks obtained, max marks, percentage, grade, and teacher remarks.
6. **Fees**: Total fee plan, collected amounts, outstanding balance, invoice schedules, and payment transaction receipts with printable receipt references. All fee figures are strictly read-only for students.
7. **Study Materials**: Notes, formula sheets, sample question sets, and syllabus documents organized by subject with file size metadata and direct download actions.
8. **Profile**: Student demographic profile, parent/guardian contact cards, uploaded identity documents, and permitted self-service updates for personal contact details (phone, email, address, city, pincode, blood group).

### B. Admin & Teacher Student Profile
A 360-degree administrative profile accessible at `/students/:id` structured into 8 comprehensive tabs:
1. **Overview**: Student demographic data, guardian summary, active batch, attendance percentage, fee balance, and recent test performance.
2. **Enrollment**: Multi-year academic enrollment history across standards, boards, and batch divisions.
3. **Classes**: Curriculum subjects, batch teacher assignments, and standard levels.
4. **Attendance**: Complete 30-day dated attendance history with status badges and remarks.
5. **Tests**: Comprehensive examination marks, percentages, grades, and academic performance tracking.
6. **Fees**: Invoices, installment schedules, payments, transaction allocations, and receipt links.
7. **Documents**: Uploaded official verification records (Aadhar, Birth Certificate, Marksheets, Transfer Certificate) with interactive upload modal and delete capabilities.
8. **Activity**: Unified activity timeline including admission events, fee payments, and audit logs.

### C. Administrator Preview & Switcher
- Administrators, accountants, and teachers can preview the student portal experience for any active student via a switcher dropdown (`?student_id={id}`).
- Student users (`role="student"`) are strictly locked to their own linked `user.student_id`.

---

## 3. Database Schema & Architecture

- **`users.student_id`**: Foreign key to `students.id` (`ON DELETE SET NULL`) establishing student user identity.
- **`timetable_entries`**: Weekly batch scheduling (`division_id`, `subject_id`, `day_of_week`, `start_time`, `end_time`, `room_number`, `is_active`).
- **`study_materials`**: Academic repository (`institution_id`, `standard_id`, `subject_id`, `division_id`, `title`, `description`, `file_type`, `file_url`, `file_size_bytes`).
- **`announcements`**: Broadcast messages (`institution_id`, `standard_id`, `division_id`, `title`, `content`, `category`, `is_pinned`, `publish_date`).
- **`student_documents`**: Student verification files (`student_id`, `title`, `document_type`, `file_url`, `status`, `uploaded_at`).

---

## 4. Security & Data Integrity Rules
- **CBR-PORTAL-001**: Role-based isolation ensures students cannot view, query, or mutate records belonging to any other student.
- **CBR-PORTAL-002**: Read-only fee enforcement prevents students from modifying invoices, payments, or fee structures.
- **CBR-PORTAL-003**: Permitted profile updates are restricted to contact and demographic fields (`phone`, `email`, `blood_group`, `address`, `city`, `state`, `pincode`). Admission numbers, enrollment status, and fees are immutable via the portal.
