# /**
#  * @file        test_board_class_structure.py
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
#  * @created     2026-11-04
#  * @updated     2026-11-04
#  *
#  * @description Pytest suite testing board-to-standard relationships and cascading foreign key operations.
#  */

import pytest
from sqlalchemy import select, func
from app.models.board import Board
from app.models.standard import Standard
from app.models.division import Division
from app.models.student import Student
from app.models.enrollment import StudentEnrollment
from app.models.fee import FeeInvoice
from app.models.payment import Payment, PaymentReceipt


@pytest.mark.asyncio
async def test_board_records_exist(db, test_institution):
    """Verify that Board records can be created, queried, and retrieved."""
    # Ensure ICSE, CBSE, SSC boards exist
    boards_data = [
        {"name": "ICSE", "code": "ICSE", "description": "Indian Certificate of Secondary Education"},
        {"name": "CBSE", "code": "CBSE", "description": "Central Board of Secondary Education"},
        {"name": "SSC", "code": "SSC", "description": "Secondary School Certificate (State Board)"},
    ]
    for b_data in boards_data:
        existing = (await db.execute(
            select(Board).where(Board.code == b_data["code"], Board.institution_id == test_institution.id)
        )).scalar_one_or_none()
        if not existing:
            board = Board(
                institution_id=test_institution.id,
                name=b_data["name"],
                code=b_data["code"],
                description=b_data["description"],
                is_active=True,
            )
            db.add(board)
    await db.commit()

    all_boards = (await db.execute(
        select(Board).where(Board.institution_id == test_institution.id)
    )).scalars().all()
    codes = [b.code for b in all_boards]
    assert "ICSE" in codes
    assert "CBSE" in codes
    assert "SSC" in codes


@pytest.mark.asyncio
async def test_board_endpoints(client, auth_headers, test_institution):
    """Test REST API endpoints for Boards."""
    res = await client.get("/api/v1/boards/", headers=auth_headers)
    assert res.status_code == 200
    boards = res.json()
    assert isinstance(boards, list)


@pytest.mark.asyncio
async def test_division_board_linkage(db, test_institution):
    """Test linking divisions to boards and standards."""
    icse = (await db.execute(select(Board).where(Board.code == "ICSE"))).scalars().first()
    if not icse:
        icse = Board(institution_id=test_institution.id, name="ICSE", code="ICSE")
        db.add(icse)
        await db.commit()

    std9 = (await db.execute(select(Standard).where(Standard.level == 9))).scalars().first()
    if not std9:
        std9 = Standard(institution_id=test_institution.id, name="Standard 9", level=9, description="Class IX")
        db.add(std9)
        await db.commit()

    # Check division ICSE IX
    div = (await db.execute(select(Division).where(Division.name == "ICSE IX"))).scalars().first()
    if not div:
        div = Division(standard_id=std9.id, board_id=icse.id, name="ICSE IX", capacity=50)
        db.add(div)
        await db.commit()

    assert div.name == "ICSE IX"
    assert div.standard_id == std9.id

