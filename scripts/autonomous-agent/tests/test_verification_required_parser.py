"""
Unit tests for _parse_verification_required_paths function.

PATCH 3-D: Tests for VERIFICATION REQUIRED section parsing.
"""

import unittest
import sys
from pathlib import Path

# Import the engine module
sys.path.insert(0, str(Path(__file__).parent.parent))

from engine import _parse_verification_required_paths


class TestVerificationRequiredParser(unittest.TestCase):
    """Test _parse_verification_required_paths function."""

    def test_parses_standard_header_with_colon(self):
        """VERIFICATION REQUIRED: header is recognized."""
        description = """
## Story
Some story content.

VERIFICATION REQUIRED:
- reports/KAN-16-verification.md
- docs/TEST.md
"""
        result = _parse_verification_required_paths(description)
        self.assertEqual(len(result), 2)
        self.assertIn("reports/KAN-16-verification.md", result)
        self.assertIn("docs/TEST.md", result)

    def test_parses_markdown_header_without_colon(self):
        """## VERIFICATION REQUIRED header is recognized (no trailing colon)."""
        description = """
## Story
Some story content.

## VERIFICATION REQUIRED
- reports/KAN-16-verification.md
"""
        result = _parse_verification_required_paths(description)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0], "reports/KAN-16-verification.md")

    def test_parses_markdown_header_with_colon(self):
        """## VERIFICATION REQUIRED: header is recognized (with trailing colon)."""
        description = """
## VERIFICATION REQUIRED:
- scripts/autonomous-agent/reports/KAN-17-verification.md
"""
        result = _parse_verification_required_paths(description)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0], "scripts/autonomous-agent/reports/KAN-17-verification.md")

    def test_parses_hyphen_bullets(self):
        """Hyphen bullets are parsed correctly."""
        description = """
VERIFICATION REQUIRED:
- path1.md
- path2.md
"""
        result = _parse_verification_required_paths(description)
        self.assertEqual(result, ["path1.md", "path2.md"])

    def test_parses_asterisk_bullets(self):
        """Asterisk bullets are parsed correctly."""
        description = """
VERIFICATION REQUIRED:
* path1.md
* path2.md
"""
        result = _parse_verification_required_paths(description)
        self.assertEqual(result, ["path1.md", "path2.md"])

    def test_parses_unicode_bullets(self):
        """Unicode bullet (•) is parsed correctly (Jira-rendered)."""
        description = """
VERIFICATION REQUIRED:
• reports/KAN-16-verification.md
• other-file.md
"""
        result = _parse_verification_required_paths(description)
        self.assertEqual(len(result), 2)
        self.assertIn("reports/KAN-16-verification.md", result)

    def test_preserves_asterisks_in_paths(self):
        """Asterisks in paths are preserved (no glob mutation)."""
        description = """
VERIFICATION REQUIRED:
- reports/*-verification.md
"""
        result = _parse_verification_required_paths(description)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0], "reports/*-verification.md")

    def test_preserves_repo_relative_paths(self):
        """Repo-relative paths are preserved exactly."""
        description = """
VERIFICATION REQUIRED:
- scripts/autonomous-agent/reports/KAN-16-20260127-003423Z-verification.md
"""
        result = _parse_verification_required_paths(description)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0], "scripts/autonomous-agent/reports/KAN-16-20260127-003423Z-verification.md")

    def test_stops_at_allcaps_section_header(self):
        """Parsing stops at next ALLCAPS: section header."""
        description = """
VERIFICATION REQUIRED:
- report1.md

ALLOWED FILES:
- src/file.ts
"""
        result = _parse_verification_required_paths(description)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0], "report1.md")

    def test_stops_at_markdown_section_header(self):
        """Parsing stops at next markdown ## section header."""
        description = """
## VERIFICATION REQUIRED
- report1.md

## DIFF BUDGET:
Keep changes minimal.
"""
        result = _parse_verification_required_paths(description)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0], "report1.md")

    def test_empty_description_returns_empty(self):
        """Empty description returns empty list."""
        result = _parse_verification_required_paths("")
        self.assertEqual(result, [])

    def test_none_description_returns_empty(self):
        """None description returns empty list."""
        result = _parse_verification_required_paths(None)
        self.assertEqual(result, [])

    def test_no_section_returns_empty(self):
        """Missing VERIFICATION REQUIRED section returns empty list."""
        description = """
## Story
Some story content.

ALLOWED FILES:
- src/file.ts
"""
        result = _parse_verification_required_paths(description)
        self.assertEqual(result, [])

    def test_case_insensitive_header(self):
        """Header detection is case-insensitive."""
        description = """
verification required:
- report.md
"""
        result = _parse_verification_required_paths(description)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0], "report.md")


if __name__ == '__main__':
    unittest.main()
