#!/usr/bin/env python3
"""
Auto-Verify Module: Parser, Runner, and Report Updater.

PATCH BATCH: AUTONOMOUS-AGENT-AUTOVERIFY-AUTOFIX-LOOP-SAFETY-1 - PATCH 2

This module provides:
- Markdown checkbox item parsing (- [ ], - [x])
- Automatable detection via:
  - Explicit <!-- AUTO:CMD=... --> tag (applies to next checkbox only)
  - Backtick fallback with allowlist prefix matching
- Sequential command execution with output capture
- Failure type classification
- Evidence artifact generation
- Idempotent report updating with stable markers
"""

import os
import re
import json
import hashlib
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any, Tuple
from enum import Enum

from .contracts import (
    autoverify_enabled,
    autoverify_full_allowlist,
    autoverify_command_timeout,
    is_command_allowlisted,
    contains_shell_metacharacters,
)


# -----------------------------------------------------------------------------
# CONSTANTS
# -----------------------------------------------------------------------------

# Marker pattern for explicit AUTO tag: <!-- AUTO:CMD=command here -->
AUTO_TAG_PATTERN = re.compile(r'<!--\s*AUTO:CMD=([^>]+)\s*-->', re.IGNORECASE)

# Checkbox patterns
UNCHECKED_PATTERN = re.compile(r'^(\s*)-\s*\[\s*\]\s*(.*)$', re.MULTILINE)
CHECKED_PATTERN = re.compile(r'^(\s*)-\s*\[x\]\s*(.*)$', re.MULTILINE | re.IGNORECASE)

# Backtick command extraction pattern
BACKTICK_PATTERN = re.compile(r'`([^`]+)`')

# Evidence marker pattern for idempotent updates
EVIDENCE_MARKER_PATTERN = re.compile(r'<!--\s*AUTO-VERIFY:([^\s>]+)\s*-->')


class FailureType(str, Enum):
    """Classification of auto-verify command failures."""
    CODE_ERROR = "CODE_ERROR"           # General code/compile error
    TEST_FAILURE = "TEST_FAILURE"       # Test suite failures
    LINT_ERROR = "LINT_ERROR"           # Linting errors
    TYPE_ERROR = "TYPE_ERROR"           # TypeScript/type errors
    ENV_ERROR = "ENV_ERROR"             # Environment/setup errors
    TIMEOUT = "TIMEOUT"                 # Command timed out
    UNKNOWN = "UNKNOWN"                 # Unclassified failure


@dataclass
class ChecklistItem:
    """Represents a single checklist item from the report."""
    line_number: int
    original_line: str
    indent: str
    content: str
    is_checked: bool
    command: Optional[str] = None      # Detected command (if automatable)
    command_source: str = ""           # "auto_tag" or "backtick"
    item_id: str = ""                  # Stable identifier for evidence markers


@dataclass
class CommandResult:
    """Result of executing a single command."""
    item_id: str
    command: str
    exit_code: int
    stdout: str
    stderr: str
    duration_seconds: float
    timed_out: bool
    passed: bool
    failure_type: Optional[FailureType] = None


@dataclass
class AutoVerifyResult:
    """Overall result of auto-verify execution."""
    story_key: str
    timestamp: str
    items_checked: List[str]           # item_ids that passed
    items_failed: List[str]            # item_ids that failed
    items_manual: List[str]            # item_ids that are manual-only
    command_results: List[CommandResult]
    evidence_file: Optional[str] = None
    summary_file: Optional[str] = None
    report_updated: bool = False
    all_automatable_passed: bool = False
    has_manual_items: bool = False


# -----------------------------------------------------------------------------
# PARSING
# -----------------------------------------------------------------------------

