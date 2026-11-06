---
title: "Centralized Printable Forms & KYC System Implementation Report"
module: "14_PRINTING_DOCUMENTS"
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
tags: ["14-printing-documents", "implementation-report"]
entities: []
api_routes: ["/api/v1/print"]
related_modules: []
---

# Centralized Printable Forms & KYC System Implementation Report

**Author:** Jawahar R. Mallah  
**Organization:** AITDL (AI Technology & Development Lab)  
**Client:** Prashant Academy Coaching Institute  
**Project:** PrathamOne Academy Coaching Institute Management System  
**Date:** 04 November 2026  
**Status:** Completed & Verified End-to-End  

---

## 1. Executive Summary

In response to institutional requirements and statutory mandates under India's **Digital Personal Data Protection Act, 2023 (DPDP Act)** and **CBSE Recordkeeping Directives**, a centralized, production-grade **Print Forms & KYC Workspace** has been designed and implemented across both backend and frontend of the Prashant Academy Coaching Institute Management System.

Rather than fragmenting print actions with ad-hoc print buttons, the system introduces a shared form registry, an authoritative data resolution engine, and an A4-optimized rendering template engine. Authorized administrators, accountants, and teachers can generate both **prefilled forms** (from live database records) and **blank forms** (with write-in dotted guides and empty checkboxes for physical pen-and-paper manual completion).

```mermaid
flowchart TD
    subgraph Data Sources
        DB[(PostgreSQL Database)] --> S[Student & Guardian Records]
        DB --> U[Staff & User Credentials]
        DB --> A[Academic & Batches]
        DB --> F[Fee Invoices & Payments]
        DB --> E[Exams & Attendance]
    end

    subgraph Backend Core
        CAT[Form Catalog Registry<br/>31 Form Definitions] --> ENG[Form Renderer Engine]
        S --> ENG
        U --> ENG
        A --> ENG
        F --> ENG
        E --> ENG
        ENG --> MASK[Aadhaar Masking<br/>XXXX-XXXX-1234]
        ENG --> DPDP[DPDP Act Notice &<br/>Minor Consent Clause]
        ENG --> AUDIT[(AuditLog Table<br/>Action: PRINT_FORM_GENERATED)]
    end

    subgraph API Endpoints
        ENG --> EP1[GET /api/v1/forms/catalogue]
        ENG --> EP2[GET /api/v1/forms/render/{form_id}]
        ENG --> EP3[POST /api/v1/forms/bulk-render]
        ENG --> EP4[GET /api/v1/forms/audit-logs]
    end

    subgraph Frontend Workspace
        EP1 & EP2 & EP3 --> WS[/forms Forms & Documents Workspace]
        WS --> MODES[Prefilled vs Blank Mode]
        WS --> SCOPES[Single Record vs Bulk Batch Print]
        WS --> PREVIEW[A4 Canvas Zoom Preview<br/>75% / 100% / 125%]
        WS --> PRINT[Native Browser Print<br/>& A4 PDF Export]
    end
```

---

## 2. Statutory Legal Framework & Form Catalogue

### 2.1 Legal & Regulatory Compliance
1. **Digital Personal Data Protection Act, 2023 (DPDP Act) & MeitY DPDP Rules 2025**:
   - **Minor Consent (Section 9)**: Students under 18 years of age are designated as children. Forms include explicit parent/legal guardian consent language, clear purposes of educational processing, and notice of rights (correction, access, consent withdrawal).
   - **Sensitive Identifier Protection**: Aadhaar numbers are masked by default as `XXXX-XXXX-1234` (displaying only the last four digits). Plain full Aadhaar numbers are never printed.
   - **Strict Credential Safeguard**: User account forms strictly omit password hashes, temporary passwords, reset tokens, and cryptographic keys.
   - **Audit Trail**: Every form generation event records an audit entry (`AuditLog`) capturing user, form ID, record scope, mode, and timestamp without logging sensitive payload values.
2. **CBSE Affiliation Bye-Laws & Standard Student Recordkeeping Framework**:
   - 75% minimum attendance requirement tracking on attendance forms.
   - Formal verification tables for Transfer Certificates (TC), Birth Certificates, Marksheets, and Address proofs.
   - Standard 4-party formal signature block: Candidate / Student, Parent / Legal Guardian, Verifying Officer, and Principal / Center Head.

### 2.2 Comprehensive Form Catalogue (31 Supported Forms)

