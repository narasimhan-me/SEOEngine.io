#!/usr/bin/env python3
"""
EngineO Autonomous Multi-Persona Execution Engine v3.2

This engine coordinates THREE STRICT ROLES:

1) Unified Executive Persona (UEP) v3.2
   - Combines: Lead PM, Tech Architect, UX Designer, CTO, CFO, Content Strategist
   - Acts as ONE integrated executive brain
   - Produces high-level intent ONLY — never implementation
   - NEVER writes patches or code
   - Defines WHAT we build, WHY we build it, UX/product expectations
   - Reads Ideas from Atlassian Product Discovery
   - Creates Epics with business goals and acceptance criteria

2) Claude Supervisor v3.2
   - NEVER writes code
   - ONLY produces PATCH BATCH instructions (surgical, minimal diffs)
   - Decomposes Epics into Stories with exact implementation specs
   - Validates intent and resolves ambiguities
   - Verifies Stories and Epics
   - Ends each phase with instruction to update Implementation Plan

3) Claude Implementer v3.2
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
import fnmatch

# Guardrails v2 modular imports
from jira_client import JiraClient
from git_client import GitClient
from escalation import EmailClient, Escalator
from ledger import StateLedger
from guardrails.policy import (
    DEFAULT_MAX_CHANGED_FILES,
    FRONTEND_ONLY_ALLOWED_ROOTS,
    VERIFICATION_REPORT_DIR,
    VERIFICATION_REPORT_CHECKLIST_HEADER,
    is_frontend_only,
)
from guardrails.parser import parse_allowed_files
from guardrails.enforcement import (
    matches_allowed_new,
    build_full_allowed,
    check_scope_fence,
    check_diff_budget,
    check_patch_list,
)
from verification.report import report_path, report_exists, report_has_checklist
from verification.drift import diff_against_remote_base, drift_evidence, DIFF_RANGE_SPEC

# Claude Code CLI is used for all personas (no API key required)
# Model configuration per persona:
# - UEP: opus (high-quality business analysis)
# - Supervisor: opus (code understanding and PATCH BATCH generation)
# - Developer: sonnet (faster implementation)
CLAUDE_CODE_AVAILABLE = True  # Will be verified at runtime

# Model aliases for Claude Code CLI
MODEL_UEP = "opus"        # Best for business analysis
MODEL_SUPERVISOR = "opus"  # Best for code analysis
MODEL_DEVELOPER = "sonnet" # Faster for implementation


# =============================================================================
# ROLE DEFINITIONS (v3.2)
# =============================================================================

ROLE_UEP = {
    'name': 'Unified Executive Persona (UEP)',
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
    'name': 'Claude Supervisor',
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
    'name': 'Claude Implementer',
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
# EXECUTION ENGINE
# =============================================================================

class ExecutionEngine:
    """Main execution engine coordinating all personas"""

    def __init__(self, config: Config):
        self.config = config
        self.jira = JiraClient(config)
        self.git = GitClient(config)
        self.email = EmailClient(config)
        self.files = FileOperations(config.repo_path)
        self.running = True
        self.until_done = False  # Guardrails v1: --until-done mode
        self.impl_plan_path = Path(config.repo_path) / 'docs' / 'IMPLEMENTATION_PLAN.md'

        # Guardrails v1: State ledger for idempotency
        self.state_path = Path(config.repo_path) / STATE_LEDGER_PATH
        self.state = self._load_state_ledger()

        # Verify Claude Code CLI is available
        self.claude_code_available = self._verify_claude_code()
        if self.claude_code_available:
            print("[SYSTEM] Claude Code CLI enabled for all personas (no API key required)")
        else:
            print("[WARNING] Claude Code CLI not found - install with: npm install -g @anthropic-ai/claude-code")

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

    def log(self, role: str, message: str):
        """Log with role prefix"""
        timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        print(f"[{timestamp}] [{role}] {message}")

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
        jql_summary = f'project = {self.config.software_project} AND issuetype = Epic AND summary ~ "\"[{ea_key}]\"" ORDER BY created ASC'
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
        between headers and bullets (common in ADF→text rendering).

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

                # Guardrails v1: --until-done exits on idle
                if self.until_done:
                    self.log("SYSTEM", "STATUS: IDLE — exiting due to --until-done")
                    return

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

        The UEP (Unified Executive Persona) role:
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

            # Add comment
            self.jira.add_comment(ea_key, f"""
Initiative processed by UEP (Unified Executive Persona)

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
            prompt = f"""You are the Execution Unified Executive Persona (UEP) for EngineO.ai.

You operate INSIDE an autonomous execution engine protected by Guardrails v2.
You do NOT have access to the codebase and you do NOT perform implementation.

Your sole responsibility is to translate approved Product Discovery initiatives (EA-*) into an enforceable Epic description for Jira Software (KAN-*), so downstream agents can execute WITHOUT ambiguity or scope drift.

HARD RULES (NON-NEGOTIABLE)
1) NO GUESSING: If input is ambiguous/incomplete, do NOT invent. Output a "Blocked — Clarification Required" section with ONE precise question.
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
and include a "Blocked — Clarification Required" section with ONE question.

IMPORTANT: Output ONLY the markdown in the required format."""

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
*This Epic was created by the Unified Executive Persona (UEP) v3.2*
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
*This Epic was created by the Unified Executive Persona (UEP) v3.2*
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

        Guardrails v1: Idempotent Story creation (reuse existing if found)
        """
        self.log("SUPERVISOR", "STEP 2: Checking for Epics with 'To Do' status...")

        epics = self.jira.get_epics_todo()

        if not epics:
            self.log("SUPERVISOR", "No Epics in 'To Do' status")
            return False

        self.log("SUPERVISOR", f"Found {len(epics)} Epics in 'To Do' status")

        # Process oldest (FIFO)
        epic = epics[0]
        epic_key = epic['key']
        summary = epic['fields']['summary']
        description = self.jira.parse_adf_to_text(epic['fields'].get('description', {}))

        # Guardrails v1: Extract EA key from Epic summary for idempotent tracking
        ea_key = self._extract_ea_key(summary)
        ea_label = self._ea_label(ea_key) if ea_key else None

        self.log("SUPERVISOR", f"Decomposing: [{epic_key}] {summary}")
        if ea_key:
            self.log("SUPERVISOR", f"Guardrails v1: EA key={ea_key}, label={ea_label}")
        self.log("SUPERVISOR", "Analyzing codebase to identify implementation targets...")

        # Supervisor Analysis: Read codebase, identify files, create PATCH BATCH
        stories_to_create = self._supervisor_analyze_epic(epic_key, summary, description)

        created_stories = []
        reused_stories = []

        for story_def in stories_to_create:
            story_summary = story_def['summary']

            # Guardrails v1: Check for existing Story
            existing_story = self._find_or_reuse_story(epic_key, story_summary, ea_key)

            if existing_story:
                self.log("SUPERVISOR", f"Reused Story: {existing_story} - {story_summary}")
                reused_stories.append(existing_story)
            else:
                # Create new Story with EA label
                labels = [ea_label] if ea_label else None
                story_key = self.jira.create_story(story_def['summary'], story_def['description'], epic_key, labels=labels)
                if story_key:
                    self.log("SUPERVISOR", f"Created Story: {story_key} - {story_def['summary']}")
                    created_stories.append(story_key)

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

            # Transition Epic to In Progress
            self.jira.transition_issue(epic_key, 'In Progress')

            # Add comment with all Stories
            created_list = '\n'.join([f"- {s} (new)" for s in created_stories]) if created_stories else ''
            reused_list = '\n'.join([f"- {s} (reused)" for s in reused_stories]) if reused_stories else ''
            story_list = created_list + ('\n' if created_list and reused_list else '') + reused_list

            self.jira.add_comment(epic_key, f"""
