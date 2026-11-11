# /**
#  * @file        help_service.py
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
#  * @created     2026-11-11
#  * @updated     2026-11-12
#  *
#  * @description Service layer for PrathamOne EduOS Help & About Centre: seeding, unified search, contextual routing, support ticketing, CMS governance, product/company info, and restricted system health telemetry.
#  */

import json
import secrets
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, desc, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.help import (
    HelpArticle,
    HelpArticleRevision,
    HelpCategory,
    SupportRequest,
    SupportRequestComment,
)
from app.models.institution import Institution
from app.models.settings import InstitutionSetting, SettingAuditLog
from app.models.user import AuditLog, User
from app.services.help_seed_data import (
    HELP_ARTICLES_SEED,
    HELP_CATEGORIES,
    sanitize_build_number,
    sanitize_changelog_markdown,
    sanitize_release_text,
    validate_customer_safe_content,
)
from app.services.housekeeping_service import HousekeepingService
from app.services.release_service import ReleaseService


ADMIN_ROLES = {"superadmin", "sysadmin", "super_admin", "admin", "principal"}

# Customer-safe canonical module registry mirroring genuinely implemented application capabilities
GENUINE_MODULES_META: List[Dict[str, str]] = [
    {"key": "dashboard", "name": "Dashboard", "guide_slug": "guide-dashboard", "route": "/dashboard"},
    {"key": "students", "name": "Student Management", "guide_slug": "guide-students", "route": "/students"},
    {"key": "admissions", "name": "Admission Management", "guide_slug": "guide-admissions", "route": "/leads"},
    {"key": "fees", "name": "Fee Management", "guide_slug": "guide-fees", "route": "/fees"},
    {"key": "concessions", "name": "Concessions & Waivers", "guide_slug": "guide-concessions", "route": "/fees/concessions"},
    {"key": "scholarships", "name": "Scholarships & Student Benefits", "guide_slug": "guide-scholarships", "route": "/fees/concessions"},
    {"key": "attendance", "name": "Attendance Management", "guide_slug": "guide-attendance", "route": "/attendance"},
    {"key": "timetable", "name": "Timetable Management", "guide_slug": "guide-timetable", "route": "/academic/timetable"},
    {"key": "examinations", "name": "Examination Management", "guide_slug": "guide-examinations", "route": "/examinations"},
    {"key": "results", "name": "Results & Report Cards", "guide_slug": "guide-results", "route": "/examinations/report-cards"},
    {"key": "staff", "name": "Staff Management", "guide_slug": "guide-staff", "route": "/teachers"},
    {"key": "communication", "name": "Communication Management", "guide_slug": "guide-communication", "route": "/communication"},
    {"key": "reports", "name": "Reports & Analytics", "guide_slug": "guide-reports", "route": "/reports"},
    {"key": "settings", "name": "Administration & Settings", "guide_slug": "guide-settings", "route": "/settings"},
]

# Longest prefix wins during contextual resolution
CONTEXTUAL_ROUTE_RULES: List[Tuple[str, str, str]] = [
    ("/fees/concessions", "guide-concessions", "concessions"),
    ("/fees/scholarships", "guide-scholarships", "scholarships"),
    ("/fees", "guide-fees", "fees"),
    ("/payments", "guide-fees", "fees"),
    ("/receipt", "tutorial-receipt-generation", "fees"),
    ("/students/admission", "guide-admissions", "admissions"),
    ("/students/add", "guide-admissions", "admissions"),
    ("/students", "guide-students", "students"),
    ("/leads", "guide-admissions", "admissions"),
    ("/examinations/report-cards", "guide-results", "results"),
    ("/examinations/analytics", "guide-results", "results"),
    ("/examinations", "guide-examinations", "examinations"),
    ("/academic/timetable", "guide-timetable", "timetable"),
    ("/timetable", "guide-timetable", "timetable"),
    ("/academic", "branch-class-and-division-setup", "timetable"),
    ("/courses", "branch-class-and-division-setup", "timetable"),
    ("/attendance", "guide-attendance", "attendance"),
    ("/teachers", "guide-staff", "staff"),
    ("/staff", "guide-staff", "staff"),
    ("/teacher-payroll", "guide-staff", "staff"),
    ("/communication", "guide-communication", "communication"),
    ("/reports", "guide-reports", "reports"),
    ("/users", "user-management-setup", "settings"),
    ("/housekeeping", "guide-settings", "settings"),
    ("/settings", "guide-settings", "settings"),
    ("/student-portal", "welcome-to-prathamone-eduos", "dashboard"),
    ("/teacher-portal", "guide-timetable", "timetable"),
    ("/dashboard", "guide-dashboard", "dashboard"),
    ("/help/support", "faq-common-application-errors", "dashboard"),
    ("/help", "welcome-to-prathamone-eduos", "dashboard"),
    ("/", "guide-dashboard", "dashboard"),
]

STATIC_PORTAL_SEARCH_TOPICS: List[Dict[str, Any]] = [
    {
        "type": "portal",
        "slug": "about-product",
        "section": "about_product",
        "title": "About PrathamOne EduOS — Product Overview & Capabilities",
        "summary": "Product introduction, philosophy, available modules, target coaching institutions, and supported deployment models.",
        "route": "/help/about-product",
        "keywords": ["prathamone", "eduos", "product", "capabilities", "modules", "philosophy", "about"],
    },
    {
        "type": "portal",
        "slug": "about-company",
        "section": "about_company",
        "title": "About SMRITI Systems & AITDL — Developer Profile",
        "summary": "Software developer and product ownership information for AITDL & SMRITI Systems, portfolio, and official contact channels.",
        "route": "/help/about-company",
        "keywords": ["smriti", "smriti systems", "aitdl", "developer", "company", "jawahar", "contact", "portfolio"],
    },
    {
        "type": "portal",
        "slug": "version-info",
        "section": "version",
        "title": "Product & Version Information",
        "summary": "Live software version, edition, build number, release updates, available modules, and licensing details.",
        "route": "/help/version",
        "keywords": ["version", "build", "release", "license", "edition", "update"],
    },
    {
        "type": "portal",
        "slug": "support-centre",
        "section": "support",
        "title": "Customer Support Centre — Submit & Track Requests",
        "summary": "Contact technical support, submit support tickets, report issues, suggest features, or share product feedback.",
        "route": "/help/support",
        "keywords": ["support", "ticket", "bug", "feature request", "feedback", "contact", "helpdesk"],
    },
]


