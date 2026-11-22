# /**
#  * @file        benchmark_apis.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts
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
#  * @description Source component for Benchmark Apis in the scripts module.
#  */

import urllib.request
import json
import time

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6ImFkbWluIiwiaW5zdGl0dXRpb25faWQiOjEsImV4cCI6MTc5NTQyOTkxMSwidHlwZSI6ImFjY2VzcyIsImp0aSI6IkIyaW5VTTVwU2MwSXNRRzd4cjN1VkEifQ.UeVSfjAjTMjqctz2aMuta8Rf1INPDQfr0MnsU6RwaLw"

headers = {
    'Authorization': f'Bearer {token}',
    'Accept': 'application/json'
}

endpoints = [
    '/api/v1/standards/academic-overview',
    '/api/v1/standards/academic-settings',
    '/api/v1/settings/all',
    '/api/v1/boards/?institution_id=1',
    '/api/v1/standards/?institution_id=1',
    '/api/v1/divisions/',
    '/api/v1/users/',
    '/api/v1/subjects/',
    '/api/v1/timetable/matrix',
    '/api/v1/timetable/',
    '/api/v1/fees/concessions/governance-summary?academic_year_id=1&include_breakdowns=true',
    '/api/v1/settings/profile'
]

print("======================================================================")
print("  MEASURING API BACKEND LATENCY & DATA TRANSFER")
print("======================================================================")

for ep in endpoints:
    t0 = time.time()
    try:
        r = urllib.request.Request(f'http://localhost:8000{ep}', headers=headers)
        with urllib.request.urlopen(r, timeout=10) as res:
            content = res.read()
            dur = (time.time() - t0) * 1000
            print(f"{ep:65} -> {res.status} ({len(content):6} bytes) in {dur:6.1f}ms")
    except urllib.error.HTTPError as e:
        dur = (time.time() - t0) * 1000
        print(f"{ep:65} -> HTTP {e.code} in {dur:6.1f}ms")
    except Exception as e:
        dur = (time.time() - t0) * 1000
        print(f"{ep:65} -> ERR {e} in {dur:6.1f}ms")
