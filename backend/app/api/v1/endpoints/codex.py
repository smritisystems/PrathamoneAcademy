# /**
#  * @file        codex.py
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
#  * @created     2026-11-06
#  * @updated     2026-11-07
#  *
#  * @description REST API endpoints for CodeX configurable feature activation, digit mapping management, and decoder access.
#  */

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, update, delete
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from datetime import datetime
import json

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.codex import (
    CodexConfig, CodexMappingProfile, CodexMappingVersion,
    CodexScopeAssignment, CodexAuditLog, CodexTemporaryToken
)
from app.services.codex_service import (
    CodeXService, validate_digit_map, encode_numeric_value, decode_coded_value
)

router = APIRouter()

# Helper authorization checker: admin, sysadmin, superadmin
def require_business_owner_or_admin(user: User) -> None:
    role = (user.role or "").lower()
    if role not in {"admin", "administrator", "sysadmin", "superadmin", "super_admin", "owner"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: CodeX administrative configuration requires Business Owner or Administrator privileges."
        )


# --- Pydantic Request & Response Schemas ---

class CodexConfigUpdateRequest(BaseModel):
    is_master_enabled: Optional[bool] = None
    feature_numeric_to_alphabet: Optional[bool] = None
    feature_alphabet_to_numeric: Optional[bool] = None
    feature_custom_alphabet_mapping: Optional[bool] = None
    feature_multiple_mapping_profiles: Optional[bool] = None
    feature_mapping_version_history: Optional[bool] = None
    feature_hide_actual_amount: Optional[bool] = None
    feature_show_actual_amount: Optional[bool] = None
    feature_show_both: Optional[bool] = None
    feature_qr_generation: Optional[bool] = None
    feature_mobile_decoder: Optional[bool] = None
    feature_offline_decoder: Optional[bool] = None
    feature_copy_share_code: Optional[bool] = None
    feature_expiry_codes: Optional[bool] = None
    feature_pin_protected_decoding: Optional[bool] = None
    app_selling_price: Optional[bool] = None
    app_purchase_cost: Optional[bool] = None
    app_salary_payroll: Optional[bool] = None
    app_commission: Optional[bool] = None
    app_discounts: Optional[bool] = None
    app_customer_specific_values: Optional[bool] = None
    app_internal_reference_values: Optional[bool] = None
    app_fee_structures: Optional[bool] = None
    security_pin: Optional[str] = None  # Raw PIN to be hashed
    decoder_expiry_seconds: Optional[int] = None
    max_decoding_attempts: Optional[int] = None


class MappingProfileCreateRequest(BaseModel):
    profile_code: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    digit_map: Dict[str, str] = Field(..., description="Mapping of '0' through '9' to unique characters")
    decimal_symbol: Optional[str] = "."
    negative_symbol: Optional[str] = "-"
    prefix: Optional[str] = "CX-"
    suffix: Optional[str] = ""
    is_default: Optional[bool] = False


class MappingProfileUpdateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    digit_map: Dict[str, str] = Field(..., description="Mapping of '0' through '9' to unique characters")
    decimal_symbol: Optional[str] = "."
    negative_symbol: Optional[str] = "-"
    prefix: Optional[str] = "CX-"
    suffix: Optional[str] = ""
    change_reason: Optional[str] = "Profile updated via CodeX Studio."
    is_default: Optional[bool] = None


class ScopeAssignmentRequest(BaseModel):
    scope_type: str = Field(..., description="'business', 'department', 'role', or 'user'")
    scope_target: str = Field(..., description="Target name or identifier, e.g. 'all', 'Finance', 'teacher', '122'")
    visibility_mode: str = Field(..., description="'hidden', 'coded_only', 'actual_only', 'both', or 'disabled'")
    allowed_modules: Optional[List[str]] = Field(default=["all"])
    can_decode: Optional[bool] = False
    can_generate_qr: Optional[bool] = False


class EncodeTestRequest(BaseModel):
    value: Any = Field(..., description="Numeric value to encode")
    profile_id: Optional[int] = None


class DecodeTestRequest(BaseModel):
    code: str = Field(..., description="Coded string to decode back to number")
    profile_id: Optional[int] = None
    version: Optional[int] = None
    pin: Optional[str] = None


class GenerateQrRequest(BaseModel):
    encoded_payload: str = Field(...)
    actual_value: Optional[float] = None
    duration_seconds: Optional[int] = 300
    requires_pin: Optional[bool] = False


# --- API Routes ---

