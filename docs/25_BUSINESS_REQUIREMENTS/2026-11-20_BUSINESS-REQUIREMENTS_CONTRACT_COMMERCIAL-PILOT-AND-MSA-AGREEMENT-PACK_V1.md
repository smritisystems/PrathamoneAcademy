---
title: "PrathamOne EduOS — Commercial Pilot Agreement, Master Service Agreement (MSA) & SLA Contract Pack"
module: "25_BUSINESS_REQUIREMENTS"
category: "POLICY-FRAMEWORK"
document_type: "SPECIFICATION"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.146.1"
doc_version: "1.0"
created_date: "2026-11-20"
updated_date: "2026-11-20"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["commercial-contract", "pilot-agreement", "master-service-agreement", "sla", "dpdp-act-2023", "legal-framework", "indian-coaching"]
entities: ["PrathamOneEduOS", "CommercialAgreement", "InstitutionalContract", "DPDPCompliance"]
api_routes: ["/settings", "/fees", "/import-export", "/housekeeping"]
related_modules: ["00_PRODUCT_OVERVIEW", "02_INSTALLATION_DEPLOYMENT", "12_RBAC_SECURITY", "20_AUDITS_COMPLIANCE", "25_BUSINESS_REQUIREMENTS"]
---

# PRATHAMONE EduOS (Coaching Institute Edition)
## Institutional Commercial Pilot Agreement, Master Service Agreement (MSA) & SLA Contract Pack

**Product:** PrathamOne EduOS (Coaching Institute Edition)  
**Licensor:** Smritisys & AITDL Networks (Represented by Product Architect Jawahar R. Mallah)  
**Governing Law:** Republic of India (Arbitration & Conciliation Act, 1996; IT Act, 2000; DPDP Act, 2023)  
**Jurisdiction:** Courts of Pune / Mumbai, Maharashtra, India  
**Date:** November 20, 2026  

---

## PART 1: 30-DAY PAID INSTITUTIONAL PILOT AGREEMENT

### 1.1 Purpose of Pilot
This Agreement enables **[INSTITUTE NAME]** ("Licensee") to deploy and evaluate **PrathamOne EduOS (Coaching Institute Edition)** across its campus operations for a controlled 30-calendar-day evaluation window.

### 1.2 Pilot Scope & Entitlements
1. **Capacity:** Up to 1 Campus Branch, 500 Enrolled Students, 20 Faculty Profiles, and 5 Administrative Desks.
2. **Included Workspaces:** Full access to all 20 modules, including Admissions CRM, Fee Counter, QR Attendance, NEET/JEE Exam Engine, Teacher Payroll, and EduBoard Smart Classroom.
3. **Training & Onboarding Support:** Delivery of the **48-Hour Rapid Onboarding Blueprint**, including guided copy-paste student data migration and staff sandbox training via `PA001-DEMO`.

### 1.3 Pilot Commercials & Conversion Guarantee
* **Pilot Setup Fee:** ₹10,000 + 18% GST (SAC Code: 998313 — Information Technology Software Services).
* **100% Conversion Credit:** Upon conversion to an Annual Cloud Subscription (₹36,000 or ₹72,000/yr) or Sovereign On-Premise License (₹1,80,000), 100% of this Pilot Setup Fee is credited toward the commercial license fee.

### 1.4 The 4 Pilot Success Milestones
The Pilot shall be deemed technically and commercially successful upon meeting the following verifiable criteria:
1. **Milestone 1 (Data Onboarding):** 100% of active student rosters and batches successfully mapped without duplicate records (complying with Rule 001/Rule 011).
2. **Milestone 2 (Ledger Reconciliation):** Daily cash/UPI fee collection daybook matches bank credit records with zero rounding discrepancy (via deterministic cent allocation).
3. **Milestone 3 (Attendance Pulse):** High-speed QR kiosk achieves 60+ check-ins/minute with automatic parent absentee notifications.
4. **Milestone 4 (Faculty Harmony):** Month-end Teacher Payroll session log generates automated compensation vouchers with zero manual calculation disputes.

### 1.5 100% Data Sovereignty & Zero Vendor Lock-In Guarantee
If the Licensee chooses not to convert at the conclusion of the 30-day pilot:
* Licensor guarantees that 100% of student, parent, attendance, and fee transaction data entered during the pilot remains the absolute property of the Licensee.
* Licensor shall provide a full PostgreSQL database dump (`.sql`) and structured Excel (`.xlsx`) exports within 24 hours of request, followed by certified permanent deletion from Licensor test infrastructure.

---

