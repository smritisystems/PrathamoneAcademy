---
title: "Global Branding & Appearance Implementation Matrix"
module: "13_SYSADMIN_SETTINGS"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-08"
updated_date: "2026-11-08"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["branding", "matrix", "audit", "components", "pages"]
entities: ["Institution"]
api_routes: ["/api/v1/institutions/public/branding", "/api/v1/institutions/", "/api/v1/settings/profile"]
related_modules: ["01_ARCHITECTURE", "13_SYSADMIN_SETTINGS", "17_UI_UX_DESIGN"]
---

# PRATHAMONE EDUOS — GLOBAL BRANDING IMPLEMENTATION MATRIX

The following comprehensive matrix documents every audited module, screen, component, and print document in PrathamOne EduOS, verifying its dynamic branding source and operational status:

| Module / Area | Component / Screen | Branding Token / Asset Source | Verification Status | Notes |
| :--- | :--- | :--- | :---: | :--- |
| **Authentication** | Login Card Header | `linear-gradient(135deg, primary 0%, secondary 100%)` | **PASS** | Adopts active institution colors dynamically |
| **Authentication** | Login Crest Badge | `academyLogoUrl` with `monogram` fallback | **PASS** | Dynamic text initial on missing/failed image |
| **Authentication** | Login Sign-In Button | Brand gradient with `--brand-primary` glow | **PASS** | Replaced static blue gradient |
| **Authentication** | Login Background Halos | Dynamic primary/secondary/accent tinting | **PASS** | Harmonious atmosphere with deep contrast |
| **Authentication** | Login Platform Footnote | `prathamone-eduos-horizontal-transparent.png` | **PASS** | Dedicated platform software branding |
| **Application Shell** | Sidebar Header Crest | `linear-gradient(135deg, primary 0%, secondary 100%)` | **PASS** | Renders coaching class logo / monogram |
| **Application Shell** | Sidebar Active Links | `style={{ backgroundColor: branding.colors.primary }}` | **PASS** | Replaced hardcoded `bg-blue-600` |
| **Application Shell** | Sidebar Sub-menu Active | `style={{ backgroundColor: branding.colors.primary }}` | **PASS** | Replaced hardcoded `bg-blue-600` |
| **Application Shell** | Sidebar Platform Base | Official Circular Seal (`prathamone-eduos-seal`) | **PASS** | Independent software version attribution |
| **Application Shell** | Top Bar Reopen Sidebar | Dynamic primary text color | **PASS** | Matches institutional accent |
| **Application Shell** | Institution Selector | Focus ring uses `--brand-primary` | **PASS** | Dynamic ring token |
| **Shared UI** | Primary Buttons (`.btn-primary`) | `var(--brand-primary, #1e40af)` | **PASS** | Hover uses `--brand-primary-hover` |
| **Shared UI** | Secondary Buttons (`.btn-secondary`)| `color: var(--brand-primary)` | **PASS** | Hover uses `--brand-primary-50` |
| **Shared UI** | Form Input Focus (`.input:focus`) | `border-color: var(--brand-primary)` | **PASS** | Ring uses `--brand-primary-200` |
| **Settings** | Live Branding Preview | Multi-element Banner, Buttons, Nav, Print Header | **PASS** | Real-time simulation of saved theme |
| **Settings** | Theme Presets Selection | 4 Curated Presets with visual Active Indicator | **PASS** | Atomic application to live DOM preview |
| **Settings** | Custom Color Pickers | Primary, Secondary, Accent inputs | **PASS** | Live DOM update on input change |
| **Settings** | Save Changes Action | `PUT /settings/profile` + localStorage sync | **PASS** | Persists across refresh & re-login |
| **Settings** | Discard Changes Action | Restores original profile + DOM rollback | **PASS** | Instant DOM theme recovery |
| **Print & Reports** | Fee Receipt Header | `PrintDocumentHeader` with academy crest/monogram | **PASS** | Uses institution logo and monogram |
| **Print & Reports** | A5 Fee Voucher | Compact layout with institutional crest | **PASS** | Verified A5 bottom footer alignment |
| **Print & Reports** | Student ID Card | Academy header with institute logo & code | **PASS** | Dynamic branding with barcode |
| **Print & Reports** | Report Card Modal | Institutional header with grade statement | **PASS** | Verified print layout |
| **Print & Reports** | Platform Footnote | Understated 8pt PrathamOne EduOS footnote | **PASS** | Kept subtle and separate from academy |
