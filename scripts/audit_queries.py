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
    # Parse useQuery calls using brace matching
    query_blocks = []
    idx = 0
    while True:
        pos = content.find("useQuery", idx)
        if pos == -1:
            break
        open_brace = content.find("{", pos)
        if open_brace == -1 or open_brace > pos + 80:
            idx = pos + 8
            continue
        depth = 1
        curr = open_brace + 1
        while curr < len(content) and depth > 0:
            if content[curr] == "{":
                depth += 1
            elif content[curr] == "}":
                depth -= 1
            curr += 1
        query_blocks.append(content[open_brace:curr])
        idx = curr
    
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
    })

print(f"{'FILE':<40} {'TOTAL':<7} {'ENABLED':<9} {'STALETIME':<11} {'PLACEHOLDER':<13}")
print("=" * 82)
for r in sorted(results, key=lambda x: x["total"], reverse=True):
    print(f"{r['file']:<40} {r['total']:<7} {r['enabled']:<9} {r['staleTime']:<11} {r['placeholder']:<13}")
