# /**
#  * @file        institution_profile_service.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.services
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-27
#  * @updated     2026-11-27
#  *
#  * @description Single Source of Truth validation, SVG/logo sanitization, completeness scoring,
#  */

import base64
import re
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import PRODUCT_APP_ICON_URL
from app.models.institution import Institution, InstitutionBranch
from app.models.settings import SettingAuditLog
from app.models.user import User

PLACEHOLDER_INSTITUTE_NAMES = frozenset(
    {
        "your academy name",
        "your coaching institute",
        "coaching institute",
        "prathamone academy",
    }
)
FORBIDDEN_DUMMY_PHONES = frozenset(
    {
        "+91 8779 123 007",
        "+918779123007",
        "8779123007",
        "+91 xxxxx xxxxx",
    }
)
FORBIDDEN_DUMMY_EMAILS = frozenset(
    {
        "admin@academy.edu",
        "info@prathamoneacademy.in",
    }
)
FORBIDDEN_DUMMY_ADDRESSES = frozenset(
    {
        "campus address, education hub",
        "123 education lane, school district",
        "123 education hub, mg road",
        "vasai road (w), palghar - 401202",
        "enter your institute address",
    }
)

INDIAN_STATES_AND_UTS: Dict[str, str] = {
    s.lower(): s
    for s in (
        "Andhra Pradesh",
        "Arunachal Pradesh",
        "Assam",
        "Bihar",
        "Chhattisgarh",
        "Goa",
        "Gujarat",
        "Haryana",
        "Himachal Pradesh",
        "Jharkhand",
        "Karnataka",
        "Kerala",
        "Madhya Pradesh",
        "Maharashtra",
        "Manipur",
        "Meghalaya",
        "Mizoram",
        "Nagaland",
        "Odisha",
        "Punjab",
        "Rajasthan",
        "Sikkim",
        "Tamil Nadu",
        "Telangana",
        "Tripura",
        "Uttar Pradesh",
        "Uttarakhand",
        "West Bengal",
        "Andaman and Nicobar Islands",
        "Chandigarh",
        "Dadra and Nagar Haveli and Daman and Diu",
        "Delhi",
        "Jammu and Kashmir",
        "Ladakh",
        "Lakshadweep",
        "Puducherry",
    )
}

