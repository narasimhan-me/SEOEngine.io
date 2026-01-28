"""
Unit tests for Verifier Fail-Fast Remediation.

PATCH BATCH: AUTONOMOUS-AGENT-RESUME-STATE-MACHINE-RECONCILE-1 - FIXUP-1 PATCH 2

Tests:
- When canonical report missing, verify_work_item() adds comment with expected path + near-matches
- _verify_canonical_report_or_fail_fast() returns proper remediation message
"""

import unittest
import tempfile
from pathlib import Path
import sys

# Import the engine module
sys.path.insert(0, str(Path(__file__).parent.parent))

from engine import (
    _verify_canonical_report_or_fail_fast,
    _canonical_verification_report_relpath,
    _find_near_match_reports,
)


class TestVerifyCanonicalReportOrFailFast(unittest.TestCase):
    """Test _verify_canonical_report_or_fail_fast function."""

    def test_returns_true_when_canonical_exists(self):
        """Returns (True, path, None) when canonical report exists."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create canonical report
            reports_dir = Path(tmpdir) / "reports"
            reports_dir.mkdir()
            canonical_path = reports_dir / "KAN-17-verification.md"
            canonical_path.write_text("## Checklist\n- [x] Done")

            exists, path, remediation = _verify_canonical_report_or_fail_fast(tmpdir, "KAN-17")

            self.assertTrue(exists)
            self.assertEqual(path, "reports/KAN-17-verification.md")
            self.assertIsNone(remediation)

    def test_returns_false_with_remediation_when_missing(self):
        """Returns (False, None, remediation) when canonical report missing."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create reports directory but no canonical report
            reports_dir = Path(tmpdir) / "reports"
            reports_dir.mkdir()

            exists, path, remediation = _verify_canonical_report_or_fail_fast(tmpdir, "KAN-17")

            self.assertFalse(exists)
            self.assertIsNone(path)
            self.assertIsNotNone(remediation)
            self.assertIn("reports/KAN-17-verification.md", remediation)

    def test_remediation_includes_expected_path(self):
        """Remediation message includes expected canonical path."""
        with tempfile.TemporaryDirectory() as tmpdir:
            exists, path, remediation = _verify_canonical_report_or_fail_fast(tmpdir, "KAN-99")

            self.assertIn("Expected path:", remediation)
            self.assertIn("reports/KAN-99-verification.md", remediation)

    def test_remediation_includes_near_matches(self):
        """Remediation message includes near-matches when found."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create near-match reports (not canonical)
            reports_dir = Path(tmpdir) / "reports"
            reports_dir.mkdir()
            near_match1 = reports_dir / "KAN-17-20260127-143047Z-verification.md"
            near_match1.write_text("## Checklist\n- [x] Done")

            script_reports = Path(tmpdir) / "scripts" / "autonomous-agent" / "reports"
            script_reports.mkdir(parents=True)
            near_match2 = script_reports / "KAN-17-20260126-120000Z-verification.md"
            near_match2.write_text("## Checklist\n- [x] Done")

            exists, path, remediation = _verify_canonical_report_or_fail_fast(tmpdir, "KAN-17")

            self.assertFalse(exists)
            self.assertIn("Near-matches found", remediation)
            self.assertIn("KAN-17-20260127-143047Z-verification.md", remediation)

    def test_remediation_no_near_matches_message(self):
        """Remediation message says 'No near-matches found' when none exist."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create reports directory but no reports
            reports_dir = Path(tmpdir) / "reports"
            reports_dir.mkdir()

            exists, path, remediation = _verify_canonical_report_or_fail_fast(tmpdir, "KAN-99")

            self.assertFalse(exists)
            self.assertIn("No near-matches found", remediation)


class TestFindNearMatchReports(unittest.TestCase):
    """Test _find_near_match_reports function."""

    def test_finds_reports_in_repo_root_reports_dir(self):
        """Finds near-match reports in reports/ directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            reports_dir = Path(tmpdir) / "reports"
            reports_dir.mkdir()
            near_match = reports_dir / "KAN-17-20260127-verification.md"
            near_match.write_text("content")

            matches = _find_near_match_reports(tmpdir, "KAN-17")

            self.assertEqual(len(matches), 1)
            self.assertIn("KAN-17-20260127-verification.md", matches[0])

    def test_finds_reports_in_scripts_autonomous_agent_reports(self):
        """Finds near-match reports in scripts/autonomous-agent/reports/ directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            script_reports = Path(tmpdir) / "scripts" / "autonomous-agent" / "reports"
            script_reports.mkdir(parents=True)
            near_match = script_reports / "KAN-17-20260127-verification.md"
            near_match.write_text("content")

            matches = _find_near_match_reports(tmpdir, "KAN-17")

            self.assertEqual(len(matches), 1)
            self.assertIn("KAN-17", matches[0])

    def test_does_not_find_unrelated_reports(self):
        """Does not find reports for different issue keys."""
        with tempfile.TemporaryDirectory() as tmpdir:
            reports_dir = Path(tmpdir) / "reports"
            reports_dir.mkdir()
            unrelated = reports_dir / "KAN-99-verification.md"
            unrelated.write_text("content")

            matches = _find_near_match_reports(tmpdir, "KAN-17")

            self.assertEqual(len(matches), 0)


class TestCanonicalVerificationReportRelpath(unittest.TestCase):
    """Test _canonical_verification_report_relpath function."""

    def test_returns_canonical_path_format(self):
        """Returns reports/{ISSUE_KEY}-verification.md format."""
        path = _canonical_verification_report_relpath("KAN-17")
        self.assertEqual(path, "reports/KAN-17-verification.md")

    def test_no_timestamp_in_path(self):
        """Canonical path does not include timestamp/run_id."""
        path = _canonical_verification_report_relpath("KAN-99")
        self.assertNotIn("20260", path)  # No year pattern
        self.assertEqual(path, "reports/KAN-99-verification.md")


if __name__ == '__main__':
    unittest.main()
