---
title: "PrathamOne EduOS — Whole Software Technical Assessment & Recommendations"
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
tags: ["whole-software-audit", "architecture", "security", "data-integrity", "production-readiness", "recommendations"]
entities: ["Institution", "User", "Student", "FeeInvoice", "Payment", "PaymentAllocation", "ReportBook"]
api_routes: ["/health", "/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/reports"]
related_modules: ["01_ARCHITECTURE", "09_FEES_PAYMENTS", "12_RBAC_SECURITY", "16_DATABASE_API", "18_TESTING_QA"]
---

# Whole Software Technical Assessment

**Assessment date:** 2026-11-14  
**Runtime version observed in source:** v1.97.2  
**Disposition:** Do not use prior repository audit certificates as current release evidence. Resolve the critical credential and data-handling findings, then rerun the release gates before issuing a new production sign-off.

## 1. Executive summary

PrathamOne EduOS has a substantial application surface: a React/TypeScript client, an async FastAPI/SQLAlchemy service, PostgreSQL and Alembic migrations, and Docker Compose packaging. The repository has useful foundations, including centralized settings, a production secret-key check, HttpOnly cookie configuration, role/permission helpers, financial workflow services, migration history, and broad unit/component test inventories.

The current checkout is **not ready for an unconditional production-readiness certification**. Two critical issues require immediate owner attention: fresh installations receive published, fixed administrator credentials; and Git tracks SQL files explicitly named as production snapshots. The file contents were not opened, so whether they contain personal or financial data remains unverified. Treat them as sensitive until the data owner confirms otherwise.

Other important gaps include inconsistent access-token lifetimes, token values returned in JSON despite the browser's cookie-only design, a numeric fallback in training-tenant routing, payment workflow configuration that silently degrades on invalid values, an HTTP-only Compose deployment with a directly published backend port, and test/release automation that does not currently enforce a clean full-suite pass. The full frontend run produced 528 passes and 2 failures; one failure persists in isolation, while the other passed when its suite was rerun by itself.

This is a repository and configuration assessment, not a penetration test, legal opinion, or production database reconciliation. No SQL dump content, `.env` values, or production database records were read.

## 2. Scope and evidence

Reviewed repository structure and documentation; authentication and tenant-context dependencies; payment workflow settings; health endpoint; database test fixture; Docker/Nginx configuration; installer and seed behavior; CI workflows; and representative frontend state and routing. The review included the current report-book worktree changes without treating uncommitted migrations as deployed.

Evidence collected for this assessment:

| Area | Observed evidence |
|---|---|
| Application inventory | 110 backend application Python files; 240 frontend source TypeScript/TSX files; 70 backend test modules; 69 frontend test files; 49 Alembic revision files. |
| Backend test inventory | `pytest --collect-only` collected 343 tests. Tests were not executed here because the session-scoped fixture drops and recreates the configured database schema. |
| Frontend tests | Full `npm test`: 69 files, 530 tests; 67 files passed, 2 failed; 528 passed, 2 failed. `EduBoardDisplayAndPopout.test.tsx` passed when isolated (5/5); `ConsoleBanner.test.ts` failed when isolated (5/6). |
| Frontend build | `npm run build` passed in the preceding verification. The Report Book PDF chunk was about 1.14 MB minified; existing CSS warnings and a chunk-size warning were emitted. |
| Migrations | `alembic heads` reported one head: `049_report_book_permissions`. This verifies the repository's revision graph, not an installed database's applied revision or schema drift. |
| Attribution/docs | The source header check previously passed 610/610. Documentation validation previously passed 470 documents with zero errors and warnings; this report must be reindexed and validated as part of publication. |
| Live data/runtime | No production database, deployment, or personal-data dump was inspected. No deployment or migration was performed. |

### Limitations

The historic November 10 audit reports claim live-container, database, and financial reconciliation results. Those claims were not reproduced in this assessment and are not treated as current evidence. The test count, migration head, and repository contents have since changed. This assessment verifies source/configuration facts and local commands only; it does not certify tenant isolation across every route, production backup restorability, legal compliance, or deployed infrastructure.

