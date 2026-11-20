---
title: "PrathamOne EduOS — One-Click Showcase Demo Dataset Engine Guide"
module: "00_PRODUCT_OVERVIEW"
category: "GUIDE"
document_type: "GUIDE"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.146.1"
doc_version: "1.0"
created_date: "2026-11-20"
updated_date: "2026-11-20"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["demo-dataset", "showcase-engine", "training-tenant", "pa001-demo", "live-presentation", "sales-rehearsal"]
entities: ["PrathamOneEduOS", "ShowcaseEngine", "PA001DemoTenant"]
api_routes: ["/dashboard", "/students", "/leads/pipeline", "/fees", "/attendance", "/teacher-payroll", "/training"]
related_modules: ["00_PRODUCT_OVERVIEW", "04_STUDENT_MANAGEMENT", "06_TEACHER_PAYROLL", "07_ATTENDANCE", "09_FEES_PAYMENTS"]
---

# PRATHAMONE EduOS (Coaching Institute Edition)
## One-Click Showcase Demo Dataset Engine (`PA001-DEMO`)

**Script:** `scripts/prepare_showcase_demo.py`  
**Execution Command:** `python scripts/prepare_showcase_demo.py`  
**Target Tenant:** `PA001-DEMO` (Isolated Sandbox Tenant ID: 2)  
**Safety Classification:** Strictly Read-Only / Demo Data (Zero impact on `id=1` Production Data)  
**Author:** Jawahar R. Mallah  
**Organization:** Smritisys & AITDL Networks  
**Date:** November 20, 2026  

---

## 1. Purpose & Overview

When demonstrating **PrathamOne EduOS** to prospective coaching institute directors and principals, an empty database or sparse dummy text ruins credibility. Indian coaching owners want to see:
- Real test prep batches (JEE Target Droppers, NEET Achievers, Foundation 10th).
- Authentic Indian names, guardian details, and fee installments.
- Realistic attendance pulses (e.g. 92.4% check-in rate).
- Completed faculty teaching sessions with hourly rate vouchers (e.g. ₹2,500/hr for Physics Dean).
- Active admission inquiries progressing across CRM pipeline stages.

The **One-Click Showcase Demo Dataset Engine** (`scripts/prepare_showcase_demo.py`) seeds or refreshes the isolated `PA001-DEMO` tenant in under 5 seconds with a production-grade, coherent coaching dataset.

---

## 2. Seeded Data Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        PA001-DEMO SHOWCASE DATASET BREAKDOWN                           │
├─────────────────────────┬──────────────┬───────────────────────────────────────────────┤
│ Entity Domain           │ Record Count │ Key Attributes & Business Context             │
├─────────────────────────┼──────────────┼───────────────────────────────────────────────┤
│ Academic Batches        │ 3 Batches    │ JEE-2027-ALPHA, NEET-2027-PHOENIX,            │
│                         │              │ FOUNDATION-10-OMEGA (40 student capacity each)│
│ Coaching Students       │ 40 Learners  │ Realistic Indian names, gender distribution,  │
│                         │              │ hostels, guardian contacts & masked Aadhaar.  │
│ Fee Ledger & Invoices   │ 40 Invoices  │ ₹95,000 package fee, installment schedules,   │
│                         │              │ 25% ASAT merit concessions, UPI receipts.     │
│ Attendance Time Logs    │ 120 Logs     │ 3-day history, high-speed QR check-in stamps, │
│                         │              │ 92.4% attendance pulse (4 unexcused absences).│
│ Faculty Profiles        │ 4 Teachers   │ Physics (Dean Dr. Prashant), Chemistry,       │
│                         │              │ Mathematics, and NEET Biology leads.          │
│ Faculty Teaching Hours  │ 6 Sessions   │ Timetable-linked session logs (`SES-202611-`) │
│                         │              │ with automated ₹2,500/hr voucher calculation. │
│ Admissions CRM Leads    │ 4 Enquiries  │ Multi-channel sources (Walk-in, Website,      │
│                         │              │ Referral, Ad) mapped across pipeline stages.  │
└─────────────────────────┴──────────────┴───────────────────────────────────────────────┘
```

---

## 3. How to Use for Sales Demonstrations

1. **Before the Meeting:**
   ```bash
   python scripts/prepare_showcase_demo.py
   ```
2. **Open the Application:**
   Navigate to `http://localhost:5173/dashboard` or `http://localhost/dashboard`.
3. **Verify Environment Badge:**
   Ensure the top banner indicates `TRAINING: PA001-DEMO`.
4. **Follow the 20-Minute Runbook:**
   Use [2026-11-20_PRODUCT-OVERVIEW_GUIDE_PROSPECTIVE-INSTITUTE-DEMO-RUNBOOK_V1.md](file:///f:/PrashantAcademy/docs/00_PRODUCT_OVERVIEW/2026-11-20_PRODUCT-OVERVIEW_GUIDE_PROSPECTIVE-INSTITUTE-DEMO-RUNBOOK_V1.md) to showcase Dashboard, CRM, Fees, QR Attendance, and Teacher Payroll.
