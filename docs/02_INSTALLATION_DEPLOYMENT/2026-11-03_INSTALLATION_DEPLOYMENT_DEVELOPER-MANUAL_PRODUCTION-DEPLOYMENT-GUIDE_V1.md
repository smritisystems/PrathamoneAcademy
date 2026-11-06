---
title: "Production Deployment Guide"
module: "02_INSTALLATION_DEPLOYMENT"
category: "DEVELOPER-MANUAL"
document_type: "DEVELOPER-MANUAL"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-03"
updated_date: "2026-11-03"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["02-installation-deployment", "developer-manual"]
entities: []
api_routes: ["/health"]
related_modules: []
---

# Production Deployment Guide

**Containerization**: Docker & Docker Compose  
**Web Server**: Nginx Alpine Reverse Proxy  
**Process Manager**: Uvicorn ASGI  

---

## 1. Automated Docker Compose Deployment

The fastest and most reliable deployment method is Docker Compose:

```bash
# 1. Clone repository to deployment server
git clone <repo-url> /opt/prashant-academy
cd /opt/prashant-academy

# 2. Configure production environment
cp .env.example .env
nano .env  # Update SECRET_KEY, POSTGRES_PASSWORD, etc.

# 3. Build images and start containers in daemon mode
docker compose up -d --build

# 4. Verify running services
docker compose ps
docker compose logs -f backend
```

---

## 2. Production Security Hardening

1. **SECRET_KEY**:
   Generate a high-entropy 64-character secret key:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```
2. **CORS Origins**:
   Restrict `ALLOWED_ORIGINS` to the exact institutional domain:
   ```env
   ALLOWED_ORIGINS=https://app.prashantacademy.edu.in
   ```
3. **SSL / TLS Termination**:
   Place an SSL certificate (Let's Encrypt / Cloudflare) in front of the Nginx container, or map ports `443:443` with mounted certificates in `frontend/nginx.conf`.
4. **PostgreSQL Credentials**:
   Never use default `postgres/postgres` passwords in public or production environments.

