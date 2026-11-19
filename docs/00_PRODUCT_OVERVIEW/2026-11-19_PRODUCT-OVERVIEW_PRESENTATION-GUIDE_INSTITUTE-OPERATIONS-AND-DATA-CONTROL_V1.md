---
title: "PrathamOne EduOS Institute Operations and Data Control Presentation Guide"
module: "00_PRODUCT_OVERVIEW"
category: "PRESENTATION-GUIDE"
document_type: "GUIDE"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-19"
updated_date: "2026-11-19"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Draft"
tags: ["coaching-institute", "operations", "data-control", "deployment", "presentation"]
entities: ["PrathamOneEduOS", "CoachingInstituteModule", "InstituteData"]
api_routes: ["/api/v1/", "/dashboard", "/students", "/leads/pipeline", "/fees", "/attendance", "/academic/timetable", "/examinations", "/staff", "/communication", "/reports", "/settings", "/courses", "/homework", "/eduboard", "/forms", "/import-export", "/training"]
related_modules: ["00_PRODUCT_OVERVIEW", "01_ARCHITECTURE", "03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "09_FEES_PAYMENTS", "12_RBAC_SECURITY", "16_DATABASE_API", "18_TESTING_QA", "25_BUSINESS_REQUIREMENTS"]
---

# Institute Operations and Data Control

**Audience:** Coaching institute owners, principals, administrators and implementation sponsors.

**Presentation files:**

- PowerPoint: `docs/assets/commercial/PrathamOne_EduOS_Institute_Operations_and_Data_Control.pptx`
- PDF: `docs/assets/commercial/PrathamOne_EduOS_Institute_Operations_and_Data_Control.pdf`

## Purpose

This 12-slide customer discussion deck explains how PrathamOne EduOS can organize institute workflows and what data-governance decisions an institute should retain. It is intentionally customer-safe and contains no live student or staff records and no screenshots from a live tenant.

## Recommended presentation flow

1. Start with the institute's coordination problem, not a feature list.
2. Tell one learner journey from enquiry through classes, assessment and fee review.
3. Map the suite's 20 module areas to the institute's own roles.
4. Map all 20 module areas to institute roles.
5. Distinguish institute data governance from physical server custody.
6. Define subscription expiry, export, backup retention and deletion commitments.
7. Explain why synced devices are not a substitute for independent, tested backups.
8. Compare hosting options honestly and agree responsibilities in writing.
9. Close with a small, measurable and reversible pilot.

## Claim boundaries

- The workflow diagram is a presentation map, not a promise that every step is automatically integrated.
- The module list describes workspaces; it does not prove that a third-party payment, messaging, scanning or other integration is configured.
- Data ownership, processing, provider access, hosting region, retention, backup/restore, support access, service levels and export/deletion terms must be confirmed in the signed deployment agreement.
- Expiry and backup slides contain proposed data-safety commitments, not verified current guarantees. Approve and implement exact notice, grace, export, backup frequency, retention, RPO/RTO and deletion timelines before presenting them as commitments.
- Device synchronization is not an independent backup. Propose encrypted, versioned copies in a separate cloud account and institute-controlled storage or offline media, with scheduled restore tests; confirm responsibilities and costs in the service agreement.
- On-premises hosting provides physical custody but does not automatically prevent software-license expiry or data loss. Confirm license, access and export rights separately.
- Use the tagline 'Your institute controls its data; we manage the infrastructure.' only for managed-hosting arrangements where the provider actually operates the infrastructure; define the institute's data-governance role and each party's responsibilities in the agreement.
- Do not claim zero provider access, a security certification, guaranteed availability, or a specific business improvement without evidence.
- A managed-hosting recommendation is conditional on the service being offered and on its responsibilities and costs being documented.
- Keep customer-facing materials free of live personal, academic and financial data. Use a supervised demo with approved synthetic records for screen walkthroughs.

## Evidence and governance

The product discussion follows the repository's single-source-of-truth, canonical student master, View-First/Edit Mode, and historical snapshot governance. Confirm current deployment behavior, role permissions, integrations and contractual terms before making implementation commitments.

- [Global Single Source of Truth governance](../25_BUSINESS_REQUIREMENTS/2026-11-06_GLOBAL_POLICY_SINGLE-SOURCE-OF-TRUTH-GOVERNANCE_V1.md)
- [Data deduplication and mapping governance](../25_BUSINESS_REQUIREMENTS/2026-11-09_GLOBAL_POLICY_DATA-DEDUPLICATION-AND-MAPPING-GOVERNANCE_V1.md)
- [View-First and explicit Edit Mode governance](../12_RBAC_SECURITY/2026-11-07_RBAC-SECURITY_IMPLEMENTATION-REPORT_GLOBAL-VIEW-FIRST-AND-EXPLICIT-EDIT-MODE-GOVERNANCE_V1.md)
- [20-module presentation guide](2026-11-19_PRODUCT-OVERVIEW_PRESENTATION-GUIDE_20-MODULES_V1.md)