Epic decomposed by Supervisor (Claude Supervisor v3.2)

**Stories ({len(all_stories)} total):**
{story_list}

**Guardrails v1:**
- EA Label: {ea_label or 'N/A'}
- Created: {len(created_stories)}, Reused: {len(reused_stories)}

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
        """Generate Story with PATCH BATCH instructions using Claude Code CLI

        Guardrails v1: Includes ALLOWED FILES section for enforcement
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
        file_analysis_text = '\n'.join(file_analysis) if file_analysis else "No files analyzed"

        # Guardrails v1: Extract unique FILE: paths from patch_batch_text for ALLOWED FILES
        file_paths_in_patches = set(re.findall(r'^FILE:\s*(.+?)$', patch_batch_text, re.MULTILINE))
        # Normalize paths (strip whitespace, backticks)
        allowed_files = {p.strip().strip('`') for p in file_paths_in_patches if p.strip()}
        # Always include IMPLEMENTATION_PLAN.md
        allowed_files.add('docs/IMPLEMENTATION_PLAN.md')

        # Build ALLOWED FILES section
        allowed_files_list = '\n'.join([f"- `{f}`" for f in sorted(allowed_files)])

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

## Guardrails v1 — Patch List

ALLOWED FILES:
{allowed_files_list}

ALLOWED NEW FILES:
- `{VERIFICATION_REPORT_DIR}/<KAN-KEY>-verification.md`

DIFF BUDGET: {DEFAULT_MAX_CHANGED_FILES} files

SCOPE FENCE: Check labels/description for FRONTEND-ONLY constraints.

---

## Verification Checklist
- [ ] Code implemented per PATCH BATCH specs
- [ ] Changes are surgical and minimal
- [ ] Existing functionality preserved
- [ ] Tests pass
- [ ] IMPLEMENTATION_PLAN.md updated
- [ ] Verification report created: {VERIFICATION_REPORT_DIR}/<KAN-KEY>-verification.md
- [ ] Committed to {self.config.feature_branch}

---
*Story created by Supervisor (Claude Code CLI with Opus model)*
*PATCH BATCH instructions generated from codebase analysis*
*Guardrails v1 enforced - ALLOWED FILES section included*
"""

        return {
            'summary': f"Implement: {summary}",
            'description': story_description
        }

    def _claude_code_generate_patches(self, epic_key: str, summary: str, description: str, files: List[dict]) -> str:
        """Use Claude Code CLI to analyze code and generate actual PATCH BATCH instructions (no API key required)

        Guardrails v1: Prompt requires ALLOWED FILES section in output
        """
        try:
            # Build the file context for Claude
            files_context = ""
            for f in files:
                files_context += f"\n\n### FILE: {f['path']}\n```\n{f['content']}\n```"

            prompt = f"""You are the Claude Supervisor in an autonomous development system. Your role is to analyze code and generate PATCH BATCH instructions for implementation.

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
*Story created by Claude Supervisor v3.2*
*Human assistance required for PATCH BATCH specification*
"""

        return {
            'summary': f"Implement: {summary}",
            'description': story_description
        }

    def step_3_story_implementation(self) -> bool:
        """Developer: Implement Stories and Bugs using Claude Code CLI

        Guardrails v1: Full enforcement of scope fence, diff budget, patch list, and verification artifact
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

        work_item_key = work_item['key']
        work_item_type = work_item['fields']['issuetype']['name']
        summary = work_item['fields']['summary']
        description = self.jira.parse_adf_to_text(work_item['fields'].get('description', {}))

        self.log("DEVELOPER", f"Implementing: [{work_item_key}] {summary} ({work_item_type})")

        # Guardrails v1: Parse ALLOWED FILES from description
        allowed_files, allowed_new_patterns = self._parse_allowed_files(description)
        frontend_only = self._is_frontend_only(work_item, description)
        max_files = int(os.environ.get("ENGINE_MAX_CHANGED_FILES", str(DEFAULT_MAX_CHANGED_FILES)))

        self.log("DEVELOPER", f"Guardrails v1: frontend_only={frontend_only}, max_files={max_files}, allowed_files={len(allowed_files)}")

        # Bug Execution Enablement: Fail-closed gate for Bugs missing machine-enforceable constraints
        is_bug = work_item_type.lower() == 'bug'
        if is_bug:
            missing_constraints = self._missing_machine_constraints_for_bug(description, allowed_files)
            if missing_constraints:
                # Attempt Blocked; fallback to To Do if unavailable
                if not self.jira.transition_issue(work_item_key, 'Blocked'):
                    self.jira.transition_issue(work_item_key, 'To Do')
                self.jira.add_comment(work_item_key, f"""
Bug is not executable by autonomous agent — missing machine-enforceable constraints.

**Missing sections:**
{chr(10).join('- ' + c for c in missing_constraints)}

