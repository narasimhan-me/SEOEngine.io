#!/usr/bin/env python3
"""
EngineO Autonomous Multi-Persona Execution Engine v3.3

This engine coordinates THREE STRICT ROLES:

1) UEP v3.3
   - Combines: Lead PM, Tech Architect, UX Designer, CTO, CFO, Content Strategist
   - Acts as ONE integrated executive brain
   - Produces high-level intent ONLY - never implementation
   - NEVER writes patches or code
   - Defines WHAT we build, WHY we build it, UX/product expectations
   - Reads Ideas from Atlassian Product Discovery
   - Creates Epics with business goals and acceptance criteria

2) SUPERVISOR v3.3
   - NEVER writes code
   - ONLY produces PATCH BATCH instructions (surgical, minimal diffs)
   - Decomposes Epics into Stories with exact implementation specs
   - Validates intent and resolves ambiguities
   - Verifies Stories and Epics (with auto-verify for automatable items)
   - Routes to human states when automation exhausted
   - Ends each phase with instruction to update Implementation Plan

3) IMPLEMENTER v3.3
   - Applies PATCH BATCH diffs EXACTLY as specified
   - Writes all code
   - Makes ONLY the modifications shown in patches
   - Does NOT refactor or change unrelated lines
   - After patches, MUST update IMPLEMENTATION_PLAN.md and relevant docs
   - Commits to feature/agent branch (push gated by ENGINEO_GIT_PUSH_ENABLED)

All operations go through Jira API and Git.
MCP-ONLY operations for Atlassian Product Discovery, Jira, Git, and Email.

AUTOVERIFY-AUTOFIX-LOOP-SAFETY-1: Auto-verify automatable checklist items,
bounded auto-fix attempts, and human state routing.
"""

import os
import sys
import json
import time
import subprocess
import smtplib
import requests
from datetime import datetime, timezone, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any, Tuple
from enum import Enum
from pathlib import Path
import re
import difflib
import select
import pty
import hashlib

# Script directory for relative paths (logs, reports)
SCRIPT_DIR = Path(__file__).parent.resolve()

# Import work ledger module (PATCH 1: Persistent Work Ledger)
from work_ledger import (
    WorkLedger,
    WorkLedgerEntry,
    LastStep,
    StepResult,  # FIXUP-1 PATCH 5: Terminal outcome recording
    compute_error_fingerprint,
    compute_decomposition_fingerprint,
    canonical_verification_report_path,
    WORK_LEDGER_FILENAME,
)

# Import decomposition manifest module (PATCH 3: Idempotent Epic Decomposition)
from decomposition_manifest import (
    DecompositionManifest,
    DecompositionManifestStore,
    StoryIntent,
    compute_fingerprint as compute_decomp_fingerprint,
    compute_intent_id,
    should_decompose,
)

from blocking_escalations import BlockingEscalationsStore

# AUTOVERIFY-AUTOFIX-LOOP-SAFETY-1 PATCH 4: Import contracts and auto_verify
# REVIEW-FIXUP-1 PATCH 1: Imports from verification/ module
from verification.contracts import (
    contract_human_review_status,
    contract_human_attention_status,
    contract_human_statuses,
    max_auto_fix_attempts,
    max_verify_cycles,
    autoverify_enabled,
    human_review_transition_priority,
    human_attention_transition_priority,
    git_push_enabled,
)
from verification.auto_verify import (
    run_auto_verify,
    parse_checklist_items,
    compute_failure_hash,
    FailureType,
    AutoVerifyResult,
)

# Claude Code CLI is used for all personas (no API key required)
# Model configuration per persona:
# - UEP: opus
# - Supervisor: opus
# - Supervisor-Light: sonnet
# - Implementer: sonnet
CLAUDE_CODE_AVAILABLE = True  # Will be verified at runtime

# -----------------------------------------------------------------------------
# LOCKED MODEL ASSIGNMENTS (GOVERNANCE - NON-NEGOTIABLE)
# -----------------------------------------------------------------------------
MODEL_UEP = "opus"
MODEL_SUPERVISOR = "opus"
MODEL_SUPERVISOR_LIGHT = "sonnet"
MODEL_IMPLEMENTER = "sonnet"

_LOCKED_ROLE_MODEL_ASSIGNMENTS: Dict[str, str] = {
    "UEP": "opus",
    "SUPERVISOR": "opus",
    "SUPERVISOR_LIGHT": "sonnet",
    "IMPLEMENTER": "sonnet",
}


def _model_for_role(role: str) -> str:
    """Centralized, auditable model selection (no silent substitution)."""
    if role not in _LOCKED_ROLE_MODEL_ASSIGNMENTS:
        raise ValueError(f"Unknown role: {role}")
    return _LOCKED_ROLE_MODEL_ASSIGNMENTS[role]


def _assert_locked_model_assignments() -> None:
    """Fail-closed if any role->model mapping drifts from the locked contract."""
    runtime = {
        "UEP": MODEL_UEP,
        "SUPERVISOR": MODEL_SUPERVISOR,
        "SUPERVISOR_LIGHT": MODEL_SUPERVISOR_LIGHT,
        "IMPLEMENTER": MODEL_IMPLEMENTER,
    }
    for role, expected in _LOCKED_ROLE_MODEL_ASSIGNMENTS.items():
        actual = runtime.get(role)
        if actual != expected:
            raise RuntimeError(f"Locked model mismatch for {role}: expected={expected} actual={actual}")


def _looks_like_patch_or_diff(text: str) -> bool:
    """Detect patch/diff-like output (role contract enforcement)."""
    t = text or ""
    if "*** Begin Patch" in t or "diff --git" in t:
        return True
    # PATCH BATCH markers
    if "FILE:" in t and "---OLD---" in t and "---NEW---" in t:
        return True
    return False


def _epic_has_required_uep_intent_contract(epic_description: str) -> bool:
    """Supervisor must STOP if UEP intent contract is missing (no guessing)."""
    d = (epic_description or "").lower()
    required_markers = [
        "scope class:",
        "allowed roots:",
        "diff budget:",
        "verification required:",
    ]
    if not all(m in d for m in required_markers):
        return False
    # Require at least one checklist item in acceptance criteria
    if "- [ ]" not in d and "- [x]" not in d:
        return False
    return True


def _patch_batch_is_placeholder(content: str) -> bool:
    """Detect non-actionable PATCH BATCH content (placeholder/TODO/template/boilerplate).

    GOVERNANCE INVARIANT:
    - Placeholder PATCH BATCH == NON-EXISTENT (must not be written to disk or forwarded).
    """
    raw = content or ""
    c = raw.strip()
    cl = c.lower()

    if not c:
        return True

    # Must look like an actionable PATCH BATCH (basic structural markers).
    required = ["file:", "---old---", "---new---", "---end---"]
    if not all(marker in cl for marker in required):
        return True

    placeholder_markers = [
        "todo",
        "tbd",
        "placeholder",
        "human assistance required",
        "no patches generated",
        "identify exact code block",
        "specify replacement code",
        "file: <",
        "operation: <",
        "description: <",
        "<existing code",
        "<new code",
        "status: placeholder",
        "please update this file",
    ]
    if any(m in cl for m in placeholder_markers):
        return True

    if "{{" in raw and "}}" in raw:
        return True

    if len(c) < 80:
        return True

    return False


class NonActionablePatchBatchError(RuntimeError):
    """Raised when Supervisor output cannot be executed (placeholder/missing/invalid)."""

# -----------------------------------------------------------------------------
# CLAUDE EXECUTION HARDENING
# -----------------------------------------------------------------------------
CLAUDE_OUTPUT_DIRNAME = "reports"
CLAUDE_MAX_ATTEMPTS = 3
CLAUDE_RETRY_BACKOFF_SECONDS = [10, 30]  # attempt2 waits 10s, attempt3 waits 30s
CLAUDE_TRANSIENT_SUBSTRINGS = ["tool use concurrency", "api error: 400", "rate limit", "timeout", "no messages returned"]
CLAUDE_LOCK_REL_PATH = ".engineo/claude.lock"
CLAUDE_LOCK_STALE_SECONDS = 900  # 15 minutes
CLAUDE_TIMEOUT_SECONDS = 14400  # 4 hour default timeout per attempt
CLAUDE_HEARTBEAT_INTERVAL = 30  # Emit heartbeat if no output for 30s
CLAUDE_TIMEOUT_ENV_VAR = "ENGINEO_CLAUDE_TIMEOUT_SECONDS"  # Env override for timeout
CLAUDE_PER_TICKET_TIMEOUT_MAX = 8 * 60 * 60  # 8 hour cap for per-ticket override

# -----------------------------------------------------------------------------
# JIRA PAYLOAD SIZE HARDENING (PATCH A)
# -----------------------------------------------------------------------------
JIRA_STORY_DESC_MAX_CHARS = 8000  # Hard cap for Jira story description
JIRA_STORY_DESC_TARGET_CHARS = 6000  # Build target for description
PATCH_BATCH_EXCERPT_LINES = 40  # Lines to excerpt in Jira comment
PATCH_BATCH_FILE_MARKER = "PATCH_BATCH_FILE:"  # Marker in story description

# Guardrails ledger path (tracks commit eligibility for Step 4 verification)
LEDGER_REL_PATH = ".engineo/state.json"
LEDGER_VERSION = 1

# Escalation queue path (runtime-only, never tracked)
ESCALATIONS_REL_PATH = ".engineo/escalations.json"

# Blocking escalations path (runtime-only, never tracked)
BLOCKING_ESCALATIONS_REL_PATH = ".engineo/blocking_escalations.json"

# Runtime paths that must NEVER be staged/committed
RUNTIME_IGNORED_PATHS = {LEDGER_REL_PATH, CLAUDE_LOCK_REL_PATH, ESCALATIONS_REL_PATH, WORK_LEDGER_FILENAME, BLOCKING_ESCALATIONS_REL_PATH}

# Secret env vars to redact from output (values only, not names)
CLAUDE_SECRET_ENV_VARS = ["JIRA_TOKEN", "JIRA_API_TOKEN", "GITHUB_TOKEN"]

# -----------------------------------------------------------------------------
# VERIFY BACKOFF CONSTANTS (PATCH 2)
# -----------------------------------------------------------------------------
VERIFY_COOLDOWN_SECONDS = 600  # 10 minutes backoff on verify failure

# -----------------------------------------------------------------------------
# FATAL AGENT TEMPLATE ERROR SIGNATURES (PATCH 3)
# -----------------------------------------------------------------------------
FATAL_AGENT_TEMPLATE_ERROR_SIGNATURES = [
    "NameError: name 'issue_key' is not defined",
    "issue_key is not defined",
]

# -----------------------------------------------------------------------------
# VERIFICATION REPORT SKELETON TEMPLATE (PATCH 1)
# -----------------------------------------------------------------------------
VERIFICATION_REPORT_SKELETON_TEMPLATE = """# {issue_key} Verification Report

## Story Information
- **Story Key**: {issue_key}
- **Parent**: {parent_key}
- **Summary**: {summary}
- **Implementation Date**: {date}

## Summary

[IMPLEMENTER: Fill in implementation summary here]

## Checklist

- [ ] Implemented per PATCH BATCH
- [ ] Tests run (list below)
- [ ] Canonical report path correct
- [ ] Evidence (commit SHA) recorded

## Evidence

- **Commit SHA**: [IMPLEMENTER: Record commit SHA here]
- **Branch**: feature/agent
- **Files Changed**: [IMPLEMENTER: List modified files]

## Manual Testing

[IMPLEMENTER: Complete the following manual testing checklist]

- [ ] Run engine with an Epic already marked Done and a Story Done but no manifest evidence; confirm Idea closes successfully
- [ ] Confirm no repeated [RECOVER] ... missing artifact for Epics/Ideas
- [ ] Trigger implementer step and confirm no NameError: name 'issue_key' is not defined in retry path
- [ ] Confirm "commit exists but no modified files" case records commit + file list correctly

**Notes**: [IMPLEMENTER: Add any additional testing notes or observations here]

---

*Skeleton created by Engine. IMPLEMENTER must fill in all sections and check items.*
"""


def _artifact_dirname() -> str:
    """Get the canonical repo-root artifact directory name.

    Configurable via ENGINEO_ARTIFACTS_DIR. Defaults to 'reports'.
    """
    value = os.environ.get("ENGINEO_ARTIFACTS_DIR", "reports").strip()
    value = value.strip("/\\")
    return value or "reports"


def _env_csv(name: str, default_csv: str) -> List[str]:
    """Read a comma-separated env var into a list; default if unset/blank."""
    raw = os.environ.get(name, "")
    src = raw if raw.strip() else default_csv
    parts = [p.strip() for p in src.split(",")]
    return [p for p in parts if p]


def _parse_positive_int(raw: str, default: int) -> int:
    try:
        v = int(raw)
        return v if v > 0 else default
    except (ValueError, TypeError):
        return default


def _jql_issuetype_in(types: List[str]) -> str:
    quoted = ", ".join([f'"{t}"' for t in types])
    return f"issuetype in ({quoted})" if quoted else "issuetype is not EMPTY"


def _contract_idea_key_prefix() -> str:
    return os.environ.get("ENGINEO_CONTRACT_IDEA_KEY_PREFIX", "EA-").strip() or "EA-"


def _contract_epic_key_prefix() -> str:
    """Get expected key prefix for Epic issues (sanity check only).

    PATCH 4: Configurable via ENGINEO_CONTRACT_EPIC_KEY_PREFIX (default: KAN-).
    Used as sanity check only - issuetype remains authoritative.
    """
    return os.environ.get("ENGINEO_CONTRACT_EPIC_KEY_PREFIX", "KAN-").strip() or "KAN-"


def _contract_story_key_prefix() -> str:
    """Get expected key prefix for Story/Bug issues (sanity check only).

    PATCH 4: Configurable via ENGINEO_CONTRACT_STORY_KEY_PREFIX (default: KAN-).
    Used as sanity check only - issuetype remains authoritative.
    """
    return os.environ.get("ENGINEO_CONTRACT_STORY_KEY_PREFIX", "KAN-").strip() or "KAN-"


def _contract_idea_issue_types() -> List[str]:
    return _env_csv("ENGINEO_CONTRACT_IDEA_ISSUE_TYPES", "Idea,Initiative")


def _contract_epic_issue_types() -> List[str]:
    return _env_csv("ENGINEO_CONTRACT_EPIC_ISSUE_TYPES", "Epic")


def _contract_implement_issue_types() -> List[str]:
    return _env_csv("ENGINEO_CONTRACT_IMPLEMENT_ISSUE_TYPES", "Story,Bug")


def _contract_done_status_categories() -> List[str]:
    return _env_csv("ENGINEO_CONTRACT_DONE_STATUS_CATEGORIES", "Done")


def _contract_done_status_names() -> List[str]:
    return _env_csv("ENGINEO_CONTRACT_DONE_STATUS_NAMES", "Done,Complete,Closed,Resolved")


def _contract_terminal_child_status_names() -> List[str]:
    return _env_csv(
        "ENGINEO_CONTRACT_TERMINAL_CHILD_STATUS_NAMES",
        "Done,Duplicate,Canceled,Cancelled,Closed,Resolved,Complete",
    )


def _is_done_status(status_name: str, status_category_name: str = "") -> bool:
    s = (status_name or "").strip().lower()
    c = (status_category_name or "").strip().lower()
    done_cats = {x.lower() for x in _contract_done_status_categories()}
    done_names = {x.lower() for x in _contract_done_status_names()}
    return (c and c in done_cats) or (s and s in done_names)


def _is_terminal_child_status(status_name: str, status_category_name: str = "") -> bool:
    if _is_done_status(status_name, status_category_name):
        return True
    s = (status_name or "").strip().lower()
    terminal = {x.lower() for x in _contract_terminal_child_status_names()}
    return s in terminal


def _infer_idea_key_from_epic_issue(epic_issue: dict) -> Optional[str]:
    """Infer Idea key for an Epic via mapping label; fallback to summary prefix if enabled."""
    prefix = os.environ.get("ENGINEO_CONTRACT_IDEA_LABEL_PREFIX", "engineo-idea-")
    allow_fallback = os.environ.get(
        "ENGINEO_CONTRACT_ALLOW_SUMMARY_IDEA_PREFIX_FALLBACK", "true"
    ).strip().lower() in ("1", "true", "yes")

    labels = epic_issue.get("fields", {}).get("labels", []) or []
    for label in labels:
        if isinstance(label, str) and label.startswith(prefix):
            candidate = label[len(prefix):].strip()
            if candidate and candidate.startswith(_contract_idea_key_prefix()):
                return candidate

    if allow_fallback:
        summary = epic_issue.get("fields", {}).get("summary", "") or ""
        m = re.match(r"^\[([A-Z]+-\d+)\]", summary.strip())
        if m:
            candidate = m.group(1)
            if candidate.startswith(_contract_idea_key_prefix()):
                return candidate

    return None


def _should_attempt_reconcile(
    entry: Optional['WorkLedgerEntry'],
    fingerprint: Optional[str],
    now_ts: Optional[float] = None
) -> Tuple[bool, str]:
    """Reconcile backoff gating (loop guard).

    Rules:
    - No ledger entry: allow
    - Fingerprint changed since last reconcile failure: allow immediately
    - Cooldown active AND fingerprint unchanged: skip
    """
    if entry is None:
        return (True, "no_ledger_entry")
    if not fingerprint:
        return (True, "no_fingerprint")

    if entry.reconcile_last_fingerprint and entry.reconcile_last_fingerprint != fingerprint:
        return (True, "fingerprint_changed")

    if not entry.reconcile_next_at:
        return (True, "no_cooldown")

    if now_ts is None:
        now_ts = datetime.now(timezone.utc).timestamp()

    try:
        next_at = datetime.fromisoformat(entry.reconcile_next_at)
        if next_at.tzinfo is None:
            next_at = next_at.replace(tzinfo=timezone.utc)
        if next_at.timestamp() > now_ts:
            return (False, "cooldown_active_unchanged_fingerprint")
    except (ValueError, TypeError):
        pass

    return (True, "cooldown_elapsed")


def _should_post_reconcile_comment(
    entry: Optional['WorkLedgerEntry'],
    reason: str,
    fingerprint: Optional[str]
) -> bool:
    """Reconcile comment de-duplication."""
    if entry is None:
        return True
    if (entry.reconcile_last_commented_reason == reason and
        entry.reconcile_last_commented_fingerprint == fingerprint):
        return False
    return True


def _canonical_verification_report_relpath(issue_key: str) -> str:
    """Get canonical verification report repo-relative path.

    PATCH 4: Single canonical path only (no run_id variants).

    Returns: {ARTIFACTS_DIR}/{ISSUE_KEY}-verification.md (repo root level)
    """
    artifacts_dir = _artifact_dirname()
    return f"{artifacts_dir}/{issue_key}-verification.md"


def _canonical_patch_batch_relpath(issue_key: str) -> str:
    """Get canonical patch batch repo-relative path.

    Returns: {ARTIFACTS_DIR}/{ISSUE_KEY}-patch-batch.md (repo root level)
    """
    artifacts_dir = _artifact_dirname()
    return f"{artifacts_dir}/{issue_key}-patch-batch.md"


def _legacy_verification_report_relpath(issue_key: str) -> str:
    """Get legacy verification report repo-relative path (for backward compat search).

    Returns: scripts/autonomous-agent/reports/{ISSUE_KEY}-verification.md
    """
    return f"scripts/autonomous-agent/{CLAUDE_OUTPUT_DIRNAME}/{issue_key}-verification.md"


def _find_near_match_reports(repo_path: str, issue_key: str) -> List[str]:
    """Search for near-match verification reports for fail-fast remediation.

    PATCH 4: Searches both repo root {ARTIFACTS_DIR}/ and scripts/autonomous-agent/reports/.

    Returns: List of found paths matching the issue key pattern.
    """
    near_matches = []
    search_dirs = [
        Path(repo_path) / _artifact_dirname(),
        Path(repo_path) / "scripts" / "autonomous-agent" / "reports",
    ]

    for search_dir in search_dirs:
        if search_dir.exists():
            for path in search_dir.glob(f"*{issue_key}*verification*.md"):
                near_matches.append(str(path.relative_to(repo_path)))

    return near_matches


# -----------------------------------------------------------------------------
# PATCH 1: Verification Report Skeleton Helpers
# -----------------------------------------------------------------------------

def _ensure_verification_report_skeleton(
    repo_path: str,
    issue_key: str,
    summary: str,
    parent_key: Optional[str] = None
) -> Tuple[bool, str]:
    """Ensure canonical verification report skeleton exists.

    PATCH 1: Engine-owned canonical verification report skeleton.

    Behaviors:
    - Creates reports/ directory if missing
    - If file exists: NO-OP (do not overwrite user edits)
    - If missing: write minimal canonical template with ## Checklist

    Args:
        repo_path: Path to repository root.
        issue_key: The issue key (e.g., "KAN-25").
        summary: Story summary for template.
        parent_key: Parent Epic key (optional).

    Returns:
        Tuple of (created: bool, path: str).
    """
    canonical_path = _canonical_verification_report_relpath(issue_key)
    full_path = Path(repo_path) / canonical_path

    # Ensure reports/ directory exists
    full_path.parent.mkdir(parents=True, exist_ok=True)

    # If file exists, do not overwrite
    if full_path.exists():
        return (False, canonical_path)

    # Generate skeleton content
    date_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    content = VERIFICATION_REPORT_SKELETON_TEMPLATE.format(
        issue_key=issue_key,
        parent_key=parent_key or 'N/A',
        summary=summary[:200] if summary else 'N/A',
        date=date_str,
    )

    # Write skeleton (atomic)
    temp_path = full_path.with_suffix('.md.tmp')
    try:
        temp_path.write_text(content, encoding='utf-8')
        os.replace(str(temp_path), str(full_path))
        return (True, canonical_path)
    except OSError:
        try:
            temp_path.unlink(missing_ok=True)
        except OSError:
            pass
        return (False, canonical_path)


# -----------------------------------------------------------------------------
# PATCH 2: Verify Backoff Helpers
# -----------------------------------------------------------------------------

def _hash_file(path: str) -> Optional[str]:
    """Compute SHA256 hash of file contents.

    PATCH 2: Hash helper for verify backoff.

    Args:
        path: Full path to file.

    Returns:
        SHA256 hex string or None if file cannot be read.
    """
    try:
        content = Path(path).read_bytes()
        return hashlib.sha256(content).hexdigest()
    except (OSError, IOError):
        return None


def _should_attempt_verify(
    entry: Optional['WorkLedgerEntry'],
    report_path: str,
    now_ts: Optional[float] = None,
    current_commit_sha: Optional[str] = None,
) -> Tuple[bool, str]:
    """Determine if verify should be attempted based on backoff state.

    PATCH 2: Verify backoff gating logic.
    AUTOVERIFY-AUTOFIX-LOOP-SAFETY-1 PATCH 4: Added commit_changed bypass.

    Rules:
    - If report missing: allow attempt (fail-fast with remediation once)
    - If entry has verify_next_at in future AND report hash unchanged: skip
    - If report hash changed since last failure: allow immediately
    - If commit SHA changed since last failure: allow immediately (commit_changed bypass)
    - If cooldown passed: allow

    Args:
        entry: WorkLedgerEntry or None.
        report_path: Full path to verification report.
        now_ts: Current timestamp (for testing); defaults to time.time().
        current_commit_sha: Current HEAD commit SHA (for commit_changed bypass).

    Returns:
        Tuple of (should_verify: bool, reason: str).
    """
    if now_ts is None:
        now_ts = time.time()

    # If no entry, allow verify
    if entry is None:
        return (True, "no_ledger_entry")

    # AUTOVERIFY-AUTOFIX-LOOP-SAFETY-1 PATCH 4: Commit changed bypass
    # If code has changed since last verification, bypass cooldown
    if current_commit_sha and entry.verify_last_commit_sha:
        if current_commit_sha != entry.verify_last_commit_sha:
            return (True, "commit_changed")

    # Compute current report state
    report_exists = Path(report_path).exists() if report_path else False

    if not report_exists:
        # Report missing - allow one attempt (will fail with remediation)
        # But respect cooldown if already failed for missing report
        if entry.verify_next_at:
            try:
                next_at = datetime.fromisoformat(entry.verify_next_at.replace('Z', '+00:00'))
                if next_at.timestamp() > now_ts:
                    # Cooldown still active
                    if entry.verify_last_reason and "missing" in entry.verify_last_reason.lower():
                        return (False, "cooldown_active_missing_report")
            except (ValueError, TypeError):
                pass
        return (True, "report_missing")

    # Compute current hash
    current_hash = _hash_file(report_path)

    # Check if hash changed since last failure
    if entry.verify_last_report_hash and current_hash:
        if current_hash != entry.verify_last_report_hash:
            return (True, "report_changed")

    # Check cooldown
    if entry.verify_next_at:
        try:
            next_at = datetime.fromisoformat(entry.verify_next_at.replace('Z', '+00:00'))
            if next_at.timestamp() > now_ts:
                return (False, "cooldown_active_unchanged_report")
        except (ValueError, TypeError):
            pass

    # Cooldown passed or not set
    return (True, "cooldown_elapsed")


def _should_post_verify_comment(
    entry: Optional['WorkLedgerEntry'],
    verify_reason: str,
    report_hash: Optional[str]
) -> bool:
    """Determine if a Jira comment should be posted for verify failure.

    PATCH 2: Comment de-duplication.

    Args:
        entry: WorkLedgerEntry or None.
        verify_reason: Current verify failure reason.
        report_hash: Current report hash (or None).

    Returns:
        True if comment should be posted, False if duplicate.
    """
    if entry is None:
        return True

    # Check for duplicate: same reason AND same report hash
    if (entry.verify_last_commented_reason == verify_reason and
        entry.verify_last_commented_report_hash == report_hash):
        return False

    return True


# -----------------------------------------------------------------------------
# PATCH 3: Fatal Agent Template Error Classification
# -----------------------------------------------------------------------------

def _is_agent_template_error(text: str) -> bool:
    """Check if text contains a fatal agent template error signature.

    PATCH 3: Fatal error classification for non-retryable agent/template bugs.

    Args:
        text: Output text to check.

    Returns:
        True if fatal agent template error detected.
    """
    if not text:
        return False
    for signature in FATAL_AGENT_TEMPLATE_ERROR_SIGNATURES:
        if signature in text:
            return True
    return False


def _claude_output_relpath(issue_key: str, run_id: str, attempt: int) -> str:
    """Get relative path for Claude attempt output artifact.

    New naming contract: <KAN-KEY>-<run_id>-claude-output-attempt<N>.txt
    """
    return f"{CLAUDE_OUTPUT_DIRNAME}/{issue_key}-{run_id}-claude-output-attempt{attempt}.txt"


def _write_claude_attempt_output(repo_path: str, issue_key: str, run_id: str, attempt: int, content: str) -> str:
    """Write Claude attempt output to artifact file.

    Reports are written to scripts/autonomous-agent/reports/ (SCRIPT_DIR).
    Returns: The relative path to the written artifact.
    """
    reports_dir = SCRIPT_DIR / CLAUDE_OUTPUT_DIRNAME
    reports_dir.mkdir(parents=True, exist_ok=True)
    rel_path = _claude_output_relpath(issue_key, run_id, attempt)
    output_path = SCRIPT_DIR / rel_path
    output_path.write_text(content)
    return rel_path


def _write_patch_batch_artifact(repo_path: str, epic_key: str, run_id: str, content: str) -> Tuple[str, str]:
    """Write patch batch to artifact file with atomic write.

    PATCH A: Writes full patch batch to repo-root reports/ directory.

    Args:
        repo_path: Path to repository root.
        epic_key: The Epic key (e.g., "KAN-10").
        run_id: The run ID (e.g., "20260127-143047Z").
        content: Full patch batch content.

    Returns:
        Tuple of (epic_artifact_path, story_artifact_path_pattern).
        The story_artifact_path_pattern is the pattern used for the final stable path.
    """
    # GOVERNANCE INVARIANT: Placeholder PATCH BATCH is treated as NON-EXISTENT.
    # Never write placeholder/non-actionable patch batches to disk.
    if _patch_batch_is_placeholder(content):
        raise ValueError("Supervisor output is non-actionable (placeholder/TODO/template detected).")

    artifacts_dir = _artifact_dirname()
    reports_dir = Path(repo_path) / artifacts_dir
    reports_dir.mkdir(parents=True, exist_ok=True)

    # Write to {EPIC_KEY}-{run_id}-patch-batch.md
    epic_artifact_path = f"{artifacts_dir}/{epic_key}-{run_id}-patch-batch.md"
    full_epic_path = Path(repo_path) / epic_artifact_path
    temp_path = full_epic_path.with_suffix('.md.tmp')

    try:
        temp_path.write_text(content, encoding='utf-8')
        os.replace(str(temp_path), str(full_epic_path))
    except OSError:
        try:
            temp_path.unlink(missing_ok=True)
        except OSError:
            pass
        raise

    # Return pattern for story-specific path (will be created after story key is known)
    story_pattern = f"{artifacts_dir}/{{STORY_KEY}}-patch-batch.md"
    return epic_artifact_path, story_pattern


def _copy_patch_batch_for_story(repo_path: str, epic_artifact_path: str, story_key: str) -> str:
    """Copy patch batch artifact to story-specific stable path.

    PATCH A: Creates {STORY_KEY}-patch-batch.md for stable reference.

    GOVERNANCE: Do not propagate placeholder/non-actionable patch batches.

    Args:
        repo_path: Path to repository root.
        epic_artifact_path: Path to epic's patch batch file.
        story_key: The Story key (e.g., "KAN-17").

    Returns:
        The story-specific patch batch path.
    """
    artifacts_dir = _artifact_dirname()
    story_path = f"{artifacts_dir}/{story_key}-patch-batch.md"
    full_story_path = Path(repo_path) / story_path
    full_epic_path = Path(repo_path) / epic_artifact_path

    if full_epic_path.exists():
        try:
            content = full_epic_path.read_text(encoding='utf-8')
            if _patch_batch_is_placeholder(content):
                return story_path
            temp_path = full_story_path.with_suffix('.md.tmp')
            temp_path.write_text(content, encoding='utf-8')
            os.replace(str(temp_path), str(full_story_path))
        except OSError:
            pass

    return story_path


def _load_patch_batch_from_file(repo_path: str, story_key: str, description: str) -> Tuple[Optional[str], Optional[str]]:
    """Load patch batch content from file.

    PATCH A: IMPLEMENTER loads patch batch from file instead of description.

    GOVERNANCE: Placeholder PATCH BATCH == NON-EXISTENT.

    Priority:
    1. {STORY_KEY}-patch-batch.md (stable per-story path)
    2. Path from PATCH_BATCH_FILE: marker in description
    3. None if not found

    Args:
        repo_path: Path to repository root.
        story_key: The Story key.
        description: Story description text.

    Returns:
        Tuple of (patch_batch_content, source_path) or (None, None) if not found.
    """
    artifacts_dir = _artifact_dirname()
    # Priority 1: Story-specific stable path
    story_path = Path(repo_path) / f"{artifacts_dir}/{story_key}-patch-batch.md"
    if story_path.exists():
        try:
            content = story_path.read_text(encoding='utf-8')
            if _patch_batch_is_placeholder(content):
                return None, f"{artifacts_dir}/{story_key}-patch-batch.md"
            return content, f"{artifacts_dir}/{story_key}-patch-batch.md"
        except OSError:
            pass

    # Priority 2: Parse PATCH_BATCH_FILE: marker from description
    if description and PATCH_BATCH_FILE_MARKER in description:
        for line in description.split('\n'):
            if line.strip().startswith(PATCH_BATCH_FILE_MARKER):
                path_part = line.strip()[len(PATCH_BATCH_FILE_MARKER):].strip()
                if path_part:
                    file_path = Path(repo_path) / path_part
                    if file_path.exists():
                        try:
                            content = file_path.read_text(encoding='utf-8')
                            if _patch_batch_is_placeholder(content):
                                return None, path_part
                            return content, path_part
                        except OSError:
                            pass

    return None, None


def _redact_secrets(text: str) -> str:
    """Redact secret values from text for safe logging/artifact storage.

    Redacts:
    - Values of known secret env vars (JIRA_TOKEN, GITHUB_TOKEN, etc.)
    - Authorization: Bearer <token> patterns
    """
    result = text

    # Redact known secret env var values
    for var_name in CLAUDE_SECRET_ENV_VARS:
        secret_value = os.environ.get(var_name, "")
        if secret_value and len(secret_value) > 4:
            result = result.replace(secret_value, "[REDACTED]")

    # Redact Authorization: Bearer patterns
    result = re.sub(r'(Authorization:\s*Bearer\s+)[^\s"\']+', r'\1[REDACTED]', result, flags=re.IGNORECASE)

    return result


def _parse_stream_json_line(line: str) -> Optional[str]:
    """Parse a Claude CLI stream-json line and extract displayable content.

    Returns human-readable text for display, or None if nothing to display.
    """
    if not line.strip():
        return None

    try:
        data = json.loads(line)
    except json.JSONDecodeError:
        # Not JSON, return as-is
        return line if line.strip() else None

    msg_type = data.get("type", "")

    # System init - show model info
    if msg_type == "system" and data.get("subtype") == "init":
        model = data.get("model", "unknown")
        return f"[init] model={model}"

    # Assistant message - extract text content
    if msg_type == "assistant":
        message = data.get("message", {})
        content = message.get("content", [])
        texts = []
        for block in content:
            if isinstance(block, dict):
                if block.get("type") == "text":
                    text = block.get("text", "")
                    if text:
                        texts.append(text)
                elif block.get("type") == "tool_use":
                    tool_name = block.get("name", "unknown")
                    texts.append(f"[tool_use: {tool_name}]")
        if texts:
            return " ".join(texts)

    # Tool result
    if msg_type == "user":
        content = data.get("message", {}).get("content", [])
        for block in content:
            if isinstance(block, dict) and block.get("type") == "tool_result":
                is_error = block.get("is_error", False)
                status = "error" if is_error else "ok"
                return f"[tool_result: {status}]"

    # Final result
    if msg_type == "result":
        subtype = data.get("subtype", "")
        duration = data.get("duration_ms", 0)
        cost = data.get("total_cost_usd", 0)
        return f"[result: {subtype}] duration={duration}ms cost=${cost:.4f}"

    return None


def rotate_logs(log_dir: Path, max_age_days: int = 2) -> int:
    """Delete log files older than max_age_days.

    Args:
        log_dir: Directory containing log files.
        max_age_days: Maximum age in days before deletion.

    Returns: Number of deleted files.
    """
    if not log_dir.exists():
        return 0

    deleted_count = 0
    now = time.time()
    max_age_seconds = max_age_days * 86400

    for file_path in log_dir.iterdir():
        if file_path.is_file():
            try:
                mtime = file_path.stat().st_mtime
                if now - mtime > max_age_seconds:
                    file_path.unlink()
                    deleted_count += 1
            except OSError:
                # Skip files that can't be accessed/deleted
                pass

    return deleted_count


def _parse_per_ticket_timeout(description: str) -> Optional[int]:
    """Parse optional per-ticket hard timeout from description.

    Looks for a line: HARD TIMEOUT: <minutes>

    Args:
        description: Story/bug description text.

    Returns: Timeout in seconds if valid, None otherwise.
    """
    if not description:
        return None

    # Match "HARD TIMEOUT: <minutes>" (case insensitive)
    match = re.search(r'HARD\s+TIMEOUT:\s*(\d+)', description, re.IGNORECASE)
    if match:
        try:
            minutes = int(match.group(1))
            if minutes > 0:
                # Cap at 8 hours
                return min(minutes * 60, CLAUDE_PER_TICKET_TIMEOUT_MAX)
        except ValueError:
            pass

    return None


def _parse_allowed_files(description: str) -> List[str]:
    """Parse ALLOWED FILES constraint from description.

    Extracts file patterns from ALLOWED FILES section, supporting various bullet formats
    including Jira-rendered Unicode bullets (•).

    Args:
        description: Story/bug description text.

    Returns:
        List of allowed file patterns (e.g., ['apps/web/**', 'docs/**']).
        Empty list if no ALLOWED FILES section found.
    """
    if not description:
        return []

    allowed_files = []
    in_allowed_files_section = False

    for line in description.split('\n'):
        stripped = line.strip()

        # Check for ALLOWED FILES header
        if re.match(r'^ALLOWED\s+FILES:', stripped, re.IGNORECASE):
            in_allowed_files_section = True
            continue

        # Stop parsing at next section header or empty line after content
        if in_allowed_files_section:
            # Empty line or new section header ends the ALLOWED FILES section
            if not stripped or re.match(r'^[A-Z][A-Z\s]+:', stripped):
                if not stripped:
                    # Only break on empty line if we already found some files
                    if allowed_files:
                        break
                    continue
                else:
                    # New section header
                    break

            # Parse bullet points: -, *, or • (Unicode bullet U+2022)
            # Strip leading bullet characters and whitespace
            cleaned = stripped.lstrip('-*•').strip()
            if cleaned and cleaned != stripped.lstrip():
                # Line started with a bullet - it's a file pattern
                allowed_files.append(cleaned)

    return allowed_files


