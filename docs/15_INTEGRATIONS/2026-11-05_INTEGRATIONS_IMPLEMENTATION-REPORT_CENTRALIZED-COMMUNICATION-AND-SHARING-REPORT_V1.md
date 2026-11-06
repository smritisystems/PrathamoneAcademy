---
title: "Centralized Communication & Sharing Module — Engineering Report"
module: "15_INTEGRATIONS"
category: "IMPLEMENTATION-REPORT"
document_type: "IMPLEMENTATION-REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-05"
updated_date: "2026-11-05"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["15-integrations", "implementation-report"]
entities: []
api_routes: ["/api/v1/communication"]
related_modules: []
---

# Centralized Communication & Sharing Module — Engineering Report

**Project**: PrathamOne Academy Coaching Institute Management System  
**Organization**: AITDL (AI Technology & Development Lab)  
**Lead Architect & Author**: Jawahar R. Mallah  
**Client**: Prashant Academy Coaching Institute  
**Release Date**: November 5, 2026  
**Module Version**: v1.0.0  

---

## 1. Executive Summary

A comprehensive, enterprise-grade **Communication & Sharing Module** has been implemented across the full stack of **PrathamOne Academy – Coaching Institute Management System**.

The module delivers two tightly coupled core capabilities:
1. **Universal Share Action (`ShareModal.tsx`)**: An interactive, security-governed modal allowing authorized institute staff to instantly share official documents (A5 fee receipts, payment confirmations, student academic profiles, report cards, fee statements, and forms) across **WhatsApp** (wa.me web & mobile protocol), **Email** (SMTP / HTML templates), **SMS** (DLT entity header `PRATHM`), **Expiring Access-Controlled Secure Links** (`/shared/doc/:token` with optional 4-digit PIN protection), **PDF Download**, and **Browser Print**.
2. **Communication Center (`/communication`)**: A unified messaging hub providing:
   - **Compose & Send Workspace**: Multi-channel broadcast & targeted messaging to students, parents, staff, classes, batches, or custom destinations, supporting template auto-fill, dynamic placeholder token chips (`{student_name}`, `{parent_name}`, `{amount}`, `{receipt_no}`, etc.), and optional scheduled dispatch.
   - **Message Templates Catalogue**: Centralized repository of pre-seeded and custom message templates with channel bindings (`WHATSAPP`, `EMAIL`, `SMS`, `ALL`), category classifications, placeholder extraction, and CRUD controls.
   - **Delivery History & Queue**: Granular transaction logs recording channel, recipient identity, destination, dispatch status (`SENT`, `PENDING`, `FAILED`, `CANCELLED`), error reasons, provider reference IDs, retry counters, and 1-click retry.
   - **Channels & Diagnostics**: Interactive diagnostic health checks for WhatsApp Web/Meta Cloud API, SMTP email gateway, MSG91 SMS gateway, and active secure document links, accompanied by an interactive diagnostic ping test utility.

---

## 2. Architecture & Data Model

### A. Database Migration (`012_communication_and_sharing.py`)
Three new relational tables were created under Alembic revision `012` with complete foreign key integrity, cascade options, and indices:

1. **`message_templates`**:
   - `id`: Primary key
   - `institution_id`: Foreign key to `institutions.id` (Tenant isolation)
   - `name`: Human-readable template title (e.g. "Fee Payment Receipt Notice")
   - `code`: Unique template identifier (e.g. `PAYMENT_RECEIPT`, `FEE_REMINDER`)
   - `category`: Classification tag (`PAYMENT_RECEIPT`, `FEE_REMINDER`, `FEE_OVERDUE_ALERT`, `ATTENDANCE_ABSENCE`, `EXAM_RESULT`, `ADMISSION_CONFIRMATION`, `GENERAL_ANNOUNCEMENT`, `STAFF_NOTICE`)
   - `channel`: Bound channel (`WHATSAPP`, `EMAIL`, `SMS`, `ALL`)
   - `subject`: Optional email or document subject
   - `body`: Message text supporting dynamic token syntax `{placeholder}`
   - `placeholders`: JSON list of extracted placeholders
   - `is_system`: Boolean flag preventing accidental deletion of core templates
   - `is_active`: Soft-enable/disable toggle

2. **`communication_logs`**:
   - `id`: Primary key
   - `institution_id`: Multi-tenant boundary
   - `channel`: Channel used (`WHATSAPP`, `EMAIL`, `SMS`)
   - `recipient_type`: Recipient entity (`STUDENT`, `PARENT`, `STAFF`, `CLASS`, `BATCH`, `CUSTOM`)
   - `recipient_id`: Optional entity ID
   - `recipient_name`: Cached display name
   - `recipient_destination`: Mobile phone or email address
   - `subject`: Message subject if applicable
   - `message_body`: Full rendered message payload
   - `status`: Delivery status (`SENT`, `PENDING`, `FAILED`, `CANCELLED`)
   - `error_message`: Detailed error traceback if failed
   - `provider_message_id`: Gateway/carrier reference ID
   - `retry_count`: Automatic and manual retry attempt counter
   - `scheduled_at` / `sent_at`: Timestamps

