"""
Tests for _parse_allowed_files function.

AUTONOMOUS-AGENT-ALLOWED-FILES-BULLET-PARSER-FIXUP-1 - Unicode bullet support.
"""

import unittest
import sys
from pathlib import Path

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from engine import _parse_allowed_files


class TestParseAllowedFiles(unittest.TestCase):
    """Test cases for _parse_allowed_files function."""

    def test_parse_with_hyphen_bullets(self):
        """Parse ALLOWED FILES with standard hyphen bullets (-)."""
        description = """
SCOPE CLASS: AUTONOMOUS-AGENT-ONLY

ALLOWED FILES:
- apps/web/**
- docs/**

DIFF BUDGET: 5
"""
        result = _parse_allowed_files(description)
        self.assertEqual(result, ['apps/web/**', 'docs/**'])

    def test_parse_with_asterisk_bullets(self):
        """Parse ALLOWED FILES with asterisk bullets (*)."""
        description = """
SCOPE CLASS: AUTONOMOUS-AGENT-ONLY

ALLOWED FILES:
* apps/web/**
* docs/**

DIFF BUDGET: 5
"""
        result = _parse_allowed_files(description)
        self.assertEqual(result, ['apps/web/**', 'docs/**'])

    def test_parse_with_unicode_bullets(self):
        """Parse ALLOWED FILES with Unicode bullet points (•) from Jira."""
        description = """
SCOPE CLASS: AUTONOMOUS-AGENT-ONLY

ALLOWED FILES:
• apps/web/**
• docs/**

DIFF BUDGET: 5
"""
        result = _parse_allowed_files(description)
        self.assertEqual(result, ['apps/web/**', 'docs/**'])

    def test_parse_with_mixed_bullets(self):
        """Parse ALLOWED FILES with mixed bullet styles."""
        description = """
ALLOWED FILES:
- apps/web/**
* packages/ui/**
• scripts/autonomous-agent/**
"""
        result = _parse_allowed_files(description)
        self.assertEqual(result, ['apps/web/**', 'packages/ui/**', 'scripts/autonomous-agent/**'])

    def test_parse_no_allowed_files_section(self):
        """Return empty list when no ALLOWED FILES section present."""
        description = """
SCOPE CLASS: AUTONOMOUS-AGENT-ONLY
DIFF BUDGET: 5
"""
        result = _parse_allowed_files(description)
        self.assertEqual(result, [])

    def test_parse_empty_description(self):
        """Return empty list for empty description."""
        result = _parse_allowed_files("")
        self.assertEqual(result, [])

    def test_parse_none_description(self):
        """Return empty list for None description."""
        result = _parse_allowed_files(None)
        self.assertEqual(result, [])

    def test_parse_with_extra_whitespace(self):
        """Parse ALLOWED FILES with varying whitespace."""
        description = """
ALLOWED FILES:
-   apps/web/**
  •  docs/**
*    packages/**
"""
        result = _parse_allowed_files(description)
        self.assertEqual(result, ['apps/web/**', 'docs/**', 'packages/**'])

    def test_parse_stops_at_next_section(self):
        """Stop parsing at next section header."""
        description = """
ALLOWED FILES:
- apps/web/**
- docs/**

DIFF BUDGET: 5
- this/should/not/be/parsed
"""
        result = _parse_allowed_files(description)
        self.assertEqual(result, ['apps/web/**', 'docs/**'])

    def test_parse_single_file_pattern(self):
        """Parse single file pattern."""
        description = """
ALLOWED FILES:
• scripts/autonomous-agent/**
"""
        result = _parse_allowed_files(description)
        self.assertEqual(result, ['scripts/autonomous-agent/**'])

    def test_parse_case_insensitive_header(self):
        """Parse ALLOWED FILES header case-insensitively."""
        description = """
allowed files:
- apps/web/**
"""
        result = _parse_allowed_files(description)
        self.assertEqual(result, ['apps/web/**'])


if __name__ == '__main__':
    unittest.main()
