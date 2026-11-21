---
title: "License Authority Refresh Resolution & Installation Identity Forensic Audit"
module: "12_RBAC_SECURITY"
category: "AUDIT-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-22"
updated_date: "2026-11-22"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["licensing", "refresh", "smritisys", "installation_id", "ed25519", "d1", "offline_validity"]
entities: ["LicenseArtifact", "LicenseActivation", "InstallationSetting", "LicenseModeBanner"]
api_routes: ["/api/v1/license/status", "/api/v1/license/refresh", "https://smritisys.com/api/license/refresh"]
related_modules: ["12_RBAC_SECURITY", "13_SYSADMIN_SETTINGS", "16_DATABASE_API"]
---

# License Authority Refresh Resolution & Installation Identity Forensic Audit

## 1. Problem Statement & Root Cause

The client desktop application presented an unexpected warning banner:
> *"License authority is unreachable. The verified snapshot remains usable for up to 7 days after its issue time."*

Investigation confirmed the Cloudflare Pages authority (`https://smritisys.com/api/license/refresh`) and Cloudflare D1 database (`smritisys-db`) were healthy, operational, and responding to HTTP requests.

### Forensic Finding: Installation ID Mutation
1. **Registered Activation Identity:** During initial online license activation, the client installation identity was registered as `d6a17233-68c3-49dc-8be8-783961a931c0` in both local `license.installation_id` and the remote `license_activations` table in D1.
2. **Context Overwrite:** In `backend/app/api/v1/endpoints/license.py::_load_license_context`, the return dictionary mapped:
   ```python
   "installation_id": current_hw_fingerprint # Output: "PRATHAM-789F-CEBC-0916-6315"
   ```
   instead of preserving the canonical registered installation ID (`payload_inst_id` / `installation_setting.value`).
3. **Mismatched Signature & Rejection:** When `_refresh_license_if_due` built the signed refresh request, it signed with `installation_id = "PRATHAM-..."` while `smritisys.com` verified against the registered `installation_id = "d6a17233-..."`. The authority rejected the request with HTTP 400: `{"ok":false,"error":"The signed refresh request is invalid or expired"}`.
4. **Hardcoded Fallback Text:** In `LicenseModeBanner.tsx`, the fallback duration was hardcoded to `7 days`, whereas the authoritative snapshot payload and D1 database specify `offline_validity_days: 14`.

---

## 2. Engineering Solution

### 2.1 Backend Canonical Identity Resolution (`license.py`)
In `_load_license_context`:
```python
"installation_id": payload_inst_id or (installation_setting.value if installation_setting else current_hw_fingerprint),
"hardware_fingerprint": current_hw_fingerprint,
```
The client now accurately signs the refresh payload with the canonical registered `installation_id` recognized by `smritisys-db`.

### 2.2 Live Refresh Validation
Executing live refresh against `https://smritisys.com/api/license/refresh`:
- **HTTP Status:** `200 OK`
- **Response:** Received fresh Ed25519-signed artifact snapshot (`issued_at: 2026-11-21T20:21:33.975Z`).
- **Local Context:** `mode: active`, `refresh_status: up_to_date`.
- **UI State:** Banner successfully dismissed.

### 2.3 Dynamic Offline Grace Representation (`LicenseModeBanner.tsx`)
Replaced hardcoded 7-day text with:
```typescript
`License authority is unreachable. The verified snapshot remains usable for up to ${data.offline_validity_days || 14} days after its issue time.`
```

---

## 3. Verification & Compliance
- [x] Live signed refresh verified with `https://smritisys.com/api/license/refresh` -> HTTP 200 OK.
- [x] License context reports `mode: active` and `refresh_status: up_to_date`.
- [x] License banner properly hidden when active and up-to-date.
- [x] 100% Header compliance across all modified files.
- [x] Release hygiene passed with 0 violations (173.25 MB distribution payload).