3. **`shared_document_tokens`**:
   - `id`: Primary key
   - `institution_id`: Multi-tenant isolation
   - `token`: Cryptographically secure URL-safe token (UUID hex)
   - `document_type`: Type of shared asset (`RECEIPT`, `REPORT_CARD`, `FEE_STATEMENT`, `STUDENT_PROFILE`, `ATTENDANCE_SUMMARY`, `STAFF_DOCUMENT`, `FORM`)
   - `record_id`: Target database record ID
   - `recipient_name`, `recipient_phone`, `recipient_email`: Intended recipient metadata
   - `access_pin`: Optional 4-6 digit numeric PIN required for document unlocking
   - `expires_at`: Strict auto-expiration timestamp (24 hours, 72 hours, 7 days, or 30 days)
   - `access_count` & `last_accessed_at`: Audit access counters

### B. Backend Services & REST APIs
- **`backend/app/services/communication.py`**:
  - `resolve_placeholders(text, variables)`: Regex-based dynamic placeholder interpolation.
  - `generate_whatsapp_web_url(phone, message)`: Generates compliant `https://wa.me/<e164_phone>?text=<encoded_payload>` URLs.
  - `generate_secure_share_token(...)`: Generates cryptographic document tokens with configurable TTL and PIN hashes.
  - `ChannelAdapter`: Modular driver layer providing simulated and live dispatch adapters for WhatsApp, Email (SMTP), and SMS (DLT header `PRATHM`).
- **`backend/app/api/v1/endpoints/communication.py`**:
  - `GET /templates` & `POST /templates`: Template listing and creation with role protection.
  - `PUT /templates/:id` & `DELETE /templates/:id`: Template modification and deactivation.
  - `POST /share/document`: Generates expiring secure links and WhatsApp share payloads.
  - `GET /shared/document/:token`: Public/unauthenticated endpoint for resolving shared documents (with PIN challenge verification).
  - `POST /send`: Unified multichannel message dispatch endpoint.
  - `GET /recipients/search`: Recipient directory lookup filtering across students, guardians, and staff.
  - `GET /logs`: Paginated delivery history logs filterable by channel, status, and search query.
  - `POST /logs/:id/retry`: Instant retry for failed or undelivered dispatches.
  - `GET /diagnostics` & `POST /diagnostics/test`: Real-time gateway status checks and interactive diagnostic ping.

---

## 3. Frontend Implementation

### A. Universal Share Action Modal (`frontend/src/components/ShareModal.tsx`)
A responsive, tabbed sharing component embedded across:
1. **Official Fee Receipts (`PaymentReceiptView.tsx`)**: "Share Receipt" action button.
2. **Payments Transaction Table (`Payments.tsx`)**: "Share" row action button for every completed payment.
3. **Student Profiles (`StudentDetail.tsx`)**: "Share Profile" header action button.

Features:
- **WhatsApp Web & App Integration**: Auto-formats recipient phone number (adds Indian country code `91` if 10 digits), creates structured receipt/profile summary, and launches WhatsApp Web (`wa.me`) or mobile app.
- **Email Dispatch**: Direct dispatch with recipient pre-fill, custom subject, and full message payload.
- **SMS Gateway**: Character counter with multi-part estimation and DLT principal entity tag (`PRATHM`).
- **Expiring Secure Link**:
  - Configurable expiration periods: 24 Hours (1 Day), 72 Hours (3 Days), 7 Days (1 Week - Recommended), 30 Days (1 Month).
  - Optional 4-6 digit security PIN lock.
  - 1-click clipboard copy with visual checkmark feedback.
  - Automatic link regeneration.
- **Direct PDF & Print Actions**: Native triggers for thermal/laser printing and document downloading.
- **Native Device Share**: Falls back to `navigator.share` on supported mobile browsers.

### B. Communication Center Workspace (`frontend/src/pages/Communication.tsx`)
A dedicated master workspace accessible at `/communication` and integrated into the primary sidebar navigation:
- **Tab 1: Compose & Send**:
  - Channel selector buttons: `WhatsApp`, `Email`, `SMS`, `All Channels`.
  - Recipient picker with filterable categories (`All`, `Students`, `Parents`, `Staff`) and instant search.
  - Selected recipient badge cloud with removal controls and total recipient counter.
  - Quick-fill template selector that populates subject and body.
  - Dynamic placeholder chip bar (`+{student_name}`, `+{parent_name}`, `+{amount}`, `+{receipt_no}`, etc.) that inserts tokens at cursor position.
  - Live message preview card displaying dynamic rendering as viewed by recipients.
  - Date/time picker for scheduling future deliveries.
  - Safety confirmation modal before executing bulk broadcasts.
