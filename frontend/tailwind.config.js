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
 * @updated     2026-11-14
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
          300: 'var(--brand-primary-300, #93c5fd)',
          400: 'var(--brand-primary-400, #60a5fa)',
          500: 'var(--brand-primary-light, #3b82f6)',
          600: 'var(--brand-primary, #0B2D6B)',
          700: 'var(--brand-primary-hover, #082354)',
          800: 'var(--brand-primary-dark, #051535)',
          900: 'var(--brand-primary-dark, #030c20)',
        },
        brand: {
          DEFAULT: 'var(--brand-primary, #0B2D6B)',
          primary: 'var(--brand-primary, #0B2D6B)',
          hover: 'var(--brand-primary-hover, #082354)',
          light: 'var(--brand-primary-light, #16428F)',
          dark: 'var(--brand-primary-dark, #051535)',
          secondary: 'var(--brand-secondary, #071C44)',
          accent: 'var(--brand-accent, #F57C00)',
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

