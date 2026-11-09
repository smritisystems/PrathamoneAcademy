---
title: "Bulk Receipt Export & Direct PDF Sharing Architecture"
module: "09_FEES_PAYMENTS"
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
tags: ["fees", "bulk-export", "sharing", "pdf", "zip", "ui-ux"]
entities: ["PaymentReceipt", "ReceiptPdfService"]
api_routes: ["/api/v1/payments/receipts/bulk-pdf-zip", "/api/v1/payments/receipts/{receipt_number}/pdf"]
related_modules: ["14_PRINTING_DOCUMENTS", "18_TESTING_QA"]
---

# Bulk Receipt Export & Direct PDF Sharing Architecture

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Version:** 1.0.0  
**Product Architect:** Jawahar R. Mallah  
**Organization:** AITDL — AI Technology & Development Lab  

---

## 1. WORKFLOW ARCHITECTURE

The bulk receipt export and direct sharing workflow empowers coaching institute administrators and cashiers to process, download, and distribute fee receipts with institutional efficiency.

### 1.1 Receipt Register Selection Model
In `frontend/src/pages/Fees.tsx` (Tab 5 `receipts`):
- **Master Checkbox:** Controls selection of all visible records on the current page. Supports indeterminate state if only a subset of visible records is checked.
- **Individual Row Checkboxes:** Allows granular multi-selection of receipts across search terms and filters.
- **Selection State Representation:** When receipts are selected, rows receive a distinct accent highlight (`bg-primary-50/40`), and an interactive Floating Bulk Actions Toolbar activates at the bottom of the screen.

### 1.2 Floating Bulk Actions Toolbar
The floating bar provides real-time informational metadata and one-click actions:
- **Count & Metadata:** Displays `{selectedCount} Receipts Selected` and `Total: ₹{fmt(totalAmount)}` so administrators can verify ledger totals before exporting.
- **Action 1: Download Individual PDFs:** Iterates through selected records, triggering sequential browser downloads of each receipt with its sanitized filename (`StudentName_ReceiptNo.pdf`).
- **Action 2: Download as ZIP:** Dispatches `POST /api/v1/payments/receipts/bulk-pdf-zip` to generate a compressed in-memory archive containing every selected receipt PDF.
- **Action 3: Direct Share:** Available when an individual receipt is selected; invokes native OS file attachment sharing.
- **Action 4: Clear Selection:** Deselects all receipts and dismisses the floating toolbar.

---

## 2. DIRECT SHARING SPECIFICATION (ZERO LINKS POLICY)

```mermaid
flowchart TD
    UserClick[User Clicks Share PDF] --> FetchBlob[Fetch Binary PDF Blob from Server]
    FetchBlob --> CheckAPI{Does navigator.share & navigator.canShare support Files?}
    
    CheckAPI -->|YES| CreateFile[Construct File object from PDF Blob]
    CreateFile --> CallShare[navigator.share({ files: [file], title, text })]
    CallShare --> SuccessToast[Display Success: Receipt Shared Directly]
    
    CheckAPI -->|NO or User Cancelled| AutoDownload[Trigger Automatic Browser File Download]
    AutoDownload --> InformToast[Display Clear Instructions: File downloaded to device. Attach manually in WhatsApp / Email.]
```

### 2.1 Web Share API Level 2 Enforcement
- When supported by the host browser/OS (e.g., mobile devices, Safari, Chromium on supported OS), the system invokes:
  ```typescript
  await navigator.share({
    files: [file],
    title: `Fee Receipt · ${receiptNumber}`,
    text: `Official Fee Payment Receipt for ${studentName} (${receiptNumber}).`
  });
  ```
- No web links, public preview URLs, or expiring tokens are transmitted.

### 2.2 Transparent Fallback Governance
- If the browser does not support file sharing (e.g. desktop browsers without Web Share Level 2 support):
  1. The PDF is immediately downloaded to the user's downloads folder.
  2. A notification banner displays explicit guidance:
     > *"Direct browser file attachment sharing is unsupported on this device. The PDF has been downloaded to your device as 'Aarav_Sharma_RCP-2026-0001.pdf'. Please attach this file directly in WhatsApp or your email client."*
  3. The system never claims that sharing succeeded when it fell back to download.

---

## 3. IMPLEMENTATION AUDIT CONCLUSION

The bulk selection, ZIP export, and direct PDF sharing engine has been verified to meet all corporate standards and functional mandates.

