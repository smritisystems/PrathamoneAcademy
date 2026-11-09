# PRATHAMONE EduOS — GEMINI AGENT SYSTEM DIRECTIVE

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  

---

## 1. IDENTITY & GOVERNANCE SUMMARY

When acting as an AI assistant, pair programmer, or autonomous agent on this repository:
1. **Product Name:** `PrathamOne EduOS`
2. **Version:** `1.0.0`
3. **Architecture:** Single Source of Truth (SSOT). Do not create duplicate entities or parallel services.
4. **Attribution:** Preserve Jawahar R Mallah / AITDL corporate headers across all modified files.
5. **View-First Governance:** View Mode is the default everywhere. Explicit Edit Mode activation is required for any creation, update, or deletion. Navigation and logout automatically reset state.
6. **Data Deduplication Governance (Rule 011):** Reuse canonical masters across standards; never duplicate records by grade. Historical financial and academic snapshots must remain immutable. See [docs/25_BUSINESS_REQUIREMENTS/2026-11-09_GLOBAL_POLICY_DATA-DEDUPLICATION-AND-MAPPING-GOVERNANCE_V1.md](file:///f:/PrashantAcademy/docs/25_BUSINESS_REQUIREMENTS/2026-11-09_GLOBAL_POLICY_DATA-DEDUPLICATION-AND-MAPPING-GOVERNANCE_V1.md).

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