*Bug blocked. Human intervention required to add missing constraints.*
""")
                self.escalate(
                    "DEVELOPER",
                    f"Bug {work_item_key} missing machine-enforceable constraints",
                    f"Bug: {summary}\n\nMissing: {', '.join(missing_constraints)}"
                )
                return True

        # Guardrails v1: Fail-fast if ALLOWED FILES missing (Stories only; Bugs handled above)
        if not allowed_files:
            self._fail_story_guardrail(
                work_item_key,
                "Missing ALLOWED FILES",
                f"ALLOWED FILES section missing or empty in {work_item_type} description. Supervisor must include it.",
                target_status="Blocked"
            )
            return True

        # Guardrails v1: Check for clean working tree BEFORE invoking Claude
        dirty_status = self.git.get_status_porcelain()
        # Filter out state.json from dirty check
        dirty_lines = [l for l in dirty_status.split('\n') if l.strip() and STATE_LEDGER_PATH not in l]
        if dirty_lines:
            self._fail_story_guardrail(
                work_item_key,
                "Dirty Working Tree",
                f"Working tree not clean before implementation. Dirty files:\n{chr(10).join(dirty_lines[:10])}",
                target_status="Blocked"
            )
            return True

        # Capture base SHA before implementation
        base_sha = self.git.get_head_sha()
        if not base_sha:
            self.log("DEVELOPER", "Failed to capture base SHA")
            return False

        self.log("DEVELOPER", f"Base SHA: {base_sha[:8]}")

        # Transition to In Progress
        self.jira.transition_issue(work_item_key, 'In Progress')

        # Add comment noting implementation started
        self.jira.add_comment(work_item_key, f"""
Implementation started by Claude Code Developer
Branch: {self.config.feature_branch}
Base SHA: {base_sha[:8]}

**Guardrails v1 Active:**
- Diff budget: {max_files} files
- Frontend-only: {frontend_only}
- Allowed files: {len(allowed_files)}
""")

        # Use Claude Code CLI to implement the work item
        self.log("DEVELOPER", "Invoking Claude Code CLI for implementation...")

        success, output, _ = self._invoke_claude_code(work_item_key, summary, description)

        if not success:
            self.log("DEVELOPER", f"Claude Code encountered issues")
            self.jira.add_comment(work_item_key, f"""
Claude Code implementation encountered issues.

Output:
{output[:2000] if output else 'No output captured'}

Human intervention may be required.
""")
            self.escalate(
                "DEVELOPER",
                f"{work_item_type} {work_item_key} Claude Code implementation issue",
                f"{work_item_type}: {summary}\n\nClaude Code output:\n{output[:1000] if output else 'No output'}"
            )
            return True

        self.log("DEVELOPER", f"Claude Code completed implementation")

        # Guardrails v1 PATCH 1: Authoritative diff against remote branch base
        changed_files_remote = self._diff_against_remote_base(work_item_key)
        if changed_files_remote is None:
            # Fetch/diff failed - work item already blocked by _diff_against_remote_base
            return True

        changed_count = len(changed_files_remote)
        self.log("DEVELOPER", f"Changed files via origin/feature/agent...HEAD ({changed_count}): {', '.join(changed_files_remote) if changed_files_remote else 'None'}")

        # Resolve allowed new patterns (replace <KAN-KEY> with work_item_key)
        resolved_new_patterns = []
        for pattern in allowed_new_patterns:
            resolved = pattern.replace('<KAN-KEY>', work_item_key)
            resolved_new_patterns.append(resolved)

        # Build full allowed set (PATCH 2: only exact paths, no wildcards)
        full_allowed = allowed_files.copy()
        for pattern in resolved_new_patterns:
            # Only add if it's an exact path (no wildcard chars or placeholder tokens)
            has_wildcard = any(c in pattern for c in ('*', '?', '['))
            has_placeholder = '<' in pattern or '>' in pattern
            if not has_wildcard and not has_placeholder:
                full_allowed.add(pattern)

        # Guardrails v1 Check A: Scope Fence (frontend-only)
        if frontend_only:
            verification_report_path = f"{VERIFICATION_REPORT_DIR}/{work_item_key}-verification.md"
            violating_files = []
            for f in changed_files_remote:
                is_allowed_root = any(f.startswith(root) for root in FRONTEND_ONLY_ALLOWED_ROOTS)
                is_verification_report = f == verification_report_path
                if not is_allowed_root and not is_verification_report:
                    violating_files.append(f)

            if violating_files:
                self._fail_story_guardrail(
                    work_item_key,
                    "Scope Fence Violation (frontend-only)",
                    f"Changed files outside allowed frontend-only roots ({FRONTEND_ONLY_ALLOWED_ROOTS})",
                    violating_files=violating_files,
                    allowed_files=full_allowed
                )
                return True

        # Guardrails v1 Check B: Diff Budget
        if changed_count > max_files:
            self._fail_story_guardrail(
                work_item_key,
                "Diff Budget Exceeded",
                f"Changed {changed_count} files, maximum allowed is {max_files}",
                violating_files=changed_files_remote,
                allowed_files=full_allowed
            )
            return True

        # Guardrails v1 Check C: Patch-List Enforcement (PATCH 2: fnmatch, no endswith bypass)
        violating_files = []
        for f in changed_files_remote:
            in_allowed = f in full_allowed
            matches_pattern = self._matches_allowed_new(f, resolved_new_patterns)
            if not in_allowed and not matches_pattern:
                violating_files.append(f)

        if violating_files:
            self._fail_story_guardrail(
                work_item_key,
                "Patch-List Violation",
                "Changed files outside allowed patch list",
                violating_files=violating_files,
                allowed_files=full_allowed
            )
            return True

        # Guardrails v1 Check D: Verification Artifact Gate
        verification_report_path = Path(self.config.repo_path) / VERIFICATION_REPORT_DIR / f"{work_item_key}-verification.md"
        if not verification_report_path.exists():
            self.jira.add_comment(work_item_key, f"""
**Verification Artifact Missing**

Required file: `{VERIFICATION_REPORT_DIR}/{work_item_key}-verification.md`

The Developer must create this file with a `{VERIFICATION_REPORT_CHECKLIST_HEADER}` section before the {work_item_type.lower()} can be committed.

