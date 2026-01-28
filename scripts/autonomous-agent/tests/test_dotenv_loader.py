"""
Tests for dotenv loader.

AUTONOMOUS-AGENT-DOTENV-LOADER-1 PATCH 4 - unittest coverage.
Filesystem-independent (uses mocks, no tempfile).
"""

import unittest
from unittest.mock import patch, MagicMock
import sys
import os
from pathlib import Path

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from engine import load_dotenv


class TestDotenvLoader(unittest.TestCase):
    """Test cases for load_dotenv function."""

    @patch.object(Path, 'exists')
    def test_nonexistent_file_returns_zero(self, mock_exists):
        """Nonexistent .env file returns 0."""
        mock_exists.return_value = False
        result = load_dotenv(Path("/fake/.env"))
        self.assertEqual(result, 0)

    @patch.object(Path, 'read_text')
    @patch.object(Path, 'exists')
    def test_ignores_comments_and_blank_lines(self, mock_exists, mock_read_text):
        """Comments and blank lines are ignored."""
        mock_exists.return_value = True
        mock_read_text.return_value = """
# This is a comment

VALID_KEY=value

# Another comment
"""
        with patch.dict(os.environ, {}, clear=True):
            result = load_dotenv(Path("/fake/.env"))
            self.assertEqual(result, 1)
            self.assertEqual(os.environ.get("VALID_KEY"), "value")

    @patch.object(Path, 'read_text')
    @patch.object(Path, 'exists')
    def test_parses_both_key_value_and_export_syntax(self, mock_exists, mock_read_text):
        """Both KEY=VALUE and export KEY=VALUE are parsed."""
        mock_exists.return_value = True
        mock_read_text.return_value = """KEY1=value1
export KEY2=value2"""
        with patch.dict(os.environ, {}, clear=True):
            result = load_dotenv(Path("/fake/.env"))
            self.assertEqual(result, 2)
            self.assertEqual(os.environ.get("KEY1"), "value1")
            self.assertEqual(os.environ.get("KEY2"), "value2")

    @patch.object(Path, 'read_text')
    @patch.object(Path, 'exists')
    def test_handles_quoted_values(self, mock_exists, mock_read_text):
        """Paired quotes are stripped from values."""
        mock_exists.return_value = True
        mock_read_text.return_value = """KEY1="value with spaces"
KEY2='single quoted'
KEY3=unquoted"""
        with patch.dict(os.environ, {}, clear=True):
            result = load_dotenv(Path("/fake/.env"))
            self.assertEqual(result, 3)
            self.assertEqual(os.environ.get("KEY1"), "value with spaces")
            self.assertEqual(os.environ.get("KEY2"), "single quoted")
            self.assertEqual(os.environ.get("KEY3"), "unquoted")

    @patch.object(Path, 'read_text')
    @patch.object(Path, 'exists')
    def test_does_not_override_preset_env(self, mock_exists, mock_read_text):
        """Pre-set environment variables are not overridden."""
        mock_exists.return_value = True
        mock_read_text.return_value = """PRESET_KEY=new_value
NEW_KEY=loaded"""
        with patch.dict(os.environ, {"PRESET_KEY": "original"}, clear=True):
            result = load_dotenv(Path("/fake/.env"))
            # Only NEW_KEY should be loaded, PRESET_KEY skipped
            self.assertEqual(result, 1)
            self.assertEqual(os.environ.get("PRESET_KEY"), "original")
            self.assertEqual(os.environ.get("NEW_KEY"), "loaded")

    @patch.object(Path, 'read_text')
    @patch.object(Path, 'exists')
    def test_handles_value_with_equals_sign(self, mock_exists, mock_read_text):
        """Values containing = are parsed correctly (split on first = only)."""
        mock_exists.return_value = True
        mock_read_text.return_value = """URL=https://example.com?foo=bar&baz=qux"""
        with patch.dict(os.environ, {}, clear=True):
            result = load_dotenv(Path("/fake/.env"))
            self.assertEqual(result, 1)
            self.assertEqual(os.environ.get("URL"), "https://example.com?foo=bar&baz=qux")


if __name__ == '__main__':
    unittest.main()
