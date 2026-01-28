#!/usr/bin/env python3
"""
Contracts and Limits Configuration for Auto-Verify and Auto-Fix Loop Safety.

PATCH BATCH: AUTONOMOUS-AGENT-AUTOVERIFY-AUTOFIX-LOOP-SAFETY-1 - PATCH 1

This module defines configurable defaults with env overrides for:
- Status contracts (human review and attention states)
- Auto-fix attempt and verify cycle limits
- Auto-verify command allowlist (prefix-based)
- Per-command timeouts
- Transition priority for human states
- Git push controls

All helpers fail-closed: on parse error, return safe defaults.
"""

import os
from typing import List, Optional


# -----------------------------------------------------------------------------
# STATUS CONTRACTS
# -----------------------------------------------------------------------------

def contract_human_review_status() -> str:
    """Status name indicating human review is needed before close.

    Default: HUMAN TO REVIEW AND CLOSE
    Env: ENGINEO_CONTRACT_HUMAN_REVIEW_STATUS
    """
    return os.environ.get("ENGINEO_CONTRACT_HUMAN_REVIEW_STATUS", "HUMAN TO REVIEW AND CLOSE").strip()


def contract_human_attention_status() -> str:
    """Status name indicating human attention is needed (escalation).

    Default: HUMAN ATTENTION NEEDED
    Env: ENGINEO_CONTRACT_HUMAN_ATTENTION_STATUS
    """
    return os.environ.get("ENGINEO_CONTRACT_HUMAN_ATTENTION_STATUS", "HUMAN ATTENTION NEEDED").strip()


def contract_human_statuses() -> List[str]:
    """All human-intervention status names (combined).

    Returns list of status names that require human intervention.
    """
    return [contract_human_review_status(), contract_human_attention_status()]


# -----------------------------------------------------------------------------
# AUTO-FIX AND AUTO-VERIFY LIMITS
# -----------------------------------------------------------------------------

def max_auto_fix_attempts() -> int:
    """Maximum number of auto-fix attempts before escalating to human.

    Default: 2
    Env: ENGINEO_MAX_AUTO_FIX_ATTEMPTS
    """
    return _parse_positive_int(
        os.environ.get("ENGINEO_MAX_AUTO_FIX_ATTEMPTS", ""),
        default=2
    )


def max_verify_cycles() -> int:
    """Maximum number of auto-verify cycles before escalating to human.

    Default: 3
    Env: ENGINEO_MAX_VERIFY_CYCLES
    """
    return _parse_positive_int(
        os.environ.get("ENGINEO_MAX_VERIFY_CYCLES", ""),
        default=3
    )


# -----------------------------------------------------------------------------
# AUTO-VERIFY COMMAND ALLOWLIST
# -----------------------------------------------------------------------------

# Default allowlist prefixes (pnpm build disabled by default)
DEFAULT_AUTOVERIFY_ALLOWLIST = "pnpm type-check,pnpm lint,pnpm test,pnpm test:e2e"


def autoverify_enabled() -> bool:
    """Whether auto-verify is enabled.

    Default: False (opt-in)
    Env: ENGINEO_AUTOVERIFY_ENABLED
    """
    return _parse_bool(os.environ.get("ENGINEO_AUTOVERIFY_ENABLED", ""), default=False)


def autoverify_allowlist() -> List[str]:
    """Prefix-based allowlist for auto-verify commands.

    Commands must match one of these prefixes to be automatable.

    Default: pnpm type-check, pnpm lint, pnpm test, pnpm test:e2e
    Env: ENGINEO_AUTOVERIFY_ALLOWLIST (comma-separated)
    """
    return _parse_csv(
        os.environ.get("ENGINEO_AUTOVERIFY_ALLOWLIST", ""),
        default_csv=DEFAULT_AUTOVERIFY_ALLOWLIST
    )


def autoverify_build_enabled() -> bool:
    """Whether pnpm build is allowed in auto-verify.

    Default: False (disabled by default as builds can be slow/flaky)
    Env: ENGINEO_AUTOVERIFY_BUILD_ENABLED
    """
    return _parse_bool(os.environ.get("ENGINEO_AUTOVERIFY_BUILD_ENABLED", ""), default=False)


def autoverify_full_allowlist() -> List[str]:
    """Full allowlist including build if enabled.

    Returns base allowlist + pnpm build if ENGINEO_AUTOVERIFY_BUILD_ENABLED=1
    """
    prefixes = autoverify_allowlist()
    if autoverify_build_enabled():
        # Add build prefix if not already present
        build_prefix = "pnpm build"
        if not any(p.startswith(build_prefix) for p in prefixes):
            prefixes = prefixes + [build_prefix]
    return prefixes


# -----------------------------------------------------------------------------
# COMMAND TIMEOUTS
# -----------------------------------------------------------------------------

DEFAULT_AUTOVERIFY_COMMAND_TIMEOUT = 300  # 5 minutes


