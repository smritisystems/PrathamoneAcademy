# /**
#  * @file        generate_user_manual_content.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-06
#  * @updated     2026-11-12
#  *
#  * @description Source component for Generate User Manual Content in the scripts module.
#  */

"""PrathamOne EduOS - Documentation Content Generator.

Generates comprehensive, professional documentation content for:
1. Complete User Manual (All modules, roles, workflows, troubleshooting)
2. Quick Start Guide (Fast-track onboarding and core day-to-day operations)
3. Sysadmin Technical & Security Manual (Universal Editor, RBAC, Audits, Safeguards)

Product: PrathamOne Coaching Institutes Enterprise Suite
Website: https://prathamone.com
Author: Jawahar R Mallah
Organization: AITDL — AI Technology & Development Lab
Version: 1.0.0 (2026.11.06-STABLE-v1.0.0)
Date: November 2026
"""

import os

def get_base_css():
    return """
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

    @page {
        size: A4;
        margin: 20mm 15mm 20mm 15mm;
        @bottom-right {
            content: "Page " counter(page);
            font-size: 8pt;
            color: #64748b;
            font-family: 'Inter', sans-serif;
        }
        @bottom-left {
            content: "PrathamOne Coaching Institutes Enterprise Suite · prathamone.com";
            font-size: 8pt;
            color: #64748b;
            font-family: 'Inter', sans-serif;
        }
    }

    body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #1e293b;
        background-color: #ffffff;
        line-height: 1.6;
        font-size: 10pt;
        margin: 0;
        padding: 0;
    }

    h1, h2, h3, h4, h5, h6 {
        color: #0f172a;
        font-weight: 700;
        line-height: 1.25;
        margin-top: 1.5em;
        margin-bottom: 0.5em;
        page-break-after: avoid;
    }

    h1 {
        font-size: 20pt;
        color: #1e3a8a;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 6px;
        margin-top: 2em;
    }

    h2 {
        font-size: 14pt;
        color: #1e40af;
        margin-top: 1.5em;
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 4px;
    }

    h3 {
        font-size: 11pt;
        color: #0f766e;
    }

    h4 {
        font-size: 10pt;
        color: #334155;
    }

    p {
        margin: 0.6em 0;
        text-align: justify;
    }

    ul, ol {
        margin: 0.5em 0;
        padding-left: 1.5em;
    }

    li {
        margin-bottom: 0.3em;
    }

    /* Cover Page */
    .cover-page {
        page-break-after: always;
        height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 30px 20px;
        box-sizing: border-box;
    }

    .cover-top {
        border-top: 8px solid #1e3a8a;
        padding-top: 30px;
    }

    .cover-badge {
        display: inline-block;
        background-color: #eff6ff;
        color: #1d4ed8;
        font-size: 9pt;
        font-weight: 600;
        padding: 4px 12px;
        border-radius: 9999px;
        border: 1px solid #bfdbfe;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 15px;
    }

    .cover-title {
        font-size: 32pt;
        font-weight: 800;
        color: #0f172a;
        line-height: 1.1;
        margin: 0 0 10px 0;
    }

    .cover-subtitle {
        font-size: 16pt;
        font-weight: 500;
        color: #0f766e;
        margin: 0 0 25px 0;
    }

    .cover-tagline {
        font-size: 11pt;
        color: #475569;
        max-width: 650px;
        line-height: 1.5;
        border-left: 3px solid #0ea5e9;
        padding-left: 15px;
        margin: 20px 0;
    }

    .cover-meta-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-top: 40px;
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 20px;
    }

    .meta-item {
        font-size: 9pt;
    }

    .meta-label {
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        font-size: 7.5pt;
        letter-spacing: 0.05em;
    }

    .meta-value {
        font-size: 10pt;
        font-weight: 600;
        color: #1e293b;
        margin-top: 2px;
    }

    .cover-footer {
        border-top: 1px solid #e2e8f0;
        padding-top: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 8.5pt;
        color: #64748b;
    }

    /* Table of Contents */
    .toc-container {
        page-break-after: always;
        padding: 20px 0;
    }

    .toc-title {
        font-size: 18pt;
        color: #1e3a8a;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 8px;
        margin-bottom: 20px;
    }

    .toc-item {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        border-bottom: 1px dotted #cbd5e1;
        font-size: 9.5pt;
    }

    .toc-item.level-1 {
        font-weight: 700;
        color: #0f172a;
        margin-top: 8px;
        border-bottom: 1px solid #e2e8f0;
    }

    .toc-item.level-2 {
        padding-left: 20px;
        color: #334155;
    }

    /* Callout Boxes */
    .callout {
        border-radius: 6px;
        padding: 12px 16px;
        margin: 15px 0;
        font-size: 9.5pt;
        page-break-inside: avoid;
    }

    .callout-note {
        background-color: #eff6ff;
        border-left: 4px solid #3b82f6;
        color: #1e40af;
    }

    .callout-tip {
        background-color: #f0fdf4;
        border-left: 4px solid #22c55e;
        color: #166534;
    }

    .callout-warning {
        background-color: #fffbeb;
        border-left: 4px solid #f59e0b;
        color: #92400e;
    }

    .callout-danger {
        background-color: #fef2f2;
        border-left: 4px solid #ef4444;
        color: #991b1b;
    }

    .callout-title {
        font-weight: 700;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    /* Figures & Screenshots */
    .figure-box {
        margin: 20px 0;
        text-align: center;
        page-break-inside: avoid;
    }

    .figure-img {
        max-width: 100%;
        height: auto;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    .figure-caption {
        font-size: 8.5pt;
        color: #64748b;
        margin-top: 6px;
        font-style: italic;
    }

    /* Data Tables */
    table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
        font-size: 9pt;
        page-break-inside: avoid;
    }

    th, td {
        border: 1px solid #cbd5e1;
        padding: 8px 10px;
        text-align: left;
        vertical-align: top;
    }

    th {
        background-color: #f1f5f9;
        font-weight: 600;
        color: #1e293b;
    }

    tr:nth-child(even) td {
        background-color: #f8fafc;
    }

    /* Chips & Badges */
    .chip {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 7.5pt;
        font-weight: 600;
        text-transform: uppercase;
        font-family: 'JetBrains Mono', monospace;
    }

    .chip-blue { background-color: #dbeafe; color: #1e40af; }
    .chip-green { background-color: #dcfce7; color: #15803d; }
    .chip-amber { background-color: #fef3c7; color: #b45309; }
    .chip-red { background-color: #fee2e2; color: #b91c1c; }
    .chip-purple { background-color: #f3e8ff; color: #7e22ce; }

    /* Code Blocks */
    code {
        font-family: 'JetBrains Mono', monospace;
        font-size: 8.5pt;
        background-color: #f1f5f9;
        padding: 1px 4px;
        border-radius: 3px;
        color: #0f172a;
    }

    pre {
        background-color: #0f172a;
        color: #f8fafc;
        padding: 12px;
        border-radius: 6px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 8.5pt;
        overflow-x: auto;
        page-break-inside: avoid;
    }

    /* Steps */
    .step-list {
        list-style: none;
        counter-reset: step-counter;
        padding-left: 0;
    }

    .step-item {
        position: relative;
        padding-left: 36px;
        margin-bottom: 18px;
    }

    .step-item::before {
        counter-increment: step-counter;
        content: counter(step-counter);
        position: absolute;
        left: 0;
        top: 0;
        width: 24px;
        height: 24px;
        background-color: #1e3a8a;
        color: #ffffff;
        font-weight: 700;
        font-size: 9pt;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        line-height: 24px;
    }

    .step-title {
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 4px;
    }

    /* Footer Branding */
    .page-footer-text {
        text-align: center;
        font-size: 8pt;
        color: #94a3b8;
        margin-top: 30px;
        border-top: 1px solid #e2e8f0;
        padding-top: 10px;
    }
    """

