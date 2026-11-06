# /**
#  * @file        test_auto_version.py
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
#  * @description Pytest test suite verifying automated semantic version calculation from revision history and task classifications.
#  */

import os
import sys
import pytest

# Add scripts directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "scripts")))

try:
    from auto_version import (
        classify_commit_type,
        calculate_version_from_revisions,
        parse_semver,
        BASELINE_VERSION,
    )
except ImportError:
    # If running inside Docker /app container where scripts are at /app/scripts
    sys.path.insert(0, "/app/scripts")
    from auto_version import (
        classify_commit_type,
        calculate_version_from_revisions,
        parse_semver,
        BASELINE_VERSION,
    )


def test_classify_commit_type():
    assert classify_commit_type("feat(workforce): implement teacher workspace") == "minor"
    assert classify_commit_type("feat: add digital student id cards") == "minor"
    assert classify_commit_type("feature: support offline sync") == "minor"
    assert classify_commit_type("fix(rbac): resolve sysadmin visibility") == "patch"
    assert classify_commit_type("fix: payment calculation rounding") == "patch"
    assert classify_commit_type("docs: update user manuals") == "patch"
    assert classify_commit_type("chore(rebrand): baseline reset") == "patch"
    assert classify_commit_type("feat!: breaking architectural migration") == "major"
    assert classify_commit_type("refactor: remove legacy tables\n\nBREAKING CHANGE: schema changed") == "major"


def test_calculate_version_from_revisions():
    mock_commits = [
        {"short_hash": "c1", "subject": "feat(payroll): payroll module", "type": "minor"},
        {"short_hash": "c2", "subject": "feat(docs): docs manager", "type": "minor"},
        {"short_hash": "c3", "subject": "docs: audit report", "type": "patch"},
        {"short_hash": "c4", "subject": "feat(comm): whatsapp automation", "type": "minor"},
        {"short_hash": "c5", "subject": "feat(student): digital id cards", "type": "minor"},
        {"short_hash": "c6", "subject": "feat(exam): report cards", "type": "minor"},
        {"short_hash": "c7", "subject": "feat(payments): online gateway", "type": "minor"},
        {"short_hash": "c8", "subject": "feat(workforce): workforce dashboards", "type": "minor"},
    ]

    version, build_number, stats = calculate_version_from_revisions(mock_commits)

    # 1.0.0 base + 7 features = 1.7.0 (with 1 patch reset upon latest feature)
    assert version == "1.7.0"
    assert stats["revision_count"] == 8
    assert stats["feature_count"] == 7
    assert stats["latest_hash"] == "C8"
    assert "REV-008" in build_number


def test_calculate_version_with_subsequent_patch():
    mock_commits = [
        {"short_hash": "c1", "subject": "feat(workforce): workforce dashboards", "type": "minor"},
        {"short_hash": "c2", "subject": "fix(workforce): table alignment correction", "type": "patch"},
    ]

    version, build_number, stats = calculate_version_from_revisions(mock_commits)

    # 1.0.0 base + 1 feat = 1.1.0, then + 1 patch = 1.1.1
    assert version == "1.1.1"
    assert stats["revision_count"] == 2
    assert stats["patch_count"] == 1


def test_calculate_version_with_upcoming_task():
    mock_commits = [
        {"short_hash": "c1", "subject": "feat(workforce): workforce dashboards", "type": "minor"},
    ]

    # Pre-computing version for an upcoming feature task
    version, build_number, stats = calculate_version_from_revisions(mock_commits, next_task_type="minor")

    # 1.0.0 base + 1 feat = 1.1.0, next feat = 1.2.0
    assert version == "1.2.0"
    assert stats["revision_count"] == 2


def test_parse_semver():
    assert parse_semver("1.0.0") == (1, 0, 0, None)
    assert parse_semver("v1.7.0") == (1, 7, 0, None)
    assert parse_semver("2.1.3-rc1") == (2, 1, 3, "rc1")

    with pytest.raises(ValueError):
        parse_semver("invalid-version")
