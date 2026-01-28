# EngineO Autonomous Multi-Persona Execution Engine

Autonomous execution engine that coordinates three personas to process Jira issues:

1. **UEP (Unified Executive Persona)** - Reads Ideas, creates Epics (Opus model)
2. **SUPERVISOR** - Decomposes Epics into Stories with PATCH BATCH specs (Opus model)
3. **IMPLEMENTER** - Applies patches, writes code, commits (Sonnet model via Claude Code CLI)

## Prerequisites

- Python 3.8+
- Claude Code CLI: `npm install -g @anthropic-ai/claude-code`
- Jira access (URL, username, API token)
- GitHub token (for commits/pushes)

## Setup

1. Copy `.env.example` to `.env` and fill in credentials:
   ```bash
   cp .env.example .env
   ```

2. Or set environment variables in `~/.zshrc`:
   ```bash
   export JIRA_URL="https://your-domain.atlassian.net"
   export JIRA_USERNAME="your-email@example.com"
   export JIRA_TOKEN="your-jira-api-token"
   export GITHUB_TOKEN="your-github-token"
   ```

## Usage

```bash
# Run continuous loop (processes all open Ideas, Epics, Stories, Bugs)
./run.sh

# Process single issue
./run.sh --issue KAN-17

# Process multiple issues sequentially
./run.sh --issue KAN-17 KAN-18 KAN-19

# Force issue type
./run.sh --issue KAN-17 --type story

# Run one iteration and exit
./run.sh --once
```

## Configuration

### Timeout Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `CLAUDE_TIMEOUT_SECONDS` | 14400 (4h) | Default timeout per Claude attempt |
| `ENGINEO_CLAUDE_TIMEOUT_SECONDS` | - | Env var to override default timeout |
| `HARD TIMEOUT: <minutes>` | - | Per-ticket override in Jira description (capped at 8h) |

### Other Settings

| Constant | Value | Description |
|----------|-------|-------------|
| `CLAUDE_MAX_ATTEMPTS` | 3 | Retry attempts per issue |
| `CLAUDE_HEARTBEAT_INTERVAL` | 30s | Heartbeat frequency during silent periods |

## Output & Logging

### Console Output
Real-time streaming with role prefixes (UEP, SUPERVISOR, IMPLEMENTER):
```
[2026-01-26T15:58:52Z] [SUPERVISOR] Run ID: 20260126-155852Z
[2026-01-26T15:58:52Z] [IMPLEMENTER] (model=sonnet, tool=claude-code-cli) Claude attempt 1/3...
[2026-01-26T15:58:53Z] [IMPLEMENTER] (model=sonnet, tool=claude-code-cli) [init]
[2026-01-26T15:58:54Z] [IMPLEMENTER] (model=sonnet, tool=claude-code-cli) [tool_use: Read]
[2026-01-26T15:58:55Z] [IMPLEMENTER] (model=sonnet, tool=claude-code-cli) [tool_result: ok]
```

