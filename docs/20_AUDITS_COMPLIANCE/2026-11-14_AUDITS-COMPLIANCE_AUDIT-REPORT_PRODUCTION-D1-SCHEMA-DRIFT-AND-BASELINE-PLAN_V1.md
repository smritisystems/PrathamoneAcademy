---
title: "SMRITISYS Production D1 Schema Drift Audit and Safe Baseline Plan"
module: "20_AUDITS_COMPLIANCE"
category: "AUDIT-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-14"
updated_date: "2026-11-16"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Review Required"
tags: ["licensing", "SMRITISYS", "Cloudflare D1", "schema-drift", "migration", "binding-mismatch"]
entities: ["CustomerInvite", "Person", "Organization", "OrganizationMember", "Role", "Permission"]
api_routes: ["/api/admin/customer-invites"]
related_modules: ["12_RBAC_SECURITY", "13_SYSADMIN_SETTINGS", "16_DATABASE_API"]
---

# SMRITISYS Production D1 Schema Drift Audit and Safe Baseline Plan

## Executive decision

**The original migration run targeted a different D1 database than the one bound to Pages production.** Wrangler applied all 14 reviewed production migrations to `smritisys-db` (ID `19066da9-8183-42cb-92e3-c64d1ee799de`). Cloudflare Pages production instead binds `DB` to `smritisys-db-recovery` (ID `67114a4c-c167-40db-8a58-00a5b9bf15cf`). On 2026-11-16, after a verified backup and explicit approval, only the missing `0018_customer_setup_invites.sql` schema was applied to the bound database. `customer_invites` now exists; `d1_migrations` remains absent, so the migration history and original postflight results below still apply only to `smritisys-db`.

The approved admin password recovery was applied to the Pages-bound database and verified through a successful live login/logout; credentials are intentionally omitted. The invite-table prerequisite has now been repaired on the bound database. No invitation has been created or exposed, and the migration-ledger gap still blocks normal Wrangler migration workflows. The verified full-data backup is retained privately; its location and contents are intentionally omitted from this report.

## Scope and evidence

The migration audit used read-only queries against `smritisys-db` and a private pre-migration backup for local SQLite simulation. A later binding check found that Pages production uses `smritisys-db-recovery`; its state is reported separately below. No names, email addresses, password hashes, tokens, or backup contents are included here.

| `smritisys-db` check (migration target) | Result |
|---|---:|
| Active super-admin users | 1 |
| Customers | 0 |
| Organizations | 0 |
| Organization memberships | 0 |
| Licenses | 0 |
| Custom requirements | 0 |
| Announcements | 0 |
| Rows in `d1_migrations` after apply | 14 |

These counts describe `smritisys-db`, the migration target, not the current Pages binding. On that database, the pre-migration user had the `super_admin` role but no organization membership. The migration run created the canonical internal organization and one active super-admin membership with `admin.system` permission. Its post-migration counts remain at zero for customers, licenses, activations, invites, custom requirements, and announcements; no staging customers were inserted.

### Deployment verification

