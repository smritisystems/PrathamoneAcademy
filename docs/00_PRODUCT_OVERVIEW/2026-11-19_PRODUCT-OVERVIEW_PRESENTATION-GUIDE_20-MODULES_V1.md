---
title: "PrathamOne EduOS 20-Module Coaching Institute Presentation Guide"
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
tags: ["coaching-institute", "presentation", "module-guide", "rollout", "administrator"]
entities: ["PrathamOneEduOS", "CoachingInstituteModule"]
api_routes: ["/dashboard", "/students", "/leads/pipeline", "/fees", "/attendance", "/academic/timetable", "/examinations", "/staff", "/communication", "/reports", "/settings", "/courses", "/homework", "/eduboard", "/forms", "/import-export", "/training"]
related_modules: ["00_PRODUCT_OVERVIEW", "03_ACADEMIC_MANAGEMENT", "04_STUDENT_MANAGEMENT", "07_ATTENDANCE", "08_EXAMINATION", "09_FEES_PAYMENTS", "11_REPORTS_EXPORTS", "12_RBAC_SECURITY", "13_SYSADMIN_SETTINGS", "14_PRINTING_DOCUMENTS", "16_DATABASE_API", "18_TESTING_QA", "25_BUSINESS_REQUIREMENTS"]
---

# PrathamOne EduOS: A Plain-Language Guide to 20 Modules

**Audience:** Coaching institute owners, principals, administrators, coordinators, teachers, and operations teams.

**Companion presentation:** `docs/assets/commercial/PrathamOne_EduOS_20_Module_Guide.pptx` and [PDF export](../assets/commercial/PrathamOne_EduOS_20_Module_Guide.pdf) (25 slides; presenter notes and unmodified live application screenshots included).

## Purpose and evidence limits

This guide explains what each module is for, why it may matter in a coaching institute, who typically uses it, and how to demonstrate it safely. Feature statements are grounded in the current frontend routes/components and focused UI tests in this repository. A test that confirms a screen or interaction is not proof of a production deployment, complete end-to-end business process, external provider configuration, service-level commitment, legal compliance, or business outcome.

The material is a product walkthrough aid, not a contractual feature warranty. It was prepared from repository evidence available on 2026-11-19. Confirm the target deployment, tenant data, role permissions, integrations, and policy settings before a customer-facing presentation.

The module list follows the requested 20-module directory. Some features share a workspace: notably, Scholarships is presented inside Fees/Concessions rather than as an independent top-level route.

## Screenshot and sample-data provenance

Each module slide includes a direct, unmodified screenshot captured from the application's PRODUCTION data environment; no names, contact details, identifiers, page areas, or other screen content have been masked or retouched. Screenshots may contain sensitive student, staff, academic, or financial information. This deck is for internal, access-controlled use only and must not be distributed externally. Displayed values are reproduced as they appeared at capture time and have not been independently reconciled or audited. The adjacent sample-data panel is illustrative slide text only and is not a persisted application record.

## How to present the product

1. Start with one operational story: enquiry -> enrolled learner -> batch and timetable -> attendance and learning -> assessment and result -> fee and family communication.
2. Show one representative screen per workflow. Describe the task in everyday terms before naming system capabilities.
3. For rehearsals, use a synthetic training dataset and keep the screen in View Mode; switch to scoped Edit Mode only when a planned, authorized demo requires a change.
4. Treat displayed sample data as illustrative. State the selected institute, cohort, and date range when discussing a report.
5. Separate configured interface from live integration: demonstrate provider delivery, payment settlement, devices, and external imports only after testing them in the target environment.

## The 20 modules

### 1. Dashboard

**Workspace:** `/dashboard`  
**What it does:** A concise command view of key institute activity, including selected academic, attendance, and fee signals.  
**Why it matters:** Owners and administrators can start with the same operational picture instead of assembling updates from separate registers.  
**Typical users:** Director, principal, institute administrator  
**Safe demo:** Review KPI cards, recent activity, top batches, and the fee-status trend; do not infer a trend from an empty or demo dataset.  
**Illustrative sample (slide only):** Daily view: one class to review, one follow-up due, and one fee item to reconcile. This is not a saved application record.  
**Presenter caution:** Dashboard values depend on the selected institute, date range, and available data. Treat sample figures as examples, not promised outcomes.  
**Evidence:** [Dashboard UI](../../frontend/src/pages/Dashboard.tsx); [executive cards and operational command view](../../frontend/src/test/ModernExecutiveDashboard.test.tsx); [collection/outstanding shares and chart controls](../../frontend/src/test/DashboardCollectionStatus.test.tsx)

