# /**
#  * @file        test_student_monthly_pivot.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.tests
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-24
#  * @updated     2026-11-25
#  *
#  * @description Comprehensive automated acceptance test suite for Dynamic Student-wise Fee Collection Pivot with Advanced Multi-Dimensional Filters.
#  */

import pytest
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.api.v1.endpoints.fees import get_student_monthly_pivot


@pytest.mark.asyncio
async def test_student_monthly_pivot_default_and_summary():
    """
    Test 1: Verify default student pivot with summary metrics, 12 months, and no filter constraints.
    """
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.role == "super_admin"))).scalars().first()
        if not user:
            user = (await db.execute(select(User))).scalars().first()

        res = await get_student_monthly_pivot(
            academic_year_id=1,
            board_id=None,
            standard_id=None,
            division_id=None,
            payment_status=None,
            student_status=None,
            payment_method=None,
            search=None,
            data_env="PRODUCTION",
            db=db,
            current_user=user,
        )

        assert "summary" in res
        assert "months" in res
        assert "students" in res
        assert "monthly_totals" in res
        assert "filter_options" in res

        # 12 months check (March through February)
        assert len(res["months"]) == 12
        assert res["months"][0]["key"] == "2026-03"
        assert res["months"][1]["key"] == "2026-04"
        assert res["months"][-1]["key"] == "2027-02"

        # Summary check
        summary = res["summary"]
        assert summary["total_students"] >= 0
        assert summary["total_agreed_package"] >= 0
        assert summary["total_collected"] >= 0
        assert summary["total_balance"] >= 0
        assert summary["collection_percentage"] >= 0
        assert summary["defaulters_count"] <= summary["total_students"]

        # Students rows check
        students = res["students"]
        assert len(students) == summary["total_students"]
        for st in students:
            assert "student_id" in st
            assert "admission_number" in st
            assert "student_name" in st
            assert "board_name" in st
            assert "standard_name" in st
            assert "division_name" in st
            assert "batch_name" in st
            assert "package_fee" in st
            assert "months" in st
            assert "total_collected" in st
            assert "balance" in st
            assert "collection_rate" in st
            assert "status" in st
            # Each month has details
            for m_key, m_val in st["months"].items():
                assert "amount" in m_val
                assert "payments_count" in m_val
                assert "is_pending" in m_val
                assert "status" in m_val
                assert "payments" in m_val


@pytest.mark.asyncio
async def test_student_monthly_pivot_board_filter():
    """
    Test 2: Verify board-level multi-select filtering.
    """
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.role == "super_admin"))).scalars().first()
        if not user:
            user = (await db.execute(select(User))).scalars().first()

        # Filter by board_id = "1"
        res = await get_student_monthly_pivot(
            academic_year_id=1,
            board_id="1",
            standard_id=None,
            division_id=None,
            payment_status=None,
            student_status=None,
            payment_method=None,
            search=None,
            data_env="PRODUCTION",
            db=db,
            current_user=user,
        )

        assert res["summary"]["total_students"] >= 0
        for st in res["students"]:
            assert str(st.get("board_id")) == "1"


@pytest.mark.asyncio
async def test_student_monthly_pivot_payment_status_filter():
    """
    Test 3: Verify payment status filter (e.g. overdue defaulters vs fully paid).
    """
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.role == "super_admin"))).scalars().first()
        if not user:
            user = (await db.execute(select(User))).scalars().first()

        res_overdue = await get_student_monthly_pivot(
            academic_year_id=1,
            board_id=None,
            standard_id=None,
            division_id=None,
            payment_status="overdue",
            student_status=None,
            payment_method=None,
            search=None,
            data_env="PRODUCTION",
            db=db,
            current_user=user,
        )

        for st in res_overdue["students"]:
            assert st["status"] == "overdue"
            assert st["balance"] > 0


@pytest.mark.asyncio
async def test_student_monthly_pivot_search():
    """
    Test 4: Verify search query across student name and admission number.
    """
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.role == "super_admin"))).scalars().first()
        if not user:
            user = (await db.execute(select(User))).scalars().first()

        res = await get_student_monthly_pivot(
            academic_year_id=1,
            board_id=None,
            standard_id=None,
            division_id=None,
            payment_status=None,
            student_status=None,
            payment_method=None,
            search="PA-2024",
            data_env="PRODUCTION",
            db=db,
            current_user=user,
        )

        assert res["summary"]["total_students"] >= 0
        for st in res["students"]:
            assert "PA-2024" in st["admission_number"]
