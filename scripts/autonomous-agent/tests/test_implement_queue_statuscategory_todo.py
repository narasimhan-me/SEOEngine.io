"""
Unit tests for implement queue JQL using statusCategory = 'To Do'.

PATCH BATCH: AUTONOMOUS-AGENT-VERIFY-AUTOREPAIR-STATUSCATEGORY-JQL-1 - PATCH 2
REVIEW-FIXUP-1: Replace source-scan tests with mocked JiraClient behavior.

Tests:
- get_stories_todo() JQL uses statusCategory = 'To Do'
- Stories in 'Backlog' status (To Do category) are included
- Mocked JiraClient validates actual method behavior
"""

import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch
import sys

# Import from engine module
sys.path.insert(0, str(Path(__file__).parent.parent))

from engine import JiraClient, Config


class TestImplementQueueStatusCategoryMocked(unittest.TestCase):
    """Test implement queue uses statusCategory = 'To Do' with mocked JiraClient."""

    def setUp(self):
        """Create minimal mocked Config and JiraClient."""
        self.mock_config = MagicMock(spec=Config)
        self.mock_config.jira_url = "https://test.atlassian.net"
        self.mock_config.jira_username = "test@example.com"
        self.mock_config.jira_token = "test_token"
        self.mock_config.software_project = "KAN"

    def test_get_stories_todo_uses_statuscategory_and_returns_backlog_story(self):
        """get_stories_todo() uses statusCategory and returns Backlog stories."""
        # Create JiraClient with mocked config
        client = JiraClient(self.mock_config)

        # Track the JQL that gets passed to search_issues
        captured_jql = None

        def mock_search_issues(jql, fields):
            nonlocal captured_jql
            captured_jql = jql

            # Assert JQL uses statusCategory = 'To Do'
            self.assertIn("statusCategory = 'To Do'", jql,
                         "JQL should use statusCategory = 'To Do'")

            # Assert JQL does NOT use exact status = 'To Do'
            # (We need to check the JQL doesn't have 'status = ' without 'statusCategory')
            if "status = 'To Do'" in jql or 'status = "To Do"' in jql:
                # Make sure it's actually statusCategory, not just status
                self.assertIn("statusCategory", jql,
                             "Should use statusCategory, not exact status")

            # Return a mocked Story in "Backlog" status (which is in To Do category)
            return [{
                'key': 'KAN-100',
                'fields': {
                    'summary': 'Test story in Backlog',
                    'status': {
                        'name': 'Backlog',
                        'statusCategory': {
                            'name': 'To Do',
                            'key': 'new'
                        }
                    },
                    'statusCategory': {
                        'name': 'To Do',
                        'key': 'new'
                    },
                    'description': 'A test story',
                    'parent': None
                }
            }]

        # Patch search_issues method
        with patch.object(client, 'search_issues', side_effect=mock_search_issues):
            result = client.get_stories_todo()

        # Assert we got the Backlog story back
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['key'], 'KAN-100')
        self.assertEqual(result[0]['fields']['status']['name'], 'Backlog')

        # Verify the JQL was actually captured and validated
        self.assertIsNotNone(captured_jql)

    def test_get_stories_todo_jql_does_not_use_exact_status(self):
        """get_stories_todo() JQL does NOT use exact status = 'To Do'."""
        client = JiraClient(self.mock_config)

        captured_jql = None

        def mock_search_issues(jql, fields):
            nonlocal captured_jql
            captured_jql = jql
            return []

        with patch.object(client, 'search_issues', side_effect=mock_search_issues):
            client.get_stories_todo()

        # Check the JQL doesn't use bare 'status = ' (without statusCategory)
        # The pattern "status = 'To Do'" or "status = \"To Do\"" without statusCategory prefix
        jql_lower = captured_jql.lower() if captured_jql else ""

        # Count occurrences - should have statusCategory but not bare status =
        has_status_category = "statuscategory" in jql_lower
        has_bare_status = False

        # Check if there's a bare 'status = ' that's not part of statusCategory
        if "status = " in captured_jql or "status= " in captured_jql:
            # Make sure all 'status' references are 'statusCategory'
            parts = captured_jql.split("status")
            for part in parts[1:]:  # Skip first part (before any 'status')
                if not part.startswith("Category"):
                    has_bare_status = True
                    break

        self.assertTrue(has_status_category, "JQL should use statusCategory")
        self.assertFalse(has_bare_status, "JQL should not use bare status = 'To Do'")


class TestDecomposeQueueStatusCategoryMocked(unittest.TestCase):
    """Test decomposition queue uses statusCategory with mocked JiraClient."""

    def setUp(self):
        """Create minimal mocked Config."""
        self.mock_config = MagicMock(spec=Config)
        self.mock_config.jira_url = "https://test.atlassian.net"
        self.mock_config.jira_username = "test@example.com"
        self.mock_config.jira_token = "test_token"
        self.mock_config.software_project = "KAN"

    def test_get_epics_todo_uses_statuscategory(self):
        """get_epics_todo() uses statusCategory = 'To Do'."""
        client = JiraClient(self.mock_config)

        captured_jql = None

        def mock_search_issues(jql, fields):
            nonlocal captured_jql
            captured_jql = jql
            return [{
                'key': 'KAN-10',
                'fields': {
                    'summary': 'Test Epic',
                    'status': {'name': 'Backlog'},
                    'statusCategory': {'name': 'To Do'},
                    'description': 'Epic in Backlog',
                    'parent': None
                }
            }]

        with patch.object(client, 'search_issues', side_effect=mock_search_issues):
            result = client.get_epics_todo()

        self.assertIn("statusCategory = 'To Do'", captured_jql)
        self.assertEqual(len(result), 1)

    def test_get_epics_for_decomposition_uses_statuscategory(self):
        """get_epics_for_decomposition() uses statusCategory for both To Do and In Progress."""
        client = JiraClient(self.mock_config)

        captured_jql = None

        def mock_search_issues(jql, fields):
            nonlocal captured_jql
            captured_jql = jql
            return []

        with patch.object(client, 'search_issues', side_effect=mock_search_issues):
            client.get_epics_for_decomposition()

        # Should use statusCategory for both
        self.assertIn("statusCategory = 'To Do'", captured_jql)
        self.assertIn("statusCategory = 'In Progress'", captured_jql)


class TestStatusCategoryDocumentation(unittest.TestCase):
    """Test documentation of statusCategory rationale."""

    def test_readme_documents_statuscategory(self):
        """README.md documents statusCategory usage."""
        readme_path = Path(__file__).parent.parent / "README.md"
        self.assertTrue(readme_path.exists(), "README.md should exist")

        content = readme_path.read_text(encoding='utf-8')
        self.assertIn("statusCategory", content,
                     "README should document statusCategory usage")
        self.assertIn("Backlog", content,
                     "README should mention Backlog is included")


if __name__ == '__main__':
    unittest.main()