def parse_checklist_items(report_content: str) -> List[ChecklistItem]:
    """Parse all checklist items from a verification report.

    Detects:
    - Checked items: - [x] ...
    - Unchecked items: - [ ] ...

    For unchecked items, attempts to detect automatable commands via:
    1. Explicit <!-- AUTO:CMD=... --> tag on preceding line
    2. Backtick fallback (first backticked segment on the line)

    Args:
        report_content: Full markdown content of the report.

    Returns:
        List of ChecklistItem objects.
    """
    items = []
    lines = report_content.split('\n')

    # Track AUTO tag for next checkbox
    pending_auto_tag: Optional[str] = None

    for i, line in enumerate(lines):
        line_number = i + 1  # 1-indexed

        # Check for AUTO tag (applies to NEXT checkbox only)
        auto_match = AUTO_TAG_PATTERN.search(line)
        if auto_match:
            pending_auto_tag = auto_match.group(1).strip()
            continue

        # Check for unchecked checkbox
        unchecked_match = UNCHECKED_PATTERN.match(line)
        if unchecked_match:
            indent = unchecked_match.group(1)
            content = unchecked_match.group(2).strip()

            item = ChecklistItem(
                line_number=line_number,
                original_line=line,
                indent=indent,
                content=content,
                is_checked=False,
                item_id=_compute_item_id(content),
            )

            # Try to detect command
            if pending_auto_tag:
                # Explicit AUTO tag takes precedence
                item.command = pending_auto_tag
                item.command_source = "auto_tag"
            else:
                # Backtick fallback
                backtick_match = BACKTICK_PATTERN.search(content)
                if backtick_match:
                    candidate = backtick_match.group(1).strip()
                    # Only use if allowlisted AND no shell metacharacters
                    if is_command_allowlisted(candidate) and not contains_shell_metacharacters(candidate):
                        item.command = candidate
                        item.command_source = "backtick"

            # Clear pending AUTO tag (applies only to next checkbox)
            pending_auto_tag = None

            items.append(item)
            continue

        # Check for checked checkbox
        checked_match = CHECKED_PATTERN.match(line)
        if checked_match:
            indent = checked_match.group(1)
            content = checked_match.group(2).strip()

            item = ChecklistItem(
                line_number=line_number,
                original_line=line,
                indent=indent,
                content=content,
                is_checked=True,
                item_id=_compute_item_id(content),
            )
            items.append(item)

            # Clear pending AUTO tag if it wasn't used
            pending_auto_tag = None
            continue

        # Non-checkbox line: clear pending AUTO tag if not immediately followed by checkbox
        # (AUTO tag only applies to immediately next checkbox)
        if pending_auto_tag and not line.strip().startswith('<!--'):
            pending_auto_tag = None

    return items


def _compute_item_id(content: str) -> str:
    """Compute stable item ID from content for evidence markers.

    Args:
        content: Checklist item content text.

    Returns:
        Short hex hash (first 8 chars of SHA256).
    """
    normalized = content.strip().lower()
    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()[:8]


# -----------------------------------------------------------------------------
# EXECUTION
# -----------------------------------------------------------------------------

def execute_automatable_items(
    items: List[ChecklistItem],
    working_dir: str,
    log_func: Optional[callable] = None
) -> List[CommandResult]:
    """Execute automatable checklist items sequentially.

    Args:
        items: List of ChecklistItem objects (only executes items with commands).
        working_dir: Working directory for command execution.
        log_func: Optional logging function.

    Returns:
        List of CommandResult objects.
    """
    results = []
    timeout_seconds = autoverify_command_timeout()

    for item in items:
        if not item.command or item.is_checked:
            continue

        if log_func:
            log_func(f"[AUTO-VERIFY] Executing: {item.command}")

        result = _execute_command(
            item_id=item.item_id,
            command=item.command,
            working_dir=working_dir,
            timeout_seconds=timeout_seconds,
        )

        if log_func:
            status = "PASS" if result.passed else f"FAIL ({result.failure_type.value if result.failure_type else 'unknown'})"
            log_func(f"[AUTO-VERIFY] {item.command}: {status} (exit={result.exit_code}, {result.duration_seconds:.1f}s)")

        results.append(result)

    return results


def _execute_command(
    item_id: str,
    command: str,
    working_dir: str,
    timeout_seconds: int
) -> CommandResult:
    """Execute a single command with timeout.

    Uses shell=False for safety (command is split).

    Args:
        item_id: Stable item identifier.
        command: Command to execute.
        working_dir: Working directory.
        timeout_seconds: Timeout in seconds.

    Returns:
        CommandResult with captured output.
    """
    import time
    import shlex

    start_time = time.time()
    timed_out = False
    exit_code = -1
    stdout = ""
    stderr = ""

    try:
        # Split command for shell=False execution
        cmd_parts = shlex.split(command)

        proc = subprocess.run(
            cmd_parts,
            cwd=working_dir,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            shell=False,
        )
        exit_code = proc.returncode
        stdout = proc.stdout or ""
        stderr = proc.stderr or ""

    except subprocess.TimeoutExpired as e:
        timed_out = True
        exit_code = -1
        stdout = e.stdout.decode('utf-8', errors='replace') if e.stdout else ""
        stderr = e.stderr.decode('utf-8', errors='replace') if e.stderr else ""

    except FileNotFoundError as e:
        exit_code = 127  # Command not found
        stderr = str(e)

    except Exception as e:
        exit_code = -1
        stderr = f"Execution error: {str(e)}"

    duration = time.time() - start_time
    passed = (exit_code == 0) and not timed_out

    # Classify failure type
    failure_type = None
    if not passed:
        failure_type = _classify_failure(command, exit_code, stdout, stderr, timed_out)

    return CommandResult(
        item_id=item_id,
        command=command,
        exit_code=exit_code,
        stdout=stdout,
        stderr=stderr,
        duration_seconds=duration,
        timed_out=timed_out,
        passed=passed,
        failure_type=failure_type,
    )


