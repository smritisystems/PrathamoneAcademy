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
