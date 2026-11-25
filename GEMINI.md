# PRATHAMONE EduOS — GEMINI AGENT SYSTEM DIRECTIVE

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** Smritisys & AITDL Networks  

---

## 1. IDENTITY & GOVERNANCE SUMMARY

When acting as an AI assistant, pair programmer, or autonomous agent on this repository:
1. **Product Name:** `PrathamOne EduOS`
2. **Version:** `1.0.0`
3. **Architecture:** Single Source of Truth (SSOT). Do not create duplicate entities or parallel services.
4. **Attribution:** Preserve Jawahar R Mallah / AITDL corporate headers across all modified files.
5. **View-First Governance:** View Mode is the default everywhere. Explicit Edit Mode activation is required for any creation, update, or deletion. Navigation and logout automatically reset state.
6. **Data Deduplication Governance (Rule 011):** Reuse canonical masters across standards; never duplicate records by grade. Historical financial and academic snapshots must remain immutable. See [docs/25_BUSINESS_REQUIREMENTS/2026-11-09_GLOBAL_POLICY_DATA-DEDUPLICATION-AND-MAPPING-GOVERNANCE_V1.md](file:///f:/PrashantAcademy/docs/25_BUSINESS_REQUIREMENTS/2026-11-09_GLOBAL_POLICY_DATA-DEDUPLICATION-AND-MAPPING-GOVERNANCE_V1.md).
7. **Automated Release Hygiene (Rule 012):** Production payloads (`dist/`, installer, docker) must strictly exclude development documentation, raw artwork, video clips, tests, and secrets as defined in `installer/release_whitelist.json`. Validate using `python scripts/check_release_hygiene.py`.
8. **In-Place Upgrades Governance (Rule 013):** Upgrades over an existing installation must strictly preserve `{app}\data` and `.env`, skip redundant onboarding wizard pages, take an automated pre-upgrade `pg_dump` snapshot, and auto-apply `alembic upgrade head`. Clients must never uninstall before upgrading. See [docs/25_BUSINESS_REQUIREMENTS/2026-11-21_GLOBAL_POLICY_IN-PLACE-UPGRADES-AND-DESKTOP-INSTALLER-GOVERNANCE_V1.md](file:///f:/PrashantAcademy/docs/25_BUSINESS_REQUIREMENTS/2026-11-21_GLOBAL_POLICY_IN-PLACE-UPGRADES-AND-DESKTOP-INSTALLER-GOVERNANCE_V1.md).
9. **Global Sleek UI/UX & Anti-Vertical-Bloat (Rule 014):** Viewport efficiency and above-the-fold content priority are mandatory. Workspaces must never stack more than 2 header layers (Global Header at 48px + Workspace Command Deck at ≤72px; combined ≤120px). Telemetry KPIs must be consolidated into a single 44px ribbon. Mandates Linear/Stripe-grade aesthetics: global ultra-thin 6px scrollbars (zero Windows native triangle buttons), soft pastel tints, monospace numbers, and minimalist `—` empty markers. Never render unstyled floating text slogans in headers or duplicate mock identity headers. See [docs/25_BUSINESS_REQUIREMENTS/2026-11-22_GLOBAL_POLICY_SLEEK-UI-UX-AND-ACADEMIC-DATA-INTEGRITY-GOVERNANCE_V1.md](file:///f:/PrashantAcademy/docs/25_BUSINESS_REQUIREMENTS/2026-11-22_GLOBAL_POLICY_SLEEK-UI-UX-AND-ACADEMIC-DATA-INTEGRITY-GOVERNANCE_V1.md).
10. **Operational Data Integrity & Time Schedule Normalization (Rule 015):** Timetable entries must strictly validate against institutional operational hours (`06:00` to `22:00`). Zero tolerance for midnight (`00:xx`) or inverted dummy test records. Dynamic schedule grids must assert slot bounds and ascending order.
11. **Licensing Anti-Tamper & Tenant-Neutral Release Governance (Rule 016):** Enforce strict physical node-locking (`PRATHAM-*` with zero DB-clone fallback), bounded `TRAINING` sandbox limits (`50` students / `20` staff / `10` seats), embedded `.pyd` SHA-256 runtime integrity manifests, full-stream binary leak scanning (`>50 MB` binaries included), and tenant-neutral release defaults. See [docs/25_BUSINESS_REQUIREMENTS/2026-11-25_GLOBAL_POLICY_SOFTWARE-LICENSING-ANTI-TAMPER-AND-TENANT-NEUTRAL-RELEASE-GOVERNANCE_V1.md](file:///f:/PrashantAcademy/docs/25_BUSINESS_REQUIREMENTS/2026-11-25_GLOBAL_POLICY_SOFTWARE-LICENSING-ANTI-TAMPER-AND-TENANT-NEUTRAL-RELEASE-GOVERNANCE_V1.md).

---

## 2. SSOT & ANTI-DUPLICATION WORKFLOW

Before creating any database table, model, API endpoint, or UI component:
- Search existing models: `docs/16_DATABASE_API/` and `backend/app/models/`
- Search existing services: `backend/app/services/`
- Search existing documentation: `python tools/docs_manager.py search <query>`
- Check SSOT entity classification: Master vs Transaction vs Ledger vs Configuration

---

## 3. DOCUMENTATION AUTO-MAINTENANCE

All reports, plans, audit summaries, and specifications generated during sessions must be saved directly into `docs/<MODULE>/`:
- Follow `YYYY-MM-DD_MODULE_DOCUMENT-TYPE_DESCRIPTION_VERSION.ext`
- Include complete YAML frontmatter
- Reindex using `python tools/docs_manager.py reindex`
- Validate using `python tools/docs_manager.py validate`

