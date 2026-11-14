# /**
#  * @file        verify_api_authorization.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-06
#  * @updated     2026-11-14
#  *
#  * @description Source component for Verify Api Authorization in the scripts module.
#  */

"""Direct API Authorization Verification Script using urllib.

Tests unauthorized direct API requests by unauthenticated callers & ordinary users (accountant) vs Sysadmin.
Verifies HTTP 401/403 protections on academic writes, universal edit, security logs, and forms.
"""
import os
import sys
import json
import urllib.request
import urllib.error
import urllib.parse

BASE_URL = "http://localhost:8000"

def make_request(method, url, data=None, headers=None):
    if headers is None:
        headers = {}
    req = urllib.request.Request(url, method=method)
    for k, v in headers.items():
        req.add_header(k, v)
    
    body = None
    if data is not None:
        if isinstance(data, dict):
            if headers.get("Content-Type") == "application/x-www-form-urlencoded":
                body = urllib.parse.urlencode(data).encode("utf-8")
            else:
                req.add_header("Content-Type", "application/json")
                body = json.dumps(data).encode("utf-8")
        elif isinstance(data, str):
            body = data.encode("utf-8")
            
    try:
        with urllib.request.urlopen(req, data=body) as response:
            status = response.status
            resp_body = response.read().decode("utf-8")
            return status, resp_body
    except urllib.error.HTTPError as e:
        resp_body = e.read().decode("utf-8") if e.fp else ""
        return e.code, resp_body
    except Exception as e:
        return 0, str(e)

def get_token(username, password):
    status, body = make_request(
        "POST",
        f"{BASE_URL}/api/v1/auth/login",
        data={"username": username, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    if status == 200:
        return json.loads(body).get("access_token")
    return None

def test_authorization():
    results = []

    # 1. Unauthenticated requests to protected endpoints
    unauth_endpoints = [
        ("POST", "/api/v1/boards/", {"name": "Hacked Board", "code": "HACK"}),
        ("POST", "/api/v1/standards/", {"name": "Hacked Standard", "code": "HACK"}),
        ("POST", "/api/v1/divisions/", {"name": "Hacked Division"}),
        ("POST", "/api/v1/timetable/", {"division_id": 1}),
        ("POST", "/api/v1/sysadmin/universal-edit", {"model_name": "student", "record_id": 129, "fields": {"first_name": "Bad"}, "reason": "Attack"}),
        ("GET", "/api/v1/sysadmin/security-audit-logs", None),
        ("GET", "/api/v1/forms/audit-logs", None),
    ]

    for method, path, payload in unauth_endpoints:
        status, body = make_request(method, f"{BASE_URL}{path}", data=payload)
        results.append({
            "test": f"Unauthenticated {method} {path}",
            "status_code": status,
            "expected": 401,
            "passed": status == 401
        })

    # 2. Accountant (non-sysadmin / non-academic-admin) testing
    accountant_token = get_token("accountant", os.environ["TEST_ACCOUNTANT_PASSWORD"])
    print(f"Accountant token acquired: {bool(accountant_token)}")
    if accountant_token:
        acc_headers = {"Authorization": f"Bearer {accountant_token}"}
        
        # Accountant attempting Academic Write -> Expected 403 Forbidden
        acc_academic_endpoints = [
            ("POST", "/api/v1/boards/", {"name": "Illegal Board", "code": "ILLG"}),
            ("POST", "/api/v1/standards/", {"name": "Illegal Standard", "code": "ILLG"}),
            ("POST", "/api/v1/divisions/", {"name": "Illegal Division", "code": "ILLG"}),
            ("POST", "/api/v1/timetable/", {"division_id": 1, "day_of_week": "Monday"}),
            ("POST", "/api/v1/sysadmin/universal-edit", {"model_name": "student", "record_id": 129, "fields": {"first_name": "Bad"}, "reason": "Attack"}),
            ("GET", "/api/v1/sysadmin/security-audit-logs", None),
        ]
        for method, path, payload in acc_academic_endpoints:
            status, body = make_request(method, f"{BASE_URL}{path}", data=payload, headers=acc_headers)
            results.append({
                "test": f"Accountant (non-admin) {method} {path}",
                "status_code": status,
                "expected": 403,
                "passed": status == 403
            })

    # 3. Sysadmin authenticated requests
    sysadmin_token = get_token("sysadmin", "7)Yaw1dC_uQEfmYqmT")
    print(f"Sysadmin token acquired: {bool(sysadmin_token)}")
    if not sysadmin_token:
        print("Failed to acquire Sysadmin token!")
        return False

    sysadmin_headers = {"Authorization": f"Bearer {sysadmin_token}"}
    
    # Sysadmin security audit logs
    status, body = make_request("GET", f"{BASE_URL}/api/v1/sysadmin/security-audit-logs", headers=sysadmin_headers)
    results.append({
        "test": "Sysadmin GET /api/v1/sysadmin/security-audit-logs",
        "status_code": status,
        "expected": 200,
        "passed": status == 200
    })

    # Sysadmin forms audit logs
    status, body = make_request("GET", f"{BASE_URL}/api/v1/forms/audit-logs", headers=sysadmin_headers)
    results.append({
        "test": "Sysadmin GET /api/v1/forms/audit-logs",
        "status_code": status,
        "expected": 200,
        "passed": status == 200
    })

    # Sysadmin universal edit protected field rejection (id or system fields)
    status, body = make_request(
        "POST",
        f"{BASE_URL}/api/v1/sysadmin/universal-edit",
        data={"model_name": "student", "record_id": 129, "fields": {"id": 99999}, "reason": "Test ID override"},
        headers=sysadmin_headers
    )
    results.append({
        "test": "Sysadmin POST universal-edit blocked field (id)",
        "status_code": status,
        "expected": 400,
        "passed": status == 400,
        "response_detail": body[:120]
    })

    # Sysadmin universal edit missing reason rejection
    status, body = make_request(
        "POST",
        f"{BASE_URL}/api/v1/sysadmin/universal-edit",
        data={"model_name": "student", "record_id": 129, "fields": {"remarks": "Note"}, "reason": ""},
        headers=sysadmin_headers
    )
    results.append({
        "test": "Sysadmin POST universal-edit missing reason",
        "status_code": status,
        "expected": [400, 422],
        "passed": status in [400, 422],
        "response_detail": body[:120]
    })

    # Print summary
    print("\nAPI Authorization Results:")
    all_passed = True
    for res in results:
        status_str = "PASS" if res["passed"] else "FAIL"
        if not res["passed"]:
            all_passed = False
        print(f"[{status_str}] {res['test']} -> HTTP {res['status_code']} (Expected: {res['expected']})")

    with open("api_authorization_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    return all_passed

if __name__ == "__main__":
    success = test_authorization()
    sys.exit(0 if success else 1)
