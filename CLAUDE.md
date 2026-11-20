# PRATHAMONE EduOS — CLAUDE AGENT GOVERNANCE DIRECTIVE
Product: PrathamOne EduOS (Coaching Institute Edition v1.0.0)  
Product Architect: Jawahar R. Mallah  
Organization: Smritisys & AITDL Networks  

## Core Directives
1. **Rule 010 (View-First Governance):** All application screens default to View Mode. Explicit Edit Mode is mandatory for updates.
2. **Rule 011 (Canonical Deduplication):** Master records (standards, subjects, fees) are registered once and reused across grade levels.
3. **Rule 012 (Automated Release Hygiene):**
   - Strictly follow `installer/release_whitelist.json`.
   - Never stage or package development tests, markdown docs, raw artwork, video clips (`.mp4`), or secrets into `dist/` or `.exe` builds.
   - Always run pre-release audit: `python scripts/check_release_hygiene.py`.
4. **Header Attribution:** Every source file must carry the Jawahar R. Mallah / Smritisys corporate header. Verify with `python scripts/manage_headers.py check`.
5. **Documentation:** Save all documentation into `docs/<MODULE>/` with valid YAML frontmatter and reindex with `python tools/docs_manager.py reindex`.
