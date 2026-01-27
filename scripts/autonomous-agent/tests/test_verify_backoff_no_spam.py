"""
Unit tests for verify backoff and comment de-duplication.

PATCH BATCH: AUTONOMOUS-AGENT-VERIFICATION-BACKOFF-FATAL-CLASSIFY-TIMEOUT-UNIFY-1 - PATCH 5

Tests:
- Second verify attempt is skipped when cooldown active and report unchanged
- Jira add_comment called at most once for same (reason, report_hash)
"""

import unittest
import tempfile
from pathlib import Path
from datetime import datetime, timezone, timedelta
import sys

# Import from modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from engine import (
    _should_attempt_verify,
    _should_post_verify_comment,
    _hash_file,
    VERIFY_COOLDOWN_SECONDS,
)
from work_ledger import WorkLedgerEntry


class TestShouldAttemptVerify(unittest.TestCase):
    """Test _should_attempt_verify gating logic."""

    def test_no_entry_allows_verify(self):
        """No ledger entry allows verify."""
        with tempfile.TemporaryDirectory() as tmpdir:
            report_path = str(Path(tmpdir) / "reports" / "KAN-25-verification.md")

            should_verify, reason = _should_attempt_verify(None, report_path)

            self.assertTrue(should_verify)
            self.assertEqual(reason, "no_ledger_entry")

    def test_missing_report_allows_verify(self):
        """Missing report allows verify attempt."""
        entry = WorkLedgerEntry(issueKey="KAN-25")

        should_verify, reason = _should_attempt_verify(entry, "/nonexistent/path.md")

        self.assertTrue(should_verify)
        self.assertEqual(reason, "report_missing")

    def test_cooldown_active_unchanged_report_blocks_verify(self):
        """Cooldown active with unchanged report blocks verify."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create report file
            report_path = Path(tmpdir) / "report.md"
            report_path.write_text("# Report content", encoding='utf-8')
            report_hash = _hash_file(str(report_path))

            # Create entry with active cooldown and same hash
            future_time = datetime.now(timezone.utc) + timedelta(seconds=VERIFY_COOLDOWN_SECONDS)
            entry = WorkLedgerEntry(
                issueKey="KAN-25",
                verify_next_at=future_time.isoformat(),
                verify_last_report_hash=report_hash,
            )

            # Current time before cooldown expires
            now_ts = datetime.now(timezone.utc).timestamp()

            should_verify, reason = _should_attempt_verify(entry, str(report_path), now_ts=now_ts)

            self.assertFalse(should_verify)
            self.assertEqual(reason, "cooldown_active_unchanged_report")

    def test_report_changed_allows_verify_immediately(self):
        """Report changed since last failure allows verify immediately."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create report file with new content
            report_path = Path(tmpdir) / "report.md"
            report_path.write_text("# New content", encoding='utf-8')
            new_hash = _hash_file(str(report_path))

            # Create entry with different old hash (simulating report change)
            future_time = datetime.now(timezone.utc) + timedelta(seconds=VERIFY_COOLDOWN_SECONDS)
            entry = WorkLedgerEntry(
                issueKey="KAN-25",
                verify_next_at=future_time.isoformat(),
                verify_last_report_hash="old_different_hash",  # Different from current
            )

            now_ts = datetime.now(timezone.utc).timestamp()

            should_verify, reason = _should_attempt_verify(entry, str(report_path), now_ts=now_ts)

            self.assertTrue(should_verify)
            self.assertEqual(reason, "report_changed")

    def test_cooldown_elapsed_allows_verify(self):
        """Cooldown elapsed allows verify."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create report file
            report_path = Path(tmpdir) / "report.md"
            report_path.write_text("# Report content", encoding='utf-8')
            report_hash = _hash_file(str(report_path))

            # Create entry with expired cooldown (past time)
            past_time = datetime.now(timezone.utc) - timedelta(seconds=60)
            entry = WorkLedgerEntry(
                issueKey="KAN-25",
                verify_next_at=past_time.isoformat(),
                verify_last_report_hash=report_hash,
            )

            now_ts = datetime.now(timezone.utc).timestamp()

            should_verify, reason = _should_attempt_verify(entry, str(report_path), now_ts=now_ts)

            self.assertTrue(should_verify)
            self.assertEqual(reason, "cooldown_elapsed")

    def test_no_cooldown_set_allows_verify(self):
        """No cooldown set allows verify."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create report file
            report_path = Path(tmpdir) / "report.md"
            report_path.write_text("# Report content", encoding='utf-8')

            # Entry without verify_next_at
            entry = WorkLedgerEntry(issueKey="KAN-25")

            should_verify, reason = _should_attempt_verify(entry, str(report_path))

            self.assertTrue(should_verify)
            self.assertEqual(reason, "cooldown_elapsed")


