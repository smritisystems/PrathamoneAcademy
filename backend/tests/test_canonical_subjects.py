# /**
#  * @file        test_canonical_subjects.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.tests
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-07
#  * @updated     2026-11-07
#  *
#  * @description Test suite for canonical subject architecture, multi-standard applicability mappings, and duplicate prevention.
#  */

import pytest
from sqlalchemy import select
from app.models.subject import CanonicalSubject, SubjectMapping, Subject
from app.models.standard import Standard
from app.models.board import Board
from app.models.academic_year import AcademicYear
from app.models.exam import Examination, ExamMark
from app.models.institution import Institution
from datetime import date
from decimal import Decimal
import uuid


@pytest.fixture
async def academic_setup(db, test_institution):
    """Seed standards and canonical subjects for testing."""
    std9 = Standard(
        institution_id=test_institution.id,
        name="Class IX",
        level=9,
        is_active=True,
    )
    std10 = Standard(
        institution_id=test_institution.id,
        name="Class X",
        level=10,
        is_active=True,
    )
    db.add_all([std9, std10])
    await db.flush()

    math = CanonicalSubject(
        institution_id=test_institution.id,
        name="Mathematics",
        code="MATH001",
        category="Mathematics",
        aliases="Math, Maths",
        is_active=True,
    )
    sci = CanonicalSubject(
        institution_id=test_institution.id,
        name="Science",
        code="SCI001",
        category="Science",
        aliases="General Science",
        is_active=True,
    )
    eng = CanonicalSubject(
        institution_id=test_institution.id,
        name="English",
        code="ENG001",
        category="Languages",
        aliases="English Language",
        is_active=True,
    )
    db.add_all([math, sci, eng])
    await db.flush()

    map_math10 = SubjectMapping(
        canonical_subject_id=math.id,
        standard_id=std10.id,
        curriculum_code="MATH-10",
        display_name="Mathematics",
        max_marks=100,
        pass_marks=35,
        is_active=True,
    )
    db.add(map_math10)
    await db.commit()

    return {
        "institution": test_institution,
        "std9": std9,
        "std10": std10,
        "math": math,
        "sci": sci,
        "eng": eng,
    }


