# /**
#  * @file        report_intelligence.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.api.v1.endpoints
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
#  * @description REST API endpoints for Universal Report Calculation & Intelligence Engine.
#  */

from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.settings import InstitutionSetting
from app.services.report_intelligence_service import ReportIntelligenceService

router = APIRouter()


@router.get("/definitions")
async def get_calculation_definitions(
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Retrieve canonical registry of mathematical formulas, inclusion/exclusion rules, and business meanings."""
    defs = ReportIntelligenceService.get_all_calculation_definitions()
    return {"total": len(defs), "items": defs}


@router.get("/metrics/{report_id}")
async def get_report_intelligence(
    report_id: str,
    academic_year_id: Optional[int] = Query(None),
    standard_id: Optional[int] = Query(None),
    division_id: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Calculate and return live KPIs, mathematical provenance, comparisons, and actionable insights."""
    institution_id = current_user.institution_id or 1
    intelligence = await ReportIntelligenceService.compute_intelligence(
        db=db,
        institution_id=institution_id,
        report_id=report_id,
        academic_year_id=academic_year_id,
        standard_id=standard_id,
        division_id=division_id,
        start_date=start_date,
        end_date=end_date,
    )
    return intelligence


@router.get("/thresholds")
async def get_report_thresholds(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Retrieve current institutional calculation thresholds and policy benchmarks."""
    institution_id = current_user.institution_id or 1
    thresholds = await ReportIntelligenceService.get_institutional_thresholds(db, institution_id)
    return {"institution_id": institution_id, "thresholds": thresholds}


@router.put("/thresholds")
async def update_report_thresholds(
    payload: Dict[str, float],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Update institutional targets and thresholds (Restricted to Administrators/Principals)."""
    role = (current_user.role or "").lower()
    if role not in ["admin", "sysadmin", "superadmin", "principal"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators and principals can modify official reporting thresholds.",
        )

    institution_id = current_user.institution_id or 1
    for key, val in payload.items():
        stmt = select(InstitutionSetting).where(
            and_(
                InstitutionSetting.institution_id == institution_id,
                InstitutionSetting.category == "report_intelligence",
                InstitutionSetting.key == key,
            )
        )
        res = await db.execute(stmt)
        setting = res.scalar_one_or_none()
        if setting:
            setting.value = str(val)
            setting.updated_by_id = current_user.id
        else:
            new_setting = InstitutionSetting(
                institution_id=institution_id,
                category="report_intelligence",
                key=key,
                value=str(val),
                data_type="float",
                updated_by_id=current_user.id,
            )
            db.add(new_setting)

    await db.commit()
    thresholds = await ReportIntelligenceService.get_institutional_thresholds(db, institution_id)
    return {
        "success": True,
        "message": "Institutional calculation thresholds updated successfully.",
        "thresholds": thresholds,
    }