| Entity | Category | Form Title | Code | DPDP Sensitive | Supported Scopes |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Student** | KYC | Student Admission & Application Form | `PA-ADM-01` | Yes | Single, Bulk |
| **Student** | KYC | Student Information & KYC Verification Form | `PA-KYC-01` | Yes | Single, Bulk |
| **Parent** | KYC | Parent / Guardian Information Dossier | `PA-GRD-01` | Yes | Single, Bulk |
| **Student** | KYC | Emergency Contact & Medical Details Record | `PA-EMG-01` | Yes | Single, Bulk |
| **Student** | KYC | Document Submission & Verification Checklist | `PA-DOC-01` | No | Single, Bulk |
| **Parent** | KYC | Parent Consent & Statutory Declaration (DPDP Act 2023) | `PA-DEC-01` | No | Single, Bulk |
| **Student** | Academic | Comprehensive Student Profile Dossier | `PA-PRF-01` | Yes | Single, Bulk |
| **Student** | Academic | Class & Batch Enrollment Confirmation | `PA-ENR-01` | No | Single, Bulk |
| **Student** | Academic | Student Attendance Summary Report | `PA-ATT-01` | No | Single, Bulk |
| **Student** | Academic | Academic Performance Report Card & Marksheet | `PA-REP-01` | No | Single, Bulk |
| **Student** | Fees | Student Fee Statement & Dues Summary | `PA-FEE-01` | No | Single, Bulk |
| **Student** | Fees | Official Fee Payment Receipt | `PA-RCP-01` | No | Single |
| **Student** | Operations | Student Change-of-Details Request Form | `PA-REQ-01` | Yes | Single |
| **Student** | Operations | Course Withdrawal & Transfer Certificate Application | `PA-WDL-01` | No | Single |
| **Staff** | HR | Staff Personal Information & Employment Record | `PA-STF-01` | Yes | Single, Bulk |
| **Staff** | HR | Staff KYC & Employment Document Checklist | `PA-STF-KYC` | Yes | Single, Bulk |
| **Staff** | HR | Staff Qualification & Experience Dossier | `PA-STF-02` | No | Single, Bulk |
| **Staff** | HR | Staff Emergency Contact & Health Record | `PA-STF-EMG` | Yes | Single, Bulk |
| **Staff** | HR | Staff Joining & Appointment Information Form | `PA-STF-JNG` | No | Single |
| **Staff** | HR | Staff Master Profile Dossier | `PA-STF-PRF` | Yes | Single, Bulk |
| **Staff** | HR | Staff Code of Conduct & Confidentiality Declaration | `PA-STF-DEC` | No | Single, Bulk |
| **Parent** | KYC | Parent / Guardian Master Profile | `PA-PRT-01` | Yes | Single, Bulk |
| **Parent** | KYC | Legal Guardianship & Responsibility Affirmation | `PA-PRT-02` | Yes | Single |
| **Parent** | Operations | Parent Contact Details Update Request | `PA-PRT-03` | Yes | Single |
| **Parent** | Operations | Parent / Guardian Authorization & Activity Consent | `PA-PRT-04` | No | Single, Bulk |
| **User** | HR | System User Profile & Access Dossier | `PA-USR-01` | No | Single, Bulk |
| **User** | HR | User Role & Permission Matrix Summary | `PA-USR-02` | No | Single |
| **User** | HR | Account Activation & Access Review Form | `PA-USR-03` | No | Single, Bulk |
| **Operations**| Operations | Bonafide Student Certificate | `PA-CRT-01` | No | Single, Bulk |
| **Operations**| Operations | Document Receipt & Verification Acknowledgment | `PA-ACK-01` | No | Single |
| **Operations**| Operations | General Administrative Change Request Form | `PA-GEN-01` | No | Single |

---

## 3. Implementation Details

### 3.1 Backend Architecture

- **`backend/app/services/form_catalog.py`**:
  Registry defining all 31 forms, statutory codes, versions, regulatory references, required RBAC roles, and default configurable sections.
- **`backend/app/services/form_renderer.py`**:
  Data extraction and normalization engine:
  - Fetches live PostgreSQL entities (`Student`, `Guardian`, `Division`, `Standard`, `AcademicYear`, `FeeStructure`, `Payment`, `Attendance`, `ExamMark`, `StudentDocument`, `User`, `Role`, `Permission`).
  - Implements Aadhaar masking: `mask_aadhaar()` converts `481239841000` to `XXXX-XXXX-1000`.
  - Calculates minor age (< 18) dynamically.
  - Implements `_generate_blank_data()` providing identical layout schemas with blank write-in placeholders and empty checkboxes.
  - Integrates `log_form_audit_event()` recording DPDP audit trails to the `audit_logs` table.
- **`backend/app/api/v1/endpoints/forms.py`**:
  FastAPI router exposing:
  - `GET /api/v1/forms/catalogue`: Catalog query with optional entity/category filters.
  - `GET /api/v1/forms/render/{form_id}`: Single form renderer with RBAC enforcement and section inclusion query params.
  - `POST /api/v1/forms/bulk-render`: Class-level or batch student multi-print resolver.
  - `GET /api/v1/forms/audit-logs`: Audit log viewer restricted to administrators.