*{work_item_type} remains In Progress - no commit/push performed.*
""")
            self.escalate(
                "DEVELOPER",
                f"Verification artifact missing for {work_item_key}",
                f"Missing: {VERIFICATION_REPORT_DIR}/{work_item_key}-verification.md"
            )
            return True

        # Check verification report contains checklist header
        try:
            report_content = verification_report_path.read_text()
            if VERIFICATION_REPORT_CHECKLIST_HEADER not in report_content:
                self.jira.add_comment(work_item_key, f"""
**Verification Artifact Invalid**

File `{VERIFICATION_REPORT_DIR}/{work_item_key}-verification.md` exists but does not contain required header: `{VERIFICATION_REPORT_CHECKLIST_HEADER}`

*{work_item_type} remains In Progress - no commit/push performed.*
""")
                self.escalate(
                    "DEVELOPER",
                    f"Verification artifact invalid for {work_item_key}",
                    f"Missing header '{VERIFICATION_REPORT_CHECKLIST_HEADER}' in report"
                )
                return True
        except Exception as e:
            self.log("DEVELOPER", f"Failed to read verification report: {e}")
            return True

        # All guardrails passed - record to ledger (PATCH 1D: add changedFilesRemoteBase)
        self.state['kan_story_runs'][work_item_key] = {
            'baseSha': base_sha,
            'changedFiles': changed_files_remote,  # For backward compatibility
            'changedFilesRemoteBase': changed_files_remote,  # Authoritative diff
            'maxFiles': max_files,
            'frontendOnly': frontend_only,
            'guardrailsPassed': True,
            'verificationReportPath': str(verification_report_path.relative_to(self.config.repo_path)),
            'updatedAt': datetime.now(timezone.utc).isoformat()
        }
        self._save_state_ledger()

        self.log("DEVELOPER", "All Guardrails v1 checks passed!")

        # Update IMPLEMENTATION_PLAN.md
        if changed_files_remote:
            self._update_implementation_plan(work_item_key, summary, changed_files_remote)

        # Commit and push changes to feature branch
        commit_success = False
        if changed_files_remote:
            self.log("DEVELOPER", "Committing changes to git...")
            commit_success = self._commit_implementation(work_item_key, summary, changed_files_remote)
            if commit_success:
                self.log("DEVELOPER", f"Changes committed and pushed to {self.config.feature_branch}")
            else:
                self.log("DEVELOPER", "Failed to commit changes - manual commit required")

        # Add success comment to Jira (PATCH 5B: reference authoritative diff base)
        commit_status = "Committed and pushed" if commit_success else "Changes pending commit"
        self.jira.add_comment(work_item_key, f"""
Implementation completed by Claude Code Developer.

Branch: {self.config.feature_branch}
Status: {commit_status}

**Guardrails v1 Results:**
- ✅ Scope fence: {'frontend-only enforced' if frontend_only else 'N/A'}
- ✅ Diff budget: {changed_count}/{max_files} files
- ✅ Patch-list: All files in allowed list
- ✅ Verification artifact: {VERIFICATION_REPORT_DIR}/{work_item_key}-verification.md

**Authoritative diff base:** `origin/feature/agent...HEAD`

Files modified:
{chr(10).join(['- ' + f for f in changed_files_remote]) if changed_files_remote else '(none)'}

Ready for Supervisor verification.
""")
        self.log("DEVELOPER", f"{work_item_type} {work_item_key} implementation complete")

        self.log("DEVELOPER", "Notifying Supervisor for verification...")
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
            self.log("DEVELOPER", f"Updated {self.impl_plan_path}")
        except Exception as e:
            self.log("DEVELOPER", f"Failed to update IMPLEMENTATION_PLAN.md: {e}")

    def _commit_implementation(self, story_key: str, summary: str, files: List[str]) -> bool:
        """Commit and push implementation changes"""
        # Stage modified files
        files_to_stage = files + [str(self.impl_plan_path)]

        # Filter to only existing files
        existing_files = [f for f in files_to_stage if Path(self.files.resolve_path(f)).exists()]

        if not existing_files:
            self.log("DEVELOPER", "No files to commit")
            return False

        # Stage files
        if not self.git.add_files(existing_files):
            self.log("DEVELOPER", "Failed to stage files")
            return False

        # Create commit message
        commit_message = f"""feat({story_key}): {summary}

Implemented by EngineO Autonomous Execution Engine (Claude Implementer v3.2)

Files modified:
{chr(10).join(['- ' + f for f in files])}

Story: {story_key}
Branch: {self.config.feature_branch}
"""

        # Commit
        if not self.git.commit(commit_message):
            self.log("DEVELOPER", "Failed to create commit")
            return False

        # Push
        if not self.git.push():
            self.log("DEVELOPER", "Failed to push to remote")
            return False

        self.log("DEVELOPER", "Changes committed and pushed successfully")
        return True

    def step_4_story_verification(self) -> bool:
        """Supervisor: Verify completed Stories and Bugs

        Bug Execution Enablement: Bugs are verified through the same pipeline as Stories.

        Guardrails v1: Real verification using ledger and verification reports
        """
        self.log("SUPERVISOR", "STEP 4: Checking for work items awaiting verification...")

        # Existing Story verification intake (unchanged)
        stories = self.jira.get_stories_in_progress()

        # Bug verification intake: filter executable_work_items to Bug + In Progress
        # Note: Do NOT include Bugs in "In Review" - only "In Progress"
        all_executable = self.jira.get_executable_work_items()
        bugs_in_progress = [
            item for item in all_executable
            if item['fields'].get('issuetype', {}).get('name', '').lower() == 'bug'
            and item['fields'].get('status', {}).get('name', '') == 'In Progress'
        ]

        # Build combined work item list with type info
        work_items = []
        for story in stories:
            work_items.append({'issue': story, 'type': 'Story'})
        for bug in bugs_in_progress:
            work_items.append({'issue': bug, 'type': 'Bug'})

        if not work_items:
            self.log("SUPERVISOR", "No Stories or Bugs in 'In Progress' status")
            return False

        story_count = len(stories)
        bug_count = len(bugs_in_progress)
        self.log("SUPERVISOR", f"Found {len(work_items)} work items in 'In Progress' status ({story_count} Stories, {bug_count} Bugs)")

        verified_count = 0
        for work_item in work_items:
            issue = work_item['issue']
            item_type = work_item['type']
            work_item_key = issue['key']
            summary = issue['fields']['summary']
            self.log("SUPERVISOR", f"Verifying {item_type}: [{work_item_key}] {summary}")

            # Check for verification report
            verification_report_path = Path(self.config.repo_path) / VERIFICATION_REPORT_DIR / f"{work_item_key}-verification.md"

            if not verification_report_path.exists():
                self.log("SUPERVISOR", f"Verification report missing for {work_item_key}")
                self.jira.add_comment(work_item_key, f"""
