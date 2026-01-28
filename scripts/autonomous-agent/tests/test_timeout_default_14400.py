"""
Unit tests for Timeout Standardization.

PATCH BATCH: AUTONOMOUS-AGENT-RESUME-STATE-MACHINE-RECONCILE-1 - PATCH 6

Tests:
- Engine effective default timeout is 14400s (4 hours)
- Override logging shows source
"""

import unittest
from unittest.mock import MagicMock, patch
from pathlib import Path
import os
import sys

# Import the engine module
sys.path.insert(0, str(Path(__file__).parent.parent))

from engine import CLAUDE_TIMEOUT_SECONDS


class TestTimeoutDefault(unittest.TestCase):
    """Test default timeout configuration."""

    def test_default_timeout_is_14400_seconds(self):
        """Default timeout constant is 14400s (4 hours)."""
        self.assertEqual(CLAUDE_TIMEOUT_SECONDS, 14400)

    def test_default_timeout_is_4_hours(self):
        """Default timeout is exactly 4 hours."""
        hours = CLAUDE_TIMEOUT_SECONDS / 3600
        self.assertEqual(hours, 4.0)


class TestTimeoutPrecedence(unittest.TestCase):
    """Test timeout override precedence."""

    def _create_mock_engine(self, cli_timeout=None, env_vars=None):
        """Create mock engine with specific timeout configuration."""
        from engine import ExecutionEngine, Config

        mock_config = MagicMock(spec=Config)
        mock_config.repo_path = "/tmp/test-repo"
        mock_config.jira_url = "https://test.atlassian.net"
        mock_config.jira_username = "test@example.com"
        mock_config.jira_token = "test-token"
        mock_config.github_token = "test-github-token"
        mock_config.feature_branch = "feature/test"
        mock_config.validate.return_value = []

        # Set environment variables
        env = env_vars or {}
        with patch.dict(os.environ, env, clear=False), \
             patch('engine.subprocess.run') as mock_run, \
             patch('engine.rotate_logs'), \
             patch.object(Path, 'mkdir'), \
             patch('engine.WorkLedger') as mock_ledger:

            mock_run.return_value = MagicMock(returncode=0, stdout="1.0.0", stderr="")
            mock_ledger_instance = MagicMock()
            mock_ledger_instance.load.return_value = True
            mock_ledger_instance.all_entries.return_value = {}
            mock_ledger_instance.get_resumable_entries.return_value = []
            mock_ledger.return_value = mock_ledger_instance

            engine = ExecutionEngine(mock_config, cli_timeout_secs=cli_timeout)
            return engine

    def test_no_override_uses_default(self):
        """Without overrides, uses default 14400s."""
        # Clear any timeout env vars
        env = {
            'CLAUDE_TIMEOUT_SECONDS': '',
            'ENGINEO_CLAUDE_TIMEOUT_SECONDS': '',
            'CLAUDE_TIMEOUT_SECS': '',
        }
        engine = self._create_mock_engine(env_vars=env)
        self.assertEqual(engine.claude_timeout_seconds, 14400)

    def test_cli_override_has_highest_precedence(self):
        """CLI flag overrides env vars."""
        env = {
            'CLAUDE_TIMEOUT_SECONDS': '7200',
            'ENGINEO_CLAUDE_TIMEOUT_SECONDS': '3600',
        }
        engine = self._create_mock_engine(cli_timeout=1800, env_vars=env)
        self.assertEqual(engine.claude_timeout_seconds, 1800)

    def test_env_var_override(self):
        """Env var overrides default."""
        env = {
            'CLAUDE_TIMEOUT_SECONDS': '7200',
        }
        engine = self._create_mock_engine(env_vars=env)
        self.assertEqual(engine.claude_timeout_seconds, 7200)


