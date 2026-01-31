#!/usr/bin/env python3
"""
Persistent Work Ledger for Autonomous Agent State Resumption.

PATCH BATCH: AUTONOMOUS-AGENT-RESUME-STATE-MACHINE-RECONCILE-1 - PATCH 1

This module implements a persistent work ledger separate from the existing
guardrails ledger (state.json). The work ledger tracks per-issue execution
state to enable resumption across runs.

Canonical location: work_ledger.json (repo root)
"""

import os
import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field, asdict
from enum import Enum


# Canonical ledger filename (repo root)
WORK_LEDGER_FILENAME = "work_ledger.json"
WORK_LEDGER_VERSION = 1

# Default implement issue types (for resumable-entry detection)
DEFAULT_IMPLEMENT_ISSUE_TYPES = "Story,Bug"


def _get_implement_issue_types() -> set:
    """Get the set of implement issue types from config.

    Parses ENGINEO_CONTRACT_IMPLEMENT_ISSUE_TYPES (default: Story,Bug).
    Returns lowercase set for case-insensitive comparison.

    Fail-closed: if parsing fails, returns {"story", "bug"}.
    """
    try:
        raw = os.environ.get("ENGINEO_CONTRACT_IMPLEMENT_ISSUE_TYPES", DEFAULT_IMPLEMENT_ISSUE_TYPES)
        types = [t.strip().lower() for t in raw.split(",") if t.strip()]
        if types:
            return set(types)
    except Exception:
        pass
    # Fail-closed fallback
    return {"story", "bug"}


class LastStep(str, Enum):
    """Terminal step states for work ledger entries."""
    UEP = "UEP"
    SUPERVISOR = "SUPERVISOR"
    IMPLEMENTER = "IMPLEMENTER"
    VERIFY = "VERIFY"
    RECONCILE = "RECONCILE"


class IssueType(str, Enum):
    """Issue types tracked in work ledger."""
    IDEA = "Idea"
    EPIC = "Epic"
    STORY = "Story"


class StepResult(str, Enum):
    """Terminal step result states for work ledger entries.

    FIXUP-1 PATCH 5: Explicit terminal outcome recording.
    """
    SUCCESS = "success"
    FAILED = "failed"
    TIMED_OUT = "timed_out"
    CANCELLED = "cancelled"


