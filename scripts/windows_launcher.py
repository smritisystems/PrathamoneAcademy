# /**
#  * @file        windows_launcher.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts.windows_launcher
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-15
#  * @updated     2026-11-15
#  *
#  * @description Windows Desktop & System Tray Launcher: manages local PostgreSQL service,
#  */

import ctypes
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
        self.preferred_port = int(os.getenv("PORT", "8000"))
        self.port = self.preferred_port
        self.pg_port = 5432
        self.backend_proc = None
        self.pg_managed = False

    def is_port_in_use(self, port: int) -> bool:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(("127.0.0.1", port)) == 0

    def is_our_service_active(self, port: int) -> bool:
        """Check if an existing instance of PrathamOne EduOS is already running on this port."""
        try:
            url = f"http://127.0.0.1:{port}/health"
            req = urllib.request.Request(url, headers={"User-Agent": "PrathamOneLauncher"})
            with urllib.request.urlopen(req, timeout=1.5) as resp:
                if resp.status == 200:
                    content = resp.read().decode("utf-8")
                    return "healthy" in content
        except Exception:
            pass
        return False

    def start_postgresql(self) -> bool:
        """Start embedded PostgreSQL if present and not already running."""
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

        # Check status
        status_cmd = [str(pg_ctl), "status", "-D", str(self.data_dir)]
        res = subprocess.run(status_cmd, capture_output=True, text=True)
        if "server is running" in res.stdout:
            print("[LAUNCHER] PostgreSQL service is already active.")
            return True

        print(f"[LAUNCHER] Starting embedded PostgreSQL service on port {self.pg_port}...")
        log_file = self.data_dir / "postgresql.log"
        start_cmd = [str(pg_ctl), "start", "-D", str(self.data_dir), "-o", f"-p {self.pg_port}", "-l", str(log_file), "-w"]
        res = subprocess.run(start_cmd, capture_output=True, text=True)

        if res.returncode == 0:
            print("[LAUNCHER] PostgreSQL started successfully.")
            self.pg_managed = True

            # If .env does not exist or database is unmigrated, run bootstrap
            env_file = self.root_dir / ".env"
            bootstrap_script = self.root_dir / "scripts" / "windows_bootstrap.py"
            if bootstrap_script.exists():
                try:
                    subprocess.run([
                        sys.executable,
                        str(bootstrap_script),
                        "--admin-password=PrathamOne2026!Admin",
                        f"--db-port={self.pg_port}"
                    ], check=True)
                    print("[LAUNCHER] Database schema and canonical masters verified.")
                except Exception as b_exc:
                    print(f"[LAUNCHER WARN] Bootstrap execution note: {b_exc}")

            return True
        else:
            err_msg = f"Failed to start local database engine:\n{res.stderr.strip() or 'Port conflict or permission error.'}"
            print(f"[LAUNCHER ERROR] {err_msg}")
            show_native_message("PrathamOne EduOS — Database Start Failed", err_msg, is_error=True)
            return False

    def stop_postgresql(self):
        """Stop embedded PostgreSQL gracefully."""
        pg_ctl = self.pgsql_dir / "bin" / "pg_ctl.exe"
        if pg_ctl.exists() and self.data_dir.exists() and self.pg_managed:
            print("[LAUNCHER] Stopping embedded PostgreSQL service...")
            stop_cmd = [str(pg_ctl), "stop", "-D", str(self.data_dir), "-m", "fast"]
            subprocess.run(stop_cmd, capture_output=True)
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
                self.port = find_free_port(8001)
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
        self.backend_proc = subprocess.Popen(cmd, cwd=str(self.backend_dir), env=env)

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
        url = f"http://127.0.0.1:{self.port}/health"
        print("[LAUNCHER] Waiting for service initialization...", end="", flush=True)
        start = time.time()
        while time.time() - start < timeout:
            try:
                with urllib.request.urlopen(url, timeout=1.5) as response:
                    if response.status == 200:
                        print(" [HEALTHY]")
                        return True
            except Exception:
                pass
            print(".", end="", flush=True)
            time.sleep(1)
        print(" [TIMEOUT]")
        return False

    def open_browser(self):
        """Open default web browser to the application."""
        app_url = f"http://localhost:{self.port}/"
        print(f"[LAUNCHER] Opening web interface: {app_url}")
        webbrowser.open(app_url)

    def print_banner(self):
        local_ip = get_local_ip()
        print("\n======================================================================")
        print("         PRATHAMONE EduOS — COACHING INSTITUTE MANAGEMENT SYSTEM       ")
        print("======================================================================")
        print(f"  Local Access:      http://localhost:{self.port}/")
        print(f"  Network (LAN) URL: http://{local_ip}:{self.port}/")
        print(f"  System Health:     http://localhost:{self.port}/health")
        print("----------------------------------------------------------------------")
        print("  Other computers at the institute can connect via the Network URL.")
        print("  Press Ctrl+C to stop services and exit.")
        print("======================================================================\n")

    def run(self):
        """Run complete startup sequence."""
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
