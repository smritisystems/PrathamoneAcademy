# Prashant Academy — Documentation Index

Welcome to the central technical and operational documentation portal for **Prashant Academy Coaching Institute & School Management System**.

---

## 1. Governance & Business Policies

- [AI Agent Governance Policy](governance/AI_AGENT_GOVERNANCE.md): Operating charter, task isolation, and safety rules.
- [Source Code Attribution & Versioning Policy](governance/CODE_ATTRIBUTION_AND_VERSIONING_POLICY.md): Legal attribution headers, automated pre-commit hooks, and Semantic Versioning.
- [Business Rules Catalog](governance/BUSINESS_RULES.md): Master business logic and policy inventory.
- [Policy Decision Register (PDR)](governance/POLICY_DECISION_REGISTER.md): Open decisions requiring board/owner approval.
- [Coaching Institute Policy Framework](COACHING_INSTITUTE_POLICY_FRAMEWORK.md): High-level operational charter.
- [Coaching Business Rules](COACHING_BUSINESS_RULES.md): Admission, trial, and transfer rules.
- [Course & Batch Enrollment Rules](COURSE_BATCH_ENROLLMENT_RULES.md): Course schedules, capacities, and substitution rules.
- [Fee Policy & Accounting](FEE_POLICY_AND_ACCOUNTING.md): Financial ledger, partial payments, and receipts.
- [Attendance & Examination Policy](ATTENDANCE_AND_TEST_POLICY.md): Attendance register, test series, and grading.
- [Role & Permission Matrix](ROLE_PERMISSION_MATRIX.md): 8-role authorization matrix.
- [Data Privacy & Security](DATA_PRIVACY_AND_SECURITY.md): DPDP Act 2023 compliance and security standards.
- [Workflow Specifications](WORKFLOW_SPECIFICATIONS.md): Sequence diagrams and operational procedures.
- [Acceptance Criteria & Test Matrix](ACCEPTANCE_CRITERIA.md): Verification criteria and test mappings.

---

## 2. System Architecture

- [System Architecture](architecture/SYSTEM_ARCHITECTURE.md): Multi-tier full-stack system design and component topology.
- [Database Design](architecture/DATABASE_DESIGN.md): PostgreSQL 25-table entity-relationship schema and indexing.
- [API Standards](architecture/API_STANDARDS.md): RESTful API conventions, error formats, and authentication.

---

## 3. Module Documentation (Specs, User Manuals, Developer Manuals, Changelogs)

| Module | Specification | User Manual | Developer Manual | Change Log |
|---|:---:|:---:|:---:|:---:|
| **Admissions** | [Spec](modules/admissions/SPECIFICATION.md) | [Manual](modules/admissions/USER_MANUAL.md) | [Dev](modules/admissions/DEVELOPER_MANUAL.md) | [Log](modules/admissions/CHANGELOG.md) |
| **Students** | [Spec](modules/students/SPECIFICATION.md) | [Manual](modules/students/USER_MANUAL.md) | [Dev](modules/students/DEVELOPER_MANUAL.md) | [Log](modules/students/CHANGELOG.md) |
| **Standards & Divisions** | [Spec](modules/standards/SPECIFICATION.md) | [Manual](modules/standards/USER_MANUAL.md) | [Dev](modules/standards/DEVELOPER_MANUAL.md) | [Log](modules/standards/CHANGELOG.md) |
| **Fees & Billing** | [Spec](modules/fees/SPECIFICATION.md) | [Manual](modules/fees/USER_MANUAL.md) | [Dev](modules/fees/DEVELOPER_MANUAL.md) | [Log](modules/fees/CHANGELOG.md) |
| **Fee Register Import** | [Spec](modules/fees/FEE_REGISTER_IMPORT_SPECIFICATION.md) | [Manual](modules/fees/FEE_REGISTER_IMPORT_USER_MANUAL.md) | [Dev](modules/fees/FEE_REGISTER_IMPORT_DEVELOPER_MANUAL.md) | [Audit Report](modules/fees/RECONCILIATION_REPORT.md) |
| **Payments & Receipts** | [Spec](modules/payments/SPECIFICATION.md) | [Manual](modules/payments/USER_MANUAL.md) | [Dev](modules/payments/DEVELOPER_MANUAL.md) | [Log](modules/payments/CHANGELOG.md) |
| **Attendance** | [Spec](modules/attendance/SPECIFICATION.md) | [Manual](modules/attendance/USER_MANUAL.md) | [Dev](modules/attendance/DEVELOPER_MANUAL.md) | [Log](modules/attendance/CHANGELOG.md) |
| **Examinations** | [Spec](modules/examinations/SPECIFICATION.md) | [Manual](modules/examinations/USER_MANUAL.md) | [Dev](modules/examinations/DEVELOPER_MANUAL.md) | [Log](modules/examinations/CHANGELOG.md) |
| **Reports & Export** | [Spec](modules/reports/SPECIFICATION.md) | [Manual](modules/reports/USER_MANUAL.md) | [Dev](modules/reports/DEVELOPER_MANUAL.md) | [Log](modules/reports/CHANGELOG.md) |
| **User Management** | [Spec](modules/users/SPECIFICATION.md) | [Manual](modules/users/USER_MANUAL.md) | [Dev](modules/users/DEVELOPER_MANUAL.md) | [Log](modules/users/CHANGELOG.md) |

---

## 4. Operations & Deployment

- [Installation Guide](operations/INSTALLATION.md): Local development setup for Python, Node, and PostgreSQL.
- [Deployment Guide](operations/DEPLOYMENT.md): Docker Compose and cloud production containerization.
- [Backup & Disaster Recovery](operations/BACKUP_AND_RESTORE.md): Automated pg_dump schedules and restoration procedures.
- [Troubleshooting Runbook](operations/TROUBLESHOOTING.md): Common errors, port conflicts, and ledger resolution.

---

## 5. Releases & Strategic Roadmaps

- [Release Notes](releases/RELEASE_NOTES.md): Version history, features implemented, and breaking changes.
- [Product Roadmap](ROADMAP.md): Milestones, phases, and future capability rollout.
- [Implementation Plan](IMPLEMENTATION_PLAN.md): Technical implementation roadmap and architectural evolution.

