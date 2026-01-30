"""
Guardrails v2 module for autonomous execution protection.

Provides policy constants, file parsing, and enforcement functions.
"""

from .policy import (
    DEFAULT_MAX_CHANGED_FILES,
    FRONTEND_ONLY_ALLOWED_ROOTS,
    VERIFICATION_REPORT_DIR,
    VERIFICATION_REPORT_CHECKLIST_HEADER,
    is_frontend_only,
)

from .parser import parse_allowed_files

from .enforcement import (
    matches_allowed_new,
    build_full_allowed,
    check_scope_fence,
    check_diff_budget,
    check_patch_list,
)

__all__ = [
    # Policy constants
    'DEFAULT_MAX_CHANGED_FILES',
    'FRONTEND_ONLY_ALLOWED_ROOTS',
    'VERIFICATION_REPORT_DIR',
    'VERIFICATION_REPORT_CHECKLIST_HEADER',
    'is_frontend_only',
    # Parser
    'parse_allowed_files',
    # Enforcement
    'matches_allowed_new',
    'build_full_allowed',
    'check_scope_fence',
    'check_diff_budget',
    'check_patch_list',
]
