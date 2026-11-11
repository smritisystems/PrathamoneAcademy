# /**
#  * @file        settings.py
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
#  * @created     2026-11-05
#  * @updated     2026-11-11
#  *
#  * @description API endpoints for institute settings workspace, profile branding, general lookups, and audit history.
#  */

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, update, delete
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from datetime import datetime
import json

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role
from app.models.institution import Institution
from app.models.settings import InstitutionSetting, LookupItem, SettingAuditLog
from app.models.user import User

router = APIRouter()

# Authoritative baseline defaults across all 15 configuration categories
DEFAULT_SETTINGS: Dict[str, Dict[str, Any]] = {
    "profile": {
        "name": "PrathamOne Academy",
        "short_name": "PA",
        "institute_type": "Coaching Institute",
        "establishment_year": 2018,
        "registration_number": "MH-COACH-2018-0157",
        "tax_id": "AABCP1234K",
        "tagline": "Learn • Practice • Achieve",
        "description": "A comprehensive coaching academy for school & competitive examinations, focused on concept clarity and student success.",
        "default_language": "en",
        "timezone": "Asia/Kolkata",
        "address": "Vasai Road (W), Palghar - 401202",
        "city": "Palghar",
        "state": "Maharashtra",
        "pincode": "401202",
        "phone": "+91 98765 43210",
        "email": "info@prathamoneacademy.in",
        "website": "https://prathamone.com",
    },
    "branding": {
        "primary_color": "#1E40AF",
        "secondary_color": "#3B82F6",
        "accent_color": "#8B5CF6",
        "theme_preset": "Royal Blue & Indigo",
        "logo_url": "/logo.svg",
        "favicon_url": "/favicon.svg",
        "login_bg_style": "wave_gradient",
        "document_monogram": "PA",
        "custom_css": "",
    },
    "academic": {
        "default_academic_year": "2026-27",
        "session_start_month": "April",
        "session_end_month": "March",
        "standard_naming": "Roman",
        "batch_capacity_warning": 40,
        "term_structure": "Quarterly",
        "timetable_slot_duration": 45,
        "auto_promotion": False,
    },
    "admission": {
        "admission_prefix": "PA",
        "admission_sequence_format": "{PREFIX}-{YYYY}-{SEQ:6}",
        "next_admission_number": 43,
        "auto_roll_number": True,
        "roll_number_format": "alpha_first_name",
        "mandatory_kyc_docs": ["Aadhaar Card", "Previous Marksheet", "Passport Photo"],
        "sibling_discount_pct": 10.0,
        "min_admission_age": 5,
        "student_visibility_dashboard": "active_only",
        "student_visibility_reports": "include_all",
        "student_visibility_lists": "active_only",
    },
    "staff": {
        "employee_id_prefix": "EMP",
        "next_employee_number": 101,
        "default_employment_type": "Full-Time",
        "weekly_workload_hours": 30,
        "annual_casual_leave": 12,
        "annual_sick_leave": 8,
    },
    "fees": {
        "receipt_prefix": "RCP",
        "receipt_number_format": "{PREFIX}-{YYYY}-{SEQ:4}",
        "next_receipt_number": 168,
        "currency_symbol": "₹",
        "currency_code": "INR",
        "decimal_places": 0,
        "enable_gst": False,
        "gst_rate": 18.0,
        "grace_days": 7,
        "late_fine_per_day": 50,
        "default_installment_plan": "Quarterly (4 Installments)",
    },
    "attendance": {
        "mode": "batch",
        "default_status": "present",
        "late_grace_minutes": 15,
        "low_attendance_threshold": 75,
        "auto_notify_parents": True,
    },
    "examination": {
        "grading_scale": "percentage",
        "passing_percentage": 35.0,
        "allow_retest": True,
        "publish_ranks": True,
        "show_percentile": True,
    },
    "communication": {
        "primary_channel": "WhatsApp",
        "whatsapp_enabled": True,
        "whatsapp_provider": "Meta Cloud API",
        "sms_enabled": True,
        "sms_provider": "Textlocal",
        "email_enabled": True,
        "admission_template": "Dear {PARENT_NAME}, welcome to {INSTITUTE_NAME}. {STUDENT_NAME}'s admission for {STANDARD} is confirmed.",
        "fee_receipt_template": "Dear {PARENT_NAME}, payment of {AMOUNT} received against Receipt #{RECEIPT_NO}. Outstanding: {BALANCE}.",
        "absence_template": "Dear {PARENT_NAME}, {STUDENT_NAME} was marked ABSENT today for {BATCH}.",
    },
    "documents": {
        "default_paper_size": "A5",
        "receipt_template": "modern_a5",
        "signatory_title": "Authorized Signatory",
        "signatory_name": "Accounts Officer",
        "disclaimer_text": "This is a computer-generated receipt and does not require a physical signature.",
        "dpdp_notice_enabled": True,
        "print_receipt_logo": False,
        "print_receipt_tagline": False,
        "print_software_branding": True,
        "print_sovereign_trim": False,
        "print_verification_seal": False,
    },
    "system": {
        "locale": "en-IN",
        "timezone": "Asia/Kolkata",
        "date_format": "DD/MM/YYYY",
        "time_format": "12-hour",
        "number_format": "Indian (1,00,000)",
        "maintenance_mode": False,
        "enable_student_portal": True,
        "enable_pwa_offline": True,
        "session_timeout_minutes": 120,
    },
    "permissions": {
        "allow_teacher_attendance": True,
        "allow_teacher_marks_entry": True,
        "allow_accountant_reversal": False,
        "require_two_factor_auth": False,
    },
    "integrations": {
        "payment_gateway": "Razorpay",
        "payment_gateway_mode": "mock",
        "backup_destination": "Local & GCS",
        "backup_frequency": "Daily",
        "biometric_sync_enabled": False,
    },
    "maintenance": {
        "last_backup_date": "2026-11-04T12:00:00Z",
        "backup_status": "Verified Healthy",
        "auto_vacuum_enabled": True,
        "log_retention_days": 90,
    },
}

