# /**
#  * @file        inspect_subject_dependencies.py
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
#  * @description Inspect subjects and their dependencies across exam_marks, timetable, etc.
#  */

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    engine = create_async_engine('postgresql+asyncpg://postgres:postgres@db:5432/prashant_academy')
    async with engine.connect() as conn:
        res = await conn.execute(text('''
            SELECT s.id, s.name, s.standard_id, s.canonical_subject_id,
                   (SELECT count(*) FROM exam_marks WHERE subject_id = s.id) as exam_count,
                   (SELECT count(*) FROM timetable_entries WHERE subject_id = s.id) as tt_count,
                   (SELECT count(*) FROM teacher_assignments WHERE subject_id = s.id) as ta_count,
                   (SELECT count(*) FROM study_materials WHERE subject_id = s.id) as sm_count
            FROM subjects s
            ORDER BY s.id
        '''))
        rows = res.fetchall()
        print(f"Total subjects: {len(rows)}")
        used_count = 0
        for r in rows:
            if r.exam_count > 0 or r.tt_count > 0 or r.ta_count > 0 or r.sm_count > 0:
                used_count += 1
                print(f"  Subject ID {r.id:3}: {r.name:30} | Std: {str(r.standard_id):2} | Canon: {str(r.canonical_subject_id):4} | Exams: {r.exam_count:3} | TT: {r.tt_count:2} | TA: {r.ta_count:2} | SM: {r.sm_count:2}")
        print(f"Total subjects with active dependencies: {used_count}")

        # Also check canonical subjects
        res2 = await conn.execute(text('SELECT id, code, name FROM canonical_subjects ORDER BY id'))
        print("\nCanonical subjects:")
        for r in res2.fetchall():
            print(f"  Canonical ID {r.id:2}: {r.code:10} -> {r.name}")

        # Also check subject_mappings
        res3 = await conn.execute(text('SELECT id, canonical_subject_id, standard_id, legacy_subject_id FROM subject_mappings ORDER BY id'))
        print(f"\nSubject mappings count: {len(res3.fetchall())}")

if __name__ == '__main__':
    asyncio.run(main())

