# /**
#  * @file        codex_service.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.services
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
#  * @description Comprehensive domain service for CodeX configurable feature activation, digit-to-symbol encoding, and scope precedence resolution.
#  */

import hashlib
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, desc, and_, or_

from app.core.config import settings
from app.models.codex import (
    CodexConfig, CodexMappingProfile, CodexMappingVersion,
    CodexScopeAssignment, CodexAuditLog, CodexTemporaryToken
)
from app.models.user import User
from app.models.staff import StaffProfile

# Authoritative baseline default digit-to-symbol bijective mapping
DEFAULT_DIGIT_MAP: Dict[str, str] = {
    "0": "Q",
    "1": "A",
    "2": "Z",
    "3": "M",
    "4": "K",
    "5": "P",
    "6": "X",
    "7": "B",
    "8": "T",
    "9": "R",
}


def validate_digit_map(digit_map: Dict[str, str]) -> Tuple[bool, Optional[str]]:
    """
    Validates that a mapping dictionary has exactly 10 distinct, valid single symbols
    for digits '0' through '9'. Enforces bijectivity.
    """
    if not isinstance(digit_map, dict):
        return False, "Mapping must be a valid JSON dictionary."
    
    expected_digits = {"0", "1", "2", "3", "4", "5", "6", "7", "8", "9"}
    if set(digit_map.keys()) != expected_digits:
        missing = expected_digits - set(digit_map.keys())
        extra = set(digit_map.keys()) - expected_digits
        return False, f"Mapping keys must be digits 0-9. Missing: {missing}, Extra: {extra}"

    symbols = [str(v).strip().upper() for v in digit_map.values()]
    
    # Check for empty symbols
    for digit, sym in digit_map.items():
        if not sym or len(str(sym).strip()) == 0:
            return False, f"Digit '{digit}' has an empty symbol mapping."
        if len(str(sym).strip()) > 2:
            return False, f"Symbol for digit '{digit}' must be at most 2 characters (preferred 1 character)."

    # Enforce bijective uniqueness
    if len(set(symbols)) != 10:
        duplicates = [s for s in symbols if symbols.count(s) > 1]
        return False, f"Mapping symbols must be unique. Duplicated symbols: {list(set(duplicates))}"

    return True, None


def encode_numeric_value(
    value: Any,
    digit_map: Dict[str, str],
    prefix: str = "CX-",
    suffix: str = "",
    decimal_symbol: str = ".",
    negative_symbol: str = "-",
) -> str:
    """
    Encodes any numeric value into its mapped alphabet representation.
    Supports negative values, decimals, and optional prefix/suffix.
    Example: 1250 -> 'CX-AZPQ'
    """
    if value is None:
        return ""

    val_str = str(value).strip().replace(",", "")
    is_negative = val_str.startswith("-")
    if is_negative:
        val_str = val_str[1:]

    parts = val_str.split(".")
    integer_part = parts[0]
    decimal_part = parts[1] if len(parts) > 1 else None

    # Map integer digits
    encoded_int = "".join(digit_map.get(d, d) for d in integer_part if d.isdigit())

    # Map decimal digits if present
    if decimal_part is not None:
        encoded_dec = "".join(digit_map.get(d, d) for d in decimal_part if d.isdigit())
        encoded_core = f"{encoded_int}{decimal_symbol}{encoded_dec}"
    else:
        encoded_core = encoded_int

    result = f"{prefix}{encoded_core}{suffix}"
    if is_negative:
        result = f"{negative_symbol}{result}"

    return result


