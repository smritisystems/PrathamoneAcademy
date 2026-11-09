# /**
#  * @file        forensic_db_audit.py
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
#  * @description Comprehensive forensic introspector for PostgreSQL database schema, tables, foreign keys, columns, and records.
#  */

import os
import asyncio
import json
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@db:5432/prashant_academy")

async def run_audit():
    print(f"Connecting to database: {DATABASE_URL}")
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        # 1. Get all tables and row counts
        tables_res = await conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """))
        tables = [r[0] for r in tables_res.fetchall()]

        table_stats = {}
        for tbl in tables:
            cnt_res = await conn.execute(text(f'SELECT count(*) FROM "{tbl}"'))
            cnt = cnt_res.scalar()
            table_stats[tbl] = {"row_count": cnt}

        # 2. Get all columns for each table
        cols_res = await conn.execute(text("""
            SELECT 
                table_name, column_name, ordinal_position, column_default, is_nullable, data_type, character_maximum_length
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            ORDER BY table_name, ordinal_position;
        """))
        for row in cols_res.fetchall():
            tbl, col, pos, default_val, is_null, dtype, char_len = row
            if tbl not in table_stats:
                continue
            if "columns" not in table_stats[tbl]:
                table_stats[tbl]["columns"] = []
            table_stats[tbl]["columns"].append({
                "name": col,
                "position": pos,
                "data_type": dtype,
                "char_length": char_len,
                "nullable": is_null == "YES",
                "default": default_val
            })

        # 3. Get all foreign keys
        fks_res = await conn.execute(text("""
            SELECT
                tc.table_name AS source_table,
                kcu.column_name AS source_column,
                ccu.table_name AS target_table,
                ccu.column_name AS target_column,
                rc.update_rule,
                rc.delete_rule,
                tc.constraint_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.referential_constraints AS rc
                ON tc.constraint_name = rc.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
            ORDER BY source_table, source_column;
        """))
        all_fks = []
        for row in fks_res.fetchall():
            src_tbl, src_col, tgt_tbl, tgt_col, upd_rule, del_rule, cname = row
            fk_info = {
                "source_table": src_tbl,
                "source_column": src_col,
                "target_table": tgt_tbl,
                "target_column": tgt_col,
                "update_rule": upd_rule,
                "delete_rule": del_rule,
                "constraint_name": cname
            }
            all_fks.append(fk_info)
            if src_tbl in table_stats:
                if "foreign_keys" not in table_stats[src_tbl]:
                    table_stats[src_tbl]["foreign_keys"] = []
                table_stats[src_tbl]["foreign_keys"].append(fk_info)

        # 4. Get all unique constraints and primary keys
        pk_res = await conn.execute(text("""
            SELECT
                tc.table_name,
                tc.constraint_type,
                tc.constraint_name,
                kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            WHERE tc.table_schema = 'public' AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
            ORDER BY tc.table_name, tc.constraint_type, kcu.ordinal_position;
        """))
        for row in pk_res.fetchall():
            tbl, ctype, cname, col = row
            if tbl in table_stats:
                if "constraints" not in table_stats[tbl]:
                    table_stats[tbl]["constraints"] = []
                table_stats[tbl]["constraints"].append({
                    "type": ctype,
                    "name": cname,
                    "column": col
                })

        # 5. Inspect subject-specific data
        canonical_subjects = (await conn.execute(text("SELECT id, name, code, category, is_active FROM canonical_subjects ORDER BY id"))).fetchall()
        subjects = (await conn.execute(text("SELECT id, standard_id, canonical_subject_id, name, code, max_marks, pass_marks, is_active FROM subjects ORDER BY id"))).fetchall()
        subject_mappings = (await conn.execute(text("SELECT id, canonical_subject_id, standard_id, board_id, academic_year_id, display_name, max_marks, is_active FROM subject_mappings ORDER BY id"))).fetchall()

        subject_audit = {
            "canonical_subjects": [dict(r._mapping) for r in canonical_subjects],
            "legacy_subjects": [dict(r._mapping) for r in subjects],
            "subject_mappings": [dict(r._mapping) for r in subject_mappings],
        }

        # 6. Check users vs staff vs students
        user_counts = (await conn.execute(text("SELECT role, count(*) FROM users GROUP BY role"))).fetchall()
        student_count = (await conn.execute(text("SELECT count(*) FROM students"))).scalar()
        staff_profile_count = (await conn.execute(text("SELECT count(*) FROM staff_profiles"))).scalar()
        guardian_count = (await conn.execute(text("SELECT count(*) FROM guardians"))).scalar()

        identity_audit = {
            "user_roles": {r[0]: r[1] for r in user_counts},
            "students_total": student_count,
            "staff_profiles_total": staff_profile_count,
            "guardians_total": guardian_count,
        }

        output = {
            "total_tables": len(tables),
            "tables": table_stats,
            "all_foreign_keys": all_fks,
            "subject_audit": subject_audit,
            "identity_audit": identity_audit
        }

        out_path = "/tmp/db_forensic_output.json"
        with open(out_path, "w", encoding="utf-8") as out:
            json.dump(output, out, indent=2, default=str)

        print(f"Forensic database introspection complete: {len(tables)} tables analyzed, {len(all_fks)} foreign keys mapped.")
        print(f"Canonical subjects: {len(canonical_subjects)}, Legacy subjects: {len(subjects)}, Subject mappings: {len(subject_mappings)}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_audit())
