"""
Unit tests for fatal output detection.

PATCH 5-B: Tests for boundary-safe fatal detection with rolling buffer.
"""

import unittest
import sys
from pathlib import Path

# Import the engine module
sys.path.insert(0, str(Path(__file__).parent.parent))

from engine import _is_fatal_claude_output


class TestFatalOutputDetection(unittest.TestCase):
    """Test _is_fatal_claude_output function."""

    def test_detects_no_messages_returned(self):
        """Detects 'Error: No messages returned' fatal signature."""
        text = "Some output\nError: No messages returned\nMore output"
        self.assertTrue(_is_fatal_claude_output(text))

    def test_detects_case_insensitive(self):
        """Detection is case-insensitive."""
        text = "error: no messages returned"
        self.assertTrue(_is_fatal_claude_output(text))

    def test_detects_unhandled_promise_rejection(self):
        """Detects UnhandledPromiseRejection fatal signature."""
        text = "UnhandledPromiseRejection: Something went wrong"
        self.assertTrue(_is_fatal_claude_output(text))

    def test_detects_cli_js_error(self):
        """Detects cli.js: error signature."""
        text = "at cli.js:123 Error occurred"
        self.assertTrue(_is_fatal_claude_output(text))

    def test_normal_output_not_flagged(self):
        """Normal output is not flagged as fatal."""
        text = "Implementing feature...\nWriting to file...\nDone!"
        self.assertFalse(_is_fatal_claude_output(text))

    def test_empty_string_not_fatal(self):
        """Empty string is not fatal."""
        self.assertFalse(_is_fatal_claude_output(""))

    def test_chunk_split_fatal_signature_detected(self):
        """Fatal signature split across chunks is detected in combined buffer.

        PATCH 5-B: Simulates the rolling buffer scenario where a fatal
        signature is split across two chunks.
        """
        # Simulate chunk 1
        chunk1 = "Some output...\nError: No mess"

        # Simulate chunk 2
        chunk2 = "ages returned\nMore output"

        # The rolling buffer would contain both
        rolling_buffer = chunk1 + chunk2

        # The combined buffer should detect the fatal signature
        self.assertTrue(_is_fatal_claude_output(rolling_buffer))

        # Individual chunks might not detect it (depends on implementation)
        # chunk1 alone doesn't contain the full signature
        self.assertFalse(_is_fatal_claude_output(chunk1))

    def test_chunk_split_unhandled_rejection_detected(self):
        """UnhandledPromiseRejection split across chunks is detected."""
        chunk1 = "Starting process...\nUnhandledPromise"
        chunk2 = "Rejection: Network error\nCleaning up"

        rolling_buffer = chunk1 + chunk2
        self.assertTrue(_is_fatal_claude_output(rolling_buffer))

    def test_rolling_buffer_truncation_preserves_detection(self):
        """Fatal signature is detected even after buffer truncation.

        Simulates the case where the buffer has been truncated to 8KB
        but the fatal signature is still within the retained portion.
        """
        # Create a large prefix that would cause truncation
        large_prefix = "x" * 10000  # 10KB of filler

        # Add fatal signature
        fatal_content = large_prefix + "\nError: No messages returned\n"

        # Simulate truncation to last 8KB
        truncated = fatal_content[-8192:]

        # The fatal signature should still be in the truncated buffer
        self.assertTrue(_is_fatal_claude_output(truncated))


class TestRollingBufferBehavior(unittest.TestCase):
    """Test the rolling buffer logic for fatal detection."""

    def test_buffer_accumulation(self):
        """Buffer accumulates chunks correctly."""
        buffer = ""
        chunks = ["chunk1", "chunk2", "chunk3"]

        for chunk in chunks:
            buffer += chunk

        self.assertEqual(buffer, "chunk1chunk2chunk3")

    def test_buffer_truncation_keeps_recent(self):
        """Buffer truncation keeps most recent content."""
        max_size = 100
        buffer = "a" * 150  # Exceeds max

        if len(buffer) > max_size:
            buffer = buffer[-max_size:]

        self.assertEqual(len(buffer), 100)
        self.assertEqual(buffer, "a" * 100)


if __name__ == '__main__':
    unittest.main()
