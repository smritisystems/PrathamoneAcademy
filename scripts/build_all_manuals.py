# /**
#  * @file        build_all_manuals.py
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
#  * @updated     2026-11-06
#  *
#  * @description Source component for Build All Manuals in the scripts module.
#  */

"""PrathamOne Academy - Master Manual HTML and PDF Builder.

Generates:
1. PrathamOne_Academy_Complete_User_Manual.pdf
2. PrathamOne_Academy_Quick_Start_Guide.pdf
3. PrathamOne_Academy_Sysadmin_Manual.pdf

Product: PrathamOne Coaching Institutes Enterprise Suite
Website: https://prathamone.com
Author: Jawahar R Mallah
Organization: AITDL — AI Technology & Development Lab
Version: 6.99.1 (2026.11.05-PROD-REL)
Date: November 2026
"""

import os
import sys
import shutil
from playwright.sync_api import sync_playwright

from generate_user_manual_content import get_base_css, get_cover_html

SCREENSHOTS_DIR = os.path.abspath("docs/user_manual/screenshots")
SOURCES_DIR = os.path.abspath("docs/user_manual/sources")
PDF_DIR = os.path.abspath("docs/user_manual/pdf")
ROOT_MANUAL_DIR = os.path.abspath("docs/user_manual")

def rel_img(filename):
    path = os.path.join(SCREENSHOTS_DIR, filename).replace("\\", "/")
    return f"file:///{path}"

def build_complete_user_manual_html():
    css = get_base_css()
    cover = get_cover_html(
        "PrathamOne Academy",
        "Complete User Manual & Operational Reference Guide",
        "COMPLETE USER MANUAL"
    )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>PrathamOne Academy — Complete User Manual</title>
    <style>
        {css}
    </style>
</head>
<body>

{cover}

<!-- Document Control & Author Attribution -->
<div style="page-break-after: always; padding-top: 40px;">
    <h2>Document Control & Author Attribution</h2>
    <table style="width: 100%; margin-top: 15px;">
        <tr>
            <th style="width: 30%;">Document Title</th>
            <td>PrathamOne Academy Coaching Institutes Enterprise Suite — Complete User Manual</td>
        </tr>
        <tr>
            <th>Software Version</th>
            <td><strong>v6.99.1</strong> (Release Build: <code>2026.11.05-PROD-REL</code>)</td>
        </tr>
        <tr>
            <th>Author & Chief Architect</th>
            <td><strong>Jawahar R Mallah</strong></td>
        </tr>
        <tr>
            <th>Organization</th>
            <td><strong>AITDL — AI Technology & Development Lab</strong></td>
        </tr>
        <tr>
            <th>Official Website</th>
            <td><a href="https://prathamone.com" style="color: #0284c7;">https://prathamone.com</a></td>
        </tr>
        <tr>
            <th>Manual Revision Date</th>
            <td>November 06, 2026</td>
        </tr>
        <tr>
            <th>Document Classification</th>
            <td>Official Technical & End-User Documentation (Confidential & Proprietary)</td>
        </tr>
        <tr>
            <th>Primary Technical Support</th>
            <td>Phone: <strong>+91 9323 023 007 / +91 9324 117 007</strong><br>
                Email: <a href="mailto:support@prathamone.com">support@prathamone.com</a> | Alternate: <a href="mailto:prathamone@outlook.com">prathamone@outlook.com</a>
            </td>
        </tr>
    </table>

    <div class="callout callout-note" style="margin-top: 30px;">
        <div class="callout-title">Copyright & Proprietary Notice</div>
        <p>Copyright &copy; 2026 AITDL (AI Technology & Development Lab). All rights reserved. No part of this publication may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the author and publisher.</p>
        <p>PrathamOne Academy, PrathamOne Coaching Institutes Enterprise Suite, and the PrathamOne logo are trademarks or registered trademarks of AITDL in India and other jurisdictions.</p>
    </div>
</div>

<!-- Table of Contents -->
<div class="toc-container">
    <div class="toc-title">Table of Contents</div>
    <div class="toc-item level-1"><span>1. Welcome & Product Architecture Overview</span><span>4</span></div>
    <div class="toc-item level-2"><span>1.1 Executive Summary & Mission</span><span>4</span></div>
    <div class="toc-item level-2"><span>1.2 System Architecture & Technology Stack</span><span>5</span></div>
    <div class="toc-item level-2"><span>1.3 Navigation, Layout & Responsive UI</span><span>6</span></div>
    
    <div class="toc-item level-1"><span>2. User Roles & RBAC Permission Matrix</span><span>7</span></div>
    <div class="toc-item level-2"><span>2.1 Role Hierarchy Overview</span><span>7</span></div>
    <div class="toc-item level-2"><span>2.2 Comprehensive 8-Role Permission Matrix</span><span>8</span></div>

    <div class="toc-item level-1"><span>3. Getting Started & Authentication</span><span>11</span></div>
    <div class="toc-item level-2"><span>3.1 Logging into PrathamOne Academy</span><span>11</span></div>
    <div class="toc-item level-2"><span>3.2 Password Security & Profile Customization</span><span>12</span></div>

    <div class="toc-item level-1"><span>4. Complete Module-by-Module User Guide</span><span>13</span></div>
    <div class="toc-item level-2"><span>4.1 Executive Dashboard</span><span>13</span></div>
    <div class="toc-item level-2"><span>4.2 Academic Structure & Batch Management</span><span>15</span></div>
    <div class="toc-item level-2"><span>4.3 Courses & Subject Mapping</span><span>17</span></div>
    <div class="toc-item level-2"><span>4.4 Student Admission & Lifecycle Management</span><span>19</span></div>
    <div class="toc-item level-2"><span>4.5 Faculty & Staff Directory</span><span>23</span></div>
    <div class="toc-item level-2"><span>4.6 Daily Attendance & Defaulter Tracking</span><span>25</span></div>
    <div class="toc-item level-2"><span>4.7 Fee Plans, Invoicing & Discount Schemes</span><span>27</span></div>
    <div class="toc-item level-2"><span>4.8 Payments Ledger & Posted Edit Security Gate</span><span>29</span></div>
    <div class="toc-item level-2"><span>4.9 Import Fee Register (CSV/Excel Wizard)</span><span>32</span></div>
    <div class="toc-item level-2"><span>4.10 Examinations, Grading & Report Cards</span><span>34</span></div>
    <div class="toc-item level-2"><span>4.11 Communication Hub & Broadcast Notices</span><span>36</span></div>
    <div class="toc-item level-2"><span>4.12 High-Performance Reports & Analytics Grid</span><span>38</span></div>
    <div class="toc-item level-2"><span>4.13 Forms & Documents Printing Center (DPDP Compliant)</span><span>40</span></div>
    <div class="toc-item level-2"><span>4.14 Data Import / Export Engine</span><span>42</span></div>
    <div class="toc-item level-2"><span>4.15 User Management & RBAC Administration</span><span>44</span></div>
    <div class="toc-item level-2"><span>4.16 Institute Settings & Live Branding Customizer</span><span>46</span></div>
    <div class="toc-item level-2"><span>4.17 SysAdmin Center & Universal Records Editor</span><span>48</span></div>
    <div class="toc-item level-2"><span>4.18 Release Management & Semantic Version Audit</span><span>51</span></div>

    <div class="toc-item level-1"><span>5. End-to-End Business Workflows</span><span>53</span></div>
    <div class="toc-item level-2"><span>5.1 Student Onboarding from Admission to Batch Enrollment</span><span>53</span></div>
    <div class="toc-item level-2"><span>5.2 Financial Collection, Receipting, Correction & Refunds</span><span>55</span></div>
    <div class="toc-item level-2"><span>5.3 Academic Term Setup, Subject Assignment & Timetable</span><span>57</span></div>
    <div class="toc-item level-2"><span>5.4 Examination Lifecycle from Schedule to Report Cards</span><span>59</span></div>

    <div class="toc-item level-1"><span>6. Special SysAdmin Security Manual</span><span>61</span></div>
    <div class="toc-item level-2"><span>6.1 Universal Record Editor Guardrails & Allowlists</span><span>61</span></div>
    <div class="toc-item level-2"><span>6.2 Posted Payment Unlock Workflow & Audit History</span><span>63</span></div>
    <div class="toc-item level-2"><span>6.3 Real-Time Security Audit Logging</span><span>65</span></div>

    <div class="toc-item level-1"><span>7. Troubleshooting, Error Codes & Support</span><span>67</span></div>
    <div class="toc-item level-2"><span>7.1 Common Runtime Errors & Resolving Taxonomy Codes</span><span>67</span></div>
    <div class="toc-item level-2"><span>7.2 Frequently Asked Questions (FAQ)</span><span>69</span></div>
    <div class="toc-item level-2"><span>7.3 Official Support Channels & SLA</span><span>71</span></div>