- Cloudflare Pages production binding: `DB` → `smritisys-db-recovery` (ID `67114a4c-c167-40db-8a58-00a5b9bf15cf`), not `smritisys-db`.
- Read-only inspection confirmed an active super-admin row and no `d1_migrations` table. The missing `customer_invites` table was added in the approved 2026-11-16 schema hotfix described below.
- Cloudflare Pages production deployment: [deployment preview](https://eb650912.smritisys-website.pages.dev), sourced from commit `7617787`.
- Read-only smoke checks returned HTTP 200 for the deployed site root, the canonical `/accept-invite` page, its JavaScript asset, and `https://smritisys.com/`. `/accept-invite.html` returns a permanent redirect to `/accept-invite`, which serves the page successfully.
- The login failure was caused by resetting the password in the unbound `smritisys-db`. The approved reset was then applied to `smritisys-db-recovery`; live `/api/login` succeeded, the test session was logged out, and a read-only check confirmed zero remaining sessions. The recovery was audit-logged without storing credentials.
- No customer invitation was created or exposed, and no live invite was consumed. The schema prerequisite is present, but the live invitation lifecycle has not been exercised.

### Local simulation

Against the fresh private backup, a local SQLite simulation successfully ran all 14 production migrations in order, excluding the three test-only fixtures. It reported zero foreign-key violations and the expected post-migration row counts.

The initial simulation exposed a migration idempotency defect: running `0002_identity_rbac.sql` twice created duplicate internal organizations and memberships because the organization table has no unique name constraint. The bootstrap now checks for an existing canonical organization and selects one stable organization ID for membership creation; a regression test confirms a second run makes no changes.

## Migration hazards

1. **Staging seed files are not production migrations.** `0005`, `0009`, and `0011` insert synthetic customers, organizations, licenses, activations, partner records, and admin accounts. They have been moved to `tests/fixtures/migrations/` and are excluded from Wrangler's migration list.
2. **`0002_identity_rbac.sql` was not safely repeatable.** Its organization inserts now use duplicate guards and a deterministic canonical organization mapping; the repeated-run regression test passes.
3. **`0006_custom_requirements.sql` rebuilds and drops legacy tables.** Its copy step requires an organization membership for every migrated customer; a missing mapping can violate the new non-null organization column. The `smritisys-db` migration backup also lacked `custom_requirement_messages`; the migration now creates an empty compatible legacy table before rebuilding it.
4. **`0013_customer_announcements.sql` rebuilds a table.** It was applied while the production announcements table was empty; foreign-key validation passed afterward.
5. **`0016_license_activation_refresh_keys.sql` uses a non-idempotent `ALTER TABLE ... ADD COLUMN`.** It was applied once in sequence after `0003`; Wrangler recorded it in the ledger, preventing normal reapplication.
6. The remaining production migrations create license, partner, release, commercial, and replay-protection structures. All 14 production migrations passed the private-backup simulation before the approved production apply.

## Read-only reconciliation of the Pages-bound D1 — 2026-11-16

The target for this check was the live Pages binding, `smritisys-db-recovery`. Wrangler's schema-only export was inspected locally, and a migration replay was run only in an in-memory SQLite database. Separate production queries were read-only (`changed_db: false`, `rows_written: 0`). No schema or data changes were made.

| Check | Observation |
|---|---|
| Live table count before hotfix | 57 tables excluding SQLite internals; this includes Cloudflare's `_cf_KV` table. The schema-only export contains the 56 application tables and omits `_cf_KV`. |
| Local Wrangler target | `wrangler.toml` still binds `DB` to `smritisys-db` (ID `19066da9-8183-42cb-92e3-c64d1ee799de`). A read-only `wrangler d1 migrations list smritisys-db-recovery --remote` attempt stopped locally because that database is not declared in this config; no production mutation occurred. |
| Migration history | `d1_migrations` is absent, so Wrangler cannot establish which migrations were applied from the bound database's own ledger. |
| Migrations `0002`–`0015` | Key schema fingerprints are present, including identity/RBAC, license-control-plane, requirements, releases, partner, rate-limit, announcement, signed-artifact, and PrathamOne product/edition objects. |
| Migration `0016` | `license_activations.refresh_public_key` is present. |
| Migration `0017` | `license_refresh_nonces` and its creation-time index are present. |
| Migration `0018` | `customer_invites` and its three indexes were absent; they were added in the approved hotfix below. |
| Foreign keys | The previously run read-only `PRAGMA foreign_key_check` returned no violations. |

The schema-only replay executed migrations `0002` through `0015` against the exported schema, then stopped at `0016_license_activation_refresh_keys.sql` with `duplicate column name: refresh_public_key`. This is evidence that the bound schema already contains the `0016` change; it is **not** proof of the original migration order or a replacement for the missing ledger. The replay contained no production data and made no production writes.

Read-only row counts for data relevant to rebuild or migration checks were: 1 user, 0 customers, 1 organization, 1 organization membership, 0 licenses, 0 activations, 0 license events, 0 custom requirements, 0 custom-requirement messages, 0 announcements, 1 product, 1 product edition, 1 edition policy, 0 releases, 0 signed license artifacts, 0 refresh nonces, 2 audit-log rows, and 0 sessions. The zero counts for custom requirements, their messages, and announcements reduce the current data-copy risk for migrations `0006` and `0013`, but do not make blind migration replay safe.

### Safe reconciliation decision

- **Do not run the full production migration directory against the bound D1.** With no `d1_migrations` ledger, Wrangler would start at the beginning; the in-memory replay reached the non-idempotent `0016` duplicate-column failure after executing earlier migrations. That could leave the live database partially changed before stopping.
- **Do not manually insert migration-ledger rows or switch the Pages binding as a shortcut.** The current bound database is the active source of truth until the owner selects otherwise; the separately migrated `smritisys-db` must not be substituted without a full data comparison and explicit approval.
- Cloudflare's [D1 migration documentation](https://developers.cloudflare.com/d1/reference/migrations/) describes the applied-migration table and create/list/apply workflows. No supported baseline/mark-as-applied procedure has been established for this database; do not infer one or fabricate ledger entries.
- Align the local Wrangler target with the explicitly selected authoritative database before using migration commands. Do not change the Pages binding as part of this step.
- For any further writes, confirm the authoritative database and take and verify a full data backup first. Compare both databases' data and schema before considering a binding change.
- A rehearsal of `0018` against the backup passed. A supported migration-history/baseline approach is still unestablished; include the `0006`, `0013`, and `0016` hazards in that separate rehearsal.
- The approved `0018` schema hotfix is complete. Do not run the full migration directory, fabricate ledger entries, or claim the live invitation lifecycle has passed until the migration history is reconciled and lifecycle testing is authorized.

### Approved invite-schema hotfix — 2026-11-16

- The user approved a full backup followed by only the `0018_customer_setup_invites.sql` DDL on `smritisys-db-recovery`. The Pages binding was not changed.
- Wrangler confirmed the target database ID matched the Pages binding. The full-data export was restored in memory: SQLite integrity check passed, and `PRAGMA foreign_key_check` returned zero violations.
- The `0018` migration was rehearsed against that backup. The three declared indexes were present after rehearsal; watched existing table row counts were unchanged, and foreign-key validation remained clean.
- Wrangler applied only `migrations/0018_customer_setup_invites.sql` to the bound D1. Postflight confirmed `customer_invites`, all three declared indexes, and its uniqueness indexes exist. The table contains zero invite rows.
- Postflight key counts matched preflight; `PRAGMA foreign_key_check` returned no rows. No invitation was created or exposed.
- `d1_migrations` remains absent. No older migration was applied, no ledger row was fabricated, and future Wrangler migration execution remains on hold until a safe baseline is established.

**Current outcome: invite schema repaired after backup and explicit approval; migration-ledger reconciliation, Pages rebinding, and live invitation lifecycle testing remain outstanding.**

## Recommended rollout plan

### Phase 1 — Reconcile the migration target and author a safe baseline — partial

- Keep the pre-migration backup unchanged and verify it is restorable before any write.
- The 14 non-seed migrations were reconciled and simulated against `smritisys-db`.
- The Pages production binding was later found to point to `smritisys-db-recovery`; its missing migration ledger means the applied migration history cannot be assumed for this database.
- The `0002` organization bootstrap now reuses a canonical organization and has a regression test proving that a second run does not change organization, membership, or identity counts.
- Staging fixtures are now stored under `tests/fixtures/migrations/`, outside the production-executable migration directory.
- Wrangler's migration runner applied the reviewed 14-file directory to `smritisys-db` and recorded each migration normally; no migration ledger rows were inserted manually.

### Phase 2 — Validate the invite prerequisites locally — complete

- Replay the corrected identity/RBAC bootstrap, rate-limit migration, and invite migration against the private backup.
- Assert the super-admin receives an active internal membership and the `admin.system` permission.
- Assert no synthetic rows are introduced and no existing rows are duplicated or lost.
- Run the existing invite-flow tests and verify create, accept, replay, revoke, expiry, authorization, and audit behavior.

### Phase 3 — Apply the approved baseline to the migration target — complete; Pages migration history unresolved

- A fresh private backup and read-only preflight were completed before the write.
- Wrangler applied all 14 production migrations to `smritisys-db`; its migration listing reports no pending migrations.
- Read-only postflight on `smritisys-db` confirmed the expected super-admin membership and permission, zero staging customers, and zero foreign-key violations.
- These results do not establish migration history for the Pages-bound `smritisys-db-recovery`. Its invite table was added separately; its migration ledger remains absent.

### Phase 4 — Deploy and smoke-test the site — complete; invite lifecycle unverified

- The user approved the code push and Pages deployment. Commit `76177874ae8c33c56d84ca9eba659069ada1605e` was pushed to `main`; Cloudflare Pages created the production deployment from that commit.
- Read-only smoke checks confirmed that the production site and static invite setup assets are reachable. The admin login was verified against the actual Pages-bound D1 after resetting the account there.
- The bound D1 now has the invite table and indexes. No customer invitation was generated; end-to-end invitation behavior has not been exercised.

## Acceptance criteria before rollout

- Every migration is accounted for on the Pages-bound D1; **not met**. Its migration ledger is absent, although the missing invite schema has been added.
- The identity bootstrap is demonstrably idempotent.
- Production contains no staging/test accounts, licenses, activation records, or organizations.
- The active super-admin can pass existing authorization checks through an active internal organization membership.
- Invite lifecycle behavior passes in the website test suite; the live lifecycle remains **unverified**. The invite table is present and empty.
- A full-data backup was restored and integrity-checked locally before the schema write; a production D1 restore/cutover rehearsal remains outstanding.

## Validation status

- Migration apply on `smritisys-db`: **passed**, 14 of 14 migrations; this is not the current Pages-bound database.
- Wrangler migration listing on `smritisys-db`: **passed**; no migrations remain pending on that database.
- Post-migration row counts, super-admin membership/permission, and foreign-key check: **passed on `smritisys-db` only**.
- Pages production DB binding: **verified** as `smritisys-db-recovery`; `d1_migrations` remains absent. The invite table is now present.
- Read-only reconciliation of the Pages-bound schema: **completed before the hotfix**; 56 application tables were present, the live total of 57 included Cloudflare's `_cf_KV`, and migration fingerprints through `0017` were present.
- Schema-only migration replay against the bound export: **diagnostic only**; migrations `0002`–`0015` simulated, then `0016` stopped on the already-present `refresh_public_key` column. No production data was included or changed.
- Bound database rebuild-table counts: **zero** for custom requirements, custom-requirement messages, and announcements at the time checked; this does not authorize rerunning migrations.
- Bound D1 full-data backup restore and `0018` rehearsal: **passed**; SQLite integrity check passed, zero foreign-key violations, and watched existing row counts were unchanged.
- Approved production `0018` invite-schema hotfix: **passed**; table and all declared indexes verified, zero invite rows, key row counts unchanged, and no foreign-key violations.
- Migration-ledger baseline and Pages rebinding: **not performed**; require a separately reviewed plan and explicit approval.
- Corrected `0002` replay on private backup: **passed** twice; resulting counts stayed at one user, one internal organization, and one membership.
- Full non-seed migration simulation: **passed**, 14 migrations with zero foreign-key violations and no staging records.
- `0006` missing-message-table regression test: **passed**.
- Website test suite: **83 passed**.
- Website code push: **passed**, commit `76177874ae8c33c56d84ca9eba659069ada1605e` on `main`.
- Cloudflare Pages production deployment: **created from the pushed commit**; read-only site, invite page, invite JavaScript, and custom-domain smoke checks returned HTTP 200 after the invite page's canonical redirect.
- Admin login after correcting the reset target: **passed** against the live API; test session logged out and zero sessions remained.
- Live invitation lifecycle: **not exercised**; no production customer invite was created or exposed.

Related: [License Key Issuance and Activation Readiness Audit](./2026-11-14_AUDITS-COMPLIANCE_AUDIT-REPORT_LICENSE-KEY-ISSUANCE-AND-ACTIVATION-READINESS_V1.md).
