#!/usr/bin/env python3
"""
EngineO Autonomous Multi-Persona Execution Engine v3.2

This engine coordinates THREE STRICT ROLES:

1) UEP v3.2
   - Combines: Lead PM, Tech Architect, UX Designer, CTO, CFO, Content Strategist
   - Acts as ONE integrated executive brain
   - Produces high-level intent ONLY — never implementation
   - NEVER writes patches or code
   - Defines WHAT we build, WHY we build it, UX/product expectations
   - Reads Ideas from Atlassian Product Discovery
   - Creates Epics with business goals and acceptance criteria

2) SUPERVISOR v3.2
   - NEVER writes code
   - ONLY produces PATCH BATCH instructions (surgical, minimal diffs)
   - Decomposes Epics into Stories with exact implementation specs
   - Validates intent and resolves ambiguities
   - Verifies Stories and Epics
   - Ends each phase with instruction to update Implementation Plan

3) IMPLEMENTER v3.2
   - Applies PATCH BATCH diffs EXACTLY as specified
   - Writes all code
   - Makes ONLY the modifications shown in patches
   - Does NOT refactor or change unrelated lines
   - After patches, MUST update IMPLEMENTATION_PLAN.md and relevant docs
   - Commits to feature/agent branch

All operations go through Jira API and Git.
MCP-ONLY operations for Atlassian Product Discovery, Jira, Git, and Email.
"""

import os
import sys
import json
import time
import subprocess
import smtplib
import requests
from datetime import datetime, timezone
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

# Script directory for relative paths (logs, reports)
SCRIPT_DIR = Path(__file__).parent.resolve()

# Claude Code CLI is used for all personas (no API key required)
# Model configuration per persona:
# - UEP: opus (high-quality business analysis)
# - Supervisor: opus (code understanding and PATCH BATCH generation)
# - Developer: sonnet (faster implementation)
CLAUDE_CODE_AVAILABLE = True  # Will be verified at runtime

# Model aliases for Claude Code CLI
MODEL_UEP = "opus"        # Best for business analysis
MODEL_SUPERVISOR = "opus"  # Best for code analysis
MODEL_IMPLEMENTER = "sonnet" # Faster for implementation

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

# Guardrails ledger path (tracks commit eligibility for Step 4 verification)
LEDGER_REL_PATH = ".engineo/state.json"
LEDGER_VERSION = 1

# Escalation queue path (runtime-only, never tracked)
ESCALATIONS_REL_PATH = ".engineo/escalations.json"

# Runtime paths that must NEVER be staged/committed
RUNTIME_IGNORED_PATHS = {LEDGER_REL_PATH, CLAUDE_LOCK_REL_PATH, ESCALATIONS_REL_PATH}

# Secret env vars to redact from output (values only, not names)
CLAUDE_SECRET_ENV_VARS = ["JIRA_TOKEN", "JIRA_API_TOKEN", "GITHUB_TOKEN"]


def _canonical_verification_report_relpath(issue_key: str, run_id: str) -> str:
    """Get canonical verification report repo-relative path.

    Returns: scripts/autonomous-agent/reports/{ISSUE_KEY}-{RUN_ID}-verification.md
    """
    return f"scripts/autonomous-agent/{CLAUDE_OUTPUT_DIRNAME}/{issue_key}-{run_id}-verification.md"


def _legacy_verification_report_relpath(issue_key: str) -> str:
    """Get legacy verification report repo-relative path.

    Returns: scripts/autonomous-agent/reports/{ISSUE_KEY}-verification.md
    """
    return f"scripts/autonomous-agent/{CLAUDE_OUTPUT_DIRNAME}/{issue_key}-verification.md"


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


def _expected_verification_report_path(issue_key: str, description: str, run_id: Optional[str] = None) -> str:
    """Get expected verification report path based on description or default.

    PATCH 3-B: If VERIFICATION REQUIRED section exists with matching paths,
    returns the first path containing the issue key and ending with -verification.md.
    Otherwise returns the canonical default under scripts/autonomous-agent/reports/.

    Args:
        issue_key: The issue key (e.g., "KAN-16").
        description: Story/bug description text.
        run_id: Optional run ID for timestamped filename (preferred).

    Returns:
        Repo-relative path to expected verification report.
    """
    paths = _parse_verification_required_paths(description)

    # Find first path containing issue key and ending with -verification.md
    for path in paths:
        if issue_key in path and path.endswith('-verification.md'):
            return path

    # Default: scripts/autonomous-agent/reports/{ISSUE_KEY}-{RUN_ID}-verification.md (preferred)
    # Or legacy: scripts/autonomous-agent/reports/{ISSUE_KEY}-verification.md
    if run_id:
        return f"scripts/autonomous-agent/reports/{issue_key}-{run_id}-verification.md"
    return f"scripts/autonomous-agent/reports/{issue_key}-verification.md"


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
    """Resolve the most recent verification report for an issue.

    PATCH 3-C: Search precedence:
    1. scripts/autonomous-agent/reports/ (PREFERRED - canonical location)
    2. repo-root reports/ (fallback for backward compatibility)

    IMPORTANT: Only considers issue-key-prefixed reports:
    - {ISSUE_KEY}-verification.md (legacy)
    - {ISSUE_KEY}-{RUN_ID}-verification.md (timestamped)

    Title-prefixed reports (e.g., AUTONOMOUS-AGENT-...-verification.md) are IGNORED.

    Selection rules:
    - Newest by timestamp wins
    - Break ties in favor of scripts/autonomous-agent/reports/

    Returns: Repo-relative path to the newest verification report, or None if not found.
    """
    import glob

    prefix = f"{issue_key}-"
    suffix = "-verification.md"
    legacy_suffix = f"{issue_key}-verification.md"

    # List of (timestamp, repo_relative_path, is_preferred_dir)
    candidates = []
    mtimes = {}

    def add_candidates_from_dir(dir_path: Path, rel_prefix: str, is_preferred: bool):
        """Helper to add candidates from a directory."""
        if not dir_path.exists():
            return

        # Search for timestamped reports
        pattern = str(dir_path / f"{issue_key}-*-verification.md")
        for match in glob.glob(pattern):
            path = Path(match)
            filename = path.name

            # ONLY consider issue-key-prefixed files
            if not filename.startswith(prefix):
                continue

            rel_path = f"{rel_prefix}{filename}"

            if filename == legacy_suffix:
                mtime = path.stat().st_mtime
                mtimes[rel_path] = mtime
                candidates.append((datetime.fromtimestamp(mtime), rel_path, is_preferred))
            elif filename.endswith(suffix):
                run_id = filename[len(prefix):-len(suffix)]
                try:
                    ts = datetime.strptime(run_id, "%Y%m%d-%H%M%SZ")
                    candidates.append((ts, rel_path, is_preferred))
                except ValueError:
                    mtime = path.stat().st_mtime
                    mtimes[rel_path] = mtime
                    candidates.append((datetime.fromtimestamp(mtime), rel_path, is_preferred))

        # Also check for legacy file
        legacy_path = dir_path / legacy_suffix
        if legacy_path.exists():
            rel_path = f"{rel_prefix}{legacy_suffix}"
            if rel_path not in [c[1] for c in candidates]:
                mtime = legacy_path.stat().st_mtime
                mtimes[rel_path] = mtime
                candidates.append((datetime.fromtimestamp(mtime), rel_path, is_preferred))

    # PATCH 3-C: Search location 1: scripts/autonomous-agent/reports/ (PREFERRED)
    script_reports_dir = SCRIPT_DIR / CLAUDE_OUTPUT_DIRNAME
    add_candidates_from_dir(script_reports_dir, f"scripts/autonomous-agent/{CLAUDE_OUTPUT_DIRNAME}/", is_preferred=True)

    # Search location 2: repo-root reports/ (fallback for backward compatibility)
    repo_reports_dir = Path(repo_path) / "reports"
    add_candidates_from_dir(repo_reports_dir, "reports/", is_preferred=False)

    if not candidates:
        return None

    # Sort by: timestamp desc, then preferred dir (True > False)
    # is_preferred=True should come first when timestamps are equal
    candidates.sort(key=lambda x: (x[0], x[2]), reverse=True)
    return candidates[0][1]


