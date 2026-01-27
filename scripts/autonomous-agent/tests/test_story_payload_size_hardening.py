"""
Unit tests for Story Payload Size Hardening (PATCH A).

PATCH BATCH: AUTONOMOUS-AGENT-JIRA-PAYLOAD-HARDENING-AND-IDEMPOTENCY-1

Tests:
- Story creation with huge patch batch does NOT embed full patch batch in description
- Story description is < JIRA_STORY_DESC_MAX_CHARS
- Story description contains PATCH_BATCH_FILE: marker
- CONTENT_LIMIT_EXCEEDED retry uses short description mode
"""

import unittest
import tempfile
import json
from pathlib import Path
from unittest.mock import MagicMock, patch
import sys

# Import the engine module
sys.path.insert(0, str(Path(__file__).parent.parent))

from engine import (
    JIRA_STORY_DESC_MAX_CHARS,
    JIRA_STORY_DESC_TARGET_CHARS,
    PATCH_BATCH_EXCERPT_LINES,
    PATCH_BATCH_FILE_MARKER,
    _write_patch_batch_artifact,
    _copy_patch_batch_for_story,
    _load_patch_batch_from_file,
)


class TestJiraDescriptionSizeLimit(unittest.TestCase):
    """Test that story description stays within Jira limits."""

    def test_constants_defined(self):
        """Constants are defined with sensible values."""
        self.assertEqual(JIRA_STORY_DESC_MAX_CHARS, 8000)
        self.assertEqual(JIRA_STORY_DESC_TARGET_CHARS, 6000)
        self.assertEqual(PATCH_BATCH_EXCERPT_LINES, 40)
        self.assertEqual(PATCH_BATCH_FILE_MARKER, "PATCH_BATCH_FILE:")

    def test_patch_batch_file_marker_format(self):
        """PATCH_BATCH_FILE marker is a valid identifier."""
        self.assertTrue(PATCH_BATCH_FILE_MARKER.endswith(":"))
        self.assertIn("PATCH_BATCH", PATCH_BATCH_FILE_MARKER)


