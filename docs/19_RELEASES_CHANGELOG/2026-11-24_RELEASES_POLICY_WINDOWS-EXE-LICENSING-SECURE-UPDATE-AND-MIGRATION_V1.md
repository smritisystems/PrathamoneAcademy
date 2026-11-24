---
title: "Windows EXE, Licensing, Secure Update, and Migration Policy"
module: "19_RELEASES_CHANGELOG"
category: "POLICY"
document_type: "POLICY"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-24"
updated_date: "2026-11-24"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Recommended release gate"
tags: ["windows-exe", "license-enforcement", "authenticode", "signed-updates", "database-migration"]
related_modules: ["01_ARCHITECTURE", "19_RELEASES_CHANGELOG", "20_AUDITS_COMPLIANCE"]
---

# Windows EXE, Licensing, Secure Update, and Migration Policy

## Decision

Keep PrathamOne EduOS as its existing React web application and Python API, installed on a dedicated Windows host for on-premises customers. Distribute a signed Windows setup executable as an installer/bootstrapper, not as a claim that the application is a tamper-proof standalone binary. Users on the institute LAN continue to access the host through a browser.

No Electron or other application-framework migration is required for this deployment model. Reconsider a native desktop shell only if a validated customer requirement needs desktop-only capabilities that the local web UI cannot provide. Do not bundle a second database per workstation for a multi-user institute.

Licensing on a customer-controlled host is not crack-proof: a local administrator can inspect, patch, or replace local code and state. Packaging, bytecode compilation, and obfuscation may deter casual inspection but are not an authorization boundary. Protect valuable hosted operations with server-side entitlement checks where the product model allows it; document the residual risk for offline/on-premises customers.

## Licensing policy

- Production licenses and installations use `enforced` mode. A signed `shadow` rollout value must never skip entitlement checks.
- The licensing authority issues `enforced` artifacts only. The authority migration converts existing PrathamOne edition policy rows to `enforced`; deployment must apply that migration before relying on the new issuer behavior.
- Keep license signing private keys outside both application repositories and customer installations. Use a protected KMS/HSM-backed signer with audited key rotation. Ship only public verification keys in the product.
- Bind signed entitlements to the product, customer/company, installation, activation, issue time, and validity window. Treat offline validity as a bounded lease: revocation is not immediate while an installation remains offline.
- Do not embed reusable license keys, signing secrets, or update credentials in the EXE, source tree, `.env.example`, or frontend bundle.
- Preserve activation identity and local data during upgrades. A legitimate update must not silently revoke a license or delete customer data.

## EXE build and signing gate

1. Build from a reviewed, immutable release tag on a clean Windows CI runner. Pin dependencies and record the source commit, toolchain, version, build number, and output hashes.
2. Keep release-signing credentials out of CI logs and source control. Use an organization-controlled production Authenticode code-signing certificate with protected private-key access.
3. Sign the installer and executable components with SHA-256 and a trusted timestamp. Verify every signature and certificate chain before publication. Reject self-signed certificates for customer releases; never ask customers to trust a vendor-generated certificate by importing it into the machine root store.
4. Publish the exact installer hash and size in a signed release manifest. A hash alone is not authenticity: the client must verify a manifest signature against a key pinned in the installed application.
5. Test clean installation and in-place upgrade in a disposable Windows VM before release. Verify installed publisher identity, service startup, health checks, activation continuity, database version, and backup restoration.

The existing bytecode/integrity-manifest build step is only a casual-tampering deterrent while its verification secret or algorithm is present in the client. It must not be described as preventing decompilation or cracking.

## Update policy

**Current release gate: automatic updates remain disabled.** The current updater has no trusted signed release manifest or package installer; it must not report a package as verified or claim a successful update. Use only a manually distributed, support-approved signed installer until the complete update path is implemented and tested.

Before enabling in-app or offline updates:

- Adopt TUF or an equivalent signed-metadata design with trusted root/targets roles, key rotation/revocation, metadata versioning, expiry, package length and SHA-256. Enforce monotonic versions and reject expired, replayed, or downgraded metadata.
- Verify the signed manifest and package before executing or extracting anything. Do not trust a hash supplied alongside a package by the same untrusted client or accept an arbitrary filesystem path/URL as the package source.
- Require the same signature verification for USB/offline packages. Offline transfer does not remove the authenticity requirement.
- Use a separate updater/bootstrapper to stop services, stage files, apply the update, restart, and health-check. Do not overwrite a running executable or mutate the installed release in place before verification.
- Report each state truthfully. Never call a checksum match a signature, and never report migration, rollback, or data integrity as successful without verifying it.

## Database and application migration policy

- Back up the database, uploaded files, and required installation configuration before migration. Verify the backup checksum and periodically test restoration on an isolated system.
- Review every schema migration. Prefer additive expand/migrate/contract changes, explicit compatibility windows, and forward-fix or restore procedures. Do not promise that arbitrary PostgreSQL migrations can be rolled back transactionally.
- Do not automatically restore a database after new user writes have occurred unless maintenance mode and the resulting data-loss window are understood and approved.
- Preserve `.env`, customer data, refresh-key material, installation IDs, and activation IDs. Never regenerate license identity as a side effect of setup or upgrade.
- Test upgrades from every supported prior version, interrupted installs, insufficient disk space, invalid signatures, expired metadata, rollback attempts, and offline installation. Record a clear recovery/support path.

## Release readiness checklist

- [ ] Production entitlement defaults and issued artifacts are enforced; existing authority policy rows have been migrated.
- [ ] License signer is isolated, monitored, and has a documented rotation/revocation process.
- [ ] Installer and updater are signed by a trusted production certificate; signature verification succeeds on a clean Windows machine.
- [ ] Signed update metadata and package verification are implemented, including downgrade/expiry rejection.
- [ ] Database and uploaded-file backup/restore has been tested for each supported upgrade path.
- [ ] Frontend, backend, licensing, installation, migration, and update-failure tests pass.
- [ ] Release artifacts are traceable to a reviewed commit and published with hashes and recovery instructions.

## Research references

- [The Update Framework (TUF) overview](https://theupdateframework.io/docs/overview/) describes signed metadata, key compromise resilience, metadata versions, hashes, and expiry.
- [Microsoft SignTool documentation](https://learn.microsoft.com/en-us/windows/win32/seccrypto/signtool) documents signing, timestamping, and signature verification for Windows executables.

TUF is a recommended design direction here; this policy does not claim that TUF is currently integrated.
