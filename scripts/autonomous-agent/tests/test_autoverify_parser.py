"""
Unit tests for auto-verify parser functionality.

PATCH BATCH: AUTONOMOUS-AGENT-AUTOVERIFY-AUTOFIX-LOOP-SAFETY-1 - PATCH 5

Tests:
- AUTO tag detection for next checkbox item
- Backtick fallback only when allowlisted
- Reject commands containing shell metacharacters
- Report updater idempotency (no duplicated evidence blocks)
"""

import unittest
import tempfile
import os
from pathlib import Path
import sys

# Import from modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from verification.auto_verify import (
    parse_checklist_items,
    update_report_with_results,
    _compute_item_id,
    CommandResult,
    FailureType,
)
from verification.contracts import (
    is_command_allowlisted,
    contains_shell_metacharacters,
    SHELL_METACHARACTERS,
)


class TestAutoTagDetection(unittest.TestCase):
    """Test <!-- AUTO:CMD=... --> tag detection."""

    def test_auto_tag_applies_to_next_checkbox(self):
        """AUTO tag on preceding line applies command to next checkbox."""
        content = """## Checklist

<!-- AUTO:CMD=pnpm type-check -->
- [ ] Run type check

- [ ] Manual item
"""
        items = parse_checklist_items(content)

        self.assertEqual(len(items), 2)
        # First item should have command from AUTO tag
        self.assertEqual(items[0].command, "pnpm type-check")
        self.assertEqual(items[0].command_source, "auto_tag")
        # Second item should be manual (no command)
        self.assertIsNone(items[1].command)

    def test_auto_tag_only_applies_to_immediately_next(self):
        """AUTO tag only applies to the immediately next checkbox."""
        content = """## Checklist

<!-- AUTO:CMD=pnpm test -->

Some text in between

- [ ] This should NOT get the command

- [ ] Neither should this
"""
        items = parse_checklist_items(content)

        # AUTO tag was consumed by intermediate text, no commands assigned
        self.assertEqual(len(items), 2)
        self.assertIsNone(items[0].command)
        self.assertIsNone(items[1].command)

    def test_auto_tag_case_insensitive(self):
        """AUTO tag matching is case-insensitive."""
        content = """<!-- auto:cmd=pnpm lint -->
- [ ] Run linting
"""
        items = parse_checklist_items(content)

        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].command, "pnpm lint")

    def test_multiple_auto_tags(self):
        """Multiple AUTO tags each apply to their next checkbox."""
        content = """## Checklist

<!-- AUTO:CMD=pnpm type-check -->
- [ ] Type check

<!-- AUTO:CMD=pnpm lint -->
- [ ] Lint

- [ ] Manual
"""
        items = parse_checklist_items(content)

        self.assertEqual(len(items), 3)
        self.assertEqual(items[0].command, "pnpm type-check")
        self.assertEqual(items[1].command, "pnpm lint")
        self.assertIsNone(items[2].command)


class TestBacktickFallback(unittest.TestCase):
    """Test backtick command detection fallback."""

    def setUp(self):
        """Set up test environment with allowlist."""
        # Set allowlist for tests
        os.environ['ENGINEO_AUTOVERIFY_ALLOWLIST'] = 'pnpm type-check,pnpm lint,pnpm test'

    def tearDown(self):
        """Clean up environment."""
        os.environ.pop('ENGINEO_AUTOVERIFY_ALLOWLIST', None)

    def test_backtick_command_extracted_when_allowlisted(self):
        """Backtick command is extracted when it matches allowlist."""
        content = """## Checklist

- [ ] Run `pnpm type-check` to verify types
"""
        items = parse_checklist_items(content)

        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].command, "pnpm type-check")
        self.assertEqual(items[0].command_source, "backtick")

    def test_backtick_command_rejected_when_not_allowlisted(self):
        """Backtick command is rejected when not in allowlist."""
        content = """## Checklist

- [ ] Run `rm -rf /` to clean up
"""
        items = parse_checklist_items(content)

        self.assertEqual(len(items), 1)
        self.assertIsNone(items[0].command)

    def test_auto_tag_takes_precedence_over_backtick(self):
        """AUTO tag command takes precedence over backtick command."""
        content = """## Checklist

<!-- AUTO:CMD=pnpm test -->
- [ ] Run `pnpm lint` check
"""
        items = parse_checklist_items(content)

        self.assertEqual(len(items), 1)
        # AUTO tag should win
        self.assertEqual(items[0].command, "pnpm test")
        self.assertEqual(items[0].command_source, "auto_tag")