DEFAULT_LOOKUPS = [
    # Student Categories
    {"category": "STUDENT_CATEGORY", "code": "GEN", "label": "General", "description": "General open category", "sort_order": 1, "is_system": True},
    {"category": "STUDENT_CATEGORY", "code": "OBC", "label": "Other Backward Class", "description": "OBC non-creamy layer", "sort_order": 2, "is_system": True},
    {"category": "STUDENT_CATEGORY", "code": "SC", "label": "Scheduled Caste", "description": "SC Category", "sort_order": 3, "is_system": True},
    {"category": "STUDENT_CATEGORY", "code": "ST", "label": "Scheduled Tribe", "description": "ST Category", "sort_order": 4, "is_system": True},
    {"category": "STUDENT_CATEGORY", "code": "EWS", "label": "Economically Weaker Section", "description": "EWS reservation", "sort_order": 5, "is_system": True},
    # Payment Methods
    {"category": "PAYMENT_METHOD", "code": "CASH", "label": "Cash", "description": "Direct cash counter collection", "sort_order": 1, "is_system": True},
    {"category": "PAYMENT_METHOD", "code": "UPI", "label": "UPI / QR", "description": "GPay, PhonePe, Paytm, BHIM", "sort_order": 2, "is_system": True},
    {"category": "PAYMENT_METHOD", "code": "BANK_TRANSFER", "label": "Bank Transfer (NEFT/RTGS/IMPS)", "description": "Direct electronic wire transfer", "sort_order": 3, "is_system": True},
    {"category": "PAYMENT_METHOD", "code": "CHEQUE", "label": "Cheque / Demand Draft", "description": "Bank instrument clearing", "sort_order": 4, "is_system": True},
    {"category": "PAYMENT_METHOD", "code": "CARD", "label": "Credit / Debit Card", "description": "POS swipe or payment gateway", "sort_order": 5, "is_system": True},
    # Exam Types
    {"category": "EXAM_TYPE", "code": "UNIT_TEST", "label": "Unit Test", "description": "Monthly chapter assessments", "sort_order": 1, "is_system": True},
    {"category": "EXAM_TYPE", "code": "PERIODIC", "label": "Periodic Assessment", "description": "Mid-term periodic evaluation", "sort_order": 2, "is_system": True},
    {"category": "EXAM_TYPE", "code": "MID_TERM", "label": "Mid-Term Examination", "description": "Half-yearly board syllabus exam", "sort_order": 3, "is_system": True},
    {"category": "EXAM_TYPE", "code": "FINAL", "label": "Annual Final Examination", "description": "Cumulative end-of-year examination", "sort_order": 4, "is_system": True},
    {"category": "EXAM_TYPE", "code": "MOCK", "label": "Competitive Mock Test", "description": "JEE/NEET/CET practice test", "sort_order": 5, "is_system": True},
    # Staff Designations
    {"category": "STAFF_DESIGNATION", "code": "SR_FACULTY", "label": "Senior Faculty", "description": "Principal subject lecturer", "sort_order": 1, "is_system": True},
    {"category": "STAFF_DESIGNATION", "code": "FACULTY", "label": "Faculty", "description": "Teaching staff", "sort_order": 2, "is_system": True},
    {"category": "STAFF_DESIGNATION", "code": "COUNSELOR", "label": "Academic Counselor", "description": "Student guidance and admissions", "sort_order": 3, "is_system": True},
    {"category": "STAFF_DESIGNATION", "code": "ACCOUNTANT", "label": "Accountant", "description": "Fees and financial operations", "sort_order": 4, "is_system": True},
    {"category": "STAFF_DESIGNATION", "code": "ADMIN", "label": "Administrator", "description": "Front-desk and operations manager", "sort_order": 5, "is_system": True},
    # Relationship Types
    {"category": "RELATIONSHIP_TYPE", "code": "FATHER", "label": "Father", "description": "Primary parent", "sort_order": 1, "is_system": True},
    {"category": "RELATIONSHIP_TYPE", "code": "MOTHER", "label": "Mother", "description": "Primary parent", "sort_order": 2, "is_system": True},
    {"category": "RELATIONSHIP_TYPE", "code": "GUARDIAN", "label": "Guardian", "description": "Appointed legal guardian", "sort_order": 3, "is_system": True},
]


