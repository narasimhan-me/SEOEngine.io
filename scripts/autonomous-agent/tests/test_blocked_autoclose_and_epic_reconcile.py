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
    """Test Epic reconciliation when all children resolved.

    FIXUP-2 PATCH 4: Updated for auto-skip decomposition and Done guard.
    """

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
             patch('engine.WorkLedger') as mock_ledger_class, \
             patch('engine.DecompositionManifestStore') as mock_manifest_store_class:

            mock_ledger = MagicMock(spec=WorkLedger)
            # Provide decomposition evidence via work_ledger entry
            mock_entry = MagicMock(spec=WorkLedgerEntry)
            mock_entry.decomposition_fingerprint = "abc123"
            mock_entry.decomposition_skipped_at = None
            mock_entry.reconcile_next_at = None
            mock_entry.reconcile_last_fingerprint = None
            mock_entry.reconcile_last_commented_reason = None
            mock_entry.reconcile_last_commented_fingerprint = None
            mock_ledger.get.return_value = mock_entry
            mock_ledger_class.return_value = mock_ledger

            # Mock DecompositionManifestStore to return None (no manifest)
            mock_manifest_store = MagicMock()
            mock_manifest_store.load.return_value = None
            mock_manifest_store_class.return_value = mock_manifest_store

            engine = ExecutionEngine.__new__(ExecutionEngine)
            engine.config = mock_config
            engine.work_ledger = mock_ledger
            engine.reconcile_cooldown_seconds = 600  # FIXUP-2: Unified cooldown

            engine.jira = MagicMock()
            engine.log = MagicMock()
            engine._upsert_work_ledger_entry = MagicMock()

            return engine

    def test_epic_transitions_when_all_children_done(self):
        """Epic transitions to Done when all child stories are resolved."""
        engine = self._create_mock_engine()

        # Mock get_issue for issuetype-authoritative guard (with statusCategory)
        engine.jira.get_issue.return_value = {
            'key': 'KAN-10',
            'fields': {
                'issuetype': {'name': 'Epic'},
                'status': {'name': 'In Progress', 'statusCategory': {'name': 'In Progress'}},
            }
        }

        # Mock children all resolved (with statusCategory for terminal check)
        engine.jira.get_children_for_epic.return_value = [
            {'key': 'KAN-17', 'fields': {'status': {'name': 'Done', 'statusCategory': {'name': 'Done'}}, 'summary': 'Story 1'}},
            {'key': 'KAN-18', 'fields': {'status': {'name': 'Done', 'statusCategory': {'name': 'Done'}}, 'summary': 'Story 2'}},
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

        # Mock get_issue for issuetype-authoritative guard (with statusCategory)
        engine.jira.get_issue.return_value = {
            'key': 'KAN-10',
            'fields': {
                'issuetype': {'name': 'Epic'},
                'status': {'name': 'In Progress', 'statusCategory': {'name': 'In Progress'}},
            }
        }

        # Mock children with one unresolved (with statusCategory for terminal check)
        engine.jira.get_children_for_epic.return_value = [
            {'key': 'KAN-17', 'fields': {'status': {'name': 'Done', 'statusCategory': {'name': 'Done'}}, 'summary': 'Story 1'}},
            {'key': 'KAN-18', 'fields': {'status': {'name': 'In Progress', 'statusCategory': {'name': 'In Progress'}}, 'summary': 'Story 2'}},
        ]

        result = engine.reconcile_epic("KAN-10")

        self.assertFalse(result)
        engine.jira.transition_issue.assert_not_called()

    def test_epic_not_reconciled_if_wrong_issuetype(self):
        """Epic not reconciled when issuetype doesn't match contract."""
        engine = self._create_mock_engine()

        # Mock get_issue with wrong issuetype (e.g., Story instead of Epic)
        engine.jira.get_issue.return_value = {
            'key': 'KAN-10',
            'fields': {
                'issuetype': {'name': 'Story'},  # Wrong type
                'status': {'name': 'In Progress', 'statusCategory': {'name': 'In Progress'}},
            }
        }

        result = engine.reconcile_epic("KAN-10")

        self.assertFalse(result)
        # Should not even check children
        engine.jira.get_children_for_epic.assert_not_called()

    def test_epic_auto_records_skip_when_children_exist_no_decomposition(self):
        """Epic auto-records decomposition skip when children exist but no evidence."""
        engine = self._create_mock_engine()

        # Override mock to return entry without decomposition evidence
        mock_entry = MagicMock()
        mock_entry.decomposition_fingerprint = None
        mock_entry.decomposition_skipped_at = None
        mock_entry.reconcile_next_at = None
        mock_entry.reconcile_last_fingerprint = None
        mock_entry.reconcile_last_commented_reason = None
        mock_entry.reconcile_last_commented_fingerprint = None
        engine.work_ledger.get.return_value = mock_entry

        # Mock get_issue for issuetype guard (with statusCategory)
        engine.jira.get_issue.return_value = {
            'key': 'KAN-10',
            'fields': {
                'issuetype': {'name': 'Epic'},
                'status': {'name': 'In Progress', 'statusCategory': {'name': 'In Progress'}},
            }
        }

        # Mock children exist and are terminal
        engine.jira.get_children_for_epic.return_value = [
            {'key': 'KAN-17', 'fields': {'status': {'name': 'Done', 'statusCategory': {'name': 'Done'}}, 'summary': 'Story 1'}},
        ]

        # Mock transitions
        engine.jira.get_available_transition_names.return_value = ["Done"]
        engine.jira.transition_issue.return_value = True

        result = engine.reconcile_epic("KAN-10")

        # FIXUP-2: Should auto-record skip and proceed with reconciliation
        self.assertTrue(result)
        # Should have recorded decomposition skip evidence
        engine._upsert_work_ledger_entry.assert_called()

    def test_epic_not_reconciled_if_already_done(self):
        """Epic not reconciled when it's already Done."""
        engine = self._create_mock_engine()

        # Mock get_issue with Epic already Done
        engine.jira.get_issue.return_value = {
            'key': 'KAN-10',
            'fields': {
                'issuetype': {'name': 'Epic'},
                'status': {'name': 'Done', 'statusCategory': {'name': 'Done'}},  # Already Done
            }
        }

        result = engine.reconcile_epic("KAN-10")

        self.assertFalse(result)
        # Should not check children if already done
        engine.jira.get_children_for_epic.assert_not_called()


class TestIdeaReconciliation(unittest.TestCase):
    """Test Idea reconciliation when all Epics resolved.

    FIXUP-2 PATCH 4: Updated for per-Epic decomposition checks and Done-only requirement.
    """

    def _create_mock_engine(self, epic_entries=None):
        """Create mock engine for testing.

        Args:
            epic_entries: Optional dict mapping Epic keys to mock WorkLedgerEntry objects.
                          If None, all Epics will have decomposition_fingerprint set.
        """
        from engine import ExecutionEngine, Config
        from work_ledger import WorkLedger, WorkLedgerEntry

        mock_config = MagicMock(spec=Config)
        mock_config.repo_path = "/tmp/test-repo"
        mock_config.software_project = "KAN"

        with patch('engine.subprocess.run'), \
             patch('engine.rotate_logs'), \
             patch.object(Path, 'mkdir'), \
             patch('engine.WorkLedger') as mock_ledger_class, \
             patch('engine.DecompositionManifestStore') as mock_manifest_store_class:

            mock_ledger = MagicMock(spec=WorkLedger)

            # Create Idea work_ledger entry
            idea_entry = MagicMock(spec=WorkLedgerEntry)
            idea_entry.children = ['KAN-10', 'KAN-11']
            idea_entry.decomposition_skipped_at = None
            idea_entry.reconcile_next_at = None
            idea_entry.reconcile_last_fingerprint = None
            idea_entry.reconcile_last_commented_reason = None
            idea_entry.reconcile_last_commented_fingerprint = None

            # Create default Epic entries with decomposition evidence
            default_epic_entry = MagicMock(spec=WorkLedgerEntry)
            default_epic_entry.decomposition_fingerprint = "abc123"
            default_epic_entry.decomposition_skipped_at = None

            # FIXUP-2: Use side_effect to return different entries for Idea vs Epic keys
            def get_entry(key):
                if key == "EA-19":
                    return idea_entry
                if epic_entries and key in epic_entries:
                    return epic_entries[key]
                # Default: return entry with decomposition evidence
                return default_epic_entry

            mock_ledger.get.side_effect = get_entry
            mock_ledger_class.return_value = mock_ledger

            # Mock DecompositionManifestStore to return None (no manifest)
            # Tests use work_ledger decomposition_fingerprint as evidence
            mock_manifest_store = MagicMock()
            mock_manifest_store.load.return_value = None
            mock_manifest_store_class.return_value = mock_manifest_store

            engine = ExecutionEngine.__new__(ExecutionEngine)
            engine.config = mock_config
            engine.work_ledger = mock_ledger
            engine.reconcile_cooldown_seconds = 600  # FIXUP-2: Unified cooldown

            engine.jira = MagicMock()
            engine.log = MagicMock()
            engine._upsert_work_ledger_entry = MagicMock()

            return engine

    def test_idea_transitions_when_all_epics_done(self):
        """Idea transitions when all child Epics are Done with decomposition evidence."""
        engine = self._create_mock_engine()

        # Mock get_issue for issuetype-authoritative guard
        engine.jira.get_issue.return_value = {
            'key': 'EA-19',
            'fields': {
                'issuetype': {'name': 'Idea'},
                'status': {'name': 'In Progress', 'statusCategory': {'name': 'In Progress'}},
            }
        }

        # Mock all Epics Done (with statusCategory for Done check)
        engine.jira.get_epics_for_idea.return_value = [
            {'key': 'KAN-10', 'fields': {'status': {'name': 'Done', 'statusCategory': {'name': 'Done'}}, 'summary': 'Epic 1'}},
            {'key': 'KAN-11', 'fields': {'status': {'name': 'Done', 'statusCategory': {'name': 'Done'}}, 'summary': 'Epic 2'}},
        ]

        # Mock transitions
        engine.jira.get_available_transition_names.return_value = ["Done"]
        engine.jira.transition_issue.return_value = True

        result = engine.reconcile_idea("EA-19")

        self.assertTrue(result)
        engine.jira.transition_issue.assert_called()

    def test_idea_not_reconciled_if_wrong_issuetype(self):
        """Idea not reconciled when issuetype doesn't match contract."""
        engine = self._create_mock_engine()

        # Mock get_issue with wrong issuetype (e.g., Epic instead of Idea)
        engine.jira.get_issue.return_value = {
            'key': 'EA-19',
            'fields': {
                'issuetype': {'name': 'Epic'},  # Wrong type
                'status': {'name': 'In Progress', 'statusCategory': {'name': 'In Progress'}},
            }
        }

        result = engine.reconcile_idea("EA-19")

        self.assertFalse(result)
        # Should not even check epics
        engine.jira.get_epics_for_idea.assert_not_called()

    def test_idea_not_reconciled_with_unresolved_epics(self):
        """Idea not reconciled when some Epics are not Done."""
        engine = self._create_mock_engine()

        # Mock get_issue for issuetype-authoritative guard
        engine.jira.get_issue.return_value = {
            'key': 'EA-19',
            'fields': {
                'issuetype': {'name': 'Idea'},
                'status': {'name': 'In Progress', 'statusCategory': {'name': 'In Progress'}},
            }
        }

        # Mock Epics with one not Done (In Progress)
        engine.jira.get_epics_for_idea.return_value = [
            {'key': 'KAN-10', 'fields': {'status': {'name': 'Done', 'statusCategory': {'name': 'Done'}}, 'summary': 'Epic 1'}},
            {'key': 'KAN-11', 'fields': {'status': {'name': 'In Progress', 'statusCategory': {'name': 'In Progress'}}, 'summary': 'Epic 2'}},
        ]

        result = engine.reconcile_idea("EA-19")

        self.assertFalse(result)
        engine.jira.transition_issue.assert_not_called()

    def test_idea_not_reconciled_if_child_epic_missing_decomposition_evidence(self):
        """Idea not reconciled when a child Epic is missing decomposition evidence."""
        # Create Epic entry without decomposition evidence
        from work_ledger import WorkLedgerEntry
        epic_without_decomp = MagicMock(spec=WorkLedgerEntry)
        epic_without_decomp.decomposition_fingerprint = None
        epic_without_decomp.decomposition_skipped_at = None

        epic_entries = {
            'KAN-10': MagicMock(spec=WorkLedgerEntry, decomposition_fingerprint="abc123", decomposition_skipped_at=None),
            'KAN-11': epic_without_decomp,  # Missing decomposition evidence
        }

        engine = self._create_mock_engine(epic_entries=epic_entries)

        # Mock get_issue for issuetype-authoritative guard
        engine.jira.get_issue.return_value = {
            'key': 'EA-19',
            'fields': {
                'issuetype': {'name': 'Idea'},
                'status': {'name': 'In Progress', 'statusCategory': {'name': 'In Progress'}},
            }
        }

        # Mock all Epics Done (but one missing decomposition evidence)
        engine.jira.get_epics_for_idea.return_value = [
            {'key': 'KAN-10', 'fields': {'status': {'name': 'Done', 'statusCategory': {'name': 'Done'}}, 'summary': 'Epic 1'}},
            {'key': 'KAN-11', 'fields': {'status': {'name': 'Done', 'statusCategory': {'name': 'Done'}}, 'summary': 'Epic 2'}},
        ]

        result = engine.reconcile_idea("EA-19")

        self.assertFalse(result)
        engine.jira.transition_issue.assert_not_called()
        # Should have posted a comment about missing decomposition
        engine.jira.add_comment.assert_called()

    def test_idea_not_reconciled_if_already_done(self):
        """Idea not reconciled when it's already Done."""
        engine = self._create_mock_engine()

        # Mock get_issue with Idea already Done
        engine.jira.get_issue.return_value = {
            'key': 'EA-19',
            'fields': {
                'issuetype': {'name': 'Idea'},
                'status': {'name': 'Done', 'statusCategory': {'name': 'Done'}},  # Already Done
            }
        }

        result = engine.reconcile_idea("EA-19")

        self.assertFalse(result)
        # Should not check epics if already done
        engine.jira.get_epics_for_idea.assert_not_called()


if __name__ == '__main__':
    unittest.main()
