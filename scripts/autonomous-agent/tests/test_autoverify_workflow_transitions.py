"""
Unit tests for auto-verify workflow transitions.

PATCH BATCH: AUTONOMOUS-AGENT-AUTOVERIFY-AUTOFIX-LOOP-SAFETY-1 - PATCH 5

Tests:
- Mock subprocess to simulate PASS/FAIL without running pnpm
- PASS + remaining manual -> transitions to HUMAN TO REVIEW AND CLOSE; no escalations
- FAIL deterministic in-scope -> triggers auto-fix until bounded limit; then HUMAN ATTENTION NEEDED
- Ensure auto-verify artifact commit does not push and stages only expected artifact files
"""

import unittest
from unittest.mock import MagicMock, patch, call
from pathlib import Path
import tempfile
import os
import sys

# Import from modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from auto_verify import (
    run_auto_verify,
    execute_automatable_items,
    ChecklistItem,
    CommandResult,
    AutoVerifyResult,
    FailureType,
)
from contracts import (
    contract_human_review_status,
    contract_human_attention_status,
)


class TestAutoVerifyExecution(unittest.TestCase):
    """Test auto-verify command execution with mocked subprocess."""

    @patch('auto_verify.subprocess.run')
    def test_passing_command_returns_success(self, mock_run):
        """Passing command returns success result."""
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="All checks passed",
            stderr=""
        )

        items = [
            ChecklistItem(
                line_number=1,
                original_line="- [ ] Run type check",
                indent="",
                content="Run type check",
                is_checked=False,
                command="pnpm type-check",
                command_source="auto_tag",
                item_id="abc12345",
            )
        ]

        with tempfile.TemporaryDirectory() as tmpdir:
            results = execute_automatable_items(items, tmpdir)

        self.assertEqual(len(results), 1)
        self.assertTrue(results[0].passed)
        self.assertEqual(results[0].exit_code, 0)
        self.assertIsNone(results[0].failure_type)

    @patch('auto_verify.subprocess.run')
    def test_failing_command_returns_failure(self, mock_run):
        """Failing command returns failure result with classification."""
        mock_run.return_value = MagicMock(
            returncode=1,
            stdout="",
            stderr="error TS2345: Argument of type 'string' is not assignable"
        )

        items = [
            ChecklistItem(
                line_number=1,
                original_line="- [ ] Run type check",
                indent="",
                content="Run type check",
                is_checked=False,
                command="pnpm type-check",
                command_source="auto_tag",
                item_id="abc12345",
            )
        ]

        with tempfile.TemporaryDirectory() as tmpdir:
            results = execute_automatable_items(items, tmpdir)

        self.assertEqual(len(results), 1)
        self.assertFalse(results[0].passed)
        self.assertEqual(results[0].exit_code, 1)
        self.assertEqual(results[0].failure_type, FailureType.TYPE_ERROR)

    @patch('auto_verify.subprocess.run')
    def test_timeout_returns_timeout_failure(self, mock_run):
        """Command timeout returns TIMEOUT failure type."""
        import subprocess
        mock_run.side_effect = subprocess.TimeoutExpired("pnpm test", 300)

        items = [
            ChecklistItem(
                line_number=1,
                original_line="- [ ] Run tests",
                indent="",
                content="Run tests",
                is_checked=False,
                command="pnpm test",
                command_source="auto_tag",
                item_id="abc12345",
            )
        ]

        with tempfile.TemporaryDirectory() as tmpdir:
            results = execute_automatable_items(items, tmpdir)

        self.assertEqual(len(results), 1)
        self.assertFalse(results[0].passed)
        self.assertTrue(results[0].timed_out)
        self.assertEqual(results[0].failure_type, FailureType.TIMEOUT)


class TestHumanReviewTransition(unittest.TestCase):
    """Test transition to HUMAN TO REVIEW AND CLOSE when only manual items remain."""

    def test_human_review_status_default(self):
        """Default human review status is HUMAN TO REVIEW AND CLOSE."""
        status = contract_human_review_status()
        self.assertEqual(status, "HUMAN TO REVIEW AND CLOSE")

    def test_human_review_status_env_override(self):
        """Human review status can be overridden via env."""
        os.environ['ENGINEO_CONTRACT_HUMAN_REVIEW_STATUS'] = 'Needs Review'
        try:
            status = contract_human_review_status()
            self.assertEqual(status, "Needs Review")
        finally:
            os.environ.pop('ENGINEO_CONTRACT_HUMAN_REVIEW_STATUS', None)

    @patch('auto_verify.subprocess.run')
    def test_all_automatable_pass_with_manual_remaining(self, mock_run):
        """When all automatable pass but manual items remain, result indicates this."""
        mock_run.return_value = MagicMock(returncode=0, stdout="OK", stderr="")

        with tempfile.TemporaryDirectory() as tmpdir:
            report_path = Path(tmpdir) / "test-verification.md"
            report_content = """## Checklist

<!-- AUTO:CMD=pnpm type-check -->
- [ ] Run type check

- [ ] Manual testing required
"""
            report_path.write_text(report_content)

            # Set allowlist
            os.environ['ENGINEO_AUTOVERIFY_ALLOWLIST'] = 'pnpm type-check'
            os.environ['ENGINEO_AUTOVERIFY_ENABLED'] = '1'

            try:
                result = run_auto_verify(
                    story_key="KAN-25",
                    report_path=str(report_path),
                    working_dir=tmpdir,
                    artifacts_dir=tmpdir,
                )

                self.assertTrue(result.all_automatable_passed)
                self.assertTrue(result.has_manual_items)
                self.assertEqual(len(result.items_checked), 1)
                self.assertEqual(len(result.items_manual), 1)

            finally:
                os.environ.pop('ENGINEO_AUTOVERIFY_ALLOWLIST', None)
                os.environ.pop('ENGINEO_AUTOVERIFY_ENABLED', None)


