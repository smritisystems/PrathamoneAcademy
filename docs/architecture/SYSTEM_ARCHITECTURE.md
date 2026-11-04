# System Architecture Document

**System**: Prashant Academy Coaching Institute Management System  
**Architecture Style**: Decoupled Client-Server (REST API + SPA)  
**Security Profile**: JWT (OAuth2 Password Flow) with Role-Based Access Control  

---

## 1. High-Level Component Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                      Client Tier (Browser)                      │
│                                                                 │
│  React 18 + TypeScript + Vite + Tailwind CSS + TanStack Query   │
│  Zustand Auth Store (persisted token, institution, AY)         │
└────────────────────────────────┬────────────────────────────────┘
                                 │ HTTP / JSON (Axios + JWT)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              Reverse Proxy & Static Web Server Tier              │
│                                                                 │
│  Nginx 1.25 Alpine: SSL termination, SPA rewrite, /api proxy    │
└────────────────────────────────┬────────────────────────────────┘
                                 │ Reverse Proxy pass
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Application Backend Tier                     │
│                                                                 │
│  FastAPI (Python 3.11): ASGI Async Event Loop                   │
│  - Routers: Auth, Students, Fees, Payments, Attendance, Reports │
│  - Middleware: CORS, Request Profiling, Error Handling          │
│  - Pydantic v2: Strong Schema Validation & Serialization        │
│  - Security: JWT HS256, bcrypt password hashing                │
└────────────────────────────────┬────────────────────────────────┘
                                 │ Async SQL Engine (asyncpg)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Persistence Tier                      │
│                                                                 │
│  PostgreSQL 16 Engine                                           │
│  - 25 Normalized Tables with Foreign Keys & Decimal Precision   │
│  - Transactional Isolation (ACID) for Financial Ledger          │
│  - Alembic Async Migrations (`alembic upgrade head`)            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Security Architecture

1. **Authentication**:
   - Clients send `POST /api/v1/auth/login` with `username` and `password`.
   - Backend validates against `users.hashed_password` using `bcrypt.checkpw()`.
   - On success, generates an access token with claims `{"sub": user.username, "id": user.id, "role": user.role, "exp": ...}`.
2. **Authorization**:
   - Dependency `get_current_active_user` extracts and verifies JWT from the `Authorization: Bearer <token>` header.
   - `require_role(["admin", "superadmin", "accountant"])` ensures only authorized personnel access sensitive operations like payment reversal.
3. **Data Protection**:
   - Passwords and confidential credentials are never logged or exported.
   - Database operations use parameterized queries through SQLAlchemy ORM, eliminating SQL injection.

---

## 3. Concurrency & Transaction Management

Financial operations enforce strict ACID guarantees:
- Payment recording locks the target `FeeInvoice` row via `SELECT ... FOR UPDATE` before applying allocations.
- Balance reductions and status updates occur within a single database transaction block. If any step fails, the entire transaction is rolled back, guaranteeing zero partial writes.

