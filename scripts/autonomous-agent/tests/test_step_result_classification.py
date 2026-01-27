"""
Unit tests for IMPLEMENTER terminal outcome classification.

FIXUP-2 PATCH 1: Work Ledger terminal outcome correctness

Tests:
- Classifier returns timed_out for timeout sentinel strings
- Classifier returns cancelled for lock/session conflict strings
- Classifier returns failed for generic failures
- Work ledger can persist all StepResult values
"""

import unittest
from pathlib import Path
import sys

# Import the engine module
sys.path.insert(0, str(Path(__file__).parent.parent))

from engine import _classify_implementer_terminal_result
from work_ledger import StepResult, WorkLedgerEntry


class TestClassifyImplementerTerminalResult(unittest.TestCase):
    """Test _classify_implementer_terminal_result classifier."""

    def test_timeout_detected_exact_match(self):
        """Exact timeout return string is classified as timed_out."""
        output = "Claude Code timed out"
        result = _classify_implementer_terminal_result(output)
        self.assertEqual(result, StepResult.TIMED_OUT.value)

    def test_timeout_detected_with_context(self):
        """Timeout with additional context is classified as timed_out."""
        output = "Claude Code timed out after 240 minutes (attempt 3)"
        result = _classify_implementer_terminal_result(output)
        self.assertEqual(result, StepResult.TIMED_OUT.value)

    def test_timeout_detected_case_insensitive(self):
        """Timeout detection is case-insensitive."""
        output = "CLAUDE CODE TIMED OUT"
        result = _classify_implementer_terminal_result(output)
        self.assertEqual(result, StepResult.TIMED_OUT.value)

    def test_lock_acquisition_failed_classified_as_cancelled(self):
        """Lock acquisition failure is classified as cancelled."""
        output = "Lock acquisition failed: another session is running"
        result = _classify_implementer_terminal_result(output)
        self.assertEqual(result, StepResult.CANCELLED.value)

    def test_session_already_running_classified_as_cancelled(self):
        """Session already running is classified as cancelled."""
        output = "Error: session already running for story KAN-17"
        result = _classify_implementer_terminal_result(output)
        self.assertEqual(result, StepResult.CANCELLED.value)

    def test_another_claude_session_classified_as_cancelled(self):
        """Another Claude session message is classified as cancelled."""
        output = "Cannot start: another Claude session is active"
        result = _classify_implementer_terminal_result(output)
        self.assertEqual(result, StepResult.CANCELLED.value)

    def test_could_not_acquire_lock_classified_as_cancelled(self):
        """Could not acquire lock is classified as cancelled."""
        output = "Could not acquire lock for Claude execution"
        result = _classify_implementer_terminal_result(output)
        self.assertEqual(result, StepResult.CANCELLED.value)

    def test_generic_error_classified_as_failed(self):
        """Generic error text is classified as failed."""
        output = "Error: No messages returned from Claude"
        result = _classify_implementer_terminal_result(output)
        self.assertEqual(result, StepResult.FAILED.value)

    def test_normal_failure_classified_as_failed(self):
        """Normal implementation failure is classified as failed."""
        output = "Implementation completed with errors"
        result = _classify_implementer_terminal_result(output)
        self.assertEqual(result, StepResult.FAILED.value)

    def test_empty_string_classified_as_failed(self):
        """Empty output is classified as failed."""
        output = ""
        result = _classify_implementer_terminal_result(output)
        self.assertEqual(result, StepResult.FAILED.value)

    def test_none_classified_as_failed(self):
        """None output is classified as failed."""
        result = _classify_implementer_terminal_result(None)
        self.assertEqual(result, StepResult.FAILED.value)

    def test_unhandled_promise_rejection_classified_as_failed(self):
        """UnhandledPromiseRejection is classified as failed (not cancelled)."""
        output = "UnhandledPromiseRejection: Error in Claude Code"
        result = _classify_implementer_terminal_result(output)
        self.assertEqual(result, StepResult.FAILED.value)


class TestWorkLedgerStepResultPersistence(unittest.TestCase):
    """Test Work Ledger can persist all StepResult values."""

    def test_timed_out_persists_in_work_ledger(self):
        """StepResult.TIMED_OUT can be persisted and retrieved."""
        entry = WorkLedgerEntry(
            issueKey="KAN-17",
            last_step="IMPLEMENTER",
            last_step_result=StepResult.TIMED_OUT.value,
        )
        d = entry.to_dict()
        entry2 = WorkLedgerEntry.from_dict(d)
        self.assertEqual(entry2.last_step_result, "timed_out")

    def test_cancelled_persists_in_work_ledger(self):
        """StepResult.CANCELLED can be persisted and retrieved."""
        entry = WorkLedgerEntry(
            issueKey="KAN-17",
            last_step="IMPLEMENTER",
            last_step_result=StepResult.CANCELLED.value,
        )
        d = entry.to_dict()
        entry2 = WorkLedgerEntry.from_dict(d)
        self.assertEqual(entry2.last_step_result, "cancelled")

    def test_failed_persists_in_work_ledger(self):
        """StepResult.FAILED can be persisted and retrieved."""
        entry = WorkLedgerEntry(
            issueKey="KAN-17",
            last_step="IMPLEMENTER",
            last_step_result=StepResult.FAILED.value,
        )
        d = entry.to_dict()
        entry2 = WorkLedgerEntry.from_dict(d)
        self.assertEqual(entry2.last_step_result, "failed")

    def test_success_persists_in_work_ledger(self):
        """StepResult.SUCCESS can be persisted and retrieved."""
        entry = WorkLedgerEntry(
            issueKey="KAN-17",
            last_step="IMPLEMENTER",
            last_step_result=StepResult.SUCCESS.value,
        )
        d = entry.to_dict()
        entry2 = WorkLedgerEntry.from_dict(d)
        self.assertEqual(entry2.last_step_result, "success")


if __name__ == '__main__':
    unittest.main()
