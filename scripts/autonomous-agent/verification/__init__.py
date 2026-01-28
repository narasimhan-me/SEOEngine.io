"""
Verification Module for Auto-Verify and Auto-Fix Loop Safety.

PATCH BATCH: AUTONOMOUS-AGENT-AUTOVERIFY-AUTOFIX-LOOP-SAFETY-1 — REVIEW-FIXUP-1 PATCH 1

This module consolidates:
- contracts: Configurable defaults with env overrides for limits and allowlists
- auto_verify: Parser, runner, and report updater for auto-verify workflow

Re-exports all public symbols for backward compatibility.
"""

# Re-export from contracts
from .contracts import (
    contract_human_review_status,
    contract_human_attention_status,
    contract_human_statuses,
    max_auto_fix_attempts,
    max_verify_cycles,
    autoverify_enabled,
    autoverify_allowlist,
    autoverify_build_enabled,
    autoverify_full_allowlist,
    autoverify_command_timeout,
    human_review_transition_priority,
    human_attention_transition_priority,
    git_push_enabled,
    contains_shell_metacharacters,
    is_command_allowlisted,
    SHELL_METACHARACTERS,
    DEFAULT_AUTOVERIFY_ALLOWLIST,
    DEFAULT_AUTOVERIFY_COMMAND_TIMEOUT,
    DEFAULT_HUMAN_REVIEW_TRANSITIONS,
    DEFAULT_HUMAN_ATTENTION_TRANSITIONS,
)

# Re-export from auto_verify
from .auto_verify import (
    run_auto_verify,
    parse_checklist_items,
    execute_automatable_items,
    update_report_with_results,
    write_evidence_artifacts,
    compute_failure_hash,
    FailureType,
    ChecklistItem,
    CommandResult,
    AutoVerifyResult,
)
