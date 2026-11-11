# /**
#  * @file        audit_subjects.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-11
#  * @updated     2026-11-11
#  *
#  * @description Source component for Audit Subjects in the scripts module.
#  */

"""Audit existing subjects table, rows, and foreign keys in database."""
import asyncio
import os
import sys

# Ensure backend is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app.db.session import async_session_maker
from sqlalchemy import text

async def audit():
    async with async_session_maker() as session:
        # Check columns
        cols = await session.execute(text("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'subjects' 
            ORDER BY ordinal_position;
        """))
        print("--- SUBJECTS COLUMNS ---")
        for c in cols.fetchall():
            print(dict(c._mapping))

        # Check rows
        subs = await session.execute(text("""
            SELECT * FROM subjects ORDER BY id;
        """))
        rows = subs.fetchall()
        print(f"\n--- SUBJECTS ROWS (Total: {len(rows)}) ---")
        for r in rows:
            print(dict(r._mapping))

        # Check FK references to subjects
        fks = await session.execute(text("""
            SELECT
                tc.table_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'subjects'
            ORDER BY tc.table_name;
        """))
        print("\n--- FOREIGN KEYS REFERENCING SUBJECTS ---")
        for fk in fks.fetchall():
            print(dict(fk._mapping))

        # Check other tables that have subject_id or subject columns even without explicit FK
        sub_cols = await session.execute(text("""
            SELECT table_name, column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public' 
              AND (column_name LIKE '%subject%' OR column_name = 'sub_id')
            ORDER BY table_name, column_name;
        """))
        print("\n--- COLUMNS WITH 'subject' IN ALL TABLES ---")
        for sc in sub_cols.fetchall():
            print(dict(sc._mapping))

if __name__ == "__main__":
    asyncio.run(audit())