class InstituteProfileUpdate(BaseModel):
    name: Optional[str] = None
    short_name: Optional[str] = None
    institute_type: Optional[str] = None
    establishment_year: Optional[int] = None
    registration_number: Optional[str] = None
    tax_id: Optional[str] = None
    tagline: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    default_language: Optional[str] = None
    timezone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None


class BatchSettingsUpdate(BaseModel):
    category: str
    settings: Dict[str, Any]
    reason: Optional[str] = None


class LookupItemCreate(BaseModel):
    category: str
    code: str
    label: str
    description: Optional[str] = None
    sort_order: Optional[int] = 0
    is_active: Optional[bool] = True
    meta_data: Optional[str] = None


class LookupItemUpdate(BaseModel):
    label: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
    meta_data: Optional[str] = None


@router.get("/profile")
async def get_institute_profile(
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target_id = institution_id or current_user.institution_id or 1
    res = await db.execute(select(Institution).where(Institution.id == target_id))
    inst = res.scalar_one_or_none()
    if not inst:
        res_any = await db.execute(select(Institution).limit(1))
        inst = res_any.scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    return {
        "id": inst.id,
        "name": inst.name,
        "code": inst.code,
        "short_name": inst.short_name or "PA",
        "tagline": inst.tagline or "Learn • Practice • Achieve",
        "institute_type": inst.institute_type or "Coaching Institute",
        "establishment_year": inst.establishment_year or 2018,
        "registration_number": inst.registration_number or "MH-COACH-2018-0157",
        "tax_id": inst.tax_id or "AABCP1234K",
        "description": inst.description or "A comprehensive coaching academy for school & competitive examinations, focused on concept clarity and student success.",
        "is_active": inst.is_active,
        "default_language": inst.default_language or "en",
        "timezone": inst.timezone or "Asia/Kolkata",
        "address": inst.address or "Vasai Road (W), Palghar - 401202",
        "city": inst.city or "Palghar",
        "state": inst.state or "Maharashtra",
        "pincode": inst.pincode or "401202",
        "phone": inst.phone or "+91 98765 43210",
        "email": inst.email or "info@prathamoneacademy.in",
        "website": inst.website or "https://prathamone.com",
        "logo_url": inst.logo_url or "/logo.svg",
        "favicon_url": inst.favicon_url or "/favicon.svg",
        "primary_color": inst.primary_color or "#1E40AF",
        "secondary_color": inst.secondary_color or "#3B82F6",
        "accent_color": inst.accent_color or "#8B5CF6",
    }


@router.put("/profile")
async def update_institute_profile(
    data: InstituteProfileUpdate,
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "principal")),
):
    target_id = institution_id or current_user.institution_id or 1
    res = await db.execute(select(Institution).where(Institution.id == target_id))
    inst = res.scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    updates = data.model_dump(exclude_unset=True)
    for field, val in updates.items():
        old_val = getattr(inst, field, None)
        setattr(inst, field, val)
        if str(old_val) != str(val):
            log = SettingAuditLog(
                institution_id=inst.id,
                setting_key=f"profile.{field}",
                category="profile",
                previous_value=str(old_val) if old_val is not None else None,
                new_value=str(val) if val is not None else None,
                changed_by_id=current_user.id,
                changed_by_name=f"{current_user.first_name} {current_user.last_name}".strip(),
                reason="Updated from Institute Settings Profile workspace",
            )
            db.add(log)

    await db.commit()
    await db.refresh(inst)
    return {
        "status": "success",
        "message": "Institute profile updated successfully",
        "profile": {
            "id": inst.id,
            "name": inst.name,
            "code": inst.code,
            "short_name": inst.short_name,
            "tagline": inst.tagline,
            "institute_type": inst.institute_type,
            "establishment_year": inst.establishment_year,
            "registration_number": inst.registration_number,
            "tax_id": inst.tax_id,
            "description": inst.description,
            "is_active": inst.is_active,
            "default_language": inst.default_language,
            "timezone": inst.timezone,
            "address": inst.address,
            "city": inst.city,
            "state": inst.state,
            "pincode": inst.pincode,
            "phone": inst.phone,
            "email": inst.email,
            "website": inst.website,
            "logo_url": inst.logo_url,
            "favicon_url": inst.favicon_url,
            "primary_color": inst.primary_color,
            "secondary_color": inst.secondary_color,
            "accent_color": inst.accent_color,
        },
    }


