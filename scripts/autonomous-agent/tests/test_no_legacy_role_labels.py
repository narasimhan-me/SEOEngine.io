"""
Unit tests for Role Label Compliance.

PATCH BATCH: AUTONOMOUS-AGENT-RESUME-STATE-MACHINE-RECONCILE-1 - FIXUP-1 PATCH 3

Tests:
- No remaining self.log("SYSTEM" or self.log("CLAUDE" strings in engine.py
- Log formatter still includes model= and tool= when provided
"""

import unittest
from pathlib import Path
import re
import sys

# Import the engine module for formatter test
sys.path.insert(0, str(Path(__file__).parent.parent))

from engine import _format_log_line


class TestNoLegacyRoleLabels(unittest.TestCase):
    """Scan engine.py source to ensure no legacy role labels remain."""

    def test_no_self_log_system_in_engine_py(self):
        """No remaining self.log("SYSTEM" calls in engine.py."""
        engine_path = Path(__file__).parent.parent / "engine.py"
        content = engine_path.read_text(encoding='utf-8')

        # Find all self.log("SYSTEM" occurrences
        matches = re.findall(r'self\.log\s*\(\s*["\']SYSTEM["\']', content)

        self.assertEqual(len(matches), 0,
            f'Found {len(matches)} self.log("SYSTEM"...) calls. '
            'All SYSTEM calls should be replaced with SUPERVISOR.')

    def test_no_self_log_claude_in_engine_py(self):
        """No remaining self.log("CLAUDE" calls in engine.py."""
        engine_path = Path(__file__).parent.parent / "engine.py"
        content = engine_path.read_text(encoding='utf-8')

        # Find all self.log("CLAUDE" occurrences
        matches = re.findall(r'self\.log\s*\(\s*["\']CLAUDE["\']', content)

        self.assertEqual(len(matches), 0,
            f'Found {len(matches)} self.log("CLAUDE"...) calls. '
            'All CLAUDE calls should be replaced with IMPLEMENTER.')

    def test_no_print_system_in_engine_py(self):
        """No print("[SYSTEM]...") statements outside JiraClient.test_connection."""
        engine_path = Path(__file__).parent.parent / "engine.py"
        content = engine_path.read_text(encoding='utf-8')

        # Find print("[SYSTEM]") occurrences
        matches = re.findall(r'print\s*\(\s*f?["\']?\[SYSTEM\]', content)

        self.assertEqual(len(matches), 0,
            f'Found {len(matches)} print("[SYSTEM]...") statements. '
            'These should be replaced with print("[JIRA]...") or routed through engine logging.')


class TestLogFormatterWithModelTool(unittest.TestCase):
    """Test log formatter includes model and tool when provided."""

    def test_formatter_includes_model(self):
        """Formatter includes model= when provided."""
        line = _format_log_line("IMPLEMENTER", "Test message", model="sonnet")
        self.assertIn("model=sonnet", line)

    def test_formatter_includes_tool(self):
        """Formatter includes tool= when provided."""
        line = _format_log_line("IMPLEMENTER", "Test message", tool="claude-code-cli")
        self.assertIn("tool=claude-code-cli", line)

    def test_formatter_includes_both_model_and_tool(self):
        """Formatter includes both model= and tool= when provided."""
        line = _format_log_line("IMPLEMENTER", "Test message", model="opus", tool="claude-code-cli")
        self.assertIn("model=opus", line)
        self.assertIn("tool=claude-code-cli", line)

    def test_formatter_no_model_tool_suffix_when_not_provided(self):
        """Formatter does not add suffix when model/tool not provided."""
        line = _format_log_line("SUPERVISOR", "Test message")
        self.assertNotIn("model=", line)
        self.assertNotIn("tool=", line)
        self.assertIn("[SUPERVISOR]", line)

    def test_formatter_valid_roles(self):
        """Formatter accepts UEP, SUPERVISOR, IMPLEMENTER roles."""
        for role in ["UEP", "SUPERVISOR", "IMPLEMENTER"]:
            line = _format_log_line(role, "Test message")
            self.assertIn(f"[{role}]", line)


if __name__ == '__main__':
    unittest.main()
