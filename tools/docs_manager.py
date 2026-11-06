#!/usr/bin/env python3
# /**
#  * @file        docs_manager.py
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
#  * @created     2026-11-06
#  * @updated     2026-11-06
#  *
#  * @description Centralized documentation management, auto-organization, indexing, search, and validation engine.
#  */

import os
import sys
import re
import json
import shutil
import hashlib
import argparse
from datetime import datetime
from pathlib import Path

# Ensure UTF-8 output encoding on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Product metadata constants
PRODUCT_NAME = "PrathamOne EduOS"
PRODUCT_EDITION = "Coaching Institute Edition"
PRODUCT_VERSION = "1.0.0"
ORGANIZATION_NAME = "AITDL — AI Technology & Development Lab"
PRODUCT_ARCHITECT = "Jawahar R Mallah"

# Default Brain Directory
DEFAULT_BRAIN_DIR = r"C:\Users\netma\.gemini\antigravity\brain\f0e72778-27df-4928-92a5-dc51f7834a6e"

# Standard 27 Modules Registry
MODULES = [
    {
        "id": "00_PRODUCT_OVERVIEW",
        "name": "Product Overview & Vision",
        "keywords": ["rebranding", "vision", "overview", "roadmap", "policy framework", "institute edition", "eduos"],
        "entities": ["InstituteSetting"],
        "api_routes": ["/api/v1/system/info"]
    },
    {
        "id": "01_ARCHITECTURE",
        "name": "System Architecture & Workflows",
        "keywords": ["architecture", "workflow", "multi-tier", "high-level", "system design", "component diagram"],
        "entities": [],
        "api_routes": []
    },
    {
        "id": "02_INSTALLATION_DEPLOYMENT",
        "name": "Installation & Deployment",
        "keywords": ["installation", "deployment", "docker", "compose", "hosting", "installer", "synchronization", "nginx"],
        "entities": [],
        "api_routes": ["/health"]
    },
    {
        "id": "03_ACADEMIC_MANAGEMENT",
        "name": "Academic Structure & Courses",
        "keywords": ["academic", "standards", "divisions", "courses", "subjects", "batches", "timetable", "forensic resolution"],
        "entities": ["Standard", "Division", "Subject", "TimetableEntry"],
        "api_routes": ["/api/v1/standards", "/api/v1/divisions", "/api/v1/subjects"]
    },
    {
        "id": "04_STUDENT_MANAGEMENT",
        "name": "Student Directory & Admissions",
        "keywords": ["student", "admission", "enrollment", "lifecycle", "withdrawal", "restoration", "student assignment"],
        "entities": ["Student", "StudentEnrollment", "StudentAcademicHistory"],
        "api_routes": ["/api/v1/students", "/api/v1/admissions"]
    },
    {
        "id": "05_TEACHER_MANAGEMENT",
        "name": "Teacher & Faculty Directory",
        "keywords": ["teacher", "faculty", "staff management", "instructor", "lecturer"],
        "entities": ["User", "UserRole"],
        "api_routes": ["/api/v1/users", "/api/v1/staff"]
    },
    {
        "id": "06_TEACHER_PAYROLL",
        "name": "Teacher Payroll & Payment Management",
        "keywords": ["payroll", "teaching session", "lecture rate", "hourly rate", "fixed contract", "payment voucher", "voucher ledger", "substitute rate"],
        "entities": ["TeacherPaymentProfile", "TeachingSession", "TeacherPayroll", "TeacherPaymentVoucher"],
        "api_routes": ["/api/v1/teacher-payroll"]
    },
    {
        "id": "07_ATTENDANCE",
        "name": "Attendance Register & Tracking",
        "keywords": ["attendance", "rfid", "biometric", "absentee", "check-in", "session attendance"],
        "entities": ["Attendance"],
        "api_routes": ["/api/v1/attendance"]
    },
    {
        "id": "08_EXAMINATION",
        "name": "Examinations, Tests & Grading",
        "keywords": ["examination", "exam", "test", "grading", "marks", "result", "report card"],
        "entities": ["Exam", "ExamResult"],
        "api_routes": ["/api/v1/examinations"]
    },
    {
        "id": "09_FEES_PAYMENTS",
        "name": "Fee Structures, Payments & Receipts",
        "keywords": ["fee", "payment", "receipt", "installment", "fee plan", "adjust student fees", "reconciliation", "fee ledger", "receipt edit"],
        "entities": ["FeeStructure", "FeePlan", "StudentFee", "Payment"],
        "api_routes": ["/api/v1/fees", "/api/v1/payments"]
    },
    {
        "id": "10_FINANCE_ACCOUNTING",
        "name": "Finance, Accounting & Ledgers",
        "keywords": ["finance", "accounting", "ledger", "double-entry", "chart of accounts", "daybook", "expense"],
        "entities": ["Account", "JournalEntry"],
        "api_routes": ["/api/v1/accounting"]
    },
    {
        "id": "11_REPORTS_EXPORTS",
        "name": "Reports, Analytics & Data Grids",
        "keywords": ["excel report", "data grid", "export center", "dashboard stats", "csv export", "tabular export", "report grid", "analytics grid"],
        "entities": [],
        "api_routes": ["/api/v1/reports"]
    },
    {
        "id": "12_RBAC_SECURITY",
        "name": "RBAC, Security & Permissions",
        "keywords": ["rbac", "security", "role", "permission", "user management", "remediation", "matrix", "access control"],
        "entities": ["User", "Role", "Permission", "UserRole"],
        "api_routes": ["/api/v1/users", "/api/v1/auth"]
    },
    {
        "id": "13_SYSADMIN_SETTINGS",
        "name": "Sysadmin Center & System Settings",
        "keywords": ["sysadmin", "system settings", "institute settings", "branding", "universal editor", "configuration", "production readiness", "settings and configuration"],
        "entities": ["InstituteSetting", "SystemSetting"],
        "api_routes": ["/api/v1/sysadmin", "/api/v1/institute-settings"]
    },
    {
        "id": "14_PRINTING_DOCUMENTS",
        "name": "Document Generation & Print Engine",
        "keywords": ["printing", "receipt printing", "printable forms", "kyc system", "a5", "id card", "certificate", "print template", "print and share"],
        "entities": [],
        "api_routes": ["/api/v1/print"]
    },
    {
        "id": "15_INTEGRATIONS",
        "name": "Integrations, Messaging & Importers",
        "keywords": ["integration", "whatsapp", "sms", "email", "communication", "padata", "importer", "csv import", "sharing report"],
        "entities": [],
        "api_routes": ["/api/v1/communication"]
    },
    {
        "id": "16_DATABASE_API",
        "name": "Database Schema & REST API Standards",
        "keywords": ["database", "schema", "api standards", "optimization", "data model", "alembic", "migration", "sql"],
        "entities": [],
        "api_routes": []
    },
    {
        "id": "17_UI_UX_DESIGN",
        "name": "UI/UX Design, Components & Footer",
        "keywords": ["ui", "ux", "footer", "application footer", "collapsible application footer", "error handling", "recovery", "layout", "styling", "pixel perfection"],
        "entities": [],
        "api_routes": []
    },
    {
        "id": "18_TESTING_QA",
        "name": "Testing, Verification & Quality Assurance",
        "keywords": ["testing", "qa", "pytest", "vitest", "playwright", "acceptance criteria", "test report"],
        "entities": [],
        "api_routes": []
    },
    {
        "id": "19_RELEASES_CHANGELOG",
        "name": "Releases, Versioning & Changelogs",
        "keywords": ["release", "changelog", "versioning", "version baseline", "release notes", "semantic versioning", "attribution", "code attribution", "change management"],
        "entities": ["Release"],
        "api_routes": ["/api/v1/system/releases"]
    },
    {
        "id": "20_AUDITS_COMPLIANCE",
        "name": "Forensic Audits & Data Health",
        "keywords": ["audit", "forensic", "compliance", "full system audit", "remediation", "pre-migration", "data cleanup", "comprehensive audit", "phase1 and phase2", "cleanup preview", "cleanup"],
        "entities": [],
        "api_routes": []
    },
    {
        "id": "21_TROUBLESHOOTING",
        "name": "Troubleshooting, Runbooks & Recovery",
        "keywords": ["troubleshooting", "backup", "restore", "runbook", "incident", "recovery"],
        "entities": [],
        "api_routes": []
    },
    {
        "id": "22_USER_MANUALS",
        "name": "User Manuals & Operating Guides",
        "keywords": ["user manual", "quick start guide", "sysadmin manual", "manual", "operating guide", "user manual completion"],
        "entities": [],
        "api_routes": []
    },
    {
        "id": "23_DEVELOPMENT_GUIDES",
        "name": "Developer Manuals & Coding Standards",
        "keywords": ["developer manual", "development guide", "contributing", "coding standard"],
        "entities": [],
        "api_routes": []
    },
    {
        "id": "24_AI_AGENT_KNOWLEDGE",
        "name": "AI Agent Governance & Prompts",
        "keywords": ["ai agent", "governance policy", "prompt blueprint", "gemini", "agent instructions", "agent governance"],
        "entities": [],
        "api_routes": []
    },
    {
        "id": "25_BUSINESS_REQUIREMENTS",
        "name": "Business Rules & SSOT Policy",
        "keywords": ["business rules", "ssot", "single source of truth", "coaching business", "policy decision register", "requirements", "build plan"],
        "entities": [],
        "api_routes": []
    },
    {
        "id": "26_ARCHIVED",
        "name": "Archived & Superseded Documents",
        "keywords": ["legacy", "deprecated", "superseded", "old version", "archived"],
        "entities": [],
        "api_routes": []
    }
]

