# /**
#  * @file        test_student_collection_remark.py
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
#  * @description Automated pytest suite for student collection remarks and priority tracking endpoint.
#  */

import pytest
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.api.v1.endpoints.fees import (
    get_student_monthly_pivot,
    save_student_collection_remark,
    StudentCollectionRemarkPayload,
)


@pytest.mark.asyncio
async def test_save_and_retrieve_student_collection_remark():
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.role == "super_admin"))).scalars().first()
        if not user:
            user = (await db.execute(select(User))).scalars().first()

        # 1. Fetch pivot to get an enrolled student
        pivot_res = await get_student_monthly_pivot(
            academic_year_id=1,
            data_env="PRODUCTION",
            db=db,
            current_user=user,
        )
        assert len(pivot_res["students"]) > 0

        target_student = pivot_res["students"][0]
        student_id = target_student["student_id"]
        invoice_id = target_student.get("invoice_id")

        # 2. Post a collection remark with priority
        payload = StudentCollectionRemarkPayload(
            student_id=student_id,
            invoice_id=invoice_id,
            remark="Parent committed to pay remaining balance on 5th Dec via UPI",
            priority="urgent",
            follow_up_status="promise_to_pay",
        )
        post_res = await save_student_collection_remark(
            data=payload,
            db=db,
            current_user=user,
        )
        assert post_res["status"] == "success"
        assert post_res["priority"] == "urgent"
        assert post_res["follow_up_status"] == "promise_to_pay"
        assert "5th Dec" in post_res["remark"]

        # 3. Re-query pivot to verify remark and priority are returned
        recheck_res = await get_student_monthly_pivot(
            academic_year_id=1,
            data_env="PRODUCTION",
            db=db,
            current_user=user,
        )
        recheck_student = next(s for s in recheck_res["students"] if s["student_id"] == student_id)

        assert recheck_student["priority"] == "urgent"
        assert recheck_student["follow_up_status"] == "promise_to_pay"
        assert "5th Dec" in recheck_student["remark"]
