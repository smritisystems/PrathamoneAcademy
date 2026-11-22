# /**
#  * @file        audit_queries.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts.audit_queries
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-22
#  * @updated     2026-11-22
#  *
#  * @description Audit React Query caching, staleTime, enabled guards, and placeholderData across all frontend pages.
#  */

import os
import re
from pathlib import Path

pages_dir = Path("frontend/src/pages")
results = []

for file_path in sorted(pages_dir.rglob("*.tsx")):
    content = file_path.read_text(encoding="utf-8", errors="ignore")
    # Find all useQuery calls
    query_blocks = re.findall(r"useQuery\s*(?:<[^>]*>)?\s*\(\{([\s\S]*?)\}\)", content)
    if not query_blocks:
        continue
    
    total = len(query_blocks)
    has_enabled = sum(1 for b in query_blocks if re.search(r"\benabled\s*:", b))
    has_staletime = sum(1 for b in query_blocks if re.search(r"\bstaleTime\s*:", b))
    has_placeholder = sum(1 for b in query_blocks if re.search(r"\bplaceholderData\s*:", b))
    
    rel_path = file_path.relative_to(pages_dir)
    results.append({
        "file": str(rel_path),
        "total": total,
        "enabled": has_enabled,
        "staleTime": has_staletime,
        "placeholder": has_placeholder,
        "needs_optimization": (total - has_staletime > 0) or (total > 3 and has_enabled == 0)
    })

print(f"{'FILE':<40} {'TOTAL':<7} {'ENABLED':<9} {'STALETIME':<11} {'PLACEHOLDER':<13}")
print("=" * 82)
for r in sorted(results, key=lambda x: x["total"], reverse=True):
    print(f"{r['file']:<40} {r['total']:<7} {r['enabled']:<9} {r['staleTime']:<11} {r['placeholder']:<13}")
