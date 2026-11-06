# /**
#  * @file        codex.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.models
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-06
#  * @updated     2026-11-06
#  *
#  * @description SQLAlchemy models for CodeX configurable feature activation, custom numeric-to-alphabet mapping, and security governance.
#  */

from sqlalchemy import String, Text, Boolean, Integer, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional, List
from app.core.database import Base


class CodexConfig(Base):
    """
    Singleton configuration record per institution.
    MANDATORY SYSTEM DEFAULT: is_master_enabled is FALSE.
    """
    __tablename__ = "codex_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    institution_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    is_master_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")

    # Feature Switches: Numeric Coding
    feature_numeric_to_alphabet: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    feature_alphabet_to_numeric: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    feature_custom_alphabet_mapping: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    feature_multiple_mapping_profiles: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    feature_mapping_version_history: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")

    # Feature Switches: Value Visibility
    feature_hide_actual_amount: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    feature_show_actual_amount: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    feature_show_both: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")

    # Feature Switches: Code Distribution & Decoder
    feature_qr_generation: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    feature_mobile_decoder: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    feature_offline_decoder: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    feature_copy_share_code: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    feature_expiry_codes: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    feature_pin_protected_decoding: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")

    # Business Applications
    app_selling_price: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    app_purchase_cost: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    app_salary_payroll: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    app_commission: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    app_discounts: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    app_customer_specific_values: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    app_internal_reference_values: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    app_fee_structures: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")

    # Decoder Security Settings
    security_pin_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    decoder_expiry_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=300, server_default="300")
    max_decoding_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=5, server_default="5")

    # Audit & Tracking
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    updated_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    institution = relationship("Institution")
    updated_by = relationship("User")


class CodexMappingProfile(Base):
    """
    Bijective digit-to-symbol mapping profiles owned by an institution.
    """
    __tablename__ = "codex_mapping_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    institution_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    profile_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")

    # JSON representation of 0-9 digits to symbols: {"0":"Q","1":"A",...}
    digit_map: Mapped[str] = mapped_column(Text, nullable=False)
    decimal_symbol: Mapped[str] = mapped_column(String(5), nullable=False, default=".", server_default=".")
    negative_symbol: Mapped[str] = mapped_column(String(5), nullable=False, default="-", server_default="-")
    prefix: Mapped[str] = mapped_column(String(20), nullable=False, default="CX-", server_default="CX-")
    suffix: Mapped[str] = mapped_column(String(20), nullable=False, default="", server_default="")

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    versions = relationship("CodexMappingVersion", back_populates="profile", cascade="all, delete-orphan", order_by="desc(CodexMappingVersion.version)")


class CodexMappingVersion(Base):
    """
    Historical snapshot of a mapping profile version for backward compatibility.
    """
    __tablename__ = "codex_mapping_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    profile_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("codex_mapping_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    digit_map: Mapped[str] = mapped_column(Text, nullable=False)
    decimal_symbol: Mapped[str] = mapped_column(String(5), nullable=False)
    negative_symbol: Mapped[str] = mapped_column(String(5), nullable=False)
    prefix: Mapped[str] = mapped_column(String(20), nullable=False)
    suffix: Mapped[str] = mapped_column(String(20), nullable=False)
    change_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    profile = relationship("CodexMappingProfile", back_populates="versions")


class CodexScopeAssignment(Base):
    """
    Defines scoped overrides across business, department, role, or individual user.
    """
    __tablename__ = "codex_scope_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    institution_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    scope_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)  # business, department, role, user
    scope_target: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # 'all', 'Finance', 'teacher', '122'
    visibility_mode: Mapped[str] = mapped_column(String(30), nullable=False, default="actual_only")  # hidden, coded_only, actual_only, both, disabled
    allowed_modules: Mapped[str] = mapped_column(Text, nullable=False, default="[]")  # JSON array
    can_decode: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    can_generate_qr: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class CodexAuditLog(Base):
    """
    Append-only tamper-evident audit ledger for CodeX security and operational actions.
    """
    __tablename__ = "codex_audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    institution_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    user_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="success", server_default="success")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class CodexTemporaryToken(Base):
    """
    Ephemeral token for QR scanning, mobile decoders, and PIN-verified sessions.
    """
    __tablename__ = "codex_temporary_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    institution_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    encoded_payload: Mapped[str] = mapped_column(Text, nullable=False)
    actual_value_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    requires_pin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    is_used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    created_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

