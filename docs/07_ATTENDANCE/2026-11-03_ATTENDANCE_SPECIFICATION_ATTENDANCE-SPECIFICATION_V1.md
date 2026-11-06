---
title: "Attendance Module Specification"
module: "07_ATTENDANCE"
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
tags: ["07-attendance", "specification"]
entities: ["Attendance"]
api_routes: ["/api/v1/attendance"]
related_modules: []
---

# Attendance Module Specification

**Module**: Daily Attendance & Absence Management  
**Version**: 1.0.0  
**Status**: IMPLEMENTED  

---

## 1. Purpose & Scope
Provides digital class roster attendance marking, presence metrics, absence alert integration, and aggregate student attendance percentage computations.

---

## 2. Features
- Standard & Division based class roster loading.
- One-click "All Present" and "All Absent" batch actions.
- Granular per-student statuses: `present`, `absent`, `late`, `half_day`.
- Optional remarks field for parent communications.
- Real-time attendance rate calculation.

---

## 3. Business Rules
- **ATP-ATT-001**: 75% minimum aggregate attendance threshold.
- **ATP-ATT-002**: Absence alerts dispatched to guardian upon attendance submission.
- **ATP-ATT-003**: 24-hour teacher correction window.