def decode_coded_value(
    coded_str: str,
    digit_map: Dict[str, str],
    prefix: str = "CX-",
    suffix: str = "",
    decimal_symbol: str = ".",
    negative_symbol: str = "-",
) -> Tuple[Optional[float], Optional[str]]:
    """
    Reverses an encoded alphabet code back to its original numeric representation.
    Example: 'CX-AZPQ' -> 1250.0
    """
    if not coded_str or not isinstance(coded_str, str):
        return None, "Invalid or empty code string."

    s = coded_str.strip()

    is_negative = False
    if s.startswith(negative_symbol):
        is_negative = True
        s = s[len(negative_symbol):]

    if prefix and s.startswith(prefix):
        s = s[len(prefix):]
    if suffix and s.endswith(suffix):
        s = s[:-len(suffix)]

    # Invert mapping: Symbol -> Digit
    inverted_map = {str(sym).strip().upper(): digit for digit, sym in digit_map.items()}

    parts = s.split(decimal_symbol)
    int_str = parts[0]
    dec_str = parts[1] if len(parts) > 1 else None

    # Decode integer part
    decoded_int_chars = []
    i = 0
    int_upper = int_str.upper()
    while i < len(int_upper):
        # Try 2-char symbol first
        matched = False
        if i + 2 <= len(int_upper) and int_upper[i:i+2] in inverted_map:
            decoded_int_chars.append(inverted_map[int_upper[i:i+2]])
            i += 2
            matched = True
        elif int_upper[i:i+1] in inverted_map:
            decoded_int_chars.append(inverted_map[int_upper[i:i+1]])
            i += 1
            matched = True
        
        if not matched:
            return None, f"Unrecognized symbol '{int_upper[i]}' in code."

    decoded_int = "".join(decoded_int_chars) or "0"

    # Decode decimal part if present
    if dec_str is not None:
        decoded_dec_chars = []
        j = 0
        dec_upper = dec_str.upper()
        while j < len(dec_upper):
            matched = False
            if j + 2 <= len(dec_upper) and dec_upper[j:j+2] in inverted_map:
                decoded_dec_chars.append(inverted_map[dec_upper[j:j+2]])
                j += 2
                matched = True
            elif dec_upper[j:j+1] in inverted_map:
                decoded_dec_chars.append(inverted_map[dec_upper[j:j+1]])
                j += 1
                matched = True
            if not matched:
                return None, f"Unrecognized decimal symbol '{dec_upper[j]}' in code."
        decoded_numeric_str = f"{decoded_int}.{''.join(decoded_dec_chars)}"
    else:
        decoded_numeric_str = decoded_int

    try:
        final_val = float(decoded_numeric_str)
        if is_negative:
            final_val = -final_val
        return final_val, None
    except ValueError:
        return None, f"Failed to parse numeric value from reconstructed string '{decoded_numeric_str}'."