## 3. Prioritized findings

### P0 — Published default administrator credentials

The seed path creates `admin` / `admin123` and `accountant` / `account123` on a fresh database. Both installer scripts print these credentials, the README publishes them, and `.env.example` repeats them. There is no observed forced password change or one-time bootstrap credential flow. Generating a random JWT secret does not protect accounts with these known passwords. Changing only the `.env` values does not change the fixed values in the seed code.

**Recommendation:** Replace sample credentials with a one-time bootstrap process that accepts a securely supplied initial administrator secret, forces rotation on first login, and disables or removes sample accounts before normal operation. Never print reusable credentials in installer output or production-facing documentation. Require an explicit, non-default PostgreSQL password and fail startup if defaults remain.

**Evidence:** [seed.py](../../backend/seed.py), [install.ps1](../../install.ps1), [install.sh](../../install.sh), [README.md](../../README.md), [.env.example](../../.env.example).

### P0 — Git-tracked production-labelled SQL snapshots

Git tracks `data/prashant_academy_complete_production.sql` and `data/prashant_academy_production_39_students.sql` (about 1.97 MB each). Their names indicate production snapshots. Their contents were deliberately not read, so this report does not assert that they contain real personal data; they must nevertheless be treated as sensitive until confirmed as sanitized fixtures.

**Recommendation:** Have the data owner classify the dumps immediately. If they contain real student, guardian, staff, or financial data, stop distributing the repository, remove the data from current and accessible Git history, rotate any embedded credentials, assess who could access prior clones/artifacts, and establish an approved encrypted backup channel. If they are synthetic, replace the misleading filenames and document how sanitization is guaranteed.

**Evidence:** Git-tracked paths under [data/](../../data/). Only filenames and file metadata were inspected.

### P1 — Authentication lifetime and token transport are inconsistent

The backend defaults access tokens to 60 minutes, but Compose overrides `ACCESS_TOKEN_EXPIRE_MINUTES` to 1440 (24 hours). Login and refresh responses also include access and refresh tokens in JSON even though the frontend says it relies on HttpOnly cookies and stores only a non-secret sentinel. This expands token exposure to JavaScript and contradicts the intended cookie-only session model. The November 10 security report's 15-minute claim does not match the current settings.

**Recommendation:** Set one authoritative access-token lifetime and apply it consistently across settings, container configuration, cookie max-age, and documentation. Prefer returning only user/session metadata from browser login/refresh endpoints and using the HttpOnly cookies. If non-browser clients require bearer tokens, define a distinct flow and threat model. Add explicit CSRF protection appropriate to the cookie-authenticated mutation endpoints.

**Evidence:** [config.py](../../backend/app/core/config.py), [docker-compose.yml](../../docker-compose.yml), [auth.py](../../backend/app/api/v1/endpoints/auth.py), [Login.tsx](../../frontend/src/pages/Login.tsx).

### P1 — Training-tenant routing has a hard-coded institution fallback

When a `TRAINING` request cannot find the canonical demo institution or any `%DEMO%` institution, `enforce_institution_access` returns institution ID `2`. If that ID belongs to an actual institution in a deployment, a missing demo tenant can silently route training-mode operations to that tenant. Invalid environment values also silently become `PRODUCTION`, which can conceal a client configuration error.

**Recommendation:** Remove numeric tenant fallbacks. Require the exact training institution and fail closed with an explicit service/configuration error if it is absent. Reject unknown environment values with a 4xx response. Add tests for missing, duplicate, and incorrectly configured demo tenants, including non-sysadmin users.

**Evidence:** [deps.py](../../backend/app/core/deps.py), especially `get_data_environment` and `enforce_institution_access`.

### P1 — Payment workflow settings silently fall back on invalid values

The payment workflow settings parser catches invalid numeric/JSON values and continues with defaults; an unrecognized workflow mode is interpreted as `simple`. Corrupt or malformed institution settings may therefore be hidden and may select a less controlled workflow instead of preventing a financial operation.

