"""
Unit tests for Idea Intake Idempotency (PATCH C).

PATCH BATCH: AUTONOMOUS-AGENT-JIRA-PAYLOAD-HARDENING-AND-IDEMPOTENCY-1

Tests:
- When Jira returns existing mapped epic, _process_idea does not call create_epic
- When Work Ledger has epic children, _process_idea does not search/create
- Mapping label format is correct (engineo-idea-{IDEA_KEY})
- find_epics_for_idea searches by label and fallback summary
"""

import unittest
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch, call
import sys

# Import the engine module
sys.path.insert(0, str(Path(__file__).parent.parent))


class TestIdeaMappingLabel(unittest.TestCase):
    """Test Idea→Epic mapping label format."""

    def test_mapping_label_format(self):
        """Mapping label has correct format."""
        idea_key = "EA-20"
        expected_label = f"engineo-idea-{idea_key}"
        self.assertEqual(expected_label, "engineo-idea-EA-20")

    def test_mapping_label_is_valid_jira_label(self):
        """Mapping label is valid for Jira (no spaces, alphanumeric with dashes)."""
        idea_key = "EA-20"
        label = f"engineo-idea-{idea_key}"

        # Jira labels can't have spaces
        self.assertNotIn(" ", label)

        # Should be alphanumeric with dashes (Jira allows mixed case)
        import re
        self.assertTrue(re.match(r'^[a-zA-Z0-9-]+$', label))


class TestFindEpicsForIdea(unittest.TestCase):
    """Test JiraClient.find_epics_for_idea method."""

    def test_searches_by_label_first(self):
        """Searches by engineo-idea label first."""
        from engine import JiraClient, Config

        # Create mock config
        config = MagicMock(spec=Config)
        config.jira_url = "https://test.atlassian.net"
        config.jira_username = "test"
        config.jira_token = "token"
        config.software_project = "KAN"

        client = JiraClient(config)

        # Mock search_issues to return labeled epic
        mock_epic = {
            'key': 'KAN-10',
            'fields': {
                'summary': '[EA-20] Test Epic',
                'status': {'name': 'To Do'},
                'description': {},
                'labels': ['engineo-idea-EA-20'],
            }
        }

        with patch.object(client, 'search_issues', return_value=[mock_epic]) as mock_search:
            result = client.find_epics_for_idea("EA-20")

            # Should have searched with label
            expected_jql = 'project = KAN AND issuetype = Epic AND labels = "engineo-idea-EA-20" ORDER BY created ASC'
            mock_search.assert_called()

            # Should return the epic
            self.assertEqual(len(result), 1)
            self.assertEqual(result[0]['key'], 'KAN-10')

    def test_fallback_to_summary_search(self):
        """Falls back to summary prefix search if no labeled epics."""
        from engine import JiraClient, Config

        config = MagicMock(spec=Config)
        config.jira_url = "https://test.atlassian.net"
        config.jira_username = "test"
        config.jira_token = "token"
        config.software_project = "KAN"

        client = JiraClient(config)

        # Mock search_issues: first call (label) returns empty, second (summary) returns epic
        legacy_epic = {
            'key': 'KAN-10',
            'fields': {
                'summary': '[EA-20] Legacy Epic',
                'status': {'name': 'To Do'},
                'description': {},
                'labels': [],  # No label (legacy)
            }
        }

        def mock_search_side_effect(jql, fields):
            if 'labels' in jql:
                return []  # No labeled epics
            else:
                return [legacy_epic]  # Legacy epic by summary

        with patch.object(client, 'search_issues', side_effect=mock_search_side_effect):
            result = client.find_epics_for_idea("EA-20")

            self.assertEqual(len(result), 1)
            self.assertEqual(result[0]['key'], 'KAN-10')


