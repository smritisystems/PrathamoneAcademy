FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for psycopg / build tools & PostgreSQL client tools (pg_dump, pg_restore, psql)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN groupadd -r appuser \
    && useradd -r -g appuser -m -d /home/appuser appuser \
    && mkdir -p /app/backups /app/data/backups /app/uploads \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

