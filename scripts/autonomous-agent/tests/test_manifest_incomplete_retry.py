"""
Unit tests for Decomposition Manifest INCOMPLETE/COMPLETE status (PATCH B).

PATCH BATCH: AUTONOMOUS-AGENT-JIRA-PAYLOAD-HARDENING-AND-IDEMPOTENCY-1

Tests:
- Manifest with status=INCOMPLETE triggers retry
- should_decompose() returns retry mode for INCOMPLETE manifest
- Manifest without all child keys triggers retry
- COMPLETE manifest with Jira stories allows skip
"""

import unittest
import tempfile
import json
from pathlib import Path
import sys

# Import the decomposition_manifest module
sys.path.insert(0, str(Path(__file__).parent.parent))

from decomposition_manifest import (
    DecompositionManifest,
    DecompositionManifestStore,
    StoryIntent,
    ManifestStatus,
    compute_fingerprint,
    should_decompose,
)


class TestManifestStatus(unittest.TestCase):
    """Test manifest status field."""

    def test_default_status_is_incomplete(self):
        """New manifests default to INCOMPLETE status."""
        manifest = DecompositionManifest(
            epicKey="KAN-10",
            fingerprint="abc123"
        )
        self.assertEqual(manifest.status, ManifestStatus.INCOMPLETE.value)

    def test_mark_complete(self):
        """mark_complete sets status to COMPLETE."""
        manifest = DecompositionManifest(epicKey="KAN-10", fingerprint="abc123")
        manifest.mark_complete()
        self.assertEqual(manifest.status, ManifestStatus.COMPLETE.value)
        self.assertTrue(manifest.is_complete())

    def test_mark_incomplete(self):
        """mark_incomplete sets status to INCOMPLETE."""
        manifest = DecompositionManifest(epicKey="KAN-10", fingerprint="abc123")
        manifest.mark_complete()  # First mark complete
        manifest.mark_incomplete()  # Then mark incomplete
        self.assertEqual(manifest.status, ManifestStatus.INCOMPLETE.value)
        self.assertFalse(manifest.is_complete())

    def test_status_in_serialization(self):
        """Status is included in to_dict/from_dict."""
        manifest = DecompositionManifest(epicKey="KAN-10", fingerprint="abc123")
        manifest.mark_complete()

        data = manifest.to_dict()
        self.assertEqual(data['status'], ManifestStatus.COMPLETE.value)

        loaded = DecompositionManifest.from_dict(data)
        self.assertTrue(loaded.is_complete())

    def test_backward_compat_missing_status_defaults_incomplete(self):
        """Loading manifest without status field defaults to INCOMPLETE."""
        data = {
            'epicKey': 'KAN-10',
            'fingerprint': 'abc123',
            'children': [],
            'created_at': '2026-01-27T12:00:00Z',
            'updated_at': '2026-01-27T12:00:00Z',
            # No 'status' field - simulates old manifest
        }
        manifest = DecompositionManifest.from_dict(data)
        self.assertEqual(manifest.status, ManifestStatus.INCOMPLETE.value)
        self.assertFalse(manifest.is_complete())


class TestHasAllKeys(unittest.TestCase):
    """Test has_all_keys method."""

    def test_empty_children_returns_false(self):
        """Empty children list returns False."""
        manifest = DecompositionManifest(epicKey="KAN-10", fingerprint="abc123")
        self.assertFalse(manifest.has_all_keys())

    def test_all_children_have_keys(self):
        """All children with keys returns True."""
        manifest = DecompositionManifest(epicKey="KAN-10", fingerprint="abc123")
        manifest.add_child("Story A", key="KAN-17")
        manifest.add_child("Story B", key="KAN-18")
        self.assertTrue(manifest.has_all_keys())

    def test_some_children_missing_keys(self):
        """Some children without keys returns False."""
        manifest = DecompositionManifest(epicKey="KAN-10", fingerprint="abc123")
        manifest.add_child("Story A", key="KAN-17")
        manifest.add_child("Story B")  # No key
        self.assertFalse(manifest.has_all_keys())


