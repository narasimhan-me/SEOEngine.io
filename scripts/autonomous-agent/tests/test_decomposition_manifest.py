"""
Unit tests for Decomposition Manifest.

PATCH BATCH: AUTONOMOUS-AGENT-RESUME-STATE-MACHINE-RECONCILE-1 - PATCH 3

Tests:
- Unchanged fingerprint -> create_story not called on second run
- Changed fingerprint -> creates only missing stories; does not recreate existing
- Manifest roundtrip (save/load)
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
    compute_fingerprint,
    compute_intent_id,
    extract_acceptance_criteria,
    should_decompose,
)


class TestComputeFingerprint(unittest.TestCase):
    """Test fingerprint computation."""

    def test_fingerprint_deterministic(self):
        """Same description produces same fingerprint."""
        desc = "Epic description with acceptance criteria"
        fp1 = compute_fingerprint(desc)
        fp2 = compute_fingerprint(desc)
        self.assertEqual(fp1, fp2)

    def test_fingerprint_changes_with_description(self):
        """Different descriptions produce different fingerprints."""
        fp1 = compute_fingerprint("Description A")
        fp2 = compute_fingerprint("Description B")
        self.assertNotEqual(fp1, fp2)

    def test_fingerprint_is_sha256(self):
        """Fingerprint is SHA256 hex string."""
        fp = compute_fingerprint("Test description")
        self.assertEqual(len(fp), 64)
        # Should be valid hex
        int(fp, 16)


class TestComputeIntentId(unittest.TestCase):
    """Test intent ID computation."""

    def test_intent_id_deterministic(self):
        """Same summary produces same intent ID."""
        id1 = compute_intent_id("Implement: Add login feature")
        id2 = compute_intent_id("Implement: Add login feature")
        self.assertEqual(id1, id2)

    def test_intent_id_normalizes_implement_prefix(self):
        """Intent ID normalizes 'Implement:' prefix."""
        id1 = compute_intent_id("Implement: Add login feature")
        id2 = compute_intent_id("Add login feature")
        self.assertEqual(id1, id2)

    def test_intent_id_normalizes_whitespace(self):
        """Intent ID normalizes whitespace."""
        id1 = compute_intent_id("Implement:  Add   login  feature")
        id2 = compute_intent_id("Implement: Add login feature")
        self.assertEqual(id1, id2)

    def test_intent_id_case_insensitive(self):
        """Intent ID is case-insensitive."""
        id1 = compute_intent_id("Implement: ADD LOGIN FEATURE")
        id2 = compute_intent_id("implement: add login feature")
        self.assertEqual(id1, id2)


class TestExtractAcceptanceCriteria(unittest.TestCase):
    """Test acceptance criteria extraction."""

    def test_extracts_markdown_h2_section(self):
        """Extracts ## Acceptance Criteria section."""
        desc = """# Epic

## Business Goals
Some goals here.

## Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2

## Scope
Some scope.
"""
        ac = extract_acceptance_criteria(desc)
        self.assertIn("Criteria 1", ac)
        self.assertIn("Criteria 2", ac)
        self.assertNotIn("Business Goals", ac)
        self.assertNotIn("Scope", ac)

    def test_fallback_to_full_description(self):
        """Falls back to full description if no AC section."""
        desc = "Simple description without acceptance criteria section."
        ac = extract_acceptance_criteria(desc)
        self.assertEqual(ac, desc)


class TestDecompositionManifest(unittest.TestCase):
    """Test DecompositionManifest class."""

    def test_add_child(self):
        """add_child creates StoryIntent with computed intent_id."""
        manifest = DecompositionManifest(epicKey="KAN-10", fingerprint="abc123")
        intent = manifest.add_child("Implement: Add login feature")

        self.assertEqual(intent.summary, "Implement: Add login feature")
        self.assertIsNotNone(intent.intent_id)
        self.assertEqual(len(manifest.children), 1)

    def test_find_child_by_intent(self):
        """find_child_by_intent finds by intent_id match."""
        manifest = DecompositionManifest(epicKey="KAN-10", fingerprint="abc123")
        manifest.add_child("Implement: Add login feature", key="KAN-17")

        # Find by exact match
        found = manifest.find_child_by_intent("Implement: Add login feature")
        self.assertIsNotNone(found)
        self.assertEqual(found.key, "KAN-17")

        # Find by normalized match
        found2 = manifest.find_child_by_intent("Add login feature")
        self.assertIsNotNone(found2)
        self.assertEqual(found2.key, "KAN-17")

    def test_get_missing_intents(self):
        """get_missing_intents returns intents without keys."""
        manifest = DecompositionManifest(epicKey="KAN-10", fingerprint="abc123")
        manifest.add_child("Implement: Feature A", key="KAN-17")
        manifest.add_child("Implement: Feature B")  # No key

        existing = ["Implement: Feature A"]  # A exists in Jira
        missing = manifest.get_missing_intents(existing)

        self.assertEqual(len(missing), 1)
        self.assertEqual(missing[0].summary, "Implement: Feature B")

    def test_to_dict_from_dict_roundtrip(self):
        """Manifest serializes and deserializes correctly."""
        manifest = DecompositionManifest(
            epicKey="KAN-10",
            fingerprint="abc123",
            created_at="2026-01-27T12:00:00Z",
            updated_at="2026-01-27T12:00:00Z",
        )
        manifest.add_child("Implement: Feature A", key="KAN-17")
        manifest.add_child("Implement: Feature B")

        d = manifest.to_dict()
        manifest2 = DecompositionManifest.from_dict(d)

        self.assertEqual(manifest2.epicKey, "KAN-10")
        self.assertEqual(manifest2.fingerprint, "abc123")
        self.assertEqual(len(manifest2.children), 2)
        self.assertEqual(manifest2.children[0].key, "KAN-17")
        self.assertIsNone(manifest2.children[1].key)


