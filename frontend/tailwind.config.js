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
 * @updated     2026-11-13
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
        // Universal Brand Aliasing: maps all legacy blue utility classes directly to active tenant theme
        blue: {
          50: 'var(--brand-primary-50, #eff6ff)',
          100: 'var(--brand-primary-100, #dbeafe)',
          200: 'var(--brand-primary-200, #bfdbfe)',
          300: 'var(--brand-primary-300, #93c5fd)',
          400: 'var(--brand-primary-400, #60a5fa)',
          500: 'var(--brand-primary-light, #3b82f6)',
          600: 'var(--brand-primary, #2563eb)',
          700: 'var(--brand-primary-hover, #1d4ed8)',
          800: 'var(--brand-primary-dark, #1e40af)',
          900: 'var(--brand-primary-dark, #1e3a8a)',
          950: 'var(--brand-primary-dark, #172554)',
        },
        // Universal Brand Aliasing: maps all legacy indigo utility classes directly to active tenant theme
        indigo: {
          50: 'var(--brand-primary-50, #eef2ff)',
          100: 'var(--brand-primary-100, #e0e7ff)',
          200: 'var(--brand-primary-200, #c7d2fe)',
          300: 'var(--brand-primary-300, #a5b4fc)',
          400: 'var(--brand-primary-400, #818cf8)',
          500: 'var(--brand-primary-light, #6366f1)',
          600: 'var(--brand-primary, #4f46e5)',
          700: 'var(--brand-primary-hover, #4338ca)',
          800: 'var(--brand-primary-dark, #3730a3)',
          900: 'var(--brand-primary-dark, #312e81)',
          950: 'var(--brand-primary-dark, #1e1b4b)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

