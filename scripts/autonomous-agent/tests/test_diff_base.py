"""
Tests for diff base constants and drift detection.

Guardrails v2 PATCH 6 - unittest coverage.
"""

import unittest
import sys
from pathlib import Path

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from verification.drift import DIFF_RANGE_SPEC, drift_evidence


class TestDiffBase(unittest.TestCase):
    """Test cases for diff base constant and drift detection."""

    def test_range_spec_is_exact(self):
        """Range spec is exactly origin/feature/agent...HEAD."""
        self.assertEqual(DIFF_RANGE_SPEC, "origin/feature/agent...HEAD")

    def test_drift_evidence_no_drift(self):
        """No drift when lists are identical."""
        recorded = ["file1.ts", "file2.ts"]
        current = ["file2.ts", "file1.ts"]  # Order doesn't matter
        is_drift, diff_sample = drift_evidence(recorded, current)
        self.assertFalse(is_drift)
        self.assertEqual(diff_sample, [])

    def test_drift_evidence_detects_added(self):
        """Drift detected when file added."""
        recorded = ["file1.ts"]
        current = ["file1.ts", "file2.ts"]
        is_drift, diff_sample = drift_evidence(recorded, current)
        self.assertTrue(is_drift)
        self.assertIn("file2.ts", diff_sample)

    def test_drift_evidence_detects_removed(self):
        """Drift detected when file removed."""
        recorded = ["file1.ts", "file2.ts"]
        current = ["file1.ts"]
        is_drift, diff_sample = drift_evidence(recorded, current)
        self.assertTrue(is_drift)
        self.assertIn("file2.ts", diff_sample)

    def test_drift_evidence_symmetric_difference(self):
        """Drift sample contains symmetric difference."""
        recorded = ["a.ts", "b.ts"]
        current = ["b.ts", "c.ts"]
        is_drift, diff_sample = drift_evidence(recorded, current)
        self.assertTrue(is_drift)
        self.assertIn("a.ts", diff_sample)  # In recorded, not in current
        self.assertIn("c.ts", diff_sample)  # In current, not in recorded

    def test_drift_evidence_sample_limit(self):
        """Drift sample limited to first 20."""
        recorded = [f"old_{i}.ts" for i in range(30)]
        current = [f"new_{i}.ts" for i in range(30)]
        is_drift, diff_sample = drift_evidence(recorded, current)
        self.assertTrue(is_drift)
        self.assertLessEqual(len(diff_sample), 20)


if __name__ == '__main__':
    unittest.main()
