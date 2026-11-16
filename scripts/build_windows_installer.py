# /**
#  * @file        build_windows_installer.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts.build_windows_installer
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-15
#  * @updated     2026-11-16
#  *
#  * @description Automated build pipeline: compiles React frontend, stages embedded runtimes,
#  */

import argparse
import os
import shutil
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path


def find_iscc() -> Path | None:
    """Locate Inno Setup Compiler (ISCC.exe) across standard Windows paths."""
    candidates = [
        shutil.which("iscc"),
        shutil.which("ISCC.exe"),
        Path(os.environ.get("ProgramFiles(x86)", "C:/Program Files (x86)")) / "Inno Setup 6" / "ISCC.exe",
        Path(os.environ.get("ProgramFiles", "C:/Program Files")) / "Inno Setup 6" / "ISCC.exe",
        Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "Inno Setup 6" / "ISCC.exe",
    ]
    for c in candidates:
        if c and Path(c).is_file():
            return Path(c)
    return None


def build_frontend(root_dir: Path):
    """Build production React Vite frontend."""
    frontend_dir = root_dir / "frontend"
    print("\n[BUILD 1/4] Building production React frontend via Vite...")

    npm_cmd = shutil.which("npm.cmd") or shutil.which("npm")
    if not npm_cmd:
        raise RuntimeError("npm is required on PATH to build the frontend.")

    dist_dir = frontend_dir / "dist"
    if not (frontend_dir / "node_modules").exists():
        print("[BUILD] Running 'npm install' in frontend directory...")
        subprocess.run([npm_cmd, "install"], cwd=str(frontend_dir), check=True)

    subprocess.run([npm_cmd, "run", "build"], cwd=str(frontend_dir), check=True)

    if not (dist_dir / "index.html").exists():
        raise RuntimeError(f"Frontend build failed to produce {dist_dir / 'index.html'}")
    print(f"[BUILD SUCCESS] Frontend compiled into: {dist_dir}")


def stage_embedded_pgsql(staging_dir: Path, download_if_missing: bool = False):
    """Ensure PostgreSQL 16 portable binaries are staged."""
    pgsql_dest = staging_dir / "pgsql"
    if (pgsql_dest / "bin" / "initdb.exe").exists():
        print(f"[BUILD 2/4] Embedded PostgreSQL binaries already staged at: {pgsql_dest}")
        return

    print("\n[BUILD 2/4] Staging PostgreSQL 16 embedded binaries...")
    pgsql_dest.mkdir(parents=True, exist_ok=True)

    # Check if user has local PostgreSQL installed to copy or if download is requested
    pg_local = Path("C:/Program Files/PostgreSQL/16")
    if pg_local.exists() and (pg_local / "bin" / "initdb.exe").exists():
        print(f"[BUILD] Found local PostgreSQL 16 at {pg_local}. Copying runtime binaries...")
        for sub in ["bin", "lib", "share"]:
            if (pg_local / sub).exists():
                shutil.copytree(pg_local / sub, pgsql_dest / sub, dirs_exist_ok=True)
        print("[BUILD SUCCESS] Staged PostgreSQL from local installation.")
        return

    if download_if_missing:
        print("[BUILD] Downloading official PostgreSQL 16 Windows x64 portable binaries...")
        # Official EnterpriseDB portable binaries zip
        url = "https://get.enterprisedb.com/postgresql/postgresql-16.1-1-windows-x64-binaries.zip"
        zip_path = staging_dir / "pgsql.zip"
        urllib.request.urlretrieve(url, zip_path)
        print("[BUILD] Extracting PostgreSQL archive...")
        with zipfile.ZipFile(zip_path, "r") as z:
            z.extractall(staging_dir)
        zip_path.unlink()
        print("[BUILD SUCCESS] Downloaded and staged PostgreSQL portable binaries.")
    else:
        print("[BUILD NOTICE] To bundle portable PostgreSQL, place 'bin', 'lib', 'share' in:")
        print(f"               {pgsql_dest}")
        print("               (Or rerun with --download-pgsql to fetch automatically).")


def stage_embedded_python(staging_dir: Path):
    """Stage embedded Python runtime environment."""
    python_dest = staging_dir / "python"
    print("\n[BUILD 3/4] Staging Python runtime environment...")
    python_dest.mkdir(parents=True, exist_ok=True)

    current_py = Path(sys.executable).parent
    # Copy essential binaries
    for file in current_py.glob("*.dll"):
        shutil.copy2(file, python_dest / file.name)
    for exe in ["python.exe", "pythonw.exe"]:
        src = current_py / exe
        if src.exists():
            shutil.copy2(src, python_dest / exe)

    print(f"[BUILD SUCCESS] Python base runtime staged at: {python_dest}")


def compile_inno_setup(root_dir: Path, iscc_path: Path):
    """Invoke Inno Setup compiler on prathamone_setup.iss."""
    print("\n[BUILD 4/4] Compiling Windows Installer executable via Inno Setup...")
    iss_file = root_dir / "installer" / "prathamone_setup.iss"
    dist_dir = root_dir / "dist"
    dist_dir.mkdir(parents=True, exist_ok=True)

    cmd = [str(iscc_path), str(iss_file)]
    res = subprocess.run(cmd, cwd=str(root_dir / "installer"), capture_output=True, text=True)

    if res.returncode != 0:
        print(f"[BUILD ERROR] Inno Setup compilation failed:\n{res.stderr}\n{res.stdout}")
        raise RuntimeError("Inno Setup compilation failed.")

    print(f"\n======================================================================")
    print(f"  PRATHAMONE EduOS — WINDOWS INSTALLER CREATED SUCCESSFULLY!          ")
    print(f"======================================================================")
    print(f"  Installer Package: {dist_dir}")
    print(f"  Run PrathamOne-EduOS-Setup-v1.0.0.exe on any Windows 10/11 computer.")
    print(f"======================================================================\n")


def main():
    parser = argparse.ArgumentParser(description="PrathamOne EduOS Windows Installer Build Pipeline")
    parser.add_argument("--skip-frontend", action="store_true", help="Skip npm frontend compilation")
    parser.add_argument("--download-pgsql", action="store_true", help="Automatically download PostgreSQL 16 binaries")
    args = parser.parse_args()

    root_dir = Path(__file__).resolve().parent.parent
    staging_dir = root_dir / "build_staging"

    try:
        if not args.skip_frontend:
            build_frontend(root_dir)

        stage_embedded_pgsql(staging_dir, download_if_missing=args.download_pgsql)
        stage_embedded_python(staging_dir)

        iscc = find_iscc()
        if not iscc:
            print("\n[NOTICE] Inno Setup Compiler (ISCC.exe) not found on this system.")
            print("To compile the installer, install Inno Setup 6:")
            print("  winget install JRSoftware.InnoSetup")
            print(f"Then re-run this script, or open: {root_dir / 'installer' / 'prathamone_setup.iss'}")
            return

        compile_inno_setup(root_dir, iscc)

    except Exception as exc:
        print(f"\n[FATAL BUILD ERROR] {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
