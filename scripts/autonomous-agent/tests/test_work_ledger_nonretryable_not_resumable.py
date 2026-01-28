"""
Unit tests for work ledger non-retryable exclusion.

PATCH BATCH: AUTONOMOUS-AGENT-AGENT-TEMPLATE-ERROR-NONRETRYABLE-FIXUP-1 - PATCH 3

Tests:
- get_resumable_entries excludes AGENT_TEMPLATE_ERROR entries
- Normal error fingerprints still resumable
"""

import unittest
import tempfile
from pathlib import Path
import sys

# Import from work_ledger module
sys.path.insert(0, str(Path(__file__).parent.parent))

from work_ledger import (
    WorkLedger,
    WorkLedgerEntry,
    LastStep,
    StepResult,
    compute_error_fingerprint,
)


class TestNonRetryableExclusion(unittest.TestCase):
    """Test that AGENT_TEMPLATE_ERROR entries are excluded from resumable."""

    def setUp(self):
        """Create temp directory and work ledger."""
        self.temp_dir = tempfile.mkdtemp()
        self.ledger = WorkLedger(self.temp_dir)

    def test_agent_template_error_not_resumable(self):
        """Entry with AGENT_TEMPLATE_ERROR fingerprint is NOT resumable."""
        # Compute the fingerprint that would be set for AGENT_TEMPLATE_ERROR
        error_fp = compute_error_fingerprint(LastStep.IMPLEMENTER.value, "AGENT_TEMPLATE_ERROR")

        entry = WorkLedgerEntry(
            issueKey="KAN-123",
            issueType="Story",
            status_last_observed="BLOCKED",
            last_step=LastStep.IMPLEMENTER.value,
            last_step_result=StepResult.FAILED.value,
            last_error_fingerprint=error_fp,
        )
        self.ledger.upsert(entry)

        resumable = self.ledger.get_resumable_entries()
        resumable_keys = [e.issueKey for e in resumable]

        self.assertNotIn(
            "KAN-123", resumable_keys,
            "AGENT_TEMPLATE_ERROR entry should NOT be resumable"
        )

    def test_normal_error_fingerprint_is_resumable(self):
        """Entry with normal error fingerprint IS resumable."""
        # Compute a normal error fingerprint (not AGENT_TEMPLATE_ERROR)
        normal_fp = compute_error_fingerprint(LastStep.IMPLEMENTER.value, "Some other error")

        entry = WorkLedgerEntry(
            issueKey="KAN-456",
            issueType="Story",
            status_last_observed="In Progress",
            last_step=LastStep.IMPLEMENTER.value,
            last_step_result=StepResult.FAILED.value,
            last_error_fingerprint=normal_fp,
        )
        self.ledger.upsert(entry)

        resumable = self.ledger.get_resumable_entries()
        resumable_keys = [e.issueKey for e in resumable]

        self.assertIn(
            "KAN-456", resumable_keys,
            "Normal error fingerprint should be resumable"
        )

    def test_mixed_entries_only_normal_resumable(self):
        """With mixed entries, only normal errors are resumable."""
        # AGENT_TEMPLATE_ERROR entry
        agent_template_fp = compute_error_fingerprint(LastStep.IMPLEMENTER.value, "AGENT_TEMPLATE_ERROR")
        entry1 = WorkLedgerEntry(
            issueKey="KAN-100",
            issueType="Story",
            last_step=LastStep.IMPLEMENTER.value,
            last_error_fingerprint=agent_template_fp,
        )

        # Normal error entry
        normal_fp = compute_error_fingerprint(LastStep.IMPLEMENTER.value, "Connection timeout")
        entry2 = WorkLedgerEntry(
            issueKey="KAN-101",
            issueType="Story",
            last_step=LastStep.IMPLEMENTER.value,
            last_error_fingerprint=normal_fp,
        )

        # Entry without error (missing verification report)
        entry3 = WorkLedgerEntry(
            issueKey="KAN-102",
            issueType="Story",
            last_step=LastStep.VERIFY.value,
            verification_report_path="",  # Missing
        )

        self.ledger.upsert(entry1)
        self.ledger.upsert(entry2)
        self.ledger.upsert(entry3)

        resumable = self.ledger.get_resumable_entries()
        resumable_keys = [e.issueKey for e in resumable]

        self.assertNotIn("KAN-100", resumable_keys, "AGENT_TEMPLATE_ERROR not resumable")
        self.assertIn("KAN-101", resumable_keys, "Normal error is resumable")
        self.assertIn("KAN-102", resumable_keys, "Missing artifact is resumable")

    def test_entry_without_error_fingerprint_normal_behavior(self):
        """Entry without error fingerprint follows normal resumability rules."""
        # Entry at VERIFY step without verification report
        entry = WorkLedgerEntry(
            issueKey="KAN-200",
            issueType="Story",
            last_step=LastStep.VERIFY.value,
            verification_report_path="",
        )
        self.ledger.upsert(entry)

        resumable = self.ledger.get_resumable_entries()
        resumable_keys = [e.issueKey for e in resumable]

        self.assertIn(
            "KAN-200", resumable_keys,
            "Entry without fingerprint at VERIFY with missing report is resumable"
        )


class TestFingerprintComputation(unittest.TestCase):
    """Test fingerprint computation for AGENT_TEMPLATE_ERROR."""

    def test_agent_template_error_fingerprint_is_deterministic(self):
        """AGENT_TEMPLATE_ERROR fingerprint is deterministic."""
        fp1 = compute_error_fingerprint(LastStep.IMPLEMENTER.value, "AGENT_TEMPLATE_ERROR")
        fp2 = compute_error_fingerprint(LastStep.IMPLEMENTER.value, "AGENT_TEMPLATE_ERROR")

        self.assertEqual(fp1, fp2, "Fingerprint should be deterministic")

    def test_different_errors_have_different_fingerprints(self):
        """Different error texts produce different fingerprints."""
        fp_template = compute_error_fingerprint(LastStep.IMPLEMENTER.value, "AGENT_TEMPLATE_ERROR")
        fp_other = compute_error_fingerprint(LastStep.IMPLEMENTER.value, "Some other error")

        self.assertNotEqual(
            fp_template, fp_other,
            "Different errors should have different fingerprints"
        )


if __name__ == '__main__':
    unittest.main()
