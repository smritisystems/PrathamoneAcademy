---
title: "Signed License Control Plane — Release Notes"
module: "19_RELEASES_CHANGELOG"
category: "CHANGELOG"
document_type: "RELEASE-NOTES"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.2"
created_date: "2026-11-14"
updated_date: "2026-11-15"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Draft"
tags: ["licensing", "Ed25519", "activation", "batch-codes", "offline-activation", "release-notes"]
entities: ["License", "Activation", "Entitlement", "LicenseCode"]
api_routes: ["/api/license/activate", "/api/license/refresh", "/api/licenses", "/api/licenses/batches", "/api/v1/license/offline-request", "/api/v1/license/offline-import", "/api/products"]
related_modules: ["12_RBAC_SECURITY", "13_SYSADMIN_SETTINGS", "16_DATABASE_API"]
---

# Signed License Control Plane — Release Notes

## Scope

This source update adds pre-generated activation-code inventory, registration-at-claim, and an offline file exchange for PrathamOne EduOS and the SMRITISYS control-plane website. It is not deployed; production signing, migrations, and customer activation remain out of scope. SMRITI Retail OS changes are not included.

## Included

- PrathamOne verifies Ed25519 license snapshots using configured public keys and applies license mode on the backend, with non-destructive Evaluation Mode behavior.
- DRAFT perpetual and one-time license snapshots cannot grant active access. Enforced API routes map to licensed modules, and unmapped routes fail closed.
- SMRITISYS binds signed activations to a required company-binding entitlement and rejects missing or mismatched bindings. License creation rejects missing/blank company bindings and duplicate entitlement keys.
- Customer license listings hide DRAFT keys, and the authority refuses to sign activation artifacts for DRAFT licenses.
- The internal super-admin workspace can issue licenses, configure edition Evaluation Mode/grace/rollout policies, inspect entitlements/activations/artifact metadata/events, renew and suspend licenses, and revoke activations.
- License lifecycle and policy changes continue to use existing audited control-plane APIs and tables.
- Installation refresh uses an installation-held Ed25519 key, replay-protected requests, and the same signed-artifact builder as activation; the reusable license key is not needed for automatic check-in.
- PrathamOne checks status hourly while the application is in use, refreshes snapshots at a 24-hour cadence, and enters its existing Evaluation Mode after a seven-day offline window. Refresh private keys are encrypted at rest and filtered from generic settings access.
- The control plane includes D1 migrations for installation refresh public keys and one-time nonce replay protection.
- Super admins can generate batches of 1-50 serial/key pairs. Activation keys are hashed at rest and shown only in the creation response; batch summaries expose counts only.
- First claim registers/reuses the canonical customer and organization, creates the license and audit trail atomically, and binds the code to its company, installation, and activation identifier.
- PrathamOne presents institution and contact details for confirmation before online activation. It can also export an installation-bound offline request and import a signed authority response.
- Newly claimed batch-code licenses receive a signed 90-day offline-validity window; legacy and directly issued licenses retain the seven-day default.

## Validation evidence

- SMRITISYS staging/control-plane suite: **42 passed**, including hash-only batch inventory, registration, claim idempotency, installation binding, migration compatibility, and artifact signing.
- PrathamOne focused license tests: **14 passed**, including registration validation, offline request/import binding, and the 90-day validity boundary.
- PrathamOne frontend production build and TypeScript check: **passed**, with existing CSS and large-chunk warnings.
- Corporate source-header verification: **618 checked, 618 passed**.

## Operational limits and rollout

The `LICENSE_SIGNER` service binding is the intended boundary for artifact signing. A concrete KMS/HSM provider, signing key, migration application, deployment, activation-code revocation UI, transfer workflow, and signed installer/update pipeline remain pending. Do not enable production issuance until the isolated signer and key lifecycle controls are deployed and validated. Continue shadow/warn rollout before any enforcement expansion. License expiry or revocation must not delete customer data or cause destructive lockout.

No signing infrastructure was provisioned and no application was deployed.
