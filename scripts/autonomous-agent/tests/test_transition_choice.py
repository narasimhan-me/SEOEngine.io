"""
Unit tests for transition choice priority.

AUTONOMOUS-AGENT-STEP4-VERIFICATION-RESTORE-1 PATCH 4-A.
"""

import unittest
from pathlib import Path
import sys

# Import the choose_transition helper
sys.path.insert(0, str(Path(__file__).parent.parent))
from engine import choose_transition


class TestTransitionChoice(unittest.TestCase):
    """Test transition selection priority logic."""

    def test_resolved_and_done_selects_resolved(self):
        """When both Resolved and Done available, Resolved wins."""
        names = ['Done', 'Resolved', 'In Review']
        result = choose_transition(names)
        self.assertEqual(result, 'Resolved')

    def test_only_done_selects_done(self):
        """When only Done available, Done is selected."""
        names = ['Done', 'In Review', 'Cancelled']
        result = choose_transition(names)
        self.assertEqual(result, 'Done')

    def test_closed_without_higher_priority(self):
        """When Closed available but not Resolved/Done, Closed is selected."""
        names = ['Closed', 'In Review', 'Cancelled']
        result = choose_transition(names)
        self.assertEqual(result, 'Closed')

    def test_complete_as_fallback(self):
        """Complete is selected if no higher priority found."""
        names = ['Complete', 'In Review', 'Cancelled']
        result = choose_transition(names)
        self.assertEqual(result, 'Complete')

    def test_no_match_returns_none(self):
        """When no priority matches, returns None."""
        names = ['In Review', 'Cancelled', 'Blocked']
        result = choose_transition(names)
        self.assertIsNone(result)

    def test_empty_list_returns_none(self):
        """Empty list returns None."""
        result = choose_transition([])
        self.assertIsNone(result)

    def test_case_insensitivity_lowercase(self):
        """Case insensitive: 'resolved' should match."""
        names = ['resolved', 'in review']
        result = choose_transition(names)
        self.assertEqual(result, 'resolved')

    def test_case_insensitivity_uppercase(self):
        """Case insensitive: 'DONE' should match."""
        names = ['DONE', 'IN REVIEW']
        result = choose_transition(names)
        self.assertEqual(result, 'DONE')

    def test_priority_order_complete(self):
        """Full priority order: Resolved > Done > Closed > Complete."""
        # Test each pair to verify ordering
        self.assertEqual(choose_transition(['Done', 'Resolved']), 'Resolved')
        self.assertEqual(choose_transition(['Closed', 'Done']), 'Done')
        self.assertEqual(choose_transition(['Complete', 'Closed']), 'Closed')


if __name__ == '__main__':
    unittest.main()
