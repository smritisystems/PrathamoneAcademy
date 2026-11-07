---
title: "PrathamOne EduOS — Global Software Module Inventory"
module: "20_AUDITS_COMPLIANCE"
category: "REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-07"
updated_date: "2026-11-07"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags:
  - "module-inventory"
  - "system-architecture"
  - "forensic-audit"
  - "navigation-mapping"
  - "api-inventory"
entities:
  - "Institution"
  - "User"
  - "Student"
  - "Teacher"
  - "Lead"
  - "FeeInvoice"
  - "Payment"
api_routes:
  - "/api/v1/*"
related_modules:
  - "00_PRODUCT_OVERVIEW"
  - "01_ARCHITECTURE"
  - "16_DATABASE_API"
---

# PrathamOne EduOS — Global Software Module Inventory

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R. Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Audit Scope:** Entire repository, frontend routes, sidebar navigation, backend routers, database tables, and background jobs.

---

## 1. INVENTORY OVERVIEW & DISCOVERY METHODOLOGY

An automated and manual forensic discovery was performed across the entire codebase:
- **Client Routes:** 37 distinct view routes registered in `frontend/src/App.tsx`.
- **Navigation Items:** 40 navigation links & dropdown sub-items in `frontend/src/components/Sidebar.tsx`.
- **Backend API Routers:** 29 domain router modules registered in `backend/app/api/v1/router.py`.
- **Database Tables:** 74 relational tables active in PostgreSQL with 28 Alembic migrations.
- **Frontend Pages:** 37 React page components in `frontend/src/pages/`.

---

## 2. CANONICAL MODULE INVENTORY

