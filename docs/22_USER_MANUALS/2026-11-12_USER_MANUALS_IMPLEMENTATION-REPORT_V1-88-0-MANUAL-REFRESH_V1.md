---
title: "PrathamOne EduOS v1.88.0 — User Manuals & Documentation Refresh Report"
module: "22_USER_MANUALS"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.88.2"
doc_version: "1.1"
created_date: "2026-11-12"
updated_date: "2026-11-12"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["user-manuals", "documentation", "v1.88.2", "eduboard", "homework", "receipt-print", "help-centre"]
entities: ["Homework", "EduBoard", "FeeReceipt", "HelpArticle"]
api_routes: ["/api/v1/help/overview", "/api/v1/eduboard/boards", "/api/v1/homework"]
related_modules: ["18_TESTING_QA", "22_USER_MANUALS", "24_AI_AGENT_KNOWLEDGE"]
---

# PrathamOne EduOS `v1.88.2` — User Manuals & Documentation Refresh Report

## 1. Summary of Updated Manual Deliverables

All customer-facing HTML, Playwright-rendered PDF, and `python-docx` Word manuals were regenerated for **PrathamOne EduOS v1.88.2** (`Build: 2026.11.12-REV-161-v1.88.2`, dated **November 12, 2026**) and synchronized across both `docs/user_manual/` and `docs/22_USER_MANUALS/`.

### Updated Generator Scripts
- `scripts/generate_user_manual_content.py` — Updated shared HTML cover metadata (`v1.88.2`, `November 12, 2026`).
- `scripts/build_all_manuals.py` — Updated TOC, document control table, version badges, `docs/assets/` screenshot fallback resolution, and added Sections **4.21** (*Homework & Assignment Studio*), **4.22** (*PrathamOne EduBoard Interactive Classroom*), **4.23** (*Official Fee Receipt Printing & PDF Parity*), and **4.24** (*Help & About Centre*).
- `scripts/build_manual_docx.py` — Updated cover/intro metadata (`v1.88.2`), `docs/assets/` screenshot fallback in `add_figure`, and added Sections **4.14–4.17** covering Homework, EduBoard, A5/A4 Receipt Printing & PDF Parity, and Help & About Centre.

### Regenerated Output Artifacts (`docs/22_USER_MANUALS/` & `docs/user_manual/`)

| Deliverable File | Format | Verified Size |
|---|---|---|
| `PrathamOne_Academy_Complete_User_Manual.pdf` | PDF (Playwright Chromium) | `13,351,524` bytes |
| `PrathamOne_Academy_Complete_User_Manual.docx` | Microsoft Word (`python-docx`) | `9,485,533` bytes |
| `PrathamOne_Academy_Quick_Start_Guide.pdf` | PDF (Playwright Chromium) | `913,939` bytes |
| `PrathamOne_Academy_Sysadmin_Manual.pdf` | PDF (Playwright Chromium) | `1,543,155` bytes |
| `complete_user_manual.html` | HTML Source | `87,073` bytes |
| `quick_start_guide.html` | HTML Source | `15,730` bytes |
| `sysadmin_manual.html` | HTML Source | `19,102` bytes |