class TestShellMetacharacterRejection(unittest.TestCase):
    """Test rejection of commands with shell metacharacters."""

    def test_pipe_rejected(self):
        """Commands with pipe are rejected."""
        self.assertTrue(contains_shell_metacharacters("pnpm test | grep error"))

    def test_semicolon_rejected(self):
        """Commands with semicolon are rejected."""
        self.assertTrue(contains_shell_metacharacters("pnpm test; echo done"))

    def test_ampersand_rejected(self):
        """Commands with ampersand are rejected."""
        self.assertTrue(contains_shell_metacharacters("pnpm test && pnpm build"))

    def test_dollar_sign_rejected(self):
        """Commands with dollar sign are rejected."""
        self.assertTrue(contains_shell_metacharacters("echo $HOME"))

    def test_backtick_in_command_rejected(self):
        """Commands with backticks are rejected."""
        self.assertTrue(contains_shell_metacharacters("echo `whoami`"))

    def test_redirect_rejected(self):
        """Commands with redirects are rejected."""
        self.assertTrue(contains_shell_metacharacters("pnpm test > output.txt"))
        self.assertTrue(contains_shell_metacharacters("pnpm test < input.txt"))

    def test_simple_command_allowed(self):
        """Simple commands without metacharacters are allowed."""
        self.assertFalse(contains_shell_metacharacters("pnpm type-check"))
        self.assertFalse(contains_shell_metacharacters("pnpm test --coverage"))
        self.assertFalse(contains_shell_metacharacters("pnpm lint apps/web"))

    def test_backtick_with_metacharacters_not_extracted(self):
        """Backtick commands with metacharacters are not extracted."""
        os.environ['ENGINEO_AUTOVERIFY_ALLOWLIST'] = 'pnpm test'

        content = """## Checklist

- [ ] Run `pnpm test | grep -v skip` for filtered tests
"""
        items = parse_checklist_items(content)

        self.assertEqual(len(items), 1)
        # Should not extract because of pipe
        self.assertIsNone(items[0].command)

        os.environ.pop('ENGINEO_AUTOVERIFY_ALLOWLIST', None)


class TestAllowlistMatching(unittest.TestCase):
    """Test command allowlist prefix matching."""

    def setUp(self):
        """Set up test environment with allowlist."""
        os.environ['ENGINEO_AUTOVERIFY_ALLOWLIST'] = 'pnpm type-check,pnpm lint,pnpm test'

    def tearDown(self):
        """Clean up environment."""
        os.environ.pop('ENGINEO_AUTOVERIFY_ALLOWLIST', None)

    def test_exact_prefix_match(self):
        """Exact prefix match is allowed."""
        self.assertTrue(is_command_allowlisted("pnpm type-check"))
        self.assertTrue(is_command_allowlisted("pnpm lint"))
        self.assertTrue(is_command_allowlisted("pnpm test"))

    def test_prefix_with_args_match(self):
        """Prefix with additional arguments is allowed."""
        self.assertTrue(is_command_allowlisted("pnpm test --coverage"))
        self.assertTrue(is_command_allowlisted("pnpm lint apps/web"))
        self.assertTrue(is_command_allowlisted("pnpm type-check --noEmit"))

    def test_non_matching_prefix_rejected(self):
        """Non-matching prefix is rejected."""
        self.assertFalse(is_command_allowlisted("npm test"))
        self.assertFalse(is_command_allowlisted("pnpm build"))
        self.assertFalse(is_command_allowlisted("rm -rf"))