@router.get("/all")
async def get_all_settings(
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target_id = institution_id or current_user.institution_id or 1
    # Load stored key-values
    stmt = select(InstitutionSetting).where(InstitutionSetting.institution_id == target_id)
    result = await db.execute(stmt)
    rows = result.scalars().all()

    stored: Dict[str, Dict[str, Any]] = {}
    for r in rows:
        stored.setdefault(r.category, {})
        val = r.value
        if r.data_type == "boolean":
            val = val.lower() in ("true", "1") if val else False
        elif r.data_type == "number":
            try:
                val = float(val) if "." in val else int(val)
            except Exception:
                pass
        elif r.data_type == "json" and val:
            try:
                val = json.loads(val)
            except Exception:
                pass
        stored[r.category][r.key] = val

    # Merge stored overrides on top of DEFAULT_SETTINGS
    merged: Dict[str, Dict[str, Any]] = {}
    for cat, defs in DEFAULT_SETTINGS.items():
        merged[cat] = {**defs, **stored.get(cat, {})}

    # Include any custom categories
    for cat, custom_keys in stored.items():
        if cat not in merged:
            merged[cat] = custom_keys

    # Dynamically enrich backup/maintenance telemetry from HousekeepingService (SSOT)
    try:
        from app.services.housekeeping_service import HousekeepingService
        hk_backups = HousekeepingService.list_backups()
        verified_bks = [b for b in hk_backups if b.get("verified")]
        latest_bk = verified_bks[0] if verified_bks else (hk_backups[0] if hk_backups else None)
        hk_cfg = stored.get("housekeeping", {})
        if latest_bk:
            merged.setdefault("maintenance", {})["last_backup_date"] = latest_bk.get("created_at")
            merged["maintenance"]["backup_status"] = (
                "Verified Healthy" if latest_bk.get("verified") else "Unverified Archive Present"
            )
            merged["maintenance"]["last_backup_file"] = latest_bk.get("filename")
        else:
            merged.setdefault("maintenance", {})["last_backup_date"] = hk_cfg.get("last_backup_date")
            merged["maintenance"]["backup_status"] = hk_cfg.get("last_backup_status", "No verified backup yet")
        if hk_cfg.get("backup_destination"):
            merged.setdefault("integrations", {})["backup_destination"] = hk_cfg["backup_destination"]
        if hk_cfg.get("backup_frequency"):
            merged.setdefault("integrations", {})["backup_frequency"] = str(hk_cfg["backup_frequency"]).capitalize()
    except Exception:
        pass

    return merged


@router.put("/batch")
async def update_settings_batch(
    payload: BatchSettingsUpdate,
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "principal")),
):
    target_id = institution_id or current_user.institution_id or 1
    category = payload.category

    for k, v in payload.settings.items():
        # Determine data_type
        data_type = "string"
        serialized_val = ""
        if isinstance(v, bool):
            data_type = "boolean"
            serialized_val = "true" if v else "false"
        elif isinstance(v, (int, float)):
            data_type = "number"
            serialized_val = str(v)
        elif isinstance(v, (dict, list)):
            data_type = "json"
            serialized_val = json.dumps(v)
        else:
            serialized_val = str(v) if v is not None else ""

        # Fetch existing setting
        stmt = select(InstitutionSetting).where(
            InstitutionSetting.institution_id == target_id,
            InstitutionSetting.key == k,
        )
        existing = (await db.execute(stmt)).scalar_one_or_none()

        old_val = existing.value if existing else None
        if existing:
            existing.value = serialized_val
            existing.data_type = data_type
            existing.category = category
            existing.updated_by_id = current_user.id
        else:
            new_item = InstitutionSetting(
                institution_id=target_id,
                category=category,
                key=k,
                value=serialized_val,
                data_type=data_type,
                updated_by_id=current_user.id,
            )
            db.add(new_item)

        if old_val != serialized_val:
            audit = SettingAuditLog(
                institution_id=target_id,
                setting_key=k,
                category=category,
                previous_value=old_val,
                new_value=serialized_val,
                changed_by_id=current_user.id,
                changed_by_name=f"{current_user.first_name} {current_user.last_name}".strip(),
                reason=payload.reason or f"Updated via {category} settings panel",
            )
            db.add(audit)

    await db.commit()
    return {"status": "success", "message": f"{category.capitalize()} settings saved successfully"}


