---
title: "User Management Dashboard & Dedicated User Profile Workspace"
module: "12_RBAC_SECURITY"
category: "IMPLEMENTATION-REPORT"
document_type: "IMPLEMENTATION-REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-04"
updated_date: "2026-11-04"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["12-rbac-security", "implementation-report"]
entities: ["User", "Role", "Permission", "UserRole"]
api_routes: ["/api/v1/users", "/api/v1/auth"]
related_modules: []
---

# User Management Dashboard & Dedicated User Profile Workspace

## 1. Overview & Architecture

The **User Management Dashboard** (`/users`) and **Dedicated User Profile Workspace** (`/users/:id`) have been engineered and deployed end-to-end within the Prashant Academy Coaching Institute Management System.

### Core Architecture Principles:
1. **Strict Decoupling of Authentication and Master Records**:
   - Login credentials, password hashes, access scopes, and role permissions reside strictly within the `users` authentication table.
   - Student academic history (demographics, guardians, enrollments, attendance, exam marks, and fee obligations) resides within master student tables (`students`, `student_enrollments`, `attendance`, `exam_marks`, `fee_invoices`, `payments`).
   - Staff credentials link via `User.staff_code` and `divisions.class_teacher_id`.
   - Modifying user account credentials never mutates or corrupts academic, financial, or attendance history.
2. **Complete Role-Based Access Control (RBAC)**:
   - System permissions are mapped dynamically from the `permissions` table.
   - Dynamic tab calculation in the backend (`data.permitted_tabs`) guarantees students, teachers, and administrators only access permissible views and data.
   - Sensitive financial ledgers are protected on the backend so only authorized finance roles (or the verified student themselves) can view invoices and receipts.
3. **Comprehensive Audit Trail**:
   - Every administrative action (account creation, profile update, password reset, invitation resend, account deactivation/activation, and deletion) writes an immutable record to the `audit_logs` table.
   - Passwords and password hashes are never exposed in profile responses or audit details.

---

## 2. Database Schema Migration (Alembic 008)

Migration `008_user_management_and_scopes.py` upgraded the PostgreSQL schema:
- Added `invitation_status` (`VARCHAR(30)`): `accepted`, `pending`, `expired`.
- Added `invitation_sent_at` (`TIMESTAMPTZ`): Tracks invitation lifecycle.
- Added `scope_type` (`VARCHAR(30)`): `institute`, `board`, `standard`, `batch`.
- Added `scope_id` (`INTEGER`): Foreign key to target scope entity.
- Added `staff_code` (`VARCHAR(50)`): Unique staff identifier (e.g., `ADM-001`, `TCH-001`).
- Added `designation` (`VARCHAR(100)`): Staff title (e.g., `Principal & Director`, `Senior Mathematics Faculty`).
- Added index `ix_users_staff_code` and `ix_users_invitation_status`.

---

## 3. Backend Endpoints (`/api/v1/users`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/users/stats` | Real-time metric card counts: total, active, inactive, pending invites, and role breakdown. |
| `GET` | `/api/v1/users/` | Directory listing with search (name, username, email, phone, staff code, student admission no), filters (role, status, class, batch), sorting, pagination, and linked person resolution. |
| `GET` | `/api/v1/users/{id}` | Dedicated profile workspace returning user details, role permissions, linked student/staff, enrollments, attendance summary & logs, exam marks, fees ledger, audit trail, and `permitted_tabs`. |
| `POST` | `/api/v1/users/` | Creates user account with linked person, access scope, invitation toggle, and audit logging. |
| `PUT` | `/api/v1/users/{id}` | Updates profile details, role, access scopes, and active status with audit logging. |
| `POST` | `/api/v1/users/{id}/reset-password` | Resets password (supports auto-generated secure 12-char temporary password or custom password) with audit logging. |
| `POST` | `/api/v1/users/{id}/toggle-status` | Activates or deactivates user account with self-deactivation safeguards and audit logging. |
| `POST` | `/api/v1/users/{id}/resend-invitation` | Re-triggers pending invitation with refreshed timestamp and audit logging. |
| `DELETE` | `/api/v1/users/{id}` | Soft-deactivates or permanently deletes record with superadmin and self-deletion protections. |

---

## 4. Frontend Implementation

