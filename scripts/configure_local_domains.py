# /**
#  * @file        configure_local_domains.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts.configure_local_domains
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-20
#  * @updated     2026-11-21
#  *
#  * @description Automated configuration of Windows hosts file, port forwarding (ports 80 & 443),
#  */

import ctypes
import json
import os
import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


def is_admin() -> bool:
    """Check if the current process has administrative privileges."""
    try:
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except Exception:
        return False


def request_admin_elevation():
    """Relaunch this script with administrative elevation via UAC."""
    script_path = str(Path(__file__).resolve())
    python_exe = sys.executable
    params = f'"{script_path}"'
    if len(sys.argv) > 1:
        params += " " + " ".join(f'"{arg}"' for arg in sys.argv[1:])

    print("[ELEVATION] Requesting administrator privileges to update hosts file and configure SSL...")
    result = ctypes.windll.shell32.ShellExecuteW(
        None,
        "runas",
        python_exe,
        params,
        str(REPO_ROOT),
        1  # SW_SHOWNORMAL
    )
    if result <= 32:
        print("[ELEVATION FAILED] Administrative elevation was rejected or cancelled by user.")
        return False
    return True


def get_institute_slug() -> str:
    """Retrieve institute slug without spaces from setup_config.json or .env."""
    slug = "prashantacademy"
    cfg_file = REPO_ROOT / "setup_config.json"
    if cfg_file.is_file():
        try:
            data = json.loads(cfg_file.read_text(encoding="utf-8"))
            val = data.get("institute_name", "")
            cleaned = "".join(c.lower() for c in val if c.isalnum())
            if cleaned and cleaned not in ("youracademyname", "institute"):
                return cleaned
        except Exception:
            pass

    env_file = REPO_ROOT / ".env"
    if env_file.is_file():
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
    return slug


def configure_hosts_file(classes_slug: str) -> bool:
    """Add all 3 domain combinations to C:\\Windows\\System32\\drivers\\etc\\hosts."""
    hosts_path = Path(r"C:\Windows\System32\drivers\etc\hosts")
    if not hosts_path.exists():
        print(f"[HOSTS ERROR] Hosts file not found at: {hosts_path}")
        return False

    try:
        content = hosts_path.read_text(encoding="utf-8", errors="ignore")
    except Exception as e:
        print(f"[HOSTS ERROR] Failed to read hosts file: {e}")
        return False

    # 3 Combinations of domain names
    required_domains = [
        "prathamone",
        "prathamone.local",
        "classesname",
        "classesname.local",
    ]
    if classes_slug and classes_slug not in required_domains:
        required_domains.extend([classes_slug, f"{classes_slug}.local"])

    missing = []
    for domain in required_domains:
        # Check if domain exists as a word in the hosts file
        if not re.search(rf"\b{re.escape(domain)}\b", content, re.IGNORECASE):
            missing.append(domain)

    if not missing:
        print("[HOSTS] All domain aliases are already configured in Windows hosts file.")
        return True

    print(f"[HOSTS] Adding {len(missing)} missing domain entries: {', '.join(missing)}")
    entries_text = "\n\n# PrathamOne EduOS Local Domain Aliases\n"
    for domain in missing:
        entries_text += f"127.0.0.1    {domain}\n"

    try:
        # Clear readonly attribute if present
        import stat
        os.chmod(str(hosts_path), stat.S_IWRITE)
        with open(str(hosts_path), "a", encoding="utf-8") as f:
            f.write(entries_text)
        print("[HOSTS SUCCESS] Windows hosts file updated successfully.")
    except Exception as e:
        print(f"[HOSTS ERROR] Failed to write to hosts file: {e}")
        return False

    # Flush DNS cache
    try:
        subprocess.run(["ipconfig", "/flushdns"], capture_output=True, check=False)
        print("[DNS] Windows DNS resolver cache flushed successfully.")
    except Exception:
        pass

    return True


