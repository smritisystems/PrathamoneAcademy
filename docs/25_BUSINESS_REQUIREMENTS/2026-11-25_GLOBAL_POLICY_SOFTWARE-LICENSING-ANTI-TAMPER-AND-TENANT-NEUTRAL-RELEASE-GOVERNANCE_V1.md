---
title: "Global Policy: Software Licensing, Anti-Tamper Binary Integrity, and Tenant-Neutral Release Governance (Rule 016)"
module: "25_BUSINESS_REQUIREMENTS"
category: "POLICY"
document_type: "POLICY"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-25"
updated_date: "2026-11-25"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["licensing", "anti-tamper", "hardware-lock", "security", "adr-009", "tenant-neutrality", "rule-016"]
entities: ["LicenseArtifact", "HardwareFingerprint", "IntegrityManifest"]
api_routes: ["/api/v1/license/status", "/api/v1/license/activate"]
related_modules: ["12_RBAC_SECURITY", "16_DATABASE_API", "19_RELEASES_CHANGELOG"]
---

# GLOBAL POLICY: SOFTWARE LICENSING, ANTI-TAMPER BINARY INTEGRITY & TENANT-NEUTRAL RELEASE GOVERNANCE (RULE 016)

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** Smritisys & AITDL Networks  
**Policy Status:** MANDATORY — ALL REPOSITORY WORKFLOWS, RELEASES & CODING AGENTS  

---

## 1. EXECUTIVE SUMMARY & PURPOSE

During forensic security auditing of the compiled Windows desktop installer (`PrathamOne_EduOS_Setup.exe`), five critical defense-in-depth gaps were identified and closed:
1. Database cloning could bypass physical hardware node-locking when both `license.artifact` and `license.installation_id` matched a copied PostgreSQL cluster.
2. Unbounded capacity claims (`999999`) in the `TRAINING` data environment could be abused on unlicensed installations.
3. Clean-room binary scanning skipped binaries exceeding `50 MB`, missing hardcoded tenant identifiers and developer paths compiled inside `prathamone_backend.exe`.
4. Individual `.pyd` extensions (`app/core/`, `app/services/`) lacked an embedded runtime SHA-256 tamper manifest.
5. Windows hardware fingerprinting could silently degrade if PowerShell WMI timed out without native Windows Registry fallback and minimum-entropy validation.

This policy establishes **RULE 016** as a permanent governance mandate across all builds, code changes, and client releases.

---

## 2. RULE 016 MANDATES

### 2.1 Strict Physical Hardware Node-Locking (Zero DB-Clone Bypass)
1. When a verified license artifact contains a hardware-bound `installation_id` (`PRATHAM-*`), `verify_hardware_fingerprint()` MUST match the live host machine.
2. Fallback comparison against stored database `license.installation_id` settings is **strictly forbidden** for hardware-bound leases. Copying `{app}\data` or dumping PostgreSQL tables onto a second machine must fail closed with `Node-Lock Mismatch`.
3. Wildcard developer tokens (`PRATHAM-DEV-MASTER-ALL`) must remain disabled in production unless explicitly enabled via opt-in `PRATHAM_ALLOW_DEV_MASTER_LICENSE=1`.

### 2.2 Resilient Multi-Source Hardware Identification & Minimum Entropy
1. Windows hardware collection in `app/core/hardware.py` must pair WMI CIM queries with fast native Windows Registry (`HKLM\HARDWARE\DESCRIPTION\System\*`) fallbacks so locked-down or slow PowerShell hosts do not degrade into weak `"UNKNOWN"` identifiers.
2. Verification on Windows hosts must fail closed if 3 or more hardware components resolve to unknown/empty values.

### 2.3 Bounded `TRAINING` Environment Claims
`TRAINING` workspace requests (`data_environment == "TRAINING"`) remain isolated from production data and must enforce bounded sandbox limits (`max_students=50`, `max_staff=20`, `seats=10`) rather than unbounded `999999` enterprise limits.

### 2.4 Embedded Runtime Binary Integrity & Code-Signing Readiness
1. ADR-009 Gate 2 (`build_staging/build_release.py`) must compute SHA-256 digests of every compiled `.pyd` module in `app/core/` and `app/services/`, bake `_EXPECTED_PYD_MANIFEST` directly into the compiled `prathamone_backend.exe` binary, and emit `integrity_manifest.json`.
2. On startup (`run_server.py`), compiled backend binaries must enforce zero `.py`/`.pyc`/`.pyo` files inside `app/core/` and `app/services/` and verify every loaded `.pyd` against `_EXPECTED_PYD_MANIFEST`, aborting immediately on mismatch or missing files.
3. Production installers should be Authenticode-signed whenever `PRATHAM_SIGN_CERT_PFX` is provisioned in the release environment.

### 2.5 Full-Stream Binary Leak Scanning & Zero Tenant Hardcoding
1. ADR-009 Gate 4 (`build_staging/verify_build.py`) must stream-scan **all** release binaries regardless of file size (zero `>50 MB` blind spots) for developer drive paths, unencrypted private keys, and tenant-specific strings (`PrashantAcademy`, hardcoded client domains/emails/VPAs).
2. Core configuration (`app/core/config.py`), endpoints, and staged services must remain tenant-neutral (`PrathamOne EduOS`), loading tenant branding exclusively from `institute_settings` or `.env`. Legacy insecure secret checks must match SHA-256 hashes rather than embedding plaintext literals.
