"""
Unit tests for WorkLedger persistent state.

PATCH BATCH: AUTONOMOUS-AGENT-RESUME-STATE-MACHINE-RECONCILE-1 - PATCH 1

Tests:
- Ledger read/write roundtrip using temp directory
- Atomic write interruption simulation
- Entry CRUD operations
- Resumable entry detection
"""

import unittest
import tempfile
import json
import os
from pathlib import Path
import sys

# Import the work_ledger module
sys.path.insert(0, str(Path(__file__).parent.parent))

from work_ledger import (
    WorkLedger,
    WorkLedgerEntry,
    LastStep,
    IssueType,
    StepResult,  # FIXUP-1 PATCH 5
    compute_error_fingerprint,
    compute_decomposition_fingerprint,
    canonical_verification_report_path,
    WORK_LEDGER_VERSION,
)


class TestWorkLedgerRoundtrip(unittest.TestCase):
    """Test ledger read/write roundtrip."""

    def test_roundtrip_empty_ledger(self):
        """Empty ledger roundtrip works correctly."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ledger_path = Path(tmpdir) / "work_ledger.json"
            ledger = WorkLedger(tmpdir, ledger_path=ledger_path)

            # Save empty ledger
            self.assertTrue(ledger.save())
            self.assertTrue(ledger_path.exists())

            # Load it back
            ledger2 = WorkLedger(tmpdir, ledger_path=ledger_path)
            self.assertTrue(ledger2.load())
            self.assertEqual(len(ledger2.all_entries()), 0)

    def test_roundtrip_with_entries(self):
        """Ledger with entries roundtrips correctly."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ledger_path = Path(tmpdir) / "work_ledger.json"
            ledger = WorkLedger(tmpdir, ledger_path=ledger_path)

            # Add entries
            entry1 = WorkLedgerEntry(
                issueKey="KAN-17",
                issueType="Story",
                parentKey="KAN-10",
                status_last_observed="In Progress",
                last_step="IMPLEMENTER",
                children=[],
                decomposition_fingerprint="",
                last_commit_sha="abc123def456",
                verification_report_path="reports/KAN-17-verification.md",
            )
            entry2 = WorkLedgerEntry(
                issueKey="KAN-10",
                issueType="Epic",
                parentKey="EA-19",
                status_last_observed="In Progress",
                last_step="SUPERVISOR",
                children=["KAN-17", "KAN-18"],
                decomposition_fingerprint="sha256hash",
            )

            ledger.upsert(entry1)
            ledger.upsert(entry2)

            # Save
            self.assertTrue(ledger.save())

            # Load into new instance
            ledger2 = WorkLedger(tmpdir, ledger_path=ledger_path)
            self.assertTrue(ledger2.load())

            # Verify entries
            entries = ledger2.all_entries()
            self.assertEqual(len(entries), 2)
            self.assertIn("KAN-17", entries)
            self.assertIn("KAN-10", entries)

            # Verify KAN-17 fields
            e1 = entries["KAN-17"]
            self.assertEqual(e1.issueKey, "KAN-17")
            self.assertEqual(e1.issueType, "Story")
            self.assertEqual(e1.parentKey, "KAN-10")
            self.assertEqual(e1.status_last_observed, "In Progress")
            self.assertEqual(e1.last_step, "IMPLEMENTER")
            self.assertEqual(e1.last_commit_sha, "abc123def456")
            self.assertEqual(e1.verification_report_path, "reports/KAN-17-verification.md")

            # Verify KAN-10 fields
            e2 = entries["KAN-10"]
            self.assertEqual(e2.issueKey, "KAN-10")
            self.assertEqual(e2.issueType, "Epic")
            self.assertEqual(e2.children, ["KAN-17", "KAN-18"])
            self.assertEqual(e2.decomposition_fingerprint, "sha256hash")


