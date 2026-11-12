/**
 * @file        prehydrate-brand.js
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.public
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-12
 * @updated     2026-11-12
 *
 * @description Pre-hydration synchronous brand theme resolver extracted from index.html for strict CSP compliance without inline scripts.
 */
(function () {
  try {
    var authRaw = localStorage.getItem('prashant-auth')
    var instId = 1
    if (authRaw) {
      try {
        var auth = JSON.parse(authRaw)
        if (auth && auth.state && auth.state.selectedInstitutionId) {
          instId = auth.state.selectedInstitutionId
        }
      } catch (e) {}
    }
    var raw =
      localStorage.getItem('pratham_branding_inst_' + instId) ||
      localStorage.getItem('pratham_active_branding')
    if (raw) {
      var b = JSON.parse(raw)
      if (b && b.colors && b.colors.primary) {
        var root = document.documentElement
        var p = b.colors.primary
        var s = b.colors.secondary || p
        var a = b.colors.accent || s || p
        root.style.setProperty('--brand-primary', p)
        root.style.setProperty('--brand-primary-50', p + '0f')
        root.style.setProperty('--brand-primary-100', p + '1f')
        root.style.setProperty('--brand-primary-200', p + '38')
        root.style.setProperty('--brand-primary-hover', p)
        root.style.setProperty('--brand-primary-light', p)
        root.style.setProperty('--brand-primary-dark', p)
        root.style.setProperty('--brand-secondary', s)
        root.style.setProperty('--brand-accent', a)
        root.style.setProperty('--color-primary', p)
        root.style.setProperty('--color-secondary', s)
        root.style.setProperty('--color-accent', a)
        root.style.setProperty('--brand-gradient', 'linear-gradient(135deg, ' + p + ' 0%, ' + s + ' 100%)')
        var meta = document.querySelector('meta[name="theme-color"]')
        if (meta) meta.setAttribute('content', p)
      }
    }
  } catch (e) {}
})()

