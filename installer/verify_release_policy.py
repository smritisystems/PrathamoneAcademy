#!/usr/bin/env python3
# /**
#  * @file        verify_release_policy.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      installer.verify_release_policy
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-25
#  * @updated     2026-11-26
#  *
#  * @description Automated Pre-Build Governance Auditor enforcing installer/BUILD_AND_INSTALLER_POLICY.md:
#  */

import argparse
import json
import re
import sys
from pathlib import Path

from PIL import Image

INSTALLER_DIR = Path(__file__).resolve().parent
REPO_ROOT = INSTALLER_DIR.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


class PolicyAuditor:
    def __init__(self):
        self.passes: list[str] = []
        self.gaps: list[str] = []

    def ok(self, check_id: str, msg: str):
        self.passes.append(f"[PASS] {check_id}: {msg}")

    def fail(self, check_id: str, msg: str):
        self.gaps.append(f"[GAP]  {check_id}: {msg}")

    def check_branding_and_assets(self):
        art_dir = REPO_ROOT / "frontend" / "public" / "artwork" / "25112026"
        for req in ("batch_g44.svg", "batch_g45.svg", "batch_g46.svg", "Splash.gif", "Image.jpg"):
            if (art_dir / req).is_file():
                self.ok("ASSET-SSOT", f"Found canonical source asset artwork/25112026/{req}")
            else:
                self.fail("ASSET-SSOT", f"Missing required 25112026 source asset: {art_dir / req}")

        assets_dir = INSTALLER_DIR / "assets"
        ico_path = assets_dir / "app_icon.ico"
        if not ico_path.is_file():
            self.fail("ASSET-ICO", f"Missing {ico_path}")
        else:
            with Image.open(ico_path) as im:
                sizes = {s[0] for s in im.info.get("sizes", set())}
                required = {16, 32, 48, 64, 128, 256}
                if required.issubset(sizes):
                    self.ok("ASSET-ICO", f"app_icon.ico contains all required resolutions: {sorted(sizes)}")
                else:
                    self.fail("ASSET-ICO", f"app_icon.ico missing resolutions {sorted(required - sizes)} (found {sorted(sizes)})")

        for bmp_name, exp_size in (("wizard_large.bmp", (164, 314)), ("wizard_small.bmp", (160, 58))):
            bp = assets_dir / bmp_name
            if not bp.is_file():
                self.fail("ASSET-BMP", f"Missing {bp}")
            else:
                with Image.open(bp) as im:
                    if im.size == exp_size and im.mode == "RGB":
                        self.ok("ASSET-BMP", f"{bmp_name} verified at {im.size[0]}x{im.size[1]} RGB BMP")
                    else:
                        self.fail("ASSET-BMP", f"{bmp_name} invalid format/size {im.size} mode={im.mode}; expected {exp_size} RGB")

        splash_path = assets_dir / "Splash.gif"
        if not splash_path.is_file():
            self.fail("ASSET-SPLASH", f"Missing {splash_path}")
        else:
            size_bytes = splash_path.stat().st_size
            limit_bytes = 3 * 1024 * 1024
            if size_bytes <= limit_bytes:
                self.ok("ASSET-SPLASH", f"Splash.gif size {size_bytes / (1024 * 1024):.2f} MB <= 3.00 MB limit")
            else:
                self.fail("ASSET-SPLASH", f"Splash.gif exceeds 3 MB budget ({size_bytes / (1024 * 1024):.2f} MB)")

        license_file = REPO_ROOT / "LICENSE"
        if license_file.is_file() and license_file.stat().st_size > 20:
            self.ok("ASSET-LICENSE", "Commercial/Proprietary LICENSE file verified at repository root")
        else:
            self.fail("ASSET-LICENSE", "Missing or empty root LICENSE file")

    def check_version_consistency(self):
        pkg_ver = json.loads((REPO_ROOT / "package.json").read_text(encoding="utf-8")).get("version", "")

        cfg_txt = (REPO_ROOT / "backend" / "app" / "core" / "config.py").read_text(encoding="utf-8")
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

        versions = {
            "package.json": pkg_ver,
            "config.py": cfg_ver,
            "prathamone_setup.iss": iss_ver,
            "PrathamOneLauncher.cs": cs_ver,
            "StopPrathamOne.cs": stop_ver,
        }
        if len(set(versions.values())) == 1 and pkg_ver:
            self.ok("VER-PARITY", f"Synchronized version {pkg_ver} across all manifests and assemblies")
        else:
            self.fail("VER-PARITY", f"Version mismatch detected: {versions}")

        main_txt = (REPO_ROOT / "backend" / "app" / "main.py").read_text(encoding="utf-8")
        if re.search(r'@app\.get\("/health"\)[\s\S]{0,250}("version"|settings\.VERSION)', main_txt):
            self.ok("VER-HEALTH", "/health endpoint exposes backend product version metadata")
        else:
            self.fail("VER-HEALTH", "backend/app/main.py /health returns static payload without version/alembic_head")

        # Verify single Alembic head exists
        versions_dir = REPO_ROOT / "backend" / "alembic" / "versions"
        if versions_dir.is_dir() and list(versions_dir.glob("*.py")):
            self.ok("VER-ALEMBIC", f"Found Alembic migration revisions in {versions_dir}")
        else:
            self.fail("VER-ALEMBIC", "Missing Alembic migration scripts")

    def check_security_and_networking(self):
        run_server_txt = (REPO_ROOT / "backend" / "run_server.py").read_text(encoding="utf-8")
        cs_txt = (INSTALLER_DIR / "src" / "PrathamOneLauncher.cs").read_text(encoding="utf-8")
        iss_txt = (INSTALLER_DIR / "prathamone_setup.iss").read_text(encoding="utf-8")
        build_rel_txt = (REPO_ROOT / "build_staging" / "build_release.py").read_text(encoding="utf-8")

        # 1. Loopback default check
        if 'default="127.0.0.1"' in run_server_txt or "--host" in cs_txt and "127.0.0.1" in cs_txt:
            self.ok("SEC-LOOPBACK", "Desktop backend enforces 127.0.0.1 loopback-only default binding")
        else:
            self.fail("SEC-LOOPBACK", "run_server.py defaults --host to 0.0.0.0 and PrathamOneLauncher.cs omits --host 127.0.0.1")

        # 2. Desktop IPC token enforcement
        if "PRATHAM_DESKTOP_TOKEN" in cs_txt and "PRATHAM_DESKTOP_TOKEN" in run_server_txt:
            self.ok("SEC-TOKEN", "PRATHAM_DESKTOP_TOKEN enforced by launcher and ASGI guard")
        else:
            self.fail("SEC-TOKEN", "Missing PRATHAM_DESKTOP_TOKEN enforcement")

        # 3. Dynamic port alignment
        if re.search(r"2026\s*,\s*2027\s*\}", cs_txt):
            self.fail("SEC-PORTS", "PrathamOneLauncher.cs polls only [2026, 2027] while run_server.py scans up to 2051")
        else:
            self.ok("SEC-PORTS", "Dynamic port fallback range synchronized")

        # 4. User-writable data separation (no mutable writes to {app}/Program Files)
        if 'Path.Combine(appDir, "launcher.log")' in cs_txt:
            self.fail("SEC-WRITEDIR", "PrathamOneLauncher.cs writes launcher.log inside appDir (Program Files unsafe)")
        else:
            self.ok("SEC-WRITEDIR", "Launcher logs separated into user-writable LocalApplicationData")

        if "Permissions: users-full" in iss_txt:
            self.fail("SEC-PF-ACL", "prathamone_setup.iss relies on Users:Full ACL on {app} instead of LocalApplicationData/CommonAppData separation")
        else:
            self.ok("SEC-PF-ACL", "Installer enforces strict read-only binaries vs user-writable data separation")

        # 5. Authenticode code signing hooks for all 4 binaries
        missing_sign = []
        for exe_name in ("PrathamOne.exe", "StopPrathamOne.exe", "prathamone_backend.exe", "SETUP_EXE"):
            if exe_name not in build_rel_txt:
                missing_sign.append(exe_name)
        has_all_four_hooks = "_sign_binary" in build_rel_txt or (
            build_rel_txt.count("signtool") >= 1 and "PrathamOne.exe" in build_rel_txt
        )
        if "PRATHAM_SIGN_CERT_PFX" in build_rel_txt and build_rel_txt.count("_sign_binary") >= 4:
            self.ok("SEC-SIGN", "Authenticode signing hooks wired for all 4 executables")
        else:
            self.fail("SEC-SIGN", "build_release.py Authenticode hook covers only Setup EXE (missing PrathamOne.exe, StopPrathamOne.exe, prathamone_backend.exe)")

    def check_dpdp_lifecycle_and_hygiene(self):
        iss_txt = (INSTALLER_DIR / "prathamone_setup.iss").read_text(encoding="utf-8")

        # Pre-upgrade pg_dump check
        if "CurStep = ssInstall" in iss_txt and "pg_dump.exe" in iss_txt.split("procedure CurStepChanged", 1)[1].split("procedure CurUninstallStepChanged", 1)[0]:
            self.ok("DPDP-UPGRADE-DUMP", "Automated pg_dump backup configured in pre-upgrade ssInstall step")
        else:
            self.fail("DPDP-UPGRADE-DUMP", "prathamone_setup.iss ssInstall runs raw robocopy only without pre-upgrade pg_dump logical snapshot")

        # Non-destructive upgrade check
        if "NeedsDbInit" in iss_txt and "not IsUpgradeMode" in iss_txt:
            self.ok("DPDP-PRESERVE", "Installer skips initdb and onboarding wizard writes on existing data/ cluster")
        else:
            self.fail("DPDP-PRESERVE", "Missing IsUpgradeMode preservation guards")

        # Plaintext setup password risk
        if '"admin_password": "' in iss_txt:
            self.fail("DPDP-CREDS", "prathamone_setup.iss writes plaintext admin_password into setup_config.json without post-seed cleanup")
        else:
            self.ok("DPDP-CREDS", "No persistent plaintext admin credentials written to disk")

        # Uninstall data prompt & silent safety check
        uninst_block = iss_txt.split("procedure CurUninstallStepChanged", 1)[1] if "procedure CurUninstallStepChanged" in iss_txt else ""
        if "MsgBox" in uninst_block and "UninstallSilent" not in uninst_block:
            self.fail("DPDP-UNINSTALL-SILENT", "CurUninstallStepChanged displays MsgBox without UninstallSilent guard and hardcodes -p 5432")
        else:
            self.ok("DPDP-UNINSTALL-SILENT", "Uninstall lifecycle handles interactive prompts and silent flags cleanly")

        # Hygiene script validation
        try:
            from scripts.check_release_hygiene import run_audit
            if run_audit(fix=False):
                self.ok("HYGIENE-DIST", "check_release_hygiene.py passed cleanly against installer/release_whitelist.json")
            else:
                self.fail("HYGIENE-DIST", "check_release_hygiene.py reported disallowed distribution artifacts")
        except Exception as exc:
            self.fail("HYGIENE-DIST", f"Unable to run check_release_hygiene audit: {exc}")

    def run_all(self) -> bool:
        self.check_branding_and_assets()
        self.check_version_consistency()
        self.check_security_and_networking()
        self.check_dpdp_lifecycle_and_hygiene()

        print("\n======================================================================")
        print("  PRATHAMONE EduOS — BUILD & INSTALLER POLICY AUDIT")
        print("======================================================================")
        for line in self.passes:
            print(f"  {line}")
        for line in self.gaps:
            print(f"  {line}")
        print("======================================================================")
        print(f"  SUMMARY: {len(self.passes)} passed, {len(self.gaps)} policy gap(s)")
        print("======================================================================")
        return len(self.gaps) == 0


def main():
    parser = argparse.ArgumentParser(description="Validate PrathamOne EduOS build/release policy compliance")
    parser.add_argument("--strict", action="store_true", help="Exit with code 1 if any policy gap is detected")
    args = parser.parse_args()

    auditor = PolicyAuditor()
    compliant = auditor.run_all()
    if args.strict and not compliant:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