def _json_loads(raw: Optional[str], fallback: Any) -> Any:
    if not raw:
        return fallback
    try:
        return json.loads(raw)
    except Exception:
        return fallback


def _validate_article_safety(title: str, summary: Optional[str], content_markdown: str, tags: List[str]) -> None:
    combined = "\n".join([title or "", summary or "", content_markdown or "", " ".join(tags or [])])
    violations = validate_customer_safe_content(combined)
    if violations:
        raise ValueError(" ".join(violations))


def serialize_category(cat: HelpCategory, article_count: Optional[int] = None) -> Dict[str, Any]:
    return {
        "id": cat.id,
        "slug": cat.slug,
        "name": cat.name,
        "section": cat.section,
        "description": cat.description,
        "icon": cat.icon,
        "sort_order": cat.sort_order,
        "is_active": cat.is_active,
        "article_count": article_count,
    }


def serialize_article(article: HelpArticle, include_content: bool = True) -> Dict[str, Any]:
    data: Dict[str, Any] = {
        "id": article.id,
        "slug": article.slug,
        "category_id": article.category_id,
        "category_slug": article.category.slug if article.category else None,
        "category_name": article.category.name if article.category else None,
        "section": article.section,
        "module_key": article.module_key,
        "title": article.title,
        "summary": article.summary,
        "tags": _json_loads(article.tags, []),
        "required_permissions": _json_loads(article.required_permissions, []),
        "related_routes": _json_loads(article.related_routes, []),
        "related_slugs": _json_loads(article.related_slugs, []),
        "doc_version": article.doc_version,
        "status": article.status,
        "approval_status": article.approval_status,
        "approved_at": article.approved_at.isoformat() if article.approved_at else None,
        "published_at": article.published_at.isoformat() if article.published_at else None,
        "is_system": article.is_system,
        "sort_order": article.sort_order,
        "updated_at": article.updated_at.isoformat() if article.updated_at else None,
    }
    if include_content:
        data["content_markdown"] = article.content_markdown
    return data


def serialize_support_request(req: SupportRequest, include_comments: bool = True, include_internal: bool = False) -> Dict[str, Any]:
    comments_list: List[Dict[str, Any]] = []
    if include_comments and req.comments is not None:
        for c in req.comments:
            if c.is_internal_note and not include_internal:
                continue
            comments_list.append({
                "id": c.id,
                "request_id": c.request_id,
                "author_id": c.author_id,
                "author_name": c.author_name,
                "author_role": c.author_role,
                "message": c.message,
                "is_internal_note": c.is_internal_note,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            })
    return {
        "id": req.id,
        "ticket_number": req.ticket_number,
        "institution_id": req.institution_id,
        "user_id": req.user_id,
        "requester_name": req.user.full_name if req.user else None,
        "requester_role": req.user.role if req.user else None,
        "request_type": req.request_type,
        "category": req.category,
        "priority": req.priority,
        "subject": req.subject,
        "description": req.description,
        "module_key": req.module_key,
        "page_route": req.page_route,
        "error_reference_id": req.error_reference_id,
        "contact_email": req.contact_email,
        "contact_phone": req.contact_phone,
        "status": req.status,
        "resolution_notes": req.resolution_notes,
        "assigned_to_id": req.assigned_to_id,
        "assigned_to_name": req.assigned_to.full_name if req.assigned_to else None,
        "resolved_at": req.resolved_at.isoformat() if req.resolved_at else None,
        "created_at": req.created_at.isoformat() if req.created_at else None,
        "updated_at": req.updated_at.isoformat() if req.updated_at else None,
        "comments": comments_list if include_comments else [],
    }


async def ensure_seeded(db: AsyncSession) -> None:
    """Idempotently seeds categories and customer-facing Help & Legal articles on first access."""
    cat_res = await db.execute(select(HelpCategory))
    existing_cats = {c.slug: c for c in cat_res.scalars().all()}

    for item in HELP_CATEGORIES:
        if item["slug"] not in existing_cats:
            cat = HelpCategory(
                slug=item["slug"],
                name=item["name"],
                section=item["section"],
                description=item["description"],
                icon=item["icon"],
                sort_order=item["sort_order"],
                is_active=True,
            )
            db.add(cat)
            await db.flush()
            existing_cats[cat.slug] = cat

    art_res = await db.execute(select(HelpArticle.slug))
    existing_slugs = set(art_res.scalars().all())
    now = datetime.now(timezone.utc)
    created_any = False

    for entry in HELP_ARTICLES_SEED:
        if entry["slug"] in existing_slugs:
            continue
        _validate_article_safety(
            entry["title"],
            entry.get("summary"),
            entry["content_markdown"],
            entry.get("tags", []),
        )
        cat = existing_cats.get(entry["category_slug"])
        approval_status = entry.get("approval_status", "approved")
        status_val = entry.get("status", "published")
        article = HelpArticle(
            slug=entry["slug"],
            category_id=cat.id if cat else None,
            section=entry["section"],
            module_key=entry.get("module_key"),
            title=entry["title"],
            summary=entry.get("summary"),
            content_markdown=entry["content_markdown"],
            tags=json.dumps(entry.get("tags", [])),
            required_permissions=json.dumps(entry.get("required_permissions", [])),
            related_routes=json.dumps(entry.get("related_routes", [])),
            related_slugs=json.dumps(entry.get("related_slugs", [])),
            doc_version="1.0",
            status=status_val,
            approval_status=approval_status,
            published_at=now if status_val == "published" else None,
            is_system=True,
            sort_order=entry.get("sort_order", 0),
        )
        db.add(article)
        await db.flush()

        rev = HelpArticleRevision(
            article_id=article.id,
            doc_version="1.0",
            title=article.title,
            summary=article.summary,
            content_markdown=article.content_markdown,
            status=article.status,
            approval_status=article.approval_status,
            change_note="Initial verified Help & About Centre baseline.",
            changed_by_name="System Baseline",
        )
        db.add(rev)
        created_any = True

    if created_any:
        await db.flush()


async def list_categories(db: AsyncSession, include_inactive: bool = False) -> List[Dict[str, Any]]:
    await ensure_seeded(db)
    stmt = select(HelpCategory).order_by(HelpCategory.sort_order.asc(), HelpCategory.name.asc())
    if not include_inactive:
        stmt = stmt.where(HelpCategory.is_active == True)  # noqa: E712
    cats = (await db.execute(stmt)).scalars().all()

    count_stmt = (
        select(HelpArticle.category_id, func.count(HelpArticle.id))
        .where(HelpArticle.status != "unpublished")
        .group_by(HelpArticle.category_id)
    )
    counts = dict((await db.execute(count_stmt)).all())
    return [serialize_category(c, article_count=counts.get(c.id, 0)) for c in cats]


