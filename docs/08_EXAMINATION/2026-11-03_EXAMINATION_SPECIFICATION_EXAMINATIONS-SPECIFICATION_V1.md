---
title: "Examinations Module Specification"
module: "08_EXAMINATION"
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
tags: ["08-examination", "specification"]
entities: ["Exam", "ExamResult"]
api_routes: ["/api/v1/examinations"]
related_modules: []
---

# Examinations Module Specification

**Module**: Examinations & Marks Management  
**Version**: 1.0.0  
**Status**: IMPLEMENTED  

---

## 1. Purpose & Scope
Manages test schedules, subject assessments, maximum marks, passing thresholds, teacher score entry, coordinator verification, and student grade calculations.

---

## 2. Features
- Creation of examinations (Mid-term, Final, Unit Tests, Competitive Mocks).
- Maximum marks and passing cutoff configuration.
- Score and absence recording per student.
- Computed percentage, letter grades, and percentile ranks.

---

## 3. Business Rules
- **ATP-EXM-001**: Verification required before marks publication.
- **ATP-EXM-002**: Standard grading scale (A1 down to E).
- Exam marks cannot exceed maximum configured marks.

