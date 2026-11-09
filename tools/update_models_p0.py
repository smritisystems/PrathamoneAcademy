# /**
#  * @file        update_models_p0.py
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
#  * @description Update SQLAlchemy models to include subject_mapping_id on portal, staff, payroll, crm.
#  */

def update_portal():
    with open('backend/app/models/portal.py', 'r', encoding='utf-8') as f:
        txt = f.read()

    target1 = '    subject_id: Mapped[int] = mapped_column(\n        ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False\n    )'
    replacement1 = '    subject_id: Mapped[int] = mapped_column(\n        ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False\n    )\n    subject_mapping_id: Mapped[int | None] = mapped_column(\n        ForeignKey("subject_mappings.id", ondelete="SET NULL"), nullable=True, index=True\n    )'
    txt = txt.replace(target1, replacement1)

    target2 = '    subject: Mapped["Subject"] = relationship("Subject")'
    replacement2 = '    subject: Mapped["Subject"] = relationship("Subject")\n    subject_mapping: Mapped["SubjectMapping | None"] = relationship("SubjectMapping")'
    txt = txt.replace(target2, replacement2)

    with open('backend/app/models/portal.py', 'w', encoding='utf-8') as f:
        f.write(txt)
    print("Updated backend/app/models/portal.py")

def update_staff():
    with open('backend/app/models/staff.py', 'r', encoding='utf-8') as f:
        txt = f.read()

    target1 = '    subject_id: Mapped[int] = mapped_column(\n        ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False\n    )'
    replacement1 = '    subject_id: Mapped[int] = mapped_column(\n        ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False\n    )\n    subject_mapping_id: Mapped[int | None] = mapped_column(\n        ForeignKey("subject_mappings.id", ondelete="SET NULL"), nullable=True, index=True\n    )'
    txt = txt.replace(target1, replacement1)

    target2 = '    subject: Mapped["Subject"] = relationship("Subject")'
    replacement2 = '    subject: Mapped["Subject"] = relationship("Subject")\n    subject_mapping: Mapped["SubjectMapping | None"] = relationship("SubjectMapping")'
    txt = txt.replace(target2, replacement2)

    with open('backend/app/models/staff.py', 'w', encoding='utf-8') as f:
        f.write(txt)
    print("Updated backend/app/models/staff.py")

def update_payroll():
    with open('backend/app/models/teacher_payroll.py', 'r', encoding='utf-8') as f:
        txt = f.read()

    target1 = '    subject_id: Mapped[Optional[int]] = mapped_column(\n        ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True\n    )'
    replacement1 = '    subject_id: Mapped[Optional[int]] = mapped_column(\n        ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True\n    )\n    subject_mapping_id: Mapped[Optional[int]] = mapped_column(\n        ForeignKey("subject_mappings.id", ondelete="SET NULL"), nullable=True, index=True\n    )'
    txt = txt.replace(target1, replacement1)

    target2 = '    subject: Mapped[Optional["Subject"]] = relationship("Subject")'
    replacement2 = '    subject: Mapped[Optional["Subject"]] = relationship("Subject")\n    subject_mapping: Mapped[Optional["SubjectMapping"]] = relationship("SubjectMapping")'
    txt = txt.replace(target2, replacement2)

    with open('backend/app/models/teacher_payroll.py', 'w', encoding='utf-8') as f:
        f.write(txt)
    print("Updated backend/app/models/teacher_payroll.py")

def update_crm():
    with open('backend/app/models/crm.py', 'r', encoding='utf-8') as f:
        txt = f.read()

    target1 = '    subject_id: Mapped[Optional[int]] = mapped_column(\n        ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True\n    )'
    replacement1 = '    subject_id: Mapped[Optional[int]] = mapped_column(\n        ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True\n    )\n    subject_mapping_id: Mapped[Optional[int]] = mapped_column(\n        ForeignKey("subject_mappings.id", ondelete="SET NULL"), nullable=True, index=True\n    )'
    txt = txt.replace(target1, replacement1)

    target2 = '    subject: Mapped[Optional["Subject"]] = relationship("Subject")'
    replacement2 = '    subject: Mapped[Optional["Subject"]] = relationship("Subject")\n    subject_mapping: Mapped[Optional["SubjectMapping"]] = relationship("SubjectMapping")'
    txt = txt.replace(target2, replacement2)

    with open('backend/app/models/crm.py', 'w', encoding='utf-8') as f:
        f.write(txt)
    print("Updated backend/app/models/crm.py")

if __name__ == '__main__':
    update_portal()
    update_staff()
    update_payroll()
    update_crm()

