# Attendance and Examination Policy
**Document ID**: ATP-001  
**Version**: 1.0-DRAFT  
**Parent Framework**: CIPF-001  
**Status**: APPROVED DEFAULT ARCHITECTURE / DRAFT POLICIES PENDING OWNER CONFIRMATION  
**Target System**: Prashant Academy SMS / Coaching Management System  

---

## 1. Objectives & Scope

This policy governs the daily operational standards for recording student classroom presence and evaluating academic progress through internal assessments, weekly tests, board mock exams, and competitive test series (JEE/NEET).

---

## 2. Attendance Policy & Rules

### 2.1 Attendance Marking Protocol
- Attendance is recorded daily by the primary batch teacher or designated class coordinator.
- Marking window: Attendance must be submitted within **30 minutes of class commencement**.
- Supported statuses:
  - `present`: Student is in physical attendance.
  - `absent`: Student is unexcused absent.
  - `late`: Student arrived more than 15 minutes after start.
  - `half_day` / `excused`: Student left early with verified guardian consent or medical note.

### 2.2 Attendance Business Rules

#### ATP-ATT-001: Minimum Attendance Threshold
- **Rule**: Students must maintain a minimum of **75% aggregate attendance** in each enrolled subject to be eligible to sit for term-end examinations and institute test series.
- **System Behavior**: System automatically flags students below 75% on the coordinator dashboard with amber warnings, and below 60% with red critical alerts.

#### ATP-ATT-002: Parent Absence Notifications
- **Rule**: If a student is marked `absent` or `late`, an automated alert (SMS/WhatsApp notification queue) is dispatched to the primary guardian's registered mobile number within 45 minutes of session start.

#### ATP-ATT-003: Attendance Correction Protocol
- **Rule**: Teachers may amend attendance records within **24 hours** of submission.
- **Exception & Approval**: Any retroactive correction after 24 hours requires written submission of reason and explicit approval by the `Academic Coordinator` or `Institute Administrator`. All modifications create audit log entries preserving the original marking, updated marking, and authorized officer ID.

---

## 3. Examination and Academic Progress Policy

### 3.1 Examination Categorization
1. **Weekly Unit Tests (WUT)**: High-frequency 50-mark tests to track weekly conceptual retention.
2. **Monthly Cumulative Assessments (MCA)**: 100-mark tests covering the running month's curriculum.
3. **Board Mock Examinations (BME)**: Full-length 3-hour tests replicating CBSE/State Board blueprints.
4. **Competitive Test Series (CTS - JEE/NEET)**:
   - JEE Pattern: Physics, Chemistry, Mathematics (300 Marks, +4 / -1 negative marking).
   - NEET Pattern: Physics, Chemistry, Biology (720 Marks, +4 / -1 negative marking).

### 3.2 Marks Workflow State Machine

```
[Draft Exam Created]
       │
       ▼
[Exam Conducted]
       │
       ▼
[Marks Entry by Subject Teacher] ── (Status: 'draft')
       │
       ▼
[Marks Verification by Academic Coordinator] ── (Status: 'verified')
       │
       ▼
[Marks Publication & Rank Generation] ── (Status: 'published')
       │
       ▼
[Report Cards Issued to Guardians]
```

### 3.3 Examination Business Rules

#### ATP-EXM-001: Verification Gate Before Publication
- **Rule**: Marks entered by teachers cannot be viewed by students or parents until formally reviewed and verified by the Academic Coordinator.
- **Precondition**: All enrolled students in the batch have marks or `AB` (Absent) entered.
- **System Behavior**: `/examinations/{id}/publish` endpoint checks that verification flag is `true`.

#### ATP-EXM-002: Grading Scale and Cutoffs `[PROPOSED]`
Unless otherwise configured for competitive exams, the following grading standard applies:

| Score Range | Grade | Performance Descriptor | Grade Point |
|---|:---:|---|:---:|
| 91% – 100% | A1 | Outstanding | 10 |
| 81% – 90% | A2 | Excellent | 9 |
| 71% – 80% | B1 | Very Good | 8 |
| 61% – 70% | B2 | Good | 7 |
| 51% – 60% | C1 | Satisfactory | 6 |
| 41% – 50% | C2 | Acceptable | 5 |
| 33% – 40% | D | Marginal / Needs Support | 4 |
| Below 33% | E | Unsatisfactory (Mandatory Remedial) | 0 |

#### ATP-EXM-003: Performance Analytics & Parent Communication
- Upon publication, the system automatically computes:
  - Batch Average Score
  - Batch Highest Score
  - Student Subject-Wise Percentile & Overall Rank
- Downloadable and printable Progress Reports summarize attendance percentage, assessment marks, rank, teacher remarks, and corrective recommendations.

---

*End of ATTENDANCE_AND_TEST_POLICY.md*

