# /**
#  * @file        build_all_reports_pipeline.py
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
#  * @description Pipeline to author all 8 Audit Reports + Global Governance Policy.
#  */

import os
import json

def load_data():
    with open('tools/db_forensic_output.json', 'r', encoding='utf-8') as f:
        db = json.load(f)
    with open('tools/api_frontend_audit_output.json', 'r', encoding='utf-8') as f:
        api = json.load(f)
    return db, api

def write_dual(filename, doc_path, content):
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
    os.makedirs(os.path.dirname(doc_path), exist_ok=True)
    with open(doc_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Generated: {filename} and {doc_path}")

print("Report pipeline module initialized.")
