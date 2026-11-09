# /**
#  * @file        analyze_audit_details.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      tools
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-09
#  * @updated     2026-11-09
#  *
#  * @description Forensic data cruncher producing deep-dive statistics on duplicate fields, table overlaps, and subject canonicalization.
#  */

import json
from collections import defaultdict

with open("tools/db_forensic_output.json", "r", encoding="utf-8") as f:
    db_data = json.load(f)

tables = db_data["tables"]
fks = db_data["all_foreign_keys"]

print("=== 1. FOREIGN KEY DEPENDENCY MAP ===")
inbound_fks = defaultdict(list)
outbound_fks = defaultdict(list)

for fk in fks:
    src = fk["source_table"]
    tgt = fk["target_table"]
    inbound_fks[tgt].append((src, fk["source_column"], fk["target_column"]))
    outbound_fks[src].append((tgt, fk["source_column"], fk["target_column"]))

print(f"Total FK relationships: {len(fks)}")

# Check subjects relationships
print("\n=== 2. SUBJECTS RELATIONSHIPS ===")
print("Inbound FKs to 'canonical_subjects':", inbound_fks.get("canonical_subjects", []))
print("Inbound FKs to 'subjects':", inbound_fks.get("subjects", []))
print("Inbound FKs to 'subject_mappings':", inbound_fks.get("subject_mappings", []))

# Check user/student/staff relationships
print("\n=== 3. IDENTITY RELATIONSHIPS ===")
print("Inbound FKs to 'users':", len(inbound_fks.get("users", [])), "tables point to users")
print("Tables pointing to 'users':", set([x[0] for x in inbound_fks.get("users", [])]))
print("Inbound FKs to 'students':", len(inbound_fks.get("students", [])), "tables point to students")
print("Tables pointing to 'students':", set([x[0] for x in inbound_fks.get("students", [])]))

# Check fee tables relationships
print("\n=== 4. FEE TABLES RELATIONSHIPS ===")
fee_tables = [t for t in tables.keys() if "fee" in t or "payment" in t or t in ("discounts", "scholarships", "refunds")]
for ft in sorted(fee_tables):
    rows = tables[ft]["row_count"]
    in_cnt = len(inbound_fks.get(ft, []))
    out_cnt = len(outbound_fks.get(ft, []))
    print(f"  {ft:<28} : {rows:>4} rows | Inbound FKs: {in_cnt:>2} | Outbound FKs: {out_cnt:>2}")

# Check duplicate column names across tables
print("\n=== 5. FIELD FREQUENCY ANALYSIS ===")
col_tables = defaultdict(list)
for tbl, info in tables.items():
    for col in info.get("columns", []):
        cname = col["name"]
        col_tables[cname].append(tbl)

# Filter columns present in multiple tables
repeated_cols = {k: v for k, v in col_tables.items() if len(v) > 3 and k not in ('id', 'created_at', 'updated_at', 'is_active', 'institution_id', 'academic_year_id')}
print("Top repeated business fields across tables:")
for cname, tbl_list in sorted(repeated_cols.items(), key=lambda x: len(x[1]), reverse=True)[:25]:
    print(f"  {cname:<25} : in {len(tbl_list):>2} tables ({', '.join(tbl_list[:4])}...)")
