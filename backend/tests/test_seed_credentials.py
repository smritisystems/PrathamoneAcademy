# /**
#  * @file        test_seed_credentials.py
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
#  * @created     2026-11-14
#  * @updated     2026-11-14
#  *
#  * @description Tests secure bootstrap administrator password validation.
#  */

import pytest

from seed import validate_bootstrap_password


def test_initial_admin_password_requires_a_value():
    with pytest.raises(RuntimeError, match="initial administrator password is required"):
        validate_bootstrap_password(None, "administrator")

    with pytest.raises(RuntimeError, match="initial administrator password is required"):
        validate_bootstrap_password("                ", "administrator")


def test_initial_admin_password_requires_minimum_length():
    with pytest.raises(ValueError, match="at least 14 characters"):
        validate_bootstrap_password("short-pass", "administrator")


def test_initial_admin_password_accepts_long_unique_value():
    password = "local-install-secret-2026"
    assert validate_bootstrap_password(password, "administrator") == password
