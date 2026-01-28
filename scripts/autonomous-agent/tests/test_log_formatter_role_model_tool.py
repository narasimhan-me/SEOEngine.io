"""
Unit tests for Role Naming Standardization.

PATCH BATCH: AUTONOMOUS-AGENT-RESUME-STATE-MACHINE-RECONCILE-1 - PATCH 7

Tests:
- Log formatter emits expected role + model/tool fields
- Invalid roles normalized to fail-closed behavior
"""

import unittest
from pathlib import Path
import sys

# Import the engine module
sys.path.insert(0, str(Path(__file__).parent.parent))

from engine import _format_log_line


class TestLogFormatter(unittest.TestCase):
    """Test log line formatting."""

    def test_basic_role_format(self):
        """Basic role formatting without model/tool."""
        line = _format_log_line("SUPERVISOR", "Test message")

        self.assertIn("[SUPERVISOR]", line)
        self.assertIn("Test message", line)
        # Should have timestamp
        self.assertIn("Z]", line)

    def test_with_model(self):
        """Includes model in log line."""
        line = _format_log_line("IMPLEMENTER", "Test", model="sonnet")

        self.assertIn("[IMPLEMENTER]", line)
        self.assertIn("model=sonnet", line)

    def test_with_tool(self):
        """Includes tool in log line."""
        line = _format_log_line("IMPLEMENTER", "Test", tool="claude-code-cli")

        self.assertIn("[IMPLEMENTER]", line)
        self.assertIn("tool=claude-code-cli", line)

    def test_with_model_and_tool(self):
        """Includes both model and tool."""
        line = _format_log_line("IMPLEMENTER", "Test", model="sonnet", tool="claude-code-cli")

        self.assertIn("[IMPLEMENTER]", line)
        self.assertIn("model=sonnet", line)
        self.assertIn("tool=claude-code-cli", line)

    def test_valid_roles(self):
        """Valid roles are: UEP, SUPERVISOR, IMPLEMENTER."""
        for role in ["UEP", "SUPERVISOR", "IMPLEMENTER"]:
            line = _format_log_line(role, "Test")
            self.assertIn(f"[{role}]", line)


class TestRoleNormalization(unittest.TestCase):
    """Test role normalization in ExecutionEngine.log method."""

    def _create_mock_engine(self):
        """Create mock engine for testing."""
        from unittest.mock import MagicMock, patch
        from engine import ExecutionEngine, Config

        mock_config = MagicMock(spec=Config)
        mock_config.repo_path = "/tmp/test-repo"
        mock_config.jira_url = "https://test.atlassian.net"
        mock_config.jira_username = "test@example.com"
        mock_config.jira_token = "test-token"
        mock_config.github_token = "test-github-token"
        mock_config.feature_branch = "feature/test"
        mock_config.validate.return_value = []

        with patch('engine.subprocess.run') as mock_run, \
             patch('engine.rotate_logs'), \
             patch.object(Path, 'mkdir'), \
             patch('engine.WorkLedger') as mock_ledger, \
             patch('builtins.print'):  # Suppress print output

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
            engine.engine_log_path = None  # Disable file logging for test

            return engine

    def test_claude_role_becomes_implementer_with_tool(self):
        """CLAUDE role is normalized to IMPLEMENTER with tool=claude-code-cli."""
        engine = self._create_mock_engine()

        # Capture the log line via patching
        with unittest.mock.patch('builtins.print') as mock_print:
            engine.log("CLAUDE", "Test output")

            # Check the printed line
            call_args = mock_print.call_args[0][0]
            self.assertIn("[IMPLEMENTER]", call_args)
            self.assertIn("tool=claude-code-cli", call_args)

    def test_system_role_becomes_supervisor(self):
        """SYSTEM role is normalized to SUPERVISOR."""
        engine = self._create_mock_engine()

        with unittest.mock.patch('builtins.print') as mock_print:
            engine.log("SYSTEM", "Test message")

            call_args = mock_print.call_args[0][0]
            self.assertIn("[SUPERVISOR]", call_args)


if __name__ == '__main__':
    unittest.main()
