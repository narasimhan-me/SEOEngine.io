"""
Verification module for Step 4 story verification.

Provides report validation and drift detection.
"""

from .report import report_path, report_exists, report_has_checklist
from .drift import fetch_remote_branch, diff_against_remote_base, drift_evidence

__all__ = [
    'report_path',
    'report_exists',
    'report_has_checklist',
    'fetch_remote_branch',
    'diff_against_remote_base',
    'drift_evidence',
]
