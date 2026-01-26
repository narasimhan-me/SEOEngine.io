"""
Tests for patch-list matcher (enforcement).

Guardrails v2 PATCH 6 - unittest coverage.
"""

import unittest
import sys
from pathlib import Path

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from guardrails.enforcement import matches_allowed_new


class TestPatchlistMatcher(unittest.TestCase):
    """Test cases for matches_allowed_new function."""

    def test_exact_path_match_passes(self):
        """Exact path match passes."""
        patterns = ["apps/web/src/file.ts"]
        self.assertTrue(matches_allowed_new("apps/web/src/file.ts", patterns))

    def test_exact_path_mismatch_fails(self):
        """Exact path mismatch fails."""
        patterns = ["apps/web/src/file.ts"]
        self.assertFalse(matches_allowed_new("apps/web/src/other.ts", patterns))

    def test_explicit_glob_match_passes(self):
        """Explicit glob match passes (fnmatch)."""
        patterns = ["apps/web/src/*.ts"]
        self.assertTrue(matches_allowed_new("apps/web/src/file.ts", patterns))
        self.assertTrue(matches_allowed_new("apps/web/src/other.ts", patterns))

    def test_glob_mismatch_fails(self):
        """Glob pattern that doesn't match fails."""
        patterns = ["apps/web/src/*.ts"]
        self.assertFalse(matches_allowed_new("apps/api/src/file.ts", patterns))

    def test_basename_collision_does_not_pass(self):
        """Basename collision does NOT pass (hardening requirement)."""
        patterns = ["apps/web/src/file.ts"]
        # Same basename but different path - should NOT match
        self.assertFalse(matches_allowed_new("apps/api/src/file.ts", patterns))

    def test_endswith_does_not_pass(self):
        """Endswith bypass does NOT pass (hardening requirement)."""
        patterns = ["src/file.ts"]
        # Ends with pattern but different prefix - should NOT match
        self.assertFalse(matches_allowed_new("apps/web/src/file.ts", patterns))

    def test_double_star_glob(self):
        """Double star glob pattern works."""
        patterns = ["apps/**/*.ts"]
        self.assertTrue(matches_allowed_new("apps/web/src/file.ts", patterns))
        self.assertTrue(matches_allowed_new("apps/api/src/deep/file.ts", patterns))

    def test_question_mark_glob(self):
        """Question mark glob pattern works."""
        patterns = ["apps/web/src/file?.ts"]
        self.assertTrue(matches_allowed_new("apps/web/src/file1.ts", patterns))
        self.assertFalse(matches_allowed_new("apps/web/src/file12.ts", patterns))

    def test_empty_patterns(self):
        """Empty patterns list returns False."""
        self.assertFalse(matches_allowed_new("any/file.ts", []))


if __name__ == '__main__':
    unittest.main()