**Supervisor Verification: Pending**

Verification report not found: `{VERIFICATION_REPORT_DIR}/{work_item_key}-verification.md`

Please create the verification report to proceed.
""")
                continue

            # Validate report contains checklist
            try:
                report_content = verification_report_path.read_text()
                if VERIFICATION_REPORT_CHECKLIST_HEADER not in report_content:
                    self.log("SUPERVISOR", f"Verification report invalid for {work_item_key}")
                    self.jira.add_comment(work_item_key, f"""
**Supervisor Verification: Invalid Report**

Report exists but missing required header: `{VERIFICATION_REPORT_CHECKLIST_HEADER}`
""")
                    continue
            except Exception as e:
                self.log("SUPERVISOR", f"Failed to read verification report: {e}")
                continue

            # Check ledger for guardrails record
            ledger_entry = self.state.get('kan_story_runs', {}).get(work_item_key, {})

            if not ledger_entry:
                self.log("SUPERVISOR", f"No guardrails record for {work_item_key}")
                self.jira.add_comment(work_item_key, f"""
**Supervisor Verification: Cannot Verify**

Guardrails record missing for {work_item_key}. {item_type} requires human review.

*Guardrails v1 - Ledger entry not found*
""")
                # Transition to Blocked
                if not self.jira.transition_issue(work_item_key, 'Blocked'):
                    self.jira.transition_issue(work_item_key, 'To Do')
                self.escalate(
                    "SUPERVISOR",
                    f"Cannot verify {work_item_key} - guardrails record missing",
                    f"{item_type}: {summary}\n\nLedger entry not found. Manual review required."
                )
                continue

            if not ledger_entry.get('guardrailsPassed'):
                self.log("SUPERVISOR", f"Guardrails failed for {work_item_key}")
                self.jira.add_comment(work_item_key, f"""
**Supervisor Verification: Cannot Verify**

Guardrails record shows failed checks for {work_item_key}. {item_type} requires human review.

*Guardrails v1 - guardrailsPassed=false*
""")
                # Transition to Blocked
                if not self.jira.transition_issue(work_item_key, 'Blocked'):
                    self.jira.transition_issue(work_item_key, 'To Do')
                self.escalate(
                    "SUPERVISOR",
                    f"Cannot verify {work_item_key} - guardrails failed",
                    f"{item_type}: {summary}\n\nGuardrails record: {json.dumps(ledger_entry, indent=2)}"
                )
                continue

            # PATCH 4: Drift detection - re-check remote-base diff vs recorded
            self.log("SUPERVISOR", f"Checking for post-guardrail drift on {work_item_key}...")
            current_diff = self._diff_against_remote_base(work_item_key)
            if current_diff is None:
                # Fetch/diff failed - cannot verify safely
                self.log("SUPERVISOR", f"Failed to compute current diff for {work_item_key}")
                self.jira.add_comment(work_item_key, """
**Supervisor Verification: FAILED — Cannot compute current diff**

Failed to fetch/diff `origin/feature/agent...HEAD`.

Verification cannot proceed safely. Please check git remote state.
""")
                if not self.jira.transition_issue(work_item_key, 'Blocked'):
                    self.jira.transition_issue(work_item_key, 'To Do')
                self.escalate(
                    "SUPERVISOR",
                    f"Cannot verify {work_item_key} - diff computation failed",
                    f"{item_type}: {summary}\n\nFailed to compute origin/feature/agent...HEAD"
                )
                continue

            # Get recorded diff (prefer changedFilesRemoteBase, fallback to changedFiles)
            recorded_diff = ledger_entry.get('changedFilesRemoteBase') or ledger_entry.get('changedFiles', [])
            current_set = set(current_diff)
            recorded_set = set(recorded_diff)

            if current_set != recorded_set:
                # Drift detected
                symmetric_diff = current_set.symmetric_difference(recorded_set)
                diff_sample = sorted(list(symmetric_diff))[:20]
                self.log("SUPERVISOR", f"Post-guardrail drift detected for {work_item_key}: {len(symmetric_diff)} file(s) differ")
                self.jira.add_comment(work_item_key, f"""
**Supervisor Verification: FAILED — Post-guardrail drift detected**

Enforcement/verification uses: `origin/feature/agent...HEAD`

**Recorded file count:** {len(recorded_set)}
**Current file count:** {len(current_set)}

**Files in symmetric difference (first 20):**
{chr(10).join(['- `' + f + '`' for f in diff_sample])}

The branch diff changed after Step 3 guardrails ran. This could indicate:
- Additional commits after guardrail checks
- Force-push or rebase changing history
- Uncommitted changes during verification

**Action Required:** Re-run Step 3 or request manual review.

*Guardrails v1 - Drift detection*
""")
                if not self.jira.transition_issue(work_item_key, 'Blocked'):
                    self.jira.transition_issue(work_item_key, 'To Do')
                self.escalate(
                    "SUPERVISOR",
                    f"Post-guardrail drift detected for {work_item_key}",
                    f"{item_type}: {summary}\n\nRecorded: {len(recorded_set)} files\nCurrent: {len(current_set)} files\nDiff: {diff_sample}"
                )
                continue

            # All checks passed - verify the work item
            self.log("SUPERVISOR", f"✅ Verification passed for {work_item_key}")

            self.jira.add_comment(work_item_key, f"""
**Supervisor Verification: PASSED**

Verified via `{VERIFICATION_REPORT_DIR}/{work_item_key}-verification.md`

**Guardrails v1 Record:**
- Base SHA: {ledger_entry.get('baseSha', 'N/A')[:8]}
- Changed files: {len(ledger_entry.get('changedFiles', []))}
- Drift check: ✅ No post-guardrail drift detected
- Guardrails passed: ✅

**Authoritative diff base:** `origin/feature/agent...HEAD`

