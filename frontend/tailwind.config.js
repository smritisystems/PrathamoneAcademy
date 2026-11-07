/**
 * @file        tailwind.config.js
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.config
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-03
 * @updated     2026-11-08
 *
 * @description Tailwind CSS theme configuration, responsive breakpoints, and custom animation utilities.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--brand-primary-50, #eff6ff)',
          100: 'var(--brand-primary-100, #dbeafe)',
          200: 'var(--brand-primary-200, #bfdbfe)',
          300: '#93c5fd',
          400: '#60a5fa',
          500: 'var(--brand-primary-light, #3b82f6)',
          600: 'var(--brand-primary, #2563eb)',
          700: 'var(--brand-primary-hover, #1d4ed8)',
          800: 'var(--brand-primary-dark, #1e40af)',
          900: 'var(--brand-primary-dark, #1e3a8a)',
        },
        brand: {
          DEFAULT: 'var(--brand-primary, #1E40AF)',
          primary: 'var(--brand-primary, #1E40AF)',
          hover: 'var(--brand-primary-hover, #1D4ED8)',
          light: 'var(--brand-primary-light, #3B82F6)',
          dark: 'var(--brand-primary-dark, #0F172A)',
          secondary: 'var(--brand-secondary, #3B82F6)',
          accent: 'var(--brand-accent, #8B5CF6)',
          50: 'var(--brand-primary-50, #eff6ff)',
          100: 'var(--brand-primary-100, #dbeafe)',
          200: 'var(--brand-primary-200, #bfdbfe)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