class TestShouldPostVerifyComment(unittest.TestCase):
    """Test _should_post_verify_comment de-duplication."""

    def test_no_entry_allows_comment(self):
        """No entry allows comment."""
        should_post = _should_post_verify_comment(None, "unchecked_items", "hash123")

        self.assertTrue(should_post)

    def test_different_reason_allows_comment(self):
        """Different reason allows new comment."""
        entry = WorkLedgerEntry(
            issueKey="KAN-25",
            verify_last_commented_reason="old_reason",
            verify_last_commented_report_hash="hash123",
        )

        should_post = _should_post_verify_comment(entry, "new_reason", "hash123")

        self.assertTrue(should_post)

    def test_different_hash_allows_comment(self):
        """Different hash allows new comment."""
        entry = WorkLedgerEntry(
            issueKey="KAN-25",
            verify_last_commented_reason="unchecked_items",
            verify_last_commented_report_hash="old_hash",
        )

        should_post = _should_post_verify_comment(entry, "unchecked_items", "new_hash")

        self.assertTrue(should_post)

    def test_same_reason_and_hash_blocks_comment(self):
        """Same reason and hash blocks duplicate comment."""
        entry = WorkLedgerEntry(
            issueKey="KAN-25",
            verify_last_commented_reason="unchecked_items_5",
            verify_last_commented_report_hash="hash123",
        )

        should_post = _should_post_verify_comment(entry, "unchecked_items_5", "hash123")

        self.assertFalse(should_post)

    def test_no_previous_comment_fields_allows_comment(self):
        """Entry without previous comment fields allows comment."""
        entry = WorkLedgerEntry(issueKey="KAN-25")

        should_post = _should_post_verify_comment(entry, "unchecked_items", "hash123")

        self.assertTrue(should_post)


class TestHashFile(unittest.TestCase):
    """Test _hash_file helper."""

    def test_hash_existing_file(self):
        """Hash of existing file is computed."""
        with tempfile.TemporaryDirectory() as tmpdir:
            file_path = Path(tmpdir) / "test.txt"
            file_path.write_text("Hello, World!", encoding='utf-8')

            hash_value = _hash_file(str(file_path))

            self.assertIsNotNone(hash_value)
            self.assertEqual(len(hash_value), 64)  # SHA256 hex is 64 chars

    def test_hash_nonexistent_file(self):
        """Hash of nonexistent file is None."""
        hash_value = _hash_file("/nonexistent/path.txt")

        self.assertIsNone(hash_value)

    def test_hash_is_deterministic(self):
        """Same content produces same hash."""
        with tempfile.TemporaryDirectory() as tmpdir:
            file1 = Path(tmpdir) / "file1.txt"
            file2 = Path(tmpdir) / "file2.txt"
            content = "Identical content"

            file1.write_text(content, encoding='utf-8')
            file2.write_text(content, encoding='utf-8')

            hash1 = _hash_file(str(file1))
            hash2 = _hash_file(str(file2))

            self.assertEqual(hash1, hash2)

    def test_different_content_different_hash(self):
        """Different content produces different hash."""
        with tempfile.TemporaryDirectory() as tmpdir:
            file1 = Path(tmpdir) / "file1.txt"
            file2 = Path(tmpdir) / "file2.txt"

            file1.write_text("Content A", encoding='utf-8')
            file2.write_text("Content B", encoding='utf-8')

            hash1 = _hash_file(str(file1))
            hash2 = _hash_file(str(file2))

            self.assertNotEqual(hash1, hash2)


class TestCooldownConstant(unittest.TestCase):
    """Test cooldown constant value."""

    def test_cooldown_is_10_minutes(self):
        """Cooldown is 600 seconds (10 minutes)."""
        self.assertEqual(VERIFY_COOLDOWN_SECONDS, 600)


if __name__ == '__main__':
    unittest.main()
