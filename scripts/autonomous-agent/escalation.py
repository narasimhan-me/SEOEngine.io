"""
Email client and escalation handling for human intervention.

Extracted from engine.py for modularization (Guardrails v2).
"""

import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path


class EmailClient:
    """Email client for human escalation using Gmail MCP Server.

    This client communicates with the Gmail MCP server via subprocess
    using the MCP JSON-RPC protocol over stdio.
    """

    def __init__(self, config):
        """Initialize email client.

        Args:
            config: Configuration object with repo_path and escalation_email attributes.
        """
        self.config = config
        self.escalation_file = Path(config.repo_path) / 'scripts' / 'autonomous-agent' / 'escalations.json'

    def send_escalation(self, subject: str, body: str) -> bool:
        """Send escalation email via Gmail MCP server or fallback to file queue.

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


class Escalator:
    """Handles escalation logic with consistent subject/body templates."""

    def __init__(self, email_client: EmailClient, log_fn=None):
        """Initialize escalator.

        Args:
            email_client: EmailClient instance for sending escalations.
            log_fn: Optional logging function with signature (role, message).
        """
        self.email = email_client
        self.log = log_fn or (lambda role, msg: print(f"[{role}] {msg}"))

    def escalate(self, role: str, title: str, details: str) -> None:
        """Send human escalation with standard template.

        Args:
            role: The persona/role initiating the escalation.
            title: Brief title of the issue.
            details: Detailed description of the problem.
        """
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
