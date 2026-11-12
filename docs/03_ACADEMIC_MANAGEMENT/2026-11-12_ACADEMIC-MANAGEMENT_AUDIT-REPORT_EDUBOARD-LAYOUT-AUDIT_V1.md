---
title: "PrathamOne EduBoard — Workspace Layout, Surface & Multi-Window Pop-Out Audit"
module: "03_ACADEMIC_MANAGEMENT"
category: "AUDIT-REPORT"
document_type: "AUDIT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.88.0-rc.1"
doc_version: "1.0"
created_date: "2026-11-12"
updated_date: "2026-11-12"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["eduboard", "audit", "layout", "greenboard", "fullscreen", "popout", "websocket"]
entities: ["EduBoard", "EduBoardPage", "EduBoardRevision", "InstitutionSetting", "UserNavigationPreference"]
api_routes: ["/api/v1/eduboard/context", "/api/v1/eduboard/settings", "/api/v1/eduboard/boards", "/api/v1/eduboard/boards/{board_id}/sync"]
related_modules: ["01_ARCHITECTURE", "03_ACADEMIC_MANAGEMENT", "12_RBAC_SECURITY", "17_UI_UX_DESIGN"]
---

# PrathamOne EduBoard — Layout & Multi-Window Audit (`EDUBOARD_LAYOUT_AUDIT`)

## 1. Objective

Audit the baseline PrathamOne EduBoard (`v1.88.0-rc.1`) UI architecture, chrome layout, canvas surface engine, persistence model, and Nginx/FastAPI transport layer prior to implementing:
1. **Collapsible Workspace Display Modes** (`Standard`, `Focus`, `Immersive Full-Screen`),
2. **Classroom Greenboard & Chalk Experience + Collapsible/Dockable/Floating Toolbar**, and
3. **Detached Pop-Out Board Windows with Live Multi-Tab Synchronization & Scoped Auth**.

---

## 2. Observed Baseline Architecture

| Component / Layer | File Observed | Current State | Identified Gaps for Enhancement |
|---|---|---|---|
| **Application Shell** | `frontend/src/components/Layout.tsx`, `frontend/src/store/sidebarStore.ts`, `frontend/src/components/Footer.tsx` | Fixed `<Sidebar />`, top `<header>`, `<TrainingModeBanner />`, `<main>`, and `<Footer />`. `sidebarStore` already supports `'expanded' \| 'collapsed' \| 'hidden'` (`Ctrl+B`). | `Layout.tsx` has no Focus/Immersive hide-chrome override for header/banner/footer, nor does `/eduboard` have a dedicated chromeless pop-out route outside `<Layout />`. |
| **EduBoard Workspace** | `frontend/src/pages/EduBoardWorkspace.tsx` | 12-column CSS grid: 3 columns (`Pages (N)` + `Saved Lecture Boards`), 9 columns (`EduBoardCanvas`). Uses boolean `isFullscreen` CSS `fixed inset-0` overlay that hides `Saved Lecture Boards` and leaves 2-column `Pages` pinned. | No `Standard / Focus / Full-Screen` mode selector; panels are not independently collapsible; `requestFullscreen()` API + `Escape` exit are not wired; no Focus drawer overlay for Pages/Boards; no user preference persistence; no Pop-Out launch menu or active detached window indicator. |
| **EduBoard Canvas** | `frontend/src/components/eduboard/EduBoardCanvas.tsx` | Konva 1280×720 stage with zoom (`0.5..2.5`), pan, undo/redo (40 depth), stylus-only toggle, 2×10 inline toolbar (`toolbar always expanded at top`), solid hex fills (`#14532d` green, `#111827` black). | Lacks authentic Greenboard/Blackboard slate texture & chalk tray aesthetic; pen/chalk render identically without chalk texture/contrast guard; missing Fit-to-Screen control, keyboard shortcuts (`V/P/H/E/L/A/R/O/T`), and collapsible (`Expanded / Compact / Hidden`) / dockable (`top/left/right/bottom/floating`) toolbar state. |
| **Settings & Preferences** | `backend/app/services/eduboard_service.py`, `backend/app/models/settings.py` (`InstitutionSetting`), `backend/app/models/navigation.py` | `InstitutionSetting(category="eduboard", key="workspace_config")` stores attachment size, autosave debounce, default mode, notify flag. | No `System Default -> Institution Default -> Individual Preference` inheritance hierarchy for UI layout/display settings and admin policy overrides (`allow_user_display_overrides`, `allow_collaborator_mode`, `allow_popout_window`). |
| **Real-Time & Proxy** | `backend/app/main.py`, `frontend/nginx.conf`, Python runtime (`fastapi 0.115.14`, `uvicorn 0.34.0`, `websockets 17.4`) | No WebSocket routes exist yet in `backend/app`. `nginx.conf` `/api/` already configures `Upgrade $http_upgrade` and `Connection 'upgrade'`, **except** `Content-Security-Policy` `connect-src` only lists `'self' https://api.razorpay.com ...` without explicit `ws: wss:`. | Add backend `EduBoardRoomManager` WebSocket hub (`/api/v1/eduboard/ws/boards/{board_id}`), scoped short-lived HMAC launch tokens (`/popout-session` & `/popout/resolve`), same-origin `BroadcastChannel` acceleration, and update `nginx.conf` CSP `connect-src` to allow `ws: wss:`. |

---

## 3. SSOT & Anti-Duplication Strategy

| Capability | Reuse Decision | Target Artifact |
|---|---|---|
| **Canvas Engine & Scene Schema** | Reuse `EduBoardCanvas` & Konva `scene_json` `schemaVersion: 1`; pass responsive layout props (`toolbarState`, `toolbarPosition`, `hideChromeControls`, etc.). | `frontend/src/components/eduboard/EduBoardCanvas.tsx` |
| **Institution & User Preferences** | Reuse `InstitutionSetting` (`category="eduboard"` for institution defaults/governance and `category="eduboard_user_pref", key=f"user_{user_id}"` for per-user overrides — zero redundant table/migration needed, isolated per institution & Training tenant). | `backend/app/services/eduboard_service.py` |
| **Auth & Scoped Pop-Out Tokens** | Reuse `settings.SECRET_KEY` + PyJWT + `get_current_active_user` / `enforce_institution_access` / `EduBoardService.check_permission` so pop-out links never expose login JWTs or raw unrestricted IDs. | `backend/app/api/v1/endpoints/eduboard.py` |
| **Optimistic Concurrency & Recovery** | Reuse existing `expected_revision_no`, per-page `version`, `409 Conflict` resolution modal, and IndexedDB `eduboardRecoveryStore` across both main and detached windows. | `frontend/src/pages/EduBoardWorkspace.tsx`, `frontend/src/pages/EduBoardWindowPage.tsx` |
| **Alembic Baseline** | Keep `046_create_eduboard_tables (head)` linear and untouched. | `backend/alembic/versions/` |

