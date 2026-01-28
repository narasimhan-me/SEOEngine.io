"""
Unit tests for Dispatcher Priority State Machine.

PATCH BATCH: AUTONOMOUS-AGENT-RESUME-STATE-MACHINE-RECONCILE-1 - PATCH 2

Tests:
- Priority order is enforced (Recover > Verify/Close > Implement > Decompose > Intake)
- Epic A (In Progress) selected before Epic B (To Do) in decompose queue
"""

import unittest
from unittest.mock import MagicMock, patch, PropertyMock
from pathlib import Path
import sys

# Import the engine module
sys.path.insert(0, str(Path(__file__).parent.parent))

from work_ledger import WorkLedger, WorkLedgerEntry, LastStep


class TestDispatcherPriority(unittest.TestCase):
    """Test dispatcher priority state machine."""

    def _create_mock_engine(self):
        """Create a mock ExecutionEngine instance for testing."""
        from engine import ExecutionEngine, Config

        mock_config = MagicMock(spec=Config)
        mock_config.repo_path = "/tmp/test-repo"
        mock_config.jira_url = "https://test.atlassian.net"
        mock_config.jira_username = "test@example.com"
        mock_config.jira_token = "test-token"
        mock_config.github_token = "test-github-token"
        mock_config.feature_branch = "feature/test"
        mock_config.software_project = "KAN"
        mock_config.product_discovery_project = "EA"
        mock_config.validate.return_value = []

        with patch('engine.subprocess.run') as mock_run, \
             patch('engine.rotate_logs') as mock_rotate, \
             patch.object(Path, 'mkdir'), \
             patch('engine.WorkLedger') as mock_ledger_class:

            mock_run.return_value = MagicMock(returncode=0, stdout="1.0.0", stderr="")
            mock_rotate.return_value = 0

            # Create mock work ledger
            mock_ledger = MagicMock(spec=WorkLedger)
            mock_ledger.load.return_value = True
            mock_ledger.save.return_value = True
            mock_ledger.all_entries.return_value = {}
            mock_ledger.get_resumable_entries.return_value = []
            mock_ledger_class.return_value = mock_ledger

            engine = ExecutionEngine.__new__(ExecutionEngine)
            engine.config = mock_config
            engine.run_id = "20260127-120000Z"
            engine.logs_dir = Path("/tmp/test-logs")
            engine.engine_log_path = engine.logs_dir / "engine-test.log"
            engine.work_ledger = mock_ledger

            # Mock Jira client
            engine.jira = MagicMock()
            # PATCH B: parse_adf_to_text must return string for should_decompose
            engine.jira.parse_adf_to_text.return_value = "Epic description"
            engine.git = MagicMock()
            engine.email = MagicMock()
            engine.files = MagicMock()

            # Mock log method
            engine.log = MagicMock()

            # Mock helper methods
            engine._canonical_report_exists = MagicMock(return_value=False)
            engine._process_story = MagicMock(return_value=True)
            engine._process_epic = MagicMock(return_value=True)
            engine._process_idea = MagicMock(return_value=True)
            engine.verify_work_item = MagicMock(return_value=True)

        return engine

    def test_verify_close_before_implement(self):
        """Verify/Close queue is processed before Implement queue."""
        engine = self._create_mock_engine()

        # Setup: Stories in progress (for verify/close)
        story_in_progress = {
            'key': 'KAN-17',
            'fields': {
                'summary': 'Test story in progress',
                'status': {'name': 'In Progress'},
                'issuetype': {'name': 'Story'},
            }
        }
        engine.jira.get_stories_for_verify_close.return_value = [story_in_progress]

        # Setup: Stories to do (for implement)
        story_todo = {
            'key': 'KAN-18',
            'fields': {
                'summary': 'Test story to do',
                'status': {'name': 'To Do'},
                'issuetype': {'name': 'Story'},
            }
        }
        engine.jira.get_stories_todo.return_value = [story_todo]

        # Empty other queues
        engine.jira.get_epics_for_decomposition.return_value = []
        engine.jira.get_ideas_todo.return_value = []

        # Run dispatch
        result = engine.dispatch_once()

        # Verify story was verified, not implemented
        self.assertTrue(result)
        engine.verify_work_item.assert_called_once_with(story_in_progress)
        engine._process_story.assert_not_called()

    def test_implement_before_decompose(self):
        """Implement queue is processed before Decompose queue."""
        engine = self._create_mock_engine()

        # Empty verify/close queue
        engine.jira.get_stories_for_verify_close.return_value = []

        # Setup: Stories to do (for implement)
        story_todo = {
            'key': 'KAN-17',
            'fields': {
                'summary': 'Test story',
                'status': {'name': 'To Do'},
                'issuetype': {'name': 'Story'},
            }
        }
        engine.jira.get_stories_todo.return_value = [story_todo]

        # Setup: Epic for decomposition
        epic = {
            'key': 'KAN-10',
            'fields': {
                'summary': 'Test epic',
                'status': {'name': 'To Do'},
                'issuetype': {'name': 'Epic'},
            }
        }
        engine.jira.get_epics_for_decomposition.return_value = [epic]
        engine.jira.get_implement_stories_for_epic.return_value = []  # No existing children
        engine.work_ledger.get.return_value = None  # No ledger entry

        # Empty intake queue
        engine.jira.get_ideas_todo.return_value = []

        # Run dispatch
        result = engine.dispatch_once()

        # Verify story was processed, not epic
        self.assertTrue(result)
        engine._process_story.assert_called_once()
        engine._process_epic.assert_not_called()

    def test_epic_in_progress_before_todo(self):
        """Epic A (In Progress) selected before Epic B (To Do) in decompose queue."""
        engine = self._create_mock_engine()

        # Empty higher priority queues
        engine.jira.get_stories_for_verify_close.return_value = []
        engine.jira.get_stories_todo.return_value = []

        # Setup: Epics - A is In Progress, B is To Do
        epic_a = {
            'key': 'KAN-10',
            'fields': {
                'summary': 'Epic A - In Progress',
                'status': {'name': 'In Progress'},
                'statusCategory': {'name': 'In Progress'},
                'issuetype': {'name': 'Epic'},
                'description': {},  # PATCH B: Added for should_decompose
            }
        }
        epic_b = {
            'key': 'KAN-11',
            'fields': {
                'summary': 'Epic B - To Do',
                'status': {'name': 'To Do'},
                'statusCategory': {'name': 'To Do'},
                'issuetype': {'name': 'Epic'},
                'description': {},  # PATCH B: Added for should_decompose
            }
        }
        # Return A before B (In Progress has priority in statusCategory In Progress)
        engine.jira.get_epics_for_decomposition.return_value = [epic_a, epic_b]
        engine.jira.get_implement_stories_for_epic.return_value = []  # No existing children
        engine.work_ledger.get.return_value = None  # No ledger entry

        # Empty intake queue
        engine.jira.get_ideas_todo.return_value = []

        # Run dispatch
        result = engine.dispatch_once()

        # Verify Epic A was processed first
        self.assertTrue(result)
        engine._process_epic.assert_called_once()
        call_args = engine._process_epic.call_args[0][0]
        self.assertEqual(call_args['key'], 'KAN-10')

    def test_decompose_before_intake(self):
        """Decompose queue is processed before Intake queue."""
        engine = self._create_mock_engine()

        # Empty higher priority queues
        engine.jira.get_stories_for_verify_close.return_value = []
        engine.jira.get_stories_todo.return_value = []

        # Setup: Epic for decomposition
        epic = {
            'key': 'KAN-10',
            'fields': {
                'summary': 'Test epic',
                'status': {'name': 'To Do'},
                'issuetype': {'name': 'Epic'},
                'description': {},  # PATCH B: Added for should_decompose
            }
        }
        engine.jira.get_epics_for_decomposition.return_value = [epic]
        engine.jira.get_implement_stories_for_epic.return_value = []
        engine.work_ledger.get.return_value = None

        # Setup: Idea for intake
        idea = {
            'key': 'EA-20',
            'fields': {
                'summary': 'Test idea',
                'status': {'name': 'TO DO'},
                'issuetype': {'name': 'Idea'},
            }
        }
        engine.jira.get_ideas_todo.return_value = [idea]

        # Run dispatch
        result = engine.dispatch_once()

        # Verify epic was processed, not idea
        self.assertTrue(result)
        engine._process_epic.assert_called_once()
        engine._process_idea.assert_not_called()

    def test_skip_epic_with_existing_children_and_complete_manifest(self):
        """Epic with existing children and COMPLETE manifest is skipped in decompose queue.

        PATCH B: Skip requires COMPLETE manifest + existing children.
        """
        engine = self._create_mock_engine()

        # Empty higher priority queues
        engine.jira.get_stories_for_verify_close.return_value = []
        engine.jira.get_stories_todo.return_value = []

        # Setup: Epic with existing children
        epic = {
            'key': 'KAN-10',
            'fields': {
                'summary': 'Test epic',
                'status': {'name': 'To Do'},
                'issuetype': {'name': 'Epic'},
                'description': {},  # PATCH B: Added for should_decompose
            }
        }
        engine.jira.get_epics_for_decomposition.return_value = [epic]
        engine.jira.get_implement_stories_for_epic.return_value = [{'key': 'KAN-17'}]  # Has children
        engine.work_ledger.get.return_value = None

        # PATCH B: Create a COMPLETE manifest on disk for skip to work
        import tempfile
        from decomposition_manifest import DecompositionManifest, DecompositionManifestStore, compute_fingerprint

        with tempfile.TemporaryDirectory() as tmpdir:
            engine.config.repo_path = tmpdir
            store = DecompositionManifestStore(tmpdir)
            manifest = DecompositionManifest(
                epicKey="KAN-10",
                fingerprint=compute_fingerprint("Epic description"),  # Match parse_adf_to_text mock
            )
            manifest.add_child("Implement: Feature A", key="KAN-17")
            manifest.mark_complete()
            store.save(manifest)

            # Empty intake queue
            engine.jira.get_ideas_todo.return_value = []

            # Run dispatch
            result = engine.dispatch_once()

            # Epic should be skipped due to existing children + COMPLETE manifest
            self.assertFalse(result)
            engine._process_epic.assert_not_called()

    def test_idle_when_all_queues_empty(self):
        """dispatch_once returns False when all queues are empty."""
        engine = self._create_mock_engine()

        # All queues empty
        engine.jira.get_stories_for_verify_close.return_value = []
        engine.jira.get_stories_todo.return_value = []
        engine.jira.get_epics_for_decomposition.return_value = []
        engine.jira.get_ideas_todo.return_value = []

        # Run dispatch
        result = engine.dispatch_once()

        # Should return False (idle)
        self.assertFalse(result)
        engine._process_story.assert_not_called()
        engine._process_epic.assert_not_called()
        engine._process_idea.assert_not_called()
        engine.verify_work_item.assert_not_called()


