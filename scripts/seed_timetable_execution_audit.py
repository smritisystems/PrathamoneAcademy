# /**
#  * @file        seed_timetable_execution_audit.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-22
#  * @updated     2026-11-22
#  *
#  * @description Source component for Seed Timetable Execution Audit in the scripts module.
#  */

import asyncio
from datetime import date, timedelta
from decimal import Decimal
from app.core.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.teacher_payroll import TeachingSession

async def seed_sessions():
    async with AsyncSessionLocal() as db:
        today = date.today()
        samples = [
            {
                'session_code': f'AUD-SES-{today.strftime("%Y%m")}-101',
                'teacher_user_id': 121, # Rahul Desai
                'substitute_teacher_id': None,
                'division_id': 7, # ICSE-IX
                'subject_id': 1, # Mathematics
                'session_date': today,
                'scheduled_start_time': '08:30',
                'scheduled_end_time': '09:15',
                'actual_start_time': '08:32',
                'actual_end_time': '09:15',
                'calculated_duration_hours': 0.75,
                'session_status': 'completed',
                'approval_status': 'approved',
                'topic_taught': 'Quadratic Equations — Ex 4.3 Factorization & Roots',
                'students_present_count': 26,
            },
            {
                'session_code': f'AUD-SES-{today.strftime("%Y%m")}-102',
                'teacher_user_id': 121, # Rahul Desai
                'substitute_teacher_id': 122, # Priya Mehta (Substitute)
                'division_id': 7, # ICSE-IX
                'subject_id': 1, # Mathematics
                'session_date': today - timedelta(days=1),
                'scheduled_start_time': '09:15',
                'scheduled_end_time': '10:15',
                'actual_start_time': '09:15',
                'actual_end_time': '10:15',
                'calculated_duration_hours': 1.0,
                'session_status': 'substitute_assigned',
                'approval_status': 'approved',
                'topic_taught': 'Linear Inequations — Graphical Solution Revision (Proxy)',
                'students_present_count': 24,
            },
            {
                'session_code': f'AUD-SES-{today.strftime("%Y%m")}-103',
                'teacher_user_id': 122, # Priya Mehta
                'substitute_teacher_id': None,
                'division_id': 26, # CBSE X
                'subject_id': 14, # Science
                'session_date': today - timedelta(days=2),
                'scheduled_start_time': '10:15',
                'scheduled_end_time': '11:15',
                'actual_start_time': None,
                'actual_end_time': None,
                'calculated_duration_hours': 0.0,
                'session_status': 'cancelled',
                'approval_status': 'draft',
                'topic_taught': 'Cancelled — Inter-school debate competition contingency',
                'students_present_count': 0,
            },
            {
                'session_code': f'AUD-SES-{today.strftime("%Y%m")}-104',
                'teacher_user_id': 123, # Amit Patil
                'substitute_teacher_id': None,
                'division_id': 25, # ICSE X
                'subject_id': 2, # Physics
                'session_date': today - timedelta(days=3),
                'scheduled_start_time': '11:15',
                'scheduled_end_time': '12:30',
                'actual_start_time': '11:20',
                'actual_end_time': '12:30',
                'calculated_duration_hours': 1.25,
                'session_status': 'completed',
                'approval_status': 'submitted',
                'topic_taught': 'Electromagnetism — Right Hand Thumb Rule & Solenoids',
                'students_present_count': 28,
            },
            {
                'session_code': f'AUD-SES-{today.strftime("%Y%m")}-105',
                'teacher_user_id': 124, # Neha Kulkarni
                'substitute_teacher_id': None,
                'division_id': 7, # ICSE-IX
                'subject_id': 1, # Mathematics
                'session_date': today - timedelta(days=4),
                'scheduled_start_time': '16:00',
                'scheduled_end_time': '17:30',
                'actual_start_time': '16:00',
                'actual_end_time': '17:30',
                'calculated_duration_hours': 1.5,
                'session_status': 'completed',
                'approval_status': 'submitted',
                'topic_taught': 'Coordinate Geometry — Section Formula Applications',
                'students_present_count': 27,
            }
        ]

        for s in samples:
            exists = (await db.execute(select(TeachingSession).where(TeachingSession.session_code == s['session_code']))).scalars().first()
            if not exists:
                sess = TeachingSession(
                    session_code=s['session_code'],
                    institution_id=1,
                    academic_year_id=1,
                    teacher_user_id=s['teacher_user_id'],
                    substitute_teacher_id=s['substitute_teacher_id'],
                    division_id=s['division_id'],
                    subject_id=s['subject_id'],
                    session_date=s['session_date'],
                    scheduled_start_time=s['scheduled_start_time'],
                    scheduled_end_time=s['scheduled_end_time'],
                    actual_start_time=s['actual_start_time'],
                    actual_end_time=s['actual_end_time'],
                    calculated_duration_hours=s['calculated_duration_hours'],
                    payment_method='hourly',
                    applicable_rate=Decimal('500.00'),
                    calculated_amount=Decimal(str(s['calculated_duration_hours'] * 500)),
                    session_status=s['session_status'],
                    approval_status=s['approval_status'],
                    topic_taught=s['topic_taught'],
                    students_present_count=s['students_present_count'],
                    is_payable=True,
                )
                db.add(sess)
        await db.commit()
        print('Sample audit sessions seeded successfully!')

if __name__ == '__main__':
    asyncio.run(seed_sessions())
