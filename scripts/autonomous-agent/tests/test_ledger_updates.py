"""
Unit tests for ledger creation and update logic.

PATCH 6: Tests for _load_or_init_guardrails_ledger and _upsert_kan_story_run.
"""

import unittest
from unittest.mock import MagicMock, patch
from pathlib import Path
import sys

# Import the engine module
sys.path.insert(0, str(Path(__file__).parent.parent))


class TestLedgerUpdates(unittest.TestCase):
    """Test ledger creation and update logic."""

    def _create_mock_engine(self):
        """Create a mock ExecutionEngine instance for testing."""
        # Import here to avoid circular issues
        from engine import ExecutionEngine, Config

        # Create a minimal config
        mock_config = MagicMock(spec=Config)
        mock_config.repo_path = "/tmp/test-repo"
        mock_config.jira_url = "https://test.atlassian.net"
        mock_config.jira_username = "test@example.com"
        mock_config.jira_token = "test-token"
        mock_config.github_token = "test-github-token"
        mock_config.feature_branch = "feature/test"
        mock_config.validate.return_value = []

        # Patch the subprocess and other IO during init
        with patch('engine.subprocess.run') as mock_run, \
             patch('engine.rotate_logs') as mock_rotate, \
             patch.object(Path, 'mkdir'):
            mock_run.return_value = MagicMock(returncode=0, stdout="1.0.0", stderr="")
            mock_rotate.return_value = 0

            # Create engine with mocked config
            engine = ExecutionEngine.__new__(ExecutionEngine)
            engine.config = mock_config
            engine.run_id = "20260127-120000Z"
            engine.logs_dir = Path("/tmp/test-logs")
            engine.engine_log_path = engine.logs_dir / "engine-test.log"

        return engine

    def test_ledger_missing_creates_and_initializes(self):
        """When ledger is missing, _load_or_init_guardrails_ledger creates it."""
        engine = self._create_mock_engine()

        # Mock _load_guardrails_ledger to return None (missing)
        engine._load_guardrails_ledger = MagicMock(return_value=None)
        engine._save_guardrails_ledger = MagicMock(return_value=True)
        engine.log = MagicMock()

        result = engine._load_or_init_guardrails_ledger()

        # Should return dict with version and kan_story_runs
        self.assertIsInstance(result, dict)
        self.assertIn("version", result)
        self.assertIn("kan_story_runs", result)
        self.assertEqual(result["version"], 1)
        self.assertIsInstance(result["kan_story_runs"], dict)

    def test_multi_issue_upserts_create_separate_entries(self):
        """Multiple upserts for different keys create separate entries."""
        engine = self._create_mock_engine()

        # Start with empty ledger
        ledger = {"version": 1, "kan_story_runs": {}}
        engine._load_or_init_guardrails_ledger = MagicMock(return_value=ledger.copy())
        engine._save_guardrails_ledger = MagicMock(return_value=True)
        engine.log = MagicMock()

        # First upsert
        engine._upsert_kan_story_run("KAN-16", {"status": "implemented"})

        # Get the ledger that was saved
        saved_ledger_1 = engine._save_guardrails_ledger.call_args[0][0]
        self.assertIn("KAN-16", saved_ledger_1["kan_story_runs"])

        # Update mock to return the saved ledger
        engine._load_or_init_guardrails_ledger = MagicMock(return_value=saved_ledger_1.copy())

        # Second upsert
        engine._upsert_kan_story_run("KAN-17", {"status": "implemented"})

        # Get the ledger that was saved
        saved_ledger_2 = engine._save_guardrails_ledger.call_args[0][0]

        # Both entries should exist
        self.assertIn("KAN-16", saved_ledger_2["kan_story_runs"])
        self.assertIn("KAN-17", saved_ledger_2["kan_story_runs"])

    def test_verification_updates_status_to_verified(self):
        """Upsert with status=verified updates the ledger entry."""
        engine = self._create_mock_engine()

        # Start with existing entry
        ledger = {
            "version": 1,
            "kan_story_runs": {
                "KAN-16": {
                    "issueKey": "KAN-16",
                    "status": "implemented",
                    "guardrailsPassed": True,
                }
            }
        }
        engine._load_or_init_guardrails_ledger = MagicMock(return_value=ledger.copy())
        engine._save_guardrails_ledger = MagicMock(return_value=True)
        engine.log = MagicMock()

        # Upsert with verified status
        engine._upsert_kan_story_run("KAN-16", {
            "status": "verified",
            "verificationReportPath": "reports/KAN-16-verification.md"
        })

        # Get the ledger that was saved
        saved_ledger = engine._save_guardrails_ledger.call_args[0][0]

        # Entry should be updated
        entry = saved_ledger["kan_story_runs"]["KAN-16"]
        self.assertEqual(entry["status"], "verified")
        self.assertEqual(entry["verificationReportPath"], "reports/KAN-16-verification.md")
        self.assertIn("updatedAt", entry)

    def test_upsert_preserves_existing_fields(self):
        """Upsert merges updates without destroying existing fields."""
        engine = self._create_mock_engine()

        # Start with existing entry with extra fields
        ledger = {
            "version": 1,
            "kan_story_runs": {
                "KAN-16": {
                    "issueKey": "KAN-16",
                    "baseSha": "abc123",
                    "changedFiles": ["file1.py", "file2.py"],
                    "guardrailsPassed": True,
                }
            }
        }
        engine._load_or_init_guardrails_ledger = MagicMock(return_value=ledger.copy())
        engine._save_guardrails_ledger = MagicMock(return_value=True)
        engine.log = MagicMock()

        # Upsert with only status update
        engine._upsert_kan_story_run("KAN-16", {"status": "verified"})

        # Get the ledger that was saved
        saved_ledger = engine._save_guardrails_ledger.call_args[0][0]
        entry = saved_ledger["kan_story_runs"]["KAN-16"]

        # Original fields should be preserved
        self.assertEqual(entry["baseSha"], "abc123")
        self.assertEqual(entry["changedFiles"], ["file1.py", "file2.py"])
        self.assertTrue(entry["guardrailsPassed"])
        # New field should be added
        self.assertEqual(entry["status"], "verified")


if __name__ == '__main__':
    unittest.main()
