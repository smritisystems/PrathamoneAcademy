# Fees & Billing Module Specification

**Module**: Fee Structures, Invoicing & Obligations  
**Version**: 1.0.0  
**Status**: IMPLEMENTED  

---

## 1. Purpose & Scope
The Fees module manages the creation of institutional fee structures, categories, installment schedules, scholarships/discounts, and immutable student fee invoices.

---

## 2. Features
- Fee Categories: Tuition, Admission, Examination, Transport, Library, Lab.
- Fee Structures: Configurable by Standard, Academic Year, Frequency (Monthly, Quarterly, Annually), and Due Day.
- Automated installment schedule generation.
- Concessions and Scholarships applied prior to billing.
- Immutable Fee Invoices with Line Item breakdowns.

---

## 3. Business Rules
- **FPA-RUL-001**: Over-allocation and overbilling strictly prohibited.
- **FPA-RUL-004**: Concession approval tiers enforced (<=10% Counselor, <=25% Admin, >25% Owner).
- **FPA-RUL-005**: 7-day grace period before late fee penalty assessment.

