# /**
#  * @file        forensic_api_frontend_audit.py
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
#  * @description Forensic analyzer extracting all Backend API routes, Pydantic schemas, and Frontend API clients & page field usages.
#  */

import os
import re
import json

BACKEND_ENDPOINTS_DIR = "backend/app/api/v1/endpoints"
SERVICES_DIR = "backend/app/services"
FRONTEND_ENDPOINTS_FILE = "frontend/src/api/endpoints.ts"
FRONTEND_PAGES_DIR = "frontend/src/pages"
FRONTEND_TYPES_FILE = "frontend/src/types/index.ts"

def audit_backend_routes():
    routes = []
    route_regex = re.compile(r'@router\.(get|post|put|delete|patch)\(\s*["\']([^"\']+)["\']')
    func_regex = re.compile(r'async def ([a-zA-Z0-9_]+)\(')
    
    for fname in os.listdir(BACKEND_ENDPOINTS_DIR):
        if not fname.endswith('.py') or fname == '__init__.py':
            continue
        fpath = os.path.join(BACKEND_ENDPOINTS_DIR, fname)
        module_tag = fname[:-3]
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        matches = list(route_regex.finditer(content))
        for m in matches:
            method = m.group(1).upper()
            sub_path = m.group(2)
            # Find function name after this match
            after_text = content[m.end():m.end()+300]
            func_match = func_regex.search(after_text)
            func_name = func_match.group(1) if func_match else "unknown"
            
            routes.append({
                "module_file": fname,
                "module_tag": module_tag,
                "method": method,
                "path": f"/api/v1/{module_tag}{sub_path}" if sub_path != "/" else f"/api/v1/{module_tag}",
                "sub_path": sub_path,
                "handler_function": func_name
            })
    return routes

def audit_frontend_endpoints():
    endpoints = []
    if not os.path.exists(FRONTEND_ENDPOINTS_FILE):
        return endpoints
    with open(FRONTEND_ENDPOINTS_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find export const xxxApi = { ... }
    api_obj_regex = re.compile(r'export const ([a-zA-Z0-9_]+Api)\s*=\s*\{([^}]+)\}', re.DOTALL)
    for m in api_obj_regex.finditer(content):
        api_name = m.group(1)
        body = m.group(2)
        # Find method calls inside
        call_regex = re.compile(r'([a-zA-Z0-9_]+)\s*:\s*\(([^)]*)\)\s*=>\s*apiClient\.(get|post|put|delete|patch)<([^>]*)>\(\s*[`\'"]([^`\'"]+)[`\'"]')
        for cm in call_regex.finditer(body):
            method_name = cm.group(1)
            params = cm.group(2).strip()
            http_verb = cm.group(3).upper()
            type_return = cm.group(4).strip()
            url_path = cm.group(5).strip()
            endpoints.append({
                "client_object": api_name,
                "method_name": method_name,
                "http_verb": http_verb,
                "url_path": url_path,
                "return_type": type_return,
                "params": params
            })
    return endpoints

def audit_frontend_pages():
    pages = []
    for fname in os.listdir(FRONTEND_PAGES_DIR):
        if not (fname.endswith('.tsx') or fname.endswith('.ts')):
            continue
        fpath = os.path.join(FRONTEND_PAGES_DIR, fname)
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Find used APIs
        apis_used = re.findall(r'([a-zA-Z0-9_]+Api)\.([a-zA-Z0-9_]+)', content)
        unique_api_calls = sorted(list(set([f"{a[0]}.{a[1]}" for a in apis_used])))

        # Find form inputs
        inputs = re.findall(r'<input[^>]+name=["\']([^"\']+)["\']', content)
        placeholders = re.findall(r'placeholder=["\']([^"\']+)["\']', content)

        pages.append({
            "page_file": fname,
            "line_count": len(content.splitlines()),
            "api_calls": unique_api_calls,
            "input_names": list(set(inputs)),
            "placeholders_sample": list(set(placeholders))[:8]
        })
    return pages

def main():
    backend_routes = audit_backend_routes()
    frontend_endpoints = audit_frontend_endpoints()
    frontend_pages = audit_frontend_pages()

    audit_data = {
        "total_backend_routes": len(backend_routes),
        "backend_routes": backend_routes,
        "total_frontend_endpoints": len(frontend_endpoints),
        "frontend_endpoints": frontend_endpoints,
        "total_frontend_pages": len(frontend_pages),
        "frontend_pages": frontend_pages
    }

    with open("tools/api_frontend_audit_output.json", "w", encoding="utf-8") as f:
        json.dump(audit_data, f, indent=2)

    print(f"Backend routes mapped: {len(backend_routes)}")
    print(f"Frontend endpoints mapped: {len(frontend_endpoints)}")
    print(f"Frontend pages analyzed: {len(frontend_pages)}")

if __name__ == "__main__":
    main()
