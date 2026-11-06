---
title: "Role and Permission Matrix"
module: "12_RBAC_SECURITY"
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
tags: ["12-rbac-security", "specification"]
entities: ["User", "Role", "Permission", "UserRole"]
api_routes: ["/api/v1/users", "/api/v1/auth"]
related_modules: []
---

# Role and Permission Matrix
**Document ID**: RPM-001  
**Version**: 1.0-DRAFT  
**Parent Framework**: CIPF-001  
**Status**: APPROVED DEFAULT ARCHITECTURE / DRAFT POLICIES PENDING OWNER CONFIRMATION  
**Target System**: Prashant Academy SMS / Coaching Management System  

---

## 1. System Roles Definition

The Prashant Academy system defines **8 distinct operational roles**:

1. **Owner / Super Admin (`superadmin`)**: Executive institute head. Unrestricted administrative, financial, configuration, and audit access across all branches.
2. **Institute Administrator (`admin`)**: Branch principal / center manager. Manages staff, students, academic structures, fee structures, and approvals.
3. **Accountant (`accountant`)**: Financial officer. Records payments, issues receipts, initiates payment reversals, generates financial exports, and manages outstanding dues.
4. **Admission Counselor (`counselor` / `staff`)**: Inbound student intake. Manages inquiries, trial classes, registrations, and basic student demographic records.
5. **Academic Coordinator (`coordinator`)**: Curriculum and schedule manager. Assigns teachers to batches, approves attendance amendments, verifies exam marks, and oversees timetable.
6. **Teacher (`teacher`)**: Instructional faculty. Views assigned student rosters, marks daily attendance, and enters assessment/examination marks.
7. **Student (`student`)**: Enrolled pupil. Self-service portal to view attendance, exam report cards, batch schedules, and fee invoices.
8. **Parent / Guardian (`parent`)**: Registered guardian. Read-only portal for their children's fee dues, payment history, receipts, attendance records, and teacher remarks.

---

## 2. Resource × Action Access Control Matrix

**Legend:**
- **C**: Create
- **R**: Read / View
- **U**: Update / Edit
- **D**: Delete / Deactivate
- **A**: Approve / Publish / Reverse
- **—**: No Access (Forbidden, HTTP 403)

| Resource / Entity | Super Admin | Institute Admin | Accountant | Admission Counselor | Academic Coordinator | Teacher | Student | Parent |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Institution & Branches** | C R U D | R U | R | R | R | R | R | R |
| **Academic Years** | C R U D | C R U | R | R | R | R | R | R |
| **Standards / Courses** | C R U D | C R U D | R | R | R U | R | R | R |
| **Divisions / Batches** | C R U D | C R U D | R | R | C R U D | R (Assigned) | R (Own) | R (Own) |
| **Student Profiles** | C R U D | C R U D | R | C R U | R | R (Academic) | R (Self) | R (Child) |
| **Guardian Records** | C R U D | C R U D | R | C R U | R | R | R (Self) | R U (Self) |
| **Fee Structures** | C R U D | C R U D | C R U | R | R | — | — | — |
| **Fee Invoices & Items** | C R U D | C R U D | C R U | R | R | — | R (Self) | R (Child) |
| **Discounts / Concessions**| C R U D A | C R U A | C R (Up to 10%) | R (Request) | R | — | — | — |
| **Payments & Receipts** | C R U D A | C R A | C R A | R | R | — | R (Self) | R (Child) |
| **Payment Reversals** | C R A | C R A | C R A | — | — | — | — | — |
| **Attendance Register** | C R U D A | C R U A | R | R | C R U A | C R U (Assigned) | R (Self) | R (Child) |
| **Examinations & Tests** | C R U D A | C R U D A | R | R | C R U D A | R (Assigned) | R (Self) | R (Child) |
| **Exam Marks & Grades** | C R U D A | C R U A | R | R | C R U A | C R U (Assigned) | R (Published) | R (Published) |
| **System Users & Roles** | C R U D | C R U D | — | — | — | — | — | — |
| **Financial Reports** | C R (Full) | C R (Full) | C R (Full) | R (Basic) | — | — | — | — |
| **Audit Logs** | R (All) | R (Branch) | R (Finance) | — | — | — | — | — |

---

## 3. Boundary & Field-Level Security Rules

1. **Financial Field Masking for Faculty**:
   - `Teacher` tokens requesting student endpoints (`/students/{id}`) receive sanitized payloads with `fee_summary`, invoices, and balances completely omitted.
2. **Guardian & Student Data Isolation**:
   - `Parent` and `Student` tokens enforce tenant-level where clauses:
     ```sql
     WHERE student_id = current_user.linked_student_id
     ```
3. **Audit Log Non-Repudiation**:
   - Audit logs (`audit_logs` table) have no update or delete endpoints exposed in any router. They can only be queried via read operations by `superadmin` and `admin`.

---

*End of ROLE_PERMISSION_MATRIX.md*

