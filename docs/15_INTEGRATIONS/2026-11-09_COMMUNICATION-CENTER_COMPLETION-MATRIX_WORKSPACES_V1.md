---
title: "Communication Center Dedicated Submenu Workspaces Completion Matrix"
module: "15_INTEGRATIONS"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-09"
updated_date: "2026-11-09"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["communication", "whatsapp", "sms", "dlt", "submenus", "workspaces", "templates", "diagnostics"]
entities: ["CommunicationLog", "MessageTemplate", "AutomationRules", "FeeReminderQueue"]
api_routes: ["/api/v1/communication/templates", "/api/v1/communication/send", "/api/v1/communication/logs", "/api/v1/communication/diagnostics", "/api/v1/communication/automations"]
related_modules: ["04_STUDENT_MANAGEMENT", "05_TEACHER_MANAGEMENT", "09_FEES_PAYMENTS", "07_ATTENDANCE"]
---

# PRATHAMONE EduOS — COMMUNICATION CENTER WORKSPACES COMPLETION MATRIX

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R. Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Module:** Communication Center (`/communication`)  
**Status:** Completed & Production Verified  
**Date:** 2026-11-09  

---

## 1. Executive Summary

The Communication Center module (`/communication`) in **PrathamOne EduOS** has been transformed from a single tabbed screen into an enterprise-grade suite of **8 dedicated, deeply functional submenus and workspaces**. Each workspace features direct route URL synchronization, deep-link routing, Single Source of Truth (SSOT) data persistence via `communicationApi`, Rule 010 Global View-First & Scoped Edit Mode governance, and Training Mode isolation.

---

## 2. Dedicated Workspaces Breakdown & Functional Capabilities

| # | Workspace Name | Canonical Route | UI Submenu Label | Core Functional Capabilities | Rule 010 Scoped Actions |
|---|---|---|---|---|---|
| 1 | **Overview Hub** | `/communication/overview` | `Overview` | Multichannel dispatch dashboard, top KPI cards (Total Dispatched, Delivery Success Rate, Active Channels, Overdue Reminders, Saved Templates), gateway operational readiness cards, quick launchpad grid to all 7 specialized submenus, and 5-item recent dispatch feed with live timestamps. | View-First Default, Quick Navigation |
| 2 | **Broadcast Composer** | `/communication/broadcasts` | `Broadcast Composer` | Targeted multichannel blast composer supporting WhatsApp, SMTP Email, Telecom SMS, and All Channels. Includes template presets, dynamic parameter tag injection (`{student_name}`, `{amount}`, `{due_date}`), subject line, character/SMS counter, scheduled delivery datetime picker, recipient category filtering (Students, Parents, Staff, Batches), live search, one-off custom recipient adder, and selected tray. | `communication:broadcasts` required to dispatch |
| 3 | **WhatsApp Stream** | `/communication/whatsapp` | `WhatsApp Stream` | Interactive 1-on-1 direct WhatsApp Web chat launcher (`wa.me` generator) with prefilled message payloads, mobile phone preview mockup simulating real-time chat bubbles, official verified account styling, and recent broadcast links with direct chat triggers. | View-First Default, Chat Link Launcher |
| 4 | **Message Templates** | `/communication/templates` | `Message Templates` | Regulatory and operational message template catalogue categorized by Payment Receipts, Fee Reminders, Attendance Absence, Exam Results, Admissions, Announcements, and Staff Notices. Includes search, filter, system vs custom tags, and full modal editor for template creation, updates, and deactivation. | `communication:broadcasts` required to create/edit/delete |
| 5 | **Dispatch Logs** | `/communication/history` | `Dispatch Logs` | Complete audited trail of every sent message with filters for Channel (WhatsApp, Email, SMS, Direct Link) and Status (Delivered, Failed, Queued), search query, detailed inspection modal, and one-click retry trigger for failed carrier deliveries. | View-First Audited Log, Retry Actions |
| 6 | **Reminder Queues** | `/communication/automations` | `Reminder Queues` | Automated outbound rules engine for overdue fee alerts, real-time absenteeism WhatsApp notices, and automated receipt dispatches. Includes pending fee reminder queue table with configurable minimum balance threshold (₹100 to ₹10,000+), individual/bulk selection, preview modal, and batch dispatch engine. | `communication:broadcasts` required to save rules and batch dispatch |
| 7 | **Gateway Diagnostics** | `/communication/gateways` | `Gateway Diagnostics` | Live operational health inspection across WhatsApp Cloud API, Telecom SMS DLT Gateway, and SMTP Relay. Features live connection test & carrier ping tool, real-time latency indicators (42ms avg), DLT scrub status, TLS 1.3 cipher verification, and 99.98% rolling system uptime telemetry. | `communication:broadcasts` required to trigger diagnostic pings |
| 8 | **Channel Settings** | `/communication/settings` | `Channel Settings` | Enterprise regulatory policy configuration: TRAI DLT Commercial Telecom credentials (PE-ID, Sender/Header ID `PRASHT`, Telemarketer ID), WhatsApp Business Cloud API (Phone Number ID, WABA ID, Webhook Token), SMTP email host/port credentials, TRAI quiet hours (21:00 to 09:00), dispatch throttle limits, and DPDP 2023 compliance consent disclosures. | `communication:broadcasts` required to save settings |

---

## 3. Visual Verification Artifacts

Visual evidence captured in 1080p full-resolution viewports and archived in the active artifacts directory:

1. **Overview Workspace:** [screenshot_96_communication_overview.png](file:///C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/screenshot_96_communication_overview.png)
2. **Broadcast Composer:** [screenshot_97_communication_broadcasts.png](file:///C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/screenshot_97_communication_broadcasts.png)
3. **WhatsApp Stream:** [screenshot_98_communication_whatsapp.png](file:///C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/screenshot_98_communication_whatsapp.png)
4. **Message Templates:** [screenshot_99_communication_templates.png](file:///C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/screenshot_99_communication_templates.png)
5. **Dispatch Logs:** [screenshot_100_communication_history.png](file:///C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/screenshot_100_communication_history.png)
6. **Reminder Queues:** [screenshot_101_communication_automations.png](file:///C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/screenshot_101_communication_automations.png)
7. **Gateway Diagnostics:** [screenshot_102_communication_gateways.png](file:///C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/screenshot_102_communication_gateways.png)
8. **Channel Settings:** [screenshot_103_communication_settings.png](file:///C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/screenshot_103_communication_settings.png)

---

## 4. Test Suite & Quality Assurance

- **Test Suite:** `frontend/src/test/CommunicationDedicatedSubmenus.test.tsx`
- **Result:** **12/12 passing (100% green)**
- **Combined Workspace Suites:**
  - `CommunicationDedicatedSubmenus.test.tsx` (12 tests)
  - `CourseDedicatedSubmenus.test.tsx` (12 tests)
  - `StaffDedicatedSubmenus.test.tsx` (12 tests)
  - `StudentDedicatedSubmenus.test.tsx` (12 tests)
  - `Sidebar.test.tsx` (13 tests)
  - **Total:** **61/61 passing (100% green)**
- **Production Build:** Vite production build bundled cleanly in 14.65s (0 errors).
- **Deployment:** Live Nginx container `prashant_academy_frontend` reloaded successfully.

