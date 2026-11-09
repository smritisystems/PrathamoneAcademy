# /**
#  * @file        update_payroll_service_p0.py
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
#  * @description Update teacher_payroll_service to auto-populate subject_mapping_id on TeachingSession.
#  */

def update():
    with open('backend/app/services/teacher_payroll_service.py', 'r', encoding='utf-8') as f:
        txt = f.read()

    txt = txt.replace(
        'from app.models.subject import Subject',
        'from app.models.subject import Subject, SubjectMapping'
    )

    old_block = '''    session_code = await generate_next_session_code(db, sess_date)

    session = TeachingSession(
        session_code=session_code,
        institution_id=inst_id,
        academic_year_id=ay_id,
        teacher_user_id=teacher_id,
        substitute_teacher_id=sub_teacher_id,
        subject_id=int(data["subject_id"]),'''

    new_block = '''    session_code = await generate_next_session_code(db, sess_date)

    sm_id = (
        await db.execute(
            select(SubjectMapping.id).where(
                SubjectMapping.legacy_subject_id == int(data["subject_id"])
            )
        )
    ).scalar_one_or_none()

    session = TeachingSession(
        session_code=session_code,
        institution_id=inst_id,
        academic_year_id=ay_id,
        teacher_user_id=teacher_id,
        substitute_teacher_id=sub_teacher_id,
        subject_id=int(data["subject_id"]),
        subject_mapping_id=sm_id,'''

    txt = txt.replace(old_block, new_block)

    with open('backend/app/services/teacher_payroll_service.py', 'w', encoding='utf-8') as f:
        f.write(txt)
    print("Updated backend/app/services/teacher_payroll_service.py successfully")

if __name__ == '__main__':
    update()
