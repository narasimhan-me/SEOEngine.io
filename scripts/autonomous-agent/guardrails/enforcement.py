"""
Guardrails v2 enforcement functions.

Extracted from engine.py for modularization.
Preserves hardened matching semantics (no basename/endswith bypass).
"""

import fnmatch
from typing import List, Set


def matches_allowed_new(filepath: str, patterns: List[str]) -> bool:
    """Check if filepath matches any ALLOWED NEW FILES pattern.

    Guardrails v1 PATCH 2: Only exact paths or explicit fnmatch globs.
    No basename/endswith bypass.

    Args:
        filepath: File path to check.
        patterns: List of allowed new file patterns.

    Returns:
        True if filepath matches any pattern.
    """
    for pattern in patterns:
        # Check if pattern contains wildcard chars
        if any(c in pattern for c in ('*', '?', '[')):
            # Use fnmatch for glob patterns
            if fnmatch.fnmatch(filepath, pattern):
                return True
        else:
            # Exact path match only
            if filepath == pattern:
                return True
    return False


def build_full_allowed(allowed_files: Set[str], resolved_new_patterns: List[str]) -> Set[str]:
    """Build full allowed set from base files and resolved patterns.

    Only adds exact paths (no wildcard chars or placeholder tokens).
    Does not auto-add globs to the set.

    Args:
        allowed_files: Base set of allowed files.
        resolved_new_patterns: Resolved ALLOWED NEW FILES patterns.

    Returns:
        Full allowed set with exact paths only.
    """
    full_allowed = allowed_files.copy()
    for pattern in resolved_new_patterns:
        # Only add if it's an exact path (no wildcard chars or placeholder tokens)
        has_wildcard = any(c in pattern for c in ('*', '?', '['))
        has_placeholder = '<' in pattern or '>' in pattern
        if not has_wildcard and not has_placeholder:
            full_allowed.add(pattern)
    return full_allowed


def check_scope_fence(
    frontend_only: bool,
    changed_files: List[str],
    allowed_roots: List[str],
    verification_report_relpath: str
) -> List[str]:
    """Check scope fence violation for frontend-only stories.

    Args:
        frontend_only: Whether story is frontend-only scoped.
        changed_files: List of changed file paths.
        allowed_roots: List of allowed root paths for frontend-only.
        verification_report_relpath: Relative path to verification report (excluded from check).

    Returns:
        List of violating file paths (empty if no violations).
    """
    if not frontend_only:
        return []

    violating_files = []
    for f in changed_files:
        is_allowed_root = any(f.startswith(root) for root in allowed_roots)
        is_verification_report = f == verification_report_relpath
        if not is_allowed_root and not is_verification_report:
            violating_files.append(f)

    return violating_files


def check_diff_budget(changed_count: int, max_files: int) -> bool:
    """Check if diff budget is exceeded.

    Args:
        changed_count: Number of changed files.
        max_files: Maximum allowed files.

    Returns:
        True if budget exceeded, False otherwise.
    """
    return changed_count > max_files


def check_patch_list(
    changed_files: List[str],
    full_allowed: Set[str],
    resolved_new_patterns: List[str]
) -> List[str]:
    """Check patch-list enforcement.

    Args:
        changed_files: List of changed file paths.
        full_allowed: Set of explicitly allowed paths.
        resolved_new_patterns: Resolved ALLOWED NEW FILES patterns.

    Returns:
        List of violating file paths (empty if no violations).
    """
    violating_files = []
    for f in changed_files:
        in_allowed = f in full_allowed
        matches_pattern = matches_allowed_new(f, resolved_new_patterns)
        if not in_allowed and not matches_pattern:
            violating_files.append(f)
    return violating_files
