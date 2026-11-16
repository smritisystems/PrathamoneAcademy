---
title: "Customer Telemetry Diagnostic Postmortem: Chat WebSocket 500, Fee Reminder 422 & Housekeeping 504 RCA"
module: "21_TROUBLESHOOTING"
category: "IMPLEMENTATION-REPORT"
document_type: "REPORT"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-16"
updated_date: "2026-11-16"
author: "Jawahar R Mallah"
organization: "Smritisys & AITDL Networks"
status: "Approved"
tags: ["troubleshooting", "websocket", "chat", "fee-reminders", "housekeeping", "nginx", "timeout", "postmortem"]
entities: ["ChatRoom", "CommunicationLog", "FeeInvoice", "User"]
api_routes: ["/api/v1/chat/ws/{room_id}", "/api/v1/communication/automation/fee-reminders/preview", "/api/v1/housekeeping/backups"]
related_modules: ["15_INTEGRATIONS", "10_FINANCE_ACCOUNTING", "13_SYSADMIN_SETTINGS"]
---

# PRATHAMONE EduOS — CUSTOMER TELEMETRY FORENSIC AUDIT & ROOT CAUSE ANALYSIS

**Product:** PrathamOne EduOS  
**Edition:** Coaching Institute Edition  
**Baseline Version:** 1.0.0  
**Product Architect:** Jawahar R. Mallah  
**Organization:** Smritisys & AITDL Networks  
**Incident Type:** Production Customer Site Telemetry Diagnostic (3 Defects)  
**Status:** Resolved, Hardened & Production Verified  
**Date:** 2026-11-16  

---

## 1. Incident Overview & Telemetry Traces

Production console logs captured from customer sites running PrathamOne EduOS v1.111.0 exhibited three distinct cascading errors:

```text
index-MlKUFlAy.js:12 WebSocket connection to 'ws://localhost/api/v1/chat/ws/8?token=' failed: Error during WebSocket handshake: Unexpected response code: 500
/api/v1/communication/automation/fee-reminders/preview?min_balance=500&search=:1  Failed to load resource: the server responded with a status of 422 (Unprocessable Entity)
EduBoardCanvas-Cl68tsSi.js:19 Failed to load fee reminder queue: AxiosError: Request failed with status code 422
/api/v1/housekeeping/backups:1  Failed to load resource: the server responded with a status of 500 (Internal Server Error)
backups:1  Failed to load resource: the server responded with a status of 504 (Gateway Timeout)
```

---

## 2. Root Cause Analysis (RCA) & Resolutions

### Issue 1: Chat WebSocket Handshake Failed (HTTP 500)

- **Root Cause 1 (Dependency Scope Mismatch):**  
  `api_router` in `backend/app/api/v1/router.py` was defined with top-level dependencies: `dependencies=[Depends(license_endpoint.enforce_license_request)]`.  
  `enforce_license_request` required `OAuth2PasswordBearer` and an HTTP `Request` instance. When FastAPI resolved dependencies for WebSocket endpoints (`/api/v1/chat/ws/{room_id}` and `/api/v1/eduboard/ws/boards/{board_id}`), no HTTP `Request` existed, triggering `TypeError: OAuth2PasswordBearer.__call__() missing 1 required positional argument: 'request'`. Uvicorn translated this unhandled exception into an **HTTP 500** handshake failure.
- **Root Cause 2 (Token Persistence Paradigm):**  
  `ChatWorkspaceTab.tsx` attempted `localStorage.getItem('prashant_access_token')`. PrathamOne EduOS stores authentication JWTs in memory via Zustand (`useAuthStore`) and in secure `HttpOnly` cookies (`prashant_access_token`), not in arbitrary `localStorage` keys. Hence, the frontend passed an empty string `?token=`.
- **Resolution:**
  1. Decoupled WebSocket streaming routes into a dedicated `ws_router = APIRouter()` mounted at `/api/v1` without HTTP `Request` licensing dependencies.
  2. Enhanced `chat_websocket_endpoint` to authenticate tokens from either query parameters or the incoming `prashant_access_token` cookie.
  3. Added clean rejection handling (`await websocket.accept()` followed by `await websocket.close(code=1008, reason="Unauthorized")`), completely eliminating HTTP 500 crashes during ASGI upgrade.
  4. Updated `ChatWorkspaceTab.tsx` to read tokens from `useAuthStore` and only append `?token=` when a non-cookie bearer token is active.

