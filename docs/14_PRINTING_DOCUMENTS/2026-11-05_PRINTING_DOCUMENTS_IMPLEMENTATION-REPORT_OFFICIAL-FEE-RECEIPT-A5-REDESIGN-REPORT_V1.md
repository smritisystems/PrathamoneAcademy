---
title: "Official Fee Receipt — Premium A5 Portrait Redesign Report"
module: "14_PRINTING_DOCUMENTS"
category: "IMPLEMENTATION-REPORT"
document_type: "IMPLEMENTATION-REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-05"
updated_date: "2026-11-05"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["14-printing-documents", "implementation-report"]
entities: []
api_routes: ["/api/v1/print"]
related_modules: []
---

# Official Fee Receipt — Premium A5 Portrait Redesign Report

## Executive Summary
The **PrathamOne Academy Official Fee Receipt** has been completely redesigned from the ground up as a compact, premium **A5 portrait document** (148 × 210 mm), matching the visual hierarchy, geometry, and styling shown in the reference design.

The document renders with 100% vector fidelity on both digital screens and physical/PDF printers. It eliminates dashboard card clutter, guarantees single-page A5 containment, dynamically computes fee ledger balances and circular donut gauges, and incorporates security features including a computer-verified QR code and digital authorized signature.

---

## 1. Visual Architecture & Design Parity

![Reference A5 Official Fee Receipt](/C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/.user_uploaded/media_1793822195743_b8b8dd3b.jpg)

### A. Anatomy of the Redesigned A5 Receipt

| Section | UI & Print Component | Visual Treatment & Specifications |
|---|---|---|
| **1. Header** | `Official Academy Header` | Deep royal blue `PA` monogram emblem (48px rounded-2xl), uppercase brand title, tagline, location pin, phone, and official contact email. Decorative top-right curved arc. |
| **2. Title Banner** | `Two-Tone Receipt Ribbon` | Two-tone banner: Dark navy (`#0b2b5c`) angled polygon cut with `OFFICIAL FEE RECEIPT`, and light sky-blue ribbon (`#dbeafe`) with monospace `RECEIPT NO. RCP-2026-0167`. |
| **3. Metadata Strip** | `4-Column Bordered Pill Strip` | Segmented grid with icons: **Payment Date** (`04 Nov 2026`), **Academic Year** (`2026 – 27`), **Invoice Ref.** (`INV-2026-0157`), and **Status Badge** (`PAID` in green pill). |
| **4. Student & Amount** | `Student Identity & Received Box` | 12-column card: Left 7 cols show student name, admission number, class & batch with user icon; Right 5 cols show wallet icon, prominent `₹7,000` text (30px), and Indian Rupee text in words (`Rupees Seven Thousand Only`). |
| **5. Payment Method** | `Transaction Reference Strip` | Rounded strip: CreditCard icon + `Payment Method: Bank Transfer`, vertical divider, and ArrowLeftRight icon + `Transaction Ref: TXN-2026-0167`. |
| **6. Fee Summary** | `Fee Account Summary + Donut Gauge` | Angled navy tab with 5 financial ledger rows (Total Fee, Previous Payments, Current Payment, Total Paid [Green], Outstanding Balance [Rose]), plus a vector SVG circular donut gauge showing `% Paid` and color-coded legend. |
| **7. Historical Table** | `Previous Installments Table` | Clean table with `#`, `Date`, `Receipt No.` (blue), `Payment Method`, and `Amount`. Displays up to 6 previous installments for guaranteed A5 portrait single-page containment. |
| **8. Footer** | `Verification QR & Signatory` | 2D verification QR Code SVG, computer-generated receipt disclaimer, fluid cursive vector signature graphic, and `Authorized Signatory` designation. |

---

## 2. Technical Implementation Highlights

