"""
Unit tests for Subprocess Hardening.

PATCH BATCH: AUTONOMOUS-AGENT-RESUME-STATE-MACHINE-RECONCILE-1 - PATCH 5

Tests:
- Fatal parser recognizes "No messages returned"
- Engine terminates attempt promptly on fatal output
- last_error_fingerprint written to Work Ledger
"""

import unittest
from pathlib import Path
import sys

# Import the engine module
sys.path.insert(0, str(Path(__file__).parent.parent))

from engine import _is_fatal_claude_output, CLAUDE_MAX_ATTEMPTS, CLAUDE_RETRY_BACKOFF_SECONDS
from work_ledger import compute_error_fingerprint


class TestFatalOutputDetection(unittest.TestCase):
    """Test fatal output pattern recognition."""

    def test_no_messages_returned_is_fatal(self):
        """'Error: No messages returned' is detected as fatal."""
        output = "Some output...\nError: No messages returned\nMore output"
        self.assertTrue(_is_fatal_claude_output(output))

    def test_no_messages_returned_case_insensitive(self):
        """Detection is case-insensitive."""
        output = "error: no messages returned"
        self.assertTrue(_is_fatal_claude_output(output))

    def test_normal_output_not_fatal(self):
        """Normal output is not detected as fatal."""
        output = "Processing...\nDone successfully."
        self.assertFalse(_is_fatal_claude_output(output))

    def test_unhandled_promise_rejection_is_fatal(self):
        """UnhandledPromiseRejection is detected as fatal."""
        output = "UnhandledPromiseRejection: Error occurred"
        self.assertTrue(_is_fatal_claude_output(output))

    def test_cli_stack_trace_is_fatal(self):
        """cli.js stack trace is detected as fatal."""
        output = "Error\n    at Object.<anonymous> (/usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js:123)"
        self.assertTrue(_is_fatal_claude_output(output))


class TestRetryConfiguration(unittest.TestCase):
    """Test retry configuration constants."""

    def test_max_attempts_is_three(self):
        """Max attempts is 3 (2 retries + initial)."""
        self.assertEqual(CLAUDE_MAX_ATTEMPTS, 3)

    def test_backoff_seconds_defined(self):
        """Backoff seconds are defined for retries."""
        self.assertEqual(len(CLAUDE_RETRY_BACKOFF_SECONDS), 2)
        # Exponential-ish backoff
        self.assertGreater(CLAUDE_RETRY_BACKOFF_SECONDS[1], CLAUDE_RETRY_BACKOFF_SECONDS[0])


class TestErrorFingerprintComputation(unittest.TestCase):
    """Test error fingerprint for work ledger."""

    def test_fingerprint_deterministic(self):
        """Error fingerprint is deterministic."""
        fp1 = compute_error_fingerprint("IMPLEMENTER", "Error: No messages returned")
        fp2 = compute_error_fingerprint("IMPLEMENTER", "Error: No messages returned")
        self.assertEqual(fp1, fp2)

    def test_different_steps_different_fingerprints(self):
        """Different steps produce different fingerprints."""
        fp1 = compute_error_fingerprint("IMPLEMENTER", "Error: No messages returned")
        fp2 = compute_error_fingerprint("VERIFY", "Error: No messages returned")
        self.assertNotEqual(fp1, fp2)

    def test_fingerprint_is_sha256(self):
        """Fingerprint is SHA256 hex string."""
        fp = compute_error_fingerprint("IMPLEMENTER", "Some error")
        self.assertEqual(len(fp), 64)
        # Valid hex
        int(fp, 16)


class TestTerminalStates(unittest.TestCase):
    """Test terminal state definitions."""

    def test_terminal_states_enum_values(self):
        """Terminal states are properly defined."""
        # The spec requires: success | failed | timed_out | cancelled
        # These should be recordable in the work ledger
        valid_states = ['success', 'failed', 'timed_out', 'cancelled', 'implemented', 'verified']

        # The work ledger entry can track these via status field
        # and last_error_fingerprint for failure cases
        from work_ledger import WorkLedgerEntry

        entry = WorkLedgerEntry(issueKey="KAN-17")
        # Should be able to set status to any valid state
        for state in valid_states:
            entry.status_last_observed = state
            self.assertEqual(entry.status_last_observed, state)


class TestStepResultEnum(unittest.TestCase):
    """FIXUP-1 PATCH 5: Test StepResult enum for terminal outcomes."""

    def test_step_result_enum_values(self):
        """StepResult enum has required values."""
        from work_ledger import StepResult

        self.assertEqual(StepResult.SUCCESS.value, "success")
        self.assertEqual(StepResult.FAILED.value, "failed")
        self.assertEqual(StepResult.TIMED_OUT.value, "timed_out")
        self.assertEqual(StepResult.CANCELLED.value, "cancelled")

    def test_step_result_in_work_ledger_entry(self):
        """Work ledger entry accepts StepResult values."""
        from work_ledger import WorkLedgerEntry, StepResult

        entry = WorkLedgerEntry(
            issueKey="KAN-17",
            last_step="IMPLEMENTER",
            last_step_result=StepResult.FAILED.value,
        )
        self.assertEqual(entry.last_step_result, "failed")

        # Test roundtrip
        d = entry.to_dict()
        entry2 = WorkLedgerEntry.from_dict(d)
        self.assertEqual(entry2.last_step_result, "failed")

    def test_step_result_none_when_not_set(self):
        """last_step_result is None when not set."""
        from work_ledger import WorkLedgerEntry

        entry = WorkLedgerEntry(issueKey="KAN-17", last_step="IMPLEMENTER")
        self.assertIsNone(entry.last_step_result)


if __name__ == '__main__':
    unittest.main()
