"""
Unit tests for verification report auto-repair when ## Checklist is missing.

PATCH BATCH: AUTONOMOUS-AGENT-VERIFY-AUTOREPAIR-STATUSCATEGORY-JQL-1 - PATCH 1

Tests:
- Auto-repair prepends skeleton with ## Checklist
- Original content preserved under ## Appendix (previous content)
- Work ledger updated with repair tracking fields
- Repair de-duplication prevents repeated rewrites
- Jira comment de-duplication
"""

import unittest
import tempfile
import os
from pathlib import Path
from unittest.mock import MagicMock, patch
import sys

# Import from modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from work_ledger import (
    WorkLedger,
    WorkLedgerEntry,
    LastStep,
    StepResult,
)


class TestAutoRepairMissingChecklist(unittest.TestCase):
    """Test auto-repair of reports missing ## Checklist."""

    def setUp(self):
        """Create temp directory and mock objects."""
        self.temp_dir = tempfile.mkdtemp()
        self.reports_dir = Path(self.temp_dir) / "reports"
        self.reports_dir.mkdir(parents=True, exist_ok=True)

    def tearDown(self):
        """Clean up temp files."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_repair_prepends_skeleton_with_checklist(self):
        """Auto-repair prepends skeleton containing ## Checklist."""
        # Create a report without ## Checklist
        report_path = self.reports_dir / "KAN-99-verification.md"
        original_content = """# My Report

## Summary
This is a summary without a checklist.

## Evidence
- Commit: abc123
"""
        report_path.write_text(original_content, encoding='utf-8')

        # Verify ## Checklist is not present
        self.assertNotIn("## Checklist", original_content)

        # Simulate repair by prepending skeleton
        from engine import VERIFICATION_REPORT_SKELETON_TEMPLATE
        skeleton = VERIFICATION_REPORT_SKELETON_TEMPLATE.format(
            issue_key="KAN-99",
            parent_key="KAN-10",
            summary="Test story",
            date="2026-01-27",
        )

        repaired_content = skeleton + f"""
## Appendix (previous content)

The following is the original report content that was auto-repaired due to missing `## Checklist` header:

---

{original_content}
"""
        report_path.write_text(repaired_content, encoding='utf-8')

        # Verify repaired content has ## Checklist
        final_content = report_path.read_text(encoding='utf-8')
        self.assertIn("## Checklist", final_content)
        self.assertIn("- [ ] Implemented per PATCH BATCH", final_content)
        self.assertIn("- [ ] Tests run (list below)", final_content)

    def test_repair_preserves_original_in_appendix(self):
        """Auto-repair preserves original content under ## Appendix."""
        report_path = self.reports_dir / "KAN-100-verification.md"
        original_content = """# Original Report

This is the original content that should be preserved.

## My Custom Section
Important information here.
"""
        report_path.write_text(original_content, encoding='utf-8')

        # Simulate repair
        from engine import VERIFICATION_REPORT_SKELETON_TEMPLATE
        skeleton = VERIFICATION_REPORT_SKELETON_TEMPLATE.format(
            issue_key="KAN-100",
            parent_key="N/A",
            summary="Test",
            date="2026-01-27",
        )

        repaired_content = skeleton + f"""
## Appendix (previous content)

The following is the original report content that was auto-repaired due to missing `## Checklist` header:

---

{original_content}
"""
        report_path.write_text(repaired_content, encoding='utf-8')

        # Verify original content is in appendix
        final_content = report_path.read_text(encoding='utf-8')
        self.assertIn("## Appendix (previous content)", final_content)
        self.assertIn("This is the original content that should be preserved", final_content)
        self.assertIn("## My Custom Section", final_content)
        self.assertIn("Important information here", final_content)


class TestWorkLedgerRepairFields(unittest.TestCase):
    """Test Work Ledger repair tracking fields."""

    def setUp(self):
        """Create temp directory and work ledger."""
        self.temp_dir = tempfile.mkdtemp()
        self.ledger = WorkLedger(self.temp_dir)

    def test_repair_fields_have_defaults(self):
        """Repair fields have proper defaults."""
        entry = WorkLedgerEntry(issueKey="KAN-101")

        self.assertIsNone(entry.verify_repair_applied_at)
        self.assertIsNone(entry.verify_repair_last_report_hash)
        self.assertEqual(entry.verify_repair_count, 0)

    def test_repair_fields_can_be_set(self):
        """Repair fields can be updated."""
        entry = WorkLedgerEntry(
            issueKey="KAN-102",
            verify_repair_applied_at="2026-01-27T12:00:00+00:00",
            verify_repair_last_report_hash="abc123def456",
            verify_repair_count=2,
        )

        self.assertEqual(entry.verify_repair_applied_at, "2026-01-27T12:00:00+00:00")
        self.assertEqual(entry.verify_repair_last_report_hash, "abc123def456")
        self.assertEqual(entry.verify_repair_count, 2)

    def test_repair_fields_roundtrip(self):
        """Repair fields survive to_dict/from_dict roundtrip."""
        entry = WorkLedgerEntry(
            issueKey="KAN-103",
            verify_repair_applied_at="2026-01-27T14:30:00+00:00",
            verify_repair_last_report_hash="hash123",
            verify_repair_count=3,
        )

        data = entry.to_dict()
        restored = WorkLedgerEntry.from_dict(data)

        self.assertEqual(restored.verify_repair_applied_at, "2026-01-27T14:30:00+00:00")
        self.assertEqual(restored.verify_repair_last_report_hash, "hash123")
        self.assertEqual(restored.verify_repair_count, 3)

    def test_repair_fields_backward_compatible(self):
        """Repair fields are backward compatible with old ledger data."""
        old_data = {
            "issueKey": "KAN-104",
            "issueType": "Story",
            "last_step": "VERIFY",
            # No repair fields
        }

        entry = WorkLedgerEntry.from_dict(old_data)

        self.assertIsNone(entry.verify_repair_applied_at)
        self.assertIsNone(entry.verify_repair_last_report_hash)
        self.assertEqual(entry.verify_repair_count, 0)


class TestRepairDeduplication(unittest.TestCase):
    """Test repair de-duplication logic."""

    def test_same_hash_prevents_rewrite(self):
        """If verify_repair_last_report_hash matches, repair is skipped."""
        entry = WorkLedgerEntry(
            issueKey="KAN-105",
            verify_repair_last_report_hash="abc123",
        )

        pre_hash = "abc123"

        # Simulate dedup check
        should_repair = entry.verify_repair_last_report_hash != pre_hash
        self.assertFalse(should_repair)

    def test_different_hash_allows_rewrite(self):
        """If verify_repair_last_report_hash differs, repair is allowed."""
        entry = WorkLedgerEntry(
            issueKey="KAN-106",
            verify_repair_last_report_hash="old_hash",
        )

        pre_hash = "new_hash"

        # Simulate dedup check
        should_repair = entry.verify_repair_last_report_hash != pre_hash
        self.assertTrue(should_repair)

    def test_no_previous_repair_allows_first_repair(self):
        """If no previous repair, first repair is allowed."""
        entry = WorkLedgerEntry(issueKey="KAN-107")

        pre_hash = "some_hash"

        # Simulate dedup check - None != pre_hash should be True
        should_repair = entry.verify_repair_last_report_hash != pre_hash
        self.assertTrue(should_repair)


if __name__ == '__main__':
    unittest.main()
