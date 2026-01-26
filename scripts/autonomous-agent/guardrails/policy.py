"""
Guardrails v2 policy constants and scope detection.

Extracted from engine.py for modularization.
"""

import re
from typing import List

# Guardrails policy constants (values match engine.py exactly)
DEFAULT_MAX_CHANGED_FILES = 15
FRONTEND_ONLY_ALLOWED_ROOTS = ["apps/web/", "docs/"]
VERIFICATION_REPORT_DIR = "reports"
VERIFICATION_REPORT_CHECKLIST_HEADER = "## Checklist"


def is_frontend_only(issue: dict, description_text: str) -> bool:
    """Check if issue is frontend-only scoped.

    Args:
        issue: Jira issue dict with 'fields.labels'.
        description_text: Plain text description of the issue.

    Returns:
        True if issue is scoped to frontend-only, False otherwise.
    """
    labels = issue.get('fields', {}).get('labels', [])
    if 'frontend-only' in [l.lower() for l in labels]:
        return True
    if re.search(r'frontend[-\s]?only', description_text, re.IGNORECASE):
        return True
    return False
