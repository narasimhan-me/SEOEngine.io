"""
Unit tests for BLOCKED handling and Epic reconciliation.

PATCH BATCH: AUTONOMOUS-AGENT-RESUME-STATE-MACHINE-RECONCILE-1 - PATCH 8
FIXUP-1 PATCH 4: Evidence-based BLOCKED auto-close + reconcile wiring

Tests:
- BLOCKED story with canonical report + commit evidence transitions to Done
- Story missing commit evidence stays BLOCKED with structured comment
- Epic transitions to Done when all child implement stories are resolved
- Reconcile wiring after story transition
"""

import unittest
from unittest.mock import MagicMock, patch
from pathlib import Path
import sys

# Import the engine module
sys.path.insert(0, str(Path(__file__).parent.parent))

from work_ledger import WorkLedgerEntry


class TestBlockedHandling(unittest.TestCase):
    """Test BLOCKED status handling in verification."""

    def _create_mock_engine(self):
        """Create mock engine for testing."""
        from engine import ExecutionEngine, Config

        mock_config = MagicMock(spec=Config)
        mock_config.repo_path = "/tmp/test-repo"
        mock_config.jira_url = "https://test.atlassian.net"
        mock_config.jira_username = "test@example.com"
        mock_config.jira_token = "test-token"
        mock_config.github_token = "test-github-token"
        mock_config.feature_branch = "feature/test"
        mock_config.software_project = "KAN"
        mock_config.validate.return_value = []

        with patch('engine.subprocess.run') as mock_run, \
             patch('engine.rotate_logs'), \
             patch.object(Path, 'mkdir'), \
             patch('engine.WorkLedger') as mock_ledger:

            mock_run.return_value = MagicMock(returncode=0, stdout="1.0.0", stderr="")

            mock_ledger_instance = MagicMock()
            mock_ledger_instance.load.return_value = True
            mock_ledger_instance.all_entries.return_value = {}
            mock_ledger_instance.get_resumable_entries.return_value = []
            mock_ledger.return_value = mock_ledger_instance

            engine = ExecutionEngine.__new__(ExecutionEngine)
            engine.config = mock_config
            engine.run_id = "20260127-120000Z"
            engine.logs_dir = Path("/tmp/test-logs")
            engine.engine_log_path = None
            engine.work_ledger = mock_ledger_instance

            engine.jira = MagicMock()
            engine.git = MagicMock()
            engine.log = MagicMock()

            # Mock ledger methods
            engine._load_guardrails_ledger = MagicMock()
            engine._load_or_init_guardrails_ledger = MagicMock()
            engine._find_ledger_entry = MagicMock()
            engine._ledger_passed = MagicMock()
            engine._ledger_evidence = MagicMock()
            engine._upsert_kan_story_run = MagicMock()
            engine._upsert_work_ledger_entry = MagicMock()
            engine.escalate = MagicMock()

            return engine

    def test_blocked_story_included_in_verification(self):
        """BLOCKED story is eligible for verification (not skipped)."""
        engine = self._create_mock_engine()

        # Setup: work ledger entry with commit sha
        mock_work_entry = WorkLedgerEntry(issueKey="KAN-17", last_commit_sha="abc123def")
        engine.work_ledger.get.return_value = mock_work_entry

        issue = {
            'key': 'KAN-17',
            'fields': {
                'summary': 'Test story',
                'status': {'name': 'BLOCKED'},
                'issuetype': {'name': 'Story'},
            }
        }

        # Mock canonical report check
        with patch('engine._verify_canonical_report_or_fail_fast') as mock_verify:
            mock_verify.return_value = (True, "reports/KAN-17-verification.md", None)

            # Mock report content with completed checklist
            with patch('pathlib.Path.read_text') as mock_read:
                mock_read.return_value = "## Checklist\n- [x] Item 1\n- [x] Item 2"

                # Mock transitions
                engine.jira.get_available_transition_names.return_value = ["Done"]
                engine.jira.transition_issue.return_value = True

                result = engine.verify_work_item(issue)

                # Should have taken action (not skipped due to BLOCKED status)
                self.assertTrue(result)
                # Should have attempted transition
                engine.jira.transition_issue.assert_called()

    def test_unchecked_items_fail_verification(self):
        """Report with unchecked items fails verification."""
        engine = self._create_mock_engine()

        issue = {
            'key': 'KAN-17',
            'fields': {
                'summary': 'Test story',
                'status': {'name': 'In Progress'},
                'issuetype': {'name': 'Story'},
            }
        }

        with patch('engine._verify_canonical_report_or_fail_fast') as mock_verify:
            mock_verify.return_value = (True, "reports/KAN-17-verification.md", None)

            with patch('pathlib.Path.read_text') as mock_read:
                # Report has unchecked item
                mock_read.return_value = "## Checklist\n- [x] Done\n- [ ] Not done"

                result = engine.verify_work_item(issue)

                # Should have taken action
                self.assertTrue(result)
                # Should have added comment about unchecked items
                engine.jira.add_comment.assert_called()
                comment = engine.jira.add_comment.call_args[0][1]
                self.assertIn("unchecked", comment.lower())

    def test_missing_commit_evidence_stays_blocked(self):
        """Story with report but missing commit evidence stays BLOCKED."""
        engine = self._create_mock_engine()

        # Setup: work ledger entry with no commit sha
        mock_work_entry = WorkLedgerEntry(issueKey="KAN-17", last_commit_sha=None)
        engine.work_ledger.get.return_value = mock_work_entry

        # Setup: git log returns no commits
        engine.git.find_commits_referencing.return_value = []

        issue = {
            'key': 'KAN-17',
            'fields': {
                'summary': 'Test story',
                'status': {'name': 'In Progress'},
                'issuetype': {'name': 'Story'},
            }
        }

        with patch('engine._verify_canonical_report_or_fail_fast') as mock_verify:
            mock_verify.return_value = (True, "reports/KAN-17-verification.md", None)

            with patch('pathlib.Path.read_text') as mock_read:
                # Report is valid with all items checked
                mock_read.return_value = "## Checklist\n- [x] Done"

                result = engine.verify_work_item(issue)

                # Should have taken action
                self.assertTrue(result)
                # Should have added comment about missing commit evidence
                engine.jira.add_comment.assert_called()
                comment = engine.jira.add_comment.call_args[0][1]
                self.assertIn("missing commit evidence", comment.lower())
                # Should have set to BLOCKED
                engine.jira.transition_issue.assert_called_with("KAN-17", "Blocked")

    def test_commit_evidence_from_work_ledger(self):
        """Story with commit evidence from work ledger transitions to Done."""
        engine = self._create_mock_engine()

        # Setup: work ledger entry with commit sha
        mock_work_entry = WorkLedgerEntry(issueKey="KAN-17", last_commit_sha="abc123def456")
        engine.work_ledger.get.return_value = mock_work_entry

        issue = {
            'key': 'KAN-17',
            'fields': {
                'summary': 'Test story',
                'status': {'name': 'In Progress'},
                'issuetype': {'name': 'Story'},
                'parent': {'key': 'KAN-10'},
            }
        }

        engine.jira.get_available_transition_names.return_value = ["Done"]
        engine.jira.transition_issue.return_value = True

        with patch('engine._verify_canonical_report_or_fail_fast') as mock_verify:
            mock_verify.return_value = (True, "reports/KAN-17-verification.md", None)

            with patch('pathlib.Path.read_text') as mock_read:
                mock_read.return_value = "## Checklist\n- [x] Done"

                # Mock reconcile methods to prevent cascading
                engine.reconcile_epic = MagicMock(return_value=False)

                result = engine.verify_work_item(issue)

                # Should have taken action
                self.assertTrue(result)
                # Should have transitioned to Done
                engine.jira.transition_issue.assert_any_call("KAN-17", "Done")

    def test_commit_evidence_from_git_log(self):
        """Story with commit evidence from git log transitions to Done."""
        engine = self._create_mock_engine()

        # Setup: work ledger entry with no commit sha
        mock_work_entry = WorkLedgerEntry(issueKey="KAN-17", last_commit_sha=None)
        engine.work_ledger.get.return_value = mock_work_entry

        # Setup: git log returns commits
        engine.git.find_commits_referencing.return_value = ["abc123", "def456"]

        issue = {
            'key': 'KAN-17',
            'fields': {
                'summary': 'Test story',
                'status': {'name': 'In Progress'},
                'issuetype': {'name': 'Story'},
            }
        }

        engine.jira.get_available_transition_names.return_value = ["Done"]
        engine.jira.transition_issue.return_value = True

        with patch('engine._verify_canonical_report_or_fail_fast') as mock_verify:
            mock_verify.return_value = (True, "reports/KAN-17-verification.md", None)

            with patch('pathlib.Path.read_text') as mock_read:
                mock_read.return_value = "## Checklist\n- [x] Done"

                result = engine.verify_work_item(issue)

                # Should have taken action
                self.assertTrue(result)
                # Should have used git log for evidence
                engine.git.find_commits_referencing.assert_called_with("KAN-17", max_count=5)


