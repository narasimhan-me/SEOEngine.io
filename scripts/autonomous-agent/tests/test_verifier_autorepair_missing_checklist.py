"""
Unit tests for verification report auto-repair when ## Checklist is missing.

PATCH BATCH: AUTONOMOUS-AGENT-VERIFY-AUTOREPAIR-STATUSCATEGORY-JQL-1 - PATCH 1
REVIEW-FIXUP-1: Replace manual simulation with real verify_work_item() execution.

Tests:
- Auto-repair prepends skeleton with ## Checklist
- Original content preserved under ## Appendix (previous content)
- Work ledger updated with repair tracking fields
- Repair de-duplication prevents repeated rewrites (no hot-loop)
"""

import unittest
import tempfile
import os
import hashlib
from pathlib import Path
from unittest.mock import MagicMock, patch, PropertyMock
import sys

# Import from modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from work_ledger import (
    WorkLedger,
    WorkLedgerEntry,
    LastStep,
    StepResult,
)


def _build_minimal_engine(repo_path: str, work_ledger: WorkLedger):
    """Build a minimal ExecutionEngine instance with mocked dependencies.

    This creates an engine without running full __init__ by manually
    setting required attributes and mocking heavy dependencies.
    """
    # Import here to avoid circular import issues in test setup
    from engine import ExecutionEngine, Config

    # Create mock Config
    mock_config = MagicMock(spec=Config)
    mock_config.repo_path = repo_path
    mock_config.jira_url = "https://test.atlassian.net"
    mock_config.jira_username = "test@example.com"
    mock_config.jira_token = "test_token"
    mock_config.software_project = "KAN"

    # Create engine instance without calling __init__
    engine = object.__new__(ExecutionEngine)

    # Set required attributes manually
    engine.config = mock_config
    engine.work_ledger = work_ledger
    engine.run_id = "20260127-120000Z"
    engine.running = True
    engine.engine_log_path = Path(repo_path) / "engine.log"
    engine.logs_dir = Path(repo_path) / "logs"
    engine.logs_dir.mkdir(parents=True, exist_ok=True)

    # Mock Jira client to prevent actual API calls
    engine.jira = MagicMock()
    engine.jira.add_comment = MagicMock()

    # Mock other clients
    engine.git = MagicMock()
    engine.email = MagicMock()
    engine.files = MagicMock()

    return engine


def _create_issue_dict(key: str, status: str = "In Progress") -> dict:
    """Create a minimal issue dict for verify_work_item."""
    return {
        "key": key,
        "fields": {
            "summary": f"Test story {key}",
            "issuetype": {"name": "Story"},
            "status": {"name": status},
            "description": "Test description",
            "parent": {"key": "KAN-10"},
        }
    }


