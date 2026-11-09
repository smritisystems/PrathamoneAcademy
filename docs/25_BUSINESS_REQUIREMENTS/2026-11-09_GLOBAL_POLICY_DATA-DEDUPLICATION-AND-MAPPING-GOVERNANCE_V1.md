---
title: "Global Policy: Data Deduplication, Canonical Master Reuse & Frontend-Backend Mapping Governance"
module: "25_BUSINESS_REQUIREMENTS"
category: "POLICY"
document_type: "POLICY"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-09"
updated_date: "2026-11-09"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["policy", "ssot", "deduplication", "canonical-master", "mapping", "governance"]
entities: ["DataGovernance", "SingleSourceOfTruth", "Policy", "MasterData"]
api_routes: ["/api/v1/*"]
related_modules: ["25_BUSINESS_REQUIREMENTS", "01_ARCHITECTURE", "16_DATABASE_API"]
---

# PRATHAMONE EDUOS — GLOBAL POLICY: DATA DEDUPLICATION & MAPPING GOVERNANCE

**Policy Code:** POL-2026-EDUOS-011  
**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Version:** 1.0.0  
**Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Effective Date:** 2026-11-09  
**Status:** ACTIVE & MANDATORY FOR ALL DEVELOPERS AND CODING AGENTS  

---

## 1. POLICY PURPOSE & SCOPE

This policy establishes the non-negotiable architecture and engineering mandate for data deduplication, canonical master reuse, and complete frontend-backend field mapping across **PrathamOne EduOS**.
It extends the foundation established in [docs/25_BUSINESS_REQUIREMENTS/2026-11-06_GLOBAL_POLICY_SINGLE-SOURCE-OF-TRUTH-GOVERNANCE_V1.md](file:///f:/PrashantAcademy/docs/25_BUSINESS_REQUIREMENTS/2026-11-06_GLOBAL_POLICY_SINGLE-SOURCE-OF-TRUTH-GOVERNANCE_V1.md) with explicit rules governing shared masters and relational bridges.

---

## 2. THE 5 CORE DATA GOVERNANCE MANDATES

### Mandate 1: Canonical Master Reusability Across Curricula (Rule 011)
Every reusable academic or organizational entity (Subjects, Fee Categories, Academic Years, Standards, Boards) must be registered **once** in its canonical master table.
- Standards, curricula, and boards must link to the canonical entity via relational mapping tables (e.g. `subject_mappings`).
- It is strictly forbidden to create duplicate master records for different grades (e.g. creating separate "English" records for Standard 5, 6, 7).
- Passing marks, max marks, elective flags, and display sequences belong exclusively to the mapping layer.

### Mandate 2: Semantic Identity Verification Before Merging or Creation
Entities must not be merged merely because their names match (e.g. English in CBSE vs State Board may be distinct if curriculum identity differs).
Conversely, new master records must NOT be created when a genuine canonical entity already exists.

### Mandate 3: Absolute Protection of Immutable Transaction Snapshots
Financial ledgers, receipts, tax invoices, and academic examination mark records represent statutory legal records.
- Snapshot fields (e.g. `student_name` on `payment_receipts`, `max_marks` on `exam_marks`) must NEVER be replaced with dynamic joins to master tables.
- Historical meaning must be strictly preserved across student promotions or name changes.

### Mandate 4: End-to-End Bidirectional Field Traceability
Every field rendered on a frontend form, dropdown, or grid must trace directly through:
```
UI Component → Form State → Validation → API Request → Route → Schema → Service → Model → Column
```
No field may be displayed without functional backend persistence, and no API field may be silently dropped.

### Mandate 5: Safe Dual-Run Migration Protocol
All database schema modifications must follow the 6-step idempotent dual-run protocol:
1. Database snapshot and SHA-256 hash.
2. Idempotent migration script authoring.
3. Automated dry-run transaction verification.
4. Ledger sum verification before and after migration.
5. Complete reverse downgrade function readiness.
6. Post-migration referential integrity audit.

---

## 3. COMPLIANCE & GOVERNANCE ENFORCEMENT

Before completing any task or PR, developers and AI agents must run:
```bash
python tools/docs_manager.py validate
python scripts/manage_headers.py check
```
Violations of this policy will result in immediate build rejection.
