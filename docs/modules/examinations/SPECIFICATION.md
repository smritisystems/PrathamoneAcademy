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