class TestAutoRepairViaVerifyWorkItem(unittest.TestCase):
    """Test auto-repair by actually calling engine.verify_work_item()."""

    def setUp(self):
        """Create temp directory and work ledger."""
        self.temp_dir = tempfile.mkdtemp()
        self.reports_dir = Path(self.temp_dir) / "reports"
        self.reports_dir.mkdir(parents=True, exist_ok=True)

        # Create work ledger
        self.work_ledger = WorkLedger(self.temp_dir)

        # Build minimal engine
        self.engine = _build_minimal_engine(self.temp_dir, self.work_ledger)

    def tearDown(self):
        """Clean up temp files."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_verify_work_item_autorepairs_missing_checklist(self):
        """verify_work_item() auto-repairs report missing ## Checklist."""
        # Create a report without ## Checklist
        report_path = self.reports_dir / "KAN-99-verification.md"
        original_content = """# My Report

## Summary
This is a summary without a checklist.

## Evidence
- Commit: abc123
"""
        report_path.write_text(original_content, encoding='utf-8')

        # Verify ## Checklist is not present initially
        self.assertNotIn("## Checklist", original_content)

        # Create issue dict with In Progress status
        issue = _create_issue_dict("KAN-99", "In Progress")

        # Call verify_work_item
        result = self.engine.verify_work_item(issue)

        # Should return True (action taken)
        self.assertTrue(result)

        # Read the repaired report
        repaired_content = report_path.read_text(encoding='utf-8')

        # Assert ## Checklist is now present
        self.assertIn("## Checklist", repaired_content)
        self.assertIn("- [ ] Implemented per PATCH BATCH", repaired_content)
        self.assertIn("- [ ] Tests run (list below)", repaired_content)
        self.assertIn("- [ ] Canonical report path correct", repaired_content)
        self.assertIn("- [ ] Evidence (commit SHA) recorded", repaired_content)

    def test_verify_work_item_preserves_original_in_appendix(self):
        """verify_work_item() preserves original content in ## Appendix."""
        # Create a report without ## Checklist
        report_path = self.reports_dir / "KAN-100-verification.md"
        original_content = """# Original Report

This is the original content that should be preserved.

## My Custom Section
Important information here.
"""
        report_path.write_text(original_content, encoding='utf-8')

        # Create issue dict
        issue = _create_issue_dict("KAN-100", "In Progress")

        # Call verify_work_item
        self.engine.verify_work_item(issue)

        # Read the repaired report
        repaired_content = report_path.read_text(encoding='utf-8')

        # Assert original content is in appendix
        self.assertIn("## Appendix (previous content)", repaired_content)
        self.assertIn("This is the original content that should be preserved", repaired_content)
        self.assertIn("## My Custom Section", repaired_content)
        self.assertIn("Important information here", repaired_content)

    def test_verify_work_item_updates_work_ledger_repair_fields(self):
        """verify_work_item() updates Work Ledger with repair tracking fields."""
        # Create a report without ## Checklist
        report_path = self.reports_dir / "KAN-101-verification.md"
        original_content = """# Report Without Checklist

No checklist here.
"""
        report_path.write_text(original_content, encoding='utf-8')

        # Compute pre-repair hash (same as engine does)
        pre_hash = hashlib.sha256(original_content.encode('utf-8')).hexdigest()

        # Create issue dict
        issue = _create_issue_dict("KAN-101", "In Progress")

        # Call verify_work_item
        self.engine.verify_work_item(issue)

        # Check Work Ledger entry
        entry = self.work_ledger.get("KAN-101")
        self.assertIsNotNone(entry)

        # Assert repair tracking fields are set
        self.assertIsNotNone(entry.verify_repair_applied_at)
        self.assertEqual(entry.verify_repair_last_report_hash, pre_hash)
        self.assertEqual(entry.verify_repair_count, 1)

    def test_verify_work_item_dedup_prevents_hot_loop(self):
        """Second call to verify_work_item() does not rewrite already-repaired report."""
        # Create a report without ## Checklist
        report_path = self.reports_dir / "KAN-102-verification.md"
        original_content = """# Report Without Checklist

No checklist here.
"""
        report_path.write_text(original_content, encoding='utf-8')
        original_hash = hashlib.sha256(original_content.encode('utf-8')).hexdigest()

        # Create issue dict
        issue = _create_issue_dict("KAN-102", "In Progress")

        # First call - should repair
        result1 = self.engine.verify_work_item(issue)
        self.assertTrue(result1)

        # Get the repaired content and its mtime
        repaired_content = report_path.read_text(encoding='utf-8')
        repaired_mtime = report_path.stat().st_mtime
        repaired_hash = hashlib.sha256(repaired_content.encode('utf-8')).hexdigest()

        # Verify repair tracking was set
        entry = self.work_ledger.get("KAN-102")
        self.assertEqual(entry.verify_repair_count, 1)
        self.assertEqual(entry.verify_repair_last_report_hash, original_hash)

        # Save ledger so it persists
        self.work_ledger.save()

        # Second call immediately (without modifying report)
        # The repaired report has ## Checklist, but items are unchecked
        # This should NOT trigger another repair
        result2 = self.engine.verify_work_item(issue)

        # Read content after second call
        content_after_second = report_path.read_text(encoding='utf-8')

        # Assert the content is unchanged (no duplicate appendix)
        # Count occurrences of "## Appendix (previous content)"
        appendix_count = content_after_second.count("## Appendix (previous content)")
        self.assertEqual(appendix_count, 1, "Should only have one appendix section")

        # Assert repair count is still 1 (no additional repair)
        entry_after = self.work_ledger.get("KAN-102")
        self.assertEqual(entry_after.verify_repair_count, 1)


class TestWorkLedgerRepairFields(unittest.TestCase):
    """Test Work Ledger repair tracking fields."""

    def setUp(self):
        """Create temp directory and work ledger."""
        self.temp_dir = tempfile.mkdtemp()
        self.ledger = WorkLedger(self.temp_dir)

    def tearDown(self):
        """Clean up temp files."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_repair_fields_have_defaults(self):
        """Repair fields have proper defaults."""
        entry = WorkLedgerEntry(issueKey="KAN-110")

        self.assertIsNone(entry.verify_repair_applied_at)
        self.assertIsNone(entry.verify_repair_last_report_hash)
        self.assertEqual(entry.verify_repair_count, 0)

    def test_repair_fields_can_be_set(self):
        """Repair fields can be updated."""
        entry = WorkLedgerEntry(
            issueKey="KAN-111",
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
            issueKey="KAN-112",
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
            "issueKey": "KAN-113",
            "issueType": "Story",
            "last_step": "VERIFY",
            # No repair fields
        }

        entry = WorkLedgerEntry.from_dict(old_data)

        self.assertIsNone(entry.verify_repair_applied_at)
        self.assertIsNone(entry.verify_repair_last_report_hash)
        self.assertEqual(entry.verify_repair_count, 0)


class TestRepairDeduplicationLogic(unittest.TestCase):
    """Test repair de-duplication logic at entry level."""

    def test_same_hash_prevents_rewrite(self):
        """If verify_repair_last_report_hash matches, repair is skipped."""
        entry = WorkLedgerEntry(
            issueKey="KAN-120",
            verify_repair_last_report_hash="abc123",
        )

        pre_hash = "abc123"

        # Simulate dedup check
        should_repair = entry.verify_repair_last_report_hash != pre_hash
        self.assertFalse(should_repair)

    def test_different_hash_allows_rewrite(self):
        """If verify_repair_last_report_hash differs, repair is allowed."""
        entry = WorkLedgerEntry(
            issueKey="KAN-121",
            verify_repair_last_report_hash="old_hash",
        )

        pre_hash = "new_hash"

        # Simulate dedup check
        should_repair = entry.verify_repair_last_report_hash != pre_hash
        self.assertTrue(should_repair)

    def test_no_previous_repair_allows_first_repair(self):
        """If no previous repair, first repair is allowed."""
        entry = WorkLedgerEntry(issueKey="KAN-122")

        pre_hash = "some_hash"

        # Simulate dedup check - None != pre_hash should be True
        should_repair = entry.verify_repair_last_report_hash != pre_hash
        self.assertTrue(should_repair)


if __name__ == '__main__':
    unittest.main()