class TestAtomicWriteInterruption(unittest.TestCase):
    """Test atomic write crash safety."""

    def test_temp_file_left_behind_does_not_corrupt(self):
        """Simulate crash after temp write but before rename."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ledger_path = Path(tmpdir) / "work_ledger.json"
            temp_path = ledger_path.with_suffix('.json.tmp')

            # Write initial valid ledger
            ledger = WorkLedger(tmpdir, ledger_path=ledger_path)
            ledger.upsert(WorkLedgerEntry(issueKey="KAN-17", last_step="IMPLEMENTER"))
            self.assertTrue(ledger.save())

            # Verify initial content
            initial_content = ledger_path.read_text()
            initial_data = json.loads(initial_content)

            # Simulate crash: write temp file with different content but don't rename
            corrupted_data = {"version": 99, "entries": {"KAN-99": {"issueKey": "KAN-99"}}}
            temp_path.write_text(json.dumps(corrupted_data))

            # Canonical file should still be valid (temp file not renamed)
            self.assertTrue(ledger_path.exists())
            current_content = ledger_path.read_text()
            current_data = json.loads(current_content)

            # Canonical file should still have original content
            self.assertEqual(current_data["entries"]["KAN-17"]["issueKey"], "KAN-17")
            self.assertNotIn("KAN-99", current_data.get("entries", {}))

            # Temp file may exist (simulating crash mid-write)
            # On next proper save, temp file will be overwritten

    def test_canonical_file_untouched_on_save_failure(self):
        """If save fails, canonical file should remain valid."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ledger_path = Path(tmpdir) / "work_ledger.json"

            # Write initial valid ledger
            ledger = WorkLedger(tmpdir, ledger_path=ledger_path)
            ledger.upsert(WorkLedgerEntry(issueKey="KAN-17", last_step="IMPLEMENTER"))
            self.assertTrue(ledger.save())

            # Read original content
            original = json.loads(ledger_path.read_text())

            # Create new ledger instance with different data
            ledger2 = WorkLedger(tmpdir, ledger_path=ledger_path)
            ledger2.upsert(WorkLedgerEntry(issueKey="KAN-18", last_step="VERIFY"))

            # Make the temp file path a directory (will cause write failure)
            temp_path = ledger_path.with_suffix('.json.tmp')
            temp_path.mkdir(parents=True, exist_ok=True)

            # Save should fail
            result = ledger2.save()
            self.assertFalse(result)

            # Original file should be unchanged
            current = json.loads(ledger_path.read_text())
            self.assertEqual(current["entries"]["KAN-17"]["issueKey"], "KAN-17")
            self.assertNotIn("KAN-18", current.get("entries", {}))


class TestWorkLedgerEntry(unittest.TestCase):
    """Test WorkLedgerEntry dataclass."""

    def test_to_dict_from_dict_roundtrip(self):
        """Entry to_dict/from_dict roundtrip."""
        entry = WorkLedgerEntry(
            issueKey="KAN-17",
            issueType="Story",
            parentKey="KAN-10",
            status_last_observed="BLOCKED",
            last_step="VERIFY",
            last_step_result=StepResult.SUCCESS.value,  # FIXUP-1 PATCH 5
            children=[],
            decomposition_fingerprint="",
            last_commit_sha="abc123",
            verification_report_path="reports/KAN-17-verification.md",
            last_error_fingerprint="error_hash",
            last_error_at="2026-01-27T12:00:00Z",
        )

        d = entry.to_dict()
        entry2 = WorkLedgerEntry.from_dict(d)

        self.assertEqual(entry2.issueKey, "KAN-17")
        self.assertEqual(entry2.issueType, "Story")
        self.assertEqual(entry2.parentKey, "KAN-10")
        self.assertEqual(entry2.status_last_observed, "BLOCKED")
        self.assertEqual(entry2.last_step, "VERIFY")
        self.assertEqual(entry2.last_step_result, "success")  # FIXUP-1 PATCH 5
        self.assertEqual(entry2.last_commit_sha, "abc123")
        self.assertEqual(entry2.last_error_fingerprint, "error_hash")
        self.assertEqual(entry2.last_error_at, "2026-01-27T12:00:00Z")

    def test_last_step_result_all_values(self):
        """FIXUP-1 PATCH 5: Test all StepResult enum values."""
        for result in [StepResult.SUCCESS, StepResult.FAILED, StepResult.TIMED_OUT, StepResult.CANCELLED]:
            entry = WorkLedgerEntry(
                issueKey="KAN-17",
                last_step="IMPLEMENTER",
                last_step_result=result.value,
            )
            d = entry.to_dict()
            entry2 = WorkLedgerEntry.from_dict(d)
            self.assertEqual(entry2.last_step_result, result.value)

    def test_last_step_result_none_default(self):
        """FIXUP-1 PATCH 5: last_step_result defaults to None."""
        entry = WorkLedgerEntry(issueKey="KAN-17", last_step="IMPLEMENTER")
        self.assertIsNone(entry.last_step_result)

        d = entry.to_dict()
        entry2 = WorkLedgerEntry.from_dict(d)
        self.assertIsNone(entry2.last_step_result)