@router.get("/config")
async def get_codex_config(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves the institution's CodeX configuration and activation state.
    MANDATORY DEFAULT: Returns is_master_enabled: False unless explicitly turned on.
    """
    institution_id = current_user.institution_id or 1
    config = await CodeXService.get_config(db, institution_id)
    default_profile = await CodeXService.get_default_profile(db, institution_id)

    # Count total active mapping profiles and scopes
    profiles_count = (await db.execute(
        select(func.count(CodexMappingProfile.id)).where(CodexMappingProfile.institution_id == institution_id)
    )).scalar() or 0

    scopes_count = (await db.execute(
        select(func.count(CodexScopeAssignment.id)).where(CodexScopeAssignment.institution_id == institution_id)
    )).scalar() or 0

    return {
        "config": {
            "id": config.id,
            "institution_id": config.institution_id,
            "is_master_enabled": config.is_master_enabled,
            "feature_numeric_to_alphabet": config.feature_numeric_to_alphabet,
            "feature_alphabet_to_numeric": config.feature_alphabet_to_numeric,
            "feature_custom_alphabet_mapping": config.feature_custom_alphabet_mapping,
            "feature_multiple_mapping_profiles": config.feature_multiple_mapping_profiles,
            "feature_mapping_version_history": config.feature_mapping_version_history,
            "feature_hide_actual_amount": config.feature_hide_actual_amount,
            "feature_show_actual_amount": config.feature_show_actual_amount,
            "feature_show_both": config.feature_show_both,
            "feature_qr_generation": config.feature_qr_generation,
            "feature_mobile_decoder": config.feature_mobile_decoder,
            "feature_offline_decoder": config.feature_offline_decoder,
            "feature_copy_share_code": config.feature_copy_share_code,
            "feature_expiry_codes": config.feature_expiry_codes,
            "feature_pin_protected_decoding": config.feature_pin_protected_decoding,
            "app_selling_price": config.app_selling_price,
            "app_purchase_cost": config.app_purchase_cost,
            "app_salary_payroll": config.app_salary_payroll,
            "app_commission": config.app_commission,
            "app_discounts": config.app_discounts,
            "app_customer_specific_values": config.app_customer_specific_values,
            "app_internal_reference_values": config.app_internal_reference_values,
            "app_fee_structures": config.app_fee_structures,
            "has_security_pin": bool(config.security_pin_hash),
            "decoder_expiry_seconds": config.decoder_expiry_seconds,
            "max_decoding_attempts": config.max_decoding_attempts,
            "updated_at": config.updated_at.isoformat() if config.updated_at else None,
        },
        "default_profile": {
            "id": default_profile.id,
            "name": default_profile.name,
            "profile_code": default_profile.profile_code,
            "version": default_profile.version,
            "prefix": default_profile.prefix,
            "digit_map": json.loads(default_profile.digit_map),
        },
        "stats": {
            "profiles_count": profiles_count,
            "scopes_count": scopes_count,
        }
    }


@router.put("/config")
async def update_codex_config(
    payload: CodexConfigUpdateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Updates the master switch, feature options, and decoder security settings.
    Restricted to Business Owners and Administrators.
    """
    require_business_owner_or_admin(current_user)
    institution_id = current_user.institution_id or 1
    config = await CodeXService.get_config(db, institution_id)

    updates_applied = {}
    for field, val in payload.model_dump(exclude_unset=True).items():
        if field == "security_pin":
            if val:
                config.security_pin_hash = CodeXService.hash_pin(val)
                updates_applied["security_pin_hash"] = "UPDATED"
            elif val == "":
                config.security_pin_hash = None
                updates_applied["security_pin_hash"] = "REMOVED"
        elif hasattr(config, field):
            setattr(config, field, val)
            updates_applied[field] = val

    config.updated_by_id = current_user.id
    config.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(config)

    # Audit logging
    await CodeXService.log_audit(
        db=db,
        institution_id=institution_id,
        action="update_config",
        entity_type="codex_config",
        details=updates_applied,
        user=current_user,
        ip_address=request.client.host if request.client else None,
    )

    return {"message": "CodeX configuration updated successfully.", "config": {
        "is_master_enabled": config.is_master_enabled,
        "updated_at": config.updated_at.isoformat(),
    }}


@router.get("/profiles")
async def list_mapping_profiles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists all digit-to-symbol mapping profiles for the institution.
    """
    institution_id = current_user.institution_id or 1
    # Ensure default exists
    await CodeXService.get_default_profile(db, institution_id)

    stmt = select(CodexMappingProfile).where(
        CodexMappingProfile.institution_id == institution_id
    ).order_by(CodexMappingProfile.is_default.desc(), CodexMappingProfile.id.asc())
    res = await db.execute(stmt)
    profiles = res.scalars().all()

    return [
        {
            "id": p.id,
            "profile_code": p.profile_code,
            "name": p.name,
            "description": p.description,
            "version": p.version,
            "digit_map": json.loads(p.digit_map),
            "decimal_symbol": p.decimal_symbol,
            "negative_symbol": p.negative_symbol,
            "prefix": p.prefix,
            "suffix": p.suffix,
            "is_active": p.is_active,
            "is_default": p.is_default,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        }
        for p in profiles
    ]


@router.post("/profiles")
async def create_mapping_profile(
    payload: MappingProfileCreateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Creates a new custom digit-to-symbol mapping profile.
    """
    require_business_owner_or_admin(current_user)
    institution_id = current_user.institution_id or 1

    valid, err = validate_digit_map(payload.digit_map)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)

    # Check duplicate code
    existing = (await db.execute(
        select(CodexMappingProfile).where(
            CodexMappingProfile.institution_id == institution_id,
            CodexMappingProfile.profile_code == payload.profile_code.upper()
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mapping profile with code '{payload.profile_code}' already exists."
        )

    profile = CodexMappingProfile(
        institution_id=institution_id,
        profile_code=payload.profile_code.upper(),
        name=payload.name,
        description=payload.description,
        version=1,
        digit_map=json.dumps(payload.digit_map),
        decimal_symbol=payload.decimal_symbol or ".",
        negative_symbol=payload.negative_symbol or "-",
        prefix=payload.prefix or "",
        suffix=payload.suffix or "",
        is_active=True,
        is_default=bool(payload.is_default),
        created_by_id=current_user.id,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)

    # Save version 1 snapshot
    v1 = CodexMappingVersion(
        profile_id=profile.id,
        version=1,
        digit_map=profile.digit_map,
        decimal_symbol=profile.decimal_symbol,
        negative_symbol=profile.negative_symbol,
        prefix=profile.prefix,
        suffix=profile.suffix,
        change_reason="Profile created.",
        created_by_id=current_user.id,
    )
    db.add(v1)
    await db.commit()

    await CodeXService.log_audit(
        db=db,
        institution_id=institution_id,
        action="create_profile",
        entity_type="codex_mapping_profile",
        entity_id=str(profile.id),
        details={"name": profile.name, "code": profile.profile_code},
        user=current_user,
        ip_address=request.client.host if request.client else None,
    )

    return {"message": "Mapping profile created successfully.", "id": profile.id}


@router.put("/profiles/{profile_id}")
async def update_mapping_profile(
    profile_id: int,
    payload: MappingProfileUpdateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Updates a mapping profile and increments its immutable version snapshot.
    """
    require_business_owner_or_admin(current_user)
    institution_id = current_user.institution_id or 1

    try:
        profile = await CodeXService.update_mapping_profile(
            db=db,
            profile_id=profile_id,
            name=payload.name,
            digit_map=payload.digit_map,
            decimal_symbol=payload.decimal_symbol,
            negative_symbol=payload.negative_symbol,
            prefix=payload.prefix,
            suffix=payload.suffix,
            change_reason=payload.change_reason,
            user_id=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    await CodeXService.log_audit(
        db=db,
        institution_id=institution_id,
        action="update_profile",
        entity_type="codex_mapping_profile",
        entity_id=str(profile.id),
        details={"version": profile.version, "reason": payload.change_reason},
        user=current_user,
        ip_address=request.client.host if request.client else None,
    )

    return {"message": f"Profile updated to version {profile.version}.", "version": profile.version}


@router.get("/profiles/{profile_id}/versions")
async def get_profile_version_history(
    profile_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves the complete immutable version history for a profile.
    """
    stmt = select(CodexMappingVersion).where(
        CodexMappingVersion.profile_id == profile_id
    ).order_by(desc(CodexMappingVersion.version))
    res = await db.execute(stmt)
    versions = res.scalars().all()

    return [
        {
            "id": v.id,
            "version": v.version,
            "digit_map": json.loads(v.digit_map),
            "decimal_symbol": v.decimal_symbol,
            "negative_symbol": v.negative_symbol,
            "prefix": v.prefix,
            "suffix": v.suffix,
            "change_reason": v.change_reason,
            "created_at": v.created_at.isoformat(),
        }
        for v in versions
    ]


@router.post("/profiles/{profile_id}/rollback/{target_version}")
async def rollback_profile(
    profile_id: int,
    target_version: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Rolls back a profile to a previous version snapshot.
    """
    require_business_owner_or_admin(current_user)
    institution_id = current_user.institution_id or 1

    try:
        profile = await CodeXService.rollback_profile_version(
            db=db,
            profile_id=profile_id,
            target_version=target_version,
            user_id=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    await CodeXService.log_audit(
        db=db,
        institution_id=institution_id,
        action="rollback_profile",
        entity_type="codex_mapping_profile",
        entity_id=str(profile.id),
        details={"restored_version": target_version, "new_version": profile.version},
        user=current_user,
        ip_address=request.client.host if request.client else None,
    )

    return {"message": f"Successfully rolled back to version {target_version}. New active version: {profile.version}."}


@router.get("/scopes")
async def list_scope_assignments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists all scope assignments (business, department, role, user) for the institution.
    """
    institution_id = current_user.institution_id or 1
    stmt = select(CodexScopeAssignment).where(
        CodexScopeAssignment.institution_id == institution_id
    ).order_by(CodexScopeAssignment.id.asc())
    res = await db.execute(stmt)
    scopes = res.scalars().all()

    return [
        {
            "id": s.id,
            "scope_type": s.scope_type,
            "scope_target": s.scope_target,
            "visibility_mode": s.visibility_mode,
            "allowed_modules": json.loads(s.allowed_modules or "[]"),
            "can_decode": s.can_decode,
            "can_generate_qr": s.can_generate_qr,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        }
        for s in scopes
    ]


@router.post("/scopes")
async def upsert_scope_assignment(
    payload: ScopeAssignmentRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Creates or updates a scope assignment for business, department, role, or user.
    """
    require_business_owner_or_admin(current_user)
    institution_id = current_user.institution_id or 1

    # Check existing scope matching type and target
    stmt = select(CodexScopeAssignment).where(
        CodexScopeAssignment.institution_id == institution_id,
        CodexScopeAssignment.scope_type == payload.scope_type,
        CodexScopeAssignment.scope_target == payload.scope_target,
    )
    res = await db.execute(stmt)
    scope = res.scalar_one_or_none()

    if not scope:
        scope = CodexScopeAssignment(
            institution_id=institution_id,
            scope_type=payload.scope_type,
            scope_target=payload.scope_target,
            visibility_mode=payload.visibility_mode,
            allowed_modules=json.dumps(payload.allowed_modules or ["all"]),
            can_decode=bool(payload.can_decode),
            can_generate_qr=bool(payload.can_generate_qr),
        )
        db.add(scope)
    else:
        scope.visibility_mode = payload.visibility_mode
        scope.allowed_modules = json.dumps(payload.allowed_modules or ["all"])
        scope.can_decode = bool(payload.can_decode)
        scope.can_generate_qr = bool(payload.can_generate_qr)
        scope.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(scope)

    await CodeXService.log_audit(
        db=db,
        institution_id=institution_id,
        action="save_scope",
        entity_type="codex_scope_assignment",
        entity_id=str(scope.id),
        details={"type": scope.scope_type, "target": scope.scope_target, "mode": scope.visibility_mode},
        user=current_user,
        ip_address=request.client.host if request.client else None,
    )

    return {"message": "Scope assignment saved successfully.", "id": scope.id}


@router.delete("/scopes/{scope_id}")
async def delete_scope_assignment(
    scope_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Deletes a scope assignment.
    """
    require_business_owner_or_admin(current_user)
    institution_id = current_user.institution_id or 1

    stmt = select(CodexScopeAssignment).where(
        CodexScopeAssignment.id == scope_id,
        CodexScopeAssignment.institution_id == institution_id
    )
    res = await db.execute(stmt)
    scope = res.scalar_one_or_none()
    if not scope:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scope assignment not found.")

    await db.delete(scope)
    await db.commit()

    await CodeXService.log_audit(
        db=db,
        institution_id=institution_id,
        action="delete_scope",
        entity_type="codex_scope_assignment",
        entity_id=str(scope_id),
        details={"target": scope.scope_target, "type": scope.scope_type},
        user=current_user,
        ip_address=request.client.host if request.client else None,
    )

    return {"message": "Scope assignment deleted successfully."}


@router.post("/encode")
async def test_encode_value(
    payload: EncodeTestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Encodes a numeric value using the selected or default mapping profile.
    Accessible for authorized testing and verification.
    """
    institution_id = current_user.institution_id or 1
    if payload.profile_id:
        stmt = select(CodexMappingProfile).where(
            CodexMappingProfile.id == payload.profile_id,
            CodexMappingProfile.institution_id == institution_id
        )
        res = await db.execute(stmt)
        profile = res.scalar_one_or_none()
    else:
        profile = await CodeXService.get_default_profile(db, institution_id)

    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mapping profile not found.")

    digit_map = json.loads(profile.digit_map)
    encoded = encode_numeric_value(
        value=payload.value,
        digit_map=digit_map,
        prefix=profile.prefix,
        suffix=profile.suffix,
        decimal_symbol=profile.decimal_symbol,
        negative_symbol=profile.negative_symbol,
    )

    return {
        "raw_value": payload.value,
        "encoded_value": encoded,
        "profile_id": profile.id,
        "profile_code": profile.profile_code,
        "version": profile.version,
    }


@router.post("/decode")
async def test_decode_value(
    payload: DecodeTestRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Decodes an encoded string back to its original numeric value.
    Enforces scope permissions, PIN verification (if enabled), and security audit logging.
    """
    institution_id = current_user.institution_id or 1
    config = await CodeXService.get_config(db, institution_id)
    lockout_key = f"{institution_id}:{current_user.id}"

    # 1. Enforce brute-force lockout prevention
    is_locked, remaining_secs = CodeXService.get_lockout_status(lockout_key)
    if is_locked:
        await CodeXService.log_audit(
            db=db,
            institution_id=institution_id,
            action="decode_locked",
            entity_type="code",
            details={"code": payload.code, "remaining_seconds": remaining_secs},
            user=current_user,
            status="locked",
            ip_address=request.client.host if request.client else None,
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Decoder locked due to repeated invalid PIN attempts. Try again in {remaining_secs} seconds."
        )

    # 2. Strict Permission Governance — explicit can_decode permission required
    # When CodeX is active, strict scope resolution applies (no blanket admin bypass).
    # When CodeX is disabled (System Default: OFF), only administrators in CodeX Studio sandbox may test-decode.
    scope_res = await CodeXService.resolve_scope(db, institution_id, current_user)
    is_admin = (current_user.role or "").lower() in {"admin", "sysadmin", "superadmin", "owner"}
    can_decode = scope_res.get("can_decode", False)
    if not config.is_master_enabled and is_admin:
        can_decode = True

    if not can_decode:
        await CodeXService.log_audit(
            db=db,
            institution_id=institution_id,
            action="decode_denied",
            entity_type="code",
            details={"code": payload.code, "reason": "User scope does not permit decoding."},
            user=current_user,
            status="unauthorized",
            ip_address=request.client.host if request.client else None,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are not authorized to decode CodeX protected values."
        )

    # 3. Server-side PIN Verification with Brute-Force Rate Limiting
    if config.feature_pin_protected_decoding and config.security_pin_hash:
        if not payload.pin:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="PIN required: CodeX decoding is protected by security PIN."
            )
        if not CodeXService.verify_pin(payload.pin, config.security_pin_hash):
            max_attempts = config.max_decoding_attempts or 5
            lockout_secs = config.decoder_expiry_seconds or 300
            remaining, is_now_locked, lock_dur = CodeXService.record_failed_attempt(
                lockout_key, max_attempts=max_attempts, lockout_seconds=lockout_secs
            )
            await CodeXService.log_audit(
                db=db,
                institution_id=institution_id,
                action="decode_pin_failure",
                entity_type="code",
                details={"code": payload.code, "attempts_remaining": remaining, "is_locked": is_now_locked},
                user=current_user,
                status="failure",
                ip_address=request.client.host if request.client else None,
            )
            if is_now_locked:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Invalid PIN. Maximum attempts ({max_attempts}) exceeded. Decoder locked for {lock_dur} seconds."
                )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid CodeX security PIN. {remaining} attempt(s) remaining before temporary lockout."
            )
        else:
            # Valid PIN verified -> Reset failed attempt counter
            CodeXService.reset_failed_attempts(lockout_key)

    # Fetch mapping profile or historical version
    if payload.profile_id:
        stmt = select(CodexMappingProfile).where(
            CodexMappingProfile.id == payload.profile_id,
            CodexMappingProfile.institution_id == institution_id
        )
        res = await db.execute(stmt)
        profile = res.scalar_one_or_none()
    else:
        profile = await CodeXService.get_default_profile(db, institution_id)

    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mapping profile not found.")

    # Historical version check if requested
    digit_map = json.loads(profile.digit_map)
    prefix = profile.prefix
    suffix = profile.suffix
    decimal_sym = profile.decimal_symbol
    negative_sym = profile.negative_symbol

    if payload.version and payload.version != profile.version:
        stmt_ver = select(CodexMappingVersion).where(
            CodexMappingVersion.profile_id == profile.id,
            CodexMappingVersion.version == payload.version
        )
        ver_res = await db.execute(stmt_ver)
        ver_snap = ver_res.scalar_one_or_none()
        if ver_snap:
            digit_map = json.loads(ver_snap.digit_map)
            prefix = ver_snap.prefix
            suffix = ver_snap.suffix
            decimal_sym = ver_snap.decimal_symbol
            negative_sym = ver_snap.negative_symbol

    decoded_num, err = decode_coded_value(
        coded_str=payload.code,
        digit_map=digit_map,
        prefix=prefix,
        suffix=suffix,
        decimal_symbol=decimal_sym,
        negative_symbol=negative_sym,
    )

    if err:
        await CodeXService.log_audit(
            db=db,
            institution_id=institution_id,
            action="decode_error",
            entity_type="code",
            details={"code": payload.code, "error": err},
            user=current_user,
            status="error",
            ip_address=request.client.host if request.client else None,
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)

    # Audit success without logging sensitive decoded values or secrets
    await CodeXService.log_audit(
        db=db,
        institution_id=institution_id,
        action="decode_success",
        entity_type="code",
        details={
            "code": payload.code,
            "profile_id": profile.id,
            "version_used": payload.version or profile.version,
            "visibility_mode": scope_res.get("visibility_mode"),
        },
        user=current_user,
        status="success",
        ip_address=request.client.host if request.client else None,
    )

    return {
        "code": payload.code,
        "decoded_value": decoded_num,
        "formatted_value": f"₹ {decoded_num:,.2f}" if isinstance(decoded_num, float) else f"₹ {decoded_num:,}",
        "profile_id": profile.id,
        "version_used": payload.version or profile.version,
    }


@router.post("/generate-qr")
async def generate_qr_payload(
    payload: GenerateQrRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Issues an ephemeral token for QR code distribution and mobile decoding.
    """
    institution_id = current_user.institution_id or 1
    token_record = await CodeXService.create_temporary_token(
        db=db,
        institution_id=institution_id,
        encoded_payload=payload.encoded_payload,
        actual_val=payload.actual_value,
        duration_seconds=payload.duration_seconds or 300,
        requires_pin=bool(payload.requires_pin),
        user_id=current_user.id,
    )

    return {
        "token": token_record.token,
        "encoded_payload": token_record.encoded_payload,
        "expires_at": token_record.expires_at.isoformat(),
        "requires_pin": token_record.requires_pin,
        "qr_data": f"CODEX:{token_record.token}:{token_record.encoded_payload}",
    }


@router.get("/audit-logs")
async def get_codex_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    action: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves the security audit logs for CodeX events.
    """
    require_business_owner_or_admin(current_user)
    institution_id = current_user.institution_id or 1

    query = select(CodexAuditLog).where(CodexAuditLog.institution_id == institution_id)
    if action:
        query = query.where(CodexAuditLog.action == action)
    if search:
        query = query.where(
            or_(
                CodexAuditLog.user_name.ilike(f"%{search}%"),
                CodexAuditLog.details.ilike(f"%{search}%"),
                CodexAuditLog.action.ilike(f"%{search}%"),
            )
        )

    query = query.order_by(desc(CodexAuditLog.created_at)).limit(limit)
    res = await db.execute(query)
    logs = res.scalars().all()

    return [
        {
            "id": l.id,
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "user_name": l.user_name,
            "status": l.status,
            "details": json.loads(l.details) if l.details else None,
            "ip_address": l.ip_address,
            "created_at": l.created_at.isoformat(),
        }
        for l in logs
    ]


@router.get("/user-status")
async def get_user_codex_status(
    module: str = Query("general"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns the resolved CodeX visibility mode and decoding capability for the requesting user.
    """
    institution_id = current_user.institution_id or 1
    scope_res = await CodeXService.resolve_scope(db, institution_id, current_user, module=module)
    return scope_res