class CodeXService:
    @staticmethod
    async def get_config(db: AsyncSession, institution_id: int) -> CodexConfig:
        """
        Retrieves or initializes the institution's CodeX configuration.
        MANDATORY SYSTEM DEFAULT: is_master_enabled is always initialized to FALSE.
        """
        stmt = select(CodexConfig).where(CodexConfig.institution_id == institution_id)
        res = await db.execute(stmt)
        config = res.scalar_one_or_none()
        if not config:
            config = CodexConfig(
                institution_id=institution_id,
                is_master_enabled=False,  # MANDATORY DEFAULT: DISABLED
                feature_numeric_to_alphabet=False,
                feature_alphabet_to_numeric=False,
                feature_custom_alphabet_mapping=False,
                feature_multiple_mapping_profiles=False,
                feature_mapping_version_history=False,
                feature_hide_actual_amount=False,
                feature_show_actual_amount=True,
                feature_show_both=False,
                feature_qr_generation=False,
                feature_mobile_decoder=False,
                feature_offline_decoder=False,
                feature_copy_share_code=False,
                feature_expiry_codes=False,
                feature_pin_protected_decoding=False,
                app_selling_price=False,
                app_purchase_cost=False,
                app_salary_payroll=False,
                app_commission=False,
                app_discounts=False,
                app_customer_specific_values=False,
                app_internal_reference_values=False,
                app_fee_structures=False,
                decoder_expiry_seconds=300,
                max_decoding_attempts=5,
            )
            db.add(config)
            await db.commit()
            await db.refresh(config)
        return config

    @staticmethod
    async def get_default_profile(db: AsyncSession, institution_id: int) -> CodexMappingProfile:
        """
        Retrieves or creates the primary bijective mapping profile for the institution.
        """
        stmt = select(CodexMappingProfile).where(
            CodexMappingProfile.institution_id == institution_id,
            CodexMappingProfile.is_default == True,
            CodexMappingProfile.is_active == True,
        )
        res = await db.execute(stmt)
        profile = res.scalar_one_or_none()

        if not profile:
            # Fallback to any active profile
            stmt_any = select(CodexMappingProfile).where(
                CodexMappingProfile.institution_id == institution_id,
                CodexMappingProfile.is_active == True,
            ).order_by(CodexMappingProfile.id.asc())
            res_any = await db.execute(stmt_any)
            profile = res_any.scalar_one_or_none()

        if not profile:
            # Initialize default baseline profile
            profile = CodexMappingProfile(
                institution_id=institution_id,
                profile_code="DEFAULT",
                name="Standard AITDL CodeX Alphabet",
                description="Default 0-9 bijective alphabet mapping profile for PrathamOne EduOS.",
                version=1,
                digit_map=json.dumps(DEFAULT_DIGIT_MAP),
                decimal_symbol=".",
                negative_symbol="-",
                prefix="CX-",
                suffix="",
                is_active=True,
                is_default=True,
            )
            db.add(profile)
            await db.commit()
            await db.refresh(profile)

            # Store version 1 snapshot
            v1 = CodexMappingVersion(
                profile_id=profile.id,
                version=1,
                digit_map=profile.digit_map,
                decimal_symbol=profile.decimal_symbol,
                negative_symbol=profile.negative_symbol,
                prefix=profile.prefix,
                suffix=profile.suffix,
                change_reason="Initial system baseline mapping profile.",
            )
            db.add(v1)
            await db.commit()

        return profile

    @staticmethod
    async def update_mapping_profile(
        db: AsyncSession,
        profile_id: int,
        name: str,
        digit_map: Dict[str, str],
        decimal_symbol: str,
        negative_symbol: str,
        prefix: str,
        suffix: str,
        change_reason: str,
        user_id: Optional[int] = None,
    ) -> CodexMappingProfile:
        """
        Updates a mapping profile and creates an immutable version snapshot.
        Preserves backward compatibility for historical decode operations.
        """
        valid, err = validate_digit_map(digit_map)
        if not valid:
            raise ValueError(err)

        stmt = select(CodexMappingProfile).where(CodexMappingProfile.id == profile_id)
        res = await db.execute(stmt)
        profile = res.scalar_one_or_none()
        if not profile:
            raise ValueError(f"Mapping profile with ID {profile_id} not found.")

        # Increment version
        new_version = profile.version + 1
        profile.name = name
        profile.version = new_version
        profile.digit_map = json.dumps(digit_map)
        profile.decimal_symbol = decimal_symbol or "."
        profile.negative_symbol = negative_symbol or "-"
        profile.prefix = prefix or ""
        profile.suffix = suffix or ""
        profile.updated_at = datetime.now(timezone.utc)

        # Create historical snapshot
        version_record = CodexMappingVersion(
            profile_id=profile.id,
            version=new_version,
            digit_map=profile.digit_map,
            decimal_symbol=profile.decimal_symbol,
            negative_symbol=profile.negative_symbol,
            prefix=profile.prefix,
            suffix=profile.suffix,
            change_reason=change_reason or f"Updated mapping profile to version {new_version}.",
            created_by_id=user_id,
        )
        db.add(version_record)
        await db.commit()
        await db.refresh(profile)
        return profile

    @staticmethod
    async def rollback_profile_version(
        db: AsyncSession,
        profile_id: int,
        target_version: int,
        user_id: Optional[int] = None,
    ) -> CodexMappingProfile:
        """
        Rolls back a mapping profile to a previous version snapshot while maintaining version audit trail.
        """
        stmt = select(CodexMappingVersion).where(
            CodexMappingVersion.profile_id == profile_id,
            CodexMappingVersion.version == target_version,
        )
        res = await db.execute(stmt)
        snapshot = res.scalar_one_or_none()
        if not snapshot:
            raise ValueError(f"Version {target_version} for profile {profile_id} not found.")

        target_digit_map = json.loads(snapshot.digit_map)
        return await CodeXService.update_mapping_profile(
            db=db,
            profile_id=profile_id,
            name=f"Profile (Restored v{target_version})",
            digit_map=target_digit_map,
            decimal_symbol=snapshot.decimal_symbol,
            negative_symbol=snapshot.negative_symbol,
            prefix=snapshot.prefix,
            suffix=snapshot.suffix,
            change_reason=f"Administrative rollback to version {target_version}.",
            user_id=user_id,
        )

    @staticmethod
    async def resolve_scope(
        db: AsyncSession,
        institution_id: int,
        user: Optional[User],
        module: str = "general",
    ) -> Dict[str, Any]:
        """
        Resolves CodeX activation and visibility mode based on strict precedence rules:
        1. Mandatory Security Restrictions & System Default
        2. Business Configuration (is_master_enabled)
        3. Department Override (from StaffProfile)
        4. Role Override
        5. User Override
        A more restrictive rule always overrides a permissive one.
        """
        # Step 1: System Default Policy & Master Business Config
        config = await CodeXService.get_config(db, institution_id)
        if not config.is_master_enabled:
            return {
                "is_enabled": False,
                "visibility_mode": "actual_only",
                "can_decode": False,
                "can_generate_qr": False,
                "allowed_modules": [],
                "reason": "CodeX is DISABLED for this business (System Default: OFF).",
            }

        # If user is not authenticated, fallback to default restrictive actual_only
        if not user:
            return {
                "is_enabled": False,
                "visibility_mode": "actual_only",
                "can_decode": False,
                "can_generate_qr": False,
                "allowed_modules": [],
                "reason": "Unauthenticated access.",
            }

        # Step 2: Fetch all scope assignments for this institution
        stmt = select(CodexScopeAssignment).where(CodexScopeAssignment.institution_id == institution_id)
        res = await db.execute(stmt)
        scopes = res.scalars().all()

        user_scope = next((s for s in scopes if s.scope_type == "user" and s.scope_target == str(user.id)), None)
        role_scope = next((s for s in scopes if s.scope_type == "role" and s.scope_target.lower() == user.role.lower()), None)

        # Department scope
        dept_scope = None
        stmt_staff = select(StaffProfile).where(StaffProfile.user_id == user.id)
        staff_res = await db.execute(stmt_staff)
        staff_prof = staff_res.scalar_one_or_none()
        if staff_prof and staff_prof.department:
            dept_scope = next((s for s in scopes if s.scope_type == "department" and s.scope_target.lower() == staff_prof.department.lower()), None)

        business_scope = next((s for s in scopes if s.scope_type == "business"), None)

        # Precedence evaluation: User > Role > Dept > Business
        active_scope = user_scope or role_scope or dept_scope or business_scope

        if not active_scope:
            default_mode = "actual_only"
            if config.feature_hide_actual_amount:
                default_mode = "coded_only"
            elif config.feature_show_both:
                default_mode = "both"

            return {
                "is_enabled": True,
                "visibility_mode": default_mode,
                "can_decode": True,
                "can_generate_qr": config.feature_qr_generation,
                "allowed_modules": ["all"],
                "reason": f"Default business visibility ({default_mode}).",
            }

        # Check module restriction
        allowed_mods = json.loads(active_scope.allowed_modules or "[]")
        if allowed_mods and "all" not in allowed_mods and module not in allowed_mods:
            return {
                "is_enabled": False,
                "visibility_mode": "actual_only",
                "can_decode": False,
                "can_generate_qr": False,
                "allowed_modules": allowed_mods,
                "reason": f"Module '{module}' not included in CodeX scope assignment.",
            }

        return {
            "is_enabled": active_scope.visibility_mode != "disabled",
            "visibility_mode": active_scope.visibility_mode,
            "can_decode": active_scope.can_decode,
            "can_generate_qr": active_scope.can_generate_qr,
            "allowed_modules": allowed_mods,
            "scope_applied": active_scope.scope_type,
            "reason": f"Resolved via {active_scope.scope_type} scope ({active_scope.scope_target}).",
        }

    @staticmethod
    def hash_pin(pin: str) -> str:
        """Hashes a PIN securely using SHA-256."""
        return hashlib.sha256(pin.encode("utf-8")).hexdigest()

    @staticmethod
    def verify_pin(provided_pin: str, stored_hash: Optional[str]) -> bool:
        """Verifies a plain text PIN against stored hash."""
        if not stored_hash:
            return True  # No PIN configured
        return hashlib.sha256(provided_pin.encode("utf-8")).hexdigest() == stored_hash

    @staticmethod
    async def create_temporary_token(
        db: AsyncSession,
        institution_id: int,
        encoded_payload: str,
        actual_val: Any,
        duration_seconds: int = 300,
        requires_pin: bool = False,
        user_id: Optional[int] = None,
    ) -> CodexTemporaryToken:
        """
        Creates a time-limited ephemeral token for QR code distribution and on-demand decoding.
        """
        token_str = secrets.token_urlsafe(32)
        val_hash = hashlib.sha256(str(actual_val).encode("utf-8")).hexdigest() if actual_val is not None else None
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=duration_seconds)

        token_record = CodexTemporaryToken(
            institution_id=institution_id,
            token=token_str,
            encoded_payload=encoded_payload,
            actual_value_hash=val_hash,
            expires_at=expires_at,
            requires_pin=requires_pin,
            created_by_id=user_id,
        )
        db.add(token_record)
        await db.commit()
        await db.refresh(token_record)
        return token_record

    @staticmethod
    async def log_audit(
        db: AsyncSession,
        institution_id: int,
        action: str,
        entity_type: str,
        details: Optional[Dict[str, Any]] = None,
        user: Optional[User] = None,
        entity_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        status: str = "success",
    ) -> CodexAuditLog:
        """
        Records an append-only security audit log entry for CodeX operations.
        """
        log_entry = CodexAuditLog(
            institution_id=institution_id,
            user_id=user.id if user else None,
            user_name=user.full_name if user else "System",
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=json.dumps(details) if details else None,
            ip_address=ip_address,
            user_agent=user_agent,
            status=status,
        )
        db.add(log_entry)
        await db.commit()
        return log_entry

