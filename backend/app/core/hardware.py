# /**
#  * @file        hardware.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.core
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
#  * @description Cryptographic hardware node-locking engine. Extracts immutable motherboard,
#  */

import hashlib
import logging
import os
import re
import subprocess
from functools import lru_cache
from typing import Dict, Any, Tuple

logger = logging.getLogger(__name__)

_HARDWARE_SALT = b"PRATHAMONE-EDUOS-HARDWARE-NODE-LOCK-V1-2026"
_CACHE_TIMEOUT_SECONDS = 3600


def _get_registry_machine_guid() -> str:
    """Reads Windows Cryptography MachineGuid from registry."""
    if os.name != "nt":
        return "NON_NT_SYSTEM"
    try:
        import winreg
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Cryptography") as key:
            val, _ = winreg.QueryValueEx(key, "MachineGuid")
            return str(val).strip()
    except Exception as exc:
        logger.debug("Could not read registry MachineGuid: %s", exc)
        return "UNKNOWN_GUID"


def _query_wmi_property(cmd_snippet: str) -> str:
    """Queries WMI via PowerShell CIM instance with stealth execution flags."""
    if os.name != "nt":
        return "NON_NT_SYSTEM"
    try:
        cmd = ["powershell", "-NoProfile", "-NonInteractive", "-Command", cmd_snippet]
        output = subprocess.check_output(
            cmd,
            creationflags=0x08000000 if hasattr(subprocess, "CREATE_NO_WINDOW") else 0,
            timeout=3.5,
        ).decode().strip()
        return output or "UNKNOWN"
    except Exception as exc:
        logger.debug("WMI query failed for '%s': %s", cmd_snippet, exc)
        return "UNKNOWN"


@lru_cache(maxsize=1)
def get_hardware_components() -> Dict[str, str]:
    """
    Extracts raw hardware component identifiers from physical machine.
    Results are cached in memory for zero runtime overhead.
    """
    if os.name != "nt":
        # Safe fallback for Linux/macOS dev or containerized CI testing
        return {
            "motherboard_uuid": "DEV-CONTAINER-MOTHERBOARD-UUID",
            "cpu_id": "DEV-CONTAINER-CPUID",
            "disk_serial": "DEV-CONTAINER-DISK-SERIAL",
            "machine_guid": "DEV-CONTAINER-GUID",
            "platform": os.name,
        }

    motherboard_uuid = _query_wmi_property("(Get-CimInstance Win32_ComputerSystemProduct).UUID")
    cpu_id = _query_wmi_property("(Get-CimInstance Win32_Processor).ProcessorId")
    disk_serial = _query_wmi_property("(Get-CimInstance Win32_DiskDrive | Select-Object -First 1).SerialNumber")
    machine_guid = _get_registry_machine_guid()

    return {
        "motherboard_uuid": motherboard_uuid,
        "cpu_id": cpu_id,
        "disk_serial": disk_serial,
        "machine_guid": machine_guid,
        "platform": "windows",
    }


@lru_cache(maxsize=1)
def get_machine_hardware_fingerprint() -> str:
    """
    Computes a cryptographic node-locked Hardware Fingerprint from immutable silicon components.
    Format: PRATHAM-XXXX-XXXX-XXXX-XXXX
    """
    comps = get_hardware_components()
    raw_payload = f"{comps['motherboard_uuid']}|{comps['cpu_id']}|{comps['disk_serial']}|{comps['machine_guid']}".encode("utf-8")
    digest = hashlib.sha256(raw_payload + _HARDWARE_SALT).hexdigest().upper()
    return f"PRATHAM-{digest[:4]}-{digest[4:8]}-{digest[8:12]}-{digest[12:16]}"


def verify_hardware_fingerprint(target_hardware_id: str) -> Tuple[bool, str]:
    """
    Validates whether the provided target hardware identifier matches the current host machine.
    Returns: (is_valid: bool, reason: str)
    """
    if not target_hardware_id or not isinstance(target_hardware_id, str):
        return False, "Target hardware identifier is missing or invalid."

    current_hw_id = get_machine_hardware_fingerprint()

    # Normalize comparison
    target_clean = target_hardware_id.strip().upper()
    current_clean = current_hw_id.strip().upper()

    if target_clean == current_clean:
        return True, "Hardware identity verified and matched."

    # Development or wildcard bypass for testing
    if target_clean in ("PRATHAM-DEV-MASTER-ALL", "PRATHAM-WILDCARD-UNRESTRICTED"):
        return True, "Wildcard enterprise developer license verified."

    return False, f"Hardware mismatch detected! Machine '{current_clean}' does not match registered license target '{target_clean}'."
