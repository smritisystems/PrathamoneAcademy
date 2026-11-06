---
title: "Global Single Source of Truth (SSOT) & Anti-Duplication Governance Framework"
module: "25_BUSINESS_REQUIREMENTS"
category: "POLICY-FRAMEWORK"
document_type: "POLICY"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-06"
updated_date: "2026-11-06"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["ssot", "governance", "architecture", "anti-duplication", "data-model", "reusability"]
entities: ["User", "Student", "InstituteSetting", "FeeStructure", "PaymentVoucher"]
api_routes: ["*"]
related_modules: ["01_ARCHITECTURE", "12_RBAC_SECURITY", "16_DATABASE_API", "24_AI_AGENT_KNOWLEDGE"]
---

# PRATHAMONE EduOS
# GLOBAL SINGLE SOURCE OF TRUTH (SSOT) & ANTI-DUPLICATION GOVERNANCE FRAMEWORK

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Version:** 1.0.0  
**Organization:** AITDL — AI Technology & Development Lab  
**Product Architect:** Jawahar R Mallah  
**Policy Classification:** MANDATORY — GLOBAL — ALL MODULES — ALL AI AGENTS  

---

## 1. MISSION

Establish a permanent global architecture governance framework that prevents unnecessary duplication across the entire PrathamOne EduOS application.

This policy applies to:

- Database tables.
- Database columns.
- Business entities.
- ORM models.
- API endpoints.
- Backend services.
- Business logic.
- Frontend components.
- Forms and pages.
- Workflows.
- Configuration.
- Permissions.
- Reports.
- Document generation.
- Print engines.
- Notifications.
- Integrations.
- Background jobs.
- AI-generated code.
- Documentation.

The objective is to maintain one authoritative implementation for each business responsibility.

**CORE PRINCIPLE: BUILD ONCE. REUSE EVERYWHERE. MAINTAIN ONE SOURCE OF TRUTH.**

---

## 2. NON-NEGOTIABLE GLOBAL RULES

### RULE 001 — Single Source of Truth

Every business entity must have one authoritative source of truth.

A module must not independently maintain another master copy of an entity already managed by the platform.

**Examples:**
- One person identity across Teacher, Staff, and Payroll (`users` table).
- One student identity across Student Management, Fees, and Attendance (`students` table).
- One supplier identity across Procurement and Accounting.
- One institute identity across all institute modules (`institute_settings` table).
- One product/item identity wherever product management is applicable.

Different modules may maintain their own business-specific relationships and transactions, but must reference the canonical entity.

---

### RULE 002 — Mandatory Reuse Before Creation

Before creating any new:

- Table.
- Column.
- Model.
- API.
- Service.
- Component.
- Hook.
- Utility.
- Configuration.
- Workflow.
- Report.
- Permission.
- Background job.

The AI agent MUST search the existing application for equivalent functionality.

The agent must inspect:

1. Database schema (`alembic/versions/`, PostgreSQL catalog).
2. ORM models (`backend/app/models/`).
3. Existing services (`backend/app/services/`).
4. API routes (`backend/app/api/v1/endpoints/`).
5. Frontend components (`frontend/src/components/`, shared forms/modals).
6. Existing configuration (`InstituteSetting`, `SystemSetting`).
7. Existing documentation (`docs/DOCUMENTATION_INDEX.md`, `DOCUMENTATION_MANIFEST.json`).
8. Entity and service registries (`tools/docs_manager.py search --entity <name>`).

If an equivalent exists, **extend or reuse it**. Do not create a parallel implementation.

---

### RULE 003 — No Duplicate Master Tables

Never create a second master table merely because another module requires the same entity.

**Examples:**
- Teacher and Staff must not maintain duplicate person identities.
- Teacher Payroll must not create an independent teacher master; it configures rates via `teacher_payment_profiles` referencing `users.id`.
- Attendance must not create another employee identity.
- Reports must not maintain copied master data.

Create separate tables only when they represent genuinely different business concepts or lifecycles.

---

