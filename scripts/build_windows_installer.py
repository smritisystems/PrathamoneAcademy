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
#  * @updated     2026-11-27
#  *
#  * @description Automated build pipeline: compiles React frontend, stages embedded runtimes,
#  */

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request
import zipfile
from pathlib import Path

# Ensure repo root and backend are in python path
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
backend_dir = REPO_ROOT / "backend"
if backend_dir.is_dir() and str(backend_dir) not in sys.path:
    sys.path.insert(1, str(backend_dir))

from scripts.prepare_installer_artwork import generate_installer_assets


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


def prune_non_essential_distribution_assets(dist_dir: Path):
    """
    Excludes all non-essential files (promotional videos, raw artwork drafts,
    studio recordings, inspection keyframes, and zip archives) from production dist.
    Ensures only components actively required by the software runtime are packaged.
    """
    print("\n[OPTIMIZE] Pruning non-essential media, videos, and raw artwork from dist...")
    removals = [
        dist_dir / "media" / "commercial",
        dist_dir / "media" / "studio",
        dist_dir / "media" / "motion",
        dist_dir / "Final_Selected",
        dist_dir / "New folder (2)",
    ]
    for r in removals:
        if r.exists():
            if r.is_dir():
                shutil.rmtree(r)
            else:
                r.unlink()

    # Remove non-essential artwork draft directories (keep only CSM, 16112026, 18112026, 25112026 SVGs)
    artwork = dist_dir / "artwork"
    if artwork.exists():
        for item in list(artwork.iterdir()):
            if item.is_dir() and item.name not in ("CSM", "16112026", "18112026", "25112026"):
                shutil.rmtree(item)
            elif item.is_file() and (item.suffix in (".png", ".mp4", ".zip", ".tar.gz") or item.stat().st_size > 500_000):
                item.unlink()
        for sub_name in ("18112026", "25112026"):
            sub_dir = artwork / sub_name
            if sub_dir.is_dir():
                for asset_file in list(sub_dir.rglob("*")):
                    if asset_file.is_file() and asset_file.suffix.lower() in (".png", ".jpg", ".jpeg", ".gif"):
                        asset_file.unlink()

    # Remove extra video formats and master brand logos from dist root
    for ext in ("*.mp4", "*.mov", "*.avi", "*.wmv", "*.zip", "*.tar.gz", "Prathamone Master Logo*.png"):
        for vf in list(dist_dir.glob(f"**/{ext}")):
            if vf.exists():
                vf.unlink()

    total_mb = sum(f.stat().st_size for f in dist_dir.glob("**/*") if f.is_file()) / (1024 * 1024)
    print(f"[OPTIMIZE SUCCESS] Production distribution trimmed to: {total_mb:.2f} MB (Lean & Fast)")


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

    prune_non_essential_distribution_assets(dist_dir)
    print(f"[BUILD SUCCESS] Clean frontend compiled into: {dist_dir}")


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


def compile_critical_modules_native(backend_dest: Path):
    """
    Compiles hardware.py and license_service.py into native Windows machine code (.pyd)
    using Nuitka and MinGW64 gcc to prevent reverse engineering, AST patching, and bytecode decompilation.
    """
    critical_files = [
        backend_dest / "app" / "core" / "hardware.py",
        backend_dest / "app" / "services" / "license_service.py",
    ]

    nuitka_available = False
    try:
        import nuitka
        nuitka_available = True
    except ImportError:
        pass

    for py_file in critical_files:
        if not py_file.exists():
            continue
        compiled_native = False
        if nuitka_available:
            print(f"  [NATIVE COMPILATION] Compiling {py_file.name} to native .pyd via Nuitka...")
            try:
                out_dir = py_file.parent
                res = subprocess.run([
                    sys.executable,
                    "-m",
                    "nuitka",
                    "--module",
                    "--assume-yes-for-downloads",
                    f"--output-dir={out_dir}",
                    str(py_file),
                ], capture_output=True, text=True, timeout=180)

                stem = py_file.stem
                pyd_files = list(out_dir.glob(f"{stem}*.pyd"))
                if res.returncode == 0 and pyd_files:
                    # Clean up build directory and type stubs
                    build_dir = out_dir / f"{stem}.build"
                    if build_dir.exists():
                        shutil.rmtree(build_dir, ignore_errors=True)
                    pyi_file = out_dir / f"{stem}.pyi"
                    if pyi_file.exists():
                        pyi_file.unlink(missing_ok=True)
                    # Remove original plaintext .py
                    py_file.unlink()
                    compiled_native = True
                    print(f"  [NATIVE SUCCESS] {py_file.name} -> {pyd_files[0].name} (C Machine Code)")
                else:
                    print(f"  [NATIVE WARN] Nuitka note: {res.stderr[:200]}")
            except Exception as e:
                print(f"  [NATIVE WARN] Nuitka invocation exception: {e}")

        if not compiled_native:
            print(f"  [HARDENING] Using optimized bytecode compilation for {py_file.name}")