def _docs_allowed_by_constraints(description: str) -> bool:
    """Check if docs/ modifications are allowed by ALLOWED FILES constraints.

    Rules:
    - If no ALLOWED FILES section found (empty list): return True (preserve legacy)
    - If ALLOWED FILES section exists: return True only if any pattern permits docs/
      (i.e., pattern starts with 'docs/' or is 'docs/**' or similar)

    Args:
        description: Story/bug description text.

    Returns:
        True if docs modifications are allowed, False otherwise.
    """
    allowed_patterns = _parse_allowed_files(description)

    # No ALLOWED FILES section = legacy behavior, docs allowed
    if not allowed_patterns:
        return True

    # Check if any pattern permits docs/
    for pattern in allowed_patterns:
        if pattern.startswith('docs/') or pattern.startswith('docs\\') or pattern == 'docs':
            return True

    return False


def _extract_file_references(text: str) -> List[str]:
    """Extract potential file path references from text (e.g., error output).

    REVIEW-FIXUP-2 PATCH 3: Used for scope overlap check in auto-fix.

    Looks for patterns like:
    - Absolute paths: /path/to/file.ts
    - Repo-relative paths: src/file.ts, apps/web/src/file.tsx
    - Error references: file.ts:123, file.ts(123,45)

    Args:
        text: Text to search for file references.

    Returns:
        List of potential file paths (may include false positives).
    """
    if not text:
        return []

    file_refs = set()

    # Pattern for paths with common extensions
    # Matches: path/to/file.ext or file.ext with optional line numbers
    path_pattern = re.compile(
        r'(?:^|[\s\'\"(])([a-zA-Z0-9_./-]+\.(?:ts|tsx|js|jsx|py|md|json|yaml|yml|css|scss|html))'
        r'(?:[:(\s]|$)',
        re.MULTILINE
    )

    for match in path_pattern.finditer(text):
        path = match.group(1)
        # Clean up the path
        path = path.strip('/')
        # Skip obvious non-paths
        if path and not path.startswith('.') and '/' in path or '.' in path:
            file_refs.add(path)

    return list(file_refs)


def _file_matches_pattern(filepath: str, pattern: str) -> bool:
    """Check if a filepath matches an allowed-files glob pattern.

    REVIEW-FIXUP-2 PATCH 3: Used for scope overlap check in auto-fix.

    Supports:
    - Exact match: src/file.ts matches src/file.ts
    - Directory glob: src/** matches src/anything/deep/file.ts
    - Single wildcard: src/*.ts matches src/file.ts but not src/sub/file.ts

    Args:
        filepath: The file path to check.
        pattern: The glob pattern to match against.

    Returns:
        True if the filepath matches the pattern.
    """
    if not filepath or not pattern:
        return False

    # Normalize paths
    filepath = filepath.strip('/')
    pattern = pattern.strip('/')

    # Exact match
    if filepath == pattern:
        return True

    # Handle ** (recursive glob)
    if '**' in pattern:
        # Split pattern at **
        parts = pattern.split('**')
        if len(parts) == 2:
            prefix = parts[0].rstrip('/')
            suffix = parts[1].lstrip('/')

            # Check prefix matches
            if prefix:
                if not filepath.startswith(prefix):
                    return False
                filepath = filepath[len(prefix):].lstrip('/')

            # Check suffix matches (if any)
            if suffix:
                return filepath.endswith(suffix)
            return True

    # Handle single * (single-level glob)
    if '*' in pattern:
        # Convert glob to regex
        regex_pattern = pattern.replace('.', r'\.').replace('*', '[^/]*')
        regex_pattern = f'^{regex_pattern}$'
        return bool(re.match(regex_pattern, filepath))

    # Direct prefix match (directory pattern without *)
    if pattern.endswith('/'):
        return filepath.startswith(pattern)

    return False


def _parse_verification_required_paths(description: str) -> List[str]:
    """Parse VERIFICATION REQUIRED section from description.

    PATCH 3-A: Extracts repo-relative file paths from VERIFICATION REQUIRED section,
    supporting various header formats:
    - VERIFICATION REQUIRED: (existing)
    - ## VERIFICATION REQUIRED (markdown header, with or without trailing :)

    Also detects markdown-prefixed section headers (e.g., ## DIFF BUDGET:) as
    end-of-section markers.

    Args:
        description: Story/bug description text.

    Returns:
        List of repo-relative paths exactly as written (no normalization).
        Empty list if no VERIFICATION REQUIRED section found.
    """
    if not description:
        return []

    paths = []
    in_section = False

    for line in description.split('\n'):
        stripped = line.strip()

        # Check for VERIFICATION REQUIRED header (case-insensitive)
        # Accepts: "VERIFICATION REQUIRED:", "## VERIFICATION REQUIRED", "## VERIFICATION REQUIRED:"
        if re.match(r'^(#{1,3}\s*)?VERIFICATION\s+REQUIRED:?$', stripped, re.IGNORECASE):
            in_section = True
            continue

        # Stop parsing at next section header or empty line after content
        if in_section:
            # New section header ends the section (markdown or ALLCAPS)
            # Matches: "## DIFF BUDGET:", "ALLOWED FILES:", etc.
            if re.match(r'^(#{1,3}\s*)?[A-Z][A-Z\s]+:', stripped):
                break

            # Empty line: if we have paths, end; otherwise continue looking
            if not stripped:
                if paths:
                    break
                continue

            # Parse bullet points: -, *, or • (Unicode bullet U+2022)
            cleaned = stripped.lstrip('-*•').strip()
            if cleaned and cleaned != stripped.lstrip():
                paths.append(cleaned)

    return paths


def _expected_verification_report_path(issue_key: str, description: str = "", run_id: Optional[str] = None) -> str:
    """Get expected verification report path.

    PATCH 4: Returns canonical path only: reports/{ISSUE_KEY}-verification.md
    No run_id variants, no timestamped filenames.

    Args:
        issue_key: The issue key (e.g., "KAN-16").
        description: Story/bug description text (ignored in PATCH 4).
        run_id: Ignored in PATCH 4 (kept for backward compat signature).

    Returns:
        Canonical repo-relative path: reports/{ISSUE_KEY}-verification.md
    """
    # PATCH 4: Single canonical path only
    return _canonical_verification_report_relpath(issue_key)


def _format_log_line(
    role: str,
    message: str,
    model: Optional[str] = None,
    tool: Optional[str] = None
) -> str:
    """Format a log line with role, model, and tool fields.

    PATCH 7: Pure helper for unit testing log format.

    Args:
        role: Role name (UEP, SUPERVISOR, IMPLEMENTER)
        message: Log message text
        model: Optional model name
        tool: Optional tool name

    Returns:
        Formatted log line string.
    """
    timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

    # Build role suffix with model/tool
    suffix_parts = []
    if model:
        suffix_parts.append(f"model={model}")
    if tool:
        suffix_parts.append(f"tool={tool}")

    if suffix_parts:
        role_part = f"[{role}] ({', '.join(suffix_parts)})"
    else:
        role_part = f"[{role}]"

    return f"[{timestamp}] {role_part} {message}"


def _is_fatal_claude_output(text: str) -> bool:
    """Check if Claude output indicates a fatal error requiring immediate termination.

    Fatal errors (case-insensitive):
    - "Error: No messages returned"
    - "UnhandledPromiseRejection"
    - cli.js stack traces

    Args:
        text: Claude CLI output text.

    Returns:
        True if fatal error detected, False otherwise.
    """
    text_lower = text.lower()
    fatal_patterns = [
        "error: no messages returned",
        "unhandledpromiserejection",
        "cli.js:",
    ]
    return any(pattern in text_lower for pattern in fatal_patterns)


def _classify_implementer_terminal_result(output_text: str) -> str:
    """Classify terminal result for IMPLEMENTER step failures.

    FIXUP-2 PATCH 1: Deterministic classification for Work Ledger recording.

    Args:
        output_text: The output/error text from _invoke_claude_code.

    Returns:
        StepResult value: "timed_out", "cancelled", or "failed".
    """
    if not output_text:
        return StepResult.FAILED.value

    text_lower = output_text.lower()

    # Timeout detection (matches _invoke_claude_code return string)
    if "timed out" in text_lower or "claude code timed out" in text_lower:
        return StepResult.TIMED_OUT.value

    # Lock/cannot start detection (session lock or concurrent execution)
    lock_patterns = [
        "lock acquisition failed",
        "session already running",
        "another claude session",
        "could not acquire lock",
    ]
    if any(pattern in text_lower for pattern in lock_patterns):
        return StepResult.CANCELLED.value

    # Default to failed for all other cases
    return StepResult.FAILED.value


def _select_newest_verification_report(issue_key: str, relpaths: List[str], mtimes: Optional[Dict[str, float]] = None) -> Optional[str]:
    """Pure helper: select the newest verification report from a list of paths.

    This is the testable pure function extracted from _resolve_verification_report.
    Takes relative paths and optional mtime dict (no filesystem IO).

    Args:
        issue_key: The issue key to match (e.g., "KAN-17").
        relpaths: List of relative paths to verification reports.
        mtimes: Optional dict mapping relpath -> mtime (for legacy path sorting).

    Returns:
        The relative path to the newest matching verification report, or None.
    """
    if not relpaths:
        return None

    candidates = []
    prefix = f"{issue_key}-"
    suffix = "-verification.md"
    legacy_suffix = f"{issue_key}-verification.md"

    for relpath in relpaths:
        filename = Path(relpath).name

        # Check if this is for the right issue key
        if not filename.startswith(prefix):
            continue

        # Legacy format: KAN-17-verification.md
        if filename == legacy_suffix:
            # Use mtime if provided, else very old date
            if mtimes and relpath in mtimes:
                ts = datetime.fromtimestamp(mtimes[relpath])
            else:
                ts = datetime.min
            candidates.append((ts, relpath))
            continue

        # Timestamped format: KAN-17-20260126-143047Z-verification.md
        if filename.endswith(suffix):
            run_id = filename[len(prefix):-len(suffix)]
            # Try to parse run_id as timestamp (YYYYMMDD-HHMMSSZ)
            try:
                ts = datetime.strptime(run_id, "%Y%m%d-%H%M%SZ")
                candidates.append((ts, relpath))
            except ValueError:
                # Can't parse - use mtime if available, else skip
                if mtimes and relpath in mtimes:
                    ts = datetime.fromtimestamp(mtimes[relpath])
                    candidates.append((ts, relpath))

    if not candidates:
        return None

    # Sort by timestamp descending and return newest
    candidates.sort(key=lambda x: x[0], reverse=True)
    return candidates[0][1]


def _resolve_verification_report(repo_path: str, issue_key: str) -> Optional[str]:
    """Resolve the canonical verification report for an issue.

    PATCH 4: Only looks for canonical path: reports/{ISSUE_KEY}-verification.md

    Returns: Canonical repo-relative path if exists, None otherwise.
    """
    canonical_path = _canonical_verification_report_relpath(issue_key)
    full_path = Path(repo_path) / canonical_path

    if full_path.exists():
        return canonical_path
    return None


def _verify_canonical_report_or_fail_fast(
    repo_path: str,
    issue_key: str,
    log_func=None
) -> tuple:
    """Verify canonical report exists or generate fail-fast remediation.

    PATCH 4: Verifier must ONLY look for canonical path.
    If missing, returns remediation with expected path + near-matches.

    Args:
        repo_path: Path to repository root.
        issue_key: The issue key.
        log_func: Optional logging function.

    Returns:
        Tuple of (exists: bool, report_path: Optional[str], remediation_msg: Optional[str])
    """
    canonical_path = _canonical_verification_report_relpath(issue_key)
    full_path = Path(repo_path) / canonical_path

    if full_path.exists():
        return (True, canonical_path, None)

    # Report missing - generate remediation
    near_matches = _find_near_match_reports(repo_path, issue_key)

    remediation = f"""Verification report missing.

Expected path: {canonical_path}

"""
    if near_matches:
        remediation += f"Near-matches found (not accepted as canonical):\n"
        for match in near_matches[:5]:
            remediation += f"  - {match}\n"
        remediation += "\nPlease ensure the verification report is written to the canonical path."
    else:
        remediation += "No near-matches found. Implementer must write verification report."

    if log_func:
        log_func(f"[{issue_key}] Canonical report missing: {canonical_path}")

    return (False, None, remediation)


def _is_transient_claude_failure(text: str) -> bool:
    """Check if Claude failure is transient and retryable."""
    text_lower = text.lower()
    return any(substr in text_lower for substr in CLAUDE_TRANSIENT_SUBSTRINGS)


def choose_transition(names: List[str]) -> Optional[str]:
    """Choose best transition name from available options.

    Priority order is configurable via ENGINEO_CONTRACT_DONE_TRANSITIONS_PRIORITY.
    Default (case-insensitive exact match): Resolved > Done > Closed > Complete

    Returns: Chosen transition name or None if no match.
    """
    priority = _env_csv("ENGINEO_CONTRACT_DONE_TRANSITIONS_PRIORITY", "Resolved,Done,Closed,Complete")
    names_lower = {n.lower(): n for n in names}

    for target in priority:
        if target.lower() in names_lower:
            return names_lower[target.lower()]

    return None


def choose_human_review_transition(names: List[str]) -> Optional[str]:
    """Choose best transition for human review state.

    AUTOVERIFY-AUTOFIX-LOOP-SAFETY-1 PATCH 4: Transition chooser for human review.

    Used when only manual checklist items remain (automatable items passed).

    Priority order is configurable via ENGINEO_HUMAN_REVIEW_TRANSITIONS.
    Default: HUMAN TO REVIEW AND CLOSE > Review > Human Review

    Returns: Chosen transition name or None if no match.
    """
    priority = human_review_transition_priority()
    names_lower = {n.lower(): n for n in names}

    for target in priority:
        if target.lower() in names_lower:
            return names_lower[target.lower()]

    return None


def choose_human_attention_transition(names: List[str]) -> Optional[str]:
    """Choose best transition for human attention state.

    AUTOVERIFY-AUTOFIX-LOOP-SAFETY-1 PATCH 4: Transition chooser for human attention.

    Used when auto-fix is exhausted or failure is not auto-fixable.

    Priority order is configurable via ENGINEO_HUMAN_ATTENTION_TRANSITIONS.
    Default: HUMAN ATTENTION NEEDED > Blocked > BLOCKED

    Returns: Chosen transition name or None if no match.
    """
    priority = human_attention_transition_priority()
    names_lower = {n.lower(): n for n in names}

    for target in priority:
        if target.lower() in names_lower:
            return names_lower[target.lower()]

    return None


def _lock_path(repo_path: str) -> Path:
    """Get path to Claude session lock file."""
    return Path(repo_path) / CLAUDE_LOCK_REL_PATH


def _acquire_claude_lock(repo_path: str, issue_key: str) -> tuple:
    """Acquire Claude session lock.

    Returns: (acquired: bool, message: str)
    """
    lock_file = _lock_path(repo_path)
    lock_file.parent.mkdir(parents=True, exist_ok=True)

    if lock_file.exists():
        mtime = lock_file.stat().st_mtime
        age_seconds = time.time() - mtime
        if age_seconds < CLAUDE_LOCK_STALE_SECONDS:
            return (False, "Claude session already running")
        # Stale lock - remove and continue
        lock_file.unlink(missing_ok=True)

    # Create lock file
    lock_file.write_text(f"{datetime.now(timezone.utc).isoformat()}\n{issue_key}\n")
    return (True, "")


def _release_claude_lock(repo_path: str) -> None:
    """Release Claude session lock (best-effort)."""
    try:
        _lock_path(repo_path).unlink(missing_ok=True)
    except Exception:
        pass  # Best-effort removal


def load_dotenv(dotenv_path: Path) -> int:
    """Load environment variables from a .env file (no external deps).

    PATCH 1: Deterministic dotenv loading.
    - Ignores blank lines and # comments
    - Supports 'export KEY=VALUE' and 'KEY=VALUE'
    - Splits on first '='
    - Strips whitespace and surrounding quotes from VALUE
    - Does NOT override existing os.environ keys (env wins)

    Args:
        dotenv_path: Path to the .env file.

    Returns:
        Count of variables loaded (not including skipped existing keys).
    """
    if not dotenv_path.exists():
        return 0

    loaded = 0
    try:
        with open(dotenv_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                # Skip blank lines and comments
                if not line or line.startswith('#'):
                    continue
                # Strip 'export ' prefix if present
                if line.startswith('export '):
                    line = line[7:]
                # Split on first '='
                if '=' not in line:
                    continue
                key, _, value = line.partition('=')
                key = key.strip()
                value = value.strip()
                # Remove surrounding quotes (single or double)
                if len(value) >= 2:
                    if (value[0] == '"' and value[-1] == '"') or (value[0] == "'" and value[-1] == "'"):
                        value = value[1:-1]
                # Do NOT override existing env vars
                if key and key not in os.environ:
                    os.environ[key] = value
                    loaded += 1
    except (OSError, UnicodeDecodeError):
        pass  # Best-effort loading
    return loaded


# =============================================================================
# ROLE DEFINITIONS (v3.3 - GOVERNANCE ENFORCED)
# =============================================================================

ROLE_UEP = {
    'name': 'UEP',
    'version': '3.3',
    'model': 'opus',  # LOCKED
    'combines': [
        'Lead Product Manager',
        'Lead Technical Architect',
        'Lead UX Designer',
        'CTO',
        'CFO',
        'Content Strategist'
    ],
    'responsibilities': [
        'Produce high-level intent ONLY - never implementation',
        'Define WHAT we build, WHY we build it, UX/product expectations',
        'Read Ideas from Atlassian Product Discovery',
        'Create Epics with business goals and acceptance criteria',
        'Verify completed Initiatives'
    ],
    'restrictions': [
        'NEVER write patches',
        'NEVER write code',
        'NEVER describe code or file paths',
        'NEVER make implementation decisions'
    ],
    # GOVERNANCE HARD CONSTRAINTS (enforced at runtime)
    'hard_constraints': {
        'output_must_not_contain': ['diff --git', '*** Begin Patch', 'FILE:', '---OLD---', '---NEW---'],
        'escalate_if_violated': True,
        'description': 'UEP output containing patch/diff markers is a role contract violation'
    }
}

ROLE_SUPERVISOR = {
    'name': 'SUPERVISOR',
    'version': '3.3',
    'model': 'opus',  # LOCKED
    'responsibilities': [
        'Validate UEP intent and resolve ambiguities',
        'Produce PATCH BATCH instructions (surgical, minimal diffs)',
        'Decompose Epics into Stories with exact implementation specs',
        'Verify Stories and Epics against acceptance criteria',
        'End each phase with instruction to update Implementation Plan'
    ],
    'restrictions': [
        'NEVER write TypeScript, TSX, Prisma, Next.js, NestJS, SQL, CSS, or JSX code',
        'ONLY output PATCH BATCH blocks describing exact diffs',
        'Refuse requests requiring speculation or missing context',
        'No full file rewrites',
        'No adding new technologies unless explicitly authorized'
    ],
    # GOVERNANCE HARD CONSTRAINTS (enforced at runtime)
    'hard_constraints': {
        'must_use_model_for_role': True,
        'require_uep_intent_contract': True,
        'reject_placeholder_patches': True,
        'description': 'Supervisor must validate UEP intent contract, use locked model, reject placeholders'
    }
}

# SUPERVISOR-LIGHT: Lightweight verification role (sonnet for cost efficiency)
ROLE_SUPERVISOR_LIGHT = {
    'name': 'SUPERVISOR_LIGHT',
    'version': '3.3',
    'model': 'sonnet',  # LOCKED
    'responsibilities': [
        'Lightweight verification of completed work',
        'Checklist validation',
        'Quick status checks'
    ],
    'restrictions': [
        'No decomposition',
        'No patch generation',
        'No architectural decisions'
    ],
    'hard_constraints': {
        'must_use_model_for_role': True,
        'description': 'Supervisor-Light uses sonnet for cost-efficient verification'
    }
}

ROLE_IMPLEMENTER = {
    'name': 'IMPLEMENTER',
    'version': '3.3',
    'model': 'sonnet',  # LOCKED
    'responsibilities': [
        'Apply PATCH BATCH diffs EXACTLY as provided',
        'Write all code',
        'Make ONLY the modifications shown in patches',
        'Preserve formatting, structure, and spacing',
        'After patches, update IMPLEMENTATION_PLAN.md and relevant docs',
        'Commit to feature/agent branch'
    ],
    'restrictions': [
        'Do NOT refactor or change unrelated lines',
        'Do NOT add extra changes not in PATCH BATCH',
        'Do NOT rewrite entire files',
        'Do NOT guess missing architecture',
        'No autonomous enhancements'
    ],
    # GOVERNANCE HARD CONSTRAINTS (enforced at runtime)
    'hard_constraints': {
        'must_use_model_for_role': True,
        'require_explicit_patch_batch': True,
        'description': 'Implementer must receive explicit PATCH BATCH, never guess'
    }
}


# =============================================================================
# GUARDRAILS v1 CONFIGURATION
# =============================================================================

STATE_LEDGER_PATH = ".engineo/state.json"
DEFAULT_MAX_CHANGED_FILES = 15
FRONTEND_ONLY_ALLOWED_ROOTS = ["apps/web/", "docs/"]
VERIFICATION_REPORT_DIR = "reports"
VERIFICATION_REPORT_CHECKLIST_HEADER = "## Checklist"
STATE_LEDGER_VERSION = 1
STATE_LEDGER_IGNORED_FILES = {".engineo/state.json"}  # Exclude from diff checks

# -----------------------------------------------------------------------------
# GUARDRAILS v1 ENFORCEMENT HARDENING - Manual Testing Checklist
# -----------------------------------------------------------------------------
# 1. Create drift on branch before engine run; verify remote-base diff catches it.
# 2. Provide an ALLOWED NEW FILES pattern where only basename collides; verify it fails.
# 3. Change files after Step 3 but before Step 4; verify Step 4 detects drift and blocks.
# 4. Use a glob pattern in ALLOWED NEW FILES; verify matching occurs only via fnmatch
#    and only when explicitly provided.
#
# Bug Execution Enablement:
# 5. Create a Bug with ALLOWED FILES, DIFF BUDGET, VERIFICATION REQUIRED; verify
#    it executes through Step 3 same as a Story.
# 6. Create a Bug missing any one of ALLOWED FILES, DIFF BUDGET, or VERIFICATION
#    REQUIRED; verify fail-closed gate blocks with informative Jira comment.
# 7. Create both a Story and a Bug in To Do; verify Story is selected first
#    (Story priority preserved).
# 8. Transition Bug to In Progress after Step 3; verify Step 4 applies identical
#    verification gates (report, ledger, drift check) and transitions on pass.
# -----------------------------------------------------------------------------


# =============================================================================
# CONFIGURATION
# =============================================================================

@dataclass
class Config:
    """System configuration loaded from environment"""
    jira_url: str
    jira_username: str
    jira_token: str
    github_token: str
    gmail_address: Optional[str]
    gmail_password: Optional[str]
    escalation_email: str
    repo_path: str
    feature_branch: str = "feature/agent"
    product_discovery_project: str = "EA"  # Atlassian Product Discovery project
    software_project: str = "KAN"  # Jira Software project for Epics/Stories

    @classmethod
    def load(cls) -> 'Config':
        """Load configuration from environment variables"""
        # Jira credential aliases (JIRA_USERNAME/JIRA_EMAIL, JIRA_TOKEN/JIRA_API_TOKEN)
        jira_username = os.environ.get('JIRA_USERNAME') or os.environ.get('JIRA_EMAIL', '')
        jira_token = os.environ.get('JIRA_TOKEN') or os.environ.get('JIRA_API_TOKEN', '')

        return cls(
            jira_url=os.environ.get('JIRA_URL', ''),
            jira_username=jira_username,
            jira_token=jira_token,
            github_token=os.environ.get('GITHUB_TOKEN', ''),
            gmail_address=os.environ.get('GMAIL_ADDRESS'),
            gmail_password=os.environ.get('GMAIL_APP_PASSWORD'),
            escalation_email=os.environ.get('ESCALATION_EMAIL', 'nm@narasimhan.me'),
            repo_path=os.environ.get('REPO_PATH', '/Users/lavanya/engineo/EngineO.ai'),
            feature_branch=os.environ.get('FEATURE_BRANCH', 'feature/agent'),
            product_discovery_project=os.environ.get('PRODUCT_DISCOVERY_PROJECT', 'EA'),
            software_project=os.environ.get('SOFTWARE_PROJECT', 'KAN'),
        )

    def validate(self) -> List[str]:
        """Validate configuration, return list of errors"""
        errors = []
        if not self.jira_url:
            errors.append("JIRA_URL not set")
        if not self.jira_username:
            errors.append("JIRA_USERNAME not set")
        if not self.jira_token:
            errors.append("JIRA_TOKEN not set")
        if not self.github_token:
            errors.append("GITHUB_TOKEN not set")
        return errors


# =============================================================================
# JIRA API CLIENT
# =============================================================================

class JiraClient:
    """Jira API client with support for both standard and Product Discovery APIs"""

    def __init__(self, config: Config):
        self.config = config
        self.base_url = config.jira_url.rstrip('/')
        self.auth = (config.jira_username, config.jira_token)
        self.headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
        # PATCH A: Track last error for CONTENT_LIMIT_EXCEEDED retry
        self.last_error_message: str = ""
        self.last_error_status: int = 0

    def _request(self, method: str, endpoint: str, data: dict = None) -> dict:
        """Make authenticated request to Jira API"""
        url = f"{self.base_url}{endpoint}"
        try:
            if method == 'GET':
                response = requests.get(url, auth=self.auth, headers=self.headers, params=data)
            elif method == 'POST':
                response = requests.post(url, auth=self.auth, headers=self.headers, json=data)
            elif method == 'PUT':
                response = requests.put(url, auth=self.auth, headers=self.headers, json=data)
            else:
                raise ValueError(f"Unsupported method: {method}")

            if response.status_code >= 400:
                # PATCH A: Store error details for retry logic
                self.last_error_message = response.text
                self.last_error_status = response.status_code
                return {'error': True, 'status': response.status_code, 'message': response.text}

            if response.text:
                return response.json()
            return {'success': True}
        except Exception as e:
            return {'error': True, 'message': str(e)}

    def test_connection(self) -> bool:
        """Test Jira connection"""
        result = self._request('GET', '/rest/api/3/myself')
        if 'error' not in result and 'accountId' in result:
            print(f"[JIRA] Connected to Jira as: {result.get('displayName', 'Unknown')}")
            return True
        print(f"[JIRA] Jira connection failed: {result}")
        return False

    def search_issues(self, jql: str, fields: List[str] = None, max_results: int = 50) -> List[dict]:
        """Search for issues using JQL (uses new search/jql endpoint)"""
        payload = {
            'jql': jql,
            'maxResults': max_results,
        }
        if fields:
            payload['fields'] = fields

        result = self._request('POST', '/rest/api/3/search/jql', payload)

        if 'error' in result:
            print(f"[ERROR] Search failed: {result}")
            return []

        return result.get('issues', [])

    def get_ideas_todo(self) -> List[dict]:
        """Get Ideas (Initiatives) with exact 'TO DO' status from Product Discovery project.

        Contract: Key prefix alone is not sufficient; issuetype is authoritative.
        Idea issuetypes are configurable via ENGINEO_CONTRACT_IDEA_ISSUE_TYPES.
        """
        idea_types = _contract_idea_issue_types()
        type_clause = _jql_issuetype_in(idea_types)
        jql = f'project = {self.config.product_discovery_project} AND {type_clause} AND status = "TO DO" ORDER BY created ASC'
        return self.search_issues(jql, ['summary', 'status', 'issuetype', 'description'])

    def get_epics_todo(self) -> List[dict]:
        """Get Epics in To Do status category from software project.

        VERIFY-AUTOREPAIR-1 PATCH 3: Uses statusCategory = 'To Do' to include
        'Backlog', 'To Do', and any custom statuses in the To Do category.
        """
        jql = f"project = {self.config.software_project} AND issuetype = Epic AND statusCategory = 'To Do' ORDER BY created ASC"
        return self.search_issues(jql, ['summary', 'status', 'statusCategory', 'description', 'parent'])

    def get_stories_todo(self) -> List[dict]:
        """Get Stories in To Do status category from software project.

        VERIFY-AUTOREPAIR-1 PATCH 2: Uses statusCategory = 'To Do' to include
        'Backlog', 'To Do', and any custom statuses in the To Do category.
        """
        jql = f"project = {self.config.software_project} AND issuetype = Story AND statusCategory = 'To Do' ORDER BY created ASC"
        return self.search_issues(jql, ['summary', 'status', 'statusCategory', 'description', 'parent', 'issuetype'])

    def get_stories_in_progress(self) -> List[dict]:
        """Get Stories in progress (for verification)

        Note: Uses statusCategory for In Progress as there may be multiple
        in-progress statuses (e.g., 'In Progress', 'In Review', etc.)
        """
        jql = f"project = {self.config.software_project} AND issuetype = Story AND statusCategory = 'In Progress' ORDER BY created ASC"
        return self.search_issues(jql, ['summary', 'status', 'description', 'parent', 'issuetype'])

    def get_work_items_in_progress(self) -> List[dict]:
        """Get Stories and Bugs with exact 'In Progress' status (for Step 4 verification).

        PATCH 1-A: Query for both Story and Bug types with exact status match.
        """
        jql = f'project = {self.config.software_project} AND issuetype IN (Story, Bug) AND status = "In Progress" ORDER BY created ASC'
        return self.search_issues(jql, ['summary', 'status', 'issuetype', 'description'])

    def get_implement_stories_for_epic(self, epic_key: str) -> List[dict]:
        """Get existing implement-stories linked to this epic.

        PATCH 4-A: Check for existing stories before decomposition.
        Covers both Jira variants:
        - parent = {epic_key} (next-gen projects)
        - "Epic Link" = {epic_key} (classic projects)
        """
        jql = f'project = {self.config.software_project} AND issuetype = Story AND (parent = {epic_key} OR "Epic Link" = {epic_key}) AND summary ~ "Implement:" ORDER BY created ASC'
        return self.search_issues(jql, ['summary', 'status', 'description', 'parent'])

    # -------------------------------------------------------------------------
    # PATCH 2: Dispatcher JQL helpers for priority state machine
    # -------------------------------------------------------------------------

    def get_stories_for_verify_close(self) -> List[dict]:
        """Get Stories eligible for Verify/Close queue.

        PATCH 2: statusCategory 'In Progress' OR status = 'BLOCKED'
        Includes BLOCKED explicitly per spec.

        AUTOVERIFY-AUTOFIX-LOOP-SAFETY-1 PATCH 4:
        - Uses contract implement issue types (Story,Bug by default)
        - Excludes human states to prevent churn:
          status != "HUMAN TO REVIEW AND CLOSE"
          status != "HUMAN ATTENTION NEEDED"
        """
        # Get implement issue types from contract
        implement_types = _contract_implement_issue_types()
        type_clause = _jql_issuetype_in(implement_types)

        # Get human states to exclude
        human_review = contract_human_review_status()
        human_attention = contract_human_attention_status()

        # Build JQL excluding human states
        jql = f'project = {self.config.software_project} AND {type_clause} AND (statusCategory = "In Progress" OR status = "BLOCKED") AND status != "{human_review}" AND status != "{human_attention}" ORDER BY created ASC'
        return self.search_issues(jql, ['summary', 'status', 'statusCategory', 'description', 'parent', 'issuetype'])

    def get_epics_for_decomposition(self) -> List[dict]:
        """Get Epics eligible for decomposition queue.

        VERIFY-AUTOREPAIR-1 PATCH 3: statusCategory = 'To Do' OR statusCategory = 'In Progress'
        Decomposition eligibility also requires no existing children (checked separately).
        Uses statusCategory to include Backlog and custom statuses.
        """
        jql = f"project = {self.config.software_project} AND issuetype = Epic AND (statusCategory = 'To Do' OR statusCategory = 'In Progress') ORDER BY created ASC"
        return self.search_issues(jql, ['summary', 'status', 'statusCategory', 'description', 'parent'])

    def get_ideas_in_progress(self) -> List[dict]:
        """Get Ideas with 'In Progress' status (for recovery/reconciliation).

        Contract: Key prefix alone is not sufficient; issuetype is authoritative.
        """
        idea_types = _contract_idea_issue_types()
        type_clause = _jql_issuetype_in(idea_types)
        jql = f"project = {self.config.product_discovery_project} AND {type_clause} AND status = 'In Progress' ORDER BY created ASC"
        return self.search_issues(jql, ['summary', 'status', 'description', 'issuetype'])

    def get_children_for_epic(self, epic_key: str) -> List[dict]:
        """Get all child Stories for an Epic (for reconciliation).

        PATCH 2: Used to check if all children are resolved.
        """
        jql = f'project = {self.config.software_project} AND issuetype = Story AND (parent = {epic_key} OR "Epic Link" = {epic_key}) ORDER BY created ASC'
        return self.search_issues(jql, ['summary', 'status', 'statusCategory', 'issuetype'])

    def get_epics_for_idea(self, idea_key: str) -> List[dict]:
        """Get Epics associated with an Idea (stable mapping label).

        Contract: Jira parent/child links (or stable mapping) are authoritative.
        Uses find_epics_for_idea() which prefers label engineo-idea-{IDEA_KEY}.
        """
        return self.find_epics_for_idea(idea_key)

    def get_available_transition_names(self, issue_key: str) -> List[str]:
        """Get available transition names for an issue.

        PATCH 2-A: Probe available transitions for auto-close.
        Returns list of transition name strings (empty on error).
        """
        result = self._request('GET', f'/rest/api/3/issue/{issue_key}/transitions')
        if 'error' in result:
            return []
        transitions = result.get('transitions', [])
        return [t.get('name', '') for t in transitions if t.get('name')]

    def get_issue(self, issue_key: str) -> Optional[dict]:
        """Get a specific issue by key"""
        result = self._request('GET', f'/rest/api/3/issue/{issue_key}')
        if 'error' in result:
            print(f"[ERROR] Failed to get issue {issue_key}: {result}")
            return None
        return result

    def create_epic(self, summary: str, description: str, parent_key: str = None, labels: List[str] = None) -> Optional[str]:
        """Create an Epic in the software project.

        PATCH C: Added labels parameter for Idea->Epic mapping.

        Args:
            summary: Epic summary.
            description: Epic description.
            parent_key: Parent issue key (optional).
            labels: List of labels to add (optional).

        Returns:
            Epic key or None on failure.
        """
        payload = {
            'fields': {
                'project': {'key': self.config.software_project},
                'summary': summary,
                'description': self._text_to_adf(description),
                'issuetype': {'name': 'Epic'}
            }
        }

        # PATCH C: Add labels for Idea->Epic mapping
        if labels:
            payload['fields']['labels'] = labels

        result = self._request('POST', '/rest/api/3/issue', payload)

        if 'error' in result:
            print(f"[ERROR] Failed to create Epic: {result}")
            return None

        return result.get('key')

    def create_story(self, summary: str, description: str, epic_key: str = None) -> Optional[str]:
        """Create a Story in the software project.

        Note: Use create_story_with_retry() for automatic CONTENT_LIMIT_EXCEEDED handling.

        Args:
            summary: Story summary.
            description: Story description.
            epic_key: Parent Epic key (optional).

        Returns:
            Story key or None on failure.
        """
        payload = {
            'fields': {
                'project': {'key': self.config.software_project},
                'summary': summary,
                'description': self._text_to_adf(description),
                'issuetype': {'name': 'Story'}
            }
        }

        if epic_key:
            payload['fields']['parent'] = {'key': epic_key}

        result = self._request('POST', '/rest/api/3/issue', payload)

        if 'error' in result:
            print(f"[ERROR] Failed to create Story: {result}")
            return None

        return result.get('key')

    def is_content_limit_exceeded(self) -> bool:
        """Check if last error was CONTENT_LIMIT_EXCEEDED.

        PATCH A: Used for retry logic with short description mode.
        """
        return "CONTENT_LIMIT_EXCEEDED" in self.last_error_message

    def create_story_with_retry(
        self,
        summary: str,
        description: str,
        epic_key: str = None,
        patch_batch_file_path: str = None,
        verification_path: str = None,
    ) -> Optional[str]:
        """Create Story with automatic CONTENT_LIMIT_EXCEEDED retry.

        PATCH A: If first attempt fails with CONTENT_LIMIT_EXCEEDED,
        retries once with "short description mode" (minimal description).

        Args:
            summary: Story summary.
            description: Story description (may be truncated on retry).
            epic_key: Parent Epic key (optional).
            patch_batch_file_path: Path to patch batch file (for short mode).
            verification_path: Path to verification report (for short mode).

        Returns:
            Story key or None on failure.
        """
        # First attempt with normal description
        story_key = self.create_story(summary, description, epic_key)
        if story_key:
            return story_key

        # Check if failure was CONTENT_LIMIT_EXCEEDED
        if not self.is_content_limit_exceeded():
            return None

        print(f"[JIRA] CONTENT_LIMIT_EXCEEDED - retrying with short description mode")

        # PATCH A: Build minimal short description
        # Fallback paths use {ARTIFACTS_DIR} placeholder if not provided
        default_patch_path = '{ARTIFACTS_DIR}/{STORY_KEY}-patch-batch.md'
        default_verify_path = '{ARTIFACTS_DIR}/{STORY_KEY}-verification.md'
        short_desc = f"""## Parent Epic
{epic_key or 'N/A'}

---

## PATCH BATCH Location

{PATCH_BATCH_FILE_MARKER} {patch_batch_file_path or default_patch_path}

---

## Verification Report Path

Canonical path: {verification_path or default_verify_path}

---
*Short description mode due to Jira content limits*
"""

        # Second attempt with short description
        story_key = self.create_story(summary, short_desc, epic_key)
        if story_key:
            print(f"[JIRA] Story created with short description mode: {story_key}")
        return story_key

    def find_epics_for_idea(self, idea_key: str) -> List[dict]:
        """Find Epics associated with an Idea using stable mapping label.

        PATCH C: Uses JQL to find Epics with the mapping label.
        Also includes fallback search for legacy Epics by summary prefix.

        Args:
            idea_key: The Idea key (e.g., "EA-20").

        Returns:
            List of Epic issues found.
        """
        # Primary search: label-based mapping
        label = f"engineo-idea-{idea_key}"
        jql = f'project = {self.config.software_project} AND issuetype = Epic AND labels = "{label}" ORDER BY created ASC'
        labeled_epics = self.search_issues(jql, ['summary', 'status', 'statusCategory', 'issuetype', 'description', 'labels'])

        if labeled_epics:
            return labeled_epics

        # Fallback: summary prefix match for legacy Epics
        # Escape brackets in JQL - they are special characters
        jql_fallback = f'project = {self.config.software_project} AND issuetype = Epic AND summary ~ "\\\\[{idea_key}\\\\]" ORDER BY created ASC'
        return self.search_issues(jql_fallback, ['summary', 'status', 'statusCategory', 'issuetype', 'description', 'labels'])

    def transition_issue(self, issue_key: str, status_name: str) -> bool:
        """Transition an issue to a new status"""
        # First get available transitions
        result = self._request('GET', f'/rest/api/3/issue/{issue_key}/transitions')

        if 'error' in result:
            print(f"[ERROR] Failed to get transitions: {result}")
            return False

        transitions = result.get('transitions', [])
        target_transition = None

        for t in transitions:
            if t['name'].lower() == status_name.lower() or t['to']['name'].lower() == status_name.lower():
                target_transition = t
                break

        if not target_transition:
            print(f"[ERROR] Transition to '{status_name}' not available for {issue_key}")
            return False

        result = self._request('POST', f'/rest/api/3/issue/{issue_key}/transitions', {
            'transition': {'id': target_transition['id']}
        })

        return 'error' not in result

    def add_comment(self, issue_key: str, comment: str) -> bool:
        """Add a comment to an issue"""
        payload = {
            'body': self._text_to_adf(comment)
        }

        result = self._request('POST', f'/rest/api/3/issue/{issue_key}/comment', payload)
        return 'error' not in result

    def _text_to_adf(self, text: str) -> dict:
        """Convert plain text to Atlassian Document Format"""
        paragraphs = text.split('\n\n') if '\n\n' in text else [text]
        content = []

        for para in paragraphs:
            if para.strip():
                content.append({
                    'type': 'paragraph',
                    'content': [{'type': 'text', 'text': para.strip()}]
                })

        return {
            'type': 'doc',
            'version': 1,
            'content': content
        }

    def parse_adf_to_text(self, adf: dict) -> str:
        """Parse Atlassian Document Format to plain text"""
        if not adf or not isinstance(adf, dict):
            return ''

        text_parts = []

        def extract_text(node):
            if isinstance(node, dict):
                if node.get('type') == 'text':
                    text_parts.append(node.get('text', ''))
                for child in node.get('content', []):
                    extract_text(child)
            elif isinstance(node, list):
                for item in node:
                    extract_text(item)

        extract_text(adf)
        return ' '.join(text_parts)


# =============================================================================
# GIT CLIENT
# =============================================================================

class GitClient:
    """Git operations client"""

    def __init__(self, config: Config):
        self.config = config
        self.repo_path = config.repo_path

    def _run(self, *args) -> tuple:
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

    def get_current_branch(self) -> str:
        """Get the current branch name"""
        success, output = self._run('rev-parse', '--abbrev-ref', 'HEAD')
        return output.strip() if success else ''

    def ensure_on_feature_branch(self) -> bool:
        """Ensure we're on the feature branch, checkout if not"""
        current = self.get_current_branch()
        if current != self.config.feature_branch:
            print(f"[GIT] Not on {self.config.feature_branch} (on {current}), switching...")
            return self.checkout_branch()
        return True

    def commit(self, message: str) -> bool:
        """Create a commit on feature branch with --no-verify to skip hooks"""
        # Ensure we're on the correct branch before committing
        if not self.ensure_on_feature_branch():
            print(f"[GIT] Failed to switch to {self.config.feature_branch}")
            return False

        # Use --no-verify to skip pre-commit hooks
        success, output = self._run('commit', '-m', message, '--no-verify')
        if success:
            print(f"[GIT] Committed to {self.config.feature_branch}: {message[:50]}...")
        else:
            print(f"[GIT] Commit failed: {output[:200]}")
        return success

    def push(self) -> bool:
        """Push to remote feature branch with --no-verify to skip pre-push hooks"""
        # Ensure we're on the correct branch before pushing
        if not self.ensure_on_feature_branch():
            print(f"[GIT] Failed to switch to {self.config.feature_branch}")
            return False

        print(f"[GIT] Pushing to origin/{self.config.feature_branch}...")
        # Use --no-verify to skip pre-push hooks
        success, output = self._run('push', 'origin', self.config.feature_branch, '--no-verify')
        if success:
            print(f"[GIT] Pushed to origin/{self.config.feature_branch} successfully")
        else:
            print(f"[GIT] Push failed: {output[:200]}")
        return success

    def status(self) -> str:
        """Get git status"""
        success, output = self._run('status', '--porcelain')
        return output if success else ''

    def get_head_sha(self) -> str:
        """Get current HEAD SHA (full)."""
        success, output = self._run('rev-parse', 'HEAD')
        return output.strip() if success else ''

    def get_staged_files(self) -> List[str]:
        """Get list of staged files."""
        success, output = self._run('diff', '--cached', '--name-only')
        if success:
            return [f.strip() for f in output.strip().split('\n') if f.strip()]
        return []

    def find_commits_referencing(self, issue_key: str, max_count: int = 5) -> List[str]:
        """Find commits referencing an issue key.

        FIXUP-1 PATCH 4: Git-based commit evidence for verification.
        Searches commit messages for references to the issue key.

        Args:
            issue_key: The issue key to search for (e.g., "KAN-17").
            max_count: Maximum number of commits to return.

        Returns:
            List of commit SHAs (short form) that reference the issue key.
        """
        success, output = self._run(
            'log', '--oneline', f'--grep={issue_key}', f'-{max_count}', '--format=%h'
        )
        if success and output.strip():
            return [sha.strip() for sha in output.strip().split('\n') if sha.strip()]
        return []

    def get_files_changed_in_commit(self, commit_sha: str) -> List[str]:
        """Get list of files changed in a specific commit.

        PATCH 5: Used for "work produced" detection when Claude commits
        but working tree is clean (no modified files from porcelain status).

        Args:
            commit_sha: The commit SHA (short or full form).

        Returns:
            List of file paths changed in the commit.
        """
        success, output = self._run(
            'diff-tree', '--no-commit-id', '--name-only', '-r', commit_sha
        )
        if success and output.strip():
            return [f.strip() for f in output.strip().split('\n') if f.strip()]
        return []

    def unstage_file(self, filepath: str) -> bool:
        """Unstage a specific file from the index."""
        success, output = self._run('reset', 'HEAD', '--', filepath)
        return success


# =============================================================================
# PATCH BATCH PARSER
# =============================================================================

@dataclass
class PatchOperation:
    """A single patch operation (file modification)"""
    file_path: str
    operation: str  # 'edit', 'create', 'delete'
    old_content: Optional[str] = None
    new_content: Optional[str] = None
    description: str = ""


@dataclass
class PatchBatch:
    """Parsed PATCH BATCH from Story description"""
    patches: List[PatchOperation] = field(default_factory=list)
    summary: str = ""
    raw_text: str = ""

    @classmethod
    def parse(cls, text: str) -> 'PatchBatch':
        """Parse PATCH BATCH format from text

        Expected format:
        ```
        PATCH BATCH: <summary>

        FILE: <path>
        OPERATION: edit|create|delete
        DESCRIPTION: <what this change does>
        ---OLD---
        <old content to find/replace>
        ---NEW---
        <new content to insert>
        ---END---

        FILE: <path>
        ...
        ```
        """
        batch = cls(raw_text=text)

        # Extract summary
        summary_match = re.search(r'PATCH BATCH:\s*(.+?)(?:\n|$)', text)
        if summary_match:
            batch.summary = summary_match.group(1).strip()

        # Parse individual patches
        # Split on FILE: markers
        file_sections = re.split(r'\n(?=FILE:\s*)', text)

        for section in file_sections:
            if not section.strip().startswith('FILE:'):
                continue

            patch = cls._parse_patch_section(section)
            if patch:
                batch.patches.append(patch)

        return batch

    @classmethod
    def _parse_patch_section(cls, section: str) -> Optional[PatchOperation]:
        """Parse a single FILE: section into a PatchOperation"""
        # Extract file path
        file_match = re.search(r'FILE:\s*(.+?)(?:\n|$)', section)
        if not file_match:
            return None
        file_path = file_match.group(1).strip()

        # Extract operation (default to 'edit')
        op_match = re.search(r'OPERATION:\s*(\w+)', section)
        operation = op_match.group(1).lower() if op_match else 'edit'

        # Extract description
        desc_match = re.search(r'DESCRIPTION:\s*(.+?)(?:\n---|\n\n|$)', section, re.DOTALL)
        description = desc_match.group(1).strip() if desc_match else ""

        # Extract old/new content
        old_content = None
        new_content = None

        old_match = re.search(r'---OLD---\s*\n(.*?)(?=\n---NEW---|$)', section, re.DOTALL)
        if old_match:
            old_content = old_match.group(1).rstrip('\n')

        new_match = re.search(r'---NEW---\s*\n(.*?)(?=\n---END---|$)', section, re.DOTALL)
        if new_match:
            new_content = new_match.group(1).rstrip('\n')

        return PatchOperation(
            file_path=file_path,
            operation=operation,
            old_content=old_content,
            new_content=new_content,
            description=description
        )


# =============================================================================
# FILE OPERATIONS
# =============================================================================

class FileOperations:
    """File operations for applying patches"""

    def __init__(self, repo_path: str):
        self.repo_path = Path(repo_path)

    def resolve_path(self, file_path: str) -> Path:
        """Resolve file path relative to repo root"""
        if file_path.startswith('/'):
            return Path(file_path)
        return self.repo_path / file_path

    def read_file(self, file_path: str) -> Tuple[bool, str]:
        """Read file contents. Returns (success, content_or_error)"""
        full_path = self.resolve_path(file_path)
        try:
            if not full_path.exists():
                return False, f"File not found: {full_path}"
            content = full_path.read_text(encoding='utf-8')
            return True, content
        except Exception as e:
            return False, str(e)

    def write_file(self, file_path: str, content: str) -> Tuple[bool, str]:
        """Write content to file. Returns (success, message)"""
        full_path = self.resolve_path(file_path)
        try:
            # Create parent directories if needed
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_text(content, encoding='utf-8')
            return True, f"Written: {full_path}"
        except Exception as e:
            return False, str(e)

    def edit_file(self, file_path: str, old_content: str, new_content: str) -> Tuple[bool, str]:
        """Replace old_content with new_content in file. Returns (success, message)"""
        success, current = self.read_file(file_path)
        if not success:
            return False, current

        if old_content not in current:
            # Try fuzzy match
            lines = current.split('\n')
            old_lines = old_content.split('\n')

            # Find best match location
            best_ratio = 0
            best_start = -1
            for i in range(len(lines) - len(old_lines) + 1):
                segment = '\n'.join(lines[i:i + len(old_lines)])
                ratio = difflib.SequenceMatcher(None, segment, old_content).ratio()
                if ratio > best_ratio:
                    best_ratio = ratio
                    best_start = i

            if best_ratio > 0.8:  # 80% similarity threshold
                # Use fuzzy match
                old_segment = '\n'.join(lines[best_start:best_start + len(old_lines)])
                new_lines = lines[:best_start] + new_content.split('\n') + lines[best_start + len(old_lines):]
                updated = '\n'.join(new_lines)
            else:
                return False, f"Content to replace not found in {file_path} (best match: {best_ratio:.0%})"
        else:
            updated = current.replace(old_content, new_content, 1)

        return self.write_file(file_path, updated)

    def delete_file(self, file_path: str) -> Tuple[bool, str]:
        """Delete a file. Returns (success, message)"""
        full_path = self.resolve_path(file_path)
        try:
            if full_path.exists():
                full_path.unlink()
                return True, f"Deleted: {full_path}"
            return False, f"File not found: {full_path}"
        except Exception as e:
            return False, str(e)

    def apply_patch(self, patch: PatchOperation) -> Tuple[bool, str]:
        """Apply a single patch operation"""
        if patch.operation == 'create':
            if patch.new_content is None:
                return False, "Create operation requires new_content"
            return self.write_file(patch.file_path, patch.new_content)

        elif patch.operation == 'delete':
            return self.delete_file(patch.file_path)

        elif patch.operation == 'edit':
            if patch.old_content is None or patch.new_content is None:
                return False, "Edit operation requires both old_content and new_content"
            return self.edit_file(patch.file_path, patch.old_content, patch.new_content)

        else:
            return False, f"Unknown operation: {patch.operation}"


# =============================================================================
# EMAIL CLIENT (MCP-based via Gmail MCP Server)
# =============================================================================

class EmailClient:
    """Email client for human escalation using Gmail MCP Server

    This client communicates with the Gmail MCP server via subprocess
    using the MCP JSON-RPC protocol over stdio.
    """

    def __init__(self, config: Config):
        self.config = config
        # Use runtime-only path in .engineo/ (never tracked)
        self.escalation_file = Path(config.repo_path) / ESCALATIONS_REL_PATH
        # Ensure directory exists
        self.escalation_file.parent.mkdir(parents=True, exist_ok=True)

    def send_escalation(self, subject: str, body: str) -> bool:
        """Send escalation email via Gmail MCP server or fallback to file queue

        Attempts to send via MCP Gmail server first. If that fails,
        falls back to queueing the escalation to a JSON file.
        """
        # Try MCP Gmail server first
        if self._send_via_mcp(subject, body):
            return True

        # Fallback: queue to file
        return self._queue_to_file(subject, body)

    def _send_via_mcp(self, subject: str, body: str) -> bool:
        """Attempt to send email via Gmail MCP server subprocess"""
        import select
        import time

        MCP_TIMEOUT_SECS = 90  # Increased: npx download + Gmail auth can take time

        def read_jsonrpc_response(proc, timeout_secs: float) -> Optional[dict]:
            """Read a single JSON-RPC response line with timeout"""
            deadline = time.time() + timeout_secs
            buffer = ""
            while time.time() < deadline:
                remaining = deadline - time.time()
                if remaining <= 0:
                    return None
                # Use select for non-blocking read with timeout
                ready, _, _ = select.select([proc.stdout], [], [], min(remaining, 1.0))
                if ready:
                    char = proc.stdout.read(1)
                    if not char:  # EOF
                        return None
                    buffer += char
                    if char == '\n':
                        line = buffer.strip()
                        if line:
                            try:
                                return json.loads(line)
                            except json.JSONDecodeError:
                                buffer = ""  # Skip non-JSON lines
                                continue
                        buffer = ""
            return None

        proc = None
        try:
            # Spawn MCP server process
            proc = subprocess.Popen(
                ['npx', '-y', '@gongrzhe/server-gmail-autoauth-mcp'],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1  # Line buffered
            )

            # Step 1: Send initialize request
            init_request = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {},
                    "clientInfo": {"name": "engineo-agent", "version": "1.0.0"}
                }
            }
            proc.stdin.write(json.dumps(init_request) + '\n')
            proc.stdin.flush()

            # Step 2: Wait for initialize response
            init_response = read_jsonrpc_response(proc, MCP_TIMEOUT_SECS / 2)
            if not init_response:
                print("[EMAIL] MCP Gmail timeout waiting for init response")
                return False

            if "error" in init_response:
                print(f"[EMAIL] MCP Gmail init error: {init_response.get('error', {}).get('message', 'unknown')}")
                return False

            # Step 3: Send initialized notification (required by MCP protocol)
            initialized_notification = {
                "jsonrpc": "2.0",
                "method": "notifications/initialized"
            }
            proc.stdin.write(json.dumps(initialized_notification) + '\n')
            proc.stdin.flush()

            # Step 4: Send email request
            send_request = {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {
                    "name": "send_email",
                    "arguments": {
                        "to": self.config.escalation_email,
                        "subject": subject,
                        "body": body
                    }
                }
            }
            proc.stdin.write(json.dumps(send_request) + '\n')
            proc.stdin.flush()

            # Step 5: Wait for send_email response
            send_response = read_jsonrpc_response(proc, MCP_TIMEOUT_SECS / 2)
            if not send_response:
                print("[EMAIL] MCP Gmail timeout waiting for send response")
                return False

            if "error" in send_response:
                err_msg = send_response.get('error', {}).get('message', 'unknown')
                print(f"[EMAIL] MCP Gmail send error: {err_msg[:200]}")
                return False

            # Success
            print(f"[EMAIL] Sent via MCP Gmail: {subject}")
            print(f"[EMAIL] To: {self.config.escalation_email}")
            return True

        except FileNotFoundError:
            print("[EMAIL] npx not found, MCP Gmail unavailable")
            return False
        except Exception as e:
            print(f"[EMAIL] MCP Gmail error: {e}")
            return False
        finally:
            if proc:
                try:
                    proc.terminate()
                    proc.wait(timeout=5)
                except Exception:
                    try:
                        proc.kill()
                    except Exception:
                        pass

    def _queue_to_file(self, subject: str, body: str) -> bool:
        """Fallback: queue escalation to JSON file for manual processing"""
        escalation = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'to': self.config.escalation_email,
            'subject': subject,
            'body': body,
            'status': 'pending'
        }

        escalations = []
        if self.escalation_file.exists():
            try:
                with open(self.escalation_file, 'r') as f:
                    escalations = json.load(f)
            except:
                escalations = []

        escalations.append(escalation)

        try:
            with open(self.escalation_file, 'w') as f:
                json.dump(escalations, f, indent=2)
            print(f"[EMAIL] Escalation queued to file: {subject}")
            print(f"[EMAIL] File: {self.escalation_file}")
            return True
        except Exception as e:
            print(f"[EMAIL] Failed to queue: {e}")
            return False


