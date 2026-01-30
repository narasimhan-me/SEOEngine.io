# Guardrails v2 Contract

**Author:** Narasimhan Mahendrakumar  
**Applies to:** `scripts/autonomous-agent/*`  
**Status:** Active (v2)  
**Last updated:** 2026-01-26

---

## 0) Purpose

Guardrails v2 defines the **non-negotiable safety and truthfulness constraints** for the EngineO autonomous execution engine.

It exists to prevent:
- duplicate Jira artifacts (idempotency failure)
- uncontrolled scope drift (e.g., "frontend-only" touching backend/specs)
- fake "Done" states (no evidence-based verification)
- post-guardrail drift (changes after implementation but before verification)

This contract is enforceable: if a rule cannot be verified, the engine must **fail closed** (Block + Escalate).

---

## 1) System Scope

### In-scope
- Jira intake (EA ideas) → KAN epics/stories creation/reuse
- Story implementation via Claude Code CLI
- Guardrails enforcement on git diffs
- Evidence artifacts (verification report + evidence JSON)
- Jira transitions + comments
- Escalations (email + persistent log)

### Out-of-scope (must not be introduced implicitly)
- Backend/schema changes unless explicitly allowed by ticket policy
- Auto-merge to main/master (engine operates on `feature/agent` only)
- Silent permission escalation or "best effort" correctness

---

## 2) Work Lineage Contract (Idempotency)

### 2.1 Canonical source reference

Every KAN epic/story created from an EA idea MUST include:
- Label: `source-ea-<EA_KEY>` (e.g., `source-ea-18`)
- Jira issue link back to EA issue (preferred)
- Summary prefix: `[EA-<KEY>]` (secondary; not the source of truth)

### 2.2 One Epic per EA

For a given EA key:
- There MUST be **exactly one** canonical KAN epic.
- Re-runs MUST reuse the existing epic; never create a duplicate.

### 2.3 Deterministic story reuse

Stories under the epic MUST be reused by:
- label + parent epic (preferred), or
- ledger mapping (required fallback)

Summary matching is allowed only as a last-resort fallback.

---

## 3) Policy Contract (Scope + Budgets)

Every story MUST resolve to exactly one **policy class**.

### 3.1 Policy classes

- `frontend-only`
  - Allowed roots: `apps/web/**`, `docs/**`
- `scripts-only`
  - Allowed roots: `scripts/**`
- `autonomous-agent-only`
  - Allowed roots: `scripts/autonomous-agent/**`
- `backend-only` (rare)
  - Allowed roots must be explicitly declared per ticket (no defaults)

### 3.2 Determining policy class

Policy class MUST be derived from:
- Jira labels (preferred): `frontend-only`, `autonomous-agent-only`, etc.
- OR explicit keywords in story description: `FRONTEND-ONLY:` / `ALLOWED ROOTS:`

If policy cannot be determined → **fail closed** (Block + Escalate).

### 3.3 Diff budgets

Budgets are enforced on the authoritative diff base (see §4).

Default budgets:
- Micro fixup: max 10 files
- Standard phase: max 15 files
- Larger changes require explicit Supervisor approval: `DIFF BUDGET APPROVED: YES`

If budget exceeded and no approval marker exists → **fail closed**.

---

## 4) Diff & Enforcement Contract (Source of Truth)

### 4.1 Authoritative diff base

All enforcement MUST use:
- `git diff --name-only origin/feature/agent...HEAD`

after:
- `git fetch origin feature/agent`

Any alternative diff base is informational only.

### 4.2 Clean working tree

Before invoking Claude:
- working tree MUST be clean (excluding the ledger file if configured)

If dirty → **fail closed**.

---

## 5) Patch-List Contract (Allowed Files)

### 5.1 Required story sections

Every implementation story MUST contain:

**ALLOWED FILES:**
- exact repo-relative file paths

Optional:

**ALLOWED NEW FILES:**
- exact repo-relative file paths OR explicit glob patterns

### 5.2 Matching rules (strict)

- Exact paths match exactly.
- Glob patterns match only if explicitly specified and use `fnmatch`.
- Basename matching (`endswith`) is forbidden.
- If ALLOWED FILES is missing → **fail closed**.

---

## 6) Evidence Contract (Verification)

### 6.1 Required artifacts

For story `<KAN-KEY>`, the Implementer MUST create:
- `reports/<KAN-KEY>-verification.md`
  - MUST contain `## Checklist`

Recommended (v2 adds as required):
- `reports/<KAN-KEY>-evidence.json`
  - includes diff list, policy class, allowed files, timestamps

### 6.2 Supervisor verification (Step 4)

A story can transition to Resolved only if:
- verification report exists and contains `## Checklist`
- guardrails record exists and indicates pass
- drift check passes:
  - current remote-base diff equals recorded diff

If any check fails → Block + Escalate.

---

## 7) Ledger Contract

### 7.1 Location & version

- Default: `.engineo/state.json`
- Must include `STATE_LEDGER_VERSION`

### 7.2 Minimum schema (v2)

```json
{
  "version": 2,
  "ea_to_kan": {
    "EA-18": {
      "epic": "KAN-13",
      "stories": ["KAN-14"]
    }
  },
  "kan_story_runs": {
    "KAN-14": {
      "remoteBaseRef": "origin/feature/agent",
      "headSha": "abc123...",
      "changedFilesRemoteBase": ["apps/web/..."],
      "policyClass": "frontend-only",
      "allowedFiles": ["apps/web/..."],
      "allowedNewPatterns": ["reports/KAN-14-*.md"],
      "guardrailsPassed": true,
      "verificationReportPath": "reports/KAN-14-verification.md",
      "evidencePath": "reports/KAN-14-evidence.json",
      "updatedAt": "..."
    }
  }
}
```

---

## 8) Escalation Contract

If guardrails fail or verification cannot be completed:
- Comment on the story with:
  - failure reason
  - violating file list (top N)
  - next action required
- Transition to Blocked (fallback To Do)
- Record escalation event (JSON log)
- Email nm@narasimhan.me

---

## 9) Fail-Closed Rule (Non-negotiable)

If the engine cannot confidently prove compliance with:
- policy class
- authoritative diff
- allowed files
- verification artifacts

then the engine MUST:
- Block the story
- Escalate

and must NOT mark it Resolved/Done.

---

## 10) Tests (minimum required)

- Allowed-files parser: headers + blank lines + ADF artifacts
- Policy classification: labels + keywords
- Diff base function uses remote-base triple-dot
- Patch-list matcher: exact vs glob; rejects basename collision
- Verification report validator: requires checklist

---

## 11) Module Structure (v2 Modularization)

```
scripts/autonomous-agent/
├── engine.py           # Orchestrator only
├── jira_client.py      # Jira API client
├── git_client.py       # Git operations
├── adf.py              # ADF parsing/building
├── ledger.py           # State ledger
├── escalation.py       # Email/escalation
├── guardrails/
│   ├── __init__.py
│   ├── policy.py       # Constants, is_frontend_only
│   ├── parser.py       # parse_allowed_files
│   └── enforcement.py  # matches_allowed_new, check_* functions
├── verification/
│   ├── __init__.py
│   ├── report.py       # report_path, report_exists, report_has_checklist
│   └── drift.py        # fetch_remote_branch, diff_against_remote_base, drift_evidence
└── tests/
    ├── __init__.py
    ├── test_allowed_files_parser.py
    ├── test_patchlist_matcher.py
    ├── test_report_validator.py
    └── test_diff_base.py
```