async def upsert_category(db: AsyncSession, payload: Dict[str, Any], actor: User) -> Dict[str, Any]:
    await ensure_seeded(db)
    slug = payload["slug"].strip().lower()
    res = await db.execute(select(HelpCategory).where(HelpCategory.slug == slug))
    cat = res.scalar_one_or_none()
    if cat:
        cat.name = payload["name"]
        cat.section = payload["section"]
        cat.description = payload.get("description")
        cat.icon = payload.get("icon") or cat.icon
        cat.sort_order = payload.get("sort_order", cat.sort_order)
        if "is_active" in payload and payload["is_active"] is not None:
            cat.is_active = bool(payload["is_active"])
    else:
        cat = HelpCategory(
            slug=slug,
            name=payload["name"],
            section=payload["section"],
            description=payload.get("description"),
            icon=payload.get("icon") or "BookOpen",
            sort_order=payload.get("sort_order", 10),
            is_active=payload.get("is_active", True),
        )
        db.add(cat)
    await db.flush()
    db.add(
        AuditLog(
            user_id=actor.id,
            action="HELP_CATEGORY_UPSERT",
            resource_type="help_category",
            resource_id=cat.id,
            new_data=json.dumps({"slug": cat.slug, "name": cat.name, "section": cat.section}),
            details=f"Updated Help category '{cat.name}'",
        )
    )
    await db.flush()
    return serialize_category(cat)


async def list_articles(
    db: AsyncSession,
    section: Optional[str] = None,
    category_slug: Optional[str] = None,
    module_key: Optional[str] = None,
    include_unpublished: bool = False,
) -> List[Dict[str, Any]]:
    await ensure_seeded(db)
    stmt = (
        select(HelpArticle)
        .options(selectinload(HelpArticle.category))
        .order_by(HelpArticle.sort_order.asc(), HelpArticle.title.asc())
    )
    if section:
        stmt = stmt.where(HelpArticle.section == section)
    if module_key:
        stmt = stmt.where(HelpArticle.module_key == module_key)
    if category_slug:
        stmt = stmt.join(HelpCategory, HelpArticle.category_id == HelpCategory.id).where(
            HelpCategory.slug == category_slug
        )
    if not include_unpublished:
        # Legal items remain visible with explicit pending_approval status banner,
        # while drafts/unpublished non-legal items are hidden unless governed view.
        stmt = stmt.where(
            or_(
                HelpArticle.status == "published",
                and_(HelpArticle.section == "legal", HelpArticle.status == "pending_approval"),
            )
        )
    articles = (await db.execute(stmt)).scalars().all()
    return [serialize_article(a, include_content=False) for a in articles]


async def get_article_by_slug(
    db: AsyncSession,
    slug: str,
    include_unpublished: bool = False,
) -> Optional[Dict[str, Any]]:
    await ensure_seeded(db)
    stmt = (
        select(HelpArticle)
        .options(selectinload(HelpArticle.category))
        .where(HelpArticle.slug == slug)
    )
    article = (await db.execute(stmt)).scalar_one_or_none()
    if not article:
        return None
    if not include_unpublished and article.status in ("draft", "unpublished"):
        return None

    data = serialize_article(article, include_content=True)
    rel_slugs = data.get("related_slugs") or []
    related_items: List[Dict[str, Any]] = []
    if rel_slugs:
        rel_stmt = (
            select(HelpArticle)
            .options(selectinload(HelpArticle.category))
            .where(HelpArticle.slug.in_(rel_slugs))
        )
        if not include_unpublished:
            rel_stmt = rel_stmt.where(HelpArticle.status.in_(["published", "pending_approval"]))
        rel_rows = (await db.execute(rel_stmt)).scalars().all()
        by_slug = {r.slug: serialize_article(r, include_content=False) for r in rel_rows}
        related_items = [by_slug[s] for s in rel_slugs if s in by_slug]
    data["related_articles"] = related_items
    return data


async def search_help(
    db: AsyncSession,
    query: str,
    section: Optional[str] = None,
    category_slug: Optional[str] = None,
    include_unpublished: bool = False,
) -> Dict[str, Any]:
    await ensure_seeded(db)
    q = (query or "").strip()
    stmt = (
        select(HelpArticle)
        .options(selectinload(HelpArticle.category))
        .order_by(HelpArticle.sort_order.asc(), HelpArticle.title.asc())
    )
    if section:
        stmt = stmt.where(HelpArticle.section == section)
    if category_slug:
        stmt = stmt.join(HelpCategory, HelpArticle.category_id == HelpCategory.id).where(
            HelpCategory.slug == category_slug
        )
    if not include_unpublished:
        stmt = stmt.where(
            or_(
                HelpArticle.status == "published",
                and_(HelpArticle.section == "legal", HelpArticle.status == "pending_approval"),
            )
        )
    all_articles = (await db.execute(stmt)).scalars().all()

    ql = q.lower()
    terms = [t for t in ql.split() if len(t) >= 2] if ql else []
    scored_results: List[Tuple[int, Dict[str, Any]]] = []

    for art in all_articles:
        tags_list = _json_loads(art.tags, [])
        hay_title = art.title.lower()
        hay_summary = (art.summary or "").lower()
        hay_tags = " ".join(str(t).lower() for t in tags_list)
        hay_body = (art.content_markdown or "").lower()

        if not ql:
            score = 1
        else:
            score = 0
            if ql in hay_title:
                score += 40
            if ql in hay_tags:
                score += 30
            if ql in hay_summary:
                score += 20
            if ql in hay_body:
                score += 10
            for term in terms:
                if term in hay_title:
                    score += 12
                if term in hay_tags:
                    score += 10
                if term in hay_summary:
                    score += 6
                if term in hay_body:
                    score += 3
        if score > 0:
            item = serialize_article(art, include_content=False)
            item["type"] = "article"
            item["route"] = f"/help/legal/{art.slug}" if art.section == "legal" else f"/help/article/{art.slug}"
            scored_results.append((score, item))

    # Include verified static product/company/support portal destinations in unified search
    portal_hits: List[Tuple[int, Dict[str, Any]]] = []
    if not category_slug and (not section or section in ("about_product", "about_company", "version", "support")):
        for p in STATIC_PORTAL_SEARCH_TOPICS:
            if section and p["section"] != section:
                continue
            p_title = p["title"].lower()
            p_summary = p["summary"].lower()
            p_kw = " ".join(p["keywords"])
            if not ql:
                pscore = 1
            else:
                pscore = 0
                if ql in p_title:
                    pscore += 35
                if ql in p_kw:
                    pscore += 25
                if ql in p_summary:
                    pscore += 15
                for term in terms:
                    if term in p_title or term in p_kw:
                        pscore += 10
            if pscore > 0:
                portal_hits.append((pscore, {
                    "type": "portal",
                    "slug": p["slug"],
                    "section": p["section"],
                    "title": p["title"],
                    "summary": p["summary"],
                    "route": p["route"],
                    "tags": p["keywords"],
                }))

    combined = sorted(scored_results + portal_hits, key=lambda x: (-x[0], x[1]["title"]))
    results = [item for _, item in combined[:40]]

    suggestions = [
        "Fee Collection",
        "Concessions & Waivers",
        "Scholarships",
        "Student Admission",
        "Attendance",
        "Report Cards",
        "Receipt Printing",
        "About SMRITI Systems",
    ]
    if ql:
        matched_titles = [r["title"] for r in results[:6]]
        suggestions = matched_titles or suggestions[:5]

    return {
        "query": q,
        "total": len(results),
        "results": results,
        "suggestions": suggestions,
    }


