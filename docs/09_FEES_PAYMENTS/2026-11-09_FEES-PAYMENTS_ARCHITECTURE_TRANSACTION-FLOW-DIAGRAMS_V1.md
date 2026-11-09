---
title: "Financial Transaction Flow Diagrams"
module: "09_FEES_PAYMENTS"
category: "ARCHITECTURE"
document_type: "DIAGRAM"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-09"
updated_date: "2026-11-09"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["diagrams", "mermaid", "workflow", "payments", "refunds", "reversals", "admissions"]
entities: ["Payment", "PaymentReceipt", "FeeInvoice", "Refund", "AuditLog"]
api_routes: ["/api/v1/payments", "/api/v1/payments/{id}/reverse", "/api/v1/payments/{id}/refunds", "/api/v1/fees"]
related_modules: ["10_FINANCE_ACCOUNTING", "12_RBAC_SECURITY"]
---

# Financial Transaction Flow Diagrams
## Visual Architectural Specifications for Payment, Reversal, Refund, and Cancellation Pipelines

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R Mallah  
**Organization:** AITDL — AI Technology & Development Lab  
**Specification Standard:** GitHub Flavored Markdown & Mermaid Visualizations  

---

## 1. FLOW 1: STANDARD PAYMENT COLLECTION & SEQUENTIAL RECEIPT ISSUANCE

This sequence depicts the counter payment workflow (Simple Mode) where funds are received by the cashier, sequentially numbered receipts are issued, and invoice balances are atomically decremented.

```mermaid
sequenceDiagram
    autonumber
    actor Cashier as Front-Desk Cashier
    participant UI as Collection Desk UI
    participant Router as Payments API (/payments/)
    participant Auth as RBAC & Institution Scope
    participant Service as Payment Workflow Service
    participant Seq as Atomic Sequence Generator
    participant DB as PostgreSQL 16 DB

    Cashier->>UI: Select Student & Invoices, Enter Amount & Method
    UI->>Router: POST /api/v1/payments/ (action='post')
    Router->>Auth: Verify Token & 'payments:collect' Permission
    Auth-->>Router: Access Granted
    Router->>Service: execute_payment_posting(payment)
    
    critical Atomic DB Transaction
        Service->>DB: Lock Student Fee Invoice (FOR UPDATE)
        Service->>Seq: generate_next_receipt_number(inst_id, year_id)
        Seq->>DB: Increment and return atomic sequence (REC-YYYYMMDD-XXXXXX)
        Service->>DB: Decrement Invoice outstanding_amount, increment paid_amount
        Service->>DB: Insert Payment record (status='posted')
        Service->>DB: Insert PaymentAllocations linking to invoices
        Service->>DB: Insert PaymentReceipt record (version=1, status='valid')
        Service->>DB: Record AuditLog (action='payment_posted')
    end

    DB-->>Service: Transaction Committed
    Service-->>Router: Return Receipt Payload
    Router-->>UI: 201 Created + Receipt Details
    UI->>Cashier: Render Receipt Modal & Direct Print Option
```

---

## 2. FLOW 2: ERP TWO-PERSON APPROVAL WORKFLOW (HIGH VALUE / CHEQUE)

For transactions exceeding the institution threshold (default ₹25,000) or high-risk instruments (`cheque`, `demand_draft`, `bank_transfer`), standard ERP segregation of duties is strictly enforced.

```mermaid
flowchart TD
    Start(["Staff enters payment voucher"]) --> ThresholdCheck{"Amount >= ₹25k OR Method in Cheque/Draft?"}
    
    ThresholdCheck -- No --> SimplePost["Simple Mode: Direct Post"]
    SimplePost --> PostDB["Affect Invoice Dues & Issue Receipt"]
    
    ThresholdCheck -- Yes --> SaveDraft["Save as Submitted Voucher"]
    SaveDraft --> Queue["Enters ERP Approval Queue"]
    
    Queue --> AdminReview{"Administrator / Principal Review"}
    AdminReview -- Reject --> Rejected["Status = 'draft' (Returned to Staff with Reason)"]
    AdminReview -- Approve --> Approved["Status = 'approved' (Locked from Staff Edits)"]
    
    Approved --> AccountantPost["Accountant Executes Financial Post"]
    AccountantPost --> PostDB
    PostDB --> Finished(["Transaction Settled & Valid Receipt Issued"])
```

---

## 3. FLOW 3: POSTED PAYMENT CORRECTION & RECEIPT SUPERSESSION

When a posted payment requires financial adjustment (e.g., corrected from ₹5,000 to ₹4,000), the historical receipt is preserved with status `superseded` and version $N+1$ is generated.

```mermaid
sequenceDiagram
    autonumber
    actor Accountant as Authorized Accountant
    participant UI as Edit Payment Modal
    participant API as PUT /payments/{id}
    participant Service as execute_payment_edit()
    participant DB as PostgreSQL 16 DB

    Accountant->>UI: Modify Amount / Allocations + Mandatory Reason
    UI->>API: PUT /api/v1/payments/{id} (amount, allocations, reason)
    API->>Service: execute_payment_edit()
    
    critical Atomic Reversal & Re-posting
        Service->>DB: Fetch original Payment & valid Receipt (Ver 1)
        Service->>DB: Revert old allocations from invoices (restore original dues)
        Service->>DB: Apply new allocations to invoices (decrement dues by new amount)
        Service->>DB: Update Payment amount, last_edited_at, edit_count++
        Service->>DB: Mark old Receipt status='superseded', stamp superseded_at & new_receipt_no
        Service->>DB: Issue new sequential Receipt (Ver 2, status='valid', supersedes=old_no)
        Service->>DB: Record warning-level AuditLog with before/after diff
    end

    DB-->>API: Success Response
    API-->>UI: Return New Receipt # and Superseded Receipt #
    UI->>Accountant: Display Supersession Confirmation & Print Button
```

