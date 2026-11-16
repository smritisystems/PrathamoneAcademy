# /**
#  * @file        download_pgsql.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts.download_pgsql
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-15
#  * @updated     2026-11-16
#  *
#  * @description Downloads and extracts official PostgreSQL 16 portable Windows x64 binaries
#  */

import os
import shutil
import urllib.request
import zipfile
from pathlib import Path

PG_URL = "https://get.enterprisedb.com/postgresql/postgresql-16.1-1-windows-x64-binaries.zip"


def download_and_extract_pgsql():
    root_dir = Path(__file__).resolve().parent.parent
    staging_dir = root_dir / "build_staging"
    staging_dir.mkdir(parents=True, exist_ok=True)
    pgsql_dest = staging_dir / "pgsql"

    if (pgsql_dest / "bin" / "initdb.exe").exists():
        print(f"[PGSQL] Binaries already staged at: {pgsql_dest / 'bin' / 'initdb.exe'}")
        return

    zip_path = staging_dir / "pgsql_16.zip"
    print(f"[PGSQL] Downloading PostgreSQL 16 binaries (~330 MB) from:\n  {PG_URL}...")

    def progress_callback(block_num, block_size, total_size):
        downloaded = block_num * block_size
        pct = (downloaded / total_size) * 100 if total_size > 0 else 0
        mb = downloaded / (1024 * 1024)
        total_mb = total_size / (1024 * 1024)
        if block_num % 1000 == 0 or downloaded >= total_size:
            print(f"[PGSQL] Downloaded {mb:.1f} MB / {total_mb:.1f} MB ({pct:.1f}%)...")

    req = urllib.request.Request(PG_URL, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    with urllib.request.urlopen(req) as response, open(zip_path, "wb") as out_file:
        shutil.copyfileobj(response, out_file)

    print("[PGSQL] Download complete. Extracting archive...")
    with zipfile.ZipFile(zip_path, "r") as z:
        # Extract files that start with pgsql/
        for member in z.infolist():
            if member.filename.startswith("pgsql/"):
                z.extract(member, staging_dir)

    if zip_path.exists():
        zip_path.unlink()

    if (pgsql_dest / "bin" / "initdb.exe").exists():
        print("[PGSQL SUCCESS] Embedded PostgreSQL 16 extracted successfully!")
        print(f"  initdb: {pgsql_dest / 'bin' / 'initdb.exe'}")
        print(f"  pg_ctl: {pgsql_dest / 'bin' / 'pg_ctl.exe'}")
    else:
        print("[PGSQL WARN] Extraction finished but initdb.exe not found at expected path.")


if __name__ == "__main__":
    download_and_extract_pgsql()