class TestLedgerCRUD(unittest.TestCase):
    """Test CRUD operations."""

    def test_get_nonexistent_returns_none(self):
        """get() returns None for nonexistent key."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ledger = WorkLedger(tmpdir)
            self.assertIsNone(ledger.get("KAN-99"))

    def test_upsert_insert_and_update(self):
        """upsert() can insert and update."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ledger = WorkLedger(tmpdir)

            # Insert
            entry = WorkLedgerEntry(issueKey="KAN-17", last_step="IMPLEMENTER")
            ledger.upsert(entry)

            result = ledger.get("KAN-17")
            self.assertIsNotNone(result)
            self.assertEqual(result.last_step, "IMPLEMENTER")

            # Update
            entry.last_step = "VERIFY"
            ledger.upsert(entry)

            result = ledger.get("KAN-17")
            self.assertEqual(result.last_step, "VERIFY")

    def test_update_partial_fields(self):
        """update() modifies specific fields."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ledger = WorkLedger(tmpdir)

            # Insert
            entry = WorkLedgerEntry(
                issueKey="KAN-17",
                issueType="Story",
                last_step="IMPLEMENTER",
                last_commit_sha="old_sha",
            )
            ledger.upsert(entry)

            # Update only last_commit_sha
            ledger.update("KAN-17", {"last_commit_sha": "new_sha"})

            result = ledger.get("KAN-17")
            self.assertEqual(result.last_commit_sha, "new_sha")
            self.assertEqual(result.last_step, "IMPLEMENTER")  # Unchanged
            self.assertEqual(result.issueType, "Story")  # Unchanged

    def test_delete_removes_entry(self):
        """delete() removes entry."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ledger = WorkLedger(tmpdir)

            entry = WorkLedgerEntry(issueKey="KAN-17")
            ledger.upsert(entry)
            self.assertIsNotNone(ledger.get("KAN-17"))

            result = ledger.delete("KAN-17")
            self.assertTrue(result)
            self.assertIsNone(ledger.get("KAN-17"))

            # Delete nonexistent returns False
            result = ledger.delete("KAN-99")
            self.assertFalse(result)


