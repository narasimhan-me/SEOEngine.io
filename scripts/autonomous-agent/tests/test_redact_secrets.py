"""
Unit tests for _redact_secrets function.

PATCH 5: Tests for secret redaction in artifact files.
"""

import unittest
from unittest.mock import patch
import sys
from pathlib import Path

# Import the engine module
sys.path.insert(0, str(Path(__file__).parent.parent))

from engine import _redact_secrets, CLAUDE_SECRET_ENV_VARS


class TestRedactSecrets(unittest.TestCase):
    """Test _redact_secrets function."""

    def test_redacts_authorization_bearer_pattern(self):
        """Authorization: Bearer <token> patterns are redacted."""
        text = "Authorization: Bearer sk-ant-12345678abcdefg"
        result = _redact_secrets(text)
        self.assertIn("[REDACTED]", result)
        self.assertNotIn("sk-ant-12345678abcdefg", result)
        self.assertIn("Authorization: Bearer", result)

    def test_redacts_authorization_bearer_case_insensitive(self):
        """Authorization: Bearer redaction is case-insensitive."""
        text = "authorization: bearer my-secret-token-123"
        result = _redact_secrets(text)
        self.assertIn("[REDACTED]", result)
        self.assertNotIn("my-secret-token-123", result)

    def test_redacts_authorization_bearer_with_extra_whitespace(self):
        """Authorization: Bearer works with varying whitespace."""
        text = "Authorization:  Bearer   ghp_xxxxxxxxxxxx"
        result = _redact_secrets(text)
        self.assertIn("[REDACTED]", result)
        self.assertNotIn("ghp_xxxxxxxxxxxx", result)

    @patch.dict('os.environ', {'JIRA_TOKEN': 'super-secret-jira-token-12345'})
    def test_redacts_jira_token_env_var_value(self):
        """JIRA_TOKEN env var value is redacted."""
        text = "The token is super-secret-jira-token-12345 and more text"
        result = _redact_secrets(text)
        self.assertIn("[REDACTED]", result)
        self.assertNotIn("super-secret-jira-token-12345", result)
        self.assertIn("and more text", result)

    @patch.dict('os.environ', {'GITHUB_TOKEN': 'ghp_github_secret_token_abc'})
    def test_redacts_github_token_env_var_value(self):
        """GITHUB_TOKEN env var value is redacted."""
        text = "curl -H 'Authorization: token ghp_github_secret_token_abc'"
        result = _redact_secrets(text)
        self.assertIn("[REDACTED]", result)
        self.assertNotIn("ghp_github_secret_token_abc", result)

    @patch.dict('os.environ', {'JIRA_API_TOKEN': 'jira-api-secret-value-xyz'})
    def test_redacts_jira_api_token_env_var_value(self):
        """JIRA_API_TOKEN env var value is redacted."""
        text = "Using API token: jira-api-secret-value-xyz for auth"
        result = _redact_secrets(text)
        self.assertIn("[REDACTED]", result)
        self.assertNotIn("jira-api-secret-value-xyz", result)

    @patch.dict('os.environ', {
        'JIRA_TOKEN': 'secret1-jira-token',
        'GITHUB_TOKEN': 'secret2-github-token'
    })
    def test_redacts_multiple_secrets_in_same_text(self):
        """Multiple secret values in the same text are all redacted."""
        text = "Jira: secret1-jira-token, GitHub: secret2-github-token"
        result = _redact_secrets(text)
        self.assertNotIn("secret1-jira-token", result)
        self.assertNotIn("secret2-github-token", result)
        self.assertEqual(result.count("[REDACTED]"), 2)

    def test_non_secret_text_unchanged(self):
        """Non-secret text remains intact."""
        text = "This is normal text without any secrets"
        result = _redact_secrets(text)
        self.assertEqual(result, text)

    def test_partial_text_preserved_around_secrets(self):
        """Text before and after secrets is preserved."""
        text = "Start Authorization: Bearer token123 End"
        result = _redact_secrets(text)
        self.assertIn("Start", result)
        self.assertIn("End", result)
        self.assertIn("Authorization: Bearer", result)
        self.assertNotIn("token123", result)

    @patch.dict('os.environ', {'JIRA_TOKEN': 'tiny'})
    def test_short_secret_not_redacted(self):
        """Secrets <= 4 chars are not redacted (too risky for false positives)."""
        text = "The value is tiny and should remain"
        result = _redact_secrets(text)
        # Short secrets are kept to avoid false positives on common words
        self.assertEqual(result, text)

    @patch.dict('os.environ', {'JIRA_TOKEN': ''})
    def test_empty_secret_env_var_handled(self):
        """Empty env var values don't cause issues."""
        text = "Some text without issues"
        result = _redact_secrets(text)
        self.assertEqual(result, text)

    def test_env_vars_list_contains_expected_vars(self):
        """CLAUDE_SECRET_ENV_VARS contains the expected secret names."""
        self.assertIn("JIRA_TOKEN", CLAUDE_SECRET_ENV_VARS)
        self.assertIn("GITHUB_TOKEN", CLAUDE_SECRET_ENV_VARS)
        self.assertIn("JIRA_API_TOKEN", CLAUDE_SECRET_ENV_VARS)


if __name__ == '__main__':
    unittest.main()
