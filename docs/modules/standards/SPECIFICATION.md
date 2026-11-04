# Standards, Classes & Boards Module Specification

**Module**: Standards, Classes & Boards  
**Version**: 1.1.0  
**Status**: IMPLEMENTED  

---

## 1. Purpose & Scope
Governs the academic and coaching structure of Prashant Academy, incorporating:
- Educational Boards (`ICSE`, `CBSE`, `SSC`).
- Standards / Classes (`Standard 8 / Class VIII`, `Standard 9 / Class IX`, `Standard 10 / Class X`).
- Coaching Batches / Divisions mapped to Boards and Classes (`ICSE X`, `CBSE X`, `ICSE IX`, `ICSE VIII`, `SSC IX`).
- Student enrollment linkages to specific boards and classes for academic tracking and fee accounting.

---

## 2. Entity Model & Mapping

### A. Boards Table (`boards`)
- `id`: Primary key
- `institution_id`: Foreign key -> `institutions.id`
- `name`: Board name (`ICSE`, `CBSE`, `SSC`)
- `code`: Unique board code (`ICSE`, `CBSE`, `SSC`)
- `description`: Formal board title (e.g. `Indian Certificate of Secondary Education`)
- `is_active`: Status flag

### B. Standards / Classes Table (`standards`)
- `id`: Primary key
- `institution_id`: Foreign key -> `institutions.id`
- `name`: `Standard 8`, `Standard 9`, `Standard 10`, etc.
- `level`: Integer grade level (`8`, `9`, `10`)
- `description`: Class Roman designation (`Class VIII`, `Class IX`, `Class X`)

### C. Divisions / Batches Table (`divisions`)
- `id`: Primary key
- `standard_id`: Foreign key -> `standards.id`
- `board_id`: Nullable foreign key -> `boards.id`
- `name`: Batch name (`ICSE X`, `CBSE X`, `ICSE IX`, `ICSE VIII`, `SSC IX`)
- `capacity`: Maximum seating capacity (default: 50)

---

## 3. Approved Board & Class Mapping

| Board | Class | Standard Level | Batch Name | Student Cohort Count |
|:---:|:---:|:---:|:---:|:---:|
| **ICSE** | **X** | Standard 10 | `ICSE X` | 8 students |
| **CBSE** | **X** | Standard 10 | `CBSE X` | 5 students |
| **ICSE** | **IX** | Standard 9 | `ICSE IX` | 15 students |
| **ICSE** | **VIII** | Standard 8 | `ICSE VIII` | 5 students |
| **SSC** | **IX** | Standard 9 | `SSC IX` | 6 students |

---

## 4. Student Data Roster

1. **ICSE — Standard X (8)**: Rajnees, Ayaan, Netham, Shreshta, Savesh, Ansh, Riddhima, Sonakshi
2. **CBSE — Standard X (5)**: Raudrita, Samruddhi, Aman, Ashwin, Keshwa
3. **ICSE — Standard IX (15)**: Satnam, Samud, Simran, Kashish, Vedant, Khushi, Mahek, Johan, Avner, Apika, Shrawya, Afton, Maahi, Aadya, Rida
4. **ICSE — Standard VIII (5)**: Puneeta, Aliya, Siddhant, Shaurya, Chehek
5. **SSC — Standard IX (6)**: Siddharth, Aditya, Shriya, Sukhmeet, Sushmya, Aaradhya

---

## 5. Business Rules
- Boards are uniquely identified by code per institution.
- Batches reference their parent academic level (`standard_id`) and affiliated board (`board_id`).
- Student enrollments link the student to the academic year, standard, and batch.
- Renaming batches (e.g. `ICSE 9th` to `ICSE IX`) preserves all historical fee invoices, payments, and receipts.
