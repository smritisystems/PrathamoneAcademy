---
title: "Unified Software Licensing and IP Protection — Phase 1 Audit"
module: "20_AUDITS_COMPLIANCE"
category: "AUDIT-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-14"
updated_date: "2026-11-14"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Draft"
tags: ["licensing", "security-audit", "ip-protection", "activation", "threat-model"]
entities: ["License", "Activation", "Entitlement", "LicenseEvent", "User"]
api_routes: []
related_modules: ["01_ARCHITECTURE", "12_RBAC_SECURITY", "13_SYSADMIN_SETTINGS", "16_DATABASE_API", "18_TESTING_QA"]
---

# Unified Software Licensing and IP Protection — Phase 1 Audit

**Audit date:** 2026-11-14  
**Products in scope:** PrathamOne EduOS and SMRITI Retail OS  
**Control-plane candidate:** `F:\SMRITI\websites\smritisys-ui`  
**Review type:** Read-only repository review; no exploit reproduction or production access

## 1. Executive summary

The repositories contain license metadata, activation/entitlement records, and permission-scoped management APIs, but the reviewed product code does not demonstrate a product-side connection that verifies licenses issued by the proposed control plane. PrathamOne EduOS exposes license status and validity as Help & About metadata. SMRITI Retail OS accepts license-related setup values, but the reviewed paths do not establish general product or module enforcement from those values. This is a material gap against the requested centralized licensing and IP-protection objective.

The review also confirmed two concrete security issues: fixed administrator credentials are included in PrathamOne installation paths, and SMRITI Retail OS initial setup does not require SYSADMIN authorization before accepting company and license configuration.

The `smritisys-ui` repository is a plausible control-plane starting point, with license, customer, entitlement, activation, and event data structures and permission-scoped APIs. Its presence does not establish that it is deployed, that its data is authoritative in production, or that its product integrations and signing infrastructure exist.

No files were changed in the three audited repositories as part of the security review. This report is evidence for an architecture proposal, not authorization to make structural or deployment changes.

## 2. Scope and limitations

Reviewed repositories:

- PrathamOne EduOS: `F:\PrashantAcademy`
- SMRITI Retail OS checkout discovered in the workspace: `F:\SMRITRretailNX`
- Licensing control-plane candidate provided by the product owner: `F:\SMRITI\websites\smritisys-ui`

The review focused on licensing, activation, authentication/authorization, setup, install/update, relevant database structures, and deployment configuration. It was read-only and did not connect to production services.

The following could not be established:

- Whether the website or either product repository is deployed, or whether deployed code matches these checkouts.
- Whether default credentials have been changed on any installed customer system.
- Values in ignored `.env` files, cloud-hosted secrets, production database contents, or external services not represented in these repositories.
- Whether installer/update releases are signed and verified in the actual distribution pipeline.
- Whether signing keys, a KMS/HSM, or a verifier exist outside the reviewed repositories.

## 3. Evidence-based findings

### F-01 — Fixed credentials are present in PrathamOne installation paths

**Severity:** High  
**Confidence:** 9/10

`docker-compose.yml` ran `backend/seed.py`, which created administrator and accountant accounts with fixed passwords. `install.sh` and `install.ps1` printed those defaults. The Login page's Quick Access Profiles were gated by `import.meta.env.DEV`, so production exposure through that UI was not confirmed. No enforced first-login password rotation was identified in the reviewed paths.

**Impact:** A fresh reachable installation that retains those credentials can be accessed using publicly known values; the installer also disclosed the accounts and passwords in its output.

**Recommended containment:** Remove fixed credentials from production seed/install paths, provision unique administrator credentials through a secure bootstrap flow, rotate any existing seeded credentials, and avoid universal credentials in development examples. Preserve the existing development-only UI boundary.

### F-02 — Initial Retail OS setup lacks a SYSADMIN authorization check

**Severity:** Medium  
**Confidence:** 8/10

`backend/app/api/v1/system.py` requires an authenticated user for `/company/setup`, but the SYSADMIN role check is only applied when setup is already marked complete. Before that marker exists, an authenticated non-SYSADMIN can run setup. The request accepts license status/type and expiry and persists them as system configuration; the schema validates allowed string values and date syntax, not that those values were issued by an authorized licensing authority.

**Impact:** An authenticated user with a lower role may control initial company configuration and populate license-related metadata without proof of authority.

