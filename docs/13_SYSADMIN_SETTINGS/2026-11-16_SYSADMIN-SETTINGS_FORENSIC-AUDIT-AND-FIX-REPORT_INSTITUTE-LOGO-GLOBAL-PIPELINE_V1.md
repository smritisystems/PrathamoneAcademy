---
title: "Global Institution Logo Pipeline Forensic Audit & Unification Report"
module: "13_SYSADMIN_SETTINGS"
category: "FORENSIC-AUDIT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-16"
updated_date: "2026-11-16"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["branding", "logo", "institution-settings", "login", "sidebar", "header", "printing", "pdf"]
entities: ["Institution", "InstitutionSetting"]
api_routes: ["/api/v1/institutions/public/branding", "/api/v1/settings/profile", "/api/v1/payments/receipts/{id}/pdf"]
related_modules: ["09_FEES_PAYMENTS", "14_PRINTING_DOCUMENTS", "17_UI_UX_DESIGN"]
---

# Global Institution Logo Pipeline Forensic Audit & Unification Report

## 1. Executive Summary

A forensic audit was performed to resolve the critical defect where updating or assigning a custom institution/academy logo in Institute Settings did not propagate across:
1. **Login Window (`Login.tsx`)**: Did not reflect custom branding on desktop or mobile authentication views.
2. **Sidebar (`Sidebar.tsx`)**: The logo failed permanently upon any initial loading exception and retained obsolete exclusion rules.
3. **Header Section (`Layout.tsx`)**: The top application bar displayed an institution dropdown without the active institution's visual emblem.
4. **Settings Workspace (`Settings.tsx`)**: The logo picker selector displayed raw initials (`PA`) rather than a live preview of the current logo.
5. **Print Documents & PDFs (`receipt_pdf_service.py`, `PrintDocumentBranding.tsx`, `PaymentReceiptView.tsx`)**: Hardcoded overrides forced default crests for Institution ID 1, ignored base64 data URIs, and lacked fallback path discovery across environments.

All 5 core layers have been comprehensively debugged, refactored, and synchronized.

---

## 2. Root Cause Analysis & Rectifications

### 2.1 Login Window (`frontend/src/pages/Login.tsx`)
- **Root Cause**: The left presentation showcase panel contained a hardcoded academic crest SVG (book + flame line-art) that never evaluated `branding.assets.logoUrl`. Furthermore, the right authentication card lacked an institution header.
- **Resolution**:
  - Replaced hardcoded SVG crest with reactive `<img src={branding.assets.logoUrl} ... />` with fallback to dynamic institute monogram.
  - Added dynamic institution identity badge directly above the "Welcome back" card in the authentication pane.
  - Added `logoLoadFailed` state that automatically resets whenever `branding.assets.logoUrl` changes.

### 2.2 Global Branding Resolution (`frontend/src/config/branding.ts`)
- **Root Cause**: Lines 350–355 contained a hardcoded filter `!activeInstitution.logo_url.includes('prashant-academy')` which silently discarded valid logo URLs and fell back to the symbol icon. Additionally, there was no normalization for relative vs absolute paths or instant cache hydration.
- **Resolution**:
  - Implemented `normalizeLogoUrl(url)` handling data URIs, absolute URLs, and relative paths.
  - Removed all obsolete exclusion filters.
  - Added instant localStorage fallback cache hydration during pre-fetch cold starts.

### 2.3 Sidebar (`frontend/src/components/Sidebar.tsx`)
- **Root Cause**: An image loading error once set `logoLoadFailed` to `true` permanently with no `useEffect` hook to reset state when settings changed or when an institution was switched.
- **Resolution**: Added `useEffect(() => { setLogoLoadFailed(false) }, [branding.assets.logoUrl])`.

### 2.4 Top Header Bar (`frontend/src/components/Layout.tsx`)
- **Root Cause**: The top `<header>` only contained a text `<select>` dropdown without displaying the active institution's visual brand emblem.
- **Resolution**: Integrated an active institution badge icon displaying the active institution's logo immediately adjacent to the selector, complete with error resilience.

### 2.5 Settings Profile Workspace (`frontend/src/pages/Settings.tsx`)
- **Root Cause**: The Logo and Favicon picker preview boxes rendered static monogram text `{profile.short_name || 'PA'}` instead of previewing `profile.logo_url`.
- **Resolution**: Updated preview boxes to render `<img src={profile.logo_url} ... />` and `<img src={profile.favicon_url} ... />` with smooth object-contain styling, and added global storage synchronization dispatch on save.

### 2.6 High-Fidelity PDF & Print Subsystems (`receipt_pdf_service.py` & `PrintDocumentBranding.tsx`)
- **Root Cause**:
  - In `receipt_pdf_service.py`, lines 58–60 enforced `or inst_id == 1 or "prashant" in inst_name`, permanently forcing the default crest PNG regardless of custom logos.
  - Path search did not account for base64 data URIs or the actual workspace parent hierarchy.
  - In `PrintDocumentBranding.tsx`, `const logoUrl = institution?.logo_url` did not fall back to `globalBranding.assets.logoUrl`.
- **Resolution**:
  - Implemented `_resolve_logo_renderable(inst)` supporting filesystem paths, decoded base64 data URIs, and vector SVG rasterization via PyMuPDF (`fitz`).
  - Removed all hardcoded institution ID checks.
  - Updated `PrintDocumentBranding.tsx` with unified fallback and reactive error reset.

---

## 3. Verification & Test Evidence

- **Frontend Build**: `npm run build` compiled clean in 6.47s with zero TypeScript errors.
- **Unit & Regression Tests**:
  - `src/test/PrintDocumentBranding.test.tsx` (10/10 passed)
  - `src/test/PrintFooterAndGovernance.test.tsx` (10/10 passed)
  - `src/test/ReceiptPrint.test.tsx` (21/21 passed)
- **PyMuPDF Service Engine**: Verified generation of high-fidelity A5 receipts with custom image paths and base64 streams.
- **Docker Stack**: Fully rebuilt and healthy (`prashant_academy_backend`, `prashant_academy_frontend`, `prashant_academy_db`).
- **Corporate Attribution**: 637 of 637 files passed 100% compliance via `scripts/manage_headers.py check`.
