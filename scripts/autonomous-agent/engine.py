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

2) GPT-5.x Supervisor v3.2
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
    'name': 'GPT-5.x Supervisor',
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
        self.escalation_file = Path(config.repo_path) / 'scripts' / 'autonomous-agent' / 'escalations.json'

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

    def __init__(self, config: Config):
        self.config = config
        self.jira = JiraClient(config)
        self.git = GitClient(config)
        self.email = EmailClient(config)
        self.files = FileOperations(config.repo_path)
        self.running = True
        self.impl_plan_path = Path(config.repo_path) / 'docs' / 'IMPLEMENTATION_PLAN.md'

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

        The UEP (Unified Executive Persona) role:
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
Initiative processed by UEP (Unified Executive Persona)

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
            prompt = f"""You are the Unified Executive Persona (UEP) in an autonomous development system.
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
Epic decomposed by Supervisor (GPT-5.x Supervisor v3.2)

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
*Story created by Supervisor (Claude Code CLI with Opus model)*
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

            prompt = f"""You are a Supervisor in an autonomous development system. Your role is to analyze code and generate PATCH BATCH instructions for implementation.

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
*Story created by GPT-5.x Supervisor v3.2*
*Human assistance required for PATCH BATCH specification*
"""

        return {
            'summary': f"Implement: {summary}",
            'description': story_description
        }

    def step_3_story_implementation(self) -> bool:
        """Developer: Implement Stories using Claude Code CLI"""
        self.log("DEVELOPER", "STEP 3: Checking for Stories with 'To Do' status...")

        stories = self.jira.get_stories_todo()

        if not stories:
            self.log("DEVELOPER", "No Stories in 'To Do' status")
            return False

        self.log("DEVELOPER", f"Found {len(stories)} Stories in 'To Do' status")

        # Process oldest (FIFO)
        story = stories[0]
        key = story['key']
        summary = story['fields']['summary']
        description = self.jira.parse_adf_to_text(story['fields'].get('description', {}))

        self.log("DEVELOPER", f"Implementing: [{key}] {summary}")

        # Transition to In Progress
        self.jira.transition_issue(key, 'In Progress')

        # Add comment noting implementation started
        self.jira.add_comment(key, f"Implementation started by Claude Code Developer\nBranch: {self.config.feature_branch}")

        # Use Claude Code CLI to implement the story
        self.log("DEVELOPER", "Invoking Claude Code CLI for implementation...")

        success, output, modified_files = self._invoke_claude_code(key, summary, description)

        if success:
            self.log("DEVELOPER", f"Claude Code completed implementation")
            self.log("DEVELOPER", f"Modified files: {', '.join(modified_files) if modified_files else 'None detected'}")

            # Update IMPLEMENTATION_PLAN.md
            if modified_files:
                self._update_implementation_plan(key, summary, modified_files)

            # Commit and push changes to feature branch
            commit_success = False
            if modified_files:
                self.log("DEVELOPER", "Committing changes to git...")
                commit_success = self._commit_implementation(key, summary, modified_files)
                if commit_success:
                    self.log("DEVELOPER", f"Changes committed and pushed to {self.config.feature_branch}")
                else:
                    self.log("DEVELOPER", "Failed to commit changes - manual commit required")

            # Add success comment to Jira
            commit_status = "Committed and pushed" if commit_success else "Changes pending commit"
            self.jira.add_comment(key, f"""
Implementation completed by Claude Code Developer.

Branch: {self.config.feature_branch}
Status: {commit_status}
Files modified:
{chr(10).join(['- ' + f for f in modified_files]) if modified_files else '(see git log for details)'}

Ready for Supervisor verification.
""")
            self.log("DEVELOPER", f"Story {key} implementation complete")
        else:
            self.log("DEVELOPER", f"Claude Code encountered issues")

            self.jira.add_comment(key, f"""
Claude Code implementation encountered issues.

Output:
{output[:2000] if output else 'No output captured'}

