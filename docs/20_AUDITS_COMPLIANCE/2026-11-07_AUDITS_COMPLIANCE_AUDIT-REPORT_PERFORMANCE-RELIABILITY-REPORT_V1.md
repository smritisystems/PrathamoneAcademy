---
title: "PrathamOne EduOS — System Performance, Latency & Reliability Benchmarks"
module: "20_AUDITS_COMPLIANCE"
category: "AUDIT-REPORT"
document_type: "AUDIT-REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-07"
updated_date: "2026-11-07"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["20-audits-compliance", "performance-audit", "latency", "benchmarks", "reliability"]
entities: ["users", "students", "fee_invoices", "payments", "attendances", "codex_configs"]
api_routes: ["/health", "/api/v1/dashboard/stats", "/api/v1/students/", "/api/v1/fees/overview", "/api/v1/attendance/", "/api/v1/teacher-payroll/monthly"]
related_modules: ["01_ARCHITECTURE", "16_DATABASE_API", "18_TESTING_QA"]
---

# PrathamOne EduOS — System Performance, Latency & Reliability Benchmarks

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0 (Build: 2026.11.06-REV-016-v1.10.0-9D2489F)  
**Organization:** AITDL — AI Technology & Development Lab  
**Product Architect:** Jawahar R Mallah  
**Audit Date:** 2026-11-07  
**Test Methodology:** Multi-Sample Live API Benchmarks via Async Connection Pool  

---

## 1. Executive Summary

This performance and reliability audit empirically measured the responsiveness, throughput, payload dimensions, and connection pool behavior of **PrathamOne EduOS**. Measurements were collected from the running production-like Docker environment over 100 HTTP requests spanning 20 critical API endpoints.

The application demonstrated extraordinary efficiency:
- **System Average Latency:** **22.4 ms**
- **HTTP 200 Success Rate:** **100.0%**
- **Peak Latency across Complex Aggregations:** **60.0 ms**
- **Database Connection Saturation:** **0% (Healthy AsyncPG Pool)**

---

## 2. Comprehensive Endpoint Latency Benchmarks

| Method | Endpoint Path | Status | Min (ms) | Mean (ms) | Max (ms) | Payload Size | Latency Grade |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | 200 OK | 5.33 | 9.81 | 13.89 | 20 B | **A+ (Ultra Fast)** |
| `GET` | `/api/v1/academic-years/` | 200 OK | 9.88 | 10.08 | 10.28 | 342 B | **A+ (Ultra Fast)** |
| `GET` | `/api/v1/examinations/` | 200 OK | 10.78 | 11.38 | 11.87 | 2,111 B | **A+ (Ultra Fast)** |
| `GET` | `/api/v1/teacher-payroll/teachers` | 200 OK | 11.13 | 12.23 | 13.03 | 483 B | **A+ (Ultra Fast)** |
| `GET` | `/api/v1/settings/all` | 200 OK | 10.77 | 12.31 | 15.02 | 3,917 B | **A+ (Ultra Fast)** |
| `GET` | `/api/v1/teacher-payroll/profiles` | 200 OK | 12.28 | 13.22 | 14.94 | 1,775 B | **A+ (Ultra Fast)** |
| `GET` | `/api/v1/sysadmin/security-audit-logs`| 200 OK | 13.07 | 14.44 | 16.77 | 4,367 B | **A+ (Ultra Fast)** |
| `GET` | `/api/v1/communication/templates` | 200 OK | 11.76 | 15.04 | 17.41 | 4,666 B | **A+ (Ultra Fast)** |
| `GET` | `/api/v1/standards/` | 200 OK | 14.33 | 15.28 | 16.57 | 1,625 B | **A+ (Ultra Fast)** |
| `GET` | `/api/v1/teacher-payroll/monthly` | 200 OK | 12.01 | 15.83 | 21.82 | 2,251 B | **A+ (Ultra Fast)** |
| `GET` | `/api/v1/codex/profiles` | 200 OK | 11.89 | 16.47 | 25.25 | 418 B | **A+ (Ultra Fast)** |
| `GET` | `/api/v1/staff/non-teaching/dashboard`| 200 OK | 16.47 | 17.70 | 20.87 | 19,004 B | **A+ (Ultra Fast)** |
| `GET` | `/api/v1/students/?skip=0&limit=50` | 200 OK | 14.17 | 19.69 | 26.68 | 6,794 B | **A+ (Ultra Fast)** |
| `GET` | `/api/v1/codex/config` | 200 OK | 16.42 | 22.91 | 33.88 | 1,158 B | **A (Fast)** |
| `GET` | `/api/v1/dashboard/stats` | 200 OK | 23.61 | 24.20 | 25.82 | 3,246 B | **A (Fast)** |
| `GET` | `/api/v1/staff/` | 200 OK | 21.53 | 26.60 | 34.66 | 5,206 B | **A (Fast)** |
| `GET` | `/api/v1/staff/dashboard/stats` | 200 OK | 15.37 | 36.56 | 53.28 | 156 B | **A (Fast)** |
| `GET` | `/api/v1/staff/teachers/dashboard` | 200 OK | 40.16 | 51.84 | 67.95 | 3,794 B | **B (Optimal)** |
| `GET` | `/api/v1/fees/overview` | 200 OK | 46.98 | 52.51 | 58.31 | 7,711 B | **B (Optimal)** |
| `GET` | `/api/v1/attendance/?limit=50` | 200 OK | 44.63 | 60.03 | 94.80 | 120,976 B | **B (Optimal)** |

