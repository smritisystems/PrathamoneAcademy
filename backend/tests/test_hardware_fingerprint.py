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
#  * @updated     2026-11-21
#  *
#  * @description Unit test suite for hardware node-locking, machine fingerprinting, and copy-prevention verification.
#  */

import pytest
from app.core.hardware import (
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
