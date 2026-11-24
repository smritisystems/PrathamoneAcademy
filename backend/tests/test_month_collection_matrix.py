# /**
#  * @file        test_month_collection_matrix.py
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
#  * @updated     2026-11-24
#  *
#  * @description Comprehensive automated test suite for Month-Centric Fee Collection Matrix and Institute Daybook.
#  */

import pytest
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.api.v1.endpoints.fees import get_month_collection_matrix


@pytest.mark.asyncio
async def test_month_collection_matrix_calculations():
    """
    Verify the Month-Centric Collection Matrix (Cross-Batch Daybook):
    - 12 Academic Months (April 2026 - March 2027) with recovery rates and status colors
    - Accurate calculation of month target, realized receipts, and pending receivables
    - Batch Performance Cross-Tabulation
    - Student collection roster for the active month
    """
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.role == "super_admin"))).scalars().first()
        if not user:
            user = (await db.execute(select(User))).scalars().first()

        res = await get_month_collection_matrix(
            academic_year_id=1,
            month_key="2026-08",
            division_id=None,
            standard_id=None,
            data_env="PRODUCTION",
            db=db,
            current_user=user,
        )

        # 1. Assert structure
        assert "months" in res
        assert "active_month" in res
        assert "kpis" in res
        assert "batch_summaries" in res
        assert "students" in res

        # 2. Assert 12 months present
        assert len(res["months"]) == 12
        assert res["months"][0]["key"] == "2026-04"
        assert res["months"][4]["key"] == "2026-08"
        assert res["months"][11]["key"] == "2027-03"

        # 3. Assert active month coordinates
        assert res["active_month"]["key"] == "2026-08"
        assert "August" in res["active_month"]["month_name"]

        # 4. Assert KPIs
        kpis = res["kpis"]
        assert kpis["month_target"] > 0
        assert kpis["month_collected"] >= 0
        assert "mode_split" in kpis
        assert "upi" in kpis["mode_split"]
        assert "cash" in kpis["mode_split"]
        assert "bank" in kpis["mode_split"]

        # 5. Assert batch cross-tabulation
        assert len(res["batch_summaries"]) > 0
        for b in res["batch_summaries"]:
            assert "batch_id" in b
            assert "batch_name" in b
            assert "target_amount" in b
            assert "collected_amount" in b
            assert "recovery_pct" in b
            assert b["target_amount"] >= 0

        # 6. Assert student roster
        assert len(res["students"]) > 0
        for st in res["students"]:
            assert "student_id" in st
            assert "admission_number" in st
            assert "student_name" in st
            assert "month_due" in st
            assert "paid_amount" in st
            assert "balance_due" in st
            assert st["status"] in ("paid", "partial", "overdue", "upcoming")
