---
title: "PrathamOne EduOS — Prospective Coaching Institute 20-Minute Live Demo Runbook"
module: "00_PRODUCT_OVERVIEW"
category: "DEMO-RUNBOOK"
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
tags: ["demo-runbook", "sales-demonstration", "client-presentation", "walkthrough-script", "coaching-director", "pitch-presentation"]
entities: ["PrathamOneEduOS", "DemoRunbook", "CoachingDemonstration"]
api_routes: ["/dashboard", "/students", "/leads/pipeline", "/fees", "/attendance", "/examinations", "/teacher-payroll", "/eduboard", "/training"]
related_modules: ["00_PRODUCT_OVERVIEW", "04_STUDENT_MANAGEMENT", "09_FEES_PAYMENTS", "06_TEACHER_PAYROLL", "17_UI_UX_DESIGN", "20_AUDITS_COMPLIANCE"]
---

# PRATHAMONE EduOS (Coaching Institute Edition)
## Prospective Coaching Institute: 20-Minute Live Demonstration Runbook

**Product Name:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Target Audience:** Coaching Institute Owners, Founders, Directors, Principals, and Head Accountants  
**Format:** Live Screen Share / In-Person Boardroom Demo (20 Minutes + 10 Minutes Q&A)  
**Presenter:** Sales Engineer / Implementation Specialist  
**Demo Tenant:** `PA001-DEMO` (Accessible via `/training` or dedicated staging server)  
**Author:** Jawahar R. Mallah  
**Organization:** Smritisys & AITDL Networks  
**Date:** November 20, 2026  

---

## 1. Demo Preparation Checklist (5 Minutes Before)

- [ ] Ensure browser is open at `/dashboard` in high-resolution (1080p, 100% zoom).
- [ ] Confirm the environment badge displays `TRAINING (PA001-DEMO)` to assure the client that no live production data is modified.
- [ ] Have a handheld barcode/QR scanner or webcam ready if demonstrating physical ID tap-and-go.
- [ ] Have a smartphone ready to demonstrate instant WhatsApp receipt delivery.
- [ ] Review institute profile: student strength, whether they focus on JEE/NEET or State Board, and current tools used (Excel/Tally/Classplus).

---

