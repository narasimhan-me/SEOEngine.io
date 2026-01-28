"""
Unit tests for Claude subprocess log metadata.

FIXUP-2 PATCH 2: Claude subprocess logs include tool/model metadata

Tests:
- _invoke_claude_code log calls include tool="claude-code-cli" and model=MODEL_IMPLEMENTER
- Static scan verifies presence of tool/model parameters in Claude subprocess logs
"""

import unittest
import re
from pathlib import Path
import sys

# Import the engine module
sys.path.insert(0, str(Path(__file__).parent.parent))

ENGINE_PATH = Path(__file__).parent.parent / "engine.py"


class TestClaudeLogMetadataStaticScan(unittest.TestCase):
    """Static scan tests for Claude subprocess log metadata."""

    def test_invoke_claude_code_has_tool_metadata(self):
        """_invoke_claude_code contains at least one tool='claude-code-cli' in self.log calls."""
        source = ENGINE_PATH.read_text()

        # Find the _invoke_claude_code function
        invoke_match = re.search(
            r'def _invoke_claude_code\(self.*?(?=\n    def |\nclass |\Z)',
            source,
            re.DOTALL
        )
        self.assertIsNotNone(invoke_match, "_invoke_claude_code function not found")

        function_body = invoke_match.group(0)

        # Check for tool="claude-code-cli" in self.log calls
        tool_pattern = r'self\.log\([^)]*tool\s*=\s*["\']claude-code-cli["\']'
        matches = re.findall(tool_pattern, function_body)

        self.assertGreater(
            len(matches), 0,
            "_invoke_claude_code should have at least one self.log call with tool='claude-code-cli'"
        )

    def test_invoke_claude_code_has_model_metadata(self):
        """_invoke_claude_code contains at least one model=MODEL_IMPLEMENTER in self.log calls."""
        source = ENGINE_PATH.read_text()

        # Find the _invoke_claude_code function
        invoke_match = re.search(
            r'def _invoke_claude_code\(self.*?(?=\n    def |\nclass |\Z)',
            source,
            re.DOTALL
        )
        self.assertIsNotNone(invoke_match, "_invoke_claude_code function not found")

        function_body = invoke_match.group(0)

        # Check for model=MODEL_IMPLEMENTER in self.log calls
        model_pattern = r'self\.log\([^)]*model\s*=\s*MODEL_IMPLEMENTER'
        matches = re.findall(model_pattern, function_body)

        self.assertGreater(
            len(matches), 0,
            "_invoke_claude_code should have at least one self.log call with model=MODEL_IMPLEMENTER"
        )

    def test_multiple_claude_logs_have_metadata(self):
        """Multiple key Claude subprocess logs have both tool and model metadata."""
        source = ENGINE_PATH.read_text()

        # Find the _invoke_claude_code function
        invoke_match = re.search(
            r'def _invoke_claude_code\(self.*?(?=\n    def |\nclass |\Z)',
            source,
            re.DOTALL
        )
        self.assertIsNotNone(invoke_match, "_invoke_claude_code function not found")

        function_body = invoke_match.group(0)

        # Count log calls with both tool and model (in any order)
        # Pattern: self.log(...model=MODEL_IMPLEMENTER...tool="claude-code-cli"...)
        # OR: self.log(...tool="claude-code-cli"...model=MODEL_IMPLEMENTER...)
        full_metadata_pattern = r'self\.log\([^)]*(?:model\s*=\s*MODEL_IMPLEMENTER[^)]*tool\s*=\s*["\']claude-code-cli["\']|tool\s*=\s*["\']claude-code-cli["\'][^)]*model\s*=\s*MODEL_IMPLEMENTER)'
        matches = re.findall(full_metadata_pattern, function_body)

        # Should have at least 5 key log calls with full metadata
        # (attempt start, heartbeat, streamed output, timeout, exit code)
        self.assertGreaterEqual(
            len(matches), 5,
            f"Expected at least 5 self.log calls with both model and tool metadata, found {len(matches)}"
        )


class TestLogFormatterMetadata(unittest.TestCase):
    """Test log formatter includes model/tool when provided."""

    def test_formatter_includes_model_and_tool(self):
        """_format_log_line includes model= and tool= when provided."""
        from engine import _format_log_line

        line = _format_log_line("IMPLEMENTER", "Test message", model="sonnet", tool="claude-code-cli")

        self.assertIn("[IMPLEMENTER]", line)
        self.assertIn("model=sonnet", line)
        self.assertIn("tool=claude-code-cli", line)

    def test_formatter_model_only(self):
        """_format_log_line includes only model= when tool not provided."""
        from engine import _format_log_line

        line = _format_log_line("IMPLEMENTER", "Test message", model="sonnet")

        self.assertIn("[IMPLEMENTER]", line)
        self.assertIn("model=sonnet", line)
        self.assertNotIn("tool=", line)

    def test_formatter_tool_only(self):
        """_format_log_line includes only tool= when model not provided."""
        from engine import _format_log_line

        line = _format_log_line("IMPLEMENTER", "Test message", tool="claude-code-cli")

        self.assertIn("[IMPLEMENTER]", line)
        self.assertIn("tool=claude-code-cli", line)
        self.assertNotIn("model=", line)


if __name__ == '__main__':
    unittest.main()