| Module ID | Canonical Module Name | Architectural Category | Primary Frontend Views | Primary API Routers | Canonical Database Tables |
|---|---|---|---|---|---|
| **MOD-01** | Academic Structure & Curriculum | Core Academic | `AcademicWorkspace.tsx`, `Subjects.tsx` | `/academic-years`, `/boards`, `/standards`, `/divisions`, `/subjects`, `/timetable` | `boards`, `standards`, `divisions`, `academic_years`, `canonical_subjects`, `subject_mappings`, `subjects`, `timetable_entries` |
| **MOD-02** | Student Information & 360 Dossier | Core Student | `Students.tsx`, `AddStudent.tsx`, `StudentDetail.tsx` | `/students`, `/enrollments` | `students`, `guardians`, `student_enrollments`, `student_documents`, `student_lifecycle_logs` |
| **MOD-03** | Lead Management & CRM Pipeline | Growth & Admissions | `LeadManagement.tsx` | `/leads` | `leads`, `lead_follow_ups`, `lead_demo_classes`, `communication_logs` |
| **MOD-04** | Teacher & Staff Workforce Directory | Workforce & HR | `TeacherManagement.tsx`, `TeacherProfilePage.tsx`, `StaffManagement.tsx`, `StaffProfilePage.tsx` | `/staff`, `/users` | `users`, `staff_profiles`, `staff_addresses`, `staff_bank_accounts`, `staff_documents`, `staff_key_contacts`, `staff_employment_histories`, `teacher_assignments` |
| **MOD-05** | Teacher Payroll & Compensation | Finance & HR | `TeacherPayroll.tsx` | `/teacher-payroll` | `teacher_payrolls`, `teacher_payment_profiles`, `teacher_payment_vouchers`, `teacher_contract_milestones`, `teaching_sessions`, `teacher_rate_histories` |
| **MOD-06** | Student Attendance & Daily Operations | Daily Operations | `Attendance.tsx` | `/attendance` | `attendances` |
| **MOD-07** | Staff & Teacher Attendance & Leaves | Workforce & HR | `StaffManagement.tsx`, `TeacherManagement.tsx` | `/staff/attendance`, `/staff/leaves` | `staff_attendances`, `staff_leaves`, `staff_leave_balances` |
| **MOD-08** | Examinations, Tests & Grading | Academic Performance | `Examinations.tsx` | `/examinations` | `examinations`, `exam_marks` |
| **MOD-09** | Fee Management, Invoicing & Billing | Finance & Accounting | `Fees.tsx`, `FeeCollection.tsx`, `ImportFeeRegister.tsx` | `/fees`, `/import/fee-register` | `fee_structures`, `fee_categories`, `student_fee_assignments`, `fee_invoices`, `fee_invoice_items`, `fee_installments`, `discounts`, `scholarships` |
| **MOD-10** | Payments, Collections & Financial Ledger | Finance & Accounting | `Payments.tsx`, `Receipt.tsx` | `/payments` | `payments`, `payment_receipts`, `payment_allocations`, `refunds` |
| **MOD-11** | Study Materials & Student Learning Portal | Curriculum & LMS | `Courses.tsx`, `StudentDashboard.tsx` | `/student-portal` | `study_materials` |
| **MOD-12** | Communication Center & Messaging | Engagement & Alerts | `Communication.tsx` | `/communication` | `communication_logs`, `message_templates`, `announcements`, `shared_document_tokens` |
| **MOD-13** | Universal Reporting & Analytics Engine | Business Intelligence | `Reports.tsx`, `ExcelReportGrid.tsx` | `/reports` | `audit_logs`, `setting_audit_logs` |
| **MOD-14** | Centralized Print, PDF & Documents | Document Automation | `FormsDocuments.tsx`, `Receipt.tsx` | `/forms` | `student_documents`, `staff_documents`, `staff_generated_documents` |
| **MOD-15** | RBAC, Security & User Identity | Security & Administration | `Users.tsx`, `UserProfile.tsx`, `Login.tsx` | `/auth`, `/users` | `users`, `roles`, `permissions` |
| **MOD-16** | CodeX Data Masking & Privacy | Data Privacy & Security | `CodeXStudio.tsx` | `/codex` | `codex_configs`, `codex_mapping_profiles`, `codex_mapping_versions`, `codex_temporary_tokens`, `codex_audit_logs`, `codex_scope_assignments` |
| **MOD-17** | SysAdmin Settings & Governance | System Administration | `SysAdminWorkspace.tsx`, `Settings.tsx` | `/settings`, `/sysadmin`, `/institutions` | `institution_settings`, `institutions`, `lookup_items`, `setting_audit_logs`, `audit_logs` |
| **MOD-18** | System Releases & Changelog | DevOps & Governance | `Releases.tsx` | `/releases` | `system_releases` |
| **MOD-19** | Global Training / Demo Lab | Training & Simulation | `TrainingManagement.tsx` | `/training` | `training_environment_configs`, `training_reset_logs`, `training_sessions` |
| **MOD-20** | Universal Data Import & Export | Data Management | `ImportExport.tsx`, `ImportFeeRegister.tsx` | `/import-export`, `/import/fee-register` | `data_import_logs`, `fee_register_imports` |
| **MOD-21** | Progressive Web App (PWA) & Offline | Client Infrastructure | `InstallApp.tsx`, `OfflineBanner.tsx` | N/A (Service Worker) | N/A |

---

## 3. NAVIGATION VS CODE DISCOVERY DISCREPANCIES

1. **Study Materials vs Courses Disconnect:**
   - Sidebar item: `{ to: '/courses', label: 'Study Materials', icon: BookOpen }`.
   - Routed component: `CoursesPage` (`Courses.tsx`).
   - Implementation: Displays a static, hardcoded list of courses (`const COURSES: CourseItem[] = [...]`).
   - Missing link: The database table `study_materials` (10 rows) is consumed by the student portal (`StudentDashboard.tsx`), but teachers/administrators have NO administrative view to upload, assign, or delete study materials.
2. **Batches & Standards Sub-Routes:**
   - Routes `/standards` and `/batches` in `App.tsx` re-route to `AcademicWorkspacePage`. This is intentional by architectural design to maintain a unified SSOT academic workspace.
3. **Hidden / Administrative Views:**
   - `CodeXStudio.tsx` (`/codex`) and `SysAdminWorkspace.tsx` (`/sysadmin`) are restricted to `sysadmin` role and hidden from general staff navigation.