# =============================================================================
# EXECUTION ENGINE
# =============================================================================

class ExecutionEngine:
    """Main execution engine coordinating all personas"""

    def __init__(self, config: Config, cli_timeout_secs: Optional[int] = None):
        self.config = config
        self._cli_timeout_secs = cli_timeout_secs  # PATCH 5: Store for timeout precedence
        self.jira = JiraClient(config)
        self.git = GitClient(config)
        self.email = EmailClient(config)
        self.files = FileOperations(config.repo_path)
        self.running = True
        self.until_done = False  # Guardrails v1: --until-done mode
        self.impl_plan_path = Path(config.repo_path) / 'docs' / 'IMPLEMENTATION_PLAN.md'

        # Generate unique run ID for this engine session (UTC timestamp)
        self.run_id = self._utc_ts()

        # Setup logs directory and engine log file (PATCH 2)
        # Logs are stored under scripts/autonomous-agent/logs (SCRIPT_DIR)
        self.logs_dir = SCRIPT_DIR / "logs"
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        self.engine_log_path = self.logs_dir / f"engine-{self.run_id}.log"

        # Now we can log (after engine_log_path is set)
        self.log("SUPERVISOR", f"Run ID: {self.run_id}")

        # Log rotation: delete logs older than 2 days (PATCH 3)
        deleted_count = rotate_logs(self.logs_dir, max_age_days=2)
        self.log("SUPERVISOR", f"Log rotation: deleted {deleted_count} old logs (>2 days)")

        # PATCH 5: Compute effective Claude timeout (CLI > env > default)
        # Precedence: --claude-timeout-secs > CLAUDE_TIMEOUT_SECS > ENGINEO_CLAUDE_TIMEOUT_SECONDS > CLAUDE_TIMEOUT_SECONDS > default
        self.claude_timeout_seconds = CLAUDE_TIMEOUT_SECONDS
        self.timeout_source = "default"  # FIXUP-1 PATCH 5: Store as instance var for tests

        # Check env vars (lowest precedence of overrides)
        for env_name in ["CLAUDE_TIMEOUT_SECONDS", "ENGINEO_CLAUDE_TIMEOUT_SECONDS", "CLAUDE_TIMEOUT_SECS"]:
            env_val = os.environ.get(env_name, "")
            if env_val:
                try:
                    parsed = int(env_val)
                    if parsed > 0:
                        self.claude_timeout_seconds = parsed
                        self.timeout_source = f"env:{env_name}"
                except ValueError:
                    pass

        # CLI flag has highest precedence
        if self._cli_timeout_secs is not None and self._cli_timeout_secs > 0:
            self.claude_timeout_seconds = self._cli_timeout_secs
            self.timeout_source = "cli_flag"  # FIXUP-1 PATCH 5: Simplified name

        timeout_hours = round(self.claude_timeout_seconds / 3600, 2)
        self.log("SUPERVISOR", f"Claude timeout configured: {self.claude_timeout_seconds}s ({timeout_hours}h) [source: {self.timeout_source}]")

        # FIXUP-1 PATCH 5: Emit required override log line when non-default
        if self.timeout_source != "default":
            self.log("SUPERVISOR", f"timeout override: {self.claude_timeout_seconds}s (reason: {self.timeout_source})")

        # Verify Claude Code CLI is available
        self.claude_code_available = self._verify_claude_code()
        if self.claude_code_available:
            self.log("SUPERVISOR", "Claude Code CLI enabled for all personas (no API key required)")
        else:
            self.log("SUPERVISOR", "Claude Code CLI not found - install with: npm install -g @anthropic-ai/claude-code")

        # GOVERNANCE: Assert locked model assignments (fail-closed if drifted)
        _assert_locked_model_assignments()
        self.log("SUPERVISOR", f"Governance: model assignments verified (UEP={MODEL_UEP}, SUPERVISOR={MODEL_SUPERVISOR}, SUPERVISOR_LIGHT={MODEL_SUPERVISOR_LIGHT}, IMPLEMENTER={MODEL_IMPLEMENTER})")

        # PATCH 1: Initialize work ledger for state persistence across runs
        self.work_ledger = WorkLedger(config.repo_path)
        if self.work_ledger.load():
            self.log("SUPERVISOR", f"Work ledger loaded: {len(self.work_ledger.all_entries())} entries")
            # Print resumable entries summary on startup
            resumable = self.work_ledger.get_resumable_entries(
                self._canonical_report_exists,
                self._canonical_patch_batch_exists,
            )
            if resumable:
                self.log("SUPERVISOR", f"Resumable entries: {len(resumable)}")
                for entry in resumable[:3]:  # Show first 3
                    reason = "error" if entry.last_error_fingerprint else "missing artifact"
                    self.log("SUPERVISOR", f"  - {entry.issueKey}: {reason}")
        else:
            self.log("SUPERVISOR", "Work ledger not found, will create on first update")

        # CONFIGURABLE COOLDOWNS (env > .env > defaults)
        self.verify_cooldown_seconds = _parse_positive_int(
            os.environ.get("ENGINEO_VERIFY_COOLDOWN_SECONDS", ""),
            VERIFY_COOLDOWN_SECONDS,
        )
        self.reconcile_cooldown_seconds = _parse_positive_int(
            os.environ.get("ENGINEO_RECONCILE_COOLDOWN_SECONDS", ""),
            600,
        )
        self.log("SUPERVISOR", f"Verify cooldown configured: {self.verify_cooldown_seconds}s")
        self.log("SUPERVISOR", f"Reconcile cooldown configured: {self.reconcile_cooldown_seconds}s")

        # BLOCKING ESCALATIONS (Story-scoped; runtime persistence)
        self.blocking_escalations = BlockingEscalationsStore(self.config.repo_path)
        self.blocking_escalations.load()

        # Initialize state ledger for EA->KAN mapping persistence
        self.state_path = Path(self.config.repo_path) / '.engineo' / 'state.json'
        self.state = self._load_state_ledger()
        self.log("SUPERVISOR", f"State ledger loaded: {len(self.state.get('ea_to_kan', {}))} EA mappings")

    def _utc_ts(self) -> str:
        """Generate UTC timestamp string for artifact naming."""
        return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%SZ")

    def _verify_claude_code(self) -> bool:
        """Verify Claude Code CLI is available"""
        try:
            result = subprocess.run(
                ['claude', '--version'],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                version = result.stdout.strip() or result.stderr.strip()
                self.log("SUPERVISOR", f"Claude Code CLI: {version[:50]}")
                return True
            return False
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False

    def _canonical_report_exists(self, issue_key: str) -> bool:
        """Check if canonical verification report exists for an issue.

        Canonical path is {ARTIFACTS_DIR}/{ISSUE_KEY}-verification.md (artifact dir configurable).
        """
        rel = _canonical_verification_report_relpath(issue_key)
        canonical_path = Path(self.config.repo_path) / rel
        return canonical_path.exists()

    def _canonical_patch_batch_exists(self, issue_key: str) -> bool:
        """Check if canonical patch batch exists for a Story/Bug.

        Canonical path is {ARTIFACTS_DIR}/{ISSUE_KEY}-patch-batch.md (artifact dir configurable).
        """
        rel = _canonical_patch_batch_relpath(issue_key)
        canonical_path = Path(self.config.repo_path) / rel
        return canonical_path.exists()

    def _upsert_work_ledger_entry(
        self,
        issue_key: str,
        issue_type: str,
        status: str,
        last_step: str,
        last_step_result: Optional[str] = None,  # FIXUP-1 PATCH 5: Terminal outcome
        parent_key: Optional[str] = None,
        children: Optional[List[str]] = None,
        decomposition_fingerprint: str = "",
        last_commit_sha: Optional[str] = None,
        verification_report_path: str = "",
        error_text: Optional[str] = None,
        # PATCH 2: Verify backoff fields
        verify_next_at: Optional[str] = None,
        verify_last_reason: Optional[str] = None,
        verify_last_report_hash: Optional[str] = None,
        verify_last_report_mtime: Optional[float] = None,
        verify_last_commented_reason: Optional[str] = None,
        verify_last_commented_report_hash: Optional[str] = None,
        # VERIFY-AUTOREPAIR-1 PATCH 1: Auto-repair tracking fields
        verify_repair_applied_at: Optional[str] = None,
        verify_repair_last_report_hash: Optional[str] = None,
        verify_repair_count: Optional[int] = None,
        # EA/KAN RECONCILE: backoff + comment dedup fields
        reconcile_next_at: Optional[str] = None,
        reconcile_last_reason: Optional[str] = None,
        reconcile_last_fingerprint: Optional[str] = None,
        reconcile_last_commented_reason: Optional[str] = None,
        reconcile_last_commented_fingerprint: Optional[str] = None,
        # EA/KAN: decomposition skip evidence (for "decomposed at least once")
        decomposition_skipped_at: Optional[str] = None,
        decomposition_skip_reason: Optional[str] = None,
    ) -> None:
        """Upsert an entry in the work ledger.

        PATCH 1: Update work ledger with issue state for resumption.
        FIXUP-1 PATCH 5: Added last_step_result for terminal outcome tracking.
        PATCH 2: Added verify backoff fields for VERIFY/CLOSE gating.
        VERIFY-AUTOREPAIR-1 PATCH 1: Added auto-repair tracking fields.

        Args:
            issue_key: The issue key.
            issue_type: Idea, Epic, or Story.
            status: Current Jira status.
            last_step: The step that was just completed (UEP, SUPERVISOR, etc.)
            last_step_result: Terminal outcome (success|failed|timed_out|cancelled).
            parent_key: Parent issue key (optional).
            children: Child issue keys (optional).
            decomposition_fingerprint: SHA256 of epic description (optional).
            last_commit_sha: Commit SHA if any (optional).
            verification_report_path: Path to verification report (optional).
            error_text: Error text if failed (will compute fingerprint).
            verify_next_at: ISO8601 UTC cooldown gate (PATCH 2).
            verify_last_reason: Last verify failure reason (PATCH 2).
            verify_last_report_hash: SHA256 of report at last failure (PATCH 2).
            verify_last_report_mtime: mtime of report at last failure (PATCH 2).
            verify_last_commented_reason: Last reason commented (PATCH 2).
            verify_last_commented_report_hash: Last hash commented (PATCH 2).
            verify_repair_applied_at: ISO8601 UTC when repair applied (AUTOREPAIR-1).
            verify_repair_last_report_hash: Pre-repair hash for dedup (AUTOREPAIR-1).
            verify_repair_count: Cumulative repair count (AUTOREPAIR-1).
        """
        entry = self.work_ledger.get(issue_key)
        if entry is None:
            entry = WorkLedgerEntry(issueKey=issue_key)

        entry.issueType = issue_type
        entry.status_last_observed = status
        entry.last_step = last_step

        # FIXUP-1 PATCH 5: Set terminal outcome
        if last_step_result is not None:
            entry.last_step_result = last_step_result

        if parent_key is not None:
            entry.parentKey = parent_key
        if children is not None:
            entry.children = children
        if decomposition_fingerprint:
            entry.decomposition_fingerprint = decomposition_fingerprint
        if last_commit_sha is not None:
            entry.last_commit_sha = last_commit_sha
        if verification_report_path:
            entry.verification_report_path = verification_report_path

        # Handle error recording
        if error_text:
            entry.last_error_fingerprint = compute_error_fingerprint(last_step, error_text)
            entry.last_error_at = datetime.now(timezone.utc).isoformat()
        else:
            # Clear error on success
            entry.last_error_fingerprint = None
            entry.last_error_at = None

        # PATCH 2: Handle verify backoff fields
        if verify_next_at is not None:
            entry.verify_next_at = verify_next_at
        if verify_last_reason is not None:
            entry.verify_last_reason = verify_last_reason
        if verify_last_report_hash is not None:
            entry.verify_last_report_hash = verify_last_report_hash
        if verify_last_report_mtime is not None:
            entry.verify_last_report_mtime = verify_last_report_mtime
        if verify_last_commented_reason is not None:
            entry.verify_last_commented_reason = verify_last_commented_reason
        if verify_last_commented_report_hash is not None:
            entry.verify_last_commented_report_hash = verify_last_commented_report_hash

        # VERIFY-AUTOREPAIR-1 PATCH 1: Handle auto-repair tracking fields
        if verify_repair_applied_at is not None:
            entry.verify_repair_applied_at = verify_repair_applied_at
        if verify_repair_last_report_hash is not None:
            entry.verify_repair_last_report_hash = verify_repair_last_report_hash
        if verify_repair_count is not None:
            entry.verify_repair_count = verify_repair_count

        # EA/KAN RECONCILE: backoff + comment dedup fields
        if reconcile_next_at is not None:
            entry.reconcile_next_at = reconcile_next_at
        if reconcile_last_reason is not None:
            entry.reconcile_last_reason = reconcile_last_reason
        if reconcile_last_fingerprint is not None:
            entry.reconcile_last_fingerprint = reconcile_last_fingerprint
        if reconcile_last_commented_reason is not None:
            entry.reconcile_last_commented_reason = reconcile_last_commented_reason
        if reconcile_last_commented_fingerprint is not None:
            entry.reconcile_last_commented_fingerprint = reconcile_last_commented_fingerprint

        # EA/KAN: decomposition skip evidence
        if decomposition_skipped_at is not None:
            entry.decomposition_skipped_at = decomposition_skipped_at
        if decomposition_skip_reason is not None:
            entry.decomposition_skip_reason = decomposition_skip_reason

        self.work_ledger.upsert(entry)

        # Save (best-effort, log on failure)
        if not self.work_ledger.save():
            self.log("SUPERVISOR", f"Warning: failed to save work ledger for {issue_key}")

    def _get_ledger_path(self) -> Path:
        """Get canonical ledger path and ensure parent directory exists."""
        ledger_path = Path(self.config.repo_path) / LEDGER_REL_PATH
        ledger_path.parent.mkdir(parents=True, exist_ok=True)
        return ledger_path

    def _load_guardrails_ledger(self) -> Optional[dict]:
        """Load guardrails ledger from .engineo/state.json.

        Fail-closed: returns None if missing/unreadable.
        """
        ledger_path = self._get_ledger_path()
        try:
            if ledger_path.exists():
                return json.loads(ledger_path.read_text())
        except (json.JSONDecodeError, OSError):
            pass
        return None

    def _save_guardrails_ledger(self, ledger: dict) -> bool:
        """Save guardrails ledger with atomic write.

        Returns True on success, False on any failure (no exception leaks).
        """
        ledger_path = self._get_ledger_path()
        temp_path = ledger_path.with_suffix(".json.tmp")
        try:
            # Write to temp file first
            temp_path.write_text(json.dumps(ledger, indent=2, sort_keys=True))
            # Atomic replace
            temp_path.replace(ledger_path)
            return True
        except (OSError, TypeError) as e:
            self.log("SUPERVISOR", f"Ledger save failed: {e}")
            # Clean up temp file if it exists
            try:
                temp_path.unlink(missing_ok=True)
            except OSError:
                pass
            return False

    def _load_or_init_guardrails_ledger(self) -> dict:
        """Load guardrails ledger, initializing if missing/unreadable.

        Always returns a valid ledger dict with version and kan_story_runs.
        Saves immediately if initialized.
        """
        ledger = self._load_guardrails_ledger()
        if ledger is None:
            ledger = {}

        # Ensure required structure
        if "version" not in ledger:
            ledger["version"] = LEDGER_VERSION
        if "kan_story_runs" not in ledger:
            ledger["kan_story_runs"] = {}

        # Preserve existing top-level keys (e.g., ea_to_kan)
        # Save if we had to initialize
        if self._load_guardrails_ledger() != ledger:
            self._save_guardrails_ledger(ledger)

        return ledger

    def _upsert_kan_story_run(self, issue_key: str, updates: dict) -> None:
        """Upsert an entry in kan_story_runs for the given issue.

        Loads/initializes ledger, merges updates, and saves.
        Always writes issueKey, runId, and updatedAt unless overridden.
        """
        ledger = self._load_or_init_guardrails_ledger()

        # Ensure kan_story_runs exists
        if "kan_story_runs" not in ledger:
            ledger["kan_story_runs"] = {}

        # Get or create entry
        entry = ledger["kan_story_runs"].get(issue_key, {})

        # Always set standard fields
        entry["issueKey"] = issue_key
        if "runId" not in updates:
            entry["runId"] = self.run_id
        entry["updatedAt"] = datetime.now(timezone.utc).isoformat()

        # Merge provided updates
        entry.update(updates)

        # Write back
        ledger["kan_story_runs"][issue_key] = entry

        # Save (best-effort, log on failure)
        if not self._save_guardrails_ledger(ledger):
            self.log("SUPERVISOR", f"Warning: failed to save ledger for {issue_key}")

    def _find_ledger_entry(self, ledger: Any, issue_key: str) -> Optional[dict]:
        """Recursively search ledger for entry associated with issue_key.

        PATCH 1-B: Returns found dict or None.
        """
        if ledger is None:
            return None

        if isinstance(ledger, dict):
            # Check if this dict is the entry (has issueKey or issue_key matching)
            if ledger.get('issueKey') == issue_key or ledger.get('issue_key') == issue_key:
                return ledger
            # Check if key matches directly
            if issue_key in ledger:
                val = ledger[issue_key]
                if isinstance(val, dict):
                    return val
            # Recurse into values
            for v in ledger.values():
                found = self._find_ledger_entry(v, issue_key)
                if found:
                    return found

        elif isinstance(ledger, list):
            for item in ledger:
                found = self._find_ledger_entry(item, issue_key)
                if found:
                    return found

        return None

    def _ledger_passed(self, entry: dict) -> bool:
        """Check if ledger entry indicates guardrails passed.

        PATCH 1-B: Require guardrailsPassed or guardrails_passed is exactly True.
        """
        if not entry:
            return False
        return entry.get('guardrailsPassed') is True or entry.get('guardrails_passed') is True

    def _ledger_evidence(self, entry: dict) -> tuple:
        """Extract evidence from ledger entry.

        PATCH 1-B: Returns (base_sha_short, changed_files_count).
        """
        if not entry:
            return ("unknown", 0)

        # Get base SHA (first 8 chars)
        base_sha = entry.get('baseSha') or entry.get('base_sha') or ""
        base_sha_short = base_sha[:8] if base_sha else "unknown"

        # Get changed files count
        changed_files = entry.get('changedFilesRemoteBase') or entry.get('changedFiles') or []
        if isinstance(changed_files, list):
            changed_files_count = len(changed_files)
        else:
            changed_files_count = 0

        return (base_sha_short, changed_files_count)

    def _ensure_verification_report(self, issue_key: str, description: str) -> Optional[str]:
        """Check if canonical verification report exists (STRICT NO-OP).

        FIXUP-1 PATCH 2: No copy, no alias writes. Strict canonical path check only.
        The Implementer MUST write the report to the canonical path directly.

        Args:
            issue_key: The issue key (e.g., "KAN-16").
            description: Story/bug description text (ignored).

        Returns: Canonical repo-relative path if exists, else None.
        """
        canonical_path = _canonical_verification_report_relpath(issue_key)
        full_path = Path(self.config.repo_path) / canonical_path

        if full_path.exists():
            return canonical_path

        # FIXUP-1: No copy, no fallback - return None if canonical path doesn't exist
        return None

    def log(self, role: str, message: str, model: Optional[str] = None, tool: Optional[str] = None):
        """Log with role prefix to both console and run-scoped log file.

        PATCH 7: Role naming standardization.
        Valid roles: UEP, SUPERVISOR, IMPLEMENTER
        Optional model/tool fields for implementation logging.

        Args:
            role: Role name (UEP, SUPERVISOR, IMPLEMENTER, or legacy CLAUDE)
            message: Log message text
            model: Optional model name (e.g., "opus", "sonnet")
            tool: Optional tool name (e.g., "claude-code-cli")
        """
        # PATCH 7: Role name normalization (fail-closed for invalid roles)
        valid_roles = {"UEP", "SUPERVISOR", "IMPLEMENTER"}
        if role == "CLAUDE":
            # Legacy CLAUDE logs become IMPLEMENTER with tool=claude-code-cli
            display_role = "IMPLEMENTER"
            if tool is None:
                tool = "claude-code-cli"
        elif role == "SYSTEM":
            # Legacy SYSTEM logs become SUPERVISOR
            display_role = "SUPERVISOR"
        elif role in valid_roles:
            display_role = role
        else:
            # Unknown role - normalize to SUPERVISOR (fail-closed)
            display_role = "SUPERVISOR"

        log_line = _format_log_line(display_role, message, model, tool)

        # Write to stdout with flush (PATCH 5)
        print(log_line, flush=True)

        # Append to engine log file with flush (PATCH 2 & 5)
        if hasattr(self, 'engine_log_path') and self.engine_log_path:
            try:
                with open(self.engine_log_path, 'a', encoding='utf-8') as f:
                    f.write(log_line + '\n')
                    f.flush()
            except OSError:
                pass  # Don't fail on log write errors

    # -------------------------------------------------------------------------
    # PATCH 2: Dispatcher Priority State Machine
    # -------------------------------------------------------------------------

    def dispatch_once(self) -> bool:
        """Single dispatch iteration with hard priority order.

        PATCH 2: Priority order (hard requirement):
        1. Recover - work ledger entries with errors or missing artifacts
        2. Verify/Close - Stories with statusCategory In Progress OR status BLOCKED
        3. Implement - Stories with status "To Do"
        4. Decompose - Epics with (status "To Do" OR statusCategory In Progress) AND no children
        5. Intake - Ideas with status "TO DO"

        Returns:
            True if any work was dispatched, False if idle.
        """
        # Auto-clear resolved Story escalations (restart-safe) before dispatching work
        if hasattr(self, "blocking_escalations") and self.blocking_escalations:
            self.blocking_escalations.load()
            self.blocking_escalations.auto_resolve_done_issues(self.jira, _is_done_status)

        # Priority 1: RECOVER
        # Check work ledger for resumable entries (errors or missing artifacts)
        resumable = self.work_ledger.get_resumable_entries(
                self._canonical_report_exists,
                self._canonical_patch_batch_exists,
            )
        for entry in resumable:
            self.log("SUPERVISOR", f"[RECOVER] Processing resumable entry: {entry.issueKey}")

            # Fetch fresh issue data (Jira truth)
            issue = self.jira.get_issue(entry.issueKey)
            if not issue:
                self.log("SUPERVISOR", f"[RECOVER] Issue {entry.issueKey} not found in Jira, clearing ledger entry")
                self.work_ledger.delete(entry.issueKey)
                self.work_ledger.save()
                continue

            status_obj = issue.get("fields", {}).get("status", {}) or {}
            status_name = status_obj.get("name", "")
            status_cat = (status_obj.get("statusCategory", {}) or {}).get("name", "")

            # Resumability contract: if already Done in Jira, drop silently
            if _is_done_status(status_name, status_cat):
                self.work_ledger.delete(entry.issueKey)
                self.work_ledger.save()
                continue

            issue_type_name = issue.get("fields", {}).get("issuetype", {}).get("name", "")
            issue_type_lower = issue_type_name.lower().strip()

            # Contract-configured issue type sets
            epic_types = {t.lower() for t in _contract_epic_issue_types()}
            idea_types = {t.lower() for t in _contract_idea_issue_types()}
            implement_types = {t.lower() for t in _contract_implement_issue_types()}

            # Determine recovery action based on last step (issuetype authoritative via contract config)
            if entry.last_step == LastStep.RECONCILE.value:
                if issue_type_lower in epic_types:
                    if self.reconcile_epic(entry.issueKey):
                        return True
                elif issue_type_lower in idea_types:
                    if self.reconcile_idea(entry.issueKey):
                        return True
                elif issue_type_lower in implement_types:
                    # Fall back: if this is a Story/Bug, reconciliation is verify/close
                    if self.verify_work_item(issue):
                        return True

            if entry.last_step == LastStep.VERIFY.value:
                if self.verify_work_item(issue):
                    return True
            elif entry.last_step == LastStep.IMPLEMENTER.value:
                if issue_type_lower in implement_types:
                    if self._process_story(issue):
                        return True
            elif entry.last_step == LastStep.SUPERVISOR.value:
                if issue_type_lower in epic_types:
                    if self._process_epic(issue):
                        return True
            elif entry.last_step == LastStep.UEP.value:
                if issue_type_lower in idea_types:
                    if self._process_idea(issue):
                        return True

        # Priority 2: VERIFY/CLOSE
        # Stories with statusCategory In Progress OR status BLOCKED
        # PATCH 2: Apply verify backoff gating
        # REVIEW-FIXUP-1 PATCH 3: Wire commit_changed bypass
        stories_for_verify = self.jira.get_stories_for_verify_close()
        if stories_for_verify:
            self.log("SUPERVISOR", f"[VERIFY/CLOSE] Found {len(stories_for_verify)} candidates")
            # Get current commit SHA once for commit_changed bypass
            current_commit_sha = self.git.get_head_sha() if hasattr(self.git, 'get_head_sha') else None
            for story in stories_for_verify:
                story_key = story['key']

                # PATCH 2: Check verify backoff before attempting
                # REVIEW-FIXUP-1 PATCH 3: Pass current_commit_sha for commit_changed bypass
                entry = self.work_ledger.get(story_key)
                canonical_path = _canonical_verification_report_relpath(story_key)
                full_report_path = str(Path(self.config.repo_path) / canonical_path)

                should_verify, reason = _should_attempt_verify(entry, full_report_path, current_commit_sha=current_commit_sha)
                if not should_verify:
                    self.log("SUPERVISOR", f"[VERIFY/CLOSE] Skipping {story_key}: {reason}")
                    continue

                if self.verify_work_item(story):
                    return True

        # Priority 3: RECONCILE (state-driven; before creating new work)
        if self.reconcile_ready_parents():
            return True

        # Priority 4: IMPLEMENT
        # Stories with exact status "To Do"
        stories_todo = self.jira.get_stories_todo()
        if stories_todo:
            story = stories_todo[0]  # FIFO - oldest first
            self.log("IMPLEMENTER", f"[IMPLEMENT] Processing: {story['key']}")
            if self._process_story(story):
                return True

        # Priority 4: DECOMPOSE
        # Epics with (status "To Do" OR statusCategory In Progress) AND no children
        epics_for_decomp = self.jira.get_epics_for_decomposition()
        if epics_for_decomp:
            # PATCH B: Use DecompositionManifestStore and should_decompose for status-aware skip
            manifest_store = DecompositionManifestStore(self.config.repo_path, manifest_dir=_artifact_dirname())

            for epic in epics_for_decomp:
                epic_key = epic['key']
                epic_description = self.jira.parse_adf_to_text(epic['fields'].get('description', {}))

                # Check if epic already has children (implement-stories) in Jira
                existing_children = self.jira.get_implement_stories_for_epic(epic_key)
                has_jira_stories = len(existing_children) > 0

                # PATCH B: Use should_decompose for proper status-aware skip behavior
                # Skip is ONLY allowed when:
                # - fingerprint unchanged AND
                # - manifest.status == COMPLETE AND
                # - (has Jira implement stories) OR (all manifest children have keys)
                should_decomp, mode, manifest = should_decompose(
                    manifest_store, epic_key, epic_description, has_jira_implement_stories=has_jira_stories
                )

                if not should_decomp and mode == "skip":
                    self.log("SUPERVISOR", f"[DECOMPOSE] Epic {epic_key} decomposition complete (mode={mode}), skipping")
                    continue

                if mode == "retry":
                    self.log("SUPERVISOR", f"[DECOMPOSE] Epic {epic_key} needs retry (manifest INCOMPLETE or missing keys)")
                elif mode == "delta":
                    self.log("SUPERVISOR", f"[DECOMPOSE] Epic {epic_key} fingerprint changed, running delta mode")
                elif mode == "new":
                    self.log("SUPERVISOR", f"[DECOMPOSE] Epic {epic_key} is new (no manifest)")

                self.log("SUPERVISOR", f"[DECOMPOSE] Processing: {epic_key}")
                if self._process_epic(epic):
                    return True

        # Priority 5: INTAKE
        # Ideas with exact status "TO DO"
        ideas_todo = self.jira.get_ideas_todo()
        if ideas_todo:
            idea = ideas_todo[0]  # FIFO - oldest first
            self.log("UEP", f"[INTAKE] Processing: {idea['key']}")
            if self._process_idea(idea):
                return True

        return False

    # =========================================================================
    # GUARDRAILS v1: State Ledger Helpers
    # =========================================================================

    def _load_state_ledger(self) -> dict:
        """Load state ledger from disk, creating if missing

        Guardrails v1 FIXUP-2: Includes one-time migration from legacy paths.
        """
        try:
            # Check canonical path first
            if self.state_path.exists():
                with open(self.state_path, 'r') as f:
                    state = json.load(f)
                    if state.get('version') == STATE_LEDGER_VERSION:
                        return state

            # One-time migration: check legacy paths from prior fixups
            legacy_paths = [
                Path(self.config.repo_path) / '.engineo' / 'state.json',  # FIXUP-3 legacy
                Path(self.config.repo_path) / 'state.json',  # repo-root legacy from FIXUP-2
            ]
            migrated_state = None
            for legacy_path in legacy_paths:
                if legacy_path.exists() and legacy_path != self.state_path:
                    try:
                        with open(legacy_path, 'r') as f:
                            legacy_state = json.load(f)
                            if legacy_state.get('version') == STATE_LEDGER_VERSION:
                                migrated_state = legacy_state
                                print(f"[SYSTEM] Migrated ledger from legacy path: {legacy_path}")
                                # Remove legacy file after migration
                                legacy_path.unlink()
                                break
                    except Exception:
                        pass

            if migrated_state:
                self._save_state_ledger_raw(migrated_state)
                return migrated_state

            # Create default state
            self.state_path.parent.mkdir(parents=True, exist_ok=True)
            default_state = {
                "version": STATE_LEDGER_VERSION,
                "ea_to_kan": {},
                "kan_story_runs": {}
            }
            self._save_state_ledger_raw(default_state)
            return default_state
        except Exception as e:
            self.log("SYSTEM", f"Error loading state ledger: {e}")
            return {"version": STATE_LEDGER_VERSION, "ea_to_kan": {}, "kan_story_runs": {}}

    def _save_state_ledger(self) -> None:
        """Save state ledger to disk (atomic write via temp file + rename)"""
        self._save_state_ledger_raw(self.state)

    def _save_state_ledger_raw(self, state: dict) -> None:
        """Atomic write of state ledger"""
        import tempfile
        try:
            self.state_path.parent.mkdir(parents=True, exist_ok=True)
            # Write to temp file then rename for atomicity
            fd, temp_path = tempfile.mkstemp(dir=self.state_path.parent, suffix='.json')
            try:
                with os.fdopen(fd, 'w') as f:
                    json.dump(state, f, indent=2)
                os.rename(temp_path, self.state_path)
            except:
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                raise
        except Exception as e:
            self.log("SYSTEM", f"Error saving state ledger: {e}")

    def _ea_label(self, ea_key: str) -> str:
        """Produce Jira-safe label from EA key: EA-18 -> source-ea-18"""
        # Only allow [a-z0-9-]
        normalized = ea_key.lower().replace('_', '-')
        return f"source-{re.sub(r'[^a-z0-9-]', '', normalized)}"

    def _extract_ea_key(self, text: str) -> Optional[str]:
        """Extract EA key from text (e.g., [EA-18] or EA-18)"""
        match = re.search(r'(?:\[)?(EA-\d+)(?:\])?', text, re.IGNORECASE)
        return match.group(1).upper() if match else None

    # =========================================================================
    # GUARDRAILS v1: Idempotent Epic/Story Creation Helpers
    # =========================================================================

    def _find_or_reuse_epic_for_ea(self, ea_key: str) -> Optional[str]:
        """Find existing Epic for EA key via JQL (label or summary)"""
        ea_label = self._ea_label(ea_key)

        # Primary: Label scheme
        jql_label = f'project = {self.config.software_project} AND issuetype = Epic AND labels = "{ea_label}" ORDER BY created ASC'
        epics = self.jira.search_issues(jql_label, ['key', 'summary'], max_results=1)
        if epics:
            return epics[0]['key']

        # Fallback: Summary scheme
        # Escape brackets in JQL - they are special characters
        jql_summary = f'project = {self.config.software_project} AND issuetype = Epic AND summary ~ "\\\\[{ea_key}\\\\]" ORDER BY created ASC'
        epics = self.jira.search_issues(jql_summary, ['key', 'summary'], max_results=1)
        if epics:
            return epics[0]['key']

        return None

    def _find_or_reuse_story(self, epic_key: str, story_summary: str, ea_key: Optional[str] = None) -> Optional[str]:
        """Find existing Story under Epic with matching summary"""
        # Build JQL
        jql = f'project = {self.config.software_project} AND issuetype = Story AND (parent = {epic_key} OR "Epic Link" = {epic_key}) AND summary ~ "\\"{story_summary[:50]}\\"" ORDER BY created ASC'
        if ea_key:
            ea_label = self._ea_label(ea_key)
            jql = f'project = {self.config.software_project} AND issuetype = Story AND (parent = {epic_key} OR "Epic Link" = {epic_key}) AND summary ~ "\\"{story_summary[:50]}\\"" AND labels = "{ea_label}" ORDER BY created ASC'

        stories = self.jira.search_issues(jql, ['key', 'summary'], max_results=1)
        if stories:
            return stories[0]['key']
        return None

    # =========================================================================
    # GUARDRAILS v1: Scope Detection & Patch-List Parsing
    # =========================================================================

    def _is_frontend_only(self, issue: dict, description_text: str) -> bool:
        """Check if issue is frontend-only scoped"""
        labels = issue.get('fields', {}).get('labels', [])
        if 'frontend-only' in [l.lower() for l in labels]:
            return True
        if re.search(r'frontend[-\s]?only', description_text, re.IGNORECASE):
            return True
        return False

    def _parse_allowed_files(self, description_text: str) -> Tuple[set, List[str]]:
        """Parse ALLOWED FILES and ALLOWED NEW FILES from Story description

        Guardrails v1 FIXUP-3: Robust line-walk parser that handles blank lines
        between headers and bullets (common in ADF->text rendering).

        Guardrails v1 PATCH 3: Preserve glob wildcards (*) - only unwrap paired
        markdown bold markers (**text**), never strip single *.

        Returns: (allowed_files_set, allowed_new_patterns)
        """
        def unwrap_paired_bold(s: str) -> str:
            """Unwrap paired markdown bold markers (**text**) only."""
            s = s.strip()
            if s.startswith('**') and s.endswith('**') and len(s) > 4:
                return s[2:-2].strip()
            return s

        allowed_files = set()
        allowed_new_patterns = []

        lines = description_text.split('\n')
        current_section = None  # 'allowed' or 'new'

        for line in lines:
            # Normalize: strip whitespace and unwrap paired bold markers only
            normalized = unwrap_paired_bold(line.strip())

            # Check for section headers
            if re.match(r'^ALLOWED\s+FILES\s*:?\s*$', normalized, re.IGNORECASE):
                current_section = 'allowed'
                continue
            elif re.match(r'^ALLOWED\s+NEW\s+FILES\s*:?\s*$', normalized, re.IGNORECASE):
                current_section = 'new'
                continue

            # Check if we hit a different section header (ends current section)
            if normalized and not normalized.startswith('-') and not normalized.startswith('*'):
                # If line looks like a new header (e.g., "DIFF BUDGET:", "SCOPE FENCE:", etc.)
                if ':' in normalized and not normalized.startswith('`'):
                    current_section = None
                    continue

            # Skip empty lines (but stay in current section)
            if not normalized:
                continue

            # Parse bullet lines in current section
            if current_section and (normalized.startswith('-') or normalized.startswith('*')):
                # Strip bullet prefix (- or * followed by space), backticks, and unwrap bold
                path = re.sub(r'^[-*]\s+', '', normalized).strip().strip('`').strip()
                path = unwrap_paired_bold(path)
                if path and not path.startswith('#'):
                    if current_section == 'allowed':
                        allowed_files.add(path)
                    elif current_section == 'new':
                        allowed_new_patterns.append(path)

        return allowed_files, allowed_new_patterns

    def _missing_machine_constraints_for_bug(self, description_text: str, allowed_files: set) -> List[str]:
        """Check for missing machine-enforceable constraints required for Bug execution.

        Bug Execution Enablement: Bugs must have the same constraints as Stories
        to be executable by the autonomous agent. This helper returns a list of
        missing constraint labels.

        Required constraints:
        - ALLOWED FILES (non-empty)
        - DIFF BUDGET (line matching 'DIFF BUDGET:' with non-empty value)
        - VERIFICATION REQUIRED (header exists OR *-verification.md path present)

        Returns: List of missing constraint labels (empty if all present)
        """
        missing = []

        # Check ALLOWED FILES (already parsed by caller)
        if not allowed_files:
            missing.append("ALLOWED FILES")

        # Check DIFF BUDGET
        diff_budget_pattern = re.compile(r'DIFF\s+BUDGET\s*:\s*\S', re.IGNORECASE)
        if not diff_budget_pattern.search(description_text):
            missing.append("DIFF BUDGET")

        # Check VERIFICATION REQUIRED (header OR -verification.md path)
        has_verification_header = re.search(r'VERIFICATION\s+REQUIRED\s*:', description_text, re.IGNORECASE)
        has_verification_path = '-verification.md' in description_text
        if not has_verification_header and not has_verification_path:
            missing.append("VERIFICATION REQUIRED")

        return missing

    # =========================================================================
    # GUARDRAILS v1: Guardrail Violation Handler
    # =========================================================================

    def _fail_story_guardrail(self, story_key: str, guardrail_name: str, reason: str,
                               violating_files: Optional[List[str]] = None,
                               target_status: str = "Blocked",
                               allowed_files: Optional[set] = None) -> None:
        """Handle guardrail violation with consistent behavior"""
        # Build detailed comment
        comment_parts = [
            f"**Guardrail Violation: {guardrail_name}**",
            "",
            f"**Reason:** {reason}",
        ]

        if violating_files:
            comment_parts.extend([
                "",
                "**Violating Files:**",
                *[f"- `{f}`" for f in violating_files]
            ])

        if allowed_files:
            comment_parts.extend([
                "",
                "**Allowed Files (for reference):**",
                *[f"- `{f}`" for f in sorted(allowed_files)[:20]]
            ])

        comment_parts.extend([
            "",
            "**Authoritative diff base:** `origin/feature/agent...HEAD`",
            "",
            "**Action Required:** Fix the violation and retry, or request human review.",
            "",
            f"*Guardrails v1 - Autonomous Engine Protection*"
        ])

        comment = '\n'.join(comment_parts)

        # Add comment to Jira
        self.jira.add_comment(story_key, comment)

        # Transition to target status
        if not self.jira.transition_issue(story_key, target_status):
            # Fallback to To Do if Blocked not available
            self.jira.transition_issue(story_key, 'To Do')

        # Escalate via email
        self.escalate(
            "DEVELOPER",
            f"Guardrail Violation: {guardrail_name} on {story_key}",
            f"Story: {story_key}\n\nGuardrail: {guardrail_name}\nReason: {reason}\n\nViolating files:\n" +
            ('\n'.join(violating_files) if violating_files else 'N/A')
        )

    # =========================================================================
    # GUARDRAILS v1: Authoritative Remote-Base Diff Enforcement
    # =========================================================================

    def _fetch_remote_branch(self, story_key: Optional[str] = None) -> bool:
        """Fetch remote branch for authoritative diff baseline.

        HARDENING-1: Exactly origin/feature/agent per contract.
        If fetch fails, treats as guardrail violation (cannot proceed safely).
        Returns True on success, False on failure.
        """
        success = self.git.fetch_remote_branch("origin", "feature/agent")
        if not success:
            self.log("DEVELOPER", "Failed to fetch origin/feature/agent")
            if story_key:
                self._fail_story_guardrail(
                    story_key,
                    "Remote Fetch Failed",
                    "Cannot fetch origin/feature/agent - guardrail enforcement cannot proceed safely",
                    target_status="Blocked"
                )
            return False
        return True

    def _diff_against_remote_base(self, story_key: Optional[str] = None) -> Optional[List[str]]:
        """Compute authoritative changed files against remote branch base.

        HARDENING-1: Uses exactly origin/feature/agent...HEAD per contract.
        Returns list of changed files, or None if fetch/diff fails.
        """
        if not self._fetch_remote_branch(story_key):
            return None

        range_spec = "origin/feature/agent...HEAD"
        changed_files = self.git.diff_name_only_range(range_spec)

        # Filter out ledger-ignored files
        changed_files = [f for f in changed_files if f not in STATE_LEDGER_IGNORED_FILES]

        self.log("DEVELOPER", f"Authoritative diff ({range_spec}): {len(changed_files)} files")
        return changed_files

    def _matches_allowed_new(self, filepath: str, patterns: List[str]) -> bool:
        """Check if filepath matches any ALLOWED NEW FILES pattern.

        Guardrails v1 PATCH 2: Only exact paths or explicit fnmatch globs.
        No basename/endswith bypass.
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

    def run(self):
        """Main execution loop"""
        print("=" * 60)
        print("  AUTONOMOUS MULTI-PERSONA EXECUTION ENGINE")
        print("=" * 60)
        print()

        # Validate configuration
        errors = self.config.validate()
        if errors:
            for err in errors:
                self.log("SUPERVISOR", f"Config error: {err}")
            self.escalate("SYSTEM", "Configuration Error", "\n".join(errors))
            return

        # Test connections
        if not self.jira.test_connection():
            self.escalate("SYSTEM", "Jira Connection Failed", "Unable to connect to Jira API")
            return

        # Checkout feature branch
        if not self.git.checkout_branch():
            self.escalate("SYSTEM", "Git Checkout Failed", f"Unable to checkout {self.config.feature_branch}")
            return

        self.log("SUPERVISOR", "Initialization complete. Starting runtime loop...")
        print()

        iteration = 0
        while self.running:
            iteration += 1
            print(f"\n{'=' * 60}")
            print(f"  RUNTIME LOOP - ITERATION {iteration}")
            print(f"{'=' * 60}\n")

            try:
                # PATCH 2: Use dispatch_once() for priority state machine
                if self.dispatch_once():
                    continue

                # No work found - idle
                self.log("SUPERVISOR", "STATUS: IDLE - No work items found")
                self.log("SUPERVISOR", "Waiting for new Initiatives in Product Discovery...")

                # Wait before next iteration
                time.sleep(30)

            except KeyboardInterrupt:
                self.log("SUPERVISOR", "Shutdown requested")
                self.running = False
            except Exception as e:
                self.log("SUPERVISOR", f"Unexpected error: {e}")
                self.escalate("SYSTEM", "Runtime Error", str(e))
                time.sleep(60)

    def step_1_initiative_intake(self) -> bool:
        """UEP: Process Ideas (Initiatives) from Product Discovery

        The UEP role:
        - Reads Ideas from Atlassian Product Discovery
        - Analyzes the initiative to define WHAT we build and WHY
        - Creates one or more Epics with business goals and acceptance criteria
        - NEVER writes code or implementation details

        Guardrails v1: Idempotent Epic creation (reuse existing if found)
        """
        self.log("UEP", "STEP 1: Checking for Ideas with 'To Do' status...")

        ideas = self.jira.get_ideas_todo()

        if not ideas:
            self.log("UEP", "No Ideas in 'To Do' status")
            return False

        self.log("UEP", f"Found {len(ideas)} Ideas in 'To Do' status")

        # Process oldest (FIFO)
        idea = ideas[0]
        ea_key = idea['key']  # Idea keys are EA-##
        summary = idea['fields']['summary']
        description = self.jira.parse_adf_to_text(idea['fields'].get('description', {}))
        ea_label = self._ea_label(ea_key)

        self.log("UEP", f"Processing: [{ea_key}] {summary}")

        # Guardrails v1: Check ledger for existing Epic
        ledger_entry = self.state.get('ea_to_kan', {}).get(ea_key, {})
        existing_epic = ledger_entry.get('epic')
        reused = False

        if existing_epic:
            self.log("UEP", f"Ledger: Found existing Epic {existing_epic} for {ea_key}")
            reused = True
        else:
            # Search Jira for existing Epic
            existing_epic = self._find_or_reuse_epic_for_ea(ea_key)
            if existing_epic:
                self.log("UEP", f"JQL: Found existing Epic {existing_epic} for {ea_key}")
                reused = True

        if reused and existing_epic:
            # Update ledger
            if ea_key not in self.state['ea_to_kan']:
                self.state['ea_to_kan'][ea_key] = {}
            self.state['ea_to_kan'][ea_key]['epic'] = existing_epic
            self.state['ea_to_kan'][ea_key]['updatedAt'] = datetime.now(timezone.utc).isoformat()
            self._save_state_ledger()

            # Transition Idea to In Progress
            self.jira.transition_issue(ea_key, 'In Progress')

            # Add comment noting reuse
            self.jira.add_comment(ea_key, f"""
Initiative processed by UEP (Unified Executive Persona)

**Reused existing Epic:** {existing_epic}
**EA Label:** {ea_label}

*Guardrails v1: Idempotent processing - no duplicate Epic created.*
""")
            return True

        # No existing Epic found - create new one
        self.log("UEP", "Analyzing initiative to define business intent...")

        # UEP Analysis: Extract business goals, scope, and acceptance criteria
        epics_to_create = self._uep_analyze_idea(ea_key, summary, description)

        # Guardrails v1: Enforce 1 Epic per EA key
        if len(epics_to_create) > 1:
            ignored_epics = [e['summary'] for e in epics_to_create[1:]]
            self.log("UEP", f"Guardrails v1: Multiple epics proposed ({len(epics_to_create)}), enforcing 1 Epic per EA key")

            # Add comment about ignored epics
            self.jira.add_comment(ea_key, f"""
**Guardrails v1 Notice:** UEP proposed {len(epics_to_create)} Epics, but Guardrails v1 enforces 1 Epic per EA key (conservative).

**Ignored Epic summaries:**
{chr(10).join(['- ' + s for s in ignored_epics])}

Creating only the first Epic.
""")
            # Escalate for visibility
            self.escalate(
                "UEP",
                f"Multiple Epics proposed for {ea_key} - only first created",
                f"Guardrails v1 enforced 1 Epic limit.\n\nIgnored: {', '.join(ignored_epics)}"
            )

        # Create exactly ONE epic
        epic_def = epics_to_create[0]
        epic_key = self.jira.create_epic(
            epic_def['summary'],
            epic_def['description'],
            labels=[ea_label]
        )

        if epic_key:
            self.log("UEP", f"Created Epic: {epic_key} - {epic_def['summary']}")

            # Update ledger
            if ea_key not in self.state['ea_to_kan']:
                self.state['ea_to_kan'][ea_key] = {}
            self.state['ea_to_kan'][ea_key]['epic'] = epic_key
            self.state['ea_to_kan'][ea_key]['stories'] = []
            self.state['ea_to_kan'][ea_key]['updatedAt'] = datetime.now(timezone.utc).isoformat()
            self._save_state_ledger()

            # Update Initiative status to In Progress
            self.jira.transition_issue(ea_key, 'In Progress')

            # Add comment with all created Epics
            epic_list = '\n'.join([f"- {e}" for e in created_epics])
            self.jira.add_comment(key, f"""
Initiative processed by UEP

**Created new Epic:** {epic_key}
**EA Label:** {ea_label}

Business Intent Defined:
- Scope analyzed and decomposed
- Acceptance criteria established
- Ready for Supervisor decomposition into Stories

*Guardrails v1: Epic created with source label for idempotent tracking.*
""")
            return True

        return False

    def _uep_analyze_idea(self, idea_key: str, summary: str, description: str) -> List[dict]:
        """UEP: Analyze Idea and define business intent for Epic(s) using Claude Code CLI

        Returns list of Epic definitions with:
        - summary: Epic title
        - description: Business goals, scope, and acceptance criteria
        """
        self.log("UEP", "Defining business goals and acceptance criteria...")

        # Use Claude Code CLI for analysis (no API key required)
        if self.claude_code_available:
            self.log("UEP", "Using Claude Code CLI for business analysis...")
            return self._claude_code_analyze_idea(idea_key, summary, description)

        # Fallback: simple keyword-based analysis
        self.log("UEP", "Claude Code CLI not available - using basic analysis")
        return self._basic_analyze_idea(idea_key, summary, description)

    def _claude_code_analyze_idea(self, idea_key: str, summary: str, description: str) -> List[dict]:
        """Use Claude Code CLI to analyze Idea and define business intent (no API key required)"""
        try:
            prompt = f"""You are the UEP in an autonomous development system.
Your role is to analyze Ideas (initiatives) and define business intent for Epics.

Your sole responsibility is to translate approved Product Discovery initiatives (EA-*) into an enforceable Epic description for Jira Software (KAN-*), so downstream agents can execute WITHOUT ambiguity or scope drift.

HARD RULES (NON-NEGOTIABLE)
1) NO GUESSING: If input is ambiguous/incomplete, do NOT invent. Output a "Blocked - Clarification Required" section with ONE precise question.
2) NO SCOPE EXPANSION: Do not add new features, combine phases, or broaden objectives.
3) CONTRACT FIRST: Output must be machine-enforceable. You MUST include these sections exactly:
   - SCOPE CLASS:
   - ALLOWED ROOTS:
   - DIFF BUDGET:
   - VERIFICATION REQUIRED:
