# /**
#  * @file        update_leads_endpoint_p0.py
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
#  * @description Update leads endpoint to auto-populate subject_mapping_id on LeadDemoClass.
#  */

def update():
    with open('backend/app/api/v1/endpoints/leads.py', 'r', encoding='utf-8') as f:
        txt = f.read()

    txt = txt.replace(
        'from app.models.subject import Subject',
        'from app.models.subject import Subject, SubjectMapping'
    )

    old_demo = '''    demo = LeadDemoClass(
        lead_id=lead.id,
        institution_id=effective_inst_id,
        standard_id=data.standard_id or lead.standard_id,
        subject_id=data.subject_id,'''

    new_demo = '''    sm_id = None
    if data.subject_id:
        sm_id = (
            await db.execute(
                select(SubjectMapping.id).where(
                    SubjectMapping.legacy_subject_id == data.subject_id
                )
            )
        ).scalar_one_or_none()

    demo = LeadDemoClass(
        lead_id=lead.id,
        institution_id=effective_inst_id,
        standard_id=data.standard_id or lead.standard_id,
        subject_id=data.subject_id,
        subject_mapping_id=sm_id,'''

    txt = txt.replace(old_demo, new_demo)

    with open('backend/app/api/v1/endpoints/leads.py', 'w', encoding='utf-8') as f:
        f.write(txt)
    print("Updated backend/app/api/v1/endpoints/leads.py successfully")

if __name__ == '__main__':
    update()
