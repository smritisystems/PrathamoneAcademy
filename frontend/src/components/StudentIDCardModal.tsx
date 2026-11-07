/**
 * @file        StudentIDCardModal.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-06
 * @updated     2026-11-08
 *
 * @description Official Digital Student ID Card modal with CR80 thermal/PVC dimensions and SVG QR code rendering.
 */

import React, { useState, useEffect } from 'react'
import {
  X, Printer, CreditCard, Phone, MapPin, Calendar, Award,
  Shield, CheckCircle, RefreshCw, Download, ExternalLink, QrCode
} from 'lucide-react'
import { studentsApi } from '../api/endpoints'
import type { StudentIdCardData } from '../types'
import toast from 'react-hot-toast'

interface StudentIDCardModalProps {
  studentId: number | string
  isOpen: boolean
  onClose: () => void
}

export default function StudentIDCardModal({
  studentId,
  isOpen,
  onClose,
}: StudentIDCardModalProps) {
  const [loading, setLoading] = useState<boolean>(true)
  const [cardData, setCardData] = useState<StudentIdCardData | null>(null)
  const [side, setSide] = useState<'both' | 'front' | 'back'>('both')

  useEffect(() => {
    if (isOpen && studentId) {
      fetchCardData()
    }
  }, [isOpen, studentId])

  const fetchCardData = async () => {
    try {
      setLoading(true)
      const res = await studentsApi.getIdCard(studentId)
      setCardData(res.data)
    } catch (err: any) {
      console.error('Failed to load student ID card:', err)
      toast.error('Failed to generate student ID card.')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-2xl w-full p-6 space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Official Student Identity Card (CR80)
              </h3>
              <p className="text-xs text-gray-500">
                Print-ready digital smart card with scannable attendance QR code
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setSide('both')}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  side === 'both' ? 'bg-white text-primary-700 shadow-2xs' : 'text-gray-600'
                }`}
              >
                Both Sides
              </button>
              <button
                type="button"
                onClick={() => setSide('front')}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  side === 'front' ? 'bg-white text-primary-700 shadow-2xs' : 'text-gray-600'
                }`}
              >
                Front
              </button>
              <button
                type="button"
                onClick={() => setSide('back')}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  side === 'back' ? 'bg-white text-primary-700 shadow-2xs' : 'text-gray-600'
                }`}
              >
                Back
              </button>
            </div>

            <button
              onClick={handlePrint}
              disabled={loading || !cardData}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-xs flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Card</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="py-16 text-center text-gray-400 space-y-2">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary-600" />
            <p className="text-xs font-medium">Generating digital ID card and high-contrast QR code...</p>
          </div>
        ) : !cardData ? (
          <div className="py-12 text-center text-rose-500 text-xs">
            Student ID card could not be generated.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Visual Cards Display Area */}
            <div
              id="student-id-card-printable"
              className="flex flex-col sm:flex-row items-center justify-center gap-6 p-6 bg-slate-100 rounded-xl border border-dashed border-slate-300"
            >
              {/* ──────────────── FRONT SIDE ──────────────── */}
              {(side === 'both' || side === 'front') && (
                <div
                  className="w-[325px] h-[205px] bg-white rounded-xl shadow-md border border-slate-300 overflow-hidden flex flex-col justify-between relative select-none print:shadow-none print:border"
                  style={{ aspectRatio: '85.6 / 53.98' }}
                >
                  {/* Top Header Banner */}
                  <div className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white px-3.5 py-2 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-black tracking-wide leading-tight uppercase">
                        {cardData.institution.name}
                      </div>
                      <div className="text-[8px] text-blue-200 font-medium">
                        {cardData.institution.tagline || 'Coaching Institute Edition'}
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-white/20 text-white font-black text-[9px] flex items-center justify-center">
                      {cardData.institution.short_name || 'PA'}
                    </div>
                  </div>

                  {/* Body: Photo & Info */}
                  <div className="px-3.5 py-2 flex gap-3 items-center flex-1">
                    {/* Student Photo */}
                    <div className="w-16 h-20 rounded-lg border-2 border-blue-900/30 bg-slate-100 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-2xs">
                      {cardData.photo_url ? (
                        <img
                          src={cardData.photo_url}
                          alt={cardData.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center">
                          <CreditCard className="w-6 h-6 text-slate-400 mx-auto" />
                          <span className="text-[7px] text-slate-400 font-semibold uppercase">Photo</span>
                        </div>
                      )}
                    </div>

                    {/* Student Info Details */}
                    <div className="flex-1 space-y-0.5 text-slate-800">
                      <div className="text-xs font-black tracking-tight text-blue-950 uppercase line-clamp-1">
                        {cardData.full_name}
                      </div>
                      <div className="text-[9px] font-bold text-primary-700 font-mono">
                        ADM: {cardData.admission_number}
                      </div>
                      <div className="text-[9px] text-slate-600 font-medium pt-0.5">
                        <span className="text-slate-400">Class:</span> {cardData.standard_name}
                        {cardData.division_name !== 'N/A' && ` • ${cardData.division_name}`}
                      </div>
                      <div className="text-[9px] text-slate-600 font-medium">
                        <span className="text-slate-400">Roll No:</span> {cardData.roll_number}
                      </div>
                      <div className="text-[9px] text-slate-600 font-medium">
                        <span className="text-slate-400">DOB:</span> {cardData.date_of_birth}
                      </div>
                      <div className="text-[9px] text-slate-600 font-medium">
                        <span className="text-slate-400">Blood Group:</span> {cardData.blood_group}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Footer Stripe */}
                  <div className="bg-slate-50 border-t border-slate-200 px-3.5 py-1 flex items-center justify-between text-[8px] font-semibold text-slate-500">
                    <span>STUDENT IDENTITY CARD</span>
                    <span className="text-primary-900 font-bold">{cardData.academic_year}</span>
                  </div>
                </div>
              )}

              {/* ──────────────── BACK SIDE ──────────────── */}
              {(side === 'both' || side === 'back') && (
                <div
                  className="w-[325px] h-[205px] bg-white rounded-xl shadow-md border border-slate-300 overflow-hidden flex flex-col justify-between relative select-none print:shadow-none print:border"
                  style={{ aspectRatio: '85.6 / 53.98' }}
                >
                  {/* Top Header */}
                  <div className="bg-slate-800 text-white px-3.5 py-1.5 flex items-center justify-between text-[9px] font-bold">
                    <span>ATTENDANCE & SECURITY VERIFICATION</span>
                    <span className="text-emerald-400">ACTIVE</span>
                  </div>

                  {/* Back Details & QR */}
                  <div className="px-3.5 py-2 flex items-center gap-3 flex-1">
                    {/* High-Contrast SVG QR Code */}
                    <div className="w-20 h-20 bg-white p-1 rounded-md border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-2xs">
                      <div
                        className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                        dangerouslySetInnerHTML={{ __html: cardData.qr_svg }}
                      />
                    </div>

                    {/* Guardian & Emergency Info */}
                    <div className="flex-1 space-y-1 text-[8.5px] text-slate-700 leading-tight">
                      <div>
                        <span className="text-slate-400 font-semibold block">Guardian:</span>
                        <span className="font-bold text-slate-900">{cardData.guardian_name}</span>{' '}
                        <span className="text-[7.5px] text-slate-500">({cardData.guardian_relation})</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block">Emergency Phone:</span>
                        <span className="font-mono font-bold text-primary-800">{cardData.guardian_phone}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block">Card Validity:</span>
                        <span className="font-semibold text-emerald-800">{cardData.valid_until}</span>
                      </div>
                    </div>
                  </div>

                  {/* Signature & Disclaimer Footer */}
                  <div className="bg-slate-50 border-t border-slate-200 px-3.5 py-1.5 flex items-end justify-between text-[7px] text-slate-500">
                    <div className="max-w-[170px] leading-tight">
                      If found, please return to institute office. This card is non-transferable.
                    </div>
                    <div className="text-center flex-shrink-0">
                      <div className="font-serif italic font-bold text-[8px] text-slate-800">
                        Jawahar R. M.
                      </div>
                      <div className="border-t border-slate-400 pt-0.5 text-[6.5px] font-semibold uppercase">
                        Authorized Signatory
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Print Instructions / Specs */}
            <div className="bg-primary-50/70 border border-blue-200 rounded-xl p-3.5 text-xs text-primary-900 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-primary-700 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Thermal PVC & Card Sheet Specifications:</p>
                <p className="text-[11px] text-primary-800 leading-relaxed">
                  Engineered to international CR80 dimensions (85.6mm × 54mm). Compatible with Zebra, Evolis, Magicard, and Fargo thermal dye-sublimation card printers, or printable on 8-up heavy cardstock sheets for lamination.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={loading || !cardData}
            className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-xs flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Student ID Card</span>
          </button>
        </div>
      </div>
    </div>
  )
}
