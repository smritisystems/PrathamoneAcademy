# /**
#  * @file        inspect_excel.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-04
#  * @updated     2026-11-04
#  *
#  * @description Diagnostic utility inspecting sheets and header rows in uploaded Excel import workbooks.
#  */

import openpyxl

wb = openpyxl.load_workbook(r'F:\Smriti-Clients Data\Prashant Academy\Book1.xlsx', data_only=True)
ws = wb.active
print(f'Active Sheet: {ws.title}, max_row={ws.max_row}, max_column={ws.max_column}')

current_group = None
group_students = {}

for r in range(1, ws.max_row + 1):
    c1 = ws.cell(r, 1).value
    c2 = ws.cell(r, 2).value
    
    if c1 and not c2 and any(grp in str(c1) for grp in ['ICSE', 'CBSE', 'SSC']):
        current_group = str(c1).strip()
        group_students[current_group] = []
        continue
    
    if c1 and c1 not in ['Student Name', 'ICSE X', 'CBSE X', 'ICSE 9th', 'ICSE IX', 'SSC IX', 'ICSE VIII']:
        if current_group:
            fee = c2
            payments = []
            for c in range(3, ws.max_column + 1):
                val = ws.cell(r, c).value
                if val is not None and str(val).strip():
                    payments.append((c, str(val).strip()))
            group_students[current_group].append({
                'row': r,
                'name': str(c1).strip(),
                'fee': fee,
                'payments': payments
            })

total_students = 0
for grp, students in group_students.items():
    print(f'\nGroup: {grp} ({len(students)} students)')
    total_students += len(students)
    for s in students:
        pmt_strs = [p[1] for p in s['payments']]
        print(f"  - {s['name']}: Fee={s['fee']} | Payments Count={len(s['payments'])}")

print(f'\nTotal Students in Workbook: {total_students}')

