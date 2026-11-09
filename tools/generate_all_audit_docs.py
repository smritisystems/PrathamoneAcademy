# /**
#  * @file        generate_all_audit_docs.py
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
#  * @description Comprehensive generator for the 8 Master Audit Deliverables and
#  */

import os
import json
from datetime import datetime

# Load forensic databases
with open('tools/db_forensic_output.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

with open('tools/api_frontend_audit_output.json', 'r', encoding='utf-8') as f:
    api = json.load(f)

print(f"Loaded DB forensic data: {len(db['tables'])} tables, {len(db['all_foreign_keys'])} FKs")
print(f"Loaded API forensic data: {len(api['backend_routes'])} routes, {len(api['frontend_endpoints'])} frontend endpoints, {len(api['frontend_pages'])} pages")

# Table classification mapping
TABLE_CLASSIFICATION = {
    # Masters
    'academic_years': 'Master',
    'boards': 'Master',
    'canonical_subjects': 'Master',
    'divisions': 'Master',
    'fee_categories': 'Master',
    'institutions': 'Master',
    'lookup_items': 'Master',
    'standards': 'Master',
    'users': 'Master (Identity)',
    'students': 'Master (Student)',
    'staff_profiles': 'Master (Staff)',
    'guardians': 'Master (Guardian)',
    'subjects': 'Master (Legacy Bridge)',
    # Relationships / Mappings
    'codex_mapping_profiles': 'Relationship / Mapping',
    'codex_mapping_versions': 'Relationship / Mapping',
    'codex_scope_assignments': 'Relationship / Mapping',
    'staff_addresses': 'Relationship / Child Profile',
    'staff_bank_accounts': 'Relationship / Child Profile',
    'staff_emergency_contacts': 'Relationship / Child Profile',
    'staff_key_contacts': 'Relationship / Child Profile',
    'student_enrollments': 'Relationship / Mapping',
    'student_fee_assignments': 'Relationship / Mapping',
    'subject_mappings': 'Relationship / Mapping',
    'teacher_assignments': 'Relationship / Mapping',
    'teacher_payment_profiles': 'Relationship / Mapping',
    'timetable_entries': 'Relationship / Mapping',
    # Transactions / Operations
    'announcements': 'Transaction / Operational',
    'attendances': 'Transaction / Operational',
    'communication_logs': 'Transaction / Operational',
    'exam_marks': 'Transaction / Operational',
    'examinations': 'Transaction / Operational',
    'fee_invoice_items': 'Transaction / Financial',
    'fee_invoices': 'Transaction / Financial',
    'fee_structures': 'Transaction / Configuration',
    'lead_activities': 'Transaction / CRM',
    'lead_demo_classes': 'Transaction / CRM',
    'lead_follow_ups': 'Transaction / CRM',
    'leads': 'Transaction / CRM',
    'payment_allocations': 'Transaction / Financial',
    'payment_receipts': 'Ledger / Financial Snapshot',
    'payments': 'Ledger / Financial Transaction',
    'refunds': 'Ledger / Financial Transaction',
    'shared_document_tokens': 'Transaction / Security',
    'staff_attendances': 'Transaction / Operational',
    'staff_documents': 'Transaction / Document',
    'staff_employment_histories': 'Transaction / HR Record',
    'staff_generated_documents': 'Transaction / Document',
    'staff_leave_balances': 'Transaction / HR Record',
    'staff_leaves': 'Transaction / Operational',
    'student_documents': 'Transaction / Document',
    'study_materials': 'Transaction / Academic Asset',
    'teacher_contract_milestones': 'Transaction / Payroll',
    'teacher_payment_vouchers': 'Ledger / Payroll Financial',
    'teacher_payrolls': 'Transaction / Payroll',
    'teacher_rate_histories': 'Transaction / Payroll Rate',
    'teaching_sessions': 'Transaction / Operational',
    # Ledgers & Audit Logs
    'audit_logs': 'Ledger / System Audit',
    'codex_audit_logs': 'Ledger / Codex Audit',
    'setting_audit_logs': 'Ledger / Settings Audit',
    'student_lifecycle_logs': 'Ledger / Student Audit',
    'training_reset_logs': 'Ledger / Training Audit',
    # Configurations & Systems
    'codex_configs': 'Configuration / Codex',
    'codex_temporary_tokens': 'Configuration / Security',
    'communication_gateways': 'Configuration / Communication',
    'communication_templates': 'Configuration / Communication',
    'crm_settings': 'Configuration / CRM',
    'data_import_logs': 'Ledger / Import Audit',
    'discounts': 'Configuration / Fees (Unused)',
    'fee_register_imports': 'Transaction / Import Log',
    'fee_installments': 'Configuration / Fees (Unused)',
    'institution_settings': 'Configuration / Institute',
    'permissions': 'Configuration / RBAC Security',
    'roles': 'Configuration / RBAC Security',
    'scholarships': 'Configuration / Fees (Unused)',
    'system_releases': 'Configuration / Release',
    'training_environment_configs': 'Configuration / Training',
    'training_sessions': 'Configuration / Training',
}

def get_table_details():
    res = []
    for name, t in db['tables'].items():
        rows = t['row_count']
        cols = len(t['columns'])
        pks = [c['column'] for c in t['constraints'] if c['type'] == 'PRIMARY KEY']
        fks = t.get('foreign_keys', [])
        cls = TABLE_CLASSIFICATION.get(name, 'Operational')
        res.append({
            'name': name,
            'rows': rows,
            'cols': cols,
            'pks': pks,
            'fks': fks,
            'classification': cls
        })
    res.sort(key=lambda x: x['name'])
    return res

print(f"Table classifications mapped: {len(TABLE_CLASSIFICATION)} defined.")
