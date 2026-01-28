"""
Tests for _parse_allowed_files parser.

KAN-16: AUTONOMOUS-AGENT-ALLOWED-FILES-BULLET-PARSER-FIXUP-1 unit tests.
"""

import unittest
import sys
from pathlib import Path

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from engine import _parse_allowed_files


class TestAllowedFilesParser(unittest.TestCase):
    """Test cases for _parse_allowed_files function."""

    def test_hyphen_bullets(self):
        """Standard markdown hyphen bullets are parsed correctly."""
        description = """
ALLOWED FILES:
- apps/web/**
- docs/**
"""
        result = _parse_allowed_files(description)
        self.assertEqual(result, ['apps/web/**', 'docs/**'])

    def test_asterisk_bullets(self):
        """Markdown asterisk bullets are parsed correctly."""
        description = """
ALLOWED FILES:
* apps/web/**
* docs/**
"""
        result = _parse_allowed_files(description)
        self.assertEqual(result, ['apps/web/**', 'docs/**'])

    def test_unicode_bullets(self):
        """Unicode bullets (Jira-rendered) are parsed correctly."""
        description = """
ALLOWED FILES:
• apps/web/**
• docs/**
"""
        result = _parse_allowed_files(description)
        self.assertEqual(result, ['apps/web/**', 'docs/**'])

    def test_mixed_bullets(self):
        """Mixed bullet types are all parsed correctly."""
        description = """
ALLOWED FILES:
- apps/web/**
* scripts/**
• docs/**
"""
        result = _parse_allowed_files(description)
        self.assertEqual(result, ['apps/web/**', 'scripts/**', 'docs/**'])

    def test_no_allowed_files_section(self):
        """Returns empty list when no ALLOWED FILES section present."""
        description = """
SCOPE CLASS: AUTONOMOUS-AGENT-ONLY
DIFF BUDGET: 5
"""
        result = _parse_allowed_files(description)
        self.assertEqual(result, [])

    def test_empty_description(self):
        """Returns empty list for empty description."""
        result = _parse_allowed_files("")
        self.assertEqual(result, [])

    def test_none_description(self):
        """Returns empty list for None description."""
        result = _parse_allowed_files(None)
        self.assertEqual(result, [])

    def test_section_stops_at_next_header(self):
        """Parsing stops at next section header."""
        description = """
ALLOWED FILES:
• apps/web/**
• docs/**

DIFF BUDGET: 5
"""
        result = _parse_allowed_files(description)
        self.assertEqual(result, ['apps/web/**', 'docs/**'])

    def test_whitespace_handling(self):
        """Whitespace around bullets and paths is handled correctly."""
        description = """
ALLOWED FILES:
  •   apps/web/**
  -  scripts/**
    *    docs/**
"""
        result = _parse_allowed_files(description)
        self.assertEqual(result, ['apps/web/**', 'scripts/**', 'docs/**'])


if __name__ == '__main__':
    unittest.main()