**Recommendation:** Validate each persisted workflow value against a typed schema at write time and read time. Reject invalid configuration with an actionable error and audit event; do not silently downgrade approval mode. Add regression tests for malformed thresholds, role lists, payment methods, and unknown modes.

**Evidence:** [payment_workflow_service.py](../../backend/app/services/payment_workflow_service.py).

### P1 — Production Compose exposure and transport are not deployment-grade

Compose publishes the backend on `8000:8000` and the frontend on `80:80` without a host-IP restriction or TLS termination. The database is correctly bound to loopback, but its Compose password fallback and example value are both `postgres`. The installer creates a random JWT secret but preserves the sample database password. The README's copy-example-and-start path retains the intentionally invalid JWT placeholder, so the standard path fails the backend's fail-fast secret check unless the operator performs additional configuration.

**Recommendation:** Separate development and production Compose profiles. In production, require secrets from an approved secret store, reject every sample/default credential, publish only a TLS-terminated frontend/reverse proxy, and keep the API/database on a private network (or bind administrative access to loopback). Document a tested bootstrap path that cannot announce production readiness before credentials, TLS, migrations, and readiness checks succeed.

**Evidence:** [docker-compose.yml](../../docker-compose.yml), [.env.example](../../.env.example), [config.py](../../backend/app/core/config.py), [README.md](../../README.md), [install.ps1](../../install.ps1), [install.sh](../../install.sh).

### P1 — Current automated release evidence is insufficient

The full frontend suite currently has two failures. The EduBoard display/color assertion failed in the full parallel run but passed when isolated, indicating an order/concurrency-sensitive test or shared state to investigate. The console-banner test fails consistently: its assertion expects AITDL as parent organization, while current branding output identifies SmritiSys. This is a real contract/test/governance mismatch that should be resolved against the approved corporate identity source.

The checked-in release workflow validates headers/release metadata and runs the frontend build, but does not explicitly execute frontend tests, backend tests, or database migration tests. The backend fixture uses `Base.metadata.create_all()` rather than applying Alembic migrations, and its session-scoped setup/teardown calls `drop_all()` on the configured test database. The default database name ends in `_test`, but an unrestricted `TEST_DATABASE_URL` override can point elsewhere.

**Recommendation:** Make a dedicated disposable PostgreSQL instance/database per CI run. Guard the test URL so it cannot equal the application URL and must target a test-only database; avoid destructive setup against a shared database. Run Alembic upgrade-from-supported-baseline tests, backend tests, frontend tests, and build as required CI gates. Fix the two failures, then require a clean full-suite run. Remove the `npm ci || npm install` fallback so lockfile/install failures cannot be hidden.

**Evidence:** [conftest.py](../../backend/tests/conftest.py), [release-validation.yml](../../.github/workflows/release-validation.yml), [ConsoleBanner.test.ts](../../frontend/src/test/ConsoleBanner.test.ts), [consoleBanner.ts](../../frontend/src/utils/consoleBanner.ts), [EduBoardDisplayAndPopout.test.tsx](../../frontend/src/test/EduBoardDisplayAndPopout.test.tsx).

### P2 — Health endpoint reports liveness, not application readiness

`/health` always returns `{"status": "healthy"}` and does not check the database. Compose and the installer use this endpoint as a service-health signal, so a process can appear healthy while its database dependency is unavailable.

**Recommendation:** Separate liveness from readiness. Make readiness perform a bounded database connectivity check and, if appropriate, verify migration readiness. Keep liveness independent so orchestrators can restart a stuck process without treating a dependency outage as an application crash.

**Evidence:** [main.py](../../backend/app/main.py), [docker-compose.yml](../../docker-compose.yml), [install.ps1](../../install.ps1), [install.sh](../../install.sh).

### P2 — High-change modules are too large for safe parallel evolution

Representative modules include `payments.py` (2,777 lines), `reports.py` (2,144), `fees.py` (1,953), `Reports.tsx` (2,392), and `Examinations.tsx` (1,877). Large routers and workspaces increase review cost and make it harder to keep permissions, validation, and UI state consistent.

