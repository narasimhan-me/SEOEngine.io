"""
Tests for report validator.

Guardrails v2 PATCH 6 - unittest coverage.
"""

import unittest
import tempfile
import sys
from pathlib import Path

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from verification.report import report_path, report_exists, report_has_checklist


class TestReportValidator(unittest.TestCase):
    """Test cases for report validation functions."""

    def setUp(self):
        """Set up temporary directory for test files."""
        self.temp_dir = tempfile.mkdtemp()

    def tearDown(self):
        """Clean up temporary files."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_report_path_construction(self):
        """Report path is correctly constructed."""
        path = report_path("/repo", "KAN-123", "reports")
        self.assertEqual(str(path), "/repo/reports/KAN-123-verification.md")

    def test_report_exists_true(self):
        """report_exists returns True when file exists."""
        test_file = Path(self.temp_dir) / "test-verification.md"
        test_file.write_text("# Test")
        self.assertTrue(report_exists(test_file))

    def test_report_exists_false(self):
        """report_exists returns False when file does not exist."""
        test_file = Path(self.temp_dir) / "nonexistent.md"
        self.assertFalse(report_exists(test_file))

    def test_missing_checklist_fails(self):
        """Missing ## Checklist fails validation."""
        test_file = Path(self.temp_dir) / "test-verification.md"
        test_file.write_text("""# Verification Report

Some content here.
""")
        self.assertFalse(report_has_checklist(test_file, "## Checklist"))

    def test_present_checklist_passes(self):
        """Present ## Checklist passes validation."""
        test_file = Path(self.temp_dir) / "test-verification.md"
        test_file.write_text("""# Verification Report

## Checklist
- [x] Tests pass
- [x] Linting clean
""")
        self.assertTrue(report_has_checklist(test_file, "## Checklist"))

    def test_checklist_anywhere_in_file(self):
        """## Checklist can be anywhere in file."""
        test_file = Path(self.temp_dir) / "test-verification.md"
        test_file.write_text("""# Report

Some intro.

## Summary
Did stuff.

## Checklist
- [x] Done
""")
        self.assertTrue(report_has_checklist(test_file, "## Checklist"))

    def test_nonexistent_file_fails_checklist(self):
        """Nonexistent file fails checklist check."""
        test_file = Path(self.temp_dir) / "nonexistent.md"
        self.assertFalse(report_has_checklist(test_file, "## Checklist"))


if __name__ == '__main__':
    unittest.main()
