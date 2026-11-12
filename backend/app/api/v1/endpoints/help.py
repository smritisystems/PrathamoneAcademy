# /**
#  * @file        help.py
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
#  * @updated     2026-11-12
#  *
#  * @description REST API endpoints for the customer-facing Help & About Centre, contextual guides, unified search, support ticketing, CMS governance, and restricted system info.
#  */

from typing import List, Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role
from app.models.user import User
from app.services import help_service


router = APIRouter()

HELP_ADMIN_ROLES = ("superadmin", "sysadmin", "super_admin", "admin", "principal")


def _is_help_admin(user: User) -> bool:
    return (user.role or "").strip().lower() in help_service.ADMIN_ROLES


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

HelpSectionLiteral = Literal["getting_started", "module_guide", "tutorial", "faq", "legal"]
HelpArticleStatusLiteral = Literal["draft", "pending_approval", "published", "unpublished"]
HelpApprovalStatusLiteral = Literal["approved", "pending_approval"]
SupportRequestTypeLiteral = Literal["support_request", "bug_report", "feature_request", "feedback"]
SupportPriorityLiteral = Literal["low", "medium", "high", "urgent"]
SupportStatusLiteral = Literal["open", "in_progress", "waiting_on_customer", "resolved", "closed"]


class HelpCategoryUpsert(BaseModel):
    slug: str = Field(..., min_length=2, max_length=80)
    name: str = Field(..., min_length=2, max_length=120)
    section: HelpSectionLiteral
    description: Optional[str] = None
    icon: Optional[str] = Field(default="BookOpen", max_length=50)
    sort_order: int = 10
    is_active: Optional[bool] = True


class HelpArticleCreate(BaseModel):
    slug: str = Field(..., min_length=2, max_length=120)
    category_id: Optional[int] = None
    category_slug: Optional[str] = None
    section: HelpSectionLiteral
    module_key: Optional[str] = Field(default=None, max_length=60)
    title: str = Field(..., min_length=3, max_length=200)
    summary: Optional[str] = None
    content_markdown: str = Field(..., min_length=10)
    tags: Optional[List[str]] = []
    required_permissions: Optional[List[str]] = []
    related_routes: Optional[List[str]] = []
    related_slugs: Optional[List[str]] = []
    doc_version: str = Field(default="1.0", max_length=20)
    status: Optional[HelpArticleStatusLiteral] = None
    approval_status: Optional[HelpApprovalStatusLiteral] = None
    sort_order: int = 100
    change_note: Optional[str] = None


class HelpArticleUpdate(BaseModel):
    category_id: Optional[int] = None
    category_slug: Optional[str] = None
    module_key: Optional[str] = Field(default=None, max_length=60)
    title: Optional[str] = Field(default=None, min_length=3, max_length=200)
    summary: Optional[str] = None
    content_markdown: Optional[str] = Field(default=None, min_length=10)
    tags: Optional[List[str]] = None
    required_permissions: Optional[List[str]] = None
    related_routes: Optional[List[str]] = None
    related_slugs: Optional[List[str]] = None
    doc_version: Optional[str] = Field(default=None, max_length=20)
    status: Optional[HelpArticleStatusLiteral] = None
    approval_status: Optional[HelpApprovalStatusLiteral] = None
    sort_order: Optional[int] = None
    change_note: Optional[str] = None


class HelpArticlePublishToggle(BaseModel):
    publish: bool
    approve: Optional[bool] = None


class ProductInfoUpdate(BaseModel):
    product_introduction: Optional[str] = None
    product_vision: Optional[str] = None
    product_mission: Optional[str] = None
    vision_mission_status: Optional[str] = None
    smriti_introduction: Optional[str] = None
    smriti_tech_profile: Optional[str] = None
    smriti_website: Optional[str] = None
    smriti_office: Optional[str] = None
    smriti_leadership: Optional[str] = None
    smriti_verification_status: Optional[str] = None
    license_status: Optional[str] = None
    license_validity: Optional[str] = None
    deployment_type: Optional[str] = None
    change_note: Optional[str] = None


class SupportRequestCreate(BaseModel):
    request_type: SupportRequestTypeLiteral = Field(default="support_request")
    category: str = Field(default="general", max_length=50)
    priority: SupportPriorityLiteral = Field(default="medium")
    subject: str = Field(..., min_length=4, max_length=200)
    description: str = Field(..., min_length=10)
    module_key: Optional[str] = Field(default=None, max_length=60)
    page_route: Optional[str] = Field(default=None, max_length=200)
    error_reference_id: Optional[str] = Field(default=None, max_length=50)
    contact_email: Optional[str] = Field(default=None, max_length=200)
    contact_phone: Optional[str] = Field(default=None, max_length=40)


class SupportCommentCreate(BaseModel):
    message: str = Field(..., min_length=1)
    is_internal_note: bool = False


class SupportStatusUpdate(BaseModel):
    status: Optional[SupportStatusLiteral] = None
    resolution_notes: Optional[str] = None
    assigned_to_id: Optional[int] = None
    priority: Optional[SupportPriorityLiteral] = None


# ─── Categories & Articles ────────────────────────────────────────────────────