def _classify_failure(
    command: str,
    exit_code: int,
    stdout: str,
    stderr: str,
    timed_out: bool
) -> FailureType:
    """Classify failure type based on command and output heuristics.

    Args:
        command: The command that was executed.
        exit_code: Exit code from command.
        stdout: Captured stdout.
        stderr: Captured stderr.
        timed_out: Whether command timed out.

    Returns:
        FailureType classification.
    """
    if timed_out:
        return FailureType.TIMEOUT

    combined = (stdout + stderr).lower()
    cmd_lower = command.lower()

    # Environment errors
    env_indicators = [
        "command not found",
        "no such file or directory",
        "enoent",
        "permission denied",
        "cannot find module",
        "module not found",
        "node: command not found",
        "pnpm: command not found",
    ]
    if any(ind in combined for ind in env_indicators):
        return FailureType.ENV_ERROR

    # Type errors (TypeScript)
    if "type-check" in cmd_lower or "tsc" in cmd_lower:
        return FailureType.TYPE_ERROR

    type_indicators = ["ts error", "type error", "typescript error", "cannot find name"]
    if any(ind in combined for ind in type_indicators):
        return FailureType.TYPE_ERROR

    # Lint errors
    if "lint" in cmd_lower:
        return FailureType.LINT_ERROR

    lint_indicators = ["eslint", "lint error", "linting failed"]
    if any(ind in combined for ind in lint_indicators):
        return FailureType.LINT_ERROR

    # Test failures
    if "test" in cmd_lower:
        return FailureType.TEST_FAILURE

    test_indicators = ["test failed", "tests failed", "assertion error", "expect(", "describe("]
    if any(ind in combined for ind in test_indicators):
        return FailureType.TEST_FAILURE

    # Code errors (general)
    code_indicators = ["error:", "syntaxerror", "referenceerror", "typeerror"]
    if any(ind in combined for ind in code_indicators):
        return FailureType.CODE_ERROR

    return FailureType.UNKNOWN


# -----------------------------------------------------------------------------
# EVIDENCE ARTIFACTS
# -----------------------------------------------------------------------------

def write_evidence_artifacts(
    story_key: str,
    results: List[CommandResult],
    artifacts_dir: str,
) -> Tuple[Optional[str], Optional[str]]:
    """Write evidence artifacts for auto-verify run.

    Creates:
    - {STORY_KEY}-evidence-{timestamp}.txt: Redacted output per command
    - {STORY_KEY}-auto-verify-summary.json: Structured summary (overwritten each run)

    Args:
        story_key: Story key (e.g., KAN-25).
        results: List of CommandResult objects.
        artifacts_dir: Directory for artifacts.

    Returns:
        Tuple of (evidence_file_path, summary_file_path) or (None, None) on error.
    """
    try:
        artifacts_path = Path(artifacts_dir)
        artifacts_path.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')

        # Evidence file (timestamped, not overwritten)
        evidence_filename = f"{story_key}-evidence-{timestamp}.txt"
        evidence_path = artifacts_path / evidence_filename

        evidence_lines = [
            f"# Auto-Verify Evidence for {story_key}",
            f"# Timestamp: {timestamp}",
            "",
        ]

        for result in results:
            evidence_lines.extend([
                f"## Command: {result.command}",
                f"## Item ID: {result.item_id}",
                f"## Exit Code: {result.exit_code}",
                f"## Duration: {result.duration_seconds:.2f}s",
                f"## Timed Out: {result.timed_out}",
                f"## Passed: {result.passed}",
                f"## Failure Type: {result.failure_type.value if result.failure_type else 'N/A'}",
                "",
                "### stdout (redacted):",
                _redact_output(result.stdout),
                "",
                "### stderr (redacted):",
                _redact_output(result.stderr),
                "",
                "-" * 60,
                "",
            ])

        evidence_path.write_text('\n'.join(evidence_lines), encoding='utf-8')

        # Summary file (overwritten each run)
        summary_filename = f"{story_key}-auto-verify-summary.json"
        summary_path = artifacts_path / summary_filename

        summary_data = {
            "story_key": story_key,
            "timestamp": timestamp,
            "results": [
                {
                    "item_id": r.item_id,
                    "command": r.command,
                    "exit_code": r.exit_code,
                    "duration_seconds": r.duration_seconds,
                    "timed_out": r.timed_out,
                    "passed": r.passed,
                    "failure_type": r.failure_type.value if r.failure_type else None,
                }
                for r in results
            ],
            "all_passed": all(r.passed for r in results),
            "total_commands": len(results),
            "passed_count": sum(1 for r in results if r.passed),
            "failed_count": sum(1 for r in results if not r.passed),
        }

        summary_path.write_text(json.dumps(summary_data, indent=2), encoding='utf-8')

        return str(evidence_path), str(summary_path)

    except Exception:
        return None, None


