---
title: "License Issuance and Activation Guide"
module: "22_USER_MANUALS"
category: "USER-GUIDE"
document_type: "GUIDE"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.5"
created_date: "2026-11-14"
updated_date: "2026-11-16"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Draft"
tags: ["license", "issuance", "activation", "institution-admin", "sysadmin", "SMRITISYS"]
entities: ["License", "Activation", "Entitlement", "Institution"]
api_routes: ["/api/license/activate", "/api/license/email/request", "/api/license/email/verify", "/api/license/manage", "/api/v1/license/activate", "/api/v1/license/email/request", "/api/v1/license/email/verify", "/api/v1/license/deactivate", "/api/v1/license/offline-request", "/api/v1/license/offline-import", "/api/v1/license/status"]
related_modules: ["12_RBAC_SECURITY", "13_SYSADMIN_SETTINGS", "16_DATABASE_API"]
---

# License Issuance and Activation Guide

## Important: production readiness

Batch-code, registration-at-claim, online activation, and offline file-exchange workflows exist in source. **Production issuance and email-based device transfers are not ready until the SMRITISYS `LICENSE_SIGNER` service binding is connected to the selected protected signing service, migrations `0019_license_code_inventory.sql`, `0021_license_account_transfers.sql`, and `0022_license_transfer_policy.sql` are approved and applied, the public verification key is configured in PrathamOne, and Cloudflare Email Service is configured and delivery-verified for the control plane.** Email sending configuration and production delivery have not been verified, and this work has not been deployed. Do not enter real customer information or issue production licenses until the deployed control plane, migrations, signer, and email delivery have been validated.

The private signing key must stay in the protected signer/KMS/HSM boundary. Do not put it in the website, browser, PrathamOne settings, or a customer installation.

## Before issuing a license

Confirm all of the following:

1. The correct product and edition exist. The PrathamOne product code is `prathamone-eduos`.
2. The commercial model, start date, expiry (for subscriptions), seat count, modules, and other entitlements have been approved.
3. The license signer is deployed, the product verification key is configured, and the database migration is applied.
4. Customer registration requires institution name, contact name, email, and phone. Address and tax ID are optional. Confirm the contact email is not assigned to a different customer identity.

Existing license records without a `company.binding` entitlement need an authorized mapping before activation. The system does not guess or generate this mapping.

## Issue a license in SMRITISYS

Use the **Prepare activation codes** form to generate one to two hundred unassigned serial/key pairs. New batches use nine-digit numeric serials and 16-character uppercase alphanumeric activation keys. Choose the product, edition, commercial model, seat count, start date, and optional expiry. Generate the codes and download the CSV immediately; activation keys are not recoverable from the server. Deliver each pair securely.

The existing **Issue a license** form remains available for direct issuance to an existing or newly registered customer. Direct-issued credentials are also revealed only once. Lifecycle changes and batch creation are audited without including activation keys.

## Prepare serial/key pairs in advance

1. In **Products & licenses**, use **Prepare activation codes**.
2. Select 1-200 codes, seats per code, product, edition, commercial model, start date, and optional expiry.
3. Generate the codes, then download the CSV immediately and store it securely. It contains each serial number and activation key; only key hashes are stored by the server, so a lost CSV cannot be recovered.
4. Deliver each pair to a customer through an approved secure channel. The serial remains unassigned until the customer claims it in PrathamOne.

On first claim, the customer confirms the institution name, contact name, email, and phone. Address and tax ID are optional. The license authority reuses the canonical customer only when the contact identity and organization name match; otherwise it rejects the conflicting registration. One pair can be claimed only by one company and installation. The license response is signed and bound to that installation.

## Activate PrathamOne

