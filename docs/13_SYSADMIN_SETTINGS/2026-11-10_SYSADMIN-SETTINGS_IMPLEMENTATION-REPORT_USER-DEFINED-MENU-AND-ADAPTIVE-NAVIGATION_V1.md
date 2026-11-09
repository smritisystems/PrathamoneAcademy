---
title: "User-Defined Menu & Intelligent Adaptive Navigation Engine Implementation Report"
module: "13_SYSADMIN_SETTINGS"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-10"
updated_date: "2026-11-10"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["navigation", "my-menu", "adaptive-menu", "role-defaults", "global-search", "settings"]
entities: ["UserNavigationPreference", "UserNavigationActivity", "InstitutionSetting", "SettingAuditLog", "User"]
api_routes: ["/api/v1/navigation/config", "/api/v1/navigation/preferences", "/api/v1/navigation/track-activity", "/api/v1/navigation/suggestions", "/api/v1/navigation/admin/policy"]
related_modules: ["00_PRODUCT_OVERVIEW", "12_RBAC_SECURITY", "13_SYSADMIN_SETTINGS", "17_UI_UX_DESIGN"]
---

# USER-DEFINED MENU & INTELLIGENT ADAPTIVE NAVIGATION ENGINE IMPLEMENTATION REPORT

**Product:** PrathamOne EduOS — Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R. Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Institution:** Prashant Academy Coaching Institute  
**Deployment Status:** Complete, Verified & In Production  

---

## 1. EXECUTIVE OVERVIEW

In compliance with the enterprise mandate, **PrathamOne EduOS (Coaching Institute Edition)** has been equipped with a personalized navigation system: the **User-Defined Menu & Intelligent Adaptive Navigation Engine**.

This subsystem enables every authorized faculty member, administrator, accountant, and counselor to curate their own daily workspace menu based on their assigned role, verified permissions, and personal workflow habits. The engine provides three distinct navigation modes (**Standard Menu**, **Hybrid Menu**, and **My Menu Only**), an in-depth **My Menu Customization Studio**, privacy-preserving **usage telemetry recommendations**, and an institute-level **Administrative Governance Panel**.

Strict Single Source of Truth (SSOT) and RBAC security rules have been preserved: personal shortcuts grant no additional permissions, hidden items never revoke permissions, and backend authorization independently verifies every route access.

---

## 2. NAVIGATION MODES IMPLEMENTATION

The navigation system provides three modes:

```
[Mode A: Standard Menu] ────────► Full institutional hierarchy with collapsible submenus
[Mode B: Hybrid Menu]   ────────► Prominent My Menu shortcuts on top + All Modules toggle
[Mode C: My Menu Only]  ────────► Distraction-free workspace showing only pinned items & groups
```

### 2.1 Mode A: Standard Menu (Default)
- Displays the complete canonical role-based menu hierarchy with collapsible submenus.
- Respects user role and permissions.
- Features a quick-access search button (`Ctrl+K`) and a "Customize My Menu" action.
- Serves as the authoritative default for all new user accounts.

### 2.2 Mode B: Hybrid Menu
- Displays the user's pinned shortcuts prominently at the top with a dedicated star badge (`★ My Menu`).
- Features a seamless one-click toggle between `[★ My Menu]` and `[All Modules]`.
- Allows users to jump between their high-frequency actions and broad exploration without leaving the active page.

### 2.3 Mode C: My Menu Only
- Hides the standard menu hierarchy completely to eliminate clutter.
- Displays only the user's pinned items and custom personal groups.
- Incorporates a prominent, one-click **"Restore Standard Menu"** button directly in the sidebar.
- Preserves all mandatory account and security controls: global search, settings access, SysAdmin superuser link, user profile card, and session logout.
- Displays an empty-state guidance card with an "Add Shortcuts" button if no items have been pinned yet.

---

## 3. ARCHITECTURE & SINGLE SOURCE OF TRUTH (SSOT)

### 3.1 Database Schema Extensions (Alembic Migration 034)
The subsystem introduces two tables via `backend/alembic/versions/034_user_defined_menu_and_navigation.py`:

1. `user_navigation_preferences` (Configuration Entity):
   - `id`: Integer primary key.
   - `user_id`: Foreign key to `users.id` (CASCADE).
   - `institution_id`: Foreign key to `institutions.id` (CASCADE).
   - `navigation_mode`: `standard` | `hybrid` | `my_menu_only`.
   - `pinned_items`: JSON string of pinned module and sub-item keys.
   - `hidden_items`: JSON string of hidden module keys.
   - `custom_groups`: JSON string of user-defined groups (`[{"id": "...", "name": "...", "items": [...]}]`).
   - `item_order`: JSON string of custom display order.
   - `dismissed_suggestions`: JSON string of dismissed recommendation IDs.
   - Unique constraint: `uq_user_inst_nav_preference` on `(user_id, institution_id)`.

2. `user_navigation_activities` (Telemetry / Usage Entity):
   - `id`: Integer primary key.
   - `user_id`: Foreign key to `users.id` (CASCADE).
   - `institution_id`: Foreign key to `institutions.id` (CASCADE).
   - `module_key`: Module identifier (e.g., `fees`, `students`, `attendance`).
   - `route_path`: URL path visited.
   - `label`: Human-readable label.
   - `accessed_at`: Timestamp with index on `(user_id, institution_id, accessed_at)`.

