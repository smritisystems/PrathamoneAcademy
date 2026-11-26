#!/usr/bin/env python3
# /**
#  * @file        verify_market_readiness.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      installer.verify_market_readiness
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-26
#  * @updated     2026-11-27
#  *
#  * @description Dual-target release readiness verifier validating both --target hosted (API latency, zero 423 leaks, frontend build) and --target desktop (compiled .exe POST->GET parity, port 5433 DB isolation, Authenticode signatures) from unified VERSION.
#  */

import argparse
import json
import os
import re
import shutil
import socket
import ssl
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

INSTALLER_DIR = Path(__file__).resolve().parent
REPO_ROOT = INSTALLER_DIR.parent
BACKEND_DIR = REPO_ROOT / "backend"
FRONTEND_DIR = REPO_ROOT / "frontend"
RELEASE_PAYLOAD = REPO_ROOT / "build_staging" / "release_payload"
SETUP_EXE = REPO_ROOT / "dist" / "PrathamOne_EduOS_Setup.exe"


def _read_unified_version() -> dict[str, str]:
    pkg_ver = json.loads((REPO_ROOT / "package.json").read_text(encoding="utf-8")).get("version", "")
    cfg_txt = (BACKEND_DIR / "app" / "core" / "config.py").read_text(encoding="utf-8")
    m_cfg = re.search(r'VERSION:\s*str\s*=\s*"([^"]+)"', cfg_txt)
    cfg_ver = m_cfg.group(1) if m_cfg else ""
    iss_txt = (INSTALLER_DIR / "prathamone_setup.iss").read_text(encoding="utf-8")
    m_iss = re.search(r'#define\s+MyAppVersion\s+"([^"]+)"', iss_txt)
    iss_ver = m_iss.group(1) if m_iss else ""
    cs_launcher = (INSTALLER_DIR / "src" / "PrathamOneLauncher.cs").read_text(encoding="utf-8")
    m_cs = re.search(r'\[assembly:\s*AssemblyVersion\("([^"]+)"\)\]', cs_launcher)
    cs_ver = ".".join(m_cs.group(1).split(".")[:3]) if m_cs else ""
    cs_stop = (INSTALLER_DIR / "src" / "StopPrathamOne.cs").read_text(encoding="utf-8")
    m_stop = re.search(r'\[assembly:\s*AssemblyVersion\("([^"]+)"\)\]', cs_stop)
    stop_ver = ".".join(m_stop.group(1).split(".")[:3]) if m_stop else ""
    return {
        "package.json": pkg_ver,
        "config.py": cfg_ver,
        "prathamone_setup.iss": iss_ver,
        "PrathamOneLauncher.cs": cs_ver,
        "StopPrathamOne.cs": stop_ver,
    }


def _check_shared_governance() -> list[str]:
    failures: list[str] = []
    versions = _read_unified_version()
    uniq = set(versions.values())
    if len(uniq) != 1 or not next(iter(uniq)):
        failures.append(f"Unified VERSION parity failed: {versions}")
    else:
        print(f"  [PASS] VERSION-PARITY: Unified release version {next(iter(uniq))}")

    cfg_txt = (BACKEND_DIR / "app" / "core" / "config.py").read_text(encoding="utf-8")
    if "APP_RUNTIME_TARGET" not in cfg_txt or "detect_default_runtime_target" not in cfg_txt:
        failures.append("backend/app/core/config.py is missing APP_RUNTIME_TARGET auto-detection")
    else:
        print("  [PASS] RUNTIME-TARGET: APP_RUNTIME_TARGET unified flag present")

    main_txt = (BACKEND_DIR / "app" / "main.py").read_text(encoding="utf-8")
    if "no-store" not in main_txt:
        failures.append("backend/app/main.py is missing global Cache-Control: no-store middleware")
    else:
        print("  [PASS] CACHE-HEADERS: FastAPI /api/* no-store middleware active")

    lic_txt = (BACKEND_DIR / "app" / "api" / "v1" / "endpoints" / "license.py").read_text(encoding="utf-8")
    if "_is_license_exempt_telemetry_path" not in lic_txt or '"/api/v1/navigation"' not in lic_txt:
        failures.append("license.py missing /api/v1/navigation/* 423 exemption")
    else:
        print("  [PASS] TELEMETRY-423-EXEMPT: /api/v1/navigation/* whitelisted across targets")

    return failures


