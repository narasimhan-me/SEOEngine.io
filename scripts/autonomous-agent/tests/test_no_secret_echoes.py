"""
Regression test: prevent secret echo reintroduction in run.sh.

AUTONOMOUS-AGENT-SECRET-OUTPUT-SUPPRESSION-1 FIXUP-1 PATCH 2.
"""

import unittest
import re
from pathlib import Path


class TestNoSecretEchoes(unittest.TestCase):
    """Ensure run.sh does not echo token values."""

    @classmethod
    def setUpClass(cls):
        """Read run.sh content once for all tests."""
        script_dir = Path(__file__).parent.parent
        cls.run_sh_path = script_dir / "run.sh"
        cls.content = cls.run_sh_path.read_text()

    def test_no_jira_token_expansion(self):
        """run.sh must not contain ${JIRA_TOKEN: expansions."""
        self.assertNotIn("${JIRA_TOKEN:", self.content,
                         "run.sh contains ${JIRA_TOKEN: expansion - secrets may be printed")

    def test_no_github_token_expansion(self):
        """run.sh must not contain ${GITHUB_TOKEN: expansions."""
        self.assertNotIn("${GITHUB_TOKEN:", self.content,
                         "run.sh contains ${GITHUB_TOKEN: expansion - secrets may be printed")

    def test_no_echo_jira_token_expansion(self):
        """run.sh must not echo JIRA_TOKEN with variable expansion."""
        # Pattern: echo ... JIRA_TOKEN: ... ${
        pattern = r'echo.*JIRA_TOKEN:.*\$\{'
        matches = re.findall(pattern, self.content)
        self.assertEqual(len(matches), 0,
                         f"Found echo with JIRA_TOKEN expansion: {matches}")

    def test_no_echo_github_token_expansion(self):
        """run.sh must not echo GITHUB_TOKEN with variable expansion."""
        # Pattern: echo ... GITHUB_TOKEN: ... ${
        pattern = r'echo.*GITHUB_TOKEN:.*\$\{'
        matches = re.findall(pattern, self.content)
        self.assertEqual(len(matches), 0,
                         f"Found echo with GITHUB_TOKEN expansion: {matches}")


if __name__ == '__main__':
    unittest.main()