@dataclass
class WorkLedgerEntry:
    """Work ledger entry for a single issue.

    Fields (per PATCH 1 schema + FIXUP-1 PATCH 5 + VERIFY-BACKOFF-1 PATCH 2):
    - issueKey: string
    - issueType: enum-ish string (Idea|Epic|Story)
    - parentKey: string|null
    - status_last_observed: string
    - last_step: enum string (UEP|SUPERVISOR|IMPLEMENTER|VERIFY|RECONCILE)
    - last_step_result: enum string (success|failed|timed_out|cancelled) - FIXUP-1 PATCH 5
    - children: list of strings (story keys for epics; epic keys for ideas)
    - decomposition_fingerprint: string (sha256 hex)
    - last_commit_sha: string|null
    - verification_report_path: string (canonical path when set)
    - last_error_fingerprint: string|null
    - last_error_at: ISO-8601 UTC string|null

    VERIFY-BACKOFF-1 PATCH 2 fields:
    - verify_next_at: ISO-8601 UTC string|null - cooldown gate
    - verify_last_reason: string|null - last verify failure reason
    - verify_last_report_hash: string|null - sha256 of report at last failure
    - verify_last_report_mtime: float|null - mtime of report at last failure
    - verify_last_commented_reason: string|null - dedup: last reason commented
    - verify_last_commented_report_hash: string|null - dedup: last hash commented

    VERIFY-AUTOREPAIR-1 PATCH 1 fields:
    - verify_repair_applied_at: ISO-8601 UTC string|null - when auto-repair was applied
    - verify_repair_last_report_hash: string|null - sha256 of pre-repair report (dedup)
    - verify_repair_count: int - number of times repair was applied

    EA/KAN RECONCILE fields:
    - reconcile_next_at: ISO-8601 UTC string|null - cooldown gate
    - reconcile_last_reason: string|null - last reconcile failure reason
    - reconcile_last_fingerprint: string|null - fingerprint at last failure (for change detection)
    - reconcile_last_commented_reason: string|null - dedup: last reason commented
    - reconcile_last_commented_fingerprint: string|null - dedup: last fingerprint commented
    - decomposition_skipped_at: ISO-8601 UTC string|null - when decomposition was skipped
    - decomposition_skip_reason: string|null - reason for decomposition skip

    AUTOVERIFY-AUTOFIX-LOOP-SAFETY-1 PATCH 3 fields:
    - auto_verify_runs: int - count of auto-verify cycles (bounded by max_verify_cycles)
    - auto_fix_attempts: int - count of auto-fix attempts (bounded by max_auto_fix_attempts)
    - last_failure_hash: string|null - hash of last failure (cmd+exit+output) for loop detection
    - last_failure_type: string|null - classification of last failure (CODE_ERROR, TEST_FAILURE, etc.)
    - last_failure_at: ISO-8601 UTC string|null - when last failure occurred
    - verify_last_commit_sha: string|null - commit SHA at last verification (for "code changed" bypass)
    """
    issueKey: str
    issueType: str = "Story"
    parentKey: Optional[str] = None
    status_last_observed: str = ""
    last_step: str = ""
    last_step_result: Optional[str] = None  # FIXUP-1 PATCH 5: Terminal outcome
    children: List[str] = field(default_factory=list)
    decomposition_fingerprint: str = ""
    last_commit_sha: Optional[str] = None
    verification_report_path: str = ""
    last_error_fingerprint: Optional[str] = None
    last_error_at: Optional[str] = None
    # VERIFY-BACKOFF-1 PATCH 2: Verify backoff fields
    verify_next_at: Optional[str] = None
    verify_last_reason: Optional[str] = None
    verify_last_report_hash: Optional[str] = None
    verify_last_report_mtime: Optional[float] = None
    verify_last_commented_reason: Optional[str] = None
    verify_last_commented_report_hash: Optional[str] = None
    # VERIFY-AUTOREPAIR-1 PATCH 1: Auto-repair tracking fields
    verify_repair_applied_at: Optional[str] = None
    verify_repair_last_report_hash: Optional[str] = None
    verify_repair_count: int = 0
    # EA/KAN RECONCILE: backoff + comment dedup fields
    reconcile_next_at: Optional[str] = None
    reconcile_last_reason: Optional[str] = None
    reconcile_last_fingerprint: Optional[str] = None
    reconcile_last_commented_reason: Optional[str] = None
    reconcile_last_commented_fingerprint: Optional[str] = None
    # EA/KAN: decomposition skip evidence
    decomposition_skipped_at: Optional[str] = None
    decomposition_skip_reason: Optional[str] = None
    # AUTOVERIFY-AUTOFIX-LOOP-SAFETY-1 PATCH 3: Auto-verify/fix loop tracking
    auto_verify_runs: int = 0
    auto_fix_attempts: int = 0
    last_failure_hash: Optional[str] = None
    last_failure_type: Optional[str] = None
    last_failure_at: Optional[str] = None
    verify_last_commit_sha: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert entry to dictionary for JSON serialization."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> 'WorkLedgerEntry':
        """Create entry from dictionary."""
        return cls(
            issueKey=data.get('issueKey', ''),
            issueType=data.get('issueType', 'Story'),
            parentKey=data.get('parentKey'),
            status_last_observed=data.get('status_last_observed', ''),
            last_step=data.get('last_step', ''),
            last_step_result=data.get('last_step_result'),  # FIXUP-1 PATCH 5
            children=data.get('children', []),
            decomposition_fingerprint=data.get('decomposition_fingerprint', ''),
            last_commit_sha=data.get('last_commit_sha'),
            verification_report_path=data.get('verification_report_path', ''),
            last_error_fingerprint=data.get('last_error_fingerprint'),
            last_error_at=data.get('last_error_at'),
            # VERIFY-BACKOFF-1 PATCH 2: Verify backoff fields (backward compatible)
            verify_next_at=data.get('verify_next_at'),
            verify_last_reason=data.get('verify_last_reason'),
            verify_last_report_hash=data.get('verify_last_report_hash'),
            verify_last_report_mtime=data.get('verify_last_report_mtime'),
            verify_last_commented_reason=data.get('verify_last_commented_reason'),
            verify_last_commented_report_hash=data.get('verify_last_commented_report_hash'),
            # VERIFY-AUTOREPAIR-1 PATCH 1: Auto-repair fields (backward compatible)
            verify_repair_applied_at=data.get('verify_repair_applied_at'),
            verify_repair_last_report_hash=data.get('verify_repair_last_report_hash'),
            verify_repair_count=data.get('verify_repair_count', 0),
            # EA/KAN RECONCILE: backoff + comment dedup fields (backward compatible)
            reconcile_next_at=data.get('reconcile_next_at'),
            reconcile_last_reason=data.get('reconcile_last_reason'),
            reconcile_last_fingerprint=data.get('reconcile_last_fingerprint'),
            reconcile_last_commented_reason=data.get('reconcile_last_commented_reason'),
            reconcile_last_commented_fingerprint=data.get('reconcile_last_commented_fingerprint'),
            # EA/KAN: decomposition skip evidence (backward compatible)
            decomposition_skipped_at=data.get('decomposition_skipped_at'),
            decomposition_skip_reason=data.get('decomposition_skip_reason'),
            # AUTOVERIFY-AUTOFIX-LOOP-SAFETY-1 PATCH 3: Auto-verify/fix loop tracking (backward compatible)
            auto_verify_runs=data.get('auto_verify_runs', 0),
            auto_fix_attempts=data.get('auto_fix_attempts', 0),
            last_failure_hash=data.get('last_failure_hash'),
            last_failure_type=data.get('last_failure_type'),
            last_failure_at=data.get('last_failure_at'),
            verify_last_commit_sha=data.get('verify_last_commit_sha'),
        )