</div>

<!-- CHAPTER 1 -->
<h1>1. Welcome & Product Architecture Overview</h1>

<h2>1.1 Executive Summary & Mission</h2>
<p><strong>PrathamOne Academy</strong> (part of the <em>PrathamOne Coaching Institutes Enterprise Suite</em>) is an enterprise-grade ERP and academic operations platform engineered specifically for coaching institutes, competitive exam academies, tutoring centers, and multi-branch educational networks. Engineered by <strong>Jawahar R Mallah</strong> and the team at <strong>AITDL (AI Technology & Development Lab)</strong>, PrathamOne Academy consolidates fragmented institute workflows into a unified, secure, high-performance web platform.</p>

<p>The platform delivers complete lifecycle management across five core institutional pillars:</p>
<ul>
    <li><strong>Academic Operations:</strong> Hierarchical curriculum structuring spanning Educational Boards, Standards, Subjects, Divisions, Batches, and Weekly Timetables.</li>
    <li><strong>Student Lifecycle:</strong> Comprehensive onboarding, automated student registration number generation (<code>PA-2024-XXXXXX</code>), KYC compliance document archiving, exit/withdrawal tracking, and one-click reactivation.</li>
    <li><strong>Financial Governance:</strong> Flexible fee plan configuration, installment scheduling, scholarship concessions, automated payment ledger, tamper-proof sequential receipting, posted-payment security gates, and linked refund processing.</li>
    <li><strong>Faculty & Attendance:</strong> Real-time roster tracking, mobile-friendly bulk attendance marking, faculty assignment, and automated defaulter alerts.</li>
    <li><strong>Compliance & Enterprise Security:</strong> Granular 8-tier Role-Based Access Control (RBAC), Digital Personal Data Protection (DPDP) compliance audit logs, Universal Data Editing with strict field allowlists, and immutable system event journaling.</li>
</ul>

<h2>1.2 System Architecture & Technology Stack</h2>
<p>PrathamOne Academy is built upon a modern, cloud-native containerized architecture designed for maximum concurrency, sub-second latency, and horizontal scalability:</p>
<table>
    <thead>
        <tr>
            <th>Architectural Layer</th>
            <th>Technology Components</th>
            <th>Key Capabilities & Specifications</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><strong>Frontend Application</strong></td>
            <td>React 18, Vite 5.4, TypeScript, TailwindCSS, Lucide Icons</td>
            <td>Single Page Application (SPA), zero full-page reload lag, responsive mobile/tablet layout, PWA offline capabilities.</td>
        </tr>
        <tr>
            <td><strong>Backend Services</strong></td>
            <td>Python 3.11, FastAPI, SQLAlchemy 2.0 Async, Pydantic v2</td>
            <td>Asynchronous REST API engine (204 endpoints), JWT Bearer authentication, centralized dependency injection, OpenAPI 3.1 schema.</td>
        </tr>
        <tr>
            <td><strong>Database Layer</strong></td>
            <td>PostgreSQL 16 Enterprise, Alembic Migrations</td>
            <td>ACID relational storage, foreign-key cascade integrity, multi-branch tenant isolation, JSONB audit logging.</td>
        </tr>
        <tr>
            <td><strong>Container Runtime</strong></td>
            <td>Docker Compose, Alpine Linux, Nginx 1.25 Reverse Proxy</td>
            <td>Multi-stage production build, Gzip compression, health-check probes, automated restart policies.</td>
        </tr>
    </tbody>
</table>

<h2>1.3 Navigation, Layout & Responsive UI</h2>
<p>The application interface is structured around an intuitive 3-zone layout:</p>
<ol>
    <li><strong>Top Application Bar:</strong> Displays the institute logo, active branch selector, current academic session, global search, notification bell, system version badge (<code>v6.99.1</code>), and the user profile dropdown.</li>
    <li><strong>Collapsible Sidebar Navigation:</strong> Houses quick-access links to all 20 modules organized logically by administrative function. Features collapse/expand toggling for focused workspace utilization.</li>
    <li><strong>Dynamic Workspace Area:</strong> The main viewport where data tables, interactive filter bars, modal dialogs, analytics charts, and printable document previews render.</li>
    <li><strong>Collapsible Enterprise Footer:</strong> Present across all authenticated screens, displaying the verified application release version, build identifier, and the subtle enterprise attribution: <code>PrathamOne Coaching Institutes Enterprise Suite · prathamone.com</code>.</li>
</ol>

<div class="figure-box">
    <img src="{rel_img('02_dashboard_overview.png')}" class="figure-img" alt="Main Dashboard Overview">
    <div class="figure-caption">Figure 1.1: PrathamOne Academy Master Dashboard showing operational KPI metrics, quick actions, and sidebar navigation.</div>
</div>

<!-- CHAPTER 2 -->
<h1>2. User Roles & RBAC Permission Matrix</h1>

<h2>2.1 Role Hierarchy Overview</h2>
<p>PrathamOne Academy enforces a strict 8-tier Role-Based Access Control (RBAC) hierarchy. Every user account created in the system is assigned a primary role that governs their viewing, creation, modification, approval, and administrative rights across all API endpoints and frontend screens.</p>

<div class="figure-box">
    <img src="{rel_img('19_user_profile_rbac_matrix.png')}" class="figure-img" alt="RBAC Permission Matrix">
    <div class="figure-caption">Figure 2.1: Granular Role & Permission Matrix visualizer in User Profile workspace.</div>
</div>

<h2>2.2 Comprehensive 8-Role Permission Matrix</h2>
<p>The table below outlines the exact, verified permission capabilities for each user role across the core functional modules of PrathamOne Academy:</p>