### 2. Students

**Workspace:** `/students/directory`  
**What it does:** A canonical learner directory with profile, enrolment, batch allocation, history, identity-card, and reactivation workspaces.  
**Why it matters:** One reliable student record helps admissions, teaching, attendance, fees, and reporting refer to the same learner.  
**Typical users:** Admissions team, student desk, principal, authorized administrator  
**Safe demo:** Search a demo learner, open the profile, then show enrolment or activity-history context without editing the record.  
**Illustrative sample (slide only):** DEMO-STU-001 · JEE Foundation · Active enrolment (illustrative only). This is not a saved application record.  
**Presenter caution:** Student records are sensitive. Use synthetic demo data and keep write actions locked unless an authorized, scoped edit is intended.  
**Evidence:** [student workspaces](../../frontend/src/pages/Students.tsx); [directory, admission form, allocations, cards, history, reactivation](../../frontend/src/test/StudentDedicatedSubmenus.test.tsx); [exit/reactivation payload and lifecycle analytics](../../frontend/src/test/StudentLifecycle.test.tsx)

### 3. Admissions

**Workspace:** `/leads/pipeline`  
**What it does:** A lead and enquiry workflow that presents prospective learners in pipeline stages, follow-up views, and a lead dossier.  
**Why it matters:** A visible enquiry queue makes it easier for the team to see who needs a response and what stage each conversation has reached.  
**Typical users:** Admissions counsellor, front desk, admissions lead  
**Safe demo:** Show the pipeline columns, open a lead dossier, and switch between recent, follow-up, overdue, converted, and lost views.  
**Illustrative sample (slide only):** Demo Enquiry A · Counselling follow-up · Next action: confirm a suitable batch. This is not a saved application record.  
**Presenter caution:** Keep the walkthrough read-only. Do not send messages or convert a lead unless using an approved training tenant.  
**Evidence:** [pipeline page](../../frontend/src/pages/crm/LeadPipelinePage.tsx); [lead dossier](../../frontend/src/pages/crm/LeadDossierDrawer.tsx); [pipeline, dossier, and follow-up views](../../frontend/src/test/LeadManagementCRM.test.tsx); [role separation](../../frontend/src/test/LeadManagementRBAC.test.tsx)

### 4. Fees

**Workspace:** `/fees/collection`  
**What it does:** Fee structures and schedules, invoices, a collection desk, overdue tracking, payment views, and financial daybook reports.  
**Why it matters:** A common fee workflow helps staff answer what was assessed, what was received, and what remains due with clearer reconciliation.  
**Typical users:** Accountant, fee desk, principal, authorized finance administrator  
**Safe demo:** Open the collection desk and an existing invoice preview, then review overdue ageing or the financial daybook.  
**Illustrative sample (slide only):** DEMO-INV-001 · Installment status: pending review · No payment recorded. This is not a saved application record.  
**Presenter caution:** Never collect, refund, edit, or issue a financial record during a read-only showcase. Verify any payment gateway separately.  
**Evidence:** [fee tabs and workflows](../../frontend/src/pages/Fees.tsx); [structures, invoicing, collection, defaulters, gateway, and reports](../../frontend/src/test/FeesDedicatedSubmenus.test.tsx); [collection and outstanding trend](../../frontend/src/test/DashboardCollectionStatus.test.tsx)

### 5. Concessions

**Workspace:** `/fees/concessions`  
**What it does:** A governed workspace for concession and waiver schemes, applications, and their connection to a student's fee position.  
**Why it matters:** A visible approval path helps the institute apply its own benefit policy consistently and understand the resulting net amount due.  
**Typical users:** Principal, fee administrator, authorized approver  
**Safe demo:** Review the existing scheme list or a read-only concession trace and show gross assessed fee versus benefits and net payable.  
**Illustrative sample (slide only):** Demo application · Merit benefit · Approval status: pending review. This is not a saved application record.  
**Presenter caution:** Applying or approving a concession changes a financial record. Do not perform it in a showcase without explicit authorization and confirmation.  
**Evidence:** [concessions and waivers workspace](../../frontend/src/pages/Fees.tsx); [concession workspace and View-First lock](../../frontend/src/test/FeesDedicatedSubmenus.test.tsx); [trace drill-down and receipt breakdown](../../frontend/src/test/ConcessionGovernanceUI.test.tsx)