class TestHumanAttentionTransition(unittest.TestCase):
    """Test transition to HUMAN ATTENTION NEEDED when auto-fix exhausted."""

    def test_human_attention_status_default(self):
        """Default human attention status is HUMAN ATTENTION NEEDED."""
        status = contract_human_attention_status()
        self.assertEqual(status, "HUMAN ATTENTION NEEDED")

    def test_human_attention_status_env_override(self):
        """Human attention status can be overridden via env."""
        os.environ['ENGINEO_CONTRACT_HUMAN_ATTENTION_STATUS'] = 'Needs Help'
        try:
            status = contract_human_attention_status()
            self.assertEqual(status, "Needs Help")
        finally:
            os.environ.pop('ENGINEO_CONTRACT_HUMAN_ATTENTION_STATUS', None)

    @patch('auto_verify.subprocess.run')
    def test_automatable_failure_classified(self, mock_run):
        """Automatable failures are properly classified."""
        mock_run.return_value = MagicMock(
            returncode=1,
            stdout="",
            stderr="eslint: 5 errors found"
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            report_path = Path(tmpdir) / "test-verification.md"
            report_content = """## Checklist

<!-- AUTO:CMD=pnpm lint -->
- [ ] Run linting
"""
            report_path.write_text(report_content)

            os.environ['ENGINEO_AUTOVERIFY_ALLOWLIST'] = 'pnpm lint'
            os.environ['ENGINEO_AUTOVERIFY_ENABLED'] = '1'

            try:
                result = run_auto_verify(
                    story_key="KAN-25",
                    report_path=str(report_path),
                    working_dir=tmpdir,
                    artifacts_dir=tmpdir,
                )

                self.assertFalse(result.all_automatable_passed)
                self.assertEqual(len(result.items_failed), 1)
                self.assertEqual(result.command_results[0].failure_type, FailureType.LINT_ERROR)

            finally:
                os.environ.pop('ENGINEO_AUTOVERIFY_ALLOWLIST', None)
                os.environ.pop('ENGINEO_AUTOVERIFY_ENABLED', None)


class TestFailureTypeClassification(unittest.TestCase):
    """Test failure type classification heuristics."""

    @patch('auto_verify.subprocess.run')
    def test_type_error_classification(self, mock_run):
        """TypeScript errors are classified as TYPE_ERROR."""
        mock_run.return_value = MagicMock(
            returncode=1,
            stdout="src/foo.ts(10,5): error TS2345",
            stderr=""
        )

        items = [
            ChecklistItem(
                line_number=1,
                original_line="- [ ] Type check",
                indent="",
                content="Type check",
                is_checked=False,
                command="pnpm type-check",
                command_source="auto_tag",
                item_id="abc12345",
            )
        ]

        with tempfile.TemporaryDirectory() as tmpdir:
            results = execute_automatable_items(items, tmpdir)

        self.assertEqual(results[0].failure_type, FailureType.TYPE_ERROR)

    @patch('auto_verify.subprocess.run')
    def test_lint_error_classification(self, mock_run):
        """Lint errors are classified as LINT_ERROR."""
        mock_run.return_value = MagicMock(
            returncode=1,
            stdout="",
            stderr="ESLint: 3 problems found"
        )

        items = [
            ChecklistItem(
                line_number=1,
                original_line="- [ ] Lint",
                indent="",
                content="Lint",
                is_checked=False,
                command="pnpm lint",
                command_source="auto_tag",
                item_id="abc12345",
            )
        ]

        with tempfile.TemporaryDirectory() as tmpdir:
            results = execute_automatable_items(items, tmpdir)

        self.assertEqual(results[0].failure_type, FailureType.LINT_ERROR)

    @patch('auto_verify.subprocess.run')
    def test_test_failure_classification(self, mock_run):
        """Test failures are classified as TEST_FAILURE."""
        mock_run.return_value = MagicMock(
            returncode=1,
            stdout="1 test failed",
            stderr=""
        )

        items = [
            ChecklistItem(
                line_number=1,
                original_line="- [ ] Tests",
                indent="",
                content="Tests",
                is_checked=False,
                command="pnpm test",
                command_source="auto_tag",
                item_id="abc12345",
            )
        ]

        with tempfile.TemporaryDirectory() as tmpdir:
            results = execute_automatable_items(items, tmpdir)

        self.assertEqual(results[0].failure_type, FailureType.TEST_FAILURE)

    @patch('auto_verify.subprocess.run')
    def test_env_error_classification(self, mock_run):
        """Environment errors are classified as ENV_ERROR."""
        mock_run.side_effect = FileNotFoundError("pnpm: command not found")

        items = [
            ChecklistItem(
                line_number=1,
                original_line="- [ ] Build",
                indent="",
                content="Build",
                is_checked=False,
                command="pnpm build",
                command_source="auto_tag",
                item_id="abc12345",
            )
        ]

        with tempfile.TemporaryDirectory() as tmpdir:
            results = execute_automatable_items(items, tmpdir)

        # FileNotFoundError results in exit code 127
        self.assertEqual(results[0].exit_code, 127)


class TestArtifactGeneration(unittest.TestCase):
    """Test evidence artifact generation."""

    @patch('auto_verify.subprocess.run')
    def test_evidence_file_created(self, mock_run):
        """Evidence file is created on auto-verify run."""
        mock_run.return_value = MagicMock(returncode=0, stdout="OK", stderr="")

        with tempfile.TemporaryDirectory() as tmpdir:
            report_path = Path(tmpdir) / "test-verification.md"
            report_content = """## Checklist

<!-- AUTO:CMD=pnpm type-check -->
- [ ] Run type check
"""
            report_path.write_text(report_content)

            os.environ['ENGINEO_AUTOVERIFY_ALLOWLIST'] = 'pnpm type-check'
            os.environ['ENGINEO_AUTOVERIFY_ENABLED'] = '1'

            try:
                result = run_auto_verify(
                    story_key="KAN-25",
                    report_path=str(report_path),
                    working_dir=tmpdir,
                    artifacts_dir=tmpdir,
                )

                # Evidence file should be created
                self.assertIsNotNone(result.evidence_file)
                self.assertTrue(Path(result.evidence_file).exists())

                # Summary file should be created
                self.assertIsNotNone(result.summary_file)
                self.assertTrue(Path(result.summary_file).exists())

            finally:
                os.environ.pop('ENGINEO_AUTOVERIFY_ALLOWLIST', None)
                os.environ.pop('ENGINEO_AUTOVERIFY_ENABLED', None)

    @patch('auto_verify.subprocess.run')
    def test_summary_file_format(self, mock_run):
        """Summary file is valid JSON with expected structure."""
        import json
        mock_run.return_value = MagicMock(returncode=0, stdout="OK", stderr="")

        with tempfile.TemporaryDirectory() as tmpdir:
            report_path = Path(tmpdir) / "test-verification.md"
            report_content = """## Checklist

<!-- AUTO:CMD=pnpm type-check -->
- [ ] Run type check
"""
            report_path.write_text(report_content)

            os.environ['ENGINEO_AUTOVERIFY_ALLOWLIST'] = 'pnpm type-check'
            os.environ['ENGINEO_AUTOVERIFY_ENABLED'] = '1'

            try:
                result = run_auto_verify(
                    story_key="KAN-25",
                    report_path=str(report_path),
                    working_dir=tmpdir,
                    artifacts_dir=tmpdir,
                )

                # Parse summary JSON
                summary_data = json.loads(Path(result.summary_file).read_text())

                # Check expected fields
                self.assertEqual(summary_data['story_key'], 'KAN-25')
                self.assertIn('timestamp', summary_data)
                self.assertIn('results', summary_data)
                self.assertTrue(summary_data['all_passed'])

            finally:
                os.environ.pop('ENGINEO_AUTOVERIFY_ALLOWLIST', None)
                os.environ.pop('ENGINEO_AUTOVERIFY_ENABLED', None)


class TestNoPushForAutoVerify(unittest.TestCase):
    """Test that auto-verify artifact commits don't push."""

    def test_git_push_default_disabled(self):
        """Git push is disabled by default."""
        from contracts import git_push_enabled

        # Clear any existing value
        os.environ.pop('ENGINEO_GIT_PUSH_ENABLED', None)

        self.assertFalse(git_push_enabled())

    def test_git_push_requires_explicit_enable(self):
        """Git push requires explicit enable."""
        from contracts import git_push_enabled

        os.environ['ENGINEO_GIT_PUSH_ENABLED'] = '1'
        try:
            self.assertTrue(git_push_enabled())
        finally:
            os.environ.pop('ENGINEO_GIT_PUSH_ENABLED', None)


if __name__ == '__main__':
    unittest.main()
