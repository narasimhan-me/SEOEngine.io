"""
Git operations client.

Extracted from engine.py for modularization (Guardrails v2).
"""

import subprocess
from typing import Optional, List, Tuple


class GitClient:
    """Git operations client"""

    def __init__(self, config):
        """Initialize Git client.

        Args:
            config: Configuration object with repo_path and feature_branch attributes.
        """
        self.config = config
        self.repo_path = config.repo_path

    def _run(self, *args) -> Tuple[bool, str]:
        """Run git command and return (success, output)"""
        try:
            result = subprocess.run(
                ['git'] + list(args),
                cwd=self.repo_path,
                capture_output=True,
                text=True
            )
            return result.returncode == 0, result.stdout + result.stderr
        except Exception as e:
            return False, str(e)

    def checkout_branch(self) -> bool:
        """Checkout the feature branch"""
        success, output = self._run('checkout', self.config.feature_branch)
        if success:
            print(f"[GIT] Checked out branch: {self.config.feature_branch}")
        else:
            print(f"[GIT] Checkout failed: {output}")
        return success

    def pull(self) -> bool:
        """Pull latest changes"""
        success, output = self._run('pull', '--rebase')
        return success

    def add_files(self, files: List[str]) -> bool:
        """Stage files for commit"""
        success, output = self._run('add', *files)
        return success

    def commit(self, message: str) -> bool:
        """Create a commit"""
        success, output = self._run('commit', '-m', message)
        if success:
            print(f"[GIT] Committed: {message[:50]}...")
        return success

    def push(self) -> bool:
        """Push to remote"""
        success, output = self._run('push', 'origin', self.config.feature_branch)
        return success

    def status(self) -> str:
        """Get git status"""
        success, output = self._run('status', '--porcelain')
        return output if success else ''

    def get_head_sha(self) -> Optional[str]:
        """Get current HEAD SHA"""
        success, output = self._run('rev-parse', 'HEAD')
        return output.strip() if success else None

    def get_status_porcelain(self) -> str:
        """Get git status in porcelain format"""
        success, output = self._run('status', '--porcelain')
        return output.strip() if success else ''

    def diff_name_only(self, base_sha: str) -> List[str]:
        """Get list of changed files since base_sha"""
        success, output = self._run('diff', '--name-only', base_sha)
        if success:
            return [f.strip() for f in output.strip().split('\n') if f.strip()]
        return []

    def diff_name_status(self, base_sha: str) -> str:
        """Get diff name-status output since base_sha"""
        success, output = self._run('diff', '--name-status', base_sha)
        return output if success else ''

    def fetch_remote_branch(self, remote: str, branch: str) -> bool:
        """Fetch remote branch. Returns success boolean."""
        success, output = self._run('fetch', remote, branch)
        if not success:
            print(f"[GitClient] fetch {remote}/{branch} failed: {output}")
        return success

    def diff_name_only_range(self, range_spec: str) -> List[str]:
        """Get list of changed files for a range spec (e.g., origin/branch...HEAD)"""
        success, output = self._run('diff', '--name-only', range_spec)
        if success:
            return [f.strip() for f in output.strip().split('\n') if f.strip()]
        return []
