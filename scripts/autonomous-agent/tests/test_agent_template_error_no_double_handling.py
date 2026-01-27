"""
Unit tests for AGENT_TEMPLATE_ERROR double handling prevention.

PATCH BATCH: AUTONOMOUS-AGENT-AGENT-TEMPLATE-ERROR-NONRETRYABLE-FIXUP-1 - PATCH 3

Tests:
- _invoke_claude_code escalation gated by same dedup as Jira comment
- _process_story failure branch short-circuits on AGENT_TEMPLATE_ERROR
"""

import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock
import sys

# Import from engine module
sys.path.insert(0, str(Path(__file__).parent.parent))

from engine import (
    _is_agent_template_error,
    FATAL_AGENT_TEMPLATE_ERROR_SIGNATURES,
)


class TestAgentTemplateErrorShortCircuit(unittest.TestCase):
    """Test AGENT_TEMPLATE_ERROR short-circuit in _process_story failure branch."""

    def test_is_agent_template_error_detects_signature(self):
        """_is_agent_template_error returns True when signature present."""
        for signature in FATAL_AGENT_TEMPLATE_ERROR_SIGNATURES:
            output = f"Error occurred: {signature} in template"
            self.assertTrue(
                _is_agent_template_error(output),
                f"Should detect signature: {signature}"
            )

    def test_is_agent_template_error_returns_false_for_normal_output(self):
        """_is_agent_template_error returns False for normal output."""
        normal_outputs = [
            "Completed successfully",
            "Error: file not found",
            "NameError: name 'foo' is not defined",  # Different variable
            "",
            None,
        ]
        for output in normal_outputs:
            self.assertFalse(
                _is_agent_template_error(output),
                f"Should not detect as template error: {output}"
            )


class TestEscalationGating(unittest.TestCase):
    """Test that escalation is gated with same dedup as Jira comment."""

    def test_source_escalate_inside_should_comment_block(self):
        """Verify escalation is inside should_comment block in source code."""
        engine_path = Path(__file__).parent.parent / "engine.py"
        content = engine_path.read_text(encoding='utf-8')

        # Find the AGENT_TEMPLATE_ERROR handling block
        # The escalation should be INSIDE the if should_comment: block
        # Look for the pattern: escalation indented MORE than if should_comment
        lines = content.split('\n')
        in_agent_template_block = False
        found_if_should_comment = False
        escalate_properly_gated = False

        for i, line in enumerate(lines):
            if 'AGENT_TEMPLATE_ERROR detected - non-retryable' in line:
                in_agent_template_block = True

            if in_agent_template_block:
                if 'if should_comment:' in line:
                    found_if_should_comment = True
                    should_comment_indent = len(line) - len(line.lstrip())

                if found_if_should_comment and 'self.escalate(' in line:
                    escalate_indent = len(line) - len(line.lstrip())
                    # Escalation should be inside the if block (more indented)
                    if escalate_indent > should_comment_indent:
                        escalate_properly_gated = True
                        break

                # Stop searching if we exit the block
                if 'return False' in line and in_agent_template_block and found_if_should_comment:
                    break

        self.assertTrue(
            escalate_properly_gated,
            "self.escalate() should be inside 'if should_comment:' block for AGENT_TEMPLATE_ERROR"
        )


class TestProcessStoryShortCircuit(unittest.TestCase):
    """Test _process_story failure branch short-circuits on AGENT_TEMPLATE_ERROR."""

    def test_source_has_agent_template_error_check_in_failure_branch(self):
        """Verify failure branch checks for AGENT_TEMPLATE_ERROR before generic handling."""
        engine_path = Path(__file__).parent.parent / "engine.py"
        content = engine_path.read_text(encoding='utf-8')

        # Count occurrences of the short-circuit pattern in failure branches
        # Pattern: "if _is_agent_template_error(...)" followed by "AGENT_TEMPLATE_ERROR already handled"
        short_circuit_count = content.count("AGENT_TEMPLATE_ERROR already handled")

        # Should have at least 2 (one per failure branch in _process_story variants)
        self.assertGreaterEqual(
            short_circuit_count, 2,
            "Should have short-circuit check in both _process_story failure branches"
        )

    def test_source_short_circuit_returns_true(self):
        """Verify short-circuit returns True (terminal handled)."""
        engine_path = Path(__file__).parent.parent / "engine.py"
        content = engine_path.read_text(encoding='utf-8')

        lines = content.split('\n')
        found_short_circuit_with_return = 0

        for i, line in enumerate(lines):
            if 'AGENT_TEMPLATE_ERROR already handled' in line:
                # Look for return True within the next few lines
                for j in range(i, min(i + 5, len(lines))):
                    if 'return True' in lines[j]:
                        found_short_circuit_with_return += 1
                        break

        self.assertGreaterEqual(
            found_short_circuit_with_return, 2,
            "Short-circuit should return True in both failure branches"
        )


if __name__ == '__main__':
    unittest.main()
