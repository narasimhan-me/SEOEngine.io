# EngineO Autonomous Agent — Usage Guide

**Version:** 3.2
**Last updated:** 2026-01-26

---

## Overview

The EngineO Autonomous Agent is a multi-persona execution engine that automates software development workflows by coordinating three strict roles:

| Persona | Model | Responsibility |
|---------|-------|----------------|
| **Unified Executive Persona (UEP)** | Opus | Translates Product Discovery ideas into Jira Epics with business intent |
| **Claude Supervisor** | Opus | Decomposes Epics into Stories with PATCH BATCH instructions |
| **Claude Implementer** | Sonnet | Applies patches exactly as specified, writes code |

The engine reads from **Atlassian Product Discovery** (EA project), creates/updates artifacts in **Jira Software** (KAN project), and commits code to the `feature/agent` branch.

---

## Prerequisites

### Required Tools

1. **Python 3.8+**
   ```bash
   python3 --version
   ```

2. **Claude Code CLI** (no API key required)
   ```bash
   npm install -g @anthropic-ai/claude-code
   claude --version
   ```

3. **Git** with repository access

### Required Environment Variables

Set these in `~/.zshrc` or `~/.bashrc`:

```bash
# Jira / Atlassian (required)
export JIRA_URL="https://your-domain.atlassian.net"
export JIRA_USERNAME="your-email@example.com"
export JIRA_TOKEN="your-jira-api-token"

# GitHub (required)
export GITHUB_TOKEN="your-github-token"

# Email escalations (optional but recommended)
export GMAIL_ADDRESS="your-email@gmail.com"
export GMAIL_APP_PASSWORD="your-app-password"
export ESCALATION_EMAIL="alerts@example.com"

# Repository path (optional, auto-detected)
export REPO_PATH="/path/to/EngineO.ai"
```

---

## Quick Start

### 1. Navigate to the agent directory

```bash
cd /path/to/EngineO.ai/scripts/autonomous-agent
```

### 2. Run the engine

```bash
./run.sh
```

Or run directly with Python:

```bash
python3 engine.py
```

### 3. Monitor output

The engine logs all operations with role prefixes:
- `[UEP]` — Executive persona actions
- `[SUPERVISOR]` — Decomposition and verification
- `[IMPLEMENTER]` — Code changes
- `[GUARDRAILS]` — Safety checks

---

## Workflow Steps

The engine executes a 5-step workflow:

### Step 1: Idea Intake (UEP)

- Reads approved Ideas from Atlassian Product Discovery (EA-* issues)
- Filters for ideas with status "Ready for Development"
- Creates or reuses a canonical KAN Epic for each EA idea

### Step 2: Epic Decomposition (Supervisor)

- Reads Epic description and acceptance criteria
- Generates Stories with PATCH BATCH instructions
- Each Story includes:
  - `ALLOWED FILES:` — exact paths that may be modified
  - `ALLOWED NEW FILES:` — paths/patterns for new files
  - `DIFF BUDGET:` — maximum files to change (default: 15)
  - `SCOPE FENCE:` — policy class constraint

### Step 3: Story Implementation (Implementer)

- Reads PATCH BATCH from Story description
- Applies diffs exactly as specified
- Creates verification report: `reports/<KAN-KEY>-verification.md`
- Commits to `feature/agent` branch

### Step 4: Verification (Supervisor)

- Confirms verification report exists with `## Checklist`
- Runs drift check against remote base
- Validates all guardrails passed
- Transitions Story to Resolved (or Blocks with escalation)

### Step 5: Epic Completion (UEP)

- Verifies all child Stories are Resolved
- Transitions Epic to Done
- Links back to original EA idea

---

## Guardrails v2

The engine enforces strict safety constraints. See [GUARDRAILS_V2_CONTRACT.md](./GUARDRAILS_V2_CONTRACT.md) for the full specification.

### Key Rules

| Rule | Behavior |
|------|----------|
| **Idempotency** | One Epic per EA idea; Stories are reused, never duplicated |
| **Scope Fence** | Files must match declared policy class (e.g., `frontend-only`) |
| **Diff Budget** | Maximum 15 files per phase unless explicitly approved |
| **Patch-List** | Only files in `ALLOWED FILES` may be modified |
| **Verification** | Report with `## Checklist` required before completion |
| **Drift Check** | Post-implementation drift blocks the Story |

### Fail-Closed Principle

