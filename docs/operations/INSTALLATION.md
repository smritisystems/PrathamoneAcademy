# Installation and Local Development Guide

**Target Environment**: Windows, macOS, or Linux  
**Prerequisites**: Python 3.11+, Node.js 20+, PostgreSQL 16  

---

## 1. System Dependencies Setup

### Windows
- Install Python 3.11 from python.org (Ensure "Add python.exe to PATH" is checked).
- Install Node.js 20+ LTS from nodejs.org.
- Install PostgreSQL 16 (or run PostgreSQL via Docker).

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3-pip nodejs npm postgresql postgresql-contrib libpq-dev
```

---

## 2. Backend Installation

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Edit ../.env or set DATABASE_URL
set DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/prashant_academy

# Run database migrations
alembic upgrade head

# Seed initial demonstration data
python seed.py

# Start development server
uvicorn app.main:app --reload --port 8000
```

Backend will be accessible at:
- API Base: `http://localhost:8000/api/v1`
- Swagger Documentation: `http://localhost:8000/docs`
- ReDoc Documentation: `http://localhost:8000/redoc`

---

## 3. Frontend Installation

```bash
cd frontend

# Install dependencies
npm install

# Run Vite development server
npm run dev
```

Frontend application will be accessible at `http://localhost:5173`.

