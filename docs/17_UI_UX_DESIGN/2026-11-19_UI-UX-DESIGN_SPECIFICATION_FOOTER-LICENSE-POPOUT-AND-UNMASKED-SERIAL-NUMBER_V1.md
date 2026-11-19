---
title: "Footer License Popout Modal and Unmasked Serial Number Architecture"
module: "17_UI_UX_DESIGN"
category: "SPECIFICATION"
document_type: "SPECIFICATION"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-19"
updated_date: "2026-11-19"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["licensing", "serial-number", "footer-popout", "customer-support", "security-governance"]
entities: ["License", "Institution", "LicenseDetailsModal", "Footer"]
api_routes: ["/api/v1/license/status", "/api/v1/license-activation"]
related_modules: ["UI/UX Design", "Help & About", "Security & RBAC"]
---

# Footer License Popout Modal and Unmasked Serial Number Architecture

## 1. Executive Summary & Policy Mandate

In coaching institute management operations, technical assistance, warranty verification, and customer care require fast, unambiguous identification of the active software installation. 

When a teacher, administrative clerk, accountant, or institute head contacts **SmritiSys & AITDL Networks** support, they must be able to view and quote the complete **Product Serial Number** without navigating away from their active screen or requesting elevated administrator rights merely to read their account asset tag.

However, modifying, activating, or deactivating the installation carries serious operational risk. Consequently, **PrathamOne EduOS** enforces an asymmetric architectural separation:
1. **Operational Read-Access (Unmasked Serial No. & Registered Identity):** Anyone with access to the institute workspace can open the footer license popout to inspect the unmasked Serial Number and "Registered To" entity details.
2. **Administrative Mutation Governance (Cryptographic Activation / Deactivation):** Any state change (activating, transferring, or deactivating the license) is cryptographically locked, requiring an authenticated Administrator role or OTP challenge-response verified via the registered customer email ID.

---

## 2. Architectural Design & Components

### 2.1 Application Footer Trigger (`Footer.tsx`)
- In both collapsed and expanded states, the application footer retains an accessible trigger labeled `License details`.
- When clicked, rather than navigating away to `/help/version` (which would disrupt unsubmitted workspace forms or transactions), it opens the non-intrusive `LicenseDetailsModal` directly above the active screen.
- Keyboard shortcut `Escape` or clicking the backdrop/close icon instantly dismisses the modal, returning focus to the user's workspace.

### 2.2 Popout License Modal (`LicenseDetailsModal.tsx`)
The popout dialog organizes licensing posture into four functional zones:

1. **Unmasked Serial Number (Support Reference Zone):**
   - High-visibility monospace code box displaying the unmasked Serial Number (e.g. `PRTH-2026-PA001-ACTV-9921`).
   - One-click clipboard copy button with tactile visual feedback (`Copied!`).
   - Support advisory note instructing users to quote this reference code for warranty, updates, and customer service.

2. **Registered On / Whom Metadata ("Whom Details"):**
   - Canonical Institution Name (e.g., `Prashant Academy Coaching Institute`).
   - Registered Customer Email address bound to cryptographic challenge-response.
   - Primary Account Holder / Contact Person.
   - Institute Phone, Branch Identifier, and Registered Physical Campus Address.

3. **Product Posture & Entitlements:**
   - Software edition (`Coaching Institute Edition`) and baseline release version (`v1.0.0`).
   - Verification status badge (`Active Mode` in emerald, `Grace Period` in amber, or `Evaluation Mode` in rose).
   - Validity schedule with dynamic countdown calculation (e.g., `Valid until Dec 31, 2027 (407 days remaining)`).
   - Offline tolerance policy (30-day cryptographic tolerance).

4. **Activation & Deactivation Security Callout:**
   - Explicit advisory clarifying that while the serial number is openly visible for support convenience, license activation and deactivation are restricted to authorized administrators or the registered customer email holder.
   - Dynamic action button: Administrators receive a direct link to `Manage / Activate License` (`/license-activation`), while non-administrators see a locked status badge (`Admin License Lock`).

---

## 3. Backend Endpoint Integration

- The `GET /api/v1/license/status` endpoint was aligned so that authenticated members of the tenant institution receive canonical `registration` metadata alongside the unmasked `serial_number`.
- Sensitive cryptographic keys (e.g., `license.refresh_private_key`, `license.clock_checkpoint`) remain strictly server-side secrets and are never serialized to the client.
- Deactivation (`POST /api/v1/license/deactivate`) and Activation (`POST /api/v1/license/activate`) continue to enforce mandatory `admin` role authorization and email OTP challenge verification.

---

## 4. Verification & Test Evidence

- `frontend/src/test/Footer.test.tsx`: 19/19 tests passing.
- `frontend/src/test/LicenseDetailsModal.test.tsx`: 7/7 tests passing.
- `backend/tests/test_license_service.py`: 18/18 tests passing.
- `python scripts/manage_headers.py check`: 726/726 files 100% compliant.
- `python tools/docs_manager.py validate`: 0 errors, 0 warnings.