1. Sign in to the target PrathamOne installation using an active Institution Admin or SysAdmin account.
2. Institution Admins open **Software License** from the application navigation. SysAdmins can use **SysAdmin Center > Software License**.
3. Confirm the selected institution is the intended customer institution. Institution Admins are restricted to their assigned institution; only SysAdmins can select another institution.
4. Activate **Edit Mode** using the workspace's explicit Edit Mode control.
5. Confirm or complete the registration details: institution, contact name, contact email, and phone are required; address and tax ID are optional.
6. Enter the serial number and activation key, then select **Activate license**. Previously issued direct keys can be entered in **Legacy license key**.
7. On success, review the license mode, serial number, edition/model, rollout stage, expiry, signed document ID, and signed snapshot issue time.

PrathamOne creates and stores an installation ID and activation identifier automatically. Registration details and the activation key are sent to the configured authority; the key is not saved by this application. Activation is available only for the production institution, not Training Mode.

After PrathamOne verifies the signed license, the page switches to the registered-license view. It hides the customer-registration, serial, activation-key, and initial-activation forms so the operator does not re-register an already licensed institution. The registered email and device-management actions remain available in Edit Mode. If the status check fails, activation fields stay hidden until the status can be checked; retry the status check rather than creating another registration.

## Move a license to another installation or change its email

The registered email is scoped to an individual license. After the first activation, customers can use that email for later activations without entering the serial number or activation key again.

1. On the old installation, an Institution Admin opens **Software License**, enables Edit Mode, and selects **Deactivate this device**. Confirm the action while the machine is online. This releases that device binding; it does not revoke the issued license or erase its history.
2. On the new installation, an Institution Admin enables Edit Mode, enters the registered license email, requests and verifies the emailed code, selects the matching license, and activates it. The control plane enforces the license's active-device limit.
3. To change the registered email, use **Change registered license email** on an active installation. Verify the code sent to the current address, then verify the second code sent to the new address. The change applies only to the selected serial/license.

Self-deactivation needs a live connection to the license authority. A successful self-service transfer starts a 30-day cooldown for that license; until the cooldown expires, another self-service transfer is rejected. If the old machine is unavailable or offline, or the cooldown prevents a transfer, the customer must contact an authorized license administrator for assistance after identity and ownership are verified. Do not share verification codes. These controls are not available in production until the deployment prerequisites above are completed.

The **Product & Version Information** view derives license status and validity from the locally stored, cryptographically verified signed snapshot. It shows **Not activated** and **No active license snapshot** when no verified snapshot is present; these fields are not editable product metadata.

## Activate without connecting the PrathamOne server to the authority

1. In PrathamOne, activate Edit Mode, enter the serial number, complete registration details, and confirm them.
2. Select **Download offline request**. The file includes registration details, installation IDs, company binding, and the public refresh key; it does not contain the activation key or private key.
3. On an internet-connected device, open the deployed SMRITISYS website's `/offline-activation.html` page. Upload the request file and enter the matching activation key.
4. Download the signed response and transfer it securely back to the same PrathamOne installation.
5. Select **Import offline response**. PrathamOne verifies the signature and checks that the signed response matches the pending serial, institution, and installation.

The request is bound to the installation that created it. Do not edit the challenge or import the response into another installation.

## Refresh and recover a signed snapshot

PrathamOne checks license status while in use and automatically requests a refreshed signed snapshot when due. Use the reload icon to check the current status; it is not a new activation and does not ask for registration or activation credentials.

If automatic refresh reports that it is unavailable or manual recovery is required, do not re-register the institution or repeatedly enter the activation key. Contact the authorized license administrator or support team to verify the authority configuration and arrange an approved recovery. After deactivation on an old installation, activate the replacement installation using the already-registered license email and its verification code.

The installation's private refresh key is used for automatic check-in; the circular-arrow button reloads the status endpoint, which may perform that check-in when due. It does not create another activation seat.

## Rollout and renewals

