"""
Unit tests for AGENT_TEMPLATE_ERROR non-retryable fatal classification.

PATCH BATCH: AUTONOMOUS-AGENT-VERIFICATION-BACKOFF-FATAL-CLASSIFY-TIMEOUT-UNIFY-1 - PATCH 5

Tests:
- _is_agent_template_error detects fatal signatures
- Fatal signature results in non-retryable classification
"""

import unittest
from pathlib import Path
import sys

# Import from engine module
sys.path.insert(0, str(Path(__file__).parent.parent))

from engine import (
    _is_agent_template_error,
    FATAL_AGENT_TEMPLATE_ERROR_SIGNATURES,
)


class TestIsAgentTemplateError(unittest.TestCase):
    """Test _is_agent_template_error detection."""

    def test_detects_exact_nameerror_signature(self):
        """Detects exact NameError signature."""
        output = """
Running implementation...
Traceback (most recent call last):
  File "engine.py", line 123, in _invoke
    print(issue_key)
NameError: name 'issue_key' is not defined
"""
        self.assertTrue(_is_agent_template_error(output))

    def test_detects_issue_key_not_defined(self):
        """Detects 'issue_key is not defined' signature."""
        output = """
Error during execution: issue_key is not defined
Please check your template.
"""
        self.assertTrue(_is_agent_template_error(output))

    def test_does_not_detect_unrelated_nameerror(self):
        """Does not detect unrelated NameError."""
        output = """
Traceback (most recent call last):
  File "test.py", line 5, in <module>
    print(undefined_var)
NameError: name 'undefined_var' is not defined
"""
        self.assertFalse(_is_agent_template_error(output))

    def test_does_not_detect_normal_output(self):
        """Does not detect normal output."""
        output = """
Implementation completed successfully.
Files modified: engine.py, test.py
Commit: abc123
"""
        self.assertFalse(_is_agent_template_error(output))

    def test_empty_string_returns_false(self):
        """Empty string returns False."""
        self.assertFalse(_is_agent_template_error(""))

    def test_none_returns_false(self):
        """None returns False."""
        self.assertFalse(_is_agent_template_error(None))

    def test_signature_in_middle_of_output(self):
        """Detects signature in middle of output."""
        output = """
Starting implementation...
Loading configuration...
NameError: name 'issue_key' is not defined
Exiting with error code 1.
"""
        self.assertTrue(_is_agent_template_error(output))


class TestFatalSignatureConstants(unittest.TestCase):
    """Test fatal signature constants."""

    def test_signatures_list_not_empty(self):
        """Signatures list is not empty."""
        self.assertTrue(len(FATAL_AGENT_TEMPLATE_ERROR_SIGNATURES) > 0)

    def test_signatures_contain_issue_key_patterns(self):
        """Signatures contain issue_key patterns."""
        has_issue_key_pattern = any(
            "issue_key" in sig for sig in FATAL_AGENT_TEMPLATE_ERROR_SIGNATURES
        )
        self.assertTrue(has_issue_key_pattern)

    def test_all_signatures_are_strings(self):
        """All signatures are non-empty strings."""
        for sig in FATAL_AGENT_TEMPLATE_ERROR_SIGNATURES:
            self.assertIsInstance(sig, str)
            self.assertTrue(len(sig) > 0)


class TestAgentTemplateErrorClassification(unittest.TestCase):
    """Test classification behavior."""

    def test_classification_is_deterministic(self):
        """Classification is deterministic for same input."""
        output = "NameError: name 'issue_key' is not defined"

        result1 = _is_agent_template_error(output)
        result2 = _is_agent_template_error(output)

        self.assertEqual(result1, result2)
        self.assertTrue(result1)

    def test_case_sensitive_detection(self):
        """Detection is case-sensitive."""
        # Exact signature
        self.assertTrue(_is_agent_template_error(
            "NameError: name 'issue_key' is not defined"
        ))

        # Wrong case - should not match
        self.assertFalse(_is_agent_template_error(
            "NAMEERROR: NAME 'ISSUE_KEY' IS NOT DEFINED"
        ))

    def test_partial_signature_not_matched(self):
        """Partial signature is not matched."""
        # Only part of the signature
        self.assertFalse(_is_agent_template_error(
            "NameError: name 'issue'"
        ))

        # Only the variable name
        self.assertFalse(_is_agent_template_error(
            "issue_key"
        ))


class TestNonRetryableContract(unittest.TestCase):
    """Test non-retryable contract for AGENT_TEMPLATE_ERROR."""

    def test_signature_match_indicates_non_retryable(self):
        """Signature match indicates error is non-retryable.

        When _is_agent_template_error returns True, the caller should:
        1. Stop retries immediately
        2. Post at most 1 Jira comment
        3. Transition to BLOCKED
        4. Create at most 1 escalation entry
        """
        # Test known signature
        output = "NameError: name 'issue_key' is not defined"
        is_fatal = _is_agent_template_error(output)

        # Contract: True means non-retryable
        self.assertTrue(is_fatal)

    def test_no_signature_match_allows_retry(self):
        """No signature match allows retry logic to proceed."""
        output = "Connection timeout. Will retry."
        is_fatal = _is_agent_template_error(output)

        # Contract: False means normal retry logic can proceed
        self.assertFalse(is_fatal)


if __name__ == '__main__':
    unittest.main()
