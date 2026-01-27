"""
Unit tests for verification report path resolution.

AUTONOMOUS-AGENT-CLAUDE-STREAMING-AND-TIMESTAMPED-REPORTS-1 PATCH 5.
FIXUP-1: Tests use pure helper directly (no filesystem IO).
"""

import unittest
from pathlib import Path

# Import the pure selection helper
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from engine import _select_newest_verification_report, CLAUDE_OUTPUT_DIRNAME


class TestReportPathResolution(unittest.TestCase):
    """Test verification report selection logic (pure, no filesystem)."""

    def test_no_reports_returns_none(self):
        """When no verification reports exist, return None."""
        result = _select_newest_verification_report("KAN-99", [])
        self.assertIsNone(result)

    def test_legacy_report_selected(self):
        """When only legacy report exists, it is selected."""
        relpaths = [f"{CLAUDE_OUTPUT_DIRNAME}/KAN-17-verification.md"]
        mtimes = {relpaths[0]: 1706300000.0}

        result = _select_newest_verification_report("KAN-17", relpaths, mtimes)
        self.assertIsNotNone(result)
        self.assertEqual(result, f"{CLAUDE_OUTPUT_DIRNAME}/KAN-17-verification.md")

    def test_timestamped_report_selected(self):
        """When only timestamped report exists, it is selected."""
        relpaths = [f"{CLAUDE_OUTPUT_DIRNAME}/KAN-17-20260126-143047Z-verification.md"]

        result = _select_newest_verification_report("KAN-17", relpaths)
        self.assertIsNotNone(result)
        self.assertIn("20260126-143047Z", result)

    def test_newest_timestamped_wins(self):
        """When multiple timestamped reports exist, newest by timestamp wins."""
        relpaths = [
            f"{CLAUDE_OUTPUT_DIRNAME}/KAN-17-20260125-100000Z-verification.md",
            f"{CLAUDE_OUTPUT_DIRNAME}/KAN-17-20260126-150000Z-verification.md",
        ]

        result = _select_newest_verification_report("KAN-17", relpaths)
        self.assertIsNotNone(result)
        self.assertIn("20260126-150000Z", result)

    def test_timestamped_beats_legacy_when_newer(self):
        """Timestamped report is selected over legacy when timestamps indicate newer."""
        relpaths = [
            f"{CLAUDE_OUTPUT_DIRNAME}/KAN-17-verification.md",
            f"{CLAUDE_OUTPUT_DIRNAME}/KAN-17-20260126-143047Z-verification.md",
        ]
        # Legacy has older mtime (2026-01-20)
        mtimes = {
            relpaths[0]: 1705795200.0,  # 2024-01-20 (old)
        }

        result = _select_newest_verification_report("KAN-17", relpaths, mtimes)
        self.assertIsNotNone(result)
        # Timestamped (2026-01-26) should win over legacy (2024-01-20 mtime)
        self.assertIn("20260126-143047Z", result)

    def test_different_issue_key_not_matched(self):
        """Reports for different issue keys are not matched."""
        relpaths = [
            f"{CLAUDE_OUTPUT_DIRNAME}/KAN-18-20260126-143047Z-verification.md",
        ]

        result = _select_newest_verification_report("KAN-17", relpaths)
        self.assertIsNone(result)

    def test_three_timestamped_newest_wins(self):
        """With three timestamped reports, the newest by parsed timestamp wins."""
        relpaths = [
            f"{CLAUDE_OUTPUT_DIRNAME}/KAN-17-20260124-080000Z-verification.md",
            f"{CLAUDE_OUTPUT_DIRNAME}/KAN-17-20260125-120000Z-verification.md",
            f"{CLAUDE_OUTPUT_DIRNAME}/KAN-17-20260126-160000Z-verification.md",
        ]

        result = _select_newest_verification_report("KAN-17", relpaths)
        self.assertIsNotNone(result)
        self.assertIn("20260126-160000Z", result)

    # PATCH 6: Tests for title-prefixed report filtering (KAN-16)

    def test_title_prefixed_report_ignored(self):
        """Title-prefixed reports should be ignored by the pure helper."""
        # The pure helper _select_newest_verification_report only considers
        # paths that start with the issue key prefix
        relpaths = [
            f"{CLAUDE_OUTPUT_DIRNAME}/AUTONOMOUS-AGENT-STEP4-VERIFICATION-RESTORE-1-20260127-003423Z-verification.md",
        ]

        result = _select_newest_verification_report("KAN-16", relpaths)
        self.assertIsNone(result)

    def test_issue_key_prefixed_selected_over_title_prefixed(self):
        """Issue-key-prefixed reports are selected; title-prefixed are ignored."""
        relpaths = [
            f"{CLAUDE_OUTPUT_DIRNAME}/AUTONOMOUS-AGENT-STEP4-VERIFICATION-RESTORE-1-20260127-003423Z-verification.md",
            f"{CLAUDE_OUTPUT_DIRNAME}/KAN-16-20260127-003423Z-verification.md",
        ]

        result = _select_newest_verification_report("KAN-16", relpaths)
        self.assertIsNotNone(result)
        self.assertIn("KAN-16-20260127-003423Z", result)

    def test_kan16_legacy_report_selected(self):
        """KAN-16 legacy format is correctly selected."""
        relpaths = [f"{CLAUDE_OUTPUT_DIRNAME}/KAN-16-verification.md"]
        mtimes = {relpaths[0]: 1706400000.0}

        result = _select_newest_verification_report("KAN-16", relpaths, mtimes)
        self.assertIsNotNone(result)
        self.assertEqual(result, f"{CLAUDE_OUTPUT_DIRNAME}/KAN-16-verification.md")

    def test_kan16_newest_timestamped_wins(self):
        """KAN-16: newest timestamped report wins over older ones."""
        relpaths = [
            f"{CLAUDE_OUTPUT_DIRNAME}/KAN-16-20260127-003423Z-verification.md",
            f"{CLAUDE_OUTPUT_DIRNAME}/KAN-16-20260127-000000Z-verification.md",
        ]

        result = _select_newest_verification_report("KAN-16", relpaths)
        self.assertIsNotNone(result)
        self.assertIn("20260127-003423Z", result)

    def test_only_title_prefixed_returns_none(self):
        """When only title-prefixed reports exist for an issue, return None."""
        relpaths = [
            f"{CLAUDE_OUTPUT_DIRNAME}/AUTONOMOUS-AGENT-LEDGER-RESTORE-1-20260127-003423Z-verification.md",
            f"{CLAUDE_OUTPUT_DIRNAME}/AUTONOMOUS-AGENT-STEP4-VERIFICATION-1-20260126-120000Z-verification.md",
        ]

        result = _select_newest_verification_report("KAN-16", relpaths)
        self.assertIsNone(result)


if __name__ == '__main__':
    unittest.main()
