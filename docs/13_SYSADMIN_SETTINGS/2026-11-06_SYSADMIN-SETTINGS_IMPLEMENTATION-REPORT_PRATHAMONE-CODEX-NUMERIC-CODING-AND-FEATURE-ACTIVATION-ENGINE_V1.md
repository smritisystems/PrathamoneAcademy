---
title: "PrathamOne CodeX — Implementation Report & Verification Summary"
module: "13_SYSADMIN_SETTINGS"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-06"
updated_date: "2026-11-06"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["codex", "numeric-coding", "feature-activation", "sysadmin", "settings", "security"]
entities: ["CodexConfig", "CodexMappingProfile", "CodexMappingVersion", "CodexScopeAssignment", "CodexAuditLog", "CodexTemporaryToken"]
api_routes: ["/api/v1/codex/config", "/api/v1/codex/profiles", "/api/v1/codex/scopes", "/api/v1/codex/encode", "/api/v1/codex/decode", "/api/v1/codex/generate-qr", "/api/v1/codex/audit-logs", "/api/v1/codex/user-status"]
related_modules: ["13_SYSADMIN_SETTINGS", "06_TEACHER_PAYROLL", "09_FEES_PAYMENTS", "12_RBAC_SECURITY"]
---

# PRATHAMONE CodeX — Configurable Feature Activation & Numeric Coding Engine
## Technical Implementation & Verification Report

**Product:** PrathamOne EduOS / Business Software  
**Module:** CodeX — Optional Business Configuration Capability  
**Specification Baseline:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Policy Status:** FULLY IMPLEMENTED, VERIFIED & ENFORCED  

---

## 1. EXECUTIVE SUMMARY

The **PRATHAMONE CodeX** engine has been fully designed, engineered, migrated, and verified as a native, reusable, cross-cutting business capability within **PrathamOne EduOS**.

### Mandatory Default Policy Enforced
```text
CODEX_SYSTEM_DEFAULT = DISABLED
CODEX_AUTO_ACTIVATION = FALSE
CODEX_NEW_BUSINESS_DEFAULT = DISABLED
CODEX_NEW_USER_DEFAULT = DISABLED
CODEX_AUTO_ENABLE_ON_UPDATE = FALSE
CODEX_AUTO_ENABLE_ON_INSTALL = FALSE
```
- **Strict Opt-in Behavior:** The system boots with CodeX completely dormant and inactive (`is_master_enabled = False`).
- **Zero Disruption to Core Workflows:** When disabled, all canonical financial, salary, fee, and academic numbers are presented normally without alteration or obfuscation.
- **SSOT Integrity Preserved:** Database models retain authentic numerical formats (`NUMERIC(12,2)` / `FLOAT`). CodeX acts as an authorized presentation and obfuscation layer governed by multi-tier scope resolution.

---

## 2. DELIVERABLES SUMMARY

### 2.1 Backend Architecture & Database Migrations (Phase 2)
6 normalized tables and 10 indexes created in PostgreSQL (`prashant_academy_db`):
1. `codex_configs`: Singleton per institution enforcing `is_master_enabled: False` default, 16 independent feature toggles, hashed PIN, and decoder rate-limiting.
2. `codex_mapping_profiles`: Bijective digit-to-symbol mapping dictionaries (defaulting to AITDL standard: `0:Q, 1:A, 2:Z, 3:M, 4:K, 5:P, 6:X, 7:B, 8:T, 9:R`).
3. `codex_mapping_versions`: Immutable historical version snapshots ensuring backward compatibility for legacy printed receipts, QR codes, and vouchers.
4. `codex_scope_assignments`: Multi-tier access override matrix across business, department, role, and individual user.
5. `codex_audit_logs`: Tamper-evident append-only ledger tracking activations, deactivations, mapping changes, and decoding attempts.
6. `codex_temporary_tokens`: Ephemeral time-limited tokens for QR scanning and mobile PIN decoding.

### 2.2 Core Domain Services (Phase 3)
Implemented in `backend/app/services/codex_service.py`:
- `validate_digit_map`: Enforces exactly 10 distinct, non-empty, single symbols for digits 0–9. Rejects duplicates and collisions.
- `encode_numeric_value`: Reversible conversion of integers, decimals (`1250.75` $\rightarrow$ `CX-AZPQ.BP`), negatives (`-500` $\rightarrow$ `-CX-PQQ`), with configurable prefixes and suffixes.
- `decode_coded_value`: Exact reversal reconstructing numbers from coded strings with strict symbol validation.
- `resolve_scope`: Enforces 6-tier precedence hierarchy ($\text{Security Policy} \rightarrow \text{System Default} \rightarrow \text{Business Default} \rightarrow \text{Department} \rightarrow \text{Role} \rightarrow \text{User Override}$).
- `verify_pin`: Secure SHA-256 PIN authorization for decoder operations.

