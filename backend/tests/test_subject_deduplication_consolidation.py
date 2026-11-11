# /**
#  * @file        test_subject_deduplication_consolidation.py
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
#  * @created     2026-11-11
#  * @updated     2026-11-11
#  *
#  * @description Test suite for Subject Master Deduplication, Canonical Consolidation, Legacy Code Resolution, and Reversible Mappings.
#  */

import pytest
from app.models.subject import CanonicalSubject, SubjectMapping, Subject, SubjectLegacyMapping
from app.models.standard import Standard


@pytest.fixture
async def dedup_setup(db, test_institution):
    """Seed sample canonical subjects, legacy subjects, and mappings for deduplication tests."""
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
        aliases="Math, Maths, Pure Mathematics",
        alternate_codes="MATH-10, MATH-9, MATH-8, MATH-4",
        is_active=True,
    )
    eng = CanonicalSubject(
        institution_id=test_institution.id,
        name="English",
        code="ENG001",
        category="Languages",
        aliases="English Language, English Lit",
        alternate_codes="ENG-10, ENG-9, ENG-8, ENG-4",
        is_active=True,
    )
    db.add_all([math, eng])
    await db.flush()

    sub_math10 = Subject(
        standard_id=std10.id,
        canonical_subject_id=math.id,
        name="Mathematics",
        code="MATH-10",
        max_marks=100,
        pass_marks=35,
        is_active=True,
    )
    sub_math9 = Subject(
        standard_id=std9.id,
        canonical_subject_id=math.id,
        name="Mathematics",
        code="MATH-9",
        max_marks=100,
        pass_marks=35,
        is_active=True,
    )
    sub_eng9 = Subject(
        standard_id=std9.id,
        canonical_subject_id=eng.id,
        name="English",
        code="ENG-9",
        max_marks=100,
        pass_marks=35,
        is_active=True,
    )
    db.add_all([sub_math10, sub_math9, sub_eng9])
    await db.flush()

    map_math10 = SubjectMapping(
        canonical_subject_id=math.id,
        standard_id=std10.id,
        curriculum_code="MATH-10",
        display_name="Mathematics",
        legacy_subject_id=sub_math10.id,
        max_marks=100,
        pass_marks=35,
        is_active=True,
    )
    map_math9 = SubjectMapping(
        canonical_subject_id=math.id,
        standard_id=std9.id,
        curriculum_code="MATH-9",
        display_name="Mathematics",
        legacy_subject_id=sub_math9.id,
        max_marks=100,
        pass_marks=35,
        is_active=True,
    )
    db.add_all([map_math10, map_math9])
    await db.flush()

    slm_math10 = SubjectLegacyMapping(
        legacy_subject_id=sub_math10.id,
        standard_id=std10.id,
        legacy_code="MATH-10",
        legacy_name="Mathematics",
        canonical_subject_id=math.id,
        canonical_code="MATH001",
        canonical_name="Mathematics",
    )
    slm_eng9 = SubjectLegacyMapping(
        legacy_subject_id=sub_eng9.id,
        standard_id=std9.id,
        legacy_code="ENG-9",
        legacy_name="English Language",
        canonical_subject_id=eng.id,
        canonical_code="ENG001",
        canonical_name="English",
    )
    db.add_all([slm_math10, slm_eng9])
    await db.commit()

    return {
        "std9": std9,
        "std10": std10,
        "math": math,
        "eng": eng,
        "sub_math10": sub_math10,
        "sub_eng9": sub_eng9,
        "slm_math10": slm_math10,
        "slm_eng9": slm_eng9,
    }


@pytest.mark.asyncio
async def test_deduplicated_canonical_subjects_view(client, auth_headers, dedup_setup):
    res = await client.get("/api/v1/subjects/", headers=auth_headers)
    assert res.status_code == 200
    subjects = res.json()
    assert len(subjects) >= 2
    names = [s["name"] for s in subjects]
    assert len(names) == len(set(names)), "Duplicate subject names returned in general subjects list!"


@pytest.mark.asyncio
async def test_standard_specific_subjects_filtering(client, auth_headers, dedup_setup):
    std10_id = dedup_setup["std10"].id
    res = await client.get(f"/api/v1/subjects/?standard_id={std10_id}", headers=auth_headers)
    assert res.status_code == 200
    subjects = res.json()
    assert len(subjects) == 1
    assert subjects[0]["standard_id"] == std10_id
    assert subjects[0]["code"] == "MATH-10"


@pytest.mark.asyncio
async def test_search_by_old_subject_code(client, auth_headers, dedup_setup):
    res = await client.get("/api/v1/subjects/?search=MATH-10", headers=auth_headers)
    assert res.status_code == 200
    results = res.json()
    assert len(results) >= 1
    assert results[0]["name"] == "Mathematics"
    assert "MATH-10" in (results[0].get("alternate_codes") or "")


@pytest.mark.asyncio
async def test_search_by_subject_alias(client, auth_headers, dedup_setup):
    res = await client.get("/api/v1/subjects/?search=Maths", headers=auth_headers)
    assert res.status_code == 200
    results = res.json()
    assert len(results) >= 1
    assert results[0]["name"] == "Mathematics"


@pytest.mark.asyncio
async def test_resolve_legacy_subject_code(client, auth_headers, dedup_setup):
    res = await client.get("/api/v1/subjects/resolve/ENG-9", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "English"
    assert data["code"] == "ENG001"


@pytest.mark.asyncio
async def test_resolve_legacy_subject_id(client, auth_headers, dedup_setup):
    sub_id = dedup_setup["sub_math10"].id
    res = await client.get(f"/api/v1/subjects/resolve/{sub_id}?id_type=legacy", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Mathematics"
    assert data["code"] == "MATH001"


@pytest.mark.asyncio
async def test_duplicate_check_with_legacy_and_aliases(client, auth_headers, dedup_setup):
    res = await client.get("/api/v1/subjects/duplicate-check?name=Maths", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["has_exact_match"] or len(data["similar_matches"]) > 0


@pytest.mark.asyncio
async def test_reversible_legacy_mappings_registry(client, auth_headers, dedup_setup):
    res = await client.get("/api/v1/subjects/legacy-mappings", headers=auth_headers)
    assert res.status_code == 200
    mappings = res.json()
    assert len(mappings) >= 2