### 6. Scholarships

**Workspace:** `/fees/overview`  
**What it does:** Scholarship awards and waivers are represented with fee benefits and the wider financial view; they are not a separate top-level route.  
**Why it matters:** Keeping the award connected to the fee record makes the benefit and the remaining payable amount easier to review together.  
**Typical users:** Principal, scholarship coordinator, fee administrator  
**Safe demo:** Show the scholarship breakdown or configured scholarship scheme in Fees without granting or changing an award.  
**Illustrative sample (slide only):** Sample scheme: merit support · Eligibility and award require institute review. This is not a saved application record.  
**Presenter caution:** Confirm the institute's scholarship policy and configured catalogue. Do not imply external sponsorship or automated eligibility unless verified.  
**Evidence:** [scholarship breakdown and scheme configuration](../../frontend/src/pages/Fees.tsx); [concessions and scholarship-waiver workspace](../../frontend/src/test/FeesDedicatedSubmenus.test.tsx); [benefit-to-net-fee receipt breakdown](../../frontend/src/test/ConcessionGovernanceUI.test.tsx)

### 7. Attendance

**Workspace:** `/attendance/overview`  
**What it does:** Attendance overview, batch roll call, monthly register, QR kiosk, absentee tracking, leave applications, and attendance reports.  
**Why it matters:** A common register gives the institute a clearer view of who attended and which follow-up cases need attention.  
**Typical users:** Teacher, attendance desk, principal, authorized administrator  
**Safe demo:** Open the monthly register or QR terminal in view mode and explain the daily roll-call and absence-review flow.  
**Illustrative sample (slide only):** JEE Foundation · Session attendance · Unmarked entries flagged for review. This is not a saved application record.  
**Presenter caution:** A QR terminal screen does not by itself prove a particular scanner/device or parent-alert integration is operational.  
**Evidence:** [attendance workspaces](../../frontend/src/pages/Attendance.tsx); [daily roll call, QR terminal, register, absenteeism, leave, reports](../../frontend/src/test/AttendanceDedicatedSubmenus.test.tsx)

### 8. Timetable

**Workspace:** `/academic/timetable`  
**What it does:** A weekly schedule workspace linked to academic structure, batches, faculty, and timetable settings.  
**Why it matters:** A shared schedule helps coordinators, teachers, and learners refer to the same class plan and spot clashes earlier.  
**Typical users:** Academic coordinator, principal, teachers  
**Safe demo:** Show the weekly timetable and its schedule settings; point out the batch/class context without saving a change.  
**Illustrative sample (slide only):** 09:00 Mathematics · 11:00 Physics · Faculty A (illustrative schedule). This is not a saved application record.  
**Presenter caution:** Schedule changes affect people and rooms. Verify local rules, room availability, and conflict settings before publishing.  
**Evidence:** [timetable tab and academic context](../../frontend/src/pages/AcademicWorkspace.tsx); [weekly timetable and conflict-policy settings](../../frontend/src/test/AcademicDedicatedSubmenus.test.tsx); [planning/schedule integration research](../../docs/01_ARCHITECTURE/2026-11-17_ARCHITECTURE_RESEARCH-REPORT_PLANNING-SCHEDULE-INTEGRATION_V1.md)

### 9. Examinations

**Workspace:** `/examinations/overview`  
**What it does:** Exam overview, schedules, marks entry, performance analytics, question-paper workspaces, and grading settings.  
**Why it matters:** A defined assessment workflow helps staff plan tests, enter marks consistently, and prepare the information needed for results.  
**Typical users:** Exam coordinator, teachers, academic lead  
**Safe demo:** Review an existing examination schedule or analytics view and show the marks-entry workspace without entering marks.  
**Illustrative sample (slide only):** Weekly Test A · Scheduled · Marks entry not started. This is not a saved application record.  
**Presenter caution:** Marks are sensitive academic records. Keep entry and grading-policy changes locked during a general showcase.  
**Evidence:** [exam workspaces](../../frontend/src/pages/Examinations.tsx); [schedules, marks entry, analytics, papers, grading](../../frontend/src/test/ExaminationsDedicatedSubmenus.test.tsx); [marks and analytics drawers](../../frontend/src/test/ExaminationsAndReportCards.test.tsx)

