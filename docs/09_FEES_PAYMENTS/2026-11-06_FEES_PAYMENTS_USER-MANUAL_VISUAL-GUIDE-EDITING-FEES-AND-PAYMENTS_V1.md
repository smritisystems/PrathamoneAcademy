---
title: "Visual Step-by-Step Guide: Editing Fees & Payments in PrathamOne Academy"
module: "09_FEES_PAYMENTS"
category: "USER-MANUAL"
document_type: "USER-MANUAL"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-06"
updated_date: "2026-11-06"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["09-fees-payments", "user-manual"]
entities: ["FeeStructure", "FeePlan", "StudentFee", "Payment"]
api_routes: ["/api/v1/fees", "/api/v1/payments"]
related_modules: []
---

# Visual Step-by-Step Guide: Editing Fees & Payments in PrathamOne Academy

> **Target Role:** `sysadmin` (Superuser)  
> **Platform:** PrathamOne Coaching Institutes Enterprise Suite (`v6.99.1`)  
> **Official Portal:** [http://localhost:80](http://localhost:80)  

---

## Part 1: How to Unlock & Edit Any Receipt or Payment

Posted payments are protected by a financial security lock by default. Follow these three visual steps to unlock and edit:

````carousel
![Step 1: Locate the Security Badge and Click Unlock](C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/guide_step1_payments_unlock.png)
<!-- slide -->
![Step 2: Enter Administrative Reason in the Security Modal](C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/guide_step2_unlock_modal.png)
<!-- slide -->
![Step 3: Click the Newly Visible Edit Button on Any Payment Row](C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/guide_step3_payments_edit_active.png)
````

### Step-by-Step Instructions:

1. **Step 1 — Open Payments & Locate the Lock Badge:**
   - In the sidebar, click **Payments** (or navigate to [`http://localhost:80/payments`](http://localhost:80/payments)).
   - At the top of the screen next to the page heading, look for the highlighted badge:
     `Posted Edits: Protected [Unlock]`
   - Click the blue **`Unlock`** button.

2. **Step 2 — Provide Security Justification:**
   - A modal dialog titled *"Security Gate: Edit Posted Payments"* will appear.
   - Enter your administrative justification (e.g., *"Correction of Cheque Clearance / Fee Reallocation"*).
   - Click **Grant Permission & Unlock**.

3. **Step 3 — Click the Edit Button:**
   - The badge turns into: `Posted Edits: Unlocked [Lock]`.
   - The green **`Edit`** button immediately appears in the **Actions** column of every payment row.
   - Click **`Edit`** on the target payment to modify amounts, dates, or payment methods. The system automatically supersedes the old receipt and issues an updated revision.

---

## Part 2: How to Edit a Master Fee Structure

In the standard `/fees` screen, fee structures are treated as templates to prevent breaking historical student invoices. To modify any fee structure's name, description, or amount as `sysadmin`, use the **Universal Records Editor**:

````carousel
![Step 4: Select fee_structure in the Universal Data Editor](C:/Users/netma/.gemini/antigravity/brain/f0e72778-27df-4928-92a5-dc51f7834a6e/guide_step4_fee_structure_editor.png)
````

### Step-by-Step Instructions:

1. **Open the SysAdmin Center:**
   - In the sidebar, click **SysAdmin** (or navigate to [`http://localhost:80/sysadmin`](http://localhost:80/sysadmin)).
2. **Switch to Universal Data Editor:**
   - Click the **Universal Data Editor** tab.
3. **Configure the Edit Form:**
   - **Target Model Entity:** Select **`Fee Structure`** (`fee_structure`) from the dropdown.
   - **Record ID:** Enter the ID of the fee plan you want to modify (e.g., `1`).
   - **Permissible Field Chips:** Click on `name`, `description`, or `total_amount` to prefill the field name.
   - **New Value:** Enter the updated amount or name.
   - **Audit Reason:** Enter your administrative reason (e.g., *"Annual fee package adjustment"*).
4. **Execute Modification:**
   - Click **Execute Modification**. The fee structure updates immediately across all standards and is permanently recorded in the immutable security audit log.

---

### Need Further Assistance?
- **Helpline:** +91 9323 023 007 / +91 9324 117 007
- **Email:** [`support@prathamone.com`](mailto:support@prathamone.com)
- **Portal:** [https://prathamone.com](https://prathamone.com)
- **Subtle Footer:** `PrathamOne Coaching Institutes Enterprise Suite · prathamone.com`