## PART 2: MASTER SERVICE AGREEMENT (MSA)

### 2.1 Intellectual Property vs Data Ownership
* **Software Ownership:** PrathamOne EduOS, its source architecture, algorithms, EduBoard vector engine, Rule 010 governance mechanisms, and corporate trademarks are the proprietary intellectual property of **Smritisys & AITDL Networks**.
* **Institutional Data Ownership:** All student records, phone numbers, Aadhaar details, academic marks, financial invoices, and faculty payroll information are the **sole and exclusive property of the Coaching Institute**. Licensor possesses zero rights to monetize, cross-sell, share, or inspect customer data.

### 2.2 Deployment Topologies & Warranty
* **Cloud Managed Edition:** Hosted in an isolated virtual private container within tier-4 Indian data centers (MeitY empaneled).
* **Sovereign On-Premise Edition:** Deployed air-gapped on the Institute's local hardware via Docker Compose. Operates 100% offline with Ed25519 cryptographic node-locking.

### 2.3 Rule 010 View-First Governance Commitment
Licensor warrants that the software enforces **Rule 010 View-First Governance** across all user roles: records cannot be altered or purged without explicit, logged Edit Mode activation, protecting the Institute from accidental data loss caused by front-desk operator errors.

---

## PART 3: DIGITAL PERSONAL DATA PROTECTION (DPDP ACT 2023) COMPLIANCE ADDENDUM

Pursuant to the **Digital Personal Data Protection Act, 2023 (DPDP Act)** enacted by the Parliament of India:

1. **Classification of Roles:**
   * **Data Fiduciary:** The Coaching Institute (determining the purpose and means of student/parent data collection).
   * **Data Processor:** Smritisys & AITDL Networks (providing the operating system and infrastructure).
2. **Protection of Minors (Section 9 Compliance):**
   * Students below 18 years of age require verifiable parental consent captured during admission.
   * Student behavioral tracking for targeted commercial advertising is strictly prohibited and architecturally disabled.
3. **Aadhaar Masking & Non-Storage:**
   * In compliance with UIDAI regulations, all Aadhaar numbers entered into student KYC records are masked in storage and UI (displaying only the last 4 digits: `XXXX-XXXX-1234`).
4. **Right to Erasure & Safe Deletion:**
   * The software includes an immutable Safe Delete Policy (`safe_delete_service.py`). Academic and financial history cannot be orphaned, and personal data can be anonymized upon student exit.

---

## PART 4: SERVICE LEVEL AGREEMENT (SLA) & INCIDENT RESPONSE MATRIX

### 4.1 System Availability (Uptime)
* For Cloud Managed deployments, Licensor guarantees **99.5% operational uptime** during business hours (06:00 AM to 10:00 PM IST, Monday through Sunday).

### 4.2 Incident Severity & Support Matrix

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        INCIDENT RESPONSE & ESCALATION MATRIX                           │
├──────────┬─────────────────────────────┬─────────────────┬─────────────────────────────┤
│ Severity │ Definition & Impact         │ Response Window │ Resolution Target           │
├──────────┼─────────────────────────────┼─────────────────┼─────────────────────────────┤
│ Level 1  │ Critical Outage             │ Under 30 Mins   │ Under 2 Hours               │
│ (P0)     │ Fee Desk or QR Attendance   │                 │ (Immediate hotfix or        │
│          │ completely blocked.         │                 │ failover to local offline)  │
├──────────┼─────────────────────────────┼─────────────────┼─────────────────────────────┤
│ Level 2  │ Major Degradation           │ Under 2 Hours   │ Under 8 Hours               │
│ (P1)     │ Specific module non-fatal   │                 │                             │
│          │ (e.g. Report PDF rendering) │                 │                             │
├──────────┼─────────────────────────────┼─────────────────┼─────────────────────────────┤
│ Level 3  │ Minor / Administrative      │ Under 6 Hours   │ Under 24 Hours              │
│ (P2)     │ User permission adjustment, │                 │                             │
│          │ lookups, or template update.│                 │                             │
└──────────┴─────────────────────────────┴─────────────────┴─────────────────────────────┘
```

---

## PART 5: EXECUTION SIGN-OFF

**For Licensor:**  
Smritisys & AITDL Networks  
Name: Jawahar R. Mallah  
Designation: Product Architect & Managing Director  
Signature: ___________________________  
Date: _______________________________  

**For Licensee (Coaching Institute):**  
Institute Name: ___________________________________  
Authorized Signatory: ____________________________  
Designation: Founder / Director / Principal  
Signature: ___________________________  
Date: _______________________________  