def stage_hardened_backend(root_dir: Path, staging_dir: Path):
    """
    Stage backend application into build_staging/backend:
    1. Copies backend source excluding tests, caches, markdown docs, uploads, backups.
    2. Compiles critical security modules (hardware.py, license_service.py) into native Windows .pyd.
    3. Performs Full-Tree Bytecode Compilation across all remaining backend/app/ modules:
       - Compiles every .py to optimized .pyc (optimize=2: strips docstrings & asserts).
       - Purges every plaintext .py file in backend/app/. Zero plaintext code remains.
    4. Bytecode-compiles seed.py -> seed.pyc and removes seed.py.
    5. Computes a local SHA-256 integrity manifest for bytecode and native modules.
    """
    import hashlib
    import json
    import py_compile
    backend_src = root_dir / "backend"
    backend_dest = staging_dir / "backend"
    print("\n[BUILD 3.5/4] Staging hardened full-tree bytecode backend (zero plaintext .py)...")
    if backend_dest.exists():
        shutil.rmtree(backend_dest)

    def ignore_patterns(path, names):
        ignored = set()
        for name in names:
            if name in {"tests", "__pycache__", ".pytest_cache", "venv", ".venv", "backups", "uploads"}:
                ignored.add(name)
            elif name.endswith((".pyc", ".md", ".png")):
                ignored.add(name)
        return ignored

    shutil.copytree(backend_src, backend_dest, ignore=ignore_patterns)

    # 1. Compile critical security modules to native machine code (.pyd)
    compile_critical_modules_native(backend_dest)

    # 2. Full-Tree Bytecode Compilation for all remaining backend/app/ files
    app_dir = backend_dest / "app"
    compiled_count = 0
    integrity_manifest = {}
    salt = b"PRATHAMONE_EDUOS_INTEGRITY_SALT_2026"

    for root_str, _, files in os.walk(app_dir):
        root_path = Path(root_str)
        for file_name in files:
            if file_name.endswith(".pyd"):
                dest_pyd = root_path / file_name
                rel_path = str(dest_pyd.relative_to(backend_dest)).replace("\\", "/")
                file_bytes = dest_pyd.read_bytes()
                h = hashlib.sha256(file_bytes + salt).hexdigest()
                integrity_manifest[rel_path] = h
            elif file_name.endswith(".py"):
                src_py = root_path / file_name
                dest_pyc = root_path / (file_name + "c")
                py_compile.compile(str(src_py), str(dest_pyc), optimize=2, doraise=True)
                src_py.unlink()
                compiled_count += 1

                # Record SHA-256 integrity hash
                rel_path = str(dest_pyc.relative_to(backend_dest)).replace("\\", "/")
                file_bytes = dest_pyc.read_bytes()
                h = hashlib.sha256(file_bytes + salt).hexdigest()
                integrity_manifest[rel_path] = h

    # 3. Also compile seed.py
    seed_file = backend_dest / "seed.py"
    if seed_file.exists():
        dest_pyc = backend_dest / "seed.pyc"
        py_compile.compile(str(seed_file), str(dest_pyc), optimize=2, doraise=True)
        seed_file.unlink()
        compiled_count += 1
        rel_path = "seed.pyc"
        integrity_manifest[rel_path] = hashlib.sha256(dest_pyc.read_bytes() + salt).hexdigest()

    # 4. Write code integrity manifest
    manifest_file = backend_dest / "app" / ".code_integrity.manifest"
    manifest_file.write_text(json.dumps(integrity_manifest, indent=2), encoding="utf-8")

    print(f"  [HARDENED] Bytecode-compiled {compiled_count} Python modules into native .pyc")
    print(f"  [HARDENED] 100% of plaintext .py source files deleted from backend/app/")
    print(f"  [HARDENED] Cryptographic SHA-256 integrity manifest written to {manifest_file.name}")
    print(f"[BUILD SUCCESS] Staged hardened backend at: {backend_dest}")


