# /**
#  * @file        update_sysadmin_audit_timeline_p2.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      tools
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-09
#  * @updated     2026-11-09
#  *
#  * @description Add unified audit-timeline endpoint to sysadmin router for Stage 2.3 (P2).
#  */

def update():
    with open('backend/app/api/v1/endpoints/sysadmin.py', 'r', encoding='utf-8') as f:
        txt = f.read()

    endpoint_code = '''
@router.get("/audit-timeline")
async def get_unified_audit_timeline(
    domain: Optional[str] = Query(None, description="Filter by domain (SECURITY_SYSTEM, SETTINGS, COMMUNICATION, CODEX_SECURITY, STUDENT_ACADEMIC)"),
    search: Optional[str] = Query(None, description="Search keyword in action or details"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_sysadmin),
):
    """
    Unified cross-domain audit log query endpoint accessing the canonical v_unified_audit_logs view.
    """
    where_clauses = []
    params = {"skip": skip, "limit": limit}

    if domain:
        where_clauses.append("domain = :domain")
        params["domain"] = domain
    if search:
        where_clauses.append("(action ILIKE :search OR details ILIKE :search)")
        params["search"] = f"%{search}%"

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    count_query = text(f"SELECT count(*) FROM v_unified_audit_logs {where_sql}")
    total = (await db.execute(count_query, params)).scalar() or 0

    data_query = text(f"""
        SELECT source_table, source_id, domain, action, entity_type, entity_id, actor_user_id, details, status, ip_address, created_at
        FROM v_unified_audit_logs
        {where_sql}
        ORDER BY created_at DESC
        OFFSET :skip LIMIT :limit
    """)
    rows = (await db.execute(data_query, params)).fetchall()

    items = [
        {
            "source_table": r[0],
            "source_id": r[1],
            "domain": r[2],
            "action": r[3],
            "entity_type": r[4],
            "entity_id": r[5],
            "actor_user_id": r[6],
            "details": r[7],
            "status": r[8],
            "ip_address": r[9],
            "created_at": r[10].isoformat() if r[10] else None,
        }
        for r in rows
    ]

    return {
        "status": "success",
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": items,
    }
'''

    txt += endpoint_code

    with open('backend/app/api/v1/endpoints/sysadmin.py', 'w', encoding='utf-8') as f:
        f.write(txt)
    print("Added /audit-timeline to backend/app/api/v1/endpoints/sysadmin.py")

if __name__ == '__main__':
    update()
