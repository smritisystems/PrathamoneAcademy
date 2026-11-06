---
title: "Universal Print and Page Layout User Guide — Operational Manual for Institute Staff and Accountants"
module: "14_PRINTING_DOCUMENTS"
category: "USER-MANUAL"
document_type: "GUIDE"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-07"
updated_date: "2026-11-07"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["user-manual", "universal-print", "printing-guide", "paper-sizes", "receipt-printing"]
entities: ["Institution", "PaymentReceipt", "Student", "StaffProfile"]
api_routes: ["/api/v1/forms/render", "/api/v1/payments/{id}/receipt"]
related_modules: ["09_FEES_PAYMENTS", "05_TEACHER_MANAGEMENT", "08_EXAMINATION", "14_PRINTING_DOCUMENTS"]
---

# PRATHAMONE EduOS — UNIVERSAL PRINT & PAGE LAYOUT USER GUIDE

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Baseline Version:** 1.0.0  
**Target Audience:** System Administrators, Accountants, Front-Desk Executives, and Teachers  
**Author:** Jawahar R Mallah, Product Architect  
**Organization:** AITDL — AI Technology & Development Lab  
**Date:** 2026-11-07  

---

## 1. INTRODUCTION

The **Universal Print & Page Layout Engine** in PrathamOne EduOS gives you complete control over how documents, fee receipts, invoices, report cards, student ID cards, and attendance registers look when printed or saved as PDF.

Whether you are printing on an office laser printer (A4/Letter), a compact receipt voucher printer (A5), a front-desk POS thermal receipt roll (80mm), or a student PVC smart ID card printer (CR80), the system automatically optimizes layout and scaling so content fits perfectly.

---

## 2. HOW TO ACCESS UNIVERSAL PRINT

1. Navigate to any printable document in the system (e.g. **Fee Receipts**, **Forms & KYC**, **Student Report Cards**, or **Staff Payroll**).
2. Click the **Print** or **Print Options** button.
3. The **Universal Print Studio** modal will open with a live visual preview of your document on the selected paper format.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Universal Print & Page Layout Studio                 [Fit One Page] [X]│
├──────────────────────────────────────┬─────────────────────────────────┤
│ LIVE VISUAL PREVIEW CANVAS           │ PRINT CONTROLS PANEL            │
│                                      │                                 │
│  [A4 (210 × 297 mm) • Scale: 85%]    │  Paper Size:  [A4           ▼]  │
│  ┌───────────────────────────────┐   │  Orientation: (•) Portrait ( )  │
│  │ ----------------------------- │   │  Fit Mode:    (•) Fit 1 Page    │
│  │ PRASHANT ACADEMY              │   │  Margins:     [Normal (15mm) ▼] │
│  │ Official Fee Receipt          │   │  Scale:       [====85%====]     │
│  │                               │   │                                 │
│  │ Student: Aarav Sharma         │   │  [x] Print Background Graphics  │
│  │ Amount: ₹25,000               │   │  [x] Repeat Table Headers       │
│  │                               │   │                                 │
│  │ [Printable Area Margin Guide] │   │  [Reset to Defaults]            │
│  └───────────────────────────────┘   │                                 │
├──────────────────────────────────────┴─────────────────────────────────┤
│ [Cancel]                              [Save as PDF]    [Print Document]│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. KEY FEATURES & SETTINGS EXPLAINED

### 3.1 Paper Sizes
- **A4 (210 × 297 mm):** The standard paper for all admission forms, fee statements, student progress reports, and tax invoices.
- **A5 (148 × 210 mm):** Half the size of A4. Ideal for fee receipts, cash payment vouchers, and salary disbursement slips.
- **A3 (297 × 420 mm):** Double the size of A4. Perfect for large multi-subject examination broad-sheets and institute timetable boards.
- **US Letter & Legal:** Designed for North American standard paper stocks ($8.5 \times 11\text{ in}$ and $8.5 \times 14\text{ in}$).
- **Thermal 80mm & 58mm:** For high-speed thermal receipt rolls used at front-desk payment collection counters.
- **CR80 ID Card:** Exact dimensions of PVC plastic smart ID cards ($85.6 \times 53.98\text{ mm}$).
- **Custom:** Allows you to type any custom width and height in millimeters.

### 3.2 Intelligent Fit Options
1. **Fit 1 Page:** Shrinks or adjusts the entire document so that it fits onto a single physical page, preventing an unwanted second page with only one or two lines.
2. **Fit Width:** Scales the document horizontally so it fills the printable width of the paper, while allowing multiple pages vertically for long tables and statements.
3. **Original (100%):** Prints the document at its exact designed size without any automatic scaling.
4. **Shrink Oversized:** If the document is wider than the paper, it shrinks down to fit; if it already fits, it prints at 100%.
5. **Multi-Page Flow:** Prints continuous pages naturally while repeating table headers at the top of every new sheet.

### 3.3 Readability Protection Safeguard
If you choose *"Fit 1 Page"* on a very long document (such as a 4-page detailed fee ledger), the text would normally become microscopic and unreadable.

PrathamOne EduOS includes an **automatic readability safeguard**:
- If the required scale drops below **50%**, an amber warning alert will appear on your screen:
  > *"Document is scaled to 42%, which is below the recommended 50% readability threshold. Fine text and table data may be difficult to read."*
- Click **"Switch to Fit Width"** to let the document comfortably span 2 clean pages, or continue with one-page output if you explicitly prefer it.
- **The system will never delete or truncate text to force a single page.**

### 3.4 Page Margins
- **Normal (15 mm):** Standard formal institutional borders.
- **Narrow (7 mm):** Maximizes printable space for data-dense fee tables.
- **Minimum (3 mm):** Edge-to-edge printing for certificates and graphics.
- **None (0 mm):** Full-bleed borderless printing for PVC smart ID cards.

---

## 4. HOW TO SAVE AS PDF

1. In the Universal Print Studio, adjust your desired paper size and orientation.
2. Click the **Save as PDF** button in the bottom action bar.
3. In the system print dialog:
   - Under **Destination**, select **"Save as PDF"** or **"Microsoft Print to PDF"**.
   - Ensure **"Background graphics"** is checked.
4. Click **Save** and choose your destination folder.

---
*Manual Certified by Product Architect Jawahar R Mallah — AITDL AI Technology & Development Lab.*

