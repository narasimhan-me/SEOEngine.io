# Engine Run Artifacts Contract

This document defines the canonical locations and naming conventions for artifacts produced by the EngineO Autonomous Execution Engine.

## Canonical Directories

| Directory | Purpose |
|-----------|---------|
| `scripts/autonomous-agent/logs/` | Engine logs |
| `scripts/autonomous-agent/reports/` | Verification reports and Claude output artifacts |
| `.engineo/` | Runtime-only state (never committed) |

## Engine Log

**Location:** `scripts/autonomous-agent/logs/engine-<RUN_ID>.log`

**RUN_ID Format:** `YYYYMMDD-HHMMSSZ` (UTC timestamp)

**Example:** `engine-20260127-143047Z.log`

**Retention:** Logs older than 2 days are automatically deleted on engine startup.

## Verification Reports

**Canonical Location:** `scripts/autonomous-agent/reports/`

### Naming Patterns

| Pattern | Status | Example |
|---------|--------|---------|
| `{ISSUE_KEY}-{RUN_ID}-verification.md` | **Preferred** | `KAN-16-20260127-143047Z-verification.md` |
| `{ISSUE_KEY}-verification.md` | Legacy acceptable | `KAN-16-verification.md` |
| `TITLE-PREFIX-...-verification.md` | **Non-canonical** | Ignored by Supervisor |

### Important Notes

- Title-prefixed verification reports (e.g., `AUTONOMOUS-AGENT-...-verification.md`) are **non-canonical** and will be **ignored** by the Supervisor during verification.
- If Claude produces a title-prefixed report, the engine will attempt to copy it to a canonical issue-key-prefixed filename.
- When multiple verification reports exist for an issue, the **newest by timestamp** is selected.

## Claude Output Artifacts

**Location:** `scripts/autonomous-agent/reports/`

**Naming Pattern:** `{ISSUE_KEY}-{RUN_ID}-claude-output-attempt{N}.txt`

**Example:** `KAN-16-20260127-143047Z-claude-output-attempt1.txt`

**Purpose:** Captures the full output of each Claude Code CLI invocation attempt.

**IMPORTANT:** All output written to these artifact files is **automatically redacted** to prevent secret leakage. Sensitive values (API tokens, credentials, Authorization headers) are replaced with `[REDACTED]` before being written to disk.

## Guardrails Ledger

**Location:** `.engineo/state.json`

**Purpose:** Tracks commit eligibility for Step 4 verification.

### Structure

```json
{
  "version": 1,
  "kan_story_runs": {
    "KAN-16": {
      "issueKey": "KAN-16",
      "runId": "20260127-143047Z",
      "baseSha": "abc123...",
      "changedFiles": ["file1.py", "file2.py"],
      "guardrailsPassed": true,
      "status": "verified",
      "verificationReportPath": "scripts/autonomous-agent/reports/KAN-16-20260127-143047Z-verification.md",
      "updatedAt": "2026-01-27T14:30:47.123456+00:00"
    }
  }
}
```

### Required Fields (per issue entry)

| Field | Description |
|-------|-------------|
| `issueKey` | The Jira issue key (e.g., "KAN-16") |
| `runId` | The engine run ID that processed this issue |
| `status` | Current status: "implemented", "verified", or "failed" |
| `updatedAt` | ISO 8601 UTC timestamp of last update |

### Optional Fields

| Field | Description |
|-------|-------------|
| `baseSha` | Git HEAD SHA at time of implementation |
| `changedFiles` | List of files modified during implementation |
| `guardrailsPassed` | Boolean indicating commit eligibility |
| `verificationReportPath` | Repo-relative path to verification report |
| `attemptArtifacts` | List of Claude output artifact paths |

## Escalation Queue

**Location:** `.engineo/escalations.json`

**Purpose:** Runtime-only queue for pending escalations when email delivery fails.

**Note:** This file is never committed to version control.

## Summary

```
.engineo/
├── state.json              # Guardrails ledger (runtime-only)
└── escalations.json        # Escalation queue (runtime-only)

scripts/autonomous-agent/
├── logs/
│   └── engine-<RUN_ID>.log
└── reports/
    ├── <ISSUE_KEY>-<RUN_ID>-verification.md
    ├── <ISSUE_KEY>-verification.md (legacy)
    └── <ISSUE_KEY>-<RUN_ID>-claude-output-attempt<N>.txt
```