{item_type} implementation verified and ready for completion.
""")

            # Transition to Resolved (preferred) or Done (fallback)
            if not self.jira.transition_issue(work_item_key, 'Resolved'):
                if not self.jira.transition_issue(work_item_key, 'Done'):
                    self.log("SUPERVISOR", f"Could not transition {work_item_key} to Resolved/Done")
                    self.jira.add_comment(work_item_key, "Note: Could not auto-transition. Please manually move to Done.")
                else:
                    self.log("SUPERVISOR", f"Transitioned {work_item_key} to Done (fallback)")
            else:
                self.log("SUPERVISOR", f"Transitioned {work_item_key} to Resolved")

            verified_count += 1

        self.log("SUPERVISOR", f"Verified {verified_count}/{len(work_items)} work items")
        return verified_count > 0

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

        if issue_type == 'idea':
            # UEP processes Ideas
            return self._process_idea(issue)
        elif issue_type == 'epic':
            # Supervisor decomposes Epics
            return self._process_epic(issue)
        elif issue_type in ('story', 'bug'):
            # Developer implements Stories and Bugs (same guardrails pipeline)
            return self._process_story(issue)
        else:
            self.log("SYSTEM", f"Unknown issue type: {issue_type}")
            return False

    def _process_idea(self, issue: dict) -> bool:
        """UEP: Process a specific Idea (uses enhanced analysis)

        Guardrails v1: Idempotent Epic creation
        """
        ea_key = issue['key']
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

        self.log("UEP", "Analyzing initiative to define business intent...")

        # Use enhanced UEP analysis
        epics_to_create = self._uep_analyze_idea(ea_key, summary, description)

        # Guardrails v1: Enforce 1 Epic
        if len(epics_to_create) > 1:
            self.log("UEP", f"Guardrails v1: Enforcing 1 Epic (proposed: {len(epics_to_create)})")

        epic_def = epics_to_create[0]
        epic_key = self.jira.create_epic(epic_def['summary'], epic_def['description'], labels=[ea_label])

        if epic_key:
            self.log("UEP", f"Created Epic: {epic_key}")

            if ea_key not in self.state['ea_to_kan']:
                self.state['ea_to_kan'][ea_key] = {}
            self.state['ea_to_kan'][ea_key]['epic'] = epic_key
            self.state['ea_to_kan'][ea_key]['stories'] = []
            self.state['ea_to_kan'][ea_key]['updatedAt'] = datetime.now(timezone.utc).isoformat()
            self._save_state_ledger()

            self.jira.transition_issue(ea_key, 'In Progress')
            self.jira.add_comment(ea_key, f"""
Initiative processed by UEP (Unified Executive Persona)

**Created new Epic:** {epic_key}
**EA Label:** {ea_label}

Business Intent Defined - Ready for Supervisor decomposition.

