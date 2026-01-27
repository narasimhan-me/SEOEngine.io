"""
Unit tests for Canonical Verification Report Contract.

PATCH BATCH: AUTONOMOUS-AGENT-RESUME-STATE-MACHINE-RECONCILE-1 - PATCH 4

Tests:
- Canonical path builder returns reports/KAN-17-verification.md
- Verifier only looks for canonical path
- Fail-fast with remediation when missing
"""

import unittest
import tempfile
from pathlib import Path
import sys

# Import the engine module
sys.path.insert(0, str(Path(__file__).parent.parent))

from engine import (
    _canonical_verification_report_relpath,
    _expected_verification_report_path,
    _resolve_verification_report,
    _verify_canonical_report_or_fail_fast,
    _find_near_match_reports,
)


class TestCanonicalPathBuilder(unittest.TestCase):
    """Test canonical path builder."""

    def test_returns_correct_format(self):
        """Canonical path is reports/{ISSUE_KEY}-verification.md."""
        path = _canonical_verification_report_relpath("KAN-17")
        self.assertEqual(path, "reports/KAN-17-verification.md")

    def test_different_issue_keys(self):
        """Works with different issue key formats."""
        self.assertEqual(
            _canonical_verification_report_relpath("KAN-17"),
            "reports/KAN-17-verification.md"
        )
        self.assertEqual(
            _canonical_verification_report_relpath("EA-19"),
            "reports/EA-19-verification.md"
        )
        self.assertEqual(
            _canonical_verification_report_relpath("PROJ-123"),
            "reports/PROJ-123-verification.md"
        )


class TestExpectedVerificationReportPath(unittest.TestCase):
    """Test expected verification report path function."""

    def test_returns_canonical_path(self):
        """Always returns canonical path regardless of parameters."""
        # Basic call
        path = _expected_verification_report_path("KAN-17")
        self.assertEqual(path, "reports/KAN-17-verification.md")

        # With description (ignored in PATCH 4)
        path = _expected_verification_report_path("KAN-17", "Some description")
        self.assertEqual(path, "reports/KAN-17-verification.md")

        # With run_id (ignored in PATCH 4)
        path = _expected_verification_report_path("KAN-17", "", "20260127-120000Z")
        self.assertEqual(path, "reports/KAN-17-verification.md")


class TestResolveVerificationReport(unittest.TestCase):
    """Test verification report resolution."""

    def test_finds_canonical_path(self):
        """Finds report at canonical path."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create canonical report
            reports_dir = Path(tmpdir) / "reports"
            reports_dir.mkdir()
            (reports_dir / "KAN-17-verification.md").write_text("# Report")

            path = _resolve_verification_report(tmpdir, "KAN-17")
            self.assertEqual(path, "reports/KAN-17-verification.md")

    def test_returns_none_when_missing(self):
        """Returns None when report not at canonical path."""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = _resolve_verification_report(tmpdir, "KAN-17")
            self.assertIsNone(path)

    def test_ignores_non_canonical_paths(self):
        """Ignores reports at non-canonical paths."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create report at legacy path (not canonical)
            legacy_dir = Path(tmpdir) / "scripts" / "autonomous-agent" / "reports"
            legacy_dir.mkdir(parents=True)
            (legacy_dir / "KAN-17-verification.md").write_text("# Report")

            # Should not find it (only canonical path accepted)
            path = _resolve_verification_report(tmpdir, "KAN-17")
            self.assertIsNone(path)

    def test_ignores_timestamped_variants(self):
        """Ignores timestamped variants (only canonical accepted)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            reports_dir = Path(tmpdir) / "reports"
            reports_dir.mkdir()
            # Create timestamped variant (not canonical)
            (reports_dir / "KAN-17-20260127-120000Z-verification.md").write_text("# Wrong")

            path = _resolve_verification_report(tmpdir, "KAN-17")
            self.assertIsNone(path)


class TestVerifyCanonicalReportOrFailFast(unittest.TestCase):
    """Test fail-fast verification."""

    def test_success_when_exists(self):
        """Returns success when canonical report exists."""
        with tempfile.TemporaryDirectory() as tmpdir:
            reports_dir = Path(tmpdir) / "reports"
            reports_dir.mkdir()
            (reports_dir / "KAN-17-verification.md").write_text("# Report")

            exists, path, remediation = _verify_canonical_report_or_fail_fast(tmpdir, "KAN-17")

            self.assertTrue(exists)
            self.assertEqual(path, "reports/KAN-17-verification.md")
            self.assertIsNone(remediation)

    def test_fail_fast_when_missing(self):
        """Returns fail-fast with remediation when missing."""
        with tempfile.TemporaryDirectory() as tmpdir:
            exists, path, remediation = _verify_canonical_report_or_fail_fast(tmpdir, "KAN-17")

            self.assertFalse(exists)
            self.assertIsNone(path)
            self.assertIsNotNone(remediation)
            self.assertIn("Expected path:", remediation)
            self.assertIn("reports/KAN-17-verification.md", remediation)

    def test_includes_near_matches_in_remediation(self):
        """Remediation includes near-match files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create near-match files (not at canonical path)
            reports_dir = Path(tmpdir) / "reports"
            reports_dir.mkdir()
            (reports_dir / "KAN-17-20260127-120000Z-verification.md").write_text("# Wrong path")

            legacy_dir = Path(tmpdir) / "scripts" / "autonomous-agent" / "reports"
            legacy_dir.mkdir(parents=True)
            (legacy_dir / "KAN-17-verification.md").write_text("# Legacy")

            exists, path, remediation = _verify_canonical_report_or_fail_fast(tmpdir, "KAN-17")

            self.assertFalse(exists)
            self.assertIn("Near-matches found", remediation)


class TestFindNearMatchReports(unittest.TestCase):
    """Test near-match report finder."""

    def test_finds_matches_in_both_directories(self):
        """Finds near-matches in reports/ and scripts/autonomous-agent/reports/."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create files in repo root reports/
            reports_dir = Path(tmpdir) / "reports"
            reports_dir.mkdir()
            (reports_dir / "KAN-17-20260127-verification.md").write_text("# Match 1")

            # Create files in legacy location
            legacy_dir = Path(tmpdir) / "scripts" / "autonomous-agent" / "reports"
            legacy_dir.mkdir(parents=True)
            (legacy_dir / "KAN-17-verification.md").write_text("# Match 2")

            matches = _find_near_match_reports(tmpdir, "KAN-17")

            self.assertEqual(len(matches), 2)

    def test_returns_empty_when_no_matches(self):
        """Returns empty list when no matches."""
        with tempfile.TemporaryDirectory() as tmpdir:
            matches = _find_near_match_reports(tmpdir, "KAN-99")
            self.assertEqual(matches, [])


if __name__ == '__main__':
    unittest.main()
