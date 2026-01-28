"""
Tests for report validator.

Guardrails v2 PATCH 6 - unittest coverage.
FIXUP-2: Filesystem-independent (uses mocks, no tempdir).
"""

import unittest
from unittest.mock import patch, MagicMock
import sys
from pathlib import Path

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from verification.report import report_path, report_exists, report_has_checklist


class TestReportValidator(unittest.TestCase):
    """Test cases for report validation functions."""

    def test_report_path_construction(self):
        """Report path is correctly constructed."""
        path = report_path("/repo", "KAN-123", "reports")
        self.assertEqual(str(path), "/repo/reports/KAN-123-verification.md")

    @patch.object(Path, 'exists')
    def test_report_exists_true(self, mock_exists):
        """report_exists returns True when file exists."""
        mock_exists.return_value = True
        test_file = Path("/fake/path/test-verification.md")
        self.assertTrue(report_exists(test_file))

    @patch.object(Path, 'exists')
    def test_report_exists_false(self, mock_exists):
        """report_exists returns False when file does not exist."""
        mock_exists.return_value = False
        test_file = Path("/fake/path/nonexistent.md")
        self.assertFalse(report_exists(test_file))

    @patch.object(Path, 'read_text')
    def test_missing_checklist_fails(self, mock_read_text):
        """Missing ## Checklist fails validation."""
        mock_read_text.return_value = """# Verification Report

Some content here.
"""
        test_file = Path("/fake/path/test-verification.md")
        self.assertFalse(report_has_checklist(test_file, "## Checklist"))

    @patch.object(Path, 'read_text')
    def test_present_checklist_passes(self, mock_read_text):
        """Present ## Checklist passes validation."""
        mock_read_text.return_value = """# Verification Report

## Checklist
- [x] Tests pass
- [x] Linting clean
"""
        test_file = Path("/fake/path/test-verification.md")
        self.assertTrue(report_has_checklist(test_file, "## Checklist"))

    @patch.object(Path, 'read_text')
    def test_checklist_anywhere_in_file(self, mock_read_text):
        """## Checklist can be anywhere in file."""
        mock_read_text.return_value = """# Report

Some intro.

## Summary
Did stuff.

## Checklist
- [x] Done
"""
        test_file = Path("/fake/path/test-verification.md")
        self.assertTrue(report_has_checklist(test_file, "## Checklist"))

    @patch.object(Path, 'read_text')
    def test_nonexistent_file_fails_checklist(self, mock_read_text):
        """Nonexistent file fails checklist check."""
        mock_read_text.side_effect = FileNotFoundError("No such file")
        test_file = Path("/fake/path/nonexistent.md")
        self.assertFalse(report_has_checklist(test_file, "## Checklist"))


if __name__ == '__main__':
    unittest.main()