If any guardrail cannot be verified, the engine:
1. Blocks the Story
2. Adds a detailed Jira comment
3. Sends an escalation email
4. Logs to `escalations.json`

---

## Module Structure

```
scripts/autonomous-agent/
├── engine.py              # Main orchestrator
├── run.sh                 # Runner script with env setup
├── jira_client.py         # Jira API operations
├── git_client.py          # Git operations
├── adf.py                 # Atlassian Document Format parsing
├── ledger.py              # State persistence (.engineo/state.json)
├── escalation.py          # Email + logging
├── guardrails/
│   ├── policy.py          # Policy classes, constants
│   ├── parser.py          # ALLOWED FILES parser
│   └── enforcement.py     # Scope/budget/patch-list checks
├── verification/
│   ├── report.py          # Verification report validation
│   └── drift.py           # Git drift detection
├── tests/                 # Unit tests
└── docs/
    ├── GUARDRAILS_V2_CONTRACT.md
    └── USAGE_GUIDE.md
```

---

## Configuration Reference

### Policy Classes

| Class | Allowed Roots |
|-------|---------------|
| `frontend-only` | `apps/web/**`, `docs/**` |
| `scripts-only` | `scripts/**` |
| `autonomous-agent-only` | `scripts/autonomous-agent/**` |
| `backend-only` | Must be explicitly declared |

### Jira Projects

| Project | Purpose |
|---------|---------|
| `EA` | Atlassian Product Discovery (Ideas) |
| `KAN` | Jira Software (Epics, Stories) |

### Labels

| Label | Meaning |
|-------|---------|
| `source-ea-<N>` | Links KAN artifact to EA idea |
| `frontend-only` | Restricts scope to frontend paths |
| `autonomous-agent-only` | Restricts scope to agent paths |

---

## Running Tests

```bash
cd /path/to/EngineO.ai
python3 -m unittest discover scripts/autonomous-agent/tests -v
```

Expected output: All tests pass (28+ tests).

---

## Troubleshooting

### "Missing required environment variables"

Ensure all required variables are exported in your shell:
```bash
source ~/.zshrc
env | grep -E "JIRA|GITHUB"
```

### "Claude Code CLI not found"

Install globally:
```bash
npm install -g @anthropic-ai/claude-code
```

### Guardrails block with "drift detected"

Someone pushed changes to `feature/agent` after implementation started. Either:
1. Rebase your local branch
2. Re-run the engine to pick up the new baseline

### Story blocked with "ALLOWED FILES missing"

The Supervisor output did not include an `ALLOWED FILES:` section. Check the Story description and ensure the format is correct.

---

## Example Session

```
==========================================
 EngineO Autonomous Execution Engine
==========================================

[SETUP] Environment variables loaded:
  JIRA_URL: https://engineo.atlassian.net
  JIRA_USERNAME: nm@narasimhan.me
  ...

[UEP] Checking for approved Ideas in EA project...
[UEP] Found 1 idea(s) ready for development
[UEP] Processing EA-18: "Add dark mode toggle"
[UEP] Creating Epic in KAN project...
[UEP] Epic created: KAN-42

[SUPERVISOR] Decomposing Epic KAN-42 into Stories...
[SUPERVISOR] Created Story: KAN-43 "Implement dark mode toggle component"
[SUPERVISOR] ALLOWED FILES: apps/web/components/settings/DarkModeToggle.tsx, ...

[IMPLEMENTER] Applying PATCH BATCH for KAN-43...
[IMPLEMENTER] Modified 3 files
[IMPLEMENTER] Created verification report: reports/KAN-43-verification.md
[IMPLEMENTER] Committed to feature/agent

[SUPERVISOR] Verifying KAN-43...
[GUARDRAILS] Scope fence: PASS
[GUARDRAILS] Diff budget: PASS (3/15 files)
[GUARDRAILS] Patch-list: PASS
[GUARDRAILS] Verification report: PASS
[GUARDRAILS] Drift check: PASS
[SUPERVISOR] Story KAN-43 verified and resolved

[UEP] All Stories complete. Epic KAN-42 marked Done.
```

---

## Related Documentation

- [GUARDRAILS_V2_CONTRACT.md](./GUARDRAILS_V2_CONTRACT.md) — Full guardrails specification
- [IMPLEMENTATION_PLAN.md](../../../docs/IMPLEMENTATION_PLAN.md) — Project-wide implementation changelog

---

*This guide is maintained as part of the EngineO autonomous agent system.*