**Recommended containment:** Require SYSADMIN for initial and subsequent setup. Treat license state and entitlements as authority-issued, cryptographically verifiable data, not user-editable setup fields.

### F-03 — Product-side verification of centrally managed licenses is not demonstrated

**Severity:** Medium  
**Confidence:** 9/10

In PrathamOne EduOS, `backend/app/services/help_service.py` derives the displayed license verification status from the presence of a validity value; `frontend/src/components/help/ProductVersionSection.tsx` presents the status and validity. The reviewed paths do not show signature verification or general product-access enforcement.

In SMRITI Retail OS, setup persists license-related values in `backend/app/api/v1/system.py`. The searched runtime references did not establish general enforcement of those values. A fail-closed entitlement check exists for the scoped DataBridge capability, but this is not evidence of centralized license verification across the product.

The control-plane candidate has license-related tables in `migrations/0003_license_control_plane.sql` and permission-scoped APIs in `functions/api/[[path]].js`. The reviewed product checkouts did not show a verifier/client integrating with those APIs.

**Impact:** Control-plane license records are not shown to prevent a modified or unlicensed product installation from operating. Metadata displayed to an administrator is not a cryptographic entitlement.

**Recommended containment:** Add server-side verification and entitlement enforcement to both products, after designing a migration-safe rollout and offline/grace behavior. Client-side checks alone are insufficient.

## 4. Existing controls and candidate reuse

### PrathamOne EduOS

- Production JWT configuration is validated at backend startup.
- Help & About metadata updates are authenticated; commercial license fields are SYSADMIN-only.
- These controls restrict metadata editing but do not constitute signed license verification or broad entitlement enforcement.

### SMRITI Retail OS

- Generic system-configuration mutation endpoints require SYSADMIN.
- Initial setup has the authorization gap described in F-02.
- DataBridge has a fail-closed entitlement check for that capability; reuse its policy boundary only where appropriate, not as a substitute for a unified verifier.

### `smritisys-ui` control-plane candidate

- Migration `0003_license_control_plane.sql` defines license, customer, entitlement, activation, and license-event structures.
- The API includes permission-scoped license operations and organization-scoped customer access.
- Database triggers prevent updates/deletes of license event records.
- These are useful existing components to extend rather than duplicate. This audit did not establish a deployed service, a product verifier, a protected signing-key service, signed offline responses, installer signature enforcement, or end-to-end issuance/activation.

## 5. Preliminary threat model and security design

### Trust boundaries

1. **Control plane:** customer, product, license, activation, entitlement, and audit administration.
2. **Signing boundary:** a protected service holding private signing keys, separated from the public website and product repositories.
3. **Product backend:** trusted verifier and entitlement-policy enforcement for each installation.
4. **Product frontend:** presentation only; never the authority for access decisions.
5. **Customer deployment and offline exchange:** potentially cloned databases, copied license files, clock drift, network outages, and unauthorized binary modification.

### Primary threats

- Forged or modified entitlement payloads; expiry or capacity changes.
- Replay of activation responses, activation-file reuse, or copying a license to another installation.
- Device or database cloning; tenant/company identity substitution.
- Compromise of control-plane accounts, APIs, database, or signing keys.
- Product-side verifier removal or patching; unsigned installer/update substitution.
- License-server outage or offline use causing accidental customer lockout.
- Privilege escalation by support or tenant administrators and insufficient audit history.

### Proposed security invariants

- Use Ed25519 signatures (or an independently reviewed equivalent). Keep private keys in protected signing infrastructure; distribute only public verification keys in product releases.
- Sign a versioned, canonical payload with `license_id`, product/audience, customer/company binding, installation/device binding policy, issued/not-before/expiry dates, license model, entitlements, key identifier, and unique issuance/activation identifiers.
- Verify signatures, product identity, issuer key status, time bounds, installation binding, and entitlement limits in the product backend. The frontend only reflects backend decisions.
- Online activation uses server-side authorization and replay-resistant challenges. Offline activation files and responses are signed, scoped to a product/license/installation, and audited.
- Rotate signing keys using key identifiers and overlapping trusted public keys; define compromise revocation and customer recovery procedures.
- Separate usage entitlements (modules, branches, users, capacity) from maintenance/support/upgrade eligibility.
- Keep license transitions and audit records tamper-evident; do not place signing secrets in a website bundle, product image, database row, or installer.
- Enforce expiry with configurable subscription grace periods. Perpetual offline licenses remain verifiable without a destructive lockout. Never delete or corrupt customer data due to licensing state; provide controlled read/export/recovery paths.
- Roll out in observe/warn mode first, then staged enforcement after customer migration and recovery are tested.