### 10. Results

**Workspace:** `/examinations/report-cards`  
**What it does:** Student report cards and transcripts with marks, grade summaries, and batch-level report-card compilation.  
**Why it matters:** A consistent result format makes it easier for teachers and administrators to review performance and communicate outcomes.  
**Typical users:** Teacher, exam coordinator, principal, authorized student-support staff  
**Safe demo:** Open a synthetic student's report card and show its transcript, marks table, and summary.  
**Illustrative sample (slide only):** DEMO-STU-001 · Mathematics: reviewed · Result: preview only. This is not a saved application record.  
**Presenter caution:** Check the selected grading scale and verify all marks before sharing or printing a result.  
**Evidence:** [report-card route](../../frontend/src/pages/Examinations.tsx); [transcript, marks, grading scale, and batch dossier](../../frontend/src/test/ExaminationsAndReportCards.test.tsx); [report-card workspace](../../frontend/src/test/ExaminationsDedicatedSubmenus.test.tsx)

### 11. Staff

**Workspace:** `/staff/directory`  
**What it does:** A staff register with onboarding, roles and duties, attendance, leave requests, HR documents, and policy settings.  
**Why it matters:** A shared people workspace helps the institute coordinate who works here, what duties they cover, and which requests are waiting.  
**Typical users:** HR or office administrator, principal, authorized department lead  
**Safe demo:** Search a synthetic staff profile and show the duties or leave queue without changing a person's employment record.  
**Illustrative sample (slide only):** Faculty A · Mathematics · Duty: JEE Foundation batch. This is not a saved application record.  
**Presenter caution:** Payroll is a separate workflow. Keep personal and employment records private and mutations role-authorized.  
**Evidence:** [staff workspaces](../../frontend/src/pages/StaffManagement.tsx); [register, onboarding, duties, attendance, leave, HR documents](../../frontend/src/test/StaffDedicatedSubmenus.test.tsx); [teacher and non-teaching workforce dashboards](../../frontend/src/test/WorkforceDashboards.test.tsx)

### 12. Communication

**Workspace:** `/communication/overview`  
**What it does:** A workspace for broadcast composition, templates, channel settings, reminders, dispatch history, and gateway diagnostics.  
**Why it matters:** Organized message templates and history can help staff send consistent, traceable updates instead of relying on scattered manual notes.  
**Typical users:** Office administrator, admissions/fee desk, authorized communications operator  
**Safe demo:** Preview a template, inspect dispatch history, or review gateway diagnostics; do not dispatch a message.  
**Illustrative sample (slide only):** Class reminder · Draft · Not sent to any recipient. This is not a saved application record.  
**Presenter caution:** Delivery depends on channel configuration, provider credentials, consent, and applicable messaging rules; sending is an explicit action.  
**Evidence:** [communication workspaces](../../frontend/src/pages/Communication.tsx); [composer, WhatsApp workspace, templates, logs, reminders, diagnostics, settings](../../frontend/src/test/CommunicationDedicatedSubmenus.test.tsx); [templates, channels, queues, and automation workspace](../../frontend/src/test/Communication.test.tsx)

### 13. Reports

**Workspace:** `/reports`  
**What it does:** A central report catalogue with categories, search, data grids, operational analytics, and report-navigation/history context.  
**Why it matters:** A repeatable report can help an administrator answer recurring questions with a consistent definition and period.  
**Typical users:** Director, principal, accountant, academic coordinator  
**Safe demo:** Search for one relevant report, inspect its filters and calculation explanation, then preview or export only demo data.  
**Illustrative sample (slide only):** Weekly attendance report · Date range and cohort to be selected by the institute. This is not a saved application record.  
**Presenter caution:** Check report scope, date range, formula, and role access before sharing an export.  
**Evidence:** [reports page](../../frontend/src/pages/Reports.tsx); [report catalog, search, grids, favorites, API-backed views](../../frontend/src/test/ReportingCentre.test.tsx); [calculation explanation and decision insights](../../frontend/src/test/ReportIntelligence.test.tsx)

### 14. Settings

