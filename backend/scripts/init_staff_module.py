# /**
#  * @file        init_staff_module.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-04
#  * @updated     2026-11-11
#  *
#  * @description Database migration and seeder initializing Teacher & Staff Management tables, profiles, assignments, attendance, leaves, and documents.
#  */

import os
import sys
import asyncio
from datetime import date, datetime, timedelta
from decimal import Decimal

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.core.database import AsyncSessionLocal, Base, engine
from app.core.security import get_password_hash
import app.models  # Ensures all models are registered with Base.metadata


async def initialize_staff_module():
    print("=" * 80)
    print("INITIALIZING TEACHER & STAFF MANAGEMENT MODULE")
    print("=" * 80)

    # 1. Create tables if they do not exist
    async with engine.begin() as conn:
        print("[Step 1/6] Creating database tables for Teacher & Staff Management...")
        await conn.run_sync(Base.metadata.create_all)

        # Ensure timetable_entries has teacher_id column
        await conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'timetable_entries' AND column_name = 'teacher_id'
                ) THEN
                    ALTER TABLE timetable_entries 
                    ADD COLUMN teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
                END IF;
            END $$;
        """))
        print("  -> Schema synchronized (staff_profiles, teacher_assignments, staff_attendances, staff_leaves, staff_documents, etc.)")

    async with AsyncSessionLocal() as session:
        # 2. Ensure counselor and receptionist user accounts exist
        print("\n[Step 2/6] Ensuring staff user accounts exist...")
        additional_users = [
            {
                "username": "sunita.rao",
                "email": "sunita.rao@prashantacademy.in",
                "first_name": "Sunita",
                "last_name": "Rao",
                "phone": "+91-9820112233",
                "role": "counselor",
                "staff_code": "CNS-001",
                "designation": "Academic Counselor & Admissions Officer",
            },
            {
                "username": "pooja.nair",
                "email": "pooja.nair@prashantacademy.in",
                "first_name": "Pooja",
                "last_name": "Nair",
                "phone": "+91-9820445566",
                "role": "receptionist",
                "staff_code": "RCP-001",
                "designation": "Front Desk & Reception Coordinator",
            },
        ]

        staff_role_id = (await session.execute(text("SELECT id FROM roles WHERE name = 'staff';"))).scalar() or 12

        for u in additional_users:
            existing = (await session.execute(text("SELECT id FROM users WHERE username = :u;"), {"u": u["username"]})).scalar()
            if not existing:
                h_pass = get_password_hash("staff123")
                await session.execute(text("""
                    INSERT INTO users (institution_id, username, email, hashed_password, first_name, last_name, phone, role, role_id, staff_code, designation, is_active, created_at, updated_at)
                    VALUES (1, :username, :email, :hashed_password, :first_name, :last_name, :phone, 'staff', :role_id, :staff_code, :designation, true, NOW(), NOW());
                """), {**u, "role_id": staff_role_id, "hashed_password": h_pass})
                print(f"  -> Created staff user: {u['username']} ({u['designation']})")

        await session.commit()

        # 3. Fetch all staff users
        staff_users = (await session.execute(text("""
            SELECT id, username, first_name, last_name, email, phone, role, staff_code, designation
            FROM users
            WHERE role IN ('admin', 'accountant', 'teacher', 'counselor', 'receptionist', 'staff')
            ORDER BY id;
        """))).fetchall()

        print(f"\n[Step 3/6] Populating comprehensive Staff Profiles for {len(staff_users)} staff members...")

        staff_data_map = {
            "admin": {
                "staff_type": "admin",
                "dept": "Administration",
                "emp_id": "ADM-001",
                "qual": "M.B.A. (Educational Leadership), B.Tech (Computer Science)",
                "spec": "Academic Operations, Institutional Strategy & DPDP Governance",
                "exp": 12.0,
                "join": date(2021, 6, 1),
                "salary": Decimal("110000.00"),
                "dob": date(1986, 4, 15),
                "gender": "male",
                "blood": "O+",
                "emg_name": "Neha User",
                "emg_phone": "+91-9820998877",
                "emg_rel": "Spouse",
                "pan": "ABCDE1234F",
                "bank": "HDFC Bank Ltd",
                "acc": "50100234567890",
                "ifsc": "HDFC0000123",
            },
            "accountant": {
                "staff_type": "accountant",
                "dept": "Finance & Accounts",
                "emp_id": "ACC-001",
                "qual": "M.Com (Accountancy & Auditing), CA Inter",
                "spec": "Institutional Accounting, GST Compliance & Fee Analytics",
                "exp": 10.0,
                "join": date(2022, 5, 15),
                "salary": Decimal("68000.00"),
                "dob": date(1989, 8, 22),
                "gender": "male",
                "blood": "B+",
                "emg_name": "Sunita Sharma",
                "emg_phone": "+91-9820554433",
                "emg_rel": "Spouse",
                "pan": "FGHIJ5678K",
                "bank": "ICICI Bank Ltd",
                "acc": "123405009876",
                "ifsc": "ICIC0000456",
            },
            "rahul.desai": {
                "staff_type": "teacher",
                "dept": "Mathematics",
                "emp_id": "TCH-001",
                "qual": "M.Sc. (Pure Mathematics), B.Ed. (Distinction)",
                "spec": "Senior Secondary Mathematics, Calculus, Vectors & Competitive Foundations",
                "exp": 9.5,
                "join": date(2022, 6, 1),
                "salary": Decimal("75000.00"),
                "dob": date(1990, 11, 10),
                "gender": "male",
                "blood": "A+",
                "emg_name": "Mrs. Anjali Desai",
                "emg_phone": "+91-9820556677",
                "emg_rel": "Spouse",
                "pan": "KLMNO9012P",
                "bank": "State Bank of India",
                "acc": "30456789012",
                "ifsc": "SBIN0000300",
            },
            "priya.mehta": {
                "staff_type": "teacher",
                "dept": "Science",
                "emp_id": "TCH-002",
                "qual": "M.Sc. (Physics), B.Ed., NET Qualified",
                "spec": "Optics, Modern Physics, Mechanics & Laboratory Practicals",
                "exp": 8.0,
                "join": date(2023, 4, 1),
                "salary": Decimal("72000.00"),
                "dob": date(1992, 3, 18),
                "gender": "female",
                "blood": "B+",
                "emg_name": "Dr. Sameer Mehta",
                "emg_phone": "+91-9820667788",
                "emg_rel": "Father",
                "pan": "PQRST3456U",
                "bank": "Kotak Mahindra Bank",
                "acc": "98765432101",
                "ifsc": "KKBK0000678",
            },
            "amit.patil": {
                "staff_type": "teacher",
                "dept": "Social Studies",
                "emp_id": "TCH-003",
                "qual": "M.A. (History & Civics), B.Ed.",
                "spec": "Contemporary World History, Indian Constitution & Physical Geography",
                "exp": 7.5,
                "join": date(2023, 6, 1),
                "salary": Decimal("68000.00"),
                "dob": date(1993, 7, 25),
                "gender": "male",
                "blood": "AB+",
                "emg_name": "Kavita Patil",
                "emg_phone": "+91-9820778899",
                "emg_rel": "Spouse",
                "pan": "UVWXY7890Z",
                "bank": "Bank of Baroda",
                "acc": "012301004567",
                "ifsc": "BARB0DADARX",
            },
            "neha.kulkarni": {
                "staff_type": "teacher",
                "dept": "Languages & Test Series",
                "emp_id": "TCH-004",
                "qual": "M.A. (English Literature), B.Ed., Diploma in Linguistics",
                "spec": "English Literature, Creative Writing, Grammatical Mechanics & Examination Assessment",
                "exp": 6.5,
                "join": date(2023, 11, 15),
                "salary": Decimal("65000.00"),
                "dob": date(1994, 9, 14),
                "gender": "female",
                "blood": "O+",
                "emg_name": "Anand Kulkarni",
                "emg_phone": "+91-9820889900",
                "emg_rel": "Brother",
                "pan": "ABCDE4321F",
                "bank": "Axis Bank Ltd",
                "acc": "918010045678901",
                "ifsc": "UTIB0000234",
            },
            "sunita.rao": {
                "staff_type": "counselor",
                "dept": "Student Affairs",
                "emp_id": "CNS-001",
                "qual": "M.A. (Clinical & Counseling Psychology)",
                "spec": "Adolescent Guidance, Academic Career Counseling & Behavioral Intervention",
                "exp": 5.0,
                "join": date(2024, 2, 1),
                "salary": Decimal("55000.00"),
                "dob": date(1995, 12, 5),
                "gender": "female",
                "blood": "A-",
                "emg_name": "Ramesh Rao",
                "emg_phone": "+91-9820332211",
                "emg_rel": "Father",
                "pan": "FGHIJ8765K",
                "bank": "HDFC Bank Ltd",
                "acc": "50100987654321",
                "ifsc": "HDFC0000123",
            },
            "pooja.nair": {
                "staff_type": "receptionist",
                "dept": "Administration",
                "emp_id": "RCP-001",
                "qual": "B.Com, Diploma in Front Office Management",
                "spec": "Parent Communications, Visitor Management & Front Office Coordination",
                "exp": 3.5,
                "join": date(2024, 4, 15),
                "salary": Decimal("38000.00"),
                "dob": date(1997, 6, 30),
                "gender": "female",
                "blood": "B+",
                "emg_name": "Vandana Nair",
                "emg_phone": "+91-9820223344",
                "emg_rel": "Mother",
                "pan": "KLMNO5432P",
                "bank": "ICICI Bank Ltd",
                "acc": "123405001122",
                "ifsc": "ICIC0000456",
            },
        }

        for u in staff_users:
            u_id, username = u[0], u[1]
            cfg = staff_data_map.get(username, {
                "staff_type": "other",
                "dept": "General Staff",
                "emp_id": f"STF-{u_id:03d}",
                "qual": "Graduate",
                "spec": "General Operations",
                "exp": 3.0,
                "join": date(2024, 1, 1),
                "salary": Decimal("35000.00"),
                "dob": date(1995, 1, 1),
                "gender": "other",
                "blood": "B+",
                "emg_name": "Emergency Contact",
                "emg_phone": "+91-9820000000",
                "emg_rel": "Family",
                "pan": "PANXX0000X",
                "bank": "State Bank of India",
                "acc": "30112233445",
                "ifsc": "SBIN0000300",
            })

            # Check if StaffProfile exists
            p_id = (await session.execute(text("SELECT id FROM staff_profiles WHERE user_id = :u_id;"), {"u_id": u_id})).scalar()
            if not p_id:
                p_insert = await session.execute(text("""
                    INSERT INTO staff_profiles (
                        user_id, institution_id, employee_id, staff_type, department,
                        date_of_birth, gender, blood_group,
                        emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
                        current_address, permanent_address, city, state, pincode,
                        qualification, specialization, experience_years, joining_date, employment_type,
                        basic_salary, pan_number, aadhar_number, bank_name, bank_account_number, bank_ifsc,
                        status, notes, created_at, updated_at
                    ) VALUES (
                        :user_id, 1, :employee_id, :staff_type, :department,
                        :dob, :gender, :blood,
                        :emg_name, :emg_phone, :emg_rel,
                        '123, Sea Breeze Enclave, Shivaji Park, Dadar West',
                        '123, Sea Breeze Enclave, Shivaji Park, Dadar West',
                        'Mumbai', 'Maharashtra', '400028',
                        :qual, :spec, :exp, :join, 'full_time',
                        :salary, :pan, 'XXXX-XXXX-8921', :bank, :acc, :ifsc,
                        'active', 'Verified permanent academy staff member.', NOW(), NOW()
                    ) RETURNING id;
                """), {
                    "user_id": u_id,
                    "employee_id": cfg["emp_id"],
                    "staff_type": cfg["staff_type"],
                    "department": cfg["dept"],
                    "dob": cfg["dob"],
                    "gender": cfg["gender"],
                    "blood": cfg["blood"],
                    "emg_name": cfg["emg_name"],
                    "emg_phone": cfg["emg_phone"],
                    "emg_rel": cfg["emg_rel"],
                    "qual": cfg["qual"],
                    "spec": cfg["spec"],
                    "exp": cfg["exp"],
                    "join": cfg["join"],
                    "salary": cfg["salary"],
                    "pan": cfg["pan"],
                    "bank": cfg["bank"],
                    "acc": cfg["acc"],
                    "ifsc": cfg["ifsc"],
                })
                p_id = p_insert.scalar()
                print(f"  -> Created StaffProfile #{p_id} for {u[2]} {u[3]} ({cfg['emp_id']})")

            # Seed documents for profile
            doc_count = (await session.execute(text("SELECT count(*) FROM staff_documents WHERE staff_profile_id = :p_id;"), {"p_id": p_id})).scalar()
            if doc_count == 0:
                standard_docs = [
                    ("Degree Certificate", f"{cfg['qual'].split(',')[0]} Degree Certificate", "https://example.com/docs/sample_degree.pdf"),
                    ("Employment Agreement", f"Prashant Academy Employment Contract ({cfg['emp_id']})", "https://example.com/docs/sample_contract.pdf"),
                    ("PAN Card Copy", f"Income Tax Permanent Account Number ({cfg['pan']})", "https://example.com/docs/sample_pan.pdf"),
                    ("Identity Proof", "Government Issued Photo ID Card (Masked Aadhaar)", "https://example.com/docs/sample_id.pdf"),
                    ("Cancelled Cheque", f"{cfg['bank']} Bank Account Verification Cheque", "https://example.com/docs/sample_cheque.pdf"),
                ]
                for d_type, d_title, d_url in standard_docs:
                    await session.execute(text("""
                        INSERT INTO staff_documents (staff_profile_id, document_type, title, file_url, file_type, file_size_bytes, verification_status, uploaded_at)
                        VALUES (:p_id, :d_type, :d_title, :d_url, 'PDF', 245000, 'verified', NOW());
                    """), {"p_id": p_id, "d_type": d_type, "d_title": d_title, "d_url": d_url})

            # Seed leave balance
            lb_exists = (await session.execute(text("SELECT id FROM staff_leave_balances WHERE user_id = :u_id AND academic_year_id = 1;"), {"u_id": u_id})).scalar()
            if not lb_exists:
                await session.execute(text("""
                    INSERT INTO staff_leave_balances (user_id, academic_year_id, casual_leave_total, casual_leave_used, sick_leave_total, sick_leave_used, earned_leave_total, earned_leave_used)
                    VALUES (:u_id, 1, 12.0, 2.0, 10.0, 1.0, 15.0, 0.0);
                """), {"u_id": u_id})

        await session.commit()

        # 4. Teacher Academic Assignments
        print("\n[Step 4/6] Creating Teacher Academic Assignments across 5 coaching batches...")
        teacher_map = {
            "math": (await session.execute(text("SELECT id FROM users WHERE username = 'rahul.desai';"))).scalar(),
            "sci": (await session.execute(text("SELECT id FROM users WHERE username = 'priya.mehta';"))).scalar(),
            "sst": (await session.execute(text("SELECT id FROM users WHERE username = 'amit.patil';"))).scalar(),
            "eng": (await session.execute(text("SELECT id FROM users WHERE username = 'neha.kulkarni';"))).scalar(),
        }

        # Clear active assignments to recreate clean idempotent matrix
        await session.execute(text("DELETE FROM teacher_assignments;"))

        # Divisions: 25 (ICSE X), 26 (CBSE X), 28 (SSC IX), 29 (ICSE VIII), 7 (ICSE IV)
        assignments_plan = [
            # Rahul Desai (Maths)
            {"t_id": teacher_map["math"], "std": 10, "div": 25, "board": 1, "sub_name": "Mathematics", "hrs": 6.0, "is_class": True},
            {"t_id": teacher_map["math"], "std": 10, "div": 26, "board": 2, "sub_name": "Mathematics", "hrs": 6.0, "is_class": False},
            {"t_id": teacher_map["math"], "std": 9,  "div": 28, "board": 3, "sub_name": "Mathematics", "hrs": 5.0, "is_class": False},
            {"t_id": teacher_map["math"], "std": 8,  "div": 29, "board": 1, "sub_name": "Mathematics", "hrs": 5.0, "is_class": False},
            {"t_id": teacher_map["math"], "std": 4,  "div": 7,  "board": 1, "sub_name": "Mathematics", "hrs": 4.0, "is_class": False},

            # Priya Mehta (Science)
            {"t_id": teacher_map["sci"], "std": 10, "div": 25, "board": 1, "sub_name": "Physics", "hrs": 4.0, "is_class": False},
            {"t_id": teacher_map["sci"], "std": 10, "div": 25, "board": 1, "sub_name": "Chemistry", "hrs": 4.0, "is_class": False},
            {"t_id": teacher_map["sci"], "std": 10, "div": 25, "board": 1, "sub_name": "Biology", "hrs": 3.0, "is_class": False},
            {"t_id": teacher_map["sci"], "std": 10, "div": 26, "board": 2, "sub_name": "Physics", "hrs": 4.0, "is_class": True},
            {"t_id": teacher_map["sci"], "std": 9,  "div": 28, "board": 3, "sub_name": "Physics", "hrs": 4.0, "is_class": False},
            {"t_id": teacher_map["sci"], "std": 9,  "div": 28, "board": 3, "sub_name": "Chemistry", "hrs": 4.0, "is_class": False},
            {"t_id": teacher_map["sci"], "std": 8,  "div": 29, "board": 1, "sub_name": "Science", "hrs": 5.0, "is_class": False},
            {"t_id": teacher_map["sci"], "std": 4,  "div": 7,  "board": 1, "sub_name": "Science", "hrs": 4.0, "is_class": False},

            # Amit Patil (Social Studies)
            {"t_id": teacher_map["sst"], "std": 10, "div": 25, "board": 1, "sub_name": "Social Science", "hrs": 4.0, "is_class": False},
            {"t_id": teacher_map["sst"], "std": 10, "div": 26, "board": 2, "sub_name": "Social Science", "hrs": 4.0, "is_class": False},
            {"t_id": teacher_map["sst"], "std": 9,  "div": 28, "board": 3, "sub_name": "Social Science", "hrs": 4.0, "is_class": True},
            {"t_id": teacher_map["sst"], "std": 8,  "div": 29, "board": 1, "sub_name": "Social Studies", "hrs": 4.0, "is_class": False},
            {"t_id": teacher_map["sst"], "std": 4,  "div": 7,  "board": 1, "sub_name": "Social Studies", "hrs": 3.0, "is_class": False},

            # Neha Kulkarni (English & Tests)
            {"t_id": teacher_map["eng"], "std": 10, "div": 25, "board": 1, "sub_name": "English Language & Lit", "hrs": 4.0, "is_class": False},
            {"t_id": teacher_map["eng"], "std": 10, "div": 26, "board": 2, "sub_name": "English Language & Lit", "hrs": 4.0, "is_class": False},
            {"t_id": teacher_map["eng"], "std": 9,  "div": 28, "board": 3, "sub_name": "English Language", "hrs": 4.0, "is_class": False},
            {"t_id": teacher_map["eng"], "std": 8,  "div": 29, "board": 1, "sub_name": "English", "hrs": 4.0, "is_class": True},
            {"t_id": teacher_map["eng"], "std": 4,  "div": 7,  "board": 1, "sub_name": "English", "hrs": 4.0, "is_class": True},
        ]

        inserted_assignments = 0
        for p in assignments_plan:
            # Resolve subject_id for standard
            sub_id = (await session.execute(text("SELECT id FROM subjects WHERE standard_id = :std AND name = :nm LIMIT 1;"), {"std": p["std"], "nm": p["sub_name"]})).scalar()
            if sub_id and p["t_id"]:
                await session.execute(text("""
                    INSERT INTO teacher_assignments (
                        teacher_user_id, academic_year_id, board_id, standard_id, division_id, subject_id,
                        weekly_hours, is_class_teacher, is_active, notes, created_at
                    ) VALUES (
                        :t_id, 1, :board, :std, :div, :sub_id, :hrs, :is_class, true,
                        'Authoritative 2026-27 faculty course assignment.', NOW()
                    ) ON CONFLICT DO NOTHING;
                """), {
                    "t_id": p["t_id"],
                    "board": p["board"],
                    "std": p["std"],
                    "div": p["div"],
                    "sub_id": sub_id,
                    "hrs": p["hrs"],
                    "is_class": p["is_class"],
                })
                inserted_assignments += 1

                # Update timetable_entries with assigned teacher
                await session.execute(text("""
                    UPDATE timetable_entries 
                    SET teacher_id = :t_id 
                    WHERE division_id = :div AND subject_id = :sub_id;
                """), {"t_id": p["t_id"], "div": p["div"], "sub_id": sub_id})

        print(f"  -> Generated {inserted_assignments} active academic assignments across all 5 coaching batches.")

        # 5. Staff Attendance for recent 20 dates
        print("\n[Step 5/6] Seeding staff attendance records up to today (2026-11-04)...")
        recent_dates = [
            date(2026, 10, 12), date(2026, 10, 13), date(2026, 10, 14), date(2026, 10, 15), date(2026, 10, 16),
            date(2026, 10, 19), date(2026, 10, 20), date(2026, 10, 21), date(2026, 10, 22), date(2026, 10, 23),
            date(2026, 10, 26), date(2026, 10, 27), date(2026, 10, 28), date(2026, 10, 29), date(2026, 10, 30),
            date(2026, 11, 2),  date(2026, 11, 3),  date(2026, 11, 4), # Today
        ]

        att_records = 0
        for d in recent_dates:
            for u in staff_users:
                u_id = u[0]
                metric = (u_id * 19 + d.day * 11) % 100
                if metric < 88:
                    status = "present"
                    cin = "08:45 AM"
                    cout = "04:30 PM"
                    hrs = 7.75
                    rem = "Regular day"
                elif metric < 94:
                    status = "late"
                    cin = "09:15 AM"
                    cout = "04:30 PM"
                    hrs = 7.25
                    rem = "Late due to heavy traffic on Western Express Highway"
                elif metric < 98:
                    status = "half_day"
                    cin = "08:45 AM"
                    cout = "01:00 PM"
                    hrs = 4.25
                    rem = "Half-day morning session completed"
                else:
                    status = "on_leave"
                    cin = None
                    cout = None
                    hrs = 0.0
                    rem = "Approved casual leave"

                await session.execute(text("""
                    INSERT INTO staff_attendances (user_id, date, status, check_in_time, check_out_time, hours_worked, remarks, marked_by_id, created_at)
                    VALUES (:u_id, :d, :status, :cin, :cout, :hrs, :rem, 1, NOW())
                    ON CONFLICT (user_id, date) DO UPDATE 
                    SET status = EXCLUDED.status, check_in_time = EXCLUDED.check_in_time, check_out_time = EXCLUDED.check_out_time;
                """), {"u_id": u_id, "d": d, "status": status, "cin": cin, "cout": cout, "hrs": hrs, "rem": rem})
                att_records += 1

        print(f"  -> Generated {att_records} staff attendance entries across {len(recent_dates)} working dates.")

        # 6. Sample Staff Leaves & Generated Documents
        print("\n[Step 6/6] Seeding leave applications and official document snapshots...")
        # Clear existing sample leaves to avoid duplicates
        await session.execute(text("DELETE FROM staff_leaves;"))

        priya_id = teacher_map["sci"]
        amit_id = teacher_map["sst"]

        if priya_id:
            await session.execute(text("""
                INSERT INTO staff_leaves (user_id, leave_type, start_date, end_date, days_count, reason, status, approved_by_id, action_remarks, action_date, applied_at)
                VALUES (:u_id, 'casual', '2026-10-23', '2026-10-23', 1.0, 'Family obligation and parental medical consultation.', 'approved', 1, 'Approved by Principal.', NOW() - INTERVAL '12 days', NOW() - INTERVAL '14 days');
            """), {"u_id": priya_id})

        if amit_id:
            await session.execute(text("""
                INSERT INTO staff_leaves (user_id, leave_type, start_date, end_date, days_count, reason, status, applied_at)
                VALUES (:u_id, 'sick', '2026-11-06', '2026-11-07', 2.0, 'Viral fever recovery as prescribed by medical practitioner.', 'pending', NOW() - INTERVAL '1 day');
            """), {"u_id": amit_id})

        # Official Generated Documents snapshot
        await session.execute(text("DELETE FROM staff_generated_documents;"))
        for u in staff_users[:4]:
            u_id = u[0]
            slip_ref = f"SLIP-2026-10-{u_id:04d}"
            appt_ref = f"APPT-PA-2026-{u_id:04d}"
            await session.execute(text("""
                INSERT INTO staff_generated_documents (
                    user_id, form_id, reference_number, document_type, title, period_month, status, generated_by_id, generated_at
                ) VALUES (
                    :u_id, 'monthly_salary_slip', :slip_ref,
                    'Monthly Salary Slip', 'Official Salary Statement for October 2026', 'October 2026', 'official', 1, NOW()
                ), (
                    :u_id, 'appointment_letter', :appt_ref,
                    'Appointment Letter', 'Formal Faculty Appointment Agreement & Service Confirmation', NULL, 'official', 1, NOW()
                ) ON CONFLICT (reference_number) DO NOTHING;
            """), {"u_id": u_id, "slip_ref": slip_ref, "appt_ref": appt_ref})

        await session.commit()

        print("\n" + "=" * 80)
        print("TEACHER & STAFF MODULE INITIALIZED SUCCESSFULLY!")
        print("=" * 80)


if __name__ == "__main__":
    asyncio.run(initialize_staff_module())