async def resolve_contextual_help(
    db: AsyncSession,
    route_path: Optional[str] = None,
    module_key: Optional[str] = None,
) -> Dict[str, Any]:
    await ensure_seeded(db)
    target_slug = "welcome-to-prathamone-eduos"
    resolved_module = module_key or "dashboard"

    clean_route = (route_path or "/").split("?")[0].strip() or "/"
    if module_key:
        mod_map = {m["key"]: m["guide_slug"] for m in GENUINE_MODULES_META}
        if module_key in mod_map:
            target_slug = mod_map[module_key]
    else:
        for prefix, slug, mod_k in CONTEXTUAL_ROUTE_RULES:
            if clean_route == prefix or (prefix != "/" and clean_route.startswith(prefix)):
                target_slug = slug
                resolved_module = mod_k
                break

    article = await get_article_by_slug(db, target_slug, include_unpublished=False)
    if not article:
        article = await get_article_by_slug(db, "welcome-to-prathamone-eduos", include_unpublished=False)
    return {
        "route_path": clean_route,
        "module_key": resolved_module,
        "article": article,
        "help_route": f"/help/article/{article['slug']}" if article else "/help",
    }


async def create_article(db: AsyncSession, payload: Dict[str, Any], actor: User) -> Dict[str, Any]:
    await ensure_seeded(db)
    slug = payload["slug"].strip().lower()
    dup = (await db.execute(select(HelpArticle).where(HelpArticle.slug == slug))).scalar_one_or_none()
    if dup:
        raise ValueError(f"An article with slug '{slug}' already exists.")

    tags = payload.get("tags") or []
    _validate_article_safety(payload["title"], payload.get("summary"), payload["content_markdown"], tags)

    cat_id = payload.get("category_id")
    if not cat_id and payload.get("category_slug"):
        cat = (
            await db.execute(select(HelpCategory).where(HelpCategory.slug == payload["category_slug"]))
        ).scalar_one_or_none()
        cat_id = cat.id if cat else None

    section = payload["section"]
    status_val = payload.get("status") or ("pending_approval" if section == "legal" else "draft")
    approval_val = payload.get("approval_status") or ("pending_approval" if section == "legal" else "approved")
    if section == "legal" and status_val == "published" and approval_val != "approved":
        raise ValueError("Legal documents cannot be published without explicit approval status.")

    now = datetime.now(timezone.utc)
    article = HelpArticle(
        slug=slug,
        category_id=cat_id,
        section=section,
        module_key=payload.get("module_key"),
        title=payload["title"].strip(),
        summary=payload.get("summary"),
        content_markdown=payload["content_markdown"],
        tags=json.dumps(tags),
        required_permissions=json.dumps(payload.get("required_permissions") or []),
        related_routes=json.dumps(payload.get("related_routes") or []),
        related_slugs=json.dumps(payload.get("related_slugs") or []),
        doc_version=payload.get("doc_version") or "1.0",
        status=status_val,
        approval_status=approval_val,
        approved_by_id=actor.id if approval_val == "approved" else None,
        approved_at=now if approval_val == "approved" else None,
        published_at=now if status_val == "published" else None,
        is_system=False,
        sort_order=payload.get("sort_order", 100),
        created_by_id=actor.id,
        updated_by_id=actor.id,
    )
    db.add(article)
    await db.flush()

    db.add(
        HelpArticleRevision(
            article_id=article.id,
            doc_version=article.doc_version,
            title=article.title,
            summary=article.summary,
            content_markdown=article.content_markdown,
            status=article.status,
            approval_status=article.approval_status,
            change_note=payload.get("change_note") or "Article created via Help Governance.",
            changed_by_id=actor.id,
            changed_by_name=actor.full_name or actor.username,
        )
    )
    db.add(
        AuditLog(
            user_id=actor.id,
            action="HELP_ARTICLE_CREATE",
            resource_type="help_article",
            resource_id=article.id,
            new_data=json.dumps({"slug": article.slug, "section": article.section, "status": article.status}),
            details=f"Created help article '{article.title}'",
        )
    )
    await db.flush()
    return await get_article_by_slug(db, article.slug, include_unpublished=True)  # type: ignore