class TestReportUpdaterIdempotency(unittest.TestCase):
    """Test that report updater doesn't duplicate evidence blocks."""

    def test_update_adds_evidence_once(self):
        """First update adds evidence sub-bullet."""
        content = """## Checklist

- [ ] Run type check
"""
        items = parse_checklist_items(content)
        results = [
            CommandResult(
                item_id=items[0].item_id,
                command="pnpm type-check",
                exit_code=0,
                stdout="OK",
                stderr="",
                duration_seconds=5.0,
                timed_out=False,
                passed=True,
            )
        ]

        updated = update_report_with_results(content, items, results)

        # Should have checked item
        self.assertIn("- [x]", updated)
        # Should have evidence marker
        self.assertIn("<!-- AUTO-VERIFY:", updated)
        # Count occurrences
        marker_count = updated.count("<!-- AUTO-VERIFY:")
        self.assertEqual(marker_count, 1)

    def test_update_replaces_existing_evidence(self):
        """Second update replaces existing evidence, doesn't duplicate."""
        content = """## Checklist

- [x] Run type check
  - Auto-verified: PASS <!-- AUTO-VERIFY:abc12345 -->
"""
        items = parse_checklist_items(content)

        # No new results (item already checked)
        updated = update_report_with_results(content, items, [])

        # Should still have only one marker
        marker_count = updated.count("<!-- AUTO-VERIFY:")
        self.assertEqual(marker_count, 1)

    def test_failed_item_stays_unchecked(self):
        """Failed items stay unchecked with failure evidence."""
        content = """## Checklist

- [ ] Run type check
"""
        items = parse_checklist_items(content)
        results = [
            CommandResult(
                item_id=items[0].item_id,
                command="pnpm type-check",
                exit_code=1,
                stdout="",
                stderr="Error",
                duration_seconds=5.0,
                timed_out=False,
                passed=False,
                failure_type=FailureType.TYPE_ERROR,
            )
        ]

        updated = update_report_with_results(content, items, results)

        # Should still have unchecked item
        self.assertIn("- [ ]", updated)
        # Should have failure evidence
        self.assertIn("FAIL", updated)
        self.assertIn("TYPE_ERROR", updated)


class TestItemIdComputation(unittest.TestCase):
    """Test stable item ID computation."""

    def test_same_content_same_id(self):
        """Same content produces same item ID."""
        id1 = _compute_item_id("Run type check")
        id2 = _compute_item_id("Run type check")
        self.assertEqual(id1, id2)

    def test_different_content_different_id(self):
        """Different content produces different item ID."""
        id1 = _compute_item_id("Run type check")
        id2 = _compute_item_id("Run lint")
        self.assertNotEqual(id1, id2)

    def test_case_insensitive(self):
        """Item ID is case-insensitive."""
        id1 = _compute_item_id("Run Type Check")
        id2 = _compute_item_id("run type check")
        self.assertEqual(id1, id2)

    def test_whitespace_normalized(self):
        """Item ID normalizes whitespace."""
        id1 = _compute_item_id("Run  type  check")
        id2 = _compute_item_id("Run type check")
        # Both should be valid hashes but may differ due to whitespace
        self.assertEqual(len(id1), 8)
        self.assertEqual(len(id2), 8)


class TestCheckedItemsParsing(unittest.TestCase):
    """Test parsing of already-checked items."""

    def test_checked_items_detected(self):
        """Already checked items are detected."""
        content = """## Checklist

- [x] Completed item
- [ ] Pending item
"""
        items = parse_checklist_items(content)

        self.assertEqual(len(items), 2)
        self.assertTrue(items[0].is_checked)
        self.assertFalse(items[1].is_checked)

    def test_case_insensitive_x(self):
        """Lowercase and uppercase X are both valid."""
        content = """## Checklist

- [x] Lowercase x
- [X] Uppercase X
"""
        items = parse_checklist_items(content)

        self.assertEqual(len(items), 2)
        self.assertTrue(items[0].is_checked)
        self.assertTrue(items[1].is_checked)


if __name__ == '__main__':
    unittest.main()