### 3.2 Canonical Module Registry (`CANONICAL_MODULE_REGISTRY`)
Both the backend (`backend/app/services/navigation_service.py`) and frontend (`frontend/src/config/modules.ts`) derive their module taxonomy from a synchronized Canonical Registry:
- **Core:** Dashboard, Reports
- **Academic:** Academic Structure, Tests & Results
- **Students & CRM:** Admissions & CRM, Students Master
- **Finance:** Fees & Payments, Teacher Payroll
- **Workforce:** Faculty Directory, Staff Directory
- **Learning:** Study Materials & Library
- **Operations:** Attendance, Print Forms & KYC, Communication Center
- **Admin & Tools:** Users & Roles, Settings, System Releases, Training Demo Lab, Import & Export, SysAdmin Center

---

## 4. INTELLIGENT USAGE-BASED RECOMMENDATIONS ENGINE

The system computes recommendations based on 7, 30, and 90-day activity telemetry:
- **Frequently Used:** Detects modules visited $\ge 3$ times in the last 7 days that are not yet pinned (e.g., *"Pin 'Fee Collection Desk' to My Menu"*).
- **Recently Visited:** Surfaces recently accessed workspaces for quick shortcut creation.
- **Rarely Used / Declutter:** Offers to unpin or hide items with 0 visits over the past 30 days.
- **Privacy & Security Integrity:**
  - Strictly captures route visit timestamps; never collects form inputs, student records, or financial figures.
  - Telemetry is debounced to avoid treating rapid page refreshes as distinct usage events.
  - Recommendations are purely advisory; the engine never alters user menus or permissions automatically without explicit user approval.

---

## 5. INSTITUTE GOVERNANCE & PRECEDENCE RULES

Administration settings in `InstitutionSetting` (category `"navigation"`) establish strict hierarchical precedence:

$$\text{System Default} \longrightarrow \text{Institute Policy} \longrightarrow \text{User Preference}$$

- **Personalization Master Switch:** Administrators can disable user customization across the institute, enforcing fixed role menus.
- **Mode Restrictions:** Administrators can disable `my_menu_only` mode, in which case users are constrained to `standard` or `hybrid`.
- **Role-Based Default Menus:** Configurable defaults for 7 distinct roles (`admin`, `principal`, `accountant`, `teacher`, `counselor`, `staff`, `sysadmin`).
- **Administrative Reset:** 1-click action to reset all institute users back to role-default menus.
- **Audit Logging:** Every administrative policy change is immutably logged into `setting_audit_logs`.

---

## 6. VERIFICATION EVIDENCE & SCREENSHOT AUDIT

Visual evidence was captured via headless Playwright automation (`scripts/capture_navigation_modes.py`) and verified:

1. **Standard Menu Mode:** [`nav_mode_1_standard.png`](file:///f:/PrashantAcademy/docs/assets/screenshots/nav_mode_1_standard.png)  
   *Verified full institutional hierarchy with collapsible submenus, search bar, and mode indicator.*
2. **My Menu Customization Studio:** [`nav_customizer_studio.png`](file:///f:/PrashantAcademy/docs/assets/screenshots/nav_customizer_studio.png)  
   *Verified 3-mode selector, module catalog with direct sub-page shortcuts, reordering controls, and suggestion tabs.*
3. **Hybrid Menu Mode:** [`nav_mode_2_hybrid.png`](file:///f:/PrashantAcademy/docs/assets/screenshots/nav_mode_2_hybrid.png)  
   *Verified prominent My Menu shortcuts at the top and the one-click `[★ My Menu] / [All Modules]` toggle.*
4. **Global Search Command Palette:** [`nav_global_search_palette.png`](file:///f:/PrashantAcademy/docs/assets/screenshots/nav_global_search_palette.png)  
   *Verified real-time keyword matching across modules and sub-items, category filters, and 1-click pin toggles.*
5. **My Menu Only Mode:** [`nav_mode_3_my_menu_only.png`](file:///f:/PrashantAcademy/docs/assets/screenshots/nav_mode_3_my_menu_only.png)  
   *Verified distraction-free personal shortcuts layout and the "Restore Standard Menu" button.*
6. **Institutional Navigation Governance Panel:** [`nav_admin_governance_panel.png`](file:///f:/PrashantAcademy/docs/assets/screenshots/nav_admin_governance_panel.png)  
   *Verified institute personalization toggles, role-based default menus editor, and audit log integration.*

---

## 7. AUTOMATED TEST SUITE EXECUTION

- **Backend Pytest Suite:** `backend/tests/test_navigation_engine.py` (4/4 passed in 9.75s).
  - `test_get_navigation_config`: PASSED.
  - `test_update_and_reset_user_preferences`: PASSED.
  - `test_activity_tracking_and_suggestions`: PASSED.
  - `test_admin_policy_management`: PASSED.
- **Frontend Compilation:** `tsc && vite build` compiled cleanly with 0 TypeScript errors.
- **Corporate Header Compliance:** `python scripts/manage_headers.py check` verified 485/485 files passed (100% compliant).