### A. Circular Donut Gauge Vector SVG
Rather than importing heavyweight client-side charting libraries into the print frame, a lightweight pure vector SVG donut ring is dynamically computed directly from authoritative fee numbers:
```tsx
const totalFee = feeSummary.total_fee_amount || 1;
const paidRatio = Math.min(1, Math.max(0, feeSummary.total_paid_to_date / totalFee));
const percentagePaid = Math.round(paidRatio * 100);
const circumference = 213.63; // 2 * PI * 34
const strokeDashoffset = circumference - circumference * paidRatio;

<svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
  <circle cx="40" cy="40" r="34" stroke="#e2e8f0" strokeWidth="7" fill="transparent" />
  <circle
    cx="40" cy="40" r="34" stroke="#16a34a" strokeWidth="7"
    strokeDasharray={circumference}
    strokeDashoffset={strokeDashoffset}
    strokeLinecap="round"
    fill="transparent"
  />
</svg>
```

### B. Isolated Print Sandbox with Tailwind Stylesheet Ingestion
To ensure printouts inside the sandbox iframe look identical to screen view:
- [frontend/src/utils/printReceipt.ts](file:///F:/PrashantAcademy/frontend/src/utils/printReceipt.ts) collects all parent document stylesheet links and inline `<style>` tags and injects them into the iframe `<head>`.
- Configures precise `@page` media rules:
  - **A5 Portrait**: `@page { size: A5 portrait; margin: 5mm 6mm; }` with `#print-root { max-width: 138mm; }`
  - **A4 Standard**: `@page { size: A4 portrait; margin: 8mm 10mm; }` with `#print-root { max-width: 185mm; }`
- Forces `-webkit-print-color-adjust: exact !important` and `print-color-adjust: exact !important`.

### C. Adaptive Single-Page Containment
- In **A5 Compact mode**, historical payments are capped at the **6 most recent installments** to prevent multi-page spillover, with an automatic footnote: `* Showing 6 most recent installments. Complete chronological history available in Student Payment Statement.`
- Switching to **A4 Portrait** dynamically expands the table to display up to 12 installments.

---

## 3. Verification & Validation Summary

| Test Area | Target / Command | Result |
|---|---|---|
| **Receipt Unit Tests** | `npm --prefix frontend test -- src/test/ReceiptPrint.test.tsx` | **PASSED** (12/12 tests) |
| **Branding & UI Tests** | `src/test/Sidebar.test.tsx`, `src/test/Footer.test.tsx`, `src/test/Branding.test.tsx` | **PASSED** (39/39 tests) |
| **Full Frontend Suite** | `npm --prefix frontend test -- --run` | **PASSED** (17 suites, 115 tests) |
| **Backend Test Suite** | `docker compose exec -T backend pytest` | **PASSED** (54 passed, 3 skipped) |
| **TypeScript & Build** | `npm --prefix frontend run build` | **PASSED** (0 errors, 16.51s) |
| **Attribution Headers** | `python scripts/manage_headers.py check` | **PASSED** (186/186 files compliant) |
| **Docker Containers** | `docker compose up -d --build frontend` | **PASSED** (All healthy) |

---

## 4. Modified & Enhanced Files

- [frontend/src/components/PaymentReceiptView.tsx](file:///F:/PrashantAcademy/frontend/src/components/PaymentReceiptView.tsx): Core A5 portrait official receipt component.
- [frontend/src/utils/printReceipt.ts](file:///F:/PrashantAcademy/frontend/src/utils/printReceipt.ts): Isolated iframe print generator with stylesheet inheritance and A5 margin constraints.
- [backend/app/api/v1/endpoints/payments.py](file:///F:/PrashantAcademy/backend/app/api/v1/endpoints/payments.py): Receipt payload builder enriched with `academic_year` and `academic_year_id`.
- [frontend/src/types/index.ts](file:///F:/PrashantAcademy/frontend/src/types/index.ts): Synchronized type declarations for `DetailedPaymentReceipt`.
- [frontend/src/test/ReceiptPrint.test.tsx](file:///F:/PrashantAcademy/frontend/src/test/ReceiptPrint.test.tsx): Automated test suite covering A5 layout, donut percentage, QR code, and adaptive overflow.