**Workspace:** `/settings`  
**What it does:** Central administration workspaces for institute profile, branding, lookups, and other system and workspace configuration.  
**Why it matters:** A controlled configuration area helps the institute align names, policies, and defaults before staff use everyday workflows.  
**Typical users:** System administrator, principal, authorized configuration owner  
**Safe demo:** Review the institute profile preview and settings categories without saving changes.  
**Illustrative sample (slide only):** Academic year · Institute identity · Role policy (configuration preview). This is not a saved application record.  
**Presenter caution:** Some settings affect the whole institute. Changes require the correct role, explicit Edit Mode, and a review plan.  
**Evidence:** [settings page](../../frontend/src/pages/Settings.tsx); [settings categories, institute profile, branding, and lookup table](../../frontend/src/test/Settings.test.tsx); [route role restrictions](../../frontend/src/App.tsx)

### 15. Courses

**Workspace:** `/courses/repository`  
**What it does:** A teaching-content library for uploads, chapter notes, question banks, video lectures, and curriculum syllabi.  
**Why it matters:** A shared catalogue can make it easier for teachers to find and reuse institute-approved learning materials.  
**Typical users:** Academic coordinator, teachers, content administrator  
**Safe demo:** Filter the content library and preview the notes, question-bank, or syllabus workspace without uploading files.  
**Illustrative sample (slide only):** JEE Foundation · Algebra chapter · Content status: preview only. This is not a saved application record.  
**Presenter caution:** Confirm storage limits, file policy, permissions, and rights to teaching material before uploading or sharing.  
**Evidence:** [course workspaces](../../frontend/src/pages/Courses.tsx); [library, uploads, notes, question banks, videos, syllabi, storage settings](../../frontend/src/test/CourseDedicatedSubmenus.test.tsx)

### 16. Homework

**Workspace:** `/homework`  
**What it does:** A homework studio for assigning work to a batch, individual learner, or selected group, with checking, submissions, registers, and templates.  
**Why it matters:** Teachers can follow work from assignment through review and see which learners need support.  
**Typical users:** Teacher, academic coordinator, authorized student-support team  
**Safe demo:** Open the checking register and digital-submissions view; preview an assignment form without publishing it.  
**Illustrative sample (slide only):** Quadratic practice · Due date to be set · Evaluation not started. This is not a saved application record.  
**Presenter caution:** Do not publish to a live batch or edit a learner's submission during a general demo.  
**Evidence:** [homework studio](../../frontend/src/pages/HomeworkWorkspace.tsx); [checking, daily register, target selection, submissions, templates](../../frontend/src/test/HomeworkWorkspace.test.tsx); [homework acceptance report](../../docs/03_ACADEMIC_MANAGEMENT/2026-11-12_ACADEMIC-MANAGEMENT_ACCEPTANCE-REPORT_HOMEWORK-AND-ASSIGNMENT-ENHANCEMENT_V1.md)

### 17. EduBoard

**Workspace:** `/eduboard/4`  
**What it does:** A classroom presentation canvas with board-display workspaces, multiple pages, and recovery support for an interrupted session.  
**Why it matters:** Teachers can present lesson content in a shared digital space rather than depending only on a physical board.  
**Typical users:** Teacher, classroom presenter, academic technology administrator  
**Safe demo:** Open the board in read-only/student view and show the display mode; if approved, switch between the available whiteboard/greenboard presentation modes.  
**Illustrative sample (slide only):** Physics lesson · Read-only display · Four-page lesson outline (illustrative). This is not a saved application record.  
**Presenter caution:** Student view is read-only. Keep drawing/editing controls locked for a public demo and test display hardware separately.  
**Evidence:** [EduBoard workspace](../../frontend/src/pages/EduBoardWorkspace.tsx); [read-only student canvas, scoped recovery, edit governance, multi-page, conflict recovery](../../frontend/src/test/EduBoardWorkspace.test.tsx); [display and popout behavior](../../frontend/src/test/EduBoardDisplayAndPopout.test.tsx); [EduBoard functionality audit](../../docs/03_ACADEMIC_MANAGEMENT/2026-11-12_ACADEMIC-MANAGEMENT_AUDIT-REPORT_EDUBOARD-EXISTING-FUNCTIONALITY-AUDIT_V1.md)

### 18. Forms