@router.get("/lookups")
async def list_lookups(
    category: Optional[str] = None,
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target_id = institution_id or current_user.institution_id or 1

    # Auto-seed lookups if table is empty
    count_stmt = select(func.count(LookupItem.id))
    item_count = (await db.execute(count_stmt)).scalar() or 0
    if item_count == 0:
        for seed in DEFAULT_LOOKUPS:
            item = LookupItem(
                institution_id=target_id,
                category=seed["category"],
                code=seed["code"],
                label=seed["label"],
                description=seed["description"],
                sort_order=seed["sort_order"],
                is_system=seed.get("is_system", True),
                is_active=True,
            )
            db.add(item)
        await db.commit()

    query = select(LookupItem).where(
        or_(LookupItem.institution_id == target_id, LookupItem.institution_id == None)
    )
    if category:
        query = query.where(LookupItem.category == category)
    query = query.order_by(LookupItem.category.asc(), LookupItem.sort_order.asc(), LookupItem.id.asc())

    result = await db.execute(query)
    items = result.scalars().all()

    # Distinct categories for selector
    cat_query = select(LookupItem.category).distinct().order_by(LookupItem.category.asc())
    categories = (await db.execute(cat_query)).scalars().all()

    return {
        "categories": categories,
        "items": [
            {
                "id": i.id,
                "category": i.category,
                "code": i.code,
                "label": i.label,
                "description": i.description,
                "sort_order": i.sort_order,
                "is_active": i.is_active,
                "is_system": i.is_system,
                "meta_data": i.meta_data,
            }
            for i in items
        ],
    }


@router.post("/lookups", status_code=status.HTTP_201_CREATED)
async def create_lookup_item(
    data: LookupItemCreate,
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "principal")),
):
    target_id = institution_id or current_user.institution_id or 1
    code_clean = data.code.strip().upper()

    # Check duplicate
    stmt = select(LookupItem).where(
        LookupItem.institution_id == target_id,
        LookupItem.category == data.category,
        LookupItem.code == code_clean,
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Lookup item with code '{code_clean}' already exists in category '{data.category}'",
        )

    item = LookupItem(
        institution_id=target_id,
        category=data.category.strip(),
        code=code_clean,
        label=data.label.strip(),
        description=data.description,
        sort_order=data.sort_order or 0,
        is_active=data.is_active if data.is_active is not None else True,
        is_system=False,
        meta_data=data.meta_data,
    )
    db.add(item)

    audit = SettingAuditLog(
        institution_id=target_id,
        setting_key=f"lookup.{data.category}.{code_clean}",
        category="lookups",
        new_value=f"Created {data.label} ({code_clean})",
        changed_by_id=current_user.id,
        changed_by_name=f"{current_user.first_name} {current_user.last_name}".strip(),
        reason=f"Added new lookup item to {data.category}",
    )
    db.add(audit)
    await db.commit()
    await db.refresh(item)
    return {"status": "success", "message": "Lookup item created", "item": {"id": item.id, "code": item.code, "label": item.label}}