async def update_article(db: AsyncSession, article_id: int, payload: Dict[str, Any], actor: User) -> Dict[str, Any]:
    await ensure_seeded(db)
    article = (
        await db.execute(
            select(HelpArticle).options(selectinload(HelpArticle.category)).where(HelpArticle.id == article_id)
        )
    ).scalar_one_or_none()
    if not article:
        raise LookupError("Help article not found.")

    next_title = payload.get("title", article.title).strip()
    next_summary = payload.get("summary", article.summary)
    next_content = payload.get("content_markdown", article.content_markdown)
    next_tags = payload.get("tags") if payload.get("tags") is not None else _json_loads(article.tags, [])
    _validate_article_safety(next_title, next_summary, next_content, next_tags)

    old_snapshot = {
        "title": article.title,
        "doc_version": article.doc_version,
        "status": article.status,
        "approval_status": article.approval_status,
    }

    if "category_id" in payload and payload["category_id"] is not None:
        article.category_id = payload["category_id"]
    elif payload.get("category_slug"):
        cat = (
            await db.execute(select(HelpCategory).where(HelpCategory.slug == payload["category_slug"]))
        ).scalar_one_or_none()
        if cat:
            article.category_id = cat.id

    article.title = next_title
    article.summary = next_summary
    article.content_markdown = next_content
    article.tags = json.dumps(next_tags)
    if payload.get("module_key") is not None:
        article.module_key = payload["module_key"]
    if payload.get("required_permissions") is not None:
        article.required_permissions = json.dumps(payload["required_permissions"])
    if payload.get("related_routes") is not None:
        article.related_routes = json.dumps(payload["related_routes"])
    if payload.get("related_slugs") is not None:
        article.related_slugs = json.dumps(payload["related_slugs"])
    if payload.get("doc_version"):
        article.doc_version = payload["doc_version"].strip()
    if payload.get("sort_order") is not None:
        article.sort_order = payload["sort_order"]

    now = datetime.now(timezone.utc)
    if payload.get("approval_status") is not None:
        article.approval_status = payload["approval_status"]
        if article.approval_status == "approved":
            article.approved_by_id = actor.id
            article.approved_at = now
        else:
            article.approved_by_id = None
            article.approved_at = None

    if payload.get("status") is not None:
        if article.section == "legal" and payload["status"] == "published" and article.approval_status != "approved":
            raise ValueError("Legal documents require explicit approval before publishing.")
        article.status = payload["status"]
        if article.status == "published" and not article.published_at:
            article.published_at = now

    article.updated_by_id = actor.id
    await db.flush()

    db.add(
        HelpArticleRevision(
            article_id=article.id,
            doc_version=article.doc_version,
            title=article.title,
            summary=article.summary,
            content_markdown=article.content_markdown,
            status=article.status,
            approval_status=article.approval_status,
            change_note=payload.get("change_note") or "Updated via Help Governance.",
            changed_by_id=actor.id,
            changed_by_name=actor.full_name or actor.username,
        )
    )
    db.add(
        AuditLog(
            user_id=actor.id,
            action="HELP_ARTICLE_UPDATE",
            resource_type="help_article",
            resource_id=article.id,
            old_data=json.dumps(old_snapshot),
            new_data=json.dumps({
                "title": article.title,
                "doc_version": article.doc_version,
                "status": article.status,
                "approval_status": article.approval_status,
            }),
            details=f"Updated help article '{article.title}' (v{article.doc_version})",
        )
    )
    await db.flush()
    return await get_article_by_slug(db, article.slug, include_unpublished=True)  # type: ignore


async def toggle_publish_article(
    db: AsyncSession,
    article_id: int,
    publish: bool,
    approve: Optional[bool],
    actor: User,
) -> Dict[str, Any]:
    await ensure_seeded(db)
    article = (
        await db.execute(select(HelpArticle).where(HelpArticle.id == article_id))
    ).scalar_one_or_none()
    if not article:
        raise LookupError("Help article not found.")

    now = datetime.now(timezone.utc)
    if approve is True:
        article.approval_status = "approved"
        article.approved_by_id = actor.id
        article.approved_at = now
    elif approve is False:
        article.approval_status = "pending_approval"
        article.approved_by_id = None
        article.approved_at = None

    if publish:
        if article.section == "legal" and article.approval_status != "approved":
            raise ValueError("Legal & Compliance articles must be marked Approved before publishing.")
        article.status = "published"
        article.published_at = now
    else:
        article.status = "pending_approval" if article.section == "legal" else "unpublished"

    article.updated_by_id = actor.id
    await db.flush()

    db.add(
        HelpArticleRevision(
            article_id=article.id,
            doc_version=article.doc_version,
            title=article.title,
            summary=article.summary,
            content_markdown=article.content_markdown,
            status=article.status,
            approval_status=article.approval_status,
            change_note=f"Publication status updated to '{article.status}' ({article.approval_status}).",
            changed_by_id=actor.id,
            changed_by_name=actor.full_name or actor.username,
        )
    )
    await db.flush()
    return await get_article_by_slug(db, article.slug, include_unpublished=True)  # type: ignore


