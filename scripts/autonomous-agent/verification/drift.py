"""
Drift detection for Step 4 verification.

Extracted from engine.py for modularization (Guardrails v2).
"""

from typing import Optional, List, Set, Tuple, Callable


# Authoritative diff range spec (HARDENING-1 contract)
DIFF_RANGE_SPEC = "origin/feature/agent...HEAD"


def fetch_remote_branch(
    git_client,
    story_key: Optional[str] = None,
    on_fail: Optional[Callable[[str], None]] = None
) -> bool:
    """Fetch remote branch for authoritative diff baseline.

    HARDENING-1: Exactly origin/feature/agent per contract.

    Args:
        git_client: GitClient instance.
        story_key: Optional story key for error context.
        on_fail: Optional callback on failure with story_key.

    Returns:
        True on success, False on failure.
    """
    success = git_client.fetch_remote_branch("origin", "feature/agent")
    if not success:
        print("[DRIFT] Failed to fetch origin/feature/agent")
        if on_fail and story_key:
            on_fail(story_key)
        return False
    return True


def diff_against_remote_base(
    git_client,
    ignored_files: Set[str],
    story_key: Optional[str] = None,
    on_fail: Optional[Callable[[str], None]] = None
) -> Optional[List[str]]:
    """Compute authoritative changed files against remote branch base.

    HARDENING-1: Uses exactly origin/feature/agent...HEAD per contract.

    Args:
        git_client: GitClient instance.
        ignored_files: Set of files to exclude from diff (e.g., ledger).
        story_key: Optional story key for error context.
        on_fail: Optional callback on failure with story_key.

    Returns:
        List of changed files, or None if fetch/diff fails.
    """
    if not fetch_remote_branch(git_client, story_key, on_fail):
        return None

    changed_files = git_client.diff_name_only_range(DIFF_RANGE_SPEC)

    # Filter out ignored files
    changed_files = [f for f in changed_files if f not in ignored_files]

    print(f"[DRIFT] Authoritative diff ({DIFF_RANGE_SPEC}): {len(changed_files)} files")
    return changed_files


def drift_evidence(recorded: List[str], current: List[str]) -> Tuple[bool, List[str]]:
    """Detect drift between recorded and current file lists.

    Uses symmetric difference to find discrepancies.

    Args:
        recorded: List of files recorded at Step 3.
        current: List of files at verification time.

    Returns:
        Tuple of (is_drift, diff_sample_first_20).
    """
    recorded_set = set(recorded)
    current_set = set(current)

    if recorded_set == current_set:
        return False, []

    symmetric_diff = recorded_set.symmetric_difference(current_set)
    diff_sample = sorted(list(symmetric_diff))[:20]

    return True, diff_sample
