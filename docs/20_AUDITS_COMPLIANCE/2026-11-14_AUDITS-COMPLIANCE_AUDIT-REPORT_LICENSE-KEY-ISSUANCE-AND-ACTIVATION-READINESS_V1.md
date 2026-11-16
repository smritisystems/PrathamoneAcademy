---
title: "License Key Issuance and Activation Readiness Audit"
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
organization: "Smritisys & AITDL Networks"
status: "In Progress"
tags: ["license", "activation", "Ed25519", "Cloudflare", "production-readiness"]
entities: ["License", "Activation", "LicenseArtifact"]
api_routes: ["/api/licenses", "/api/license/activate", "/api/license/refresh", "/api/license-verification-keys"]
related_modules: ["12_RBAC_SECURITY", "13_SYSADMIN_SETTINGS", "16_DATABASE_API"]
---

# License Key Issuance and Activation Readiness Audit

## Executive finding

The existing system already creates a license record and a redeemable license key; a second serial-number table is not needed. The license row's `id` is the serial/reference number displayed as `License #<id>`. The random `license_key` is the activation credential. PrathamOne sends that credential to SMRITISYS, which checks the product, license state, customer organization, company binding, and activation-seat limit before issuing a signed license artifact.

Production activation is not ready. The live public verification-key endpoint currently returns an empty key list, and the control plane requires both an active signing key configuration and a `LICENSE_SIGNER` service binding to sign artifacts. In addition, the recovery database was previously verified to contain no customer licenses. Do not issue a customer key or enable enforcement until the signing boundary, public verification keys, customer record, and product configuration have been validated end to end.

## Current issuance flow

1. An authorized super-admin uses **Products & licenses** and submits an organization, product, edition, exact company binding, commercial model, dates, status, and entitlements.
2. The API requires an active customer membership, active product and edition, and a non-empty `company.binding` entitlement.
3. If no caller-supplied key is present, the API generates one with `crypto.getRandomValues`. The current implementation truncates the random hex string to 24 characters, which represents 96 bits of entropy. Increase this to use the full 48-character output (192 bits) before issuing new production credentials.
4. The database row ID is the non-secret serial/reference number. Do not create a duplicate serial master.
5. The issue response shows the key for secure delivery. Save and deliver it through an approved secret-sharing channel; do not put it in email subject lines, URLs, source code, screenshots, support logs, or analytics.
6. In PrathamOne, a SysAdmin activates Edit Mode in **SysAdmin Center > Software License**, enters the key, and submits activation for the production institution. The institution's exact `code` is sent as `company_binding`.

## What the authority validates

The activation endpoint:

- requires a license key, product code, UUID installation ID, UUID activation ID, and a valid Ed25519 refresh public key;
- finds the license by key and product code and requires a related active customer organization;
- rejects DRAFT licenses, mismatched company bindings, duplicate/revoked activation identifiers, and exhausted seats;
- creates or reuses the activation identity and asks the isolated signer to sign the current license/entitlement snapshot;
- verifies the signer's response against the configured public key before returning the artifact.

PrathamOne verifies the Ed25519 signature with its configured public key and checks product, company, installation, activation, status, issue time, dates, model, and entitlements before applying license mode. Subsequent refreshes use the installation's signing key and do not require the reusable license key.

## Production evidence and blockers

- `GET https://smritisys.com/api/license-verification-keys` returned `{"ok":true,"keys":[]}` during this audit. PrathamOne therefore cannot trust any signed artifact from the current production configuration.
- The SMRITISYS API calls `env.LICENSE_SIGNER` and requires `LICENSE_ACTIVE_KEY_ID` plus a matching entry in `LICENSE_SIGNING_PUBLIC_KEYS`. Missing configuration returns a service-unavailable response instead of issuing an unsigned artifact.
- The current production D1 recovery state was previously verified to have zero customer licenses. A valid customer organization and active customer membership must exist before license creation.
- PrathamOne's authority URL and public verification-key configuration are runtime settings; the example configuration intentionally leaves them empty.

## Recommended implementation and operating sequence

1. Use a dedicated signer Worker reachable only through a Pages service binding. Keep the Ed25519 private key as a Worker secret; expose only the matching public key to the Pages API and PrathamOne. For higher assurance, use an approved external KMS/HSM rather than exporting or storing private key bytes in the application Worker.
2. Select a key ID, create the Ed25519 key pair through an approved secure provisioning process, verify a test signature, and record a key-rotation/recovery procedure. Never commit or paste private signing material into this repository or chat.
3. Configure and redeploy the signer and Pages binding; configure `LICENSE_ACTIVE_KEY_ID` and `LICENSE_SIGNING_PUBLIC_KEYS`. Verify the public endpoint returns exactly the expected key ID and 32-byte Ed25519 public key.
4. Configure PrathamOne with the authority URL, product code `prathamone-eduos`, the same public key map, and `shadow` enforcement. Do not enable enforced mode until a test activation and refresh succeed.
5. Create or verify the real customer organization and active customer account relationship. Use the exact production institution code as `company.binding`; never guess it.
6. Issue one limited pilot license in ACTIVE state with approved dates and entitlements. Copy the generated key once, activate the intended PrathamOne installation, and verify signature, company binding, seat count, status, audit event, refresh, and expiry behavior.
7. Keep production enforcement in shadow until backup, recovery, activation transfer, revocation, key rotation, and customer-support procedures are rehearsed.

## Key-custody decision required

No signing private key or provider is provisioned by this audit. Production activation must remain blocked until the product owner approves one of these custody choices:

- **Pilot:** dedicated Cloudflare signer Worker with a per-Worker encrypted secret and a Pages service binding. This is operationally simple but is not an HSM-backed signing boundary.
- **Higher assurance:** an external managed KMS/HSM signer exposed to the control plane through an authenticated service. This requires provider, account, identity, region, and recovery-policy decisions.

## Research references

- [Cloudflare Workers Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/) documents `crypto.getRandomValues`, Ed25519 signing/verification, and supported algorithms.
- [Cloudflare Pages Functions bindings](https://developers.cloudflare.com/pages/functions/bindings/) describes platform bindings; deployment requires the binding to be configured and the Pages project redeployed.
- [Cloudflare Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/) documents encrypted Worker-scoped secret bindings and warns against storing secrets in source/configuration.
- [RFC 8032](https://www.rfc-editor.org/rfc/rfc8032) specifies EdDSA, including Ed25519.
- Existing implementation and operator steps are documented in the SMRITISYS `docs/LICENSE_ARCHITECTURE.md` and the PrathamOne license issuance guide.

## Acceptance evidence still required

- A production signer returns a valid Ed25519 signature and the Pages API verifies it against the published key.
- A correct active license activates only for the matching product and institution; wrong product, company, DRAFT/suspended status, invalid key, and exhausted seats are rejected.
- PrathamOne verifies the artifact and persists installation refresh credentials safely.
- A signed refresh succeeds without re-entering the license key; replayed nonce, revoked activation, expiry, and offline grace behavior are verified.
- The production D1 records one activation and immutable artifact/event/audit metadata without changing financial or academic data.
- The customer-facing key delivery, recovery, revocation, and key-rotation procedures are documented and rehearsed.
