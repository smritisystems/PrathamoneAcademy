---
title: "Release Notes — PrathamOne EduOS v1.88.0-rc.2 (EduBoard Workspace Modes, Greenboard & Pop-Out Live Sync)"
module: "19_RELEASES_CHANGELOG"
category: "RELEASE-NOTES"
document_type: "RELEASE-NOTES"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.88.0-rc.2"
doc_version: "1.0"
created_date: "2026-11-12"
updated_date: "2026-11-12"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["release-notes", "v1.88.0-rc.2", "eduboard", "greenboard", "focus-mode", "popout", "websocket"]
entities: ["EduBoard", "EduBoardPage", "InstitutionSetting"]
api_routes: ["/api/v1/eduboard/preferences", "/api/v1/eduboard/boards/{board_id}/popout-session", "/api/v1/eduboard/popout/resolve", "/api/v1/eduboard/boards/{board_id}/ws-ticket", "/api/v1/eduboard/ws/boards/{board_id}"]
related_modules: ["03_ACADEMIC_MANAGEMENT", "12_RBAC_SECURITY", "17_UI_UX_DESIGN", "18_TESTING_QA"]
---

# Release Notes — PrathamOne EduOS `v1.88.0-rc.2`
**Release Channel:** Release Candidate (Local Validation; not auto-deployed to customer production)  
**Build Identifier:** `2026.11.12-REV-160-v1.88.0-rc.2`  
**Release Date:** 2026-11-12  
**Database Migration:** `046_create_eduboard_tables` (zero destructive or breaking schema changes)

---

## 1. Key Enhancements Over `v1.88.0-rc.1`

### 1.1 Collapsible Workspace & Three Display Modes
- **Standard Mode:** Preserves existing workspace layout while making `Pages` and `Saved Lecture Boards` independently collapsible with edge reopen pills.
- **Focus Mode:** Hides `<Sidebar />`, top `<header>`, `<TrainingModeBanner />`, and `<Footer />`, expands the teaching board to maximum canvas area, and moves `Pages` and `Saved Lecture Boards` into slide-over drawers with a clear **Exit Focus** action.
- **Immersive Full-Screen Mode:** Invokes native Fullscreen API (with automatic viewport-filling fallback) and `Escape`-key exit while retaining active tool/color state across transitions.

### 1.2 Classroom Greenboard, Blackboard & Collapsible/Dockable Toolbar
- Added classroom-authentic **Greenboard** and **Blackboard** slate surfaces with chalk tray bar, auto-contrast polarity switching, dual-pass chalk texture rendering, and chalk colors (`White`, `Yellow`, `Pink`, `Blue`, `Green`).
- Upgraded canvas toolbar into collapsible (`Expanded`, `Compact`, `Hidden` / `"Show Tools"`) and dockable (`Top`, `Left`, `Right`, `Bottom`, `Floating` draggable) layouts plus Fit-to-Screen (`0`) and keyboard shortcuts.

### 1.3 Detached Pop-Out Board Window & Multi-Tab Live Sync
- Added **Pop Out** launcher (`Pop Out Current Board`, `Open Greenboard in New Tab`, `Open Blackboard in New Tab`, `Open Whiteboard in New Tab`, `Open Presentation / Projector View`, `Open Detached Teaching Board with Compact Tools`) with popup-blocker fallback.
- Launches `/eduboard/window?launch=...` using scoped short-lived tokens (`eduboard_popout` + `eduboard_ws`) with instant `BroadcastChannel` + FastAPI WebSocket synchronization (`EduBoardRoomManager`) and strict Presentation Read-Only backend enforcement.

### 1.4 Preference Inheritance (`System -> Institution -> Individual`)
- Reused `InstitutionSetting` (`eduboard` and `eduboard_user_pref`) to store personal user display preferences, Reset to Institution Default, and Admin lock/policy overrides (`allow_user_display_overrides`, `allow_collaborator_mode`, `allow_popout_window`).

