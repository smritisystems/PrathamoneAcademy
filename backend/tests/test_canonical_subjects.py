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