def _is_transient_claude_failure(text: str) -> bool:
    """Check if Claude failure is transient and retryable."""
    text_lower = text.lower()
    return any(substr in text_lower for substr in CLAUDE_TRANSIENT_SUBSTRINGS)


def choose_transition(names: List[str]) -> Optional[str]:
    """Choose best transition name from available options.

    PATCH 2-B: Priority order (case-insensitive exact match):
    1. Resolved
    2. Done
    3. Closed
    4. Complete

    Returns: Chosen transition name or None if no match.
    """
    priority = ['Resolved', 'Done', 'Closed', 'Complete']
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
# ROLE DEFINITIONS (v3.2)
# =============================================================================

ROLE_UEP = {
    'name': 'UEP',
    'version': '3.2',
    'combines': [
        'Lead Product Manager',
        'Lead Technical Architect',
        'Lead UX Designer',
        'CTO',
        'CFO',
        'Content Strategist'
    ],
    'responsibilities': [
        'Produce high-level intent ONLY — never implementation',
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
    ]
}

ROLE_SUPERVISOR = {
    'name': 'SUPERVISOR',
    'version': '3.2',
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
    ]
}

ROLE_IMPLEMENTER = {
    'name': 'IMPLEMENTER',
    'version': '3.2',
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
    ]
}


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
        return cls(
            jira_url=os.environ.get('JIRA_URL', ''),
            jira_username=os.environ.get('JIRA_USERNAME', ''),
            jira_token=os.environ.get('JIRA_TOKEN', ''),
            github_token=os.environ.get('GITHUB_TOKEN', ''),
            gmail_address=os.environ.get('GMAIL_ADDRESS'),
            gmail_password=os.environ.get('GMAIL_APP_PASSWORD'),
            escalation_email=os.environ.get('ESCALATION_EMAIL', 'nm@narasimhan.me'),
            repo_path=os.environ.get('REPO_PATH', '/Users/lavanya/engineo/EngineO.ai'),
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
            print(f"[SYSTEM] Connected to Jira as: {result.get('displayName', 'Unknown')}")
            return True
        print(f"[SYSTEM] Jira connection failed: {result}")
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
        """Get Ideas (Initiatives) with exact 'TO DO' status from Product Discovery project

        Note: We filter by status = 'TO DO' (exact match), not statusCategory = 'To Do'.
        This ensures we only get Ideas that are explicitly marked as TO DO,
        not those in 'Parking lot' or other statuses within the To Do category.
        """
        jql = f'project = {self.config.product_discovery_project} AND status = "TO DO" ORDER BY created ASC'
        return self.search_issues(jql, ['summary', 'status', 'issuetype', 'description'])

    def get_epics_todo(self) -> List[dict]:
        """Get Epics with exact 'To Do' status from software project

        Note: KAN project uses 'To Do' (title case), different from EA's 'TO DO'.
        """
        jql = f'project = {self.config.software_project} AND issuetype = Epic AND status = "To Do" ORDER BY created ASC'
        return self.search_issues(jql, ['summary', 'status', 'description', 'parent'])

    def get_stories_todo(self) -> List[dict]:
        """Get Stories with exact 'To Do' status from software project"""
        jql = f'project = {self.config.software_project} AND issuetype = Story AND status = "To Do" ORDER BY created ASC'
        return self.search_issues(jql, ['summary', 'status', 'description', 'parent'])

    def get_stories_in_progress(self) -> List[dict]:
        """Get Stories in progress (for verification)

        Note: Uses statusCategory for In Progress as there may be multiple
        in-progress statuses (e.g., 'In Progress', 'In Review', etc.)
        """
        jql = f"project = {self.config.software_project} AND issuetype = Story AND statusCategory = 'In Progress' ORDER BY created ASC"
        return self.search_issues(jql, ['summary', 'status', 'description', 'parent'])

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

    def create_epic(self, summary: str, description: str, parent_key: str = None) -> Optional[str]:
        """Create an Epic in the software project"""
        payload = {
            'fields': {
                'project': {'key': self.config.software_project},
                'summary': summary,
                'description': self._text_to_adf(description),
                'issuetype': {'name': 'Epic'}
            }
        }

        result = self._request('POST', '/rest/api/3/issue', payload)

        if 'error' in result:
            print(f"[ERROR] Failed to create Epic: {result}")
            return None

        return result.get('key')

    def create_story(self, summary: str, description: str, epic_key: str = None) -> Optional[str]:
        """Create a Story in the software project"""
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
        try:
            # MCP JSON-RPC request to send email
            request_id = 1

            # Initialize request
            init_request = {
                "jsonrpc": "2.0",
                "id": request_id,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {},
                    "clientInfo": {"name": "engineo-agent", "version": "1.0.0"}
                }
            }

            # Send email request
            send_request = {
                "jsonrpc": "2.0",
                "id": request_id + 1,
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

            # Spawn MCP server process
            proc = subprocess.Popen(
                ['npx', '-y', '@gongrzhe/server-gmail-autoauth-mcp'],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            # Send requests
            proc.stdin.write(json.dumps(init_request) + '\n')
            proc.stdin.write(json.dumps(send_request) + '\n')
            proc.stdin.flush()

            # Wait for response with timeout
            try:
                stdout, stderr = proc.communicate(timeout=30)

                if proc.returncode == 0:
                    print(f"[EMAIL] Sent via MCP Gmail: {subject}")
                    print(f"[EMAIL] To: {self.config.escalation_email}")
                    return True
                else:
                    print(f"[EMAIL] MCP Gmail failed: {stderr[:200]}")
                    return False
            except subprocess.TimeoutExpired:
                proc.kill()
                print("[EMAIL] MCP Gmail timeout")
                return False

        except FileNotFoundError:
            print("[EMAIL] npx not found, MCP Gmail unavailable")
            return False
        except Exception as e:
            print(f"[EMAIL] MCP Gmail error: {e}")
            return False

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
        self.impl_plan_path = Path(config.repo_path) / 'docs' / 'IMPLEMENTATION_PLAN.md'

        # Generate unique run ID for this engine session (UTC timestamp)
        self.run_id = self._utc_ts()

        # Setup logs directory and engine log file (PATCH 2)
        # Logs are stored under scripts/autonomous-agent/logs (SCRIPT_DIR)
        self.logs_dir = SCRIPT_DIR / "logs"
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        self.engine_log_path = self.logs_dir / f"engine-{self.run_id}.log"

        # Now we can log (after engine_log_path is set)
        self.log("SYSTEM", f"Run ID: {self.run_id}")

        # Log rotation: delete logs older than 2 days (PATCH 3)
        deleted_count = rotate_logs(self.logs_dir, max_age_days=2)
        self.log("SYSTEM", f"Log rotation: deleted {deleted_count} old logs (>2 days)")

        # PATCH 5: Compute effective Claude timeout (CLI > env > default)
        # Precedence: --claude-timeout-secs > CLAUDE_TIMEOUT_SECS > ENGINEO_CLAUDE_TIMEOUT_SECONDS > CLAUDE_TIMEOUT_SECONDS > default
        self.claude_timeout_seconds = CLAUDE_TIMEOUT_SECONDS
        timeout_source = "default"

        # Check env vars (lowest precedence of overrides)
        for env_name in ["CLAUDE_TIMEOUT_SECONDS", "ENGINEO_CLAUDE_TIMEOUT_SECONDS", "CLAUDE_TIMEOUT_SECS"]:
            env_val = os.environ.get(env_name, "")
            if env_val:
                try:
                    parsed = int(env_val)
                    if parsed > 0:
                        self.claude_timeout_seconds = parsed
                        timeout_source = f"env:{env_name}"
                except ValueError:
                    pass

        # CLI flag has highest precedence
        if self._cli_timeout_secs is not None and self._cli_timeout_secs > 0:
            self.claude_timeout_seconds = self._cli_timeout_secs
            timeout_source = "cli:--claude-timeout-secs"

        timeout_hours = round(self.claude_timeout_seconds / 3600, 2)
        self.log("SYSTEM", f"Claude timeout configured: {self.claude_timeout_seconds}s ({timeout_hours}h) [source: {timeout_source}]")

        # Verify Claude Code CLI is available
        self.claude_code_available = self._verify_claude_code()
        if self.claude_code_available:
            self.log("SYSTEM", "Claude Code CLI enabled for all personas (no API key required)")
        else:
            self.log("WARNING", "Claude Code CLI not found - install with: npm install -g @anthropic-ai/claude-code")

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
                self.log("SYSTEM", f"Claude Code CLI: {version[:50]}")
                return True
            return False
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False

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
            self.log("SYSTEM", f"Ledger save failed: {e}")
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
            self.log("SYSTEM", f"Warning: failed to save ledger for {issue_key}")

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
        """Ensure verification report exists at expected path.

        Computes expected path from VERIFICATION REQUIRED section or default.
        If expected path already exists, returns it.
        Otherwise searches for candidate reports and copies newest to expected path.

        PATCH 1-D: Copy-only, never creates stub reports.

        Args:
            issue_key: The issue key (e.g., "KAN-16").
            description: Story/bug description text.

        Returns: Repo-relative path to verification report if exists/copied, else None.
        """
        import glob
        import shutil

        expected_path = _expected_verification_report_path(issue_key, description, self.run_id)
        expected_fullpath = Path(self.config.repo_path) / expected_path

        # If expected path already exists, return it
        if expected_fullpath.exists():
            return expected_path

        # Create parent directories if needed
        expected_fullpath.parent.mkdir(parents=True, exist_ok=True)

        prefix = f"{issue_key}-"
        candidates = []  # List of (mtime, Path)

        # Search location 1: repo-root reports/
        repo_reports_dir = Path(self.config.repo_path) / "reports"
        if repo_reports_dir.exists():
            for match in glob.glob(str(repo_reports_dir / "*-verification.md")):
                path = Path(match)
                filename = path.name

                # Accept issue-key-prefixed files
                if filename.startswith(prefix):
                    candidates.append((path.stat().st_mtime, path))
                    continue

                # Accept title-prefixed ONLY if content contains issue key (safety)
                try:
                    content = path.read_text(encoding='utf-8')
                    if issue_key in content:
                        candidates.append((path.stat().st_mtime, path))
                except (OSError, UnicodeDecodeError):
                    pass

        # Search location 2: scripts/autonomous-agent/reports/
        script_reports_dir = SCRIPT_DIR / CLAUDE_OUTPUT_DIRNAME
        if script_reports_dir.exists():
            for match in glob.glob(str(script_reports_dir / "*-verification.md")):
                path = Path(match)
                filename = path.name

                # Accept issue-key-prefixed files
                if filename.startswith(prefix):
                    candidates.append((path.stat().st_mtime, path))
                    continue

                # Accept title-prefixed ONLY if content contains issue key (safety)
                try:
                    content = path.read_text(encoding='utf-8')
                    if issue_key in content:
                        candidates.append((path.stat().st_mtime, path))
                except (OSError, UnicodeDecodeError):
                    pass

        if not candidates:
            return None

        # Choose newest by mtime
        candidates.sort(key=lambda x: x[0], reverse=True)
        source_path = candidates[0][1]

        # Copy to expected path
        try:
            shutil.copy2(source_path, expected_fullpath)
            self.log("IMPLEMENTER", f"Copied verification report: {source_path.name} -> {expected_path}")

            # PATCH 3-B: Also write/update legacy alias {ISSUE_KEY}-verification.md (best-effort)
            legacy_alias = expected_fullpath.parent / f"{issue_key}-verification.md"
            try:
                shutil.copy2(expected_fullpath, legacy_alias)
                self.log("IMPLEMENTER", f"Updated legacy alias: {issue_key}-verification.md")
            except OSError:
                pass  # Best-effort for legacy alias

            return expected_path
        except OSError as e:
            self.log("IMPLEMENTER", f"Failed to copy verification report: {e}")
            return None

    def log(self, role: str, message: str):
        """Log with role prefix to both console and run-scoped log file.

        PATCH 2 & 5: Tee structured logs to console AND engine-<run_id>.log with flush.
        Role display mapping: internal keys -> display names for consistency.
        """
        # PATCH 2-C: No role remapping - use exact role keys as passed
        # Resulting log prefix: [UEP], [SUPERVISOR], [IMPLEMENTER], [SYSTEM], [CLAUDE]
        display_role = role

        timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        log_line = f"[{timestamp}] [{display_role}] {message}"

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
                self.log("SYSTEM", f"Config error: {err}")
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

        self.log("SYSTEM", "Initialization complete. Starting runtime loop...")
        print()

        iteration = 0
        while self.running:
            iteration += 1
            print(f"\n{'=' * 60}")
            print(f"  RUNTIME LOOP - ITERATION {iteration}")
            print(f"{'=' * 60}\n")

            try:
                # Step 1: UEP - Check for Ideas (Initiatives)
                if self.step_1_initiative_intake():
                    continue

                # Step 2: Supervisor - Check for Epics to decompose
                if self.step_2_epic_decomposition():
                    continue

                # Step 3: Developer - Check for Stories to implement
                if self.step_3_story_implementation():
                    continue

                # Step 4: Supervisor - Check for Stories to verify
                if self.step_4_story_verification():
                    continue

                # No work found - idle
                self.log("SYSTEM", "STATUS: IDLE - No work items found")
                self.log("SYSTEM", "Waiting for new Initiatives in Product Discovery...")

                # Wait before next iteration
                time.sleep(30)

            except KeyboardInterrupt:
                self.log("SYSTEM", "Shutdown requested")
                self.running = False
            except Exception as e:
                self.log("SYSTEM", f"Unexpected error: {e}")
                self.escalate("SYSTEM", "Runtime Error", str(e))
                time.sleep(60)

    def step_1_initiative_intake(self) -> bool:
        """UEP: Process Ideas (Initiatives) from Product Discovery

        The UEP role:
        - Reads Ideas from Atlassian Product Discovery
        - Analyzes the initiative to define WHAT we build and WHY
        - Creates one or more Epics with business goals and acceptance criteria
        - NEVER writes code or implementation details
        """
        self.log("UEP", "STEP 1: Checking for Ideas with 'To Do' status...")

        ideas = self.jira.get_ideas_todo()

        if not ideas:
            self.log("UEP", "No Ideas in 'To Do' status")
            return False

        self.log("UEP", f"Found {len(ideas)} Ideas in 'To Do' status")

        # Process oldest (FIFO)
        idea = ideas[0]
        key = idea['key']
        summary = idea['fields']['summary']
        description = self.jira.parse_adf_to_text(idea['fields'].get('description', {}))

        self.log("UEP", f"Processing: [{key}] {summary}")
        self.log("UEP", "Analyzing initiative to define business intent...")

        # UEP Analysis: Extract business goals, scope, and acceptance criteria
        epics_to_create = self._uep_analyze_idea(key, summary, description)

        created_epics = []
        for epic_def in epics_to_create:
            epic_key = self.jira.create_epic(epic_def['summary'], epic_def['description'])
            if epic_key:
                self.log("UEP", f"Created Epic: {epic_key} - {epic_def['summary']}")
                created_epics.append(epic_key)

        if created_epics:
            # Update Initiative status to In Progress
            self.jira.transition_issue(key, 'In Progress')

            # Add comment with all created Epics
            epic_list = '\n'.join([f"- {e}" for e in created_epics])
            self.jira.add_comment(key, f"""
Initiative processed by UEP

Created {len(created_epics)} Epic(s):
{epic_list}

Business Intent Defined:
- Scope analyzed and decomposed
- Acceptance criteria established
- Ready for Supervisor decomposition into Stories
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

## Idea to Analyze
{idea_key}: {summary}

## Description
{description}

## Your Task
As UEP, you must:
1. Define WHAT we're building and WHY
2. Establish clear business goals
3. Create specific, measurable acceptance criteria
4. Define scope boundaries
5. NEVER include implementation details or code

## Output Format
Generate the Epic description in markdown format with these sections:
- Initiative (reference the idea)
- Business Intent: What We're Building
- Business Goals (bullet list)
- Acceptance Criteria (checkbox list)
- Scope Boundaries (In Scope, Out of Scope, Dependencies)
- UX/Product Expectations (if applicable)

Be specific and actionable. The Supervisor will use this to create implementation Stories.

IMPORTANT: Output ONLY the Epic description markdown. Do not include any other text, explanations, or commentary.

Generate the Epic description now:"""

            self.log("UEP", f"Calling Claude Code CLI ({MODEL_UEP}) for business analysis...")

            # Run Claude Code CLI with the prompt (using opus for high-quality analysis)
            result = subprocess.run(
                ['claude', '--model', MODEL_UEP, '-p', prompt, '--dangerously-skip-permissions'],
                cwd=self.config.repo_path,
                capture_output=True,
                text=True,
                timeout=120  # 2 minute timeout for analysis
            )

            if result.returncode != 0:
                self.log("UEP", f"Claude Code CLI error: {result.stderr[:200]}")
                return self._basic_analyze_idea(idea_key, summary, description)

            epic_description = result.stdout.strip()
            self.log("UEP", f"Claude Code CLI generated {len(epic_description)} chars of business intent")

            # Add UEP signature
            epic_description += """

---
*This Epic was created by UEP v3.2*
*Powered by Claude Code CLI with Opus model (no API key required)*
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

        The Supervisor role:
        - Reads Epic business intent from UEP
        - Analyzes the codebase to find relevant files
        - Creates PATCH BATCH instructions (surgical, minimal diffs)
        - Decomposes into one or more Stories
        - NEVER writes actual code, only PATCH BATCH specs
        """
        self.log("SUPERVISOR", "STEP 2: Checking for Epics with 'To Do' status...")

        epics = self.jira.get_epics_todo()

        if not epics:
            self.log("SUPERVISOR", "No Epics in 'To Do' status")
            return False

        self.log("SUPERVISOR", f"Found {len(epics)} Epics in 'To Do' status")

        # Process oldest (FIFO)
        epic = epics[0]
        key = epic['key']
        summary = epic['fields']['summary']
        description = self.jira.parse_adf_to_text(epic['fields'].get('description', {}))

        self.log("SUPERVISOR", f"Decomposing: [{key}] {summary}")
        self.log("SUPERVISOR", "Analyzing codebase to identify implementation targets...")

        # Supervisor Analysis: Read codebase, identify files, create PATCH BATCH
        stories_to_create = self._supervisor_analyze_epic(key, summary, description)

        created_stories = []
        for story_def in stories_to_create:
            story_key = self.jira.create_story(story_def['summary'], story_def['description'], key)
            if story_key:
                self.log("SUPERVISOR", f"Created Story: {story_key} - {story_def['summary']}")
                created_stories.append(story_key)

        if created_stories:
            # Transition Epic to In Progress
            self.jira.transition_issue(key, 'In Progress')

            # Add comment with all created Stories
            story_list = '\n'.join([f"- {s}" for s in created_stories])
            self.jira.add_comment(key, f"""
Epic decomposed by SUPERVISOR v3.2

Created {len(created_stories)} Story(ies):
{story_list}

Analysis Complete:
- Codebase scanned for relevant files
- PATCH BATCH instructions generated
- Ready for Developer implementation
""")
            return True

        return False

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

        if not relevant_files:
            self.log("SUPERVISOR", "No relevant files found - creating placeholder Story")
            return [self._create_placeholder_story(epic_key, summary, description)]

        # Analyze files and generate PATCH BATCH instructions
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
        """Generate Story with PATCH BATCH instructions using Claude Code CLI"""

        # Read full file contents for Claude analysis
        file_contents = []
        for f in files[:5]:  # Limit to 5 files
            success, content = self.files.read_file(f['path'])
            if success:
                file_contents.append({
                    'path': f['path'],
                    'content': content[:4000]  # Limit content size
                })

        # Use Claude Code CLI to generate PATCH BATCH (no API key required)
        if self.claude_code_available and file_contents:
            self.log("SUPERVISOR", "Using Claude Code CLI to analyze code and generate PATCH BATCH...")
            patch_batch_text = self._claude_code_generate_patches(epic_key, summary, description, file_contents)
        else:
            self.log("SUPERVISOR", "Claude Code CLI not available - generating template PATCH BATCH")
            # Create template patches
            patch_sections = []
            for f in files[:3]:
                patch_sections.append(f"""
FILE: {f['path']}
OPERATION: edit
DESCRIPTION: Add changes per Epic requirements
---OLD---
// TODO: Identify exact code block to modify
---NEW---
// TODO: Specify replacement code
---END---
""")
            patch_batch_text = '\n'.join(patch_sections) if patch_sections else "No patches generated"

        # Build file analysis section for reference
        file_analysis = []
        for f in files[:5]:
            file_analysis.append(f"### {f['path']}\n```\n{f['preview'][:300]}...\n```")
        file_analysis_text = '\n\n'.join(file_analysis) if file_analysis else "No files analyzed"

        story_description = f"""
## Parent Epic
{epic_key}: {summary}

## Implementation Goal
{description[:800]}

---

## Codebase Analysis (by Supervisor)

The following files were identified as relevant to this implementation:

{file_analysis_text}

---

## PATCH BATCH Instructions

The following patches should be applied by the Developer:

PATCH BATCH: {summary}

{patch_batch_text}

---

## Verification Checklist
- [ ] Code implemented per PATCH BATCH specs
- [ ] Changes are surgical and minimal
- [ ] Existing functionality preserved
- [ ] Tests pass
- [ ] IMPLEMENTATION_PLAN.md updated
- [ ] Committed to {self.config.feature_branch}

---
*Story created by SUPERVISOR v3.2*
*PATCH BATCH instructions generated from codebase analysis*
*No API key required - using local Claude Code*
"""

        return {
            'summary': f"Implement: {summary}",
            'description': story_description
        }

    def _claude_code_generate_patches(self, epic_key: str, summary: str, description: str, files: List[dict]) -> str:
        """Use Claude Code CLI to analyze code and generate actual PATCH BATCH instructions (no API key required)"""
        try:
            # Build the file context for Claude
            files_context = ""
            for f in files:
                files_context += f"\n\n### FILE: {f['path']}\n```\n{f['content']}\n```"

            prompt = f"""You are the SUPERVISOR in an autonomous development system. Your role is to analyze code and generate PATCH BATCH instructions for implementation.

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

IMPORTANT: Output ONLY the PATCH BATCH instructions. Do not include any other text, explanations, or commentary.

Generate the PATCH BATCH instructions now:"""

            self.log("SUPERVISOR", f"Calling Claude Code CLI ({MODEL_SUPERVISOR}) for code analysis...")

            # Run Claude Code CLI with the prompt (using opus for deep code analysis)
            result = subprocess.run(
                ['claude', '--model', MODEL_SUPERVISOR, '-p', prompt, '--dangerously-skip-permissions'],
                cwd=self.config.repo_path,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout for code analysis
            )

            if result.returncode != 0:
                self.log("SUPERVISOR", f"Claude Code CLI error: {result.stderr[:200]}")
                # Fallback to template
                return self._generate_template_patches(files)

            patch_content = result.stdout.strip()
            self.log("SUPERVISOR", f"Claude Code CLI generated {len(patch_content)} chars of PATCH BATCH")

            return patch_content

        except subprocess.TimeoutExpired:
            self.log("SUPERVISOR", "Claude Code CLI timed out")
            return self._generate_template_patches(files)
        except Exception as e:
            self.log("SUPERVISOR", f"Claude Code CLI error: {e}")
            return self._generate_template_patches(files)

    def _generate_template_patches(self, files: List[dict]) -> str:
        """Generate template patches when Claude Code CLI is not available"""
        patch_sections = []
        for f in files[:3]:
            patch_sections.append(f"""
FILE: {f.get('path', 'unknown')}
OPERATION: edit
DESCRIPTION: Add changes per Epic requirements
---OLD---
// TODO: Identify exact code block to modify
---NEW---
// TODO: Specify replacement code
---END---
""")
        return '\n'.join(patch_sections) if patch_sections else "No patches generated"

    def _create_placeholder_story(self, epic_key: str, summary: str, description: str) -> dict:
        """Create placeholder Story when no relevant files found"""
        story_description = f"""
## Parent Epic
{epic_key}: {summary}

## Implementation Goal
{description[:800]}

---

## Codebase Analysis

**Status:** No directly relevant files found in initial scan.

The Supervisor requires human assistance to:
1. Identify the correct files to modify
2. Provide context about the codebase structure
3. Specify the exact locations for changes

---

## PATCH BATCH Instructions

PATCH BATCH: {summary}

FILE: <path/to/relevant/file.tsx>
OPERATION: edit
DESCRIPTION: <description of change needed>
---OLD---
<existing code to replace>
---NEW---
<new code with changes>
---END---

---

## Action Required
Please update this Story with specific PATCH BATCH instructions
after identifying the relevant codebase locations.

---
*Story created by SUPERVISOR v3.2*
*Human assistance required for PATCH BATCH specification*
"""

        return {
            'summary': f"Implement: {summary}",
            'description': story_description
        }

    def step_3_story_implementation(self) -> bool:
        """Developer: Implement Stories using Claude Code CLI"""
        self.log("IMPLEMENTER", "STEP 3: Checking for Stories with 'To Do' status...")

        stories = self.jira.get_stories_todo()

        if not stories:
            self.log("IMPLEMENTER", "No Stories in 'To Do' status")
            return False

        self.log("IMPLEMENTER", f"Found {len(stories)} Stories in 'To Do' status")

        # Process oldest (FIFO)
        story = stories[0]
        key = story['key']
        summary = story['fields']['summary']
        description = self.jira.parse_adf_to_text(story['fields'].get('description', {}))

        self.log("IMPLEMENTER", f"Implementing: [{key}] {summary}")

        # Check if docs modifications are allowed by ALLOWED FILES constraints
        allow_docs = _docs_allowed_by_constraints(description)

        # Transition to In Progress
        self.jira.transition_issue(key, 'In Progress')

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

        if success:
            self.log("IMPLEMENTER", f"Claude Code completed implementation")
            self.log("IMPLEMENTER", f"Modified files: {', '.join(modified_files) if modified_files else 'None detected'}")

            # Update IMPLEMENTATION_PLAN.md only if docs allowed
            if modified_files:
                if allow_docs:
                    self._update_implementation_plan(key, summary, modified_files)
                else:
                    self.log("IMPLEMENTER", "Skipping IMPLEMENTATION_PLAN.md update (docs not allowed by ALLOWED FILES)")

            # Commit and push changes to feature branch
            commit_success = False
            if modified_files:
                self.log("IMPLEMENTER", "Committing changes to git...")
                commit_success = self._commit_implementation(key, summary, modified_files, allow_docs)
                if commit_success:
                    self.log("IMPLEMENTER", f"Changes committed and pushed to {self.config.feature_branch}")
                else:
                    self.log("IMPLEMENTER", "Failed to commit changes - manual commit required")

            # Add success comment to Jira
            commit_status = "Committed and pushed" if commit_success else "Changes pending commit"
            self.jira.add_comment(key, f"""
Implementation completed by IMPLEMENTER.

Branch: {self.config.feature_branch}
Status: {commit_status}
Files modified:
{chr(10).join(['- ' + f for f in modified_files]) if modified_files else '(see git log for details)'}

Ready for Supervisor verification.
""")
            self.log("IMPLEMENTER", f"Story {key} implementation complete")

            # PATCH 1-D: Ensure verification report at expected path
            self._ensure_verification_report(key, description)

            # PATCH 2-B: Resolve verification report path for ledger
            resolved_report_path = _resolve_verification_report(self.config.repo_path, key) or ""

            # PATCH 2-C: Upsert ledger entry on success
            self._upsert_kan_story_run(key, {
                "status": "implemented",
                "runId": self.run_id,
                "baseSha": head_sha_after or head_sha_before or "",
                "verificationReportPath": resolved_report_path,
                "attemptArtifacts": [artifact_path] if artifact_path else [],
                "guardrailsPassed": commit_detected or commit_success,
            })
        else:
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

Implemented by EngineO Autonomous Execution Engine (IMPLEMENTER v3.2)

Files modified:
{chr(10).join(['- ' + f for f in filtered_files])}

Story: {story_key}
Branch: {self.config.feature_branch}
"""

        # Commit
        if not self.git.commit(commit_message):
            self.log("IMPLEMENTER", "Failed to create commit")
            return False

        # Push
        if not self.git.push():
            self.log("IMPLEMENTER", "Failed to push to remote")
            return False

        self.log("IMPLEMENTER", "Changes committed and pushed successfully")
        return True

    def verify_work_item(self, issue: dict) -> bool:
        """Verify a single work item (Story or Bug) and auto-transition if passed.

        PATCH 1-C: Real verification with ledger gate and auto-transition.

        Returns: True if any action was taken, False otherwise.
        """
        key = issue['key']
        summary = issue['fields']['summary']
        issue_type = issue['fields']['issuetype']['name']
        status = issue['fields']['status']['name']

        # Only process items in "In Progress"
        if status != "In Progress":
            return False

        self.log("SUPERVISOR", f"Verifying [{key}] {issue_type}: {summary}")

        # Step 1: Resolve verification report
        report_path = _resolve_verification_report(self.config.repo_path, key)

        if not report_path:
            # PENDING: No verification report found
            self.log("SUPERVISOR", f"[{key}] Verification report not found")
            comment = f"""Supervisor Verification: PENDING — verification report not found

Expected pattern: {key}-*-verification.md"""
            self.jira.add_comment(key, comment)
            return True

        # PATCH 2-B: Checklist header validation
        report_full_path = Path(self.config.repo_path) / report_path
        try:
            report_content = report_full_path.read_text(encoding='utf-8')
        except (OSError, UnicodeDecodeError) as e:
            self.log("SUPERVISOR", f"[{key}] Cannot read report: {e}")
            comment = f"""Supervisor Verification: INVALID — cannot read report

Report: {report_path}
Error: {e}"""
            self.jira.add_comment(key, comment)
            return True

        if "## Checklist" not in report_content:
            self.log("SUPERVISOR", f"[{key}] Invalid report: missing ## Checklist")
            comment = f"""Supervisor Verification: INVALID — report missing ## Checklist header

Report: {report_path}
Note: Verification reports MUST contain a ## Checklist section."""
            self.jira.add_comment(key, comment)
            return True

        # Step 2: Load/init ledger and check entry
        ledger = self._load_guardrails_ledger()

        # If ledger file missing/unreadable, initialize it and return PENDING (not FAILED)
        if ledger is None:
            self.log("SUPERVISOR", f"[{key}] Ledger file missing, initializing...")
            ledger = self._load_or_init_guardrails_ledger()
            comment = f"""Supervisor Verification: PENDING — guardrails ledger initialized; entry missing

Report: {report_path}
Note: Ledger was just created. Run implementation again or wait for next verification cycle."""
            self.jira.add_comment(key, comment)
            return True

        # Look up entry (canonical kan_story_runs first, fallback for backward compat)
        entry = None
        if isinstance(ledger, dict):
            entry = ledger.get("kan_story_runs", {}).get(key)
            if entry is None:
                entry = self._find_ledger_entry(ledger, key)

        # If entry missing, return PENDING (not FAILED)
        if entry is None:
            self.log("SUPERVISOR", f"[{key}] No ledger entry found")
            comment = f"""Supervisor Verification: PENDING — no ledger entry for {key}

Report: {report_path}
Note: Implementation may not have run the commit gate yet."""
            self.jira.add_comment(key, comment)
            return True

        # Entry exists - check if guardrails passed
        if not self._ledger_passed(entry):
            # FAILED: Entry exists but guardrails not passed
            self.log("SUPERVISOR", f"[{key}] Verification FAILED: guardrails not passed")

            comment = f"""Supervisor Verification: FAILED — guardrails not passed

Report: {report_path}
Reason: Entry exists but guardrailsPassed is not true"""
            self.jira.add_comment(key, comment)

            # Transition to Blocked (fallback to To Do)
            if not self.jira.transition_issue(key, "Blocked"):
                self.jira.transition_issue(key, "To Do")

            # Escalate
            self.escalate("SUPERVISOR", f"{issue_type} {key} verification failed (guardrails)",
                         f"Issue: {key}\nSummary: {summary}\nReason: guardrails not passed\nReport: {report_path}")
            return True

        # Step 3: PASSED - get evidence and attempt auto-transition
        base_sha_short, changed_files_count = self._ledger_evidence(entry)
        self.log("SUPERVISOR", f"[{key}] Verification PASSED (base={base_sha_short}, files={changed_files_count})")

        # Update ledger entry to mark as verified
        self._upsert_kan_story_run(key, {
            "status": "verified",
            "verificationReportPath": report_path,
        })

        # Probe available transitions (PATCH 2-C)
        names = self.jira.get_available_transition_names(key)
        chosen = choose_transition(names)

        if chosen is None:
            # No matching transition found
            comment = f"""Supervisor Verification: PASSED — cannot auto-transition (no matching transition found)

Report: {report_path}
Base SHA: {base_sha_short}
Changed files: {changed_files_count}
Available transitions: {', '.join(names) if names else 'none'}"""
            self.jira.add_comment(key, comment)
            self.log("SUPERVISOR", f"[{key}] No matching transition found: {names}")
            return True

        # Attempt transition
        if self.jira.transition_issue(key, chosen):
            comment = f"""Supervisor Verification: PASSED

Report: {report_path}
Base SHA: {base_sha_short}
Changed files: {changed_files_count}
Status: Transitioned to {chosen}"""
            self.jira.add_comment(key, comment)
            self.log("SUPERVISOR", f"[{key}] Transitioned to {chosen}")
        else:
            comment = f"""Supervisor Verification: PASSED — auto-transition failed; manual move required

Report: {report_path}
Base SHA: {base_sha_short}
Changed files: {changed_files_count}
Attempted transition: {chosen}"""
            self.jira.add_comment(key, comment)
            self.log("SUPERVISOR", f"[{key}] Transition to {chosen} failed")

        return True

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

        self.log("SYSTEM", f"ESCALATION: {title}")
        self.email.send_escalation(subject, body)

    def process_issue(self, issue_key: str) -> bool:
        """Process a specific issue by key, determining the appropriate persona based on issue type"""
        self.log("SYSTEM", f"Processing specific issue: {issue_key}")

        # Get the issue details
        issue = self.jira.get_issue(issue_key)
        if not issue:
            self.log("SYSTEM", f"Issue {issue_key} not found")
            return False

        issue_type = issue['fields']['issuetype']['name'].lower()
        summary = issue['fields']['summary']
        status = issue['fields']['status']['name']

        self.log("SYSTEM", f"Issue: [{issue_key}] {summary}")
        self.log("SYSTEM", f"Type: {issue_type}, Status: {status}")

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
            self.log("SYSTEM", f"Unknown issue type: {issue_type}")
            return False

    def _process_idea(self, issue: dict) -> bool:
        """UEP: Process a specific Idea (uses enhanced analysis)"""
        key = issue['key']
        summary = issue['fields']['summary']
        description = self.jira.parse_adf_to_text(issue['fields'].get('description', {}))

        self.log("UEP", f"Processing Idea: [{key}] {summary}")
        self.log("UEP", "Analyzing initiative to define business intent...")

        # Use enhanced UEP analysis
        epics_to_create = self._uep_analyze_idea(key, summary, description)

        created_epics = []
        for epic_def in epics_to_create:
            epic_key = self.jira.create_epic(epic_def['summary'], epic_def['description'])
            if epic_key:
                self.log("UEP", f"Created Epic: {epic_key}")
                created_epics.append(epic_key)

        if created_epics:
            self.jira.transition_issue(key, 'In Progress')
            epic_list = '\n'.join([f"- {e}" for e in created_epics])
            self.jira.add_comment(key, f"""
Initiative processed by UEP

Created {len(created_epics)} Epic(s):
{epic_list}

Business Intent Defined - Ready for Supervisor decomposition.
""")
            return True

        return False

    def _process_epic(self, issue: dict) -> bool:
        """Supervisor: Decompose a specific Epic into Stories (uses enhanced analysis)"""
        key = issue['key']
        summary = issue['fields']['summary']
        description = self.jira.parse_adf_to_text(issue['fields'].get('description', {}))

        self.log("SUPERVISOR", f"Decomposing Epic: [{key}] {summary}")

        # PATCH 4-B: Idempotency check - skip if implement-stories already exist
        existing_stories = self.jira.get_implement_stories_for_epic(key)
        if existing_stories:
            keys = [s['key'] for s in existing_stories]
            self.log("SUPERVISOR", f"[{key}] Skipping decomposition: {len(existing_stories)} implement-stories already exist: {', '.join(keys)}")

            # Add comment noting decomposition is already complete
            story_list = '\n'.join([f"- {s['key']}: {s['fields']['summary']}" for s in existing_stories])
            self.jira.add_comment(key, f"""
Epic decomposition already complete.

Existing {len(existing_stories)} implement-story(ies):
{story_list}

No new stories created (idempotency check).
""")

            # Transition Epic to In Progress (best-effort)
            self.jira.transition_issue(key, 'In Progress')

            return True  # Action taken - mark as processed

        self.log("SUPERVISOR", "Analyzing codebase to identify implementation targets...")

        # Use enhanced Supervisor analysis
        stories_to_create = self._supervisor_analyze_epic(key, summary, description)

        created_stories = []
        for story_def in stories_to_create:
            story_key = self.jira.create_story(story_def['summary'], story_def['description'], key)
            if story_key:
                self.log("SUPERVISOR", f"Created Story: {story_key}")
                created_stories.append(story_key)

        if created_stories:
            self.jira.transition_issue(key, 'In Progress')
            story_list = '\n'.join([f"- {s}" for s in created_stories])
            self.jira.add_comment(key, f"""
Epic decomposed by SUPERVISOR v3.2

Created {len(created_stories)} Story(ies):
{story_list}

Codebase analyzed - PATCH BATCH instructions generated.
Ready for Developer implementation.
""")
            return True

        return False

    def _process_story(self, issue: dict) -> bool:
        """Developer: Implement a specific Story using Claude Code CLI"""
        key = issue['key']
        summary = issue['fields']['summary']
        description = self.jira.parse_adf_to_text(issue['fields'].get('description', {}))
        status = issue['fields']['status']['name'].lower()

        self.log("IMPLEMENTER", f"Implementing Story: [{key}] {summary}")

        # Check if docs modifications are allowed by ALLOWED FILES constraints
        allow_docs = _docs_allowed_by_constraints(description)

        # Transition to In Progress if not already
        if 'to do' in status:
            self.jira.transition_issue(key, 'In Progress')
            self.jira.add_comment(key, f"Implementation started by IMPLEMENTER\nBranch: {self.config.feature_branch}")

        # Use Claude Code CLI to implement the story
        self.log("IMPLEMENTER", "Invoking Claude Code CLI for implementation...")

        # PATCH 2-A: Capture head SHA before Claude execution
        head_sha_before = self.git.get_head_sha()

        success, _, modified_files, artifact_path = self._invoke_claude_code(key, summary, description)

        # PATCH 2-A: Capture head SHA after Claude execution
        head_sha_after = self.git.get_head_sha()
        commit_detected = bool(head_sha_after and head_sha_before and head_sha_after != head_sha_before)

        if success:
            self.log("IMPLEMENTER", f"Claude Code completed implementation")
            self.log("IMPLEMENTER", f"Modified files: {', '.join(modified_files) if modified_files else 'None detected'}")

            # Update IMPLEMENTATION_PLAN.md only if docs allowed
            if modified_files:
                if allow_docs:
                    self._update_implementation_plan(key, summary, modified_files)
                else:
                    self.log("IMPLEMENTER", "Skipping IMPLEMENTATION_PLAN.md update (docs not allowed by ALLOWED FILES)")

            # Commit and push changes to feature branch
            commit_success = False
            if modified_files:
                self.log("IMPLEMENTER", "Committing changes to git...")
                commit_success = self._commit_implementation(key, summary, modified_files, allow_docs)
                if commit_success:
                    self.log("IMPLEMENTER", f"Changes committed and pushed to {self.config.feature_branch}")
                else:
                    self.log("IMPLEMENTER", "Failed to commit changes - manual commit required")

            # Add success comment to Jira
            commit_status = "Committed and pushed" if commit_success else "Changes pending commit"
            self.jira.add_comment(key, f"""
Implementation completed by IMPLEMENTER.

Branch: {self.config.feature_branch}
Status: {commit_status}
Files modified:
{chr(10).join(['- ' + f for f in modified_files]) if modified_files else '(see git log for details)'}

Ready for Supervisor verification.
""")
            self.log("IMPLEMENTER", f"Story {key} implementation complete")

            # PATCH 1-D: Ensure verification report at expected path
            self._ensure_verification_report(key, description)

            # PATCH 2-B: Resolve verification report path for ledger
            resolved_report_path = _resolve_verification_report(self.config.repo_path, key) or ""

            # PATCH 2-C: Upsert ledger entry on success
            self._upsert_kan_story_run(key, {
                "status": "implemented",
                "runId": self.run_id,
                "baseSha": head_sha_after or head_sha_before or "",
                "verificationReportPath": resolved_report_path,
                "attemptArtifacts": [artifact_path] if artifact_path else [],
                "guardrailsPassed": commit_detected or commit_success,
            })
        else:
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

        self.log("IMPLEMENTER", "Notifying Supervisor for verification...")
        return True

    def _invoke_claude_code(self, story_key: str, summary: str, description: str) -> Tuple[bool, str, List[str], str]:
        """Invoke Claude Code CLI to implement a story with PTY streaming output.

        Claude Execution Hardening (OBSERVABILITY-HARDENING-1):
        - Acquires lock to prevent concurrent sessions
        - Streams output live via PTY with [CLAUDE] prefix (secrets redacted)
        - Line-buffered output prevents cross-chunk leakage
        - Emits heartbeat if no output for 30s
        - Configurable timeout (default 4h, env override, per-ticket cap)
        - Writes per-attempt artifacts
        - Retries transient failures up to CLAUDE_MAX_ATTEMPTS times

        Returns: (success, output, list of modified files, artifact_path)
        """
        # Build the prompt for Claude Code
        # PATCH 3-B: Compute expected verification report path with run_id for timestamped filename
        expected_report_path = _expected_verification_report_path(story_key, description, self.run_id)

        prompt = f"""You are the IMPLEMENTER in an autonomous execution system.

## Story to Implement
{story_key}: {summary}

## Implementation Details
{description}

## Instructions
1. Implement the changes described in the PATCH BATCH instructions above
2. Apply each patch surgically and minimally
3. Follow existing code patterns and conventions
4. After implementation, commit the changes with message:
   "feat({story_key}): {summary}"
5. Do NOT push to remote - just commit locally

## Verification Report (REQUIRED)
Write verification report EXACTLY to: {expected_report_path}

CRITICAL: You MUST use the exact path above. Do NOT use title-prefixed filenames like
AUTONOMOUS-AGENT-...-verification.md. Title-prefixed reports are NOT accepted as valid
verification output and will cause verification to fail.

Important:
- Make ONLY the changes specified in the PATCH BATCH
- Do NOT refactor or change unrelated code
- Preserve existing formatting and structure
- If PATCH BATCH is unclear, implement based on the Epic requirements
- Run tool/command actions sequentially (one at a time); do not run concurrent tool operations.

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
                self.log("IMPLEMENTER", f"Claude attempt {attempt}/{CLAUDE_MAX_ATTEMPTS}...")
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
                                    self.log("IMPLEMENTER", f"[{issue_key}] Fatal error detected, killing process")
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
                                        self.log("CLAUDE", redacted_line)

                                # PATCH 4-E: Emit partial buffer if exceeds threshold (reduces visibility gaps)
                                if len(line_buf) > LINE_BUF_THRESHOLD:
                                    redacted_chunk = _redact_secrets(line_buf[:LINE_BUF_THRESHOLD])
                                    self.log("CLAUDE", f"[partial] {redacted_chunk}")
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
                                self.log("IMPLEMENTER", f"Claude still running... (elapsed: {elapsed_mins}m {elapsed_secs}s)")
                                last_output_time = time.time()  # Reset heartbeat timer

                    # Flush remaining line buffer (PATCH 4-C)
                    if line_buf.strip():
                        # Write remaining buffer to artifact (redacted)
                        artifact_file.write(_redact_secrets(line_buf))
                        artifact_file.flush()
                        display_text = _parse_stream_json_line(line_buf)
                        if display_text:
                            redacted = _redact_secrets(display_text)
                            self.log("CLAUDE", redacted)

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
                    self.log("IMPLEMENTER", f"Attempt artifact: {final_artifact_path}")

                    if timed_out:
                        timeout_mins = timeout_seconds // 60
                        timeout_msg = f"Claude Code timed out after {timeout_mins} minutes (attempt {attempt})"
                        self.log("IMPLEMENTER", timeout_msg)

                        # Timeout is transient - retry if attempts remain
                        if attempt < CLAUDE_MAX_ATTEMPTS:
                            sleep_seconds = CLAUDE_RETRY_BACKOFF_SECONDS[attempt - 1]
                            self.log("IMPLEMENTER", f"Retrying in {sleep_seconds}s due to timeout...")
                            time.sleep(sleep_seconds)
                            continue

                        return False, "Claude Code timed out", [], final_artifact_path

                    # PATCH 4-B: Fatal output detected - no retry
                    if fatal_detected:
                        output_text = "".join(attempt_output)
                        self.log("IMPLEMENTER", "Fatal error detected - no retry")
                        return False, output_text, [], final_artifact_path

                    self.log("IMPLEMENTER", f"Claude Code exit code: {returncode}")

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
                    if _is_transient_claude_failure(output_text) and attempt < CLAUDE_MAX_ATTEMPTS:
                        sleep_seconds = CLAUDE_RETRY_BACKOFF_SECONDS[attempt - 1]
                        self.log("IMPLEMENTER", f"Retrying in {sleep_seconds}s due to transient error...")
                        time.sleep(sleep_seconds)
                        continue

                    # Non-retryable failure or max attempts reached
                    return False, output_text, [], final_artifact_path

                except FileNotFoundError:
                    msg = "Claude Code CLI not found. Install with: npm install -g @anthropic-ai/claude-code"
                    self.log("IMPLEMENTER", "Claude Code CLI not found - ensure 'claude' is installed")
                    attempt_output.append(f"\n{msg}\n")
                    final_artifact_path = _write_claude_attempt_output(
                        self.config.repo_path, story_key, self.run_id, attempt, "".join(attempt_output)
                    )
                    return False, msg, [], final_artifact_path

                except Exception as e:
                    error_msg = str(e)
                    self.log("IMPLEMENTER", f"Claude Code error: {e}")
                    attempt_output.append(f"\nException: {error_msg}\n")

                    # Write attempt artifact before potentially retrying
                    final_artifact_path = _write_claude_attempt_output(
                        self.config.repo_path, story_key, self.run_id, attempt, "".join(attempt_output)
                    )

                    # Check if exception text indicates transient failure
                    if _is_transient_claude_failure(error_msg) and attempt < CLAUDE_MAX_ATTEMPTS:
                        sleep_seconds = CLAUDE_RETRY_BACKOFF_SECONDS[attempt - 1]
                        self.log("IMPLEMENTER", f"Retrying in {sleep_seconds}s due to transient error...")
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

    Args:
        issue_type: Raw issue type string from Jira.

    Returns:
        Dispatch kind: "implement", "epic", "initiative", or "unknown".
    """
    normalized = issue_type.strip().lower()
    if normalized in ('story', 'bug'):
        return 'implement'
    elif normalized == 'epic':
        return 'epic'
    elif normalized in ('initiative', 'idea'):
        return 'initiative'
    else:
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

    args = parser.parse_args()

    # PATCH 1: Deterministic dotenv loading (no .zshrc sourcing)
    # Load from scripts/autonomous-agent/.env first
    dotenv_count = load_dotenv(SCRIPT_DIR / '.env')
    if dotenv_count > 0:
        print(f"[SETUP] Loaded {dotenv_count} variables from .env")

    config = Config.load()
    engine = ExecutionEngine(config, cli_timeout_secs=args.claude_timeout_secs)

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
        # Run one iteration
        engine.step_1_initiative_intake() or \
        engine.step_2_epic_decomposition() or \
        engine.step_3_story_implementation() or \
        engine.step_4_story_verification()
    else:
        # Run continuous loop
        engine.run()


if __name__ == '__main__':
    main()