def get_current_version(root_dir: Path) -> str:
    """Retrieve authoritative version from package.json or auto_version.py."""
    pkg_file = root_dir / "package.json"
    if pkg_file.exists():
        try:
            data = json.loads(pkg_file.read_text(encoding="utf-8"))
            v = data.get("version", "").strip()
            if v:
                return v
        except Exception:
            pass
    return "1.0.0"


def get_file_version_quad(ver_str: str) -> str:
    """Format semantic version into strict 4-component Windows PE version (e.g. 1.147.0.0)."""
    import re
    parts = re.findall(r"\d+", ver_str.split("-")[0])
    while len(parts) < 4:
        parts.append("0")
    return ".".join(parts[:4])


def compile_inno_setup(root_dir: Path, iscc_path: Path, version: str | None = None):
    """Invoke Inno Setup compiler on prathamone_setup.iss with dynamic version and retry for transient Windows file-lock."""
    if not version:
        version = get_current_version(root_dir)
    file_version = get_file_version_quad(version)

    print(f"\n[BUILD 4/4] Compiling Windows Installer executable for v{version} (PE: {file_version}) via Inno Setup...")
    iss_file = root_dir / "installer" / "prathamone_setup.iss"
    dist_dir = root_dir / "dist"
    dist_dir.mkdir(parents=True, exist_ok=True)

    cmd = [
        str(iscc_path),
        f"/DMyAppVersion={version}",
        f"/DMyAppFileVersion={file_version}",
        str(iss_file),
    ]

    max_retries = 3
    for attempt in range(1, max_retries + 1):
        for partial in dist_dir.glob("*.tmp"):
            try:
                partial.unlink()
            except Exception:
                pass

        res = subprocess.run(cmd, cwd=str(root_dir / "installer"), capture_output=True, text=True)
        if res.returncode == 0:
            break
        elif "EndUpdateResource failed" in res.stderr and attempt < max_retries:
            print(f"[RETRY {attempt}/{max_retries}] Transient antivirus scanner lock detected. Waiting 3s before retry...")
            time.sleep(3)
        else:
            print(f"[BUILD ERROR] Inno Setup compilation failed:\n{res.stderr}\n{res.stdout}")
            raise RuntimeError("Inno Setup compilation failed.")

    output_exe = f"PrathamOne-EduOS-Setup-v{version}.exe"
    print(f"\n======================================================================")
    print(f"  PRATHAMONE EduOS — WINDOWS INSTALLER CREATED SUCCESSFULLY!          ")
    print(f"======================================================================")
    print(f"  Installer Package: {dist_dir}")
    print(f"  Output Executable: {output_exe}")
    print(f"  Run {output_exe} on any Windows 10/11 computer.")
    print(f"======================================================================\n")


def main():
    parser = argparse.ArgumentParser(description="PrathamOne EduOS Windows Installer Build Pipeline")
    parser.add_argument("--skip-frontend", action="store_true", help="Skip npm frontend compilation")
    parser.add_argument("--download-pgsql", action="store_true", help="Automatically download PostgreSQL 16 binaries")
    parser.add_argument("--installer-version", "--version", dest="installer_version", help="Explicit version override for the installer")
    args = parser.parse_args()

    root_dir = Path(__file__).resolve().parent.parent
    staging_dir = root_dir / "build_staging"

    try:
        if not args.skip_frontend:
            build_frontend(root_dir)

        stage_embedded_pgsql(staging_dir, download_if_missing=args.download_pgsql)
        stage_embedded_python(staging_dir)
        stage_hardened_backend(root_dir, staging_dir)

        # Generate fresh local PKI Root CA and SSL server certificates
        from scripts.generate_ssl_certificates import generate_local_pki
        generate_local_pki(root_dir / "installer" / "assets")

        iscc = find_iscc()
        if not iscc:
            print("\n[NOTICE] Inno Setup Compiler (ISCC.exe) not found on this system.")
            print("To compile the installer, install Inno Setup 6:")
            print("  winget install JRSoftware.InnoSetup")
            print(f"Then re-run this script, or open: {root_dir / 'installer' / 'prathamone_setup.iss'}")
            return

        # Enforce Pre-Release Hygiene Audit
        from scripts.check_release_hygiene import run_audit
        is_clean = run_audit(fix=True)
        if not is_clean:
            raise RuntimeError("Pre-release hygiene audit failed. Staged payload contains forbidden or bloated files.")

        version = args.installer_version or get_current_version(root_dir)
        compile_inno_setup(root_dir, iscc, version=version)

    except Exception as exc:
        print(f"\n[FATAL BUILD ERROR] {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