class TestRecoverPriority(unittest.TestCase):
    """Test recover queue has highest priority."""

    def _create_mock_engine(self):
        """Create a mock ExecutionEngine instance for testing."""
        from engine import ExecutionEngine, Config

        mock_config = MagicMock(spec=Config)
        mock_config.repo_path = "/tmp/test-repo"
        mock_config.software_project = "KAN"
        mock_config.product_discovery_project = "EA"

        with patch('engine.subprocess.run') as mock_run, \
             patch('engine.rotate_logs'), \
             patch.object(Path, 'mkdir'), \
             patch('engine.WorkLedger') as mock_ledger_class:

            mock_run.return_value = MagicMock(returncode=0, stdout="1.0.0", stderr="")

            mock_ledger = MagicMock(spec=WorkLedger)
            mock_ledger.load.return_value = True
            mock_ledger.save.return_value = True
            mock_ledger_class.return_value = mock_ledger

            engine = ExecutionEngine.__new__(ExecutionEngine)
            engine.config = mock_config
            engine.run_id = "20260127-120000Z"
            engine.logs_dir = Path("/tmp/test-logs")
            engine.engine_log_path = engine.logs_dir / "engine-test.log"
            engine.work_ledger = mock_ledger

            engine.jira = MagicMock()
            engine.git = MagicMock()
            engine.email = MagicMock()
            engine.files = MagicMock()
            engine.log = MagicMock()

            engine._canonical_report_exists = MagicMock(return_value=False)
            engine._process_story = MagicMock(return_value=True)
            engine._process_epic = MagicMock(return_value=True)
            engine._process_idea = MagicMock(return_value=True)
            engine.verify_work_item = MagicMock(return_value=True)

        return engine

    def test_recover_before_verify(self):
        """Recover queue is processed before Verify/Close queue."""
        engine = self._create_mock_engine()

        # Setup: Resumable entry with error
        resumable_entry = WorkLedgerEntry(
            issueKey="KAN-17",
            issueType="Story",
            last_step=LastStep.VERIFY.value,
            last_error_fingerprint="error_hash",
        )
        engine.work_ledger.get_resumable_entries.return_value = [resumable_entry]

        # Mock get_issue to return the issue
        engine.jira.get_issue.return_value = {
            'key': 'KAN-17',
            'fields': {
                'summary': 'Test story',
                'status': {'name': 'In Progress'},
                'issuetype': {'name': 'Story'},
            }
        }

        # Setup: Stories in progress (for verify/close)
        story_in_progress = {
            'key': 'KAN-18',
            'fields': {
                'summary': 'Another story',
                'status': {'name': 'In Progress'},
                'issuetype': {'name': 'Story'},
            }
        }
        engine.jira.get_stories_for_verify_close.return_value = [story_in_progress]
        engine.jira.get_ideas_in_progress.return_value = []

        # Run dispatch
        result = engine.dispatch_once()

        # Verify recovery was attempted first
        self.assertTrue(result)
        engine.verify_work_item.assert_called()
        # Should have been called with KAN-17 (recover), not KAN-18 (verify queue)
        call_args = engine.verify_work_item.call_args_list[0][0][0]
        self.assertEqual(call_args['key'], 'KAN-17')


if __name__ == '__main__':
    unittest.main()