@router.put("/lookups/{lookup_id}")
async def update_lookup_item(
    lookup_id: int,
    data: LookupItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "principal")),
):
    stmt = select(LookupItem).where(LookupItem.id == lookup_id)
    item = (await db.execute(stmt)).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Lookup item not found")

    updates = data.model_dump(exclude_unset=True)
    for field, val in updates.items():
        setattr(item, field, val)

    audit = SettingAuditLog(
        institution_id=item.institution_id or 1,
        setting_key=f"lookup.{item.category}.{item.code}",
        category="lookups",
        new_value=json.dumps(updates),
        changed_by_id=current_user.id,
        changed_by_name=f"{current_user.first_name} {current_user.last_name}".strip(),
        reason="Updated lookup details/status",
    )
    db.add(audit)
    await db.commit()
    await db.refresh(item)
    return {
        "status": "success",
        "message": "Lookup item updated",
        "item": {
            "id": item.id,
            "category": item.category,
            "code": item.code,
            "label": item.label,
            "description": item.description,
            "sort_order": item.sort_order,
            "is_active": item.is_active,
        },
    }


@router.delete("/lookups/{lookup_id}")
async def delete_lookup_item(
    lookup_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "principal")),
):
    stmt = select(LookupItem).where(LookupItem.id == lookup_id)
    item = (await db.execute(stmt)).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Lookup item not found")

    if item.is_system:
        # Instead of hard-deleting core system lookups, safely deactivate
        item.is_active = False
        await db.commit()
        return {"status": "success", "message": "System lookup item deactivated safely"}

    await db.delete(item)
    await db.commit()
    return {"status": "success", "message": "Lookup item deleted successfully"}


@router.get("/audit-logs")
async def list_setting_audit_logs(
    category: Optional[str] = None,
    limit: int = 50,
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "principal")),
):
    target_id = institution_id or current_user.institution_id or 1
    query = select(SettingAuditLog).where(SettingAuditLog.institution_id == target_id)
    if category:
        query = query.where(SettingAuditLog.category == category)
    query = query.order_by(SettingAuditLog.created_at.desc()).limit(limit)

    rows = (await db.execute(query)).scalars().all()
    return [
        {
            "id": r.id,
            "setting_key": r.setting_key,
            "category": r.category,
            "previous_value": r.previous_value,
            "new_value": r.new_value,
            "changed_by_name": r.changed_by_name,
            "reason": r.reason,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


@router.post("/reset-defaults")
async def reset_section_defaults(
    category: str = Query(..., description="Target category to reset to system defaults"),
    institution_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "principal")),
):
    target_id = institution_id or current_user.institution_id or 1
    if category not in DEFAULT_SETTINGS:
        raise HTTPException(status_code=400, detail=f"Unknown settings category '{category}'")

    # Delete custom overrides for this category
    del_stmt = delete(InstitutionSetting).where(
        InstitutionSetting.institution_id == target_id,
        InstitutionSetting.category == category,
    )
    await db.execute(del_stmt)

    audit = SettingAuditLog(
        institution_id=target_id,
        setting_key=f"{category}.reset",
        category=category,
        new_value="Reset to system defaults",
        changed_by_id=current_user.id,
        changed_by_name=f"{current_user.first_name} {current_user.last_name}".strip(),
        reason=f"Restored baseline defaults for {category}",
    )
    db.add(audit)
    await db.commit()
    return {
        "status": "success",
        "message": f"{category.capitalize()} settings restored to system defaults",
        "defaults": DEFAULT_SETTINGS[category],
    }