def verify_hosted(skip_frontend_build: bool = False) -> list[str]:
    print("\n======================================================================")
    print("  DUAL-TARGET MARKET READINESS AUDIT: HOSTED TARGET (--target hosted)")
    print("======================================================================")
    failures: list[str] = []

    if not skip_frontend_build:
        res_build = subprocess.run(["npm", "run", "build"], cwd=str(FRONTEND_DIR), shell=True)
        if res_build.returncode != 0:
            failures.append("Frontend production build (npm run build) failed")
            return failures
    dist_index = FRONTEND_DIR / "dist" / "index.html"
    if not dist_index.is_file():
        failures.append(f"Missing hosted frontend dist artifact: {dist_index}")
    else:
        print(f"  [PASS] HOSTED-FRONTEND: Verified {dist_index}")

    res_hyg = subprocess.run(
        [sys.executable, str(REPO_ROOT / "scripts" / "check_release_hygiene.py")],
        cwd=str(REPO_ROOT),
    )
    if res_hyg.returncode != 0:
        failures.append("check_release_hygiene.py failed")
    else:
        print("  [PASS] HOSTED-HYGIENE: check_release_hygiene.py passed")

    # Run Alembic single-head & hosted 423 / matrix latency pytest suite
    env = os.environ.copy()
    env.setdefault("APP_RUNTIME_TARGET", "hosted")
    res_pytest = subprocess.run(
        [
            sys.executable,
            "-m",
            "pytest",
            "tests/test_hosted_and_matrix_fixes.py",
            "tests/test_license_service.py",
            "tests/test_global_post_get_parity.py",
            "-q",
        ],
        cwd=str(BACKEND_DIR),
        env=env,
    )
    if res_pytest.returncode != 0:
        failures.append("Hosted pytest suite (423 exemptions, APP_RUNTIME_TARGET, <500ms matrix latency) failed")
    else:
        print("  [PASS] HOSTED-API-SUITE: Zero 423 leaks, <500ms /fees/matrix latency, & header parity passed")

    return failures


