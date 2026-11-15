# /**
#  * @file        stage_python.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts.stage_python
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
#  * @description Stages the active Python 3.11 environment and required site-packages
#  */

import os
import shutil
import sys
from pathlib import Path


def stage_python_environment():
    root_dir = Path(__file__).resolve().parent.parent
    dest_dir = root_dir / "build_staging" / "python"
    dest_dir.mkdir(parents=True, exist_ok=True)

    if (dest_dir / "python.exe").exists() and (dest_dir / "Lib" / "site-packages").exists():
        print(f"[PYTHON] Staged Python environment already verified at: {dest_dir / 'python.exe'}")
        return

    src_py = Path(sys.executable).parent
    print(f"[PYTHON] Staging Python 3.11 from: {src_py} -> {dest_dir}...")

    # Copy root binaries and DLLs
    for item in src_py.glob("*.*"):
        if item.is_file() and item.suffix.lower() in [".exe", ".dll"]:
            shutil.copy2(item, dest_dir / item.name)

    # Copy DLLs
    src_dlls = src_py / "DLLs"
    if src_dlls.exists():
        print("[PYTHON] Copying DLLs...")
        shutil.copytree(src_dlls, dest_dir / "DLLs", dirs_exist_ok=True)

    # Copy Lib (excluding __pycache__ and test suites)
    src_lib = src_py / "Lib"
    if src_lib.exists():
        print("[PYTHON] Copying Lib and site-packages (excluding caches)...")
        shutil.copytree(
            src_lib,
            dest_dir / "Lib",
            dirs_exist_ok=True,
            ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "test", "tests", "idlelib", "tcl8*", "tkinter"),
        )

    print(f"[PYTHON SUCCESS] Python environment staged at: {dest_dir}")
    print(f"  python.exe: {dest_dir / 'python.exe'}")


if __name__ == "__main__":
    stage_python_environment()