<table>
    <thead>
        <tr>
            <th>Application Module</th>
            <th>SysAdmin</th>
            <th>Superadmin</th>
            <th>Admin</th>
            <th>Principal</th>
            <th>Accountant</th>
            <th>Teacher</th>
            <th>Staff</th>
            <th>Student</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><strong>Dashboard Metrics</strong></td>
            <td><span class="chip chip-green">FULL</span></td>
            <td><span class="chip chip-green">FULL</span></td>
            <td><span class="chip chip-green">FULL</span></td>
            <td><span class="chip chip-green">FULL</span></td>
            <td><span class="chip chip-blue">FINANCIAL</span></td>
            <td><span class="chip chip-amber">ACADEMIC</span></td>
            <td><span class="chip chip-amber">BASIC</span></td>
            <td><span class="chip chip-purple">SELF</span></td>
        </tr>
        <tr>
            <td><strong>Academic Master (Boards/Std)</strong></td>
            <td><span class="chip chip-green">FULL CRUD</span></td>
            <td><span class="chip chip-green">FULL CRUD</span></td>
            <td><span class="chip chip-green">FULL CRUD</span></td>
            <td><span class="chip chip-green">FULL CRUD</span></td>
            <td><span class="chip chip-amber">VIEW</span></td>
            <td><span class="chip chip-amber">VIEW</span></td>
            <td><span class="chip chip-amber">VIEW</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
        </tr>
        <tr>
            <td><strong>Student Profiles & Admissions</strong></td>
            <td><span class="chip chip-green">FULL CRUD</span></td>
            <td><span class="chip chip-green">FULL CRUD</span></td>
            <td><span class="chip chip-green">FULL CRUD</span></td>
            <td><span class="chip chip-green">FULL CRUD</span></td>
            <td><span class="chip chip-blue">VIEW/FEE</span></td>
            <td><span class="chip chip-amber">VIEW ROSTER</span></td>
            <td><span class="chip chip-blue">INTAKE</span></td>
            <td><span class="chip chip-purple">SELF ONLY</span></td>
        </tr>
        <tr>
            <td><strong>Student Withdrawal / Exit</strong></td>
            <td><span class="chip chip-green">AUTHORIZE</span></td>
            <td><span class="chip chip-green">AUTHORIZE</span></td>
            <td><span class="chip chip-green">AUTHORIZE</span></td>
            <td><span class="chip chip-green">AUTHORIZE</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
        </tr>
        <tr>
            <td><strong>Student Reactivation</strong></td>
            <td><span class="chip chip-green">AUTHORIZE</span></td>
            <td><span class="chip chip-green">AUTHORIZE</span></td>
            <td><span class="chip chip-green">AUTHORIZE</span></td>
            <td><span class="chip chip-green">AUTHORIZE</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
        </tr>
        <tr>
            <td><strong>Attendance Marking</strong></td>
            <td><span class="chip chip-green">MANAGE</span></td>
            <td><span class="chip chip-green">MANAGE</span></td>
            <td><span class="chip chip-green">MANAGE</span></td>
            <td><span class="chip chip-green">MANAGE</span></td>
            <td><span class="chip chip-amber">VIEW</span></td>
            <td><span class="chip chip-green">MARK OWN</span></td>
            <td><span class="chip chip-green">MARK ROSTER</span></td>
            <td><span class="chip chip-purple">VIEW OWN</span></td>
        </tr>
        <tr>
            <td><strong>Fee Structures & Plans</strong></td>
            <td><span class="chip chip-green">FULL CRUD</span></td>
            <td><span class="chip chip-green">FULL CRUD</span></td>
            <td><span class="chip chip-green">FULL CRUD</span></td>
            <td><span class="chip chip-green">FULL CRUD</span></td>
            <td><span class="chip chip-green">CREATE/ASSIGN</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-purple">VIEW OWN</span></td>
        </tr>
        <tr>
            <td><strong>Payment Collection & Drafts</strong></td>
            <td><span class="chip chip-green">MANAGE</span></td>
            <td><span class="chip chip-green">MANAGE</span></td>
            <td><span class="chip chip-green">MANAGE</span></td>
            <td><span class="chip chip-green">MANAGE</span></td>
            <td><span class="chip chip-green">COLLECT/POST</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-blue">DRAFT ONLY</span></td>
            <td><span class="chip chip-purple">PAY ONLINE</span></td>
        </tr>
        <tr>
            <td><strong>Posted Payment Editing Gate</strong></td>
            <td><span class="chip chip-purple">EXPLICIT GATE</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
        </tr>
        <tr>
            <td><strong>Payment Refunds</strong></td>
            <td><span class="chip chip-green">APPROVE</span></td>
            <td><span class="chip chip-green">APPROVE</span></td>
            <td><span class="chip chip-green">APPROVE</span></td>
            <td><span class="chip chip-green">APPROVE</span></td>
            <td><span class="chip chip-blue">PROCESS</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
        </tr>
        <tr>
            <td><strong>Examinations & Marks Entry</strong></td>
            <td><span class="chip chip-green">MANAGE</span></td>
            <td><span class="chip chip-green">MANAGE</span></td>
            <td><span class="chip chip-green">MANAGE</span></td>
            <td><span class="chip chip-green">MANAGE</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-green">ENTER MARKS</span></td>
            <td><span class="chip chip-amber">VIEW</span></td>
            <td><span class="chip chip-purple">VIEW OWN</span></td>
        </tr>
        <tr>
            <td><strong>Reports & Data Export</strong></td>
            <td><span class="chip chip-green">ALL REPORTS</span></td>
            <td><span class="chip chip-green">ALL REPORTS</span></td>
            <td><span class="chip chip-green">ALL REPORTS</span></td>
            <td><span class="chip chip-green">ALL REPORTS</span></td>
            <td><span class="chip chip-blue">FINANCIAL</span></td>
            <td><span class="chip chip-amber">ACADEMIC</span></td>
            <td><span class="chip chip-amber">ROSTERS</span></td>
            <td><span class="chip chip-purple">OWN GRADES</span></td>
        </tr>
        <tr>
            <td><strong>User & Role Management</strong></td>
            <td><span class="chip chip-green">SUPERUSER</span></td>
            <td><span class="chip chip-green">MANAGE</span></td>
            <td><span class="chip chip-green">MANAGE</span></td>
            <td><span class="chip chip-amber">VIEW STAFF</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
        </tr>
        <tr>
            <td><strong>Universal Records Editor</strong></td>
            <td><span class="chip chip-purple">EXCLUSIVE</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
        </tr>
        <tr>
            <td><strong>Security Audit Logs</strong></td>
            <td><span class="chip chip-green">FULL TRAIL</span></td>
            <td><span class="chip chip-green">FULL TRAIL</span></td>
            <td><span class="chip chip-blue">BRANCH LOGS</span></td>
            <td><span class="chip chip-amber">VIEW</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
            <td><span class="chip chip-red">DENIED</span></td>
        </tr>
    </tbody>
</table>

<!-- CHAPTER 3 -->
<h1>3. Getting Started & Authentication</h1>

<h2>3.1 Logging into PrathamOne Academy</h2>
<p>To access the system, navigate to the application URL in any modern web browser (Google Chrome, Mozilla Firefox, Microsoft Edge, or Safari):</p>
<code>http://localhost:80/login</code> (or your institute's custom production domain).

<div class="figure-box">
    <img src="{rel_img('01_login_screen.png')}" class="figure-img" alt="PrathamOne Academy Login Screen">
    <div class="figure-caption">Figure 3.1: PrathamOne Academy Secure Sign-In Portal.</div>
</div>

<ul class="step-list">
    <li class="step-item">
        <div class="step-title">Enter Your Credentials</div>
        Enter your designated Username or Registered Email address in the <strong>Username or Email</strong> input field.
    </li>
    <li class="step-item">
        <div class="step-title">Enter Your Password</div>
        Type your password into the <strong>Password</strong> field. Passwords are case-sensitive and must satisfy enterprise security policies.
    </li>
    <li class="step-item">
        <div class="step-title">Submit & Authenticate</div>
        Click the blue <strong>Sign In</strong> button. Upon successful verification, an encrypted JWT authentication token is issued, and you are automatically redirected to your role's default dashboard workspace.
    </li>
</ul>

<div class="callout callout-warning">
    <div class="callout-title">Default First-Time Credentials</div>
    <p>Initial system deployment includes a pre-seeded Sysadmin superuser account (<code>sysadmin</code>). Upon first login, navigate immediately to <strong>User Profile</strong> or <strong>System Settings</strong> to rotate your password to a strong, confidential passphrase.</p>
</div>

<!-- CHAPTER 4 -->
<h1>4. Complete Module-by-Module User Guide</h1>

<!-- 4.1 Dashboard -->
<h2>4.1 Executive Dashboard</h2>
<p><strong>Route:</strong> <code>/dashboard</code> &nbsp;|&nbsp; <strong>Shortcut:</strong> <kbd>Alt</kbd> + <kbd>D</kbd></p>
<p><strong>Purpose:</strong> The Executive Dashboard delivers a real-time operational bird's-eye view of your coaching institute's daily pulse. It provides actionable intelligence regarding student strength, fee realization, batch schedules, and attendance metrics without requiring manual report generation.</p>

<div class="figure-box">
    <img src="{rel_img('02_dashboard_overview.png')}" class="figure-img" alt="Executive Dashboard Overview">
    <div class="figure-caption">Figure 4.1: Real-time Executive Dashboard displaying KPI cards, attendance trends, and quick actions.</div>
</div>

<h3>Key Interface Elements:</h3>
<ul>
    <li><strong>Active Metric Cards:</strong> Real-time counts of Total Active Students, Active Batches, Today's Attendance %, Fees Collected This Month (₹), and Total Outstanding Dues (₹).</li>
    <li><strong>Quick Action Launcher:</strong> Fast-track one-click buttons to Admit Student, Record Payment, Mark Batch Attendance, and View Today's Timetable.</li>
    <li><strong>Attendance Trend Graph:</strong> Weekly graphical breakdown comparing present vs absent students across standards.</li>
    <li><strong>Recent Transaction Feed:</strong> Real-time financial stream displaying the last 10 payments received with receipt links.</li>
</ul>

<!-- 4.2 Academic Structure -->
<h2>4.2 Academic Structure & Batch Management</h2>
<p><strong>Route:</strong> <code>/academic</code> &nbsp;|&nbsp; <strong>Access:</strong> SysAdmin, Superadmin, Admin, Principal</p>
<p><strong>Purpose:</strong> The Academic Structure workspace configures the foundational organizational hierarchy of your academy. All courses, batches, timetables, and fee plans link directly to this structure.</p>

<div class="figure-box">
    <img src="{rel_img('03_academic_workspace.png')}" class="figure-img" alt="Academic Workspace">
    <div class="figure-caption">Figure 4.2: Academic Hierarchy Manager configuring Educational Boards, Standards, and Batches.</div>
</div>

<h3>Step-by-Step Task: Creating an Educational Board</h3>
<ol>
    <li>Navigate to <strong>Academic Structure</strong> from the sidebar.</li>
    <li>Click on the <strong>Boards</strong> tab.</li>
    <li>Click the blue <strong>Add Board</strong> button in the top right.</li>
    <li>Fill in the required fields:
        <ul>
            <li><strong>Board Name</strong> (Required): e.g., <em>Central Board of Secondary Education</em>.</li>
            <li><strong>Board Code</strong> (Required, Unique): e.g., <code>CBSE</code>.</li>
            <li><strong>Description</strong> (Optional): Brief notes regarding curriculum coverage.</li>
        </ul>
    </li>
    <li>Click <strong>Save Board</strong>. The board appears instantly in the active roster.</li>
</ol>

