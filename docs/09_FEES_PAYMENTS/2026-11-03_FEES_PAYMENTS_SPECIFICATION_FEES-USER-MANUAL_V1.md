---
title: "Fees & Billing User Manual"
module: "09_FEES_PAYMENTS"
category: "SPECIFICATION"
document_type: "SPECIFICATION"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-03"
updated_date: "2026-11-03"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["09-fees-payments", "specification"]
entities: ["FeeStructure", "FeePlan", "StudentFee", "Payment"]
api_routes: ["/api/v1/fees", "/api/v1/payments"]
related_modules: []
---

# Fees & Billing User Manual

**Target Audience**: Accountants, Finance Officers, Administrators  

---

## 1. Setting Up Fee Categories
1. Navigate to **Fees** on the sidebar.
2. Under the **Fee Categories** tab, click **+ Add Category**.
3. Enter Category Name (e.g., `Tuition Fee`, `Lab Kit Fee`).
4. Select Fee Type (`tuition`, `admission`, `examination`, `transport`, `library`, `sports`, `other`).
5. Enter an optional description and click **Create**.

---

## 2. Configuring Fee Structures
1. Under the **Fee Structures** tab, click **+ Add Structure**.
2. Enter:
   - **Structure Name**: (e.g., `Annual Tuition — Std 10`)
   - **Fee Category**: Select an existing category.
   - **Amount (₹)**: Base fee amount (e.g., `24000.00`).
   - **Frequency**: Annually, Half Yearly, Quarterly, Monthly, or Custom.
   - **Due Day of Month**: (e.g., 10th).
   - **Late Fee (₹)**: Optional penalty after grace window.
   - **Grace Days**: (e.g., 7 days).
3. Click **Create**.
4. The structure is now active and ready for assignment to enrolled students.

