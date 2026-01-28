"""
Unit tests for verification report skeleton creation.

PATCH BATCH: AUTONOMOUS-AGENT-VERIFICATION-BACKOFF-FATAL-CLASSIFY-TIMEOUT-UNIFY-1 - PATCH 5

Tests:
- Skeleton file is created at canonical path
- Skeleton contains ## Checklist header
- Existing file is not overwritten (idempotent)
"""

import unittest
import tempfile
from pathlib import Path
import sys

# Import from engine module
sys.path.insert(0, str(Path(__file__).parent.parent))

from engine import (
    _ensure_verification_report_skeleton,
    _canonical_verification_report_relpath,
    VERIFICATION_REPORT_SKELETON_TEMPLATE,
)


class TestVerificationSkeletonCreation(unittest.TestCase):
    """Test verification report skeleton creation."""

    def test_skeleton_creates_file_at_canonical_path(self):
        """Skeleton is created at canonical path."""
        with tempfile.TemporaryDirectory() as tmpdir:
            issue_key = "KAN-25"
            summary = "Test Story Summary"

            created, path = _ensure_verification_report_skeleton(
                tmpdir, issue_key, summary, parent_key="KAN-10"
            )

            # Should be created
            self.assertTrue(created)

            # Path should be canonical
            expected_path = _canonical_verification_report_relpath(issue_key)
            self.assertEqual(path, expected_path)

            # File should exist
            full_path = Path(tmpdir) / path
            self.assertTrue(full_path.exists())

    def test_skeleton_contains_checklist_header(self):
        """Skeleton contains ## Checklist header."""
        with tempfile.TemporaryDirectory() as tmpdir:
            issue_key = "KAN-25"
            summary = "Test Story Summary"

            created, path = _ensure_verification_report_skeleton(
                tmpdir, issue_key, summary, parent_key="KAN-10"
            )

            full_path = Path(tmpdir) / path
            content = full_path.read_text(encoding='utf-8')

            # Must contain ## Checklist
            self.assertIn("## Checklist", content)

    def test_skeleton_contains_required_checklist_items(self):
        """Skeleton contains required unchecked checklist items."""
        with tempfile.TemporaryDirectory() as tmpdir:
            issue_key = "KAN-25"
            summary = "Test Story Summary"

            created, path = _ensure_verification_report_skeleton(
                tmpdir, issue_key, summary, parent_key="KAN-10"
            )

            full_path = Path(tmpdir) / path
            content = full_path.read_text(encoding='utf-8')

            # Must contain required checklist items (unchecked)
            self.assertIn("- [ ] Implemented per PATCH BATCH", content)
            self.assertIn("- [ ] Tests run", content)
            self.assertIn("- [ ] Canonical report path correct", content)
            self.assertIn("- [ ] Evidence (commit SHA) recorded", content)

    def test_skeleton_includes_issue_key(self):
        """Skeleton includes the issue key."""
        with tempfile.TemporaryDirectory() as tmpdir:
            issue_key = "KAN-25"
            summary = "Test Story Summary"

            created, path = _ensure_verification_report_skeleton(
                tmpdir, issue_key, summary, parent_key="KAN-10"
            )

            full_path = Path(tmpdir) / path
            content = full_path.read_text(encoding='utf-8')

            # Must contain the issue key
            self.assertIn(issue_key, content)

    def test_skeleton_includes_parent_key(self):
        """Skeleton includes the parent key when provided."""
        with tempfile.TemporaryDirectory() as tmpdir:
            issue_key = "KAN-25"
            summary = "Test Story Summary"
            parent_key = "KAN-10"

            created, path = _ensure_verification_report_skeleton(
                tmpdir, issue_key, summary, parent_key=parent_key
            )

            full_path = Path(tmpdir) / path
            content = full_path.read_text(encoding='utf-8')

            # Must contain the parent key
            self.assertIn(parent_key, content)

    def test_skeleton_not_created_if_file_exists(self):
        """Existing file is not overwritten (idempotent)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            issue_key = "KAN-25"
            summary = "Test Story Summary"

            # Create file first with custom content
            path = _canonical_verification_report_relpath(issue_key)
            full_path = Path(tmpdir) / path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            original_content = "# Custom User Content\n\nThis should not be overwritten."
            full_path.write_text(original_content, encoding='utf-8')

            # Try to create skeleton
            created, returned_path = _ensure_verification_report_skeleton(
                tmpdir, issue_key, summary, parent_key="KAN-10"
            )

            # Should NOT be created (file exists)
            self.assertFalse(created)
            self.assertEqual(returned_path, path)

            # Content should be unchanged
            current_content = full_path.read_text(encoding='utf-8')
            self.assertEqual(current_content, original_content)

    def test_skeleton_creates_reports_directory(self):
        """Skeleton creates reports/ directory if missing."""
        with tempfile.TemporaryDirectory() as tmpdir:
            issue_key = "KAN-25"
            summary = "Test Story Summary"

            # Ensure reports/ does not exist
            reports_dir = Path(tmpdir) / "reports"
            self.assertFalse(reports_dir.exists())

            # Create skeleton
            created, path = _ensure_verification_report_skeleton(
                tmpdir, issue_key, summary, parent_key="KAN-10"
            )

            # Directory should be created
            self.assertTrue(reports_dir.exists())
            self.assertTrue(created)

    def test_skeleton_without_parent_key(self):
        """Skeleton works without parent key."""
        with tempfile.TemporaryDirectory() as tmpdir:
            issue_key = "KAN-25"
            summary = "Test Story Summary"

            created, path = _ensure_verification_report_skeleton(
                tmpdir, issue_key, summary, parent_key=None
            )

            self.assertTrue(created)

            full_path = Path(tmpdir) / path
            content = full_path.read_text(encoding='utf-8')

            # Should contain N/A for parent
            self.assertIn("N/A", content)


class TestVerificationSkeletonTemplate(unittest.TestCase):
    """Test the skeleton template constant."""

    def test_template_contains_required_sections(self):
        """Template contains all required sections."""
        template = VERIFICATION_REPORT_SKELETON_TEMPLATE

        # Required sections
        self.assertIn("## Summary", template)
        self.assertIn("## Checklist", template)
        self.assertIn("## Evidence", template)
        self.assertIn("## Manual Testing", template)

    def test_template_contains_placeholders(self):
        """Template contains formatting placeholders."""
        template = VERIFICATION_REPORT_SKELETON_TEMPLATE

        # Placeholders for formatting
        self.assertIn("{issue_key}", template)
        self.assertIn("{parent_key}", template)
        self.assertIn("{summary}", template)
        self.assertIn("{date}", template)


if __name__ == '__main__':
    unittest.main()
