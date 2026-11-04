/**
 * @file        forms.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.types
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-04
 * @updated     2026-11-04
 *
 * @description Type definitions for printable form catalog, rendering schemas, DPDP compliance, and audit events.
 */

export interface FormConfigSection {
  key: string
  label: string
  default: boolean
}

export interface FormCatalogItem {
  id: string
  title: string
  code: string
  entity: 'student' | 'staff' | 'parent' | 'user' | 'operations'
  category: 'KYC' | 'Academic' | 'Fees' | 'HR' | 'Operations'
  description: string
  version: string
  cbse_reference?: string
  dpdp_sensitive: boolean
  available_modes: ('prefilled' | 'blank')[]
  supported_scopes: ('single' | 'bulk')[]
  required_roles: string[]
  configurable_sections: FormConfigSection[]
}

export interface InstitutionHeader {
  name: string
  tagline: string
  code: string
  address: string
  phone: string
  email: string
  website: string
  logo_url: string
}

export interface RenderedFormData {
  is_blank?: boolean
  student_id?: number
  user_id?: number
  guardian_id?: number
  admission_number?: string
  roll_number?: string
  first_name?: string
  last_name?: string
  full_name?: string
  date_of_birth?: string
  age?: number | null
  is_minor?: boolean
  gender?: string
  blood_group?: string
  nationality?: string
  religion?: string
  caste?: string
  aadhar_masked?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  admission_date?: string
  staff_code?: string
  designation?: string
  department?: string
  role?: string
  academic?: {
    academic_year: string
    board: string
    standard: string
    batch: string
    roll_no?: string
    room_number?: string
    timing?: string
    batch_coordinator?: string
  }
  guardians?: {
    primary?: {
      relation: string
      name: string
      occupation: string
      phone: string
      email: string
      aadhar_masked?: string
      annual_income?: string
    }
    secondary?: {
      relation: string
      name: string
      occupation: string
      phone: string
      email: string
      aadhar_masked?: string
    } | null
  }
  emergency?: {
    primary_contact_person?: string
    relationship?: string
    primary_phone?: string
    secondary_contact_person?: string
    secondary_phone?: string
    preferred_hospital?: string
    known_allergies?: string
    medical_conditions?: string
  }
  documents_checklist?: {
    title: string
    code?: string
    submitted: boolean
    status: string
    verified_by?: string
  }[]
  financial?: {
    total_due: number
    total_paid: number
    outstanding_dues: number
    collection_percentage: number
    fee_plan_name?: string
    payments_history?: {
      payment_id: number
      amount: number
      payment_mode: string
      transaction_ref: string
      status: string
      created_at: string
    }[]
  }
  attendance?: {
    total_working_days: number
    present_days: number
    absent_days: number
    percentage: number
    status: string
  }
  marks_rows?: {
    subject?: string
    exam_title?: string
    exam_type?: string
    max_marks: number
    marks_obtained: number | string
    percentage?: number
    grade?: string
    highest_in_class?: number | string
  }[]
  qualifications?: {
    degree: string
    university: string
    year: string
    specialization: string
  }[]
  experience?: {
    organization: string
    designation: string
    tenure: string
  }[]
  permissions?: {
    resource: string
    action: string
  }[]
  security_clause?: string
  certificate_purpose?: string
  issue_date?: string
  valid_until?: string
  conduct?: string
  student_name?: string
  parent_name?: string
  standard?: string
  board?: string
  academic_year?: string
  linked_ward?: {
    student_id?: number
    admission_number?: string
    name?: string
    board?: string
    standard?: string
  } | null
}

export interface RenderedFormPayload {
  form_id: string
  title: string
  code: string
  entity: string
  category: string
  description: string
  version: string
  cbse_reference?: string
  dpdp_sensitive: boolean
  mode: 'prefilled' | 'blank'
  document_ref: string
  generated_at: string
  generated_by: string
  institution: InstitutionHeader
  active_sections: string[]
  statutory_notice: string
  parent_declaration_text: string
  staff_declaration_text: string
  data: RenderedFormData
}

export interface FormAuditLogItem {
  id: number
  user_id?: number
  action: string
  resource_id?: number
  metadata: string
  ip_address?: string
  created_at: string
}