<h3>Step-by-Step Task: Creating a Standard / Grade</h3>
<ol>
    <li>Click on the <strong>Standards</strong> tab.</li>
    <li>Click <strong>Add Standard</strong>.</li>
    <li>Select the parent <strong>Board</strong> from the dropdown.</li>
    <li>Enter <strong>Standard Name</strong> (e.g., <em>10th Standard</em>) and <strong>Level / Code</strong> (e.g., <code>STD-10</code>).</li>
    <li>Click <strong>Save Standard</strong>.</li>
</ol>

<h3>Step-by-Step Task: Creating a Division / Batch</h3>
<ol>
    <li>Click on the <strong>Batches / Divisions</strong> tab.</li>
    <li>Click <strong>Add Batch</strong>.</li>
    <li>Select the <strong>Standard</strong> (e.g., <em>10th Standard</em>).</li>
    <li>Enter <strong>Batch Name</strong> (e.g., <em>Morning Champions Batch A</em>) and <strong>Batch Code</strong> (<code>10-A-MORN</code>).</li>
    <li>Set <strong>Maximum Capacity</strong> (e.g., <code>45</code>) and <strong>Room Number</strong> (e.g., <code>Classroom 204</code>).</li>
    <li>Assign the <strong>Class Teacher / Mentor</strong> from the faculty list.</li>
    <li>Click <strong>Save Batch</strong>.</li>
</ol>

<!-- 4.3 Courses & Subjects -->
<h2>4.3 Courses & Subject Mapping</h2>
<p><strong>Route:</strong> <code>/courses</code> and <code>/subjects</code></p>
<p><strong>Purpose:</strong> Define commercial coaching programs (e.g., <em>IIT-JEE Two-Year Foundation</em>, <em>NEET Dropper Comprehensive</em>, <em>Commerce 12th Board Crash Course</em>) and granular subjects (Physics, Chemistry, Mathematics, Accountancy).</p>

<div class="figure-box">
    <img src="{rel_img('04_courses_management.png')}" class="figure-img" alt="Courses Catalog">
    <div class="figure-caption">Figure 4.3: Commercial Course Catalog with duration, standard mapping, and pricing.</div>
</div>

<div class="figure-box">
    <img src="{rel_img('05_subjects_management.png')}" class="figure-img" alt="Subjects Directory">
    <div class="figure-caption">Figure 4.4: Subject Repository with department classification and credit hours.</div>
</div>

<!-- 4.4 Student Management -->
<h2>4.4 Student Admission & Lifecycle Management</h2>
<p><strong>Routes:</strong> <code>/students</code>, <code>/students/add</code>, <code>/students/{{id}}</code></p>
<p><strong>Purpose:</strong> Complete student relationship management from prospective inquiry to formal admission, active enrollment, academic tracking, KYC compliance verification, withdrawal, and reactivation.</p>

<div class="figure-box">
    <img src="{rel_img('06_students_directory.png')}" class="figure-img" alt="Students Directory">
    <div class="figure-caption">Figure 4.5: Filterable Students Directory with multi-criteria search and CSV export.</div>
</div>

<h3>Step-by-Step Task: Admitting a New Student</h3>
<ol>
    <li>Click <strong>Students</strong> &rarr; <strong>Add Student</strong> (or navigate to <code>/students/add</code>).</li>
    <li>Complete the 4-step wizard:
        <ul>
            <li><strong>Step 1: Personal Profile:</strong> First Name, Middle Name, Last Name, Date of Birth, Gender, Blood Group, Aadhaar Number, Category/Caste.</li>
            <li><strong>Step 2: Contact Information:</strong> Student Mobile, WhatsApp Number, Email, Residential Address, City, State, Pincode.</li>
            <li><strong>Step 3: Academic Allocation:</strong> Target Board, Standard, Division/Batch, Roll Number, Enrollment Date.</li>
            <li><strong>Step 4: Parent / Guardian Details:</strong> Father's Name, Mother's Name, Guardian Phone, Guardian Email, Occupation, Annual Income.</li>
        </ul>
    </li>
    <li>Click <strong>Submit Admission</strong>. The system assigns a unique permanent Registration Number (e.g., <code>PA-2024-000001</code>) and opens the comprehensive Student Detail Profile.</li>
</ol>

<div class="figure-box">
    <img src="{rel_img('07_student_admission_form.png')}" class="figure-img" alt="Student Admission Form">
    <div class="figure-caption">Figure 4.6: Multi-Step Student Admission Wizard.</div>
</div>

<div class="figure-box">
    <img src="{rel_img('08_student_detail_profile.png')}" class="figure-img" alt="Student Detail Profile">
    <div class="figure-caption">Figure 4.7: Student Detail Profile Workspace showing tabs for Academics, Fees, Attendance, and KYC.</div>
</div>

<h3>Student Lifecycle Actions:</h3>
<ul>
    <li><strong>Edit Profile Modal:</strong> Click the <strong>Edit Profile</strong> button to update address, contact numbers, or guardian details without altering registration or ledger history.</li>
    <li><strong>Student Withdrawal / Exit:</strong> Click <strong>Exit Student</strong>. A modal prompts for mandatory <strong>Exit Date</strong>, <strong>Exit Reason</strong> (Transfer, Financial, Health, Course Completed, Other), and administrative exit notes. Once exited, the student's status changes to <span class="chip chip-red">EXITED</span> and seat capacity in the batch is freed.</li>
    <li><strong>Student Reactivation:</strong> If a withdrawn student re-enrolls, authorized administrators (Admin, Sysadmin) can click <strong>Reactivate Student</strong>, re-assign them to an active batch, and restore active status.</li>
    <li><strong>KYC Document Management:</strong> Upload digital scans of Aadhaar Card, Transfer Certificate, Previous Marks Sheet, and Birth Certificate. Toggle document verification status (<span class="chip chip-green">VERIFIED</span> / <span class="chip chip-amber">PENDING</span>).</li>
</ul>

<div class="figure-box">
    <img src="{rel_img('09_student_edit_modal.png')}" class="figure-img" alt="Edit Student Profile Modal">
    <div class="figure-caption">Figure 4.8: Edit Student Profile Modal dialog.</div>
</div>

<div class="figure-box">
    <img src="{rel_img('10_student_exit_modal.png')}" class="figure-img" alt="Exit Student Modal">
    <div class="figure-caption">Figure 4.9: Formal Student Withdrawal / Exit Dialogue with mandatory reason tracking.</div>
</div>

<!-- 4.5 Faculty & Staff -->
<h2>4.5 Faculty & Staff Directory</h2>
<p><strong>Route:</strong> <code>/staff</code> &nbsp;|&nbsp; <strong>Access:</strong> Admin, Principal, SysAdmin</p>
<p><strong>Purpose:</strong> Maintain comprehensive faculty credentials, employee codes, designations, department allocations, and contact records.</p>

<div class="figure-box">
    <img src="{rel_img('20_staff_management.png')}" class="figure-img" alt="Staff Management">
    <div class="figure-caption">Figure 4.10: Staff & Faculty Directory with department filters and profile editor.</div>
</div>

<!-- 4.6 Attendance Management -->
<h2>4.6 Daily Attendance & Defaulter Tracking</h2>
<p><strong>Route:</strong> <code>/attendance</code> &nbsp;|&nbsp; <strong>Access:</strong> Teachers, Staff, Admin, Principal</p>
<p><strong>Purpose:</strong> Quick, error-free recording of classroom attendance with real-time absentee tracking and parental notification capabilities.</p>

<div class="figure-box">
    <img src="{rel_img('11_attendance_workspace.png')}" class="figure-img" alt="Attendance Workspace">
    <div class="figure-caption">Figure 4.11: Attendance Roster Workspace with bulk toggle buttons and real-time tally.</div>
</div>

<h3>Step-by-Step Task: Marking Batch Attendance</h3>
<ol>
    <li>Select the target <strong>Standard</strong> and <strong>Batch</strong> from the dropdown selectors.</li>
    <li>Select the <strong>Attendance Date</strong> (defaults to current date).</li>
    <li>The student roster loads automatically with all students defaulted to <span class="chip chip-green">PRESENT</span>.</li>
    <li>Click on individual student status pills to toggle between <strong>Present (P)</strong>, <strong>Absent (A)</strong>, <strong>Late (L)</strong>, or <strong>Excused (E)</strong>.</li>
    <li>Click <strong>Save Attendance Roster</strong>. Attendance statistics update immediately across dashboards and student profiles.</li>
</ol>

<!-- 4.7 Fees & Payments -->
<h2>4.7 Fee Plans, Invoicing & Discount Schemes</h2>
<p><strong>Route:</strong> <code>/fees</code> &nbsp;|&nbsp; <strong>Access:</strong> Accountant, Admin, Principal, SysAdmin</p>
<p><strong>Purpose:</strong> Define commercial fee templates, installment payment schedules, and assign customized fee commitments to enrolled students.</p>

