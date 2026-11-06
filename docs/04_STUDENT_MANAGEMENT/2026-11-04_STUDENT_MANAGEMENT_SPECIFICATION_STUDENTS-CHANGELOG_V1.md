---
title: "Students Module Changelog"
module: "04_STUDENT_MANAGEMENT"
category: "SPECIFICATION"
document_type: "SPECIFICATION"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-04"
updated_date: "2026-11-04"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["04-student-management", "specification"]
entities: ["Student", "StudentEnrollment", "StudentAcademicHistory"]
api_routes: ["/api/v1/students", "/api/v1/admissions"]
related_modules: []
---

# Students Module Changelog

## [2.0.0] - 2026-11-04
### Added
- **Student Dashboard (Student Portal)**:
  - 8 responsive navigation tabs: Home, My Classes, Timetable, Attendance, Tests & Results, Fees, Study Materials, Profile.
  - Role-based student data isolation binding `user.student_id` to student queries.
  - Interactive student profile self-service editing for permitted contact fields (`phone`, `email`, `blood_group`, `address`, `city`, `pincode`).
  - Study materials repository with downloadable notes, question banks, and syllabus outlines.
  - Notice board announcements with pinned items and priority tags.
- **Enhanced Admin/Teacher Student Profile**:
  - Full 8-tab administrative layout: Overview, Enrollment, Classes, Attendance, Tests, Fees, Documents, Activity.
  - Student identity documents upload modal and deletion with database persistence.
  - System activity timeline aggregating admissions, fee payment receipts, and audit logs.
  - Administrator portal preview switcher allowing staff to preview any student's portal experience.
- **Backend Infrastructure**:
  - Alembic migration `004_student_portal_and_profile.py` for `timetable_entries`, `study_materials`, `announcements`, `student_documents`, and `users.student_id`.
  - Comprehensive suite of 5 automated student portal backend tests in `tests/test_student_portal.py`.
  - Dedicated seeding script `scripts/seed_student_portal_data.py` for realistic attendance, examinations, marks, timetables, and portal test users.
- **Frontend Infrastructure**:
  - Registered `/student/dashboard` and `/student-portal` routes with automatic role redirection.
  - Integrated Student Portal navigation item in `Sidebar.tsx`.
  - Added Student Portal View shortcut in `Students.tsx` action column.
  - Unit tests for portal tab definitions and badge components in `StudentPortal.test.tsx`.

## [1.0.0] - 2024-01-01
### Added
- Complete student directory with paginated search and filters.
- Real-time financial balance aggregation attached to student profiles.
- Role-based privacy filters masking fee balances for instructional staff.