---

## 4. FLOW 4: PAYMENT REVERSAL & COUNTER-TRANSACTION WORKFLOW

Reversals permanently invalidate a payment voucher, restore student fee obligations, mark receipts as `voided`, and generate an immutable audit record.

```mermaid
flowchart TD
    RevReq(["Reversal Initiated by Admin/Accountant"]) --> CheckStatus{"Is Payment in 'posted' or 'completed'?"}
    
    CheckStatus -- No --> ErrAlready["Error: Cannot reverse unposted or already-reversed voucher"]
    CheckStatus -- Yes --> EditModeCheck{"Is Scoped Edit Mode Active?"}
    
    EditModeCheck -- No --> ErrMode["Error: Explicit Edit Mode Activation Required"]
    EditModeCheck -- Yes --> ModalReason{"Mandatory Audit Reason Entered?"}
    
    ModalReason -- No --> ErrReason["Error: Reversal Reason Required"]
    ModalReason -- Yes --> ExecRev["Begin Atomic Reversal"]
    
    ExecRev --> RestoreInv["Restore Invoice Balances: outstanding += allocated, paid -= allocated"]
    RestoreInv --> VoidReceipts["Mark all linked PaymentReceipts status = 'voided'"]
    VoidReceipts --> StampPay["Update Payment: status = 'reversed', reversed_at = NOW(), reversed_by_id = User"]
    StampPay --> AuditEntry["Insert AuditLog (action='payment_reversed', severity='warning')"]
    AuditEntry --> RevDone(["Reversal Committed: Ledger Rebalanced"])
```

---

## 5. FLOW 5: PARTIAL & MULTI-PARTIAL REFUND LIFECYCLE

Refunds are governed by the canonical `refunds` table, ensuring cumulative disbursements never exceed eligible refundable collections.

```mermaid
sequenceDiagram
    autonumber
    actor Cashier as Cashier / Operator
    actor Approver as Admin / Principal
    participant API as Payments API (/payments/{id}/refunds)
    participant DB as PostgreSQL 16 DB

    Cashier->>API: POST /payments/{id}/refunds (amount, method, reason)
    API->>DB: Query SUM(Refunds) where payment_id = id and status != 'rejected'
    DB-->>API: Existing Refunds = ₹1,000, Payment Amount = ₹5,000
    
    Note over API: Max Eligible Refund = ₹5,000 - ₹1,000 = ₹4,000
    alt Requested Amount > Max Eligible
        API-->>Cashier: 400 Bad Request: Refund amount exceeds eligible balance
    else Requested Amount <= Max Eligible
        API->>DB: Insert Refund (status='requested', requested_by_id=User)
        API-->>Cashier: 201 Created: Refund requested for approval
    end

    Approver->>API: POST /refunds/{id}/approve
    API->>DB: Update Refund (status='approved', approved_by_id=Admin, approved_at=NOW())
    API-->>Approver: 200 OK: Refund approved

    Cashier->>API: POST /refunds/{id}/process (reference_no)
    critical Atomic Refund Settlement
        API->>DB: Update Refund status='completed', processed_by_id=User
        API->>DB: Decrement FeeInvoice paid_amount by refund amount
        API->>DB: Increment FeeInvoice outstanding_amount by refund amount
        API->>DB: Insert AuditLog (action='refund_processed')
    end
    API-->>Cashier: 200 OK: Refund disbursed and ledger synchronized
```

---

## 6. FLOW 6: ADMISSION CANCELLATION & FINANCIAL PRESERVATION

When an admission is cancelled, financial records are preserved with absolute immutability. Fees collected and refund eligibility are calculated separately.

```mermaid
flowchart TD
    AdmCancel["Initiate Admission Cancellation (Student ID)"] --> QueryLedger["Query Financial Dossier"]
    
    QueryLedger --> FetchTotals["Total Invoiced: ₹24,000<br/>Total Collected: ₹10,000<br/>Non-refundable Reg Fee: ₹2,000"]
    
    FetchTotals --> CalcRefund["Calculated Refund Eligibility: ₹10,000 - ₹2,000 = ₹8,000<br/>Remaining Tuition Obligation: Waived"]
    
    CalcRefund --> AdminConfirm{"Admin Modal Confirmation with Reason"}
    AdminConfirm -- Rejected --> Abort["Cancellation Aborted: No Changes"]
    
    AdminConfirm -- Approved --> ExecCancellation["Execute Safe Admission Exit"]
    ExecCancellation --> StatusStudent["Set Student status = 'withdrawn'"]
    ExecCancellation --> AdjustInvoice["Adjust FeeInvoice: outstanding_amount = 0 (status='cancelled')"]
    ExecCancellation --> CreateRefund["Generate Refund Voucher for ₹8,000 (status='approved')"]
    ExecCancellation --> PresHist["Preserve all historical Payments & Receipts as Immutable Records"]
    ExecCancellation --> AuditExit["Log comprehensive Admission Exit Audit Trail"]
    AuditExit --> CompleteExit(["Admission Cancelled Safely; Financial History 100% Intact"])
```