<div class="figure-box">
    <img src="{rel_img('13_fee_plans_structures.png')}" class="figure-img" alt="Fee Structures Manager">
    <div class="figure-caption">Figure 4.12: Fee Structure Builder configuring heads, installment breakdown, and concessions.</div>
</div>

<h3>Step-by-Step Task: Creating a New Fee Structure</h3>
<ol>
    <li>Navigate to <code>/fees</code> and click <strong>Create Fee Plan</strong>.</li>
    <li>Enter <strong>Structure Name</strong> (e.g., <em>10th Science Annual Academic Package 2026-27</em>).</li>
    <li>Select target <strong>Standard</strong>.</li>
    <li>Define <strong>Fee Heads Breakdown</strong>:
        <ul>
            <li>Tuition Fee: ₹ 45,000</li>
            <li>Laboratory & Practical Fee: ₹ 10,000</li>
            <li>Study Material & Test Series: ₹ 8,000</li>
            <li>Examination Fee: ₹ 2,000</li>
        </ul>
    </li>
    <li>Set <strong>Installment Terms</strong> (e.g., 4 quarterly installments of ₹ 16,250 each).</li>
    <li>Click <strong>Save & Activate Structure</strong>. You can now bulk-assign this plan to all students enrolled in the standard.</li>
</ol>

<!-- 4.8 Payments Ledger & Posted Edit Security Gate -->
<h2>4.8 Payments Ledger & Posted Edit Security Gate</h2>
<p><strong>Route:</strong> <code>/payments</code> &nbsp;|&nbsp; <strong>Access:</strong> Accountant, Admin, Principal, SysAdmin</p>
<p><strong>Purpose:</strong> Financial transaction ledger managing the collection, draft generation, verification, receipt generation, and posting of tuition fees.</p>

<div class="figure-box">
    <img src="{rel_img('15_payments_ledger.png')}" class="figure-img" alt="Payments Ledger">
    <div class="figure-caption">Figure 4.13: Complete Payments Financial Ledger with status filtering and receipt reprint links.</div>
</div>

<h3>Payment Status Lifecycle:</h3>
<ul>
    <li><span class="chip chip-amber">DRAFT</span>: Initial payment entered by front-desk staff. Editable freely by accountants and staff. No permanent receipt number is locked.</li>
    <li><span class="chip chip-blue">SUBMITTED</span>: Payment submitted for verification. Edits require an explicit administrative reason.</li>
    <li><span class="chip chip-green">POSTED</span>: Fully verified and posted to the general financial ledger. A permanent, sequential receipt number (e.g., <code>REC-2026-000142</code>) is generated and locked.</li>
    <li><span class="chip chip-red">REFUNDED</span>: Transaction has undergone a full or partial refund. Refund records are maintained as distinct negative ledger entries linked to the original payment via <code>parent_payment_id</code>.</li>
</ul>

<div class="callout callout-danger">
    <div class="callout-title">Financial Control: Posted Payment Security Gate</div>
    <p>Ordinary staff, teachers, and accountants CANNOT edit or delete a POSTED payment. In order to protect ledger integrity and comply with accounting audit standards, only a user with the explicit <code>payments:edit_posted</code> permission (Sysadmin) can unlock and edit a posted transaction.</p>
</div>

<div class="figure-box">
    <img src="{rel_img('16_payments_lock_unlock_gate.png')}" class="figure-img" alt="Posted Payment Security Gate Modal">
    <div class="figure-caption">Figure 4.14: Posted Payment Security Gate modal enforcing authorization and mandatory reason logging.</div>
</div>

<!-- 4.9 Import Fee Register -->
<h2>4.9 Import Fee Register (CSV/Excel Wizard)</h2>
<p><strong>Route:</strong> <code>/fees/import</code> &nbsp;|&nbsp; <strong>Access:</strong> Accountant, Admin, SysAdmin</p>
<p><strong>Purpose:</strong> Seamless migration of legacy payment books or external bank reconciliation statements into PrathamOne Academy via structured CSV/Excel upload.</p>

<div class="figure-box">
    <img src="{rel_img('14_import_fee_register.png')}" class="figure-img" alt="Import Fee Register">
    <div class="figure-caption">Figure 4.15: Import Fee Register Wizard showing file upload dropzone and column mapping schema.</div>
</div>

<!-- 4.10 Examinations & Results -->
<h2>4.10 Examinations, Grading & Report Cards</h2>
<p><strong>Route:</strong> <code>/examinations</code> &nbsp;|&nbsp; <strong>Access:</strong> Teachers, Admin, Principal, SysAdmin</p>
<p><strong>Purpose:</strong> Schedule periodic unit tests, quarterly exams, mock tests, and final examinations. Record subject marks, calculate grade percentages, and print official report cards.</p>

<div class="figure-box">
    <img src="{rel_img('12_examinations_results.png')}" class="figure-img" alt="Examinations Workspace">
    <div class="figure-caption">Figure 4.16: Examinations Workspace showing active schedules, marks entry grid, and rank lists.</div>
</div>

<!-- 4.11 Communication Hub -->
<h2>4.11 Communication Hub & Broadcast Notices</h2>
<p><strong>Route:</strong> <code>/communication</code> &nbsp;|&nbsp; <strong>Access:</strong> Admin, Principal, SysAdmin</p>
<p><strong>Purpose:</strong> Institute-wide broadcast messaging for emergency notices, holiday announcements, exam timetables, fee reminders, and parent-teacher meeting circulars.</p>

<div class="figure-box">
    <img src="{rel_img('26_communication_center.png')}" class="figure-img" alt="Communication Center">
    <div class="figure-caption">Figure 4.17: Multi-channel Communication Center with audience filters and message logs.</div>
</div>

<!-- 4.12 Reports & Analytics Grid -->
<h2>4.12 High-Performance Reports & Analytics Grid</h2>
<p><strong>Route:</strong> <code>/reports</code> &nbsp;|&nbsp; <strong>Access:</strong> Accountant, Admin, Principal, SysAdmin</p>
<p><strong>Purpose:</strong> Enterprise-grade tabular reporting engine equipped with real-time column grouping, dynamic pivoting, multi-column sorting, and instant Excel/CSV download.</p>

<div class="figure-box">
    <img src="{rel_img('17_reports_analytics_grid.png')}" class="figure-img" alt="Reports & Analytics Grid">
    <div class="figure-caption">Figure 4.18: High-Performance Excel Report Grid displaying live financial realization analytics.</div>
</div>

<!-- 4.13 Forms & Documents -->
<h2>4.13 Forms & Documents Printing Center (DPDP Compliant)</h2>
<p><strong>Route:</strong> <code>/forms</code> &nbsp;|&nbsp; <strong>Access:</strong> Admin, Principal, Staff, SysAdmin</p>
<p><strong>Purpose:</strong> Standardized, print-ready document rendering compliant with statutory educational regulations and Digital Personal Data Protection (DPDP) logging.</p>

<div class="figure-box">
    <img src="{rel_img('24_forms_documents_hub.png')}" class="figure-img" alt="Forms & Documents Hub">
    <div class="figure-caption">Figure 4.19: Forms & Documents Hub with pre-formatted certificates and DPDP compliance logs.</div>
</div>

<!-- 4.14 Data Import / Export -->
<h2>4.14 Data Import / Export Engine</h2>
<p><strong>Route:</strong> <code>/import-export</code> &nbsp;|&nbsp; <strong>Access:</strong> Admin, SysAdmin</p>
<p><strong>Purpose:</strong> Bulk bidirectional synchronization of master data entities via CSV and JSON formats.</p>

<div class="figure-box">
    <img src="{rel_img('23_import_export_center.png')}" class="figure-img" alt="Import / Export Center">
    <div class="figure-caption">Figure 4.20: Master Data Import and Export Workspace with downloadable CSV templates.</div>
</div>

<!-- 4.15 User Management -->
<h2>4.15 User Management & RBAC Administration</h2>
<p><strong>Routes:</strong> <code>/users</code>, <code>/users/{{id}}</code> &nbsp;|&nbsp; <strong>Access:</strong> Admin, Superadmin, SysAdmin</p>
<p><strong>Purpose:</strong> Provisioning user accounts, assigning roles, resetting credentials, and reviewing permission matrices.</p>

<div class="figure-box">
    <img src="{rel_img('18_user_management.png')}" class="figure-img" alt="User Management Directory">
    <div class="figure-caption">Figure 4.21: User Management Directory displaying user roles, last login timestamps, and status toggles.</div>
</div>