class TestResumableEntries(unittest.TestCase):
    """Test resumable entry detection."""

    def test_entry_with_error_fingerprint_is_resumable(self):
        """Entry with last_error_fingerprint is resumable."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ledger = WorkLedger(tmpdir)

            entry = WorkLedgerEntry(
                issueKey="KAN-17",
                last_step="IMPLEMENTER",
                last_error_fingerprint="error_hash",
                last_error_at="2026-01-27T12:00:00Z",
            )
            ledger.upsert(entry)

            resumable = ledger.get_resumable_entries()
            self.assertEqual(len(resumable), 1)
            self.assertEqual(resumable[0].issueKey, "KAN-17")

    def test_verify_step_without_report_is_resumable(self):
        """VERIFY step without report path is resumable."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ledger = WorkLedger(tmpdir)

            entry = WorkLedgerEntry(
                issueKey="KAN-17",
                last_step="VERIFY",
                verification_report_path="",  # Missing report
            )
            ledger.upsert(entry)

            resumable = ledger.get_resumable_entries()
            self.assertEqual(len(resumable), 1)

    def test_verify_step_with_report_not_resumable(self):
        """VERIFY step with report path is not resumable."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ledger = WorkLedger(tmpdir)

            entry = WorkLedgerEntry(
                issueKey="KAN-17",
                last_step="VERIFY",
                verification_report_path="reports/KAN-17-verification.md",
            )
            ledger.upsert(entry)

            resumable = ledger.get_resumable_entries()
            self.assertEqual(len(resumable), 0)

    def test_no_last_step_not_resumable(self):
        """Entry without last_step is not resumable."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ledger = WorkLedger(tmpdir)

            entry = WorkLedgerEntry(issueKey="KAN-17", last_step="")
            ledger.upsert(entry)

            resumable = ledger.get_resumable_entries()
            self.assertEqual(len(resumable), 0)

    def test_epic_with_reconcile_step_missing_report_not_resumable(self):
        """PATCH 2: Epic entry with last_step=RECONCILE + missing report must NOT be resumable.

        Epics/Ideas are NOT resumable solely due to missing canonical reports.
        Only implement issue types (Story/Bug) are resumable when missing reports.
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            ledger = WorkLedger(tmpdir)

            # Epic with RECONCILE step but missing verification report
            entry = WorkLedgerEntry(
                issueKey="KAN-10",
                issueType="Epic",
                last_step="RECONCILE",
                verification_report_path="",  # Missing report
            )
            ledger.upsert(entry)

            resumable = ledger.get_resumable_entries()
            # Epic should NOT be resumable due to missing report
            self.assertEqual(len(resumable), 0)

    def test_idea_with_reconcile_step_missing_report_not_resumable(self):
        """PATCH 2: Idea entry with last_step=RECONCILE + missing report must NOT be resumable."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ledger = WorkLedger(tmpdir)

            # Idea with RECONCILE step but missing verification report
            entry = WorkLedgerEntry(
                issueKey="EA-19",
                issueType="Idea",
                last_step="RECONCILE",
                verification_report_path="",  # Missing report
            )
            ledger.upsert(entry)

            resumable = ledger.get_resumable_entries()
            # Idea should NOT be resumable due to missing report
            self.assertEqual(len(resumable), 0)

    def test_story_with_verify_step_missing_report_is_resumable(self):
        """PATCH 2: Story entry with last_step=VERIFY + missing report MUST be resumable."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ledger = WorkLedger(tmpdir)

            # Story with VERIFY step but missing verification report
            entry = WorkLedgerEntry(
                issueKey="KAN-17",
                issueType="Story",
                last_step="VERIFY",
                verification_report_path="",  # Missing report
            )
            ledger.upsert(entry)

            resumable = ledger.get_resumable_entries()
            # Story MUST be resumable due to missing report
            self.assertEqual(len(resumable), 1)
            self.assertEqual(resumable[0].issueKey, "KAN-17")

    def test_bug_with_verify_step_missing_report_is_resumable(self):
        """PATCH 2: Bug entry with last_step=VERIFY + missing report MUST be resumable."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ledger = WorkLedger(tmpdir)

            # Bug with VERIFY step but missing verification report
            entry = WorkLedgerEntry(
                issueKey="KAN-20",
                issueType="Bug",
                last_step="VERIFY",
                verification_report_path="",  # Missing report
            )
            ledger.upsert(entry)

            resumable = ledger.get_resumable_entries()
            # Bug MUST be resumable due to missing report
            self.assertEqual(len(resumable), 1)
            self.assertEqual(resumable[0].issueKey, "KAN-20")

    def test_epic_with_error_fingerprint_is_still_resumable(self):
        """PATCH 2: Epic with error fingerprint IS resumable (error-based resumption)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ledger = WorkLedger(tmpdir)

            # Epic with error fingerprint (failed during processing)
            entry = WorkLedgerEntry(
                issueKey="KAN-10",
                issueType="Epic",
                last_step="RECONCILE",
                last_error_fingerprint="error_hash",
                last_error_at="2026-01-27T12:00:00Z",
            )
            ledger.upsert(entry)

            resumable = ledger.get_resumable_entries()
            # Epic with error IS resumable (error-based, not report-based)
            self.assertEqual(len(resumable), 1)
            self.assertEqual(resumable[0].issueKey, "KAN-10")

    def test_mixed_types_only_implement_types_resumable_for_missing_reports(self):
        """PATCH 2: Mixed issue types - only Story/Bug resumable for missing reports."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ledger = WorkLedger(tmpdir)

            # Add Epic with missing report
            ledger.upsert(WorkLedgerEntry(
                issueKey="KAN-10",
                issueType="Epic",
                last_step="RECONCILE",
                verification_report_path="",
            ))
            # Add Idea with missing report
            ledger.upsert(WorkLedgerEntry(
                issueKey="EA-19",
                issueType="Idea",
                last_step="RECONCILE",
                verification_report_path="",
            ))
            # Add Story with missing report
            ledger.upsert(WorkLedgerEntry(
                issueKey="KAN-17",
                issueType="Story",
                last_step="VERIFY",
                verification_report_path="",
            ))
            # Add Bug with missing report
            ledger.upsert(WorkLedgerEntry(
                issueKey="KAN-20",
                issueType="Bug",
                last_step="VERIFY",
                verification_report_path="",
            ))

            resumable = ledger.get_resumable_entries()
            # Only Story and Bug should be resumable
            resumable_keys = {e.issueKey for e in resumable}
            self.assertEqual(resumable_keys, {"KAN-17", "KAN-20"})
            self.assertEqual(len(resumable), 2)