### 2.3 REST API Endpoints (Phase 4)
Mounted under `/api/v1/codex` in `backend/app/api/v1/router.py`:
- `GET /api/v1/codex/config`: Read configuration and active profile status.
- `PUT /api/v1/codex/config`: Update master toggle, 16 feature switches, PIN, and timeouts (Owner/Admin restricted).
- `GET /api/v1/codex/profiles`: List mapping profiles.
- `POST /api/v1/codex/profiles`: Create new custom mapping profile.
- `PUT /api/v1/codex/profiles/{id}`: Update profile with automatic version increment and snapshot archiving.
- `GET /api/v1/codex/profiles/{id}/versions`: Retrieve immutable version history.
- `POST /api/v1/codex/profiles/{id}/rollback/{version}`: Single-click rollback to any historical version.
- `GET /api/v1/codex/scopes` & `POST /api/v1/codex/scopes`: Manage scope overrides.
- `DELETE /api/v1/codex/scopes/{id}`: Delete scope override.
- `POST /api/v1/codex/encode`: Live testing / on-demand encoding.
- `POST /api/v1/codex/decode`: Authorized decoding with PIN verification and audit logging.
- `POST /api/v1/codex/generate-qr`: Issue ephemeral QR payload tokens.
- `GET /api/v1/codex/audit-logs`: Searchable security audit feed.
- `GET /api/v1/codex/user-status`: Returns resolved CodeX visibility mode for requesting user.

### 2.4 Frontend UI & Configuration Studio (Phase 5)
- **`frontend/src/pages/CodeXStudio.tsx`:** Full-page studio accessible via `/codex` featuring 11 specialized panels:
  1. *General Settings:* Master ON/OFF toggle, Emergency Kill-Switch, Precedence flowchart.
  2. *Activation Scope:* Multi-tier scope matrix with override manager.
  3. *Feature Options:* 16 independent switches organized into Numeric Coding, Value Visibility, Distribution, and Business Applications.
  4. *Mapping Profile Studio:* Interactive 0–9 keypad symbol mapper with instant collision detection, prefix/suffix settings, and version rollback.
  5. *Module & Field Binding:* Controls for payroll salary, hourly rate, fee structures, and discounts.
  6. *Role & Department Rules:* Matrix configuring visibility mode (`Actual`, `Coded`, `Both`, `Hidden`).
  7. *User Assignments:* Specific user overrides.
  8. *Decoder Security & PIN:* PIN setup, session timeout, rate-limiting limits.
  9. *Expiry & Access Rules:* Token lifetimes and sharing rules.
  10. *Configuration History:* Live audit logs table.
  11. *Live Preview & Sandbox:* Bidirectional live encoder/decoder with QR code simulation.
- **`frontend/src/components/codex/QuickDecoderModal.tsx`:** On-demand decoder modal accessible from toolbar.
- **`frontend/src/components/Sidebar.tsx`:** Added CodeX Studio link under Sysadmin navigation for authorized roles.
- **`frontend/src/pages/Settings.tsx`:** Added CodeX Configuration Studio category and quick launch card.

---

## 3. VERIFICATION & QUALITY ASSURANCE AUDIT (PHASE 6)

1. **Unit & Engine Tests:**
   - Executed `pytest tests/test_codex_engine.py`: **4 passed in 3.87s**.
   - Validated bijectivity, duplicate symbol rejection, decimal/negative handling, PIN hashing.
2. **REST API Integration Tests:**
   - Executed `pytest tests/test_codex_api.py`: **1 passed in 4.03s**.
   - Verified default `is_master_enabled: False`, live encode, live decode, and user status endpoints.
3. **TypeScript Compilation:**
   - Executed `tsc --noEmit`: **0 errors**.
   - Production Vite build: **Built in 13.39s (2318 modules transformed, 0 warnings)**.
4. **End-to-End Playwright Automation:**
   - Script `verify_codex_studio.py` completed with **0 console errors**.
   - Verified default `Disabled (OFF)` status badge.
   - Verified navigation to Mapping Studio and keypad rendering.
   - Verified live encoding (`1250` $\rightarrow$ `CX-AZPQ`).
   - Verified live decoding (`CX-AZPQ` $\rightarrow$ `₹ 1,250.00`).
   - Verified on-demand decoder modal.
   - Captured 3 artifacts:
     - `codex_configuration_studio.png`
     - `codex_mapping_studio.png`
     - `codex_sandbox_testing.png`
5. **Attribution & Header Enforcement:**
   - `python scripts/manage_headers.py check`: **289 of 289 files passed (100% compliance)**.

---

## 4. ARCHITECTURAL SIGN-OFF

The implementation satisfies all requirements of the **PRATHAMONE CodeX** directive. The capability is deployed in production-ready state, disabled by default, and ready for explicit business configuration.