*Guardrails v1: Epic created with source label*
""")
            return True

        return False

    def _process_epic(self, issue: dict) -> bool:
        """Supervisor: Decompose a specific Epic into Stories (uses enhanced analysis)

        Guardrails v1: Idempotent Story creation
        """
        epic_key = issue['key']
        summary = issue['fields']['summary']
        description = self.jira.parse_adf_to_text(issue['fields'].get('description', {}))

        # Extract EA key for idempotent tracking
        ea_key = self._extract_ea_key(summary)
        ea_label = self._ea_label(ea_key) if ea_key else None

        self.log("SUPERVISOR", f"Decomposing Epic: [{epic_key}] {summary}")
        if ea_key:
            self.log("SUPERVISOR", f"Guardrails v1: EA key={ea_key}, label={ea_label}")
        self.log("SUPERVISOR", "Analyzing codebase to identify implementation targets...")

        # Use enhanced Supervisor analysis
        stories_to_create = self._supervisor_analyze_epic(epic_key, summary, description)

        created_stories = []
        reused_stories = []

        for story_def in stories_to_create:
            story_summary = story_def['summary']

            # Check for existing Story
            existing_story = self._find_or_reuse_story(epic_key, story_summary, ea_key)

            if existing_story:
                self.log("SUPERVISOR", f"Reused Story: {existing_story}")
                reused_stories.append(existing_story)
            else:
                labels = [ea_label] if ea_label else None
                story_key = self.jira.create_story(story_def['summary'], story_def['description'], epic_key, labels=labels)
                if story_key:
                    self.log("SUPERVISOR", f"Created Story: {story_key}")
                    created_stories.append(story_key)

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

**Guardrails v1:**
- EA Label: {ea_label or 'N/A'}
- Created: {len(created_stories)}, Reused: {len(reused_stories)}

Codebase analyzed - PATCH BATCH instructions generated.
Ready for Developer implementation.
""")
            return True

        return False

    def _process_story(self, issue: dict) -> bool:
        """Developer: Implement a specific Story or Bug using Claude Code CLI

        Guardrails v1: Full enforcement (same as step_3_story_implementation)
        Bug Execution Enablement: Bugs are routed here and subject to same guardrails.
        """
        work_item_key = issue['key']
        work_item_type = issue['fields']['issuetype']['name']
        summary = issue['fields']['summary']
        description = self.jira.parse_adf_to_text(issue['fields'].get('description', {}))
        status = issue['fields']['status']['name'].lower()

        self.log("DEVELOPER", f"Implementing {work_item_type}: [{work_item_key}] {summary}")

        # Bug Execution Enablement: Log when executing Bug
        is_bug = work_item_type.lower() == 'bug'
        if is_bug:
            self.log("DEVELOPER", "Executing Bug as first-class work item")

        # Guardrails v1: Parse constraints
        allowed_files, allowed_new_patterns = self._parse_allowed_files(description)
        frontend_only = self._is_frontend_only(issue, description)
        max_files = int(os.environ.get("ENGINE_MAX_CHANGED_FILES", str(DEFAULT_MAX_CHANGED_FILES)))

        self.log("DEVELOPER", f"Guardrails v1: frontend_only={frontend_only}, max_files={max_files}, allowed_files={len(allowed_files)}")

        # Bug Execution Enablement: Fail-closed gate for Bugs missing machine-enforceable constraints
        if is_bug:
            missing_constraints = self._missing_machine_constraints_for_bug(description, allowed_files)
            if missing_constraints:
                # Attempt Blocked; fallback to To Do if unavailable
                if not self.jira.transition_issue(work_item_key, 'Blocked'):
                    self.jira.transition_issue(work_item_key, 'To Do')
                self.jira.add_comment(work_item_key, f"""
Bug is not executable by autonomous agent — missing machine-enforceable constraints.

**Missing sections:**
{chr(10).join('- ' + c for c in missing_constraints)}

*Bug blocked. Human intervention required to add missing constraints.*
""")
                self.escalate(
                    "DEVELOPER",
                    f"Bug {work_item_key} missing machine-enforceable constraints",
                    f"Bug: {summary}\n\nMissing: {', '.join(missing_constraints)}"
                )
                return True

        # Fail-fast if ALLOWED FILES missing (Stories only; Bugs handled above)
        if not allowed_files:
            self._fail_story_guardrail(
                work_item_key,
                "Missing ALLOWED FILES",
                f"ALLOWED FILES section missing or empty in {work_item_type} description.",
                target_status="Blocked"
            )
            return True

        # Check for clean working tree
        dirty_status = self.git.get_status_porcelain()
        dirty_lines = [l for l in dirty_status.split('\n') if l.strip() and STATE_LEDGER_PATH not in l]
        if dirty_lines:
            self._fail_story_guardrail(
                work_item_key,
                "Dirty Working Tree",
                f"Working tree not clean. Dirty files:\n{chr(10).join(dirty_lines[:10])}",
                target_status="Blocked"
            )
            return True

        # Capture base SHA
        base_sha = self.git.get_head_sha()
        if not base_sha:
            self.log("DEVELOPER", "Failed to capture base SHA")
            return False

        # Transition to In Progress if not already
        if 'to do' in status:
            self.jira.transition_issue(work_item_key, 'In Progress')
            self.jira.add_comment(work_item_key, f"""
Implementation started by Claude Code Developer
Branch: {self.config.feature_branch}
Base SHA: {base_sha[:8]}

**Guardrails v1 Active:**
- Diff budget: {max_files} files
- Frontend-only: {frontend_only}
""")

        # Invoke Claude
        self.log("DEVELOPER", "Invoking Claude Code CLI for implementation...")
        success, output, _ = self._invoke_claude_code(work_item_key, summary, description)

        if not success:
            self.log("DEVELOPER", f"Claude Code encountered issues")
            self.jira.add_comment(work_item_key, f"""
Claude Code implementation encountered issues.

Output:
{output[:2000] if output else 'No output captured'}

Human intervention may be required.
""")
            self.escalate(
                "DEVELOPER",
                f"{work_item_type} {work_item_key} Claude Code implementation issue",
                f"{work_item_type}: {summary}\n\nClaude Code output:\n{output[:1000] if output else 'No output'}"
            )
            return True

        self.log("DEVELOPER", f"Claude Code completed implementation")

        # PATCH 1: Authoritative diff against remote branch base
        changed_files_remote = self._diff_against_remote_base(work_item_key)
        if changed_files_remote is None:
            # Fetch/diff failed - work item already blocked by _diff_against_remote_base
            return True

        changed_count = len(changed_files_remote)
        self.log("DEVELOPER", f"Changed files via origin/feature/agent...HEAD ({changed_count}): {', '.join(changed_files_remote) if changed_files_remote else 'None'}")

        # Resolve patterns (PATCH 2: only exact paths, no wildcards in full_allowed)
        resolved_new_patterns = [p.replace('<KAN-KEY>', work_item_key) for p in allowed_new_patterns]
        full_allowed = allowed_files.copy()
        for pattern in resolved_new_patterns:
            has_wildcard = any(c in pattern for c in ('*', '?', '['))
            has_placeholder = '<' in pattern or '>' in pattern
            if not has_wildcard and not has_placeholder:
                full_allowed.add(pattern)

        # Guardrail A: Scope fence
        if frontend_only:
            verification_report_path = f"{VERIFICATION_REPORT_DIR}/{work_item_key}-verification.md"
            violating_files = [f for f in changed_files_remote
                              if not any(f.startswith(root) for root in FRONTEND_ONLY_ALLOWED_ROOTS)
                              and f != verification_report_path]
            if violating_files:
                self._fail_story_guardrail(work_item_key, "Scope Fence Violation", "Files outside frontend-only roots",
                                          violating_files=violating_files, allowed_files=full_allowed)
                return True

        # Guardrail B: Diff budget
        if changed_count > max_files:
            self._fail_story_guardrail(work_item_key, "Diff Budget Exceeded",
                                      f"Changed {changed_count} files, max is {max_files}",
                                      violating_files=changed_files_remote, allowed_files=full_allowed)
            return True

        # Guardrail C: Patch-list (PATCH 2: fnmatch, no endswith bypass)
        violating_files = [f for f in changed_files_remote
                          if f not in full_allowed
                          and not self._matches_allowed_new(f, resolved_new_patterns)]
        if violating_files:
            self._fail_story_guardrail(work_item_key, "Patch-List Violation", "Files outside allowed list",
                                      violating_files=violating_files, allowed_files=full_allowed)
            return True

        # Guardrail D: Verification artifact
        verification_report_path = Path(self.config.repo_path) / VERIFICATION_REPORT_DIR / f"{work_item_key}-verification.md"
        if not verification_report_path.exists():
            self.jira.add_comment(work_item_key, f"""
**Verification Artifact Missing**

Required: `{VERIFICATION_REPORT_DIR}/{work_item_key}-verification.md`

*{work_item_type} remains In Progress*
""")
            self.escalate("DEVELOPER", f"Verification artifact missing for {work_item_key}",
                         f"Missing: {VERIFICATION_REPORT_DIR}/{work_item_key}-verification.md")
            return True

        try:
            report_content = verification_report_path.read_text()
            if VERIFICATION_REPORT_CHECKLIST_HEADER not in report_content:
                self.jira.add_comment(work_item_key, f"""
**Verification Artifact Invalid**

Missing header: `{VERIFICATION_REPORT_CHECKLIST_HEADER}`
""")
                self.escalate("DEVELOPER", f"Verification artifact invalid for {work_item_key}", "Missing checklist header")
                return True
        except Exception as e:
            self.log("DEVELOPER", f"Failed to read verification report: {e}")
            return True

        # All guardrails passed - record to ledger (PATCH 1D: add changedFilesRemoteBase)
        self.state['kan_story_runs'][work_item_key] = {
            'baseSha': base_sha,
            'changedFiles': changed_files_remote,  # For backward compatibility
            'changedFilesRemoteBase': changed_files_remote,  # Authoritative diff
            'maxFiles': max_files,
            'frontendOnly': frontend_only,
            'guardrailsPassed': True,
            'verificationReportPath': str(verification_report_path.relative_to(self.config.repo_path)),
            'updatedAt': datetime.now(timezone.utc).isoformat()
        }
        self._save_state_ledger()

        self.log("DEVELOPER", "All Guardrails v1 checks passed!")

        # Update implementation plan and commit
        if changed_files_remote:
            self._update_implementation_plan(work_item_key, summary, changed_files_remote)
            commit_success = self._commit_implementation(work_item_key, summary, changed_files_remote)
        else:
            commit_success = False

        commit_status = "Committed and pushed" if commit_success else "Changes pending commit"
        self.jira.add_comment(work_item_key, f"""
Implementation completed by Claude Code Developer.

Branch: {self.config.feature_branch}
Status: {commit_status}

**Guardrails v1 Results:**
- ✅ Scope fence: {'frontend-only enforced' if frontend_only else 'N/A'}
- ✅ Diff budget: {changed_count}/{max_files} files
- ✅ Patch-list: All files in allowed list
- ✅ Verification artifact: {VERIFICATION_REPORT_DIR}/{work_item_key}-verification.md

**Authoritative diff base:** `origin/feature/agent...HEAD`

Files modified:
{chr(10).join(['- ' + f for f in changed_files_remote]) if changed_files_remote else '(none)'}

Ready for Supervisor verification.
""")
        self.log("DEVELOPER", f"{work_item_type} {work_item_key} implementation complete")
        return True

    def _invoke_claude_code(self, story_key: str, summary: str, description: str) -> Tuple[bool, str, List[str]]:
        """Invoke Claude Code CLI to implement a story

        Returns: (success, output, list of modified files)

        Guardrails v1: Prompt includes explicit constraints to prevent bypass
        """
        max_files = int(os.environ.get("ENGINE_MAX_CHANGED_FILES", str(DEFAULT_MAX_CHANGED_FILES)))

        # Build the prompt for Claude Code
        prompt = f"""You are the Developer persona in an autonomous execution system.

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

**Diff budget: Maximum {max_files} files may be modified.**

**If constraints conflict or are unclear, STOP and report in output; do not proceed.**

## Important Rules
- Make ONLY the changes specified in the PATCH BATCH
- Do NOT refactor or change unrelated code
- Preserve existing formatting and structure
- If PATCH BATCH is unclear, implement based on the Epic requirements
- ALWAYS create the verification report as your final step

Begin implementation now.
"""

        try:
            self.log("DEVELOPER", f"Starting Claude Code CLI ({MODEL_DEVELOPER})...")

            # Run Claude Code with the prompt (using sonnet for faster implementation)
            # Using --print to get output, --dangerously-skip-permissions to avoid interactive prompts
            result = subprocess.run(
                ['claude', '--model', MODEL_DEVELOPER, '-p', prompt, '--dangerously-skip-permissions'],
                cwd=self.config.repo_path,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )

            output = result.stdout + result.stderr
            self.log("DEVELOPER", f"Claude Code exit code: {result.returncode}")

            # Check git status to find modified files
            git_status = self.git.status()
            modified_files = []
            for line in git_status.split('\n'):
                if line.strip():
                    # Parse git status output (e.g., "M  file.ts" or "?? newfile.ts")
                    parts = line.strip().split()
                    if len(parts) >= 2:
                        modified_files.append(parts[-1])

            success = result.returncode == 0
            return success, output, modified_files

        except subprocess.TimeoutExpired:
            self.log("DEVELOPER", "Claude Code timed out after 5 minutes")
            return False, "Claude Code timed out", []
        except FileNotFoundError:
            self.log("DEVELOPER", "Claude Code CLI not found - ensure 'claude' is installed")
            return False, "Claude Code CLI not found. Install with: npm install -g @anthropic-ai/claude-code", []
        except Exception as e:
            self.log("DEVELOPER", f"Claude Code error: {e}")
            return False, str(e), []


# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

import argparse


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='EngineO Autonomous Multi-Persona Execution Engine',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python engine.py                    # Run continuous loop
  python engine.py --issue KAN-10     # Process specific issue
  python engine.py --issue KAN-10 --type story  # Process as Story
  python engine.py --until-done       # Run until no work, then exit
"""
    )
    parser.add_argument(
        '--issue', '-i',
        help='Specific Jira issue key to process (e.g., KAN-10, EA-18)'
    )
    parser.add_argument(
        '--type', '-t',
        choices=['idea', 'epic', 'story'],
        help='Force issue type (overrides auto-detection)'
    )
    parser.add_argument(
        '--once',
        action='store_true',
        help='Run one iteration and exit'
    )
    parser.add_argument(
        '--until-done',
        action='store_true',
        dest='until_done',
        help='Guardrails v1: Exit cleanly when no To Do work exists (instead of sleeping)'
    )

    args = parser.parse_args()

    # Load environment from .zshrc if running interactively
    zshrc = Path.home() / '.zshrc'
    if zshrc.exists():
        # Source zshrc to get environment variables
        result = subprocess.run(
            ['bash', '-c', f'source {zshrc} && env'],
            capture_output=True, text=True
        )
        for line in result.stdout.split('\n'):
            if '=' in line:
                key, _, value = line.partition('=')
                if key in ['JIRA_URL', 'JIRA_USERNAME', 'JIRA_TOKEN', 'GITHUB_TOKEN',
                          'GMAIL_ADDRESS', 'GMAIL_APP_PASSWORD', 'ESCALATION_EMAIL']:
                    os.environ[key] = value

    config = Config.load()
    engine = ExecutionEngine(config)

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

    # Process specific issue or run loop
    if args.issue:
        print(f"\n{'=' * 60}")
        print(f"  PROCESSING SPECIFIC ISSUE: {args.issue}")
        print(f"{'=' * 60}\n")

        if args.type:
            # Force specific issue type
            issue = engine.jira.get_issue(args.issue)
            if issue:
                # Override issue type
                issue['fields']['issuetype']['name'] = args.type.title()
                if args.type == 'idea':
                    engine._process_idea(issue)
                elif args.type == 'epic':
                    engine._process_epic(issue)
                elif args.type == 'story':
                    engine._process_story(issue)
        else:
            engine.process_issue(args.issue)
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
