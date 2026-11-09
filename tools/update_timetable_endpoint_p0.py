# /**
#  * @file        update_timetable_endpoint_p0.py
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
#  * @description Update timetable endpoint to auto-populate subject_mapping_id.
#  */

def update():
    with open('backend/app/api/v1/endpoints/timetable.py', 'r', encoding='utf-8') as f:
        txt = f.read()

    txt = txt.replace(
        'from app.models.subject import Subject',
        'from app.models.subject import Subject, SubjectMapping'
    )

    old_create = '''    entry = TimetableEntry(
        division_id=data.division_id,
        subject_id=data.subject_id,
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
        room_number=data.room_number,
    )'''

    new_create = '''    sm_id = (
        await db.execute(
            select(SubjectMapping.id).where(
                SubjectMapping.legacy_subject_id == data.subject_id
            )
        )
    ).scalar_one_or_none()

    entry = TimetableEntry(
        division_id=data.division_id,
        subject_id=data.subject_id,
        subject_mapping_id=sm_id,
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
        room_number=data.room_number,
    )'''

    txt = txt.replace(old_create, new_create)

    with open('backend/app/api/v1/endpoints/timetable.py', 'w', encoding='utf-8') as f:
        f.write(txt)
    print("Updated backend/app/api/v1/endpoints/timetable.py successfully")

if __name__ == '__main__':
    update()

