/**
 * @file        AddStudent.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.pages
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-03
 * @updated     2026-11-04
 *
 * @description Multi-step student admission form capturing personal details, parent info, and initial enrollment.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createStudent, getStandards, getDivisions } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const STEPS = ['Personal Info', 'Guardian Info', 'Academic Info', 'Review'];

interface StudentFormData {
  full_name: string;
  date_of_birth: string;
  gender: string;
  blood_group: string;
  religion: string;
  caste: string;
  mother_tongue: string;
  aadhar_number: string;
  previous_school: string;
  medium_of_instruction: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  guardian_name: string;
  guardian_relationship: string;
  guardian_phone: string;
  guardian_email: string;
  guardian_occupation: string;
  guardian_annual_income: string;
  standard_id: string;
  division_id: string;
  admission_date: string;
}

const initialForm: StudentFormData = {
  full_name: '',
  date_of_birth: '',
  gender: '',
  blood_group: '',
  religion: '',
  caste: '',
  mother_tongue: '',
  aadhar_number: '',
  previous_school: '',
  medium_of_instruction: 'English',
  phone: '',
  email: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: 'Maharashtra',
  pincode: '',
  guardian_name: '',
  guardian_relationship: 'Father',
  guardian_phone: '',
  guardian_email: '',
  guardian_occupation: '',
  guardian_annual_income: '',
  standard_id: '',
  division_id: '',
  admission_date: new Date().toISOString().split('T')[0],
};

export default function AddStudent() {
  const navigate = useNavigate();
  const { selectedInstitutionId, selectedAcademicYearId } = useAuthStore();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<StudentFormData>(initialForm);
  const [errors, setErrors] = useState<Partial<StudentFormData>>({});

  const { data: standardsData } = useQuery({
    queryKey: ['standards', selectedInstitutionId],
    queryFn: () => getStandards(selectedInstitutionId!),
    enabled: !!selectedInstitutionId,
  });
  const { data: divisionsData } = useQuery({
    queryKey: ['divisions', form.standard_id],
    queryFn: () => getDivisions(form.standard_id),
    enabled: !!form.standard_id,
  });

  const standards = Array.isArray(standardsData) ? standardsData : (standardsData as any)?.items || [];
  const divisions = Array.isArray(divisionsData) ? divisionsData : (divisionsData as any)?.items || [];

  const mutation = useMutation({
    mutationFn: createStudent,
    onSuccess: (data) => {
      toast.success('Student registered successfully!');
      navigate(`/students/${data.id}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to register student.');
    },
  });

  const update = (field: keyof StudentFormData, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const validateStep = (): boolean => {
    const errs: Partial<StudentFormData> = {};
    if (step === 0) {
      if (!form.full_name.trim()) errs.full_name = 'Required';
      if (!form.date_of_birth) errs.date_of_birth = 'Required';
      if (!form.gender) errs.gender = 'Required';
    }
    if (step === 1) {
      if (!form.guardian_name.trim()) errs.guardian_name = 'Required';
      if (!form.guardian_phone.trim()) errs.guardian_phone = 'Required';
      if (!/^\d{10}$/.test(form.guardian_phone)) errs.guardian_phone = 'Enter 10-digit number';
    }
    if (step === 2) {
      if (!form.standard_id) errs.standard_id = 'Required';
      if (!form.admission_date) errs.admission_date = 'Required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = () => {
    if (!validateStep()) return;
    mutation.mutate({
      ...form,
      institution_id: selectedInstitutionId,
      academic_year_id: selectedAcademicYearId,
      guardian: {
        full_name: form.guardian_name,
        relationship: form.guardian_relationship,
        phone: form.guardian_phone,
        email: form.guardian_email || undefined,
        occupation: form.guardian_occupation || undefined,
        annual_income: form.guardian_annual_income ? parseFloat(form.guardian_annual_income) : undefined,
      },
    });
  };

  const Field = ({
    label,
    field,
    type = 'text',
    required = false,
    options,
    placeholder,
  }: {
    label: string;
    field: keyof StudentFormData;
    type?: string;
    required?: boolean;
    options?: string[];
    placeholder?: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {options ? (
        <select
          value={form[field]}
          onChange={(e) => update(field, e.target.value)}
          className={`input ${errors[field] ? 'border-red-400' : ''}`}
        >
          <option value="">Select…</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={form[field]}
          onChange={(e) => update(field, e.target.value)}
          placeholder={placeholder}
          className={`input ${errors[field] ? 'border-red-400' : ''}`}
        />
      )}
      {errors[field] && (
        <p className="text-xs text-red-500 mt-0.5">{errors[field]}</p>
      )}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add New Student</h1>
        <p className="text-sm text-gray-500">Register a student step by step</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i < step
                    ? 'bg-green-500 text-white'
                    : i === step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span
                className={`text-sm ${
                  i === step ? 'font-medium text-blue-700' : 'text-gray-500'
                }`}
              >
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 ${
                  i < step ? 'bg-green-400' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Form Card */}
      <div className="card">
        {/* Step 0: Personal Info */}
        {step === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field label="Full Name" field="full_name" required placeholder="As per records" />
            </div>
            <Field label="Date of Birth" field="date_of_birth" type="date" required />
            <Field label="Gender" field="gender" options={['Male', 'Female', 'Other']} required />
            <Field label="Blood Group" field="blood_group" options={['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']} />
            <Field label="Religion" field="religion" placeholder="Optional" />
            <Field label="Mother Tongue" field="mother_tongue" placeholder="e.g., Marathi" />
            <Field label="Medium of Instruction" field="medium_of_instruction" options={['English', 'Marathi', 'Hindi', 'Semi-English']} />
            <Field label="Aadhar Number" field="aadhar_number" placeholder="12-digit (optional)" />
            <Field label="Previous School" field="previous_school" placeholder="Previous institution" />
            <div className="md:col-span-2">
              <Field label="Phone" field="phone" type="tel" placeholder="Student's own phone (optional)" />
            </div>
            <div className="md:col-span-2">
              <Field label="Email" field="email" type="email" placeholder="Student's email (optional)" />
            </div>
            <div className="md:col-span-2">
              <Field label="Address Line 1" field="address_line1" placeholder="Flat/House No, Building" />
            </div>
            <div className="md:col-span-2">
              <Field label="Address Line 2" field="address_line2" placeholder="Street, Area, Landmark" />
            </div>
            <Field label="City" field="city" placeholder="City" />
            <Field label="State" field="state" options={['Maharashtra', 'Gujarat', 'Karnataka', 'Delhi', 'Other']} />
            <Field label="Pincode" field="pincode" placeholder="6-digit pincode" />
          </div>
        )}

        {/* Step 1: Guardian Info */}
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field label="Guardian Full Name" field="guardian_name" required placeholder="Primary guardian" />
            </div>
            <Field
              label="Relationship"
              field="guardian_relationship"
              options={['Father', 'Mother', 'Grandfather', 'Grandmother', 'Uncle', 'Aunt', 'Self', 'Other']}
              required
            />
            <Field label="Phone" field="guardian_phone" type="tel" required placeholder="10-digit mobile" />
            <Field label="Email" field="guardian_email" type="email" placeholder="Guardian email (optional)" />
            <Field label="Occupation" field="guardian_occupation" placeholder="e.g., Business, Service" />
            <Field label="Annual Income (₹)" field="guardian_annual_income" type="number" placeholder="For scholarship eligibility" />
          </div>
        )}

        {/* Step 2: Academic Info */}
        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Standard <span className="text-red-500">*</span>
              </label>
              <select
                value={form.standard_id}
                onChange={(e) => {
                  update('standard_id', e.target.value);
                  update('division_id', '');
                }}
                className={`input ${errors.standard_id ? 'border-red-400' : ''}`}
              >
                <option value="">Select Standard…</option>
                {standards.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.standard_id && (
                <p className="text-xs text-red-500 mt-0.5">{errors.standard_id}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
              <select
                value={form.division_id}
                onChange={(e) => update('division_id', e.target.value)}
                className="input"
                disabled={!form.standard_id}
              >
                <option value="">Select Batch…</option>
                {divisions.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admission Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.admission_date}
                onChange={(e) => update('admission_date', e.target.value)}
                className={`input ${errors.admission_date ? 'border-red-400' : ''}`}
              />
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-4 text-sm">
            <h3 className="font-semibold text-gray-900">Review Student Information</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <ReviewRow label="Full Name" value={form.full_name} />
              <ReviewRow label="Date of Birth" value={form.date_of_birth} />
              <ReviewRow label="Gender" value={form.gender} />
              <ReviewRow label="Blood Group" value={form.blood_group} />
              <ReviewRow label="Medium" value={form.medium_of_instruction} />
              <ReviewRow label="Previous School" value={form.previous_school} />
              <ReviewRow label="Admission Date" value={form.admission_date} />
            </div>
            <div className="border-t pt-3 mt-2">
              <h4 className="font-medium text-gray-700 mb-2">Guardian</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <ReviewRow label="Name" value={form.guardian_name} />
                <ReviewRow label="Relationship" value={form.guardian_relationship} />
                <ReviewRow label="Phone" value={form.guardian_phone} />
                <ReviewRow label="Occupation" value={form.guardian_occupation} />
              </div>
            </div>
            <div className="border-t pt-3 mt-2">
              <h4 className="font-medium text-gray-700 mb-2">Academic</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <ReviewRow label="Standard" value={standards.find((s: any) => s.id === form.standard_id)?.name || form.standard_id} />
                <ReviewRow label="Batch" value={divisions.find((d: any) => d.id === form.division_id)?.name || '—'} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={step === 0 ? () => navigate('/students') : back}
          className="btn-secondary"
        >
          {step === 0 ? 'Cancel' : '← Back'}
        </button>

        {step < STEPS.length - 1 ? (
          <button type="button" onClick={next} className="btn-primary">
            Next →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="btn-primary"
          >
            {mutation.isPending ? 'Registering…' : '✓ Register Student'}
          </button>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  return (
    <>
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value || '—'}</span>
    </>
  );
}