<!-- 4.16 Settings & Branding -->
<h2>4.16 Institute Settings & Live Branding Customizer</h2>
<p><strong>Route:</strong> <code>/settings</code> &nbsp;|&nbsp; <strong>Access:</strong> Admin, SysAdmin</p>
<p><strong>Purpose:</strong> Configure institute name, contact info, official logo, and brand color palette with instant real-time preview.</p>

<div class="figure-box">
    <img src="{rel_img('25_branding_settings_preview.png')}" class="figure-img" alt="Settings & Branding Preview">
    <div class="figure-caption">Figure 4.22: Settings Workspace featuring the interactive Live Branding Preview card.</div>
</div>

<!-- 4.17 SysAdmin Center -->
<h2>4.17 SysAdmin Center & Universal Records Editor</h2>
<p><strong>Route:</strong> <code>/sysadmin</code> &nbsp;|&nbsp; <strong>Access:</strong> SysAdmin Exclusive</p>
<p><strong>Purpose:</strong> Master control center for system diagnostics, server telemetry, immutable security logs, and the Universal Records Editor.</p>

<div class="figure-box">
    <img src="{rel_img('21_sysadmin_center_overview.png')}" class="figure-img" alt="SysAdmin Center Overview">
    <div class="figure-caption">Figure 4.23: SysAdmin Center master dashboard with system health monitors and audit feeds.</div>
</div>

<div class="figure-box">
    <img src="{rel_img('22_sysadmin_universal_editor.png')}" class="figure-img" alt="Universal Records Editor">
    <div class="figure-caption">Figure 4.24: Universal Records Editor with clickable permissible field chips and mandatory reason field.</div>
</div>

<!-- 4.18 Release Management -->
<h2>4.18 Release Management & Semantic Version Audit</h2>
<p><strong>Route:</strong> <code>/releases</code> &nbsp;|&nbsp; <strong>Access:</strong> All Users (Read-only)</p>
<p><strong>Purpose:</strong> Enterprise release tracking showing current version (<code>v6.99.1</code>), build number (<code>2026.11.05-PROD-REL</code>), release history, and security patches.</p>

<div class="figure-box">
    <img src="{rel_img('27_releases_and_version_audit.png')}" class="figure-img" alt="Releases Workspace">
    <div class="figure-caption">Figure 4.25: Software Release & Changelog Audit workspace.</div>
</div>

<!-- CHAPTER 5 -->
<h1>5. End-to-End Business Workflows</h1>

<h2>5.1 Workflow 1: Student Onboarding from Admission to Batch Enrollment</h2>
<ol class="step-list">
    <li class="step-item">
        <div class="step-title">Inquiry & Registration</div>
        Parent/Student arrives. Front desk opens <code>/students/add</code> and enters personal, contact, and academic details.
    </li>
    <li class="step-item">
        <div class="step-title">Batch & Division Assignment</div>
        Student is assigned to the appropriate Standard (e.g., 10th CBSE) and Batch (Morning Champions Batch A). Roll number is allocated.
    </li>
    <li class="step-item">
        <div class="step-title">Fee Plan Commitment</div>
        The standard fee plan is automatically mapped to the student profile, establishing the student's fee obligation and installment timeline.
    </li>
    <li class="step-item">
        <div class="step-title">Identity Card & Admission Form Generation</div>
        One-click generation of the Student ID Card and Admission Record from <code>/forms</code>.
    </li>
</ol>

<h2>5.2 Workflow 2: Financial Collection, Receipting, Correction & Refunds</h2>
<ol class="step-list">
    <li class="step-item">
        <div class="step-title">Payment Collection</div>
        Accountant receives cash, cheque, or UPI payment via <code>/payments</code> &rarr; <em>Record Payment</em>.
    </li>
    <li class="step-item">
        <div class="step-title">Sequential Receipt Issuance</div>
        System generates permanent sequential receipt (<code>REC-2026-XXXXXX</code>) and posts to financial ledger.
    </li>
    <li class="step-item">
        <div class="step-title">Posted Payment Correction (If Required)</div>
        If a mistake occurred, Sysadmin accesses the Posted Payment Security Gate with an explicit reason. The original receipt is marked as superseded, and a new versioned receipt is issued. Historical numbers are never deleted.
    </li>
    <li class="step-item">
        <div class="step-title">Processing a Refund</div>
        If a student withdraws, an authorized accountant processes a linked refund via the Payments module. The refund references the original payment ID and updates the net balance.
    </li>
</ol>

<!-- CHAPTER 6 -->
<h1>6. Special SysAdmin Security Manual</h1>

<h2>6.1 Universal Record Editor Guardrails & Allowlists</h2>
<p>The <strong>Universal Records Editor</strong> (available exclusively to SysAdmin at <code>/sysadmin</code>) allows surgical data correction across 8 core database models without direct database manipulation. To prevent relational corruption or security bypasses, strict field allowlists are enforced:</p>

<table>
    <thead>
        <tr>
            <th>Target Model</th>
            <th>Permissible Editable Fields</th>
            <th>Strictly Prohibited Fields</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>student</code></td>
            <td><code>first_name, last_name, middle_name, date_of_birth, gender, blood_group, nationality, religion, caste, aadhar_number, photo_url, address, city, state, pincode, phone, email, is_active, exit_date, exit_reason, exit_notes</code></td>
            <td><code>id, institution_id, registration_number, created_at, updated_at</code></td>
        </tr>
        <tr>
            <td><code>staff</code></td>
            <td><code>first_name, last_name, designation, department, qualification, experience_years, phone, email, address, status, joining_date, specialization</code></td>
            <td><code>id, institution_id, staff_code, created_at, updated_at</code></td>
        </tr>
        <tr>
            <td><code>user</code></td>
            <td><code>first_name, last_name, email, phone, role, is_active</code></td>
            <td><code>id, institution_id, username, hashed_password, created_at</code></td>
        </tr>
        <tr>
            <td><code>fee_structure</code></td>
            <td><code>name, description, total_amount, is_active</code></td>
            <td><code>id, institution_id, standard_id, created_at</code></td>
        </tr>
        <tr>
            <td><code>division / batch</code></td>
            <td><code>name, code, room_number, capacity, schedule_timing, status, is_active, class_teacher_id</code></td>
            <td><code>id, institution_id, standard_id, created_at</code></td>
        </tr>
        <tr>
            <td><code>standard</code></td>
            <td><code>name, level, description, is_active</code></td>
            <td><code>id, institution_id, board_id, created_at</code></td>
        </tr>
        <tr>
            <td><code>institution</code></td>
            <td><code>name, tagline, address, city, state, pincode, phone, email, website, logo_url, favicon_url, primary_color, secondary_color, accent_color, description, is_active</code></td>
            <td><code>id, code, created_at</code></td>
        </tr>
    </tbody>
</table>

<div class="callout callout-danger">
    <div class="callout-title">SysAdmin Anti-Lockout Safeguard</div>
    <p>The backend actively prevents the primary SysAdmin user from deactivating their own account (User ID 128) via the Universal Editor. Any attempt to set <code>is_active = false</code> on the current SysAdmin returns <strong>HTTP 400 Bad Request</strong>.</p>
</div>

<!-- CHAPTER 7 -->
<h1>7. Troubleshooting, Error Codes & Support</h1>

<h2>7.1 Common Runtime Errors & Resolving Taxonomy Codes</h2>
<p>PrathamOne Academy features a centralized, taxonomy-based error monitoring architecture. When an error occurs, a user-friendly modal is displayed along with a unique reference code (e.g., <code>ERR-20261106-XXXX</code>):</p>

<table>
    <thead>
        <tr>
            <th>Taxonomy Category</th>
            <th>Typical Root Cause</th>
            <th>Recommended User Resolution</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><strong>INTERNET_DISCONNECTED</strong></td>
            <td>Local Wi-Fi or ethernet drop.</td>
            <td>Check router connection. The application PWA will operate in offline cache mode until connection is re-established.</td>
        </tr>
        <tr>
            <td><strong>SESSION_EXPIRED</strong> (HTTP 401)</td>
            <td>JWT token lifetime exceeded (8 hours).</td>
            <td>The system automatically redirects you to <code>/login</code> once. Re-enter your password to renew session.</td>
        </tr>
        <tr>
            <td><strong>PERMISSION_DENIED</strong> (HTTP 403)</td>
            <td>Current user role lacks permission for the requested action.</td>
            <td>Contact your institute Administrator or Sysadmin to assign appropriate permissions.</td>
        </tr>
        <tr>
            <td><strong>RESOURCE_NOT_FOUND</strong> (HTTP 404)</td>
            <td>Target student ID or record does not exist or was removed.</td>
            <td>Verify the record ID in the directory. Deleted records can be inspected in the Audit Log.</td>
        </tr>
        <tr>
            <td><strong>VALIDATION_FAILED</strong> (HTTP 400/422)</td>
            <td>Missing mandatory field (e.g., Edit Reason) or duplicate unique key.</td>
            <td>Review highlighted input fields in red. Ensure an administrative reason is provided for transaction modifications.</td>
        </tr>
    </tbody>
