# Agent Resume & Reconcile Documentation

PATCH BATCH: AUTONOMOUS-AGENT-RESUME-STATE-MACHINE-RECONCILE-1

This document describes the Work Ledger, Dispatcher Priority Order, Decomposition Manifest, and BLOCKED Auto-Close Policy implemented for the EngineO Autonomous Execution Engine.

## Work Ledger Schema

The Work Ledger (`work_ledger.json`) persists execution state across runs to enable resumption.

**Location:** `work_ledger.json` (repository root)

### Schema Structure

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

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `issueKey` | string | Jira issue key (e.g., "KAN-17") |
| `issueType` | string | Issue type: "Idea", "Epic", or "Story" |
| `parentKey` | string|null | Parent issue key |
| `status_last_observed` | string | Last observed Jira status |
| `last_step` | string | Last completed step: "UEP", "SUPERVISOR", "IMPLEMENTER", "VERIFY", "RECONCILE" |
| `children` | list[string] | Child issue keys (stories for epics, epics for ideas) |
| `decomposition_fingerprint` | string | SHA256 of epic description + acceptance criteria |
| `last_commit_sha` | string|null | Git commit SHA if implementation committed |
| `verification_report_path` | string | Canonical verification report path |
| `last_error_fingerprint` | string|null | SHA256 hash of (step + normalized error text) |
| `last_error_at` | string|null | ISO-8601 UTC timestamp of last error |

### Crash Safety

- Writes use atomic temp file + `os.replace()` pattern
- Never partially overwrites the canonical file
- Temp file may exist after crash (will be cleaned up on next write)

## Dispatch Priority Order

The dispatcher (`dispatch_once()`) enforces a hard priority order:

1. **Recover** - Work ledger entries with errors or missing artifacts
2. **Verify/Close** - Stories with `statusCategory = In Progress` OR `status = BLOCKED`
3. **Implement** - Stories with exact `status = "To Do"`
4. **Decompose** - Epics with (`status = "To Do"` OR `statusCategory = In Progress`) AND no children
5. **Intake** - Ideas with exact `status = "TO DO"`

### Recover Eligibility

An entry is recoverable if:
- `last_step` is set AND
- Either:
  - Required artifact missing (canonical verification report for VERIFY/RECONCILE paths)
  - `last_error_fingerprint` is present (terminal failure, may have retries)

### Verify/Close Eligibility

Stories matching:
- `statusCategory = 'In Progress'` OR
- `status = 'BLOCKED'`

**Note:** BLOCKED status is explicitly included to handle stories that failed verification.

## Decomposition Manifest

The Decomposition Manifest enables idempotent Epic decomposition.

**Location:** `reports/{EPIC}-decomposition.json`

### Schema

```json
{
  "epicKey": "KAN-10",
  "fingerprint": "sha256hash",
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

### Fingerprint Computation

```
fingerprint = SHA256(epic_description + "\n" + acceptance_criteria_section)
```

The acceptance criteria section is extracted from the description using markdown header patterns (`## Acceptance Criteria`, `### Acceptance Criteria`). Falls back to full description if section not found.

### Intent ID Computation

```
intent_id = SHA256(normalized_summary)[:16]
```

Normalization:
- Lowercase
- Strip "Implement:" prefix
- Collapse whitespace

### Decomposition Modes

| Mode | Condition | Behavior |
|------|-----------|----------|
| **new** | No manifest exists | Create all stories, save manifest |
| **delta** | Manifest exists, fingerprint changed | Create only missing stories (by intent_id match) |
| **skip** | Manifest exists, fingerprint unchanged | Do nothing |

## BLOCKED Auto-Close Policy

Evidence-based verification for auto-closing Stories.

### Evidence Requirements

For a Story to be auto-closed:

1. **Canonical report exists**: `reports/{ISSUE}-verification.md`
2. **Report indicates completion**:
   - Must contain `## Checklist` section
   - Must NOT contain any unchecked items (`- [ ]`)
3. **Commit evidence**: Either:
   - Work Ledger `last_commit_sha` is present, OR
   - Git history contains commits referencing `{ISSUE}`

### Verification Flow

```
1. Check canonical report exists
   ├── Missing: PENDING (add remediation comment)
   └── Exists: Continue

2. Validate report content
   ├── Missing ## Checklist: INVALID
   ├── Has unchecked items: INCOMPLETE (set to BLOCKED)
   └── All items checked: Continue

3. Check commit evidence
   ├── Missing: BLOCKED (add structured comment)
   └── Present: Continue

4. Auto-transition to Done/Resolved
   └── Add structured comment with evidence
```

### BLOCKED Handling

When evidence is incomplete:
- Story is transitioned to BLOCKED (best-effort)
- Structured comment added describing what's missing
- Dispatcher continues to other work (does not stall)

### Epic Reconciliation

When all child "Implement:" stories under an Epic are in terminal states (Done, Duplicate, Canceled):
- Transition Epic to Done/Complete
- Add comment with child keys, resolved statuses, and evidence links

### Idea Reconciliation

When all Epics under an Idea are Done/Complete:
- Transition Idea accordingly
- Add comment if no matching transition exists

## CLI Usage

### Show Work Ledger

```bash
python engine.py --show-work-ledger
```

Prints one-screen summary of work ledger entries and exits (no Jira/Git side effects).

### Run Single Dispatch

```bash
python engine.py --once
```

Runs a single dispatch iteration using the priority state machine.

## Manual Testing Steps

### Test 1: "No messages returned" Handling

1. Trigger a scenario that produces "Error: No messages returned"
2. Verify:
   - Engine terminates attempt promptly (no hang)
   - Bounded retries (max 3 attempts)
   - `last_error_fingerprint` recorded in Work Ledger

### Test 2: Work Ledger Resume

1. Start agent mid-run (e.g., interrupt during implementation)
2. Restart agent
3. Verify:
   - Agent resumes via Work Ledger entries
   - Recover queue processed first

### Test 3: Epic Decomposition Idempotency

1. Run decomposition for an Epic
2. Run decomposition again (same description)
3. Verify: Zero new stories created

4. Change Epic description
5. Run decomposition again
6. Verify: Only missing stories created (delta mode)

### Test 4: BLOCKED Auto-Close

1. Create a Story with:
   - Canonical report at `reports/{ISSUE}-verification.md`
   - All checklist items checked
   - Commit referencing the issue
2. Run verification
3. Verify: Story transitions to Done

### Test 5: Canonical Report Path

1. Create report at non-canonical path (e.g., timestamped)
2. Run verification
3. Verify: Fails with remediation showing expected path + near-matches
