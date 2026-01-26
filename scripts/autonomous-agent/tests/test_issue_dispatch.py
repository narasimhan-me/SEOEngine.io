"""
Tests for issue dispatch logic.

AUTONOMOUS-AGENT-ISSUE-MODE-BUG-DISPATCH-FIXUP-1 PATCH 2 - unittest coverage.
"""

import unittest
import sys
from pathlib import Path

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from engine import resolve_dispatch_kind


class TestIssueDispatch(unittest.TestCase):
    """Test cases for resolve_dispatch_kind function."""

    def test_story_returns_implement(self):
        """Story resolves to implement."""
        self.assertEqual(resolve_dispatch_kind("Story"), "implement")

    def test_bug_returns_implement(self):
        """Bug resolves to implement."""
        self.assertEqual(resolve_dispatch_kind("Bug"), "implement")

    def test_bug_lowercase_returns_implement(self):
        """bug (lowercase) resolves to implement."""
        self.assertEqual(resolve_dispatch_kind("bug"), "implement")

    def test_epic_returns_epic(self):
        """Epic resolves to epic."""
        self.assertEqual(resolve_dispatch_kind("Epic"), "epic")

    def test_idea_returns_initiative(self):
        """Idea resolves to initiative."""
        self.assertEqual(resolve_dispatch_kind("Idea"), "initiative")

    def test_initiative_returns_initiative(self):
        """Initiative resolves to initiative."""
        self.assertEqual(resolve_dispatch_kind("Initiative"), "initiative")

    def test_unknown_type_returns_unknown(self):
        """Unknown type resolves to unknown."""
        self.assertEqual(resolve_dispatch_kind("Task"), "unknown")

    def test_whitespace_is_stripped(self):
        """Whitespace around type is stripped."""
        self.assertEqual(resolve_dispatch_kind("  Story  "), "implement")
        self.assertEqual(resolve_dispatch_kind("  Bug  "), "implement")


if __name__ == '__main__':
    unittest.main()