**Recommendation:** Refactor incrementally by domain responsibility: keep route handlers thin, move transaction rules to focused services, and split frontend workspaces into feature panels/hooks. Preserve existing API ownership and canonical data sources; require regression tests before moving calculations.

### P2 — Historical audit and onboarding material is stale

The November 10 full audit describes migration `039`, 77 tables, 384 documentation files, and a 100% test pass. The current repository has a single Alembic head at `049_report_book_permissions`, 470 documents before this assessment, 343 backend tests collected, and 530 frontend tests in the current run with 2 failures. The production-readiness report also states that all runtime, database, and financial checks are certified, which this repository-only assessment did not reproduce. The quickstart's production language and sample credentials further overstate readiness.

**Recommendation:** Treat older attestations as historical snapshots. Replace future sign-offs with dated evidence that names the exact commit/build, database migration revision, test commands/results, and environment. Do not label an install “production ready” until the P0/P1 gates above have been independently verified.

**Evidence:** [the previous full-software audit](./2026-11-10_AUDITS-COMPLIANCE_AUDIT-REPORT_FULL-SOFTWARE-AUDIT-REPORT_V1.md), [the previous production-readiness report](./2026-11-10_AUDITS-COMPLIANCE_AUDIT-REPORT_PRODUCTION-READINESS-REPORT_V1.md), [README.md](../../README.md), [release-validation.yml](../../.github/workflows/release-validation.yml).

## 4. Positive controls worth preserving

- Production settings reject known weak JWT secrets when `DEBUG` is false.
- The database port is bound to loopback in Compose; the backend container runs as a non-root user.
- Authentication cookies are configured `HttpOnly`, `SameSite=Lax`, and secure outside debug mode; login is rate-limited.
- Tenant and permission helpers exist, and the payment workflow includes audit logging, financial-period checks, and row locking in key operations.
- The frontend build succeeds, TypeScript compilation is part of the build, and the focused report-book/report/print test selection passed 22/22 in its prior verification.
- Alembic currently reports one migration head, and the repository has broad backend/frontend test coverage intended to protect finance, tenant, and view/edit governance rules.

These controls reduce risk but do not neutralize the P0/P1 findings or substitute for production-environment testing.

## 5. Recommended sequence

### Before any new production exposure
1. Classify the tracked production-labelled SQL dumps; if real data is present, restrict distribution, purge accessible history/artifacts, and conduct incident/credential review.
2. Replace fixed bootstrap credentials and default database passwords; require first-login rotation and remove credentials from installers/README.
3. Configure TLS and private service networking; remove public direct access to the API/database.
4. Remove the training institution ID fallback and fail closed on invalid/missing tenant context.
5. Normalize access-token lifetime and stop returning browser tokens in JSON.

### Before the next release candidate
1. Fix both frontend suite failures and establish deterministic full-suite runs.
2. Add CI execution gates for frontend tests, backend tests, migration upgrades, and a production build; make the backend test database disposable and guarded.
3. Make malformed financial workflow configuration fail closed.
4. Add database-aware readiness and ensure install/update reports readiness only after successful database verification.
5. Re-run security, tenant isolation, and financial reconciliation checks against an authorized, isolated test environment; publish exact command output and commit/build identifiers.

### Next engineering cycle
1. Split high-change routers/workspaces in small tested increments.
2. Add dependency vulnerability/license/SBOM checks and pin container images to controlled versions/digests.
3. Reconcile corporate identity, product version, and deployment documentation from a single maintained source.
4. Test backup encryption, retention, restore, and post-restore financial reconciliation without using repository-tracked production snapshots.

## 6. Final readiness statement

**Local development/build:** frontend production build passed; current frontend full-suite status is failing (528/530).  
**Backend:** 343 tests collected, not executed in this assessment because the fixture destructively recreates the configured schema.  
**Production:** no renewed sign-off. Resolve the critical credential/data findings and P1 controls, then repeat tests and deployment checks in an isolated environment. No migrations or deployments were performed as part of this assessment.