</table>

<h2>7.2 Frequently Asked Questions (FAQ)</h2>
<p><strong>Q: Can I edit a fee payment after the receipt has been printed?</strong><br>
A: Yes, but only with authorized Sysadmin credentials via the Posted Payment Security Gate. The system preserves the original receipt for audit compliance and marks it as superseded.</p>

<p><strong>Q: How do I export my student roster to Excel?</strong><br>
A: Go to <strong>Students</strong> or <strong>Reports</strong>, set your desired filters, and click the green <strong>Export to Excel / CSV</strong> button at the top right of the table.</p>

<p><strong>Q: What happens when a student withdraws? Does it delete their fee history?</strong><br>
A: No! Financial records and attendance history are permanently preserved. The student's status is simply marked as Exited, freeing up batch capacity.</p>

<h2>7.3 Official Support Channels & SLA</h2>
<div class="callout callout-note">
    <div class="callout-title">PrathamOne Academy Official Support Helpdesk</div>
    <p><strong>Direct Telephone / WhatsApp Support:</strong><br>
       &bull; Primary Helpline: <strong>+91 9323 023 007</strong><br>
       &bull; Secondary Helpline: <strong>+91 9324 117 007</strong>
    </p>
    <p><strong>Official Support Email:</strong><br>
       &bull; Primary Desk: <a href="mailto:support@prathamone.com">support@prathamone.com</a><br>
       &bull; Alternate Desk: <a href="mailto:prathamone@outlook.com">prathamone@outlook.com</a>
    </p>
    <p><strong>Official Product Portal:</strong><br>
       &bull; <a href="https://prathamone.com">https://prathamone.com</a>
    </p>
    <p><strong>Author & Chief Architect:</strong> Jawahar R Mallah<br>
       <strong>Organization:</strong> AITDL — AI Technology & Development Lab
    </p>
</div>

<div class="page-footer-text">
    PrathamOne Coaching Institutes Enterprise Suite · prathamone.com
</div>

</body>
</html>
"""
    return html

def build_quick_start_guide_html():
    css = get_base_css()
    cover = get_cover_html(
        "PrathamOne Academy",
        "Quick Start & Fast-Track Onboarding Guide",
        "QUICK START GUIDE"
    )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>PrathamOne Academy — Quick Start Guide</title>
    <style>
        {css}
    </style>
</head>
<body>

{cover}

<div style="page-break-after: always; padding-top: 30px;">
    <h2>1. Fast-Track System Setup in 5 Steps</h2>
    <p>Welcome to <strong>PrathamOne Academy</strong>. This Quick Start Guide gets your coaching academy operational in less than 30 minutes. Follow these five core steps:</p>

    <ol class="step-list">
        <li class="step-item">
            <div class="step-title">Step 1: Sign in and Customize Your Institute Branding</div>
            <p>Navigate to <code>http://localhost:80/login</code>. Sign in using your administrator credentials. Immediately go to <strong>Settings</strong> (<code>/settings</code>) to upload your coaching institute's logo, set your primary brand colors, and verify your institute contact phone and address.</p>
        </li>
        <li class="step-item">
            <div class="step-title">Step 2: Create Educational Boards & Standards</div>
            <p>Open <strong>Academic Structure</strong> (<code>/academic</code>). Under the <strong>Boards</strong> tab, add your curriculums (e.g. CBSE, State Board). Switch to the <strong>Standards</strong> tab and add your class grades (e.g. 9th, 10th, 11th Science, 12th Commerce).</p>
        </li>
        <li class="step-item">
            <div class="step-title">Step 3: Define Batches & Classroom Capacity</div>
            <p>In the <strong>Batches</strong> tab, create morning or evening batches for each standard. Set classroom seat capacities so the system can monitor intake limits.</p>
        </li>
        <li class="step-item">
            <div class="step-title">Step 4: Configure Fee Packages & Payment Installments</div>
            <p>Open <strong>Fees</strong> (<code>/fees</code>). Click <strong>Create Fee Plan</strong> to configure your standard tuition fee packages and installment plans (e.g. Quarterly or Monthly).</p>
        </li>
        <li class="step-item">
            <div class="step-title">Step 5: Admit Students & Issue Identity Cards</div>
            <p>Open <strong>Students &rarr; Add Student</strong> (<code>/students/add</code>). Enter student profile details, select their standard and batch, and submit. The system assigns a permanent registration code and offers instant ID card generation via <strong>Forms</strong> (<code>/forms</code>).</p>
        </li>
    </ol>
</div>

<div style="page-break-after: always; padding-top: 20px;">
    <h2>2. Core Daily Operations</h2>

    <h3>2.1 Daily Attendance Marking</h3>
    <p>Open <code>/attendance</code>, choose your batch, and verify the roster. All students default to Present. Click any student to toggle to Absent or Late, then click <strong>Save Attendance Roster</strong>.</p>
    <div class="figure-box">
        <img src="{rel_img('11_attendance_workspace.png')}" class="figure-img" alt="Daily Attendance">
        <div class="figure-caption">Daily Attendance Marking Screen.</div>
    </div>

    <h3>2.2 Collecting Fees & Printing Receipts</h3>
    <p>Go to <code>/payments</code> &rarr; click <strong>Record Payment</strong>. Search for the student. Their pending installments appear automatically. Enter the amount paid, select Cash/UPI/Cheque, enter transaction reference, and click <strong>Save & Post</strong>. Click <strong>Print Receipt</strong> to issue an official thermal or A4 receipt.</p>
    <div class="figure-box">
        <img src="{rel_img('15_payments_ledger.png')}" class="figure-img" alt="Payments Ledger">
        <div class="figure-caption">Payment Ledger & Receipt Generation.</div>
    </div>
</div>

<div style="padding-top: 20px;">
    <h2>3. Help & Emergency Contacts</h2>
    <div class="callout callout-note">
        <div class="callout-title">PrathamOne Academy Support Helpline</div>
        <p>Helpline: <strong>+91 9323 023 007 / +91 9324 117 007</strong><br>
           Support Email: <a href="mailto:support@prathamone.com">support@prathamone.com</a><br>
           Alternate Email: <a href="mailto:prathamone@outlook.com">prathamone@outlook.com</a><br>
           Official Website: <a href="https://prathamone.com">https://prathamone.com</a><br>
           Author: <strong>Jawahar R Mallah</strong> &middot; Organization: <strong>AITDL</strong>
        </p>
    </div>
    <div class="page-footer-text">
        PrathamOne Coaching Institutes Enterprise Suite · prathamone.com
    </div>
</div>

</body>
</html>
"""
    return html

def build_sysadmin_manual_html():
    css = get_base_css()
    cover = get_cover_html(
        "PrathamOne Academy",
        "SysAdmin Security & Architecture Manual",
        "SYSADMIN MANUAL"
    )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>PrathamOne Academy — SysAdmin Security Manual</title>
    <style>
        {css}
    </style>
</head>
<body>

{cover}

<div style="page-break-after: always; padding-top: 30px;">
    <h2>1. SysAdmin Superuser Privileges & Architecture</h2>
    <p>The <strong>SysAdmin</strong> role represents the highest level of administrative authorization within the PrathamOne Academy enterprise architecture. SysAdmin accounts possess unrestricted visibility across all application modules, as well as exclusive capabilities:</p>
    <ul>
        <li><strong>Universal Records Editor:</strong> Surgical in-place editing of master data records across 8 core database models with strict allowlist enforcement.</li>
        <li><strong>Posted Payments Security Gate:</strong> Exclusive authority to unlock and correct posted financial ledger transactions.</li>
        <li><strong>Immutable Security Audit Logs:</strong> Complete forensic surveillance of all administrative updates, document generation, and authentication events.</li>
        <li><strong>Multi-Branch Tenant Isolation Management:</strong> Supervision of institutional settings, branch hierarchies, and data isolation boundaries.</li>
    </ul>

    <div class="figure-box">
        <img src="{rel_img('21_sysadmin_center_overview.png')}" class="figure-img" alt="SysAdmin Center Overview">
        <div class="figure-caption">SysAdmin Operations Center with Server Diagnostics & Security Logs.</div>
    </div>
</div>