### A. User Management Dashboard (`frontend/src/pages/Users.tsx`)
- **Summary Cards**: Live counts for Total Accounts, Active Accounts, Inactive Accounts, and Pending Invitations.
- **Multi-Filter & Search Bar**: Real-time search by name, username, email, staff code, or student admission number; dropdown filters for Role, Status, Class/Standard, and Batch; Reset button.
- **Directory Data Table**:
  - User Initials Avatar with role gradient.
  - User Name & `@username`.
  - Contact Details (Email & Phone).
  - Role Badge (Super Admin, Admin, Principal, Teacher, Student, Accountant, etc.).
  - Linked Person Details (Student Admission # with Class/Batch or Staff Code with Designation).
  - Access Scope Badge (Institute-wide, Board, Class, Batch).
  - Last Login relative timestamp or "Never".
  - Status Badge (Active, Inactive, Pending Invitation).
  - Actions Menu: View Profile Workspace, Edit User, Reset Password, Resend Invitation, Deactivate/Activate, Delete.
- **Interactive Modals**:
  - Add User Modal with role selector, staff code, designation, access scope, and invitation checkbox.
  - Edit User Modal for profile details.
  - Reset Password Modal with temporary password generation and 1-click clipboard copy.
  - Deactivate/Delete confirmation dialogs.

### B. Dedicated User Profile Workspace (`frontend/src/pages/UserProfile.tsx`)
- **Profile Header**:
  - Back button (`← Back to User Accounts Directory`).
  - Large initials avatar with role-specific gradient.
  - User Name, `@username`, Email, Phone.
  - Badges: Role badge, Status badge, Access Scope badge, Linked Student / Staff badge.
  - Last Login timestamp and Account ID.
  - Quick Actions: Edit Account, Reset Password, Resend Invite, Deactivate/Activate.
- **8 Dynamic Tabs**:
  1. **Overview**: Account summary cards, linked person master card, security summary, recent activity stream, and quick action shortcuts.
  2. **Profile Details**: First Name, Last Name, Username, Email, Phone, Staff Code, Designation, creation and update dates, and data separation notice.
  3. **Access & Roles**: System Role and description, Access Scope boundary, Invitation status, and Effective Permissions Matrix.
  4. **Academic & Batches**:
     - *Students*: Active and historical enrollment table (Academic Year, Board, Standard, Batch, Roll Number, Enrollment Date, Status).
     - *Teachers/Staff*: Assigned batches where user is designated Class Teacher (Batch Name, Code, Class, Board, Room Number, Timing, Capacity).
  5. **Attendance**: Overall attendance rate % gauge, total days, present days, absent days, late days, and dated attendance history log table.
  6. **Examinations**: Exam results table with examination name, marks obtained / max marks, percentage progress bar, grade badge, and remarks.
  7. **Fees & Ledger**: Total fee obligation, total paid, outstanding balance, invoice ledger table (invoice #, total, paid, due date, status), and payment transaction receipts table.
  8. **Activity Log**: Chronological audit trail table displaying timestamps, action badges, resource references, and state changes.

---

## 5. Verification & Test Results

### Backend Integration Tests (`backend/tests/test_user_management.py`):
```text
backend/tests/test_user_management.py::test_get_user_stats PASSED
backend/tests/test_user_management.py::test_list_users_search_and_filters PASSED
backend/tests/test_user_management.py::test_get_user_profile_workspace PASSED
backend/tests/test_user_management.py::test_user_crud_actions_and_audit_logging PASSED
============================= 40 passed in 31.13s =============================
```

### Frontend Vitest Suites:
```text
 ✓ src/test/StudentProfileEdit.test.tsx  (7 tests)
 ✓ src/test/ImportExport.test.tsx  (4 tests)
 ✓ src/test/UserProfile.test.tsx  (5 tests)
 ✓ src/test/Users.test.tsx  (3 tests)
 ✓ src/test/AcademicWorkspace.test.tsx  (3 tests)
 ✓ src/test/FeesModule.test.tsx  (4 tests)
 ✓ src/test/StudentPortal.test.tsx  (4 tests)
 ✓ src/test/Badge.test.tsx  (3 tests)
 Test Files  8 passed (8)
      Tests  33 passed (33)
```

### Production Build & Container Deployment:
- Vite production build completed: `dist/assets/UserProfile-CcOobRfk.js` (61.82 kB)
- Docker image `prashantacademy-frontend:latest` rebuilt and started.
- Nginx returning `HTTP 200 OK` on `http://localhost:80/users`.
- FastAPI backend returning `{"status":"healthy"}` on `http://localhost:8000/health`.