MODULE_MAP = {m["id"]: m for m in MODULES}

def compute_sha256(filepath: str) -> str:
    """Computes SHA-256 hash of a file."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(16384):
            h.update(chunk)
    return h.hexdigest()

def parse_yaml_frontmatter(content: str) -> tuple[dict, str]:
    """Extracts YAML frontmatter and body from markdown content."""
    meta = {}
    body = content
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            raw_meta = parts[1].strip()
            body = parts[2].lstrip()
            # Parse simple YAML key-values
            for line in raw_meta.splitlines():
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if ":" in line:
                    key, val = line.split(":", 1)
                    key = key.strip()
                    val = val.strip().strip('"').strip("'")
                    # Handle json lists like ["a", "b"]
                    if val.startswith("[") and val.endswith("]"):
                        try:
                            val = json.loads(val.replace("'", '"'))
                        except Exception:
                            val = [x.strip().strip('"').strip("'") for x in val[1:-1].split(",") if x.strip()]
                    meta[key] = val
    return meta, body

def generate_yaml_frontmatter(meta: dict) -> str:
    """Generates standard YAML frontmatter block."""
    lines = ["---"]
    keys_order = [
        "title", "module", "category", "document_type", "product", "edition",
        "version", "doc_version", "created_date", "updated_date", "author",
        "organization", "status", "tags", "entities", "api_routes", "related_modules"
    ]
    for k in keys_order:
        if k in meta and meta[k] is not None:
            v = meta[k]
            if isinstance(v, list):
                json_v = json.dumps(v, ensure_ascii=False)
                lines.append(f"{k}: {json_v}")
            else:
                lines.append(f'{k}: "{v}"')
    # Add any remaining keys
    for k, v in meta.items():
        if k not in keys_order and v is not None:
            if isinstance(v, list):
                json_v = json.dumps(v, ensure_ascii=False)
                lines.append(f"{k}: {json_v}")
            else:
                lines.append(f'{k}: "{v}"')
    lines.append("---")
    return "\n".join(lines) + "\n\n"

def infer_module_and_type(filename: str, content: str = "") -> tuple[str, str, str]:
    """Infers module ID, document type, and title from filename and content."""
    lower_name = filename.lower()
    lower_content = content[:3000].lower() if content else ""
    combined = lower_name + " " + lower_content

    # Determine document type
    doc_type = "REPORT"
    if "plan" in lower_name:
        doc_type = "IMPLEMENTATION-PLAN"
    elif "report" in lower_name:
        doc_type = "IMPLEMENTATION-REPORT"
    elif "audit" in lower_name:
        doc_type = "AUDIT-REPORT"
    elif "manual" in lower_name or "guide" in lower_name:
        if "user" in lower_name or "quick" in lower_name:
            doc_type = "USER-MANUAL"
        elif "dev" in lower_name:
            doc_type = "DEVELOPER-MANUAL"
        else:
            doc_type = "USER-MANUAL"
    elif "spec" in lower_name:
        doc_type = "SPECIFICATION"
    elif "policy" in lower_name or "ssot" in lower_name or "rule" in lower_name:
        doc_type = "POLICY-FRAMEWORK"
    elif "reconciliation" in lower_name:
        doc_type = "RECONCILIATION-REPORT"
    elif "security" in lower_name:
        doc_type = "SECURITY-AUDIT"
    elif "changelog" in lower_name or "release" in lower_name:
        doc_type = "CHANGELOG"

    # Infer Title
    title = ""
    if content:
        for line in content.splitlines():
            line = line.strip()
            if line.startswith("# "):
                title = line[2:].strip()
                break
    if not title:
        base = os.path.splitext(filename)[0]
        title = base.replace("_", " ").replace("-", " ").title()

    # Direct high-confidence filename rules
    if "payroll" in lower_name:
        return "06_TEACHER_PAYROLL", doc_type, title
    if "teacher" in lower_name and ("staff" in lower_name or "faculty" in lower_name):
        return "05_TEACHER_MANAGEMENT", doc_type, title
    if "student" in lower_name or "admission" in lower_name:
        return "04_STUDENT_MANAGEMENT", doc_type, title
    if "academic" in lower_name or "standard" in lower_name or "batch" in lower_name or "course" in lower_name:
        return "03_ACADEMIC_MANAGEMENT", doc_type, title
    if "attendance" in lower_name:
        return "07_ATTENDANCE", doc_type, title
    if "exam" in lower_name:
        return "08_EXAMINATION", doc_type, title
    if "fee" in lower_name or "payment" in lower_name or "receipt" in lower_name:
        if "print" in lower_name or "a5" in lower_name:
            return "14_PRINTING_DOCUMENTS", doc_type, title
        return "09_FEES_PAYMENTS", doc_type, title
    if "print" in lower_name or "kyc" in lower_name or "form" in lower_name:
        return "14_PRINTING_DOCUMENTS", doc_type, title
    if "sysadmin" in lower_name or "branding" in lower_name or "institute_setting" in lower_name:
        return "13_SYSADMIN_SETTINGS", doc_type, title
    if "rbac" in lower_name or "user-management" in lower_name or "role" in lower_name or "permission" in lower_name:
        return "12_RBAC_SECURITY", doc_type, title
    if "excel" in lower_name or "export" in lower_name or "report_grid" in lower_name:
        return "11_REPORTS_EXPORTS", doc_type, title
    if "accounting" in lower_name or "ledger" in lower_name or "voucher" in lower_name:
        return "10_FINANCE_ACCOUNTING", doc_type, title
    if "communication" in lower_name or "padata" in lower_name or "whatsapp" in lower_name:
        return "15_INTEGRATIONS", doc_type, title
    if "database" in lower_name or "data_model" in lower_name or "schema" in lower_name:
        return "16_DATABASE_API", doc_type, title
    if "footer" in lower_name or "error_handling" in lower_name or "ui" in lower_name:
        return "17_UI_UX_DESIGN", doc_type, title
    if "acceptance" in lower_name or "testing" in lower_name or "vitest" in lower_name or "playwright" in lower_name:
        return "18_TESTING_QA", doc_type, title
    if "release" in lower_name or "version" in lower_name or "changelog" in lower_name or "attribution" in lower_name:
        return "19_RELEASES_CHANGELOG", doc_type, title
    if "audit" in lower_name or "remediation" in lower_name or "cleanup" in lower_name:
        return "20_AUDITS_COMPLIANCE", doc_type, title
    if "deployment" in lower_name or "install" in lower_name or "docker" in lower_name or "github_push" in lower_name:
        return "02_INSTALLATION_DEPLOYMENT", doc_type, title
    if "user_manual" in lower_name or "quick_start" in lower_name:
        return "22_USER_MANUALS", doc_type, title
    if "troubleshoot" in lower_name or "backup" in lower_name:
        return "21_TROUBLESHOOTING", doc_type, title
    if "ai_agent" in lower_name or "gemini" in lower_name:
        return "24_AI_AGENT_KNOWLEDGE", doc_type, title
    if "business_rule" in lower_name or "ssot" in lower_name or "build_plan" in lower_name or "build-plan" in lower_name:
        return "25_BUSINESS_REQUIREMENTS", doc_type, title
    if "rebranding" in lower_name or "overview" in lower_name:
        return "00_PRODUCT_OVERVIEW", doc_type, title

    # Score modules
    scores = {}
    for m in MODULES:
        score = 0
        for kw in m["keywords"]:
            if kw in lower_name:
                score += 5
            elif kw in lower_content:
                score += 1
        for ent in m["entities"]:
            if ent.lower() in combined:
                score += 3
        for api in m["api_routes"]:
            if api.lower() in combined:
                score += 4
        scores[m["id"]] = score

    best_module = max(scores, key=scores.get)
    if scores[best_module] == 0:
        # Fallback based on keywords in name
        if "build-plan" in lower_name or "build_plan" in lower_name:
            best_module = "25_BUSINESS_REQUIREMENTS"
        elif "architecture" in lower_name:
            best_module = "01_ARCHITECTURE"
        elif "payroll" in lower_name:
            best_module = "06_TEACHER_PAYROLL"
        elif "fee" in lower_name or "receipt" in lower_name:
            best_module = "09_FEES_PAYMENTS"
        elif "student" in lower_name:
            best_module = "04_STUDENT_MANAGEMENT"
        elif "sysadmin" in lower_name:
            best_module = "13_SYSADMIN_SETTINGS"
        elif "audit" in lower_name:
            best_module = "20_AUDITS_COMPLIANCE"
        else:
            best_module = "00_PRODUCT_OVERVIEW"

    return best_module, doc_type, title

# ================= COMMAND: AUDIT =================

def cmd_audit(args):
    """Audits repository and brain artifacts for all documentation files."""
    brain_dir = getattr(args, "brain_dir", None) or DEFAULT_BRAIN_DIR
    docs_dir = getattr(args, "docs_dir", "docs")

    print("\n" + "="*70)
    print(f"  PRATHAMONE EduOS — DOCUMENTATION AUDIT & INVENTORY")
    print("="*70)

    # 1. Inspect existing docs/
    indexed_files = []
    if os.path.exists(docs_dir):
        for root, dirs, files in os.walk(docs_dir):
            for f in files:
                p = os.path.normpath(os.path.join(root, f))
                ext = os.path.splitext(f)[1].lower()
                size = os.path.getsize(p)
                indexed_files.append({"path": p, "name": f, "ext": ext, "size": size})

    # 2. Inspect brain artifacts
    brain_files = []
    if os.path.exists(brain_dir):
        for f in os.listdir(brain_dir):
            p = os.path.join(brain_dir, f)
            if os.path.isfile(p):
                ext = os.path.splitext(f)[1].lower()
                if ext in {".md", ".png", ".jpg", ".pdf", ".docx", ".xlsx", ".csv", ".html"}:
                    brain_files.append({"path": p, "name": f, "ext": ext, "size": os.path.getsize(p)})

    # 3. Root candidates
    root_candidates = []
    for f in ["README.md", "AGENTS.md", "GEMINI.md", "RELEASE_NOTES.md"]:
        if os.path.exists(f):
            root_candidates.append({"path": f, "name": f, "ext": ".md", "size": os.path.getsize(f)})

    print(f"\n[FOUND] Existing docs/ files:       {len(indexed_files)}")
    print(f"[FOUND] External brain artifacts:   {len(brain_files)}")
    print(f"[FOUND] Repository root documents:  {len(root_candidates)}")
    total = len(indexed_files) + len(brain_files) + len(root_candidates)
    print(f"[TOTAL] Total documentation items:  {total}")

    # Format breakdown
    by_ext = {}
    for item in indexed_files + brain_files + root_candidates:
        ext = item["ext"]
        by_ext[ext] = by_ext.get(ext, 0) + 1

    print("\nBreakdown by Extension:")
    for ext, count in sorted(by_ext.items(), key=lambda x: -x[1]):
        print(f"  {ext.ljust(8)}: {count} files")

    # Unindexed brain markdown documents
    print("\nPending Agent Brain Markdown Documents:")
    md_brain = [f for f in brain_files if f["ext"] == ".md"]
    for i, item in enumerate(md_brain[:15], 1):
        mod, dtype, title = infer_module_and_type(item["name"])
        print(f"  [{i:02d}] {item['name'][:42].ljust(44)} -> {mod} ({dtype})")
    if len(md_brain) > 15:
        print(f"  ... and {len(md_brain) - 15} more markdown files.")

    print(f"\nAudit complete. To automatically classify and organize all documents, run:")
    print(f"  python tools/docs_manager.py organize")
    return 0

# ================= COMMAND: ORGANIZE =================

def cmd_organize(args):
    """Intelligently organizes documents into standard 27-module hierarchy."""
    brain_dir = getattr(args, "brain_dir", None) or DEFAULT_BRAIN_DIR
    docs_dir = getattr(args, "docs_dir", "docs")
    dry_run = getattr(args, "dry_run", False)

    print("\n" + "="*70)
    print("  PRATHAMONE EduOS — DOCUMENTATION AUTO-ORGANIZATION ENGINE")
    print("="*70)

    # Ensure all 27 directories exist
    for m in MODULES:
        os.makedirs(os.path.join(docs_dir, m["id"]), exist_ok=True)
    os.makedirs(os.path.join(docs_dir, "assets", "screenshots"), exist_ok=True)
    os.makedirs(os.path.join(docs_dir, "assets", "diagrams"), exist_ok=True)
    os.makedirs(os.path.join(docs_dir, "assets", "attachments"), exist_ok=True)

    organized_count = 0

    # 1. Ingest Brain Artifacts
    if os.path.exists(brain_dir):
        for f in os.listdir(brain_dir):
            if f.endswith(".metadata.json"):
                continue
            src_path = os.path.join(brain_dir, f)
            if not os.path.isfile(src_path):
                continue
            ext = os.path.splitext(f)[1].lower()

            if ext == ".md":
                with open(src_path, "r", encoding="utf-8", errors="ignore") as fp:
                    content = fp.read()
                meta, body = parse_yaml_frontmatter(content)
                target_mod, doc_type, inferred_title = infer_module_and_type(f, body)

                # Build frontmatter
                title = meta.get("title") or inferred_title
                created = meta.get("created_date") or datetime.fromtimestamp(os.path.getmtime(src_path)).strftime("%Y-%m-%d")
                status = meta.get("status") or "Approved"

                # Standard filename: YYYY-MM-DD_MODULE_DOCUMENT-TYPE_DESCRIPTION_VERSION.md
                clean_slug = re.sub(r"[^A-Za-z0-9\-]+", "-", os.path.splitext(f)[0].upper()).strip("-")
                std_filename = f"{created}_{target_mod.split('_', 1)[-1]}_{doc_type}_{clean_slug}_V1.md"
                dest_path = os.path.join(docs_dir, target_mod, std_filename)

                frontmatter_meta = {
                    "title": title,
                    "module": target_mod,
                    "category": doc_type,
                    "document_type": doc_type,
                    "product": PRODUCT_NAME,
                    "edition": PRODUCT_EDITION,
                    "version": PRODUCT_VERSION,
                    "doc_version": "1.0",
                    "created_date": created,
                    "updated_date": created,
                    "author": PRODUCT_ARCHITECT,
                    "organization": ORGANIZATION_NAME,
                    "status": status,
                    "tags": [target_mod.lower().replace("_", "-"), doc_type.lower()],
                    "entities": MODULE_MAP.get(target_mod, {}).get("entities", []),
                    "api_routes": MODULE_MAP.get(target_mod, {}).get("api_routes", []),
                    "related_modules": []
                }
                new_content = generate_yaml_frontmatter(frontmatter_meta) + body

                if not dry_run:
                    with open(dest_path, "w", encoding="utf-8") as out_fp:
                        out_fp.write(new_content)
                print(f"  [ORGANIZE] {f} -> {target_mod}/{std_filename}")
                organized_count += 1

            elif ext in {".png", ".jpg", ".webp", ".svg"}:
                dest_path = os.path.join(docs_dir, "assets", "screenshots", f)
                if not dry_run:
                    shutil.copy2(src_path, dest_path)
                print(f"  [ASSET] {f} -> assets/screenshots/{f}")
                organized_count += 1

    # 2. Ingest Legacy docs/ Files into Numbered Directories
    legacy_map = {
        "docs/ACCEPTANCE_CRITERIA.md": ("18_TESTING_QA", "SPECIFICATION", "ACCEPTANCE-CRITERIA"),
        "docs/ATTENDANCE_AND_TEST_POLICY.md": ("07_ATTENDANCE", "POLICY-FRAMEWORK", "ATTENDANCE-AND-TEST-POLICY"),
        "docs/COACHING_BUSINESS_RULES.md": ("25_BUSINESS_REQUIREMENTS", "POLICY-FRAMEWORK", "COACHING-BUSINESS-RULES"),
        "docs/COACHING_INSTITUTE_POLICY_FRAMEWORK.md": ("00_PRODUCT_OVERVIEW", "POLICY-FRAMEWORK", "COACHING-INSTITUTE-POLICY-FRAMEWORK"),
        "docs/COURSE_BATCH_ENROLLMENT_RULES.md": ("03_ACADEMIC_MANAGEMENT", "SPECIFICATION", "COURSE-BATCH-ENROLLMENT-RULES"),
        "docs/DATA_PRIVACY_AND_SECURITY.md": ("12_RBAC_SECURITY", "POLICY-FRAMEWORK", "DATA-PRIVACY-AND-SECURITY"),
        "docs/FEE_POLICY_AND_ACCOUNTING.md": ("09_FEES_PAYMENTS", "POLICY-FRAMEWORK", "FEE-POLICY-AND-ACCOUNTING"),
        "docs/IMPLEMENTATION_PLAN.md": ("25_BUSINESS_REQUIREMENTS", "IMPLEMENTATION-PLAN", "ORIGINAL-IMPLEMENTATION-PLAN"),
        "docs/index.md": ("00_PRODUCT_OVERVIEW", "SPECIFICATION", "SYSTEM-INDEX-OVERVIEW"),
        "docs/POLICY_DECISION_REGISTER.md": ("25_BUSINESS_REQUIREMENTS", "POLICY-FRAMEWORK", "POLICY-DECISION-REGISTER"),
        "docs/ROADMAP.md": ("00_PRODUCT_OVERVIEW", "SPECIFICATION", "PRODUCT-ROADMAP"),
        "docs/ROLE_PERMISSION_MATRIX.md": ("12_RBAC_SECURITY", "SPECIFICATION", "ROLE-PERMISSION-MATRIX"),
        "docs/WORKFLOW_SPECIFICATIONS.md": ("01_ARCHITECTURE", "SPECIFICATION", "WORKFLOW-SPECIFICATIONS"),
        "docs/architecture/API_STANDARDS.md": ("16_DATABASE_API", "SPECIFICATION", "REST-API-STANDARDS"),
        "docs/architecture/DATABASE_DESIGN.md": ("16_DATABASE_API", "SPECIFICATION", "DATABASE-DESIGN-AND-SCHEMA"),
        "docs/architecture/SYSTEM_ARCHITECTURE.md": ("01_ARCHITECTURE", "ARCHITECTURE-DESIGN", "SYSTEM-ARCHITECTURE"),
        "docs/governance/AI_AGENT_GOVERNANCE.md": ("24_AI_AGENT_KNOWLEDGE", "POLICY-FRAMEWORK", "AI-AGENT-GOVERNANCE"),
        "docs/governance/BUSINESS_RULES.md": ("25_BUSINESS_REQUIREMENTS", "POLICY-FRAMEWORK", "CORE-BUSINESS-RULES"),
        "docs/governance/CODE_ATTRIBUTION_AND_VERSIONING_POLICY.md": ("19_RELEASES_CHANGELOG", "POLICY-FRAMEWORK", "CODE-ATTRIBUTION-POLICY"),
        "docs/governance/POLICY_DECISION_REGISTER.md": ("25_BUSINESS_REQUIREMENTS", "POLICY-FRAMEWORK", "GOVERNANCE-DECISION-REGISTER"),
        "docs/operations/BACKUP_AND_RESTORE.md": ("21_TROUBLESHOOTING", "DEVELOPER-MANUAL", "BACKUP-AND-RESTORE-RUNBOOK"),
        "docs/operations/DEPLOYMENT.md": ("02_INSTALLATION_DEPLOYMENT", "DEVELOPER-MANUAL", "PRODUCTION-DEPLOYMENT-GUIDE"),
        "docs/operations/INSTALLATION.md": ("02_INSTALLATION_DEPLOYMENT", "DEVELOPER-MANUAL", "INSTALLATION-GUIDE"),
        "docs/operations/TROUBLESHOOTING.md": ("21_TROUBLESHOOTING", "DEVELOPER-MANUAL", "TROUBLESHOOTING-RUNBOOK"),
        "docs/releases/RELEASE_NOTES.md": ("19_RELEASES_CHANGELOG", "CHANGELOG", "RELEASE-NOTES-HISTORICAL")
    }

    # Add modules/ subdirectories
    for mod_dir in ["admissions", "attendance", "examinations", "fees", "payments", "reports", "standards", "students", "users"]:
        dir_path = os.path.join(docs_dir, "modules", mod_dir)
        if os.path.exists(dir_path):
            target_m = "04_STUDENT_MANAGEMENT"
            if mod_dir == "attendance": target_m = "07_ATTENDANCE"
            elif mod_dir == "examinations": target_m = "08_EXAMINATION"
            elif mod_dir in ("fees", "payments"): target_m = "09_FEES_PAYMENTS"
            elif mod_dir == "reports": target_m = "11_REPORTS_EXPORTS"
            elif mod_dir == "standards": target_m = "03_ACADEMIC_MANAGEMENT"
            elif mod_dir == "users": target_m = "12_RBAC_SECURITY"

            for sub_f in os.listdir(dir_path):
                if sub_f.endswith(".md"):
                    orig_p = os.path.normpath(os.path.join(dir_path, sub_f)).replace("\\", "/")
                    base_slug = os.path.splitext(sub_f)[0].replace("_", "-")
                    legacy_map[orig_p] = (target_m, "SPECIFICATION", f"{mod_dir.upper()}-{base_slug}")

    # Copy / standardize legacy docs
    for orig_p, (target_m, doc_type, slug) in legacy_map.items():
        if os.path.exists(orig_p):
            with open(orig_p, "r", encoding="utf-8", errors="ignore") as fp:
                content = fp.read()
            meta, body = parse_yaml_frontmatter(content)
            title = meta.get("title")
            if not title:
                for line in body.splitlines():
                    if line.strip().startswith("# "):
                        title = line.strip()[2:].strip()
                        break
            if not title:
                title = slug.replace("-", " ").title()

            created = meta.get("created_date") or datetime.fromtimestamp(os.path.getmtime(orig_p)).strftime("%Y-%m-%d")
            std_filename = f"{created}_{target_m.split('_', 1)[-1]}_{doc_type}_{slug}_V1.md"
            dest_path = os.path.join(docs_dir, target_m, std_filename)

            frontmatter_meta = {
                "title": title,
                "module": target_m,
                "category": doc_type,
                "document_type": doc_type,
                "product": PRODUCT_NAME,
                "edition": PRODUCT_EDITION,
                "version": PRODUCT_VERSION,
                "doc_version": "1.0",
                "created_date": created,
                "updated_date": created,
                "author": PRODUCT_ARCHITECT,
                "organization": ORGANIZATION_NAME,
                "status": "Approved",
                "tags": [target_m.lower().replace("_", "-"), doc_type.lower()],
                "entities": MODULE_MAP.get(target_m, {}).get("entities", []),
                "api_routes": MODULE_MAP.get(target_m, {}).get("api_routes", []),
                "related_modules": []
            }
            new_content = generate_yaml_frontmatter(frontmatter_meta) + body
            if not dry_run:
                with open(dest_path, "w", encoding="utf-8") as out_fp:
                    out_fp.write(new_content)
            print(f"  [MIGRATE] {orig_p} -> {target_m}/{std_filename}")
            organized_count += 1

    # Copy User Manual Packages to 22_USER_MANUALS
    manual_src = os.path.join(docs_dir, "user_manual")
    manual_dest = os.path.join(docs_dir, "22_USER_MANUALS")
    if os.path.exists(manual_src):
        for root, dirs, files in os.walk(manual_src):
            for f in files:
                ext = os.path.splitext(f)[1].lower()
                if ext in {".pdf", ".docx", ".html"}:
                    src = os.path.join(root, f)
                    dst = os.path.join(manual_dest, f)
                    if not dry_run and not os.path.exists(dst):
                        shutil.copy2(src, dst)
                        print(f"  [MANUAL] {f} -> 22_USER_MANUALS/{f}")
                        organized_count += 1
                elif ext in {".png", ".jpg"} and "screenshots" in root:
                    src = os.path.join(root, f)
                    dst = os.path.join(docs_dir, "assets", "screenshots", f)
                    if not dry_run and not os.path.exists(dst):
                        shutil.copy2(src, dst)
                        organized_count += 1

    print(f"\n[DONE] Organized {organized_count} documents and assets into {docs_dir}/")
    print("[REINDEXING] Updating central documentation index and manifest...")
    cmd_reindex(args)
    return 0

# ================= COMMAND: REINDEX =================

def cmd_reindex(args):
    """Rebuilds docs/DOCUMENTATION_INDEX.md and docs/DOCUMENTATION_MANIFEST.json."""
    docs_dir = getattr(args, "docs_dir", "docs")
    index_md_path = os.path.join(docs_dir, "DOCUMENTATION_INDEX.md")
    manifest_json_path = os.path.join(docs_dir, "DOCUMENTATION_MANIFEST.json")

    print("\n" + "="*70)
    print(f"  PRATHAMONE EduOS — REINDEXING DOCUMENTATION KNOWLEDGE BASE")
    print("="*70)

    documents = []
    inverted_index = {}

    for root, dirs, files in os.walk(docs_dir):
        # Exclude legacy folders from reindex manifest to keep canonical view clean
        rel_root = os.path.relpath(root, docs_dir).replace("\\", "/")
        if any(rel_root.startswith(d) for d in ["modules", "architecture", "operations", "governance", "releases", "user_manual"]):
            continue

        for f in sorted(files):
            if f in {".gitkeep", "DOCUMENTATION_INDEX.md", "DOCUMENTATION_MANIFEST.json"}:
                continue
            ext = os.path.splitext(f)[1].lower()
            file_path = os.path.join(root, f)
            rel_path = os.path.relpath(file_path, docs_dir).replace("\\", "/")
            size = os.path.getsize(file_path)
            sha256 = compute_sha256(file_path)

            doc_info = {
                "id": rel_path.replace("/", "_").replace(".", "_"),
                "filename": f,
                "relative_path": rel_path,
                "extension": ext,
                "size_bytes": size,
                "sha256": sha256,
                "module": rel_path.split("/")[0] if "/" in rel_path else "00_PRODUCT_OVERVIEW",
                "title": f,
                "category": "DOCUMENT",
                "document_type": "DOCUMENT",
                "version": "1.0.0",
                "doc_version": "1.0",
                "status": "Approved",
                "created_date": datetime.fromtimestamp(os.path.getmtime(file_path)).strftime("%Y-%m-%d"),
                "updated_date": datetime.fromtimestamp(os.path.getmtime(file_path)).strftime("%Y-%m-%d"),
                "author": PRODUCT_ARCHITECT,
                "organization": ORGANIZATION_NAME,
                "tags": [],
                "entities": [],
                "api_routes": [],
                "related_modules": []
            }

            if ext == ".md":
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as fp:
                        content = fp.read()
                    meta, body = parse_yaml_frontmatter(content)
                    if meta:
                        for k, v in meta.items():
                            doc_info[k] = v
                    else:
                        for line in body.splitlines():
                            if line.strip().startswith("# "):
                                doc_info["title"] = line.strip()[2:].strip()
                                break
                except Exception:
                    pass

            documents.append(doc_info)

            # Inverted index tokens
            tokens = set()
            tokens.update(re.findall(r"\w+", doc_info.get("title", "").lower()))
            tokens.update(re.findall(r"\w+", doc_info.get("filename", "").lower()))
            for tag in doc_info.get("tags", []):
                tokens.update(re.findall(r"\w+", str(tag).lower()))
            for ent in doc_info.get("entities", []):
                tokens.update(re.findall(r"\w+", str(ent).lower()))
            for t in tokens:
                if len(t) > 2:
                    inverted_index.setdefault(t, []).append(doc_info["relative_path"])

    # Build DOCUMENTATION_MANIFEST.json
    manifest_data = {
        "manifest_version": "1.0.0",
        "product": PRODUCT_NAME,
        "edition": PRODUCT_EDITION,
        "product_version": PRODUCT_VERSION,
        "organization": ORGANIZATION_NAME,
        "product_architect": PRODUCT_ARCHITECT,
        "generated_at": datetime.now().isoformat(),
        "total_documents": len(documents),
        "modules_catalog": MODULES,
        "documents": documents,
        "inverted_index": {k: sorted(list(set(v))) for k, v in sorted(inverted_index.items())}
    }

    with open(manifest_json_path, "w", encoding="utf-8") as fp:
        json.dump(manifest_data, fp, indent=2, ensure_ascii=False)
    print(f"[MANIFEST] Wrote machine-readable manifest: {manifest_json_path} ({len(documents)} items)")

    # Build DOCUMENTATION_INDEX.md
    index_md = []
    index_md.append(f"# {PRODUCT_NAME} — Centralized Documentation Index")
    index_md.append(f"\n**Product:** {PRODUCT_NAME}  \n**Edition:** {PRODUCT_EDITION}  \n**Version:** {PRODUCT_VERSION}  \n**Organization:** {ORGANIZATION_NAME}  \n**Product Architect:** {PRODUCT_ARCHITECT}  \n**Last Reindexed:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  \n**Total Indexed Items:** {len(documents)}  \n")
    index_md.append("---\n")
    index_md.append("## Quick Jump Directory\n")
    index_md.append("| Module # | Module Directory | Registered Documents | Description |")
    index_md.append("|---|---|---|---|")

    # Group docs by module
    docs_by_mod = {}
    for d in documents:
        m = d.get("module", "00_PRODUCT_OVERVIEW")
        docs_by_mod.setdefault(m, []).append(d)

    for m in MODULES:
        mid = m["id"]
        cnt = len(docs_by_mod.get(mid, []))
        index_md.append(f"| `{mid.split('_')[0]}` | [{mid}](#{mid.lower()}) | **{cnt}** | {m['name']} |")
    index_md.append(f"| `assets` | [assets/screenshots](#asset-galleries) | **{len(docs_by_mod.get('assets', []))}** | Verification UI captures, diagrams, attachments |")

    index_md.append("\n---\n")
    index_md.append("## Module-Wise Knowledge Base\n")

    for m in MODULES:
        mid = m["id"]
        mod_docs = docs_by_mod.get(mid, [])
        index_md.append(f"### <a id=\"{mid.lower()}\"></a>{mid} — {m['name']}\n")
        if not mod_docs:
            index_md.append("*No documents currently registered in this module.*\n")
            continue

        index_md.append("| Document Title | Type | Version | Date | Status | Relative Document Link | Related Modules |")
        index_md.append("|---|---|---|---|---|---|---|")
        for doc in sorted(mod_docs, key=lambda x: x.get("title", "")):
            t = doc.get("title", doc["filename"])
            dtype = doc.get("document_type", "REPORT")
            ver = doc.get("doc_version") or doc.get("version", "1.0")
            dt = doc.get("created_date", "-")
            st = doc.get("status", "Approved")
            rel_link = f"[{doc['filename']}]({doc['relative_path']})"
            rel_mods = ", ".join(doc.get("related_modules", [])) or "-"
            index_md.append(f"| **{t}** | `{dtype}` | `{ver}` | {dt} | `{st}` | {rel_link} | {rel_mods} |")
        index_md.append("\n")

    # Assets section
    if "assets" in docs_by_mod:
        index_md.append("### <a id=\"asset-galleries\"></a>assets — Visual Assets & Reference Attachments\n")
        index_md.append("| Asset Filename | Subdirectory | Size | Relative Link |")
        index_md.append("|---|---|---|---|")
        for asset in sorted(docs_by_mod["assets"], key=lambda x: x["filename"]):
            size_kb = f"{asset['size_bytes'] / 1024:.1f} KB"
            link = f"[{asset['filename']}]({asset['relative_path']})"
            index_md.append(f"| `{asset['filename']}` | `{os.path.dirname(asset['relative_path'])}` | {size_kb} | {link} |")
        index_md.append("\n")

    index_md.append("---\n")
    index_md.append("## CLI Documentation Operations\n")
    index_md.append("```bash\n# Search across all indexed documentation\npython tools/docs_manager.py search \"teacher payroll\"\n\n# Filter search by database entity or API route\npython tools/docs_manager.py search --entity TeacherPaymentProfile\npython tools/docs_manager.py search --api /api/v1/teacher-payroll\n\n# Reindex after creating or updating docs\npython tools/docs_manager.py reindex\n\n# Validate naming, links, and metadata\npython tools/docs_manager.py validate\n```\n")

    with open(index_md_path, "w", encoding="utf-8") as fp:
        fp.write("\n".join(index_md))
    print(f"[INDEX] Wrote comprehensive markdown index: {index_md_path}")
    return 0

# ================= COMMAND: SEARCH =================

def cmd_search(args):
    """Fast search across indexed documentation."""
    docs_dir = getattr(args, "docs_dir", "docs")
    manifest_path = os.path.join(docs_dir, "DOCUMENTATION_MANIFEST.json")
    query = (getattr(args, "query", "") or "").lower().strip()
    filter_module = (getattr(args, "module", "") or "").lower()
    filter_type = (getattr(args, "type", "") or "").lower()
    filter_status = (getattr(args, "status", "") or "").lower()
    filter_entity = (getattr(args, "entity", "") or "").lower()
    filter_api = (getattr(args, "api", "") or "").lower()
    limit = getattr(args, "limit", 20)

    if not os.path.exists(manifest_path):
        print(f"[ERROR] Manifest not found. Run 'python tools/docs_manager.py reindex' first.")
        return 1

    with open(manifest_path, "r", encoding="utf-8") as fp:
        manifest = json.load(fp)

    documents = manifest.get("documents", [])
    results = []

    for doc in documents:
        # Apply filters
        if filter_module and filter_module not in doc.get("module", "").lower():
            continue
        if filter_type and filter_type not in doc.get("document_type", "").lower():
            continue
        if filter_status and filter_status != doc.get("status", "").lower():
            continue
        if filter_entity:
            entities = [e.lower() for e in doc.get("entities", [])]
            if not any(filter_entity in e for e in entities):
                continue
        if filter_api:
            apis = [a.lower() for a in doc.get("api_routes", [])]
            if not any(filter_api in a for a in apis):
                continue

        # Score search query
        score = 0
        matches = []
        if query:
            if query in doc.get("title", "").lower():
                score += 20
                matches.append(f"Title match: {doc.get('title')}")
            if query in doc.get("filename", "").lower():
                score += 15
                matches.append(f"Filename match: {doc.get('filename')}")
            for tag in doc.get("tags", []):
                if query in str(tag).lower():
                    score += 10
                    matches.append(f"Tag match: {tag}")
            for ent in doc.get("entities", []):
                if query in str(ent).lower():
                    score += 10
                    matches.append(f"Entity match: {ent}")

            # Check file content if text
            if doc.get("extension") in {".md", ".txt"}:
                fpath = os.path.join(docs_dir, doc.get("relative_path"))
                if os.path.exists(fpath):
                    try:
                        with open(fpath, "r", encoding="utf-8", errors="ignore") as fp:
                            for lineno, line in enumerate(fp, 1):
                                if query in line.lower():
                                    score += 2
                                    if len(matches) < 3:
                                        matches.append(f"L{lineno}: {line.strip()[:80]}")
                    except Exception:
                        pass
            if score == 0:
                continue
        else:
            score = 1

        results.append((score, doc, matches))

    results.sort(key=lambda x: -x[0])

    print("\n" + "="*70)
    print(f"  SEARCH RESULTS ({len(results)} matches for '{query or 'ALL'}')")
    print("="*70)

    for i, (score, doc, matches) in enumerate(results[:limit], 1):
        print(f"\n[{i:02d}] {doc.get('title')} ({doc.get('module')})")
        print(f"     Path:    docs/{doc.get('relative_path')}")
        print(f"     Type:    {doc.get('document_type')} | Status: {doc.get('status')} | Version: {doc.get('doc_version', '1.0')}")
        if doc.get("entities"):
            print(f"     Entities: {', '.join(doc.get('entities'))}")
        if matches:
            for m in matches[:2]:
                print(f"     > {m}")

    if len(results) > limit:
        print(f"\n... and {len(results) - limit} more matching documents. Use --limit to show more.")
    return 0

# ================= COMMAND: LIST =================

def cmd_list(args):
    """Lists registered documents with filters."""
    docs_dir = getattr(args, "docs_dir", "docs")
    manifest_path = os.path.join(docs_dir, "DOCUMENTATION_MANIFEST.json")
    if not os.path.exists(manifest_path):
        print(f"[ERROR] Manifest not found. Run 'python tools/docs_manager.py reindex' first.")
        return 1

    with open(manifest_path, "r", encoding="utf-8") as fp:
        manifest = json.load(fp)

    filter_mod = (getattr(args, "module", "") or "").lower()
    filter_type = (getattr(args, "type", "") or "").lower()
    docs = manifest.get("documents", [])

    filtered = []
    for d in docs:
        if filter_mod and filter_mod not in d.get("module", "").lower():
            continue
        if filter_type and filter_type not in d.get("document_type", "").lower():
            continue
        filtered.append(d)

    print("\n" + "="*80)
    print(f"  REGISTERED DOCUMENTS ({len(filtered)} items)")
    print("="*80)
    for i, d in enumerate(filtered, 1):
        print(f"[{i:03d}] {d.get('module').ljust(26)} | {d.get('document_type', 'REPORT').ljust(18)} | {d.get('title')[:36]}")
    return 0

# ================= COMMAND: VALIDATE =================

def cmd_validate(args):
    """Validates naming conventions, metadata completeness, links, and integrity."""
    docs_dir = getattr(args, "docs_dir", "docs")
    manifest_path = os.path.join(docs_dir, "DOCUMENTATION_MANIFEST.json")

    print("\n" + "="*70)
    print("  PRATHAMONE EduOS — DOCUMENTATION INTEGRITY VALIDATOR")
    print("="*70)

    if not os.path.exists(manifest_path):
        print("[WARNING] Manifest missing. Reindexing now...")
        cmd_reindex(args)

    with open(manifest_path, "r", encoding="utf-8") as fp:
        manifest = json.load(fp)

    documents = manifest.get("documents", [])
    errors = []
    warnings = []

    naming_regex = re.compile(r"^\d{4}-\d{2}-\d{2}_[A-Z0-9\-]+_[A-Z0-9\-]+_.*_V\d+(\.\d+)?\.[a-z0-9]+$", re.IGNORECASE)
    allowed_exceptions = {"README.md", "DOCUMENTATION_INDEX.md", "DOCUMENTATION_RULES.md", "DOCUMENTATION_MANIFEST.json", ".gitkeep"}

    for doc in documents:
        rel = doc.get("relative_path")
        fname = doc.get("filename")
        fpath = os.path.join(docs_dir, rel)

        # 1. Existence check
        if not os.path.exists(fpath):
            errors.append(f"Missing file: {rel}")
            continue

        # 2. Checksum check
        current_sha = compute_sha256(fpath)
        if current_sha != doc.get("sha256"):
            warnings.append(f"Checksum mismatch for {rel} (file modified after reindex)")

        # 3. Naming convention check
        if not rel.startswith("assets/") and fname not in allowed_exceptions and not rel.startswith("22_USER_MANUALS/") and not rel.startswith("26_ARCHIVED/"):
            if not naming_regex.match(fname):
                warnings.append(f"Naming non-compliant: {fname} (Expected: YYYY-MM-DD_MODULE_TYPE_DESCRIPTION_VERSION.ext)")

        # 4. Frontmatter completeness check for markdown
        if doc.get("extension") == ".md" and fname not in allowed_exceptions and not rel.startswith("26_ARCHIVED/"):
            req_fields = ["title", "module", "product", "version", "status"]
            for rf in req_fields:
                if not doc.get(rf):
                    warnings.append(f"Missing frontmatter field '{rf}' in {rel}")

    print(f"\n[VALIDATION RESULT]")
    print(f"Total documents validated: {len(documents)}")
    print(f"Errors (Blocking):         {len(errors)}")
    print(f"Warnings (Advisory):       {len(warnings)}")

    if errors:
        print("\nErrors:")
        for e in errors[:10]:
            print(f"  ❌ {e}")
        return 1

    if warnings:
        print("\nAdvisory Warnings (Non-blocking):")
        for w in warnings[:10]:
            print(f"  ⚠️  {w}")
        if len(warnings) > 10:
            print(f"  ... and {len(warnings) - 10} more warnings.")

    print("\n✅ Documentation validation PASSED! System is healthy and compliant.")
    return 0

# ================= COMMAND: SSOT REGISTRY =================

def cmd_ssot_registry(args):
    """Displays canonical platform entities, services, and APIs to enforce Rule 002."""
    print("\n" + "="*75)
    print("  PRATHAMONE EduOS — CANONICAL SINGLE SOURCE OF TRUTH (SSOT) REGISTRY")
    print("="*75)
    print("\nRule 002: Search this registry BEFORE creating any new entity or service!\n")

    registry = [
        ("Human Identity Master", "User", "users", "backend/app/models/user.py", "Staff, Teachers, Admins, Principals, Accountants"),
        ("Student Identity Master", "Student", "students", "backend/app/models/student.py", "Primary student master profile"),
        ("Institute Settings Master", "InstituteSetting", "institute_settings", "backend/app/models/institute_setting.py", "Global institute brand, address, phone"),
        ("Academic Standards Master", "Standard", "standards", "backend/app/models/academic.py", "Class levels (e.g. 10th, 12th)"),
        ("Divisions & Batches", "Division", "divisions", "backend/app/models/academic.py", "Class batches / sections"),
        ("Course Subjects Master", "Subject", "subjects", "backend/app/models/academic.py", "Curriculum subjects"),
        ("Timetable & Schedules", "TimetableEntry", "timetable_entries", "backend/app/models/academic.py", "Lecture scheduling"),
        ("Teacher Rate Profiles", "TeacherPaymentProfile", "teacher_payment_profiles", "backend/app/models/teacher_payroll.py", "Hourly/lecture/monthly/contract rates"),
        ("Teaching Session Log", "TeachingSession", "teaching_sessions", "backend/app/models/teacher_payroll.py", "Verified lecture records with locks"),
        ("Teacher Payroll Runs", "TeacherPayroll", "teacher_payrolls", "backend/app/models/teacher_payroll.py", "Monthly calculated payroll sheets"),
        ("Payroll Vouchers Ledger", "TeacherPaymentVoucher", "teacher_payment_vouchers", "backend/app/models/teacher_payroll.py", "Bank/cash disbursement vouchers"),
        ("Fee Plans & Structures", "FeePlan / FeeStructure", "fee_plans / fee_structures", "backend/app/models/fees.py", "Tuition, admission fee templates"),
        ("Student Fee Balances", "StudentFee", "student_fees", "backend/app/models/fees.py", "Assigned student fee commitments"),
        ("Fee Payments Ledger", "Payment", "payments", "backend/app/models/fees.py", "Collected student payment receipts")
    ]

    print(f"{'Responsibility'.ljust(26)} | {'Canonical Model'.ljust(24)} | {'Table Name'.ljust(25)} | {'Source Path'}")
    print("-" * 115)
    for resp, model, tbl, path, _ in registry:
        print(f"{resp.ljust(26)} | {model.ljust(24)} | {tbl.ljust(25)} | {path}")
    print("\n" + "="*75)
    return 0

# ================= CLI MAIN =================

def main():
    parser = argparse.ArgumentParser(
        description="PrathamOne EduOS Centralized Documentation Management & Auto-Organization Engine."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # audit
    p_audit = subparsers.add_parser("audit", help="Audit repository and brain artifacts for unindexed docs.")
    p_audit.add_argument("--brain-dir", help="Path to AI agent brain artifact store.")
    p_audit.add_argument("--docs-dir", default="docs", help="Docs root directory.")

    # organize
    p_org = subparsers.add_parser("organize", help="Auto-classify, standardize names, and organize documents.")
    p_org.add_argument("--brain-dir", help="Path to AI agent brain artifact store.")
    p_org.add_argument("--docs-dir", default="docs", help="Docs root directory.")
    p_org.add_argument("--dry-run", action="store_true", help="Simulate without writing files.")

    # reindex
    p_reindex = subparsers.add_parser("reindex", help="Rebuild DOCUMENTATION_INDEX.md and DOCUMENTATION_MANIFEST.json.")
    p_reindex.add_argument("--docs-dir", default="docs", help="Docs root directory.")

    # search
    p_search = subparsers.add_parser("search", help="Search indexed documentation by query, entity, API, or module.")
    p_search.add_argument("query", nargs="?", default="", help="Keyword query.")
    p_search.add_argument("--module", help="Filter by module.")
    p_search.add_argument("--type", help="Filter by document type.")
    p_search.add_argument("--status", help="Filter by approval status.")
    p_search.add_argument("--entity", help="Filter by database entity.")
    p_search.add_argument("--api", help="Filter by API endpoint route.")
    p_search.add_argument("--limit", type=int, default=15, help="Max results to display.")
    p_search.add_argument("--docs-dir", default="docs", help="Docs root directory.")

    # list
    p_list = subparsers.add_parser("list", help="List registered documents.")
    p_list.add_argument("--module", help="Filter by module.")
    p_list.add_argument("--type", help="Filter by document type.")
    p_list.add_argument("--docs-dir", default="docs", help="Docs root directory.")

    # validate
    p_val = subparsers.add_parser("validate", help="Validate naming, metadata completeness, links, and integrity.")
    p_val.add_argument("--docs-dir", default="docs", help="Docs root directory.")

    # ssot-registry
    subparsers.add_parser("ssot-registry", help="Display platform canonical SSOT entities and models.")

    args = parser.parse_args()

    dispatch = {
        "audit": cmd_audit,
        "organize": cmd_organize,
        "reindex": cmd_reindex,
        "search": cmd_search,
        "list": cmd_list,
        "validate": cmd_validate,
        "ssot-registry": cmd_ssot_registry
    }

    cmd_fn = dispatch.get(args.command)
    if cmd_fn:
        sys.exit(cmd_fn(args))
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
