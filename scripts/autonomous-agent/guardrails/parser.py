"""
Guardrails v2 ALLOWED FILES parser.

Extracted from engine.py for modularization.
"""

import re
from typing import Tuple, List, Set


def parse_allowed_files(description_text: str) -> Tuple[Set[str], List[str]]:
    """Parse ALLOWED FILES and ALLOWED NEW FILES from Story description.

    Guardrails v1 FIXUP-3: Robust line-walk parser that handles blank lines
    between headers and bullets (common in ADF→text rendering).

    Guardrails v1 PATCH 3: Preserve glob wildcards (*) - only unwrap paired
    markdown bold markers (**text**), never strip single *.

    Args:
        description_text: Plain text description from Story.

    Returns:
        Tuple of (allowed_files_set, allowed_new_patterns).
    """
    def unwrap_paired_bold(s: str) -> str:
        """Unwrap paired markdown bold markers (**text**) only."""
        s = s.strip()
        if s.startswith('**') and s.endswith('**') and len(s) > 4:
            return s[2:-2].strip()
        return s

    allowed_files: Set[str] = set()
    allowed_new_patterns: List[str] = []

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