def verify_desktop(skip_compiled_runtime: bool = False) -> list[str]:
    print("\n======================================================================")
    print("  DUAL-TARGET MARKET READINESS AUDIT: DESKTOP TARGET (--target desktop)")
    print("======================================================================")
    failures: list[str] = []

    res_hdr = subprocess.run([sys.executable, str(REPO_ROOT / "scripts" / "manage_headers.py"), "check"], cwd=str(REPO_ROOT))
    if res_hdr.returncode != 0:
        failures.append("manage_headers.py check reported corporate header non-compliance")
    else:
        print("  [PASS] DESKTOP-HEADERS: manage_headers.py check 100% compliant")

    res_pol = subprocess.run([sys.executable, str(INSTALLER_DIR / "verify_release_policy.py"), "--strict"], cwd=str(REPO_ROOT))
    if res_pol.returncode != 0:
        failures.append("verify_release_policy.py --strict reported policy gaps")
    else:
        print("  [PASS] DESKTOP-POLICY: verify_release_policy.py --strict passed")

    binaries = [
        RELEASE_PAYLOAD / "PrathamOne.exe",
        RELEASE_PAYLOAD / "StopPrathamOne.exe",
        RELEASE_PAYLOAD / "backend" / "prathamone_backend.exe",
        SETUP_EXE,
    ]
    for bin_path in binaries:
        if not bin_path.is_file():
            failures.append(f"Missing desktop release binary: {bin_path}")
            continue
        ps_cmd = (
            f"$s = Get-AuthenticodeSignature -LiteralPath '{bin_path}'; "
            "if ($null -eq $s.SignerCertificate -or $null -eq $s.TimeStamperCertificate) { exit 2 }; "
            "Write-Output ($s.Status.ToString() + ':' + $s.SignerCertificate.Subject)"
        )
        sig_res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True, text=True)
        if sig_res.returncode != 0:
            failures.append(f"Authenticode signature/timestamp missing on {bin_path.name}")
        else:
            print(f"  [PASS] DESKTOP-SIGN ({bin_path.name}): {sig_res.stdout.strip()}")

    if skip_compiled_runtime:
        return failures

    backend_exe = RELEASE_PAYLOAD / "backend" / "prathamone_backend.exe"
    pgsql_bin = RELEASE_PAYLOAD / "pgsql" / "bin"
    if not backend_exe.is_file() or not (pgsql_bin / "psql.exe").is_file():
        failures.append("Compiled backend or staged pgsql missing for live port-5433 POST->GET test")
        return failures

    data_root = Path(tempfile.mkdtemp(prefix="pratham_market_5433_"))
    token = "market_readiness_desktop_token_2026"
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s_ephem:
        s_ephem.bind(("127.0.0.1", 0))
        backend_port = s_ephem.getsockname()[1]
    decoy_5432 = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    bound_5432 = False
    try:
        decoy_5432.bind(("127.0.0.1", 5432))
        decoy_5432.listen(1)
        bound_5432 = True
    except OSError:
        decoy_5432.close()

    (data_root / "setup_config.json").write_text(
        json.dumps(
            {
                "institute_name": "PrathamOne Desktop Verify",
                "branch_name": "Main Campus",
                "admin_password": "CompiledVerify@2026",
                "bootstrap_admin_secret": "CompiledVerify@2026",
            }
        ),
        encoding="utf-8",
    )
    env = os.environ.copy()
    env["PRATHAM_DATA_ROOT"] = str(data_root)
    env["PRATHAM_DESKTOP_TOKEN"] = token
    env["PRATHAM_ENV_FILE"] = str(data_root / ".env")
    env["DATABASE_URL"] = "postgresql+asyncpg://postgres:wrong@127.0.0.1:5999/stale_db"

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    proc = None
    out_log = open(data_root / "proc_stdout.log", "w", encoding="utf-8")
    err_log = open(data_root / "proc_stderr.log", "w", encoding="utf-8")
    try:
        proc = subprocess.Popen(
            [str(backend_exe), "--no-browser", "--host", "127.0.0.1", "--port", str(backend_port)],
            cwd=str(backend_exe.parent),
            env=env,
            stdout=out_log,
            stderr=err_log,
        )
        base_url = None
        deadline = time.time() + 120
        while time.time() < deadline:
            if proc.poll() is not None:
                out_log.flush()
                err_log.flush()
                err_tail = (data_root / "proc_stderr.log").read_text(encoding="utf-8", errors="ignore")[-1200:]
                srv_log = data_root / "logs" / "backend_server.log"
                srv_tail = srv_log.read_text(encoding="utf-8", errors="ignore")[-1200:] if srv_log.is_file() else ""
                pg_log = data_root / "data" / "pg_server.log"
                pg_tail = pg_log.read_text(encoding="utf-8", errors="ignore")[-800:] if pg_log.is_file() else ""
                raise RuntimeError(
                    f"prathamone_backend.exe exited prematurely ({proc.returncode})\n"
                    f"STDERR:\n{err_tail}\nSERVER_LOG:\n{srv_tail}\nPG_LOG:\n{pg_tail}"
                )
            for scheme in ("https", "http"):
                try:
                    req = urllib.request.Request(f"{scheme}://127.0.0.1:{backend_port}/health")
                    with urllib.request.urlopen(req, context=ssl_ctx, timeout=2.0) as resp:
                        if resp.status == 200:
                            base_url = f"{scheme}://127.0.0.1:{backend_port}"
                            break
                except Exception:
                    pass
            if base_url:
                break
            time.sleep(0.5)
        if not base_url:
            raise RuntimeError("Timed out waiting for compiled prathamone_backend.exe /health")

        env_text = (data_root / ".env").read_text(encoding="utf-8")
        m_pg = re.search(r"^POSTGRES_PORT=(\d+)\s*$", env_text, re.MULTILINE)
        isolated_pg_port = int(m_pg.group(1)) if m_pg else 0
        if isolated_pg_port < 5433 or f"127.0.0.1:{isolated_pg_port}/prashant_academy" not in env_text:
            raise RuntimeError(
                f"Compiled backend failed to isolate embedded PostgreSQL (>=5433) inside <dataRoot>/.env (got port={isolated_pg_port})"
            )
        print(f"  [PASS] DESKTOP-DB-ISOLATION: Isolated <dataRoot>/.env pinned to 127.0.0.1:{isolated_pg_port} (overrode stale 5999 & avoided 5432)")

        def api_call(method: str, path: str, body=None, jwt_token: str | None = None, form_data: dict | None = None):
            hdrs = {
                "x-pratham-client-token": token,
                "X-Data-Environment": "PRODUCTION",
            }
            if form_data is not None:
                hdrs["Content-Type"] = "application/x-www-form-urlencoded"
                payload_bytes = urllib.parse.urlencode(form_data).encode("utf-8")
            else:
                hdrs["Content-Type"] = "application/json"
                payload_bytes = json.dumps(body).encode("utf-8") if body is not None else None
            if jwt_token:
                hdrs["Authorization"] = f"Bearer {jwt_token}"
            req = urllib.request.Request(f"{base_url}{path}", data=payload_bytes, method=method, headers=hdrs)
            try:
                with urllib.request.urlopen(req, context=ssl_ctx, timeout=15.0) as resp:
                    raw = resp.read().decode("utf-8")
                    return resp.status, {k.lower(): v for k, v in resp.headers.items()}, json.loads(raw) if raw else None
            except urllib.error.HTTPError as err:
                err_body = err.read().decode("utf-8", errors="ignore")
                if err.code in (404, 503):
                    raise
                raise RuntimeError(f"HTTP {err.code} on {method} {path}: {err_body}") from err

        jwt_token = None
        for _ in range(30):
            try:
                st, _h, body = api_call(
                    "POST",
                    "/api/v1/auth/login",
                    form_data={"username": "admin", "password": "CompiledVerify@2026"},
                )
                if st == 200 and body and body.get("access_token"):
                    jwt_token = body["access_token"]
                    break
            except urllib.error.HTTPError as e:
                if e.code in (404, 503):
                    time.sleep(1.0)
                    continue
                raise
        if not jwt_token:
            raise RuntimeError("Failed to authenticate against compiled prathamone_backend.exe")

        api_call("POST", "/api/v1/license/trial/start?institution_id=1", {}, jwt_token=jwt_token)
        st, _h, created = api_call(
            "POST",
            "/api/v1/students/",
            {
                "institution_id": 1,
                "academic_year_id": 1,
                "first_name": "Aarohi",
                "last_name": "DesktopCheck",
                "date_of_birth": "2011-04-12",
                "gender": "female",
                "admission_date": "2026-06-15",
            },
            jwt_token=jwt_token,
        )
        if st != 201:
            raise RuntimeError(f"POST /students/ returned {st}")
        stu_id = created["id"]

        st, get_hdrs, listed = api_call(
            "GET",
            "/api/v1/students/?academic_year_id=1&institution_id=1&include_inactive=false&page=1&page_size=20",
            jwt_token=jwt_token,
        )
        if st != 200 or not any(r["id"] == stu_id for r in listed.get("data", [])):
            raise RuntimeError("Compiled GET /students/ did not return newly POSTed student")
        if "no-store" not in get_hdrs.get("cache-control", "").lower():
            raise RuntimeError(f"Missing Cache-Control: no-store header in compiled GET response: {get_hdrs}")

        psql_out = subprocess.check_output(
            [
                str(pgsql_bin / "psql.exe"),
                "-h", "127.0.0.1", "-p", str(isolated_pg_port), "-U", "postgres", "-d", "prashant_academy",
                "-tAc", f"SELECT first_name || ':' || last_name FROM students WHERE id = {stu_id};",
            ],
            text=True,
        ).strip()
        if "Aarohi:DesktopCheck" not in psql_out:
            raise RuntimeError(f"Expected DB row on port {isolated_pg_port}, got {psql_out!r}")
        print(f"  [PASS] DESKTOP-POST-GET-5433: Verified stu_id={stu_id} persisted on isolated port {isolated_pg_port} with no-store headers")

        api_call("POST", "/_desktop/shutdown", {}, jwt_token=jwt_token)
        proc.wait(timeout=15)
    except Exception as exc:
        failures.append(f"Desktop compiled runtime verification failed: {exc}")
    finally:
        if proc and proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except Exception:
                proc.kill()
        out_log.close()
        err_log.close()
        subprocess.run(
            [str(pgsql_bin / "pg_ctl.exe"), "-D", str(data_root / "data"), "stop", "-m", "immediate"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        if bound_5432:
            decoy_5432.close()
        shutil.rmtree(data_root, ignore_errors=True)

    return failures


def main() -> int:
    parser = argparse.ArgumentParser(description="PrathamOne EduOS dual-target market readiness verification")
    parser.add_argument("--target", choices=("hosted", "desktop", "all"), default="all")
    parser.add_argument("--skip-frontend-build", action="store_true")
    parser.add_argument("--skip-compiled-runtime", action="store_true")
    args = parser.parse_args()

    print("\n======================================================================")
    print("  PRATHAMONE EduOS — UNIFIED DUAL-TARGET RELEASE VERIFICATION")
    print("======================================================================")
    failures = _check_shared_governance()

    if args.target in ("hosted", "all"):
        failures.extend(verify_hosted(skip_frontend_build=args.skip_frontend_build))
    if args.target in ("desktop", "all"):
        failures.extend(verify_desktop(skip_compiled_runtime=args.skip_compiled_runtime))

    print("\n======================================================================")
    if failures:
        print(f"  RESULT: FAILED ({len(failures)} blocker(s))")
        for item in failures:
            print(f"   - {item}")
        print("======================================================================")
        return 1
    print(f"  RESULT: APPROVED — TARGET={args.target.upper()} READY FOR RELEASE")
    print("======================================================================")
    return 0


if __name__ == "__main__":
    sys.exit(main())