### Log Files
- **Location**: `scripts/autonomous-agent/logs/engine-<RUN_ID>.log`
- **Rotation**: Logs older than 2 days are auto-deleted at startup
- **Content**: Same as console output (tee'd)

### Artifacts

| Artifact | Location | Notes |
|----------|----------|-------|
| Engine logs | `scripts/autonomous-agent/logs/engine-<RUN_ID>.log` | Per-run log file |
| Claude attempt artifacts | `scripts/autonomous-agent/reports/{ISSUE_KEY}-{RUN_ID}-claude-output-attempt{N}.txt` | Full Claude output (secrets redacted) |
| Verification reports | `reports/{ISSUE_KEY}-verification.md` (repo root) | Canonical path only |
| Decomposition manifests | `reports/{EPIC_KEY}-decomposition.json` (repo root) | Idempotent decomposition state |
| Patch batch files | `reports/{STORY_KEY}-patch-batch.md` (repo root) | Stable per-story path |
| Pre-story patch batch | `reports/{EPIC_KEY}-{RUN_ID}-patch-batch.md` (repo root) | Temporary before story key known |
| Work ledger | `work_ledger.json` (repo root) | Runtime state (git-ignored) |

### Patch Batch Storage (PATCH A)

Jira Story descriptions are concise and do NOT embed full patch batch content (to avoid Jira size limits).

- **Pre-story**: `reports/{EPIC_KEY}-{RUN_ID}-patch-batch.md` (written before story creation)
- **Per-story**: `reports/{STORY_KEY}-patch-batch.md` (copied after story key is known)

After story creation, the engine adds a Jira comment with:
- Patch batch file path(s)
- Excerpt (first 40 lines)
- Canonical verification report path
- Verification checklist

### Decomposition Manifest Status (PATCH B)

Manifests track completion state:
- `INCOMPLETE`: Story creation failed or in progress
- `COMPLETE`: At least one story exists

Decomposition skip is only allowed when ALL are true:
- Fingerprint unchanged
- Manifest status = COMPLETE
- Jira has implement stories OR all manifest children have keys

### Idea→Epic Idempotency (PATCH C)

Re-running Idea intake does not create duplicate Epics:
- Epics are tagged with label: `engineo-idea-{IDEA_KEY}`
- Work Ledger stores Idea→Epic mapping
- Jira search checks for existing mapped Epics before creation

## Security

- Secrets are redacted from all output (console, logs, artifacts)
- Redacted: `JIRA_TOKEN`, `JIRA_API_TOKEN`, `GITHUB_TOKEN`, `Authorization: Bearer` patterns
- Git operations use `--no-verify` to skip hooks

## Tests

```bash
cd scripts/autonomous-agent
python -m pytest tests/ -v
```

## Directory Structure

```
<repo-root>/
├── work_ledger.json                 # Runtime state (git-ignored)
├── reports/
│   ├── {ISSUE_KEY}-verification.md  # Canonical verification reports
│   └── {EPIC_KEY}-decomposition.json # Decomposition manifests
└── scripts/autonomous-agent/
    ├── engine.py                    # Main engine
    ├── work_ledger.py               # Work ledger module
    ├── decomposition_manifest.py    # Decomposition manifest module
    ├── run.sh                       # Runner script
    ├── .env.example                 # Environment template
    ├── escalations.json             # Pending escalations
    ├── tests/                       # Unit tests
    ├── logs/                        # Engine run logs (git-ignored)
    │   └── engine-{RUN_ID}.log
    ├── reports/                     # Claude attempt artifacts (git-ignored)
    │   └── {ISSUE_KEY}-{RUN_ID}-claude-output-attempt{N}.txt
    └── guardrails/                  # Guardrail configs
```

### Roles

The engine uses three standardized roles:

| Role | Description |
|------|-------------|
| **UEP** | Unified Executive Persona - reads Ideas, creates Epics |
| **SUPERVISOR** | Coordinates flow, decomposes Epics, verifies work |
| **IMPLEMENTER** | Applies code changes via Claude Code CLI |

Note: Legacy role labels (`SYSTEM`, `CLAUDE`, `DEVELOPER`) are no longer used.

## Verification Report Contract (Engine-owned skeleton)

The engine ensures a verification report exists for every Story before implementation begins.

### Canonical Path

```
reports/{ISSUE_KEY}-verification.md
```

### Required Headings

The skeleton template includes these required sections:

| Section | Purpose |
|---------|---------|
| `## Summary` | Implementation summary (filled by Implementer) |
| `## Checklist` | Required checklist items (must all be checked for verification to pass) |
| `## Evidence` | Commit SHA and file list |
| `## Manual Testing` | Description of testing performed |

### Required Checklist Items

The `## Checklist` section MUST contain these items (initially unchecked):

```markdown
- [ ] Implemented per PATCH BATCH
- [ ] Tests run (list below)
- [ ] Canonical report path correct
- [ ] Evidence (commit SHA) recorded
```

### Implementer Responsibilities

1. Fill in the `## Summary` section with implementation details
2. Check all items in `## Checklist` using `- [x]`
3. Record commit SHA(s) under `## Evidence`
4. Describe testing performed under `## Manual Testing`

### Skeleton Creation Points

The skeleton is created (if missing) at two points:

1. **Epic decomposition**: After story creation success
2. **Story implementation**: Before invoking Claude (covers legacy/external stories)

**Important**: Existing files are never overwritten (idempotent behavior).

### Auto-Repair for Missing Checklist

When verification encounters a report missing the required `## Checklist` header, the engine automatically repairs it:

1. **Prepends canonical skeleton** with `## Checklist` and required unchecked items
2. **Preserves original content** under `## Appendix (previous content)`
3. **Sets cooldown** to prevent hot-loop (same as VERIFY backoff)
4. **Posts single Jira comment** (de-duplicated) explaining the repair

**Repair De-duplication:**
- Repair is tracked via `verify_repair_last_report_hash` in Work Ledger
- If the same pre-repair hash is seen again, no rewrite occurs (just cooldown refresh)
- This prevents repeated rewrites if the report is not manually updated

**Work Ledger Fields (Auto-repair):**

| Field | Type | Description |
|-------|------|-------------|
| `verify_repair_applied_at` | ISO8601 UTC | When repair was applied |
| `verify_repair_last_report_hash` | SHA256 hex | Pre-repair hash (dedup) |
| `verify_repair_count` | int | Cumulative repair count |

## VERIFY/CLOSE Backoff

The engine implements backoff logic to prevent VERIFY/CLOSE thrashing and Jira comment spam.

### Cooldown

| Parameter | Value | Description |
|-----------|-------|-------------|
| `VERIFY_COOLDOWN_SECONDS` | 600 | 10-minute backoff on verify failure |

### Re-verify Conditions

A story is re-verified only when:

1. **Report changed**: Report file hash differs from last failure
2. **Cooldown elapsed**: 10 minutes have passed since last failure

If neither condition is met, the verify attempt is skipped.

### Comment De-duplication

Jira comments are posted only when the `(reason, report_hash)` pair differs from the last comment:

| Field | Description |
|-------|-------------|
| `verify_last_commented_reason` | Last failure reason commented |
| `verify_last_commented_report_hash` | Report SHA256 at last comment |

This prevents spam when the same failure occurs repeatedly.

### Work Ledger Fields

The Work Ledger tracks verify backoff state:

| Field | Type | Description |
|-------|------|-------------|
| `verify_next_at` | ISO8601 UTC | Cooldown gate timestamp |
| `verify_last_reason` | string | Last verify failure reason |
| `verify_last_report_hash` | SHA256 hex | Report hash at last failure |
| `verify_last_report_mtime` | float | Report mtime at last failure |
| `verify_last_commented_reason` | string | Last reason that triggered a comment |
| `verify_last_commented_report_hash` | SHA256 hex | Report hash at last comment |

## Fatal Classification: AGENT_TEMPLATE_ERROR

Certain errors indicate deterministic agent/template bugs that will not resolve with retries.

### Signature Detection

The engine checks Claude output for fatal signatures:

```python
FATAL_AGENT_TEMPLATE_ERROR_SIGNATURES = [
    "NameError: name 'issue_key' is not defined",
    "issue_key is not defined",
]
```

### Behavior on Detection

When a fatal signature is detected:

1. **Retries stop immediately** (0 further attempts)
2. **Story transitions to BLOCKED**
3. **At most 1 Jira comment** is posted (de-duplicated by fingerprint)
4. **At most 1 escalation entry** is created
5. **Artifact path included** in the Jira comment for debugging

### Jira Comment Format

```markdown
## AGENT_TEMPLATE_ERROR — Non-Retryable

**Signature matched:** `NameError: name 'issue_key' is not defined`
**Artifact path:** `reports/KAN-25-abc123-claude-output-attempt1.txt`

This error indicates a deterministic agent/template bug that will not resolve with retries.

**Status:** BLOCKED — non-retryable until template fixed
```

### Work Ledger Fields

| Field | Value |
|-------|-------|
| `status` | `BLOCKED` |
| `last_step` | `IMPLEMENTER` |
| `last_step_result` | `failed` |
| `last_error_fingerprint` | `AGENT_TEMPLATE_ERROR` |

## Timeout Source Unification

All Claude CLI invocations share the same configured timeout source.

### Default Timeout

| Setting | Value | Source |
|---------|-------|--------|
| `CLAUDE_TIMEOUT_SECONDS` | 14400 (4 hours) | Constant |

### Override Methods

| Method | Priority | Example |
|--------|----------|---------|
| CLI argument | Highest | `--claude-timeout-secs 7200` |
| Environment variable | Medium | `ENGINEO_CLAUDE_TIMEOUT_SECONDS=7200` |
| Per-ticket Jira marker | Lowest | `HARD TIMEOUT: 120` in description |

### Step Timeouts

All steps use `self.claude_timeout_seconds`:

| Step | Timeout Source | Log Message |
|------|---------------|-------------|
| UEP | `claude_timeout_seconds` | `step timeout: UEP=<N>s (derived from claude_timeout_seconds)` |
| DECOMPOSE | `claude_timeout_seconds` | `step timeout: DECOMPOSE=<N>s (derived from claude_timeout_seconds)` |
| IMPLEMENT | `claude_timeout_seconds` | Uses configured timeout |

### Warning

Keep `ENGINEO_CLAUDE_TIMEOUT_SECONDS` unset unless intentionally overriding.
Setting very low values (< 300s) may cause premature timeouts during complex operations.

## Jira Status Category Queries

The engine uses Jira `statusCategory` for flexible status matching across different workflow configurations.

### Rationale

Jira workflows may have custom statuses (e.g., "Backlog", "Ready for Dev", "Waiting") that all belong to the same category. Using `statusCategory` instead of exact `status` ensures the engine picks up all relevant issues regardless of custom status names.

### Implement Queue

| Query | JQL |
|-------|-----|
| Stories to implement | `statusCategory = 'To Do'` |
| Epics to implement | `statusCategory = 'To Do'` |

**Includes:** "To Do", "Backlog", "Ready for Dev", and any custom To Do statuses.

### Decomposition Queue

| Query | JQL |
|-------|-----|
| Epics for decomposition | `statusCategory = 'To Do' OR statusCategory = 'In Progress'` |

**Includes:** All To Do and In Progress epics (additional filtering for no children is applied separately).

### Verify/Close Queue

| Query | JQL |
|-------|-----|
| Stories for verification | `statusCategory = 'In Progress' OR status = 'BLOCKED'` |

**Includes:** All In Progress statuses plus explicitly BLOCKED status.

**Excludes (AUTOVERIFY-AUTOFIX-LOOP-SAFETY-1):**
- `HUMAN TO REVIEW AND CLOSE` (requires human review)
- `HUMAN ATTENTION NEEDED` (requires human intervention)

## Auto-Verify (AUTOVERIFY-AUTOFIX-LOOP-SAFETY-1)

The engine can automatically execute and verify checklist items marked with commands.

### Enabling Auto-Verify

```bash
export ENGINEO_AUTOVERIFY_ENABLED=1
```

### Authoring Automatable Checklist Items

#### Explicit AUTO Tag (Preferred)

```markdown
<!-- AUTO:CMD=pnpm type-check -->
- [ ] Run type check
```

#### Backtick Fallback

```markdown
- [ ] Run `pnpm lint` to check code style
```

Only allowlisted commands without shell metacharacters are executed.

### Command Allowlist

Default allowlist (pnpm build disabled by default):
- `pnpm type-check`
- `pnpm lint`
- `pnpm test`
- `pnpm test:e2e`

Configure via:
```bash
export ENGINEO_AUTOVERIFY_ALLOWLIST="pnpm type-check,pnpm lint,pnpm test"
export ENGINEO_AUTOVERIFY_BUILD_ENABLED=1  # Enable pnpm build
```

### Human State Routing

| Scenario | Transition |
|----------|------------|
| All automatable pass, manual items remain | HUMAN TO REVIEW AND CLOSE |
| Automatable fails, auto-fix exhausted | HUMAN ATTENTION NEEDED |
| Verify cycles exhausted | HUMAN ATTENTION NEEDED |

### Configuration

| Setting | Default | Env Variable |
|---------|---------|--------------|
| Auto-verify enabled | `false` | `ENGINEO_AUTOVERIFY_ENABLED` |
| Command allowlist | See above | `ENGINEO_AUTOVERIFY_ALLOWLIST` |
| Build enabled | `false` | `ENGINEO_AUTOVERIFY_BUILD_ENABLED` |
| Command timeout | 300s | `ENGINEO_AUTOVERIFY_COMMAND_TIMEOUT` |
| Max auto-fix attempts | 2 | `ENGINEO_MAX_AUTO_FIX_ATTEMPTS` |
| Max verify cycles | 3 | `ENGINEO_MAX_VERIFY_CYCLES` |
| Git push enabled | `false` | `ENGINEO_GIT_PUSH_ENABLED` |

### Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Evidence file | `reports/{STORY_KEY}-evidence-{timestamp}.txt` | Redacted command output |
| Summary file | `reports/{STORY_KEY}-auto-verify-summary.json` | Structured summary |

See [docs/ENGINE-RUN-ARTIFACTS.md](../../docs/ENGINE-RUN-ARTIFACTS.md) for full documentation.
