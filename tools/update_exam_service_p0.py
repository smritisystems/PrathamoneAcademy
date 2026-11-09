# /**
#  * @file        update_exam_service_p0.py
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
#  * @description Update exam_reports service to auto-populate subject_mapping_id on mark saving.
#  */

def update_service():
    with open('backend/app/services/exam_reports.py', 'r', encoding='utf-8') as f:
        txt = f.read()

    txt = txt.replace(
        'from app.models.subject import Subject',
        'from app.models.subject import Subject, SubjectMapping'
    )

    old_lookup = '''    # Fetch subjects max marks lookup
    subj_res = await db.execute(
        select(Subject.id, Subject.max_marks).where(Subject.standard_id == exam.standard_id)
    )
    subj_max_map = {row[0]: row[1] or exam.max_marks for row in subj_res.all()}'''

    new_lookup = '''    # Fetch subjects max marks and canonical subject_mapping_id lookup
    subj_res = await db.execute(
        select(Subject.id, Subject.max_marks, SubjectMapping.id)
        .outerjoin(SubjectMapping, SubjectMapping.legacy_subject_id == Subject.id)
        .where(Subject.standard_id == exam.standard_id)
    )
    subj_rows = subj_res.all()
    subj_max_map = {row[0]: row[1] or exam.max_marks for row in subj_rows}
    subj_map_map = {row[0]: row[2] for row in subj_rows}'''

    txt = txt.replace(old_lookup, new_lookup)

    old_save = '''        existing = await db.scalar(
            select(ExamMark).where(
                and_(
                    ExamMark.examination_id == exam_id,
                    ExamMark.student_id == student_id,
                    ExamMark.subject_id == subject_id,
                )
            )
        )
        if existing:
            existing.marks_obtained = marks_obtained
            existing.grade = grade
            existing.is_absent = is_absent
            existing.remarks = remarks
        else:
            new_mark = ExamMark(
                examination_id=exam_id,
                student_id=student_id,
                subject_id=subject_id,
                marks_obtained=marks_obtained,
                grade=grade,
                is_absent=is_absent,
                remarks=remarks,
            )
            db.add(new_mark)'''

    new_save = '''        mapping_id = subj_map_map.get(subject_id)
        existing = await db.scalar(
            select(ExamMark).where(
                and_(
                    ExamMark.examination_id == exam_id,
                    ExamMark.student_id == student_id,
                    ExamMark.subject_id == subject_id,
                )
            )
        )
        if existing:
            existing.marks_obtained = marks_obtained
            existing.grade = grade
            existing.is_absent = is_absent
            existing.remarks = remarks
            if mapping_id and not existing.subject_mapping_id:
                existing.subject_mapping_id = mapping_id
        else:
            new_mark = ExamMark(
                examination_id=exam_id,
                student_id=student_id,
                subject_id=subject_id,
                subject_mapping_id=mapping_id,
                marks_obtained=marks_obtained,
                grade=grade,
                is_absent=is_absent,
                remarks=remarks,
            )
            db.add(new_mark)'''

    txt = txt.replace(old_save, new_save)

    with open('backend/app/services/exam_reports.py', 'w', encoding='utf-8') as f:
        f.write(txt)
    print("Updated backend/app/services/exam_reports.py successfully")

if __name__ == '__main__':
    update_service()