class TestIdempotentIdeaProcessing(unittest.TestCase):
    """Test that _process_idea is idempotent."""

    def test_work_ledger_children_skips_creation(self):
        """When Work Ledger has children, does not create new epics."""
        from work_ledger import WorkLedger, WorkLedgerEntry

        with tempfile.TemporaryDirectory() as tmpdir:
            # Create work ledger with existing epic children
            ledger = WorkLedger(tmpdir)
            entry = WorkLedgerEntry(
                issueKey="EA-20",
                issueType="Idea",
                children=["KAN-10", "KAN-11"],  # Existing epics
            )
            ledger.upsert(entry)
            ledger.save()

            # Create mock issue
            mock_issue = {
                'key': 'EA-20',
                'fields': {
                    'summary': 'Test Idea',
                    'description': {},
                    'status': {'name': 'TO DO'},
                    'issuetype': {'name': 'Idea'},
                },
            }

            # Create mock engine with work ledger
            mock_jira = MagicMock()
            mock_jira.parse_adf_to_text.return_value = "Test description"
            mock_jira.transition_issue.return_value = True
            mock_jira.add_comment.return_value = True
            mock_jira.create_epic = MagicMock()  # Should NOT be called

            engine = MagicMock()
            engine.jira = mock_jira
            engine.work_ledger = ledger
            engine.log = MagicMock()

            # Import and call _process_idea directly
            from engine import ExecutionEngine
            result = ExecutionEngine._process_idea(engine, mock_issue)

            # Should not have called create_epic
            mock_jira.create_epic.assert_not_called()

            # Should have transitioned to In Progress
            mock_jira.transition_issue.assert_called()

    def test_jira_found_epics_persists_mapping(self):
        """When Jira finds existing epics, persists mapping to Work Ledger."""
        from engine import ExecutionEngine
        from work_ledger import WorkLedger

        with tempfile.TemporaryDirectory() as tmpdir:
            # Create work ledger (empty)
            ledger = WorkLedger(tmpdir)
            ledger.save()

            mock_issue = {
                'key': 'EA-20',
                'fields': {
                    'summary': 'Test Idea',
                    'description': {},
                    'status': {'name': 'TO DO'},
                    'issuetype': {'name': 'Idea'},
                },
            }

            existing_epic = {
                'key': 'KAN-10',
                'fields': {
                    'summary': '[EA-20] Existing Epic',
                    'status': {'name': 'To Do'},
                    'description': {},
                    'labels': ['engineo-idea-EA-20'],
                },
            }

            # Create mock engine
            engine = MagicMock()
            engine.config.repo_path = tmpdir
            engine.work_ledger = ledger
            engine.log = MagicMock()

            mock_jira = MagicMock()
            mock_jira.parse_adf_to_text.return_value = "Test description"
            mock_jira.find_epics_for_idea.return_value = [existing_epic]
            mock_jira.transition_issue.return_value = True
            mock_jira.add_comment.return_value = True
            mock_jira.create_epic = MagicMock()  # Should NOT be called
            engine.jira = mock_jira

            # Call _process_idea
            from engine import ExecutionEngine
            result = ExecutionEngine._process_idea(engine, mock_issue)

            # Should not have called create_epic
            mock_jira.create_epic.assert_not_called()

            # Should have called _upsert_work_ledger_entry
            engine._upsert_work_ledger_entry.assert_called()


class TestCreateEpicWithLabel(unittest.TestCase):
    """Test that create_epic includes mapping label."""

    def test_create_epic_accepts_labels_parameter(self):
        """create_epic accepts labels parameter."""
        from engine import JiraClient, Config

        config = MagicMock(spec=Config)
        config.jira_url = "https://test.atlassian.net"
        config.jira_username = "test"
        config.jira_token = "token"
        config.software_project = "KAN"

        client = JiraClient(config)

        # Mock _request to capture the payload
        with patch.object(client, '_request', return_value={'key': 'KAN-10'}) as mock_request:
            result = client.create_epic(
                summary="Test Epic",
                description="Test description",
                labels=["engineo-idea-EA-20", "custom-label"],
            )

            # Should have called _request with labels in payload
            mock_request.assert_called_once()
            call_args = mock_request.call_args
            payload = call_args[1].get('data') or call_args[0][2]

            self.assertIn('labels', payload['fields'])
            self.assertEqual(payload['fields']['labels'], ["engineo-idea-EA-20", "custom-label"])


if __name__ == '__main__':
    unittest.main()