def configure_portproxy(backend_port: int = 2026) -> bool:
    """Setup port 80 (HTTP) and port 443 (HTTPS) forwarding to backend_port via netsh."""
    print(f"[PORTPROXY] Configuring Windows portproxy (ports 80 & 443 -> {backend_port})...")
    commands = [
        ["netsh", "interface", "portproxy", "add", "v4tov4", "listenport=80", "listenaddress=127.0.0.1", f"connectport={backend_port}", "connectaddress=127.0.0.1"],
        ["netsh", "interface", "portproxy", "add", "v4tov4", "listenport=443", "listenaddress=127.0.0.1", f"connectport={backend_port}", "connectaddress=127.0.0.1"],
        ["netsh", "advfirewall", "firewall", "add", "rule", "name=PrathamOne EduOS Local Network", "dir=in", "action=allow", "protocol=TCP", f"localport={backend_port},80,443"],
    ]
    for cmd in commands:
        try:
            res = subprocess.run(cmd, capture_output=True, text=True)
            if res.returncode != 0 and "already exists" not in res.stderr.lower():
                print(f"[PORTPROXY NOTE] Command {' '.join(cmd)}: {res.stderr.strip()}")
        except Exception as e:
            print(f"[PORTPROXY WARN] {e}")

    print("[PORTPROXY SUCCESS] Port 80 and 443 forwarding configured.")
    return True


def install_trusted_root_ca() -> bool:
    """Install Smritisys & AITDL Local Root CA into Windows Trusted Root Store to eliminate 'Not secure' warnings."""
    ca_candidates = [
        REPO_ROOT / "assets" / "Smritisys_AITDL_Local_CA.cer",
        REPO_ROOT / "installer" / "assets" / "Smritisys_AITDL_Local_CA.cer",
    ]
    ca_cert = next((c for c in ca_candidates if c.is_file()), None)
    if not ca_cert:
        print("[SSL CA] Root CA certificate not found; generating fresh local PKI...")
        try:
            from scripts.generate_ssl_certificates import generate_local_pki
            out_dir = REPO_ROOT / "assets"
            out_dir.mkdir(parents=True, exist_ok=True)
            ca_cert, _, _, _ = generate_local_pki(out_dir, [get_institute_slug()])
        except Exception as e:
            print(f"[SSL CA ERROR] Could not generate PKI: {e}")
            return False

    print(f"[SSL CA] Installing Root CA certificate: {ca_cert.name} into Windows Trusted Root Store...")
    try:
        res = subprocess.run(
            ["certutil.exe", "-addstore", "-f", "ROOT", str(ca_cert)],
            capture_output=True,
            text=True,
            check=False
        )
        if res.returncode == 0:
            print("[SSL CA SUCCESS] Smritisys & AITDL Networks Root CA is now trusted by Windows.")
            print("[SSL CA SUCCESS] Chrome and Edge will now show secure connection without 'Not secure' warning.")
            return True
        else:
            print(f"[SSL CA WARN] certutil output: {res.stderr or res.stdout}")
            return False
    except Exception as e:
        print(f"[SSL CA ERROR] Failed to run certutil: {e}")
        return False


def main():
    print("======================================================================")
    print("  PRATHAMONE EduOS — LOCAL DOMAINS & SSL TRUST CONFIGURATOR")
    print("======================================================================")

    if not is_admin():
        print("[UAC] Administrator privileges are required to configure hosts and SSL.")
        if request_admin_elevation():
            sys.exit(0)
        else:
            print("[ERROR] Please right-click configure_local_domains.bat and select 'Run as administrator'.")
            input("\nPress Enter to exit...")
            sys.exit(1)

    slug = get_institute_slug()
    print(f"[INFO] Institute Slug: {slug}")

    # 1. Update hosts file for all 3 domain combinations
    configure_hosts_file(slug)

    # 2. Configure portproxy for Without-Port access (port 80 & 443)
    configure_portproxy(backend_port=2026)

    # 3. Install Root CA to eliminate "Not secure" browser warnings (unless --skip-ca is specified)
    if "--skip-ca" not in sys.argv:
        install_trusted_root_ca()
    else:
        print("[SSL CA] Skipping Root CA installation as requested (--skip-ca).")

    print("\n======================================================================")
    print("  CONFIGURATION COMPLETED SUCCESSFULLY!")
    print("======================================================================")
    print("  You can now access PrathamOne EduOS via all 3 domain combinations:")
    print(f"  1. Combination 1 (Classes Name - With & Without Port):")
    print(f"     - https://classesname:2026/  or  https://classesname/")
    print(f"  2. Combination 2 (Institute Name Without Space - With & Without Port):")
    print(f"     - https://{slug}:2026/  or  https://{slug}/")
    print(f"  3. Combination 3 (PrathamOne Product Name - With & Without Port):")
    print(f"     - https://prathamone:2026/  or  https://prathamone/")
    print(f"  4. Standard Localhost:")
    print(f"     - https://localhost:2026/  or  https://localhost/")
    print("======================================================================\n")

    if "--no-pause" not in sys.argv:
        try:
            input("Press Enter to close this window...")
        except Exception:
            pass


if __name__ == "__main__":
    main()