- **Tab 2: Message Templates**:
  - Grid catalogue of active templates with category pills and channel tags.
  - Search filter by title, code, or body text.
  - "New Template" modal with category selection and automatic token extraction.
  - Edit and delete/deactivate actions with system template protection.
- **Tab 3: Delivery History & Queue**:
  - Real-time tabular log displaying Timestamp, Channel badge, Recipient info, Destination, Message snippet, and Status badge.
  - Status filters: `ALL`, `SENT`, `PENDING`, `FAILED`, `CANCELLED`.
  - Channel filters: `ALL`, `WHATSAPP`, `EMAIL`, `SMS`.
  - Search box for recipient name, phone, or message body.
  - Detailed message view dialog showing payload, provider response, and delivery errors.
  - Instant retry action button for failed deliveries.
- **Tab 4: Channels & Diagnostics**:
  - Real-time health cards for WhatsApp Web, SMTP Gateway, SMS Gateway, and Expiring Document Tokens.
  - Interactive "Test Dispatch" tool allowing administrators to fire diagnostic test pings to their own phone number or email address.

---

## 4. Verification & Testing

### A. Backend Pytest Test Suite
All backend tests passed with zero failures:
```
============================= test session starts ==============================
collected 65 items
tests/test_academic_module_deep.py ......                                [  9%]
tests/test_academic_workspace.py ...                                     [ 13%]
tests/test_board_class_structure.py ...                                  [ 18%]
tests/test_communication.py ....                                         [ 24%]
tests/test_dashboard.py .                                                [ 26%]
tests/test_fee_register_import.py .sss                                   [ 32%]
tests/test_forms_kyc.py .....                                            [ 40%]
tests/test_import_export.py .....                                        [ 47%]
tests/test_payments.py ...........                                       [ 64%]
tests/test_settings.py ....                                              [ 70%]
tests/test_student_count_reconciliation.py ..                            [ 73%]
tests/test_student_portal.py .....                                       [ 81%]
tests/test_student_profile_edit.py ....                                  [ 87%]
tests/test_sysadmin_and_staff.py ....                                    [ 93%]
tests/test_user_management.py ....                                       [100%]
============= 62 passed, 3 skipped, 2 warnings in 60.17s =============
```

### B. Frontend Vitest Test Suite
All 20 frontend test files passed with zero failures:
```
 ✓ src/test/FormsDocuments.test.tsx  (5 tests)
 ✓ src/test/AcademicWorkspace.test.tsx  (10 tests)
 ✓ src/test/Settings.test.tsx  (9 tests)
 ✓ src/test/ReceiptPrint.test.tsx  (7 tests)
 ✓ src/test/FeesModule.test.tsx  (8 tests)
 ✓ src/test/UserProfile.test.tsx  (5 tests)
 ✓ src/test/ImportExport.test.tsx  (4 tests)
 ✓ src/test/Communication.test.tsx  (5 tests)
 ✓ src/test/ExcelReportGrid.test.tsx  (6 tests)
 ✓ src/test/StudentProfileEdit.test.tsx  (7 tests)
 ✓ src/test/Footer.test.tsx  (9 tests)
 ✓ src/test/PWAInstall.test.tsx  (9 tests)
 ✓ src/test/Users.test.tsx  (3 tests)
 ✓ src/test/PrintDocumentBranding.test.tsx  (5 tests)
 ✓ src/test/ShareModal.test.tsx  (4 tests)
 ✓ src/test/Branding.test.tsx  (8 tests)
 ✓ src/test/ConsoleBanner.test.ts  (4 tests)
 ✓ src/test/StudentPortal.test.tsx  (4 tests)
 ✓ src/test/Badge.test.tsx  (3 tests)

 Test Files  20 passed (20)
      Tests  130 passed (130)
   Duration  41.46s
```

### C. Source Code Attribution Headers
```
[CHECK] Verifying source-code attribution headers on 201 file(s)...
Total checked: 201
Passed:        201
Failed:        0
[PASS] All source files satisfy attribution and header compliance rules!
```

### D. Production Container Build
Both frontend and backend containers were rebuilt and are healthy:
- `prashant_academy_backend`: Up (healthy) on port `8000`
- `prashant_academy_db`: Up (healthy) on port `5432`
- `prashant_academy_frontend`: Up on ports `80` & `5173`