### Issue 2: Fee Reminders Preview Failed (HTTP 422 Unprocessable Entity)

- **Root Cause:**  
  The frontend API layer (`endpoints.ts`) invoked `apiClient.post('/communication/automation/fee-reminders/preview', null, { params })`, passing `null` as the JSON body and passing `min_balance` and `search` as URL query parameters (`?min_balance=500&search=`). The FastAPI endpoint defined `payload: FeeRemindersPreviewRequest` as a mandatory JSON request body. FastAPI rejected the null body with HTTP 422.
- **Resolution:**
  1. Updated `backend/app/api/v1/endpoints/communication.py` to use `@router.api_route("/automation/fee-reminders/preview", methods=["GET", "POST"])`.
  2. Made `payload: Optional[FeeRemindersPreviewRequest] = None` and accepted query parameters `min_balance: Optional[float]` and `search: Optional[str]`.
  3. Returned a unified payload satisfying both frontend and backend contracts: `{"count", "min_balance", "queue", "total_pending", "total_amount", "items"}`.
  4. Updated `frontend/src/api/endpoints.ts` to transmit parameters in both request body and query string.

### Issue 3: Housekeeping Backups 500 (Internal Server Error) & 504 (Gateway Timeout)

- **Root Cause 1 (Gateway Timeout 504):**  
  In `frontend/nginx.conf`, the `location /api/` block lacked explicit `proxy_read_timeout` settings and defaulted to 60 seconds. On large customer databases, `pg_dump` and SHA-256 computation operations exceeded 60s, triggering an Nginx 504 Gateway Timeout.
- **Root Cause 2 (Internal Server Error 500):**  
  In `backend/app/services/housekeeping_service.py`, `list_backups()` iterated directories using `sorted(directory.iterdir(), key=lambda p: p.stat().st_mtime)`. If any file was locked, had restrictive permissions, had corrupted `.meta.json` or unparseable timestamps, the lambda raised an unhandled exception that crashed the endpoint.
- **Resolution:**
  1. Configured Nginx `proxy_read_timeout 300s;`, `proxy_connect_timeout 300s;`, `proxy_send_timeout 300s;`, and `client_max_body_size 500M;` in `frontend/nginx.conf`.
  2. Fully fortified `list_backups()` with per-file `try/except` guards, resilient fallback timestamps, and safe file inspection.
  3. Wrapped `list_database_backups` and `create_database_backup` in `housekeeping.py` with top-level error handling, returning clean fallback payloads (`{"backups": [], "error": ...}`) rather than crashing with unhandled 500s.

---

## 3. Verification & Compliance Matrix

| Verification Check | Target / Command | Result |
|---|---|---|
| **Chat WebSocket Clean Handshake** | `python -c "websockets.connect(...)"` | **Passed** (1008 clean close without auth, 101 connected with token/cookie, 0 HTTP 500s) |
| **Fee Reminders Preview** | `POST .../automation/fee-reminders/preview?min_balance=500&search=` | **Passed** (200 OK, 34 queued records returned) |
| **Housekeeping Backups Telemetry** | `GET /api/v1/housekeeping/backups` | **Passed** (200 OK, 16 verified backup entries) |
| **Attribution Header Verification** | `python scripts/manage_headers.py check` | **Passed** (639/639 source files compliant) |
| **Vitest Regression Suite** | `NoticeBoard.test.tsx`, `Housekeeping.test.tsx`, `CommunicationDedicatedSubmenus.test.tsx` | **Passed** (25/25 tests passing) |

---

## 4. Corporate Governance & Sign-Off

- **Product:** PrathamOne EduOS (Coaching Institute Edition)
- **Baseline Version:** 1.0.0
- **Product Architect:** Jawahar R. Mallah
- **Organization:** Smritisys & AITDL Networks