## 2. Minute-by-Minute Demonstration Script

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        20-MINUTE DEMO NARRATIVE FLOW TIMELINE                          │
├─────────┬───────────────────────────────┬──────────────────────────────────────────────┤
│ Time    │ Stage & Workspace             │ Strategic Client Impact                      │
├─────────┼───────────────────────────────┼──────────────────────────────────────────────┤
│ 00–03m  │ 1. Executive Dashboard        │ The "Director's Pulse" — Collections & Batch │
│ 03–06m  │ 2. Admissions & Lead CRM      │ 1-Click Inquiry-to-Enrolment Speed Run       │
│ 06–09m  │ 3. Zero-Leakage Fee Desk      │ 3-Click Collection & Deterministic Ledgers   │
│ 09–12m  │ 4. QR Attendance Kiosk        │ 60+ scans/min & Instant Parent Absent Alerts │
│ 12–15m  │ 5. EduBoard Classroom Canvas  │ Smart Classroom Whiteboard & In-App Recording│
│ 15–18m  │ 6. Teacher Payroll Engine     │ Automated Hourly/Session Vouchers (No Fights)│
│ 18–20m  │ 7. View-First Governance & CTA│ Rule 010 Safety & The 48-Hour Onboarding     │
└─────────┴───────────────────────────────┴──────────────────────────────────────────────┘
```

---

### Stage 1: The Executive Hook — Real-Time Operations Pulse (00:00 – 03:00)
**Workspace:** `/dashboard`

* **What to Show:**
  1. High-level metric cards: Active Enrolments (e.g. 540 Students), Daily Attendance Pulse (92.4%), Total Monthly Collections (₹18.6 Lakhs), and Overdue Balance Aging.
  2. Batch-wise health table showing attendance rates and fee clearance percentages.
* **What to Say:**
  > *"Director Sir, as a coaching owner, your morning begins with two critical questions: How many students actually showed up in class today? And how much fee is due for collection this week? Currently, your staff gives you numbers at 7:00 PM on a notepad. With PrathamOne EduOS, your entire multi-branch operational pulse is live right here the moment you sit at your desk."*

---

### Stage 2: Admissions & Lead CRM Pipeline (03:00 – 06:00)
**Workspace:** `/leads/pipeline`

* **What to Show:**
  1. Visual Kanban columns: `New Enquiry` ➔ `Demo Scheduled` ➔ `Follow-Up Due` ➔ `Counselling` ➔ `Enrolled`.
  2. Open a lead dossier drawer showing demo class attendance and parent follow-up history.
  3. Click **"Convert to Enrolment"** and demonstrate instant student profile generation without retyping names or phone numbers.
* **What to Say:**
  > *"During May and June, you get 200 walk-ins. In Excel, half of them get lost because staff forgets to call back. Here, every inquiry has a scheduled follow-up alarm. And when the parent pays the token admission fee, you don't re-enter the data into a student register—one click turns the prospect into a permanently enrolled learner with zero duplicate effort."*

---

### Stage 3: The Zero-Leakage Fee Counter & Instant Receipts (06:00 – 09:00)
**Workspace:** `/fees/collection` and `/fees/collect/:studentId`

* **What to Show:**
  1. Open a student's fee ledger. Show fee split heads: Tuition Fee, Lab Charges, Test Series, and GST.
  2. Show installment schedules (e.g. 3-installment plan).
  3. Record a ₹15,000 installment payment via UPI/Cash.
  4. Show the instant receipt preview (compliant with Indian GST and A4/thermal printing).
  5. Point out the deterministic cent/paisa math: zero rounding discrepancies.
* **What to Say:**
  > *"Coaching institutes lose up to 8% of revenue through informal discounts given by counselors or missed 3rd installments. In PrathamOne EduOS, every installment is locked to an immutable double-entry ledger. When a parent pays at the desk, the receipt is generated in 3 seconds and dispatched straight to the parent's WhatsApp. No lost receipt books, no discrepancies."*

---

### Stage 4: High-Speed QR Attendance & Parent Peace of Mind (09:00 – 12:00)
**Workspace:** `/attendance/qr-terminal`

* **What to Show:**
  1. Switch to the full-screen QR kiosk mode.
  2. Scan a sample student ID card barcode/QR code (simulated or via webcam).
  3. Show the instant green confirmation banner: Student Name, Photo, Batch, and Time Stamp.
  4. Point out the automated WhatsApp trigger: *"Dear Parent, Master Rahul has checked into Prashant Academy at 08:02 AM."*
* **What to Say:**
  > *"When 150 students rush into the institute at 8:00 AM, teachers cannot waste 15 minutes taking roll call. Our high-speed QR kiosk handles 60+ check-ins per minute. More importantly, if a student is absent, an automated WhatsApp alert reaches the father's phone within 15 minutes of batch start, eliminating parent anxiety and bunking."*

---

### Stage 5: EduBoard Smart Classroom & Lecture Capture (12:00 – 15:00)
**Workspace:** `/eduboard`

* **What to Show:**
  1. Launch the EduBoard canvas. Toggle between Whiteboard and Greenboard modes.
  2. Demonstrate vector pen tools, highlighters, geometric shapes, and coordinate axes.
  3. Import a sample PDF question paper onto the canvas.
  4. Click **"Record Lecture"** to demonstrate native in-app lecture recording without third-party OBS software.
* **What to Say:**
  > *"Most coaching centers spend ₹80,000 to ₹1,50,000 on proprietary smart-board software subscriptions or struggle with clunky tools. PrathamOne EduOS includes a built-in vector interactive board that runs on any touch TV or interactive flat panel. Teachers can annotate question papers and export the entire day's notes directly to the student portal in 1 click."*

---

### Stage 6: The "Holy Grail" — Automated Teacher Hourly Payroll (15:00 – 18:00)
**Workspace:** `/teacher-payroll`

* **What to Show:**
  1. Show faculty payment profiles: Hourly rate billing (e.g. ₹1,800/hr) vs Per-lecture vs Revenue-share.
  2. Show how timetable sessions automatically populate the teaching session register (`SES-202611-0012`).
  3. Click **"Generate Monthly Payroll"**: Show automated gross calculation, attendance deduction, TDS withholding, and generated payment vouchers.
  4. Show the 1-click sanitized Excel export.
* **What to Say:**
  > *"Every coaching owner dreads the 1st of the month when visiting IIT-JEE or NEET faculty submit handwritten hour slips. In PrathamOne, every teaching session is tracked against the actual timetable. Gross earnings and TDS are calculated down to the exact rupee. Monthly faculty reconciliation time drops from 3 days to under 10 minutes."*

---

### Stage 7: Rule 010 View-First Protection & The 48-Hour Cutover (18:00 – 20:00)
**Workspace:** `/students` and `/settings`

* **What to Show:**
  1. Highlight the prominent **"View Mode (Read-Only)"** badge on every screen.
  2. Try to click delete or modify on a student profile: show that the button is locked.
  3. Demonstrate activating scoped **"Edit Mode"** with audit confirmation.
  4. Conclude with the **48-Hour Onboarding Runbook**: Show the copy-paste spreadsheet grid in `/import-export`.
* **What to Say:**
  > *"Finally, why do owners trust PrathamOne? Because of our Rule 010 View-First Governance. Junior staff cannot accidentally erase a student or change an invoice. Everything is locked in read-only mode until explicitly authorized. And you don't have to wait months to switch—our copy-paste grid gets your entire institute up and running within 48 hours."*

---

## 3. High-Conversion Closing Script & Call to Action (CTA)

> *"Director Sir, you have built an exceptional academy with outstanding student results. Don't let operational chaos, fee leakage, or faculty disputes hold back your expansion.  
> We can provision your dedicated PrathamOne EduOS instance tomorrow morning, load your existing student list by tomorrow afternoon, and run your first live fee receipt on Day 2.  
> Which edition fits your expansion plans best—our Cloud Enterprise setup or the Sovereign On-Premise deployment?"*

---

## 4. Presenter FAQs & Objection Cheatsheet

1. **"Can we try it without touching our real data?"**  
   *Yes, we immediately give your team login access to the `PA001-DEMO` training sandbox with sample students, batches, and fee structures so your staff can practice risk-free.*
2. **"Do parents have to pay per WhatsApp message?"**  
   *You can link your own official WhatsApp Business API (Wati, AiSensy, Gupshup, or Meta Direct) at zero markup from us.*
3. **"What if our institute expands to 3 branches next year?"**  
   *PrathamOne is multi-branch ready. You can view all branches from one master executive login while branch managers see only their campus.*