class TestCanonicalSubjects:
    """Test suite covering Canonical Subject Master, Mappings, and Duplicate Prevention."""

    @pytest.mark.asyncio
    async def test_canonical_subjects_catalogue_seeded(self, client, auth_headers, academic_setup):
        """Validates that seeded canonical subjects are retrieved with summary counts."""
        res = await client.get(
            "/api/v1/subjects/canonical",
            headers=auth_headers,
        )
        assert res.status_code == 200
        data = res.json()
        assert len(data) >= 3

        # Verify Mathematics canonical entry
        math_entry = next((s for s in data if s["code"] == "MATH001"), None)
        assert math_entry is not None
        assert math_entry["name"] == "Mathematics"
        assert math_entry["category"] == "Mathematics"
        assert math_entry["mappings_count"] >= 1
        assert "Class X" in math_entry["standards_summary"]

    @pytest.mark.asyncio
    async def test_duplicate_check_endpoint(self, client, auth_headers, academic_setup):
        """Validates live duplicate detection by exact and partial matches."""
        # 1. Exact match
        res_exact = await client.get(
            "/api/v1/subjects/duplicate-check?name=Mathematics",
            headers=auth_headers,
        )
        assert res_exact.status_code == 200
        exact_data = res_exact.json()
        assert exact_data["has_exact_match"] is True
        assert exact_data["exact_match"]["code"] == "MATH001"

        # 2. Similar substring match
        res_sim = await client.get(
            "/api/v1/subjects/duplicate-check?name=Math",
            headers=auth_headers,
        )
        assert res_sim.status_code == 200
        sim_data = res_sim.json()
        assert len(sim_data["similar_matches"]) >= 1
        codes = [s["code"] for s in sim_data["similar_matches"]]
        assert "MATH001" in codes

        # 3. Novel subject
        res_novel = await client.get(
            "/api/v1/subjects/duplicate-check?name=QuantumPhilosophyX",
            headers=auth_headers,
        )
        assert res_novel.status_code == 200
        novel_data = res_novel.json()
        assert novel_data["has_exact_match"] is False
        assert len(novel_data["similar_matches"]) == 0

    @pytest.mark.asyncio
    async def test_create_canonical_subject_duplicate_prevention(self, client, auth_headers, academic_setup):
        """Ensures duplicate canonical subject registrations are blocked."""
        # 1. Duplicate code rejection
        res_dup_code = await client.post(
            "/api/v1/subjects/canonical",
            headers=auth_headers,
            json={
                "name": "Advanced Math",
                "code": "MATH001",  # already exists
                "category": "Mathematics",
                "institution_id": academic_setup["institution"].id,
            },
        )
        assert res_dup_code.status_code == 400
        assert "already exists" in res_dup_code.json()["detail"]

        # 2. Duplicate name rejection
        res_dup_name = await client.post(
            "/api/v1/subjects/canonical",
            headers=auth_headers,
            json={
                "name": "Mathematics",
                "code": "MATH999",
                "category": "Mathematics",
                "institution_id": academic_setup["institution"].id,
            },
        )
        assert res_dup_name.status_code == 400
        assert "already exists" in res_dup_name.json()["detail"]

    @pytest.mark.asyncio
    async def test_canonical_subject_multi_standard_mapping(self, client, auth_headers, academic_setup, db):
        """Validates that a single canonical subject is mapped across standards without duplicate master identities."""
        import uuid
        uid = uuid.uuid4().hex[:6]
        code = f"PHIL{uid}".upper()
        name = f"Philosophy-{uid}"
        std9_id = academic_setup["std9"].id
        std10_id = academic_setup["std10"].id

        # 1. Register canonical master subject
        res_create = await client.post(
            "/api/v1/subjects/canonical",
            headers=auth_headers,
            json={
                "name": name,
                "code": code,
                "category": "Humanities",
                "description": "Critical thinking and philosophical logic",
                "aliases": "Logic, Ethics",
                "institution_id": academic_setup["institution"].id,
            },
        )
        assert res_create.status_code == 201
        canonical_id = res_create.json()["id"]

        # 2. Map to Standard 10 (Class X)
        res_map10 = await client.post(
            "/api/v1/subjects/mappings",
            headers=auth_headers,
            json={
                "canonical_subject_id": canonical_id,
                "standard_id": std10_id,
                "curriculum_code": f"PHIL-10-{uid}",
                "display_name": f"{name} (Class X)",
                "max_marks": 100,
                "pass_marks": 40,
                "is_optional": True,
            },
        )
        assert res_map10.status_code == 201

        # 3. Map to Standard 9 (Class IX)
        res_map9 = await client.post(
            "/api/v1/subjects/mappings",
            headers=auth_headers,
            json={
                "canonical_subject_id": canonical_id,
                "standard_id": std9_id,
                "curriculum_code": f"PHIL-9-{uid}",
                "display_name": f"{name} (Class IX)",
                "max_marks": 80,
                "pass_marks": 32,
                "is_optional": True,
            },
        )
        assert res_map9.status_code == 201

        # 4. Attempt duplicate mapping for Standard 10 -> rejected
        res_dup_map = await client.post(
            "/api/v1/subjects/mappings",
            headers=auth_headers,
            json={
                "canonical_subject_id": canonical_id,
                "standard_id": std10_id,
                "curriculum_code": f"PHIL-10-DUP",
            },
        )
        assert res_dup_map.status_code == 400
        assert "already mapped" in res_dup_map.json()["detail"]

        # 5. Verify mappings in canonical details endpoint
        res_detail = await client.get(
            f"/api/v1/subjects/canonical/{canonical_id}",
            headers=auth_headers,
        )
        assert res_detail.status_code == 200
        detail_data = res_detail.json()
        assert len(detail_data["mappings"]) == 2
        std_ids = [m["standard_id"] for m in detail_data["mappings"]]
        assert std10_id in std_ids and std9_id in std_ids

    @pytest.mark.asyncio
    async def test_legacy_endpoint_synchronization(self, client, auth_headers, academic_setup):
        """Validates that legacy POST /api/v1/subjects/ auto-links canonical subjects and mappings."""
        import uuid
        uid = uuid.uuid4().hex[:6]
        name = f"Robotics-{uid}"
        std10_id = academic_setup["std10"].id

        # Create via legacy endpoint
        res_legacy = await client.post(
            "/api/v1/subjects/",
            headers=auth_headers,
            json={
                "standard_id": std10_id,
                "name": name,
                "code": f"ROB-{uid}".upper(),
                "max_marks": 100,
                "pass_marks": 35,
                "is_optional": False,
            },
        )
        assert res_legacy.status_code == 201
        leg_data = res_legacy.json()
        assert leg_data["canonical_subject_id"] is not None

        # Verify it appears in canonical list
        res_canon = await client.get(
            f"/api/v1/subjects/canonical/{leg_data['canonical_subject_id']}",
            headers=auth_headers,
        )
        assert res_canon.status_code == 200
        assert res_canon.json()["name"] == name

    @pytest.mark.asyncio
    async def test_multi_board_mapping_for_same_canonical_subject(self, client, auth_headers, academic_setup, db):
        """Validates that a single canonical subject can be mapped to multiple boards in the same standard with different configs."""
        inst_id = academic_setup["institution"].id
        std10_id = academic_setup["std10"].id
        math_id = academic_setup["math"].id

        # 1. Create two boards (ICSE and CBSE)
        board_icse = Board(institution_id=inst_id, name="ICSE Board", code=f"ICSE-{uuid.uuid4().hex[:4]}", is_active=True)
        board_cbse = Board(institution_id=inst_id, name="CBSE Board", code=f"CBSE-{uuid.uuid4().hex[:4]}", is_active=True)
        db.add_all([board_icse, board_cbse])
        await db.commit()
        await db.refresh(board_icse)
        await db.refresh(board_cbse)

        # 2. Map Mathematics to Class X for ICSE (100 marks, pass 35)
        res_icse = await client.post(
            "/api/v1/subjects/mappings",
            headers=auth_headers,
            json={
                "canonical_subject_id": math_id,
                "standard_id": std10_id,
                "board_id": board_icse.id,
                "curriculum_code": "MATH-ICSE",
                "display_name": "Mathematics (ICSE)",
                "max_marks": 100,
                "pass_marks": 35,
            },
        )
        assert res_icse.status_code == 201

        # 3. Map SAME Mathematics to Class X for CBSE (80 marks, pass 26)
        res_cbse = await client.post(
            "/api/v1/subjects/mappings",
            headers=auth_headers,
            json={
                "canonical_subject_id": math_id,
                "standard_id": std10_id,
                "board_id": board_cbse.id,
                "curriculum_code": "041",
                "display_name": "Mathematics (CBSE)",
                "max_marks": 80,
                "pass_marks": 26,
            },
        )
        assert res_cbse.status_code == 201

        # 4. Attempt duplicate mapping for ICSE -> Must be rejected with HTTP 400
        res_dup = await client.post(
            "/api/v1/subjects/mappings",
            headers=auth_headers,
            json={
                "canonical_subject_id": math_id,
                "standard_id": std10_id,
                "board_id": board_icse.id,
                "curriculum_code": "MATH-ICSE-DUP",
            },
        )
        assert res_dup.status_code == 400
        assert "already mapped" in res_dup.json()["detail"]

    @pytest.mark.asyncio
    async def test_curriculum_specific_subject_distinctions(self, client, auth_headers, academic_setup, db):
        """Validates that distinct academic curriculum subjects (e.g. English Language vs Literature in English) can coexist."""
        inst_id = academic_setup["institution"].id
        std10_id = academic_setup["std10"].id
        uid = uuid.uuid4().hex[:6]

        # 1. Register English Language
        res_lang = await client.post(
            "/api/v1/subjects/canonical",
            headers=auth_headers,
            json={
                "name": f"English Language-{uid}",
                "code": f"ENG_LANG_{uid}".upper(),
                "category": "Languages",
                "description": "English Grammar, Composition and Comprehension",
                "institution_id": inst_id,
            },
        )
        assert res_lang.status_code == 201
        lang_id = res_lang.json()["id"]

        # 2. Register Literature in English as a distinct canonical subject
        res_lit = await client.post(
            "/api/v1/subjects/canonical",
            headers=auth_headers,
            json={
                "name": f"Literature in English-{uid}",
                "code": f"ENG_LIT_{uid}".upper(),
                "category": "Languages",
                "description": "English Drama, Poetry and Prose",
                "institution_id": inst_id,
            },
        )
        assert res_lit.status_code == 201
        lit_id = res_lit.json()["id"]

        # 3. Map BOTH to the same Class X simultaneously
        res_map_lang = await client.post(
            "/api/v1/subjects/mappings",
            headers=auth_headers,
            json={
                "canonical_subject_id": lang_id,
                "standard_id": std10_id,
                "curriculum_code": f"ENG1-{uid}",
                "display_name": "English Paper 1 (Language)",
                "max_marks": 100,
                "pass_marks": 35,
            },
        )
        assert res_map_lang.status_code == 201

        res_map_lit = await client.post(
            "/api/v1/subjects/mappings",
            headers=auth_headers,
            json={
                "canonical_subject_id": lit_id,
                "standard_id": std10_id,
                "curriculum_code": f"ENG2-{uid}",
                "display_name": "English Paper 2 (Literature)",
                "max_marks": 100,
                "pass_marks": 35,
            },
        )
        assert res_map_lit.status_code == 201

    @pytest.mark.asyncio
    async def test_academic_year_curriculum_transitions(self, client, auth_headers, academic_setup, db):
        """Validates that curriculum updates in a new academic year do not overwrite historical mappings."""
        inst_id = academic_setup["institution"].id
        std10_id = academic_setup["std10"].id
        sci_id = academic_setup["sci"].id
        uid = uuid.uuid4().hex[:4]

        # 1. Create two academic years
        ay_2026 = AcademicYear(institution_id=inst_id, name=f"2026-27-{uid}", start_date=date(2026, 4, 1), end_date=date(2027, 3, 31), is_current=False)
        ay_2027 = AcademicYear(institution_id=inst_id, name=f"2027-28-{uid}", start_date=date(2027, 4, 1), end_date=date(2028, 3, 31), is_current=True)
        db.add_all([ay_2026, ay_2027])
        await db.commit()
        await db.refresh(ay_2026)
        await db.refresh(ay_2027)

        # 2. Map Science for AY 2026-27 (100 marks)
        res_ay26 = await client.post(
            "/api/v1/subjects/mappings",
            headers=auth_headers,
            json={
                "canonical_subject_id": sci_id,
                "standard_id": std10_id,
                "academic_year_id": ay_2026.id,
                "curriculum_code": "SCI-2026",
                "display_name": "Integrated Science 2026",
                "max_marks": 100,
                "pass_marks": 35,
            },
        )
        assert res_ay26.status_code == 201
        map26_id = res_ay26.json()["id"]

        # 3. Map Science for AY 2027-28 (Revised curriculum: 80 marks)
        res_ay27 = await client.post(
            "/api/v1/subjects/mappings",
            headers=auth_headers,
            json={
                "canonical_subject_id": sci_id,
                "standard_id": std10_id,
                "academic_year_id": ay_2027.id,
                "curriculum_code": "SCI-2027",
                "display_name": "Modular Science 2027",
                "max_marks": 80,
                "pass_marks": 28,
            },
        )
        assert res_ay27.status_code == 201
        map27_id = res_ay27.json()["id"]

        # 4. Verify historical mapping for AY 2026 retains 100 max marks
        hist_check = (await db.execute(select(SubjectMapping).where(SubjectMapping.id == map26_id))).scalar_one()
        assert hist_check.max_marks == 100
        assert hist_check.display_name == "Integrated Science 2026"

        curr_check = (await db.execute(select(SubjectMapping).where(SubjectMapping.id == map27_id))).scalar_one()
        assert curr_check.max_marks == 80
        assert curr_check.display_name == "Modular Science 2027"

    @pytest.mark.asyncio
    async def test_historical_examination_integrity(self, client, auth_headers, academic_setup, db, test_student):
        """Validates that historical examination records retain foreign key integrity with subjects."""
        inst_id = academic_setup["institution"].id
        std10 = academic_setup["std10"]

        # 1. Create Academic Year and Exam
        ay = AcademicYear(institution_id=inst_id, name=f"AY-Exam-{uuid.uuid4().hex[:4]}", start_date=date(2026, 4, 1), end_date=date(2027, 3, 31), is_current=True)
        db.add(ay)
        await db.flush()

        # 2. Create concrete legacy subject
        sub = Subject(standard_id=std10.id, canonical_subject_id=academic_setup["math"].id, name="Mathematics Exam Test", code="MATH-EXAM", max_marks=100, pass_marks=35, is_active=True)
        db.add(sub)
        await db.flush()

        exam = Examination(academic_year_id=ay.id, standard_id=std10.id, name="Midterm Exam 2026", exam_type="terminal", max_marks=100, passing_marks=35, is_active=True)
        db.add(exam)
        await db.flush()

        mark = ExamMark(examination_id=exam.id, student_id=test_student.id, subject_id=sub.id, marks_obtained=Decimal("92.50"), grade="A+", is_absent=False)
        db.add(mark)
        await db.commit()

        # 3. Soft-delete / deactivate the subject
        sub.is_active = False
        await db.commit()

        # 4. Verify exam mark still links to subject without dangling reference or failure
        mark_query = select(ExamMark, Subject.name, Examination.name).join(Subject, ExamMark.subject_id == Subject.id).join(Examination, ExamMark.examination_id == Examination.id).where(ExamMark.id == mark.id)
        row = (await db.execute(mark_query)).first()
        assert row is not None
        m, s_name, e_name = row
        assert float(m.marks_obtained) == 92.5
        assert s_name == "Mathematics Exam Test"
        assert e_name == "Midterm Exam 2026"

    @pytest.mark.asyncio
    async def test_tenant_isolation_canonical_subjects(self, client, auth_headers, db):
        """Validates that canonical subjects enforce tenant isolation per institution."""
        uid = uuid.uuid4().hex[:4]
        # Create second institution
        inst2 = Institution(name=f"Second Academy {uid}", code=f"SEC_{uid}".upper(), is_active=True)
        db.add(inst2)
        await db.commit()
        await db.refresh(inst2)

        # 1. Register subject with code CS01 in Institution 1
        res_inst1 = await client.post(
            "/api/v1/subjects/canonical",
            headers=auth_headers,
            json={
                "name": f"Computer Science Inst1-{uid}",
                "code": f"CS_{uid}".upper(),
                "category": "Computer Science",
                "institution_id": 1,
            },
        )
        assert res_inst1.status_code == 201

        # 2. Register SAME code in Institution 2 -> Must succeed due to composite uniqueness (institution_id, code)
        res_inst2 = await client.post(
            "/api/v1/subjects/canonical",
            headers=auth_headers,
            json={
                "name": f"Computer Science Inst2-{uid}",
                "code": f"CS_{uid}".upper(),
                "category": "Computer Science",
                "institution_id": inst2.id,
            },
        )
        assert res_inst2.status_code == 201