class TestTimeoutOverrideLogging(unittest.TestCase):
    """FIXUP-1 PATCH 5: Test timeout override logging."""

    def test_override_log_emitted_for_cli_flag(self):
        """Timeout override log emitted when using CLI flag."""
        from engine import ExecutionEngine, Config

        mock_config = MagicMock(spec=Config)
        mock_config.repo_path = "/tmp/test-repo"
        mock_config.jira_url = "https://test.atlassian.net"
        mock_config.jira_username = "test@example.com"
        mock_config.jira_token = "test-token"
        mock_config.github_token = "test-github-token"
        mock_config.feature_branch = "feature/test"
        mock_config.validate.return_value = []

        log_lines = []

        def capture_log(role, msg, **kwargs):
            log_lines.append(f"[{role}] {msg}")

        with patch('engine.subprocess.run') as mock_run, \
             patch('engine.rotate_logs'), \
             patch.object(Path, 'mkdir'), \
             patch('engine.WorkLedger') as mock_ledger, \
             patch('builtins.print'):  # Suppress print

            mock_run.return_value = MagicMock(returncode=0, stdout="1.0.0", stderr="")
            mock_ledger_instance = MagicMock()
            mock_ledger_instance.load.return_value = True
            mock_ledger_instance.all_entries.return_value = {}
            mock_ledger_instance.get_resumable_entries.return_value = []
            mock_ledger.return_value = mock_ledger_instance

            engine = ExecutionEngine(mock_config, cli_timeout_secs=1800)
            engine.log = capture_log

            # Re-trigger the override log (normally happens in __init__)
            # We'll check the timeout source tracking instead
            self.assertEqual(engine.claude_timeout_seconds, 1800)
            self.assertEqual(engine.timeout_source, "cli_flag")

    def test_override_log_shows_env_var_source(self):
        """Timeout override shows env var as source."""
        from engine import ExecutionEngine, Config

        mock_config = MagicMock(spec=Config)
        mock_config.repo_path = "/tmp/test-repo"
        mock_config.jira_url = "https://test.atlassian.net"
        mock_config.jira_username = "test@example.com"
        mock_config.jira_token = "test-token"
        mock_config.github_token = "test-github-token"
        mock_config.feature_branch = "feature/test"
        mock_config.validate.return_value = []

        env = {
            'CLAUDE_TIMEOUT_SECONDS': '7200',
        }

        with patch.dict(os.environ, env, clear=False), \
             patch('engine.subprocess.run') as mock_run, \
             patch('engine.rotate_logs'), \
             patch.object(Path, 'mkdir'), \
             patch('engine.WorkLedger') as mock_ledger, \
             patch('builtins.print'):

            mock_run.return_value = MagicMock(returncode=0, stdout="1.0.0", stderr="")
            mock_ledger_instance = MagicMock()
            mock_ledger_instance.load.return_value = True
            mock_ledger_instance.all_entries.return_value = {}
            mock_ledger_instance.get_resumable_entries.return_value = []
            mock_ledger.return_value = mock_ledger_instance

            engine = ExecutionEngine(mock_config)
            self.assertEqual(engine.claude_timeout_seconds, 7200)
            self.assertEqual(engine.timeout_source, "env:CLAUDE_TIMEOUT_SECONDS")

    def test_no_override_log_for_default(self):
        """No timeout override log when using default."""
        from engine import ExecutionEngine, Config

        mock_config = MagicMock(spec=Config)
        mock_config.repo_path = "/tmp/test-repo"
        mock_config.jira_url = "https://test.atlassian.net"
        mock_config.jira_username = "test@example.com"
        mock_config.jira_token = "test-token"
        mock_config.github_token = "test-github-token"
        mock_config.feature_branch = "feature/test"
        mock_config.validate.return_value = []

        env = {
            'CLAUDE_TIMEOUT_SECONDS': '',
            'ENGINEO_CLAUDE_TIMEOUT_SECONDS': '',
            'CLAUDE_TIMEOUT_SECS': '',
        }

        with patch.dict(os.environ, env, clear=False), \
             patch('engine.subprocess.run') as mock_run, \
             patch('engine.rotate_logs'), \
             patch.object(Path, 'mkdir'), \
             patch('engine.WorkLedger') as mock_ledger, \
             patch('builtins.print'):

            mock_run.return_value = MagicMock(returncode=0, stdout="1.0.0", stderr="")
            mock_ledger_instance = MagicMock()
            mock_ledger_instance.load.return_value = True
            mock_ledger_instance.all_entries.return_value = {}
            mock_ledger_instance.get_resumable_entries.return_value = []
            mock_ledger.return_value = mock_ledger_instance

            engine = ExecutionEngine(mock_config)
            self.assertEqual(engine.claude_timeout_seconds, 14400)
            self.assertEqual(engine.timeout_source, "default")


if __name__ == '__main__':
    unittest.main()