<div style="page-break-after: always; padding-top: 20px;">
    <h2>2. Universal Records Editor & Field Allowlists</h2>
    <p>Located in the <strong>SysAdmin Center</strong> (<code>/sysadmin</code>), the Universal Records Editor allows authorized superusers to correct operational anomalies (e.g. spelling errors, wrong exit dates, misallocated contact numbers) directly through the authenticated API without requiring terminal database access.</p>

    <div class="figure-box">
        <img src="{rel_img('22_sysadmin_universal_editor.png')}" class="figure-img" alt="Universal Data Editor">
        <div class="figure-caption">Universal Records Editor with Permissible Field Chips and Mandatory Audit Reason.</div>
    </div>

    <h3>Strict Field-Level Allowlists</h3>
    <table>
        <thead>
            <tr>
                <th>Target Model</th>
                <th>Permissible Fields</th>
                <th>Prohibited Fields (Blocked by Backend)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><code>student</code></td>
                <td>first_name, last_name, middle_name, date_of_birth, gender, blood_group, nationality, religion, caste, aadhar_number, photo_url, address, city, state, pincode, phone, email, is_active, exit_date, exit_reason, exit_notes</td>
                <td>id, institution_id, registration_number, created_at, updated_at</td>
            </tr>
            <tr>
                <td><code>staff</code></td>
                <td>first_name, last_name, designation, department, qualification, experience_years, phone, email, address, status, joining_date, specialization</td>
                <td>id, institution_id, staff_code, created_at, updated_at</td>
            </tr>
            <tr>
                <td><code>user</code></td>
                <td>first_name, last_name, email, phone, role, is_active</td>
                <td>id, institution_id, username, hashed_password, created_at</td>
            </tr>
            <tr>
                <td><code>fee_structure</code></td>
                <td>name, description, total_amount, is_active</td>
                <td>id, institution_id, standard_id, created_at</td>
            </tr>
            <tr>
                <td><code>division / batch</code></td>
                <td>name, code, room_number, capacity, schedule_timing, status, is_active, class_teacher_id</td>
                <td>id, institution_id, standard_id, created_at</td>
            </tr>
            <tr>
                <td><code>standard</code></td>
                <td>name, level, description, is_active</td>
                <td>id, institution_id, board_id, created_at</td>
            </tr>
            <tr>
                <td><code>institution</code></td>
                <td>name, tagline, address, city, state, pincode, phone, email, website, logo_url, favicon_url, primary_color, secondary_color, accent_color, description, is_active</td>
                <td>id, code, created_at</td>
            </tr>
        </tbody>
    </table>

    <div class="callout callout-danger">
        <div class="callout-title">Mandatory Reason Requirement</div>
        <p>Every universal edit requires an explicit administrative reason. Missing or whitespace reasons are rejected by the backend with <strong>HTTP 400 Bad Request</strong>.</p>
    </div>
</div>

<div style="page-break-after: always; padding-top: 20px;">
    <h2>3. Posted Payment Security Gate & Receipt Integrity</h2>
    <p>Financial ledger security requires that posted transactions cannot be altered by front-desk or accounting personnel. When a legitimate correction is required (e.g. cheque clearance dishonor, wrong fee head mapping), SysAdmin operates the Posted Payment Security Gate:</p>

    <div class="figure-box">
        <img src="{rel_img('16_payments_lock_unlock_gate.png')}" class="figure-img" alt="Posted Payment Gate">
        <div class="figure-caption">Posted Payment Security Gate Modal Dialog.</div>
    </div>

    <ol class="step-list">
        <li class="step-item">
            <div class="step-title">Security Gate Verification</div>
            SysAdmin enters the payment record ID and authenticates the unlock action.
        </li>
        <li class="step-item">
            <div class="step-title">Mandatory Edit Reason</div>
            SysAdmin enters a comprehensive justification for the transaction correction.
        </li>
        <li class="step-item">
            <div class="step-title">Receipt Supersession & Audit Recording</div>
            The backend updates the payment, marks the original receipt as superseded (<code>is_superseded = True</code>), and issues a versioned revision. Receipt sequence numbers are never deleted or renumbered.
        </li>
    </ol>
</div>

<div style="padding-top: 20px;">
    <h2>4. Security Audit Logs & Telemetry</h2>
    <p>All sensitive operations across PrathamOne Academy generate structured audit logs stored in the PostgreSQL <code>audit_logs</code> table. These can be reviewed in real time via the SysAdmin Center (<code>/sysadmin</code> &rarr; <em>Security Audit Logs</em>):</p>

    <ul>
        <li><strong>Actor & Identity:</strong> User ID, Username, and Role of the actor.</li>
        <li><strong>Resource Type & ID:</strong> Target entity (e.g. <code>student:129</code>, <code>payment:45</code>).</li>
        <li><strong>Before / After Diff:</strong> Complete JSON snapshot of modified fields (<code>old_data</code> vs <code>new_data</code>).</li>
        <li><strong>Origin Network:</strong> Client IP address and browser User-Agent header.</li>
    </ul>

    <div class="callout callout-note">
        <div class="callout-title">SysAdmin Technical Support Contact</div>
        <p>Support Phones: <strong>+91 9323 023 007 / +91 9324 117 007</strong><br>
           Support Email: <a href="mailto:support@prathamone.com">support@prathamone.com</a><br>
           Portal: <a href="https://prathamone.com">https://prathamone.com</a><br>
           Author: <strong>Jawahar R Mallah</strong> &middot; <strong>AITDL</strong>
        </p>
    </div>
    <div class="page-footer-text">
        PrathamOne Coaching Institutes Enterprise Suite · prathamone.com
    </div>
</div>

</body>
</html>
"""
    return html

def compile_all_manuals():
    os.makedirs(SOURCES_DIR, exist_ok=True)
    os.makedirs(PDF_DIR, exist_ok=True)
    os.makedirs(ROOT_MANUAL_DIR, exist_ok=True)

    print("Building HTML sources...")
    
    # 1. Complete User Manual
    html_complete = build_complete_user_manual_html()
    complete_html_path = os.path.join(SOURCES_DIR, "complete_user_manual.html")
    with open(complete_html_path, "w", encoding="utf-8") as f:
        f.write(html_complete)
    print(f"Wrote {complete_html_path}")

    # 2. Quick Start Guide
    html_quick = build_quick_start_guide_html()
    quick_html_path = os.path.join(SOURCES_DIR, "quick_start_guide.html")
    with open(quick_html_path, "w", encoding="utf-8") as f:
        f.write(html_quick)
    print(f"Wrote {quick_html_path}")

    # 3. Sysadmin Manual
    html_sysadmin = build_sysadmin_manual_html()
    sysadmin_html_path = os.path.join(SOURCES_DIR, "sysadmin_manual.html")
    with open(sysadmin_html_path, "w", encoding="utf-8") as f:
        f.write(html_sysadmin)
    print(f"Wrote {sysadmin_html_path}")

    print("\nRendering PDFs via Playwright Chromium...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        tasks = [
            (
                complete_html_path,
                "PrathamOne_Academy_Complete_User_Manual.pdf",
                "PrathamOne Academy Coaching Institutes Enterprise Suite — Complete User Manual"
            ),
            (
                quick_html_path,
                "PrathamOne_Academy_Quick_Start_Guide.pdf",
                "PrathamOne Academy Coaching Institutes Enterprise Suite — Quick Start Guide"
            ),
            (
                sysadmin_html_path,
                "PrathamOne_Academy_Sysadmin_Manual.pdf",
                "PrathamOne Academy Coaching Institutes Enterprise Suite — SysAdmin Security Manual"
            )
        ]

        for src_html, pdf_filename, doc_title in tasks:
            print(f"Compiling {pdf_filename}...")
            page = browser.new_page()
            file_uri = f"file:///{src_html.replace(os.sep, '/')}"
            page.goto(file_uri, wait_until="networkidle")

            pdf_out_path = os.path.join(PDF_DIR, pdf_filename)
            page.pdf(
                path=pdf_out_path,
                format="A4",
                print_background=True,
                margin={"top": "15mm", "bottom": "20mm", "left": "15mm", "right": "15mm"},
                display_header_footer=True,
                header_template=f'''
                    <div style="font-size: 8pt; color: #94a3b8; width: 100%; text-align: right; padding-right: 15mm; font-family: -apple-system, sans-serif;">
                        {doc_title}
                    </div>
                ''',
                footer_template='''
                    <div style="font-size: 8pt; color: #94a3b8; width: 100%; display: flex; justify-content: space-between; padding-left: 15mm; padding-right: 15mm; font-family: -apple-system, sans-serif;">
                        <span>PrathamOne Coaching Institutes Enterprise Suite · prathamone.com</span>
                        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
                    </div>
                '''
            )
            page.close()
            # Copy to root manual dir as well
            root_copy = os.path.join(ROOT_MANUAL_DIR, pdf_filename)
            shutil.copy2(pdf_out_path, root_copy)
            print(f"Generated: {pdf_out_path} and copied to {root_copy}")

        browser.close()
        print("\nAll 3 PDF manuals generated successfully!")

if __name__ == "__main__":
    compile_all_manuals()
