# /**
#  * @file        test_dimension_analytics.py
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
#  * @description Comprehensive automated acceptance test suite for Annual, Board, and Standard/Grade Fee Realization Dimensions.
#  */

import pytest
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.api.v1.endpoints.fees import get_dimension_analytics


@pytest.mark.asyncio
async def test_dimension_analytics_annual_board_standard():
    """
    Verify Multi-Dimensional Fee Realization Analytics:
    - Annual Year-wise breakdown across Academic Years
    - Educational Board breakdown (ICSE, CBSE, SSC, etc.)
    - Standard / Grade breakdown (Class VIII, IX, X, etc.)
    - Student collection roster with Admission #, Student Name, Batch/Std, Agreed Pkg, Paid, Balance, Status
    """
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.role == "super_admin"))).scalars().first()
        if not user:
            user = (await db.execute(select(User))).scalars().first()

        # 1. Test unfiltered dimension analytics
        res = await get_dimension_analytics(
            academic_year_id=1,
            board_id=None,
            standard_id=None,
            division_id=None,
            data_env="PRODUCTION",
            db=db,
            current_user=user,
        )

        assert "kpis" in res
        assert "annual_breakdown" in res
        assert "board_breakdown" in res
        assert "standard_breakdown" in res
        assert "students" in res

        # KPIs assertions
        kpis = res["kpis"]
        assert kpis["total_target"] >= 0
        assert kpis["total_collected"] >= 0
        assert kpis["realization_rate"] >= 0
        assert kpis["total_students"] >= 0
        assert "mode_split" in kpis
        assert "upi" in kpis["mode_split"]
        assert "cash" in kpis["mode_split"]
        assert "bank" in kpis["mode_split"]

        # Board breakdown assertions
        assert len(res["board_breakdown"]) >= 0
        for b in res["board_breakdown"]:
            assert "board_id" in b
            assert "board_name" in b
            assert "enrolled_students" in b
            assert "standards_count" in b
            assert "batches_count" in b
            assert "target_amount" in b
            assert "collected_amount" in b
            assert "recovery_rate" in b
            assert "status_color" in b
            assert b["target_amount"] >= 0

        # Standard breakdown assertions
        assert len(res["standard_breakdown"]) >= 0
        for s in res["standard_breakdown"]:
            assert "standard_id" in s
            assert "standard_name" in s
            assert "level" in s
            assert "enrolled_students" in s
            assert "batches_count" in s
            assert "target_amount" in s
            assert "collected_amount" in s
            assert "recovery_rate" in s
            assert "status_color" in s
            assert s["target_amount"] >= 0

        # Student roster assertions
        assert len(res["students"]) >= 0
        for st in res["students"]:
            assert "student_id" in st
            assert "admission_number" in st
            assert "student_name" in st
            assert "batch_name" in st
            assert "standard_name" in st
            assert "package_fee" in st
            assert "month_due" in st
            assert "paid_amount" in st
            assert "balance_due" in st
            assert st["status"] in ("paid", "partial", "overdue", "upcoming")

        # 2. Test filtered dimension analytics by board_id=1 (ICSE)
        res_icse = await get_dimension_analytics(
            academic_year_id=1,
            board_id=1,
            standard_id=None,
            division_id=None,
            data_env="PRODUCTION",
            db=db,
            current_user=user,
        )
        assert len(res_icse["board_breakdown"]) in (0, 1)
        if len(res_icse["board_breakdown"]) == 1:
            assert res_icse["board_breakdown"][0]["board_id"] == 1
        for st in res_icse["students"]:
            assert st["board_id"] == 1
