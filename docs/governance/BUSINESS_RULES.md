# Master Business Rules Inventory

This document serves as the master index for all institutional, academic, and financial business rules governing Prashant Academy.

---

## 1. Catalog by Functional Domain

| Domain | Rule Range | Authoritative Document | Key Rules Enforced |
|---|:---:|---|---|
| **Admissions & Inquiries** | `CBR-ADM-001` – `009` | [COACHING_BUSINESS_RULES.md](../COACHING_BUSINESS_RULES.md) | Inquiry mandatory before enrollment; Unique admission numbers; Trial class limits. |
| **Student Profiles** | `CBR-STU-001` – `002` | [COACHING_BUSINESS_RULES.md](../COACHING_BUSINESS_RULES.md) | Mandatory guardian contacts; Role-filtered student records. |
| **Courses & Batches** | `CBER-CRS-001` – `003` | [COURSE_BATCH_ENROLLMENT_RULES.md](../COURSE_BATCH_ENROLLMENT_RULES.md) | Course subject linkage; Batch capacities; Faculty scheduling conflict check. |
| **Fee Management** | `FPA-RUL-001` – `005` | [FEE_POLICY_AND_ACCOUNTING.md](../FEE_POLICY_AND_ACCOUNTING.md) | Overpayment rejection; Immutable receipt sequence; Payment reversal balance restoration. |
| **Attendance** | `ATP-ATT-001` – `003` | [ATTENDANCE_AND_TEST_POLICY.md](../ATTENDANCE_AND_TEST_POLICY.md) | 75% minimum threshold; Automated parent alerts; 24-hour correction window. |
| **Examinations** | `ATP-EXM-001` – `003` | [ATTENDANCE_AND_TEST_POLICY.md](../ATTENDANCE_AND_TEST_POLICY.md) | Mandatory coordinator verification before marks publication; Standardized grading. |
| **Security & Privacy** | `DPS-001` – `004` | [DATA_PRIVACY_AND_SECURITY.md](../DATA_PRIVACY_AND_SECURITY.md) | DPDP Act compliance; Aadhaar encryption; Synchronous audit logging. |

---

## 2. Rule Enforcement Mechanisms

1. **Database Constraints**: Primary keys, unique indexes, and foreign keys guarantee integrity at the persistence layer.
2. **FastAPI Pydantic Validators**: Request payloads are validated before business logic execution.
3. **Transactional Service Layer**: Database rows locked via `SELECT FOR UPDATE` to prevent race conditions during concurrent financial transactions.