_INDIAN_PIN_RE = re.compile(r"^[1-9][0-9]{5}$")
_INTL_POSTAL_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9\-\s]{2,11}$")
_INDIA_PHONE_RE = re.compile(r"^(?:\+91[\-\s]?)?[6-9][0-9]{9}$")
_INTL_PHONE_RE = re.compile(r"^\+[1-9][0-9\-\s]{7,16}$")
_EMAIL_RE = re.compile(r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$")
_GSTIN_RE = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")
_PAN_RE = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
_HEX_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")
_DATA_IMAGE_RE = re.compile(r"^data:(image/(?:png|jpeg|jpg|webp|svg\+xml));base64,([A-Za-z0-9+/=\s]+)$", re.IGNORECASE)
_SVG_DANGEROUS_RE = re.compile(r"(?:<script|<foreignobject|\bon[a-z]+\s*=|javascript:)", re.IGNORECASE)

_RECOMMENDED_COMPLETION_FIELDS: Tuple[Tuple[str, str], ...] = (
    ("address", "Address Line 1"),
    ("city", "City"),
    ("state", "State"),
    ("pincode", "PIN Code"),
    ("phone", "Mobile Number"),
    ("email", "Email Address"),
)


def clean_optional_str(val: Optional[str]) -> Optional[str]:
    """Normalize empty/whitespace strings to None."""
    if val is None:
        return None
    cleaned = str(val).strip()
    return cleaned or None


def is_placeholder_institute_name(name: Optional[str]) -> bool:
    """Return True if the institution name is blank or an unconfigured onboarding placeholder."""
    cleaned = (name or "").strip().lower()
    return not cleaned or cleaned in PLACEHOLDER_INSTITUTE_NAMES


def validate_institute_name(name: Optional[str], *, reject_placeholders: bool = False) -> str:
    """Validate mandatory Coaching Institute Name."""
    cleaned = clean_optional_str(name)
    if not cleaned or len(cleaned) < 2 or len(cleaned) > 200:
        raise HTTPException(
            status_code=422,
            detail="Institute name is required and must be between 2 and 200 characters.",
        )
    if reject_placeholders and cleaned.lower() in PLACEHOLDER_INSTITUTE_NAMES:
        raise HTTPException(
            status_code=422,
            detail="Please enter your real Coaching Institute Name instead of a placeholder label.",
        )
    return cleaned


def validate_phone_number(phone: Optional[str], field_label: str = "Mobile number") -> Optional[str]:
    """Validate Indian mobile (10 digits starting 6-9, optional +91) or E.164 international phone."""
    cleaned = clean_optional_str(phone)
    if cleaned is None:
        return None
    if cleaned.lower() in FORBIDDEN_DUMMY_PHONES:
        raise HTTPException(
            status_code=422,
            detail=f"{field_label} cannot use a synthetic placeholder or hardcoded default number.",
        )
    compact = re.sub(r"[\s\-()]", "", cleaned)
    if compact.startswith("+91") or (not compact.startswith("+") and compact.isdigit()):
        digits = compact[3:] if compact.startswith("+91") else compact
        if not re.fullmatch(r"[6-9][0-9]{9}", digits):
            raise HTTPException(
                status_code=422,
                detail=f"{field_label} must be a valid 10-digit Indian mobile number (starting with 6–9) or include an international +country code.",
            )
        return f"+91 {digits[:5]} {digits[5:]}" if cleaned.startswith("+91") else digits
    if not _INTL_PHONE_RE.fullmatch(compact):
        raise HTTPException(
            status_code=422,
            detail=f"{field_label} format is invalid. Use 10 digits or E.164 format (+CountryCode).",
        )
    return cleaned


def validate_pincode(pincode: Optional[str], country: Optional[str]) -> Optional[str]:
    """Validate Indian 6-digit PIN code (or postal code when non-India country is selected)."""
    cleaned = clean_optional_str(pincode)
    if cleaned is None:
        return None
    normalized_country = (country or "India").strip().lower()
    if normalized_country in ("", "india", "in"):
        if not _INDIAN_PIN_RE.fullmatch(cleaned):
            raise HTTPException(
                status_code=422,
                detail="Indian PIN Code must be exactly 6 digits and cannot start with 0.",
            )
        return cleaned
    if not _INTL_POSTAL_RE.fullmatch(cleaned):
        raise HTTPException(
            status_code=422,
            detail="Postal code must be 3 to 12 alphanumeric characters.",
        )
    return cleaned


def validate_country_and_state(country: Optional[str], state: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    """Enforce canonical Country / Indian State consistency when both are provided."""
    c_clean = clean_optional_str(country)
    s_clean = clean_optional_str(state)
    if s_clean is not None and (c_clean is None or c_clean.lower() in ("india", "in")):
        matched = INDIAN_STATES_AND_UTS.get(s_clean.lower())
        if not matched:
            raise HTTPException(
                status_code=422,
                detail=f"State '{s_clean}' is not a recognized Indian State or Union Territory.",
            )
        return (c_clean or "India"), matched
    return c_clean, s_clean


def validate_email_address(email: Optional[str], field_label: str = "Email address") -> Optional[str]:
    """Validate optional email format and reject placeholder strings."""
    cleaned = clean_optional_str(email)
    if cleaned is None:
        return None
    if cleaned.lower() in FORBIDDEN_DUMMY_EMAILS:
        raise HTTPException(status_code=422, detail=f"{field_label} cannot use a sample default address.")
    if len(cleaned) > 200 or not _EMAIL_RE.fullmatch(cleaned):
        raise HTTPException(status_code=422, detail=f"{field_label} is not a valid email address.")
    return cleaned.lower()


def validate_website_url(website: Optional[str]) -> Optional[str]:
    """Validate optional website URL and normalize scheme when safe."""
    cleaned = clean_optional_str(website)
    if cleaned is None:
        return None
    if not cleaned.lower().startswith(("http://", "https://")):
        cleaned = f"https://{cleaned}"
    if not re.fullmatch(r"https?://[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:/[^\s]*)?", cleaned):
        raise HTTPException(status_code=422, detail="Website URL must be a valid http:// or https:// address.")
    return cleaned


def validate_gstin(gstin: Optional[str]) -> Optional[str]:
    """Validate optional Indian 15-character GSTIN."""
    cleaned = clean_optional_str(gstin)
    if cleaned is None:
        return None
    upper = cleaned.upper()
    if not _GSTIN_RE.fullmatch(upper):
        raise HTTPException(status_code=422, detail="GSTIN must follow the 15-character Indian format (e.g., 27ABCDE1234F1Z5).")
    return upper


def validate_pan(pan: Optional[str]) -> Optional[str]:
    """Validate optional Indian 10-character PAN."""
    cleaned = clean_optional_str(pan)
    if cleaned is None:
        return None
    upper = cleaned.upper()
    if not _PAN_RE.fullmatch(upper):
        raise HTTPException(status_code=422, detail="PAN must follow the 10-character format (e.g., ABCDE1234F).")
    return upper


def validate_logo_url(logo_url: Optional[str]) -> Optional[str]:
    """Validate logo references: safe relative path or base64 PNG/JPEG/WEBP/sanitized SVG <= 2 MB."""
    cleaned = clean_optional_str(logo_url)
    if cleaned is None:
        return None
    if cleaned.startswith("/"):
        if ".." in cleaned or len(cleaned) > 500:
            raise HTTPException(status_code=422, detail="Invalid logo asset path.")
        return cleaned

    m = _DATA_IMAGE_RE.fullmatch(cleaned)
    if not m:
        raise HTTPException(
            status_code=422,
            detail="Logo must be a valid PNG, JPEG, WEBP, or SVG image.",
        )

    mime_type = m.group(1).lower()
    b64_payload = re.sub(r"\s+", "", m.group(2))
    try:
        raw_bytes = base64.b64decode(b64_payload, validate=True)
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Uploaded logo image is corrupted or invalid base64.") from exc

    if len(raw_bytes) > 2 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="Logo image exceeds the maximum 2 MB limit.")

    if mime_type == "image/png" and not raw_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        raise HTTPException(status_code=422, detail="Uploaded PNG signature is invalid.")
    if mime_type in ("image/jpeg", "image/jpg") and not raw_bytes.startswith(b"\xff\xd8\xff"):
        raise HTTPException(status_code=422, detail="Uploaded JPEG signature is invalid.")
    if mime_type == "image/webp" and not (raw_bytes.startswith(b"RIFF") and b"WEBP" in raw_bytes[:16]):
        raise HTTPException(status_code=422, detail="Uploaded WEBP signature is invalid.")
    if mime_type == "image/svg+xml":
        svg_text = raw_bytes.decode("utf-8", errors="ignore")
        if "<svg" not in svg_text.lower() or _SVG_DANGEROUS_RE.search(svg_text):
            raise HTTPException(
                status_code=422,
                detail="SVG logo contains unsafe scripts or event handlers and was rejected.",
            )

    return cleaned


def validate_hex_color(color: Optional[str], field_label: str) -> Optional[str]:
    """Validate hex color values."""
    cleaned = clean_optional_str(color)
    if cleaned is None:
        return None
    if not _HEX_COLOR_RE.fullmatch(cleaned):
        raise HTTPException(status_code=422, detail=f"{field_label} must be a 6-digit hex code (e.g., #0B2D6B).")
    return cleaned.upper()


def derive_monogram(name: Optional[str], short_name: Optional[str] = None) -> str:
    """Derive a non-hardcoded monogram without writing fake database records."""
    if short_name and short_name.strip():
        return short_name.strip().upper()[:12]
    if name and not is_placeholder_institute_name(name):
        parts = [p for p in name.strip().split() if p]
        if len(parts) >= 2:
            return f"{parts[0][0]}{parts[1][0]}".upper()
        if parts:
            return parts[0][:2].upper()
    return "EI"


def compute_profile_completeness(inst: Institution) -> Dict[str, Any]:
    """Evaluate profile onboarding readiness and missing optional fields."""
    is_placeholder = is_placeholder_institute_name(inst.name)
    missing = [
        label
        for attr, label in _RECOMMENDED_COMPLETION_FIELDS
        if not clean_optional_str(getattr(inst, attr, None))
    ]
    total = len(_RECOMMENDED_COMPLETION_FIELDS) + 1  # +1 for mandatory name
    filled = (0 if is_placeholder else 1) + (len(_RECOMMENDED_COMPLETION_FIELDS) - len(missing))
    completeness_pct = int(round((filled / total) * 100))
    return {
        "onboarding_completed": bool(getattr(inst, "onboarding_completed", False)) and not is_placeholder,
        "is_placeholder_profile": is_placeholder,
        "missing_recommended_fields": missing,
        "completeness_pct": completeness_pct,
    }


def serialize_branch(branch: InstitutionBranch) -> Dict[str, Any]:
    """Serialize InstitutionBranch safely for API responses."""
    return {
        "id": branch.id,
        "institution_id": branch.institution_id,
        "branch_name": branch.branch_name,
        "branch_code": branch.branch_code,
        "is_main_branch": bool(branch.is_main_branch),
        "address_line_1": branch.address_line_1,
        "address_line_2": branch.address_line_2,
        "area_locality": branch.area_locality,
        "city": branch.city,
        "district": branch.district,
        "state": branch.state,
        "pincode": branch.pincode,
        "country": branch.country,
        "phone": branch.phone,
        "alternate_phone": branch.alternate_phone,
        "email": branch.email,
        "gstin": branch.gstin,
        "is_active": bool(branch.is_active),
    }


def serialize_institution_profile(
    inst: Institution,
    branches: Optional[Iterable[InstitutionBranch]] = None,
) -> Dict[str, Any]:
    """Serialize Institution master without injecting synthetic dummy contact/legal strings."""
    branch_list = [serialize_branch(b) for b in (branches or []) if b.is_active]
    main_branch = next((b for b in branch_list if b["is_main_branch"]), branch_list[0] if branch_list else None)
    completeness = compute_profile_completeness(inst)

    return {
        "id": inst.id,
        "name": inst.name,
        "code": inst.code,
        "short_name": inst.short_name,
        "tagline": inst.tagline,
        "institute_type": inst.institute_type,
        "establishment_year": inst.establishment_year,
        "registration_number": inst.registration_number,
        "tax_id": inst.pan or inst.tax_id,
        "gstin": inst.gstin,
        "pan": inst.pan,
        "description": inst.description,
        "is_active": bool(inst.is_active),
        "default_language": inst.default_language or "en",
        "timezone": inst.timezone or "Asia/Kolkata",
        "address": inst.address,
        "address_line_1": inst.address,
        "address_line_2": inst.address_line_2,
        "area_locality": inst.area_locality,
        "city": inst.city,
        "district": inst.district,
        "state": inst.state,
        "pincode": inst.pincode,
        "country": inst.country,
        "phone": inst.phone,
        "alternate_phone": inst.alternate_phone,
        "email": inst.email,
        "website": inst.website,
        "logo_url": inst.logo_url,
        "favicon_url": inst.favicon_url or PRODUCT_APP_ICON_URL,
        "primary_color": inst.primary_color or "#0B2D6B",
        "secondary_color": inst.secondary_color or "#071C44",
        "accent_color": inst.accent_color or "#F57C00",
        "branch_name": main_branch["branch_name"] if main_branch else None,
        "branches": branch_list,
        **completeness,
    }


def record_audit_change(
    db: AsyncSession,
    *,
    institution_id: int,
    setting_key: str,
    category: str,
    old_val: Any,
    new_val: Any,
    actor: User,
    reason: str,
) -> None:
    """Append an entry to SettingAuditLog when a field value changes."""
    old_str = str(old_val) if old_val is not None else None
    new_str = str(new_val) if new_val is not None else None
    if old_str == new_str:
        return
    actor_name = f"{getattr(actor, 'first_name', '')} {getattr(actor, 'last_name', '')}".strip() or getattr(actor, "username", "admin")
    db.add(
        SettingAuditLog(
            institution_id=institution_id,
            setting_key=setting_key,
            category=category,
            previous_value=old_str,
            new_value=new_str,
            changed_by_id=getattr(actor, "id", None),
            changed_by_name=actor_name,
            reason=reason,
        )
    )


async def apply_validated_profile_updates(
    db: AsyncSession,
    inst: Institution,
    raw_updates: Dict[str, Any],
    *,
    actor: User,
    reason: str,
    mark_onboarding_complete: Optional[bool] = None,
) -> None:
    """Validate and apply partial updates to Institution + sync Main Branch + audit every delta."""
    updates = dict(raw_updates)

    # Support address_line_1 alias -> canonical inst.address
    if "address_line_1" in updates and "address" not in updates:
        updates["address"] = updates.pop("address_line_1")
    else:
        updates.pop("address_line_1", None)

    branch_name_override = clean_optional_str(updates.pop("branch_name", None)) if "branch_name" in updates else None

    country_candidate = updates.get("country", inst.country)
    state_candidate = updates.get("state", inst.state)
    if "country" in updates or "state" in updates:
        validated_country, validated_state = validate_country_and_state(country_candidate, state_candidate)
        if "country" in updates:
            updates["country"] = validated_country
        if "state" in updates:
            updates["state"] = validated_state

    if "name" in updates:
        updates["name"] = validate_institute_name(
            updates["name"],
            reject_placeholders=bool(mark_onboarding_complete),
        )
    if "short_name" in updates:
        sn = clean_optional_str(updates["short_name"])
        updates["short_name"] = sn.upper()[:12] if sn else None
    if "address" in updates:
        addr = clean_optional_str(updates["address"])
        if addr and addr.lower() in FORBIDDEN_DUMMY_ADDRESSES:
            raise HTTPException(status_code=422, detail="Address cannot use a sample placeholder value.")
        updates["address"] = addr
    for text_field in ("address_line_2", "area_locality", "city", "district", "tagline", "institute_type", "registration_number", "description"):
        if text_field in updates:
            updates[text_field] = clean_optional_str(updates[text_field])
    if "pincode" in updates:
        updates["pincode"] = validate_pincode(updates["pincode"], updates.get("country", inst.country))
    if "phone" in updates:
        updates["phone"] = validate_phone_number(updates["phone"], "Mobile number")
    if "alternate_phone" in updates:
        updates["alternate_phone"] = validate_phone_number(updates["alternate_phone"], "Alternate mobile number")
    if "email" in updates:
        updates["email"] = validate_email_address(updates["email"])
    if "website" in updates:
        updates["website"] = validate_website_url(updates["website"])
    if "gstin" in updates:
        updates["gstin"] = validate_gstin(updates["gstin"])
    if "pan" in updates:
        updates["pan"] = validate_pan(updates["pan"])
        if "tax_id" not in updates:
            updates["tax_id"] = updates["pan"]
    elif "tax_id" in updates:
        tx = clean_optional_str(updates["tax_id"])
        if tx:
            if _PAN_RE.fullmatch(tx.upper()):
                updates["pan"] = tx.upper()
                updates["tax_id"] = tx.upper()
            elif _GSTIN_RE.fullmatch(tx.upper()):
                updates["gstin"] = tx.upper()
                updates["tax_id"] = tx.upper()
            else:
                updates["tax_id"] = tx
        else:
            updates["tax_id"] = None
    if "logo_url" in updates:
        updates["logo_url"] = validate_logo_url(updates["logo_url"])
    if "favicon_url" in updates:
        updates["favicon_url"] = validate_logo_url(updates["favicon_url"])
    for color_key, label in (("primary_color", "Primary color"), ("secondary_color", "Secondary color"), ("accent_color", "Accent color")):
        if color_key in updates:
            updates[color_key] = validate_hex_color(updates[color_key], label)

    for field, val in updates.items():
        if not hasattr(inst, field):
            continue
        old_val = getattr(inst, field, None)
        setattr(inst, field, val)
        record_audit_change(
            db,
            institution_id=inst.id,
            setting_key=f"profile.{field}",
            category="profile",
            old_val=old_val,
            new_val=val,
            actor=actor,
            reason=reason,
        )

    should_complete = mark_onboarding_complete
    if should_complete is None and not is_placeholder_institute_name(inst.name):
        should_complete = True

    if should_complete and not inst.onboarding_completed:
        if is_placeholder_institute_name(inst.name):
            raise HTTPException(
                status_code=422,
                detail="Please configure your real Coaching Institute Name to complete setup.",
            )
        inst.onboarding_completed = True
        inst.onboarding_completed_at = datetime.now(timezone.utc)
        record_audit_change(
            db,
            institution_id=inst.id,
            setting_key="profile.onboarding_completed",
            category="profile",
            old_val=False,
            new_val=True,
            actor=actor,
            reason=reason,
        )

    # Ensure or synchronize the primary Main Branch record cleanly
    branch_res = await db.execute(
        select(InstitutionBranch)
        .where(InstitutionBranch.institution_id == inst.id, InstitutionBranch.is_active == True)
        .order_by(InstitutionBranch.is_main_branch.desc(), InstitutionBranch.id.asc())
    )
    branches = list(branch_res.scalars().all())
    main_branch = next((b for b in branches if b.is_main_branch), None)
    if main_branch is None and branches:
        main_branch = branches[0]
        main_branch.is_main_branch = True

    if main_branch is None:
        main_branch = InstitutionBranch(
            institution_id=inst.id,
            branch_name=branch_name_override or "Main Branch",
            branch_code="MAIN",
            is_main_branch=True,
            address_line_1=inst.address,
            address_line_2=inst.address_line_2,
            area_locality=inst.area_locality,
            city=inst.city,
            district=inst.district,
            state=inst.state,
            pincode=inst.pincode,
            country=inst.country,
            phone=inst.phone,
            alternate_phone=inst.alternate_phone,
            email=inst.email,
            gstin=inst.gstin,
            is_active=True,
        )
        db.add(main_branch)
    else:
        if branch_name_override is not None and branch_name_override != main_branch.branch_name:
            record_audit_change(
                db,
                institution_id=inst.id,
                setting_key=f"branch.{main_branch.id}.branch_name",
                category="branches",
                old_val=main_branch.branch_name,
                new_val=branch_name_override,
                actor=actor,
                reason=reason,
            )
            main_branch.branch_name = branch_name_override
        sync_map = {
            "address": "address_line_1",
            "address_line_2": "address_line_2",
            "area_locality": "area_locality",
            "city": "city",
            "district": "district",
            "state": "state",
            "pincode": "pincode",
            "country": "country",
            "phone": "phone",
            "alternate_phone": "alternate_phone",
            "email": "email",
            "gstin": "gstin",
        }
        for inst_attr, br_attr in sync_map.items():
            if inst_attr in updates:
                setattr(main_branch, br_attr, getattr(inst, inst_attr))


async def ensure_unique_branch_and_save(
    db: AsyncSession,
    *,
    institution_id: int,
    payload: Dict[str, Any],
    actor: User,
    branch_id: Optional[int] = None,
) -> InstitutionBranch:
    """Create or update an InstitutionBranch with duplicate checks, validation, main-branch exclusivity, and audit trail."""
    existing_res = await db.execute(
        select(InstitutionBranch).where(
            InstitutionBranch.institution_id == institution_id,
            InstitutionBranch.is_active == True,
        )
    )
    active_branches = list(existing_res.scalars().all())

    target: Optional[InstitutionBranch] = None
    if branch_id is not None:
        target = next((b for b in active_branches if b.id == branch_id), None)
        if not target:
            raise HTTPException(status_code=404, detail="Branch not found.")

    raw_name = clean_optional_str(payload.get("branch_name")) if "branch_name" in payload else (target.branch_name if target else None)
    if not raw_name or len(raw_name) < 2 or len(raw_name) > 150:
        raise HTTPException(status_code=422, detail="Branch name is required (2–150 characters).")

    raw_code = clean_optional_str(payload.get("branch_code")) if "branch_code" in payload else (target.branch_code if target else None)
    if not raw_code:
        slug = re.sub(r"[^A-Z0-9]+", "-", raw_name.upper()).strip("-")[:16] or "BR"
        raw_code = f"{slug}-{len(active_branches) + 1}" if any(b.branch_code.upper() == slug for b in active_branches) else slug
    raw_code = raw_code.upper()[:50]

    for other in active_branches:
        if target and other.id == target.id:
            continue
        if other.branch_name.strip().lower() == raw_name.lower():
            raise HTTPException(status_code=409, detail=f"A branch named '{raw_name}' already exists for this institution.")
        if other.branch_code.strip().upper() == raw_code:
            raise HTTPException(status_code=409, detail=f"Branch code '{raw_code}' is already in use.")

    country_candidate = payload.get("country", target.country if target else None)
    state_candidate = payload.get("state", target.state if target else None)
    validated_country, validated_state = validate_country_and_state(country_candidate, state_candidate)

    pincode = validate_pincode(payload.get("pincode", target.pincode if target else None), validated_country)
    phone = validate_phone_number(payload.get("phone", target.phone if target else None), "Branch phone")
    alt_phone = validate_phone_number(
        payload.get("alternate_phone", target.alternate_phone if target else None),
        "Branch alternate phone",
    )
    email = validate_email_address(payload.get("email", target.email if target else None), "Branch email")
    gstin = validate_gstin(payload.get("gstin", target.gstin if target else None))

    wants_main = bool(payload.get("is_main_branch")) if "is_main_branch" in payload else (target.is_main_branch if target else len(active_branches) == 0)
    if target and target.is_main_branch and "is_main_branch" in payload and not payload["is_main_branch"]:
        raise HTTPException(
            status_code=409,
            detail="Cannot unset Main Branch directly; promote another branch to Main Branch instead.",
        )

    if wants_main:
        await db.execute(
            update(InstitutionBranch)
            .where(InstitutionBranch.institution_id == institution_id, InstitutionBranch.is_main_branch == True)
            .values(is_main_branch=False)
        )

    fields = {
        "branch_name": raw_name,
        "branch_code": raw_code,
        "is_main_branch": wants_main,
        "address_line_1": clean_optional_str(payload.get("address_line_1", target.address_line_1 if target else None)),
        "address_line_2": clean_optional_str(payload.get("address_line_2", target.address_line_2 if target else None)),
        "area_locality": clean_optional_str(payload.get("area_locality", target.area_locality if target else None)),
        "city": clean_optional_str(payload.get("city", target.city if target else None)),
        "district": clean_optional_str(payload.get("district", target.district if target else None)),
        "state": validated_state,
        "pincode": pincode,
        "country": validated_country,
        "phone": phone,
        "alternate_phone": alt_phone,
        "email": email,
        "gstin": gstin,
    }

    if target is None:
        target = InstitutionBranch(institution_id=institution_id, is_active=True, **fields)
        db.add(target)
        await db.flush()
        record_audit_change(
            db,
            institution_id=institution_id,
            setting_key=f"branch.{target.id}.created",
            category="branches",
            old_val=None,
            new_val=f"{target.branch_name} ({target.branch_code})",
            actor=actor,
            reason="Created new branch via Institution Branches workspace",
        )
    else:
        for k, v in fields.items():
            old_v = getattr(target, k, None)
            setattr(target, k, v)
            record_audit_change(
                db,
                institution_id=institution_id,
                setting_key=f"branch.{target.id}.{k}",
                category="branches",
                old_val=old_v,
                new_val=v,
                actor=actor,
                reason="Updated branch details via Institution Branches workspace",
            )

    return target