def autoverify_command_timeout() -> int:
    """Timeout in seconds for individual auto-verify commands.

    Default: 300 (5 minutes)
    Env: ENGINEO_AUTOVERIFY_COMMAND_TIMEOUT
    """
    return _parse_positive_int(
        os.environ.get("ENGINEO_AUTOVERIFY_COMMAND_TIMEOUT", ""),
        default=DEFAULT_AUTOVERIFY_COMMAND_TIMEOUT
    )


# -----------------------------------------------------------------------------
# TRANSITION PRIORITIES FOR HUMAN STATES
# -----------------------------------------------------------------------------

DEFAULT_HUMAN_REVIEW_TRANSITIONS = "HUMAN TO REVIEW AND CLOSE,Review,Human Review"
DEFAULT_HUMAN_ATTENTION_TRANSITIONS = "HUMAN ATTENTION NEEDED,Blocked,BLOCKED"


def human_review_transition_priority() -> List[str]:
    """Transition names to try for human review state (in priority order).

    Default: HUMAN TO REVIEW AND CLOSE, Review, Human Review
    Env: ENGINEO_HUMAN_REVIEW_TRANSITIONS
    """
    return _parse_csv(
        os.environ.get("ENGINEO_HUMAN_REVIEW_TRANSITIONS", ""),
        default_csv=DEFAULT_HUMAN_REVIEW_TRANSITIONS
    )


def human_attention_transition_priority() -> List[str]:
    """Transition names to try for human attention state (in priority order).

    Default: HUMAN ATTENTION NEEDED, Blocked, BLOCKED
    Env: ENGINEO_HUMAN_ATTENTION_TRANSITIONS
    """
    return _parse_csv(
        os.environ.get("ENGINEO_HUMAN_ATTENTION_TRANSITIONS", ""),
        default_csv=DEFAULT_HUMAN_ATTENTION_TRANSITIONS
    )


# -----------------------------------------------------------------------------
# GIT PUSH CONTROLS
# -----------------------------------------------------------------------------

def git_push_enabled() -> bool:
    """Whether git push is enabled.

    Default: False (must explicitly enable)
    Env: ENGINEO_GIT_PUSH_ENABLED

    SAFETY: This defaults to 0 (disabled) to prevent accidental pushes.
    Auto-verify and auto-fix commits NEVER push regardless of this setting.
    """
    return _parse_bool(os.environ.get("ENGINEO_GIT_PUSH_ENABLED", ""), default=False)


# -----------------------------------------------------------------------------
# SHELL METACHARACTER SAFETY
# -----------------------------------------------------------------------------

# Characters that indicate shell injection risk
SHELL_METACHARACTERS = set('|;&$`\\"\'><!#(){}[]')


def contains_shell_metacharacters(cmd: str) -> bool:
    """Check if command contains shell metacharacters.

    Used to reject backtick-detected commands that might be dangerous.

    Args:
        cmd: Command string to check.

    Returns:
        True if any shell metacharacter is present.
    """
    return any(c in SHELL_METACHARACTERS for c in cmd)


def is_command_allowlisted(cmd: str) -> bool:
    """Check if command matches any prefix in the allowlist.

    Args:
        cmd: Command string to check.

    Returns:
        True if command starts with an allowlisted prefix.
    """
    cmd_stripped = cmd.strip()
    for prefix in autoverify_full_allowlist():
        if cmd_stripped.startswith(prefix.strip()):
            return True
    return False


# -----------------------------------------------------------------------------
# HELPER FUNCTIONS (FAIL-CLOSED)
# -----------------------------------------------------------------------------

def _parse_bool(raw: str, default: bool) -> bool:
    """Parse boolean from string, fail-closed to default.

    Accepts: 1, true, yes, on (case-insensitive) for True
    Accepts: 0, false, no, off (case-insensitive) for False

    Args:
        raw: Raw string value.
        default: Default value on parse failure.

    Returns:
        Parsed boolean or default.
    """
    if not raw:
        return default

    raw_lower = raw.strip().lower()

    if raw_lower in ("1", "true", "yes", "on"):
        return True
    if raw_lower in ("0", "false", "no", "off"):
        return False

    # Fail-closed: return default on unrecognized value
    return default


def _parse_positive_int(raw: str, default: int) -> int:
    """Parse positive integer from string, fail-closed to default.

    Args:
        raw: Raw string value.
        default: Default value on parse failure or non-positive value.

    Returns:
        Parsed positive integer or default.
    """
    if not raw:
        return default

    try:
        value = int(raw.strip())
        if value > 0:
            return value
        # Non-positive: fail-closed to default
        return default
    except (ValueError, TypeError):
        # Parse error: fail-closed to default
        return default


def _parse_csv(raw: str, default_csv: str) -> List[str]:
    """Parse comma-separated values from string, fail-closed to default.

    Args:
        raw: Raw string value (comma-separated).
        default_csv: Default comma-separated value on empty/blank input.

    Returns:
        List of stripped, non-empty values.
    """
    source = raw.strip() if raw else ""
    if not source:
        source = default_csv

    parts = [p.strip() for p in source.split(",")]
    return [p for p in parts if p]