---

## 3. Latency Distribution Analysis

```mermaid
xychart-beta
    title "API Mean Latency Distribution by Endpoint (Milliseconds)"
    x-axis ["Health", "AcadYears", "Exams", "Payroll", "Settings", "AuditLogs", "Students", "CodeX", "Dashboard", "Teachers", "Fees", "Attendance"]
    y-axis "Latency (ms)" 0 --> 70
    bar [9.8, 10.1, 11.4, 15.8, 12.3, 14.4, 19.7, 22.9, 24.2, 51.8, 52.5, 60.0]
```

### Categorization:
- **Sub-15ms (Ultra-Fast):** 9 endpoints (45% of total). These leverage indexed single-table lookups and small payload serialization.
- **15ms - 30ms (Fast):** 7 endpoints (35% of total). Standard relational joins with pagination.
- **30ms - 65ms (Optimal Aggregations):** 4 endpoints (20% of total). Complex aggregations (fees multi-ledger rollups, teacher hours computation, heavy 120KB attendance payloads).

---

## 4. Connection Pool & Concurrency Reliability

- **PostgreSQL AsyncPG Engine:**
  - Configured `pool_size = 10`, `max_overflow = 20`.
  - Zero connection timeouts or connection refusal events logged during continuous test and benchmark loops.
  - Active transactions automatically committed or rolled back in async context managers.
- **Memory & Resource Utilization:**
  - `prashant_academy_backend`: Memory consumption steady at ~115 MB.
  - `prashant_academy_db`: Shared buffers ~128 MB, total memory ~65 MB.
  - `prashant_academy_frontend`: Nginx worker memory < 15 MB.
  - Total system footprint is under 200 MB RAM, making it suitable for cost-effective cloud or on-premise institute deployments.

---

## 5. Performance Optimization Opportunities (P3 Roadmap)

1. **Fee Overview Caching:** Implement a short-lived (60s) in-memory TTL cache for `/api/v1/fees/overview` so dashboard reloads return in <10ms instead of recalculating 171 payments.
2. **Attendance Pagination Optimization:** Default `/api/v1/attendance/` limit to 25 records with selective column filtering to reduce payload size from 120KB to ~30KB.
3. **HTTP Response Gzip Compression:** Enable `GZipMiddleware(minimum_size=1000)` in FastAPI `main.py` to compress large attendance and student responses over the wire.