**Workspace:** `/forms/overview`  
**What it does:** A document workspace for admission forms, identity cards, receipts/notices, hall tickets, transcripts, certificates, and bulk printing.  
**Why it matters:** Standard templates help staff produce consistent documents while keeping a preview step before printing.  
**Typical users:** Admissions desk, office administrator, exam coordinator, fee desk  
**Safe demo:** Preview an admission form or identity card and show the print audit workspace without printing real personal data.  
**Illustrative sample (slide only):** Identity-card template · Demo fields only · Print not started. This is not a saved application record.  
**Presenter caution:** A masked field or consent element is not, on its own, a legal-compliance certification. Validate templates, consent, and print access.  
**Evidence:** [forms/document workspace](../../frontend/src/pages/FormsDocuments.tsx); [forms, IDs, financial docs, transcripts, certificates, bulk print, audit](../../frontend/src/test/FormsDedicatedSubmenus.test.tsx); [A4 template, masked Aadhaar, consent, and print behavior](../../frontend/src/test/FormsDocuments.test.tsx)

### 19. Import_Export

**Workspace:** `/import-export`  
**What it does:** A guided data exchange workspace with a paste/grid import, validation, filtered export, and import-history views.  
**Why it matters:** Structured checks before and after transfer can reduce avoidable errors when an institute brings data in or prepares a report for another process.  
**Typical users:** Data steward, administrator, accountant, authorized operator  
**Safe demo:** Load sample rows, run grid validation, inspect export filters, and show import history without committing a live import.  
**Illustrative sample (slide only):** DEMO-STU-001 · Required fields checked · No import committed. This is not a saved application record.  
**Presenter caution:** Export workflows must follow approved backup, retention, and deletion policy.  
**Evidence:** [import/export workspace](../../frontend/src/pages/ImportExport.tsx); [paste grid, sample validation, export filters, history](../../frontend/src/test/ImportExport.test.tsx); [SSOT governance](../../docs/25_BUSINESS_REQUIREMENTS/2026-11-06_GLOBAL_POLICY_SINGLE-SOURCE-OF-TRUTH-GOVERNANCE_V1.md); [canonical master and mapping policy](../../docs/25_BUSINESS_REQUIREMENTS/2026-11-09_GLOBAL_POLICY_DATA-DEDUPLICATION-AND-MAPPING-GOVERNANCE_V1.md)

### 20. Training

**Workspace:** `/training`  
**What it does:** A separate training/simulation workspace for staff practice, workflow drills, status monitoring, and controlled baseline resets.  
**Why it matters:** Staff can learn key steps away from production records, reducing the chance that training activity changes real institute data.  
**Typical users:** Trainer, administrator, new staff, module champions  
**Safe demo:** Verify the PA001-DEMO training tenant and visible TRAINING indicator, then navigate using sample records only.  
**Illustrative sample (slide only):** PA001-DEMO · Synthetic practice only · Reset not run. This is not a saved application record.  
**Presenter caution:** Never reset a tenant or switch to production during a showcase. Confirm the environment badge before any edit.  
**Evidence:** [isolated training lab and PA001-DEMO tenant](../../frontend/src/pages/TrainingManagement.tsx); [mode switch, warnings, logout reset, training banner](../../frontend/src/test/TrainingEnvironment.test.tsx); [training-mode indicator](../../frontend/src/test/StudentDedicatedSubmenus.test.tsx)

## Suggested end-to-end demonstration

Use a synthetic prospective learner to tell one coherent story. First show the Admissions pipeline and follow-up view; then show the corresponding learner record in Students and its batch context. Navigate to the academic timetable, then demonstrate attendance and a read-only EduBoard view. Show how an assessment appears in Examinations and a synthetic result in Results. Finish with the fee overview and a read-only benefit/receipt breakdown, then locate the relevant Reports view. Keep the sequence navigational and read-only; do not create a lead, enroll a student, record attendance, enter marks, apply a benefit, collect money, send a message, or print real personal data.

The exact linkage among records depends on the selected demo tenant and its seed data. If a link is missing, explain the screen without inventing a record relationship.

## Recommended rollout approach

### 1. Discover and assign ownership

Name an executive sponsor, an operational lead, and a module champion for admissions, student records, academics, fees, attendance, communication, and reporting. Map the institute's existing terms (courses, standards, batches, academic years) to the product's canonical structure. Agree which roles may view, edit, approve, export, and print.