class TestEpicReconciliation(unittest.TestCase):
    """Test Epic reconciliation when all children resolved."""

    def _create_mock_engine(self):
        """Create mock engine for testing."""
        from engine import ExecutionEngine, Config
        from work_ledger import WorkLedger, WorkLedgerEntry

        mock_config = MagicMock(spec=Config)
        mock_config.repo_path = "/tmp/test-repo"
        mock_config.software_project = "KAN"

        with patch('engine.subprocess.run'), \
             patch('engine.rotate_logs'), \
             patch.object(Path, 'mkdir'), \
             patch('engine.WorkLedger') as mock_ledger_class:

            mock_ledger = MagicMock(spec=WorkLedger)
            mock_ledger.get.return_value = None
            mock_ledger_class.return_value = mock_ledger

            engine = ExecutionEngine.__new__(ExecutionEngine)
            engine.config = mock_config
            engine.work_ledger = mock_ledger

            engine.jira = MagicMock()
            engine.log = MagicMock()
            engine._upsert_work_ledger_entry = MagicMock()

            return engine

    def test_epic_transitions_when_all_children_done(self):
        """Epic transitions to Done when all child stories are resolved."""
        engine = self._create_mock_engine()

        # Mock children all resolved
        engine.jira.get_children_for_epic.return_value = [
            {'key': 'KAN-17', 'fields': {'status': {'name': 'Done'}, 'summary': 'Story 1'}},
            {'key': 'KAN-18', 'fields': {'status': {'name': 'Done'}, 'summary': 'Story 2'}},
        ]

        # Mock transitions
        engine.jira.get_available_transition_names.return_value = ["Done"]
        engine.jira.transition_issue.return_value = True

        result = engine.reconcile_epic("KAN-10")

        self.assertTrue(result)
        engine.jira.transition_issue.assert_called_with("KAN-10", "Done")

    def test_epic_not_reconciled_with_unresolved_children(self):
        """Epic not reconciled when some children are unresolved."""
        engine = self._create_mock_engine()

        # Mock children with one unresolved
        engine.jira.get_children_for_epic.return_value = [
            {'key': 'KAN-17', 'fields': {'status': {'name': 'Done'}, 'summary': 'Story 1'}},
            {'key': 'KAN-18', 'fields': {'status': {'name': 'In Progress'}, 'summary': 'Story 2'}},
        ]

        result = engine.reconcile_epic("KAN-10")

        self.assertFalse(result)
        engine.jira.transition_issue.assert_not_called()