### RULE 004 — Distinguish Master, Relationship, Transaction, and Ledger

Every proposed database table must be classified as one of:

| Classification | Responsibility & Lifecycle | Example Entities in PrathamOne EduOS |
|---|---|---|
| **A. MASTER** | Authoritative business entity that exists independently. | `User`, `Student`, `Subject`, `Standard`, `Division` |
| **B. RELATIONSHIP** | Connects existing entities without independent transaction state. | `StudentEnrollment`, `TimetableEntry`, `TeacherRateHistory` |
| **C. TRANSACTION** | Represents an event in time with a lifecycle and status. | `TeachingSession`, `TeacherPayroll`, `StudentFee` |
| **D. LEDGER** | Maintains immutable financial, audit, or inventory debits/credits. | `Payment`, `TeacherPaymentVoucher`, `AuditLog` |
| **E. CONFIGURATION** | Stores controlled system, institute, or rate settings. | `InstituteSetting`, `TeacherPaymentProfile`, `FeePlan` |
| **F. SNAPSHOT** | Preserves historical information as it existed at a specific time. | `StudentAcademicHistory`, `PayrollCalculationSnapshot` |
| **G. CACHE** | Stores rebuildable performance data. | Cached dashboard metrics, temporary aggregation buffers |

Do not merge different responsibilities merely to reduce table count.

For example, `User` (Master) and `TeacherPayroll` (Transaction) and `TeacherPaymentVoucher` (Ledger) are distinct responsibilities and must remain logically separate.

---

### RULE 005 — One Person, One Identity

All human identities must use the platform's canonical person/employee identity architecture (`User` model).

A person may have multiple:
- Organizational roles (`sysadmin`, `teacher`, `accountant`, `admin`).
- Designations.
- Departments.
- Employment contracts.
- Teaching assignments (`TimetableEntry`).
- Payroll configurations (`TeacherPaymentProfile`).
- Permission assignments (`UserRole`).

These must reference the same canonical identity (`users.id`).

Do not create a second person identity because an individual becomes a teacher, accountant, administrator, or coordinator.

---

### RULE 006 — One Authoritative Business Logic Implementation

Do not implement the same calculation or business rule independently in multiple modules.

**Examples:**
- Payroll calculations (`teacher_payroll_service.py`).
- Fee balance and installment calculations (`fee_service.py`).
- Attendance percentage calculations (`attendance_service.py`).
- Tax and GST calculations (`accounting_service.py`).
- Document numbering and voucher series (`document_sequence_service.py`).
- Payment allocation and receipt balancing.

Create or reuse a centralized domain service.

*Frontend calculations may provide instant visual previews, but the backend domain service remains the sole authoritative source of truth for financial, security, and ledger-sensitive operations.*

---

### RULE 007 — One API Responsibility

Before creating an endpoint, search for an existing endpoint serving the same business operation.

Prefer extending existing APIs and Pydantic schemas.

**Do not create:**
- Duplicate CRUD endpoints.
- Alternative versions of the same operation without a justified contract.
- Multiple APIs that independently modify the same business state.

When API versioning is necessary, maintain an explicit compatibility and deprecation policy within `/api/v1/`.

---

### RULE 008 — Shared Frontend Components

Before creating a new form, modal, selector, table, print dialog, or validation component:

1. Search the shared component registry (`frontend/src/components/common/`, `ui/`, `modals/`).
2. Reuse existing components and extend them via props or composition where possible.
3. Do not create visually identical components independently across modules.

Business-specific interfaces may differ while consuming common UI primitives.

---

### RULE 009 — Centralized Configuration

Every configuration must have an authoritative owner:

- **Product Identity & Version:** Centralized in `backend/app/core/config.py` and `frontend/package.json` (`PrathamOne EduOS v1.0.0`).
- **Institute Settings:** Single authoritative table `institute_settings`.
- **System Settings:** Centralized key-value registry `system_settings`.
- **RBAC & Permissions:** Managed in `roles` and `permissions` tables.
- **Printing Templates:** Governed by the centralized printing engine.