@router.get("/categories")
async def list_categories(
    include_inactive: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    allow_inactive = include_inactive and _is_help_admin(current_user)
    items = await help_service.list_categories(db, include_inactive=allow_inactive)
    return {"items": items}


@router.post("/categories", status_code=status.HTTP_200_OK)
async def upsert_category(
    payload: HelpCategoryUpsert,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HELP_ADMIN_ROLES)),
):
    try:
        return await help_service.upsert_category(db, payload.model_dump(), current_user)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/articles")
async def list_articles(
    section: Optional[str] = Query(default=None),
    category_slug: Optional[str] = Query(default=None),
    module_key: Optional[str] = Query(default=None),
    include_unpublished: bool = Query(default=False),
    limit: int = Query(default=200, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    allow_unpub = include_unpublished and _is_help_admin(current_user)
    items = await help_service.list_articles(
        db,
        section=section,
        category_slug=category_slug,
        module_key=module_key,
        include_unpublished=allow_unpub,
        limit=limit,
        offset=offset,
    )
    return {"items": items, "total": len(items), "limit": limit, "offset": offset}


@router.get("/articles/{slug}")
async def get_article(
    slug: str,
    include_unpublished: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    allow_unpub = include_unpublished and _is_help_admin(current_user)
    article = await help_service.get_article_by_slug(db, slug, include_unpublished=allow_unpub)
    if not article:
        raise HTTPException(status_code=404, detail="Help article not found.")
    return article


@router.post("/articles", status_code=status.HTTP_201_CREATED)
async def create_article(
    payload: HelpArticleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HELP_ADMIN_ROLES)),
):
    try:
        return await help_service.create_article(db, payload.model_dump(), current_user)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.put("/articles/{article_id}")
async def update_article(
    article_id: int,
    payload: HelpArticleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HELP_ADMIN_ROLES)),
):
    try:
        return await help_service.update_article(
            db, article_id, payload.model_dump(exclude_unset=True), current_user
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.patch("/articles/{article_id}/publish")
async def publish_or_approve_article(
    article_id: int,
    payload: HelpArticlePublishToggle,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HELP_ADMIN_ROLES)),
):
    try:
        return await help_service.toggle_publish_article(
            db, article_id, publish=payload.publish, approve=payload.approve, actor=current_user
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/articles/{article_id}/revisions")
async def get_article_revisions(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HELP_ADMIN_ROLES)),
):
    revisions = await help_service.list_article_revisions(db, article_id)
    return {"items": revisions}


# ─── Unified Search & Contextual Help ─────────────────────────────────────────

@router.get("/search")
async def unified_search(
    q: str = Query(default=""),
    section: Optional[str] = Query(default=None),
    category_slug: Optional[str] = Query(default=None),
    include_unpublished: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    allow_unpub = include_unpublished and _is_help_admin(current_user)
    return await help_service.search_help(
        db, query=q, section=section, category_slug=category_slug, include_unpublished=allow_unpub
    )


@router.get("/contextual")
async def contextual_help(
    route: Optional[str] = Query(default=None),
    module_key: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return await help_service.resolve_contextual_help(db, route_path=route, module_key=module_key)


# ─── Product, Company, Version & Restricted System Info ───────────────────────

@router.get("/product-info")
async def get_product_info(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return await help_service.get_product_and_version_info(db, current_user.institution_id)


@router.put("/product-info")
async def update_product_info(
    payload: ProductInfoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HELP_ADMIN_ROLES)),
):
    try:
        return await help_service.update_product_about_metadata(
            db, current_user.institution_id, payload.model_dump(exclude_unset=True), current_user
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/system-info")
async def get_system_info(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HELP_ADMIN_ROLES)),
):
    return await help_service.get_system_information(db, current_user.institution_id)


# ─── Customer Support Ticketing ───────────────────────────────────────────────

@router.get("/support-requests")
async def list_support_requests(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    request_type: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    items = await help_service.list_support_requests(
        db,
        actor=current_user,
        status_filter=status_filter,
        request_type=request_type,
        limit=limit,
        offset=offset,
    )
    return {"items": items, "total": len(items), "limit": limit, "offset": offset}


@router.post("/support-requests", status_code=status.HTTP_201_CREATED)
async def create_support_request(
    payload: SupportRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        return await help_service.create_support_request(db, payload.model_dump(), current_user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/support-requests/{request_id}")
async def get_support_request(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        item = await help_service.get_support_request(db, request_id, current_user)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    if not item:
        raise HTTPException(status_code=404, detail="Support request not found.")
    return item


@router.post("/support-requests/{request_id}/comments", status_code=status.HTTP_201_CREATED)
async def add_support_comment(
    request_id: int,
    payload: SupportCommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        return await help_service.add_support_comment(
            db, request_id, payload.message, payload.is_internal_note, current_user
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.patch("/support-requests/{request_id}/status")
async def update_support_status(
    request_id: int,
    payload: SupportStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*HELP_ADMIN_ROLES)),
):
    try:
        return await help_service.update_support_request_status(
            db, request_id, payload.model_dump(exclude_unset=True), current_user
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