### 2. Prepare and reconcile data

Take and verify a restorable backup before migration. Deduplicate people and shared academic masters, preserve historical financial and academic snapshots, map imported rows to the canonical entities, and test a small sample. Reconcile source and destination counts and totals before expanding the import.

### 3. Configure and test

Set institute identity, academic year, courses/batches, fee policies, grading rules, attendance rules, roles, and document templates. Test only the integrations actually required (payment provider, messaging channel, scanner/device, or external data source) in the intended environment; record whether each is configured, tested, and approved.

### 4. Rehearse in Training

Use the isolated training tenant, verify the visible training indicator, and rehearse common role-specific tasks with synthetic records. Do not use production reset actions as a training shortcut. Collect questions and update the institute's short operating procedures.

### 5. Pilot, review, and expand

Start with one representative course or batch and a small set of authorized users. Run the institute's normal workflows for an agreed pilot period. Review data quality, financial reconciliation, permissions, and staff feedback; correct the process before adding more batches or modules.

## Baseline and success measures

Capture a baseline before the pilot, then compare the same measures, scope, and time window after it. Use institute-owned targets; this guide does not promise a particular percentage improvement or payback period.

- **Admissions:** enquiry response time, follow-ups due/completed, and enquiry-to-enrolment count using an agreed definition.
- **Student records:** required-field completeness, duplicate exceptions, and batch allocation exceptions.
- **Fees:** invoices/collections reconciled to source records, overdue balance by agreed ageing bands, and refund/reversal exceptions.
- **Attendance:** register completion time, unmarked sessions, and absence follow-up cases.
- **Academics:** timetable conflicts found before publishing, assessment completion, and time to prepare a reviewed report card.
- **Homework and communication:** assignment review backlog, dispatch failures/undelivered items, and unresolved communication cases.
- **Adoption and control:** training completion, support requests, use of authorized roles, and number of corrected data issues.

## Claims and checks before presenting

- Do not repeat ROI, rollout-time, collection-lift, attendance-lift, speed, or accuracy figures unless they are supported by a defined measurement and an approved source.
- Do not promise live WhatsApp/SMS delivery, online payment processing, RFID/scanner compatibility, offline operation, or external-system synchronization based only on a visible UI or route.
- Show Scholarships as a fee benefit workspace; do not imply a separate module route or an external sponsor workflow without confirming it.
- The tagline 'Your institute controls its data; we manage the infrastructure.' describes a responsibility split only where provider-managed infrastructure is in scope. Confirm the hosting model, data access, export, backup, retention, deletion, and each party's responsibilities before presenting it.
- Demonstrate concessions, admissions conversion, attendance marks, marks entry, communications, imports, and payments only in training or with explicit scoped authorization.
- Confirm the approved product build and access controls before presenting. The deck contains unmodified screenshots with live personal and operational data; keep it internal and access-controlled. Values are not independently audited. Slide-side examples are illustrative and are not saved application records.

## Repository evidence and governance

- [Global Single Source of Truth governance](../25_BUSINESS_REQUIREMENTS/2026-11-06_GLOBAL_POLICY_SINGLE-SOURCE-OF-TRUTH-GOVERNANCE_V1.md)
- [Global data deduplication and mapping governance](../25_BUSINESS_REQUIREMENTS/2026-11-09_GLOBAL_POLICY_DATA-DEDUPLICATION-AND-MAPPING-GOVERNANCE_V1.md)
- [Global View-First and explicit Edit Mode governance](../12_RBAC_SECURITY/2026-11-07_RBAC-SECURITY_IMPLEMENTATION-REPORT_GLOBAL-VIEW-FIRST-AND-EXPLICIT-EDIT-MODE-GOVERNANCE_V1.md)
- [Official route and role boundaries](../../frontend/src/App.tsx)
- [Existing pitch deck specification](2026-11-19_PRODUCT-OVERVIEW_REPORT_COACHING-PITCH-DECK-PRESENTATION_V1.md) - treat its business-impact and integration statements as claims to re-verify, not evidence for this guide.

## Suggested next step

Before presenting externally, run a short internal review with the product owner and institute administrator: verify the exact demo tenant, replace any stale sample dataset, test the required roles and integrations, and agree the pilot scope and baseline measures. Then use the accompanying deck as a guided conversation rather than a promise sheet.