class TestShouldDecomposeWithStatus(unittest.TestCase):
    """Test should_decompose with status-aware behavior."""

    def test_incomplete_manifest_triggers_retry(self):
        """INCOMPLETE manifest triggers retry mode."""
        with tempfile.TemporaryDirectory() as tmpdir:
            store = DecompositionManifestStore(tmpdir)

            # Create and save INCOMPLETE manifest
            desc = "Epic description"
            manifest = DecompositionManifest(
                epicKey="KAN-10",
                fingerprint=compute_fingerprint(desc),
                status=ManifestStatus.INCOMPLETE.value,
            )
            store.save(manifest)

            # Check - should return retry mode
            should, mode, result = should_decompose(store, "KAN-10", desc)

            self.assertTrue(should)
            self.assertEqual(mode, "retry")

    def test_complete_manifest_with_jira_stories_allows_skip(self):
        """COMPLETE manifest with Jira stories allows skip."""
        with tempfile.TemporaryDirectory() as tmpdir:
            store = DecompositionManifestStore(tmpdir)

            # Create and save COMPLETE manifest with children that have keys
            desc = "Epic description"
            manifest = DecompositionManifest(
                epicKey="KAN-10",
                fingerprint=compute_fingerprint(desc),
                status=ManifestStatus.COMPLETE.value,
            )
            manifest.add_child("Story A", key="KAN-17")
            store.save(manifest)

            # Check with Jira stories present
            should, mode, result = should_decompose(
                store, "KAN-10", desc, has_jira_implement_stories=True
            )

            self.assertFalse(should)
            self.assertEqual(mode, "skip")

    def test_manifest_with_missing_child_keys_triggers_retry(self):
        """Manifest with children missing keys triggers retry."""
        with tempfile.TemporaryDirectory() as tmpdir:
            store = DecompositionManifestStore(tmpdir)

            # Create manifest with child missing key
            desc = "Epic description"
            manifest = DecompositionManifest(
                epicKey="KAN-10",
                fingerprint=compute_fingerprint(desc),
                status=ManifestStatus.COMPLETE.value,  # Even if marked complete
            )
            manifest.add_child("Story A", key="KAN-17")
            manifest.add_child("Story B")  # No key - creation failed
            store.save(manifest)

            # Check - should trigger retry
            should, mode, result = should_decompose(store, "KAN-10", desc)

            self.assertTrue(should)
            self.assertEqual(mode, "retry")

    def test_empty_manifest_no_jira_stories_triggers_retry(self):
        """Empty manifest with no Jira stories triggers retry."""
        with tempfile.TemporaryDirectory() as tmpdir:
            store = DecompositionManifestStore(tmpdir)

            # Create empty manifest
            desc = "Epic description"
            manifest = DecompositionManifest(
                epicKey="KAN-10",
                fingerprint=compute_fingerprint(desc),
                status=ManifestStatus.COMPLETE.value,
            )
            # No children
            store.save(manifest)

            # Check with no Jira stories
            should, mode, result = should_decompose(
                store, "KAN-10", desc, has_jira_implement_stories=False
            )

            self.assertTrue(should)
            self.assertEqual(mode, "retry")

    def test_skip_only_when_all_conditions_met(self):
        """Skip only when fingerprint unchanged AND status COMPLETE AND stories exist."""
        with tempfile.TemporaryDirectory() as tmpdir:
            store = DecompositionManifestStore(tmpdir)

            desc = "Epic description"
            fingerprint = compute_fingerprint(desc)

            # Create COMPLETE manifest with all keys
            manifest = DecompositionManifest(
                epicKey="KAN-10",
                fingerprint=fingerprint,
                status=ManifestStatus.COMPLETE.value,
            )
            manifest.add_child("Story A", key="KAN-17")
            store.save(manifest)

            # Test 1: All conditions met - should skip
            should, mode, _ = should_decompose(
                store, "KAN-10", desc, has_jira_implement_stories=True
            )
            self.assertFalse(should)
            self.assertEqual(mode, "skip")

            # Test 2: Fingerprint changed - should delta
            should, mode, _ = should_decompose(
                store, "KAN-10", "Changed description", has_jira_implement_stories=True
            )
            self.assertTrue(should)
            self.assertEqual(mode, "delta")


class TestManifestStatusPersistence(unittest.TestCase):
    """Test that manifest status is properly persisted."""

    def test_status_survives_save_load_cycle(self):
        """Status survives save/load cycle."""
        with tempfile.TemporaryDirectory() as tmpdir:
            store = DecompositionManifestStore(tmpdir)

            # Create INCOMPLETE manifest
            manifest1 = DecompositionManifest(epicKey="KAN-10", fingerprint="abc123")
            manifest1.mark_incomplete()
            store.save(manifest1)

            # Load and verify
            loaded1 = store.load("KAN-10")
            self.assertFalse(loaded1.is_complete())

            # Mark complete and save again
            loaded1.mark_complete()
            store.save(loaded1)

            # Load and verify
            loaded2 = store.load("KAN-10")
            self.assertTrue(loaded2.is_complete())


if __name__ == '__main__':
    unittest.main()