def _redact_output(text: str, max_lines: int = 100) -> str:
    """Redact sensitive information from command output.

    Args:
        text: Raw output text.
        max_lines: Maximum lines to include.

    Returns:
        Redacted and truncated output.
    """
    if not text:
        return "(empty)"

    lines = text.split('\n')

    # Truncate if too long
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        lines.append(f"... (truncated, {len(lines)} more lines)")

    # Simple redaction patterns
    redact_patterns = [
        (r'(token|password|secret|key|auth)([=:\s]+)\S+', r'\1\2[REDACTED]'),
        (r'Bearer\s+\S+', 'Bearer [REDACTED]'),
    ]

    result = '\n'.join(lines)
    for pattern, replacement in redact_patterns:
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)

    return result


# -----------------------------------------------------------------------------
# REPORT UPDATING
# -----------------------------------------------------------------------------

def update_report_with_results(
    report_content: str,
    items: List[ChecklistItem],
    results: List[CommandResult],
    evidence_file: Optional[str] = None,
) -> str:
    """Update verification report with auto-verify results.

    - Checks passed automatable items (- [ ] -> - [x])
    - Leaves failed/manual items unchecked
    - Inserts/replaces evidence sub-bullet with stable marker
    - Preserves evidence for already-checked items (idempotent)

    Args:
        report_content: Original report content.
        items: Parsed checklist items.
        results: Command execution results.
        evidence_file: Path to evidence file for reference.

    Returns:
        Updated report content.
    """
    # Build item_id -> result mapping
    result_by_id = {r.item_id: r for r in results}

    # Build set of item_ids we're processing (only unchecked items with results)
    processing_ids = set(result_by_id.keys())

    lines = report_content.split('\n')
    new_lines = []
    skip_evidence_for_id = None

    for i, line in enumerate(lines):
        # Check if we should skip this line (evidence for item we just processed)
        if skip_evidence_for_id:
            # Check if this is an evidence line for the item we just processed
            match = EVIDENCE_MARKER_PATTERN.search(line)
            if match and match.group(1) == skip_evidence_for_id:
                # Skip this old evidence line - we already added new evidence
                continue
            # Not the evidence we're looking for, stop skipping
            skip_evidence_for_id = None

        # Find matching item for this line
        matching_item = None
        for item in items:
            if item.line_number == i + 1:  # 1-indexed
                matching_item = item
                break

        if matching_item and not matching_item.is_checked:
            result = result_by_id.get(matching_item.item_id)

            if result and result.passed:
                # Convert to checked
                new_line = line.replace('- [ ]', '- [x]', 1)
                new_lines.append(new_line)

                # Add evidence sub-bullet
                evidence_note = f"  - Auto-verified: PASS <!-- AUTO-VERIFY:{matching_item.item_id} -->"
                if evidence_file:
                    evidence_note = f"  - Auto-verified: PASS (see `{Path(evidence_file).name}`) <!-- AUTO-VERIFY:{matching_item.item_id} -->"
                new_lines.append(evidence_note)

                # Mark to skip old evidence for this item
                skip_evidence_for_id = matching_item.item_id

            elif result and not result.passed:
                # Keep unchecked, add failure evidence
                new_lines.append(line)
                failure_note = f"  - Auto-verify: FAIL ({result.failure_type.value if result.failure_type else 'unknown'}) <!-- AUTO-VERIFY:{matching_item.item_id} -->"
                new_lines.append(failure_note)

                # Mark to skip old evidence for this item
                skip_evidence_for_id = matching_item.item_id

            else:
                # Manual item, keep as-is
                new_lines.append(line)
        else:
            # Not an unchecked item we're processing
            # Check if this is an evidence line for an item we processed
            match = EVIDENCE_MARKER_PATTERN.search(line)
            if match:
                item_id = match.group(1)
                if item_id in processing_ids:
                    # This is old evidence for an item we just processed - skip it
                    continue
            # Keep the line (including evidence for items we're not processing)
            new_lines.append(line)

    return '\n'.join(new_lines)