- Keep the edition policy in **shadow/warn** mode while validating a pilot. Confirm customer binding, status, module entitlements, and reports before moving to enforcement.
- Subscription grace is configured per edition (the approved default is seven days). A perpetual license does not use a subscription expiry date.
- Renewals, suspensions, and activation revocations are performed by an authorized super-admin in the control plane. PrathamOne applies changes on its next successful automatic check-in; use **Refresh signed license** to request an immediate update. Suspension and revocation require confirmation and are audited.
- While the application is in use, it checks license status hourly; the backend contacts the authority only when the last signed snapshot is at least 24 hours old. Failed checks are retried no more than once an hour.
- New and refreshed license artifacts use a signed 14-day offline-validity window followed by a seven-day grace period. After the grace period, PrathamOne enters the configured Evaluation Mode without deleting customer data. Artifacts signed before this policy change retain their own signed validity value until refreshed; artifacts missing the validity field use the legacy seven-day validity plus seven-day grace.
- The installation's refresh private key is encrypted at rest using the application `SECRET_KEY` and excluded from generic settings reads and writes. Keep that key stable and protected. If it is changed or lost, an Institution Admin or SysAdmin must activate again using the issued credentials.
- PrathamOne stores an institution-scoped, HMAC-protected local clock checkpoint and enters Evaluation Mode if that checkpoint is invalid or the system clock moves backward beyond the five-minute tolerance. This is tamper-evident local state, not a hardware-backed trusted clock: restoring both application data and configuration may also restore the checkpoint.
- Migration `0022_license_transfer_policy.sql` sets the authority's stored offline-validity baseline to 14 days and adds state for the 30-day self-service transfer cooldown. Applying the migration does not rewrite previously signed artifacts; refreshed artifacts receive the new policy.
- Licensing does not delete customer data. Follow the established backup and recovery process before any production change.

## Common activation errors

| Message or symptom | What to check |
|---|---|
| License authority URL is not configured | Configure `LICENSE_AUTHORITY_URL` for the PrathamOne backend. |
| Authority unavailable or signer error | Confirm the website is reachable and its `LICENSE_SIGNER` service binding is connected to the approved signer. |
| Serial number and activation key were not recognized | Check both values and the product code. Confirm the code is available and not revoked. |
| Code already claimed | Retry from the same PrathamOne installation; another installation requires a different code. |
| Contact email belongs to another account | Correct the contact identity or resolve the existing customer record; do not create a duplicate identity. |
| Company binding mismatch | Confirm the request was generated by the intended institution and the offline file was not edited. |
| Signature is untrusted or invalid | Configure PrathamOne `LICENSE_PUBLIC_KEYS_JSON` with the matching signer key ID and Ed25519 public key. Never configure a private key here. |
| License status is `evaluation` | Check license status, start/expiry dates, model, company/institution binding, and the configured enforcement stage. |

## Operator configuration reference

PrathamOne requires:

- `LICENSE_AUTHORITY_URL`: base URL of the deployed SMRITISYS license authority.
- `LICENSE_PRODUCT_CODE`: `prathamone-eduos` unless the product catalog contract is intentionally changed.
- `LICENSE_PUBLIC_KEYS_JSON`: JSON mapping trusted key IDs to base64url Ed25519 public keys.
- `LICENSE_ENFORCEMENT_STAGE`: begin with `shadow`; move to `enforced` only after pilot approval and recovery testing.

SMRITISYS requires a protected signing service bound as `LICENSE_SIGNER`, an active key ID, and the corresponding public-key configuration. Email verification additionally requires Cloudflare secrets `CLOUDFLARE_EMAIL_ACCOUNT_ID`, `CLOUDFLARE_EMAIL_API_TOKEN`, `LICENSE_EMAIL_FROM`, and a randomly generated `LICENSE_EMAIL_CODE_SECRET` of at least 32 characters. Provision these through the hosting platform's secret controls; never commit signing or email credentials.

## Operational boundary

Online activation, batch code generation, registration-at-claim, and offline request/response exchange are implemented in source only. A provider-specific KMS/HSM deployment, code-revocation UI, license transfer process, signed installer/update pipeline, migration rollout, and production rollout have not been completed. Do not describe the licensing system as piracy-proof or enable production enforcement until those operational controls are approved and tested.