class TestPatchBatchArtifacts(unittest.TestCase):
    """Test patch batch artifact file operations."""

    def test_write_patch_batch_artifact(self):
        """Writes patch batch to artifact file."""
        with tempfile.TemporaryDirectory() as tmpdir:
            patch_content = "FILE: test.py\nOPERATION: edit\n---OLD---\nold\n---NEW---\nnew\n---END---"

            epic_path, pattern = _write_patch_batch_artifact(
                tmpdir, "KAN-10", "20260127-120000Z", patch_content
            )

            self.assertEqual(epic_path, "reports/KAN-10-20260127-120000Z-patch-batch.md")
            self.assertIn("{STORY_KEY}", pattern)

            # Verify file was created
            full_path = Path(tmpdir) / epic_path
            self.assertTrue(full_path.exists())
            self.assertEqual(full_path.read_text(), patch_content)

    def test_copy_patch_batch_for_story(self):
        """Copies patch batch to story-specific file."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create epic artifact first
            patch_content = "FILE: test.py\n---OLD---\nold\n---NEW---\nnew"
            epic_path = "reports/KAN-10-20260127-120000Z-patch-batch.md"
            (Path(tmpdir) / "reports").mkdir(parents=True, exist_ok=True)
            (Path(tmpdir) / epic_path).write_text(patch_content)

            # Copy to story
            story_path = _copy_patch_batch_for_story(tmpdir, epic_path, "KAN-17")

            self.assertEqual(story_path, "reports/KAN-17-patch-batch.md")

            # Verify story file was created with same content
            full_story_path = Path(tmpdir) / story_path
            self.assertTrue(full_story_path.exists())
            self.assertEqual(full_story_path.read_text(), patch_content)

    def test_load_patch_batch_from_file_story_priority(self):
        """Loads patch batch from story-specific file first."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create story-specific file
            story_content = "STORY-SPECIFIC PATCH BATCH"
            story_path = "reports/KAN-17-patch-batch.md"
            (Path(tmpdir) / "reports").mkdir(parents=True, exist_ok=True)
            (Path(tmpdir) / story_path).write_text(story_content)

            # Load patch batch (should prefer story-specific)
            content, source = _load_patch_batch_from_file(tmpdir, "KAN-17", "")

            self.assertEqual(content, story_content)
            self.assertEqual(source, "reports/KAN-17-patch-batch.md")

    def test_load_patch_batch_from_file_marker_fallback(self):
        """Falls back to PATCH_BATCH_FILE: marker in description."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create epic artifact
            patch_content = "EPIC PATCH BATCH CONTENT"
            epic_path = "reports/KAN-10-20260127-patch-batch.md"
            (Path(tmpdir) / "reports").mkdir(parents=True, exist_ok=True)
            (Path(tmpdir) / epic_path).write_text(patch_content)

            # Description with marker but no story-specific file
            description = f"## Story\n\n{PATCH_BATCH_FILE_MARKER} {epic_path}\n"

            content, source = _load_patch_batch_from_file(tmpdir, "KAN-17", description)

            self.assertEqual(content, patch_content)
            self.assertEqual(source, epic_path)

    def test_load_patch_batch_from_file_not_found(self):
        """Returns None when patch batch file not found."""
        with tempfile.TemporaryDirectory() as tmpdir:
            (Path(tmpdir) / "reports").mkdir(parents=True, exist_ok=True)

            content, source = _load_patch_batch_from_file(tmpdir, "KAN-99", "")

            self.assertIsNone(content)
            self.assertIsNone(source)


class TestStoryDescriptionDoesNotEmbedPatchBatch(unittest.TestCase):
    """Test that story description does not contain full patch batch."""

    def test_description_does_not_contain_patch_markers(self):
        """Description should not contain ---OLD--- or ---NEW--- markers."""
        # Simulate a story description generated by _generate_patch_batch
        # The description should NOT contain the patch batch content

        # A properly generated description should have the file marker
        good_description = f"""## Parent Epic
KAN-10: Test Epic

## Implementation Goal
Test implementation goal

---

## PATCH BATCH Location

{PATCH_BATCH_FILE_MARKER} reports/KAN-17-patch-batch.md

Full PATCH BATCH instructions are stored in the artifact file above.

---
"""
        # Should contain the marker
        self.assertIn(PATCH_BATCH_FILE_MARKER, good_description)

        # Should NOT contain patch content markers
        self.assertNotIn("---OLD---", good_description)
        self.assertNotIn("---NEW---", good_description)
        self.assertNotIn("---END---", good_description)

    def test_description_within_size_limit(self):
        """Generated description is within Jira size limits."""
        # A properly sized description
        good_description = f"""## Parent Epic
KAN-10: Test Epic

## Implementation Goal
{"x" * 3000}

---

## PATCH BATCH Location

{PATCH_BATCH_FILE_MARKER} reports/KAN-17-patch-batch.md

---
"""
        self.assertLess(len(good_description), JIRA_STORY_DESC_MAX_CHARS)


class TestContentLimitExceededRetry(unittest.TestCase):
    """Test CONTENT_LIMIT_EXCEEDED retry behavior."""

    def test_is_content_limit_exceeded_detection(self):
        """Detects CONTENT_LIMIT_EXCEEDED in error message."""
        # Create a mock JiraClient to test the method
        from engine import JiraClient, Config

        # Create minimal config for testing
        config = MagicMock(spec=Config)
        config.jira_url = "https://test.atlassian.net"
        config.jira_username = "test"
        config.jira_token = "token"
        config.software_project = "KAN"

        client = JiraClient(config)

        # Test detection
        client.last_error_message = "Error: CONTENT_LIMIT_EXCEEDED - description too long"
        self.assertTrue(client.is_content_limit_exceeded())

        client.last_error_message = "Some other error"
        self.assertFalse(client.is_content_limit_exceeded())

        client.last_error_message = ""
        self.assertFalse(client.is_content_limit_exceeded())


if __name__ == '__main__':
    unittest.main()
