---
title: "Admissions Module Specification"
module: "04_STUDENT_MANAGEMENT"
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
tags: ["04-student-management", "specification"]
entities: ["Student", "StudentEnrollment", "StudentAcademicHistory"]
api_routes: ["/api/v1/students", "/api/v1/admissions"]
related_modules: []
---

# Admissions Module Specification

**Module**: Admissions & Intake  
**System**: Prashant Academy SMS  
**Version**: 1.0.0  
**Status**: IMPLEMENTED  

---

## 1. Purpose & Scope
The Admissions module manages the complete intake funnel for Prashant Academy: from preliminary parent inquiries and trial class scheduling through student demographic onboarding, guardian profile association, and formal enrollment into academic standards.

---

## 2. Features & Capabilities
- Multi-step registration wizard (Personal Info -> Guardian Info -> Academic Info -> Review).
- Unique admission number generation (`PA-YYYY-NNNNNN`).
- Support for trial/demo class status before final financial enrollment.
- Guardian demographic, occupation, and relationship tracking.
- Automatic linkage to academic year and standard/division.

---

## 3. Business Rules & Policies
- **CBR-ADM-001**: Inquiries and registrations must record student and guardian contact info.
- **CBR-ADM-002**: Admission numbers are strictly sequential, immutable, and never reused.
- **CBR-ADM-003**: Every enrolled student must have at least one primary guardian record.
- **CBR-ADM-004**: Trial students may attend up to 3 classes before formal registration fee payment.

---

## 4. Dependencies & Integrations
- Depends on `standards` and `divisions` modules to assign classroom seats.
- Integrates with `fees` module: triggering initial fee structure assignment upon enrollment.

---

## 5. Roles and Permissions
- `superadmin`, `admin`: Full create, update, search, and enrollment approval.
- `counselor`: Inquiry entry, registration, trial tracking.
- `accountant`: Read-only access to admission numbers and guardian contacts.