async def list_article_revisions(db: AsyncSession, article_id: int) -> List[Dict[str, Any]]:
    res = await db.execute(
        select(HelpArticleRevision)
        .where(HelpArticleRevision.article_id == article_id)
        .order_by(desc(HelpArticleRevision.created_at), desc(HelpArticleRevision.id))
    )
    rows = res.scalars().all()
    return [
        {
            "id": r.id,
            "article_id": r.article_id,
            "doc_version": r.doc_version,
            "title": r.title,
            "summary": r.summary,
            "status": r.status,
            "approval_status": r.approval_status,
            "change_note": r.change_note,
            "changed_by_name": r.changed_by_name,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


async def _get_product_about_settings(db: AsyncSession, institution_id: Optional[int]) -> Dict[str, Any]:
    if not institution_id:
        inst = (await db.execute(select(Institution).limit(1))).scalar_one_or_none()
        institution_id = inst.id if inst else None
    if not institution_id:
        return {}
    rows = (
        await db.execute(
            select(InstitutionSetting).where(
                and_(
                    InstitutionSetting.institution_id == institution_id,
                    InstitutionSetting.category == "product_about",
                )
            )
        )
    ).scalars().all()
    parsed: Dict[str, Any] = {}
    for row in rows:
        if row.data_type == "json":
            parsed[row.key] = _json_loads(row.value, row.value)
        else:
            parsed[row.key] = row.value
    return parsed


async def get_product_and_version_info(
    db: AsyncSession,
    institution_id: Optional[int] = None,
) -> Dict[str, Any]:
    current_release = await ReleaseService.get_current_release(db)
    custom = await _get_product_about_settings(db, institution_id)

    version_number = (
        current_release.get("version")
        if current_release and current_release.get("version")
        else settings.VERSION
    )
    build_number = sanitize_build_number(
        current_release.get("build_number")
        if current_release and current_release.get("build_number")
        else settings.BUILD_NUMBER
    )
    release_date = (
        current_release.get("published_at")
        if current_release and current_release.get("published_at")
        else settings.BUILD_DATE
    )
    latest_update_title = sanitize_release_text(
        current_release.get("title") if current_release else f"PrathamOne EduOS v{version_number}"
    )
    latest_update_notes = sanitize_changelog_markdown(
        current_release.get("release_notes_markdown") if current_release else None
    )

    inst: Optional[Institution] = None
    if institution_id:
        inst = (await db.execute(select(Institution).where(Institution.id == institution_id))).scalar_one_or_none()
    if not inst:
        inst = (await db.execute(select(Institution).limit(1))).scalar_one_or_none()

    env_val = str(getattr(settings, "RELEASE_CHANNEL", "stable") or "stable").lower()
    default_deployment = "Institutional Dedicated Deployment (Desktop / Local Web Portal)"
    if env_val in ("beta", "staging"):
        default_deployment = "Institutional Managed Evaluation Deployment"

    return {
        "about_product": {
            "product_name": settings.PRODUCT_NAME,
            "product_category": "Education Management Operating System",
            "edition": settings.EDITION,
            "introduction": custom.get("product_introduction") or (
                "PrathamOne EduOS is an enterprise-grade Education Management Operating System tailored "
                "for coaching institutes and competitive exam academies. It unifies admissions, student "
                "lifecycles, academic schedules, attendance, examinations, fee accounting, concessions, "
                "scholarships, staff payroll, communication, and analytics in one connected workspace."
            ),
            "vision": custom.get("product_vision") or (
                "Empower coaching institutions of every size with transparent, auditable, and paperless "
                "academic and financial operations."
            ),
            "mission": custom.get("product_mission") or (
                "Deliver reliable Single Source of Truth workflows that save faculty and coordinator time, "
                "strengthen fee ledger integrity, and improve communication with parents and students."
            ),
            "vision_mission_status": custom.get("vision_mission_status") or "baseline_pending_commercial_signoff",
            "philosophy": [
                "Single Source of Truth (SSOT): Zero duplicate masters across student, user, subject, and fee ledgers.",
                "View-First Governance: Safe read-only screens by default requiring intentional Edit Mode activation.",
                "Financial Ledger Integrity: Immutable receipts, maker-checker concessions, and period-locked accounting.",
                "Role-Scoped Accountability: Tailored workspaces for Administrators, Principals, Accountants, Teachers, Staff, and Students.",
            ],
            "core_capabilities": [
                "End-to-end CRM Lead Pipeline & Student Admission Conversion",
                "Student Directory, Batch Enrollments, Exit/Reactivation & Printable ID Cards",
                "Configurable Fee Structures, Invoicing, Multi-Mode Collection Desk & Official Receipts",
                "Governed Concessions, Waivers, Merit Scholarships & Sponsor Settlement Tracking",
                "Daily Roll Call, QR Self-Check Terminal, Monthly Register & Absentee Alerts",
                "Conflict-Checked Weekly Division Timetable & Teacher/Student Schedule Portals",
                "Examination Scheduling, Marks Entry, Merit Analytics & Consolidated Report Cards",
                "Unified Faculty & Staff Dossiers, Attendance/Leave Tracking & Teacher Payroll Vouchers",
                "WhatsApp, Email & SMS Communication Center with Expiring Document Sharing",
                "Interactive Tabular Analytics & XLSX/CSV Management Reporting",
            ],
            "available_modules": GENUINE_MODULES_META,
            "target_institutions": [
                "Coaching Institutes & Competitive Test Prep Academies (Foundation, JEE, NEET, CET, Commerce)",
                "Board & Tuition Academies (Standards 1–12)",
                "Skill & Subject-Specific Study Centres",
            ],
            "supported_deployment_models": [
                "Institutional Local / LAN Dedicated Deployment (Desktop & Browser Access)",
                "Hosted Private Institutional Cloud Deployment",
            ],
            "editions": [
                {
                    "name": settings.EDITION,
                    "status": "Active Installed Edition",
                    "description": "Designed for coaching institutes, tuition academies, and multi-batch study centres.",
                }
            ],
        },
        "about_company": {
            "developer_owner_label": "AITDL & SMRITI Systems",
            "smriti_systems": {
                "company_name": "SMRITI Systems",
                "introduction": custom.get("smriti_introduction") or (
                    "SMRITI Systems serves alongside AITDL as co-developer and product owner for "
                    "PrathamOne EduOS institutional software solutions."
                ),
                "technology_profile": custom.get("smriti_tech_profile") or (
                    "Focused on practical education operations software, institutional governance "
                    "automation, and long-term desktop/web reliability for Indian coaching academies."
                ),
                "official_website": custom.get("smriti_website") or None,
                "registered_office": custom.get("smriti_office") or None,
                "leadership_note": custom.get("smriti_leadership") or None,
                "verification_status": custom.get("smriti_verification_status") or "pending_management_verification",
            },
            "aitdl": {
                "company_name": "AITDL — AI Technology & Development Lab",
                "product_architect": settings.AUTHOR,
                "introduction": (
                    "AITDL (AI Technology & Development Lab) leads system architecture, governance "
                    "engineering, and education operating system development for the PrathamOne ecosystem."
                ),
                "official_website": "https://aitdl.com",
                "product_website": "https://prathamone.com",
                "support_phones": ["9323 023 007", "9324 117 007"],
                "support_email": "support@prathamone.com",
                "general_email": "prathamone@outlook.com",
                "copyright_notice": "Copyright © 2026 AITDL (AI Technology & Development Lab). All rights reserved.",
                "product_portfolio": [
                    {
                        "name": "PrathamOne",
                        "tagline": "Education Operating System",
                        "website": "https://prathamone.com",
                        "description": "Enterprise coaching & institutional academic/financial operations suite.",
                    },
                    {
                        "name": "SmritiBooks",
                        "tagline": "Financial & Institutional Ledger",
                        "website": "https://smritibooks.com",
                        "description": "Structured accounting, invoicing, and ledger record ecosystem.",
                    },
                    {
                        "name": "SmritiSys",
                        "tagline": "Platform & Automation Core",
                        "website": "https://smritisys.com",
                        "description": "Operational workflow and administrative automation suite.",
                    },
                ],
            },
            "subscribing_institution": {
                "name": inst.name if inst else "Configured Coaching Institute",
                "code": inst.code if inst else None,
                "identity_separation_notice": (
                    "Institutional profile branding, student rosters, and financial ledgers belong exclusively "
                    "to the subscribing academy above, distinct from the software owners (AITDL & SMRITI Systems)."
                ),
            },
        },
        "version_info": {
            "product_name": settings.PRODUCT_NAME,
            "product_edition": settings.EDITION,
            "version_number": version_number,
            "build_number": build_number,
            "release_date": release_date,
            "release_channel": settings.RELEASE_CHANNEL,
            "release_status": (
                current_release.get("status") if current_release else settings.RELEASE_STATUS
            ),
            "license_status": custom.get("license_status") or "Pending Management License Registration",
            "license_validity": custom.get("license_validity") or None,
            "license_verification_status": "configured" if custom.get("license_validity") else "pending_management_approval",
            "deployment_type": custom.get("deployment_type") or default_deployment,
            "available_modules_count": len(GENUINE_MODULES_META),
            "available_modules": GENUINE_MODULES_META,
            "latest_update": {
                "version": version_number,
                "title": latest_update_title,
                "published_at": release_date,
                "notes_markdown": latest_update_notes,
            },
        },
    }


async def update_product_about_metadata(
    db: AsyncSession,
    institution_id: Optional[int],
    updates: Dict[str, Any],
    actor: User,
) -> Dict[str, Any]:
    allowed_keys = {
        "product_introduction",
        "product_vision",
        "product_mission",
        "vision_mission_status",
        "smriti_introduction",
        "smriti_tech_profile",
        "smriti_website",
        "smriti_office",
        "smriti_leadership",
        "smriti_verification_status",
        "license_status",
        "license_validity",
        "deployment_type",
    }
    if not institution_id:
        inst = (await db.execute(select(Institution).limit(1))).scalar_one_or_none()
        if not inst:
            raise ValueError("No active institution found for storing product metadata.")
        institution_id = inst.id

    for k, v in updates.items():
        if k not in allowed_keys or v is None:
            continue
        str_val = str(v)
        violations = validate_customer_safe_content(str_val)
        if violations:
            raise ValueError(f"Invalid content in '{k}': {' '.join(violations)}")

        existing = (
            await db.execute(
                select(InstitutionSetting).where(
                    and_(
                        InstitutionSetting.institution_id == institution_id,
                        InstitutionSetting.category == "product_about",
                        InstitutionSetting.key == k,
                    )
                )
            )
        ).scalar_one_or_none()

        prev_val = existing.value if existing else None
        if existing:
            existing.value = str_val
            existing.updated_by_id = actor.id
        else:
            db.add(
                InstitutionSetting(
                    institution_id=institution_id,
                    category="product_about",
                    key=k,
                    value=str_val,
                    data_type="string",
                    updated_by_id=actor.id,
                )
            )
        db.add(
            SettingAuditLog(
                institution_id=institution_id,
                setting_key=f"product_about.{k}",
                category="product_about",
                previous_value=prev_val,
                new_value=str_val,
                changed_by_id=actor.id,
                changed_by_name=actor.full_name or actor.username,
                reason=updates.get("change_note") or "Updated Help & About product metadata.",
            )
        )
    await db.flush()
    return await get_product_and_version_info(db, institution_id)


async def get_system_information(
    db: AsyncSession,
    institution_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Restricted Admin-only system telemetry.
    Strictly redacts passwords, API keys, DB credentials, internal file paths, and infrastructure IPs.
    """
    db_status = "Connected"
    latency_ms: Optional[float] = None
    try:
        t0 = time.perf_counter()
        await db.execute(text("SELECT 1"))
        latency_ms = round((time.perf_counter() - t0) * 1000.0, 2)
    except Exception:
        db_status = "Unavailable"

    if not institution_id:
        inst = (await db.execute(select(Institution).limit(1))).scalar_one_or_none()
        institution_id = inst.id if inst else None

    settings_map: Dict[Tuple[str, str], str] = {}
    if institution_id:
        rows = (
            await db.execute(
                select(InstitutionSetting).where(
                    and_(
                        InstitutionSetting.institution_id == institution_id,
                        InstitutionSetting.category.in_(["communication", "integrations", "product_about"]),
                    )
                )
            )
        ).scalars().all()
        for r in rows:
            settings_map[(r.category, r.key)] = r.value

    def _bool_val(cat: str, key: str, default: bool = False) -> bool:
        raw = settings_map.get((cat, key))
        if raw is None:
            return default
        return str(raw).strip().lower() in ("true", "1", "yes", "enabled")

    # Safe backup summary via HousekeepingService (no filesystem paths leaked)
    backups = HousekeepingService.list_backups()
    verified_backups = [b for b in backups if b.get("verified")]
    latest_bk = verified_backups[0] if verified_backups else (backups[0] if backups else None)
    hk_policy = await HousekeepingService.get_housekeeping_policy(db, institution_id or 1) if institution_id else {}

    product_data = await get_product_and_version_info(db, institution_id)
    vinfo = product_data["version_info"]

    whatsapp_enabled = _bool_val("communication", "whatsapp_enabled", True)
    whatsapp_provider = settings_map.get(("communication", "whatsapp_provider")) or "WhatsApp Web / Cloud Adapter"
    email_enabled = _bool_val("communication", "email_enabled", True)
    gateway_name = settings_map.get(("integrations", "payment_gateway")) or "Not Configured"
    gateway_mode = settings_map.get(("integrations", "payment_gateway_mode")) or "sandbox"

    return {
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "application_health": {
            "status": "Healthy" if db_status == "Connected" else "Degraded",
            "api_service": "Operational",
            "security_governance": "View-First & RBAC Active",
        },
        "database_connectivity": {
            "status": db_status,
            "engine": "PostgreSQL",
            "latency_ms": latency_ms,
        },
        "module_availability": [
            {"module_key": m["key"], "name": m["name"], "status": "Available", "guide_slug": m["guide_slug"]}
            for m in GENUINE_MODULES_META
        ],
        "integration_status": [
            {
                "name": "WhatsApp Messaging",
                "provider": whatsapp_provider if "key" not in whatsapp_provider.lower() else "Configured Provider",
                "status": "Enabled" if whatsapp_enabled else "Disabled",
            },
            {
                "name": "Email Dispatch",
                "provider": "Configured Institutional Mailer",
                "status": "Enabled" if email_enabled else "Disabled",
            },
            {
                "name": "Online Payment Gateway",
                "provider": gateway_name,
                "status": f"Configured ({gateway_mode.title()} Mode)" if gateway_name != "Not Configured" else "Not Configured",
            },
        ],
        "last_successful_backup": {
            "status": (
                "Verified Healthy"
                if (latest_bk and latest_bk.get("verified"))
                else ("Recorded (Verification Pending)" if latest_bk else "No Verified Backup Recorded")
            ),
            "last_backup_at": latest_bk.get("created_at") if latest_bk else hk_policy.get("last_backup_date"),
            "verified": bool(latest_bk and latest_bk.get("verified")),
            "total_snapshots": len(backups),
            "frequency": settings_map.get(("integrations", "backup_frequency")) or str(hk_policy.get("backup_frequency", "Daily")).title(),
        },
        "latest_update_information": vinfo["latest_update"],
        "deployment_information": {
            "product_name": vinfo["product_name"],
            "edition": vinfo["product_edition"],
            "version": vinfo["version_number"],
            "build_number": vinfo["build_number"],
            "release_channel": vinfo["release_channel"],
            "deployment_type": vinfo["deployment_type"],
        },
    }


async def create_support_request(
    db: AsyncSession,
    payload: Dict[str, Any],
    actor: User,
) -> Dict[str, Any]:
    inst_id = actor.institution_id
    if not inst_id:
        inst = (await db.execute(select(Institution).limit(1))).scalar_one_or_none()
        if not inst:
            raise ValueError("Unable to resolve institution context for support request.")
        inst_id = inst.id

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    suffix = secrets.token_hex(3).upper()
    ticket_number = f"SUP-{stamp}-{suffix}"

    req = SupportRequest(
        ticket_number=ticket_number,
        institution_id=inst_id,
        user_id=actor.id,
        request_type=payload.get("request_type") or "support_request",
        category=payload.get("category") or "general",
        priority=payload.get("priority") or "medium",
        subject=payload["subject"].strip(),
        description=payload["description"].strip(),
        module_key=payload.get("module_key"),
        page_route=payload.get("page_route"),
        error_reference_id=payload.get("error_reference_id"),
        contact_email=payload.get("contact_email") or actor.email,
        contact_phone=payload.get("contact_phone") or getattr(actor, "phone", None),
        status="open",
    )
    db.add(req)
    await db.flush()

    db.add(
        AuditLog(
            user_id=actor.id,
            action="SUPPORT_REQUEST_CREATE",
            resource_type="support_request",
            resource_id=req.id,
            new_data=json.dumps({"ticket_number": req.ticket_number, "type": req.request_type}),
            details=f"Created support ticket {req.ticket_number}",
        )
    )
    await db.flush()
    return await get_support_request(db, req.id, actor)  # type: ignore


async def list_support_requests(
    db: AsyncSession,
    actor: User,
    status_filter: Optional[str] = None,
    request_type: Optional[str] = None,
) -> List[Dict[str, Any]]:
    is_admin = (actor.role or "").lower() in ADMIN_ROLES
    stmt = (
        select(SupportRequest)
        .options(
            selectinload(SupportRequest.user),
            selectinload(SupportRequest.assigned_to),
            selectinload(SupportRequest.comments),
        )
        .order_by(desc(SupportRequest.created_at), desc(SupportRequest.id))
    )
    if not is_admin:
        stmt = stmt.where(SupportRequest.user_id == actor.id)
    elif actor.institution_id and (actor.role or "").lower() not in ("superadmin", "sysadmin", "super_admin"):
        stmt = stmt.where(SupportRequest.institution_id == actor.institution_id)

    if status_filter:
        stmt = stmt.where(SupportRequest.status == status_filter)
    if request_type:
        stmt = stmt.where(SupportRequest.request_type == request_type)

    rows = (await db.execute(stmt)).scalars().all()
    return [serialize_support_request(r, include_comments=True, include_internal=is_admin) for r in rows]


async def get_support_request(
    db: AsyncSession,
    request_id: int,
    actor: User,
) -> Optional[Dict[str, Any]]:
    is_admin = (actor.role or "").lower() in ADMIN_ROLES
    req = (
        await db.execute(
            select(SupportRequest)
            .options(
                selectinload(SupportRequest.user),
                selectinload(SupportRequest.assigned_to),
                selectinload(SupportRequest.comments),
            )
            .where(SupportRequest.id == request_id)
        )
    ).scalar_one_or_none()
    if not req:
        return None
    if not is_admin and req.user_id != actor.id:
        raise PermissionError("You do not have permission to view another user's support request.")
    return serialize_support_request(req, include_comments=True, include_internal=is_admin)


async def add_support_comment(
    db: AsyncSession,
    request_id: int,
    message: str,
    is_internal_note: bool,
    actor: User,
) -> Dict[str, Any]:
    is_admin = (actor.role or "").lower() in ADMIN_ROLES
    req = (
        await db.execute(select(SupportRequest).where(SupportRequest.id == request_id))
    ).scalar_one_or_none()
    if not req:
        raise LookupError("Support request not found.")
    if not is_admin and req.user_id != actor.id:
        raise PermissionError("You do not have permission to update this support request.")
    if is_internal_note and not is_admin:
        raise PermissionError("Only administrators can add internal support notes.")

    comment = SupportRequestComment(
        request_id=req.id,
        author_id=actor.id,
        author_name=actor.full_name or actor.username,
        author_role=actor.role or "user",
        message=message.strip(),
        is_internal_note=is_internal_note,
    )
    db.add(comment)
    await db.flush()
    return await get_support_request(db, req.id, actor)  # type: ignore


async def update_support_request_status(
    db: AsyncSession,
    request_id: int,
    payload: Dict[str, Any],
    actor: User,
) -> Dict[str, Any]:
    is_admin = (actor.role or "").lower() in ADMIN_ROLES
    if not is_admin:
        raise PermissionError("Administrator authorization is required to update support ticket status.")

    req = (
        await db.execute(select(SupportRequest).where(SupportRequest.id == request_id))
    ).scalar_one_or_none()
    if not req:
        raise LookupError("Support request not found.")

    old_status = req.status
    if payload.get("status"):
        req.status = payload["status"]
        if req.status in ("resolved", "closed") and not req.resolved_at:
            req.resolved_at = datetime.now(timezone.utc)
    if "resolution_notes" in payload and payload["resolution_notes"] is not None:
        req.resolution_notes = payload["resolution_notes"]
    if "assigned_to_id" in payload:
        req.assigned_to_id = payload["assigned_to_id"]
    if payload.get("priority"):
        req.priority = payload["priority"]

    await db.flush()
    db.add(
        AuditLog(
            user_id=actor.id,
            action="SUPPORT_REQUEST_UPDATE",
            resource_type="support_request",
            resource_id=req.id,
            old_data=json.dumps({"status": old_status}),
            new_data=json.dumps({"status": req.status}),
            details=f"Updated ticket {req.ticket_number} status from '{old_status}' to '{req.status}'",
        )
    )
    await db.flush()
    return await get_support_request(db, req.id, actor)  # type: ignore
