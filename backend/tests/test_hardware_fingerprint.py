# /**
#  * @file        test_hardware_fingerprint.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.tests
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
#  * @description Unit test suite for hardware node-locking, machine fingerprinting, and copy-prevention verification.
#  */

import os
import pytest
from app.core import hardware
from app.core.hardware import (
    _reset_hardware_cache,
    get_hardware_components,
    get_machine_hardware_fingerprint,
    verify_hardware_fingerprint,
)


def test_hardware_components_structure():
    comps = get_hardware_components()
    assert isinstance(comps, dict)
    assert "motherboard_uuid" in comps
    assert "cpu_id" in comps
    assert "disk_serial" in comps
    assert "machine_guid" in comps
    assert "platform" in comps


def test_hardware_fingerprint_format():
    hw_id = get_machine_hardware_fingerprint()
    assert isinstance(hw_id, str)
    assert hw_id.startswith("PRATHAM-")
    # Verify standard token format PRATHAM-XXXX-XXXX-XXXX-XXXX
    parts = hw_id.split("-")
    assert len(parts) == 5
    assert parts[0] == "PRATHAM"
    for part in parts[1:]:
        assert len(part) == 4
        assert part.isalnum()


def test_hardware_fingerprint_consistency():
    # Multiple calls must return identical fingerprint
    hw_id1 = get_machine_hardware_fingerprint()
    hw_id2 = get_machine_hardware_fingerprint()
    assert hw_id1 == hw_id2


def test_verify_hardware_fingerprint_match():
    current_hw_id = get_machine_hardware_fingerprint()
    is_valid, msg = verify_hardware_fingerprint(current_hw_id)
    assert is_valid is True
    assert "verified" in msg.lower()


def test_verify_hardware_fingerprint_mismatch():
    fake_hw_id = "PRATHAM-0000-1111-2222-3333"
    is_valid, msg = verify_hardware_fingerprint(fake_hw_id)
    assert is_valid is False
    assert "mismatch" in msg.lower()


def test_verify_hardware_fingerprint_wildcard():
    is_valid, msg = verify_hardware_fingerprint("PRATHAM-WILDCARD-UNRESTRICTED")
    assert is_valid is True


def test_transient_wmi_timeout_does_not_poison_cache(monkeypatch):
    """A transient WMI timeout must never cache a degraded fingerprint or hash ProcessorNameString."""
    _reset_hardware_cache()
    monkeypatch.setattr(hardware.os, "name", "nt")
    monkeypatch.setattr(hardware, "_get_registry_machine_guid", lambda: "080ca378-b70a-41d3-b533-89e9e56ef97a")

    calls = {"count": 0}

    def _mock_batch():
        calls["count"] += 1
        if calls["count"] == 1:
            return ("D494AFEF-4878-E911-B5AD-00D8615DBA73", "UNKNOWN", "EVSI512G09202272217")
        return ("D494AFEF-4878-E911-B5AD-00D8615DBA73", "BFEBFBFF000906EA", "EVSI512G09202272217")

    wmi_prop_calls = {"n": 0}

    def _mock_prop(_cmd: str) -> str:
        wmi_prop_calls["n"] += 1
        # Retry still fails once during initial degraded startup, recovers on next call
        return "UNKNOWN" if wmi_prop_calls["n"] == 1 else "BFEBFBFF000906EA"

    monkeypatch.setattr(hardware, "_query_wmi_batch", _mock_batch)
    monkeypatch.setattr(hardware, "_query_wmi_property", _mock_prop)

    degraded = get_hardware_components()
    assert degraded["cpu_id"] == "UNKNOWN"
    assert hardware._CACHED_HW_COMPONENTS is None

    recovered = get_machine_hardware_fingerprint()
    assert recovered == "PRATHAM-B347-9CFE-842B-E65C"
    assert hardware._CACHED_HW_COMPONENTS is not None
    _reset_hardware_cache()