class WorkLedger:
    """Persistent work ledger for tracking issue execution state.

    Features:
    - Crash-safe atomic writes (temp file + os.replace)
    - Append-safe (never partially overwrites canonical file)
    - Schema versioning for future migrations
    """

    def __init__(self, repo_path: str, ledger_path: Optional[Path] = None):
        """Initialize work ledger.

        Args:
            repo_path: Path to repository root.
            ledger_path: Optional override for ledger path (for testing).
        """
        self.repo_path = Path(repo_path)
        if ledger_path is not None:
            self._ledger_path = ledger_path
        else:
            self._ledger_path = self.repo_path / WORK_LEDGER_FILENAME
        self._entries: Dict[str, WorkLedgerEntry] = {}
        self._version = WORK_LEDGER_VERSION

    @property
    def ledger_path(self) -> Path:
        """Get the canonical ledger path."""
        return self._ledger_path

    def load(self) -> bool:
        """Load ledger from disk.

        Returns:
            True if loaded successfully, False if file missing/unreadable.
        """
        try:
            if not self._ledger_path.exists():
                return False

            data = json.loads(self._ledger_path.read_text(encoding='utf-8'))
            self._version = data.get('version', WORK_LEDGER_VERSION)

            # Load entries from 'entries' key (keyed by issueKey)
            entries_data = data.get('entries', {})
            self._entries = {}
            for key, entry_data in entries_data.items():
                self._entries[key] = WorkLedgerEntry.from_dict(entry_data)

            return True
        except (json.JSONDecodeError, OSError, KeyError, TypeError):
            return False

    def save(self) -> bool:
        """Save ledger to disk with atomic write.

        Uses temp file + os.replace() for crash safety.
        Never partially overwrites the canonical file.

        Returns:
            True on success, False on failure.
        """
        temp_path = self._ledger_path.with_suffix('.json.tmp')
        try:
            # Ensure parent directory exists
            self._ledger_path.parent.mkdir(parents=True, exist_ok=True)

            # Build data structure
            data = {
                'version': self._version,
                'entries': {key: entry.to_dict() for key, entry in self._entries.items()}
            }

            # Write to temp file first
            temp_path.write_text(json.dumps(data, indent=2, sort_keys=True), encoding='utf-8')

            # Atomic replace
            os.replace(str(temp_path), str(self._ledger_path))
            return True
        except (OSError, TypeError) as e:
            # Clean up temp file if it exists
            try:
                temp_path.unlink(missing_ok=True)
            except OSError:
                pass
            return False

    def get(self, issue_key: str) -> Optional[WorkLedgerEntry]:
        """Get entry for an issue.

        Args:
            issue_key: The issue key (e.g., "KAN-17").

        Returns:
            WorkLedgerEntry or None if not found.
        """
        return self._entries.get(issue_key)

    def upsert(self, entry: WorkLedgerEntry) -> None:
        """Insert or update an entry.

        Args:
            entry: The WorkLedgerEntry to upsert.
        """
        self._entries[entry.issueKey] = entry

    def update(self, issue_key: str, updates: dict) -> bool:
        """Update specific fields on an existing entry.

        Args:
            issue_key: The issue key.
            updates: Dictionary of field updates.

        Returns:
            True if entry existed and was updated, False otherwise.
        """
        entry = self._entries.get(issue_key)
        if entry is None:
            return False

        for key, value in updates.items():
            if hasattr(entry, key):
                setattr(entry, key, value)
        return True

    def delete(self, issue_key: str) -> bool:
        """Delete an entry.

        Args:
            issue_key: The issue key.

        Returns:
            True if entry existed and was deleted, False otherwise.
        """
        if issue_key in self._entries:
            del self._entries[issue_key]
            return True
        return False

    def all_entries(self) -> Dict[str, WorkLedgerEntry]:
        """Get all entries.

        Returns:
            Dictionary of issue_key -> WorkLedgerEntry.
        """
        return dict(self._entries)

    def get_resumable_entries(self, canonical_report_checker=None, canonical_patch_batch_checker=None) -> List[WorkLedgerEntry]:
        """Get entries that are resumable (bounded retries; missing-artifact aware).

        An entry is resumable if:
        1. last_step is set AND
        2. Either:
           a. Entry is BLOCKED_WAITING_PATCH_BATCH AND canonical patch batch now exists
           b. Transient terminal failure: last_step_result is timed_out or cancelled
           c. Required artifact missing (canonical verification report for VERIFY/RECONCILE)
              ONLY for implement issue types (Story/Bug by default)
        3. AND NOT a non-retryable error (AGENT_TEMPLATE_ERROR)

        PATCH 2: Epics/Ideas are NOT resumable solely due to missing canonical reports.
        Only implement issue types (configurable via ENGINEO_CONTRACT_IMPLEMENT_ISSUE_TYPES)
        are resumable when missing canonical verification reports.

        Args:
            canonical_report_checker: Optional callable(issue_key) -> bool
                that returns True if canonical report exists.
            canonical_patch_batch_checker: Optional callable(issue_key) -> bool
                that returns True if canonical patch batch exists.

        Returns:
            List of resumable WorkLedgerEntry objects.
        """
        # FIXUP-1 PATCH 2: Non-retryable fingerprint for AGENT_TEMPLATE_ERROR
        agent_template_error_fp = compute_error_fingerprint(LastStep.IMPLEMENTER.value, "AGENT_TEMPLATE_ERROR")

        # PATCH 2: Get implement issue types (Story/Bug by default)
        implement_types = _get_implement_issue_types()

        resumable = []
        for entry in self._entries.values():
            if not entry.last_step:
                continue

            # Missing PATCH BATCH is a hard precondition failure:
            # do NOT treat as resumable until the canonical artifact exists.
            if entry.status_last_observed == "BLOCKED_WAITING_PATCH_BATCH":
                if canonical_patch_batch_checker and canonical_patch_batch_checker(entry.issueKey):
                    resumable.append(entry)
                continue

            # FIXUP-1 PATCH 2: Skip non-retryable AGENT_TEMPLATE_ERROR entries
            if entry.last_error_fingerprint == agent_template_error_fp:
                continue

            # Only transient failures are resumable (timeouts, cancellations).
            if entry.last_error_fingerprint:
                if entry.last_step_result in (StepResult.TIMED_OUT.value, StepResult.CANCELLED.value):
                    resumable.append(entry)
                continue

            # Check for missing artifacts in VERIFY/RECONCILE paths
            # PATCH 2: Only implement issue types (Story/Bug) are resumable due to missing reports
            # Epics/Ideas are NOT resumable solely due to missing canonical reports
            if entry.last_step in (LastStep.VERIFY.value, LastStep.RECONCILE.value):
                # Skip non-implement types (Epic, Idea) for missing report resumption
                if entry.issueType.lower() not in implement_types:
                    continue

                if canonical_report_checker:
                    if not canonical_report_checker(entry.issueKey):
                        resumable.append(entry)
                elif not entry.verification_report_path:
                    resumable.append(entry)

        return resumable

    def print_summary(self) -> str:
        """Generate a one-screen summary of resumable entries.

        Returns:
            Formatted string summary.
        """
        lines = []
        lines.append("=" * 60)
        lines.append("  WORK LEDGER SUMMARY")
        lines.append("=" * 60)
        lines.append("")

        if not self._entries:
            lines.append("No entries in work ledger.")
            return "\n".join(lines)

        # Header
        lines.append(f"{'Issue Key':<12} {'Type':<6} {'Status':<15} {'Last Step':<12} {'Report?':<8}")
        lines.append("-" * 60)

        for key in sorted(self._entries.keys()):
            entry = self._entries[key]
            report_exists = "Yes" if entry.verification_report_path else "No"
            lines.append(
                f"{entry.issueKey:<12} "
                f"{entry.issueType:<6} "
                f"{entry.status_last_observed[:15]:<15} "
                f"{entry.last_step:<12} "
                f"{report_exists:<8}"
            )

        lines.append("")
        lines.append(f"Total entries: {len(self._entries)}")

        # Show resumable entries
        resumable = self.get_resumable_entries()
        if resumable:
            lines.append(f"Resumable entries: {len(resumable)}")
            for entry in resumable[:5]:  # Limit to first 5
                reason = "error" if entry.last_error_fingerprint else "missing artifact"
                lines.append(f"  - {entry.issueKey}: {reason}")

        return "\n".join(lines)