## 6. Proposed architecture and reuse plan

1. **Extend the existing `smritisys-ui` control plane** as the customer/product/license management workspace, subject to confirming deployment topology, API authentication, database backups, and operational ownership. Reuse its canonical license/activation/entitlement/event structures and APIs; do not create parallel master tables without a documented gap.
2. **Introduce an isolated signing service** backed by a managed HSM/KMS or equivalent protected key store. The control-plane UI/API requests signing through a narrow authenticated interface; private key material is never returned to the website or products.
3. **Create one shared signed-license contract and verifier specification**, then add a small backend verification adapter to each product. Product adapters enforce local entitlements and cache signed state safely for offline/grace behavior.
4. **Bind activations** to product, customer/company, license, and an installation identity. Define transfer/recovery and device replacement as audited authority operations rather than relying on a fragile hardware fingerprint alone.
5. **Make authorization server-side** in control-plane endpoints and product APIs. Scope every operation by product/customer/license and existing role/membership permissions.
6. **Protect release distribution:** sign installers and update manifests/artifacts; verify signatures before installation/update. Treat this as a separate pipeline workstream because repository review did not establish the hosted release pipeline.
7. **Migrate incrementally:** inventory existing customer/license metadata, issue signed licenses, run shadow verification, monitor anomalies, offer recovery/export, then enable enforcement by product and tenant cohort.

### Approval required before structural implementation

Obtain product-owner approval for:

- The existing website as the system of record and the selected hosting/runtime boundaries.
- Signing-key provider, key custody/rotation operators, and incident-recovery authority.
- Installation identity and activation-transfer policy.
- Entitlement schema, commercial model semantics, grace periods, and perpetual/offline behavior.
- Customer migration cohort, enforcement rollout, and non-destructive expired/suspended behavior.
- New database migrations, product API changes, and update-signing pipeline changes.

## 7. Recommended validation plan

Before production enforcement, add tests for signature tampering, fake license generation, expiry changes, wrong product/customer/license binding, copied activation files, replayed activation responses, cloned product databases, key rotation/revocation, loss of the authority, offline subscription grace, perpetual offline use, and recovery/export behavior. Include negative authorization tests for cross-customer access. Validate installer/update signatures in CI and at install/update time. Test against a staging environment with synthetic test licenses only.

These are planned test cases; no such tests were run in this audit.

## 8. Audit evidence index

| Finding | Evidence paths and lines |
|---|---|
| F-01 | `F:\PrashantAcademy\docker-compose.yml:41-44`; `backend/seed.py:113-136`; `install.sh:119-120`; `install.ps1:281-282` |
| F-02 | `F:\SMRITRretailNX\backend\app\api\v1\system.py:600-629,653-658,680-714,816-820`; `backend/app/schemas/system.py:70-120` |
| F-03 | `F:\PrashantAcademy\backend\app\services\help_service.py:1245-1258`; `frontend/src/components/help/ProductVersionSection.tsx:110-120`; `F:\SMRITRretailNX\backend\app\api\v1\system.py:653-658,816-820`; `F:\SMRITI\websites\smritisys-ui\migrations\0003_license_control_plane.sql:17-90`; `functions/api/[[path]].js:289-313,449-657` |

## 9. Remediation status after the user selected "Fix all issues"

- **F-01 — Partially remediated in source:** new installations no longer receive a shared accountant account or hardcoded passwords. Seeded administrator passwords are entered interactively and passed only to a one-time seed container; existing seeded administrator/accountant accounts are rotated when the installer is rerun. Existing customer installations still require an operator to run the updated installer and provide new passwords. Do not assume a source-code update has changed deployed credentials.
- **F-02 — Remediated in source:** the company setup endpoint now rejects non-SYSADMIN users before provisioning; a focused unit test covers this authorization boundary.
- **F-03 — Not implemented:** central signed-license issuance, activation, verifier integration, entitlement gates, signed releases, and offline behavior remain gated on approving the architecture and operational choices in Section 6. No deployment was performed.
