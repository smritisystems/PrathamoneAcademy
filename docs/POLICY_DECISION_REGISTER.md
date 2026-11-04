# Policy Decision Register (PDR)
**Document ID**: PDR-REG-001  
**Version**: 1.0-DRAFT  
**Parent Framework**: CIPF-001  
**Status**: PENDING OWNER REVIEW & APPROVAL  
**Applies To**: Prashant Academy Coaching Institute Management System  

---

## 1. Overview and Instructions for Institute Owner

This register documents all business, architectural, and financial decisions requiring formal approval from the Prashant Academy Board / Institute Owner.

Each register entry specifies:
- **Decision ID**: Unique tracker
- **Context & Problem Statement**: Why the decision is required
- **Options Evaluated**: Trade-offs of alternatives
- **Architect Recommended Default**: Proposed behavior currently implemented or drafted
- **Decision Status**: `PENDING OWNER APPROVAL`, `APPROVED`, or `REJECTED`
- **Owner Signature & Date**: Required for final policy enforcement

---

## 2. Decision Register Table

| Decision ID | Domain | Topic | Recommended Default | Decision Status | Owner Action |
|:---:|:---:|---|---|:---:|:---:|
| **PDR-001** | Architecture | Schema Extension for Boards, Courses, & Batches | Create 5 new tables (`boards`, `courses`, `batches`, `batch_schedules`, `teacher_batch_assignments`) via next Alembic migration. | PENDING OWNER APPROVAL | [ ] Approve [ ] Modify |
| **PDR-002** | Academic | Coaching Academic Cycles | Support dual cycles: June–May for School Boards; July–April for JEE/NEET. | PENDING OWNER APPROVAL | [ ] Approve [ ] Modify |
| **PDR-003** | Academic | Key Admission Deadlines | Admissions open March 1, normal close July 31, late admission with penalty till August 31. | PENDING OWNER APPROVAL | [ ] Approve [ ] Modify |
| **PDR-004** | Operational | Batch Capacity Defaults | Standard 1–8: 40 students; Standard 9–12: 35 students; JEE/NEET: 30 students. | PENDING OWNER APPROVAL | [ ] Approve [ ] Modify |
| **PDR-005** | Academic | Minimum Attendance Requirement | 75% minimum aggregate attendance required for internal test & exam eligibility. | PENDING OWNER APPROVAL | [ ] Approve [ ] Modify |
| **PDR-006** | Academic | Minimum Weekly Teaching Hours | School: 3 hours/subject/week; JEE/NEET: 5 hours/subject/week. | PENDING OWNER APPROVAL | [ ] Approve [ ] Modify |
| **PDR-007** | Admission | Trial / Demo Class Policy | Up to 3 free trial classes per student; mandatory enrollment before 4th class. | PENDING OWNER APPROVAL | [ ] Approve [ ] Modify |
| **PDR-008** | Finance | Mid-Term Withdrawal Refund Schedule | 100% tuition refund before classes; 80% within 15 days; 50% within 30 days; 0% after 30 days. Admission fee non-refundable. | PENDING OWNER APPROVAL | [ ] Approve [ ] Modify |
| **PDR-009** | Admission | Rejoining Fee / Gap Penalty | Waive gap penalty if withdrawal was on medical grounds; otherwise charge standard re-registration fee of ₹1,000. | PENDING OWNER APPROVAL | [ ] Approve [ ] Modify |
| **PDR-010** | HR / Faculty | Maximum Teaching Hours per Teacher | Maximum 6 teaching hours per day and 30 hours per week per faculty member. | PENDING OWNER APPROVAL | [ ] Approve [ ] Modify |
| **PDR-011** | Operational | Teacher Substitution & Make-up Window | Substitute assigned immediately; mandatory make-up class scheduled within 7 calendar days. | PENDING OWNER APPROVAL | [ ] Approve [ ] Modify |
| **PDR-012** | Finance | Mandatory Upfront Payment for Roster | Minimum token admission fee of ₹1,000 required before student is added to active attendance roster. | PENDING OWNER APPROVAL | [ ] Approve [ ] Modify |
| **PDR-013** | Finance | Batch Transfer Fee Differential | If transferring to a higher-fee batch, generate supplementary invoice; no refund for lower-fee transfers. | PENDING OWNER APPROVAL | [ ] Approve [ ] Modify |
| **PDR-014** | Security | Aadhaar Storage & DPDP Compliance | Encrypt Aadhaar using AES-256; display only masked last 4 digits `XXXXXXXX1234` in UI. | PENDING OWNER APPROVAL | [ ] Approve [ ] Modify |
| **PDR-015** | Governance | Fee Concession Approval Limits | Counselor: up to 10%; Administrator: up to 25%; Owner approval required for > 25% scholarship. | PENDING OWNER APPROVAL | [ ] Approve [ ] Modify |

---

## 3. Detailed Decision Briefs

### PDR-001: Coaching Extension Schema
- **Current State**: Existing schema (`alembic/versions/001_initial_schema.py`) implements `institutions`, `academic_years`, `standards`, `divisions`, and `students`.
- **Proposed Extension**: Add `boards` (CBSE, ICSE, Maharashtra State Board, JEE, NEET), `courses`, and `batches` to distinguish standard school classes from specialized coaching programs.
- **Impact**: Backward compatible migration; existing Standard 1–12 divisions will map to default board/course entities.

### PDR-008: Student Refund Schedule
- **Financial Risk**: High risk of revenue loss if refund windows are overly lenient, versus legal/reputational risk if overly rigid.
- **Recommended Default**: Strict 30-day tiered cliff. No tuition refund past 30 days of course commencement.

---

*End of POLICY_DECISION_REGISTER.md*