class TestHelperFunctions(unittest.TestCase):
    """Test helper functions."""

    def test_compute_error_fingerprint_deterministic(self):
        """Error fingerprint is deterministic."""
        fp1 = compute_error_fingerprint("IMPLEMENTER", "Error: No messages returned")
        fp2 = compute_error_fingerprint("IMPLEMENTER", "Error: No messages returned")
        self.assertEqual(fp1, fp2)

        # Different step produces different fingerprint
        fp3 = compute_error_fingerprint("VERIFY", "Error: No messages returned")
        self.assertNotEqual(fp1, fp3)

    def test_compute_decomposition_fingerprint_deterministic(self):
        """Decomposition fingerprint is deterministic."""
        desc = "Epic description text"
        criteria = "Acceptance criteria section"

        fp1 = compute_decomposition_fingerprint(desc, criteria)
        fp2 = compute_decomposition_fingerprint(desc, criteria)
        self.assertEqual(fp1, fp2)

        # Different description produces different fingerprint
        fp3 = compute_decomposition_fingerprint("Different description", criteria)
        self.assertNotEqual(fp1, fp3)

    def test_canonical_verification_report_path(self):
        """Canonical path is correct format."""
        path = canonical_verification_report_path("KAN-17")
        self.assertEqual(path, "reports/KAN-17-verification.md")

        path2 = canonical_verification_report_path("EA-19")
        self.assertEqual(path2, "reports/EA-19-verification.md")


class TestPrintSummary(unittest.TestCase):
    """Test print_summary output."""

    def test_empty_ledger_summary(self):
        """Summary for empty ledger."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ledger = WorkLedger(tmpdir)
            summary = ledger.print_summary()

            self.assertIn("WORK LEDGER SUMMARY", summary)
            self.assertIn("No entries", summary)

    def test_summary_with_entries(self):
        """Summary includes entry info."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ledger = WorkLedger(tmpdir)

            ledger.upsert(WorkLedgerEntry(
                issueKey="KAN-17",
                issueType="Story",
                status_last_observed="In Progress",
                last_step="IMPLEMENTER",
            ))
            ledger.upsert(WorkLedgerEntry(
                issueKey="KAN-10",
                issueType="Epic",
                status_last_observed="To Do",
                last_step="SUPERVISOR",
            ))

            summary = ledger.print_summary()

            self.assertIn("KAN-17", summary)
            self.assertIn("KAN-10", summary)
            self.assertIn("Story", summary)
            self.assertIn("Epic", summary)
            self.assertIn("Total entries: 2", summary)


if __name__ == '__main__':
    unittest.main()
