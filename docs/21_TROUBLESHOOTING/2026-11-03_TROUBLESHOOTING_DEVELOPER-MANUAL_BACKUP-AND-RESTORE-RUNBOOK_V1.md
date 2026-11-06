---
title: "Backup and Disaster Recovery Runbook"
module: "21_TROUBLESHOOTING"
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
tags: ["21-troubleshooting", "developer-manual"]
entities: []
api_routes: []
related_modules: []
---

# Backup and Disaster Recovery Runbook

**Database**: PostgreSQL 16  
**Backup Type**: Logical Archive (`pg_dump` custom format)  

---

## 1. Creating Database Backups

### Inside Docker Container:
```bash
docker exec -t prashant_academy_db pg_dump -U postgres -Fc prashant_academy > pa_backup_$(date +%Y%m%d_%H%M%S).dump
```

### Direct PostgreSQL Host:
```bash
pg_dump -h localhost -p 5432 -U postgres -Fc -d prashant_academy -f /backups/prashant_academy_$(date +%Y%m%d).dump
```

---

## 2. Restoring Database from Backup

### Step 1: Terminate active connections to the database
```sql
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'prashant_academy' AND pid <> pg_backend_pid();
```

### Step 2: Drop and recreate database
```sql
DROP DATABASE prashant_academy;
CREATE DATABASE prashant_academy OWNER postgres;
```

### Step 3: Restore using pg_restore
```bash
pg_restore -h localhost -p 5432 -U postgres -d prashant_academy -v /backups/prashant_academy_YYYYMMDD.dump
```

---

## 3. Scheduled Nightly Cron Backup

Add the following to root crontab on the database host:

```bash
0 2 * * * docker exec -t prashant_academy_db pg_dump -U postgres -Fc prashant_academy | gzip > /opt/backups/pa_$(date +\%F).dump.gz && find /opt/backups -type f -mtime +30 -delete
```

