# /**
#  * @file        test_codex_engine.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.tests
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-06
#  * @updated     2026-11-06
#  *
#  * @description Unit test suite validating CodeX bijective digit mapping, encoding, decoding, security PIN, and disabled default policy.
#  */

import pytest
from app.core.config import settings
from app.services.codex_service import (
    DEFAULT_DIGIT_MAP,
    validate_digit_map,
    encode_numeric_value,
    decode_coded_value,
    CodeXService,
)


def test_codex_mandatory_system_default_is_disabled():
    """Verify that CodeX system defaults strictly enforce DISABLED (OFF)."""
    assert settings.CODEX_SYSTEM_DEFAULT is False
    assert settings.CODEX_AUTO_ACTIVATION is False
    assert settings.CODEX_NEW_BUSINESS_DEFAULT is False
    assert settings.CODEX_NEW_USER_DEFAULT is False
    assert settings.CODEX_AUTO_ENABLE_ON_UPDATE is False
    assert settings.CODEX_AUTO_ENABLE_ON_INSTALL is False


def test_digit_map_validation():
    """Verify that mapping dictionary must be strictly bijective with 10 unique symbols."""
    # 1. Valid default map
    valid, err = validate_digit_map(DEFAULT_DIGIT_MAP)
    assert valid is True
    assert err is None

    # 2. Duplicate symbol rejection
    duplicate_map = DEFAULT_DIGIT_MAP.copy()
    duplicate_map["9"] = "Q"  # 'Q' already mapped to '0'
    valid, err = validate_digit_map(duplicate_map)
    assert valid is False
    assert "must be unique" in err

    # 3. Missing digit rejection
    missing_map = {k: v for k, v in DEFAULT_DIGIT_MAP.items() if k != "5"}
    valid, err = validate_digit_map(missing_map)
    assert valid is False
    assert "Missing" in err

    # 4. Empty symbol rejection
    empty_sym_map = DEFAULT_DIGIT_MAP.copy()
    empty_sym_map["2"] = ""
    valid, err = validate_digit_map(empty_sym_map)
    assert valid is False
    assert "empty symbol" in err


def test_numeric_encoding_and_reversibility():
    """Verify bijective encoding and exact decoding across integers, decimals, and negative values."""
    digit_map = DEFAULT_DIGIT_MAP  # 0:Q, 1:A, 2:Z, 3:M, 4:K, 5:P, 6:X, 7:B, 8:T, 9:R

    # Integer test: 1250 -> 'AZPQ'
    encoded_int = encode_numeric_value(1250, digit_map, prefix="CX-")
    assert encoded_int == "CX-AZPQ"
    decoded_int, err = decode_coded_value(encoded_int, digit_map, prefix="CX-")
    assert err is None
    assert decoded_int == 1250.0

    # Decimal test: 1250.75 -> 'AZPQ.BP' (7:B, 5:P)
    encoded_dec = encode_numeric_value(1250.75, digit_map, prefix="CX-")
    assert encoded_dec == "CX-AZPQ.BP"
    decoded_dec, err = decode_coded_value(encoded_dec, digit_map, prefix="CX-")
    assert err is None
    assert decoded_dec == 1250.75

    # Negative test: -500 -> '-CX-PQQ'
    encoded_neg = encode_numeric_value(-500, digit_map, prefix="CX-")
    assert encoded_neg == "-CX-PQQ"
    decoded_neg, err = decode_coded_value(encoded_neg, digit_map, prefix="CX-")
    assert err is None
    assert decoded_neg == -500.0

    # Edge cases: 0 and large values
    encoded_zero = encode_numeric_value(0, digit_map, prefix="CX-")
    assert encoded_zero == "CX-Q"
    decoded_zero, _ = decode_coded_value(encoded_zero, digit_map, prefix="CX-")
    assert decoded_zero == 0.0

    large_val = 9876543210
    encoded_large = encode_numeric_value(large_val, digit_map, prefix="")
    assert encoded_large == "RTBXPKMZAQ"
    decoded_large, _ = decode_coded_value(encoded_large, digit_map, prefix="")
    assert decoded_large == float(large_val)


def test_pin_hashing_and_verification():
    """Verify that PIN hashing is secure and strictly verified."""
    pin = "4826"
    pin_hash = CodeXService.hash_pin(pin)
    assert pin_hash != pin
    assert len(pin_hash) == 64  # SHA-256 length

    assert CodeXService.verify_pin("4826", pin_hash) is True
    assert CodeXService.verify_pin("0000", pin_hash) is False
    assert CodeXService.verify_pin("wrong", pin_hash) is False