def compute_error_fingerprint(step: str, error_text: str) -> str:
    """Compute deterministic error fingerprint.

    Args:
        step: The step where error occurred (UEP, SUPERVISOR, etc.)
        error_text: The error/exception text.

    Returns:
        SHA256 hex string.
    """
    # Normalize error text (first 500 chars, stripped)
    normalized = (error_text or "")[:500].strip().lower()
    combined = f"{step}:{normalized}"
    return hashlib.sha256(combined.encode('utf-8')).hexdigest()


def compute_decomposition_fingerprint(description: str, acceptance_criteria: str = "") -> str:
    """Compute decomposition fingerprint for an Epic.

    Args:
        description: Epic description text.
        acceptance_criteria: Acceptance criteria section text (extracted or full).

    Returns:
        SHA256 hex string.
    """
    # Use acceptance criteria if provided, else use full description
    text = acceptance_criteria if acceptance_criteria else description
    combined = f"{description}\n{text}"
    return hashlib.sha256(combined.encode('utf-8')).hexdigest()


def _ledger_artifact_dirname() -> str:
    """Get the canonical artifact directory name from env.

    Configurable via ENGINEO_ARTIFACTS_DIR. Defaults to 'reports'.
    """
    value = os.environ.get("ENGINEO_ARTIFACTS_DIR", "reports").strip()
    value = value.strip("/\\")
    return value or "reports"


def canonical_verification_report_path(issue_key: str) -> str:
    """Get canonical verification report path (PATCH 4 contract).

    Honors ENGINEO_ARTIFACTS_DIR (default: reports).

    Args:
        issue_key: The issue key (e.g., "KAN-17").

    Returns:
        Canonical path: {ARTIFACTS_DIR}/{ISSUE_KEY}-verification.md
    """
    return f"{_ledger_artifact_dirname()}/{issue_key}-verification.md"