- **`scripts/seed_student_kyc_data.py`**:
  Enriched all 39 authoritative students with realistic addresses in Mumbai/Thane, parent details, phone numbers, Aadhaar numbers, and document checklist items.

### 3.2 Frontend Architecture

- **`frontend/src/types/forms.ts`**:
  Strict TypeScript interfaces for `FormCatalogItem`, `RenderedFormPayload`, `RenderedFormData`, and `FormAuditLogItem`.
- **`frontend/src/api/endpoints.ts`**:
  Added `formsApi` providing typed client bindings for catalogue discovery, rendering, bulk exports, and audit logs.
- **`frontend/src/components/forms/FormTemplateEngine.tsx`**:
  Print-perfect A4 component rendering:
  - Institutional crest and header with Institute Code (`PA001`).
  - Title banner, control metadata, date/time, and mode badge.
  - Photo cross-box for physical passport photographs.
  - Dynamic sections: Student/Staff info, Academic allocation, Parent particulars, Emergency contacts, Document verification checklist, Examination marksheet, Fee ledger, and Bonafide certificate body.
  - Dotted guide write-in lines for blank forms.
  - Formal 4-column signature & institutional seal block.
  - Break-inside avoidance preventing awkward page splits.
- **`frontend/src/pages/FormsDocuments.tsx`**:
  Complete master workspace featuring:
  - Mode switchers: Prefilled vs Blank.
  - Scope switchers: Single Record vs Bulk Batch Print.
  - Target record dropdowns for students, staff, standards, and batches.
  - Interactive search and filter pills across entities and categories.
  - Configurable section inclusion checkboxes.
  - Interactive A4 canvas zoom controls (75%, 100%, 125%, reset).
  - Browser print and PDF download buttons.
  - DPDP audit trail modal.
- **Contextual Linkages**:
  - `frontend/src/components/Sidebar.tsx`: Added `Print Forms & KYC` (`/forms`) to secondary navigation.
  - `frontend/src/App.tsx`: Registered `/forms` and `/forms-documents` routes.
  - `frontend/src/pages/StudentDetail.tsx`: Added `Print Form / KYC` button linking to student KYC.
  - `frontend/src/pages/Students.tsx`: Added printer action button in the student table.
  - `frontend/src/pages/Users.tsx`: Added `Print Role & Access` in user action dropdown menu.
  - `frontend/src/pages/Fees.tsx`: Added `Print Fee Statement` button in quick actions.

---

## 4. Verification & Testing

### 4.1 Test Suites Execution Results

```text
============================= Pytest Backend Summary =============================
Directory: backend/tests
Passed:    51 / 51 tests (100%)
New Suite: backend/tests/test_forms_kyc.py (5/5 passed)
Duration:  55.64s

============================= Vitest Frontend Summary =============================
Directory: frontend/src/test
Passed:    59 / 59 tests (100% across 10 test files)
New Suite: frontend/src/test/FormsDocuments.test.tsx (5/5 passed)
Duration:  20.07s

============================= Production Build =============================
Command:   npm run build (tsc && vite build)
Output:    dist/assets/FormsDocuments-CaMVL04m.js (45.98 kB │ gzip: 9.87 kB)
Status:    0 errors, 0 warnings (built in 11.64s)

============================= Source Code Attribution =============================
Script:    python scripts/manage_headers.py check
Checked:   146 / 146 source files
Status:    100% compliant with standard AITDL header format
```

### 4.2 Security & Data Protection Audit Checklist

- [x] **Aadhaar Masking**: Verified in both backend unit tests and frontend rendering tests that Aadhaar numbers display strictly as `XXXX-XXXX-1234`.
- [x] **Zero Password Exposure**: Verified that `hashed_password`, secret tokens, and invite hashes are excluded from API responses and print templates.
- [x] **DPDP Notice for Minors**: Statutory notice under DPDP Act 2023 Section 9 and parental consent clause render on all student and parent KYC forms.
- [x] **Audit Trail Verification**: Verified that generating forms records entries in PostgreSQL `AuditLog` table with user attribution and metadata.
- [x] **Blank Form Layout Integrity**: Verified that blank forms maintain the identical physical layout, grid structure, and signature blocks with dotted manual entry guides.
- [x] **A4 Page Break Handling**: CSS print stylesheet configured with `@page { size: A4 portrait; margin: 10mm; }`, `.page-break-after`, and `.break-inside-avoid`.

---

## 5. Conclusion

The Centralized Printable Forms & KYC System is fully implemented, verified with live database records, compliant with DPDP Act 2023 and CBSE guidelines, and integrated into the Prashant Academy Coaching Institute Management System.