def get_cover_html(title, subtitle, doc_type="USER MANUAL"):
    return f"""
    <div class="cover-page">
        <div class="cover-top">
            <div class="cover-badge">{doc_type} · ENTERPRISE EDITION</div>
            <h1 class="cover-title">PrathamOne EduOS</h1>
            <div class="cover-subtitle">{subtitle}</div>
            <div class="cover-tagline">
                Comprehensive operational, administrative, and technical manual for the complete coaching institute lifecycle management platform.
            </div>

            <div class="cover-meta-grid">
                <div class="meta-item">
                    <div class="meta-label">Software Platform</div>
                    <div class="meta-value">PrathamOne Coaching Institutes Enterprise Suite</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Author & Architect</div>
                    <div class="meta-value">Jawahar R Mallah</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Organization</div>
                    <div class="meta-value">AITDL — AI Technology & Development Lab</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Official Website</div>
                    <div class="meta-value"><a href="https://prathamone.com" style="color: #0284c7; text-decoration: none;">https://prathamone.com</a></div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Release Version</div>
                    <div class="meta-value">v1.88.2 (Build: 2026.11.12-REV-161-v1.88.2)</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Publication Date</div>
                    <div class="meta-value">November 12, 2026</div>
                </div>
            </div>
        </div>

        <div class="cover-footer">
            <div><strong>PrathamOne EduOS</strong> · Enterprise Coaching Institute ERP</div>
            <div>PrathamOne Coaching Institutes Enterprise Suite · prathamone.com</div>
        </div>
    </div>
    """

print("Base CSS and Cover Generator initialized.")
