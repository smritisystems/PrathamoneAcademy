# /**
#  * @file        windows_launcher.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts.windows_launcher
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-15
#  * @updated     2026-11-26
#  *
#  * @description Windows Desktop & System Tray Launcher: manages local PostgreSQL service,
#  */

import ctypes
import json
import os
import signal
import socket
import subprocess
import sys
import time
import urllib.request
import webbrowser
from pathlib import Path


def show_native_message(title: str, message: str, is_error: bool = False):
    """Display native Windows MessageBox dialog to avoid reliance on DOS console."""
    try:
        flags = 0x10 if is_error else 0x40  # MB_ICONERROR vs MB_ICONINFORMATION
        ctypes.windll.user32.MessageBoxW(0, message, title, flags)
    except Exception:
        print(f"[{title}] {message}")


def get_local_ip() -> str:
    """Retrieve primary local IP address for multi-PC LAN coaching access."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def find_free_port(start_port: int, max_scan: int = 25) -> int:
    """Find the next open TCP port starting from start_port."""
    for p in range(start_port, start_port + max_scan):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("127.0.0.1", p)) != 0:
                return p
    return start_port


class PrathamOneManager:
    def __init__(self, root_dir: Path | None = None):
        self.root_dir = root_dir or Path(__file__).resolve().parent.parent
        self.backend_dir = self.root_dir / "backend"
        self.pgsql_dir = self.root_dir / "pgsql"
        self.data_dir = self.root_dir / "data"
        self.preferred_port = int(os.getenv("PORT", "2026"))
        self.port = self.preferred_port
        self.pg_port = 5432
        self.backend_proc = None
        self.pg_managed = False

        # SSL Configuration detection (installed or dev mode)
        cert_candidates = [
            self.root_dir / "assets" / "prathamone_ssl_cert.pem",
            self.root_dir / "installer" / "assets" / "prathamone_ssl_cert.pem",
        ]
        key_candidates = [
            self.root_dir / "assets" / "prathamone_ssl_key.pem",
            self.root_dir / "installer" / "assets" / "prathamone_ssl_key.pem",
        ]
        self.cert_file = next((c for c in cert_candidates if c.exists()), None)
        self.key_file = next((k for k in key_candidates if k.exists()), None)
        self.use_ssl = bool(self.cert_file and self.key_file)

    def is_port_in_use(self, port: int) -> bool:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(("127.0.0.1", port)) == 0

    def is_our_service_active(self, port: int) -> bool:
        """Check if an existing instance of PrathamOne EduOS is already running on this port."""
        import ssl
        ctx = ssl._create_unverified_context()
        schemes = ["https", "http"] if self.use_ssl else ["http", "https"]
        for scheme in schemes:
            try:
                url = f"{scheme}://127.0.0.1:{port}/health"
                req = urllib.request.Request(url, headers={"User-Agent": "PrathamOneLauncher"})
                with urllib.request.urlopen(req, timeout=1.5, context=ctx) as resp:
                    if resp.status == 200:
                        content = resp.read().decode("utf-8")
                        return "healthy" in content
            except Exception:
                pass
        return False

    def clean_stale_pid_file(self):
        """Detect and remove stale postmaster.pid file if postgres is not running."""
        pid_file = self.data_dir / "postmaster.pid"
        if not pid_file.exists():
            return
        try:
            content = pid_file.read_text(encoding="utf-8")
            lines = content.splitlines()
            if lines:
                pid = int(lines[0].strip())
                is_alive = False
                if sys.platform == "win32":
                    PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
                    h = ctypes.windll.kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
                    if h:
                        ctypes.windll.kernel32.CloseHandle(h)
                        is_alive = True
                if not is_alive:
                    print(f"[LAUNCHER] Cleaning stale database lock (PID {pid} is terminated).")
                    pid_file.unlink(missing_ok=True)
                else:
                    print(f"[LAUNCHER] Active database process detected (PID {pid}).")
        except Exception as e:
            print(f"[LAUNCHER WARN] Stale PID check note: {e}")
            try:
                pid_file.unlink(missing_ok=True)
            except Exception:
                pass

    def start_postgresql(self) -> bool:
        """Start embedded PostgreSQL if present and not already running."""
        self.clean_stale_pid_file()
        pg_ctl = self.pgsql_dir / "bin" / "pg_ctl.exe"
        if not pg_ctl.exists():
            print("[LAUNCHER] Embedded PostgreSQL not detected at pgsql\\bin; assuming existing service.")
            return True

        # Check if database cluster exists; if missing, perform automated initialization
        pg_version_file = self.data_dir / "PG_VERSION"
        if not pg_version_file.exists():
            print(f"[LAUNCHER] Database cluster not found at: {self.data_dir}")
            print("[LAUNCHER] Performing automated first-time database initialization...")
            initdb = self.pgsql_dir / "bin" / "initdb.exe"
            if initdb.exists():
                try:
                    self.data_dir.mkdir(parents=True, exist_ok=True)
                    init_cmd = [
                        str(initdb),
                        "-D", str(self.data_dir),
                        "-U", "postgres",
                        "-A", "trust",
                        "--encoding=UTF8",
                        "--locale=C",
                        "--no-instructions",
                    ]
                    subprocess.run(init_cmd, check=True)
                    print("[LAUNCHER] Database cluster initialized successfully.")
                except Exception as exc:
                    err_msg = f"Failed to initialize local database cluster:\n{exc}"
                    print(f"[LAUNCHER ERROR] {err_msg}")
                    show_native_message("PrathamOne EduOS — Database Setup", err_msg, is_error=True)
                    return False
            else:
                err_msg = f"PostgreSQL initdb utility missing at: {initdb}"
                print(f"[LAUNCHER ERROR] {err_msg}")
                show_native_message("PrathamOne EduOS — Missing Component", err_msg, is_error=True)
                return False

        # Determine PostgreSQL port: check if 5432 is in use by another app (e.g. Docker)
        if self.is_port_in_use(5432):
            self.pg_port = 5433
            # Ensure postgresql.conf specifies port 5433
            conf_file = self.data_dir / "postgresql.conf"
            if conf_file.exists():
                conf_text = conf_file.read_text(encoding="utf-8")
                if "port = 5433" not in conf_text:
                    with open(conf_file, "a", encoding="utf-8") as f:
                        f.write("\nport = 5433\n")
        else:
            self.pg_port = 5432

        # Check if already active
        if self.is_port_in_use(self.pg_port):
            print(f"[LAUNCHER] PostgreSQL service is already active on port {self.pg_port}.")
            return True

        print(f"[LAUNCHER] Starting embedded PostgreSQL service on port {self.pg_port}...")
        log_file = self.data_dir / "pg_server.log"
        postgres_exe = self.pgsql_dir / "bin" / "postgres.exe"
        flags = 0x08000000 if sys.platform == "win32" else 0

        # Launch postgres.exe directly with CREATE_NO_WINDOW to eliminate cmd.exe console
        try:
            log_fp = open(str(log_file), "a", encoding="utf-8")
            self.pg_proc = subprocess.Popen(
                [str(postgres_exe), "-D", str(self.data_dir), "-p", str(self.pg_port)],
                stdout=log_fp,
                stderr=log_fp,
                creationflags=flags,
            )
            # Wait up to 45 seconds for PostgreSQL to accept connections (handles crash recovery cleanly)
            pg_isready = self.pgsql_dir / "bin" / "pg_isready.exe"
            started = False
            for _ in range(90):
                if pg_isready.exists():
                    chk = subprocess.run(
                        [str(pg_isready), "-h", "127.0.0.1", "-p", str(self.pg_port), "-U", "postgres"],
                        capture_output=True,
                        creationflags=flags,
                    )
                    if chk.returncode == 0:
                        print("[LAUNCHER] PostgreSQL started and accepting connections.")
                        self.pg_managed = True
                        started = True
                        break
                elif self.is_port_in_use(self.pg_port):
                    print("[LAUNCHER] PostgreSQL started successfully.")
                    self.pg_managed = True
                    started = True
                    break
                time.sleep(0.5)

            if not started:
                raise TimeoutError("PostgreSQL did not become ready within timeout.")
        except Exception as pg_err:
            err_msg = f"Failed to start local database engine:\n{pg_err}"
            print(f"[LAUNCHER ERROR] {err_msg}")
            show_native_message("PrathamOne EduOS — Database Start Failed", err_msg, is_error=True)
            return False

        # Run bootstrap on first launch, setup_config.json pending, or upgrade (alembic version check)
        env_file = self.root_dir / ".env"
        setup_cfg = self.root_dir / "setup_config.json"
        bootstrap_marker = self.data_dir / ".bootstrap_complete"
        import hashlib
        manifest_file = self.backend_dir / "app" / ".code_integrity.manifest"
        alembic_dir = self.backend_dir / "alembic" / "versions"
        stamp_src = manifest_file.read_bytes() if manifest_file.exists() else b"dev"
        if alembic_dir.exists():
            stamp_src += "|".join(sorted(p.name for p in alembic_dir.iterdir())).encode("utf-8")
        current_stamp = hashlib.sha256(stamp_src).hexdigest()
        needs_bootstrap = (
            not env_file.exists()
            or setup_cfg.exists()
            or not bootstrap_marker.exists()
            or bootstrap_marker.read_text(encoding="utf-8").strip() != current_stamp
        )
        bootstrap_script = self.root_dir / "scripts" / "windows_bootstrap.py"
        if needs_bootstrap and bootstrap_script.exists():
            try:
                subprocess.run([
                    sys.executable,
                    str(bootstrap_script),
                    f"--db-port={self.pg_port}"
                ], check=True, creationflags=flags)
                bootstrap_marker.write_text(current_stamp, encoding="utf-8")
                print("[LAUNCHER] Database schema and canonical masters verified.")
            except Exception as b_exc:
                print(f"[LAUNCHER WARN] Bootstrap execution note: {b_exc}")

        return True

    def stop_postgresql(self):
        """Stop embedded PostgreSQL gracefully."""
        if hasattr(self, "pg_proc") and self.pg_proc and self.pg_proc.poll() is None:
            print("[LAUNCHER] Stopping embedded PostgreSQL service...")
            self.pg_proc.terminate()
            try:
                self.pg_proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.pg_proc.kill()
            print("[LAUNCHER] PostgreSQL stopped.")
        else:
            pg_ctl = self.pgsql_dir / "bin" / "pg_ctl.exe"
            flags = 0x08000000 if sys.platform == "win32" else 0
            if pg_ctl.exists() and self.data_dir.exists() and self.pg_managed:
                print("[LAUNCHER] Stopping embedded PostgreSQL service...")
                stop_cmd = [str(pg_ctl), "stop", "-D", str(self.data_dir), "-m", "fast"]
                subprocess.run(stop_cmd, capture_output=True, creationflags=flags)
                print("[LAUNCHER] PostgreSQL stopped.")

    def start_backend(self):
        """Launch FastAPI Uvicorn server in background."""
        # Check if port is in use
        if self.is_port_in_use(self.port):
            if self.is_our_service_active(self.port):
                print(f"[LAUNCHER] PrathamOne EduOS is already running on port {self.port}!")
                self.open_browser()
                sys.exit(0)
            else:
                # Occupied by another application; pick next available port
                self.port = find_free_port(2027)
                print(f"[LAUNCHER] Port {self.preferred_port} occupied; assigned available port: {self.port}")

        print(f"[LAUNCHER] Starting PrathamOne EduOS backend on port {self.port}...")
        env = os.environ.copy()
        env["PYTHONPATH"] = str(self.backend_dir)
        env["PORT"] = str(self.port)

        # Load environment variables from .env
        env_file = self.root_dir / ".env"
        if env_file.exists():
            for line in env_file.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip()

        # Point to static dist
        static_dist = self.root_dir / "frontend" / "dist"
        if static_dist.exists():
            env["STATIC_DIR"] = str(static_dist)

        # Ensure backend connects to the active PostgreSQL port
        env["DATABASE_URL"] = f"postgresql+asyncpg://postgres:postgres@localhost:{self.pg_port}/prashant_academy"

        # Forward desktop token if passed from native launcher
        if "PRATHAM_DESKTOP_TOKEN" in os.environ:
            env["PRATHAM_DESKTOP_TOKEN"] = os.environ["PRATHAM_DESKTOP_TOKEN"]

        cmd = [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "0.0.0.0",
            "--port",
            str(self.port),
            "--log-level",
            "info",
        ]
        if self.use_ssl:
            cmd.extend([
                "--ssl-certfile", str(self.cert_file),
                "--ssl-keyfile", str(self.key_file),
            ])

        flags = 0x08000000 if sys.platform == "win32" else 0
        logs_dir = self.root_dir / "logs"
        logs_dir.mkdir(parents=True, exist_ok=True)
        for stale_dir in (self.root_dir, self.data_dir):
            stale_log = stale_dir / "backend_server.log"
            try:
                if stale_log.is_file() and stale_log.stat().st_size == 0:
                    stale_log.unlink()
            except Exception:
                pass
        backend_log = logs_dir / "backend_server.log"
        backend_log_fp = open(str(backend_log), "a", encoding="utf-8")
        self.backend_proc = subprocess.Popen(
            cmd,
            cwd=str(self.backend_dir),
            env=env,
            creationflags=flags,
            stdout=backend_log_fp,
            stderr=backend_log_fp,
        )

    def stop_backend(self):
        """Terminate backend process cleanly."""
        if self.backend_proc and self.backend_proc.poll() is None:
            print("[LAUNCHER] Shutting down PrathamOne EduOS backend...")
            self.backend_proc.terminate()
            try:
                self.backend_proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.backend_proc.kill()
            print("[LAUNCHER] Backend stopped.")

    def wait_for_health(self, timeout: int = 30) -> bool:
        """Poll backend healthcheck until ready."""
        import ssl
        ctx = ssl._create_unverified_context()
        scheme = "https" if self.use_ssl else "http"
        url = f"{scheme}://127.0.0.1:{self.port}/health"
        print(f"[LAUNCHER] Waiting for service initialization ({scheme})...", end="", flush=True)
        start = time.time()
        while time.time() - start < timeout:
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "PrathamOneLauncher"})
                with urllib.request.urlopen(req, timeout=1.5, context=ctx) as response:
                    if response.status == 200:
                        print(" [HEALTHY]")
                        return True
            except Exception:
                pass
            print(".", end="", flush=True)
            time.sleep(1)
        print(" [TIMEOUT]")
        return False

    def get_institute_slug(self) -> str:
        """Determine custom institute slug (e.g., 'prashantacademy') without spaces."""
        slug = "prashantacademy"
        env_file = self.root_dir / ".env"
        if env_file.exists():
            for line in env_file.read_text(encoding="utf-8").splitlines():
                if line.startswith("INSTITUTE_SLUG="):
                    val = line.split("=", 1)[1].strip().strip("'\"")
                    if val:
                        return "".join(c.lower() for c in val if c.isalnum())
                elif line.startswith("INSTITUTE_NAME="):
                    val = line.split("=", 1)[1].strip().strip("'\"")
                    cleaned = "".join(c.lower() for c in val if c.isalnum())
                    if cleaned and cleaned not in ("youracademyname", "institute"):
                        slug = cleaned
        cfg_file = self.root_dir / "setup_config.json"
        if cfg_file.exists():
            try:
                data = json.loads(cfg_file.read_text(encoding="utf-8"))
                val = data.get("institute_name", "")
                cleaned = "".join(c.lower() for c in val if c.isalnum())
                if cleaned and cleaned not in ("youracademyname", "institute"):
                    slug = cleaned
            except Exception:
                pass
        return slug

    def get_launch_mode(self) -> str:
        """
        Determine launch presentation mode: 'browser' (default) vs 'app' / 'pwa'.
        Priority order:
        1. Explicit CLI argument (--app / --pwa vs --browser)
        2. Persistent config file (launcher_config.json)
        3. Environment variable (LAUNCH_MODE or DESKTOP_LAUNCH_MODE in .env)
        4. Default: 'browser' (standard web browser with address bar, tabs & bookmarks)
        """
        # 1. CLI flag
        if "--app" in sys.argv or "--pwa" in sys.argv:
            return "app"
        if "--browser" in sys.argv or "--web" in sys.argv:
            return "browser"

        # 2. launcher_config.json
        cfg_candidates = [
            self.root_dir / "launcher_config.json",
            self.root_dir / "data" / "launcher_config.json",
        ]
        for cfg in cfg_candidates:
            if cfg.is_file():
                try:
                    data = json.loads(cfg.read_text(encoding="utf-8"))
                    mode = str(data.get("launch_mode", "")).strip().lower()
                    if mode in ("app", "pwa", "standalone"):
                        return "app"
                    elif mode in ("browser", "web"):
                        return "browser"
                except Exception:
                    pass

        # 3. Environment variable (.env or os.environ)
        env_mode = os.environ.get("LAUNCH_MODE") or os.environ.get("DESKTOP_LAUNCH_MODE")
        if not env_mode:
            env_file = self.root_dir / ".env"
            if env_file.exists():
                for line in env_file.read_text(encoding="utf-8").splitlines():
                    if line.startswith("LAUNCH_MODE=") or line.startswith("DESKTOP_LAUNCH_MODE="):
                        env_mode = line.split("=", 1)[1].strip().strip("'\"").lower()
                        break
        if env_mode in ("app", "pwa", "standalone"):
            return "app"

        # 4. Default is standard browser
        return "browser"

    def open_browser(self):
        """Open web interface in standard browser (default) or standalone Desktop App window based on settings."""
        if "--no-browser" in sys.argv:
            print("[LAUNCHER] Running in native desktop mode (--no-browser); external browser launch suppressed.")
            return

        slug = self.get_institute_slug()

        # Check which local host resolves (classes name, prathamone, or localhost)
        host = "localhost"
        for candidate in [slug, "classesname", "prathamone"]:
            try:
                socket.gethostbyname(candidate)
                host = candidate
                break
            except Exception:
                pass

        scheme = "https" if self.use_ssl else "http"
        app_url = f"{scheme}://{host}:{self.port}/"
        mode = self.get_launch_mode()

        if mode == "app":
            # Check for Google Chrome or Microsoft Edge to launch in clean App Mode (no URL bar)
            app_mode_browsers = [
                Path(os.environ.get("ProgramFiles", "C:/Program Files")) / "Google/Chrome/Application/chrome.exe",
                Path(os.environ.get("ProgramFiles(x86)", "C:/Program Files (x86)")) / "Google/Chrome/Application/chrome.exe",
                Path(os.environ.get("LOCALAPPDATA", "")) / "Google/Chrome/Application/chrome.exe",
                Path(os.environ.get("ProgramFiles(x86)", "C:/Program Files (x86)")) / "Microsoft/Edge/Application/msedge.exe",
                Path(os.environ.get("ProgramFiles", "C:/Program Files")) / "Microsoft/Edge/Application/msedge.exe",
            ]

            launched = False
            flags = 0x08000000 if sys.platform == "win32" else 0
            for b in app_mode_browsers:
                if b.is_file():
                    try:
                        subprocess.Popen([str(b), f"--app={app_url}"], creationflags=flags)
                        launched = True
                        print(f"[LAUNCHER] Launched standalone Desktop App window via {b.name} ({app_url})")
                        break
                    except Exception as e:
                        print(f"[LAUNCHER WARN] App mode launch note: {e}")

            if launched:
                return

        # Default Presentation: Standard Browser with tabs, URL bar & padlock
        print(f"[LAUNCHER] Opening web interface in standard browser: {app_url}")
        webbrowser.open(app_url)

    def print_banner(self):
        local_ip = get_local_ip()
        slug = self.get_institute_slug()
        scheme = "https" if self.use_ssl else "http"
        mode = self.get_launch_mode()
        print("\n======================================================================")
        print("         PRATHAMONE EduOS — COACHING INSTITUTE MANAGEMENT SYSTEM       ")
        print("======================================================================")
        print(f"  Launch Presentation Mode:    {'Standard Browser (Default)' if mode == 'browser' else 'Dedicated Desktop Window (PWA Mode)'}")
        print("  --------------------------------------------------------------------")
        print("  ALL 3 DOMAIN COMBINATIONS (WITH PORT & WITHOUT PORT):")
        print(f"  1. Classes Name (Without Space):")
        print(f"     - With Port:              {scheme}://{slug}:{self.port}/")
        print(f"     - Without Port:           {scheme}://{slug}/")
        print(f"  2. Generic Classes Alias:")
        print(f"     - With Port:              {scheme}://classesname:{self.port}/")
        print(f"     - Without Port:           {scheme}://classesname/")
        print(f"  3. PrathamOne Brand Domain:")
        print(f"     - With Port:              {scheme}://prathamone:{self.port}/")
        print(f"     - Without Port:           {scheme}://prathamone/")
        print(f"  4. Standard Localhost:")
        print(f"     - With Port:              {scheme}://localhost:{self.port}/")
        print(f"     - Without Port:           {scheme}://localhost/")
        print(f"  5. Institute Wi-Fi / LAN:    {scheme}://{local_ip}:{self.port}/")
        print(f"  6. Healthcheck Status:       {scheme}://localhost:{self.port}/health")
        print("  --------------------------------------------------------------------")

        # Check if local hosts entries are active
        try:
            socket.gethostbyname("classesname")
        except socket.gaierror:
            print("  [NOTE] Domain aliases (classesname / prathamone) are not active in Windows hosts.")
            print("         Run 'scripts\\configure_local_domains.bat' (as Administrator) to enable them.")
            print("  --------------------------------------------------------------------")

        print(f"  Other computers on institute Wi-Fi can open: {scheme}://{slug}:{self.port}/")
        print("  Press Ctrl+C to stop services and exit.")
        print("======================================================================\n")

    def verify_code_integrity(self) -> bool:
        """
        Cryptographic Code Integrity Verification.
        Guarantees that core security bytecode (.pyc) has not been patched or hex-edited.
        """
        manifest_file = self.backend_dir / "app" / ".code_integrity.manifest"
        if not manifest_file.exists():
            return True

        import hashlib
        salt = b"PRATHAMONE_EDUOS_INTEGRITY_SALT_2026"
        try:
            manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
            critical_prefixes = [
                "app/core/hardware.",
                "app/api/v1/endpoints/license.",
                "app/services/license_service.",
            ]
            for prefix in critical_prefixes:
                # Match .pyd or .pyc in manifest
                matching_entry = None
                for rel, expected_hash in manifest.items():
                    if rel.startswith(prefix) and (rel.endswith(".pyd") or rel.endswith(".pyc")):
                        matching_entry = (rel, expected_hash)
                        break
                if matching_entry:
                    rel, expected_hash = matching_entry
                    file_path = self.backend_dir / rel
                    if not file_path.exists():
                        show_native_message(
                            "PrathamOne EduOS — Integrity Alert",
                            f"Missing critical security module '{rel}'.\nStartup halted.",
                            is_error=True,
                        )
                        return False
                    current_hash = hashlib.sha256(file_path.read_bytes() + salt).hexdigest()
                    if current_hash != expected_hash:
                        show_native_message(
                            "PrathamOne EduOS — Tamper Detection Alert",
                            f"Security Violation: Core binary '{rel}' has been altered or tampered with.\nPrathamOne EduOS cannot run with modified security binaries.",
                            is_error=True,
                        )
                        return False
            return True
        except Exception as e:
            print(f"[LAUNCHER WARN] Integrity verification note: {e}")
            return True

    def run(self):
        """Run complete startup sequence."""
        # 0. Anti-Tampering Integrity Check
        if not self.verify_code_integrity():
            print("[LAUNCHER FATAL] Code integrity verification failed. Aborting.")
            sys.exit(1)

        # 1. Quick check if already running
        if self.is_our_service_active(self.port):
            print(f"[LAUNCHER] PrathamOne EduOS is already active on port {self.port}!")
            self.open_browser()
            return

        # 2. Start PostgreSQL
        if not self.start_postgresql():
            print("[LAUNCHER] Aborting startup due to database failure.")
            sys.exit(1)

        # 3. Start Backend
        self.start_backend()

        # 4. Wait for Healthcheck
        if self.wait_for_health(35):
            self.print_banner()
            self.open_browser()
        else:
            print("[LAUNCHER WARN] Healthcheck timed out. Attempting to open browser...")
            self.open_browser()

        # Handle signals
        def handle_exit(signum, frame):
            print("\n[LAUNCHER] Shutdown signal received.")
            self.shutdown()
            sys.exit(0)

        signal.signal(signal.SIGINT, handle_exit)
        signal.signal(signal.SIGTERM, handle_exit)

        # Monitor loop
        try:
            while True:
                if self.backend_proc and self.backend_proc.poll() is not None:
                    print("[LAUNCHER WARN] Backend process exited unexpectedly.")
                    break
                time.sleep(2)
        except KeyboardInterrupt:
            handle_exit(None, None)

    def shutdown(self):
        self.stop_backend()
        self.stop_postgresql()


def main():
    manager = PrathamOneManager()
    manager.run()


if __name__ == "__main__":
    main()