class TestDecompositionManifestStore(unittest.TestCase):
    """Test manifest store."""

    def test_save_load_roundtrip(self):
        """Manifest saves and loads correctly."""
        with tempfile.TemporaryDirectory() as tmpdir:
            store = DecompositionManifestStore(tmpdir)

            manifest = DecompositionManifest(epicKey="KAN-10", fingerprint="abc123")
            manifest.add_child("Implement: Feature A", key="KAN-17")

            # Save
            self.assertTrue(store.save(manifest))

            # Load
            loaded = store.load("KAN-10")
            self.assertIsNotNone(loaded)
            self.assertEqual(loaded.epicKey, "KAN-10")
            self.assertEqual(loaded.fingerprint, "abc123")
            self.assertEqual(len(loaded.children), 1)

    def test_exists(self):
        """exists() returns correct status."""
        with tempfile.TemporaryDirectory() as tmpdir:
            store = DecompositionManifestStore(tmpdir)

            self.assertFalse(store.exists("KAN-10"))

            manifest = DecompositionManifest(epicKey="KAN-10", fingerprint="abc123")
            store.save(manifest)

            self.assertTrue(store.exists("KAN-10"))

    def test_load_nonexistent_returns_none(self):
        """Loading nonexistent manifest returns None."""
        with tempfile.TemporaryDirectory() as tmpdir:
            store = DecompositionManifestStore(tmpdir)
            self.assertIsNone(store.load("KAN-99"))


class TestShouldDecompose(unittest.TestCase):
    """Test should_decompose function."""

    def test_no_manifest_returns_new_mode(self):
        """No existing manifest -> new mode."""
        with tempfile.TemporaryDirectory() as tmpdir:
            store = DecompositionManifestStore(tmpdir)

            should, mode, manifest = should_decompose(store, "KAN-10", "Epic description")

            self.assertTrue(should)
            self.assertEqual(mode, "new")
            self.assertEqual(manifest.epicKey, "KAN-10")

    def test_unchanged_fingerprint_returns_skip_mode(self):
        """Unchanged fingerprint -> skip mode."""
        with tempfile.TemporaryDirectory() as tmpdir:
            store = DecompositionManifestStore(tmpdir)

            # Create and save initial manifest
            desc = "Epic description"
            manifest = DecompositionManifest(
                epicKey="KAN-10",
                fingerprint=compute_fingerprint(desc)
            )
            store.save(manifest)

            # Check with same description
            should, mode, manifest2 = should_decompose(store, "KAN-10", desc)

            self.assertFalse(should)
            self.assertEqual(mode, "skip")

    def test_changed_fingerprint_returns_delta_mode(self):
        """Changed fingerprint -> delta mode."""
        with tempfile.TemporaryDirectory() as tmpdir:
            store = DecompositionManifestStore(tmpdir)

            # Create and save initial manifest
            manifest = DecompositionManifest(
                epicKey="KAN-10",
                fingerprint=compute_fingerprint("Old description")
            )
            store.save(manifest)

            # Check with new description
            should, mode, manifest2 = should_decompose(store, "KAN-10", "New description")

            self.assertTrue(should)
            self.assertEqual(mode, "delta")
            # Manifest should have updated fingerprint
            self.assertEqual(manifest2.fingerprint, compute_fingerprint("New description"))


class TestIdempotentDecomposition(unittest.TestCase):
    """Integration-style test for idempotent decomposition."""

    def test_second_run_no_new_stories(self):
        """Second decomposition run with unchanged fingerprint creates no stories."""
        with tempfile.TemporaryDirectory() as tmpdir:
            store = DecompositionManifestStore(tmpdir)
            desc = "Epic description"

            # First run - new mode
            should1, mode1, manifest1 = should_decompose(store, "KAN-10", desc)
            self.assertTrue(should1)
            self.assertEqual(mode1, "new")

            # Simulate creating story and saving manifest
            manifest1.add_child("Implement: Feature A", key="KAN-17")
            store.save(manifest1)

            # Second run - should skip
            should2, mode2, manifest2 = should_decompose(store, "KAN-10", desc)
            self.assertFalse(should2)
            self.assertEqual(mode2, "skip")

    def test_delta_mode_creates_only_missing(self):
        """Delta mode only creates missing stories, not existing ones."""
        with tempfile.TemporaryDirectory() as tmpdir:
            store = DecompositionManifestStore(tmpdir)

            # First run with description v1
            desc_v1 = "Epic description v1"
            _, _, manifest1 = should_decompose(store, "KAN-10", desc_v1)
            manifest1.add_child("Implement: Feature A", key="KAN-17")
            store.save(manifest1)

            # Second run with changed description
            desc_v2 = "Epic description v2 with new features"
            should, mode, manifest2 = should_decompose(store, "KAN-10", desc_v2)

            self.assertTrue(should)
            self.assertEqual(mode, "delta")

            # Existing child should still have its key
            existing_child = manifest2.find_child_by_intent("Implement: Feature A")
            self.assertIsNotNone(existing_child)
            self.assertEqual(existing_child.key, "KAN-17")


if __name__ == '__main__':
    unittest.main()
