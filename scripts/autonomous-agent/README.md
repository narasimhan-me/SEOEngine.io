# EngineO Autonomous Multi-Persona Execution Engine

Autonomous execution engine that coordinates three personas to process Jira issues:

1. **UEP (Unified Executive Persona)** - Reads Ideas, creates Epics (Opus model)
2. **Supervisor** - Decomposes Epics into Stories with PATCH BATCH specs (Opus model)
3. **Developer** - Applies patches, writes code, commits (Sonnet model via Claude Code CLI)

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
Real-time streaming with role prefixes:
```
[2026-01-26T15:58:52Z] [SYSTEM] Run ID: 20260126-155852Z
[2026-01-26T15:58:52Z] [DEVELOPER] Claude attempt 1/3...
[2026-01-26T15:58:53Z] [CLAUDE] [init] model=sonnet
[2026-01-26T15:58:54Z] [CLAUDE] [tool_use: Read]
[2026-01-26T15:58:55Z] [CLAUDE] [tool_result: ok]
```

### Log Files
- **Location**: `<repo-root>/logs/engine-<run_id>.log`
- **Rotation**: Logs older than 2 days are auto-deleted at startup
- **Content**: Same as console output (tee'd)

### Artifacts
- **Location**: `<repo-root>/reports/`
- **Naming**: `<ISSUE-KEY>-<run_id>-claude-output-attempt<N>.txt`
- **Content**: Full Claude output (secrets redacted)

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
scripts/autonomous-agent/
├── engine.py           # Main engine
├── run.sh              # Runner script
├── .env.example        # Environment template
├── escalations.json    # Pending escalations
├── tests/              # Unit tests
├── reports/            # Verification artifacts
├── guardrails/         # Guardrail configs
└── verification/       # Verification templates
```
