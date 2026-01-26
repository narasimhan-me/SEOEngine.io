"""
Tests for ALLOWED FILES parser.

Guardrails v2 PATCH 6 - unittest coverage.
"""

import unittest
import sys
from pathlib import Path

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from guardrails.parser import parse_allowed_files


class TestAllowedFilesParser(unittest.TestCase):
    """Test cases for parse_allowed_files function."""

    def test_blank_lines_between_header_and_bullets(self):
        """Blank lines between ALLOWED FILES: and bullets are handled."""
        description = """
ALLOWED FILES:

- apps/web/src/file1.ts
- apps/web/src/file2.ts
"""
        allowed, new_patterns = parse_allowed_files(description)
        self.assertEqual(len(allowed), 2)
        self.assertIn("apps/web/src/file1.ts", allowed)
        self.assertIn("apps/web/src/file2.ts", allowed)

    def test_glob_patterns_preserved(self):
        """Patterns containing * remain intact (no mutation)."""
        description = """
ALLOWED NEW FILES:
- apps/web/src/*.ts
- docs/**/*.md
"""
        allowed, new_patterns = parse_allowed_files(description)
        self.assertEqual(len(new_patterns), 2)
        self.assertIn("apps/web/src/*.ts", new_patterns)
        self.assertIn("docs/**/*.md", new_patterns)

    def test_paired_bold_unwrapping(self):
        """Paired markdown bold markers **text** are unwrapped."""
        description = """
**ALLOWED FILES:**
- **apps/web/src/file.ts**
"""
        allowed, new_patterns = parse_allowed_files(description)
        self.assertEqual(len(allowed), 1)
        self.assertIn("apps/web/src/file.ts", allowed)

    def test_single_asterisk_not_stripped(self):
        """Single asterisk bullets are not stripped."""
        description = """
ALLOWED FILES:
* apps/web/src/file.ts
"""
        allowed, new_patterns = parse_allowed_files(description)
        self.assertEqual(len(allowed), 1)
        self.assertIn("apps/web/src/file.ts", allowed)

    def test_both_sections_parsed(self):
        """Both ALLOWED FILES and ALLOWED NEW FILES are parsed."""
        description = """
ALLOWED FILES:
- existing/file.ts

ALLOWED NEW FILES:
- new/file.ts
"""
        allowed, new_patterns = parse_allowed_files(description)
        self.assertEqual(len(allowed), 1)
        self.assertEqual(len(new_patterns), 1)
        self.assertIn("existing/file.ts", allowed)
        self.assertIn("new/file.ts", new_patterns)

    def test_section_ends_at_new_header(self):
        """Section ends when a new header is encountered."""
        description = """
ALLOWED FILES:
- file1.ts

DIFF BUDGET: 10

- should/not/be/parsed.ts
"""
        allowed, new_patterns = parse_allowed_files(description)
        self.assertEqual(len(allowed), 1)
        self.assertIn("file1.ts", allowed)
        self.assertNotIn("should/not/be/parsed.ts", allowed)


if __name__ == '__main__':
    unittest.main()