Human intervention may be required.
""")

            self.escalate(
                "DEVELOPER",
                f"Story {key} Claude Code implementation issue",
                f"Story: {summary}\n\nClaude Code output:\n{output[:1000] if output else 'No output'}"
            )

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
        """Supervisor: Verify completed Stories"""
        self.log("SUPERVISOR", "STEP 4: Checking for Stories awaiting verification...")

        stories = self.jira.get_stories_in_progress()

        if not stories:
            self.log("SUPERVISOR", "No Stories in 'In Progress' status")
            return False

        self.log("SUPERVISOR", f"Found {len(stories)} Stories in 'In Progress' status")

        # For now, just log - actual verification would compare implementation to spec
        for story in stories:
            key = story['key']
            summary = story['fields']['summary']
            self.log("SUPERVISOR", f"Awaiting verification: [{key}] {summary}")

        return False  # Don't loop on verification yet

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
        elif issue_type == 'story':
            # Developer implements Stories
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
Initiative processed by UEP (Unified Executive Persona)

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
Epic decomposed by Supervisor (GPT-5.x Supervisor v3.2)

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

        self.log("DEVELOPER", f"Implementing Story: [{key}] {summary}")

        # Transition to In Progress if not already
        if 'to do' in status:
            self.jira.transition_issue(key, 'In Progress')
            self.jira.add_comment(key, f"Implementation started by Claude Code Developer\nBranch: {self.config.feature_branch}")

        # Use Claude Code CLI to implement the story
        self.log("DEVELOPER", "Invoking Claude Code CLI for implementation...")

        success, output, modified_files = self._invoke_claude_code(key, summary, description)

        if success:
            self.log("DEVELOPER", f"Claude Code completed implementation")
            self.log("DEVELOPER", f"Modified files: {', '.join(modified_files) if modified_files else 'None detected'}")

            # Update IMPLEMENTATION_PLAN.md
            if modified_files:
                self._update_implementation_plan(key, summary, modified_files)

            # Commit and push changes to feature branch
            commit_success = False
            if modified_files:
                self.log("DEVELOPER", "Committing changes to git...")
                commit_success = self._commit_implementation(key, summary, modified_files)
                if commit_success:
                    self.log("DEVELOPER", f"Changes committed and pushed to {self.config.feature_branch}")
                else:
                    self.log("DEVELOPER", "Failed to commit changes - manual commit required")

            # Add success comment to Jira
            commit_status = "Committed and pushed" if commit_success else "Changes pending commit"
            self.jira.add_comment(key, f"""
Implementation completed by Claude Code Developer.

Branch: {self.config.feature_branch}
Status: {commit_status}
Files modified:
{chr(10).join(['- ' + f for f in modified_files]) if modified_files else '(see git log for details)'}

Claude Code Output (summary):
{output[:1000] if output else 'Implementation completed successfully'}

Ready for Supervisor verification.
""")
            self.log("DEVELOPER", f"Story {key} implementation complete")
        else:
            self.log("DEVELOPER", f"Claude Code encountered issues")

            self.jira.add_comment(key, f"""
Claude Code implementation encountered issues.

Output:
{output[:2000] if output else 'No output captured'}

Human intervention may be required.
""")

            self.escalate(
                "DEVELOPER",
                f"Story {key} Claude Code implementation issue",
                f"Story: {summary}\n\nClaude Code output:\n{output[:1000] if output else 'No output'}"
            )

        self.log("DEVELOPER", "Notifying Supervisor for verification...")
        return True

    def _invoke_claude_code(self, story_key: str, summary: str, description: str) -> Tuple[bool, str, List[str]]:
        """Invoke Claude Code CLI to implement a story

        Returns: (success, output, list of modified files)
        """
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
4. After implementation, commit the changes with message:
   "feat({story_key}): {summary}"
5. Do NOT push to remote - just commit locally

Important:
- Make ONLY the changes specified in the PATCH BATCH
- Do NOT refactor or change unrelated code
- Preserve existing formatting and structure
- If PATCH BATCH is unclear, implement based on the Epic requirements

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
