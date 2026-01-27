# Engine Run Artifacts Contract

This document defines the canonical locations and naming conventions for artifacts produced by the EngineO Autonomous Execution Engine.

**PATCH BATCH: AUTONOMOUS-AGENT-RESUME-STATE-MACHINE-RECONCILE-1 FIXUP-1**
**PATCH BATCH: AUTONOMOUS-AGENT-JIRA-PAYLOAD-HARDENING-AND-IDEMPOTENCY-1**

## Canonical Directories

| Directory | Purpose |
|-----------|---------|
| `scripts/autonomous-agent/logs/` | Engine logs |
| `reports/` (repo root) | Verification reports, decomposition manifests, and patch batch files |
| `scripts/autonomous-agent/reports/` | Claude output attempt artifacts |
| `.engineo/` | Runtime-only state (never committed) |

## Engine Log

**Location:** `scripts/autonomous-agent/logs/engine-<RUN_ID>.log`

**RUN_ID Format:** `YYYYMMDD-HHMMSSZ` (UTC timestamp)

**Example:** `engine-20260127-143047Z.log`

**Retention:** Logs older than 2 days are automatically deleted on engine startup.

## Verification Reports

### Canonical Path (REQUIRED)

**Canonical Location:** `reports/{ISSUE_KEY}-verification.md` (repo root)

**Example:** `reports/KAN-17-verification.md`

**CRITICAL CONTRACT:**
- This is the ONLY path accepted by the Supervisor for verification
- Timestamped paths (e.g., `KAN-17-20260127-143047Z-verification.md`) are NOT accepted
- Title-prefixed paths (e.g., `AUTONOMOUS-AGENT-...-verification.md`) are NOT accepted
- "Near-matches" are only used for remediation messaging, NOT acceptance

### Supervisor Lookup

The Supervisor performs a single lookup:

1. Check `reports/{ISSUE_KEY}-verification.md` exists
   - If exists: proceed to content validation
   - If missing: FAIL with remediation message showing expected path + near-matches

### Report Requirements

Verification reports **MUST** contain:
- `## Checklist` section header
- All checklist items checked (`- [x]`)
- Any unchecked items (`- [ ]`) cause verification to FAIL

### Remediation Messaging

When canonical report is missing, the Supervisor comments:
```
Verification report missing.

Expected path: reports/{ISSUE_KEY}-verification.md

Near-matches found (not accepted as canonical):
  - scripts/autonomous-agent/reports/KAN-17-20260127-143047Z-verification.md
  - ...

Please ensure the verification report is written to the canonical path.
```

## Patch Batch Files (PATCH A)

Jira Story descriptions do NOT embed full PATCH BATCH content to avoid Jira size limits.
Full patch batch is stored in local artifact files.

### Pre-Story Path (Temporary)

**Location:** `reports/{EPIC_KEY}-{RUN_ID}-patch-batch.md` (repo root)

**Example:** `reports/KAN-10-20260127-143047Z-patch-batch.md`

**Purpose:** Stores patch batch before story key is known.

### Per-Story Path (Stable)

**Canonical Location:** `reports/{STORY_KEY}-patch-batch.md` (repo root)

**Example:** `reports/KAN-17-patch-batch.md`

**Purpose:** Stable patch batch path for IMPLEMENTER to load. Preferred over pre-story path.

### Story Description

Jira Story descriptions contain a marker pointing to the patch batch file:
```
PATCH_BATCH_FILE: reports/{STORY_KEY}-patch-batch.md
```

### Jira Comment

After story creation, the engine adds a comment with:
- Patch batch file paths
- Excerpt (first 40 lines of patch batch)
- Canonical verification report path
- Verification checklist

## Decomposition Manifests

**Canonical Location:** `reports/{EPIC_KEY}-decomposition.json` (repo root)

**Example:** `reports/KAN-10-decomposition.json`

**Purpose:** Enables idempotent Epic decomposition (no duplicate Stories on repeated runs).

### Manifest Structure (PATCH B)

```json
{
  "epicKey": "KAN-10",
  "fingerprint": "sha256hash",
  "status": "COMPLETE",
  "children": [
    {
      "intent_id": "abc123def456",
      "summary": "Implement: Add login feature",
      "key": "KAN-17"
    }
  ],
  "created_at": "2026-01-27T12:00:00Z",
  "updated_at": "2026-01-27T12:00:00Z"
}
```

### Manifest Status

| Status | Description |
|--------|-------------|
| `INCOMPLETE` | Story creation failed or in progress |
| `COMPLETE` | At least one story exists |

### Skip Eligibility

Decomposition skip is ONLY allowed when ALL conditions are met:
- Epic fingerprint unchanged (description not modified)
- Manifest status = `COMPLETE`
- Either: Jira has implement stories OR all manifest children have keys

## Claude Output Artifacts

**Location:** `scripts/autonomous-agent/reports/`

**Naming Pattern:** `{ISSUE_KEY}-{RUN_ID}-claude-output-attempt{N}.txt`

**Example:** `KAN-16-20260127-143047Z-claude-output-attempt1.txt`

**Purpose:** Captures the full output of each Claude Code CLI invocation attempt.

**IMPORTANT:** All output written to these artifact files is **automatically redacted** to prevent secret leakage. Sensitive values (API tokens, credentials, Authorization headers) are replaced with `[REDACTED]` before being written to disk.

## Work Ledger

**Location:** `work_ledger.json` (repo root)

**Purpose:** Persistent execution state for resumption across runs.

### Structure

```json
{
  "version": 1,
  "entries": {
    "KAN-17": {
      "issueKey": "KAN-17",
      "issueType": "Story",
      "parentKey": "KAN-10",
      "status_last_observed": "In Progress",
      "last_step": "IMPLEMENTER",
      "last_step_result": "success",
      "children": [],
      "decomposition_fingerprint": "",
      "last_commit_sha": "abc123def456",
      "verification_report_path": "reports/KAN-17-verification.md",
      "last_error_fingerprint": null,
      "last_error_at": null
    }
  }
}
```

### Terminal Step Results

The `last_step_result` field tracks outcome:
- `success` - Step completed successfully
- `failed` - Step failed (error/nonzero/exception)
- `timed_out` - Step exceeded timeout
- `cancelled` - Step was cancelled (lock/user interrupt)

## Guardrails Ledger (Legacy)

**Location:** `.engineo/state.json`

**Purpose:** Legacy commit eligibility tracking. Being phased out in favor of Work Ledger.

**Note:** This file is never committed to version control.

## Escalation Queue

**Location:** `.engineo/escalations.json`

**Purpose:** Runtime-only queue for pending escalations when email delivery fails.

**Note:** This file is never committed to version control.

## Summary

```
work_ledger.json                    # Work ledger (repo root, never commit)

reports/
├── {ISSUE_KEY}-verification.md     # Canonical verification report (ONLY accepted path)
├── {EPIC_KEY}-decomposition.json   # Decomposition manifest (with status field)
├── {STORY_KEY}-patch-batch.md      # Patch batch (stable per-story path)
└── {EPIC_KEY}-{RUN_ID}-patch-batch.md  # Patch batch (pre-story temporary)

.engineo/
├── state.json                      # Guardrails ledger (runtime-only)
└── escalations.json                # Escalation queue (runtime-only)

scripts/autonomous-agent/
├── logs/
│   └── engine-<RUN_ID>.log
└── reports/
    ├── ENGINE-RUN-ARTIFACTS.md     # This documentation (committed)
    └── <ISSUE_KEY>-<RUN_ID>-claude-output-attempt<N>.txt
```
