/**
 * @file        OrganizationBranding.tsx
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
 * @created     2026-11-05
 * @updated     2026-11-05
 *
 * @description Responsive organization branding and product ecosystem component displaying AITDL parent identity, product portfolio, and verified sales/support contact details.
 */

import React from 'react'
import {
  Building2,
  ExternalLink,
  Phone,
  Mail,
  GraduationCap,
  BookOpen,
  Package,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { BRANDING_CONFIG, useBranding, type OrganizationProduct } from '../config/branding'

interface OrganizationBrandingProps {
  variant?: 'card' | 'compact' | 'footer' | 'inline'
  className?: string
  showSupportPhones?: boolean
  showLegalNotice?: boolean
}

const PRODUCT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  prathamone: GraduationCap,
  smritibooks: BookOpen,
  smritisys: Package,
}

export default function OrganizationBranding({
  variant = 'card',
  className = '',
  showSupportPhones = true,
  showLegalNotice = true,
}: OrganizationBrandingProps) {
  const branding = useBranding()
  const { parentOrganization, products, salesSupport, copyright, versionDisplay, buildNumber } = branding

  // ─────────────────────────────────────────────────────────────────────────────
  // VARIANT: FOOTER (Slim, semantic, accessible row designed for bottom of layout)
  // ─────────────────────────────────────────────────────────────────────────────
  if (variant === 'footer') {
    return (
      <section
        aria-label="AITDL Organization & Products"
        data-testid="organization-branding"
        className={`w-full border-t border-slate-200/80 pt-1 mt-1 text-[10px] sm:text-[10.5px] leading-tight text-slate-500 transition-colors ${className}`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-x-4 gap-y-1">
          {/* Parent Org & Products */}
          <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap min-w-0">
            <div className="flex items-center gap-1 font-semibold text-slate-800">
              <Building2 className="w-3 h-3 text-blue-600 shrink-0" aria-hidden="true" />
              <span>{parentOrganization.name}:</span>
              <a
                href={parentOrganization.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline font-medium inline-flex items-center gap-0.5"
                title={`Visit ${parentOrganization.name} website`}
              >
                {parentOrganization.websiteDisplay}
                <ExternalLink className="w-2.5 h-2.5 opacity-60" aria-hidden="true" />
              </a>
            </div>

            <span className="hidden sm:inline text-slate-300 select-none">|</span>

            {/* Products hierarchy links */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-slate-600">Products:</span>
              {products.map((prod: OrganizationProduct, idx: number) => {
                const IconComponent = PRODUCT_ICONS[prod.id] || Sparkles
                return (
                  <span key={prod.id} className="inline-flex items-center gap-1">
                    {idx > 0 && <span className="text-slate-300 select-none">·</span>}
                    <IconComponent className="w-2.5 h-2.5 text-slate-400" aria-hidden="true" />
                    <a
                      href={prod.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`hover:underline font-medium inline-flex items-center gap-0.5 ${
                        prod.isCurrent
                          ? 'text-blue-700 font-semibold'
                          : 'text-slate-600 hover:text-blue-600'
                      }`}
                      title={`${prod.name} — ${prod.description}`}
                    >
                      {prod.name}
                      <ExternalLink className="w-2 h-2 opacity-50" aria-hidden="true" />
                    </a>
                    {prod.isCurrent && (
                      <span className="text-[9px] bg-blue-100/70 text-blue-700 px-1 py-0.2 rounded font-mono font-medium">
                        Active
                      </span>
                    )}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Sales & Support Contact */}
          {showSupportPhones && (
            <div className="flex items-center gap-1.5 shrink-0 text-slate-600">
              <span className="font-semibold text-slate-700 inline-flex items-center gap-1">
                <Phone className="w-2.5 h-2.5 text-emerald-600" aria-hidden="true" />
                Sales & Support:
              </span>
              <div className="flex items-center gap-1 font-mono text-[10px]">
                {salesSupport.phones.map((phone: string, pIdx: number) => (
                  <React.Fragment key={phone}>
                    {pIdx > 0 && <span className="text-slate-300 select-none">|</span>}
                    <a
                      href={`tel:${phone.replace(/\s+/g, '')}`}
                      className="text-slate-700 hover:text-blue-600 hover:underline font-semibold"
                      title={`Call support at ${phone}`}
                    >
                      {phone}
                    </a>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VARIANT: COMPACT / INLINE
  // ─────────────────────────────────────────────────────────────────────────────
  if (variant === 'compact' || variant === 'inline') {
    return (
      <section
        aria-label="AITDL Organization & Products"
        data-testid="organization-branding"
        className={`bg-slate-50 border border-slate-200/90 rounded-xl p-3 text-xs text-slate-600 ${className}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Building2 className="w-4 h-4 text-blue-600" aria-hidden="true" />
              <span>{parentOrganization.name}</span>
              <a
                href={parentOrganization.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-semibold text-[11px] inline-flex items-center gap-0.5 ml-1"
              >
                {parentOrganization.websiteDisplay}
                <ExternalLink className="w-3 h-3 opacity-60" aria-hidden="true" />
              </a>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-[11px]">
              {products.map((prod) => (
                <span key={prod.id} className="inline-flex items-center gap-1 text-slate-600">
                  <a
                    href={prod.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-blue-700 font-medium"
                    title={prod.description}
                  >
                    {prod.name}
                  </a>
                </span>
              ))}
            </div>
          </div>
          <div className="text-[11px] font-mono text-slate-600 sm:text-right">
            <span className="font-semibold text-slate-700">Support: </span>
            <span>{salesSupport.displayPhones}</span>
          </div>
        </div>
      </section>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VARIANT: CARD (Comprehensive, responsive card for About, Settings & SysAdmin)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <section
      aria-label="AITDL Organization & Products"
      data-testid="organization-branding"
      className={`bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5 ${className}`}
    >
      {/* Header: Parent Organization */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl shadow-xs">
            <Building2 className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Parent Organization
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {parentOrganization.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enterprise Artificial Intelligence, Cloud Infrastructure & Educational Technology Solutions
            </p>
          </div>
        </div>

        <a
          href={parentOrganization.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-xl text-xs transition border border-blue-200/80 shrink-0 shadow-2xs"
          title={`Visit ${parentOrganization.name}`}
        >
          <span>Visit aitdl.com</span>
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        </a>
      </header>

      {/* Products Ecosystem Grid */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            AITDL Product Ecosystem & Platforms
          </h4>
          <span className="text-[11px] text-slate-400 font-mono">3 Core Products</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {products.map((product) => {
            const Icon = PRODUCT_ICONS[product.id] || Sparkles
            return (
              <article
                key={product.id}
                className={`flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 ${
                  product.isCurrent
                    ? 'bg-blue-50/40 border-blue-200 ring-1 ring-blue-500/10'
                    : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1.5 rounded-lg ${
                          product.isCurrent
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-slate-700 border border-slate-200 shadow-2xs'
                        }`}
                      >
                        <Icon className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <span className="font-bold text-sm text-slate-900">{product.name}</span>
                    </div>
                    {product.isCurrent ? (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-600 text-white">
                        Active App
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-200/80 text-slate-600 font-mono">
                        Ecosystem
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed min-h-[38px]">
                    {product.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">Official Web</span>
                  <a
                    href={product.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    title={`Visit ${product.name} website`}
                  >
                    <span>{product.websiteDisplay}</span>
                    <ExternalLink className="w-3 h-3 opacity-70" aria-hidden="true" />
                  </a>
                </div>
              </article>
            )
          })}
        </div>
      </div>

      {/* Sales, Support & Security Contacts */}
      <footer className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
        {showSupportPhones && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              Sales & Support:
            </span>
            <div className="flex items-center gap-2 font-mono">
              {salesSupport.phones.map((phone, idx) => (
                <React.Fragment key={phone}>
                  {idx > 0 && <span className="text-slate-300">·</span>}
                  <a
                    href={`tel:${phone.replace(/\s+/g, '')}`}
                    className="text-slate-800 hover:text-blue-600 hover:underline font-semibold"
                  >
                    {phone}
                  </a>
                </React.Fragment>
              ))}
            </div>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <a
              href={`mailto:${salesSupport.email}`}
              className="text-blue-600 hover:underline inline-flex items-center gap-1 font-medium"
            >
              <Mail className="w-3 h-3" aria-hidden="true" />
              {salesSupport.email}
            </a>
          </div>
        )}

        {showLegalNotice && (
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" aria-hidden="true" />
            <span>DPDP Act 2023 Compliant</span>
            <span className="text-slate-300">·</span>
            <span className="font-mono text-slate-600">{versionDisplay} ({buildNumber})</span>
          </div>
        )}
      </footer>
    </section>
  )
}