class TestIdeaReconciliation(unittest.TestCase):
    """Test Idea reconciliation when all Epics resolved."""

    def _create_mock_engine(self):
        """Create mock engine for testing."""
        from engine import ExecutionEngine, Config

        mock_config = MagicMock(spec=Config)
        mock_config.repo_path = "/tmp/test-repo"
        mock_config.software_project = "KAN"

        with patch('engine.subprocess.run'), \
             patch('engine.rotate_logs'), \
             patch.object(Path, 'mkdir'), \
             patch('engine.WorkLedger') as mock_ledger_class:

            engine = ExecutionEngine.__new__(ExecutionEngine)
            engine.config = mock_config
            engine.work_ledger = MagicMock()

            engine.jira = MagicMock()
            engine.log = MagicMock()
            engine._upsert_work_ledger_entry = MagicMock()

            return engine

    def test_idea_transitions_when_all_epics_done(self):
        """Idea transitions when all child Epics are resolved."""
        engine = self._create_mock_engine()

        # Mock all Epics resolved
        engine.jira.get_epics_for_idea.return_value = [
            {'key': 'KAN-10', 'fields': {'status': {'name': 'Done'}, 'summary': 'Epic 1'}},
            {'key': 'KAN-11', 'fields': {'status': {'name': 'Complete'}, 'summary': 'Epic 2'}},
        ]

        # Mock transitions
        engine.jira.get_available_transition_names.return_value = ["Done"]
        engine.jira.transition_issue.return_value = True

        result = engine.reconcile_idea("EA-19")

        self.assertTrue(result)
        engine.jira.transition_issue.assert_called()


if __name__ == '__main__':
    unittest.main()
