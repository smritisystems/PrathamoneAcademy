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
#  * @updated     2026-11-27
#  *
#  * @description Cryptographic hardware node-locking engine. Extracts immutable motherboard,
#  */

import hashlib
import json
import logging
import os
import subprocess
import time
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)

_HARDWARE_SALT = b"PRATHAMONE-EDUOS-HARDWARE-NODE-LOCK-V1-2026"
_WMI_TIMEOUT_SECONDS = 8.0
_WMI_MAX_ATTEMPTS = 3
_INVALID_VALUES = ("", "UNKNOWN", "UNKNOWN_GUID", None)
_CACHED_HW_COMPONENTS: Optional[Dict[str, str]] = None


def is_hardware_probe_complete(comps: Optional[Dict[str, str]] = None) -> bool:
    """Return True when all immutable hardware components resolved cleanly on this platform."""
    target = comps if comps is not None else get_hardware_components()
    if os.name != "nt":
        return True
    return all(
        target.get(k) not in _INVALID_VALUES
        for k in ("motherboard_uuid", "cpu_id", "disk_serial", "machine_guid")
    )


def _reset_hardware_cache() -> None:
    """Clear in-memory hardware fingerprint cache (primarily for tests)."""
    global _CACHED_HW_COMPONENTS
    _CACHED_HW_COMPONENTS = None


def _get_registry_machine_guid() -> str:
    """Reads Windows Cryptography MachineGuid from registry."""
    if os.name != "nt":
        return "NON_NT_SYSTEM"
    try:
        import winreg
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Cryptography") as key:
            val, _ = winreg.QueryValueEx(key, "MachineGuid")
            return str(val).strip() or "UNKNOWN_GUID"
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
            timeout=_WMI_TIMEOUT_SECONDS,
        ).decode("utf-8", errors="ignore").strip()
        return output or "UNKNOWN"
    except Exception as exc:
        logger.debug("WMI query failed for '%s': %s", cmd_snippet, exc)
        return "UNKNOWN"


def _query_wmi_batch() -> Tuple[str, str, str]:
    """
    Fetch motherboard UUID, CPU ProcessorId, and primary disk serial in a single
    PowerShell CIM invocation so cold-start overhead occurs once instead of 3 times.
    """
    ps_script = (
        "$ErrorActionPreference='SilentlyContinue';"
        "$u=[string](Get-CimInstance Win32_ComputerSystemProduct).UUID;"
        "$c=[string](Get-CimInstance Win32_Processor | Select-Object -First 1).ProcessorId;"
        "$d=[string](Get-CimInstance Win32_DiskDrive | Sort-Object Index | Select-Object -First 1).SerialNumber;"
        "@{u=$u.Trim();c=$c.Trim();d=$d.Trim()} | ConvertTo-Json -Compress"
    )
    raw = _query_wmi_property(ps_script)
    if raw in ("UNKNOWN", "NON_NT_SYSTEM"):
        return "UNKNOWN", "UNKNOWN", "UNKNOWN"
    try:
        parsed = json.loads(raw)
        if not isinstance(parsed, dict):
            return "UNKNOWN", "UNKNOWN", "UNKNOWN"
        return (
            str(parsed.get("u") or "").strip() or "UNKNOWN",
            str(parsed.get("c") or "").strip() or "UNKNOWN",
            str(parsed.get("d") or "").strip() or "UNKNOWN",
        )
    except Exception as exc:
        logger.debug("Failed to parse batched WMI hardware output: %s", exc)
        return "UNKNOWN", "UNKNOWN", "UNKNOWN"


def get_hardware_components() -> Dict[str, str]:
    """
    Extracts raw hardware component identifiers from the physical machine.
    Only caches complete, healthy reads so transient WMI startup timeouts never
    poison the process-lifetime hardware identity with degraded values.
    """
    global _CACHED_HW_COMPONENTS
    if _CACHED_HW_COMPONENTS is not None:
        return dict(_CACHED_HW_COMPONENTS)

    if os.name != "nt":
        comps = {
            "motherboard_uuid": "DEV-CONTAINER-MOTHERBOARD-UUID",
            "cpu_id": "DEV-CONTAINER-CPUID",
            "disk_serial": "DEV-CONTAINER-DISK-SERIAL",
            "machine_guid": "DEV-CONTAINER-GUID",
            "platform": os.name,
        }
        _CACHED_HW_COMPONENTS = comps
        return dict(comps)

    motherboard_uuid, cpu_id, disk_serial = _query_wmi_batch()
    for _attempt in range(1, _WMI_MAX_ATTEMPTS):
        if motherboard_uuid != "UNKNOWN" and cpu_id != "UNKNOWN" and disk_serial != "UNKNOWN":
            break
        if _attempt > 1:
            time.sleep(0.25)
        if motherboard_uuid == "UNKNOWN":
            motherboard_uuid = _query_wmi_property("[string](Get-CimInstance Win32_ComputerSystemProduct).UUID")
        if cpu_id == "UNKNOWN":
            cpu_id = _query_wmi_property("[string](Get-CimInstance Win32_Processor | Select-Object -First 1).ProcessorId")
        if disk_serial == "UNKNOWN":
            disk_serial = _query_wmi_property("[string](Get-CimInstance Win32_DiskDrive | Sort-Object Index | Select-Object -First 1).SerialNumber")

    machine_guid = _get_registry_machine_guid()
    comps = {
        "motherboard_uuid": motherboard_uuid,
        "cpu_id": cpu_id,
        "disk_serial": disk_serial,
        "machine_guid": machine_guid,
        "platform": "windows",
    }

    # Cache in memory ONLY when all 4 physical components resolved cleanly
    if is_hardware_probe_complete(comps):
        _CACHED_HW_COMPONENTS = comps
    else:
        logger.warning(
            "Incomplete hardware probe on Windows host (mb=%s, cpu=%s, disk=%s, guid=%s); skipping cache.",
            motherboard_uuid != "UNKNOWN",
            cpu_id != "UNKNOWN",
            disk_serial != "UNKNOWN",
            machine_guid != "UNKNOWN_GUID",
        )

    return dict(comps)


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

    target_clean = target_hardware_id.strip().upper()

    # Enterprise signed wildcard OR explicit opt-in developer override
    if target_clean == "PRATHAM-WILDCARD-UNRESTRICTED":
        return True, "Wildcard enterprise developer license verified."
    if target_clean == "PRATHAM-DEV-MASTER-ALL" and os.getenv("PRATHAM_ALLOW_DEV_MASTER_LICENSE") == "1":
        return True, "Developer master license verified."

    comps = get_hardware_components()
    if os.name == "nt" and not is_hardware_probe_complete(comps):
        return False, "Insufficient immutable hardware identifiers detected on host (transient WMI probe timeout)."

    current_hw_id = get_machine_hardware_fingerprint()
    current_clean = current_hw_id.strip().upper()

    if target_clean == current_clean:
        return True, "Hardware identity verified and matched."

    return False, f"Hardware mismatch detected! Machine '{current_clean}' does not match registered license target '{target_clean}'."