# -----------------------------------------------------------------------------
# FAILURE HASH COMPUTATION
# -----------------------------------------------------------------------------

def compute_failure_hash(command: str, exit_code: int, output: str) -> str:
    """Compute deterministic hash for a failure.

    Used to detect if the same failure is recurring without code changes.

    Note: Does NOT include commit SHA - that's checked separately to enforce
    "same failure hash requires code change" policy.

    Args:
        command: The failing command.
        exit_code: Exit code.
        output: Combined stdout+stderr (first 1000 chars, normalized).

    Returns:
        SHA256 hex string.
    """
    # Normalize output (first 1000 chars, lowercased, whitespace-normalized)
    normalized_output = ' '.join(output[:1000].lower().split())

    combined = f"{command}|{exit_code}|{normalized_output}"
    return hashlib.sha256(combined.encode('utf-8')).hexdigest()


# -----------------------------------------------------------------------------
# MAIN ENTRY POINT
# -----------------------------------------------------------------------------

def run_auto_verify(
    story_key: str,
    report_path: str,
    working_dir: str,
    artifacts_dir: str,
    log_func: Optional[callable] = None,
) -> AutoVerifyResult:
    """Run auto-verify on a verification report.

    Args:
        story_key: Story key (e.g., KAN-25).
        report_path: Path to verification report.
        working_dir: Working directory for command execution.
        artifacts_dir: Directory for evidence artifacts.
        log_func: Optional logging function.

    Returns:
        AutoVerifyResult with all outcomes.
    """
    timestamp = datetime.now(timezone.utc).isoformat()

    # Read report
    try:
        report_content = Path(report_path).read_text(encoding='utf-8')
    except Exception as e:
        if log_func:
            log_func(f"[AUTO-VERIFY] Failed to read report: {e}")
        return AutoVerifyResult(
            story_key=story_key,
            timestamp=timestamp,
            items_checked=[],
            items_failed=[],
            items_manual=[],
            command_results=[],
        )

    # Parse checklist items
    items = parse_checklist_items(report_content)

    # Categorize items
    automatable_items = [i for i in items if not i.is_checked and i.command]
    manual_items = [i for i in items if not i.is_checked and not i.command]
    already_checked = [i for i in items if i.is_checked]

    if log_func:
        log_func(f"[AUTO-VERIFY] Found {len(automatable_items)} automatable, {len(manual_items)} manual, {len(already_checked)} already checked")

    # Execute automatable items
    results = execute_automatable_items(automatable_items, working_dir, log_func)

    # Categorize results
    items_checked = [r.item_id for r in results if r.passed]
    items_failed = [r.item_id for r in results if not r.passed]
    items_manual_ids = [i.item_id for i in manual_items]

    # Write evidence artifacts
    evidence_file = None
    summary_file = None
    if results:
        evidence_file, summary_file = write_evidence_artifacts(
            story_key, results, artifacts_dir
        )

    # Update report
    report_updated = False
    if results:
        updated_content = update_report_with_results(
            report_content, items, results, evidence_file
        )
        try:
            Path(report_path).write_text(updated_content, encoding='utf-8')
            report_updated = True
        except Exception as e:
            if log_func:
                log_func(f"[AUTO-VERIFY] Failed to update report: {e}")

    return AutoVerifyResult(
        story_key=story_key,
        timestamp=timestamp,
        items_checked=items_checked,
        items_failed=items_failed,
        items_manual=items_manual_ids,
        command_results=results,
        evidence_file=evidence_file,
        summary_file=summary_file,
        report_updated=report_updated,
        all_automatable_passed=len(items_failed) == 0 and len(items_checked) > 0,
        has_manual_items=len(manual_items) > 0,
    )
