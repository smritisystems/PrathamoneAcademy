---
title: "PrathamOne EduOS — Commercial Executive Brief & Institutional One-Pager"
module: "00_PRODUCT_OVERVIEW"
category: "BROCHURE"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.146.1"
doc_version: "1.0"
created_date: "2026-11-20"
updated_date: "2026-11-20"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["commercial-brief", "one-pager", "brochure", "executive-summary", "indian-coaching", "pricing-collateral"]
entities: ["PrathamOneEduOS", "CommercialBrief", "InstitutionalCollateral"]
api_routes: ["/dashboard", "/students", "/fees", "/attendance", "/examinations", "/teacher-payroll", "/eduboard"]
related_modules: ["00_PRODUCT_OVERVIEW", "01_ARCHITECTURE", "09_FEES_PAYMENTS", "06_TEACHER_PAYROLL", "20_AUDITS_COMPLIANCE"]
---

# PRATHAMONE EduOS (Coaching Institute Edition)
## Commercial Executive Brief & Institutional One-Pager

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Baseline Version:** 1.0.0 (Runtime Revision: v1.146.1)  
**Product Architect:** Jawahar R. Mallah  
**Organization:** Smritisys & AITDL Networks  
**Client Showcase:** Prashant Academy Coaching Institute (Founder & Dean: Prashant Tejam)  
**Date:** November 20, 2026  
**Companion Assets:**
- **Interactive HTML One-Pager (Printable A4):** [PrathamOne_EduOS_Commercial_One_Pager.html](../assets/commercial/PrathamOne_EduOS_Commercial_One_Pager.html)
- **12-Slide Enterprise Pitch Deck (PowerPoint):** [PrathamOne_EduOS_Pitch_Deck.pptx](../assets/commercial/PrathamOne_EduOS_Pitch_Deck.pptx)
- **12-Slide Master PDF Export:** [PrathamOne_EduOS_Pitch_Deck.pdf](../assets/commercial/PrathamOne_EduOS_Pitch_Deck.pdf)

---

## 1. The Core Value Proposition

> **"Your Institute Controls Its Data. We Simplify Its Operations."**

Indian coaching institutes operate under intense competitive pressure. Student footfall during peak admission months, faculty negotiations, multiple fee installment chasing, and parent anxieties require an operating system engineered specifically for coaching realities—not a repurposed school ERP or a generic video-selling app.

**PrathamOne EduOS** delivers a unified, 20-in-1 institutional operating system that bridges every operational gap between student walk-in and final exam ranking.

---

## 2. The 5 Core Operational Failure Points Solved

1. **Revenue Leakage & Unreconciled Installments:**
   - *Problem:* Manual promises in registers, missed second/third installments, untracked post-dated cheques (PDCs).
   - *PrathamOne Solution:* Deterministic minor-unit allocation (`financial_allocation.py`), automatic split heads (Tuition, Lab, Exam, GST), aging bands, and instant WhatsApp receipts within 3 seconds.
2. **Accidental Data Modification & Corruption:**
   - *Problem:* Front-desk operators and junior counselors accidentally editing, overwriting, or deleting student records.
   - *PrathamOne Solution:* **Rule 010 View-First Governance.** Every single workspace across 110+ screens is locked in read-only mode by default. Modifying records strictly requires activating an authorized, scoped Edit Mode session.
3. **Faculty Payout & Compensation Disputes:**
   - *Problem:* Visiting faculty charging variable hourly rates (₹800–₹3,500/hr) or per-lecture payouts leading to monthly friction and reconciliation headaches.
   - *PrathamOne Solution:* Built-in **Teacher Payroll Engine**. Automatically links daily timetable attendance to sequential compensation vouchers (`SES-YYYYMM-XXXX`) with automated TDS calculations and sanitized Excel exports.
4. **Parent App Fatigue & Notification Blindness:**
   - *Problem:* Parents ignore or uninstall coaching mobile apps; push notifications go unread.
   - *PrathamOne Solution:* **WhatsApp-First Automation.** Arrival/departure attendance logs, fee receipts, and test series ranks are dispatched directly to parent WhatsApp numbers via official DLT/BSP channels.
5. **Student Data Poaching & Vendor Lock-In:**
   - *Problem:* Third-party SaaS providers hosting student databases in shared clouds, risking data theft by rival institutes.
   - *PrathamOne Solution:* **100% Data Sovereignty.** Run on your own private cloud VPS or local on-premise Docker server. Hardware node-locking via TPM 2.0 / WebAuthn and DPDP Act 2023 masked Aadhaar privacy.

---

## 3. The 20-in-1 Modular Architecture

PrathamOne EduOS replaces up to 6 disconnected tools (Excel, Tally, Google Forms, Biometric app, Smartboard software, WhatsApp bulk sender):

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        20 INTEGRATED WORKSPACES IN ONE SYSTEM                          │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ Administration & Pulse   │ Academic & Classroom        │ Finance & Workforce           │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ • 1. Executive Dashboard │ • 7. QR Attendance Kiosk    │ • 4. Fees & Billing Engine    │
│ • 2. Student Directory   │ • 8. Timetable & Clashes    │ • 5. Concession Management    │
│ • 3. Admissions CRM      │ • 9. NEET/JEE Exam Engine   │ • 6. Scholarship Tracking     │
│ • 13. Communication Hub  │ • 10. Results & Report Book │ • 11. Staff HR & Rosters      │
│ • 14. Central Reports    │ • 15. Courses & Question Bk │ • 12. Teacher Hourly Payroll  │
│ • 19. Data Import/Export │ • 16. Homework Studio       │ • 18. Forms & Bulk Printing   │
│ • 20. Training Sandbox   │ • 17. EduBoard Smart Canvas │                               │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

---

## 4. Transparent Commercial Pricing (Pan-India)

| Commercial Edition | Target Institute Scale | Commercial Pricing (INR) | Deployment Architecture |
|:---|:---|:---|:---|
| **Professional Edition** | Single Branch (100–350 Students) | **₹36,000 / year** (or ₹3,500/month) | Fully Managed Dedicated Cloud |
| **Enterprise Edition** | Mid-Sized (350–1,200 Students) | **₹72,000 / year** (or ₹6,900/month) | Private VPS / High Performance |
| **Sovereign Edition** | Multi-Branch (1,200+ Students) | **₹1,80,000 One-Time** + ₹36k/yr AMC | 100% Air-Gapped On-Premise Docker |

*Optional Turnkey Hardware Bundle (Industrial Barcode/QR Scanner + 80mm High-Speed Thermal Receipt Printer): ₹35,000 one-time per branch.*

---

## 5. The 48-Hour Rapid Onboarding Guarantee

We recognize that institute operations cannot pause for lengthy software setups:
- **Day 1:** Automated system provisioning, institute branding setup, and student data extraction.
- **Day 2:** Copy-paste spreadsheet grid import via `/import-export`, fee package allocation, role-based staff rehearsals in `/training` (`PA001-DEMO`), and production go-live.

---

## 6. Contact & Demonstration Booking

- **Product Architect:** Jawahar R. Mallah
- **Commercial Engineering & Deployments:** Smritisys & AITDL Networks
- **Official Portal:** `https://smritisys.com`
- **Showcase Client Campus:** Prashant Academy, Pune (Dean: Prashant Tejam)