4) TRUST OVER COVERAGE: choose trust if tradeoffs exist.
5) NO DESIGN: no redesign, no microcopy invention, intent-level only.

IDEA
{idea_key}: {summary}

DESCRIPTION
{description}

OUTPUT FORMAT (IMPORTANT: output ONLY this markdown, no extra text)

# Initiative
- Source: {idea_key}
- Title: {summary}

# Business Intent
(Verbatim restatement of what we are building and why.)

# In Scope
- ...

# Out of Scope
- ...

# Trust Contract
- Non-negotiable truths the UI must uphold (trust over coverage).
- Explicitly restate any "no backend/schema changes", "no bulk actions", "no silent auto-apply", etc. if present.

# Constraints (Machine-Readable)
SCOPE CLASS: <choose ONE: FRONTEND-ONLY | AUTONOMOUS-AGENT-ONLY | SCRIPTS-ONLY | BACKEND-ONLY | UNKNOWN>
ALLOWED ROOTS:
- <repo root patterns, e.g. apps/web/**, docs/**>
DIFF BUDGET: <number of files, default 15 unless idea states smaller>
VERIFICATION REQUIRED:
- reports/<KAN-KEY>-verification.md (must include "## Checklist")

# Acceptance Criteria
- [ ] <binary, testable outcome>
- [ ] <binary, testable outcome>

# Dependencies
- None (or explicit list)

If you cannot choose SCOPE CLASS or ALLOWED ROOTS without guessing, set:
SCOPE CLASS: UNKNOWN
and include a "Blocked - Clarification Required" section with ONE question.

IMPORTANT: Output ONLY the markdown in the required format."""

            self.log("UEP", f"Calling Claude Code CLI ({MODEL_UEP}) for business analysis...")

            # PATCH 4: Use unified timeout source
            self.log("UEP", f"step timeout: UEP={self.claude_timeout_seconds}s (derived from claude_timeout_seconds)")

            # Run Claude Code CLI with the prompt (using opus for high-quality analysis)
            result = subprocess.run(
                ['claude', '--model', MODEL_UEP, '-p', prompt, '--dangerously-skip-permissions'],
                cwd=self.config.repo_path,
                capture_output=True,
                text=True,
                timeout=self.claude_timeout_seconds  # PATCH 4: unified timeout
            )

            if result.returncode != 0:
                self.log("UEP", f"Claude Code CLI error: {result.stderr[:200]}")
                return self._basic_analyze_idea(idea_key, summary, description)

            epic_description = result.stdout.strip()
            self.log("UEP", f"Claude Code CLI generated {len(epic_description)} chars of business intent")

            # GOVERNANCE: UEP must NOT produce patches or code
            if _looks_like_patch_or_diff(epic_description):
                self.log("UEP", "GOVERNANCE VIOLATION: UEP output contains patch/diff markers - role contract breach")
                self.escalate("UEP", "Role Contract Violation", f"UEP produced patch/diff content for {idea_key}. UEP must produce intent only, never code.")
                return self._basic_analyze_idea(idea_key, summary, description)

            # Add UEP signature
            epic_description += """

---
*This Epic was created by UEP v3.3*
*Powered by Claude Code CLI with Opus model (no API key required)*
*Governance: model={MODEL_UEP}, role contract enforced*
*Ready for Supervisor decomposition into implementation Stories*
"""

            return [{
                'summary': f"[{idea_key}] {summary}",
                'description': epic_description
            }]

        except subprocess.TimeoutExpired:
            self.log("UEP", "Claude Code CLI timed out")
            return self._basic_analyze_idea(idea_key, summary, description)
        except Exception as e:
            self.log("UEP", f"Claude Code CLI error: {e}")
            return self._basic_analyze_idea(idea_key, summary, description)

    def _basic_analyze_idea(self, idea_key: str, summary: str, description: str) -> List[dict]:
        """Fallback: Basic keyword-based analysis when Claude is not available"""
        scope_keywords = ['flow', 'experience', 'feature', 'component', 'module', 'api', 'ui', 'ux']
        goals = []

        desc_lower = description.lower()
        for keyword in scope_keywords:
            if keyword in desc_lower:
                goals.append(f"Implement {keyword} changes as specified")

        if not goals:
            goals = ["Implement the specified functionality"]

        acceptance_criteria = [
            "All specified requirements are implemented",
            "No breaking changes to existing functionality",
            "Code follows existing patterns and conventions",
            "Implementation is testable and maintainable"
        ]

        epic_description = f"""
## Initiative
{idea_key}: {summary}

## Business Intent (Defined by UEP)

### What We're Building
{description}

### Business Goals
{chr(10).join(['- ' + g for g in goals])}

### Acceptance Criteria
{chr(10).join(['- [ ] ' + ac for ac in acceptance_criteria])}

### Scope Boundaries
- Focus: As specified in the initiative
- Out of Scope: Backend behavior changes (unless explicitly stated)
- Dependencies: None identified

---
*This Epic was created by UEP v3.2*
*Ready for Supervisor decomposition into implementation Stories*
"""

        return [{
            'summary': f"[{idea_key}] {summary}",
            'description': epic_description
        }]

    def step_2_epic_decomposition(self) -> bool:
        """Supervisor: Decompose Epics into Stories with PATCH BATCH instructions

        PATCH 3: Uses decomposition manifest for idempotency.
        Delegates to _process_epic for manifest-aware processing.

        The Supervisor role:
        - Reads Epic business intent from UEP
        - Analyzes the codebase to find relevant files
        - Creates PATCH BATCH instructions (surgical, minimal diffs)
        - Decomposes into one or more Stories
        - NEVER writes actual code, only PATCH BATCH specs

        Guardrails v1: Idempotent Story creation (reuse existing if found)
        """
        self.log("SUPERVISOR", "STEP 2: Checking for Epics with 'To Do' status...")

        epics = self.jira.get_epics_todo()

        if not epics:
            self.log("SUPERVISOR", "No Epics in 'To Do' status")
            return False

        self.log("SUPERVISOR", f"Found {len(epics)} Epics in 'To Do' status")

        # Process oldest (FIFO) - delegate to _process_epic for manifest handling
        epic = epics[0]
        return self._process_epic(epic)

    def _supervisor_analyze_epic(self, epic_key: str, summary: str, description: str) -> List[dict]:
        """Supervisor: Analyze Epic and codebase to create Stories with PATCH BATCH

        Returns list of Story definitions with PATCH BATCH instructions
        """
        self.log("SUPERVISOR", "Scanning codebase for relevant files...")

        # Extract keywords from summary and description for file search
        keywords = self._extract_keywords(summary + " " + description)
        self.log("SUPERVISOR", f"Keywords identified: {', '.join(keywords[:10])}")

        # Search for relevant files in the codebase
        relevant_files = self._find_relevant_files(keywords)
        self.log("SUPERVISOR", f"Found {len(relevant_files)} potentially relevant files")

        # GOVERNANCE: Never create placeholder stories/patches.
        if not relevant_files:
            raise NonActionablePatchBatchError(
                "Supervisor output is non-actionable (no relevant files found for exact diffs)."
            )

        # Analyze files and generate PATCH BATCH instructions (fail-closed; no templates).
        patch_instructions = self._generate_patch_batch(epic_key, summary, description, relevant_files)

        return [patch_instructions]

    def _extract_keywords(self, text: str) -> List[str]:
        """Extract relevant keywords from text for codebase search"""
        # Common words to ignore
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
                      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
                      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
                      'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'this',
                      'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
                      'without', 'across', 'any', 'all', 'not', 'no', 'changing', 'behavior'}

        # Extract words, filter stop words, keep relevant ones
        words = re.findall(r'\b[a-zA-Z][a-zA-Z0-9]*\b', text.lower())
        keywords = [w for w in words if w not in stop_words and len(w) > 2]

        # Prioritize certain patterns
        priority_patterns = ['apply', 'action', 'button', 'modal', 'dialog', 'preview',
                            'issues', 'governance', 'warning', 'confirm', 'ui', 'ux',
                            'component', 'page', 'view', 'hook', 'context', 'api']

        # Sort with priority patterns first
        priority_keywords = [k for k in keywords if k in priority_patterns]
        other_keywords = [k for k in keywords if k not in priority_patterns]

        return priority_keywords + other_keywords[:20]

    def _find_relevant_files(self, keywords: List[str]) -> List[dict]:
        """Search codebase for files matching keywords"""
        relevant_files = []
        search_dirs = ['apps', 'packages', 'src', 'components', 'lib']

        # Build search patterns
        patterns = []
        for keyword in keywords[:5]:  # Limit to top 5 keywords
            patterns.extend([
                f"**/*{keyword}*.tsx",
                f"**/*{keyword}*.ts",
                f"**/{keyword}/**/*.tsx",
                f"**/{keyword}/**/*.ts"
            ])

        # Search for files
        for base_dir in search_dirs:
            dir_path = Path(self.config.repo_path) / base_dir
            if not dir_path.exists():
                continue

            for pattern in patterns[:10]:  # Limit patterns
                try:
                    for file_path in dir_path.glob(pattern):
                        if file_path.is_file() and not any(x in str(file_path) for x in ['node_modules', '.next', 'dist', '.git']):
                            rel_path = str(file_path.relative_to(self.config.repo_path))
                            if rel_path not in [f['path'] for f in relevant_files]:
                                # Read first 100 lines to understand file purpose
                                try:
                                    content = file_path.read_text()[:3000]
                                    relevant_files.append({
                                        'path': rel_path,
                                        'preview': content[:500]
                                    })
                                except:
                                    pass
                except:
                    pass

        return relevant_files[:10]  # Limit to 10 most relevant files

    def _generate_patch_batch(self, epic_key: str, summary: str, description: str, files: List[dict]) -> dict:
        """Generate Story with PATCH BATCH instructions using Claude Code CLI.

        PATCH A: Story description is concise and does NOT embed full patch batch.
        Full patch batch is returned separately for file storage.

        GOVERNANCE: Template/fallback PATCH BATCH generation is forbidden.
        Placeholder PATCH BATCH is treated as NON-EXISTENT.

        Returns:
            Dict with 'summary', 'description', and 'patch_batch_text' keys.
        """

        # Read full file contents for Claude analysis
        file_contents = []
        for f in files[:5]:  # Limit to 5 files
            success, content = self.files.read_file(f['path'])
            if success:
                file_contents.append({
                    'path': f['path'],
                    'content': content[:4000]  # Limit content size
                })

        if not (self.claude_code_available and file_contents):
            raise NonActionablePatchBatchError(
                "Supervisor output is non-actionable (insufficient code context to produce exact diffs)."
            )

        self.log("SUPERVISOR", "Using Claude Code CLI to analyze code and generate PATCH BATCH...")
        patch_batch_text = self._claude_code_generate_patches(epic_key, summary, description, file_contents)

        if _patch_batch_is_placeholder(patch_batch_text):
            raise NonActionablePatchBatchError(
                "Supervisor output is non-actionable (placeholder/TODO/template detected)."
            )

        # PATCH A: Build concise story description (no full patch batch embedded)
        # Truncate implementation goal to stay within limits
        impl_goal = description[:JIRA_STORY_DESC_TARGET_CHARS // 2] if description else ""
        if len(impl_goal) < len(description):
            impl_goal += "\n\n[...truncated for Jira limits...]"

        # PATCH A: Story description uses marker for patch batch file location
        # Pattern will be filled in after story key is known
        artifacts_dir = _artifact_dirname()
        story_description = f"""## Parent Epic
{epic_key}: {summary}

## Implementation Goal
{impl_goal}

---

## PATCH BATCH Location

{PATCH_BATCH_FILE_MARKER} {artifacts_dir}/{{STORY_KEY}}-patch-batch.md

Full PATCH BATCH instructions are stored in the artifact file above.
See Jira comment for excerpt and verification checklist.

---

## Verification Report Path

Canonical verification report: {artifacts_dir}/{{STORY_KEY}}-verification.md

---
*Story created by SUPERVISOR v3.2*
*PATCH BATCH stored externally to avoid Jira content limits*
"""

        # PATCH A: Enforce size limit with fail-closed truncation
        if len(story_description) > JIRA_STORY_DESC_MAX_CHARS:
            truncate_at = JIRA_STORY_DESC_MAX_CHARS - 100
            story_description = story_description[:truncate_at] + "\n\n[TRUNCATED - see patch batch file for full details]"

        return {
            'summary': f"Implement: {summary}",
            'description': story_description,
            'patch_batch_text': patch_batch_text,  # PATCH A: Return separately
        }

    def _claude_code_generate_patches(self, epic_key: str, summary: str, description: str, files: List[dict]) -> str:
        """Use Claude Code CLI to analyze code and generate actual PATCH BATCH instructions (no API key required)

        Guardrails v1: Prompt requires ALLOWED FILES section in output

        GOVERNANCE:
        - Placeholder PATCH BATCH == NON-EXISTENT.
        - Max retries: 2 (bounded).
        - If exact diffs cannot be produced, Supervisor must STOP (NON_ACTIONABLE_PATCH_BATCH).
        """
        files_context = ""
        for f in files:
            files_context += f"\n\n### FILE: {f['path']}\n```\n{f['content']}\n```"

        base_prompt = f"""You are the SUPERVISOR in an autonomous development system. Your role is to analyze code and generate PATCH BATCH instructions for implementation.

## Epic Requirements
{epic_key}: {summary}

{description}

## Codebase Files
{files_context}

## Task
Analyze the code above and generate specific PATCH BATCH instructions to implement the Epic requirements.

IMPORTANT RULES:
1. ONLY output PATCH BATCH format - no explanations
2. Each patch must be surgical and minimal
3. Use exact code from the files for ---OLD--- sections
4. Generate working code for ---NEW--- sections
5. Do NOT rewrite entire files - only modify necessary parts
6. Follow existing code patterns and conventions
7. DIFF BUDGET: Maximum {DEFAULT_MAX_CHANGED_FILES} files may be modified
8. SCOPE FENCE: If description mentions FRONTEND-ONLY, only modify files under apps/web/ or docs/

## Required Output Format

For each file that needs modification, output:

FILE: <exact/file/path>
OPERATION: edit
DESCRIPTION: <what this change does>
---OLD---
<exact existing code to replace - copy from file above>
---NEW---
<new code with the changes>
---END---

## REQUIRED: At the end, include an ALLOWED FILES section:

ALLOWED FILES:
- <every FILE: path you mentioned above>
- docs/IMPLEMENTATION_PLAN.md

ALLOWED NEW FILES:
- {VERIFICATION_REPORT_DIR}/<KAN-KEY>-verification.md

DIFF BUDGET: {DEFAULT_MAX_CHANGED_FILES}

SCOPE FENCE: <restate any FRONTEND-ONLY constraint here, or "None">

IMPORTANT: Output ONLY the PATCH BATCH instructions followed by the ALLOWED FILES section. Do not include any other text, explanations, or commentary.

Generate the PATCH BATCH instructions now:"""

        max_retries = 2
        max_attempts = 1 + max_retries
        model = _model_for_role("SUPERVISOR")

        for attempt in range(1, max_attempts + 1):
            extra = ""
            if attempt > 1:
                extra = f"""

## RETRY ATTEMPT {attempt}/{max_attempts} — STRICT RULES (NON-NEGOTIABLE)

1. Do NOT output TODO/TBD/placeholder/template content.
2. If you cannot produce exact diffs with concrete ---OLD--- and ---NEW--- blocks, output exactly:
   NON_ACTIONABLE_PATCH_BATCH
   Reason: <one sentence>
3. Do NOT guess intent or invent routes/behavior.
"""
            prompt = base_prompt + extra

            try:
                self.log("SUPERVISOR", f"Calling Claude Code CLI ({model}) for code analysis... (attempt {attempt}/{max_attempts})")
                self.log("SUPERVISOR", f"step timeout: DECOMPOSE={self.claude_timeout_seconds}s (derived from claude_timeout_seconds)")

                result = subprocess.run(
                    ['claude', '--model', model, '-p', prompt, '--dangerously-skip-permissions'],
                    cwd=self.config.repo_path,
                    capture_output=True,
                    text=True,
                    timeout=self.claude_timeout_seconds
                )

                if result.returncode != 0:
                    self.log("SUPERVISOR", f"Claude Code CLI error: {result.stderr[:200]}")
                    if attempt < max_attempts:
                        continue
                    raise NonActionablePatchBatchError(
                        "Supervisor output is non-actionable (Claude CLI error; no valid PATCH BATCH)."
                    )

                patch_content = (result.stdout or "").strip()
                self.log("SUPERVISOR", f"Claude Code CLI generated {len(patch_content)} chars of PATCH BATCH")

                if (patch_content or "").strip().upper().startswith("NON_ACTIONABLE_PATCH_BATCH"):
                    if attempt < max_attempts:
                        continue
                    raise NonActionablePatchBatchError(
                        "Supervisor output is non-actionable (explicit NON_ACTIONABLE_PATCH_BATCH)."
                    )

                if _patch_batch_is_placeholder(patch_content):
                    if attempt < max_attempts:
                        continue
                    raise NonActionablePatchBatchError(
                        "Supervisor output is non-actionable (placeholder/TODO/template detected)."
                    )

                return patch_content

            except subprocess.TimeoutExpired:
                self.log("SUPERVISOR", "Claude Code CLI timed out")
                if attempt < max_attempts:
                    continue
                raise NonActionablePatchBatchError(
                    "Supervisor output is non-actionable (Claude CLI timeout; no valid PATCH BATCH)."
                )
            except NonActionablePatchBatchError:
                raise
            except Exception as e:
                self.log("SUPERVISOR", f"Claude Code CLI error: {e}")
                if attempt < max_attempts:
                    continue
                raise NonActionablePatchBatchError(
                    "Supervisor output is non-actionable (unexpected error; no valid PATCH BATCH)."
                )

        raise NonActionablePatchBatchError("Supervisor output is non-actionable (no valid PATCH BATCH after retries).")

    def _generate_template_patches(self, files: List[dict]) -> str:
        """Legacy helper (disabled).

        GOVERNANCE: Template/placeholder PATCH BATCH generation is forbidden.
        """
        raise NonActionablePatchBatchError(
            "Supervisor output is non-actionable (template PATCH BATCH generation is forbidden)."
        )

    def _create_placeholder_story(self, epic_key: str, summary: str, description: str) -> dict:
        """Legacy helper (disabled).

        GOVERNANCE: Placeholder stories/patches must not be generated.
        """
        raise NonActionablePatchBatchError(
            "Supervisor output is non-actionable (placeholder story generation is forbidden)."
        )

    def step_3_story_implementation(self) -> bool:
        """Developer: Implement Stories using Claude Code CLI.

        Guardrails v1: Full enforcement of scope fence, diff budget, patch list, and verification artifact.
        Bug Execution Enablement: Bugs are executable with same guardrails; Story priority preserved.
        """
        self.log("DEVELOPER", "STEP 3: Checking for executable work items with 'To Do' status...")

        # Bug Execution Enablement: Get all executable work items (Stories and Bugs)
        all_items = self.jira.get_executable_work_items()
        todo_items = [i for i in all_items if i['fields']['status']['name'].lower() == 'to do']

        if not todo_items:
            self.log("DEVELOPER", "No Stories or Bugs in 'To Do' status")
            return False

        # Story priority: select oldest Story first; only select Bug if no Stories exist
        todo_stories = [i for i in todo_items if i['fields']['issuetype']['name'].lower() == 'story']
        todo_bugs = [i for i in todo_items if i['fields']['issuetype']['name'].lower() == 'bug']

        if todo_stories:
            work_item = todo_stories[0]
            self.log("DEVELOPER", f"Found {len(todo_stories)} Stories in 'To Do' status")
        elif todo_bugs:
            work_item = todo_bugs[0]
            self.log("DEVELOPER", f"Found {len(todo_bugs)} Bugs in 'To Do' status (no Stories pending)")
            self.log("DEVELOPER", "Executing Bug as first-class work item")
        else:
            self.log("DEVELOPER", "No Stories or Bugs in 'To Do' status")
            return False

        key = work_item['key']
        work_item_type = work_item['fields']['issuetype']['name']
        summary = work_item['fields']['summary']
        description = self.jira.parse_adf_to_text(work_item['fields'].get('description', {}))
        status = work_item['fields']['status']['name'].lower()

        self.log("IMPLEMENTER", f"Implementing: [{key}] {summary} ({work_item_type})")

        # Check if docs modifications are allowed by ALLOWED FILES constraints
        allow_docs = _docs_allowed_by_constraints(description)

        # Guardrails v1: Parse ALLOWED FILES from description
        allowed_files, allowed_new_patterns = self._parse_allowed_files(description)
        frontend_only = self._is_frontend_only(work_item, description)
        max_files = int(os.environ.get("ENGINE_MAX_CHANGED_FILES", str(DEFAULT_MAX_CHANGED_FILES)))

        # Add comment noting implementation started
        self.jira.add_comment(key, f"Implementation started by IMPLEMENTER\nBranch: {self.config.feature_branch}")

        # Use Claude Code CLI to implement the story
        self.log("IMPLEMENTER", "Invoking Claude Code CLI for implementation...")

        # PATCH 2-A: Capture head SHA before Claude execution
        head_sha_before = self.git.get_head_sha()

        success, output, modified_files, artifact_path = self._invoke_claude_code(key, summary, description)

        # PATCH 2-A: Capture head SHA after Claude execution
        head_sha_after = self.git.get_head_sha()
        commit_detected = bool(head_sha_after and head_sha_before and head_sha_after != head_sha_before)

        # PATCH 5: If commit detected but modified_files is empty, get files from commit
        reported_files = modified_files[:]  # Start with porcelain status files
        claude_committed = False
        if commit_detected and not modified_files:
            # Claude committed but working tree is clean - get files from the commit
            reported_files = self.git.get_files_changed_in_commit(head_sha_after)
            claude_committed = True
            self.log("IMPLEMENTER", f"Commit detected ({head_sha_after[:8]}), working tree clean, files from commit: {len(reported_files)}")

        if success:
            self.log("IMPLEMENTER", f"Claude Code completed implementation")
            self.log("IMPLEMENTER", f"Modified files: {', '.join(reported_files) if reported_files else 'None detected'}")

            # FIXUP-1 PATCH 2: Enforce canonical report existence BEFORE commit/push
            exists, canonical_report_path, remediation = _verify_canonical_report_or_fail_fast(
                self.config.repo_path, key, log_func=lambda msg: self.log("IMPLEMENTER", msg)
            )

            if not exists:
                # Fail-fast: canonical report missing, do NOT commit/push
                self.log("IMPLEMENTER", f"[{key}] FAIL-FAST: Canonical verification report missing")
                self.jira.add_comment(key, f"""Implementation completed but verification report missing.

{remediation}

**ACTION REQUIRED:** Implementer must write report to canonical path before verification can proceed.
Commit and push were NOT performed.""")

                # Record failure to work ledger
                self._upsert_work_ledger_entry(
                    issue_key=key,
                    issue_type="Story",
                    status="failed",
                    last_step=LastStep.IMPLEMENTER.value,
                    last_step_result=StepResult.FAILED.value,  # FIXUP-1 PATCH 5
                    error_text="Canonical verification report missing",
                )

                self.escalate(
                    "IMPLEMENTER",
                    f"Story {key} missing canonical verification report",
                    f"Story: {summary}\n\n{remediation}"
                )
                return True  # Continue run, but mark as handled

            # Update IMPLEMENTATION_PLAN.md only if docs allowed
            # PATCH 5: Use reported_files (includes files from Claude's commit if working tree clean)
            if reported_files:
                if allow_docs:
                    self._update_implementation_plan(key, summary, reported_files)
                else:
                    self.log("IMPLEMENTER", "Skipping IMPLEMENTATION_PLAN.md update (docs not allowed by ALLOWED FILES)")

            # Commit and push changes to feature branch
            # PATCH 5: Skip commit if Claude already committed (claude_committed=True)
            # AUTOVERIFY-AUTOFIX-LOOP-SAFETY-1 PATCH 4: Respect git_push_enabled()
            commit_success = False
            push_enabled = git_push_enabled()
            if claude_committed:
                # Claude already committed - push if enabled
                if push_enabled:
                    self.log("IMPLEMENTER", f"Claude already committed ({head_sha_after[:8]}), pushing...")
                    commit_success = self.git.push()
                    if commit_success:
                        self.log("IMPLEMENTER", f"Pushed Claude's commit to {self.config.feature_branch}")
                    else:
                        self.log("IMPLEMENTER", "Failed to push Claude's commit")
                else:
                    self.log("IMPLEMENTER", f"Claude already committed ({head_sha_after[:8]}), push disabled via ENGINEO_GIT_PUSH_ENABLED=0")
                    commit_success = True  # Commit succeeded, push skipped
            elif modified_files:
                self.log("IMPLEMENTER", "Committing changes to git...")
                commit_success = self._commit_implementation(key, summary, modified_files, allow_docs)
                if commit_success:
                    if push_enabled:
                        self.log("IMPLEMENTER", f"Changes committed and pushed to {self.config.feature_branch}")
                    else:
                        self.log("IMPLEMENTER", f"Changes committed to {self.config.feature_branch} (push disabled)")
                else:
                    self.log("IMPLEMENTER", "Failed to commit changes - manual commit required")

            # Add success comment to Jira
            # PATCH 5: Properly reflect commit status when Claude committed
            # AUTOVERIFY-AUTOFIX-LOOP-SAFETY-1 PATCH 4: Reflect push disabled state
            if claude_committed:
                if push_enabled:
                    commit_status = "Claude committed and pushed" if commit_success else "Claude committed (push pending)"
                else:
                    commit_status = "Claude committed (push disabled)"
            else:
                if push_enabled:
                    commit_status = "Committed and pushed" if commit_success else "Changes pending commit"
                else:
                    commit_status = "Committed (push disabled)" if commit_success else "Changes pending commit"
            resolved_report_path = canonical_report_path  # Use canonical path from fail-fast check
            self.jira.add_comment(key, f"""
Implementation completed by IMPLEMENTER.

Branch: {self.config.feature_branch}
Status: {commit_status}
Verification report: {resolved_report_path}
Files modified:
{chr(10).join(['- ' + f for f in reported_files]) if reported_files else '(see git log for details)'}

Ready for Supervisor verification.
""")
            self.log("IMPLEMENTER", f"Story {key} implementation complete")

            # PATCH 2-C: Upsert ledger entry on success
            self._upsert_kan_story_run(key, {
                "status": "implemented",
                "runId": self.run_id,
                "baseSha": head_sha_after or head_sha_before or "",
                "verificationReportPath": resolved_report_path,
                "attemptArtifacts": [artifact_path] if artifact_path else [],
                "guardrailsPassed": commit_detected or commit_success,
            })

            # PATCH 5: Record success to work ledger
            self._upsert_work_ledger_entry(
                issue_key=key,
                issue_type="Story",
                status="In Progress",
                last_step=LastStep.IMPLEMENTER.value,
                last_step_result=StepResult.SUCCESS.value,  # FIXUP-1 PATCH 5
                last_commit_sha=head_sha_after or head_sha_before,
                verification_report_path=resolved_report_path,
            )
        else:
            # FIXUP-1 PATCH 1: Short-circuit if AGENT_TEMPLATE_ERROR already handled in _invoke_claude_code
            if _is_agent_template_error(output):
                self.log("IMPLEMENTER", f"[{key}] AGENT_TEMPLATE_ERROR already handled; skipping generic failure handling")
                return True  # Terminal handled

            self.log("IMPLEMENTER", f"Claude Code encountered issues")

            self.jira.add_comment(key, f"""
Claude Code implementation encountered issues.

Claude Code failed; output saved to {artifact_path}
Run ID: {self.run_id}

**Output artifact:** `{artifact_path}`

Human intervention may be required.
""")

            self.escalate(
                "IMPLEMENTER",
                f"Story {key} Claude Code implementation issue",
                f"Claude Code failed; output saved to {artifact_path}\nRun ID: {self.run_id}\n\nStory: {summary}"
            )

            # PATCH 2-C: Upsert ledger entry on failure
            self._upsert_kan_story_run(key, {
                "status": "failed",
                "runId": self.run_id,
                "baseSha": head_sha_after or head_sha_before or "",
                "verificationReportPath": "",
                "attemptArtifacts": [artifact_path] if artifact_path else [],
                "guardrailsPassed": False,
            })

            # FIXUP-2 PATCH 1: Classify terminal result for proper Work Ledger recording
            terminal_result = _classify_implementer_terminal_result(output)
            error_constants = {
                StepResult.TIMED_OUT.value: "Implementation timed out",
                StepResult.CANCELLED.value: "Implementation cancelled (lock/session conflict)",
                StepResult.FAILED.value: "Implementation failed",
            }
            error_text = error_constants.get(terminal_result, "Implementation failed")

            # FIXUP-1 PATCH 5: Record failure to work ledger
            self._upsert_work_ledger_entry(
                issue_key=key,
                issue_type="Story",
                status="failed",
                last_step=LastStep.IMPLEMENTER.value,
                last_step_result=terminal_result,  # FIXUP-2 PATCH 1: Classified result
                error_text=error_text,
            )

        self.log("IMPLEMENTER", "Notifying Supervisor for verification...")
        return True

    def _update_implementation_plan(self, story_key: str, summary: str, files: List[str]):
        """Update IMPLEMENTATION_PLAN.md with implementation details"""
        timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')

        entry = f"""
## [{story_key}] {summary}

**Implemented:** {timestamp}
**Branch:** {self.config.feature_branch}

### Files Modified:
{chr(10).join(['- `' + f + '`' for f in files])}

---
"""
        try:
            if self.impl_plan_path.exists():
                content = self.impl_plan_path.read_text()
                # Insert after header (first line)
                lines = content.split('\n')
                if lines:
                    # Find end of header section
                    insert_pos = 1
                    for i, line in enumerate(lines):
                        if line.startswith('## ') or line.startswith('---'):
                            insert_pos = i
                            break
                        insert_pos = i + 1

                    lines.insert(insert_pos, entry)
                    content = '\n'.join(lines)
                else:
                    content = f"# Implementation Plan\n{entry}"
            else:
                self.impl_plan_path.parent.mkdir(parents=True, exist_ok=True)
                content = f"# Implementation Plan\n\nAutomatically updated by EngineO Autonomous Execution Engine.\n{entry}"

            self.impl_plan_path.write_text(content)
            self.log("IMPLEMENTER", f"Updated {self.impl_plan_path}")
        except Exception as e:
            self.log("IMPLEMENTER", f"Failed to update IMPLEMENTATION_PLAN.md: {e}")

    def _commit_implementation(self, story_key: str, summary: str, files: List[str], allow_docs: bool = True) -> bool:
        """Commit and push implementation changes with ledger pre-commit gate."""
        # PATCH 3A: Record ledger evidence BEFORE staging
        head_sha = self.git.get_head_sha()

        # Filter out runtime ignored paths from candidate files
        filtered_files = [f for f in files if f not in RUNTIME_IGNORED_PATHS]

        # Load or initialize ledger
        ledger = self._load_guardrails_ledger()
        if ledger is None:
            ledger = {"version": LEDGER_VERSION, "kan_story_runs": {}}

        # Ensure kan_story_runs exists
        if "kan_story_runs" not in ledger:
            ledger["kan_story_runs"] = {}

        # Upsert ledger entry for this story
        ledger["kan_story_runs"][story_key] = {
            "baseSha": head_sha,
            "changedFiles": filtered_files,
            "maxFiles": 15,
            "frontendOnly": False,
            "guardrailsPassed": True,
            "verificationReportPath": "",
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }

        # Save ledger - MUST succeed before committing
        if not self._save_guardrails_ledger(ledger):
            error_msg = "Cannot commit: ledger write failed"
            self.log("IMPLEMENTER", error_msg)
            self.jira.add_comment(story_key, f"Implementation blocked: {error_msg}")
            self.escalate("IMPLEMENTER", f"Story {story_key} commit blocked", error_msg)
            return False

        # Stage modified files (excluding runtime ignored paths)
        # Only include impl_plan_path if docs are allowed
        files_to_stage = filtered_files[:]
        if allow_docs:
            files_to_stage.append(str(self.impl_plan_path))

        # Filter to only existing files AND exclude runtime paths
        existing_files = []
        for f in files_to_stage:
            # Normalize path for comparison
            norm_path = f.replace("\\", "/")
            if norm_path in RUNTIME_IGNORED_PATHS:
                continue
            if Path(self.files.resolve_path(f)).exists():
                existing_files.append(f)

        if not existing_files:
            self.log("IMPLEMENTER", "No files to commit")
            return False

        # Stage files
        if not self.git.add_files(existing_files):
            self.log("IMPLEMENTER", "Failed to stage files")
            return False

        # PATCH 3B: Safety check - ensure ledger/lock never staged
        staged = self.git.get_staged_files()
        for ignored_path in RUNTIME_IGNORED_PATHS:
            if ignored_path in staged:
                self.log("IMPLEMENTER", f"Safety abort: {ignored_path} found in staged files, unstaging")
                self.git.unstage_file(ignored_path)

        # Re-check staged files after cleanup
        staged = self.git.get_staged_files()
        for ignored_path in RUNTIME_IGNORED_PATHS:
            if ignored_path in staged:
                self.log("IMPLEMENTER", f"CRITICAL: Cannot remove {ignored_path} from staging, aborting commit")
                return False

        # Create commit message
        commit_message = f"""feat({story_key}): {summary}

Implemented by EngineO Autonomous Execution Engine (IMPLEMENTER v3.3)

Files modified:
{chr(10).join(['- ' + f for f in filtered_files])}

Story: {story_key}
Branch: {self.config.feature_branch}
"""

        # Commit
        if not self.git.commit(commit_message):
            self.log("IMPLEMENTER", "Failed to create commit")
            return False

        # AUTOVERIFY-AUTOFIX-LOOP-SAFETY-1 PATCH 4: Push only if enabled
        if git_push_enabled():
            if not self.git.push():
                self.log("IMPLEMENTER", "Failed to push to remote")
                return False
            self.log("IMPLEMENTER", "Changes committed and pushed successfully")
        else:
            self.log("IMPLEMENTER", "Changes committed (push disabled via ENGINEO_GIT_PUSH_ENABLED=0)")

        return True

    def verify_work_item(self, issue: dict) -> bool:
        """Verify a single work item (Story or Bug) and auto-transition if passed.

        PATCH 8: Evidence-based auto-close policy.
        - Checks canonical report exists: reports/{ISSUE}-verification.md
        - Validates report has ## Checklist with no unchecked items
        - Checks commit evidence from Work Ledger or git history
        - Auto-transitions to Done/Resolved if evidence complete
        - Handles BLOCKED status (included in Verify/Close queue)

        AUTOVERIFY-AUTOFIX-LOOP-SAFETY-1 PATCH 4:
        - Early return for human review/attention states (engine should not loop)
        - Auto-verify automatable checklist items if enabled
        - Route to HUMAN TO REVIEW AND CLOSE when only manual items remain
        - Route to HUMAN ATTENTION NEEDED when auto-fix exhausted/ineligible

        Returns: True if any action was taken, False otherwise.
        """
        key = issue['key']
        summary = issue['fields']['summary']
        issue_type = issue['fields']['issuetype']['name']
        status = issue['fields']['status']['name']

        # AUTOVERIFY-AUTOFIX-LOOP-SAFETY-1 PATCH 4: Early return for human states
        human_review = contract_human_review_status()
        human_attention = contract_human_attention_status()
        if status in (human_review, human_attention):
            self.log("SUPERVISOR", f"[{key}] Status is {status} - requires human intervention, skipping")
            return False

        # PATCH 8: Include BLOCKED status in verification (not just In Progress)
        if status not in ("In Progress", "BLOCKED", "Blocked"):
            return False

        self.log("SUPERVISOR", f"Verifying [{key}] {issue_type}: {summary}")

        # Configurable verify cooldown
        cooldown_seconds = getattr(self, "verify_cooldown_seconds", VERIFY_COOLDOWN_SECONDS)

        # Step 1: Verify canonical report exists (FIXUP-1 PATCH 2: fail-fast remediation)
        exists, report_path, remediation = _verify_canonical_report_or_fail_fast(
            self.config.repo_path, key, log_func=lambda msg: self.log("SUPERVISOR", msg)
        )

        if not exists:
            # PENDING: Canonical verification report not found
            self.log("SUPERVISOR", f"[{key}] Canonical verification report not found")

            # PATCH 2: Compute verify failure state
            verify_reason = "report_missing"
            report_hash = None  # Report doesn't exist

            # PATCH 2: Check comment de-dup
            work_entry = self.work_ledger.get(key)
            if _should_post_verify_comment(work_entry, verify_reason, report_hash):
                comment = f"""Supervisor Verification: PENDING - verification report not found

{remediation}"""
                self.jira.add_comment(key, comment)

            # PATCH 2: Record verify backoff state
            verify_next_at = (datetime.now(timezone.utc).timestamp() + cooldown_seconds)
            verify_next_at_iso = datetime.fromtimestamp(verify_next_at, timezone.utc).isoformat()
            self._upsert_work_ledger_entry(
                issue_key=key,
                issue_type="Story",
                status=status,
                last_step=LastStep.VERIFY.value,
                last_step_result=StepResult.FAILED.value,
                verify_next_at=verify_next_at_iso,
                verify_last_reason=verify_reason,
                verify_last_report_hash=report_hash,
                verify_last_commented_reason=verify_reason,
                verify_last_commented_report_hash=report_hash,
            )
            return True

        # PATCH 2-B: Checklist header validation
        report_full_path = Path(self.config.repo_path) / report_path

        # PATCH 2: Compute report hash for backoff tracking
        report_hash = _hash_file(str(report_full_path))
        report_mtime = None
        try:
            report_mtime = report_full_path.stat().st_mtime
        except OSError:
            pass

        try:
            report_content = report_full_path.read_text(encoding='utf-8')
        except (OSError, UnicodeDecodeError) as e:
            self.log("SUPERVISOR", f"[{key}] Cannot read report: {e}")

            # PATCH 2: Compute verify failure state
            verify_reason = "cannot_read_report"
            work_entry = self.work_ledger.get(key)

            # PATCH 2: Check comment de-dup
            if _should_post_verify_comment(work_entry, verify_reason, report_hash):
                comment = f"""Supervisor Verification: INVALID - cannot read report

Report: {report_path}
Error: {e}"""
                self.jira.add_comment(key, comment)

            # PATCH 2: Record verify backoff state
            verify_next_at = (datetime.now(timezone.utc).timestamp() + cooldown_seconds)
            verify_next_at_iso = datetime.fromtimestamp(verify_next_at, timezone.utc).isoformat()
            self._upsert_work_ledger_entry(
                issue_key=key,
                issue_type="Story",
                status=status,
                last_step=LastStep.VERIFY.value,
                last_step_result=StepResult.FAILED.value,
                verify_next_at=verify_next_at_iso,
                verify_last_reason=verify_reason,
                verify_last_report_hash=report_hash,
                verify_last_report_mtime=report_mtime,
                verify_last_commented_reason=verify_reason,
                verify_last_commented_report_hash=report_hash,
            )
            return True

        if "## Checklist" not in report_content:
            # VERIFY-AUTOREPAIR-1 PATCH 1: Auto-repair reports missing ## Checklist
            self.log("SUPERVISOR", f"[{key}] Report missing ## Checklist - applying auto-repair")

            pre_hash = report_hash  # Hash of pre-repair content
            work_entry = self.work_ledger.get(key)
            now_iso = datetime.now(timezone.utc).isoformat()

            # PATCH 1: Dedup repair - if already repaired for this hash, just set cooldown
            if work_entry and work_entry.verify_repair_last_report_hash == pre_hash:
                self.log("SUPERVISOR", f"[{key}] Repair already applied for this report hash; setting cooldown")
                verify_reason = "auto_repair_already_applied"
                verify_next_at = (datetime.now(timezone.utc).timestamp() + cooldown_seconds)
                verify_next_at_iso = datetime.fromtimestamp(verify_next_at, timezone.utc).isoformat()
                self._upsert_work_ledger_entry(
                    issue_key=key,
                    issue_type="Story",
                    status=status,
                    last_step=LastStep.VERIFY.value,
                    last_step_result=StepResult.FAILED.value,
                    verify_next_at=verify_next_at_iso,
                    verify_last_reason=verify_reason,
                    verify_last_report_hash=pre_hash,
                    verify_last_report_mtime=report_mtime,
                )
                return True

            # PATCH 1: Build repaired content - skeleton + appendix with original content
            date_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
            parent_key = issue.get('fields', {}).get('parent', {}).get('key', 'N/A') if issue.get('fields', {}).get('parent') else 'N/A'
            skeleton_content = VERIFICATION_REPORT_SKELETON_TEMPLATE.format(
                issue_key=key,
                parent_key=parent_key,
                summary=summary[:200] if summary else 'N/A',
                date=date_str,
            )

            # Append original content under Appendix
            repaired_content = skeleton_content + f"""
## Appendix (previous content)

The following is the original report content that was auto-repaired due to missing `## Checklist` header:

---

{report_content}
"""

            # PATCH 1: Write repaired content atomically
            temp_path = report_full_path.with_suffix('.md.tmp')
            try:
                temp_path.write_text(repaired_content, encoding='utf-8')
                os.replace(str(temp_path), str(report_full_path))
                self.log("SUPERVISOR", f"[{key}] Auto-repair applied successfully")
            except OSError as e:
                self.log("SUPERVISOR", f"[{key}] Auto-repair write failed: {e}")
                try:
                    temp_path.unlink(missing_ok=True)
                except OSError:
                    pass
                # Fall through to set cooldown anyway

            # PATCH 1: Compute post-repair hash (or use pre_hash if read fails)
            post_hash = _hash_file(str(report_full_path)) or pre_hash

            # PATCH 1: Prepare Work Ledger update
            verify_reason = "auto_repair_missing_checklist"
            verify_next_at = (datetime.now(timezone.utc).timestamp() + cooldown_seconds)
            verify_next_at_iso = datetime.fromtimestamp(verify_next_at, timezone.utc).isoformat()
            repair_count = (work_entry.verify_repair_count + 1) if work_entry and work_entry.verify_repair_count else 1

            # PATCH 1: Post Jira comment (deduplicated)
            should_comment = _should_post_verify_comment(work_entry, verify_reason, pre_hash)
            if should_comment:
                comment = f"""Supervisor Verification: AUTO-REPAIR APPLIED

Report `{report_path}` was missing the required `## Checklist` header.

**Action taken:**
- Prepended canonical verification skeleton with `## Checklist` section
- Original content preserved under `## Appendix (previous content)`

**Next steps:**
- Fill in the `## Checklist` items and mark them complete (`- [x]`)
- Verification will retry after cooldown ({cooldown_seconds}s) or when report changes

*Auto-repair applied by Engine PATCH 1*"""
                self.jira.add_comment(key, comment)

            # PATCH 1: Update Work Ledger with repair tracking
            self._upsert_work_ledger_entry(
                issue_key=key,
                issue_type="Story",
                status=status,
                last_step=LastStep.VERIFY.value,
                last_step_result=StepResult.FAILED.value,
                verify_next_at=verify_next_at_iso,
                verify_last_reason=verify_reason,
                verify_last_report_hash=post_hash,
                verify_last_report_mtime=report_mtime,
                verify_last_commented_reason=verify_reason if should_comment else (work_entry.verify_last_commented_reason if work_entry else None),
                verify_last_commented_report_hash=pre_hash if should_comment else (work_entry.verify_last_commented_report_hash if work_entry else None),
                verify_repair_applied_at=now_iso,
                verify_repair_last_report_hash=pre_hash,
                verify_repair_count=repair_count,
            )
            return True

        # PATCH 8: Check for unchecked items (fail-closed)
        # AUTOVERIFY-AUTOFIX-LOOP-SAFETY-1 PATCH 4: Auto-verify automatable items first
        if "- [ ]" in report_content:
            unchecked_count = report_content.count("- [ ]")
            self.log("SUPERVISOR", f"[{key}] Report has {unchecked_count} unchecked checklist items")

            work_entry = self.work_ledger.get(key)
            current_commit_sha = self.git.get_head_sha() if hasattr(self.git, 'get_head_sha') else None

            # AUTOVERIFY-AUTOFIX-LOOP-SAFETY-1: Check if auto-verify should run
            if autoverify_enabled():
                # Check cycle limit
                auto_verify_runs = work_entry.auto_verify_runs if work_entry else 0
                max_cycles = max_verify_cycles()

                if auto_verify_runs < max_cycles:
                    # Parse checklist items
                    checklist_items = parse_checklist_items(report_content)
                    automatable_unchecked = [i for i in checklist_items if not i.is_checked and i.command]
                    manual_unchecked = [i for i in checklist_items if not i.is_checked and not i.command]

                    if automatable_unchecked:
                        self.log("SUPERVISOR", f"[{key}] Running auto-verify: {len(automatable_unchecked)} automatable, {len(manual_unchecked)} manual")

                        # Run auto-verify
                        artifacts_dir = Path(self.config.repo_path) / _artifact_dirname()
                        av_result = run_auto_verify(
                            story_key=key,
                            report_path=str(report_full_path),
                            working_dir=self.config.repo_path,
                            artifacts_dir=str(artifacts_dir),
                            log_func=lambda msg: self.log("SUPERVISOR", msg),
                        )

                        # REVIEW-FIXUP-2 PATCH 2: Auto-verify artifact commit (FAIL-CLOSED, NEVER push)
                        # Commit evidence artifacts locally so they persist across runs
                        if av_result.evidence_file or av_result.summary_file or av_result.report_updated:
                            # Collect files to stage (convert to repo-relative paths)
                            files_to_stage = []
                            # Resolve repo_path for consistent comparison
                            repo_path_resolved = str(Path(self.config.repo_path).resolve())

                            for artifact_path in [av_result.evidence_file, av_result.summary_file]:
                                if artifact_path and Path(artifact_path).exists():
                                    # Convert absolute to repo-relative
                                    abs_path = str(Path(artifact_path).resolve())
                                    if abs_path.startswith(repo_path_resolved):
                                        rel_path = abs_path[len(repo_path_resolved):].lstrip('/')
                                        files_to_stage.append(rel_path)
                                    else:
                                        self.log("SUPERVISOR", f"[{key}] Artifact path outside repo, skipping: {artifact_path}")

                            if av_result.report_updated:
                                # report_full_path is already a Path under repo
                                report_rel = str(Path(report_full_path).resolve()).replace(repo_path_resolved, '').lstrip('/')
                                files_to_stage.append(report_rel)

                            if files_to_stage:
                                # FAIL-CLOSED: Check for dirty index before staging
                                existing_staged = self.git.get_staged_files()
                                if existing_staged:
                                    # Dirty index - fail-closed to human attention
                                    self.log("SUPERVISOR", f"[{key}] FAIL-CLOSED: Dirty index prevents autoverify artifact commit")

                                    # Transition to human attention
                                    names = self.jira.get_available_transition_names(key)
                                    chosen = choose_human_attention_transition(names)
                                    if chosen:
                                        self.jira.transition_issue(key, chosen)

                                    # Post Jira comment
                                    self.jira.add_comment(key, f"""Supervisor Auto-Verify: BLOCKED - dirty index

Auto-verify artifact commit cannot proceed because the git index already has staged files:
{chr(10).join(f'- {f}' for f in existing_staged[:10])}{'...' if len(existing_staged) > 10 else ''}

**Root cause:** DIRTY_INDEX_PREVENTS_AUTOVERIFY_COMMIT
**Action required:** Human must resolve staged files and retry.""")

                                    # Create blocking escalation
                                    if hasattr(self, "blocking_escalations") and self.blocking_escalations:
                                        self.blocking_escalations.load()
                                        if not self.blocking_escalations.load_error:
                                            self.blocking_escalations.upsert_active(
                                                key,
                                                "DIRTY_INDEX_PREVENTS_AUTOVERIFY_COMMIT",
                                                details=f"Staged files: {existing_staged[:5]}",
                                            )
                                            self.blocking_escalations.save()

                                    # Update work ledger and return
                                    self._upsert_work_ledger_entry(
                                        issue_key=key,
                                        issue_type="Story",
                                        status=human_attention,
                                        last_step=LastStep.VERIFY.value,
                                        last_step_result=StepResult.FAILED.value,
                                    )
                                    return True

                                # Stage the files (FAIL-CLOSED on failure)
                                if not self.git.add_files(files_to_stage):
                                    self.log("SUPERVISOR", f"[{key}] FAIL-CLOSED: git add failed for autoverify artifacts")

                                    names = self.jira.get_available_transition_names(key)
                                    chosen = choose_human_attention_transition(names)
                                    if chosen:
                                        self.jira.transition_issue(key, chosen)

                                    self.jira.add_comment(key, f"""Supervisor Auto-Verify: BLOCKED - git add failed

Failed to stage autoverify artifacts: {files_to_stage}

**Root cause:** GIT_ADD_FAILED_AUTOVERIFY_COMMIT
**Action required:** Human must investigate git state and retry.""")

                                    if hasattr(self, "blocking_escalations") and self.blocking_escalations:
                                        self.blocking_escalations.load()
                                        if not self.blocking_escalations.load_error:
                                            self.blocking_escalations.upsert_active(key, "GIT_ADD_FAILED_AUTOVERIFY_COMMIT")
                                            self.blocking_escalations.save()

                                    self._upsert_work_ledger_entry(
                                        issue_key=key,
                                        issue_type="Story",
                                        status=human_attention,
                                        last_step=LastStep.VERIFY.value,
                                        last_step_result=StepResult.FAILED.value,
                                    )
                                    return True

                                # Commit (FAIL-CLOSED on failure, NEVER push)
                                if not self.git.commit('chore(auto-verify): evidence artifacts commit [skip ci]'):
                                    self.log("SUPERVISOR", f"[{key}] FAIL-CLOSED: git commit failed for autoverify artifacts")

                                    names = self.jira.get_available_transition_names(key)
                                    chosen = choose_human_attention_transition(names)
                                    if chosen:
                                        self.jira.transition_issue(key, chosen)

                                    self.jira.add_comment(key, f"""Supervisor Auto-Verify: BLOCKED - git commit failed

Failed to commit autoverify artifacts.

**Root cause:** GIT_COMMIT_FAILED_AUTOVERIFY_COMMIT
**Action required:** Human must investigate git state and retry.""")

                                    if hasattr(self, "blocking_escalations") and self.blocking_escalations:
                                        self.blocking_escalations.load()
                                        if not self.blocking_escalations.load_error:
                                            self.blocking_escalations.upsert_active(key, "GIT_COMMIT_FAILED_AUTOVERIFY_COMMIT")
                                            self.blocking_escalations.save()

                                    self._upsert_work_ledger_entry(
                                        issue_key=key,
                                        issue_type="Story",
                                        status=human_attention,
                                        last_step=LastStep.VERIFY.value,
                                        last_step_result=StepResult.FAILED.value,
                                    )
                                    return True

                                self.log("SUPERVISOR", f"[{key}] Auto-verify artifacts committed (local only, never pushed)")

                        # Update auto_verify_runs counter
                        new_verify_runs = auto_verify_runs + 1

                        if av_result.all_automatable_passed:
                            self.log("SUPERVISOR", f"[{key}] Auto-verify: all automatable items passed")

                            # Re-read report (may have been updated by auto-verify)
                            try:
                                report_content = report_full_path.read_text(encoding='utf-8')
                            except Exception:
                                pass

                            # Check if only manual items remain
                            if av_result.has_manual_items:
                                # Route to HUMAN TO REVIEW AND CLOSE
                                self.log("SUPERVISOR", f"[{key}] Only manual items remain - routing to {human_review}")

                                # Try to transition to human review
                                names = self.jira.get_available_transition_names(key)
                                chosen = choose_human_review_transition(names)

                                if chosen:
                                    self.jira.transition_issue(key, chosen)
                                    self.log("SUPERVISOR", f"[{key}] Transitioned to {chosen}")

                                # Post comment about what was auto-verified
                                comment = f"""Supervisor Auto-Verify: PARTIAL PASS - manual items remain

**Auto-verified items:** {len(av_result.items_checked)}
**Manual items remaining:** {len(av_result.items_manual)}

Evidence: `{Path(av_result.evidence_file).name if av_result.evidence_file else 'N/A'}`
Summary: `{Path(av_result.summary_file).name if av_result.summary_file else 'N/A'}`

Story transitioned to {human_review} for manual verification."""
                                self.jira.add_comment(key, comment)

                                # Update work ledger
                                self._upsert_work_ledger_entry(
                                    issue_key=key,
                                    issue_type="Story",
                                    status=human_review,
                                    last_step=LastStep.VERIFY.value,
                                    last_step_result=StepResult.SUCCESS.value,
                                    auto_verify_runs=new_verify_runs,
                                    verify_last_commit_sha=current_commit_sha,
                                )

                                return True
                            else:
                                # All items now checked - continue to commit evidence check
                                self.log("SUPERVISOR", f"[{key}] All checklist items now checked")
                                # Update work ledger with successful auto-verify
                                self._upsert_work_ledger_entry(
                                    issue_key=key,
                                    issue_type="Story",
                                    status=status,
                                    last_step=LastStep.VERIFY.value,
                                    auto_verify_runs=new_verify_runs,
                                    verify_last_commit_sha=current_commit_sha,
                                )
                                # Fall through to commit evidence check

                        elif av_result.items_failed:
                            # Some automatable items failed
                            self.log("SUPERVISOR", f"[{key}] Auto-verify: {len(av_result.items_failed)} items failed")

                            # Get first failure for analysis
                            first_failure = av_result.command_results[0] if av_result.command_results else None
                            failure_type = first_failure.failure_type if first_failure else FailureType.UNKNOWN
                            auto_fix_attempts = work_entry.auto_fix_attempts if work_entry else 0
                            last_failure_hash = work_entry.last_failure_hash if work_entry else None

                            # Compute failure hash
                            if first_failure:
                                new_failure_hash = compute_failure_hash(
                                    first_failure.command,
                                    first_failure.exit_code,
                                    first_failure.stdout + first_failure.stderr
                                )
                            else:
                                new_failure_hash = None

                            # Check auto-fix eligibility
                            # NOT eligible if: ENV_ERROR, TIMEOUT
                            auto_fix_eligible = (
                                failure_type not in (FailureType.ENV_ERROR, FailureType.TIMEOUT) and
                                auto_fix_attempts < max_auto_fix_attempts()
                            )

                            # Loop safety: same failure hash without code change = no retry
                            if new_failure_hash and new_failure_hash == last_failure_hash:
                                if current_commit_sha == (work_entry.verify_last_commit_sha if work_entry else None):
                                    self.log("SUPERVISOR", f"[{key}] Same failure hash without code change - not retrying")
                                    auto_fix_eligible = False

                            if auto_fix_eligible:
                                # REVIEW-FIXUP-2 PATCH 3: Add scope overlap + commit required gates
                                self.log("SUPERVISOR", f"[{key}] Auto-fix attempt {auto_fix_attempts + 1}/{max_auto_fix_attempts()}")

                                # SCOPE OVERLAP CHECK: Extract allowed files and check failure references
                                story_description = self.jira.parse_adf_to_text(issue['fields'].get('description', {}))
                                allowed_files = _parse_allowed_files(story_description)

                                # Extract file references from failure output
                                failure_output = (first_failure.stdout + first_failure.stderr) if first_failure else ''
                                failure_files = _extract_file_references(failure_output)

                                # Get files changed in last commit for this story (if any)
                                last_commit_files = []
                                if work_entry and work_entry.last_commit_sha:
                                    last_commit_files = self.git.get_files_changed_in_commit(work_entry.last_commit_sha)

                                # Check scope overlap
                                scope_overlap = False
                                if allowed_files and failure_files:
                                    for ff in failure_files:
                                        for af in allowed_files:
                                            # Simple glob-like match (supports ** and *)
                                            if _file_matches_pattern(ff, af):
                                                scope_overlap = True
                                                break
                                        if scope_overlap:
                                            break
                                elif failure_files and last_commit_files:
                                    # Fallback: check overlap with last commit files
                                    scope_overlap = bool(set(failure_files) & set(last_commit_files))
                                elif not failure_files:
                                    # Cannot determine failure files - allow auto-fix (fail-open on this check)
                                    scope_overlap = True
                                    self.log("SUPERVISOR", f"[{key}] No file references in failure output - allowing auto-fix")

                                if not scope_overlap and (allowed_files or last_commit_files):
                                    self.log("SUPERVISOR", f"[{key}] Auto-fix ineligible: failure files outside allowed scope")
                                    auto_fix_eligible = False

                                if auto_fix_eligible:
                                    # Build fix description with failure context
                                    # NOTE: Do NOT include commit instructions - _invoke_claude_code handles that
                                    fix_description = f"""## AUTO-FIX REQUEST

The following auto-verify command failed. Please analyze the error and fix the code.

### Failed Command
```
{first_failure.command if first_failure else 'N/A'}
```

### Exit Code
{first_failure.exit_code if first_failure else 'N/A'}

### Failure Type
{failure_type.value if failure_type else 'UNKNOWN'}

### Error Output (stderr)
```
{(first_failure.stderr[:2000] if first_failure and first_failure.stderr else 'N/A')}
```

### Output (stdout)
```
{(first_failure.stdout[:2000] if first_failure and first_failure.stdout else 'N/A')}
```

## Instructions

1. Analyze the error output above
2. Identify the root cause of the failure
3. Make the MINIMAL changes needed to fix the issue
4. Do NOT refactor or change unrelated code

## Verification Report
Update the verification report at: {report_path}

The report MUST have all checklist items checked (- [x]) after fixing.
"""

                                    # COMMIT REQUIRED GATE: Capture HEAD before and after
                                    head_before = self.git.get_head_sha() if hasattr(self.git, 'get_head_sha') else None

                                    # Invoke IMPLEMENTER with fix prompt
                                    fix_success, fix_output, _fix_files, _fix_artifact = self._invoke_claude_code(
                                        key,
                                        f"Auto-fix: {first_failure.command if first_failure else 'verify failure'}",
                                        fix_description,
                                    )

                                    head_after = self.git.get_head_sha() if hasattr(self.git, 'get_head_sha') else None
                                    code_changed = head_before and head_after and head_before != head_after

                                    # Update auto_fix_attempts counter
                                    new_auto_fix_attempts = auto_fix_attempts + 1

                                    # COMMIT REQUIRED: If no code change, treat as failed
                                    if fix_success and not code_changed:
                                        self.log("SUPERVISOR", f"[{key}] Auto-fix reported success but no commit detected - treating as failed")
                                        fix_success = False

                                    # Update work ledger with fix attempt
                                    now_iso = datetime.now(timezone.utc).isoformat()
                                    self._upsert_work_ledger_entry(
                                        issue_key=key,
                                        issue_type="Story",
                                        status=status,
                                        last_step=LastStep.IMPLEMENTER.value,
                                        last_step_result=StepResult.SUCCESS.value if fix_success else StepResult.FAILED.value,
                                        auto_fix_attempts=new_auto_fix_attempts,
                                        last_failure_hash=new_failure_hash,
                                        last_failure_type=failure_type.value if failure_type else None,
                                        last_failure_at=now_iso,
                                        verify_last_commit_sha=head_after,
                                    )

                                    if fix_success:
                                        self.log("SUPERVISOR", f"[{key}] Auto-fix completed with commit, will re-verify on next cycle")
                                        return True  # Signal that work was done, loop will re-verify
                                    else:
                                        self.log("SUPERVISOR", f"[{key}] Auto-fix failed: {fix_output[:200] if fix_output else 'no commit detected'}")
                                        # Continue to route to human attention below

                            if not auto_fix_eligible or (auto_fix_eligible and not fix_success):
                                # Route to HUMAN ATTENTION NEEDED
                                self.log("SUPERVISOR", f"[{key}] Auto-fix ineligible/exhausted - routing to {human_attention}")

                                # Try to transition to human attention
                                names = self.jira.get_available_transition_names(key)
                                chosen = choose_human_attention_transition(names)

                                if chosen:
                                    self.jira.transition_issue(key, chosen)
                                    self.log("SUPERVISOR", f"[{key}] Transitioned to {chosen}")

                                # Create blocking escalation
                                if hasattr(self, "blocking_escalations") and self.blocking_escalations:
                                    self.blocking_escalations.load()
                                    if not self.blocking_escalations.load_error:
                                        self.blocking_escalations.upsert_active(
                                            key,
                                            f"AUTO_VERIFY_FAILED_{failure_type.value if failure_type else 'UNKNOWN'}",
                                            details=f"Command: {first_failure.command if first_failure else 'N/A'}",
                                        )
                                        self.blocking_escalations.save()

                                # Post comment
                                comment = f"""Supervisor Auto-Verify: FAILED - requires human attention

**Failed items:** {len(av_result.items_failed)}
**Failure type:** {failure_type.value if failure_type else 'UNKNOWN'}
**Auto-fix attempts:** {auto_fix_attempts}/{max_auto_fix_attempts()}
**Auto-verify cycles:** {new_verify_runs}/{max_cycles}

Evidence: `{Path(av_result.evidence_file).name if av_result.evidence_file else 'N/A'}`
Summary: `{Path(av_result.summary_file).name if av_result.summary_file else 'N/A'}`

Story transitioned to {human_attention}."""
                                self.jira.add_comment(key, comment)

                                # Update work ledger
                                now_iso = datetime.now(timezone.utc).isoformat()
                                self._upsert_work_ledger_entry(
                                    issue_key=key,
                                    issue_type="Story",
                                    status=human_attention,
                                    last_step=LastStep.VERIFY.value,
                                    last_step_result=StepResult.FAILED.value,
                                    auto_verify_runs=new_verify_runs,
                                    last_failure_hash=new_failure_hash,
                                    last_failure_type=failure_type.value if failure_type else None,
                                    last_failure_at=now_iso,
                                    verify_last_commit_sha=current_commit_sha,
                                )

                                return True

                else:
                    # Verify cycles exhausted
                    self.log("SUPERVISOR", f"[{key}] Auto-verify cycles exhausted ({auto_verify_runs}/{max_cycles}) - routing to {human_attention}")

                    # Route to HUMAN ATTENTION NEEDED
                    names = self.jira.get_available_transition_names(key)
                    chosen = choose_human_attention_transition(names)

                    if chosen:
                        self.jira.transition_issue(key, chosen)
                        self.log("SUPERVISOR", f"[{key}] Transitioned to {chosen}")

                    comment = f"""Supervisor Verification: BLOCKED - auto-verify cycles exhausted

**Auto-verify cycles:** {auto_verify_runs}/{max_cycles}

Maximum auto-verify attempts reached. Manual intervention required."""
                    self.jira.add_comment(key, comment)

                    self._upsert_work_ledger_entry(
                        issue_key=key,
                        issue_type="Story",
                        status=human_attention,
                        last_step=LastStep.VERIFY.value,
                        last_step_result=StepResult.FAILED.value,
                    )

                    return True

            # Fallback: Auto-verify not enabled or no automatable items - use original logic
            # PATCH 2: Compute verify failure state
            verify_reason = f"unchecked_items_{unchecked_count}"

            # PATCH 2: Check comment de-dup
            if _should_post_verify_comment(work_entry, verify_reason, report_hash):
                comment = f"""Supervisor Verification: INCOMPLETE - unchecked checklist items found

Report: {report_path}
Unchecked items: {unchecked_count}
Note: All checklist items must be checked (- [x]) for verification to pass."""
                self.jira.add_comment(key, comment)

            # Keep as BLOCKED or set to BLOCKED best-effort, then continue
            if status not in ("BLOCKED", "Blocked"):
                self.jira.transition_issue(key, "Blocked")

            # PATCH 2: Record verify backoff state
            verify_next_at = (datetime.now(timezone.utc).timestamp() + cooldown_seconds)
            verify_next_at_iso = datetime.fromtimestamp(verify_next_at, timezone.utc).isoformat()
            self._upsert_work_ledger_entry(
                issue_key=key,
                issue_type="Story",
                status="BLOCKED",
                last_step=LastStep.VERIFY.value,
                last_step_result=StepResult.FAILED.value,
                verify_next_at=verify_next_at_iso,
                verify_last_reason=verify_reason,
                verify_last_report_hash=report_hash,
                verify_last_report_mtime=report_mtime,
                verify_last_commented_reason=verify_reason,
                verify_last_commented_report_hash=report_hash,
            )

            return True

        # Step 2: FIXUP-1 PATCH 4: Check commit evidence from Work Ledger OR git history
        # Evidence sources (in order of precedence):
        # 1. Work Ledger last_commit_sha
        # 2. Git log --grep for commits referencing the issue key
        work_entry = self.work_ledger.get(key)
        commit_evidence = None
        commit_source = None

        if work_entry and work_entry.last_commit_sha:
            commit_evidence = work_entry.last_commit_sha[:8]
            commit_source = "work_ledger"
        else:
            # Fall back to git log search
            git_commits = self.git.find_commits_referencing(key, max_count=5)
            if git_commits:
                commit_evidence = git_commits[0]  # Most recent
                commit_source = "git_log"

        if not commit_evidence:
            # Missing commit evidence - keep/set BLOCKED
            self.log("SUPERVISOR", f"[{key}] Missing commit evidence")

            # PATCH 2: Compute verify failure state
            verify_reason = "missing_commit_evidence"

            # PATCH 2: Check comment de-dup
            if _should_post_verify_comment(work_entry, verify_reason, report_hash):
                comment = f"""Supervisor Verification: BLOCKED - missing commit evidence

Report: {report_path} (valid, checklist complete)

**Missing evidence:**
- Work Ledger entry not found OR last_commit_sha not set
- No commits found referencing {key} in git history

**What is needed:**
1. Run implementation again to create Work Ledger entry with commit SHA, OR
2. Create a commit with {key} in the commit message

Note: Story will remain BLOCKED until commit evidence is found."""
                self.jira.add_comment(key, comment)

            if status not in ("BLOCKED", "Blocked"):
                self.jira.transition_issue(key, "Blocked")

            # PATCH 2: Record verify backoff state
            verify_next_at = (datetime.now(timezone.utc).timestamp() + cooldown_seconds)
            verify_next_at_iso = datetime.fromtimestamp(verify_next_at, timezone.utc).isoformat()
            self._upsert_work_ledger_entry(
                issue_key=key,
                issue_type="Story",
                status="BLOCKED",
                last_step=LastStep.VERIFY.value,
                last_step_result=StepResult.FAILED.value,
                verify_next_at=verify_next_at_iso,
                verify_last_reason=verify_reason,
                verify_last_report_hash=report_hash,
                verify_last_report_mtime=report_mtime,
                verify_last_commented_reason=verify_reason,
                verify_last_commented_report_hash=report_hash,
            )

            return True

        # Step 3: Gate on active blocking escalations (Story-scoped, fail-closed)
        if hasattr(self, "blocking_escalations") and self.blocking_escalations:
            self.blocking_escalations.load()
            if self.blocking_escalations.has_active(key):
                verify_reason = "active_escalation"
                causes = self.blocking_escalations.active_root_causes_for(key)

                # Comment de-dup uses (reason, report_hash)
                if _should_post_verify_comment(work_entry, verify_reason, report_hash):
                    comment = f"""Supervisor Verification: BLOCKED - active escalation prevents auto-close
Report: {report_path} (valid, checklist complete)
Commit: {commit_evidence} (source: {commit_source})

Active escalation(s):
{chr(10).join([f"- {c}" for c in causes]) if causes else "- (unknown)"}

Resolution required before auto-close can proceed."""
                    self.jira.add_comment(key, comment)

                if status not in ("BLOCKED", "Blocked"):
                    self.jira.transition_issue(key, "Blocked")

                verify_next_at = (datetime.now(timezone.utc).timestamp() + cooldown_seconds)
                verify_next_at_iso = datetime.fromtimestamp(verify_next_at, timezone.utc).isoformat()
                self._upsert_work_ledger_entry(
                    issue_key=key,
                    issue_type="Story",
                    status="BLOCKED",
                    last_step=LastStep.VERIFY.value,
                    last_step_result=StepResult.FAILED.value,
                    verify_next_at=verify_next_at_iso,
                    verify_last_reason=verify_reason,
                    verify_last_report_hash=report_hash,
                    verify_last_report_mtime=report_mtime,
                    verify_last_commented_reason=verify_reason,
                    verify_last_commented_report_hash=report_hash,
                )
                return True

        # Step 4: PASSED - all evidence complete
        self.log("SUPERVISOR", f"[{key}] Verification PASSED (commit={commit_evidence} from {commit_source})")

        # Update work ledger entry to mark as verified
        self._upsert_work_ledger_entry(
            issue_key=key,
            issue_type="Story",
            status="verified",
            last_step=LastStep.VERIFY.value,
            last_step_result=StepResult.SUCCESS.value,  # FIXUP-1 PATCH 5
            verification_report_path=report_path,
        )

        # Probe available transitions
        names = self.jira.get_available_transition_names(key)
        chosen = choose_transition(names)

        transitioned = False
        if chosen is None:
            # No matching transition found
            comment = f"""Supervisor Verification: PASSED - cannot auto-transition (no matching transition found)

Report: {report_path}
Commit: {commit_evidence} (source: {commit_source})
Available transitions: {', '.join(names) if names else 'none'}"""
            self.jira.add_comment(key, comment)
            self.log("SUPERVISOR", f"[{key}] No matching transition found: {names}")

            # Create/refresh blocking escalation (idempotent)
            if hasattr(self, "blocking_escalations") and self.blocking_escalations:
                self.blocking_escalations.load()
                if not self.blocking_escalations.load_error:
                    self.blocking_escalations.upsert_active(
                        key,
                        "NO_DONE_TRANSITION",
                        details=f"Available transitions: {', '.join(names) if names else 'none'}",
                    )
        elif self.jira.transition_issue(key, chosen):
            comment = f"""Supervisor Verification: PASSED

Report: {report_path}
Commit: {commit_evidence} (source: {commit_source})
Status: Transitioned to {chosen}"""
            self.jira.add_comment(key, comment)
            self.log("SUPERVISOR", f"[{key}] Transitioned to {chosen}")
            transitioned = True

            # Auto-clear Story escalations now that Jira is Done
            if hasattr(self, "blocking_escalations") and self.blocking_escalations:
                self.blocking_escalations.load()
                if not self.blocking_escalations.load_error:
                    self.blocking_escalations.resolve_all_for_issue(key)
        else:
            comment = f"""Supervisor Verification: PASSED - auto-transition failed; manual move required

Report: {report_path}
Commit: {commit_evidence} (source: {commit_source})
Attempted transition: {chosen}"""
            self.jira.add_comment(key, comment)
            self.log("SUPERVISOR", f"[{key}] Transition to {chosen} failed")

            # Create/refresh blocking escalation (idempotent)
            if hasattr(self, "blocking_escalations") and self.blocking_escalations:
                self.blocking_escalations.load()
                if not self.blocking_escalations.load_error:
                    self.blocking_escalations.upsert_active(
                        key,
                        "DONE_TRANSITION_FAILED",
                        details=f"Attempted transition: {chosen}",
                    )

        # FIXUP-1 PATCH 4: Reconcile wiring - best-effort after story transition
        if transitioned:
            # Determine parent epic key
            parent_key = None

            # Try fields.parent.key first
            parent_field = issue.get('fields', {}).get('parent', {})
            if isinstance(parent_field, dict) and parent_field.get('key'):
                parent_key = parent_field['key']

            # Fallback: check work ledger entry
            if not parent_key and work_entry and work_entry.parentKey:
                parent_key = work_entry.parentKey

            if parent_key:
                self.log("SUPERVISOR", f"[{key}] Attempting Epic reconciliation for parent: {parent_key}")
                if self.reconcile_epic(parent_key):
                    # Epic reconciled - try to find and reconcile Idea (label mapping)
                    epic_issue = self.jira.get_issue(parent_key)
                    if epic_issue:
                        idea_key = _infer_idea_key_from_epic_issue(epic_issue)
                        if idea_key:
                            self.log("SUPERVISOR", f"[{key}] Attempting Idea reconciliation: {idea_key}")
                            self.reconcile_idea(idea_key)

        return True

    def reconcile_ready_parents(self) -> bool:
        """State-driven reconciliation sweep for Epics and Ideas.

        Runs before creating new work (decompose/intake) to prevent stuck parents.
        """
        # Reconcile Epics first (may unlock Ideas)
        epics = self.jira.get_epics_for_decomposition()
        for epic in epics or []:
            epic_key = epic.get("key", "")
            if epic_key and self.reconcile_epic(epic_key):
                return True

        # Reconcile Ideas in progress
        ideas = self.jira.get_ideas_in_progress()
        for idea in ideas or []:
            idea_key = idea.get("key", "")
            if idea_key and self.reconcile_idea(idea_key):
                return True

        return False

    def reconcile_epic(self, epic_key: str) -> bool:
        """Reconcile Epic: transition to Done if all child Stories are resolved.

        FIXUP-2 PATCH 1: Contract-driven + loop-proof Epic reconciliation.

        Guards:
        - Issuetype-authoritative: fail-closed if not in ENGINEO_CONTRACT_EPIC_ISSUE_TYPES
        - Already Done guard: no-op if Epic already Done
        - Decomposition contract: must have evidence (manifest, fingerprint, or skip) - auto-records skip if children exist
        - Child status evaluation: uses _is_terminal_child_status() (configurable)
        - Reconcile backoff: uses _should_attempt_reconcile() (fingerprint-based loop guard)
        - Comment de-dup: uses _should_post_reconcile_comment() (avoids duplicate comments)

        Returns: True if Epic was reconciled, False otherwise.
        """
        # === GUARD 1: Issuetype-authoritative check ===
        epic_issue = self.jira.get_issue(epic_key)
        if not epic_issue:
            self.log("SUPERVISOR", f"[{epic_key}] RECONCILE skip: could not fetch issue from Jira")
            return False

        issue_type_name = (epic_issue.get("fields", {}).get("issuetype", {}) or {}).get("name", "")
        epic_types = {t.lower() for t in _contract_epic_issue_types()}
        if issue_type_name.lower() not in epic_types:
            self.log("SUPERVISOR", f"[{epic_key}] RECONCILE skip: issuetype '{issue_type_name}' not in contract epic types")
            return False

        # PATCH 4: Key prefix sanity check (warning only, continue processing)
        epic_prefix = _contract_epic_key_prefix()
        if not epic_key.startswith(epic_prefix):
            self.log("SUPERVISOR", f"[{epic_key}] WARNING: Epic key does not start with expected prefix '{epic_prefix}'")

        # === GUARD 2: Already Done guard ===
        epic_status = epic_issue.get("fields", {}).get("status", {}) or {}
        epic_status_name = epic_status.get("name", "")
        epic_status_category = (epic_status.get("statusCategory", {}) or {}).get("name", "")
        if _is_done_status(epic_status_name, epic_status_category):
            self.log("SUPERVISOR", f"[{epic_key}] RECONCILE skip: already Done ({epic_status_name})")
            return False

        # === GUARD 3: Get children FIRST (needed for decomposition auto-skip) ===
        children = self.jira.get_children_for_epic(epic_key)

        if not children:
            self.log("SUPERVISOR", f"[{epic_key}] RECONCILE skip: no child stories found")
            return False

        # === GUARD 4: Decomposition contract enforcement (with auto-skip for legacy Epics) ===
        manifest_store = DecompositionManifestStore(self.config.repo_path, manifest_dir=_artifact_dirname())
        manifest = manifest_store.load(epic_key)
        work_entry = self.work_ledger.get(epic_key)

        has_manifest = manifest is not None
        has_fingerprint = work_entry and work_entry.decomposition_fingerprint
        has_skip_evidence = work_entry and work_entry.decomposition_skipped_at

        now_iso = datetime.now(timezone.utc).isoformat()

        # Auto-record skip evidence for legacy Epics with children but no decomposition artifacts
        if not (has_manifest or has_fingerprint or has_skip_evidence):
            # Children exist but no decomposition evidence - record skip evidence and continue
            self.log("SUPERVISOR", f"[{epic_key}] Auto-recording decomposition skip (children exist, no artifacts)")
            self._upsert_work_ledger_entry(
                issue_key=epic_key,
                issue_type=issue_type_name,
                status=epic_status_name,
                last_step=LastStep.SUPERVISOR.value,
                decomposition_skipped_at=now_iso,
                decomposition_skip_reason="auto_skip_children_exist_no_decomposition_artifacts",
            )
            # Refresh work_entry after upsert
            work_entry = self.work_ledger.get(epic_key)
            has_skip_evidence = True

        # === GUARD 5: Check terminal status of all children ===
        non_terminal_children = []
        child_statuses = []  # For fingerprint computation
        for child in children:
            child_key = child.get('key', '')
            child_status = child.get('fields', {}).get('status', {}) or {}
            child_status_name = child_status.get('name', '')
            child_status_category = (child_status.get('statusCategory', {}) or {}).get('name', '')

            child_statuses.append(f"{child_key}:{child_status_name}:{child_status_category}")

            if not _is_terminal_child_status(child_status_name, child_status_category):
                non_terminal_children.append((child_key, child_status_name))

        if non_terminal_children:
            unresolved_str = ', '.join([f"{k}({s})" for k, s in non_terminal_children[:3]])
            self.log("SUPERVISOR", f"[{epic_key}] RECONCILE skip: {len(non_terminal_children)} non-terminal children: {unresolved_str}")
            return False

        # === GUARD 6: Reconcile backoff (fingerprint-based loop guard) ===
        # Compute deterministic fingerprint from current Jira truth (includes Epic status + decomposition flag)
        decomp_flag = "D" if (has_manifest or has_fingerprint or has_skip_evidence) else "N"
        fingerprint_data = f"{epic_status_name}:{epic_status_category}:{decomp_flag}|" + "|".join(sorted(child_statuses))
        reconcile_fingerprint = hashlib.sha256(fingerprint_data.encode('utf-8')).hexdigest()

        should_attempt, attempt_reason = _should_attempt_reconcile(work_entry, reconcile_fingerprint)
        if not should_attempt:
            self.log("SUPERVISOR", f"[{epic_key}] RECONCILE skip: backoff active ({attempt_reason})")
            return False

        # === All guards passed: attempt reconciliation ===
        self.log("SUPERVISOR", f"[{epic_key}] All {len(children)} children terminal, attempting reconciliation")

        # Build evidence comment
        child_evidence = []
        for child in children:
            child_key = child.get('key', '')
            child_status = child.get('fields', {}).get('status', {}).get('name', '')
            child_entry = self.work_ledger.get(child_key)
            if child_entry and child_entry.verification_report_path:
                child_evidence.append(f"- {child_key}: {child_status} (report: {child_entry.verification_report_path})")
            elif child_entry and child_entry.last_commit_sha:
                child_evidence.append(f"- {child_key}: {child_status} (commit: {child_entry.last_commit_sha[:8]})")
            else:
                child_evidence.append(f"- {child_key}: {child_status}")

        # Attempt transition (fail-closed: only known-safe transitions)
        names = self.jira.get_available_transition_names(epic_key)
        chosen = choose_transition(names)

        if chosen and self.jira.transition_issue(epic_key, chosen):
            # Success: transition completed
            comment = f"""Epic Reconciliation: COMPLETE

All {len(children)} child stories resolved:
{chr(10).join(child_evidence)}

Transitioned to: {chosen}"""

            # Comment de-dup check
            if _should_post_reconcile_comment(work_entry, "COMPLETE", reconcile_fingerprint):
                self.jira.add_comment(epic_key, comment)

            self.log("SUPERVISOR", f"[{epic_key}] Transitioned to {chosen}")

            # Update work ledger with success
            self._upsert_work_ledger_entry(
                issue_key=epic_key,
                issue_type=issue_type_name,
                status=chosen,
                last_step=LastStep.RECONCILE.value,
                last_step_result=StepResult.SUCCESS.value,
            )
            # Clear reconcile backoff on success
            entry = self.work_ledger.get(epic_key)
            if entry:
                entry.reconcile_next_at = None
                entry.reconcile_last_reason = None
                entry.reconcile_last_fingerprint = None
                entry.reconcile_last_commented_reason = "COMPLETE"
                entry.reconcile_last_commented_fingerprint = reconcile_fingerprint
                self.work_ledger.upsert(entry)
                self.work_ledger.save()

            return True
        else:
            # Transition unavailable - set backoff and record failure
            reason = "transition_unavailable"
            comment = f"""Epic Reconciliation: All children resolved but transition unavailable

All {len(children)} child stories resolved:
{chr(10).join(child_evidence)}

Available transitions: {', '.join(names) if names else 'none'}
Manual transition required."""

            # Comment de-dup check
            if _should_post_reconcile_comment(work_entry, reason, reconcile_fingerprint):
                self.jira.add_comment(epic_key, comment)

            # Update work ledger with failure and set backoff
            self._upsert_work_ledger_entry(
                issue_key=epic_key,
                issue_type=issue_type_name,
                status="pending_transition",
                last_step=LastStep.RECONCILE.value,
                last_step_result=StepResult.FAILED.value,
            )
            # Set reconcile backoff using unified cooldown knob
            next_at = datetime.now(timezone.utc) + timedelta(seconds=self.reconcile_cooldown_seconds)

            entry = self.work_ledger.get(epic_key)
            if entry:
                entry.reconcile_next_at = next_at.isoformat()
                entry.reconcile_last_reason = reason
                entry.reconcile_last_fingerprint = reconcile_fingerprint
                entry.reconcile_last_commented_reason = reason
                entry.reconcile_last_commented_fingerprint = reconcile_fingerprint
                self.work_ledger.upsert(entry)
                self.work_ledger.save()

            self.log("SUPERVISOR", f"[{epic_key}] Reconcile failed: {reason}")
            return False

    def reconcile_idea(self, idea_key: str) -> bool:
        """Reconcile Idea: transition if all child Epics are Done.

        FIXUP-2 PATCH 2: Contract-driven + loop-proof Idea reconciliation.

        Guards:
        - Issuetype-authoritative: fail-closed if not in ENGINEO_CONTRACT_IDEA_ISSUE_TYPES
        - Already Done guard: no-op if Idea already Done
        - At least one Epic required: prevents empty closure
        - Child Epic status: ALL Epics must be Done (not just terminal)
        - Child Epic decomposition: ALL Epics must have decomposition evidence
        - Reconcile backoff: uses _should_attempt_reconcile() (fingerprint-based loop guard)
        - Comment de-dup: uses _should_post_reconcile_comment() (avoids duplicate comments)

        Returns: True if Idea was reconciled, False otherwise.
        """
        # === GUARD 1: Issuetype-authoritative check ===
        idea_issue = self.jira.get_issue(idea_key)
        if not idea_issue:
            self.log("SUPERVISOR", f"[{idea_key}] RECONCILE skip: could not fetch issue from Jira")
            return False

        issue_type_name = (idea_issue.get("fields", {}).get("issuetype", {}) or {}).get("name", "")
        idea_types = {t.lower() for t in _contract_idea_issue_types()}
        if issue_type_name.lower() not in idea_types:
            self.log("SUPERVISOR", f"[{idea_key}] RECONCILE skip: issuetype '{issue_type_name}' not in contract idea types")
            return False

        # === GUARD 2: Already Done guard ===
        idea_status = idea_issue.get("fields", {}).get("status", {}) or {}
        idea_status_name = idea_status.get("name", "")
        idea_status_category = (idea_status.get("statusCategory", {}) or {}).get("name", "")
        if _is_done_status(idea_status_name, idea_status_category):
            self.log("SUPERVISOR", f"[{idea_key}] RECONCILE skip: already Done ({idea_status_name})")
            return False

        # === GUARD 3: Get child Epics (at least one required) ===
        epics = self.jira.get_epics_for_idea(idea_key)

        if not epics:
            self.log("SUPERVISOR", f"[{idea_key}] RECONCILE skip: no child Epics found")
            return False

        # === GUARD 4: ALL Epics must be Done (not just terminal) ===
        work_entry = self.work_ledger.get(idea_key)
        manifest_store = DecompositionManifestStore(self.config.repo_path, manifest_dir=_artifact_dirname())

        non_done_epics = []
        epics_missing_decomp = []
        epic_statuses = []  # For fingerprint computation
        now_iso = datetime.now(timezone.utc).isoformat()

        for epic in epics:
            epic_key = epic.get('key', '')
            epic_status = epic.get('fields', {}).get('status', {}) or {}
            epic_status_name = epic_status.get('name', '')
            epic_status_category = (epic_status.get('statusCategory', {}) or {}).get('name', '')

            # Check decomposition evidence for this Epic
            epic_manifest = manifest_store.load(epic_key)
            epic_entry = self.work_ledger.get(epic_key)
            has_manifest = epic_manifest is not None
            has_fingerprint = epic_entry and epic_entry.decomposition_fingerprint
            has_skip_evidence = epic_entry and epic_entry.decomposition_skipped_at
            has_decomp_evidence = has_manifest or has_fingerprint or has_skip_evidence

            # === PATCH 3: Inferred evidence for Done Epics missing decomposition ===
            # If Epic is Done but missing evidence, try to infer from resolved children
            is_epic_done = _is_done_status(epic_status_name, epic_status_category)
            if is_epic_done and not has_decomp_evidence:
                # Attempt inferred evidence: check if all children are terminal
                epic_children = self.jira.get_children_for_epic(epic_key)
                if epic_children:
                    all_children_terminal = True
                    for child in epic_children:
                        child_status = child.get('fields', {}).get('status', {}) or {}
                        child_status_name = child_status.get('name', '')
                        child_status_category = (child_status.get('statusCategory', {}) or {}).get('name', '')
                        if not _is_terminal_child_status(child_status_name, child_status_category):
                            all_children_terminal = False
                            break

                    if all_children_terminal:
                        # Backfill durable marker on Epic ledger
                        self.log("SUPERVISOR", f"[{epic_key}] Inferred decomposition evidence from {len(epic_children)} resolved children")
                        if not epic_entry:
                            # Create entry for Epic
                            epic_entry = WorkLedgerEntry(issueKey=epic_key, issueType="Epic")
                        epic_entry.decomposition_skipped_at = now_iso
                        epic_entry.decomposition_skip_reason = "inferred_from_resolved_children"
                        self.work_ledger.upsert(epic_entry)
                        self.work_ledger.save()
                        # Mark as having evidence for this run
                        has_decomp_evidence = True

            # Include decomposition flag in fingerprint
            decomp_flag = "D" if has_decomp_evidence else "N"
            epic_statuses.append(f"{epic_key}:{epic_status_name}:{epic_status_category}:{decomp_flag}")

            # Contract: Epics must be Done (not just terminal)
            if not _is_done_status(epic_status_name, epic_status_category):
                non_done_epics.append((epic_key, epic_status_name))

            # Contract: Each Epic must have decomposition evidence
            if not has_decomp_evidence:
                epics_missing_decomp.append(epic_key)

        # === GUARD 5: Check if all Epics are Done ===
        if non_done_epics:
            unresolved_str = ', '.join([f"{k}({s})" for k, s in non_done_epics[:3]])
            self.log("SUPERVISOR", f"[{idea_key}] RECONCILE skip: {len(non_done_epics)} Epics not Done: {unresolved_str}")
            return False

        # === GUARD 6: Check if all Epics have decomposition evidence ===
        # Compute fingerprint for backoff check
        reconcile_fingerprint = hashlib.sha256(
            "|".join(sorted(epic_statuses)).encode('utf-8')
        ).hexdigest()

        if epics_missing_decomp:
            reason = "child_epic_missing_decomposition"
            missing_str = ', '.join(epics_missing_decomp[:5])
            self.log("SUPERVISOR", f"[{idea_key}] RECONCILE skip: Epics missing decomposition evidence: {missing_str}")

            # Post deduped comment about blocking Epics
            comment = f"""Idea Reconciliation: BLOCKED

The following child Epics are missing decomposition evidence:
{chr(10).join([f'- {k}' for k in epics_missing_decomp])}

Each Epic must have a decomposition manifest, fingerprint, or explicit skip record before the Idea can be reconciled."""

            if _should_post_reconcile_comment(work_entry, reason, reconcile_fingerprint):
                self.jira.add_comment(idea_key, comment)

            # Set backoff with reason
            next_at = datetime.now(timezone.utc) + timedelta(seconds=self.reconcile_cooldown_seconds)

            # Ensure work_entry exists for backoff
            if not work_entry:
                self._upsert_work_ledger_entry(
                    issue_key=idea_key,
                    issue_type=issue_type_name,
                    status=idea_status_name,
                    last_step=LastStep.RECONCILE.value,
                    last_step_result=StepResult.FAILED.value,
                )
                work_entry = self.work_ledger.get(idea_key)

            if work_entry:
                work_entry.reconcile_next_at = next_at.isoformat()
                work_entry.reconcile_last_reason = reason
                work_entry.reconcile_last_fingerprint = reconcile_fingerprint
                work_entry.reconcile_last_commented_reason = reason
                work_entry.reconcile_last_commented_fingerprint = reconcile_fingerprint
                self.work_ledger.upsert(work_entry)
                self.work_ledger.save()

            return False

        # === GUARD 7: Reconcile backoff (fingerprint-based loop guard) ===
        should_attempt, attempt_reason = _should_attempt_reconcile(work_entry, reconcile_fingerprint)
        if not should_attempt:
            self.log("SUPERVISOR", f"[{idea_key}] RECONCILE skip: backoff active ({attempt_reason})")
            return False

        # === All guards passed: attempt reconciliation ===
        self.log("SUPERVISOR", f"[{idea_key}] All {len(epics)} child Epics Done with decomposition evidence, attempting reconciliation")

        # Attempt transition (fail-closed: only known-safe transitions)
        names = self.jira.get_available_transition_names(idea_key)
        chosen = choose_transition(names)

        if chosen and self.jira.transition_issue(idea_key, chosen):
            # Success: transition completed
            epic_list = '\n'.join([f"- {e.get('key', '')}: {e.get('fields', {}).get('status', {}).get('name', '')}" for e in epics])
            comment = f"""Idea Reconciliation: COMPLETE

All {len(epics)} child Epics resolved with decomposition evidence:
{epic_list}

Transitioned to: {chosen}"""

            # Comment de-dup check
            if _should_post_reconcile_comment(work_entry, "COMPLETE", reconcile_fingerprint):
                self.jira.add_comment(idea_key, comment)

            self.log("SUPERVISOR", f"[{idea_key}] Transitioned to {chosen}")

            # Update work ledger with success
            self._upsert_work_ledger_entry(
                issue_key=idea_key,
                issue_type=issue_type_name,
                status=chosen,
                last_step=LastStep.RECONCILE.value,
                last_step_result=StepResult.SUCCESS.value,
            )
            # Clear reconcile backoff on success
            entry = self.work_ledger.get(idea_key)
            if entry:
                entry.reconcile_next_at = None
                entry.reconcile_last_reason = None
                entry.reconcile_last_fingerprint = None
                entry.reconcile_last_commented_reason = "COMPLETE"
                entry.reconcile_last_commented_fingerprint = reconcile_fingerprint
                self.work_ledger.upsert(entry)
                self.work_ledger.save()

            return True
        else:
            # Transition unavailable - set backoff and record failure
            reason = "transition_unavailable"
            comment = f"""Idea Reconciliation: All Epics Done but no matching transition found

Available transitions: {', '.join(names) if names else 'none'}"""

            # Comment de-dup check
            if _should_post_reconcile_comment(work_entry, reason, reconcile_fingerprint):
                self.jira.add_comment(idea_key, comment)

            # Update work ledger with failure and set backoff
            self._upsert_work_ledger_entry(
                issue_key=idea_key,
                issue_type=issue_type_name,
                status="",
                last_step=LastStep.RECONCILE.value,
                last_step_result=StepResult.FAILED.value,
            )
            # Set reconcile backoff using unified cooldown knob
            next_at = datetime.now(timezone.utc) + timedelta(seconds=self.reconcile_cooldown_seconds)

            entry = self.work_ledger.get(idea_key)
            if entry:
                entry.reconcile_next_at = next_at.isoformat()
                entry.reconcile_last_reason = reason
                entry.reconcile_last_fingerprint = reconcile_fingerprint
                entry.reconcile_last_commented_reason = reason
                entry.reconcile_last_commented_fingerprint = reconcile_fingerprint
                self.work_ledger.upsert(entry)
                self.work_ledger.save()

            self.log("SUPERVISOR", f"[{idea_key}] Reconcile failed: {reason}")
            return False

    def step_4_story_verification(self) -> bool:
        """Supervisor: Verify completed Stories and Bugs.

        PATCH 1-D: Real verification flow with ledger gate and auto-transition.
        """
        self.log("SUPERVISOR", "STEP 4: Checking for work items awaiting verification...")

        items = self.jira.get_work_items_in_progress()

        if not items:
            self.log("SUPERVISOR", "No Stories/Bugs in 'In Progress' status")
            return False

        self.log("SUPERVISOR", f"Found {len(items)} work items in 'In Progress' status")

        any_action = False
        for item in items:
            if self.verify_work_item(item):
                any_action = True

        return any_action

    def escalate(self, role: str, title: str, details: str):
        """Human escalation"""
        date_str = datetime.now().strftime('%Y-%m-%d')
        subject = f"[ACTION REQUIRED][EngineO][{role}] {title} {date_str}"

        body = f"""
AUTONOMOUS MULTI-PERSONA EXECUTION SYSTEM - HUMAN ESCALATION

Role: {role}
Issue: {title}
Timestamp: {datetime.now(timezone.utc).isoformat()}

DETAILS:
{details}

---
This is an automated escalation from the EngineO Autonomous Execution Engine.
"""

        self.log("SUPERVISOR", f"ESCALATION: {title}")
        self.email.send_escalation(subject, body)

    def process_issue(self, issue_key: str) -> bool:
        """Process a specific issue by key, determining the appropriate persona based on issue type"""
        self.log("SUPERVISOR", f"Processing specific issue: {issue_key}")

        # Get the issue details
        issue = self.jira.get_issue(issue_key)
        if not issue:
            self.log("SUPERVISOR", f"Issue {issue_key} not found")
            return False

        issue_type = issue['fields']['issuetype']['name'].lower()
        summary = issue['fields']['summary']
        status = issue['fields']['status']['name']

        self.log("SUPERVISOR", f"Issue: [{issue_key}] {summary}")
        self.log("SUPERVISOR", f"Type: {issue_type}, Status: {status}")

        dispatch_kind = resolve_dispatch_kind(issue_type)

        if dispatch_kind == 'initiative':
            # UEP processes Ideas/Initiatives
            return self._process_idea(issue)
        elif dispatch_kind == 'epic':
            # Supervisor decomposes Epics
            return self._process_epic(issue)
        elif dispatch_kind == 'implement':
            # Developer implements Stories and Bugs (same pipeline)
            return self._process_story(issue)
        else:
            self.log("SUPERVISOR", f"Unknown issue type: {issue_type}")
            return False

    def _process_idea(self, issue: dict) -> bool:
        """UEP: Process a specific Idea (uses enhanced analysis).

        PATCH C: Idempotent Idea->Epic mapping to prevent duplicate Epics.
        """
        key = issue['key']
        ea_key = key  # Alias for EA-* key used throughout this function
        summary = issue['fields']['summary']
        description = self.jira.parse_adf_to_text(issue['fields'].get('description', {}))
        ea_label = self._ea_label(ea_key)

        self.log("UEP", f"Processing Idea: [{ea_key}] {summary}")

        # Guardrails v1: Check for existing Epic
        ledger_entry = self.state.get('ea_to_kan', {}).get(ea_key, {})
        existing_epic = ledger_entry.get('epic')

        if not existing_epic:
            existing_epic = self._find_or_reuse_epic_for_ea(ea_key)

        if existing_epic:
            self.log("UEP", f"Reusing existing Epic: {existing_epic}")
            if ea_key not in self.state['ea_to_kan']:
                self.state['ea_to_kan'][ea_key] = {}
            self.state['ea_to_kan'][ea_key]['epic'] = existing_epic
            self.state['ea_to_kan'][ea_key]['updatedAt'] = datetime.now(timezone.utc).isoformat()
            self._save_state_ledger()

            self.jira.transition_issue(ea_key, 'In Progress')
            self.jira.add_comment(ea_key, f"""
Initiative processed by UEP (Unified Executive Persona)

**Reused existing Epic:** {existing_epic}
**EA Label:** {ea_label}

*Guardrails v1: Idempotent processing*
""")
            return True

        # PATCH C: Check Work Ledger for existing epic children first
        ledger_entry = self.work_ledger.get(key)
        if ledger_entry and ledger_entry.children:
            existing_epic_keys = ledger_entry.children
            self.log("UEP", f"[{key}] Found {len(existing_epic_keys)} existing Epic(s) in Work Ledger")

            # Resume existing epics - don't create duplicates
            self.jira.transition_issue(key, 'In Progress')
            epic_list = '\n'.join([f"- {e}" for e in existing_epic_keys])
            self.jira.add_comment(key, f"""Resuming existing Epic(s) for Idea {key}

Found {len(existing_epic_keys)} Epic(s) in Work Ledger:
{epic_list}

No new Epics created (idempotency check).
""")
            return True

        # PATCH C: Search Jira for existing mapped epics
        self.log("UEP", f"[{key}] Searching Jira for existing mapped Epics...")
        try:
            existing_epics = self.jira.find_epics_for_idea(key)
        except Exception as e:
            # PATCH C: Fail-closed - if Jira search errors, don't create epics
            self.log("UEP", f"[{key}] FAIL-CLOSED: Jira search error - {e}")
            self.jira.add_comment(key, f"""## Epic creation BLOCKED

Jira search failed while checking for existing Epics.
Error: {str(e)[:200]}

**ACTION REQUIRED:** Investigate Jira API error before retrying.
No Epics created to avoid potential duplicates.

---
*Status: BLOCKED - Jira search error*
""")
            self.escalate("UEP", f"Idea {key} blocked - Jira search error", str(e))
            return True  # Handled, but blocked

        if existing_epics:
            # PATCH C: Found existing epics - persist mapping and resume
            existing_epic_keys = [e['key'] for e in existing_epics]
            self.log("UEP", f"[{key}] Found {len(existing_epic_keys)} existing Epic(s) in Jira")

            # Update Work Ledger with mapping
            self._upsert_work_ledger_entry(
                issue_key=key,
                issue_type="Idea",
                status="In Progress",
                last_step=LastStep.UEP.value,
                last_step_result=StepResult.SUCCESS.value,
                children=existing_epic_keys,
            )

            self.jira.transition_issue(key, 'In Progress')
            epic_list = '\n'.join([f"- {e['key']}: {e['fields']['summary']}" for e in existing_epics])
            self.jira.add_comment(key, f"""Resuming existing Epic(s) for Idea {key}

Found {len(existing_epic_keys)} Epic(s) in Jira:
{epic_list}

No new Epics created (idempotency check).
""")
            return True

        # PATCH C: No existing epics found - create new ones with mapping label
        self.log("UEP", "Analyzing initiative to define business intent...")

        # Use enhanced UEP analysis
        epics_to_create = self._uep_analyze_idea(key, summary, description)

        # PATCH C: Define mapping label for Idea->Epic tracking
        mapping_label = f"engineo-idea-{key}"

        created_epics = []
        for epic_def in epics_to_create:
            # PATCH C: Include mapping label when creating epic
            epic_key = self.jira.create_epic(
                epic_def['summary'],
                epic_def['description'],
                labels=[mapping_label],  # PATCH C: Add mapping label
            )
            if epic_key:
                self.log("UEP", f"Created Epic: {epic_key} (label: {mapping_label})")
                created_epics.append(epic_key)

        if created_epics:
            # PATCH C: Persist Idea->Epic mapping to Work Ledger
            self._upsert_work_ledger_entry(
                issue_key=key,
                issue_type="Idea",
                status="In Progress",
                last_step=LastStep.UEP.value,
                last_step_result=StepResult.SUCCESS.value,
                children=created_epics,
            )

            self.jira.transition_issue(key, 'In Progress')
            epic_list = '\n'.join([f"- {e}" for e in created_epics])
            self.jira.add_comment(key, f"""Initiative processed by UEP

**Created new Epic:** {epic_key}
**EA Label:** {ea_label}

Mapping label: {mapping_label}
Business Intent Defined - Ready for Supervisor decomposition.

*Guardrails v1: Epic created with source label*
""")
            return True

        return False

    def _process_epic(self, issue: dict) -> bool:
        """Supervisor: Decompose a specific Epic into Stories (uses enhanced analysis)

        PATCH 3: Uses decomposition manifest for idempotency and delta mode.
        """
        key = issue['key']
        epic_key = key  # Alias for KAN-* Epic key used throughout this function
        summary = issue['fields']['summary']
        description = self.jira.parse_adf_to_text(issue['fields'].get('description', {}))
        status = issue['fields']['status']['name']

        # Extract EA key from Epic summary for ledger tracking (e.g., "[EA-52] Title" -> "EA-52")
        ea_key = _infer_idea_key_from_epic_issue(issue)

        self.log("SUPERVISOR", f"Decomposing Epic: [{key}] {summary}")

        # GOVERNANCE: Supervisor must STOP if UEP intent contract is missing
        if not _epic_has_required_uep_intent_contract(description):
            self.log("SUPERVISOR", f"GOVERNANCE: Epic {key} missing UEP intent contract (SCOPE CLASS, ALLOWED ROOTS, DIFF BUDGET, VERIFICATION REQUIRED)")
            self.jira.add_comment(key, """
**GOVERNANCE HOLD: Missing UEP Intent Contract**

This Epic cannot be decomposed because it lacks required intent contract markers:
- SCOPE CLASS: (required)
- ALLOWED ROOTS: (required)
- DIFF BUDGET: (required)
- VERIFICATION REQUIRED: (required)
- At least one checklist item `- [ ]` or `- [x]` (required)

The UEP must update this Epic with the complete intent contract before Supervisor can proceed.
No guessing or speculation will be performed.

*Governance v3.3 - Role contract enforcement*
""")
            self.escalate("SUPERVISOR", "Missing UEP Intent Contract", f"Epic {key} lacks required intent contract markers. UEP must update before decomposition.")
            return False

        # PATCH 3: Initialize manifest store
        manifest_store = DecompositionManifestStore(self.config.repo_path, manifest_dir=_artifact_dirname())

        # PATCH 3: Check manifest and fingerprint to determine decomposition mode
        should_decomp, mode, manifest = should_decompose(manifest_store, key, description)

        # Get existing stories from Jira
        existing_stories = self.jira.get_implement_stories_for_epic(key)
        existing_summaries = [s['fields']['summary'] for s in existing_stories]
        existing_keys = [s['key'] for s in existing_stories]

        if mode == "skip":
            # Manifest exists and fingerprint unchanged
            self.log("SUPERVISOR", f"[{key}] Skipping decomposition: fingerprint unchanged")

            # Still update manifest with any new Jira keys
            for story in existing_stories:
                child = manifest.find_child_by_intent(story['fields']['summary'])
                if child and child.key is None:
                    child.key = story['key']
            manifest_store.save(manifest)

            if existing_stories:
                story_list = '\n'.join([f"- {s['key']}: {s['fields']['summary']}" for s in existing_stories])
                self.jira.add_comment(key, f"""
Epic decomposition already complete (fingerprint unchanged).

Existing {len(existing_stories)} implement-story(ies):
{story_list}

No new stories created.
""")
            return True

        if mode == "delta":
            self.log("SUPERVISOR", f"[{key}] Delta mode: fingerprint changed, checking for missing stories")

        # PATCH 3: Analyze and generate stories
        self.log("SUPERVISOR", "Analyzing codebase to identify implementation targets...")

        # Use enhanced Supervisor analysis (fail-closed on non-actionable/placeholder output).
        try:
            stories_to_create = self._supervisor_analyze_epic(epic_key, summary, description)
        except NonActionablePatchBatchError as e:
            reason = str(e) or "Supervisor output is non-actionable (placeholder/TODO/template detected)."
            input_fp = compute_decomposition_fingerprint(description)
            error_text = f"PATCH_BATCH_NON_ACTIONABLE[{input_fp[:12]}]: {reason}"
            error_fp = compute_error_fingerprint(LastStep.SUPERVISOR.value, error_text)

            existing_entry = self.work_ledger.get(key)
            should_notify = not (existing_entry and existing_entry.last_error_fingerprint == error_fp)

            if should_notify:
                self.jira.add_comment(key, f"""## BLOCKED FOR REVIEW — Non-Actionable Supervisor Output

Supervisor output is non-actionable (placeholder/TODO/template detected).

**Reason:** {reason}

**Governance invariant:** Placeholder PATCH BATCH is treated as NON-EXISTENT.
- No placeholder patch artifacts will be written to disk.
- Implementer will not be invoked for this ticket.

**Next step:** Human must provide concrete diffs or clarify target files/intent so Supervisor can produce exact ---OLD---/---NEW--- blocks.
""")
                self.escalate(
                    "SUPERVISOR",
                    "Supervisor output is non-actionable (placeholder/TODO/template detected).",
                    f"{key}: {reason}",
                )

            self.jira.transition_issue(key, contract_human_review_status())

            self._upsert_work_ledger_entry(
                issue_key=key,
                issue_type="Epic",
                status=status,
                last_step=LastStep.SUPERVISOR.value,
                last_step_result=StepResult.FAILED.value,
                error_text=error_text,
            )
            return True

        # PATCH 3: Filter to only create missing stories (delta mode)
        stories_actually_needed = []
        for story_def in stories_to_create:
            story_summary = story_def['summary']

            # Check if story already exists in Jira
            intent_id = compute_intent_id(story_summary)
            exists_in_jira = any(compute_intent_id(s) == intent_id for s in existing_summaries)

            if exists_in_jira:
                self.log("SUPERVISOR", f"[{key}] Skipping existing story: {story_summary[:50]}...")
                continue

            # Check if story is in manifest with a key
            child = manifest.find_child_by_intent(story_summary)
            if child and child.key:
                self.log("SUPERVISOR", f"[{key}] Skipping (manifest has key): {story_summary[:50]}...")
                continue

            stories_actually_needed.append(story_def)

            # Add to manifest
            if child is None:
                manifest.add_child(story_summary)

        # PATCH A: Track story creation success/failure for PATCH B
        created_stories = []
        failed_stories = []

        for story_def in stories_actually_needed:
            # PATCH A: Write patch batch to artifact file BEFORE story creation
            patch_batch_text = story_def.get('patch_batch_text', '')

            # GOVERNANCE: Placeholder PATCH BATCH == NON-EXISTENT (hard stop).
            if not patch_batch_text or _patch_batch_is_placeholder(patch_batch_text):
                reason = "Supervisor output is non-actionable (placeholder/TODO/template detected)."
                input_fp = compute_decomposition_fingerprint(description)
                error_text = f"PATCH_BATCH_NON_ACTIONABLE[{input_fp[:12]}]: {reason}"
                error_fp = compute_error_fingerprint(LastStep.SUPERVISOR.value, error_text)
                existing_entry = self.work_ledger.get(key)
                should_notify = not (existing_entry and existing_entry.last_error_fingerprint == error_fp)

                if should_notify:
                    self.jira.add_comment(key, f"""## BLOCKED FOR REVIEW — Non-Actionable Supervisor Output

Supervisor output is non-actionable (placeholder/TODO/template detected).

**Reason:** {reason}

**Governance invariant:** Placeholder PATCH BATCH is treated as NON-EXISTENT.
- No placeholder patch artifacts will be written to disk.
- Implementer will not be invoked for this ticket.
""")
                    self.escalate(
                        "SUPERVISOR",
                        "Supervisor output is non-actionable (placeholder/TODO/template detected).",
                        f"{key}: {reason}",
                    )

                self.jira.transition_issue(key, contract_human_review_status())
                self._upsert_work_ledger_entry(
                    issue_key=key,
                    issue_type="Epic",
                    status=status,
                    last_step=LastStep.SUPERVISOR.value,
                    last_step_result=StepResult.FAILED.value,
                    error_text=error_text,
                )
                return True

            try:
                epic_artifact_path, _ = _write_patch_batch_artifact(
                    self.config.repo_path, key, self.run_id, patch_batch_text
                )
                self.log("SUPERVISOR", f"Wrote patch batch artifact: {epic_artifact_path}")
            except (ValueError, OSError) as e:
                reason = f"Supervisor output is non-actionable (failed to persist a valid PATCH BATCH artifact: {e})."
                input_fp = compute_decomposition_fingerprint(description)
                error_text = f"PATCH_BATCH_NON_ACTIONABLE[{input_fp[:12]}]: {reason}"
                error_fp = compute_error_fingerprint(LastStep.SUPERVISOR.value, error_text)
                existing_entry = self.work_ledger.get(key)
                should_notify = not (existing_entry and existing_entry.last_error_fingerprint == error_fp)

                if should_notify:
                    self.jira.add_comment(key, f"""## BLOCKED FOR REVIEW — Non-Actionable Supervisor Output

Supervisor output is non-actionable (placeholder/TODO/template detected).

**Reason:** {reason}

**Governance invariant:** Placeholder PATCH BATCH is treated as NON-EXISTENT.
- No placeholder patch artifacts will be written to disk.
- Implementer will not be invoked for this ticket.
""")
                    self.escalate(
                        "SUPERVISOR",
                        "Supervisor output is non-actionable (placeholder/TODO/template detected).",
                        f"{key}: {reason}",
                    )

                self.jira.transition_issue(key, contract_human_review_status())
                self._upsert_work_ledger_entry(
                    issue_key=key,
                    issue_type="Epic",
                    status=status,
                    last_step=LastStep.SUPERVISOR.value,
                    last_step_result=StepResult.FAILED.value,
                    error_text=error_text,
                )
                return True

            # PATCH A: Use create_story_with_retry for CONTENT_LIMIT_EXCEEDED handling
            artifacts_dir = _artifact_dirname()
            story_key = self.jira.create_story_with_retry(
                story_def['summary'],
                story_def['description'],
                epic_key=key,
                patch_batch_file_path=f"{artifacts_dir}/{{STORY_KEY}}-patch-batch.md",
                verification_path=f"{artifacts_dir}/{{STORY_KEY}}-verification.md",
            )

            if story_key:
                self.log("SUPERVISOR", f"Created Story: {story_key}")
                created_stories.append(story_key)

                # PATCH 1: Create verification report skeleton for the story
                skeleton_created, skeleton_path = _ensure_verification_report_skeleton(
                    self.config.repo_path,
                    story_key,
                    story_def['summary'],
                    parent_key=key,
                )
                if skeleton_created:
                    self.log("SUPERVISOR", f"Created verification report skeleton: {skeleton_path}")

                # Update manifest with created key
                child = manifest.find_child_by_intent(story_def['summary'])
                if child:
                    child.key = story_key

                # PATCH A: Copy patch batch to story-specific file
                if patch_batch_text:
                    story_artifact_path = _copy_patch_batch_for_story(
                        self.config.repo_path, epic_artifact_path, story_key
                    )
                    self.log("SUPERVISOR", f"Copied patch batch to: {story_artifact_path}")

                    # PATCH A: Update story description with actual story key
                    # (replace {STORY_KEY} placeholders)
                    updated_desc = story_def['description'].replace('{STORY_KEY}', story_key)
                    # Note: We don't update the Jira description since it was already created
                    # The comment will have the correct paths

                    # PATCH A: Add Jira comment with patch batch excerpt and verification path
                    excerpt_lines = patch_batch_text.split('\n')[:PATCH_BATCH_EXCERPT_LINES]
                    excerpt = '\n'.join(excerpt_lines)
                    if len(patch_batch_text.split('\n')) > PATCH_BATCH_EXCERPT_LINES:
                        excerpt += f"\n\n... [{len(patch_batch_text.split(chr(10))) - PATCH_BATCH_EXCERPT_LINES} more lines in {story_artifact_path}]"

                    self.jira.add_comment(story_key, f"""## PATCH BATCH Details

**Patch batch file:** `{story_artifact_path}`
**Verification report:** `reports/{story_key}-verification.md`

### Excerpt (first {PATCH_BATCH_EXCERPT_LINES} lines):

```
{excerpt}
```

---

## Verification Checklist
- [ ] Code implemented per PATCH BATCH specs
- [ ] Changes are surgical and minimal
- [ ] Existing functionality preserved
- [ ] Tests pass
- [ ] IMPLEMENTATION_PLAN.md updated
- [ ] Committed to {self.config.feature_branch}

---
*Comment added by SUPERVISOR v3.2*
""")
            else:
                # PATCH B: Track failed story creation
                self.log("SUPERVISOR", f"Failed to create Story: {story_def['summary'][:50]}...")
                failed_stories.append(story_def['summary'])

        # PATCH B: Handle story creation failures properly
        if failed_stories and not created_stories and not existing_stories:
            # All story creations failed AND no existing stories - INCOMPLETE
            self.log("SUPERVISOR", f"[{key}] All story creations failed - marking decomposition INCOMPLETE")
            manifest.mark_incomplete()
            manifest_store.save(manifest)

            # Add Jira comment explaining incomplete state
            error_reason = "CONTENT_LIMIT_EXCEEDED" if self.jira.is_content_limit_exceeded() else "Jira API error"
            self.jira.add_comment(key, f"""## Decomposition INCOMPLETE

Story creation failed for {len(failed_stories)} story(ies).
Error: {error_reason}

Decomposition will be retried on next run.

Failed stories:
{chr(10).join(['- ' + s[:80] for s in failed_stories[:5]])}
{f'... and {len(failed_stories) - 5} more' if len(failed_stories) > 5 else ''}

---
*Status: INCOMPLETE - will retry*
""")

            # PATCH B: Do NOT set decomposition_fingerprint or children in work ledger
            # This ensures the next run will retry
            self._upsert_work_ledger_entry(
                issue_key=key,
                issue_type="Epic",
                status=status,
                last_step=LastStep.SUPERVISOR.value,
                last_step_result=StepResult.FAILED.value,
                error_text=f"Story creation failed: {error_reason}",
            )
            return True  # Handled, but incomplete

        # Save updated manifest
        # PATCH B: Only mark COMPLETE if at least one story exists
        if created_stories or existing_stories:
            manifest.mark_complete()
        manifest_store.save(manifest)

        # Update work ledger
        self._upsert_work_ledger_entry(
            issue_key=key,
            issue_type="Epic",
            status=status,
            last_step=LastStep.SUPERVISOR.value,
            last_step_result=StepResult.SUCCESS.value,  # FIXUP-1 PATCH 5
            children=[s['key'] for s in existing_stories] + created_stories,
            decomposition_fingerprint=manifest.fingerprint,
        )

        if created_stories:
            self.jira.transition_issue(key, 'In Progress')
            story_list = '\n'.join([f"- {s}" for s in created_stories])

            mode_note = "(delta mode - only new stories)" if mode == "delta" else ""
            partial_note = f" ({len(failed_stories)} failed)" if failed_stories else ""
            self.jira.add_comment(key, f"""
Epic decomposed by SUPERVISOR v3.2 {mode_note}{partial_note}

**Stories created:**
{story_list}
""")

        # reused_stories = keys of existing stories that were not newly created
        reused_stories = [s['key'] for s in existing_stories]
        all_stories = created_stories + reused_stories

        if all_stories:
            # Update ledger
            if ea_key:
                if ea_key not in self.state['ea_to_kan']:
                    self.state['ea_to_kan'][ea_key] = {}
                self.state['ea_to_kan'][ea_key]['stories'] = list(set(
                    self.state['ea_to_kan'].get(ea_key, {}).get('stories', []) + all_stories
                ))
                self.state['ea_to_kan'][ea_key]['updatedAt'] = datetime.now(timezone.utc).isoformat()
                self._save_state_ledger()

            self.jira.transition_issue(epic_key, 'In Progress')

            created_list = '\n'.join([f"- {s} (new)" for s in created_stories]) if created_stories else ''
            reused_list = '\n'.join([f"- {s} (reused)" for s in reused_stories]) if reused_stories else ''
            story_list = created_list + ('\n' if created_list and reused_list else '') + reused_list

            self.jira.add_comment(epic_key, f"""
Epic decomposed by Supervisor (Claude Supervisor v3.2)

**Stories ({len(all_stories)} total):**
{story_list}

Codebase analyzed - PATCH BATCH instructions stored externally.
Ready for Developer implementation.
""")
            return True
        elif existing_stories:
            # No new stories but existing ones - still success
            self.jira.transition_issue(key, 'In Progress')
            return True

        return False

    def _process_story(self, issue: dict) -> bool:
        """Developer: Implement a specific Story or Bug using Claude Code CLI

        Guardrails v1: Full enforcement (same as step_3_story_implementation)
        Bug Execution Enablement: Bugs are routed here and subject to same guardrails.
        """
        key = issue['key']
        work_item_type = issue['fields']['issuetype']['name']
        summary = issue['fields']['summary']
        description = self.jira.parse_adf_to_text(issue['fields'].get('description', {}))
        status = issue['fields']['status']['name'].lower()

        # PATCH 4: Key prefix sanity check (warning only, continue processing)
        story_prefix = _contract_story_key_prefix()
        if not key.startswith(story_prefix):
            self.log("IMPLEMENTER", f"[{key}] WARNING: Story/Bug key does not start with expected prefix '{story_prefix}'")

        self.log("IMPLEMENTER", f"Implementing Story: [{key}] {summary}")

        # Check if docs modifications are allowed by ALLOWED FILES constraints
        allow_docs = _docs_allowed_by_constraints(description)

        # Preflight gate: new-style Stories MUST have a canonical patch batch artifact.
        requires_patch_batch = PATCH_BATCH_FILE_MARKER in description
        canonical_patch_rel = _canonical_patch_batch_relpath(key)
        canonical_patch_full = Path(self.config.repo_path) / canonical_patch_rel

        if requires_patch_batch and not canonical_patch_full.exists():
            failure_fp = compute_error_fingerprint(LastStep.IMPLEMENTER.value, "PATCH_BATCH_MISSING")
            existing_entry = self.work_ledger.get(key)

            # Idempotency: do not spam comments/escalations on repeat loops.
            if (existing_entry and
                existing_entry.status_last_observed == "BLOCKED_WAITING_PATCH_BATCH" and
                existing_entry.last_error_fingerprint == failure_fp):
                self.log("SUPERVISOR", f"[{key}] Waiting for patch batch artifact: {canonical_patch_rel}")
                return True

            artifacts_dir = _artifact_dirname()

            self.jira.add_comment(key, f"""## Implementation BLOCKED — PATCH BATCH missing

Canonical patch batch file not found: {canonical_patch_rel}

**Required action (Supervisor):**
1. Generate a fully concrete PATCH BATCH (no TODO/TBD/templates)
2. Save it to: {key}-patch-batch.md

Once the file exists at the canonical path, the engine will resume and route back to IMPLEMENTER.

---
*Status: BLOCKED_WAITING_PATCH_BATCH*
""")

            # Escalate once (deduped by ledger fingerprint/state)
            self.escalate(
                "SUPERVISOR",
                f"PATCH_BATCH_MISSING: {key}",
                f"Canonical patch batch missing: {canonical_patch_rel}\nStory: {summary}\n\nSupervisor must generate and write a concrete patch batch to {artifacts_dir}/{key}-patch-batch.md.",
            )

            # Transition to BLOCKED (Jira) and record non-resumable waiting state (ledger)
            self.jira.transition_issue(key, 'BLOCKED')
            self._upsert_work_ledger_entry(
                issue_key=key,
                issue_type=work_item_type,
                status="BLOCKED_WAITING_PATCH_BATCH",
                last_step=LastStep.IMPLEMENTER.value,
                last_step_result=StepResult.FAILED.value,
                error_text="PATCH_BATCH_MISSING",
            )
            return True  # STOP: do not invoke Implementer until artifact exists

        # PATCH A: Load patch batch from file (IMPLEMENTER access)
        patch_batch_content, patch_batch_source = _load_patch_batch_from_file(
            self.config.repo_path, key, description
        )

        if patch_batch_content:
            self.log("IMPLEMENTER", f"Loaded patch batch from: {patch_batch_source}")
            # Append patch batch to description for Claude
            description = description + f"\n\n## PATCH BATCH (from {patch_batch_source})\n\n{patch_batch_content}"
        else:
            # Legacy story without patch batch file marker - proceed with description only
            self.log("IMPLEMENTER", "No patch batch file found (legacy story format)")

        # Transition to In Progress if not already
        if 'to do' in status:
            self.jira.transition_issue(key, 'In Progress')
            self.jira.add_comment(key, f"Implementation started by IMPLEMENTER\nBranch: {self.config.feature_branch}")

        # PATCH 1: Ensure verification report skeleton exists before invoking Claude
        # Get parent key from issue if available
        parent_key = None
        parent_field = issue.get('fields', {}).get('parent', {})
        if isinstance(parent_field, dict) and parent_field.get('key'):
            parent_key = parent_field['key']

        skeleton_created, skeleton_path = _ensure_verification_report_skeleton(
            self.config.repo_path,
            key,
            summary,
            parent_key=parent_key,
        )
        if skeleton_created:
            self.log("IMPLEMENTER", f"Created verification report skeleton: {skeleton_path}")

        # Use Claude Code CLI to implement the story
        self.log("IMPLEMENTER", "Invoking Claude Code CLI for implementation...")

        # PATCH 2-A: Capture head SHA before Claude execution
        head_sha_before = self.git.get_head_sha()

        # FIXUP-2 PATCH 1: Capture output text for terminal outcome classification
        success, claude_output, modified_files, artifact_path = self._invoke_claude_code(key, summary, description)

        # PATCH 2-A: Capture head SHA after Claude execution
        head_sha_after = self.git.get_head_sha()
        commit_detected = bool(head_sha_after and head_sha_before and head_sha_after != head_sha_before)

        # PATCH 5: If commit detected but modified_files is empty, get files from commit
        reported_files = modified_files[:]  # Start with porcelain status files
        claude_committed = False
        if commit_detected and not modified_files:
            # Claude committed but working tree is clean - get files from the commit
            reported_files = self.git.get_files_changed_in_commit(head_sha_after)
            claude_committed = True
            self.log("IMPLEMENTER", f"Commit detected ({head_sha_after[:8]}), working tree clean, files from commit: {len(reported_files)}")

        if success:
            self.log("IMPLEMENTER", f"Claude Code completed implementation")
            self.log("IMPLEMENTER", f"Modified files: {', '.join(reported_files) if reported_files else 'None detected'}")

            # FIXUP-1 PATCH 2: Enforce canonical report existence BEFORE commit/push
            exists, canonical_report_path, remediation = _verify_canonical_report_or_fail_fast(
                self.config.repo_path, key, log_func=lambda msg: self.log("IMPLEMENTER", msg)
            )

            if not exists:
                # Fail-fast: canonical report missing, do NOT commit/push
                self.log("IMPLEMENTER", f"[{key}] FAIL-FAST: Canonical verification report missing")
                self.jira.add_comment(key, f"""Implementation completed but verification report missing.

{remediation}

**ACTION REQUIRED:** Implementer must write report to canonical path before verification can proceed.
Commit and push were NOT performed.""")

                # Record failure to work ledger
                self._upsert_work_ledger_entry(
                    issue_key=key,
                    issue_type="Story",
                    status="failed",
                    last_step=LastStep.IMPLEMENTER.value,
                    last_step_result=StepResult.FAILED.value,  # FIXUP-1 PATCH 5
                    error_text="Canonical verification report missing",
                )

                self.escalate(
                    "IMPLEMENTER",
                    f"Story {key} missing canonical verification report",
                    f"Story: {summary}\n\n{remediation}"
                )
                return True  # Continue run, but mark as handled

            # Update IMPLEMENTATION_PLAN.md only if docs allowed
            # PATCH 5: Use reported_files (includes files from Claude's commit if working tree clean)
            if reported_files:
                if allow_docs:
                    self._update_implementation_plan(key, summary, reported_files)
                else:
                    self.log("IMPLEMENTER", "Skipping IMPLEMENTATION_PLAN.md update (docs not allowed by ALLOWED FILES)")

            # Commit and push changes to feature branch
            # PATCH 5: Skip commit if Claude already committed (claude_committed=True)
            # AUTOVERIFY-AUTOFIX-LOOP-SAFETY-1 PATCH 4: Respect git_push_enabled()
            commit_success = False
            push_enabled = git_push_enabled()
            if claude_committed:
                # Claude already committed - push if enabled
                if push_enabled:
                    self.log("IMPLEMENTER", f"Claude already committed ({head_sha_after[:8]}), pushing...")
                    commit_success = self.git.push()
                    if commit_success:
                        self.log("IMPLEMENTER", f"Pushed Claude's commit to {self.config.feature_branch}")
                    else:
                        self.log("IMPLEMENTER", "Failed to push Claude's commit")
                else:
                    self.log("IMPLEMENTER", f"Claude already committed ({head_sha_after[:8]}), push disabled via ENGINEO_GIT_PUSH_ENABLED=0")
                    commit_success = True  # Commit succeeded, push skipped
            elif modified_files:
                self.log("IMPLEMENTER", "Committing changes to git...")
                commit_success = self._commit_implementation(key, summary, modified_files, allow_docs)
                if commit_success:
                    if push_enabled:
                        self.log("IMPLEMENTER", f"Changes committed and pushed to {self.config.feature_branch}")
                    else:
                        self.log("IMPLEMENTER", f"Changes committed to {self.config.feature_branch} (push disabled)")
                else:
                    self.log("IMPLEMENTER", "Failed to commit changes - manual commit required")

            # Add success comment to Jira
            # PATCH 5: Properly reflect commit status when Claude committed
            # AUTOVERIFY-AUTOFIX-LOOP-SAFETY-1 PATCH 4: Reflect push disabled state
            if claude_committed:
                if push_enabled:
                    commit_status = "Claude committed and pushed" if commit_success else "Claude committed (push pending)"
                else:
                    commit_status = "Claude committed (push disabled)"
            else:
                if push_enabled:
                    commit_status = "Committed and pushed" if commit_success else "Changes pending commit"
                else:
                    commit_status = "Committed (push disabled)" if commit_success else "Changes pending commit"
            resolved_report_path = canonical_report_path  # Use canonical path from fail-fast check
            self.jira.add_comment(key, f"""
Implementation completed by IMPLEMENTER.

Branch: {self.config.feature_branch}
Status: {commit_status}
Verification report: {resolved_report_path}
Files modified:
{chr(10).join(['- ' + f for f in reported_files]) if reported_files else '(see git log for details)'}
""")
            self.log("IMPLEMENTER", f"{work_item_type} {key} implementation complete")

            # PATCH 2-C: Upsert ledger entry on success
            self._upsert_kan_story_run(key, {
                "status": "implemented",
                "runId": self.run_id,
                "baseSha": head_sha_after or head_sha_before or "",
                "verificationReportPath": resolved_report_path,
                "attemptArtifacts": [artifact_path] if artifact_path else [],
                "guardrailsPassed": commit_detected or commit_success,
            })

            # PATCH 5: Record success to work ledger
            self._upsert_work_ledger_entry(
                issue_key=key,
                issue_type=work_item_type,
                status="In Progress",
                last_step=LastStep.IMPLEMENTER.value,
                last_step_result=StepResult.SUCCESS.value,
                last_commit_sha=head_sha_after or head_sha_before,
                verification_report_path=resolved_report_path,
            )
        else:
            # FIXUP-1 PATCH 1: Short-circuit if AGENT_TEMPLATE_ERROR already handled
            if _is_agent_template_error(output):
                self.log("IMPLEMENTER", f"[{key}] AGENT_TEMPLATE_ERROR already handled; skipping generic failure handling")
                return True  # Terminal handled

            self.log("IMPLEMENTER", f"Claude Code encountered issues")

            self.jira.add_comment(key, f"""
Claude Code implementation encountered issues.

Claude Code failed; output saved to {artifact_path}
Run ID: {self.run_id}

**Output artifact:** `{artifact_path}`

Human intervention may be required.
""")

            self.escalate(
                "IMPLEMENTER",
                f"{work_item_type} {key} Claude Code implementation issue",
                f"Claude Code failed; output saved to {artifact_path}\nRun ID: {self.run_id}\n\n{work_item_type}: {summary}"
            )

            # PATCH 2-C: Upsert ledger entry on failure
            self._upsert_kan_story_run(key, {
                "status": "failed",
                "runId": self.run_id,
                "baseSha": head_sha_after or head_sha_before or "",
                "verificationReportPath": "",
                "attemptArtifacts": [artifact_path] if artifact_path else [],
                "guardrailsPassed": False,
            })

            # FIXUP-2 PATCH 1: Classify terminal result for proper Work Ledger recording
            terminal_result = _classify_implementer_terminal_result(output)
            error_constants = {
                StepResult.TIMED_OUT.value: "Implementation timed out",
                StepResult.CANCELLED.value: "Implementation cancelled (lock/session conflict)",
                StepResult.FAILED.value: "Implementation failed",
            }
            error_text = error_constants.get(terminal_result, "Implementation failed")

            # PATCH 5: Record failure to work ledger
            self._upsert_work_ledger_entry(
                issue_key=key,
                issue_type=work_item_type,
                status="failed",
                last_step=LastStep.IMPLEMENTER.value,
                last_step_result=terminal_result,
                last_commit_sha=head_sha_after or head_sha_before,
                error_text=error_text,
            )

        self.log("IMPLEMENTER", "Notifying Supervisor for verification...")
        return True

    def _invoke_claude_code(self, story_key: str, summary: str, description: str) -> Tuple[bool, str, List[str], str]:
        """Invoke Claude Code CLI to implement a story with PTY streaming output.

        Claude Execution Hardening (OBSERVABILITY-HARDENING-1):
        - Acquires lock to prevent concurrent sessions
        - Streams output live via PTY with [IMPLEMENTER] prefix (secrets redacted)
        - Line-buffered output prevents cross-chunk leakage
        - Emits heartbeat if no output for 30s
        - Configurable timeout (default 4h, env override, per-ticket cap)
        - Writes per-attempt artifacts
        - Retries transient failures up to CLAUDE_MAX_ATTEMPTS times

        Returns: (success, output, list of modified files, artifact_path)
        """
        max_files = int(os.environ.get("ENGINE_MAX_CHANGED_FILES", str(DEFAULT_MAX_CHANGED_FILES)))

        # Build the prompt for Claude Code
        # PATCH 4: Use canonical verification report path only (no run_id variants)
        canonical_report_path = _canonical_verification_report_relpath(story_key)

        prompt = f"""You are the IMPLEMENTER in an autonomous execution system.

## Story to Implement
{story_key}: {summary}

## Implementation Details
{description}

## Instructions
1. Implement the changes described in the PATCH BATCH instructions above
2. Apply each patch surgically and minimally
3. Follow existing code patterns and conventions
4. Create verification report: {VERIFICATION_REPORT_DIR}/{story_key}-verification.md (must include "{VERIFICATION_REPORT_CHECKLIST_HEADER}")

## GUARDRAILS v1 - MANDATORY CONSTRAINTS

**Do NOT commit.** Do NOT push. The engine handles git operations.

**You may ONLY modify files listed under ALLOWED FILES / ALLOWED NEW FILES in the story description.**

## Verification Report (REQUIRED)
Write verification report EXACTLY to: {canonical_report_path}

CRITICAL CONTRACT:
- You MUST use the EXACT path above: {canonical_report_path}
- Do NOT use timestamped filenames (e.g., KAN-17-20260127-...-verification.md)
- Do NOT use title-prefixed filenames (e.g., AUTONOMOUS-AGENT-...-verification.md)
- Only the canonical path above is accepted for verification

The verification report MUST contain:
- ## Checklist section with checkboxes
- All checklist items must be checked (- [x]) if completed
- Any unchecked items (- [ ]) will cause verification to fail

Important:
- Make ONLY the changes specified in the PATCH BATCH
- Do NOT refactor or change unrelated code
- Preserve existing formatting and structure
- Run tool/command actions sequentially (one at a time); do not run concurrent tool operations.

## GOVERNANCE v3.3 - IMPLEMENTER ROLE CONTRACT

**HARD RULES (NON-NEGOTIABLE):**
1. NEVER GUESS: If PATCH BATCH is unclear, ambiguous, or contains placeholders - STOP IMMEDIATELY
2. NEVER SPECULATE: Do not invent file paths, code patterns, or implementation details
3. EXPLICIT ONLY: Every change must be explicitly specified in the PATCH BATCH
4. FAIL-CLOSED: If uncertain about any patch, output "AMBIGUOUS PATCH BATCH" and halt

If you encounter:
- TODO/TBD markers in patch content
- Template variables ({{ }})
- Missing ---OLD--- or ---NEW--- sections
- Files that don't exist at specified paths

Then STOP and output:
```
AMBIGUOUS PATCH BATCH DETECTED
Cannot proceed without explicit, complete patches.
Blocking for Supervisor regeneration.
```

Begin implementation now.
"""

        final_artifact_path = ""

        # Compute effective timeout for this run (PATCH 1-D: per-ticket override)
        timeout_seconds = self.claude_timeout_seconds
        per_ticket_timeout = _parse_per_ticket_timeout(description)
        if per_ticket_timeout is not None:
            timeout_seconds = per_ticket_timeout
            self.log("IMPLEMENTER", f"Per-ticket hard timeout override: {per_ticket_timeout // 60}m (capped to {per_ticket_timeout}s)")

        # Acquire lock to prevent overlapping sessions
        acquired, lock_msg = _acquire_claude_lock(self.config.repo_path, story_key)
        if not acquired:
            artifact_content = f"Lock acquisition failed: {lock_msg}"
            final_artifact_path = _write_claude_attempt_output(
                self.config.repo_path, story_key, self.run_id, 1, artifact_content
            )
            return False, lock_msg, [], final_artifact_path

        try:
            for attempt in range(1, CLAUDE_MAX_ATTEMPTS + 1):
                # FIXUP-2 PATCH 2: Include tool/model metadata for Claude subprocess logs
                self.log("IMPLEMENTER", f"Claude attempt {attempt}/{CLAUDE_MAX_ATTEMPTS}...", model=MODEL_IMPLEMENTER, tool="claude-code-cli")
                attempt_output = []
                attempt_output.append(f"=== Attempt {attempt}/{CLAUDE_MAX_ATTEMPTS} ===\n")
                master_fd = None

                try:
                    # PATCH 4-B: Use PTY for real streaming output
                    master_fd, slave_fd = pty.openpty()

                    # PATCH 4-D: Start subprocess in its own process group for clean timeout kill
                    process = subprocess.Popen(
                        ['claude', '--model', MODEL_IMPLEMENTER, '-p', prompt, '--dangerously-skip-permissions', '--verbose'],
                        cwd=self.config.repo_path,
                        stdin=slave_fd,
                        stdout=slave_fd,
                        stderr=slave_fd,
                        start_new_session=True,  # Creates new process group
                    )

                    # Parent closes slave_fd immediately
                    os.close(slave_fd)

                    # PATCH 4-B: Open artifact file for live streaming
                    artifact_relpath = _claude_output_relpath(story_key, self.run_id, attempt)
                    artifact_fullpath = SCRIPT_DIR / artifact_relpath
                    artifact_fullpath.parent.mkdir(parents=True, exist_ok=True)
                    artifact_file = open(artifact_fullpath, 'w', encoding='utf-8')
                    artifact_file.write(f"=== Attempt {attempt}/{CLAUDE_MAX_ATTEMPTS} ===\n")
                    artifact_file.flush()

                    start_time = time.time()
                    last_output_time = start_time
                    timed_out = False
                    fatal_detected = False  # PATCH 4-B: Track fatal output detection
                    line_buf = ""  # PATCH 4-C: Line buffer for cross-chunk handling
                    LINE_BUF_THRESHOLD = 2048  # PATCH 4-E: Emit partial buffer if exceeds 2KB
                    recent_output_buf = ""  # PATCH 5-A: Rolling buffer for boundary-safe fatal detection
                    RECENT_OUTPUT_MAX = 8192  # 8KB rolling buffer

                    # Stream output with PTY
                    while True:
                        # PATCH 4-C: Check process.poll() every iteration
                        poll_result = process.poll()
                        if poll_result is not None:
                            # Process ended - drain remaining output
                            try:
                                while True:
                                    readable, _, _ = select.select([master_fd], [], [], 0.1)
                                    if not readable:
                                        break
                                    chunk = os.read(master_fd, 4096)
                                    if not chunk:
                                        break
                                    decoded = chunk.decode('utf-8', errors='replace')
                                    line_buf += decoded
                                    artifact_file.write(_redact_secrets(decoded))
                                    artifact_file.flush()
                            except (ValueError, OSError):
                                pass
                            break

                        # Check timeout (PATCH 4-E: use computed timeout_seconds)
                        elapsed = time.time() - start_time
                        if elapsed >= timeout_seconds:
                            timed_out = True
                            # PATCH 4-D: Kill entire process group
                            try:
                                os.killpg(os.getpgid(process.pid), 15)  # SIGTERM to process group
                                process.wait(timeout=5)
                            except (subprocess.TimeoutExpired, OSError):
                                try:
                                    os.killpg(os.getpgid(process.pid), 9)  # SIGKILL
                                    process.wait(timeout=2)
                                except (subprocess.TimeoutExpired, OSError):
                                    process.kill()  # Fallback
                            break

                        # Check for output with short timeout for heartbeat
                        try:
                            readable, _, _ = select.select([master_fd], [], [], 1.0)
                        except (ValueError, OSError):
                            # master_fd closed or invalid
                            if process.poll() is not None:
                                break
                            continue

                        if readable:
                            try:
                                chunk = os.read(master_fd, 4096)
                            except OSError:
                                # PTY closed
                                if process.poll() is not None:
                                    break
                                continue

                            if chunk:
                                last_output_time = time.time()
                                # Decode chunk (PATCH 4-C: line-buffer handling)
                                decoded = chunk.decode('utf-8', errors='replace')
                                line_buf += decoded

                                # PATCH 4-B: Write to artifact file live (redacted)
                                artifact_file.write(_redact_secrets(decoded))
                                artifact_file.flush()
                                attempt_output.append(decoded)

                                # PATCH 5-A: Update rolling buffer for boundary-safe fatal detection
                                recent_output_buf += decoded
                                if len(recent_output_buf) > RECENT_OUTPUT_MAX:
                                    recent_output_buf = recent_output_buf[-RECENT_OUTPUT_MAX:]

                                # PATCH 5-A: Fatal output detection using rolling buffer (boundary-safe)
                                if _is_fatal_claude_output(recent_output_buf):
                                    # FIXUP-2 PATCH 2: Include tool/model metadata
                                    self.log("IMPLEMENTER", f"[{story_key}] Fatal error detected, killing process", model=MODEL_IMPLEMENTER, tool="claude-code-cli")
                                    try:
                                        os.killpg(os.getpgid(process.pid), 15)  # SIGTERM
                                        process.wait(timeout=5)
                                    except (subprocess.TimeoutExpired, OSError):
                                        try:
                                            os.killpg(os.getpgid(process.pid), 9)  # SIGKILL
                                            process.wait(timeout=2)
                                        except (subprocess.TimeoutExpired, OSError):
                                            process.kill()
                                    fatal_detected = True
                                    break

                                # Process complete lines (split on \n or \r)
                                while '\n' in line_buf or '\r' in line_buf:
                                    # Find earliest delimiter
                                    newline_idx = len(line_buf)
                                    for delim in ['\n', '\r']:
                                        idx = line_buf.find(delim)
                                        if idx != -1 and idx < newline_idx:
                                            newline_idx = idx

                                    # Extract line and emit
                                    line = line_buf[:newline_idx]
                                    line_buf = line_buf[newline_idx + 1:]

                                    if line:  # Skip empty lines from \r\n sequences
                                        redacted_line = _redact_secrets(line)
                                        # FIXUP-2 PATCH 2: Include tool/model metadata for streamed output
                                        self.log("IMPLEMENTER", redacted_line, model=MODEL_IMPLEMENTER, tool="claude-code-cli")

                                # PATCH 4-E: Emit partial buffer if exceeds threshold (reduces visibility gaps)
                                if len(line_buf) > LINE_BUF_THRESHOLD:
                                    redacted_chunk = _redact_secrets(line_buf[:LINE_BUF_THRESHOLD])
                                    self.log("IMPLEMENTER", f"[partial] {redacted_chunk}", model=MODEL_IMPLEMENTER, tool="claude-code-cli")
                                    line_buf = line_buf[LINE_BUF_THRESHOLD:]
                            else:
                                # EOF
                                if process.poll() is not None:
                                    break
                        else:
                            # No output - check for heartbeat
                            silent_seconds = time.time() - last_output_time
                            if silent_seconds >= CLAUDE_HEARTBEAT_INTERVAL:
                                elapsed_mins = int(elapsed // 60)
                                elapsed_secs = int(elapsed % 60)
                                # FIXUP-2 PATCH 2: Include tool/model metadata for heartbeat
                                self.log("IMPLEMENTER", f"Claude still running... (elapsed: {elapsed_mins}m {elapsed_secs}s)", model=MODEL_IMPLEMENTER, tool="claude-code-cli")
                                last_output_time = time.time()  # Reset heartbeat timer

                    # Flush remaining line buffer (PATCH 4-C)
                    if line_buf.strip():
                        # Write remaining buffer to artifact (redacted)
                        artifact_file.write(_redact_secrets(line_buf))
                        artifact_file.flush()
                        display_text = _parse_stream_json_line(line_buf)
                        if display_text:
                            redacted = _redact_secrets(display_text)
                            self.log("IMPLEMENTER", redacted, model=MODEL_IMPLEMENTER, tool="claude-code-cli")

                    # PATCH 4-B: Close artifact file
                    try:
                        artifact_file.close()
                    except Exception:
                        pass

                    # Close master_fd safely
                    if master_fd is not None:
                        try:
                            os.close(master_fd)
                        except OSError:
                            pass
                        master_fd = None

                    returncode = process.returncode if not timed_out else -1

                    # Artifact was written live, just log the path
                    final_artifact_path = artifact_relpath
                    self.log("IMPLEMENTER", f"Attempt artifact: {final_artifact_path}", model=MODEL_IMPLEMENTER, tool="claude-code-cli")

                    if timed_out:
                        timeout_mins = timeout_seconds // 60
                        timeout_msg = f"Claude Code timed out after {timeout_mins} minutes (attempt {attempt})"
                        self.log("IMPLEMENTER", timeout_msg, model=MODEL_IMPLEMENTER, tool="claude-code-cli")

                        # Timeout is transient - retry if attempts remain
                        if attempt < CLAUDE_MAX_ATTEMPTS:
                            sleep_seconds = CLAUDE_RETRY_BACKOFF_SECONDS[attempt - 1]
                            self.log("IMPLEMENTER", f"Retrying in {sleep_seconds}s due to timeout...", model=MODEL_IMPLEMENTER, tool="claude-code-cli")
                            time.sleep(sleep_seconds)
                            continue

                        return False, "Claude Code timed out", [], final_artifact_path

                    # PATCH 4-B: Fatal output detected - no retry
                    if fatal_detected:
                        output_text = "".join(attempt_output)
                        self.log("IMPLEMENTER", "Fatal error detected - no retry", model=MODEL_IMPLEMENTER, tool="claude-code-cli")
                        return False, output_text, [], final_artifact_path

                    self.log("IMPLEMENTER", f"Claude Code exit code: {returncode}", model=MODEL_IMPLEMENTER, tool="claude-code-cli")

                    if returncode == 0:
                        # Success - get modified files and return
                        git_status = self.git.status()
                        modified_files = []
                        for line in git_status.split('\n'):
                            if line.strip():
                                parts = line.strip().split()
                                if len(parts) >= 2:
                                    filepath = parts[-1]
                                    # PATCH 3B: Filter out runtime ignored paths
                                    if filepath not in RUNTIME_IGNORED_PATHS:
                                        modified_files.append(filepath)

                        return True, "".join(attempt_output), modified_files, final_artifact_path

                    # Failure - check if retryable
                    output_text = "".join(attempt_output)

                    # PATCH 3: Check for AGENT_TEMPLATE_ERROR (non-retryable)
                    if _is_agent_template_error(output_text):
                        self.log("IMPLEMENTER", f"[{story_key}] AGENT_TEMPLATE_ERROR detected - non-retryable", model=MODEL_IMPLEMENTER, tool="claude-code-cli")

                        # PATCH 3: Stop retries immediately, transition to BLOCKED
                        # Compute fingerprint for dedup
                        error_fingerprint = "AGENT_TEMPLATE_ERROR"
                        signature_matched = None
                        for sig in FATAL_AGENT_TEMPLATE_ERROR_SIGNATURES:
                            if sig in output_text:
                                signature_matched = sig
                                break

                        # PATCH 3: Post one Jira comment (dedup by fingerprint)
                        # Check if we already commented for this fingerprint
                        work_entry = self.work_ledger.get(story_key)
                        should_comment = True
                        if work_entry and work_entry.last_error_fingerprint:
                            # If fingerprint matches, don't comment again
                            existing_fp = compute_error_fingerprint(LastStep.IMPLEMENTER.value, error_fingerprint)
                            if work_entry.last_error_fingerprint == existing_fp:
                                should_comment = False

                        if should_comment:
                            self.jira.add_comment(story_key, f"""## AGENT_TEMPLATE_ERROR - Non-Retryable

**Signature matched:** `{signature_matched}`
**Artifact path:** `{final_artifact_path}`

This error indicates a deterministic agent/template bug that will not resolve with retries.

**Status:** BLOCKED - non-retryable until template fixed

---
*Detected by Engine PATCH 3*
""")

                            # FIXUP-1 PATCH 1: Gate escalation with same dedup as Jira comment
                            self.escalate(
                                "IMPLEMENTER",
                                f"AGENT_TEMPLATE_ERROR: {story_key}",
                                f"Non-retryable agent template error detected.\nSignature: {signature_matched}\nArtifact: {final_artifact_path}\n\nThis requires template fix before retry."
                            )

                        # PATCH 3: Transition to BLOCKED
                        self.jira.transition_issue(story_key, 'BLOCKED')

                        # PATCH 3: Record in work ledger
                        self._upsert_work_ledger_entry(
                            issue_key=story_key,
                            issue_type="Story",
                            status="BLOCKED",
                            last_step=LastStep.IMPLEMENTER.value,
                            last_step_result=StepResult.FAILED.value,
                            error_text=error_fingerprint,
                        )

                        return False, output_text, [], final_artifact_path

                    if _is_transient_claude_failure(output_text) and attempt < CLAUDE_MAX_ATTEMPTS:
                        sleep_seconds = CLAUDE_RETRY_BACKOFF_SECONDS[attempt - 1]
                        self.log("IMPLEMENTER", f"Retrying in {sleep_seconds}s due to transient error...", model=MODEL_IMPLEMENTER, tool="claude-code-cli")
                        time.sleep(sleep_seconds)
                        continue

                    # Non-retryable failure or max attempts reached
                    return False, output_text, [], final_artifact_path

                except FileNotFoundError:
                    msg = "Claude Code CLI not found. Install with: npm install -g @anthropic-ai/claude-code"
                    self.log("IMPLEMENTER", "Claude Code CLI not found - ensure 'claude' is installed", model=MODEL_IMPLEMENTER, tool="claude-code-cli")
                    attempt_output.append(f"\n{msg}\n")
                    final_artifact_path = _write_claude_attempt_output(
                        self.config.repo_path, story_key, self.run_id, attempt, "".join(attempt_output)
                    )
                    return False, msg, [], final_artifact_path

                except Exception as e:
                    error_msg = str(e)
                    self.log("IMPLEMENTER", f"Claude Code error: {e}", model=MODEL_IMPLEMENTER, tool="claude-code-cli")
                    attempt_output.append(f"\nException: {error_msg}\n")

                    # Write attempt artifact before potentially retrying
                    final_artifact_path = _write_claude_attempt_output(
                        self.config.repo_path, story_key, self.run_id, attempt, "".join(attempt_output)
                    )

                    # Check if exception text indicates transient failure
                    if _is_transient_claude_failure(error_msg) and attempt < CLAUDE_MAX_ATTEMPTS:
                        sleep_seconds = CLAUDE_RETRY_BACKOFF_SECONDS[attempt - 1]
                        self.log("IMPLEMENTER", f"Retrying in {sleep_seconds}s due to transient error...", model=MODEL_IMPLEMENTER, tool="claude-code-cli")
                        time.sleep(sleep_seconds)
                        continue

                    return False, error_msg, [], final_artifact_path

                finally:
                    # Ensure master_fd is closed on any exit path
                    if master_fd is not None:
                        try:
                            os.close(master_fd)
                        except OSError:
                            pass
                    # Ensure artifact file is closed
                    if 'artifact_file' in dir() and artifact_file and not artifact_file.closed:
                        try:
                            artifact_file.close()
                        except Exception:
                            pass

            # Should not reach here, but safety fallback
            return False, "Max attempts exhausted", [], final_artifact_path

        finally:
            _release_claude_lock(self.config.repo_path)


# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

import argparse


def resolve_dispatch_kind(issue_type: str) -> str:
    """Resolve issue type to dispatch kind for --issue mode.

    Uses contract-configured issue type mappings:
    - ENGINEO_CONTRACT_IMPLEMENT_ISSUE_TYPES (default: Story,Bug)
    - ENGINEO_CONTRACT_EPIC_ISSUE_TYPES (default: Epic)
    - ENGINEO_CONTRACT_IDEA_ISSUE_TYPES (default: Idea,Initiative)

    Args:
        issue_type: Raw issue type string from Jira.

    Returns:
        Dispatch kind: "implement", "epic", "initiative", or "unknown".
    """
    normalized = issue_type.strip().lower()

    # Check implement types (Story, Bug by default)
    implement_types = {t.lower() for t in _contract_implement_issue_types()}
    if normalized in implement_types:
        return 'implement'

    # Check epic types (Epic by default)
    epic_types = {t.lower() for t in _contract_epic_issue_types()}
    if normalized in epic_types:
        return 'epic'

    # Check idea types (Idea, Initiative by default)
    idea_types = {t.lower() for t in _contract_idea_issue_types()}
    if normalized in idea_types:
        return 'initiative'

    return 'unknown'


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='EngineO Autonomous Multi-Persona Execution Engine',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python engine.py                           # Run continuous loop
  python engine.py --issue KAN-10            # Process single issue
  python engine.py --issue KAN-10 KAN-11     # Process multiple issues
  python engine.py --issue KAN-10 --type story  # Force issue type
  python engine.py --show-work-ledger        # Print work ledger summary and exit
"""
    )
    parser.add_argument(
        '--issue', '-i',
        nargs='+',
        help='Jira issue key(s) to process (e.g., KAN-10 KAN-11 EA-18)'
    )
    parser.add_argument(
        '--type', '-t',
        choices=['idea', 'epic', 'story', 'bug'],
        help='Force issue type (overrides auto-detection)'
    )
    parser.add_argument(
        '--once',
        action='store_true',
        help='Run one iteration and exit'
    )
    parser.add_argument(
        '--claude-timeout-secs',
        type=int,
        help='Claude Code CLI timeout in seconds (overrides env vars)'
    )
    parser.add_argument(
        '--show-work-ledger',
        action='store_true',
        help='Print work ledger summary and exit (no Jira/Git side effects)'
    )
    parser.add_argument(
        '--until-done',
        action='store_true',
        help='Run until all work items are done (Guardrails v1)'
    )

    args = parser.parse_args()

    # PATCH 1: Handle --show-work-ledger early (no Jira/Git side effects)
    if args.show_work_ledger:
        # Load dotenv for REPO_PATH
        load_dotenv(SCRIPT_DIR / '.env')
        repo_root = SCRIPT_DIR.parent.parent
        load_dotenv(repo_root / '.env')

        repo_path = os.environ.get('REPO_PATH', str(repo_root))
        ledger = WorkLedger(repo_path)
        if ledger.load():
            print(ledger.print_summary())
        else:
            print("Work ledger not found or empty.")
            print(f"Expected path: {ledger.ledger_path}")
        return

    # PATCH 1 + PATCH 3: Deterministic dotenv loading (no .zshrc sourcing)
    # Load from scripts/autonomous-agent/.env first, fallback to repo root .env
    dotenv_count = load_dotenv(SCRIPT_DIR / '.env')
    if dotenv_count == 0:
        # Fallback to repo root .env (SCRIPT_DIR is scripts/autonomous-agent/)
        repo_root = SCRIPT_DIR.parent.parent
        dotenv_count = load_dotenv(repo_root / '.env')
    if dotenv_count > 0:
        print(f"[SETUP] Loaded {dotenv_count} variables from .env")

    # Load .env file (env > .env: existing vars take precedence)
    script_dir = Path(__file__).resolve().parent
    dotenv_loaded_count = 0
    dotenv_candidates = [
        script_dir / '.env',                    # scripts/autonomous-agent/.env
        script_dir.parent.parent / '.env',      # repo root .env
    ]
    for dotenv_path in dotenv_candidates:
        if dotenv_path.exists():
            dotenv_loaded_count = load_dotenv(dotenv_path)
            break

    config = Config.load()
    engine = ExecutionEngine(config, cli_timeout_secs=args.claude_timeout_secs)

    # Log dotenv load count (no keys/values for safety)
    engine.log("SYSTEM", f"Loaded {dotenv_loaded_count} variables from .env")

    # Guardrails v1: Wire up --until-done
    engine.until_done = args.until_done

    # Validate configuration
    errors = config.validate()
    if errors:
        for err in errors:
            print(f"[CONFIG ERROR] {err}")
        return

    # Test connections
    if not engine.jira.test_connection():
        print("[ERROR] Jira connection failed")
        return

    # Checkout feature branch
    if not engine.git.checkout_branch():
        print(f"[ERROR] Failed to checkout {config.feature_branch}")
        return

    # Process specific issue(s) or run loop
    if args.issue:
        issue_keys = args.issue  # Now a list
        print(f"\n{'=' * 60}")
        print(f"  PROCESSING {len(issue_keys)} ISSUE(S): {', '.join(issue_keys)}")
        print(f"{'=' * 60}\n")

        for issue_key in issue_keys:
            print(f"\n{'-' * 40}")
            print(f"  Processing: {issue_key}")
            print(f"{'-' * 40}\n")

            if args.type:
                # Force specific issue type
                issue = engine.jira.get_issue(issue_key)
                if issue:
                    actual_type = issue['fields']['issuetype']['name'].lower()
                    forced_type = args.type.lower()

                    # GOVERNANCE: Warn about cross-role forced routing
                    # This is allowed but logged for audit purposes
                    cross_role_map = {
                        ('epic', 'story'): ('SUPERVISOR', 'IMPLEMENTER'),
                        ('epic', 'bug'): ('SUPERVISOR', 'IMPLEMENTER'),
                        ('story', 'epic'): ('IMPLEMENTER', 'SUPERVISOR'),
                        ('bug', 'epic'): ('IMPLEMENTER', 'SUPERVISOR'),
                        ('idea', 'story'): ('UEP', 'IMPLEMENTER'),
                        ('idea', 'epic'): ('UEP', 'SUPERVISOR'),
                    }
                    cross_key = (actual_type, forced_type)
                    if cross_key in cross_role_map:
                        actual_role, forced_role = cross_role_map[cross_key]
                        engine.log("GOVERNANCE", f"Cross-role forced routing: {issue_key} actual={actual_type}({actual_role}) -> forced={forced_type}({forced_role})")
                        engine.log("GOVERNANCE", "WARNING: Forcing type may bypass role contracts. Ensure this is intentional.")

                    # Override issue type
                    issue['fields']['issuetype']['name'] = args.type.title()
                    if args.type == 'idea':
                        engine._process_idea(issue)
                    elif args.type == 'epic':
                        engine._process_epic(issue)
                    elif args.type in ('story', 'bug'):
                        engine._process_story(issue)
                        # PATCH 3-A: Run verification after forced story/bug
                        issue = engine.jira.get_issue(issue_key)
                        if issue:
                            engine.verify_work_item(issue)
            else:
                engine.process_issue(issue_key)
                # PATCH 3-B: Run verification after auto-detect if Story or Bug
                issue = engine.jira.get_issue(issue_key)
                if issue:
                    issue_type = issue['fields']['issuetype']['name'].lower()
                    if issue_type in ('story', 'bug'):
                        engine.verify_work_item(issue)
    elif args.once:
        # PATCH 2: Run one dispatch iteration using priority state machine
        engine.dispatch_once()
    else:
        # Run continuous loop
        engine.run()


if __name__ == '__main__':
    main()
